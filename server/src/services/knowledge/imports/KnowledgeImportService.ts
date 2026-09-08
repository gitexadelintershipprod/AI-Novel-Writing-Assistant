import type { KnowledgeImportItem, Prisma, PrismaClient } from "@prisma/client";
import { prisma } from "../../../db/prisma";
import { AppError } from "../../../middleware/errorHandler";
import { ragConfig } from "../../../config/rag";
import { buildKnowledgeContentHash, normalizeKnowledgeContent, normalizeKnowledgeDocumentTitle } from "../common";
import { setImportPaused, withImportLock } from "../../rag/importQueue";

export const IMPORT_MAX_FILES = 1000;
export const IMPORT_MAX_BYTES = 10 * 1024 * 1024;
export interface ImportFileMetadata {
  key: string; fileName: string; relativePath: string; byteSize: number; contentHash: string;
}
const terminalUploads = new Set(["stored", "duplicate"]);
const pageRange = (page: number, pageSize: number) => ({
  page: Math.max(1, Math.trunc(page || 1)), pageSize: Math.max(1, Math.min(100, Math.trunc(pageSize || 50))),
});

export class KnowledgeImportService {
  constructor(private readonly db: PrismaClient = prisma) {}

  async createBatch(name: string) {
    const trimmed = name.trim();
    if (!trimmed || trimmed.length > 200) throw new AppError("Import name must contain 1–200 characters.", 400);
    return this.db.knowledgeImportBatch.create({ data: { name: trimmed } });
  }

  async listBatches(page = 1, pageSize = 50) {
    const range = pageRange(page, pageSize);
    const [items, total] = await Promise.all([
      this.db.knowledgeImportBatch.findMany({ orderBy: [{ createdAt: "desc" }, { id: "asc" }], skip: (range.page - 1) * range.pageSize, take: range.pageSize }),
      this.db.knowledgeImportBatch.count(),
    ]);
    return { items, total, ...range };
  }

  private async requireBatch(db: Prisma.TransactionClient, id: string) {
    const batch = await db.knowledgeImportBatch.findUnique({ where: { id } });
    if (!batch) throw new AppError("Import batch not found.", 404);
    return batch;
  }

  private async summarize(items: KnowledgeImportItem[]) {
    const [documents, jobs] = await Promise.all([
      this.db.knowledgeDocument.findMany({ where: { id: { in: items.flatMap((i) => i.documentId ? [i.documentId] : []) } }, select: { id: true, title: true, status: true, activeVersionId: true, latestIndexStatus: true } }),
      this.db.ragIndexJob.findMany({ where: { id: { in: items.flatMap((i) => i.jobId ? [i.jobId] : []) } } }),
    ]);
    const docMap = new Map(documents.map((d) => [d.id, d]));
    const jobMap = new Map(jobs.map((j) => [j.id, j]));
    return items.map((item) => {
      const doc = item.documentId ? docMap.get(item.documentId) : undefined;
      const job = item.jobId ? jobMap.get(item.jobId) : undefined;
      const unavailable = item.uploadStatus === "stored" && (!doc || doc.status === "archived" || doc.activeVersionId !== item.documentVersionId);
      let progress: Record<string, unknown> | null = null;
      try { progress = job?.payloadJson ? JSON.parse(job.payloadJson).progress ?? null : null; } catch { /* Missing progress is not a failed import. */ }
      return {
        ...item, documentTitle: doc?.title, documentStatus: doc?.status,
        indexStatus: unavailable ? "unavailable" : job?.status ?? (doc?.latestIndexStatus === "succeeded" ? "succeeded" : "idle"),
        progress,
        error: unavailable ? "The document was removed, archived, or its active version changed." : job?.lastError ?? item.error,
      };
    });
  }

  async detail(batchId: string, page = 1, pageSize = 50) {
    const batch = await this.requireBatch(this.db, batchId);
    const range = pageRange(page, pageSize);
    // Batches are capped at 1000. The summary is bounded; responses contain one page.
    const all = await this.summarize(await this.db.knowledgeImportItem.findMany({
      where: { batchId }, orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    }));
    const counts = { stored: 0, duplicate: 0, pending: 0, failed: 0, queued: 0, running: 0, succeeded: 0 };
    for (const item of all) {
      if (item.uploadStatus === "stored") counts.stored++;
      if (item.uploadStatus === "duplicate") counts.duplicate++;
      if (item.uploadStatus === "pending") counts.pending++;
      if (item.uploadStatus === "failed" || ["failed", "unavailable", "cancelled"].includes(item.indexStatus)) counts.failed++;
      if (item.indexStatus === "queued") counts.queued++;
      if (item.indexStatus === "running") counts.running++;
      if (item.indexStatus === "succeeded") counts.succeeded++;
    }
    return {
      batch, ...range, total: all.length, counts,
      items: all.slice((range.page - 1) * range.pageSize, range.page * range.pageSize),
      eligibleIds: all.filter((i) => i.uploadStatus === "stored" && ["idle", "failed", "cancelled"].includes(i.indexStatus)).map((i) => i.id),
    };
  }

  private validateFile(file: ImportFileMetadata) {
    if (!file.key || file.key.length > 200 || !/^[a-f0-9]{64}$/.test(file.contentHash)) throw new AppError("Invalid file identity or content hash.", 400);
    if (!file.fileName || file.fileName.length > 255 || !file.fileName.toLowerCase().endsWith(".txt")) throw new AppError("Only TXT files with valid names are supported.", 400);
    if (!file.relativePath || file.relativePath.length > 2048 || file.relativePath.split(/[\\/]/).includes("..")) throw new AppError("Invalid relative file path.", 400);
    if (!Number.isInteger(file.byteSize) || file.byteSize <= 0 || file.byteSize > IMPORT_MAX_BYTES) throw new AppError("Each file must be non-empty and at most 10 MiB.", 400);
  }

  private async findDuplicate(tx: Prisma.TransactionClient, hash: string) {
    return tx.knowledgeDocumentVersion.findFirst({ where: { contentHash: hash }, include: { document: true }, orderBy: { createdAt: "asc" } });
  }

  async prepare(batchId: string, files: ImportFileMetadata[]) {
    if (!files.length || files.length > IMPORT_MAX_FILES) throw new AppError("Choose between 1 and 1000 files.", 400);
    files.forEach((file) => this.validateFile(file));
    const rows = await withImportLock(this.db, async (tx) => {
      await this.requireBatch(tx, batchId);
      const existing = await tx.knowledgeImportItem.findMany({ where: { batchId }, select: { key: true } });
      if (new Set([...existing.map((i) => i.key), ...files.map((i) => i.key)]).size > IMPORT_MAX_FILES) throw new AppError("This import already contains the maximum of 1000 files.", 400);
      const results: KnowledgeImportItem[] = [];
      for (const file of files) {
        const old = await tx.knowledgeImportItem.findUnique({ where: { batchId_key: { batchId, key: file.key } } });
        if (old) {
          if (old.contentHash !== file.contentHash || old.relativePath !== file.relativePath || old.byteSize !== file.byteSize || old.fileName !== file.fileName) throw new AppError("This file key belongs to different content. Select the file again.", 409);
          results.push(old);
          continue;
        }
        const duplicate = await this.findDuplicate(tx, file.contentHash);
        results.push(await tx.knowledgeImportItem.create({ data: {
          ...file, batchId,
          uploadStatus: duplicate ? "duplicate" : "pending",
          error: duplicate ? (duplicate.document.status === "archived" ? "Identical content exists in an archived document. It was not restored." : "Identical content already exists. No new version was created.") : null,
          documentId: duplicate?.documentId, documentVersionId: duplicate?.id,
        } }));
      }
      return results;
    });
    return this.summarize(rows);
  }

  async upload(batchId: string, itemId: string, content: string) {
    const item = await this.db.knowledgeImportItem.findFirst({ where: { id: itemId, batchId } });
    if (!item) throw new AppError("Import file not found in this batch.", 404);
    try {
      if (Buffer.byteLength(JSON.stringify({ content }), "utf8") > 20 * 1024 * 1024) throw new AppError("The upload request exceeds the 20 MiB limit.", 413);
      if (Buffer.byteLength(content, "utf8") > IMPORT_MAX_BYTES) throw new AppError("Decoded text exceeds the 10 MiB limit.", 413);
      let normalized: string;
      try { normalized = normalizeKnowledgeContent(content); } catch { throw new AppError("Knowledge document content cannot be empty.", 400); }
      const hash = buildKnowledgeContentHash(normalized);
      if (hash !== item.contentHash) throw new AppError("File content changed after preview. Select the file again.", 409);
      const saved = await withImportLock(this.db, async (tx) => {
        const current = await tx.knowledgeImportItem.findUniqueOrThrow({ where: { id: itemId } });
        if (terminalUploads.has(current.uploadStatus)) return current;
        const duplicate = await this.findDuplicate(tx, hash);
        if (duplicate) return tx.knowledgeImportItem.update({ where: { id: itemId }, data: {
          uploadStatus: "duplicate", documentId: duplicate.documentId, documentVersionId: duplicate.id,
          error: duplicate.document.status === "archived" ? "Identical content exists in an archived document. It was not restored." : "Identical content already exists. No new version was created.",
        } });
        const baseTitle = normalizeKnowledgeDocumentTitle(undefined, current.fileName);
        let title = baseTitle;
        let suffix = 2;
        while (await tx.knowledgeDocument.findFirst({ where: { title }, select: { id: true } })) title = `${baseTitle} (${suffix++})`;
        const doc = await tx.knowledgeDocument.create({ data: { title, fileName: current.fileName, kind: "user_upload", status: "enabled", latestIndexStatus: "idle" } });
        const version = await tx.knowledgeDocumentVersion.create({ data: { documentId: doc.id, versionNumber: 1, content: normalized, contentHash: hash, charCount: normalized.length } });
        await tx.knowledgeDocument.update({ where: { id: doc.id }, data: { activeVersionId: version.id, activeVersionNumber: 1 } });
        return tx.knowledgeImportItem.update({ where: { id: itemId }, data: { uploadStatus: "stored", documentId: doc.id, documentVersionId: version.id, error: null } });
      });
      return (await this.summarize([saved]))[0];
    } catch (error) {
      await this.db.knowledgeImportItem.updateMany({ where: { id: itemId, batchId, uploadStatus: { in: ["pending", "failed"] } }, data: { uploadStatus: "failed", error: error instanceof Error ? error.message : "Upload failed." } });
      throw error;
    }
  }

  async setPaused(batchId: string, paused: boolean) {
    await this.requireBatch(this.db, batchId);
    return setImportPaused(this.db, batchId, paused);
  }

  async enqueue(batchId: string, itemIds: string[], failedOnly = false) {
    if (!ragConfig.enabled) throw new AppError("Indexing is disabled. Enable RAG before adding files to the queue.", 503);
    if (itemIds.length > IMPORT_MAX_FILES) throw new AppError("Select at most 1000 files.", 400);
    return withImportLock(this.db, async (tx) => {
      await this.requireBatch(tx, batchId);
      const results: { itemId: string; status: string; error?: string }[] = [];
      const rows = await tx.knowledgeImportItem.findMany({ where: { batchId, ...(failedOnly && !itemIds.length ? {} : { id: { in: itemIds } }) } });
      for (const id of new Set(itemIds)) {
        if (!rows.some((i) => i.id === id)) results.push({ itemId: id, status: "rejected", error: "This file does not belong to the selected import." });
      }
      for (const item of rows) {
        const previousJob = item.jobId ? await tx.ragIndexJob.findUnique({ where: { id: item.jobId } }) : null;
        if (failedOnly && (!previousJob || !["failed", "cancelled"].includes(previousJob.status))) continue;
        const doc = item.documentId ? await tx.knowledgeDocument.findUnique({ where: { id: item.documentId } }) : null;
        if (item.uploadStatus !== "stored" || !doc || doc.status === "archived" || doc.activeVersionId !== item.documentVersionId) {
          results.push({ itemId: item.id, status: "rejected", error: "Only stored files with an unchanged, non-archived version can be indexed." });
          continue;
        }
        if (doc.latestIndexStatus === "succeeded" || previousJob?.status === "succeeded") {
          results.push({ itemId: item.id, status: "succeeded" }); continue;
        }
        const active = await tx.ragIndexJob.findFirst({ where: { ownerType: "knowledge_document", ownerId: doc.id, status: { in: ["queued", "running"] } } });
        if (active) {
          results.push({ itemId: item.id, status: active.status, ...(active.importBatchId !== batchId ? { error: "This document already has an indexing job outside this import." } : {}) });
          continue;
        }
        const job = await tx.ragIndexJob.create({ data: {
          tenantId: ragConfig.defaultTenantId, jobType: "rebuild", ownerType: "knowledge_document", ownerId: doc.id,
          importBatchId: batchId, importVersionId: item.documentVersionId, status: "queued", maxAttempts: ragConfig.workerMaxAttempts,
          payloadJson: JSON.stringify({ progress: { stage: "queued", label: "Queued", percent: 0, updatedAt: new Date().toISOString() } }),
        } });
        await tx.knowledgeImportItem.update({ where: { id: item.id }, data: { jobId: job.id, error: null } });
        await tx.knowledgeDocument.update({ where: { id: doc.id }, data: { latestIndexStatus: "queued" } });
        results.push({ itemId: item.id, status: "queued" });
      }
      return results;
    });
  }
}

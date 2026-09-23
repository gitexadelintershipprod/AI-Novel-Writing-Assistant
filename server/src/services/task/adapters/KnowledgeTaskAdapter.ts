import type { TaskStatus, UnifiedTaskDetail, UnifiedTaskSummary } from "@ai-novel/shared/types/task";
import { prisma } from "../../../db/prisma";
import { AppError } from "../../../middleware/errorHandler";
import { ragServices } from "../../rag";
import type { RagJobType } from "../../rag/types";
import {
  isArchivableTaskStatus,
  normalizeFailureSummary,
} from "../taskSupport";
import {
  archiveTask as recordTaskArchive,
  getArchivedTaskIds,
  isTaskArchived,
} from "../taskArchive";
import {
  KNOWLEDGE_DOCUMENT_STEPS,
  buildSteps,
  toLegacyTaskStatus,
} from "../taskCenter.shared";
import { knowledgeTaskTitle, selectVisibleJobs } from "../../rag/jobs/knowledgeJobListing";

interface KnowledgeDocumentRecord {
  id: string;
  title: string;
  fileName: string;
  latestIndexStatus: string;
  lastIndexedAt: Date | null;
}

interface KnowledgeJobProgressPayload {
  stage?: string;
  label?: string;
  detail?: string;
  percent?: number;
  updatedAt?: string;
}

function parseJobProgress(payloadJson: string | null): KnowledgeJobProgressPayload | null {
  if (!payloadJson) {
    return null;
  }
  try {
    const parsed = JSON.parse(payloadJson) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return null;
    }
    const progress = (parsed as Record<string, unknown>).progress;
    if (!progress || typeof progress !== "object" || Array.isArray(progress)) {
      return null;
    }
    return progress as KnowledgeJobProgressPayload;
  } catch {
    return null;
  }
}

function getJobTitle(jobType: RagJobType, documentTitle: string): string {
  return knowledgeTaskTitle(jobType, documentTitle);
}

const KNOWLEDGE_PROGRESS_LABELS: Record<string, string> = {
  queued: "Queued",
  loading_source: "Loading source",
  chunking: "Splitting into chunks",
  embedding: "Generating vectors",
  ensuring_collection: "Validating vector collection",
  deleting_existing: "Removing previous index",
  upserting_vectors: "Writing to vector store",
  writing_metadata: "Saving index metadata",
  reading_relationships: "Reading relationships",
  completed: "Index complete",
  failed: "Index failed",
  cancelled: "Index cancelled",
};

const RELATIONSHIP_STEPS = [
  { key: "queued", label: "Queued" },
  { key: "reading_relationships", label: "Reading relationships" },
  { key: "completed", label: "Complete" },
] as const;

function getProgressLabel(progress: KnowledgeJobProgressPayload | null): string | null {
  if (!progress) {
    return null;
  }
  if (progress.label) {
    return progress.label;
  }
  return progress.stage ? KNOWLEDGE_PROGRESS_LABELS[progress.stage] ?? progress.stage : null;
}

function getRecoveryHint(status: TaskStatus, jobType: RagJobType): string {
  if (jobType === "graph_sync") {
    if (status === "failed") {
      return "Relationship reading failed. Retry after checking the model connection.";
    }
    if (status === "running") {
      return "Relationships are still being read for this book.";
    }
    if (status === "queued") {
      return "This book is waiting to be read for relationships.";
    }
    if (status === "cancelled") {
      return "Relationship reading was cancelled. Submit the task again to continue.";
    }
    return "No recovery action is needed.";
  }
  if (status === "failed") {
    return "Check the document version, chunking result, embedding model, and shared RAG queue before retrying.";
  }
  if (status === "running") {
    return "Indexing is still running. Wait for completion or review the live progress.";
  }
  if (status === "queued") {
    return "Indexing is queued. Check whether earlier jobs are occupying the RAG worker.";
  }
  if (status === "cancelled") {
    return "Indexing was cancelled. Submit a new indexing job if you want to continue.";
  }
  return "No recovery action is needed.";
}

function matchesKeyword(
  job: {
    id: string;
    ownerId: string;
    lastError: string | null;
  },
  document: KnowledgeDocumentRecord | undefined,
  keyword: string,
): boolean {
  const normalized = keyword.trim();
  if (!normalized) {
    return true;
  }
  return [
    job.id,
    job.ownerId,
    job.lastError ?? "",
    document?.title ?? "",
    document?.fileName ?? "",
  ].some((value) => value.includes(normalized));
}

export class KnowledgeTaskAdapter {
  private async listVisibleJobs(
    archivedFilter: { id?: { notIn: string[] } },
    take: number,
  ) {
    const running = await prisma.ragIndexJob.findMany({
      where: { ownerType: "knowledge_document", ...archivedFilter, status: "running" },
      orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
      take,
    });
    const queued = running.length >= take
      ? []
      : await prisma.ragIndexJob.findMany({
        where: { ownerType: "knowledge_document", ...archivedFilter, status: "queued" },
        orderBy: [{ createdAt: "asc" }, { id: "asc" }],
        take: take - running.length,
      });
    const active = selectVisibleJobs(running, queued, [], take);
    const finished = active.length >= take
      ? []
      : await prisma.ragIndexJob.findMany({
        where: {
          ownerType: "knowledge_document",
          ...archivedFilter,
          status: { in: ["succeeded", "failed", "cancelled"] },
        },
        orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
        take: take - active.length,
      });
    return selectVisibleJobs(running, queued, finished, take);
  }

  async list(input: {
    status?: TaskStatus;
    keyword?: string;
    take: number;
  }): Promise<UnifiedTaskSummary[]> {
    if (input.status === "waiting_approval") {
      return [];
    }

    const status = toLegacyTaskStatus(input.status);
    const archivedIds = await getArchivedTaskIds("knowledge_document");
    const archivedFilter = archivedIds.length ? { id: { notIn: archivedIds } } : {};
    const take = input.keyword ? Math.max(input.take * 3, input.take) : input.take;
    const rows = status
      ? await prisma.ragIndexJob.findMany({
        where: {
          ownerType: "knowledge_document",
          ...archivedFilter,
          status,
        },
        orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
        take,
      })
      : await this.listVisibleJobs(archivedFilter, take);

    const documents = await prisma.knowledgeDocument.findMany({
      where: {
        id: {
          in: Array.from(new Set(rows.map((item) => item.ownerId))),
        },
      },
      select: {
        id: true,
        title: true,
        fileName: true,
        latestIndexStatus: true,
        lastIndexedAt: true,
      },
    });

    const documentMap = new Map<string, KnowledgeDocumentRecord>(
      documents.map((item) => [item.id, item]),
    );

    return rows
      .filter((row) => !input.keyword || matchesKeyword(row, documentMap.get(row.ownerId), input.keyword))
      .slice(0, input.take)
      .map((row) => {
        const progress = parseJobProgress(row.payloadJson);
        const document = documentMap.get(row.ownerId);
        const documentTitle = document?.title ?? "Untitled knowledge document";
        const statusValue = row.status as TaskStatus;
        const sourceRoute = `/knowledge?id=${row.ownerId}`;
        const updatedAt = row.updatedAt.toISOString();
        const createdAt = row.createdAt.toISOString();
        const progressPercent = progress?.percent ?? (statusValue === "succeeded" || statusValue === "failed" || statusValue === "cancelled" ? 1 : 0);

        return {
          id: row.id,
          kind: "knowledge_document",
          title: getJobTitle(row.jobType as RagJobType, documentTitle),
          status: statusValue,
          progress: progressPercent,
          currentStage: progress?.stage ?? (statusValue === "queued" ? "queued" : statusValue === "running" ? "loading_source" : null),
          currentItemLabel: getProgressLabel(progress),
          attemptCount: row.attempts,
          maxAttempts: row.maxAttempts,
          lastError: row.lastError,
          createdAt,
          updatedAt,
          heartbeatAt: progress?.updatedAt ?? updatedAt,
          ownerId: row.ownerId,
          ownerLabel: documentTitle,
          sourceRoute,
          failureCode: row.status === "failed" ? "KNOWLEDGE_INDEX_FAILED" : null,
          failureSummary: row.status === "failed"
            ? normalizeFailureSummary(row.lastError, "Knowledge base indexing failed without a recorded error.")
            : row.status === "cancelled"
              ? "Knowledge base indexing was cancelled."
              : row.lastError,
          recoveryHint: getRecoveryHint(statusValue, row.jobType as RagJobType),
          sourceResource: {
            type: "knowledge_document",
            id: row.ownerId,
            label: documentTitle,
            route: sourceRoute,
          },
          targetResources: [{
            type: "knowledge_document",
            id: row.ownerId,
            label: documentTitle,
            route: sourceRoute,
          }],
        };
      });
  }

  async detail(id: string): Promise<UnifiedTaskDetail | null> {
    if (await isTaskArchived("knowledge_document", id)) {
      return null;
    }

    const row = await prisma.ragIndexJob.findUnique({
      where: { id },
    });
    if (!row || row.ownerType !== "knowledge_document") {
      return null;
    }

    const document = await prisma.knowledgeDocument.findUnique({
      where: { id: row.ownerId },
      select: {
        id: true,
        title: true,
        fileName: true,
        latestIndexStatus: true,
        lastIndexedAt: true,
      },
    });
    const progress = parseJobProgress(row.payloadJson);
    const documentTitle = document?.title ?? "Untitled knowledge document";
    const statusValue = row.status as TaskStatus;
    const sourceRoute = `/knowledge?id=${row.ownerId}`;
    const updatedAt = row.updatedAt.toISOString();
    const createdAt = row.createdAt.toISOString();
    const progressPercent = progress?.percent ?? (statusValue === "succeeded" || statusValue === "failed" || statusValue === "cancelled" ? 1 : 0);

    const summary: UnifiedTaskSummary = {
      id: row.id,
      kind: "knowledge_document",
      title: getJobTitle(row.jobType as RagJobType, documentTitle),
      status: statusValue,
      progress: progressPercent,
      currentStage: progress?.stage ?? (statusValue === "queued" ? "queued" : statusValue === "running" ? "loading_source" : null),
      currentItemLabel: getProgressLabel(progress),
      attemptCount: row.attempts,
      maxAttempts: row.maxAttempts,
      lastError: row.lastError,
      createdAt,
      updatedAt,
      heartbeatAt: progress?.updatedAt ?? updatedAt,
      ownerId: row.ownerId,
      ownerLabel: documentTitle,
      sourceRoute,
      failureCode: row.status === "failed" ? "KNOWLEDGE_INDEX_FAILED" : null,
      failureSummary: row.status === "failed"
        ? normalizeFailureSummary(row.lastError, "Knowledge base indexing failed without a recorded error.")
        : row.status === "cancelled"
          ? "Knowledge base indexing was cancelled."
          : row.lastError,
      recoveryHint: getRecoveryHint(statusValue, row.jobType as RagJobType),
      sourceResource: {
        type: "knowledge_document",
        id: row.ownerId,
        label: documentTitle,
        route: sourceRoute,
      },
      targetResources: [{
        type: "knowledge_document",
        id: row.ownerId,
        label: documentTitle,
        route: sourceRoute,
      }],
    };

    return {
      ...summary,
      provider: null,
      model: null,
      startedAt: statusValue === "queued" ? null : progress?.updatedAt ?? updatedAt,
      finishedAt: statusValue === "succeeded" || statusValue === "failed" || statusValue === "cancelled"
        ? updatedAt
        : null,
      retryCountLabel: `${row.attempts}/${row.maxAttempts}`,
      meta: {
        jobType: row.jobType,
        tenantId: row.tenantId,
        ownerType: row.ownerType,
        ownerId: row.ownerId,
        runAfter: row.runAfter.toISOString(),
        progress,
        document: document
          ? {
            id: document.id,
            title: document.title,
            fileName: document.fileName,
            latestIndexStatus: document.latestIndexStatus,
            lastIndexedAt: document.lastIndexedAt?.toISOString() ?? null,
          }
          : null,
      },
      steps: buildSteps(
        row.jobType === "graph_sync" ? RELATIONSHIP_STEPS : KNOWLEDGE_DOCUMENT_STEPS,
        summary.status,
        summary.currentStage,
        summary.createdAt,
        summary.updatedAt,
      ),
      failureDetails: row.lastError,
    };
  }

  async retry(id: string): Promise<UnifiedTaskDetail> {
    if (await isTaskArchived("knowledge_document", id)) {
      throw new AppError("Task not found.", 404);
    }

    const job = await prisma.ragIndexJob.findUnique({
      where: { id },
    });
    if (!job || job.ownerType !== "knowledge_document") {
      throw new AppError("Task not found.", 404);
    }
    if (job.status !== "failed" && job.status !== "cancelled") {
      throw new AppError("Only failed or cancelled knowledge index jobs can be retried.", 400);
    }

    if (job.jobType !== "delete") {
      const document = await prisma.knowledgeDocument.findUnique({
        where: { id: job.ownerId },
        select: { id: true },
      });
      if (!document) {
        throw new AppError("Knowledge document not found.", 404);
      }
      await prisma.knowledgeDocument.update({
        where: { id: document.id },
        data: job.jobType === "graph_sync"
          ? { latestGraphStatus: "queued" }
          : { latestIndexStatus: "queued" },
      });
    }

    const nextJob = await ragServices.ragIndexService.enqueueOwnerJob(job.jobType as RagJobType, "knowledge_document", job.ownerId, {
      tenantId: job.tenantId,
      maxAttempts: job.maxAttempts,
    });
    const detail = await this.detail(nextJob.id);
    if (!detail) {
      throw new AppError("Task not found after retry.", 404);
    }
    return detail;
  }

  async cancel(id: string): Promise<UnifiedTaskDetail> {
    if (await isTaskArchived("knowledge_document", id)) {
      throw new AppError("Task not found.", 404);
    }

    const job = await prisma.ragIndexJob.findUnique({
      where: { id },
    });
    if (!job || job.ownerType !== "knowledge_document") {
      throw new AppError("Task not found.", 404);
    }
    if (job.status !== "queued" && job.status !== "running") {
      throw new AppError("Only queued or running knowledge index jobs can be cancelled.", 400);
    }

    await ragServices.ragIndexService.updateJobStatus(id, {
      status: "cancelled",
      lastError: null,
    });
    const detail = await this.detail(id);
    if (!detail) {
      throw new AppError("Task not found after cancellation.", 404);
    }
    return detail;
  }

  async archive(id: string): Promise<UnifiedTaskDetail | null> {
    if (await isTaskArchived("knowledge_document", id)) {
      return null;
    }

    const job = await prisma.ragIndexJob.findUnique({
      where: { id },
    });
    if (!job || job.ownerType !== "knowledge_document") {
      throw new AppError("Task not found.", 404);
    }
    if (!isArchivableTaskStatus(job.status as TaskStatus)) {
      throw new AppError("Only completed, failed, or cancelled tasks can be archived.", 400);
    }

    await recordTaskArchive("knowledge_document", id);
    return null;
  }
}

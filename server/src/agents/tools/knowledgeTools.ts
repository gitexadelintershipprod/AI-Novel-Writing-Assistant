import { prisma } from "../../db/prisma";
import { AgentToolError, type AgentToolName } from "../types";
import type { AgentToolDefinition } from "./toolTypes";
import {
  getIndexFailureReasonOutputSchema,
  getKnowledgeDocumentDetailOutputSchema,
  knowledgeDocumentIdInputSchema,
  listKnowledgeDocumentsInputSchema,
  listKnowledgeDocumentsOutputSchema,
} from "./knowledgeToolSchemas";

export const knowledgeToolDefinitions: Partial<
  Record<AgentToolName, AgentToolDefinition<Record<string, unknown>, Record<string, unknown>>>
> = {
  list_knowledge_documents: {
    name: "list_knowledge_documents",
    title: "List knowledge documents",
    description: "Read knowledge documents, index status, and the latest index error.",
    category: "read",
    riskLevel: "low",
    domainAgent: "KnowledgeAgent",
    resourceScopes: ["knowledge_document", "task"],
    inputSchema: listKnowledgeDocumentsInputSchema,
    outputSchema: listKnowledgeDocumentsOutputSchema,
    execute: async (_context, rawInput) => {
      const input = listKnowledgeDocumentsInputSchema.parse(rawInput);
      const rows = await prisma.knowledgeDocument.findMany({
        where: {
          ...(input.status ? { status: input.status } : {}),
          ...(input.kind ? { kind: input.kind } : {}),
        },
        orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
        take: input.limit ?? 20,
      });
      const latestJobs = await prisma.ragIndexJob.findMany({
        where: {
          ownerType: "knowledge_document",
          ownerId: { in: rows.map((item) => item.id) },
        },
        orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
      });
      const latestJobMap = new Map<string, (typeof latestJobs)[number]>();
      for (const job of latestJobs) {
        if (!latestJobMap.has(job.ownerId)) {
          latestJobMap.set(job.ownerId, job);
        }
      }
      return listKnowledgeDocumentsOutputSchema.parse({
        items: rows.map((row) => ({
          id: row.id,
          title: row.title,
          fileName: row.fileName,
          kind: row.kind,
          sourceAnalysisId: row.sourceAnalysisId,
          status: row.status,
          latestIndexStatus: row.latestIndexStatus,
          lastIndexedAt: row.lastIndexedAt?.toISOString() ?? null,
          latestIndexError: latestJobMap.get(row.id)?.lastError ?? null,
        })),
        summary: `Read ${rows.length} knowledge documents.`,
      });
    },
  },
  get_knowledge_document_detail: {
    name: "get_knowledge_document_detail",
    title: "Read knowledge-document details",
    description: "Read knowledge-document details, version count, binding count, and index status.",
    category: "read",
    riskLevel: "low",
    domainAgent: "KnowledgeAgent",
    resourceScopes: ["knowledge_document"],
    inputSchema: knowledgeDocumentIdInputSchema,
    outputSchema: getKnowledgeDocumentDetailOutputSchema,
    execute: async (_context, rawInput) => {
      const input = knowledgeDocumentIdInputSchema.parse(rawInput);
      const row = await prisma.knowledgeDocument.findUnique({
        where: { id: input.documentId },
        include: {
          versions: {
            select: { id: true },
          },
          bindings: {
            select: { id: true },
          },
        },
      });
      if (!row) {
        throw new AgentToolError("NOT_FOUND", "Knowledge document not found.");
      }
      const latestJob = await prisma.ragIndexJob.findFirst({
        where: {
          ownerType: "knowledge_document",
          ownerId: row.id,
        },
        orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
      });
      return getKnowledgeDocumentDetailOutputSchema.parse({
        id: row.id,
        title: row.title,
        fileName: row.fileName,
        kind: row.kind,
        sourceAnalysisId: row.sourceAnalysisId,
        status: row.status,
        activeVersionNumber: row.activeVersionNumber,
        latestIndexStatus: row.latestIndexStatus,
        lastIndexedAt: row.lastIndexedAt?.toISOString() ?? null,
        latestIndexError: latestJob?.lastError ?? null,
        versionCount: row.versions.length,
        bindingCount: row.bindings.length,
        summary: `Document “${row.title}” is currently indexed as ${row.latestIndexStatus}.`,
      });
    },
  },
  get_index_failure_reason: {
    name: "get_index_failure_reason",
    title: "Explain why indexing failed",
    description: "Explain why knowledge-document indexing failed, is queued, or is unfinished.",
    category: "inspect",
    riskLevel: "low",
    domainAgent: "KnowledgeAgent",
    resourceScopes: ["knowledge_document", "task"],
    inputSchema: knowledgeDocumentIdInputSchema,
    outputSchema: getIndexFailureReasonOutputSchema,
    execute: async (_context, rawInput) => {
      const input = knowledgeDocumentIdInputSchema.parse(rawInput);
      const row = await prisma.knowledgeDocument.findUnique({
        where: { id: input.documentId },
      });
      if (!row) {
        throw new AgentToolError("NOT_FOUND", "Knowledge document not found.");
      }
      const latestJob = await prisma.ragIndexJob.findFirst({
        where: {
          ownerType: "knowledge_document",
          ownerId: row.id,
        },
        orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
      });
      const failureSummary = row.latestIndexStatus === "failed"
        ? (latestJob?.lastError?.trim() || "The index task failed without a recorded error.")
        : row.latestIndexStatus === "running"
          ? "The index task is still running and has not failed."
          : row.latestIndexStatus === "queued"
            ? "The index task is still queued."
            : "There is no index-failure record.";
      const recoveryHint = row.latestIndexStatus === "failed"
        ? "Check the document content, vector settings, and the latest rebuild-task log before retrying."
        : row.latestIndexStatus === "queued"
          ? "Check that the index worker is running normally."
          : "No recovery action is needed now.";
      return getIndexFailureReasonOutputSchema.parse({
        documentId: row.id,
        status: row.latestIndexStatus,
        failureSummary,
        failureDetails: latestJob?.lastError ?? null,
        recoveryHint,
        summary: failureSummary,
      });
    },
  },
};

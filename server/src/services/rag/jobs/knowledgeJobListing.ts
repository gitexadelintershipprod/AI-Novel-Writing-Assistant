import type { RagJobProgressSnapshot } from "../RagIndexService";

export type KnowledgeTrackedStatus = "idle" | "queued" | "running" | "succeeded" | "failed";

export function knowledgeTaskTitle(jobType: string, documentTitle: string): string {
  if (jobType === "graph_sync") {
    return `Update book relationships: ${documentTitle}`;
  }
  if (jobType === "delete") {
    return `Delete knowledge base index: ${documentTitle}`;
  }
  if (jobType === "upsert") {
    return `Update knowledge base index: ${documentTitle}`;
  }
  return `Rebuild knowledge base index: ${documentTitle}`;
}

export function knowledgeDocumentJobPatch(jobType: string, status: string): {
  latestIndexStatus?: KnowledgeTrackedStatus;
  latestGraphStatus?: KnowledgeTrackedStatus;
  touchIndexTime: boolean;
  touchGraphTime: boolean;
} {
  const nextStatus: KnowledgeTrackedStatus = jobType === "delete" && (status === "succeeded" || status === "cancelled")
    ? "idle"
    : status === "queued"
      ? "queued"
      : status === "running"
        ? "running"
        : status === "succeeded"
          ? "succeeded"
          : status === "cancelled"
            ? "idle"
            : "failed";
  if (jobType === "graph_sync") {
    return {
      latestGraphStatus: nextStatus,
      touchIndexTime: false,
      touchGraphTime: status === "succeeded",
    };
  }
  return {
    latestIndexStatus: nextStatus,
    touchIndexTime: status === "succeeded" && jobType !== "delete",
    touchGraphTime: false,
  };
}

export function selectVisibleJobs<T>(running: T[], queued: T[], finished: T[], limit: number): T[] {
  const take = Math.max(0, Math.floor(limit));
  return [...running, ...queued, ...finished].slice(0, take);
}

export function knowledgeStatusProgress(input: {
  jobType: string;
  status: string;
  lastError?: string | null;
  previous?: Pick<RagJobProgressSnapshot, "current" | "total" | "documents" | "chunks" | "percent">;
}): Omit<RagJobProgressSnapshot, "updatedAt"> | null {
  const relationship = input.jobType === "graph_sync";
  if (input.status === "queued") {
    return {
      stage: "queued",
      label: relationship
        ? "Waiting for relationships"
        : input.lastError ? "Waiting to retry" : "Queued",
      detail: relationship
        ? (input.lastError
          ? `This book is waiting to be read again: ${input.lastError}`
          : "This book is waiting to be read for relationships.")
        : (input.lastError ? `The job was queued again: ${input.lastError}` : "The indexing job is queued."),
      percent: 0,
    };
  }
  if (input.status === "running") {
    return relationship
      ? {
        stage: "reading_relationships",
        label: "Reading relationships",
        detail: "Reading this book's sections for relationships.",
        percent: 0,
      }
      : {
        stage: "loading_source",
        label: "Processing",
        detail: "The indexing worker started processing the job.",
        percent: 0.02,
      };
  }
  if (input.status === "succeeded") {
    return {
      stage: "completed",
      label: relationship ? "Relationships ready" : "Index complete",
      detail: relationship ? "This book's relationships are ready." : "The indexing job completed.",
      percent: 1,
    };
  }
  if (input.status === "cancelled") {
    return {
      stage: "cancelled",
      label: relationship ? "Relationships cancelled" : "Index cancelled",
      detail: input.lastError ?? (relationship ? "Relationship reading was cancelled." : "The indexing job was cancelled."),
      current: input.previous?.current,
      total: input.previous?.total,
      documents: input.previous?.documents,
      chunks: input.previous?.chunks,
      percent: input.previous?.percent ?? 0,
    };
  }
  if (input.status === "failed") {
    return {
      stage: "failed",
      label: relationship ? "Relationships failed" : "Index failed",
      detail: input.lastError ?? (relationship ? "Relationship reading failed." : "The indexing job failed."),
      percent: 1,
    };
  }
  return null;
}

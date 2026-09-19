import type { TaskKind, TaskStatus } from "@ai-novel/shared/types/task";
import {
  extractStructuredOutputErrorCategory,
} from "../../llm/structuredOutput";
import { summarizeStructuredOutputFailure } from "../../llm/structuredInvoke";

export function normalizeFailureSummary(summary?: string | null, fallback = "No explicit failure has been recorded."): string {
  return summary?.trim() || fallback;
}

export function resolveStructuredFailureSummary(summary?: string | null): {
  failureCode: string | null;
  failureSummary: string | null;
} {
  if (!summary?.trim()) {
    return {
      failureCode: null,
      failureSummary: null,
    };
  }
  const category = extractStructuredOutputErrorCategory(summary);
  if (!category) {
    return {
      failureCode: null,
      failureSummary: null,
    };
  }
  const details = summarizeStructuredOutputFailure({
    error: summary,
    fallbackAvailable: false,
  });
  return {
    failureCode: details.failureCode,
    failureSummary: details.summary,
  };
}

export function isArchivableTaskStatus(status: TaskStatus): boolean {
  return status === "succeeded" || status === "failed" || status === "cancelled";
}

export function buildTaskRecoveryHint(kind: TaskKind, status: TaskStatus): string {
  if (status === "failed") {
    if (kind === "knowledge_document") {
      return "Before retrying, check the knowledge document version, chunking results, vector model, and shared RAG queue usage.";
    }
    if (kind === "agent_run") {
      return "Review the last failed step, the related approval status, and the associated resource context before deciding whether to retry.";
    }
    if (kind === "novel_workflow") {
      return "Resume from the most recent checkpoint; first check whether the current stage assets are complete, whether the model timed out, and whether the recovery target page can be reopened.";
    }
    if (kind === "novel_pipeline") {
      return "Before retrying, check the model configuration, chapter context, and the most recent generation log.";
    }
    if (kind === "book_analysis") {
      return "Before retrying, check the source document quality, model availability, and the book analysis segmentation results.";
    }
    if (kind === "style_extraction") {
      return "Before retrying, check that the reference text is complete, the model is available, and the current retention policy suits auto-saving.";
    }
    return "Before retrying, check the prompt, model configuration, and the target resource status.";
  }
  if (status === "waiting_approval") {
    if (kind === "novel_workflow") {
      return "The novel's main workflow has reached a safe checkpoint; click Continue to return to the matching stage page and resume writing.";
    }
    return "The task is waiting for approval; handle the approval before it can continue.";
  }
  if (status === "running") {
    return "The task is still running; wait for it to finish or check the live progress trail.";
  }
  if (status === "queued") {
    if (kind === "knowledge_document") {
      return "The knowledge base indexing job is still in the shared RAG queue; check whether earlier tasks are occupying the workers.";
    }
    if (kind === "style_extraction") {
      return "The writing formula extraction task is still queued; check its progress in the Task Center, and the result will be auto-saved later.";
    }
    return "The task is still queued; check that the worker threads and model service are available.";
  }
  if (status === "cancelled") {
    if (kind === "knowledge_document") {
      return "The knowledge base indexing job has been cancelled; to continue, submit the indexing task again.";
    }
    if (kind === "novel_workflow") {
      return "The novel's main workflow has been cancelled; to continue, you can resume from the most recent checkpoint.";
    }
    if (kind === "style_extraction") {
      return "The writing formula extraction task has been cancelled; if you still want to generate this writing formula, submit the reference text again.";
    }
    return "The task has been cancelled; if you still want to continue, start it again or retry.";
  }
  return "No recovery action is needed now.";
}

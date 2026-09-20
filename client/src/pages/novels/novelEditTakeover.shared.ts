import type { UnifiedTaskDetail } from "@ai-novel/shared/types/task";
import type { DirectorLockScope } from "@ai-novel/shared/types/novelDirector";
import type { NovelEditTakeoverState } from "./components/NovelEditView.types";

export function resolveAutoExecutionScopeLabel(task: UnifiedTaskDetail | null): string {
  const seedPayload = (task?.meta.seedPayload ?? null) as {
    autoExecution?: {
      scopeLabel?: string | null;
      totalChapterCount?: number | null;
    } | null;
  } | null;
  const scopeLabel = seedPayload?.autoExecution?.scopeLabel?.trim();
  if (scopeLabel) {
    return scopeLabel;
  }
  const fallbackCount = Math.max(1, Math.round(seedPayload?.autoExecution?.totalChapterCount ?? 10));
  return `Chapters 1–${fallbackCount}`;
}

export function formatTakeoverCheckpoint(
  checkpoint: string | null | undefined,
  task: UnifiedTaskDetail | null,
): string {
  if (checkpoint === "candidate_selection_required") {
    return "Waiting to confirm the book direction";
  }
  if (checkpoint === "book_contract_ready") {
    return "Book Contract to be confirmed";
  }
  if (checkpoint === "character_setup_required") {
    return "Role preparation pending review";
  }
  if (checkpoint === "volume_strategy_ready") {
    return "Volume Strategy/Volume Skeleton Pending Review";
  }
  if (checkpoint === "chapter_batch_ready") {
    return `${resolveAutoExecutionScopeLabel(task)} auto-run is paused`;
  }
  if (checkpoint === "replan_required") {
    return "Pending processing of re-planning suggestions";
  }
  if (checkpoint === "workflow_completed") {
    return "The main process has been completed";
  }
  return "Director process in progress";
}

export function buildTakeoverTitle(input: {
  mode: NovelEditTakeoverState["mode"];
  novelTitle: string;
  checkpointType: string | null | undefined;
  scopeLabel: string;
}): string {
  if (
    input.mode === "running"
    && input.checkpointType === "chapter_batch_ready"
  ) {
    return `"${input.novelTitle}" is running ${input.scopeLabel} automatically`;
  }
  if (input.mode === "waiting" || input.mode === "action_required") {
    if (input.checkpointType === "candidate_selection_required") {
      return `"${input.novelTitle}" is waiting for you to confirm the book direction`;
    }
    if (input.checkpointType === "character_setup_required") {
      return `"${input.novelTitle}" is waiting for character setup review`;
    }
    if (input.checkpointType === "volume_strategy_ready") {
      return `"${input.novelTitle}" is waiting for volume strategy review`;
    }
    if (input.checkpointType === "workflow_completed") {
      return `"${input.novelTitle}" finished this Auto-Director round`;
    }
    if (input.checkpointType === "replan_required") {
      return `"${input.novelTitle}" needs a replan before continuing`;
    }
  }
  if (input.mode === "failed") {
    if (input.checkpointType === "chapter_batch_ready") {
      return `"${input.novelTitle}" ${input.scopeLabel} auto-run is paused`;
    }
    return `"${input.novelTitle}" Auto-Director was interrupted`;
  }
  if (input.mode === "loading") {
    return `"${input.novelTitle}" Auto-Director status is syncing`;
  }
  return `"${input.novelTitle}" is directing automatically`;
}

export function buildTakeoverDescription(input: {
  mode: NovelEditTakeoverState["mode"];
  checkpointType: string | null | undefined;
  reviewScope: DirectorLockScope | null | undefined;
  scopeLabel: string;
}): string {
  if (
    input.mode === "running"
    && input.checkpointType === "chapter_batch_ready"
  ) {
    return `AI is running automatically in the background for ${input.scopeLabel}, and will continue review and repair. You can still view and edit manually; if you change the current chapter at the same time, later automatic results may overwrite that text.`;
  }
  if (input.mode === "waiting" || input.mode === "action_required") {
    if (input.checkpointType === "candidate_selection_required") {
      return "Book-level direction candidates have been generated. Please return to the book-level direction confirmation page to select or modify the plan before the automatic director can continue to advance the subsequent main chain.";
    }
    if (input.checkpointType === "character_setup_required") {
      return "Character preparation has been generated. You can check the core characters, relationships, and current goals first and confirm them before continuing with autodirecting.";
    }
    if (input.checkpointType === "volume_strategy_ready") {
      return "Volume strategy/volume skeleton can currently be reviewed and fine-tuned. After confirmation, continue to automatically generate detailed resources for rhythm boards, split chapters, and selected chapter batches.";
    }
    if (input.checkpointType === "workflow_completed") {
      return `Auto-Director finished ${input.scopeLabel} writing, review, and repair. You can keep writing in chapter production, or finish and leave director mode.`;
    }
    if (input.checkpointType === "replan_required") {
      return "The AI determines that the arrangement of the current chapter and adjacent chapters needs to be adjusted. After continuing, the existing text will be retained, and nearby chapters will be re-planned first, and then the ungenerated chapters will be continued.";
    }
    if (input.reviewScope) {
      return "AutoDirector has reached the review point. Please check the current stage of the product first before deciding whether to proceed.";
    }
  }
  if (input.mode === "failed") {
    if (input.checkpointType === "chapter_batch_ready") {
      return `${input.scopeLabel} automated execution is paused. You can first view the execution details or quality repair area before deciding whether to continue automatic execution.`;
    }
    return "The backend director process has been interrupted. You can check the execution details before deciding whether to resume from the latest progress point.";
  }
  if (input.mode === "loading") {
    return "Synchronizing the current automatic director status.";
  }
  return "AI is taking over the book opening process in the background. You can continue to manually operate the current project; if the same piece of content is modified at the same time as the automatic director, the latest writing result shall prevail.";
}

export function buildContinueAutoExecutionActionLabel(scopeLabel: string, isPending: boolean): string {
  return isPending ? "Continue to execute..." : `Continue automatic execution of ${scopeLabel}`;
}

export function buildReplanAndContinueActionLabel(isPending: boolean): string {
  return isPending ? "Re-planning..." : "Continue after re-planning";
}

export function buildContinueAutoExecutionToast(scopeLabel: string): string {
  return `Auto-Director has continued ${scopeLabel}; review and repair will keep running in the background.`;
}

import type {
  NovelWorkflowCheckpoint,
  NovelWorkflowStage,
} from "@ai-novel/shared/types/novelWorkflow";
import type { TaskStatus } from "@ai-novel/shared/types/task";
import { isAutoDirectorRecoveryInProgress } from "../novel/workflow/novelWorkflowRecoveryHeuristics";
import { normalizeFailureSummary } from "./taskSupport";
import { NOVEL_WORKFLOW_STAGE_LABELS } from "../novel/workflow/novelWorkflow.shared";

interface WorkflowExplainabilityInput {
  status: TaskStatus;
  pendingManualRecovery?: boolean | null;
  currentStage?: string | null;
  currentItemKey?: string | null;
  checkpointType?: NovelWorkflowCheckpoint | null;
  lastError?: string | null;
  executionScopeLabel?: string | null;
}

export interface WorkflowExplainabilitySummary {
  displayStatus: string | null;
  blockingReason: string | null;
  resumeAction: string | null;
  lastHealthyStage: string | null;
}

const WORKFLOW_ITEM_STAGE_MAP: Partial<Record<string, NovelWorkflowStage>> = {
  project_setup: "project_setup",
  auto_director: "auto_director",
  candidate_seed_alignment: "auto_director",
  candidate_project_framing: "auto_director",
  candidate_direction_batch: "auto_director",
  candidate_title_pack: "auto_director",
  novel_create: "project_setup",
  book_contract: "story_macro",
  story_macro: "story_macro",
  constraint_engine: "story_macro",
  character_setup: "character_setup",
  character_cast_apply: "character_setup",
  volume_strategy: "volume_strategy",
  volume_skeleton: "volume_strategy",
  beat_sheet: "structured_outline",
  chapter_list: "structured_outline",
  chapter_sync: "structured_outline",
  chapter_detail_bundle: "structured_outline",
  structured_outline: "structured_outline",
  chapter_execution: "chapter_execution",
  quality_repair: "quality_repair",
};

const CHECKPOINT_DISPLAY_STATUS: Record<NovelWorkflowCheckpoint, string> = {
  candidate_selection_required: "Waiting to confirm the book direction",
  book_contract_ready: "Book Contract is ready",
  character_setup_required: "Role preparation pending review",
  volume_strategy_ready: "Volume strategy pending review",
  production_experience_required: "Ready to start writing, waiting to select production method",
  chapter_batch_ready: "Prepared chapters can enter execution",
  step_review_required: "Current step to be checked",
  replan_required: "Waiting for re-planning",
  workflow_completed: "Autodirector completed",
};

const CHECKPOINT_BLOCKING_REASON: Record<NovelWorkflowCheckpoint, string> = {
  candidate_selection_required: "Confirm the book direction before Auto-Director can continue the later main chain.",
  book_contract_ready: "The Book Contract is generated. Confirm the core promises before continuing planning.",
  character_setup_required: "Character setup was generated. Review the cast before continuing.",
  volume_strategy_ready: "Volume strategy and skeleton are ready. Confirm the volume plan before continuing.",
  production_experience_required: "Auto-Director finished pre-draft setup. Choose simple writing or professional writing.",
  chapter_batch_ready: "Chapter-split and execution resources for this range are ready. You can enter chapter execution or keep auto-running this range.",
  step_review_required: "The current director step is generated. Review or confirm it before the next step.",
  replan_required: "The audit result requires a replan before later chapters can keep moving.",
  workflow_completed: "The default main flow is working. You can enter chapter execution and keep writing.",
};

const CHECKPOINT_LAST_HEALTHY_STAGE: Record<NovelWorkflowCheckpoint, NovelWorkflowStage> = {
  candidate_selection_required: "auto_director",
  book_contract_ready: "story_macro",
  character_setup_required: "character_setup",
  volume_strategy_ready: "volume_strategy",
  production_experience_required: "structured_outline",
  chapter_batch_ready: "structured_outline",
  step_review_required: "auto_director",
  replan_required: "quality_repair",
  workflow_completed: "quality_repair",
};

function getExecutionScopeLabel(input: WorkflowExplainabilityInput, fallback = "Chapter 1-10"): string {
  return input.executionScopeLabel?.trim() || fallback;
}

function buildAutoExecutionPreparedStatus(input: WorkflowExplainabilityInput): string {
  return `${getExecutionScopeLabel(input)} can enter chapter execution`;
}

function buildAutoExecutionRunningStatus(input: WorkflowExplainabilityInput): string {
  return `${getExecutionScopeLabel(input)}Automatically executing`;
}

function buildAutoExecutionPausedStatus(input: WorkflowExplainabilityInput): string {
  return `${getExecutionScopeLabel(input)}Auto-run is paused`;
}

function buildAutoExecutionCancelledStatus(input: WorkflowExplainabilityInput): string {
  return `${getExecutionScopeLabel(input)}Auto execution canceled`;
}

function buildAutoExecutionResumeAction(input: WorkflowExplainabilityInput): string {
  return `Continue automatic execution${getExecutionScopeLabel(input)}`;
}

function buildAutoExecutionPreparedReason(input: WorkflowExplainabilityInput): string {
  const scopeLabel = getExecutionScopeLabel(input);
  return `${scopeLabel} detailing is ready. You can enter chapter execution, or let the system keep auto-running ${scopeLabel}.`;
}

function buildAutoExecutionPausedReason(input: WorkflowExplainabilityInput): string {
  return `${getExecutionScopeLabel(input)} auto-run paused during the batch stage. Review the results, then decide whether to continue auto-running the current range.`;
}

function isPreparedChapterBatchCheckpoint(input: WorkflowExplainabilityInput): boolean {
  return input.checkpointType === "chapter_batch_ready" && input.status === "waiting_approval";
}

function isPausedChapterBatchCheckpoint(input: WorkflowExplainabilityInput): boolean {
  return input.checkpointType === "chapter_batch_ready"
    && (input.status === "failed" || input.status === "cancelled");
}

function getStageLabel(stage: NovelWorkflowStage | null | undefined): string | null {
  return stage ? (NOVEL_WORKFLOW_STAGE_LABELS[stage] ?? stage) : null;
}

function getLastHealthyStage(input: WorkflowExplainabilityInput): string | null {
  if (isPreparedChapterBatchCheckpoint(input)) {
    return getStageLabel("structured_outline");
  }
  if (isPausedChapterBatchCheckpoint(input)) {
    return getStageLabel("chapter_execution");
  }
  if (input.checkpointType) {
    return getStageLabel(CHECKPOINT_LAST_HEALTHY_STAGE[input.checkpointType]);
  }
  const mappedStage = input.currentItemKey ? WORKFLOW_ITEM_STAGE_MAP[input.currentItemKey] : null;
  if (mappedStage) {
    return getStageLabel(mappedStage);
  }
  return input.currentStage?.trim() || null;
}

function getCurrentStageLabel(input: WorkflowExplainabilityInput): string | null {
  const mappedStage = input.currentItemKey ? WORKFLOW_ITEM_STAGE_MAP[input.currentItemKey] : null;
  if (mappedStage) {
    return getStageLabel(mappedStage);
  }
  if (input.currentStage && input.currentStage in NOVEL_WORKFLOW_STAGE_LABELS) {
    return getStageLabel(input.currentStage as NovelWorkflowStage);
  }
  return input.currentStage?.trim() || null;
}

export function buildWorkflowResumeAction(
  status: TaskStatus,
  checkpointType: NovelWorkflowCheckpoint | null,
  executionScopeLabel?: string | null,
  pendingManualRecovery?: boolean | null,
): string | null {
  const explainabilityInput = {
    status,
    checkpointType,
    executionScopeLabel,
    pendingManualRecovery,
  } satisfies WorkflowExplainabilityInput;
  if (status === "waiting_approval") {
    if (checkpointType === "candidate_selection_required") {
      return "Continue to confirm the book-level direction";
    }
    if (checkpointType === "book_contract_ready") {
      return "Review the Book Contract";
    }
    if (checkpointType === "character_setup_required") {
      return "Review character setup";
    }
    if (checkpointType === "volume_strategy_ready") {
      return "Review volume strategy";
    }
    if (checkpointType === "chapter_batch_ready") {
      return buildAutoExecutionResumeAction(explainabilityInput);
    }
    if (checkpointType === "replan_required") {
      return "Handle replan";
    }
    if (checkpointType === "workflow_completed") {
      return "Enter chapter execution";
    }
    return "Continue the main flow of the novel";
  }
  if (explainabilityInput.pendingManualRecovery) {
    return "Resume from the latest checkpoint";
  }
  if (status === "failed" || status === "cancelled") {
    if (checkpointType === "chapter_batch_ready") {
      return buildAutoExecutionResumeAction(explainabilityInput);
    }
    if (checkpointType === "workflow_completed") {
      return "Enter chapter execution";
    }
    return "Resume from the latest checkpoint";
  }
  if (status === "running" || status === "queued") {
    return "View current progress";
  }
  if (status === "succeeded" && checkpointType === "workflow_completed") {
    return "Enter chapter execution";
  }
  return null;
}

function buildDisplayStatus(input: WorkflowExplainabilityInput): string | null {
  if (input.pendingManualRecovery) {
    return "Waiting for manual recovery";
  }
  if (isAutoDirectorRecoveryInProgress(input)) {
    const currentStageLabel = getCurrentStageLabel(input);
    return currentStageLabel
      ? `${currentStageLabel} recovering`
      : "Auto-Director is recovering";
  }
  if (
    (input.status === "queued" || input.status === "running")
    && input.checkpointType === "chapter_batch_ready"
  ) {
    return buildAutoExecutionRunningStatus(input);
  }
  if (input.status === "waiting_approval") {
    if (input.checkpointType === "chapter_batch_ready") {
      return buildAutoExecutionPreparedStatus(input);
    }
    return input.checkpointType
      ? CHECKPOINT_DISPLAY_STATUS[input.checkpointType]
      : "Waiting to continue the novel main flow";
  }
  if (input.status === "running") {
    const currentStageLabel = getCurrentStageLabel(input);
    return currentStageLabel
      ? `${currentStageLabel} in progress`
      : "Auto director in progress";
  }
  if (input.status === "queued") {
    return "Automatic director queued";
  }
  if (input.status === "failed") {
    if (input.checkpointType === "chapter_batch_ready") {
      return buildAutoExecutionPausedStatus(input);
    }
    return "Auto-Director execution failed";
  }
  if (input.status === "cancelled") {
    if (input.checkpointType === "chapter_batch_ready") {
      return buildAutoExecutionCancelledStatus(input);
    }
    return "Auto director canceled";
  }
  if (input.checkpointType === "workflow_completed") {
    return "Autodirector completed";
  }
  return input.status === "succeeded" ? "The novel main flow is complete" : null;
}

function buildBlockingReason(input: WorkflowExplainabilityInput): string | null {
  if (input.pendingManualRecovery) {
    return input.lastError?.trim() || "The task paused after a service restart and is waiting for manual recovery.";
  }
  if (isAutoDirectorRecoveryInProgress(input)) {
    return input.lastError?.trim() || "The Auto-Director task is recovering from a service restart.";
  }
  if (input.status === "running" || input.status === "succeeded") {
    return null;
  }
  if (input.status === "queued") {
    return "The task is queued and waiting for a worker and model resources.";
  }
  if (input.status === "waiting_approval") {
    if (input.checkpointType === "chapter_batch_ready") {
      return buildAutoExecutionPreparedReason(input);
    }
    return input.checkpointType
      ? CHECKPOINT_BLOCKING_REASON[input.checkpointType]
      : "The workflow has stopped at a safe checkpoint and can only continue after the current stage is handled.";
  }
  if (input.status === "failed") {
    if (input.checkpointType === "chapter_batch_ready") {
      return `${getExecutionScopeLabel(input)}auto execution was interrupted during the batch stage; we recommend resuming from the most recent healthy stage.`;
    }
    return normalizeFailureSummary(input.lastError, "The current stage failed; we recommend resuming from the most recent checkpoint.");
  }
  if (input.status === "cancelled") {
    if (input.checkpointType === "chapter_batch_ready") {
      return `${getExecutionScopeLabel(input)}auto execution was cancelled; to continue, you can resume from the most recent healthy stage.`;
    }
    return "The task has been cancelled; if you still want to continue, you can resume from the most recent checkpoint.";
  }
  return null;
}

export function buildWorkflowExplainability(input: WorkflowExplainabilityInput): WorkflowExplainabilitySummary {
  return {
    displayStatus: buildDisplayStatus(input),
    blockingReason: buildBlockingReason(input),
    resumeAction: buildWorkflowResumeAction(
      input.status,
      input.checkpointType ?? null,
      input.executionScopeLabel,
      input.pendingManualRecovery,
    ),
    lastHealthyStage: getLastHealthyStage(input),
  };
}

import type {
  DirectorChapterExecutionProgressSummary,
  DirectorDisplayMode,
  DirectorDisplayStageKey,
  DirectorDisplayState,
  DirectorDisplayStep,
  DirectorRuntimeProjection,
  DirectorTaskFactSummary,
} from "@ai-novel/shared/types/directorRuntime";
import {
  getWorkflowCheckpointLabel,
  resolveWorkflowDisplayStage,
  WORKFLOW_DISPLAY_STAGES,
} from "@ai-novel/shared/types/directorWorkflowStepCatalog";
import type { WorkflowStepProgress } from "../workflowStepRuntime/WorkflowStepModule";

type FactStepStateLike = {
  module: {
    id: string;
    label: string;
  };
  facts: {
    nextAction?: string | null;
  };
  progress: WorkflowStepProgress;
} | null;

type SnapshotTaskLike = {
  status: string;
  currentStage?: string | null;
  currentItemKey?: string | null;
  currentItemLabel?: string | null;
  progress?: number | null;
  checkpointType?: string | null;
  checkpointSummary?: string | null;
  lastError?: string | null;
  pendingManualRecovery?: boolean | null;
};

const DISPLAY_STAGES: Array<{ key: DirectorDisplayStageKey; label: string }> = WORKFLOW_DISPLAY_STAGES.map((stage) => ({
  key: stage.key,
  label: stage.label,
}));

function clampPercent(value: number | null | undefined): number {
  if (!Number.isFinite(value ?? NaN)) {
    return 0;
  }
  return Math.max(0, Math.min(100, Math.round(value ?? 0)));
}

function buildCheckpointLabel(task: SnapshotTaskLike): string {
  return getWorkflowCheckpointLabel({
    checkpointType: task.checkpointType,
    status: task.status,
    fallback: task.checkpointSummary,
  });
}

function hasLiveRuntimeProgress(task: SnapshotTaskLike, projection: DirectorRuntimeProjection | null): boolean {
  return Boolean(
    task.status === "running"
    && (
      projection?.status === "running"
      || task.currentItemLabel?.trim()
      || task.currentItemKey?.trim()
      || task.currentStage?.trim()
      || projection?.currentLabel?.trim()
      || typeof projection?.progressBreakdown?.activeJobProgress === "number"
      || typeof projection?.progressBreakdown?.totalPercent === "number"
    ),
  );
}

function buildMode(input: {
  task: SnapshotTaskLike;
  projection: DirectorRuntimeProjection | null;
  factSummary?: DirectorTaskFactSummary | null;
  showPendingManualRecovery: boolean;
  isLiveRunning: boolean;
}): DirectorDisplayMode {
  if (input.showPendingManualRecovery) {
    return "needs_recovery";
  }
  if (
    input.projection?.status === "failed"
    || input.task.status === "failed"
    || input.task.status === "cancelled"
  ) {
    return "failed";
  }
  if (
    input.task.status === "waiting_approval"
    || (!input.isLiveRunning && (
      input.projection?.status === "waiting_approval"
      || input.projection?.status === "blocked"
      || input.projection?.requiresUserAction
    ))
  ) {
    return "waiting";
  }
  if (
    input.projection?.status === "running"
    || input.task.status === "running"
    || input.task.status === "queued"
  ) {
    return "running";
  }
  if (input.factSummary) {
    return input.factSummary.allStepsCompleted ? "completed" : "idle";
  }
  if (input.task.checkpointType === "workflow_completed") {
    return "completed";
  }
  return "idle";
}

function buildDescription(mode: DirectorDisplayMode): string {
  switch (mode) {
    case "needs_recovery":
      return "The background runner disconnected and is recovering. The system will continue from the latest progress.";
    case "waiting":
      return "The director flow is waiting for confirmation. Review the result before continuing.";
    case "failed":
      return "The director flow stopped at the latest step. Review the run details before retrying or continuing.";
    case "completed":
      return "This director round is wrapped. Continue chapters, review results, or start another Auto-Director run.";
    case "running":
      return "AI is taking over the book opening process in the background. You can continue to manually operate the current project; if the same piece of content is modified at the same time as the automatic director, the latest writing result shall prevail.";
    default:
      return "No director task is currently advancing.";
  }
}

function buildHeadline(mode: DirectorDisplayMode): string {
  switch (mode) {
    case "needs_recovery":
      return "Waiting for recovery";
    case "waiting":
      return "Waiting for confirmation";
    case "failed":
      return "Execution blocked";
    case "completed":
      return "Director finished";
    case "running":
      return "Auto-Directing";
    default:
      return "Not started";
  }
}

function buildCurrentAction(input: {
  mode: DirectorDisplayMode;
  projection: DirectorRuntimeProjection | null;
  factStep: FactStepStateLike;
  task: SnapshotTaskLike;
  isLiveRunning: boolean;
}): string {
  if (input.mode === "completed") {
    return (
      input.task.currentItemLabel?.trim()
      || input.task.checkpointSummary?.trim()
      || input.factStep?.progress.label?.trim()
      || "This Auto-Director round is complete"
    );
  }
  if (input.mode === "needs_recovery") {
    return (
      input.task.lastError?.trim()
      || input.projection?.blockingReason?.trim()
      || input.projection?.lastEventSummary?.trim()
      || "The system will resume from the latest progress."
    );
  }
  if (
    input.isLiveRunning
    && input.task.status === "running"
    && (
      input.projection?.status === "waiting_approval"
      || input.projection?.status === "blocked"
      || input.projection?.requiresUserAction
    )
  ) {
    return (
      input.factStep?.progress.label?.trim()
      || input.task.currentItemLabel?.trim()
      || input.projection?.currentAction?.trim()
      || input.projection?.currentLabel?.trim()
      || input.projection?.lastEventSummary?.trim()
      || "Waiting for synchronization of current advancement status"
    );
  }
  return (
    input.projection?.currentLabel?.trim()
    || input.projection?.currentAction?.trim()
    || input.factStep?.progress.label?.trim()
    || input.task.currentItemLabel?.trim()
    || input.projection?.lastEventSummary?.trim()
    || "Waiting for synchronization of current advancement status"
  );
}

function buildNextActionLabel(input: {
  projection: DirectorRuntimeProjection | null;
  factStep: FactStepStateLike;
}): string | null {
  const raw = input.projection?.nextActionLabel?.trim()
    || input.factStep?.progress.nextAction?.trim()
    || input.factStep?.facts.nextAction?.trim()
    || null;
  if (!raw) {
    return null;
  }
  switch (raw) {
    case "continue":
      return "Continue to direct automatically";
    case "continue_chapter_execution":
      return "Continue chapter execution";
    case "resume_from_checkpoint":
      return "Resume from the latest progress";
    case "approve_gate":
      return "Confirm and continue";
    case "repair_chapter":
      return "Repair the current chapter";
    case "run_quality_review":
      return "Start quality review";
    case "run_chapter_execution":
      return "Start chapter execution";
    case "sync_execution_contracts":
      return "Sync official chapter execution context";
    default:
      return raw;
  }
}

function buildProgressPercent(input: {
  task: SnapshotTaskLike;
  projection: DirectorRuntimeProjection | null;
  chapterProgress: DirectorChapterExecutionProgressSummary | null | undefined;
}): number {
  if (typeof input.projection?.progressBreakdown?.totalPercent === "number") {
    return clampPercent(input.projection.progressBreakdown.totalPercent);
  }
  if (typeof input.task.progress === "number") {
    return clampPercent(input.task.progress);
  }
  if (typeof input.chapterProgress?.ratio === "number") {
    return clampPercent(input.chapterProgress.ratio * 100);
  }
  return 0;
}

function buildSteps(currentStageKey: DirectorDisplayStageKey, mode: DirectorDisplayMode): DirectorDisplayStep[] {
  const currentIndex = DISPLAY_STAGES.findIndex((stage) => stage.key === currentStageKey);
  return DISPLAY_STAGES.map((stage, index) => {
    let status: DirectorDisplayStep["status"] = "pending";
    if (mode === "completed") {
      status = "completed";
    } else if (index < currentIndex) {
      status = "completed";
    } else if (index === currentIndex) {
      status = mode === "waiting" || mode === "needs_recovery" || mode === "failed"
        ? "attention"
        : "running";
    }
    return {
      key: stage.key,
      label: stage.label,
      status,
      isCurrent: index === currentIndex,
    };
  });
}

export function buildDirectorDisplayState(input: {
  task: SnapshotTaskLike;
  projection: DirectorRuntimeProjection | null;
  factSummary?: DirectorTaskFactSummary | null;
  activeStepNodeKey?: string | null;
  currentFactStepId?: string | null;
  currentFactStepLabel?: string | null;
  factStep: FactStepStateLike;
  chapterProgress?: DirectorChapterExecutionProgressSummary | null;
}): DirectorDisplayState {
  const isLiveRunning = hasLiveRuntimeProgress(input.task, input.projection);
  const needsRecovery = Boolean(input.task.pendingManualRecovery) && !isLiveRunning;
  const stageKey = resolveWorkflowDisplayStage({
    factStepId: input.currentFactStepId ?? input.projection?.currentFactStepId ?? null,
    currentNodeKey: input.projection?.currentNodeKey ?? null,
    activeNodeKey: input.activeStepNodeKey ?? null,
    taskCurrentItemKey: input.task.currentItemKey ?? null,
    checkpointType: input.task.checkpointType ?? null,
    taskStatus: input.task.status ?? null,
    currentStage: input.task.currentStage ?? null,
  });
  const stage = DISPLAY_STAGES.find((item) => item.key === stageKey) ?? DISPLAY_STAGES[0];
  const mode = buildMode({
    task: input.task,
    projection: input.projection,
    factSummary: input.factSummary ?? null,
    showPendingManualRecovery: needsRecovery,
    isLiveRunning,
  });
  const stepIndex = Math.max(0, DISPLAY_STAGES.findIndex((item) => item.key === stage.key));
  return {
    stageKey: stage.key,
    stageLabel: stage.label,
    stepIndex,
    totalSteps: DISPLAY_STAGES.length,
    mode,
    headline: buildHeadline(mode),
    description: buildDescription(mode),
    currentAction: buildCurrentAction({
      mode,
      projection: input.projection,
      factStep: input.factStep,
      task: input.task,
      isLiveRunning,
    }),
    checkpointLabel: buildCheckpointLabel(input.task),
    progressPercent: buildProgressPercent({
      task: input.task,
      projection: input.projection,
      chapterProgress: input.chapterProgress ?? null,
    }),
    nextActionLabel: buildNextActionLabel({
      projection: input.projection,
      factStep: input.factStep,
    }),
    currentFactStepId: input.currentFactStepId ?? input.projection?.currentFactStepId ?? null,
    currentFactStepLabel: input.currentFactStepLabel ?? input.projection?.currentFactStepLabel ?? null,
    currentFactDescription: input.factStep?.progress.label ?? input.projection?.currentLabel ?? null,
    requiresUserAction: Boolean(
      !isLiveRunning
      && (
        input.projection?.requiresUserAction
        || input.projection?.status === "blocked"
        || input.projection?.status === "waiting_approval"
      ),
    ),
    isLiveRunning,
    needsRecovery,
    steps: buildSteps(stage.key, mode),
  };
}

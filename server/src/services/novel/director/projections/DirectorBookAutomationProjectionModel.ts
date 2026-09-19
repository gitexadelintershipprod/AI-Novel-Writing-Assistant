import type {
  DirectorBookAutomationAction,
  DirectorBookAutomationDisplayState,
  DirectorBookAutomationFocusNovel,
  DirectorBookAutomationProjection,
  DirectorBookAutomationStatus,
  DirectorRuntimeProjection,
  DirectorStepRun,
} from "@ai-novel/shared/types/directorRuntime";

export function parseJsonOrNull<T>(value: string | null | undefined): T | null {
  if (!value?.trim()) {
    return null;
  }
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

export function toIso(value: Date | string | null | undefined): string {
  if (!value) {
    return new Date(0).toISOString();
  }
  if (value instanceof Date) {
    return value.toISOString();
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? new Date(0).toISOString() : parsed.toISOString();
}

export function timestampOf(value: string | null | undefined): number {
  if (!value) {
    return 0;
  }
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? timestamp : 0;
}

export function commandLabel(commandType: string): string {
  const labels: Record<string, string> = {
    confirm_candidate: "Confirm the book direction",
    continue: "Continue to direct automatically",
    resume_from_checkpoint: "Resume from the progress point",
    retry: "Retry Auto-Director",
    takeover: "Take over this book",
    repair_chapter_titles: "Repair chapter titles",
    cancel: "Cancel Auto-Director",
  };
  return labels[commandType] ?? commandType;
}

export function commandStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    queued: "Queuing",
    leased: "Ready to run",
    running: "Executing",
    succeeded: "Complete",
    failed: "failed",
    cancelled: "Canceled",
    stale: "Need to restore",
  };
  return labels[status] ?? status;
}

export function workflowStatusToBookStatus(status: string | null | undefined): DirectorBookAutomationStatus {
  if (status === "queued") {
    return "queued";
  }
  if (status === "running") {
    return "running";
  }
  if (status === "waiting_approval") {
    return "waiting_approval";
  }
  if (status === "failed") {
    return "failed";
  }
  if (status === "cancelled") {
    return "cancelled";
  }
  if (status === "succeeded") {
    return "completed";
  }
  return "idle";
}

export function extractRunMode(seedPayloadJson: string | null | undefined): string | null {
  const seedPayload = parseJsonOrNull<Record<string, unknown>>(seedPayloadJson);
  if (!seedPayload) {
    return null;
  }
  const direct = seedPayload.runMode;
  if (typeof direct === "string") {
    return direct;
  }
  const directorInput = seedPayload.directorInput;
  if (directorInput && typeof directorInput === "object") {
    const value = (directorInput as { runMode?: unknown }).runMode;
    if (typeof value === "string") {
      return value;
    }
  }
  const directorSession = seedPayload.directorSession;
  if (directorSession && typeof directorSession === "object") {
    const value = (directorSession as { runMode?: unknown }).runMode;
    if (typeof value === "string") {
      return value;
    }
  }
  return null;
}

export function extractCircuitBreaker(
  seedPayloadJson: string | null | undefined,
): DirectorBookAutomationProjection["circuitBreaker"] {
  const seedPayload = parseJsonOrNull<Record<string, unknown>>(seedPayloadJson);
  const autoExecution = seedPayload?.autoExecution;
  if (!autoExecution || typeof autoExecution !== "object") {
    return null;
  }
  const circuitBreaker = (autoExecution as { circuitBreaker?: unknown }).circuitBreaker;
  if (!circuitBreaker || typeof circuitBreaker !== "object") {
    return null;
  }
  const status = (circuitBreaker as { status?: unknown }).status;
  if (status !== "open" && status !== "closed") {
    return null;
  }
  return circuitBreaker as DirectorBookAutomationProjection["circuitBreaker"];
}

export function buildWhereByNovelOrTask(novelId: string, taskIds: string[]) {
  const uniqueTaskIds = Array.from(new Set(taskIds.filter(Boolean)));
  if (uniqueTaskIds.length === 0) {
    return { novelId };
  }
  return {
    OR: [
      { novelId },
      { taskId: { in: uniqueTaskIds } },
    ],
  };
}

export function buildHeadline(input: {
  status: DirectorBookAutomationStatus;
  runtimeProjection: DirectorRuntimeProjection | null;
  task: {
    currentItemLabel?: string | null;
    checkpointSummary?: string | null;
    lastError?: string | null;
  } | null;
}): string {
  if (input.status === "waiting_recovery") {
    return "Waiting to resume Auto-Director";
  }
  if (input.status === "cancelled") {
    return "Auto director canceled";
  }
  if (input.runtimeProjection?.headline?.trim()) {
    return input.runtimeProjection.headline.trim();
  }
  if (input.status === "queued") {
    return "Auto-Director is queued";
  }
  if (input.status === "running") {
    const label = input.task?.currentItemLabel?.trim();
    return label ? `AI is advancing：${label}` : "AI is advancing this book";
  }
  if (input.status === "waiting_approval") {
    return "Waiting for your confirmation";
  }
  if (input.status === "blocked") {
    return "Auto-Director is paused";
  }
  if (input.status === "failed") {
    return "Auto-Director ran into a problem";
  }
  if (input.status === "completed") {
    return "Auto-Director finished the latest advance";
  }
  return "This book has no Auto-Director record yet";
}

function getTaskFailureReason(task: {
  lastError?: string | null;
  checkpointSummary?: string | null;
} | null | undefined): string | null {
  return task?.lastError?.trim() || task?.checkpointSummary?.trim() || null;
}

export function buildDetail(input: {
  status: DirectorBookAutomationStatus;
  runtimeProjection: DirectorRuntimeProjection | null;
  task: {
    checkpointSummary?: string | null;
    lastError?: string | null;
    currentItemLabel?: string | null;
  } | null;
}): string | null {
  if (input.status === "waiting_recovery") {
    return input.task?.lastError?.trim() || "A progress point was kept after the interruption. After you confirm recovery, it will continue from the latest progress.";
  }
  if (input.status === "cancelled") {
    return "The Auto-Director task was cancelled.";
  }
  if (input.status === "failed") {
    return getTaskFailureReason(input.task)
      || input.runtimeProjection?.blockedReason?.trim()
      || input.runtimeProjection?.detail?.trim()
      || "After viewing run details, you can resume or retry.";
  }
  if (input.runtimeProjection?.detail?.trim()) {
    return input.runtimeProjection.detail.trim();
  }
  if (input.task?.checkpointSummary?.trim()) {
    return input.task.checkpointSummary.trim();
  }
  if (input.status === "idle") {
    return "You can start from Auto-Director and let the system recommend the next step from this book's assets.";
  }
  return input.task?.currentItemLabel?.trim() ?? null;
}

export function buildAutomationSummary(input: {
  activeCommandCount: number;
  pendingCommandCount: number;
  artifactSummary: DirectorBookAutomationProjection["artifactSummary"];
  autoApprovalRecordCount: number;
  usageSummary?: DirectorBookAutomationProjection["usageSummary"];
}): string {
  const parts: string[] = [];
  if (input.activeCommandCount > 0) {
    parts.push(`${input.activeCommandCount} actions running`);
  }
  if (input.pendingCommandCount > 0) {
    parts.push(`${input.pendingCommandCount} actions queued`);
  }
  if (input.autoApprovalRecordCount > 0) {
    parts.push(`${input.autoApprovalRecordCount} confirmations handled automatically by AI`);
  }
  if (input.artifactSummary.activeCount > 0) {
    parts.push(`${input.artifactSummary.activeCount} usable artifacts`);
  }
  if (input.artifactSummary.staleCount > 0) {
    parts.push(`${input.artifactSummary.staleCount} Products need to be reviewed`);
  }
  if (input.artifactSummary.repairTicketCount > 0) {
    parts.push(`${input.artifactSummary.repairTicketCount} repair items`);
  }
  if (input.artifactSummary.protectedUserContentCount > 0) {
    parts.push(`${input.artifactSummary.protectedUserContentCount} user-protected items`);
  }
  if (input.usageSummary && input.usageSummary.llmCallCount > 0) {
    parts.push(`${input.usageSummary.llmCallCount} AI calls`);
  }
  if (input.usageSummary && input.usageSummary.totalTokens > 0) {
    parts.push(`${input.usageSummary.totalTokens} Tokens`);
  }
  if ((input.artifactSummary.dependencyCount ?? 0) > 0) {
    parts.push(`${input.artifactSummary.dependencyCount} artifact dependencies`);
  }
  return parts.length > 0 ? parts.join(", ") : "No automation actions yet";
}

function buildNovelHref(
  novelId: string,
  options?: {
    tab?: DirectorBookAutomationAction["target"]["tab"];
    taskId?: string | null;
    taskPanel?: boolean;
  },
): string {
  const params = new URLSearchParams();
  if (options?.tab) {
    params.set("stage", options.tab);
  }
  if (options?.taskId) {
    params.set("directorTaskId", options.taskId);
  }
  if (options?.taskPanel) {
    params.set("taskPanel", "1");
  }
  const query = params.toString();
  return `/novels/${novelId}/edit${query ? `?${query}` : ""}`;
}

function buildCandidateSelectionHref(taskId: string): string {
  const params = new URLSearchParams();
  params.set("taskId", taskId);
  return `/novels/auto-director?${params.toString()}`;
}

export function buildFocusNovel(input: { id: string; title?: string | null }): DirectorBookAutomationFocusNovel {
  const title = input.title?.trim() || "Untitled novel";
  return {
    id: input.id,
    title,
    href: buildNovelHref(input.id),
  };
}

export function buildDisplayState(status: DirectorBookAutomationStatus): DirectorBookAutomationDisplayState {
  if (status === "queued" || status === "running") {
    return "processing";
  }
  if (status === "waiting_approval") {
    return "needs_confirmation";
  }
  if (status === "waiting_recovery" || status === "blocked" || status === "cancelled") {
    return "paused";
  }
  if (status === "failed") {
    return "needs_attention";
  }
  if (status === "completed") {
    return "completed";
  }
  return "idle";
}

export function buildUserHeadline(input: {
  status: DirectorBookAutomationStatus;
  task?: {
    currentItemLabel?: string | null;
    checkpointType?: string | null;
  } | null;
}): string {
  if (input.status === "queued") {
    return "AI has received the task to advance this book";
  }
  if (input.status === "running") {
    const label = input.task?.currentItemLabel?.trim();
    return label ? `AI is processing：${label}` : "AI is advancing this book";
  }
  if (input.status === "waiting_approval") {
    return "Waiting for your confirmation before continuing";
  }
  if (input.status === "waiting_recovery" || input.status === "blocked") {
    return "AI paused at a point you can act on";
  }
  if (input.status === "failed") {
    return "AI advance ran into a problem";
  }
  if (input.status === "cancelled") {
    return "This auto-advance has stopped";
  }
  if (input.status === "completed") {
    return "AI finished the latest advance";
  }
  return "This book has not started AI auto-advance yet";
}

export function buildUserReason(input: {
  status: DirectorBookAutomationStatus;
  runtimeProjection: DirectorRuntimeProjection | null;
  task: {
    checkpointType?: string | null;
    checkpointSummary?: string | null;
    lastError?: string | null;
    currentItemLabel?: string | null;
  } | null;
  blockedReason?: string | null;
  detail?: string | null;
}): string | null {
  const directReason = input.status === "failed"
    ? (
      getTaskFailureReason(input.task)
      || input.blockedReason?.trim()
      || input.detail?.trim()
      || input.runtimeProjection?.blockedReason?.trim()
      || input.runtimeProjection?.detail?.trim()
    )
    : (
      input.blockedReason?.trim()
      || input.detail?.trim()
      || input.runtimeProjection?.blockedReason?.trim()
      || input.runtimeProjection?.detail?.trim()
      || input.task?.checkpointSummary?.trim()
      || input.task?.lastError?.trim()
    );
  if (directReason) {
    return directReason;
  }
  if (input.status === "queued") {
    return "The task is in the background queue. You can leave this page.";
  }
  if (input.status === "running") {
    return input.task?.currentItemLabel?.trim() || "AI is advancing the novel according to the current plan.";
  }
  if (input.status === "waiting_approval") {
    return "Before continuing, confirm this stage's result or impact range.";
  }
  if (input.status === "waiting_recovery") {
    return "The latest progress was kept. After you confirm, it can continue from here.";
  }
  if (input.status === "blocked") {
    return "Handle the current blocker before continuing.";
  }
  if (input.status === "failed") {
    return "After viewing the reason, you can retry or go back to the novel page.";
  }
  if (input.status === "completed") {
    return "You can open the novel page to review the result or continue the next writing stretch.";
  }
  return "You can keep writing manually, or let AI take over later advances.";
}

function action(input: DirectorBookAutomationAction): DirectorBookAutomationAction {
  return input;
}

export function buildPrimaryAction(input: {
  novelId: string;
  status: DirectorBookAutomationStatus;
  task: {
    id: string;
    checkpointType?: string | null;
  } | null;
}): DirectorBookAutomationAction | null {
  const taskId = input.task?.id ?? null;
  if (!taskId) {
    return action({
      type: "open_novel",
      label: "Open novel",
      target: { novelId: input.novelId, href: buildNovelHref(input.novelId) },
      emphasis: "primary",
    });
  }

  if (
    input.task?.checkpointType === "replan_required"
    && ["waiting_approval", "waiting_recovery", "failed", "blocked", "cancelled"].includes(input.status)
  ) {
    return action({
      type: "auto_execute_range",
      label: "Continue after re-planning",
      target: {
        novelId: input.novelId,
        taskId,
        tab: "pipeline",
        href: buildNovelHref(input.novelId, { tab: "pipeline", taskId }),
      },
      commandPayload: { taskId, continuationMode: "auto_execute_range" },
      emphasis: "primary",
    });
  }

  if (input.status === "waiting_approval") {
    if (input.task?.checkpointType === "candidate_selection_required") {
      return action({
        type: "confirm_candidate",
        label: "Confirm book-level direction",
        target: { novelId: input.novelId, taskId, href: buildCandidateSelectionHref(taskId) },
        emphasis: "primary",
      });
    }
    if (input.task?.checkpointType === "production_experience_required") {
      return action({
        type: "open_novel",
        label: "Choose a writing method",
        target: {
          novelId: input.novelId,
          taskId,
          href: buildNovelHref(input.novelId, { taskId }),
        },
        emphasis: "primary",
      });
    }
    if (input.task?.checkpointType === "chapter_batch_ready") {
      return action({
        type: "auto_execute_range",
        label: "Continue auto-running chapters",
        target: {
          novelId: input.novelId,
          taskId,
          tab: "chapter",
          href: buildNovelHref(input.novelId, { tab: "chapter", taskId }),
        },
        commandPayload: { taskId, continuationMode: "auto_execute_range" },
        emphasis: "primary",
      });
    }
    return action({
      type: "continue",
      label: "Confirm and continue",
      target: { novelId: input.novelId, taskId, href: buildNovelHref(input.novelId, { taskId }) },
      commandPayload: { taskId, continuationMode: "resume" },
      emphasis: "primary",
    });
  }

  if (input.status === "waiting_recovery") {
    return action({
      type: "continue",
      label: "Continue from the progress point",
      target: { novelId: input.novelId, taskId, href: buildNovelHref(input.novelId, { taskId }) },
      commandPayload: { taskId, continuationMode: "resume" },
      emphasis: "primary",
    });
  }

  if (input.status === "failed" || input.status === "blocked") {
    return action({
      type: "open_details",
      label: input.status === "failed" ? "Check the failure reason" : "View the pause reason",
      target: { novelId: input.novelId, taskId, href: buildNovelHref(input.novelId, { taskId, taskPanel: true }) },
      emphasis: "primary",
    });
  }

  if (input.status === "queued" || input.status === "running") {
    return action({
      type: "open_novel",
      label: "View advancement status",
      target: { novelId: input.novelId, taskId, href: buildNovelHref(input.novelId, { taskId }) },
      emphasis: "primary",
    });
  }

  if (input.status === "completed") {
    return action({
      type: "open_chapter",
      label: "Enter chapter execution",
      target: {
        novelId: input.novelId,
        taskId,
        tab: "chapter",
        href: buildNovelHref(input.novelId, { tab: "chapter", taskId }),
      },
      emphasis: "primary",
    });
  }

  return action({
    type: "open_novel",
    label: "Open novel",
    target: { novelId: input.novelId, taskId, href: buildNovelHref(input.novelId, { taskId }) },
    emphasis: "primary",
  });
}

export function buildSecondaryActions(input: {
  novelId: string;
  status: DirectorBookAutomationStatus;
  taskId?: string | null;
}): DirectorBookAutomationAction[] {
  if (!input.taskId) {
    return [];
  }
  const actions: DirectorBookAutomationAction[] = [
    action({
      type: "open_details",
      label: "Execution details",
      target: {
        novelId: input.novelId,
        taskId: input.taskId,
        href: buildNovelHref(input.novelId, { taskId: input.taskId, taskPanel: true }),
      },
      emphasis: "secondary",
    }),
  ];
  if (input.status === "queued" || input.status === "running" || input.status === "waiting_approval") {
    actions.push(action({
      type: "cancel",
      label: "Pause advancing",
      target: { novelId: input.novelId, taskId: input.taskId },
      emphasis: "secondary",
    }));
  }
  if (input.status === "failed" || input.status === "cancelled") {
    actions.push(action({
      type: "retry",
      label: "Retry",
      target: { novelId: input.novelId, taskId: input.taskId },
      emphasis: "secondary",
    }));
  }
  return actions;
}

export function mapStepForUsage(step: {
  idempotencyKey: string;
  nodeKey: string;
  label: string;
  status: string;
  targetType?: string | null;
  targetId?: string | null;
  startedAt: Date;
  finishedAt: Date | null;
  error: string | null;
}): DirectorStepRun {
  return {
    idempotencyKey: step.idempotencyKey,
    nodeKey: step.nodeKey,
    label: step.label,
    status: step.status as DirectorStepRun["status"],
    targetType: step.targetType as DirectorStepRun["targetType"],
    targetId: step.targetId,
    startedAt: step.startedAt.toISOString(),
    finishedAt: step.finishedAt?.toISOString() ?? null,
    error: step.error,
  };
}

import type {
  DirectorArtifactType,
  DirectorAutopilotRecoveryDecision,
  DirectorChapterExecutionProgressSummary,
  DirectorEvent,
  DirectorNextAction,
  DirectorRuntimeProgressBreakdown,
  DirectorRuntimeProjection,
  DirectorRuntimeProjectionStatus,
  DirectorRuntimeSnapshot,
  DirectorTaskFactSummary,
  DirectorRuntimeVisibleRiskBadge,
  DirectorStepRun,
  DirectorWorkspaceInventory,
} from "@ai-novel/shared/types/directorRuntime";
import type {
  DirectorQualityLoopBudgetEntry,
  DirectorQualityLoopBudgetNextAction,
} from "@ai-novel/shared/types/novelDirector";
import { classifyChapterQualityLoopRisk } from "@ai-novel/shared/types/chapterQualityLoop";
import { resolveDirectorQualityLoopBudgetNextAction } from "./DirectorQualityLoopBudgetLedgerService";
import {
  directorIssueOccurrenceSchema,
  directorIssueDecisionSchema,
} from "@ai-novel/shared/types/directorIssue";

export function parseDirectorIssueEventMetadata(metadata: Record<string, unknown> | null | undefined) {
  const occurrence = directorIssueOccurrenceSchema.safeParse(metadata?.occurrence);
  if (!occurrence.success) return null;
  const decision = directorIssueDecisionSchema.safeParse(metadata?.decision);
  return { occurrence: occurrence.data, decision: decision.success ? decision.data : null };
}

function timestampOf(value?: string | null): number {
  if (!value) {
    return 0;
  }
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? timestamp : 0;
}

function latestStep(steps: DirectorStepRun[]): DirectorStepRun | null {
  return steps.reduce<DirectorStepRun | null>((latest, step) => {
    if (!latest) {
      return step;
    }
    const stepTime = Math.max(timestampOf(step.finishedAt), timestampOf(step.startedAt));
    const latestTime = Math.max(timestampOf(latest.finishedAt), timestampOf(latest.startedAt));
    return stepTime >= latestTime ? step : latest;
  }, null);
}

function latestEvent(events: DirectorEvent[]): DirectorEvent | null {
  return events.reduce<DirectorEvent | null>((latest, event) => {
    if (!latest) {
      return event;
    }
    return timestampOf(event.occurredAt) >= timestampOf(latest.occurredAt) ? event : latest;
  }, null);
}

function statusFromStep(
  step: DirectorStepRun | null,
  factSummary?: DirectorTaskFactSummary | null,
): DirectorRuntimeProjectionStatus {
  if (!step) {
    return factSummary?.allStepsCompleted ? "completed" : "idle";
  }
  if (step.status === "waiting_approval") {
    return "waiting_approval";
  }
  if (step.status === "blocked_scope") {
    return "blocked";
  }
  if (step.status === "failed") {
    return "failed";
  }
  if (step.status === "running") {
    return "running";
  }
  if (!factSummary) {
    return "completed";
  }
  return factSummary.allStepsCompleted ? "completed" : "idle";
}

function resolveBlockedReason(step: DirectorStepRun | null, event: DirectorEvent | null): string | null {
  if (!step) {
    return null;
  }
  if (step.status === "waiting_approval" || step.status === "blocked_scope") {
    return step.policyDecision?.reason ?? event?.summary ?? step.error ?? null;
  }
  if (step.status === "failed") {
    return step.error ?? event?.summary ?? null;
  }
  return null;
}

function formatNextAction(action: DirectorNextAction | null | undefined): string | null {
  if (!action) {
    return null;
  }
  const labels: Record<DirectorNextAction["action"], string> = {
    generate_candidates: "Generate optional opening directions",
    create_book_contract: "Generate the book contract",
    complete_story_macro: "Complete story planning",
    prepare_characters: "Prepare the cast",
    build_volume_strategy: "Generate the volume strategy",
    build_chapter_tasks: "Generate chapter task sheets",
    continue_chapter_execution: "Continue chapter generation",
    review_recent_chapters: "Review recent chapters",
    repair_scope: "Repair the affected scope",
    ask_user_confirmation: "Confirm, then continue",
  };
  return labels[action.action];
}

function buildHeadline(input: {
  status: DirectorRuntimeProjectionStatus;
  step: DirectorStepRun | null;
  event: DirectorEvent | null;
}): string {
  const label = input.step?.label?.trim() || input.event?.summary?.trim() || "Syncing Auto-Director progress";
  if (input.status === "waiting_approval") {
    return `Waiting for confirmation：${label}`;
  }
  if (input.status === "blocked") {
    return `Pause processing：${label}`;
  }
  if (input.status === "failed") {
    return `Failed: ${label}`;
  }
  if (input.status === "running") {
    return `Advancing task: ${label}`;
  }
  if (input.status === "completed") {
    return `Step complete: ${label}`;
  }
  return label;
}

function buildDetail(input: {
  status: DirectorRuntimeProjectionStatus;
  step: DirectorStepRun | null;
  event: DirectorEvent | null;
  blockedReason: string | null;
}): string | null {
  if (input.status === "running") {
    const eventSummary = input.event?.summary?.trim();
    return eventSummary ? `recent developments：${eventSummary}` : "The system is processing this step and will write new progress when it finishes.";
  }
  if (input.status === "waiting_approval" || input.status === "blocked" || input.status === "failed") {
    return input.blockedReason;
  }
  if (input.status === "completed") {
    return input.event?.summary?.trim() ?? null;
  }
  return null;
}

function buildScopeSummary(inventory: DirectorWorkspaceInventory | null | undefined): string | null {
  if (!inventory) {
    return null;
  }
  const parts = [
    `${inventory.chapterCount} chapters`,
    `${inventory.draftedChapterCount} chapters with draft text`,
  ];
  if (inventory.pendingRepairChapterCount > 0) {
    parts.push(`${inventory.pendingRepairChapterCount} chapters waiting for repair`);
  }
  if (inventory.missingArtifactTypes.length > 0) {
    parts.push(`${inventory.missingArtifactTypes.length} artifact types still missing`);
  }
  return `Workspace: ${parts.join(", ")}.`;
}

function buildProgressSummary(
  snapshot: DirectorRuntimeSnapshot,
  inventory: DirectorWorkspaceInventory | null | undefined,
  factSummary?: DirectorTaskFactSummary | null,
): string {
  const completedSteps = factSummary?.completedStepCount ?? snapshot.steps.filter((step) => step.status === "succeeded").length;
  const totalSteps = factSummary?.totalStepCount ?? snapshot.steps.length;
  const waitingSteps = snapshot.steps.filter((step) => step.status === "waiting_approval" || step.status === "blocked_scope").length;
  const failedSteps = snapshot.steps.filter((step) => step.status === "failed").length;
  const protectedCount = inventory?.protectedUserContentArtifacts.length
    ?? snapshot.artifacts.filter((artifact) => artifact.protectedUserContent === true || artifact.source === "user_edited").length;
  const staleCount = inventory?.staleArtifacts.length
    ?? snapshot.artifacts.filter((artifact) => artifact.status === "stale").length;
  const repairCount = inventory?.needsRepairArtifacts.length
    ?? snapshot.artifacts.filter((artifact) => artifact.artifactType === "repair_ticket" && artifact.status !== "rejected").length;
  const parts = [
    `${completedSteps}/${snapshot.steps.length} steps complete`,
    `${snapshot.artifacts.length} product records`,
  ];
  if (waitingSteps > 0) {
    parts.push(`${waitingSteps} steps waiting for confirmation`);
  }
  if (failedSteps > 0) {
    parts.push(`${failedSteps} steps failed`);
  }
  if (protectedCount > 0) {
    parts.push(`${protectedCount} user-protected items`);
  }
  if (staleCount > 0) {
    parts.push(`${staleCount} artifacts need confirmation`);
  }
  if (repairCount > 0) {
    parts.push(`${repairCount} repair tasks`);
  }
  return `Progress: ${parts.join(", ")}.`;
}

const PLANNING_ARTIFACT_TYPES: DirectorArtifactType[] = [
  "book_contract",
  "story_macro",
  "character_cast",
  "volume_strategy",
  "chapter_task_sheet",
];

const PLANNING_NODE_HINTS = [
  "book_contract",
  "story_macro",
  "character",
  "volume_strategy",
  "chapter_task",
  "structured",
];

const CHAPTER_EXECUTION_NODE_HINTS = [
  "chapter_execution",
  "chapter.write",
  "chapter_draft",
];

const QUALITY_NODE_HINTS = [
  "quality",
  "review",
  "repair",
  "state_commit",
];

function clampPercent(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.max(0, Math.min(100, Math.round(value)));
}

function percentFromCount(done: number, total: number): number {
  if (total <= 0) {
    return 0;
  }
  return clampPercent((done / total) * 100);
}

function stepMatches(step: DirectorStepRun, hints: string[]): boolean {
  const nodeKey = step.nodeKey.toLowerCase();
  return hints.some((hint) => nodeKey.includes(hint));
}

function stepProgressPercent(steps: DirectorStepRun[], hints: string[]): number {
  const matched = steps.filter((step) => stepMatches(step, hints));
  if (matched.length === 0) {
    return 0;
  }
  const completed = matched.filter((step) => step.status === "succeeded").length;
  const running = matched.some((step) => step.status === "running" || step.status === "waiting_approval")
    ? 0.5
    : 0;
  return percentFromCount(completed + running, matched.length);
}

function buildPlanningPercent(
  snapshot: DirectorRuntimeSnapshot,
  inventory: DirectorWorkspaceInventory | null | undefined,
  factSummary?: DirectorTaskFactSummary | null,
): number {
  if (factSummary) {
    const completed = [
      factSummary.hasBookContract,
      factSummary.hasStoryMacro,
      factSummary.characterCount > 0,
      factSummary.hasVolumeStrategy,
      factSummary.outlineFacts.plannedChapterCount > 0,
    ].filter(Boolean).length;
    return percentFromCount(completed, 5);
  }
  if (inventory) {
    const completed = [
      inventory.hasBookContract,
      inventory.hasStoryMacro,
      inventory.hasCharacters,
      inventory.hasVolumeStrategy,
      inventory.hasChapterPlan,
    ].filter(Boolean).length;
    return percentFromCount(completed, 5);
  }
  return stepProgressPercent(snapshot.steps, PLANNING_NODE_HINTS);
}

function buildChapterExecutionPercent(
  snapshot: DirectorRuntimeSnapshot,
  inventory: DirectorWorkspaceInventory | null | undefined,
  factSummary?: DirectorTaskFactSummary | null,
): number {
  if (factSummary) {
    return clampPercent(factSummary.chapterExecutionFacts.ratio * 100);
  }
  if (inventory?.chapterCount) {
    const continuableChapters = Math.max(
      inventory.approvedChapterCount,
      inventory.draftedChapterCount - inventory.pendingRepairChapterCount,
    );
    return percentFromCount(continuableChapters, inventory.chapterCount);
  }
  return stepProgressPercent(snapshot.steps, CHAPTER_EXECUTION_NODE_HINTS);
}

function buildChapterExecutionPercentFromFacts(chapterProgress: DirectorChapterExecutionProgressSummary | null | undefined): number | null {
  if (!chapterProgress) {
    return null;
  }
  return clampPercent(chapterProgress.ratio * 100);
}

function buildQualityRepairPercent(
  snapshot: DirectorRuntimeSnapshot,
  inventory: DirectorWorkspaceInventory | null | undefined,
  factSummary?: DirectorTaskFactSummary | null,
): number {
  if (factSummary) {
    if (factSummary.repairFacts.draftedChapterCount <= 0) {
      return 0;
    }
    return percentFromCount(
      Math.max(0, factSummary.repairFacts.draftedChapterCount - factSummary.repairFacts.needsRepairChapters),
      factSummary.repairFacts.draftedChapterCount,
    );
  }
  if (inventory) {
    if (inventory.draftedChapterCount <= 0) {
      return 0;
    }
    return percentFromCount(
      Math.max(0, inventory.draftedChapterCount - inventory.pendingRepairChapterCount),
      inventory.draftedChapterCount,
    );
  }
  const percent = stepProgressPercent(snapshot.steps, QUALITY_NODE_HINTS);
  return percent > 0 ? percent : 100;
}

function buildQualityRepairPercentFromFacts(chapterProgress: DirectorChapterExecutionProgressSummary | null | undefined): number | null {
  if (!chapterProgress?.chapters?.length) {
    return null;
  }
  const repairedCount = chapterProgress.chapters.filter((chapter) => (
    chapter.completedStages.includes("repair_completed_or_not_needed")
  )).length;
  return percentFromCount(repairedCount, chapterProgress.chapters.length);
}

function buildActiveJobPercent(snapshot: DirectorRuntimeSnapshot): number {
  const step = latestStep(snapshot.steps);
  if (!step) {
    return 0;
  }
  if (step.status === "succeeded") {
    return 100;
  }
  if (step.status === "running") {
    return 1;
  }
  return 0;
}

function buildProgressBreakdown(
  snapshot: DirectorRuntimeSnapshot,
  inventory: DirectorWorkspaceInventory | null | undefined,
  chapterProgress?: DirectorChapterExecutionProgressSummary | null,
  factSummary?: DirectorTaskFactSummary | null,
): DirectorRuntimeProgressBreakdown {
  const completedSteps = factSummary?.completedStepCount ?? snapshot.steps.filter((step) => step.status === "succeeded").length;
  const planningPercent = buildPlanningPercent(snapshot, inventory, factSummary);
  const chapterExecutionPercent = buildChapterExecutionPercentFromFacts(chapterProgress)
    ?? buildChapterExecutionPercent(snapshot, inventory, factSummary);
  const qualityRepairPercent = buildQualityRepairPercentFromFacts(chapterProgress)
    ?? buildQualityRepairPercent(snapshot, inventory, factSummary);
  const activeJobProgress = buildActiveJobPercent(snapshot);
  const totalPercent = clampPercent(
    planningPercent * 0.35
    + chapterExecutionPercent * 0.5
    + qualityRepairPercent * 0.15,
  );
  const draftedChapters = inventory?.draftedChapterCount ?? 0;
  const continuableChapters = inventory
    ? Math.max(
      inventory.approvedChapterCount,
      inventory.draftedChapterCount - inventory.pendingRepairChapterCount,
    )
    : 0;
  const totalChapters = inventory?.chapterCount ?? 0;
  const pendingRepairChapters = inventory?.pendingRepairChapterCount ?? 0;
  return {
    planningProgress: planningPercent,
    chapterProgress: chapterExecutionPercent,
    qualityProgress: qualityRepairPercent,
    activeJobProgress,
    planningPercent,
    chapterExecutionPercent,
    qualityRepairPercent,
    totalPercent,
    completedSteps,
    totalSteps: factSummary?.totalStepCount ?? snapshot.steps.length,
    draftedChapters,
    continuableChapters,
    totalChapters,
    pendingRepairChapters,
    explanation: totalChapters > 0
      ? `Chapter progress ${continuableChapters}/${totalChapters}, planning ${planningPercent}%, quality repair ${qualityRepairPercent}%, overall ${totalPercent}%.`
      : `Planning ${planningPercent}%, chapter execution ${chapterExecutionPercent}%, quality repair ${qualityRepairPercent}%, overall ${totalPercent}%.`,
  };
}

function buildRecoveryDecision(input: {
  status: DirectorRuntimeProjectionStatus;
  inventory: DirectorWorkspaceInventory | null | undefined;
  blockedReason: string | null;
  qualityDebtCount?: number;
}): DirectorAutopilotRecoveryDecision {
  const protectedCount = input.inventory?.protectedUserContentArtifacts.length ?? 0;
  if (protectedCount > 0 && (input.status === "waiting_approval" || input.status === "blocked" || input.status === "failed")) {
    return "requires_manual_recovery";
  }
  if (input.status === "failed") {
    return "requires_manual_recovery";
  }
  if ((input.inventory?.pendingRepairChapterCount ?? 0) > 0) {
    return "auto_repair_chapter";
  }
  const missingArtifacts = input.inventory?.missingArtifactTypes ?? [];
  if (missingArtifacts.some((type) => PLANNING_ARTIFACT_TYPES.includes(type))) {
    return "auto_replan_window";
  }
  if ((input.qualityDebtCount ?? 0) > 0) {
    return "defer_and_continue";
  }
  if (input.status === "waiting_approval" || input.status === "blocked") {
    return input.blockedReason ? "auto_resume_from_checkpoint" : "continue";
  }
  return "continue";
}

function isAutomaticPolicy(snapshot: DirectorRuntimeSnapshot): boolean {
  return snapshot.policy.mode === "auto_safe_scope";
}

function buildVisibleRiskBadges(input: {
  status: DirectorRuntimeProjectionStatus;
  blockedReason: string | null;
  inventory: DirectorWorkspaceInventory | null | undefined;
  events: DirectorEvent[];
}): DirectorRuntimeVisibleRiskBadge[] {
  const badges: DirectorRuntimeVisibleRiskBadge[] = [];
  const push = (badge: DirectorRuntimeVisibleRiskBadge) => {
    if (!badges.some((item) => item.label === badge.label)) {
      badges.push(badge);
    }
  };
  if (input.status === "failed") {
    push({ label: "Execution failed", level: "danger", source: "status" });
  } else if (input.status === "blocked" || input.status === "waiting_approval") {
    push({ label: input.blockedReason ? "Waiting to handle" : "Waiting for confirmation", level: "warning", source: "status" });
  }
  const inventory = input.inventory;
  if (inventory) {
    if (inventory.protectedUserContentArtifacts.length > 0) {
      push({ label: "protected text", level: "danger", source: "artifact" });
    }
    if (inventory.pendingRepairChapterCount > 0) {
      push({ label: `${inventory.pendingRepairChapterCount} chapters waiting for repair`, level: "warning", source: "artifact" });
    }
    if (inventory.staleArtifacts.length > 0) {
      push({ label: `${inventory.staleArtifacts.length} items need review`, level: "warning", source: "artifact" });
    }
    if (inventory.missingArtifactTypes.length > 0) {
      push({ label: "Missing planning resources", level: "warning", source: "artifact" });
    }
  }
  for (const event of input.events) {
    if (event.type === "quality_issue_found" || event.type === "quality_loop_assessed") {
      const qualityLoopRisk = event.type === "quality_loop_assessed"
        ? classifyChapterQualityLoopRisk((event.metadata?.assessment as unknown) ?? null)
        : "blocking";
      if (qualityLoopRisk === "non_blocking_quality_debt") {
        push({ label: "Quality debt stored", level: "info", source: "event" });
      } else if (qualityLoopRisk === "blocking") {
        push({ label: "Quality blocked", level: event.severity === "high" ? "danger" : "warning", source: "event" });
      } else if (event.type === "quality_issue_found") {
        push({ label: "Quality risk", level: event.severity === "high" ? "danger" : "warning", source: "event" });
      }
    }
    if (event.type === "replan_run_created") {
      push({ label: "Entered replan", level: "info", source: "event" });
    }
    if (event.type === "circuit_breaker_opened") {
      push({ label: "Repeated-failure protection", level: "danger", source: "event" });
    }
  }
  for (const event of input.events) {
    if (event.type === "continue_with_risk") {
      push({ label: "Quality debt stored", level: "info", source: "event" });
    }
  }
  return badges.slice(0, 6);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function isQualityBudgetNextAction(value: unknown): value is DirectorQualityLoopBudgetNextAction {
  return value === "auto_patch_repair"
    || value === "auto_rewrite_chapter"
    || value === "auto_replan_window"
    || value === "defer_and_continue";
}

function readFiniteNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function readNullableString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function readQualityBudgetEntry(value: unknown): DirectorQualityLoopBudgetEntry | null {
  if (!isRecord(value)) {
    return null;
  }
  const signatureKey = readNullableString(value.signatureKey);
  const issueSignature = readNullableString(value.issueSignature);
  if (!signatureKey || !issueSignature) {
    return null;
  }
  return {
    signatureKey,
    issueSignature,
    blockingLedgerKeys: Array.isArray(value.blockingLedgerKeys)
      ? value.blockingLedgerKeys.filter((item): item is string => typeof item === "string")
      : [],
    affectedChapterWindow: isRecord(value.affectedChapterWindow)
      ? {
        startOrder: readFiniteNumber(value.affectedChapterWindow.startOrder),
        endOrder: readFiniteNumber(value.affectedChapterWindow.endOrder),
        chapterOrders: Array.isArray(value.affectedChapterWindow.chapterOrders)
          ? value.affectedChapterWindow.chapterOrders.filter((item): item is number => typeof item === "number" && Number.isFinite(item))
          : [],
        chapterIds: Array.isArray(value.affectedChapterWindow.chapterIds)
          ? value.affectedChapterWindow.chapterIds.filter((item): item is string => typeof item === "string")
          : [],
      }
      : {
        startOrder: null,
        endOrder: null,
        chapterOrders: [],
        chapterIds: [],
      },
    patchRepairCount: readFiniteNumber(value.patchRepairCount) ?? 0,
    chapterRewriteCount: readFiniteNumber(value.chapterRewriteCount) ?? 0,
    windowReplanCount: readFiniteNumber(value.windowReplanCount) ?? 0,
    deferredCount: readFiniteNumber(value.deferredCount) ?? 0,
    lastAction: null,
    lastReason: readNullableString(value.lastReason),
    lastChapterId: readNullableString(value.lastChapterId),
    lastChapterOrder: readFiniteNumber(value.lastChapterOrder),
    updatedAt: readNullableString(value.updatedAt) ?? new Date(0).toISOString(),
  };
}

function buildQualityDebtSummary(
  events: DirectorEvent[],
): DirectorRuntimeProjection["qualityDebtSummary"] {
  const debtEvents = events
    .filter((event) => event.type === "continue_with_risk")
    .sort((left, right) => timestampOf(right.occurredAt) - timestampOf(left.occurredAt));
  if (debtEvents.length === 0) {
    return null;
  }
  const deferredChapterOrders = Array.from(new Set(debtEvents
    .map((event) => {
      const order = event.metadata?.chapterOrder;
      if (typeof order === "number" && Number.isFinite(order)) {
        return order;
      }
      const match = /chapter_order:(\d+)/.exec(event.affectedScope ?? "");
      return match ? Number(match[1]) : null;
    })
    .filter((order): order is number => typeof order === "number" && Number.isFinite(order))))
    .sort((left, right) => left - right);
  return {
    deferredChapterCount: debtEvents.length,
    deferredChapterOrders,
    latestReason: debtEvents[0]?.summary ?? null,
  };
}

function formatQualityBudgetNextAction(action: DirectorQualityLoopBudgetNextAction): string {
  const labels: Record<DirectorQualityLoopBudgetNextAction, string> = {
    auto_patch_repair: "Try a local patch first",
    auto_rewrite_chapter: "Switch to full-chapter rewrite",
    auto_replan_window: "Replan the affected chapters",
    defer_and_continue: "Record as quality debt and continue later chapters",
  };
  return labels[action];
}

function buildQualityBudgetSummary(
  events: DirectorEvent[],
): DirectorRuntimeProjection["qualityBudgetSummary"] {
  const budgetEvents = events
    .map((event) => {
      const entry = readQualityBudgetEntry(event.metadata?.qualityBudgetEntry);
      if (!entry) {
        return null;
      }
      return {
        event,
        entry,
        nextAction: isQualityBudgetNextAction(event.metadata?.qualityBudgetNextAction)
          ? event.metadata.qualityBudgetNextAction
          : resolveDirectorQualityLoopBudgetNextAction(entry),
      };
    })
    .filter((item): item is {
      event: DirectorEvent;
      entry: DirectorQualityLoopBudgetEntry;
      nextAction: DirectorQualityLoopBudgetNextAction;
    } => Boolean(item))
    .sort((left, right) => timestampOf(right.event.occurredAt) - timestampOf(left.event.occurredAt));
  const latest = budgetEvents[0];
  if (!latest) {
    return null;
  }
  const { entry, nextAction } = latest;
  const nextActionLabel = formatQualityBudgetNextAction(nextAction);
  const currentChapterOrder = entry.lastChapterOrder
    ?? readFiniteNumber(latest.event.metadata?.chapterOrder)
    ?? (entry.affectedChapterWindow.chapterOrders ?? [])[0]
    ?? null;
  return {
    currentChapterId: entry.lastChapterId ?? null,
    currentChapterOrder,
    latestSignatureKey: entry.signatureKey,
    latestIssueSignature: entry.issueSignature,
    latestReason: entry.lastReason ?? latest.event.summary ?? null,
    patchRepairUsed: entry.patchRepairCount,
    chapterRewriteUsed: entry.chapterRewriteCount,
    windowReplanUsed: entry.windowReplanCount,
    deferredCount: entry.deferredCount,
    nextAction,
    nextActionLabel,
    explanation: `Quality budget: local repair ${entry.patchRepairCount}/1, full-chapter rewrite ${entry.chapterRewriteCount}/1, window replan ${entry.windowReplanCount}/1; the next step for the same issue is ${nextActionLabel}.`,
  };
}

function readLatestQualityLoopAssessment(events: DirectorEvent[]): {
  rootCauseCode: DirectorRuntimeProjection["rootCauseCode"];
  blockingObligations: NonNullable<DirectorRuntimeProjection["blockingObligations"]>;
} {
  const latest = events
    .filter((event) => event.type === "quality_loop_assessed")
    .sort((left, right) => timestampOf(right.occurredAt) - timestampOf(left.occurredAt))
    .find((event) => event.metadata?.assessment && typeof event.metadata.assessment === "object");
  const assessment = latest?.metadata?.assessment as {
    rootCauseCode?: DirectorRuntimeProjection["rootCauseCode"];
    blockingObligations?: NonNullable<DirectorRuntimeProjection["blockingObligations"]>;
  } | undefined;
  return {
    rootCauseCode: assessment?.rootCauseCode ?? null,
    blockingObligations: assessment?.blockingObligations ?? [],
  };
}

export class DirectorEventProjectionService {
  buildSnapshotProjection(
    snapshot: DirectorRuntimeSnapshot | null,
    options?: {
      chapterProgress?: DirectorChapterExecutionProgressSummary | null;
      factSummary?: DirectorTaskFactSummary | null;
      currentFactStep?: {
        stepId: string;
        stepLabel: string;
        evidence?: Record<string, unknown> | null;
        nextActionLabel?: string | null;
      } | null;
    },
  ): DirectorRuntimeProjection | null {
    if (!snapshot) {
      return null;
    }
    const step = latestStep(snapshot.steps);
    const event = latestEvent(snapshot.events);
    const status = statusFromStep(step, options?.factSummary ?? null);
    const requiresUserAction = status === "waiting_approval" || status === "blocked";
    const blockedReason = resolveBlockedReason(step, event);
    const inventory = snapshot.lastWorkspaceAnalysis?.inventory ?? null;
    const recommendation = snapshot.lastWorkspaceAnalysis?.recommendation
      ?? snapshot.lastWorkspaceAnalysis?.interpretation?.recommendedAction
      ?? null;
    const headline = buildHeadline({ status, step, event });
    const progressBreakdown = buildProgressBreakdown(
      snapshot,
      inventory,
      options?.chapterProgress ?? null,
      options?.factSummary ?? null,
    );
    const qualityDebtSummary = buildQualityDebtSummary(snapshot.events);
    const qualityBudgetSummary = buildQualityBudgetSummary(snapshot.events);
    const qualityRootCause = readLatestQualityLoopAssessment(snapshot.events);
    const recoveryDecision = buildRecoveryDecision({
      status,
      inventory,
      blockedReason,
      qualityDebtCount: qualityDebtSummary?.deferredChapterCount ?? 0,
    });
    const isAutopilotRecoverable = isAutomaticPolicy(snapshot)
      && recoveryDecision !== "requires_manual_recovery"
      && status !== "completed"
      && status !== "idle";
    const visibleRiskBadges = buildVisibleRiskBadges({
      status,
      blockedReason,
      inventory,
      events: snapshot.events,
    });
    const recentEvents = [...snapshot.events]
      .sort((left, right) => timestampOf(right.occurredAt) - timestampOf(left.occurredAt))
      .slice(0, 8)
      .map((item) => {
        const issue = parseDirectorIssueEventMetadata(item.metadata);
        return {
          eventId: item.eventId,
          type: item.type,
          summary: item.summary,
          nodeKey: item.nodeKey,
          artifactType: item.artifactType,
          severity: item.severity,
          occurredAt: item.occurredAt,
          issue: issue?.occurrence ?? null,
          issueDecision: issue?.decision ?? null,
        };
      });
    const recentIssues = [...snapshot.events]
      .sort((left, right) => timestampOf(right.occurredAt) - timestampOf(left.occurredAt))
      .flatMap((item) => {
        const issue = parseDirectorIssueEventMetadata(item.metadata);
        return issue ? [issue] : [];
      })
      .filter((item, index, items) => items.findIndex((candidate) => candidate.occurrence.fingerprint === item.occurrence.fingerprint) === index)
      .slice(0, 12);

    return {
      runId: snapshot.runId,
      novelId: snapshot.novelId,
      status,
      currentNodeKey: step?.nodeKey ?? event?.nodeKey ?? null,
      currentLabel: step?.label ?? event?.summary ?? null,
      currentFactStepId: options?.currentFactStep?.stepId ?? null,
      currentFactStepLabel: options?.currentFactStep?.stepLabel ?? null,
      currentFactEvidence: options?.currentFactStep?.evidence ?? null,
      factSummary: options?.factSummary ?? null,
      headline,
      detail: buildDetail({ status, step, event, blockedReason }),
      lastEventSummary: event?.summary ?? null,
      requiresUserAction,
      blockedReason,
      blockingReason: blockedReason,
      nextActionLabel: options?.currentFactStep?.nextActionLabel ?? formatNextAction(recommendation),
      recommendedAction: recommendation,
      recoveryDecision,
      isAutopilotRecoverable,
      scopeSummary: buildScopeSummary(inventory),
      progressSummary: buildProgressSummary(snapshot, inventory, options?.factSummary ?? null),
      progressBreakdown,
      chapterExecutionProgress: options?.chapterProgress ?? null,
      visibleRiskBadges,
      rootCauseCode: qualityRootCause.rootCauseCode,
      blockingObligations: qualityRootCause.blockingObligations,
      qualityDebtSummary,
      qualityBudgetSummary,
      policyMode: snapshot.policy.mode,
      updatedAt: snapshot.updatedAt,
      recentEvents,
      recentIssues,
    };
  }
}

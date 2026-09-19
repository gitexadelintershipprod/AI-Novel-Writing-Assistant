import type {
  AutoDirectorActionValidationInput,
  AutoDirectorAffectedScope,
  AutoDirectorFollowUpSection,
  AutoDirectorFollowUpSectionInput,
  AutoDirectorTakeoverValidationInput,
  AutoDirectorValidationResult,
  AutoDirectorValidationRequiredAction,
} from "@ai-novel/shared/types/autoDirectorValidation";
import {
  AUTO_DIRECTOR_TAKEOVER_ENTRY_ORDER,
} from "@ai-novel/shared/types/autoDirectorValidation";
import type {
  DirectorAutoExecutionPlan,
  DirectorTakeoverEntryStep,
} from "@ai-novel/shared/types/novelDirector";
import type { NovelWorkflowCheckpoint } from "@ai-novel/shared/types/novelWorkflow";

const WEB_SOURCES = new Set(["web", "follow_up_action", "batch_action", "takeover", "continue", "retry"]);
const CHANNEL_SOURCES = new Set(["dingtalk", "wecom", "channel_callback"]);
const AUTO_DIRECTOR_FOLLOW_UP_SECTION_RANK: Record<AutoDirectorFollowUpSection, number> = {
  needs_validation: 0,
  exception: 1,
  pending: 2,
  auto_progress: 3,
  replaced: 4,
};

function requiredAction(input: AutoDirectorValidationRequiredAction): AutoDirectorValidationRequiredAction {
  return input;
}

function normalizeChapterOrder(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value)
    ? Math.max(1, Math.round(value))
    : null;
}

function resolveScopeFromPlan(plan: DirectorAutoExecutionPlan | null | undefined): AutoDirectorAffectedScope {
  if (!plan) {
    return {
      type: "book",
      label: "whole book",
    };
  }
  if (plan?.mode === "book") {
    return {
      type: "book",
      label: "whole book",
    };
  }
  if (plan?.mode === "chapter_range") {
    const startOrder = normalizeChapterOrder(plan.startOrder) ?? 1;
    const endOrder = Math.max(startOrder, normalizeChapterOrder(plan.endOrder) ?? startOrder);
    return {
      type: "chapter_range",
      label: startOrder === endOrder ? `Chapter ${startOrder}` : `Chapters ${startOrder}–${endOrder}`,
      startOrder,
      endOrder,
    };
  }
  if (plan?.mode === "volume") {
    const volumeOrder = normalizeChapterOrder(plan.volumeOrder) ?? 1;
    return {
      type: "volume",
      label: `Volume ${volumeOrder}`,
      volumeOrder,
    };
  }
  const startOrder = normalizeChapterOrder(plan?.startOrder) ?? 1;
  const endOrder = Math.max(startOrder, normalizeChapterOrder(plan?.endOrder) ?? startOrder);
  return {
    type: "chapter_range",
    label: startOrder === endOrder ? `Chapter ${startOrder}` : `Chapters ${startOrder}–${endOrder}`,
    startOrder,
    endOrder,
  };
}

function resolveScopeFromTask(input: AutoDirectorActionValidationInput): AutoDirectorAffectedScope {
  const autoExecution = input.task.seedPayload?.autoExecution;
  const startOrder = normalizeChapterOrder(autoExecution?.startOrder);
  const endOrder = normalizeChapterOrder(autoExecution?.endOrder);
  if (startOrder && endOrder) {
    return {
      type: "chapter_range",
      label: autoExecution?.scopeLabel?.trim() || (startOrder === endOrder ? `Chapter ${startOrder}` : `Chapters ${startOrder}–${endOrder}`),
      startOrder,
      endOrder: Math.max(startOrder, endOrder),
    };
  }
  const volumeOrder = normalizeChapterOrder(autoExecution?.volumeOrder);
  if (volumeOrder) {
    return {
      type: "volume",
      label: autoExecution?.scopeLabel?.trim() || `Volume ${volumeOrder}`,
      volumeOrder,
    };
  }
  return {
    type: "book",
    label: autoExecution?.scopeLabel?.trim() || "whole book",
  };
}

function buildResult(input: {
  allowed: boolean;
  affectedScope: AutoDirectorAffectedScope;
  blockingReasons?: string[];
  warnings?: string[];
  requiredActions?: AutoDirectorValidationRequiredAction[];
  nextCheckpoint?: NovelWorkflowCheckpoint | null;
  nextAction?: string | null;
}): AutoDirectorValidationResult {
  return {
    allowed: input.allowed,
    blockingReasons: input.blockingReasons ?? [],
    warnings: input.warnings ?? [],
    requiredActions: input.requiredActions ?? [],
    affectedScope: input.affectedScope,
    nextCheckpoint: input.nextCheckpoint ?? null,
    nextAction: input.nextAction ?? (input.allowed ? "continue" : "blocked"),
  };
}

function isEntryAtOrAfter(entryStep: DirectorTakeoverEntryStep, minimum: DirectorTakeoverEntryStep): boolean {
  return AUTO_DIRECTOR_TAKEOVER_ENTRY_ORDER[entryStep] >= AUTO_DIRECTOR_TAKEOVER_ENTRY_ORDER[minimum];
}

function isChapterRangeScope(
  scope: AutoDirectorAffectedScope,
): scope is Extract<AutoDirectorAffectedScope, { type: "chapter_range" }> {
  return scope.type === "chapter_range";
}

function isVolumeScope(
  scope: AutoDirectorAffectedScope,
): scope is Extract<AutoDirectorAffectedScope, { type: "volume" }> {
  return scope.type === "volume";
}

function shouldAllowStructuredBackfill(input: {
  entryStep: DirectorTakeoverEntryStep;
  request: AutoDirectorTakeoverValidationInput["request"];
  assets: AutoDirectorTakeoverValidationInput["assets"];
}): boolean {
  return input.request.strategy === "continue_existing"
    && isEntryAtOrAfter(input.entryStep, "chapter")
    && Boolean(input.assets.hasVolumeStrategyPlan);
}

function resolveStructuredOutlineMissingOrders(input: {
  affectedScope: AutoDirectorAffectedScope;
  volumeChapterRanges: Array<{ volumeOrder: number; startOrder: number; endOrder: number }>;
  structuredOutlineChapterOrders: Set<number>;
}): number[] {
  if (input.structuredOutlineChapterOrders.size === 0) {
    return [];
  }
  const missingOrders: number[] = [];
  if (isChapterRangeScope(input.affectedScope)) {
    for (let order = input.affectedScope.startOrder; order <= input.affectedScope.endOrder; order += 1) {
      if (!input.structuredOutlineChapterOrders.has(order)) {
        missingOrders.push(order);
      }
    }
  }
  if (isVolumeScope(input.affectedScope)) {
    const volumeOrder = input.affectedScope.volumeOrder;
    const range = input.volumeChapterRanges.find((item) => item.volumeOrder === volumeOrder);
    if (range) {
      for (let order = range.startOrder; order <= range.endOrder; order += 1) {
        if (!input.structuredOutlineChapterOrders.has(order)) {
          missingOrders.push(order);
        }
      }
    }
  }
  return missingOrders;
}

function resolveStructuredBackfillNeed(input: {
  affectedScope: AutoDirectorAffectedScope;
  assets: AutoDirectorTakeoverValidationInput["assets"];
  entryStep: DirectorTakeoverEntryStep;
}): {
  needed: boolean;
  missingOrders: number[];
} {
  if (!isEntryAtOrAfter(input.entryStep, "chapter")) {
    return { needed: false, missingOrders: [] };
  }
  if (!input.assets.hasVolumeStrategyPlan) {
    return { needed: false, missingOrders: [] };
  }
  const volumeChapterRanges = Array.isArray(input.assets.volumeChapterRanges)
    ? input.assets.volumeChapterRanges
      .map((range) => ({
        volumeOrder: normalizeChapterOrder(range.volumeOrder),
        startOrder: normalizeChapterOrder(range.startOrder),
        endOrder: normalizeChapterOrder(range.endOrder),
      }))
      .filter((range): range is { volumeOrder: number; startOrder: number; endOrder: number } => Boolean(range.volumeOrder && range.startOrder && range.endOrder))
    : [];
  const structuredOutlineChapterOrders = new Set(
    (input.assets.structuredOutlineChapterOrders ?? [])
      .map((order) => normalizeChapterOrder(order))
      .filter((order): order is number => Boolean(order)),
  );
  const missingOrders = resolveStructuredOutlineMissingOrders({
    affectedScope: input.affectedScope,
    volumeChapterRanges,
    structuredOutlineChapterOrders,
  });
  return {
    needed: !input.assets.hasStructuredOutline || missingOrders.length > 0,
    missingOrders,
  };
}

function resolvePlannedChapterCount(input: {
  assets: AutoDirectorTakeoverValidationInput["assets"];
  volumeChapterRanges: Array<{ volumeOrder: number; startOrder: number; endOrder: number }>;
  structuredOutlineChapterOrders: Set<number>;
}): number | null {
  const candidates = [
    normalizeChapterOrder(input.assets.plannedChapterCount ?? null),
    ...input.volumeChapterRanges.map((range) => normalizeChapterOrder(range.endOrder)),
    ...Array.from(input.structuredOutlineChapterOrders).map((order) => normalizeChapterOrder(order)),
    normalizeChapterOrder(input.assets.totalChapterCount ?? null),
  ].filter((count): count is number => Boolean(count));
  return candidates.length > 0 ? Math.max(...candidates) : null;
}

function validateScopeAgainstAssets(input: {
  affectedScope: AutoDirectorAffectedScope;
  assets: AutoDirectorTakeoverValidationInput["assets"];
  entryStep: DirectorTakeoverEntryStep;
  allowStructuredBackfill?: boolean;
}): string[] {
  const reasons: string[] = [];
  const volumeChapterRanges = Array.isArray(input.assets.volumeChapterRanges)
    ? input.assets.volumeChapterRanges
      .map((range) => ({
        volumeOrder: normalizeChapterOrder(range.volumeOrder),
        startOrder: normalizeChapterOrder(range.startOrder),
        endOrder: normalizeChapterOrder(range.endOrder),
      }))
      .filter((range): range is { volumeOrder: number; startOrder: number; endOrder: number } => Boolean(range.volumeOrder && range.startOrder && range.endOrder))
    : [];
  const structuredOutlineChapterOrders = new Set(
    (input.assets.structuredOutlineChapterOrders ?? [])
      .map((order) => normalizeChapterOrder(order))
      .filter((order): order is number => Boolean(order)),
  );
  const plannedChapterCount = resolvePlannedChapterCount({
    assets: input.assets,
    volumeChapterRanges,
    structuredOutlineChapterOrders,
  });
  const affectedScope = input.affectedScope;
  if (isChapterRangeScope(affectedScope) && plannedChapterCount && affectedScope.endOrder > plannedChapterCount) {
    reasons.push(`The target chapter scope exceeds the current book plan. Adjust the range to ${plannedChapterCount} chapters or fewer.`);
  }
  if (isVolumeScope(affectedScope)) {
    const volumeCount = normalizeChapterOrder(input.assets.volumeCount) ?? 0;
    if (volumeCount > 0 && affectedScope.volumeOrder > volumeCount) {
      reasons.push(`The current volume strategy only has ${volumeCount} volume(s), so Volume ${affectedScope.volumeOrder} cannot run directly.`);
    }
  }
  if (isChapterRangeScope(affectedScope) && !isEntryAtOrAfter(input.entryStep, "structured")) {
    reasons.push("A chapter range can only start from beats/chapters, chapter execution, or quality repair.");
  }
  if (isVolumeScope(affectedScope) && !isEntryAtOrAfter(input.entryStep, "outline")) {
    reasons.push("A volume range can only start from volume strategy, beats/chapters, chapter execution, or quality repair.");
  }
  if (isEntryAtOrAfter(input.entryStep, "structured") && !input.assets.hasVolumeStrategyPlan) {
    reasons.push("The target range lacks volume-strategy support. Finish volume strategy first.");
  }
  if (isChapterRangeScope(affectedScope) && volumeChapterRanges.length > 0) {
    const isCoveredByVolumeStrategy = volumeChapterRanges.some((range) => (
      range.startOrder <= affectedScope.startOrder && range.endOrder >= affectedScope.endOrder
    ));
    if (!isCoveredByVolumeStrategy) {
      reasons.push("The target chapter range is not fully covered by the current volume strategy. Adjust the strategy or shrink the range.");
    }
  }
  if (isEntryAtOrAfter(input.entryStep, "chapter") && !input.assets.hasStructuredOutline && !input.allowStructuredBackfill) {
    reasons.push("The target range lacks beat/chapter split. Finish it or recheck the split result first.");
  }
  if (isEntryAtOrAfter(input.entryStep, "chapter") && structuredOutlineChapterOrders.size > 0) {
    const missingOrders = resolveStructuredOutlineMissingOrders({
      affectedScope,
      volumeChapterRanges,
      structuredOutlineChapterOrders,
    });
    if (missingOrders.length > 0 && !input.allowStructuredBackfill) {
      reasons.push(`The target range is missing beat/chapter details: chapters ${missingOrders.slice(0, 5).join(", ")} need to be finished or rechecked first.`);
    }
  }
  return reasons;
}

export function validateAutoDirectorTakeoverRequest(
  input: AutoDirectorTakeoverValidationInput,
): AutoDirectorValidationResult {
  const entryStep = input.request.entryStep ?? "basic";
  const affectedScope = resolveScopeFromPlan(input.request.autoExecutionPlan);
  const blockingReasons: string[] = [];
  const allowStructuredBackfill = shouldAllowStructuredBackfill({
    entryStep,
    request: input.request,
    assets: input.assets,
  });
  const structuredBackfillNeed = resolveStructuredBackfillNeed({
    affectedScope,
    assets: input.assets,
    entryStep,
  });
  const onlyStructuredBackfillBlocked = blockingReasons.length > 0
    && structuredBackfillNeed.needed
    && blockingReasons.every((reason) => reason.includes("Rhythm breaking chapter"));
  const canBackfillStructuredOutline = onlyStructuredBackfillBlocked
    && input.request.strategy === "continue_existing"
    && Boolean(input.assets.hasVolumeStrategyPlan);

  if (entryStep === "story_macro" && !input.assets.hasProjectSetup) {
    blockingReasons.push("Project setup is incomplete, so story planning cannot start yet.");
  }
  if (isEntryAtOrAfter(entryStep, "character") && !input.assets.hasStoryMacroPlan) {
    blockingReasons.push("Story planning is not finished, so character setup cannot start yet.");
  }
  if (isEntryAtOrAfter(entryStep, "character") && !input.assets.hasBookContract) {
    blockingReasons.push("The Book Contract is not finished yet, so character setup and later steps cannot start.");
  }
  if (isEntryAtOrAfter(entryStep, "outline") && (!input.assets.hasStoryMacroPlan || !input.assets.hasBookContract || (input.assets.characterCount ?? 0) <= 0)) {
    blockingReasons.push("Story planning, Book Contract, or character setup is not finished, so volume strategy cannot start yet.");
  }
  blockingReasons.push(...validateScopeAgainstAssets({
    affectedScope,
    assets: input.assets,
    entryStep,
    allowStructuredBackfill,
  }));

  return buildResult({
    allowed: blockingReasons.length === 0,
    blockingReasons,
    affectedScope,
    warnings: input.request.strategy === "restart_current_step"
      ? ["Regenerating will affect the target node and later assets. Keep a recoverable snapshot first."]
      : [],
    requiredActions: onlyStructuredBackfillBlocked && Boolean(input.assets.hasVolumeStrategyPlan)
      ? [
          requiredAction({
            code: "auto_backfill_structured_outline",
            label: "Let AI finish the chapter split, then continue",
            riskLevel: "low",
            safeToAutoFix: true,
          }),
        ]
      : input.request.strategy === "restart_current_step"
        ? [
          requiredAction({
            code: "create_rewrite_snapshot",
            label: "Create a pre-rewrite snapshot",
            riskLevel: "high",
            safeToAutoFix: false,
          }),
          requiredAction({
            code: "reset_downstream_state",
            label: "Reset state after the target node",
            riskLevel: "medium",
            safeToAutoFix: false,
          }),
        ]
        : [],
    nextCheckpoint: "chapter_batch_ready",
    nextAction: blockingReasons.length > 0
      ? canBackfillStructuredOutline
        ? "auto_backfill_structured_outline"
        : "blocked"
      : allowStructuredBackfill && structuredBackfillNeed.needed
        ? "auto_backfill_structured_outline"
      : entryStep === "chapter" || entryStep === "pipeline"
        ? "continue_auto_execution"
        : "continue_structured_outline",
  });
}

export function validateAutoDirectorAction(input: AutoDirectorActionValidationInput): AutoDirectorValidationResult {
  const affectedScope = resolveScopeFromTask(input);
  const blockingReasons: string[] = [];

  if (input.task.lane && input.task.lane !== "auto_director") {
    blockingReasons.push("This is not an Auto-Director task, so Auto-Director actions cannot be used.");
  }
  if (input.task.pendingManualRecovery && input.actionCode !== "continue_generic") {
    blockingReasons.push("The task is in manual recovery. Recover it before doing anything else.");
  }
  if (CHANNEL_SOURCES.has(input.source) && input.actionCode !== "continue_auto_execution" && input.actionCode !== "retry_with_task_model") {
    blockingReasons.push("The message client only supports low-risk actions. Confirm in the app before continuing.");
  }
  if (CHANNEL_SOURCES.has(input.source) && input.actionCode === "retry_with_route_model") {
    blockingReasons.push("Retrying with the routed model needs in-app confirmation. Open the follow-up center.");
  }
  if (input.actionCode === "continue_auto_execution" && input.task.status !== "waiting_approval") {
    blockingReasons.push("This task is not waiting to continue. Recheck the task status first.");
  }
  if (input.actionCode === "continue_auto_execution" && input.task.checkpointType !== "chapter_batch_ready") {
    blockingReasons.push("This checkpoint cannot continue chapter execution directly. Open the task details first.");
  }
  if ((input.actionCode === "retry_with_task_model" || input.actionCode === "retry_with_route_model") && input.task.status !== "failed" && input.task.status !== "cancelled") {
    blockingReasons.push("This task has not failed or been cancelled, so retry is not needed.");
  }

  return buildResult({
    allowed: blockingReasons.length === 0,
    blockingReasons,
    affectedScope,
    warnings: input.actionCode === "retry_with_route_model"
      ? ["Retrying with the routed model uses the current model route, so results may differ from the task's original model."]
      : [],
    requiredActions: input.actionCode === "continue_auto_execution"
      ? [
          requiredAction({
            code: "clear_checkpoint",
            label: "Clear handled checkpoints",
            riskLevel: "low",
            safeToAutoFix: true,
          }),
        ]
      : input.actionCode === "retry_with_task_model" || input.actionCode === "retry_with_route_model"
        ? [
            requiredAction({
              code: "clear_failure",
              label: "Clear the failed state and run again",
              riskLevel: "low",
              safeToAutoFix: true,
            }),
          ]
        : [],
    nextAction: blockingReasons.length > 0
      ? (WEB_SOURCES.has(input.source) ? "revalidate" : "open_follow_up_center")
      : input.actionCode,
  });
}

export function resolveAutoDirectorFollowUpSection(input: AutoDirectorFollowUpSectionInput): AutoDirectorFollowUpSection {
  if (input.validationResult && !input.validationResult.allowed) {
    return "needs_validation";
  }
  if (input.status === "cancelled" && input.replacementTaskId?.trim()) {
    return "replaced";
  }
  if (input.pendingManualRecovery || input.status === "failed" || input.status === "cancelled") {
    return "exception";
  }
  if (input.status === "waiting_approval") {
    return "pending";
  }
  if (input.status === "queued" || input.status === "running") {
    return "auto_progress";
  }
  if (input.replacementTaskId?.trim()) {
    return "replaced";
  }
  return "pending";
}

export function compareAutoDirectorFollowUpSections(
  left: AutoDirectorFollowUpSection,
  right: AutoDirectorFollowUpSection,
): number {
  return AUTO_DIRECTOR_FOLLOW_UP_SECTION_RANK[left] - AUTO_DIRECTOR_FOLLOW_UP_SECTION_RANK[right];
}

export class AutoDirectorValidationService {
  validateTakeoverRequest(input: AutoDirectorTakeoverValidationInput): AutoDirectorValidationResult {
    return validateAutoDirectorTakeoverRequest(input);
  }

  validateAction(input: AutoDirectorActionValidationInput): AutoDirectorValidationResult {
    return validateAutoDirectorAction(input);
  }

  resolveFollowUpSection(input: AutoDirectorFollowUpSectionInput): AutoDirectorFollowUpSection {
    return resolveAutoDirectorFollowUpSection(input);
  }
}

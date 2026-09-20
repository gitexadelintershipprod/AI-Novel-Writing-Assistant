import type {
  DirectorTaskSnapshot,
} from "@ai-novel/shared/types/directorRuntime";
import type {
  DirectorAutoExecutionPlan,
  DirectorRunMode,
  DirectorTakeoverEntryReadiness,
  DirectorTakeoverEntryStep,
  DirectorTakeoverPreview,
  DirectorTakeoverReadinessResponse,
  DirectorTakeoverStrategy,
} from "@ai-novel/shared/types/novelDirector";

type TakeoverScopeMode = "book" | "chapter_range" | "volume";

export interface TakeoverGuidanceViewModel {
  diagnosis: string;
  nextStep: string;
  protectionNotes: string[];
  riskLevel: "safe" | "caution";
  actionLabel: string;
}

export interface TakeoverProgressCard {
  title: string;
  status: string;
  detail: string;
}

export interface TakeoverProgressInspectionViewModel {
  cards: TakeoverProgressCard[];
  summary: string;
}

export interface TakeoverChapterTargetViewModel {
  startOrder: number;
  maxOrder: number;
  selectedOrder: number;
  plan: DirectorAutoExecutionPlan;
  actionLabel: string;
  summary: string;
}

const ENTRY_STEP_USER_LABELS: Record<DirectorTakeoverEntryStep, string> = {
  basic: "Project setup",
  story_macro: "Story planning",
  world: "World setup",
  character: "Character setup",
  outline: "Volume planning",
  structured: "Rhythm breaking chapter",
  chapter: "Chapter execution",
  pipeline: "Quality repair",
};

const RUN_MODE_ACTION_LABELS: Record<DirectorRunMode, string> = {
  auto_to_ready: "Continue to advance until you can start writing",
  auto_to_execution: "Continue by scope",
  full_book_autopilot: "Take over the entire book and move on",
  stage_review: "keep pushing forward",
};

export function isTakeoverEntryStepAllowedForScope(
  entryStep: DirectorTakeoverEntryStep,
  scopeMode: TakeoverScopeMode,
): boolean {
  if (scopeMode === "chapter_range") {
    return entryStep === "structured" || entryStep === "chapter" || entryStep === "pipeline";
  }
  if (scopeMode === "volume") {
    return entryStep === "outline" || entryStep === "structured" || entryStep === "chapter" || entryStep === "pipeline";
  }
  return true;
}

export function resolveRecommendedTakeoverEntryStep(
  readiness: DirectorTakeoverReadinessResponse | null,
  scopeMode: TakeoverScopeMode,
): DirectorTakeoverEntryStep | null {
  if (!readiness) {
    return null;
  }
  const allowed = (entry: DirectorTakeoverEntryReadiness) => (
    entry.available && isTakeoverEntryStepAllowedForScope(entry.step, scopeMode)
  );
  return (
    readiness.entrySteps.find((entry) => entry.recommended && allowed(entry))
    ?? readiness.entrySteps.find(allowed)
    ?? null
  )?.step ?? null;
}

export function findTakeoverPreview(
  readiness: DirectorTakeoverReadinessResponse | null,
  entryStep: DirectorTakeoverEntryStep,
  strategy: DirectorTakeoverStrategy,
): DirectorTakeoverPreview | null {
  return readiness?.entrySteps
    .find((entry) => entry.step === entryStep)
    ?.previews.find((preview) => preview.strategy === strategy) ?? null;
}

export function buildTakeoverGuidance(
  readiness: DirectorTakeoverReadinessResponse | null,
  entryStep: DirectorTakeoverEntryStep,
  strategy: DirectorTakeoverStrategy,
  runMode: DirectorRunMode,
  taskSnapshot?: DirectorTaskSnapshot | null,
): TakeoverGuidanceViewModel {
  const task = taskSnapshot?.task ?? null;
  const chapterProgress = taskSnapshot?.chapterProgress ?? taskSnapshot?.projection?.chapterExecutionProgress ?? null;
  if (task && (task.status === "queued" || task.status === "running" || task.status === "waiting_approval")) {
    const currentStage = task.currentStage?.trim() || taskSnapshot?.displayState.stageLabel || "current task";
    const currentLabel = task.currentItemLabel?.trim() || taskSnapshot?.displayState.currentAction || "Wait to continue";
    const nextChapterOrder = chapterProgress?.currentChapterOrder ?? chapterProgress?.activeChapterOrder ?? null;
    return {
      diagnosis: `An Auto-Director task is already paused at "${currentStage}".`,
      nextStep: nextChapterOrder
        ? `Chapter execution is around chapter ${nextChapterOrder}. Go back to the current task first.`
        : `Current task status: ${currentLabel}.`,
      protectionNotes: [
        `Task status: ${task.status}`,
        currentLabel,
        "Continuing the current task will not open a new duplicate takeover.",
      ],
      riskLevel: "safe",
      actionLabel: "Enter current task",
    };
  }
  if (!readiness) {
    return {
      diagnosis: "The project progress is being read. After the reading is completed, the recommended connection location will be given.",
      nextStep: "Once the reading is complete, you can proceed.",
      protectionNotes: ["Existing writing assets are retained by default."],
      riskLevel: "safe",
      actionLabel: RUN_MODE_ACTION_LABELS[runMode] ?? "keep pushing forward",
    };
  }
  const preview = findTakeoverPreview(readiness, entryStep, strategy);
  const entryLabel = ENTRY_STEP_USER_LABELS[preview?.effectiveStep ?? entryStep] ?? "Recommended location";
  const hasCharacters = readiness.snapshot.characterCount > 0;
  const hasVolumes = readiness.snapshot.volumeCount > 0;
  const hasChapters = readiness.snapshot.chapterCount > 0;
  const protectionNotes = [
    hasCharacters ? `Keep the ${readiness.snapshot.characterCount} character assets already created.` : "If no created character is detected, the AI will make up for character preparation.",
    hasVolumes ? "Use existing volumes to plan assets and only make up for subsequent gaps." : "No volume plans are detected and the AI continues to generate volume plans.",
    hasChapters ? `Keep the existing ${readiness.snapshot.chapterCount} chapters or chapter assets.` : "No generated body detected.",
  ];
  const riskLevel = strategy === "restart_current_step" ? "caution" : "safe";
  return {
    diagnosis: `This project can continue from "${entryLabel}".`,
    nextStep: preview?.summary ?? `AI will continue from "${entryLabel}".`,
    protectionNotes,
    riskLevel,
    actionLabel: buildPrimaryActionLabel({
      fallback: RUN_MODE_ACTION_LABELS[runMode] ?? "keep pushing forward",
      taskSnapshot,
      readiness,
    }),
  };
}

function formatRatio(done: number, total: number): string {
  if (total <= 0) {
    return done > 0 ? `${done} items` : "None yet";
  }
  return `${done} / ${total}`;
}

function buildPrimaryActionLabel(input: {
  fallback: string;
  taskSnapshot?: DirectorTaskSnapshot | null;
  readiness?: DirectorTakeoverReadinessResponse | null;
}): string {
  const progress = input.taskSnapshot?.chapterProgress
    ?? input.taskSnapshot?.projection?.chapterExecutionProgress
    ?? null;
  if (progress?.currentChapterOrder) {
    return `Continue writing chapter ${progress.currentChapterOrder}`;
  }
  const drafted = progress?.draftedChapterCount ?? input.readiness?.snapshot.generatedChapterCount ?? 0;
  const approved = progress?.approvedChapterCount ?? input.readiness?.snapshot.approvedChapterCount ?? 0;
  if (drafted > approved) {
    return "Process chapters to be confirmed";
  }
  if ((input.readiness?.snapshot.chapterCount ?? 0) > 0) {
    return "Continue chapter execution";
  }
  return input.fallback;
}

function normalizePositiveOrder(value: number | null | undefined): number | null {
  if (!Number.isFinite(value ?? NaN) || !value || value < 1) {
    return null;
  }
  return Math.max(1, Math.round(value));
}

function maxNormalizedOrder(values: Array<number | null | undefined>): number | null {
  const normalized = values
    .map(normalizePositiveOrder)
    .filter((value): value is number => Boolean(value));
  if (normalized.length === 0) {
    return null;
  }
  return Math.max(...normalized);
}

export function buildTakeoverChapterTarget(
  readiness: DirectorTakeoverReadinessResponse | null,
  taskSnapshot?: DirectorTaskSnapshot | null,
  selectedOrder?: number | null,
): TakeoverChapterTargetViewModel | null {
  const progress = taskSnapshot?.chapterProgress
    ?? taskSnapshot?.projection?.chapterExecutionProgress
    ?? null;
  const snapshot = readiness?.snapshot ?? null;
  const writtenChapterCount = maxNormalizedOrder([
    progress?.draftedChapterCount,
    progress?.completedChapters,
    snapshot?.generatedChapterCount,
  ]);
  const startOrder = maxNormalizedOrder([
    progress?.currentChapterOrder
      ?? null,
    progress?.activeChapterOrder
      ?? null,
    readiness?.executableRange?.nextChapterOrder
      ?? null,
    writtenChapterCount ? writtenChapterCount + 1 : null,
    snapshot?.approvedChapterCount ? snapshot.approvedChapterCount + 1 : null,
  ]);
  const totalChapters = maxNormalizedOrder([
    progress?.totalChapters
      ?? null,
    readiness?.executableRange?.endOrder
      ?? null,
    snapshot?.chapterCount
      ?? null,
    snapshot?.firstVolumeChapterCount
      ?? null,
  ]);
  if (!startOrder || !totalChapters || startOrder > totalChapters) {
    return null;
  }
  const normalizedSelected = normalizePositiveOrder(selectedOrder ?? null);
  const selected = normalizedSelected
    ? Math.min(Math.max(normalizedSelected, startOrder), totalChapters)
    : startOrder;
  const plan: DirectorAutoExecutionPlan = {
    mode: "chapter_range",
    startOrder,
    endOrder: selected,
    autoReview: true,
    autoRepair: true,
  };
  return {
    startOrder,
    maxOrder: totalChapters,
    selectedOrder: selected,
    plan,
    actionLabel: `Advance to chapter ${selected}`,
    summary: selected === startOrder
      ? `Continue from chapter ${startOrder}.`
      : `Start at chapter ${startOrder} and keep going through chapter ${selected}.`,
  };
}

export function buildTakeoverProgressInspection(
  readiness: DirectorTakeoverReadinessResponse | null,
  taskSnapshot?: DirectorTaskSnapshot | null,
): TakeoverProgressInspectionViewModel {
  const factSummary = taskSnapshot?.factSummary ?? taskSnapshot?.projection?.factSummary ?? null;
  const outline = factSummary?.outlineFacts ?? null;
  const chapterFacts = factSummary?.chapterExecutionFacts ?? null;
  const repairFacts = factSummary?.repairFacts ?? null;
  const chapterProgress = taskSnapshot?.chapterProgress ?? taskSnapshot?.projection?.chapterExecutionProgress ?? null;
  const snapshot = readiness?.snapshot ?? null;
  const volumeRanges = snapshot?.volumeChapterRanges ?? [];
  const syncedChapterCount = outline?.syncedChapterCount ?? snapshot?.chapterCount ?? 0;
  const plannedChapterCount = outline?.plannedChapterCount ?? snapshot?.chapterCount ?? chapterProgress?.totalChapters ?? 0;
  const selectedChapterCount = outline?.selectedChapterCount ?? readiness?.executableRange?.totalChapterCount ?? 0;
  const detailDone = outline?.completedDetailSteps ?? snapshot?.firstVolumePreparedChapterCount ?? 0;
  const detailTotal = outline?.totalDetailSteps ?? selectedChapterCount;
  const drafted = chapterProgress?.draftedChapterCount ?? chapterFacts?.draftedChapterCount ?? snapshot?.generatedChapterCount ?? 0;
  const approved = chapterProgress?.approvedChapterCount ?? chapterFacts?.approvedChapterCount ?? snapshot?.approvedChapterCount ?? 0;
  const reviewed = chapterFacts?.reviewedChapterCount ?? repairFacts?.reviewedChapterCount ?? 0;
  const pendingRepair = chapterProgress?.needsRepairChapters ?? chapterFacts?.needsRepairChapters ?? snapshot?.pendingRepairChapterCount ?? 0;
  const nextChapterOrder = chapterProgress?.currentChapterOrder ?? readiness?.executableRange?.nextChapterOrder ?? null;

  const cards: TakeoverProgressCard[] = [
    {
      title: "Volume planning progress",
      status: factSummary?.hasVolumeStrategy || (snapshot?.volumeCount ?? 0) > 0 ? "Already have volume strategy" : "To-be-replenished paper strategy",
      detail: snapshot
        ? `${snapshot.volumeCount} volumes; current volume has ${snapshot.firstVolumeChapterCount} chapters; split range ${volumeRanges.map((range) => `ch. ${range.startOrder}-${range.endOrder}`).join(", ") || "none yet"}`
        : "Reading volume plan.",
    },
    {
      title: "Chapter opening and synchronization progress",
      status: formatRatio(syncedChapterCount, plannedChapterCount),
      detail: selectedChapterCount > 0
        ? `Executable range: chapters ${readiness?.executableRange?.startOrder ?? 1}-${readiness?.executableRange?.endOrder ?? selectedChapterCount}.`
        : "No executable chapter range has been detected yet.",
    },
    {
      title: "Chapter refinement progress",
      status: formatRatio(detailDone, detailTotal),
      detail: outline?.chapterDetailReady || detailDone > 0
        ? `${detailDone} chapter task sheets / execution resources are ready.`
        : "Chapter refinement resources have not been detected yet.",
    },
    {
      title: "Text and quality progress",
      status: formatRatio(drafted, chapterProgress?.totalChapters ?? chapterFacts?.totalChapters ?? plannedChapterCount),
      detail: [
        reviewed > 0 ? `${reviewed} chapters reviewed` : "",
        approved > 0 ? `${approved} chapters passed` : "",
        pendingRepair > 0 ? `${pendingRepair} chapters still need work` : "",
        nextChapterOrder ? `Next: chapter ${nextChapterOrder}` : "",
      ].filter(Boolean).join("; ") || "Text production has not yet started.",
    },
  ];

  return {
    cards,
    summary: taskSnapshot?.task
      ? `Current task: ${taskSnapshot.task.currentStage || taskSnapshot.displayState.stageLabel || "Auto-Director"} / ${taskSnapshot.task.currentItemLabel || taskSnapshot.displayState.currentAction || "Waiting to continue"}`
      : "The following is the progress of assets detected in the current project.",
  };
}

export function formatTakeoverStartError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error || "");
  if (
    message.includes("Chapter scope can only start")
    || message.includes("A chapter range can only start")
    || message.includes("章节范围只能从")
  ) {
    return "This project has not reached chapter production yet, so it cannot continue from a chapter range. Continue from the recommended place instead.";
  }
  if (message.includes("There is currently an automatic director task")) {
    return "There is currently an automatic director task processing this book. Please enter the current task to continue or cancel before taking over.";
  }
  return message || "Failed to initiate automatic director takeover.";
}

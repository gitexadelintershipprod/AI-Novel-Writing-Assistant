import type {
  BookSpec,
  DirectorCandidate,
  DirectorConfirmRequest,
  DirectorProjectContextInput,
  DirectorRunMode,
  DirectorTakeoverEntryReadiness,
  DirectorTakeoverEntryStep,
  DirectorTakeoverExecutableRangeSnapshot,
  DirectorTakeoverPipelineJobSnapshot,
  DirectorTakeoverPreview,
  DirectorTakeoverReadinessResponse,
  DirectorTakeoverStageReadiness,
  DirectorTakeoverStartPhase,
  DirectorTakeoverStrategy,
  DirectorTakeoverCheckpointSnapshot,
} from "@ai-novel/shared/types/novelDirector";
import type { NovelWorkflowStage, BookContract } from "@ai-novel/shared/types/novelWorkflow";
import type { StoryMacroPlan } from "@ai-novel/shared/types/storyMacro";
import { DIRECTOR_TAKEOVER_ENTRY_STEPS } from "@ai-novel/shared/types/novelDirector";
import { normalizeDirectorTargetChapterCount } from "./novelDirectorHelpers";

export interface DirectorTakeoverNovelContext extends Omit<DirectorProjectContextInput, "description"> {
  id: string;
  title: string;
  description?: string | null;
  commercialTags: string[];
}

export interface DirectorTakeoverAssetSnapshot {
  hasStoryMacroPlan: boolean;
  hasBookContract: boolean;
  hasWorldSetupPrepared: boolean;
  characterCount: number;
  chapterCount: number;
  plannedChapterCount?: number | null;
  volumeCount: number;
  hasVolumeStrategyPlan?: boolean;
  firstVolumeId: string | null;
  firstVolumeChapterCount: number;
  volumeChapterRanges?: Array<{
    volumeOrder: number;
    startOrder: number;
    endOrder: number;
  }>;
  structuredOutlineChapterOrders?: number[];
  firstVolumeBeatSheetReady?: boolean;
  firstVolumePreparedChapterCount?: number;
  structuredOutlineRecoveryStep?: "beat_sheet" | "chapter_list" | "chapter_detail_bundle" | "chapter_sync" | "completed" | null;
  generatedChapterCount?: number;
  approvedChapterCount?: number;
  pendingRepairChapterCount?: number;
  /**
   * Whether the target auto-execution range still has chapters that are unprocessed and missing complete chapter detail.
   * When true, continue mode should first return to beats / chapter-split to fill detail, instead of entering chapter execution
   * (otherwise runFromReady throws "missing complete chapter detail" and stalls).
   */
  hasUnpreparedChaptersInRange?: boolean;
  /** Chapter orders that still lack complete detail (for debug / display). */
  missingExecutionContractOrders?: number[];
}

export interface DirectorTakeoverDecisionInput {
  entryStep: DirectorTakeoverEntryStep;
  strategy: DirectorTakeoverStrategy;
  snapshot: DirectorTakeoverAssetSnapshot;
  activePipelineJob?: DirectorTakeoverPipelineJobSnapshot | null;
  latestCheckpoint?: DirectorTakeoverCheckpointSnapshot | null;
  executableRange?: DirectorTakeoverExecutableRangeSnapshot | null;
}

export interface DirectorTakeoverResolvedPlan {
  entryStep: DirectorTakeoverEntryStep;
  strategy: DirectorTakeoverStrategy;
  effectiveStep: DirectorTakeoverEntryStep;
  effectiveStage: NovelWorkflowStage;
  startPhase: DirectorTakeoverStartPhase;
  resumeStage: "basic" | "story_macro" | "world" | "character" | "outline" | "structured" | "chapter" | "pipeline";
  skipSteps: DirectorTakeoverEntryStep[];
  summary: string;
  effectSummary: string;
  impactNotes: string[];
  usesCurrentBatch: boolean;
  currentStep?: DirectorTakeoverEntryStep | null;
  restartStep?: DirectorTakeoverEntryStep | null;
  executionMode: "phase" | "auto_execution";
  phase?: DirectorTakeoverStartPhase;
  resumeCheckpointType?: "chapter_batch_ready" | "step_review_required" | "replan_required" | null;
}

const DIRECTOR_TAKEOVER_STAGE_META: Record<
  DirectorTakeoverStartPhase,
  Pick<DirectorTakeoverStageReadiness, "label" | "description">
> = {
  story_macro: {
    label: "Start from story planning",
    description: "Fill in Story Macro and Book Contract first, then continue with characters, volume strategy, and chapter split.",
  },
  world_setup: {
    label: "Start from world setup",
    description: "Keep story planning, finish this book's world first, then continue with characters and later planning.",
  },
  character_setup: {
    label: "Start from character setup",
    description: "Keep the existing book direction and let AI take over only the cast and later planning.",
  },
  volume_strategy: {
    label: "Start from volume strategy",
    description: "Keep the existing book direction and characters, and continue generating the volume strategy and skeleton.",
  },
  structured_outline: {
    label: "Start from beats / chapters",
    description: "Keep the existing volume plan and continue generating the beat sheet, chapter list, and chapter details.",
  },
};

const TAKEOVER_ENTRY_META: Record<
  DirectorTakeoverEntryStep,
  {
    label: string;
    description: string;
  }
> = {
  basic: {
    label: "Project setup",
    description: "Continue takeover from existing project basics, filling the earliest missing director assets first.",
  },
  story_macro: {
    label: "Story planning",
    description: "Continue or rerun book-level planning around Story Macro and Book Contract.",
  },
  world: {
    label: "World setup",
    description: "Continue or rerun this step around world rules, factions, and constraints.",
  },
  character: {
    label: "Character setup",
    description: "Continue or rerun this step around the cast and character application.",
  },
  outline: {
    label: "Volume strategy",
    description: "Continue or rerun this step around volume strategy and the volume skeleton.",
  },
  structured: {
    label: "Beats / chapters",
    description: "Continue or rerun this step around this volume's beat sheet, chapter list, and detail resources.",
  },
  chapter: {
    label: "Chapter execution",
    description: "Resume the current chapter batch first, or continue from the prepared range.",
  },
  pipeline: {
    label: "Quality repair",
    description: "Resume the current repair batch first, or continue from chapters still waiting for repair.",
  },
};

function hasMeaningfulSeedMaterial(novel: DirectorTakeoverNovelContext): boolean {
  return Boolean(
    novel.description?.trim()
    || novel.targetAudience?.trim()
    || novel.bookSellingPoint?.trim()
    || novel.competingFeel?.trim()
    || novel.first30ChapterPromise?.trim()
    || novel.commercialTags.length > 0
    || novel.genreId?.trim()
    || novel.worldId?.trim(),
  );
}

function splitToneKeywords(novel: DirectorTakeoverNovelContext): string[] {
  const raw = [
    novel.styleTone?.trim() ?? "",
    novel.competingFeel?.trim() ?? "",
    ...novel.commercialTags,
  ]
    .filter(Boolean)
    .join("，");
  return Array.from(
    new Set(
      raw
        .split(/[，、|/]/)
        .map((item) => item.trim())
        .filter(Boolean),
    ),
  ).slice(0, 4);
}

function buildTakeoverIdea(novel: DirectorTakeoverNovelContext): string {
  const lines = [
    novel.description?.trim() ? `Story overview: ${novel.description.trim()}` : "",
    novel.title.trim() ? `Project title: "${novel.title.trim()}"` : "",
    novel.targetAudience?.trim() ? `Target readers: ${novel.targetAudience.trim()}` : "",
    novel.bookSellingPoint?.trim() ? `Book-level selling points: ${novel.bookSellingPoint.trim()}` : "",
    novel.competingFeel?.trim() ? `Comparable tone: ${novel.competingFeel.trim()}` : "",
    novel.first30ChapterPromise?.trim() ? `The first 30 chapters promise: ${novel.first30ChapterPromise.trim()}` : "",
    novel.commercialTags.length > 0 ? `Business tags: ${novel.commercialTags.join(", ")}` : "",
  ].filter(Boolean);
  return lines.join("\n") || `Project title: "${novel.title.trim() || "Current project"}"`;
}

function buildTakeoverCandidate(input: {
  novel: DirectorTakeoverNovelContext;
  storyMacroPlan: StoryMacroPlan | null;
  bookContract: BookContract | null;
}): DirectorCandidate {
  const { novel, storyMacroPlan, bookContract } = input;
  const decomposition = storyMacroPlan?.decomposition ?? null;
  const expansion = storyMacroPlan?.expansion ?? null;
  const workingTitle = novel.title.trim() || "Current project";
  const sellingPoint = bookContract?.coreSellingPoint?.trim()
    || novel.bookSellingPoint?.trim()
    || decomposition?.selling_point?.trim()
    || "Keep delivering reader payoff around this project's core selling point.";
  const coreConflict = decomposition?.core_conflict?.trim()
    || novel.description?.trim()
    || bookContract?.readingPromise?.trim()
    || "Keep advancing around this project's main conflict.";
  const protagonistPath = decomposition?.growth_path?.trim()
    || expansion?.protagonist_core?.trim()
    || bookContract?.protagonistFantasy?.trim()
    || "The protagonist keeps growing under mainline pressure and completes a stage change.";
  const hookStrategy = decomposition?.main_hook?.trim()
    || bookContract?.chapter3Payoff?.trim()
    || novel.first30ChapterPromise?.trim()
    || "Build early hooks and stage payoffs around the current selling point.";
  const progressionLoop = decomposition?.progression_loop?.trim()
    || bookContract?.escalationLadder?.trim()
    || "Goal advances -> resistance rises -> stage payoff -> a new problem.";
  const endingDirection = decomposition?.ending_flavor?.trim()
    || bookContract?.relationshipMainline?.trim()
    || "Close along this project's established tone and mainline direction.";

  return {
    id: `takeover-${novel.id}`,
    workingTitle,
    logline: novel.description?.trim() || coreConflict,
    positioning: novel.targetAudience?.trim() || sellingPoint,
    sellingPoint,
    coreConflict,
    protagonistPath,
    endingDirection,
    hookStrategy,
    progressionLoop,
    whyItFits: "Keep this project's saved book information and existing assets, and continue Auto-Director.",
    toneKeywords: splitToneKeywords(novel),
    targetChapterCount: normalizeDirectorTargetChapterCount(novel.estimatedChapterCount),
  };
}

export function buildDirectorTakeoverInput(input: {
  novel: DirectorTakeoverNovelContext;
  storyMacroPlan: StoryMacroPlan | null;
  bookContract: BookContract | null;
  runMode?: DirectorRunMode;
}): DirectorConfirmRequest {
  return {
    title: input.novel.title.trim(),
    description: input.novel.description?.trim() || undefined,
    targetAudience: input.novel.targetAudience?.trim() || undefined,
    bookSellingPoint: input.novel.bookSellingPoint?.trim() || undefined,
    competingFeel: input.novel.competingFeel?.trim() || undefined,
    first30ChapterPromise: input.novel.first30ChapterPromise?.trim() || undefined,
    commercialTags: input.novel.commercialTags.length > 0 ? input.novel.commercialTags : undefined,
    genreId: input.novel.genreId?.trim() || undefined,
    primaryStoryModeId: input.novel.primaryStoryModeId?.trim() || undefined,
    secondaryStoryModeId: input.novel.secondaryStoryModeId?.trim() || undefined,
    worldId: input.novel.worldId?.trim() || undefined,
    writingMode: input.novel.writingMode,
    projectMode: input.novel.projectMode,
    narrativePov: input.novel.narrativePov,
    pacePreference: input.novel.pacePreference,
    styleTone: input.novel.styleTone?.trim() || undefined,
    emotionIntensity: input.novel.emotionIntensity,
    aiFreedom: input.novel.aiFreedom,
    postGenerationStyleReviewEnabled: input.novel.postGenerationStyleReviewEnabled,
    defaultChapterLength: input.novel.defaultChapterLength,
    estimatedChapterCount: input.novel.estimatedChapterCount ?? undefined,
    projectStatus: input.novel.projectStatus,
    storylineStatus: input.novel.storylineStatus,
    outlineStatus: input.novel.outlineStatus,
    resourceReadyScore: input.novel.resourceReadyScore,
    sourceNovelId: input.novel.sourceNovelId ?? undefined,
    sourceKnowledgeDocumentId: input.novel.sourceKnowledgeDocumentId ?? undefined,
    continuationBookAnalysisId: input.novel.continuationBookAnalysisId ?? undefined,
    continuationBookAnalysisSections: input.novel.continuationBookAnalysisSections ?? undefined,
    idea: buildTakeoverIdea(input.novel),
    candidate: buildTakeoverCandidate({
      novel: input.novel,
      storyMacroPlan: input.storyMacroPlan,
      bookContract: input.bookContract,
    }),
    runMode: input.runMode,
  };
}

function isStoryMacroReady(snapshot: DirectorTakeoverAssetSnapshot): boolean {
  return snapshot.hasStoryMacroPlan && snapshot.hasBookContract;
}

function isCharacterReady(snapshot: DirectorTakeoverAssetSnapshot): boolean {
  return snapshot.characterCount > 0;
}

function isOutlineReady(snapshot: DirectorTakeoverAssetSnapshot): boolean {
  return snapshot.volumeCount > 0 && Boolean(snapshot.hasVolumeStrategyPlan);
}

export function isTakeoverStructuredOutlineReadyForValidation(snapshot: Pick<DirectorTakeoverAssetSnapshot, "structuredOutlineRecoveryStep">): boolean {
  return snapshot.structuredOutlineRecoveryStep === "chapter_sync"
    || snapshot.structuredOutlineRecoveryStep === "completed";
}

function isStructuredReady(snapshot: DirectorTakeoverAssetSnapshot): boolean {
  return isTakeoverStructuredOutlineReadyForValidation(snapshot);
}

function isStructuredSyncPending(snapshot: DirectorTakeoverAssetSnapshot): boolean {
  return snapshot.structuredOutlineRecoveryStep === "chapter_sync";
}

function hasAnyStructuredAsset(snapshot: DirectorTakeoverAssetSnapshot): boolean {
  return Boolean(snapshot.firstVolumeBeatSheetReady)
    || snapshot.firstVolumeChapterCount > 0
    || (snapshot.firstVolumePreparedChapterCount ?? 0) > 0;
}

function hasExecutableRange(input: {
  snapshot: DirectorTakeoverAssetSnapshot;
  executableRange?: DirectorTakeoverExecutableRangeSnapshot | null;
  latestCheckpoint?: DirectorTakeoverCheckpointSnapshot | null;
  activePipelineJob?: DirectorTakeoverPipelineJobSnapshot | null;
}): boolean {
  return Boolean(
    input.executableRange
    || input.activePipelineJob,
  );
}

function isRepairingPipelineJob(job: DirectorTakeoverPipelineJobSnapshot | null | undefined): boolean {
  if (!job?.currentStage) {
    return false;
  }
  return job.currentStage === "reviewing" || job.currentStage === "repairing";
}

function hasPendingRepairContext(input: {
  snapshot: DirectorTakeoverAssetSnapshot;
  activePipelineJob?: DirectorTakeoverPipelineJobSnapshot | null;
  latestCheckpoint?: DirectorTakeoverCheckpointSnapshot | null;
}): boolean {
  return Boolean(
    isRepairingPipelineJob(input.activePipelineJob)
    || input.latestCheckpoint?.checkpointType === "chapter_batch_ready"
    || input.latestCheckpoint?.checkpointType === "replan_required"
    || (input.snapshot.pendingRepairChapterCount ?? 0) > 0,
  );
}

const TAKEOVER_PHASE_TO_ENTRY_STEP: Record<DirectorTakeoverStartPhase, DirectorTakeoverEntryStep> = {
  story_macro: "story_macro",
  world_setup: "world",
  character_setup: "character",
  volume_strategy: "outline",
  structured_outline: "structured",
};

const TAKEOVER_ENTRY_STEP_TO_LEGACY_START_PHASE: Record<DirectorTakeoverEntryStep, DirectorTakeoverStartPhase> = {
  basic: "story_macro",
  story_macro: "story_macro",
  world: "world_setup",
  character: "character_setup",
  outline: "volume_strategy",
  structured: "structured_outline",
  chapter: "structured_outline",
  pipeline: "structured_outline",
};

const TAKEOVER_ENTRY_STEP_TO_WORKFLOW_STAGE: Record<DirectorTakeoverEntryStep, NovelWorkflowStage> = {
  basic: "story_macro",
  story_macro: "story_macro",
  world: "world_setup",
  character: "character_setup",
  outline: "volume_strategy",
  structured: "structured_outline",
  chapter: "chapter_execution",
  pipeline: "quality_repair",
};

export function phaseToEntryStep(phase: DirectorTakeoverStartPhase): DirectorTakeoverEntryStep {
  return TAKEOVER_PHASE_TO_ENTRY_STEP[phase];
}

export function entryStepToLegacyStartPhase(step: DirectorTakeoverEntryStep): DirectorTakeoverStartPhase {
  return TAKEOVER_ENTRY_STEP_TO_LEGACY_START_PHASE[step];
}

export function entryStepToWorkflowStage(step: DirectorTakeoverEntryStep): NovelWorkflowStage {
  return TAKEOVER_ENTRY_STEP_TO_WORKFLOW_STAGE[step];
}

export function buildSkipSteps(from: DirectorTakeoverEntryStep, to: DirectorTakeoverEntryStep): DirectorTakeoverEntryStep[] {
  const fromIndex = DIRECTOR_TAKEOVER_ENTRY_STEPS.indexOf(from);
  const toIndex = DIRECTOR_TAKEOVER_ENTRY_STEPS.indexOf(to);
  if (fromIndex < 0 || toIndex < 0 || toIndex <= fromIndex) {
    return [];
  }
  return DIRECTOR_TAKEOVER_ENTRY_STEPS.slice(fromIndex, toIndex);
}

function resolveExecutionContinuationStep(input: {
  snapshot: DirectorTakeoverAssetSnapshot;
  activePipelineJob?: DirectorTakeoverPipelineJobSnapshot | null;
  latestCheckpoint?: DirectorTakeoverCheckpointSnapshot | null;
  executableRange?: DirectorTakeoverExecutableRangeSnapshot | null;
  preferPipeline: boolean;
}): DirectorTakeoverEntryStep | null {
  const executable = hasExecutableRange(input);
  if (!executable) {
    return null;
  }
  const pendingRepair = hasPendingRepairContext(input);
  if (pendingRepair) {
    return "pipeline";
  }
  // If the target range still has unprepared chapters and no batch is in progress, return to beats / chapters to fill detail
  // instead of entering chapter execution — otherwise "missing complete chapter detail" throws and the gap cannot auto-fill.
  if (input.snapshot.hasUnpreparedChaptersInRange && !input.activePipelineJob) {
    return null;
  }
  if (input.preferPipeline) {
    return "chapter";
  }
  return "chapter";
}

function resolveContinueTargetStep(input: {
  entryStep: DirectorTakeoverEntryStep;
  selectedEntryStep?: DirectorTakeoverEntryStep;
  snapshot: DirectorTakeoverAssetSnapshot;
  activePipelineJob?: DirectorTakeoverPipelineJobSnapshot | null;
  latestCheckpoint?: DirectorTakeoverCheckpointSnapshot | null;
  executableRange?: DirectorTakeoverExecutableRangeSnapshot | null;
}): DirectorTakeoverEntryStep {
  const storyReady = isStoryMacroReady(input.snapshot);
  const worldReady = input.snapshot.hasWorldSetupPrepared;
  const characterReady = isCharacterReady(input.snapshot);
  const outlineReady = isOutlineReady(input.snapshot);
  const structuredExecutionReady = hasExecutableRange(input);

  if (input.entryStep === "basic") {
    if (!storyReady) return "story_macro";
    if (!worldReady) return "world";
    if (!characterReady) return "character";
    if (!outlineReady) return "outline";
    if (!structuredExecutionReady) return "structured";
    return resolveExecutionContinuationStep({
      ...input,
      preferPipeline: false,
    }) ?? "structured";
  }
  if (input.entryStep === "story_macro") {
    if (!storyReady) return "story_macro";
    return resolveContinueTargetStep({ ...input, selectedEntryStep: input.selectedEntryStep ?? input.entryStep, entryStep: "world" });
  }
  if (input.entryStep === "world") {
    if (!storyReady) return "story_macro";
    if (!worldReady) return "world";
    return resolveContinueTargetStep({ ...input, selectedEntryStep: input.selectedEntryStep ?? input.entryStep, entryStep: "character" });
  }
  if (input.entryStep === "character") {
    if (!worldReady) return "world";
    if (!characterReady) return "character";
    return resolveContinueTargetStep({ ...input, selectedEntryStep: input.selectedEntryStep ?? input.entryStep, entryStep: "outline" });
  }
  if (input.entryStep === "outline") {
    if (!outlineReady) return "outline";
    return resolveContinueTargetStep({ ...input, selectedEntryStep: input.selectedEntryStep ?? input.entryStep, entryStep: "structured" });
  }
  if (input.entryStep === "structured") {
    if ((input.selectedEntryStep ?? input.entryStep) === "structured") return "structured";
    if (!structuredExecutionReady) return "structured";
    return resolveExecutionContinuationStep({
      ...input,
      preferPipeline: false,
    }) ?? "structured";
  }
  if (input.entryStep === "chapter") {
    return resolveExecutionContinuationStep({
      ...input,
      preferPipeline: false,
    }) ?? "structured";
  }
  return resolveExecutionContinuationStep({
    ...input,
    preferPipeline: true,
  }) ?? "structured";
}

function buildPhasePlan(input: {
  entryStep: DirectorTakeoverEntryStep;
  strategy: DirectorTakeoverStrategy;
  effectiveStep: Extract<DirectorTakeoverEntryStep, "story_macro" | "world" | "character" | "outline" | "structured">;
  summary: string;
  effectSummary: string;
  impactNotes: string[];
}): DirectorTakeoverResolvedPlan {
  const startPhase = entryStepToLegacyStartPhase(input.effectiveStep);
  return {
    entryStep: input.entryStep,
    strategy: input.strategy,
    effectiveStep: input.effectiveStep,
    effectiveStage: entryStepToWorkflowStage(input.effectiveStep),
    startPhase,
    phase: startPhase,
    resumeStage: input.effectiveStep,
    skipSteps: buildSkipSteps(input.entryStep, input.effectiveStep),
    summary: input.summary,
    effectSummary: input.effectSummary,
    impactNotes: input.impactNotes,
    usesCurrentBatch: false,
    currentStep: input.strategy === "continue_existing" ? input.effectiveStep : null,
    restartStep: input.strategy === "restart_current_step" ? input.effectiveStep : null,
    executionMode: "phase",
    resumeCheckpointType: null,
  };
}

function buildAutoExecutionPlan(input: {
  entryStep: DirectorTakeoverEntryStep;
  strategy: DirectorTakeoverStrategy;
  effectiveStep: "chapter" | "pipeline";
  usesCurrentBatch: boolean;
  summary: string;
  effectSummary: string;
  impactNotes: string[];
  latestCheckpoint?: DirectorTakeoverCheckpointSnapshot | null;
}): DirectorTakeoverResolvedPlan {
  const effectiveStage = input.effectiveStep === "pipeline" ? "quality_repair" : "chapter_execution";
  return {
    entryStep: input.entryStep,
    strategy: input.strategy,
    effectiveStep: input.effectiveStep,
    effectiveStage,
    startPhase: "structured_outline",
    resumeStage: input.effectiveStep,
    skipSteps: buildSkipSteps(input.entryStep, input.effectiveStep),
    summary: input.summary,
    effectSummary: input.effectSummary,
    impactNotes: input.impactNotes,
    usesCurrentBatch: input.usesCurrentBatch,
    currentStep: input.strategy === "continue_existing" ? input.effectiveStep : null,
    restartStep: input.strategy === "restart_current_step" ? input.entryStep : null,
    executionMode: "auto_execution",
    resumeCheckpointType: input.latestCheckpoint?.checkpointType ?? null,
  };
}

export function resolveDirectorTakeoverPlan(input: DirectorTakeoverDecisionInput): DirectorTakeoverResolvedPlan {
  const storyReady = isStoryMacroReady(input.snapshot);
  const worldReady = input.snapshot.hasWorldSetupPrepared;
  const characterReady = isCharacterReady(input.snapshot);
  const outlineReady = isOutlineReady(input.snapshot);
  const executable = hasExecutableRange(input);
  const pendingRepair = hasPendingRepairContext(input);

  if (input.strategy === "continue_existing") {
    const effectiveStep = resolveContinueTargetStep(input);
    if (effectiveStep === "story_macro") {
      return buildPhasePlan({
        entryStep: input.entryStep,
        strategy: input.strategy,
        effectiveStep,
        summary: "Continue existing progress by filling in story planning first.",
        effectSummary: "It will reuse current project basics and only fill in missing Story Macro and Book Contract.",
        impactNotes: ["Existing chapters and chapter text will not be cleared."],
      });
    }
    if (effectiveStep === "character") {
      return buildPhasePlan({
        entryStep: input.entryStep,
        strategy: input.strategy,
        effectiveStep,
        summary: "Continue existing progress by filling in character setup next.",
        effectSummary: "It will reuse finished book planning and only fill in the cast and character application.",
        impactNotes: ["Existing Story Macro / Book Contract will not be rerun."],
      });
    }
    if (effectiveStep === "world") {
      return buildPhasePlan({
        entryStep: input.entryStep,
        strategy: input.strategy,
        effectiveStep,
        summary: "Continue existing progress by preparing the world next.",
        effectSummary: "It will reuse Story Macro and Book Contract, then generate or bind this book's world assets.",
        impactNotes: ["Existing book-level plans and chapter text will not be cleared."],
      });
    }
    if (effectiveStep === "outline") {
      return buildPhasePlan({
        entryStep: input.entryStep,
        strategy: input.strategy,
        effectiveStep,
        summary: "Continue existing progress by filling in volume strategy next.",
        effectSummary: "It will reuse existing book-level planning and character assets, and only fill in volume strategy and the volume skeleton.",
        impactNotes: ["Existing characters and chapter text will not be cleared."],
      });
    }
    if (effectiveStep === "structured") {
      return buildPhasePlan({
        entryStep: input.entryStep,
        strategy: input.strategy,
        effectiveStep,
        summary: "Continue existing progress by filling in beats / chapters next.",
        effectSummary: "It will reuse the finished volume strategy and only fill in this volume's beat sheet, chapter list, chapter details, or sync steps.",
        impactNotes: ["Existing chapter text is kept. Chapters will not be bulk-deleted."],
      });
    }
    if (!executable) {
      throw new Error("There is no chapter-execution range to continue. Fill in beats / chapter-split resources first.");
    }
    if (effectiveStep === "pipeline") {
      return buildAutoExecutionPlan({
        entryStep: input.entryStep,
        strategy: input.strategy,
        effectiveStep,
        usesCurrentBatch: true,
        latestCheckpoint: input.latestCheckpoint,
        summary: "Continue existing progress, resuming the current quality-repair batch first.",
        effectSummary: "It will resume the current repair batch or pending chapters first, and will not start a duplicate task.",
        impactNotes: ["Existing chapter text and planning assets are kept.", "Only chapters that already passed review will be skipped."],
      });
    }
    return buildAutoExecutionPlan({
      entryStep: input.entryStep,
      strategy: input.strategy,
      effectiveStep: "chapter",
      usesCurrentBatch: executable,
      latestCheckpoint: input.latestCheckpoint,
      summary: "Continue existing progress, resuming the current chapter batch first.",
      effectSummary: "It will resume the active batch, checkpoint, or prepared chapter range first.",
      impactNotes: ["Existing chapter text will not be cleared.", "Only approved / published chapters will be skipped."],
    });
  }

  if (input.entryStep === "basic" || input.entryStep === "story_macro") {
    return buildPhasePlan({
      entryStep: input.entryStep,
      strategy: input.strategy,
      effectiveStep: "story_macro",
      summary: "Regenerate this step, rerunning from story planning.",
      effectSummary: "It will clear Story Macro and Book Contract first, then rerun from story planning.",
      impactNotes: ["Current book-level planning assets will be refreshed.", "Written chapter text will not be deleted."],
    });
  }
  if (input.entryStep === "world") {
    if (!storyReady) {
      throw new Error("Story Macro or Book Contract is missing, so world setup cannot be rerun directly.");
    }
    return buildPhasePlan({
      entryStep: input.entryStep,
      strategy: input.strategy,
      effectiveStep: "world",
      summary: "Regenerate this step, rerunning from world setup.",
      effectSummary: "It will regenerate or replace this book's world assets, then let later character setup use the new world constraints.",
      impactNotes: ["Story Macro and Book Contract are kept.", "Existing chapter text will not be deleted."],
    });
  }
  if (input.entryStep === "character") {
    if (!storyReady || !worldReady) {
      throw new Error("Story planning or world assets are missing, so character setup cannot be rerun directly.");
    }
    return buildPhasePlan({
      entryStep: input.entryStep,
      strategy: input.strategy,
      effectiveStep: "character",
      summary: "Regenerate this step, rerunning from character setup.",
      effectSummary: "It will clear the current cast, relationships, and character-setup candidates first, then rerun character setup.",
      impactNotes: ["Earlier book-level planning is kept.", "Existing chapter text will not be cleared."],
    });
  }
  if (input.entryStep === "outline") {
    if (!storyReady || !worldReady || !characterReady) {
      throw new Error("Required earlier assets are missing, so volume strategy cannot be rerun directly.");
    }
    return buildPhasePlan({
      entryStep: input.entryStep,
      strategy: input.strategy,
      effectiveStep: "outline",
      summary: "Regenerate this step, rerunning from volume strategy.",
      effectSummary: "It will clear the current volume strategy and skeleton first, then rerun from volume strategy.",
      impactNotes: ["Earlier book-level planning and characters are kept.", "Existing chapter text will not be cleared."],
    });
  }
  if (input.entryStep === "structured") {
    if (!storyReady || !worldReady || !characterReady || !outlineReady) {
      throw new Error("Required earlier assets are missing, so beats / chapters cannot be rerun directly.");
    }
    return buildPhasePlan({
      entryStep: input.entryStep,
      strategy: input.strategy,
      effectiveStep: "structured",
      summary: "Regenerate this step, rerunning from beats / chapters.",
      effectSummary: "It will clear this volume's beat sheet, chapter list, and chapter-detail resources first, then rerun this stage.",
      impactNotes: ["Unwritten chapter-split artifacts for this volume will be cleared.", "Written chapter text will not be deleted."],
    });
  }
  if (!executable) {
    throw new Error("There is no executable chapter range yet, so a new chapter batch cannot start.");
  }
  if (input.entryStep === "pipeline" && !pendingRepair && !executable) {
    throw new Error("There is no quality-repair context to continue.");
  }
  return buildAutoExecutionPlan({
    entryStep: input.entryStep,
    strategy: input.strategy,
    effectiveStep: input.entryStep === "pipeline" ? "pipeline" : "chapter",
    usesCurrentBatch: false,
    latestCheckpoint: input.latestCheckpoint,
    summary: input.entryStep === "pipeline" ? "Regenerate this step after clearing the current quality-repair result." : "Regenerate this step after clearing the current chapter batch.",
    effectSummary: input.entryStep === "pipeline"
      ? "It will clear the current quality-repair result and pass state first, then re-review and repair the existing chapter text."
      : "It will clear drafts, review state, and derived summaries in the current chapter range, then regenerate this batch.",
    impactNotes: input.entryStep === "pipeline"
      ? ["Current chapter text is kept.", "It will re-enter automatic review and repair."]
      : ["Current batch chapter drafts will be cleared.", "Earlier planning and chapter structure are kept."],
  });
}

function buildStoryMacroReadiness(
  novel: DirectorTakeoverNovelContext,
): Pick<DirectorTakeoverStageReadiness, "available" | "reason"> {
  if (hasMeaningfulSeedMaterial(novel)) {
    return {
      available: true,
      reason: "Current book-level information is ready. Takeover can start from story planning.",
    };
  }
  return {
    available: false,
    reason: "Add at least one story summary, book-level hook, comparable tone, or first-30-chapter promise before starting auto-takeover.",
  };
}

function buildCharacterSetupReadiness(
  snapshot: DirectorTakeoverAssetSnapshot,
): Pick<DirectorTakeoverStageReadiness, "available" | "reason"> {
  if (!isStoryMacroReady(snapshot)) {
    return {
      available: false,
      reason: "Before skipping story planning, Story Macro and Book Contract must already exist.",
    };
  }
  if (!snapshot.hasWorldSetupPrepared) {
    return {
      available: false,
      reason: "World setup must be finished before takeover can start from character setup.",
    };
  }
  return {
    available: true,
    reason: "Book planning and world assets are ready. Takeover can continue from character setup.",
  };
}

function buildWorldSetupReadiness(
  snapshot: DirectorTakeoverAssetSnapshot,
): Pick<DirectorTakeoverStageReadiness, "available" | "reason"> {
  if (!isStoryMacroReady(snapshot)) {
    return {
      available: false,
      reason: "Before skipping story planning, Story Macro and Book Contract must already exist.",
    };
  }
  return {
    available: true,
    reason: snapshot.hasWorldSetupPrepared
      ? "This book already has a bound world. You can inspect, improve, or regenerate it."
      : "Book planning is ready. You can prepare this book's world next.",
  };
}

function buildVolumeStrategyReadiness(
  snapshot: DirectorTakeoverAssetSnapshot,
): Pick<DirectorTakeoverStageReadiness, "available" | "reason"> {
  if (!isStoryMacroReady(snapshot)) {
    return {
      available: false,
      reason: "Before skipping earlier stages, Story Macro and Book Contract must already exist.",
    };
  }
  if (!snapshot.hasWorldSetupPrepared) {
    return {
      available: false,
      reason: "World setup must be finished before volume strategy can start.",
    };
  }
  if (!isCharacterReady(snapshot)) {
    return {
      available: false,
      reason: "Before starting volume strategy, at least 1 confirmed character is required.",
    };
  }
  return {
    available: true,
    reason: "Book planning and character assets are ready. Continue from volume strategy.",
  };
}

function buildStructuredOutlineReadiness(
  snapshot: DirectorTakeoverAssetSnapshot,
): Pick<DirectorTakeoverStageReadiness, "available" | "reason"> {
  if (!isStoryMacroReady(snapshot)) {
    return {
      available: false,
      reason: "Before skipping earlier stages, Story Macro and Book Contract must already exist.",
    };
  }
  if (!snapshot.hasWorldSetupPrepared) {
    return {
      available: false,
      reason: "World setup must be finished before beats / chapters can start.",
    };
  }
  if (!isCharacterReady(snapshot)) {
    return {
      available: false,
      reason: "Before starting beats / chapters, at least 1 confirmed character is required.",
    };
  }
  if (!isOutlineReady(snapshot)) {
    return {
      available: false,
      reason: "Volume strategy / skeleton must exist before beats / chapters can start.",
    };
  }
  return {
    available: true,
    reason: "Volume assets already exist. You can continue from beats / chapters.",
  };
}

function resolveRecommendedTakeoverPhase(snapshot: DirectorTakeoverAssetSnapshot): DirectorTakeoverStartPhase {
  if (!isStoryMacroReady(snapshot)) {
    return "story_macro";
  }
  if (!snapshot.hasWorldSetupPrepared) {
    return "world_setup";
  }
  if (!isCharacterReady(snapshot)) {
    return "character_setup";
  }
  if (!isOutlineReady(snapshot)) {
    return "volume_strategy";
  }
  return "structured_outline";
}

function buildPreviewOrFallback(input: {
  entryStep: DirectorTakeoverEntryStep;
  strategy: DirectorTakeoverStrategy;
  snapshot: DirectorTakeoverAssetSnapshot;
  activePipelineJob?: DirectorTakeoverPipelineJobSnapshot | null;
  latestCheckpoint?: DirectorTakeoverCheckpointSnapshot | null;
  executableRange?: DirectorTakeoverExecutableRangeSnapshot | null;
}): DirectorTakeoverPreview {
  try {
    const plan = resolveDirectorTakeoverPlan(input);
    return {
      strategy: input.strategy,
      summary: plan.summary,
      effectSummary: plan.effectSummary,
      effectiveStep: plan.effectiveStep,
      effectiveStage: plan.effectiveStage,
      skipSteps: plan.skipSteps,
      continueStep: plan.currentStep ?? null,
      restartStep: plan.restartStep ?? null,
      usesCurrentBatch: plan.usesCurrentBatch,
      impactNotes: plan.impactNotes,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Takeover cannot start from this step under the current conditions.";
    return {
      strategy: input.strategy,
      summary: input.strategy === "continue_existing" ? "Existing progress cannot be continued yet." : "This step cannot be rerun yet.",
      effectSummary: message,
      effectiveStep: input.entryStep,
      effectiveStage: entryStepToWorkflowStage(input.entryStep),
      skipSteps: [],
      continueStep: input.strategy === "continue_existing" ? input.entryStep : null,
      restartStep: input.strategy === "restart_current_step" ? input.entryStep : null,
      usesCurrentBatch: false,
      impactNotes: [message],
    };
  }
}

function buildEntryStepStatus(input: {
  step: DirectorTakeoverEntryStep;
  novel: DirectorTakeoverNovelContext;
  snapshot: DirectorTakeoverAssetSnapshot;
  activePipelineJob?: DirectorTakeoverPipelineJobSnapshot | null;
  latestCheckpoint?: DirectorTakeoverCheckpointSnapshot | null;
  executableRange?: DirectorTakeoverExecutableRangeSnapshot | null;
}): DirectorTakeoverEntryReadiness["status"] {
  const { snapshot } = input;
  if (input.step === "basic") {
    return hasMeaningfulSeedMaterial(input.novel) ? "ready" : "missing";
  }
  if (input.step === "story_macro") {
    if (snapshot.hasStoryMacroPlan && snapshot.hasBookContract) return "complete";
    if (snapshot.hasStoryMacroPlan || snapshot.hasBookContract) return "partial";
    return "missing";
  }
  if (input.step === "world") {
    if (!isStoryMacroReady(snapshot)) return "blocked";
    return snapshot.hasWorldSetupPrepared ? "complete" : "missing";
  }
  if (input.step === "character") {
    if (!isStoryMacroReady(snapshot) || !snapshot.hasWorldSetupPrepared) return "blocked";
    return isCharacterReady(snapshot) ? "complete" : "missing";
  }
  if (input.step === "outline") {
    if (!isStoryMacroReady(snapshot) || !snapshot.hasWorldSetupPrepared || !isCharacterReady(snapshot)) return "blocked";
    return isOutlineReady(snapshot) ? "complete" : "missing";
  }
  if (input.step === "structured") {
    if (!isStoryMacroReady(snapshot) || !snapshot.hasWorldSetupPrepared || !isCharacterReady(snapshot) || !isOutlineReady(snapshot)) return "blocked";
    if (snapshot.hasUnpreparedChaptersInRange) return "partial";
    if (hasExecutableRange(input)) return "complete";
    if (isStructuredSyncPending(snapshot)) return "partial";
    if (isStructuredReady(snapshot)) return "partial";
    if (hasAnyStructuredAsset(snapshot)) return "partial";
    return "missing";
  }
  if (input.step === "chapter") {
    if (!hasExecutableRange(input)) return "blocked";
    if (input.activePipelineJob) return "partial";
    if (hasExecutableRange(input)) return "ready";
    return "missing";
  }
  if (
    !hasExecutableRange(input)
    && !hasPendingRepairContext(input)
    && (snapshot.approvedChapterCount ?? 0) <= 0
  ) {
    return "blocked";
  }
  if (input.activePipelineJob || hasPendingRepairContext(input)) return "ready";
  if ((snapshot.approvedChapterCount ?? 0) > 0) return "complete";
  return "missing";
}

function buildEntryReason(input: {
  step: DirectorTakeoverEntryStep;
  status: DirectorTakeoverEntryReadiness["status"];
  snapshot: DirectorTakeoverAssetSnapshot;
  latestCheckpoint?: DirectorTakeoverCheckpointSnapshot | null;
  activePipelineJob?: DirectorTakeoverPipelineJobSnapshot | null;
  executableRange?: DirectorTakeoverExecutableRangeSnapshot | null;
}): string {
  if (input.step === "basic") {
    return "It will check existing project assets first and continue from the earliest missing step.";
  }
  if (input.step === "story_macro") {
    return input.status === "complete"
      ? "Story Macro and Book Contract are ready. Continue mode will move to the next missing step."
      : "Takeover can start from story planning now.";
  }
  if (input.step === "world") {
    return input.status === "blocked"
      ? "Story Macro and Book Contract must exist before takeover can start from world setup."
      : input.status === "complete"
        ? "World assets are ready. Continue mode will move to the next missing step."
        : "Takeover can continue from world setup now.";
  }
  if (input.step === "character") {
    return input.status === "blocked"
      ? "Story planning and world assets must exist before takeover can start from character setup."
      : input.status === "complete"
        ? "Character assets are ready. Continue mode will move to the next missing step."
        : "Takeover can continue from character setup now.";
  }
  if (input.step === "outline") {
    return input.status === "blocked"
      ? "Story planning and character assets must exist before takeover can start from volume strategy."
      : input.status === "complete"
        ? "Volume-strategy assets are ready. Continue mode will move to the next missing step."
        : "Takeover can continue from volume strategy now.";
  }
  if (input.step === "structured") {
    return input.status === "blocked"
      ? "Volume strategy must exist before takeover can start from beats / chapters."
      : input.snapshot.hasUnpreparedChaptersInRange
        ? "Some chapters in the target range still lack full details. Continue mode will go back to beats / chapters to fill them in, then resume. Existing draft text is kept."
        : hasExecutableRange(input)
          ? "This volume's beat sheet, chapter details, and execution resources are ready. Continue mode will move into chapter execution."
          : input.snapshot.structuredOutlineRecoveryStep === "chapter_sync"
          ? "This volume's beat sheet and chapter details are ready, but they are not synced to the execution area yet. Continue mode will sync first."
          : input.snapshot.structuredOutlineRecoveryStep === "chapter_detail_bundle"
            ? "This volume already has some chapter-detail resources. Continue mode will resume unfinished chapter details."
            : input.snapshot.firstVolumeBeatSheetReady
              ? "This volume already has a beat sheet or chapter-list base. Continue mode will finish the remaining split steps."
              : "Takeover can continue from beats / chapters now.";
  }
  if (input.step === "chapter") {
    if (!hasExecutableRange(input)) {
      return "Beat / chapter-split sync must finish and write chapter resources into the execution area before takeover can start from chapter execution.";
    }
    if (input.activePipelineJob) {
      return "An active chapter batch was found. Continue mode will resume that batch first.";
    }
    if (input.latestCheckpoint?.checkpointType === "chapter_batch_ready" || input.executableRange) {
      return "An executable chapter range was found. Continue mode will resume or continue that range.";
    }
    return "Takeover can start from chapter execution now.";
  }
  if (input.activePipelineJob) {
    return "An active quality-repair batch was found. Continue mode will resume that batch first.";
  }
  if (input.latestCheckpoint?.checkpointType === "chapter_batch_ready" || input.latestCheckpoint?.checkpointType === "replan_required") {
    return input.latestCheckpoint.checkpointType === "replan_required"
      ? "A recent replan checkpoint was found. Continue mode will resume pending replans and later batches first."
      : "A recent chapter-batch checkpoint was found. Continue mode will resume chapters waiting for repair first.";
  }
  return "Takeover can start from quality repair now.";
}

export function buildDirectorTakeoverReadiness(input: {
  novel: DirectorTakeoverNovelContext;
  snapshot: DirectorTakeoverAssetSnapshot;
  hasActiveTask: boolean;
  activeTaskId?: string | null;
  activePipelineJob?: DirectorTakeoverPipelineJobSnapshot | null;
  latestCheckpoint?: DirectorTakeoverCheckpointSnapshot | null;
  executableRange?: DirectorTakeoverExecutableRangeSnapshot | null;
}): DirectorTakeoverReadinessResponse {
  const recommendedPhase = resolveRecommendedTakeoverPhase(input.snapshot);
  const recommendedStep = phaseToEntryStep(recommendedPhase);
  const storyMacroReadiness = buildStoryMacroReadiness(input.novel);
  const worldSetupReadiness = buildWorldSetupReadiness(input.snapshot);
  const characterSetupReadiness = buildCharacterSetupReadiness(input.snapshot);
  const volumeStrategyReadiness = buildVolumeStrategyReadiness(input.snapshot);
  const structuredOutlineReadiness = buildStructuredOutlineReadiness(input.snapshot);

  const entrySteps: DirectorTakeoverEntryReadiness[] = DIRECTOR_TAKEOVER_ENTRY_STEPS.map((step) => {
    const status = buildEntryStepStatus({
      step,
      novel: input.novel,
      snapshot: input.snapshot,
      activePipelineJob: input.activePipelineJob,
      latestCheckpoint: input.latestCheckpoint,
      executableRange: input.executableRange,
    });
    const available = status !== "blocked";
    return {
      step,
      label: TAKEOVER_ENTRY_META[step].label,
      description: TAKEOVER_ENTRY_META[step].description,
      available,
      recommended: step === recommendedStep
        || (
          step === "chapter"
          && recommendedStep === "structured"
          && Boolean(input.executableRange)
          && !input.snapshot.hasUnpreparedChaptersInRange
        ),
      status,
      reason: buildEntryReason({
        step,
        status,
        snapshot: input.snapshot,
        activePipelineJob: input.activePipelineJob,
        latestCheckpoint: input.latestCheckpoint,
        executableRange: input.executableRange,
      }),
      previews: [
        buildPreviewOrFallback({
          entryStep: step,
          strategy: "continue_existing",
          snapshot: input.snapshot,
          activePipelineJob: input.activePipelineJob,
          latestCheckpoint: input.latestCheckpoint,
          executableRange: input.executableRange,
        }),
        buildPreviewOrFallback({
          entryStep: step,
          strategy: "restart_current_step",
          snapshot: input.snapshot,
          activePipelineJob: input.activePipelineJob,
          latestCheckpoint: input.latestCheckpoint,
          executableRange: input.executableRange,
        }),
      ],
    };
  });

  return {
    novelId: input.novel.id,
    novelTitle: input.novel.title.trim() || "Current project",
    hasActiveTask: input.hasActiveTask,
    activeTaskId: input.activeTaskId ?? null,
    snapshot: {
      ...input.snapshot,
    },
    stages: ([
      ["story_macro", storyMacroReadiness],
      ["world_setup", worldSetupReadiness],
      ["character_setup", characterSetupReadiness],
      ["volume_strategy", volumeStrategyReadiness],
      ["structured_outline", structuredOutlineReadiness],
    ] as const).map(([phase, readiness]) => ({
      phase,
      label: DIRECTOR_TAKEOVER_STAGE_META[phase].label,
      description: DIRECTOR_TAKEOVER_STAGE_META[phase].description,
      available: readiness.available,
      recommended: readiness.available && phase === recommendedPhase,
      reason: readiness.reason,
    })),
    entrySteps,
    activePipelineJob: input.activePipelineJob ?? null,
    latestCheckpoint: input.latestCheckpoint ?? null,
    executableRange: input.executableRange ?? null,
  };
}

export function assertDirectorTakeoverPhaseAvailable(
  readiness: DirectorTakeoverReadinessResponse,
  phase: DirectorTakeoverStartPhase,
): void {
  const targetStage = readiness.stages.find((item) => item.phase === phase);
  if (!targetStage) {
    throw new Error("The current Auto-Director takeover stage does not exist.");
  }
  if (!targetStage.available) {
    throw new Error(targetStage.reason || "This project is not ready to continue Auto-Director from that stage.");
  }
}

export function buildTakeoverBookSpec(input: {
  novel: DirectorTakeoverNovelContext;
  storyMacroPlan: StoryMacroPlan | null;
  bookContract: BookContract | null;
}): BookSpec {
  const candidate = buildTakeoverCandidate(input);
  const idea = buildTakeoverIdea(input.novel);
  return {
    storyInput: idea,
    positioning: candidate.positioning,
    sellingPoint: candidate.sellingPoint,
    coreConflict: candidate.coreConflict,
    protagonistPath: candidate.protagonistPath,
    endingDirection: candidate.endingDirection,
    hookStrategy: candidate.hookStrategy,
    progressionLoop: candidate.progressionLoop,
    targetChapterCount: candidate.targetChapterCount,
  };
}

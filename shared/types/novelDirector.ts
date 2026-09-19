import type {
  AIFreedom,
  EmotionIntensity,
  NarrativePov,
  Novel,
  PacePreference,
  PipelineJobStatus,
  ProjectMode,
  ProjectProgressStatus,
  StoryPlanLevel,
} from "./novel";
import type { LLMProvider } from "./llm";
import type { ArtifactSyncMode } from "./novel";
import type { BookAnalysisSectionKey } from "./bookAnalysis";
import type { NovelWorkflowResumeTarget, NovelWorkflowStage } from "./novelWorkflow";
import type { WritingPlatformPreference } from "./writingPlatform";
import type { NovelCreateResourceRecommendation } from "./novelResourceRecommendation";
import type { StoryMacroPlan } from "./storyMacro";
import type { BookContract, BookContractDraft } from "./novelWorkflow";
import type { TitleFactorySuggestion } from "./title";
import type { DirectorCompletionProfile } from "./directorCompletion";
import type { StyleIntentSummary } from "./styleEngine";
import type { DirectorAutoApprovalConfig } from "./autoDirectorApproval";
import type { DirectorIssuePolicy } from "./directorIssue";
import type { DirectorRiskAssessment } from "./directorRisk";

export const DIRECTOR_CORRECTION_PRESETS = [
  {
    value: "more_hooky",
    label: "More catchy",
    description: "Improve the opening hook and staged feedback to make the story more compelling.",
    promptHint: "Strengthen the grip of the opening chapter, the exciting rewards and the hook for catching up.",
  },
  {
    value: "stronger_conflict",
    label: "Conflict is stronger",
    description: "Let the protagonist's goal and resistance collide more directly, reducing lukewarm advancement.",
    promptHint: "Increase the intensity of the main line of conflicts to make advancement tighter and more direct.",
  },
  {
    value: "sharper_protagonist",
    label: "The protagonist is more distinct",
    description: "Highlight the protagonist's identity, desires, and personality labels to make the characters easier to remember.",
    promptHint: "Enhance the protagonist's identification, desire drive and character labeling.",
  },
  {
    value: "more_grounded",
    label: "More realistic",
    description: "Enhance behavioral rationality and quality of life, and reduce the sense of suspended settings.",
    promptHint: "Enhance the realistic texture, life details and behavioral logic.",
  },
  {
    value: "lighter_ending",
    label: "Don’t make the ending too heavy",
    description: "Keep the intensity, but avoid excessive depression or purely pessimistic endings.",
    promptHint: "Keep the ending hopeful without being overly heavy.",
  },
] as const;

export type DirectorCorrectionPreset = typeof DIRECTOR_CORRECTION_PRESETS[number]["value"];

export const DIRECTOR_CANDIDATE_SETUP_STEPS = [
  {
    key: "candidate_seed_alignment",
    label: "Organize project settings",
    description: "First, compress the inspiration, subject matter, target readers and chapter size into stable input.",
  },
  {
    key: "candidate_project_framing",
    label: "Align book-level framing",
    description: "Turn book-level selling points, first 30 chapter commitments, and temperament constraints into candidate generation references.",
  },
  {
    key: "candidate_direction_batch",
    label: "Generate book-level plans",
    description: "Output current candidate directions that can continue to advance the entire plan.",
  },
  {
    key: "candidate_title_pack",
    label: "Enhance title group",
    description: "For each set of candidates, make up a set of book titles that are more suitable for cover display and click testing.",
  },
] as const;

export type DirectorCandidateSetupStepKey = typeof DIRECTOR_CANDIDATE_SETUP_STEPS[number]["key"];

export const DIRECTOR_RUN_MODES = [
  "full_book_autopilot",
  "auto_to_ready",
  "auto_to_execution",
  "stage_review",
] as const;

export type DirectorRunMode = typeof DIRECTOR_RUN_MODES[number];

export const DIRECTOR_AUTO_EXECUTION_RUN_MODES = [
  "auto_to_execution",
  "full_book_autopilot",
] as const;

export type DirectorAutoExecutionRunMode = typeof DIRECTOR_AUTO_EXECUTION_RUN_MODES[number];

export const DIRECTOR_FULL_BOOK_AUTOPILOT_RUN_MODE = "full_book_autopilot" as const;

export const DIRECTOR_FULL_BOOK_AUTOPILOT_INTERRUPT_REASONS = [
  "model_unavailable",
  "service_unavailable",
  "protected_user_content",
  "unrecoverable_data_risk",
  "auto_repair_exhausted",
] as const;

export type DirectorFullBookAutopilotInterruptReason = typeof DIRECTOR_FULL_BOOK_AUTOPILOT_INTERRUPT_REASONS[number];

export const DIRECTOR_CIRCUIT_BREAKER_REASONS = [
  "auto_repair_exhausted",
  "replan_loop",
  "model_unavailable",
  "service_unavailable",
  "protected_user_content",
  "unrecoverable_data_risk",
  "usage_anomaly",
] as const;

export type DirectorCircuitBreakerReason = typeof DIRECTOR_CIRCUIT_BREAKER_REASONS[number];

export interface DirectorCircuitBreakerState {
  status: "closed" | "open";
  reason?: DirectorCircuitBreakerReason | null;
  message?: string | null;
  openedAt?: string | null;
  resetAt?: string | null;
  chapterId?: string | null;
  chapterOrder?: number | null;
  nodeKey?: string | null;
  failureCount?: number;
  patchFailureCount?: number;
  replanLoopCount?: number;
  modelFailureCount?: number;
  usageAnomalyCount?: number;
  lastUsageRecordId?: string | null;
  lastEventAt?: string | null;
  recoveryAction?: "retry" | "resume_after_review" | "switch_model" | "confirm_protected_content" | "manual_repair" | null;
}

export type DirectorQualityLoopBudgetAttemptAction =
  | "patch_repair"
  | "chapter_rewrite"
  | "window_replan"
  | "defer_and_continue";

export type DirectorQualityLoopBudgetNextAction =
  | "auto_patch_repair"
  | "auto_rewrite_chapter"
  | "auto_replan_window"
  | "defer_and_continue";

export interface DirectorQualityLoopBudgetWindow {
  startOrder?: number | null;
  endOrder?: number | null;
  chapterOrders?: number[];
  chapterIds?: string[];
}

export interface DirectorQualityLoopBudgetEntry {
  signatureKey: string;
  issueSignature: string;
  blockingLedgerKeys: string[];
  affectedChapterWindow: DirectorQualityLoopBudgetWindow;
  patchRepairCount: number;
  chapterRewriteCount: number;
  windowReplanCount: number;
  deferredCount: number;
  lastAction?: DirectorQualityLoopBudgetAttemptAction | null;
  lastReason?: string | null;
  lastChapterId?: string | null;
  lastChapterOrder?: number | null;
  updatedAt: string;
}

export interface DirectorQualityLoopBudgetLedger {
  entries: DirectorQualityLoopBudgetEntry[];
  updatedAt?: string | null;
}

export const DIRECTOR_MIN_TARGET_CHAPTER_COUNT = 12;
export const DIRECTOR_MAX_TARGET_CHAPTER_COUNT = 2000;

export const DIRECTOR_AUTO_EXECUTION_MODES = [
  "book",
  "chapter_range",
  "volume",
] as const;

export type DirectorAutoExecutionMode = typeof DIRECTOR_AUTO_EXECUTION_MODES[number];

export interface DirectorAutoExecutionPlan {
  mode: DirectorAutoExecutionMode;
  startOrder?: number;
  endOrder?: number;
  volumeOrder?: number;
  autoReview?: boolean;
  autoRepair?: boolean;
  artifactSyncMode?: ArtifactSyncMode;
}

export interface DirectorFullBookAutopilotContract {
  runMode: typeof DIRECTOR_FULL_BOOK_AUTOPILOT_RUN_MODE;
  autoExecutionPlan: DirectorAutoExecutionPlan & {
    mode: "book";
    autoReview: true;
    autoRepair: true;
  };
  userApprovalBoundary: "infrastructure_or_data_risk";
  interruptReasons: readonly DirectorFullBookAutopilotInterruptReason[];
}

export const DIRECTOR_FULL_BOOK_AUTOPILOT_CONTRACT = {
  runMode: DIRECTOR_FULL_BOOK_AUTOPILOT_RUN_MODE,
  autoExecutionPlan: {
    mode: "book",
    autoReview: true,
    autoRepair: true,
  },
  userApprovalBoundary: "infrastructure_or_data_risk",
  interruptReasons: DIRECTOR_FULL_BOOK_AUTOPILOT_INTERRUPT_REASONS,
} as const satisfies DirectorFullBookAutopilotContract;

export function isDirectorAutoExecutionRunMode(
  runMode: DirectorRunMode | string | null | undefined,
): runMode is DirectorAutoExecutionRunMode {
  return typeof runMode === "string"
    && (DIRECTOR_AUTO_EXECUTION_RUN_MODES as readonly string[]).includes(runMode);
}

export function isFullBookAutopilotRunMode(
  runMode: DirectorRunMode | string | null | undefined,
): runMode is typeof DIRECTOR_FULL_BOOK_AUTOPILOT_RUN_MODE {
  return runMode === DIRECTOR_FULL_BOOK_AUTOPILOT_RUN_MODE;
}

export function buildFullBookAutopilotExecutionPlan(): DirectorAutoExecutionPlan {
  return {
    ...DIRECTOR_FULL_BOOK_AUTOPILOT_CONTRACT.autoExecutionPlan,
  };
}

export type DirectorContinuationMode = "resume" | "auto_execute_range" | "skip_quality_repair";

export const DIRECTOR_STEP_CALIBRATION_ACTIONS = ["validate", "improve", "regenerate"] as const;
export type DirectorStepCalibrationAction = typeof DIRECTOR_STEP_CALIBRATION_ACTIONS[number];

export interface DirectorStepCalibrationRequest {
  stepId: string;
  action: DirectorStepCalibrationAction;
  instruction?: string | null;
  targetId?: string | null;
}

export function normalizeDirectorContinuationMode(
  value: unknown,
): DirectorContinuationMode | null {
  if (value === "resume" || value === "auto_execute_range" || value === "skip_quality_repair") {
    return value;
  }
  return null;
}

export interface DirectorAutoExecutionState extends DirectorAutoExecutionPlan {
  enabled: boolean;
  latestRiskAssessment?: DirectorRiskAssessment | null;
  completionProfile?: import("./directorCompletion").DirectorCompletionProfile;
  closingExtensionCount?: number;
  scopeLabel?: string | null;
  volumeTitle?: string | null;
  preparedVolumeIds?: string[];
  beatChapterListReady?: boolean;
  volumeChapterListComplete?: boolean;
  skippedChapterIds?: string[];
  skippedChapterOrders?: number[];
  qualityDebtChapterIds?: string[];
  qualityDebtChapterOrders?: number[];
  qualityDebtSummaries?: Array<{
    chapterId?: string | null;
    chapterOrder?: number | null;
    reason: string;
    source: "quality_loop" | "replan_loop" | "repair_failure" | "review_skip";
    deferredAt: string;
  }>;
  qualityLoopLedger?: DirectorQualityLoopBudgetLedger | null;
  firstChapterId?: string | null;
  startOrder?: number;
  endOrder?: number;
  totalChapterCount?: number;
  completedChapterCount?: number;
  remainingChapterCount?: number;
  remainingChapterIds?: string[];
  remainingChapterOrders?: number[];
  nextChapterId?: string | null;
  nextChapterOrder?: number | null;
  pipelineJobId?: string | null;
  pipelineStatus?: PipelineJobStatus | null;
  qualityRepairRisk?: DirectorQualityRepairRisk | null;
  circuitBreaker?: DirectorCircuitBreakerState | null;
}

export type DirectorQualityRepairRiskLevel = "low" | "large_scope" | "replan";

export interface DirectorQualityRepairRisk {
  riskLevel: DirectorQualityRepairRiskLevel;
  autoContinuable: boolean;
  reason: string;
  noticeCode?: string | null;
  repairMode?: string | null;
  affectedChapterCount?: number;
  remainingChapterCount?: number;
}

export const DIRECTOR_TAKEOVER_START_PHASES = [
  "story_macro",
  "world_setup",
  "character_setup",
  "volume_strategy",
  "structured_outline",
] as const;

export type DirectorTakeoverStartPhase = typeof DIRECTOR_TAKEOVER_START_PHASES[number];

export const DIRECTOR_TAKEOVER_ENTRY_STEPS = [
  "basic",
  "story_macro",
  "world",
  "character",
  "outline",
  "structured",
  "chapter",
  "pipeline",
] as const;

export type DirectorTakeoverEntryStep = typeof DIRECTOR_TAKEOVER_ENTRY_STEPS[number];

export const DIRECTOR_TAKEOVER_STRATEGIES = [
  "continue_existing",
  "restart_current_step",
] as const;

export type DirectorTakeoverStrategy = typeof DIRECTOR_TAKEOVER_STRATEGIES[number];

export const DIRECTOR_LOCK_SCOPES = [
  "basic",
  "story_macro",
  "world",
  "character",
  "outline",
  "structured",
  "chapter",
  "pipeline",
] as const;

export type DirectorLockScope = typeof DIRECTOR_LOCK_SCOPES[number];

export interface DirectorSessionState {
  runMode: DirectorRunMode;
  isBackgroundRunning: boolean;
  lockedScopes: DirectorLockScope[];
  phase:
    | "candidate_selection"
    | "story_macro"
    | "world_setup"
    | "character_setup"
    | "volume_strategy"
    | "structured_outline"
    | "chapter_execution";
  reviewScope?: DirectorLockScope | null;
}

export interface BookSpec {
  storyInput: string;
  positioning: string;
  sellingPoint: string;
  coreConflict: string;
  protagonistPath: string;
  endingDirection: string;
  hookStrategy: string;
  progressionLoop: string;
  targetChapterCount: number;
  completionProfile?: DirectorCompletionProfile;
}

export interface DirectorCandidate {
  id: string;
  workingTitle: string;
  titleOptions?: TitleFactorySuggestion[];
  logline: string;
  positioning: string;
  sellingPoint: string;
  coreConflict: string;
  protagonistPath: string;
  endingDirection: string;
  hookStrategy: string;
  progressionLoop: string;
  whyItFits: string;
  recommendedWritingPlatform?: "fanqie_free" | "qidian_male" | "jinjiang_female";
  writingPlatformReason?: string;
  toneKeywords: string[];
  targetChapterCount: number;
  productionFoundation?: NovelCreateResourceRecommendation;
}

export interface DirectorStartupPreparation {
  strategy: "fast_start";
  routeWindow: {
    min: 3;
    target: 5;
    detailAhead: 1;
  };
  backgroundEnrichment: "after_first_draft";
}

export const DEFAULT_DIRECTOR_STARTUP_PREPARATION: DirectorStartupPreparation = {
  strategy: "fast_start",
  routeWindow: {
    min: 3,
    target: 5,
    detailAhead: 1,
  },
  backgroundEnrichment: "after_first_draft",
};

export interface DirectorCandidateBatch {
  id: string;
  round: number;
  roundLabel: string;
  idea: string;
  refinementSummary?: string | null;
  presets: DirectorCorrectionPreset[];
  candidates: DirectorCandidate[];
  createdAt: string;
}

export interface DirectorTaskNoticeAction {
  type: "open_structured_outline";
  label: string;
  volumeId?: string | null;
}

export interface DirectorTaskNotice {
  code: string;
  summary: string;
  action?: DirectorTaskNoticeAction | null;
}

export interface DirectorTaskSeedPayloadSnapshot {
  idea?: string;
  batches?: DirectorCandidateBatch[];
  productionFoundation?: NovelCreateResourceRecommendation;
  startupPreparation?: DirectorStartupPreparation;
  completionProfile?: DirectorCompletionProfile;
  directorCommandResults?: Record<string, unknown>;
  worldId?: string | null;
  worldSetupMode?: "auto_generate" | "skip" | null;
  runMode?: DirectorRunMode;
  autoExecutionPlan?: DirectorAutoExecutionPlan;
  autoApproval?: DirectorAutoApprovalConfig | null;
  styleProfileId?: string | null;
  styleIntentSummary?: StyleIntentSummary | null;
  postGenerationStyleReviewEnabled?: boolean | null;
  taskNotice?: DirectorTaskNotice | null;
  stepReview?: {
    stepId: string;
    nodeKey: string;
    label: string;
    targetType: string;
    targetId?: string | null;
    completedAt: string;
  } | null;
}

export interface DirectorLLMOptions {
  provider?: LLMProvider;
  model?: string;
  temperature?: number;
  runMode?: DirectorRunMode;
}

export interface DirectorTakeoverStageReadiness {
  phase: DirectorTakeoverStartPhase;
  label: string;
  description: string;
  available: boolean;
  recommended: boolean;
  reason: string;
}

export interface DirectorTakeoverPreview {
  strategy: DirectorTakeoverStrategy;
  summary: string;
  effectSummary: string;
  effectiveStep: DirectorTakeoverEntryStep;
  effectiveStage: NovelWorkflowStage;
  skipSteps: DirectorTakeoverEntryStep[];
  continueStep?: DirectorTakeoverEntryStep | null;
  restartStep?: DirectorTakeoverEntryStep | null;
  usesCurrentBatch?: boolean;
  impactNotes: string[];
}

export interface DirectorTakeoverEntryReadiness {
  step: DirectorTakeoverEntryStep;
  label: string;
  description: string;
  available: boolean;
  recommended: boolean;
  status: "missing" | "partial" | "ready" | "complete" | "blocked";
  reason: string;
  previews: DirectorTakeoverPreview[];
}

export interface DirectorTakeoverPipelineJobSnapshot {
  id: string;
  status: PipelineJobStatus;
  currentStage?: string | null;
  currentItemLabel?: string | null;
  completedCount: number;
  totalCount: number;
  startOrder: number;
  endOrder: number;
}

export interface DirectorTakeoverCheckpointSnapshot {
  checkpointType: "chapter_batch_ready" | "step_review_required" | "replan_required" | null;
  checkpointSummary?: string | null;
  chapterId?: string | null;
  chapterOrder?: number | null;
  volumeId?: string | null;
}

export interface DirectorTakeoverExecutableRangeSnapshot {
  startOrder: number;
  endOrder: number;
  totalChapterCount: number;
  nextChapterId?: string | null;
  nextChapterOrder?: number | null;
}

export interface DirectorTakeoverReadinessResponse {
  novelId: string;
  novelTitle: string;
  hasActiveTask: boolean;
  activeTaskId?: string | null;
  snapshot: {
    hasStoryMacroPlan: boolean;
    hasBookContract: boolean;
    hasWorldSetupPrepared: boolean;
    characterCount: number;
    chapterCount: number;
    volumeCount: number;
    firstVolumeId?: string | null;
    firstVolumeChapterCount: number;
    volumeChapterRanges?: Array<{
      volumeOrder: number;
      startOrder: number;
      endOrder: number;
    }>;
    structuredOutlineChapterOrders?: number[];
    firstVolumeBeatSheetReady?: boolean;
    firstVolumePreparedChapterCount?: number;
    generatedChapterCount?: number;
    approvedChapterCount?: number;
    pendingRepairChapterCount?: number;
    hasUnpreparedChaptersInRange?: boolean;
    missingExecutionContractOrders?: number[];
  };
  stages: DirectorTakeoverStageReadiness[];
  entrySteps: DirectorTakeoverEntryReadiness[];
  activePipelineJob?: DirectorTakeoverPipelineJobSnapshot | null;
  latestCheckpoint?: DirectorTakeoverCheckpointSnapshot | null;
  executableRange?: DirectorTakeoverExecutableRangeSnapshot | null;
}

export interface DirectorTakeoverRequest extends DirectorLLMOptions {
  novelId: string;
  startPhase?: DirectorTakeoverStartPhase;
  entryStep?: DirectorTakeoverEntryStep;
  strategy?: DirectorTakeoverStrategy;
  autoExecutionPlan?: DirectorAutoExecutionPlan;
  autoApproval?: DirectorAutoApprovalConfig;
  styleProfileId?: string;
  postGenerationStyleReviewEnabled?: boolean;
}

export interface DirectorTakeoverResponse {
  novelId: string;
  workflowTaskId: string;
  startPhase: DirectorTakeoverStartPhase;
  entryStep: DirectorTakeoverEntryStep;
  strategy: DirectorTakeoverStrategy;
  effectiveStage: NovelWorkflowStage;
  directorSession: DirectorSessionState;
  resumeTarget?: NovelWorkflowResumeTarget | null;
}

export interface DirectorProjectContextInput {
  marketBriefId?: string;
  /** 服务端根据 marketBriefId 解析，不接受客户端直接注入。 */
  marketBriefPrompt?: string;
  title?: string;
  description?: string;
  targetAudience?: string;
  bookSellingPoint?: string;
  competingFeel?: string;
  first30ChapterPromise?: string;
  commercialTags?: string[];
  genreId?: string;
  primaryStoryModeId?: string;
  secondaryStoryModeId?: string;
  productionFoundationPrompt?: string;
  worldId?: string;
  worldSetupMode?: "auto_generate" | "skip";
  writingMode?: "original" | "continuation";
  projectMode?: ProjectMode;
  readerChannelPreference?: "ai_judge" | "male_oriented" | "female_oriented" | "general";
  writingPlatformPreference?: WritingPlatformPreference;
  narrativePov?: NarrativePov;
  pacePreference?: PacePreference;
  styleTone?: string;
  styleProfileId?: string;
  styleIntentSummary?: StyleIntentSummary;
  emotionIntensity?: EmotionIntensity;
  aiFreedom?: AIFreedom;
  postGenerationStyleReviewEnabled?: boolean;
  defaultChapterLength?: number;
  estimatedChapterCount?: number;
  projectStatus?: ProjectProgressStatus;
  storylineStatus?: ProjectProgressStatus;
  outlineStatus?: ProjectProgressStatus;
  resourceReadyScore?: number;
  sourceNovelId?: string;
  sourceKnowledgeDocumentId?: string;
  continuationBookAnalysisId?: string;
  continuationBookAnalysisSections?: BookAnalysisSectionKey[];
}

export type DirectorWorldSetupMode = NonNullable<DirectorProjectContextInput["worldSetupMode"]>;

export interface DirectorCandidatesRequest extends DirectorProjectContextInput, DirectorLLMOptions {
  idea: string;
  workflowTaskId?: string;
}

export interface DirectorIdeaContextRequest extends DirectorProjectContextInput, DirectorLLMOptions {
  currentIdea?: string;
  genreLabel?: string;
  genreDescription?: string;
  primaryStoryModeLabel?: string;
  primaryStoryModeDescription?: string;
  secondaryStoryModeLabel?: string;
  secondaryStoryModeDescription?: string;
  worldName?: string;
}

export interface DirectorIdeaInspirationRequest extends DirectorIdeaContextRequest {}

export interface DirectorIdeaInspiration {
  angle: string;
  text: string;
  tags: string[];
}

export interface DirectorIdeaInspirationsResponse {
  ideas: DirectorIdeaInspiration[];
}

export const DIRECTOR_IDEA_CONSTELLATION_CATEGORIES = [
  "protagonist",
  "setting",
  "advantage",
  "opening_crisis",
  "core_goal",
  "story_variable",
  "relationship",
] as const;

export type DirectorIdeaConstellationCategory = typeof DIRECTOR_IDEA_CONSTELLATION_CATEGORIES[number];
export type DirectorIdeaConstellationRelevance = "high" | "medium" | "low";

export interface DirectorIdeaConstellationOption {
  id: string;
  category: DirectorIdeaConstellationCategory;
  label: string;
  hint: string;
  relevance: DirectorIdeaConstellationRelevance;
}

export interface DirectorIdeaConstellationOptionsRequest extends DirectorIdeaContextRequest {}

export interface DirectorIdeaConstellationOptionsResponse {
  options: DirectorIdeaConstellationOption[];
}

export interface DirectorIdeaConstellationSelection {
  id: string;
  category: DirectorIdeaConstellationCategory;
  label: string;
  hint: string;
}

export interface DirectorIdeaConstellationComposeRequest extends DirectorIdeaContextRequest {
  selectedOptions: DirectorIdeaConstellationSelection[];
}

export interface DirectorIdeaConstellationComposeResponse {
  idea: string;
}

export interface DirectorRefinementRequest extends DirectorProjectContextInput, DirectorLLMOptions {
  idea: string;
  previousBatches: DirectorCandidateBatch[];
  presets?: DirectorCorrectionPreset[];
  feedback?: string;
  workflowTaskId?: string;
}

export interface DirectorCandidatePatchRequest extends DirectorProjectContextInput, DirectorLLMOptions {
  idea: string;
  previousBatches: DirectorCandidateBatch[];
  batchId: string;
  candidateId: string;
  presets?: DirectorCorrectionPreset[];
  feedback: string;
  workflowTaskId?: string;
}

export interface DirectorCandidateTitleRefineRequest extends DirectorProjectContextInput, DirectorLLMOptions {
  idea: string;
  previousBatches: DirectorCandidateBatch[];
  batchId: string;
  candidateId: string;
  feedback: string;
  workflowTaskId?: string;
}

export interface DirectorConfirmRequest extends DirectorProjectContextInput, DirectorLLMOptions {
  idea: string;
  batchId?: string;
  round?: number;
  candidate: DirectorCandidate;
  workflowTaskId?: string;
  autoExecutionPlan?: DirectorAutoExecutionPlan;
  autoApproval?: DirectorAutoApprovalConfig;
  startupPreparation?: DirectorStartupPreparation;
  stepCalibrationInstruction?: string | null;
  issueGovernanceVersion?: 1;
  issuePolicy?: DirectorIssuePolicy;
  issuePolicySource?: "global" | "novel";
  completionProfile?: DirectorCompletionProfile;
}

export interface DirectorPlanScene {
  title: string;
  objective: string;
  conflict?: string;
  reveal?: string;
  emotionBeat?: string;
}

export interface DirectorChapterSeed {
  title: string;
  objective: string;
  expectation: string;
  planRole: "setup" | "progress" | "pressure" | "turn" | "payoff" | "cooldown";
  hookTarget?: string;
  participants: string[];
  reveals: string[];
  riskNotes: string[];
  mustAdvance: string[];
  mustPreserve: string[];
  scenes: DirectorPlanScene[];
}

export interface DirectorArcSeed {
  title: string;
  objective: string;
  summary: string;
  phaseLabel: string;
  hookTarget?: string;
  participants: string[];
  reveals: string[];
  riskNotes: string[];
  chapters: DirectorChapterSeed[];
}

export interface DirectorPlanBlueprint {
  bookPlan: {
    title: string;
    objective: string;
    hookTarget?: string;
    participants: string[];
    reveals: string[];
    riskNotes: string[];
  };
  arcs: DirectorArcSeed[];
}

export interface DirectorPlanDigest {
  level: StoryPlanLevel;
  id: string;
  title: string;
  objective: string;
  chapterId?: string | null;
  externalRef?: string | null;
  rawPlanJson?: string | null;
}

export interface DirectorConfirmResponse {
  novel: Novel;
  storyMacroPlan: StoryMacroPlan | null;
  bookContract?: BookContract;
  bookSpec: BookSpec;
  batch: {
    id?: string;
    round?: number;
  };
  createdChapterCount: number;
  createdArcCount: number;
  workflowTaskId?: string;
  directorSession?: DirectorSessionState;
  resumeTarget?: NovelWorkflowResumeTarget | null;
  plans: {
    book: DirectorPlanDigest | null;
    arcs: DirectorPlanDigest[];
    chapters: DirectorPlanDigest[];
  };
}

export interface DirectorCandidatesResponse {
  batch: DirectorCandidateBatch;
  workflowTaskId?: string;
}

export interface DirectorRefineResponse {
  batch: DirectorCandidateBatch;
  workflowTaskId?: string;
}

export interface DirectorCandidatePatchResponse {
  batch: DirectorCandidateBatch;
  candidate: DirectorCandidate;
  workflowTaskId?: string;
}

export interface DirectorCandidateTitleRefineResponse {
  batch: DirectorCandidateBatch;
  candidate: DirectorCandidate;
  workflowTaskId?: string;
}

export interface DirectorConfirmApiResponse extends DirectorConfirmResponse {
  seededPlans: {
    book: DirectorPlanDigest | null;
    arcs: DirectorPlanDigest[];
    chapters: DirectorPlanDigest[];
  };
}

export interface DirectorBookContractDraft extends BookContractDraft {}

export function extractDirectorTaskSeedPayload(
  seedPayload: unknown,
): DirectorTaskSeedPayloadSnapshot | null {
  if (!seedPayload || typeof seedPayload !== "object") {
    return null;
  }
  return seedPayload as DirectorTaskSeedPayloadSnapshot;
}

export function extractDirectorTaskSeedPayloadFromMeta(
  meta: Record<string, unknown> | null | undefined,
): DirectorTaskSeedPayloadSnapshot | null {
  if (!meta || typeof meta !== "object") {
    return null;
  }
  return extractDirectorTaskSeedPayload((meta as { seedPayload?: unknown }).seedPayload);
}

export function mergeDirectorCandidateBatches(
  currentBatches: DirectorCandidateBatch[],
  incomingBatches: DirectorCandidateBatch[],
): DirectorCandidateBatch[] {
  if (incomingBatches.length === 0) {
    return currentBatches;
  }
  if (currentBatches.length === 0) {
    return incomingBatches;
  }
  const existingIds = new Set(currentBatches.map((batch) => batch.id));
  const missingBatches = incomingBatches.filter((batch) => !existingIds.has(batch.id));
  return missingBatches.length > 0
    ? [...currentBatches, ...missingBatches]
    : currentBatches;
}

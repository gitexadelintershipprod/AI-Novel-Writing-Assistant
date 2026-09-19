import type { BookAnalysisSectionKey } from "@ai-novel/shared/types/bookAnalysis";
import { formatCommercialTagsInput, normalizeCommercialTags } from "@ai-novel/shared/types/novelFraming";
import type { WritingPlatformPreference } from "@ai-novel/shared/types/writingPlatform";

export interface NovelBasicFormState {
  title: string;
  description: string;
  targetAudience: string;
  bookSellingPoint: string;
  competingFeel: string;
  first30ChapterPromise: string;
  commercialTagsText: string;
  genreId: string;
  primaryStoryModeId: string;
  secondaryStoryModeId: string;
  worldId: string;
  status: "draft" | "published";
  writingMode: "original" | "continuation";
  projectMode: "ai_led" | "co_pilot" | "draft_mode" | "auto_pipeline";
  readerChannelPreference: "ai_judge" | "male_oriented" | "female_oriented" | "general";
  writingPlatformPreference: WritingPlatformPreference;
  narrativePov: "first_person" | "third_person" | "mixed";
  pacePreference: "slow" | "balanced" | "fast";
  styleTone: string;
  emotionIntensity: "low" | "medium" | "high";
  aiFreedom: "low" | "medium" | "high";
  postGenerationStyleReviewEnabled: boolean;
  defaultChapterLength: number;
  estimatedChapterCount: number;
  projectStatus: "not_started" | "in_progress" | "completed" | "rework" | "blocked";
  storylineStatus: "not_started" | "in_progress" | "completed" | "rework" | "blocked";
  outlineStatus: "not_started" | "in_progress" | "completed" | "rework" | "blocked";
  resourceReadyScore: number;
  continuationSourceType: "novel" | "knowledge_document";
  sourceNovelId: string;
  sourceKnowledgeDocumentId: string;
  continuationBookAnalysisId: string;
  continuationBookAnalysisSections: BookAnalysisSectionKey[];
}

export interface BasicInfoOption<T extends string> {
  value: T;
  label: string;
  summary: string;
  recommended?: boolean;
}

export const DEFAULT_ESTIMATED_CHAPTER_COUNT = 80;

export const WRITING_MODE_OPTIONS: BasicInfoOption<NovelBasicFormState["writingMode"]>[] = [
  {
    value: "original",
    label: "Original",
    summary: "Create worlds, characters, and storylines from scratch, suitable for most new projects.",
    recommended: true,
  },
  {
    value: "continuation",
    label: "Continue writing",
    summary: "Continue to create based on existing novels or knowledge documents, and priority will be given to injecting existing settings and unpacked book content in the future.",
  },
];

export const PROJECT_MODE_OPTIONS: BasicInfoOption<NovelBasicFormState["projectMode"]>[] = [
  {
    value: "co_pilot",
    label: "AI co-pilot",
    summary: "You set the direction, and AI provides plans and drafts, which is suitable for early polishing and high-frequency manual decision-making.",
    recommended: true,
  },
  {
    value: "ai_led",
    label: "AI takes over",
    summary: "AI is responsible for the main promotion, and you review at key nodes. It is suitable for projects with clear goals.",
  },
  {
    value: "draft_mode",
    label: "Draft first",
    summary: "First, quickly produce text and direction, with weak structural constraints, suitable for trying out stories and finding feelings.",
  },
  {
    value: "auto_pipeline",
    label: "Pipeline first",
    summary: "It is suitable for continuous advancement through planning, generation, auditing, and repair after the setting is relatively complete.",
  },
];

export const READER_CHANNEL_OPTIONS: BasicInfoOption<NovelBasicFormState["readerChannelPreference"]>[] = [
  {
    value: "ai_judge",
    label: "AI judgment",
    summary: "Let AI determine the default reader channel tendency based on subject matter, selling points, and starting ideas, which is suitable as the default choice.",
    recommended: true,
  },
  {
    value: "male_oriented",
    label: "male frequency",
    summary: "More emphasis is placed on goals, upgrades, competition, cool points realization and promotion of external events.",
  },
  {
    value: "female_oriented",
    label: "Female frequency",
    summary: "More emphasis is placed on relationship lines, emotional pull, character selection and delicate staged feedback.",
  },
  {
    value: "general",
    label: "General reader/unlimited",
    summary: "Do not limit channel tendencies and let AI prioritize planning based on the story itself and target reader descriptions.",
  },
];

export const WRITING_PLATFORM_OPTIONS: BasicInfoOption<NovelBasicFormState["writingPlatformPreference"]>[] = [
  { value: "ai_recommend", label: "AI recommendation", summary: "AI chooses a writing profile from the intended experience, audience, pacing, and long-term story engine.", recommended: true },
  { value: "fanqie_free", label: "Georgian Serial", summary: "An accessible serial with an early hook, clear stakes, compact chapters, and visible payoffs." },
  { value: "qidian_male", label: "Progression & Adventure", summary: "Growth, exploration, changing resources, escalating challenges, and earned payoffs." },
  { value: "jinjiang_female", label: "Character & Relationship", summary: "Character voice, emotional causality, relationship change, and continuing external action." },
];

export const POV_OPTIONS: BasicInfoOption<NovelBasicFormState["narrativePov"]>[] = [
  {
    value: "third_person",
    label: "third person",
    summary: "The most stable, suitable for multiple characters and complex main lines.",
    recommended: true,
  },
  {
    value: "first_person",
    label: "first person",
    summary: "The sense of substitution is strong, but the information is limited, which is suitable for narratives from the perspective of a strong protagonist.",
  },
  {
    value: "mixed",
    label: "mixed perspective",
    summary: "More flexible, but easier to lose control, suitable for mature projects.",
  },
];

export const PACE_OPTIONS: BasicInfoOption<NovelBasicFormState["pacePreference"]>[] = [
  {
    value: "balanced",
    label: "equilibrium",
    summary: "It has both advancement and foreshadowing, so it is suitable as the default choice.",
    recommended: true,
  },
  {
    value: "slow",
    label: "slow pace",
    summary: "More emphasis on foreshadowing, atmosphere and emotional fermentation.",
  },
  {
    value: "fast",
    label: "fast paced",
    summary: "More event-driven, hooks, and continuous advancement.",
  },
];

export const EMOTION_OPTIONS: BasicInfoOption<NovelBasicFormState["emotionIntensity"]>[] = [
  {
    value: "medium",
    label: "medium emotional concentration",
    summary: "Preserves undulation without overdoing it, suitable as default.",
    recommended: true,
  },
  {
    value: "low",
    label: "low emotional concentration",
    summary: "More restrained, suitable for calm narrative or more rational works.",
  },
  {
    value: "high",
    label: "high emotional concentration",
    summary: "More emphasis is placed on explosions, conflicts and highly stimulating scenes.",
  },
];

export const AI_FREEDOM_OPTIONS: BasicInfoOption<NovelBasicFormState["aiFreedom"]>[] = [
  {
    value: "medium",
    label: "medium degrees of freedom",
    summary: "Allows the AI to add detail and local advancement within the setting, making it suitable as a default.",
    recommended: true,
  },
  {
    value: "low",
    label: "low degrees of freedom",
    summary: "Execute strictly according to the settings and plans, suitable for early stage control.",
  },
  {
    value: "high",
    label: "High degree of freedom",
    summary: "Allows AI to actively expand plot and details, suitable for mid- to late-stage stable projects.",
  },
];

export const PUBLICATION_STATUS_OPTIONS: BasicInfoOption<NovelBasicFormState["status"]>[] = [
  {
    value: "draft",
    label: "Draft",
    summary: "Still in the development and polishing stage, suitable for most projects.",
    recommended: true,
  },
  {
    value: "published",
    label: "Published",
    summary: "Used to mark works that have been completed or released to the public.",
  },
];

export const PROJECT_STATUS_OPTIONS: Array<{ value: NovelBasicFormState["projectStatus"]; label: string }> = [
  { value: "not_started", label: "Not Started" },
  { value: "in_progress", label: "In Progress" },
  { value: "completed", label: "Completed" },
  { value: "rework", label: "Rework" },
  { value: "blocked", label: "blocking" },
];

export const BASIC_INFO_FIELD_HINTS = {
  writingMode: "Decide whether to start the project from scratch or build on existing work. It directly affects which contextual sources are prioritized for subsequent use.",
  targetAudience: "Describe the primary readers for this book. You do not need a formal audience profile—use your own words.",
  bookSellingPoint: "Describe the book's strongest appeal, such as relationship tension, a comeback payoff, escalating mystery, or a fresh premise.",
  competingFeel: "Describe the familiar reading experience it evokes; you are not being asked to imitate a specific work.",
  first30ChapterPromise: "State what readers must see, feel, and come to believe within the first 30 chapters.",
  commercialTagsText: "Enter 3–6 comma-separated tags, such as comeback, high conflict, suspense, and workplace rivalry.",
  projectMode: "Decide how you and AI work together. It will affect which subsequent steps are automatically advanced and which steps rely more on manual confirmation.",
  readerChannelPreference: "Help AI determine the default cool point, emotional center of gravity and relationship line weight. Maintain AI judgment when unsure.",
  narrativePov: "Deciding which narrative perspective to use by default for chapter generation also affects how information is distributed.",
  pacePreference: "Deciding whether to focus on foreshadowing or advancement when planning chapters will affect scene density and hook strength.",
  emotionIntensity: "Determining the frequency of emotional outbursts and conflicts during subsequent generation, higher is not better.",
  aiFreedom: "Determine how far the AI can deviate from established plans and settings. It is recommended to keep it low or medium in the early stage.",
  postGenerationStyleReviewEnabled: "Control AI deodorization detection and automatic correction after text generation. The writing method and anti-AI prompts before generation are still executed according to the rule base.",
  defaultChapterLength: "Reference word count for chapter planning and generation, not a hard limit. The recommended Georgian range is 1,200 to 2,000 words.",
  estimatedChapterCount: "This is the estimated total number of chapters for the project, which will be used as a reference for the structured outline, plot points, and the default scope of the pipeline. It is not a hard limit.",
  resourceReadyScore: "Used to mark whether settings, characters, and main story information are sufficient. The higher the value, the more suitable it is to enter the automated production stage.",
  styleTone: "Just write a few keywords, such as coldness, restraint, and black humor. It affects the generated language style.",
  genreId: "Answer \"What kind of book is this\" based on the subject matter, such as cultivating immortals, cities, and historical fiction. It will affect the planning, title and overall selling point tendency, so it is recommended to determine it as early as possible.",
  primaryStoryModeId: "The main promotion mode answers \"What does this book rely on to continue to promote and realize its fulfillment\", such as system flow, invincible flow, and farming flow. Subsequent planning and generation will obey it first.",
  secondaryStoryModeId: "The secondary promotion mode is only responsible for supplementing the flavor, such as superimposing the sense of shop management in daily healing, and superimposing the sense of vest in invincible flow, and cannot cover the boundaries of the main mode.",
  worldId: "Only a reference sample is recorded here to facilitate initializing the world of this book. The novel generation will give priority to reading the content in the \"Book World\" card at the top of the page.",
  status: "It is just a work life cycle mark and does not affect basic creative capabilities, but will affect the list and project management status.",
  continuationSourceType: "When continuing, choose whether to cite the novel on the site or the document version in the knowledge base.",
  continuationBookAnalysis: "The content of the split book will serve as a high-weight structured context, suitable for continued projects to maintain a consistent style and setting.",
} satisfies Record<string, string>;

export function createDefaultNovelBasicFormState(): NovelBasicFormState {
  return {
    title: "",
    description: "",
    targetAudience: "",
    bookSellingPoint: "",
    competingFeel: "",
    first30ChapterPromise: "",
    commercialTagsText: "",
    genreId: "",
    primaryStoryModeId: "",
    secondaryStoryModeId: "",
    worldId: "",
    status: "draft",
    writingMode: "original",
    projectMode: "co_pilot",
    readerChannelPreference: "ai_judge",
    writingPlatformPreference: "ai_recommend",
    narrativePov: "third_person",
    pacePreference: "balanced",
    styleTone: "",
    emotionIntensity: "medium",
    aiFreedom: "medium",
    postGenerationStyleReviewEnabled: true,
    defaultChapterLength: 1500,
    estimatedChapterCount: DEFAULT_ESTIMATED_CHAPTER_COUNT,
    projectStatus: "not_started",
    storylineStatus: "not_started",
    outlineStatus: "not_started",
    resourceReadyScore: 0,
    continuationSourceType: "novel",
    sourceNovelId: "",
    sourceKnowledgeDocumentId: "",
    continuationBookAnalysisId: "",
    continuationBookAnalysisSections: [],
  };
}

export function patchNovelBasicForm(
  previous: NovelBasicFormState,
  patch: Partial<NovelBasicFormState>,
): NovelBasicFormState {
  const next = { ...previous, ...patch };
  if (
    next.primaryStoryModeId
    && next.secondaryStoryModeId
    && next.primaryStoryModeId === next.secondaryStoryModeId
  ) {
    next.secondaryStoryModeId = "";
  }
  if (next.writingMode === "original") {
    next.sourceNovelId = "";
    next.sourceKnowledgeDocumentId = "";
    next.continuationBookAnalysisId = "";
    next.continuationBookAnalysisSections = [];
  } else if (next.continuationSourceType === "novel") {
    next.sourceKnowledgeDocumentId = "";
  } else if (next.continuationSourceType === "knowledge_document") {
    next.sourceNovelId = "";
  }
  if (
    patch.continuationSourceType !== undefined
    && patch.continuationSourceType !== previous.continuationSourceType
  ) {
    next.continuationBookAnalysisId = "";
    next.continuationBookAnalysisSections = [];
  }
  if (
    next.continuationSourceType === "novel"
    && patch.sourceNovelId !== undefined
    && patch.sourceNovelId !== previous.sourceNovelId
  ) {
    next.continuationBookAnalysisId = "";
    next.continuationBookAnalysisSections = [];
  }
  if (
    next.continuationSourceType === "knowledge_document"
    && patch.sourceKnowledgeDocumentId !== undefined
    && patch.sourceKnowledgeDocumentId !== previous.sourceKnowledgeDocumentId
  ) {
    next.continuationBookAnalysisId = "";
    next.continuationBookAnalysisSections = [];
  }
  if (patch.continuationBookAnalysisId !== undefined && !patch.continuationBookAnalysisId) {
    next.continuationBookAnalysisSections = [];
  }
  return next;
}

export function buildNovelCreatePayload(basicForm: NovelBasicFormState) {
  const commercialTags = normalizeCommercialTags(basicForm.commercialTagsText);
  return {
    title: basicForm.title.trim(),
    description: basicForm.description.trim() || undefined,
    targetAudience: basicForm.targetAudience.trim() || undefined,
    bookSellingPoint: basicForm.bookSellingPoint.trim() || undefined,
    competingFeel: basicForm.competingFeel.trim() || undefined,
    first30ChapterPromise: basicForm.first30ChapterPromise.trim() || undefined,
    commercialTags: commercialTags.length > 0 ? commercialTags : undefined,
    genreId: basicForm.genreId || undefined,
    primaryStoryModeId: basicForm.primaryStoryModeId || undefined,
    secondaryStoryModeId: basicForm.secondaryStoryModeId || undefined,
    worldId: basicForm.worldId || undefined,
    writingMode: basicForm.writingMode,
    projectMode: basicForm.projectMode,
    narrativePov: basicForm.narrativePov,
    pacePreference: basicForm.pacePreference,
    styleTone: basicForm.styleTone.trim() || undefined,
    emotionIntensity: basicForm.emotionIntensity,
    aiFreedom: basicForm.aiFreedom,
    postGenerationStyleReviewEnabled: basicForm.postGenerationStyleReviewEnabled,
    defaultChapterLength: basicForm.defaultChapterLength,
    estimatedChapterCount: basicForm.estimatedChapterCount,
    projectStatus: basicForm.projectStatus,
    storylineStatus: basicForm.storylineStatus,
    outlineStatus: basicForm.outlineStatus,
    resourceReadyScore: basicForm.resourceReadyScore,
    sourceNovelId: basicForm.writingMode === "continuation" && basicForm.continuationSourceType === "novel"
      ? (basicForm.sourceNovelId || undefined)
      : undefined,
    sourceKnowledgeDocumentId: basicForm.writingMode === "continuation" && basicForm.continuationSourceType === "knowledge_document"
      ? (basicForm.sourceKnowledgeDocumentId || undefined)
      : undefined,
    continuationBookAnalysisId: basicForm.writingMode === "continuation"
      && (
        (basicForm.continuationSourceType === "novel" && Boolean(basicForm.sourceNovelId))
        || (basicForm.continuationSourceType === "knowledge_document" && Boolean(basicForm.sourceKnowledgeDocumentId))
      )
      ? (basicForm.continuationBookAnalysisId || undefined)
      : undefined,
    continuationBookAnalysisSections:
      basicForm.writingMode === "continuation"
        && (
          (basicForm.continuationSourceType === "novel" && Boolean(basicForm.sourceNovelId))
          || (basicForm.continuationSourceType === "knowledge_document" && Boolean(basicForm.sourceKnowledgeDocumentId))
        )
        && basicForm.continuationBookAnalysisId
        ? (basicForm.continuationBookAnalysisSections.length > 0 ? basicForm.continuationBookAnalysisSections : undefined)
        : undefined,
  };
}

export function buildNovelUpdatePayload(basicForm: NovelBasicFormState) {
  const commercialTags = normalizeCommercialTags(basicForm.commercialTagsText);
  return {
    title: basicForm.title,
    description: basicForm.description,
    targetAudience: basicForm.targetAudience.trim() || null,
    bookSellingPoint: basicForm.bookSellingPoint.trim() || null,
    competingFeel: basicForm.competingFeel.trim() || null,
    first30ChapterPromise: basicForm.first30ChapterPromise.trim() || null,
    commercialTags: commercialTags.length > 0 ? commercialTags : null,
    genreId: basicForm.genreId || null,
    primaryStoryModeId: basicForm.primaryStoryModeId || null,
    secondaryStoryModeId: basicForm.secondaryStoryModeId || null,
    worldId: basicForm.worldId || null,
    status: basicForm.status,
    writingMode: basicForm.writingMode,
    projectMode: basicForm.projectMode,
    narrativePov: basicForm.narrativePov,
    pacePreference: basicForm.pacePreference,
    styleTone: basicForm.styleTone || null,
    emotionIntensity: basicForm.emotionIntensity,
    aiFreedom: basicForm.aiFreedom,
    postGenerationStyleReviewEnabled: basicForm.postGenerationStyleReviewEnabled,
    defaultChapterLength: basicForm.defaultChapterLength,
    estimatedChapterCount: basicForm.estimatedChapterCount,
    projectStatus: basicForm.projectStatus,
    storylineStatus: basicForm.storylineStatus,
    outlineStatus: basicForm.outlineStatus,
    resourceReadyScore: basicForm.resourceReadyScore,
    sourceNovelId: basicForm.writingMode === "continuation" && basicForm.continuationSourceType === "novel"
      ? (basicForm.sourceNovelId || null)
      : null,
    sourceKnowledgeDocumentId: basicForm.writingMode === "continuation" && basicForm.continuationSourceType === "knowledge_document"
      ? (basicForm.sourceKnowledgeDocumentId || null)
      : null,
    continuationBookAnalysisId: basicForm.writingMode === "continuation"
      && (
        (basicForm.continuationSourceType === "novel" && Boolean(basicForm.sourceNovelId))
        || (basicForm.continuationSourceType === "knowledge_document" && Boolean(basicForm.sourceKnowledgeDocumentId))
      )
      ? (basicForm.continuationBookAnalysisId || null)
      : null,
    continuationBookAnalysisSections:
      basicForm.writingMode === "continuation"
        && (
          (basicForm.continuationSourceType === "novel" && Boolean(basicForm.sourceNovelId))
          || (basicForm.continuationSourceType === "knowledge_document" && Boolean(basicForm.sourceKnowledgeDocumentId))
        )
        && basicForm.continuationBookAnalysisId
        ? (basicForm.continuationBookAnalysisSections.length > 0 ? basicForm.continuationBookAnalysisSections : null)
        : null,
  };
}

export { formatCommercialTagsInput };

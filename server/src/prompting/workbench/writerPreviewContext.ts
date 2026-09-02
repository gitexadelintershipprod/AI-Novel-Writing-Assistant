import type {
  ChapterWriteContext,
  GenerationContextPackage,
} from "@ai-novel/shared/types/chapterRuntime";
import {
  buildBookContractContext,
  buildChapterWriteContext,
} from "../prompts/novel/chapterLayeredContext";
import {
  compactPreviewText,
  parseSceneCards,
  PREVIEW_TIMESTAMP,
  readJsonStringList,
  readString,
  readStringList,
  type PreviewChapterRow,
  type PreviewNovelRow,
} from "./previewContextSupport";

function buildPreviewStyleSection(
  key: NonNullable<ChapterWriteContext["styleContract"]>["narrative"]["key"],
  title: string,
  lines: string[],
): NonNullable<ChapterWriteContext["styleContract"]>["narrative"] {
  const normalizedLines = lines.map((line) => compactPreviewText(line)).filter(Boolean);
  return {
    key,
    title,
    summary: normalizedLines[0] ?? null,
    lines: normalizedLines,
    text: [`${title}:`, ...normalizedLines.map((line) => `- ${line}`)].join("\n"),
    hasContent: normalizedLines.length > 0,
  };
}

function buildPreviewStyleContract(input: {
  novel: PreviewNovelRow;
  chapter: PreviewChapterRow;
}): NonNullable<ChapterWriteContext["styleContract"]> {
  const { chapter, novel } = input;
  const narrative = buildPreviewStyleSection("narrative", "Narrative constraints", [
    novel.narrativePov ? `Narrative viewpoint: ${novel.narrativePov}` : "Use a clear, stable viewpoint without leaving the current chapter scene arbitrarily.",
    novel.description ? `Story foundation: ${novel.description}` : "",
  ]);
  const character = buildPreviewStyleSection("character", "Character expression", [
    "Make character actions serve the chapter objective; do not replace action and choice with explanatory summary.",
    chapter.expectation ? `Character behavior follows the chapter task: ${chapter.expectation}` : "",
  ]);
  const language = buildPreviewStyleSection("language", "Language", [
    "Write in natural, fluent Georgian with readable serial-fiction pacing.",
    novel.styleTone ? `Book-level tone: ${novel.styleTone}` : "",
  ]);
  const rhythm = buildPreviewStyleSection("rhythm", "Pacing", [
    novel.pacePreference ? `Pacing preference: ${novel.pacePreference}` : "Maintain forward movement and avoid long, empty exposition.",
    chapter.targetWordCount ? `Organize scene density around a target of ${chapter.targetWordCount} Georgian words.` : "",
  ]);
  const antiAi = buildPreviewStyleSection("antiAi", "Anti-AI", [
    "Limit empty modifiers; avoid summary-like prose, formulaic turns, and repeated recaps.",
  ]);
  const selfCheck = buildPreviewStyleSection("selfCheck", "Self-check", [
    "Before output, verify the chapter task, character facts, boundaries, and ending hook.",
  ]);

  return {
    narrative,
    character,
    language,
    rhythm,
    antiAi,
    selfCheck,
    meta: {
      effectiveStyleProfileId: null,
      taskStyleProfileId: null,
      activeSourceTargets: ["novel", "chapter"],
      activeSourceLabels: ["Prompt Workbench preview"],
      writerIncludedSections: ["narrative", "character", "language", "rhythm", "antiAi", "selfCheck"],
      plannerIncludedSections: ["narrative", "character", "language", "antiAi"],
      droppedSections: [],
      maturity: "summary_only",
      usesGlobalAntiAiBaseline: false,
      globalAntiAiRuleIds: [],
      styleAntiAiRuleIds: [],
    },
  };
}

function buildRuntimeCharacters(characters: NonNullable<PreviewNovelRow["characters"]>): GenerationContextPackage["characterRoster"] {
  return characters.map((character) => ({
    id: character.id,
    name: compactPreviewText(character.name, "Unnamed character"),
    role: compactPreviewText(character.role, "supporting"),
    personality: character.personality ?? null,
    background: character.background ?? null,
    development: character.development ?? null,
    identityLabel: character.identityLabel ?? null,
    factionLabel: character.factionLabel ?? null,
    stanceLabel: character.stanceLabel ?? null,
    powerLevel: character.powerLevel ?? null,
    realm: character.realm ?? null,
    currentLocation: character.currentLocation ?? null,
    availability: character.availability ?? null,
    prohibitions: readJsonStringList(character.prohibitionsJson),
    currentState: character.currentState ?? null,
    currentGoal: character.currentGoal ?? null,
    appearance: character.appearance ?? null,
    physique: character.physique ?? null,
    attireStyle: character.attireStyle ?? null,
    signatureDetail: character.signatureDetail ?? null,
    voiceTexture: character.voiceTexture ?? null,
    presenceImpression: character.presenceImpression ?? null,
  }));
}

function buildCharacterHardFacts(
  characters: GenerationContextPackage["characterRoster"],
): GenerationContextPackage["characterHardFacts"] {
  return characters.map((character) => ({
    characterId: character.id,
    name: character.name,
    role: character.role,
    identityLabel: character.identityLabel ?? null,
    factionLabel: character.factionLabel ?? null,
    stanceLabel: character.stanceLabel ?? null,
    powerLevel: character.powerLevel ?? null,
    realm: character.realm ?? null,
    currentLocation: character.currentLocation ?? null,
    availability: character.availability ?? null,
    currentState: character.currentState ?? null,
    currentGoal: character.currentGoal ?? null,
    prohibitions: character.prohibitions ?? [],
    pendingReviewFields: [],
  }));
}

function buildPreviewPlan(input: {
  chapter: PreviewChapterRow;
  characters: GenerationContextPackage["characterRoster"];
}): NonNullable<GenerationContextPackage["plan"]> {
  const { chapter, characters } = input;
  const scenes = parseSceneCards(chapter.sceneCards);
  const mustAdvance = [
    ...scenes.flatMap((scene) => readStringList(scene.mustAdvance)),
    chapter.expectation,
    chapter.taskSheet,
  ].map((item) => compactPreviewText(item)).filter(Boolean).slice(0, 8);
  const mustPreserve = [
    ...scenes.flatMap((scene) => readStringList(scene.mustPreserve)),
    chapter.mustAvoid ? `Do not cross this boundary: ${chapter.mustAvoid}` : "",
  ].map((item) => compactPreviewText(item)).filter(Boolean).slice(0, 8);
  const objective = compactPreviewText(
    chapter.expectation || chapter.taskSheet,
    `Advance the task for chapter ${chapter.order}, “${chapter.title || "Untitled chapter"}”.`,
  );

  return {
    id: `workbench-preview-plan:${chapter.id}`,
    chapterId: chapter.id,
    planRole: "progress",
    phaseLabel: null,
    title: compactPreviewText(chapter.title, `Chapter ${chapter.order}`),
    objective,
    participants: characters.slice(0, 6).map((character) => character.name),
    reveals: [],
    riskNotes: [chapter.mustAvoid].map((item) => compactPreviewText(item)).filter(Boolean),
    mustAdvance: mustAdvance.length > 0 ? mustAdvance : [objective],
    mustPreserve,
    sourceIssueIds: [],
    replannedFromPlanId: null,
    hookTarget: compactPreviewText(chapter.hook, "Leave fresh pressure or suspense at the chapter ending."),
    rawPlanJson: null,
    scenes: scenes.map((scene, index) => ({
      id: `workbench-preview-scene:${chapter.id}:${index + 1}`,
      sortOrder: index + 1,
      title: readString(scene.title) || `Scene ${index + 1}`,
      objective: readString(scene.purpose) || readStringList(scene.mustAdvance)[0] || null,
      conflict: readString(scene.conflict) || null,
      reveal: readString(scene.reveal) || null,
      emotionBeat: readString(scene.emotionBeat) || null,
    })),
    createdAt: PREVIEW_TIMESTAMP,
    updatedAt: PREVIEW_TIMESTAMP,
  };
}

function buildPreviewStateSnapshot(input: {
  novel: PreviewNovelRow;
  chapter: PreviewChapterRow;
  characters: GenerationContextPackage["characterRoster"];
}): GenerationContextPackage["stateSnapshot"] {
  const { chapter, characters, novel } = input;
  return {
    id: `workbench-preview-state:${chapter.id}`,
    novelId: novel.id,
    sourceChapterId: chapter.id,
    summary: [
      `Novel: ${novel.title}`,
      `Chapter: ${chapter.order}, “${chapter.title || "Untitled chapter"}”`,
      chapter.expectation ? `Chapter objective: ${chapter.expectation}` : "",
      chapter.hook ? `Ending hook: ${chapter.hook}` : "",
    ].filter(Boolean).join("\n"),
    rawStateJson: null,
    characterStates: characters.slice(0, 6).map((character) => ({
      characterId: character.id,
      currentGoal: character.currentGoal ?? null,
      emotion: null,
      summary: character.currentState ?? null,
    })),
    relationStates: [],
    informationStates: [],
    foreshadowStates: [],
    createdAt: PREVIEW_TIMESTAMP,
    updatedAt: PREVIEW_TIMESTAMP,
  };
}

function buildPreviewGenerationContextPackage(input: {
  novel: PreviewNovelRow;
  chapter: PreviewChapterRow;
}): GenerationContextPackage {
  const { chapter, novel } = input;
  const characters = buildRuntimeCharacters(Array.isArray(novel.characters) ? novel.characters : []);
  const characterHardFacts = buildCharacterHardFacts(characters);
  const styleContract = buildPreviewStyleContract({ novel, chapter });
  const plan = buildPreviewPlan({ chapter, characters });

  return {
    chapter: {
      id: chapter.id,
      title: chapter.title,
      order: chapter.order,
      content: chapter.content ?? null,
      expectation: chapter.expectation ?? null,
      targetWordCount: chapter.targetWordCount ?? null,
      conflictLevel: chapter.conflictLevel ?? null,
      revealLevel: chapter.revealLevel ?? null,
      mustAvoid: chapter.mustAvoid ?? null,
      taskSheet: chapter.taskSheet ?? null,
      sceneCards: chapter.sceneCards ?? null,
      hook: chapter.hook ?? null,
      supportingContextText: "",
    },
    plan,
    canonicalState: null,
    nextAction: "write_chapter",
    chapterStateGoal: null,
    protectedSecrets: chapter.mustAvoid ? [chapter.mustAvoid] : [],
    pendingReviewProposalCount: 0,
    stateSnapshot: buildPreviewStateSnapshot({ novel, chapter, characters }),
    openConflicts: [],
    storyWorldSlice: null,
    characterRoster: characters,
    characterHardFacts,
    creativeDecisions: [],
    openAuditIssues: [],
    previousChaptersSummary: [],
    previousChapterTail: null,
    openingHint: "Open directly from the chapter task or scene card; do not repeat setting exposition.",
    continuation: {
      enabled: false,
      sourceType: null,
      sourceId: null,
      sourceTitle: "",
      systemRule: "",
      humanBlock: "",
      antiCopyCorpus: [],
    },
    styleContext: {
      matchedBindings: [],
      compiledBlocks: {
        context: "",
        style: "",
        character: "",
        antiAi: "",
        output: "",
        selfCheck: "",
        contract: styleContract,
        mergedRules: {
          narrativeRules: {},
          characterRules: {},
          languageRules: {},
          rhythmRules: {},
        },
        appliedRuleIds: [],
      },
      effectiveStyleProfileId: null,
      taskStyleProfileId: null,
      activeSourceTargets: ["novel", "chapter"],
      activeSourceLabels: ["Prompt Workbench preview"],
      maturity: "summary_only",
      usesGlobalAntiAiBaseline: false,
      globalAntiAiRuleIds: [],
      styleAntiAiRuleIds: [],
      sanitizedGenerationProfile: null,
    },
    characterDynamics: null,
    characterMindStates: [],
    bookContract: null,
    macroConstraints: null,
    volumeWindow: null,
    narrativeProgressHint: novel.estimatedChapterCount
      ? `Chapter ${chapter.order} / approximately ${novel.estimatedChapterCount} chapters total.`
      : null,
    ledgerPendingItems: [],
    ledgerUrgentItems: [],
    ledgerOverdueItems: [],
    ledgerSummary: null,
    timelineContext: null,
    characterResourceContext: null,
    ragContext: "",
    chapterMission: null,
    chapterWriteContext: null,
    chapterReviewContext: null,
    chapterRepairContext: null,
    contextGatingDecisions: [],
    chapterChangeFlags: {
      introducedPayoff: false,
      payoffResolutionSignal: false,
      relationshipShiftSignal: false,
      majorStateShiftSignal: false,
    },
    tokenBudgetPolicy: {
      chapterBudgetProfile: "workbench-preview",
      stageTokenCap: {},
      retryCap: {},
      auditMode: "light",
    },
    promptBudgetProfiles: [],
  };
}

export function buildPreviewChapterWriteContext(input: {
  novel: PreviewNovelRow;
  chapter: PreviewChapterRow;
}): ChapterWriteContext {
  const { chapter, novel } = input;
  const contextPackage = buildPreviewGenerationContextPackage({ novel, chapter });
  const bookContract = buildBookContractContext({
    title: novel.title,
    targetAudience: novel.targetAudience,
    sellingPoint: novel.bookSellingPoint,
    first30ChapterPromise: novel.first30ChapterPromise,
    narrativePov: novel.narrativePov,
    pacePreference: novel.pacePreference,
    emotionIntensity: novel.emotionIntensity,
    toneGuardrails: [novel.styleTone].filter((item): item is string => Boolean(item?.trim())),
    hardConstraints: [chapter.mustAvoid].filter((item): item is string => Boolean(item?.trim())),
  });

  return buildChapterWriteContext({
    bookContract,
    macroConstraints: null,
    volumeWindow: null,
    contextPackage,
  });
}

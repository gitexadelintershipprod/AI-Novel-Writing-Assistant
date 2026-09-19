import type {
  CreativeHubNovelSetupChecklistItem,
  CreativeHubNovelSetupStage,
  CreativeHubNovelSetupStatus,
} from "@ai-novel/shared/types/creativeHub";
import { prisma } from "../../db/prisma";
import { normalizeWorldStructuredData } from "../world/worldStructure";

type NovelSetupSource = {
  id: string;
  title: string;
  description: string | null;
  projectMode:
    | "ai_led"
    | "co_pilot"
    | "draft_mode"
    | "auto_pipeline"
    | null;
  narrativePov: "first_person" | "third_person" | "mixed" | null;
  pacePreference: "slow" | "balanced" | "fast" | null;
  styleTone: string | null;
  emotionIntensity: "low" | "medium" | "high" | null;
  aiFreedom: "low" | "medium" | "high" | null;
  primaryStoryMode: { name: string } | null;
  secondaryStoryMode: { name: string } | null;
  defaultChapterLength: number | null;
  outline: string | null;
  structuredOutline: string | null;
  genre: { name: string } | null;
  world: { id: string; name: string } | null;
  novelWorld: {
    title: string | null;
    coverSummary: string | null;
    sourceType: string;
    sourceWorldId: string | null;
    structuredDataJson: string | null;
    storySliceJson: string | null;
  } | null;
  bible: {
    coreSetting: string | null;
    forbiddenRules: string | null;
    mainPromise: string | null;
    characterArcs: string | null;
    worldRules: string | null;
  } | null;
  _count: {
    characters: number;
    chapters: number;
  };
};

type NovelWorldSetupRow = NovelSetupSource["novelWorld"];

function hasText(value: string | null | undefined): boolean {
  return Boolean(value?.trim());
}

function compactText(value: string | null | undefined, maxLength = 72): string | null {
  const normalized = value?.replace(/\s+/g, " ").trim();
  if (!normalized) {
    return null;
  }
  return normalized.length > maxLength ? `${normalized.slice(0, maxLength)}...` : normalized;
}

function joinCurrentValues(values: Array<string | null | undefined>): string | null {
  const normalized = values.map((item) => item?.trim()).filter((item): item is string => Boolean(item));
  return normalized.length > 0 ? normalized.join(" / ") : null;
}

function parseJson(value: string | null | undefined): unknown {
  if (!value?.trim()) {
    return null;
  }
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function buildNovelWorldSetupSignal(novelWorld: NovelSetupSource["novelWorld"]) {
  if (!novelWorld) {
    return {
      hasWorld: false,
      hasRules: false,
      title: null,
      summary: null,
      rulePreview: null,
    };
  }

  const structure = normalizeWorldStructuredData(parseJson(novelWorld.structuredDataJson));
  const hasProfile = [
    structure.profile.identity,
    structure.profile.summary,
    structure.profile.tone,
    novelWorld.title,
    novelWorld.coverSummary,
  ].some(hasText);
  const hasWorldContent = hasProfile
    || structure.factions.length > 0
    || structure.forces.length > 0
    || structure.locations.length > 0
    || hasText(novelWorld.storySliceJson);
  const firstRule = structure.rules.axioms[0];
  const rulePreview = compactText([
    structure.rules.summary,
    firstRule ? [firstRule.name, firstRule.summary].filter(Boolean).join("：") : null,
    structure.rules.taboo[0],
    structure.rules.sharedConsequences[0],
  ].find(hasText), 56);
  const hasRules = hasText(novelWorld.storySliceJson)
    || hasText(structure.rules.summary)
    || structure.rules.axioms.length > 0
    || structure.rules.taboo.length > 0
    || structure.rules.sharedConsequences.length > 0;

  return {
    hasWorld: hasWorldContent,
    hasRules,
    title: novelWorld.title ?? structure.profile.identity ?? null,
    summary: compactText(novelWorld.coverSummary ?? structure.profile.summary, 56),
    rulePreview,
  };
}

function projectModeLabel(value: NovelSetupSource["projectMode"]): string | null {
  switch (value) {
    case "ai_led":
      return "AI-led";
    case "co_pilot":
      return "Human-machine collaboration";
    case "draft_mode":
      return "Draft first";
    case "auto_pipeline":
      return "Automatic assembly line";
    default:
      return null;
  }
}

function narrativePovLabel(value: NovelSetupSource["narrativePov"]): string | null {
  switch (value) {
    case "first_person":
      return "first person";
    case "third_person":
      return "third person";
    case "mixed":
      return "mixed perspective";
    default:
      return null;
  }
}

function pacePreferenceLabel(value: NovelSetupSource["pacePreference"]): string | null {
  switch (value) {
    case "slow":
      return "slow pace";
    case "balanced":
      return "balanced rhythm";
    case "fast":
      return "fast paced";
    default:
      return null;
  }
}

function emotionIntensityLabel(value: NovelSetupSource["emotionIntensity"]): string | null {
  switch (value) {
    case "low":
      return "Low emotion intensity";
    case "medium":
      return "Medium emotion intensity";
    case "high":
      return "High emotion intensity";
    default:
      return null;
  }
}

function aiFreedomLabel(value: NovelSetupSource["aiFreedom"]): string | null {
  switch (value) {
    case "low":
      return "Low AI freedom";
    case "medium":
      return "Medium AI freedom";
    case "high":
      return "High AI freedom";
    default:
      return null;
  }
}

function withStatus(input: {
  key: CreativeHubNovelSetupChecklistItem["key"];
  label: string;
  status: CreativeHubNovelSetupChecklistItem["status"];
  summary: string;
  currentValue?: string | null;
  requiredForProduction?: boolean;
  recommendedAction?: string;
  optionPrompt?: string;
}): CreativeHubNovelSetupChecklistItem {
  return {
    key: input.key,
    label: input.label,
    status: input.status,
    summary: input.summary,
    currentValue: input.currentValue ?? null,
    requiredForProduction: input.requiredForProduction ?? false,
    ...(input.recommendedAction ? { recommendedAction: input.recommendedAction } : {}),
    ...(input.optionPrompt ? { optionPrompt: input.optionPrompt } : {}),
  };
}

function buildChecklist(novel: NovelSetupSource): CreativeHubNovelSetupChecklistItem[] {
  const novelWorldSignal = buildNovelWorldSetupSignal(novel.novelWorld);
  const premiseLength = novel.description?.trim().length ?? 0;
  const premiseStatus = premiseLength >= 80 ? "ready" : premiseLength > 0 ? "partial" : "missing";
  const storyPromiseStatus = hasText(novel.bible?.mainPromise)
    ? "ready"
    : premiseLength >= 80
      ? "partial"
      : "missing";
  const directionSignals = [Boolean(novel.genre?.name), hasText(novel.styleTone)].filter(Boolean).length;
  const storyModeSignals = [Boolean(novel.primaryStoryMode?.name), Boolean(novel.secondaryStoryMode?.name)].filter(Boolean).length;
  const narrativeSignals = [Boolean(novel.narrativePov), Boolean(novel.pacePreference)].filter(Boolean).length;
  const productionSignals = [
    Boolean(novel.projectMode),
    Boolean(novel.emotionIntensity),
    Boolean(novel.aiFreedom),
  ].filter(Boolean).length;
  const chapterScaleStatus = typeof novel.defaultChapterLength === "number" && novel.defaultChapterLength > 0
    ? "ready"
    : novel._count.chapters > 0 || hasText(novel.structuredOutline)
      ? "partial"
      : "missing";
  const worldStatus = novelWorldSignal.hasWorld
    ? "ready"
    : novel.novelWorld || novel.world
      ? "partial"
      : hasText(novel.bible?.coreSetting)
        ? "partial"
        : "missing";
  const hasBibleWorldRuleNotes = hasText(novel.bible?.worldRules) || hasText(novel.bible?.forbiddenRules);
  const worldRulesStatus = novelWorldSignal.hasRules
    ? "ready"
    : novelWorldSignal.hasWorld || novel.novelWorld || novel.world || hasText(novel.bible?.coreSetting) || hasBibleWorldRuleNotes
        ? "partial"
        : "missing";
  const characterStatus = novel._count.characters > 0
    ? "ready"
    : hasText(novel.bible?.characterArcs)
      ? "partial"
      : "missing";
  const outlineStatus = novel.structuredOutline?.trim()
    ? "ready"
    : novel._count.chapters > 0 || hasText(novel.outline)
      ? "partial"
      : "missing";

  return [
    withStatus({
      key: "premise",
      label: "core settings",
      status: premiseStatus,
      summary: premiseStatus === "ready"
        ? "The protagonist, conflict, and story goal are clear."
        : premiseStatus === "partial"
          ? "A synopsis exists, but the conflict and story promise are still not stable enough."
          : "A clear one-sentence setup is still missing. First say the protagonist, conflict, and goal.",
      currentValue: compactText(novel.description),
      requiredForProduction: true,
      recommendedAction: "Fill in this novel's core setup first: protagonist, core conflict, goal, and genre promise, in a version that can go straight into the synopsis.",
      optionPrompt: "Using the current title and known information, offer 3 core-setting options for this novel. Each must include the protagonist, core conflict, goal, and genre tone.",
    }),
    withStatus({
      key: "story_promise",
      label: "story promise",
      status: storyPromiseStatus,
      summary: storyPromiseStatus === "ready"
        ? "The main hook, emotional landing, and reader expectation are clear."
        : storyPromiseStatus === "partial"
          ? "A basic setup exists, but the main promise and reading expectation are still not sharp enough."
          : "This book still needs its core story promise and reading expectation.",
      currentValue: compactText(novel.bible?.mainPromise ?? novel.description),
      requiredForProduction: true,
      recommendedAction: "Using the current setup, fill in this book's story promise: main hook, emotional path, ending expectation, and why readers would keep going.",
      optionPrompt: "Using the current setup, offer 3 story-promise options for this novel. Each must explain the hook, emotional path, and reader expectation.",
    }),
    withStatus({
      key: "direction",
      label: "Genre and style",
      status: directionSignals >= 2 ? "ready" : directionSignals === 1 ? "partial" : "missing",
      summary: directionSignals >= 2
        ? "Genre type and style tone are set."
        : directionSignals === 1
          ? "Some direction information exists. Fill in genre or style tone."
          : "Genre and style tone are not clear yet.",
      currentValue: joinCurrentValues([novel.genre?.name ?? null, compactText(novel.styleTone, 36)]),
      requiredForProduction: true,
      recommendedAction: "Give this novel clear genre tags and style tone. Say whether it leans hot-blooded, mystery, healing, dark, or light, and add one style sentence.",
      optionPrompt: "Using the current setup, offer 3 genre-and-style combinations for this novel, and say what each one feels like for readers.",
    }),
    withStatus({
      key: "story_mode",
      label: "Story mode",
      status: storyModeSignals >= 2 ? "ready" : storyModeSignals === 1 ? "partial" : "missing",
      summary: storyModeSignals >= 2
        ? "Main and supporting story modes are set, so later planning has a stable control axis."
        : storyModeSignals === 1
          ? "Some story modes are set. Fill in at least the main mode so later planning stays stable."
          : "This book has not defined what it advances on, what it pays off, or its conflict bounds.",
      currentValue: joinCurrentValues([novel.primaryStoryMode?.name ?? null, novel.secondaryStoryMode?.name ?? null]),
      requiredForProduction: true,
      recommendedAction: "Set this novel's main story mode first, and add a supporting mode if needed. That lets the system keep later story planning, character design, and volume/chapter generation on track.",
      optionPrompt: "Using the current genre, selling point, and first-30-chapters promise, offer 3 main-and-supporting story-mode combinations. Explain each one's advance logic, reader payoff, and conflict bounds.",
    }),
    withStatus({
      key: "narrative",
      label: "Narrative setup",
      status: narrativeSignals >= 2 ? "ready" : narrativeSignals > 0 ? "partial" : "missing",
      summary: narrativeSignals >= 2
        ? "Point of view and pacing preference are set."
        : narrativeSignals > 0
          ? "Some narrative settings exist. Fill in point of view and pacing."
          : "Point of view and pacing are not set yet.",
      currentValue: joinCurrentValues([
        narrativePovLabel(novel.narrativePov),
        pacePreferenceLabel(novel.pacePreference),
      ]),
      requiredForProduction: true,
      recommendedAction: "Decide which point of view and pacing fit this book best, and briefly say why.",
      optionPrompt: "Using the current genre and setup, offer 3 narrative-setup options. Each must include point of view and pacing, plus pros and cons.",
    }),
    withStatus({
      key: "production_preferences",
      label: "Production preferences",
      status: productionSignals >= 3 ? "ready" : productionSignals > 0 ? "partial" : "missing",
      summary: productionSignals >= 3
        ? "Collaboration style, emotion intensity, and AI freedom are set."
        : productionSignals > 0
          ? "Some production preferences exist, but they are not stable yet."
          : "Collaboration mode, emotion intensity, and AI freedom are not set yet.",
      currentValue: joinCurrentValues([
        projectModeLabel(novel.projectMode),
        emotionIntensityLabel(novel.emotionIntensity),
        aiFreedomLabel(novel.aiFreedom),
      ]),
      requiredForProduction: true,
      recommendedAction: "Fill in this novel's production preferences: collaboration mode, emotion intensity, and AI freedom. Say what must stay conservative and what can open up.",
      optionPrompt: "Using the current genre and goal, offer 3 production-preference options. Each must include collaboration mode, emotion intensity, and AI freedom.",
    }),
    withStatus({
      key: "chapter_scale",
      label: "Chapter specs",
      status: chapterScaleStatus,
      summary: chapterScaleStatus === "ready"
        ? "Default chapter length and chapter grain are clear."
        : chapterScaleStatus === "partial"
          ? "A chapter plan exists, but the default chapter length is not confirmed yet."
          : "Approximate chapter length and chapter grain are not confirmed yet.",
      currentValue: typeof novel.defaultChapterLength === "number" && novel.defaultChapterLength > 0
        ? `Default chapter length is about ${novel.defaultChapterLength} characters`
        : novel._count.chapters > 0
          ? `${novel._count.chapters} chapters already exist in the table of contents`
          : null,
      requiredForProduction: true,
      recommendedAction: "Using genre and pacing, confirm this book's default chapter-length range, and whether a chapter leans more toward events, emotion, or information reveal.",
      optionPrompt: "Using the current genre and pacing, offer 3 chapter-spec options. Each must include a suggested chapter length and how a chapter should advance.",
    }),
    withStatus({
      key: "world",
      label: "World foundation",
      status: worldStatus,
      summary: worldStatus === "ready"
        ? `This book's world${novelWorldSignal.title ? ` "${novelWorldSignal.title}"` : ""} is already organized as a handbook.`
        : worldStatus === "partial"
          ? "A world seed exists. Consider organizing it into this book's world handbook."
          : "A world seed or basic stage information is still missing.",
      currentValue: novelWorldSignal.title
        ?? novelWorldSignal.summary
        ?? novel.world?.name
        ?? compactText(novel.bible?.coreSetting, 48),
      requiredForProduction: true,
      recommendedAction: "First fill in this book's world: the story stage, era, basic rules, and environment that will shape the main conflict.",
      optionPrompt: "Using the current genre and core settings, offer 3 world-foundation options for this novel, and say what conflict potential each one has.",
    }),
    withStatus({
      key: "world_rules",
      label: "Rule boundaries",
      status: worldRulesStatus,
      summary: worldRulesStatus === "ready"
        ? "This book's world handbook already has rule bounds you can follow."
        : worldRulesStatus === "partial"
          ? hasBibleWorldRuleNotes
            ? "Rule notes already exist. Consider folding them into this book's world handbook."
            : "A world frame exists. Fill in the key rules and taboos."
          : "World rules or taboos that constrain the plot have not been extracted yet.",
      currentValue: novelWorldSignal.rulePreview
        ?? compactText(novel.bible?.worldRules ?? novel.bible?.forbiddenRules, 56),
      requiredForProduction: false,
      recommendedAction: "From this book's world handbook, extract the world rules, taboos, and hard bounds that must be followed, especially those that directly affect plot advance and character action.",
      optionPrompt: "Using the current setup, offer 3 world-rule-and-taboo options. Each must say how it will affect the plot.",
    }),
    withStatus({
      key: "characters",
      label: "Role basics",
      status: characterStatus,
      summary: characterStatus === "ready"
        ? `${novel._count.characters} characters are already in this novel.`
        : characterStatus === "partial"
          ? "Character-arc notes exist, but there is not yet a stable character list."
          : "There is no protagonist or core-character draft yet.",
      currentValue: novel._count.characters > 0
        ? `${novel._count.characters} characters`
        : compactText(novel.bible?.characterArcs, 48),
      requiredForProduction: true,
      recommendedAction: "First organize this novel's protagonist and core characters. At least make role, goal, obstacle, and conflicts with each other clear.",
      optionPrompt: "Using the current setup, offer 3 core-cast options. Each must describe the protagonist, opponent, and key relationships.",
    }),
    withStatus({
      key: "outline",
      label: "Outline and chapter plan",
      status: outlineStatus,
      summary: outlineStatus === "ready"
        ? "A structured outline or executable chapter plan already exists."
        : outlineStatus === "partial"
          ? "A story direction exists, but it has not been split into a stable chapter plan."
          : "There is no executable outline or chapter plan yet.",
      currentValue: novel.structuredOutline?.trim()
        ? "A structured outline was generated"
        : novel.outline?.trim()
          ? "Story direction generated"
          : novel._count.chapters > 0
            ? `${novel._count.chapters} chapters already exist in the table of contents`
            : null,
      requiredForProduction: true,
      recommendedAction: "Turn the current setup into an executable outline and split a chapter plan. At least make the opening, early/mid/late turns, and ending landing clear.",
      optionPrompt: "Using the current setup, offer 3 outline-advance plans, and explain the chapter pacing of each one."
    }),
  ];
}

function buildStage(checklist: CreativeHubNovelSetupChecklistItem[]): CreativeHubNovelSetupStage {
  const requiredItems = checklist.filter((item) => item.requiredForProduction);
  if (requiredItems.length > 0 && requiredItems.every((item) => item.status === "ready")) {
    return "ready_for_production";
  }

  const byKey = Object.fromEntries(checklist.map((item) => [item.key, item])) as Record<
    CreativeHubNovelSetupChecklistItem["key"],
    CreativeHubNovelSetupChecklistItem
  >;

  if (
    byKey.premise.status !== "missing"
    && byKey.direction.status !== "missing"
    && byKey.story_mode.status !== "missing"
    && byKey.narrative.status !== "missing"
    && byKey.story_promise.status !== "missing"
  ) {
    return "ready_for_planning";
  }

  return "setup_in_progress";
}

function weightedCompletion(checklist: CreativeHubNovelSetupChecklistItem[]): number {
  const total = checklist.reduce((sum, item) => {
    if (item.status === "ready") return sum + 1;
    if (item.status === "partial") return sum + 0.5;
    return sum;
  }, 0);
  return Math.round((total / checklist.length) * 100);
}

function buildNextStep(checklist: CreativeHubNovelSetupChecklistItem[], stage: CreativeHubNovelSetupStage) {
  const next = checklist.find((item) => item.requiredForProduction && item.status !== "ready")
    ?? checklist.find((item) => item.status !== "ready");
  if (!next) {
    return {
      nextQuestion: "Setup is mostly done. Do you want to check the outline, add details, or start full-book production now?",
      recommendedAction: "First summarize this book's current setup, then give me three next-step options: add details, review the outline, or start full production.",
    };
  }

  switch (next.key) {
    case "premise":
      return {
        nextQuestion: "Who is this book about, what conflict do they hit, and where should the story end up?",
        recommendedAction: "First fill in this book's one-sentence setup: protagonist, core conflict, and story promise.",
      };
    case "story_promise":
      return {
        nextQuestion: "What should readers look forward to, and what feeling should remain after they finish?",
        recommendedAction: "Fill in this book's story promise, emotional landing, and reading expectation first.",
      };
    case "direction":
      return {
        nextQuestion: "What genre and tone do you want this book to have?",
        recommendedAction: "Using the current title and setup, fill in this book's genre and style tone first.",
      };
    case "story_mode":
      return {
        nextQuestion: "First confirm what this book advances on, what it pays off, and where the conflict ceiling should sit.",
        recommendedAction: "Fill in the main story mode first, and add a supporting mode if needed, so later planning and generation stay on track.",
      };
    case "narrative":
      return {
        nextQuestion: "Which point of view, pacing, and collaboration style fit this book best?",
        recommendedAction: "Help me set this book's point of view, pacing preference, and collaboration mode.",
      };
    case "production_preferences":
      return {
        nextQuestion: "How far should AI open up for this book, where should emotion intensity be held down, and what must stay conservative?",
        recommendedAction: "Set collaboration mode, emotion intensity, and AI freedom first, then continue production prep.",
      };
    case "chapter_scale":
      return {
        nextQuestion: "About how long should a chapter be, and should a chapter lean more toward events or emotion?",
        recommendedAction: "Confirm the default chapter length and chapter grain first so later production does not drift too far.",
      };
    case "world":
      return {
        nextQuestion: "What kind of world does the story take place in? Should we start with a world seed?",
        recommendedAction: "Using the current setup, add a world seed for this book first and spell out the key rules.",
      };
    case "world_rules":
      return {
        nextQuestion: "Which rules, taboos, or costs in this world must never be broken?",
        recommendedAction: "Organize world rules and taboos first, and make clear which bounds will directly affect the plot.",
      };
    case "characters":
      return {
        nextQuestion: "Who is the protagonist, what do they want most, and what will stop them?",
        recommendedAction: "Organize a draft of this book's protagonist and core cast first. At least make role and conflict relations clear.",
      };
    case "outline":
      return {
        nextQuestion: stage === "ready_for_planning"
          ? "The setup is enough. Want to split it into an outline and chapter plan first?"
          : "Want to turn the current setup into an executable outline first?",
        recommendedAction: "Using the current setup, generate this book's outline first and split it into a chapter plan.",
      };
    default:
      return {
        nextQuestion: "Which part of the setup do you want to fill in first?",
        recommendedAction: "First summarize what is still missing, then give me a minimum setup plan.",
      };
  }
}

export function buildStatus(novel: NovelSetupSource): CreativeHubNovelSetupStatus {
  const checklist = buildChecklist(novel);
  const stage = buildStage(checklist);
  const completedCount = checklist.filter((item) => item.status === "ready").length;
  const totalCount = checklist.length;
  const { nextQuestion, recommendedAction } = buildNextStep(checklist, stage);

  return {
    novelId: novel.id,
    title: novel.title,
    stage,
    completionRatio: weightedCompletion(checklist),
    completedCount,
    totalCount,
    missingItems: checklist.filter((item) => item.status !== "ready").map((item) => item.label),
    nextQuestion,
    recommendedAction,
    checklist,
  };
}

export class NovelSetupStatusService {
  async getNovelSetupStatus(novelId: string): Promise<CreativeHubNovelSetupStatus | null> {
    const novel = await prisma.novel.findUnique({
      where: { id: novelId },
      select: {
        id: true,
        title: true,
        description: true,
        projectMode: true,
        narrativePov: true,
        pacePreference: true,
        styleTone: true,
        emotionIntensity: true,
        aiFreedom: true,
        primaryStoryMode: {
          select: {
            name: true,
          },
        },
        secondaryStoryMode: {
          select: {
            name: true,
          },
        },
        defaultChapterLength: true,
        outline: true,
        structuredOutline: true,
        genre: {
          select: {
            name: true,
          },
        },
        world: {
          select: {
            id: true,
            name: true,
          },
        },
        bible: {
          select: {
            coreSetting: true,
            forbiddenRules: true,
            mainPromise: true,
            characterArcs: true,
            worldRules: true,
          },
        },
        _count: {
          select: {
            characters: true,
            chapters: true,
          },
        },
      },
    });

    if (!novel) {
      return null;
    }

    const [novelWorld = null] = await prisma.$queryRaw<NovelWorldSetupRow[]>`
      SELECT
        "title",
        "coverSummary",
        "sourceType",
        "sourceWorldId",
        "structuredDataJson",
        "storySliceJson"
      FROM "NovelWorld"
      WHERE "novelId" = ${novelId}
      LIMIT 1
    `;

    return buildStatus({
      ...novel,
      novelWorld,
    });
  }
}

export const novelSetupStatusService = new NovelSetupStatusService();

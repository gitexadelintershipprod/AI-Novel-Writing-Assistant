import type { StoryMacroField, StoryMacroFieldValue, StoryMacroPlan } from "@ai-novel/shared/types/storyMacro";
import type { NovelStoryMode } from "@ai-novel/shared/types/storyMode";
import { buildBookFramingSummary } from "../bookFraming";
import { buildStoryModePromptBlock } from "../../storyMode/storyModeProfile";
import {
  EMPTY_DECOMPOSITION,
  EMPTY_EXPANSION,
  type StoryMacroEditablePlan,
  normalizeConflictLayers,
  normalizeConstraints,
  normalizeDecomposition,
  normalizeExpansion,
} from "./storyMacroPlanUtils";

export interface StoryMacroNovelContext {
  id: string;
  title: string;
  targetAudience: string | null;
  bookSellingPoint: string | null;
  competingFeel: string | null;
  first30ChapterPromise: string | null;
  commercialTagsJson: string | null;
  styleTone: string | null;
  narrativePov: string | null;
  pacePreference: string | null;
  emotionIntensity: string | null;
  estimatedChapterCount: number | null;
  genre: { name: string } | null;
  primaryStoryMode: NovelStoryMode | null;
  secondaryStoryMode: NovelStoryMode | null;
}

export function formatProjectContext(novel: StoryMacroNovelContext, worldSliceContext = ""): string {
  const bookFramingSummary = buildBookFramingSummary(novel);
  const storyModeBlock = buildStoryModePromptBlock({
    primary: novel.primaryStoryMode,
    secondary: novel.secondaryStoryMode,
  });

  return [
    novel.title ? `Project title: ${novel.title}` : "",
    novel.genre?.name ? `Genre foundation: ${novel.genre.name}` : "",
    bookFramingSummary ? `Book-level framing:\n${bookFramingSummary}` : "",
    storyModeBlock,
    novel.styleTone ? `Style tendency: ${novel.styleTone}` : "",
    novel.narrativePov ? `Narrative point of view: ${novel.narrativePov}` : "",
    novel.pacePreference ? `Pace preference: ${novel.pacePreference}` : "",
    novel.emotionIntensity ? `Emotional intensity: ${novel.emotionIntensity}` : "",
    novel.estimatedChapterCount ? `Estimated chapter count: ${novel.estimatedChapterCount}` : "",
    worldSliceContext.trim(),
  ].filter(Boolean).join("\n");
}

export function toEditablePlan(plan: StoryMacroPlan | null | undefined): StoryMacroEditablePlan {
  return {
    expansion: normalizeExpansion(plan?.expansion ?? EMPTY_EXPANSION),
    decomposition: normalizeDecomposition(plan?.decomposition ?? EMPTY_DECOMPOSITION),
    constraints: normalizeConstraints(plan?.constraints ?? []),
  };
}

function normalizeStringList(value: unknown, maxItems: number): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter(Boolean)
    .slice(0, maxItems);
}

export function normalizeRegeneratedFieldValue(field: StoryMacroField, value: unknown): StoryMacroFieldValue {
  if (field === "conflict_layers") {
    const layers = normalizeConflictLayers(value);
    if (!layers.external || !layers.internal || !layers.relational) {
      throw new Error("The AI did not return every required conflict layer.");
    }
    return layers;
  }
  if (field === "major_payoffs" || field === "setpiece_seeds" || field === "constraints") {
    const arrayValue = field === "constraints"
      ? normalizeConstraints(value)
      : normalizeStringList(value, field === "setpiece_seeds" ? 3 : 5);
    if (arrayValue.length === 0) {
      throw new Error(`The AI did not return a valid ${field} list.`);
    }
    return arrayValue;
  }
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`The AI did not return a valid ${field} value.`);
  }
  return value.trim();
}

import type { TitleFactorySuggestion, TitleSuggestionStyle } from "@ai-novel/shared/types/title";
import {
  countGeorgianWords,
  countUnicodeCodePoints,
  tokenizeGeorgianWords,
  truncateGeorgianWords,
} from "@ai-novel/shared/utils/georgianTextMetrics";

export type TitleGenerationMode = "brief" | "adapt" | "novel";

export interface TitlePromptContext {
  mode: TitleGenerationMode;
  selectionMode: "pool" | "primary";
  count: number;
  brief: string;
  referenceTitle: string;
  novelTitle: string;
  currentTitle: string;
  genreName: string;
  genreDescription: string;
}

type TitleSuggestionHookType =
  | "identity_gap"
  | "abnormal_situation"
  | "power_mutation"
  | "rule_hook"
  | "direct_conflict"
  | "high_concept";

export type TitleSurfaceFrame =
  | "colon_split"
  | "comma_split"
  | "question"
  | "conditional_open"
  | "first_person_open"
  | "possessive_open"
  | "plain_phrase";

interface NormalizedTitleSuggestion extends TitleFactorySuggestion {
  surfaceFrame: TitleSurfaceFrame;
}

const STYLE_ALIASES: Record<string, TitleSuggestionStyle> = {
  literary: "literary",
  narrative: "literary",
  emotion: "literary",
  conflict: "conflict",
  explosive: "conflict",
  reversal: "conflict",
  suspense: "suspense",
  mystery: "suspense",
  thriller: "suspense",
  high_concept: "high_concept",
  highconcept: "high_concept",
  concept: "high_concept",
  setting: "high_concept",
  worldbuilding: "high_concept",
  hook: "high_concept",
};

const HOOK_TYPE_TO_STYLE: Record<TitleSuggestionHookType, TitleSuggestionStyle> = {
  identity_gap: "conflict",
  abnormal_situation: "suspense",
  power_mutation: "high_concept",
  rule_hook: "suspense",
  direct_conflict: "conflict",
  high_concept: "high_concept",
};

const QUESTION_OPENING_PATTERN = /^(ვინ|რა|რატომ|როგორ|როდის|სად)(?:\s|$)/iu;
const CONDITIONAL_OPENING_PATTERN = /^(თუ|როცა|როდესაც|სანამ|ვიდრე)(?:\s|$)/iu;
const FIRST_PERSON_OPENING_PATTERN = /^(მე|ჩვენ)(?:\s|$)/iu;
const POSSESSIVE_OPENING_PATTERN = /^(ჩემი|ჩვენი)(?:\s|$)/iu;

export const DEFAULT_TITLE_COUNT = 12;
export const MIN_TITLE_COUNT = 3;
export const MAX_TITLE_COUNT = 24;

export function toTrimmedString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

export function readMessageContent(content: unknown): string {
  if (typeof content === "string") {
    return content;
  }
  if (!Array.isArray(content)) {
    return JSON.stringify(content ?? "");
  }
  return content.map((part) => {
    if (typeof part === "string") {
      return part;
    }
    if (typeof part === "object" && part !== null && "text" in part) {
      return toTrimmedString((part as { text?: unknown }).text);
    }
    return JSON.stringify(part);
  }).join("");
}

export function extractJsonPayload(source: string): string {
  const normalized = source.replace(/```json|```/gi, "").trim();
  const firstBrace = normalized.indexOf("{");
  const lastBrace = normalized.lastIndexOf("}");
  const firstBracket = normalized.indexOf("[");
  const lastBracket = normalized.lastIndexOf("]");

  if (firstBracket >= 0 && lastBracket > firstBracket && (firstBrace < 0 || firstBracket < firstBrace)) {
    return normalized.slice(firstBracket, lastBracket + 1);
  }
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    return normalized.slice(firstBrace, lastBrace + 1);
  }
  throw new Error("The model output could not be parsed as valid JSON.");
}

export function normalizeRequestedCount(value: unknown, fallback = DEFAULT_TITLE_COUNT): number {
  const numeric = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(numeric)) {
    return fallback;
  }
  return Math.min(MAX_TITLE_COUNT, Math.max(MIN_TITLE_COUNT, Math.floor(numeric)));
}

export function clampClickRate(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return 72;
  }
  return Math.min(99, Math.max(35, Math.round(value)));
}

function normalizeHookType(value: unknown): TitleSuggestionHookType | null {
  const key = toTrimmedString(value).toLowerCase().replace(/[\s-]+/g, "_");
  if (!key) {
    return null;
  }
  if (Object.prototype.hasOwnProperty.call(HOOK_TYPE_TO_STYLE, key)) {
    return key as TitleSuggestionHookType;
  }
  return null;
}

export function normalizeStyle(value: unknown, hookType?: unknown): TitleSuggestionStyle {
  const key = toTrimmedString(value).toLowerCase().replace(/[\s-]+/g, "_");
  if (key && STYLE_ALIASES[key]) {
    return STYLE_ALIASES[key];
  }

  const normalizedHookType = normalizeHookType(hookType);
  if (normalizedHookType) {
    return HOOK_TYPE_TO_STYLE[normalizedHookType];
  }

  return "high_concept";
}

export function normalizeTitle(raw: string): string {
  return raw
    .replace(/^[\d.\-\s、]+/u, "")
    .replace(/^["'“”‘’《》〈〉「」『』【】]+|["'“”‘’《》〈〉「」『』【】]+$/gu, "")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeCompareKey(title: string): string {
  return normalizeTitle(title)
    .normalize("NFC")
    .replace(/[^\p{Letter}\p{Number}]+/gu, " ")
    .trim()
    .toLocaleLowerCase("ka-GE");
}

function normalizeShortText(value: unknown, maxWords: number, maxCodePoints: number): string | null {
  const text = toTrimmedString(value).replace(/\s+/g, " ");
  if (!text) {
    return null;
  }
  return truncateGeorgianWords(text, maxWords, maxCodePoints);
}

function buildCodePointNGramSet(source: string, size = 3): Set<string> {
  const normalized = Array.from(normalizeCompareKey(source).replace(/\s+/g, ""));
  if (normalized.length === 0) {
    return new Set<string>();
  }
  if (normalized.length <= size) {
    return new Set<string>([normalized.join("")]);
  }
  const grams = new Set<string>();
  for (let index = 0; index <= normalized.length - size; index += 1) {
    grams.add(normalized.slice(index, index + size).join(""));
  }
  return grams;
}

function jaccardSimilarity(left: Set<string>, right: Set<string>): number {
  if (left.size === 0 || right.size === 0) {
    return 0;
  }
  let intersection = 0;
  for (const item of left) {
    if (right.has(item)) {
      intersection += 1;
    }
  }
  const union = left.size + right.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

export function detectTitleSurfaceFrame(title: string): TitleSurfaceFrame {
  const normalized = normalizeTitle(title).normalize("NFC");
  if (!normalized) {
    return "plain_phrase";
  }
  if (normalized.endsWith("?") || normalized.endsWith("؟") || QUESTION_OPENING_PATTERN.test(normalized)) {
    return "question";
  }
  if (normalized.includes(":")) {
    return "colon_split";
  }
  if (normalized.includes(",")) {
    return "comma_split";
  }
  if (CONDITIONAL_OPENING_PATTERN.test(normalized)) {
    return "conditional_open";
  }
  if (FIRST_PERSON_OPENING_PATTERN.test(normalized)) {
    return "first_person_open";
  }
  if (POSSESSIVE_OPENING_PATTERN.test(normalized)) {
    return "possessive_open";
  }
  return "plain_phrase";
}

export function titleSimilarity(left: string, right: string): number {
  const leftWords = new Set(tokenizeGeorgianWords(normalizeCompareKey(left)));
  const rightWords = new Set(tokenizeGeorgianWords(normalizeCompareKey(right)));
  const wordSimilarity = jaccardSimilarity(leftWords, rightWords);
  const trigramSimilarity = jaccardSimilarity(buildCodePointNGramSet(left), buildCodePointNGramSet(right));
  return leftWords.size > 1 && rightWords.size > 1
    ? Math.max(wordSimilarity, trigramSimilarity * 0.85)
    : trigramSimilarity;
}

export function isNearDuplicateTitle(left: string, right: string): boolean {
  const leftKey = normalizeCompareKey(left);
  const rightKey = normalizeCompareKey(right);
  if (!leftKey || !rightKey) {
    return false;
  }
  if (leftKey === rightKey) {
    return true;
  }
  const leftWordCount = countGeorgianWords(leftKey);
  const rightWordCount = countGeorgianWords(rightKey);
  if ((leftKey.includes(rightKey) || rightKey.includes(leftKey)) && Math.abs(leftWordCount - rightWordCount) <= 1) {
    return true;
  }
  return titleSimilarity(leftKey, rightKey) >= 0.72;
}

function sanitizeSuggestion(value: unknown): NormalizedTitleSuggestion | null {
  if (typeof value !== "object" || value === null) {
    return null;
  }

  const record = value as {
    title?: unknown;
    clickRate?: unknown;
    score?: unknown;
    style?: unknown;
    hookType?: unknown;
    angle?: unknown;
    coreSell?: unknown;
    reason?: unknown;
  };

  const title = normalizeTitle(toTrimmedString(record.title));
  const wordCount = countGeorgianWords(title);
  if (!title || wordCount < 1 || wordCount > 10 || countUnicodeCodePoints(title) > 80) {
    return null;
  }

  return {
    title,
    clickRate: clampClickRate(record.clickRate ?? record.score),
    style: normalizeStyle(record.style, record.hookType),
    angle: normalizeShortText(record.angle ?? record.coreSell, 12, 120),
    reason: normalizeShortText(record.reason, 40, 320),
    surfaceFrame: detectTitleSurfaceFrame(title),
  };
}

function maximumPatternShare(targetCount: number): number {
  return Math.max(2, Math.ceil(targetCount * 0.4));
}

export function maximumFrameClusterSize(targetCount: number): number {
  return maximumPatternShare(targetCount);
}

export function minimumStyleVariety(count: number): number {
  return count >= 10 ? 4 : 3;
}

export function minimumStructuralVariety(count: number): number {
  if (count >= 12) {
    return 5;
  }
  if (count >= 8) {
    return 4;
  }
  if (count >= 5) {
    return 3;
  }
  return 2;
}

export function collectUniqueSuggestions(
  values: unknown[],
  count: number,
  blockedTitles: string[] = [],
  options: { preserveOrder?: boolean; enforceFrameDiversity?: boolean } = {},
): TitleFactorySuggestion[] {
  const blocked = blockedTitles.map((item) => normalizeTitle(item)).filter(Boolean);
  const suggestions: NormalizedTitleSuggestion[] = [];
  const frameCounts = new Map<TitleSurfaceFrame, number>();
  const maxPerFrame = maximumFrameClusterSize(count);

  for (const item of values) {
    const normalized = sanitizeSuggestion(item);
    if (!normalized) {
      continue;
    }
    if (blocked.some((blockedTitle) => isNearDuplicateTitle(blockedTitle, normalized.title))) {
      continue;
    }
    if (suggestions.some((existing) => isNearDuplicateTitle(existing.title, normalized.title))) {
      continue;
    }

    const currentFrameCount = frameCounts.get(normalized.surfaceFrame) ?? 0;
    if (options.enforceFrameDiversity !== false && currentFrameCount >= maxPerFrame) {
      continue;
    }

    suggestions.push(normalized);
    frameCounts.set(normalized.surfaceFrame, currentFrameCount + 1);

    if (suggestions.length >= count) {
      break;
    }
  }

  if (!options.preserveOrder) {
    suggestions.sort((left, right) => right.clickRate - left.clickRate);
  }

  return suggestions.map(({ surfaceFrame, ...suggestion }) => suggestion);
}

export function hasEnoughStyleVariety(items: TitleFactorySuggestion[], targetCount: number): boolean {
  const styles = new Set(items.map((item) => item.style));
  return styles.size >= minimumStyleVariety(targetCount);
}

export function hasEnoughStructuralVariety(items: TitleFactorySuggestion[], targetCount: number): boolean {
  if (items.length === 0) {
    return false;
  }

  const frameCounts = new Map<TitleSurfaceFrame, number>();
  for (const item of items) {
    const frame = detectTitleSurfaceFrame(item.title);
    frameCounts.set(frame, (frameCounts.get(frame) ?? 0) + 1);
  }

  const uniqueFrameCount = frameCounts.size;
  const dominantFrameCount = Math.max(...frameCounts.values());

  return uniqueFrameCount >= minimumStructuralVariety(targetCount)
    && dominantFrameCount <= maximumFrameClusterSize(targetCount);
}

import {
  countGeorgianWords,
  countUnicodeCodePoints,
  normalizeGeorgianText,
  tokenizeGeorgianWords,
} from "@ai-novel/shared/utils/georgianTextMetrics";

export type ChapterTitleSurfaceFrame =
  | "colon_split"
  | "comma_split"
  | "question_hook"
  | "conditional_open"
  | "first_person_open"
  | "possessive_open"
  | "plain_statement";

const ENABLE_CHAPTER_TITLE_DIVERSITY_VALIDATION = true;
const CHAPTER_TITLE_MAX_WORDS = 10;
const CHAPTER_TITLE_MAX_CODE_POINTS = 80;
const CHAPTER_TITLE_SOFT_SENTENCE_WORDS = 8;
const QUESTION_OPENING_PATTERN = /^(ვინ|რა|რატომ|როგორ|როდის|სად)(?:\s|$)/iu;
const CONDITIONAL_OPENING_PATTERN = /^(თუ|როცა|როდესაც|სანამ|ვიდრე)(?:\s|$)/iu;
const FIRST_PERSON_OPENING_PATTERN = /^(მე|ჩვენ)(?:\s|$)/iu;
const POSSESSIVE_OPENING_PATTERN = /^(ჩემი|ჩვენი)(?:\s|$)/iu;
const SYNOPSIS_CONNECTOR_PATTERN = /(?:^|\s)(მაგრამ|თუმცა|ამიტომ|შემდეგ|რადგან|ამავდროულად)(?:\s|$)/iu;

function normalizeChapterTitle(title: string): string {
  return normalizeGeorgianText(title)
    .replace(/^["'“”‘’《》〈〉「」『』【】]+|["'“”‘’《》〈〉「」『』【】]+$/gu, "")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/，/g, ",")
    .replace(/：/g, ":")
    .replace(/？/g, "?");
}

function normalizeCompareKey(title: string): string {
  return normalizeChapterTitle(title)
    .replace(/[^\p{Letter}\p{Number}]+/gu, " ")
    .trim()
    .toLocaleLowerCase("ka-GE");
}

function buildTrigrams(source: string): Set<string> {
  const codePoints = Array.from(normalizeCompareKey(source).replace(/\s+/g, ""));
  if (codePoints.length <= 3) {
    return new Set(codePoints.length > 0 ? [codePoints.join("")] : []);
  }
  const trigrams = new Set<string>();
  for (let index = 0; index <= codePoints.length - 3; index += 1) {
    trigrams.add(codePoints.slice(index, index + 3).join(""));
  }
  return trigrams;
}

function jaccardSimilarity(left: Set<string>, right: Set<string>): number {
  if (left.size === 0 || right.size === 0) {
    return 0;
  }
  let overlap = 0;
  for (const value of left) {
    if (right.has(value)) {
      overlap += 1;
    }
  }
  return overlap / (left.size + right.size - overlap);
}

function isNearDuplicate(left: string, right: string): boolean {
  const leftKey = normalizeCompareKey(left);
  const rightKey = normalizeCompareKey(right);
  if (!leftKey || !rightKey) {
    return false;
  }
  if (leftKey === rightKey) {
    return true;
  }
  const leftWords = new Set(tokenizeGeorgianWords(leftKey));
  const rightWords = new Set(tokenizeGeorgianWords(rightKey));
  const wordSimilarity = jaccardSimilarity(leftWords, rightWords);
  const trigramSimilarity = jaccardSimilarity(buildTrigrams(leftKey), buildTrigrams(rightKey));
  return Math.max(wordSimilarity, trigramSimilarity * 0.85) >= 0.72;
}

export function getChapterTitleCollisionIssue(
  reservedTitles: string[],
  candidateTitles: string[],
): string | null {
  for (const candidate of candidateTitles) {
    const normalized = normalizeChapterTitle(candidate);
    if (normalized && reservedTitles.some((reserved) => isNearDuplicate(reserved, normalized))) {
      return `Duplicate or near-duplicate chapter title: ${normalized}. Every chapter title must be distinct.`;
    }
  }
  return null;
}

export function isChapterTitleDuplicateIssue(message: string | null | undefined): boolean {
  return message?.includes("Duplicate or near-duplicate chapter title") ?? false;
}

function getChapterTitleBasicQualityIssue(title: string): string | null {
  const normalized = normalizeChapterTitle(title);
  if (!normalized) {
    return "Chapter title cannot be empty.";
  }
  if (FIRST_PERSON_OPENING_PATTERN.test(normalized) || POSSESSIVE_OPENING_PATTERN.test(normalized)) {
    return `Chapter titles must not use a first-person slogan or self-narration: ${normalized}. Use an objective event, place, conflict, discovery, or outcome.`;
  }
  const wordCount = countGeorgianWords(normalized);
  const codePointCount = countUnicodeCodePoints(normalized);
  if (wordCount > CHAPTER_TITLE_MAX_WORDS || codePointCount > CHAPTER_TITLE_MAX_CODE_POINTS) {
    return `Chapter title is too long: ${normalized}. Keep it within ${CHAPTER_TITLE_MAX_WORDS} words and ${CHAPTER_TITLE_MAX_CODE_POINTS} Unicode code points.`;
  }
  if (
    wordCount > CHAPTER_TITLE_SOFT_SENTENCE_WORDS
    && normalized.includes(",")
    && SYNOPSIS_CONNECTOR_PATTERN.test(normalized)
  ) {
    return `Chapter title reads like a plot synopsis: ${normalized}. Use a shorter objective title instead of a full causal sentence.`;
  }
  return null;
}

export function detectChapterTitleSurfaceFrame(title: string): ChapterTitleSurfaceFrame {
  const normalized = normalizeChapterTitle(title);
  if (!normalized) {
    return "plain_statement";
  }
  if (normalized.endsWith("?") || QUESTION_OPENING_PATTERN.test(normalized)) return "question_hook";
  if (normalized.includes(":")) return "colon_split";
  if (normalized.includes(",")) return "comma_split";
  if (CONDITIONAL_OPENING_PATTERN.test(normalized)) return "conditional_open";
  if (FIRST_PERSON_OPENING_PATTERN.test(normalized)) return "first_person_open";
  if (POSSESSIVE_OPENING_PATTERN.test(normalized)) return "possessive_open";
  return "plain_statement";
}

function maximumSingleFrameCount(titleCount: number): number {
  return Math.max(2, Math.ceil(Math.max(titleCount, 1) * 0.5));
}

function formatFrameLabel(frame: ChapterTitleSurfaceFrame): string {
  if (frame === "comma_split") return "a repeated comma-split pattern";
  if (frame === "colon_split") return "a repeated colon-split pattern";
  if (frame === "question_hook") return "a repeated question-hook pattern";
  if (frame === "conditional_open") return "a repeated conditional opening";
  if (frame === "first_person_open") return "a repeated first-person opening";
  if (frame === "possessive_open") return "a repeated possessive opening";
  return "a repeated plain-statement pattern";
}

export function getChapterTitleDiversityIssue(titles: string[]): string | null {
  if (!ENABLE_CHAPTER_TITLE_DIVERSITY_VALIDATION) return null;
  const normalizedTitles = titles.map(normalizeChapterTitle).filter(Boolean);
  for (const title of normalizedTitles) {
    const qualityIssue = getChapterTitleBasicQualityIssue(title);
    if (qualityIssue) return qualityIssue;
  }
  for (let left = 0; left < normalizedTitles.length; left += 1) {
    for (let right = left + 1; right < normalizedTitles.length; right += 1) {
      if (isNearDuplicate(normalizedTitles[left]!, normalizedTitles[right]!)) {
        return `Duplicate or near-duplicate chapter title: ${normalizedTitles[right]}. Every chapter title must be distinct.`;
      }
    }
  }
  if (normalizedTitles.length <= 1) return null;

  const frameCounts = new Map<ChapterTitleSurfaceFrame, number>();
  const examples = new Map<ChapterTitleSurfaceFrame, string[]>();
  let previousFrame: ChapterTitleSurfaceFrame | null = null;
  let currentCluster = 0;
  let longestCluster = 0;
  let clusteredFrame: ChapterTitleSurfaceFrame | null = null;
  for (const title of normalizedTitles) {
    const frame = detectChapterTitleSurfaceFrame(title);
    frameCounts.set(frame, (frameCounts.get(frame) ?? 0) + 1);
    const frameExamples = examples.get(frame) ?? [];
    if (frameExamples.length < 3) frameExamples.push(title);
    examples.set(frame, frameExamples);
    currentCluster = frame === previousFrame ? currentCluster + 1 : 1;
    previousFrame = frame;
    if (currentCluster > longestCluster) {
      longestCluster = currentCluster;
      clusteredFrame = frame;
    }
  }

  let dominantFrame: ChapterTitleSurfaceFrame = "plain_statement";
  let dominantCount = 0;
  for (const [frame, count] of frameCounts) {
    if (count > dominantCount) {
      dominantFrame = frame;
      dominantCount = count;
    }
  }
  if (dominantFrame !== "plain_statement" && dominantCount > maximumSingleFrameCount(normalizedTitles.length)) {
    return [
      `Chapter title structure is too concentrated: ${dominantCount}/${normalizedTitles.length} titles use ${formatFrameLabel(dominantFrame)}.`,
      ` Examples: ${(examples.get(dominantFrame) ?? []).join(", ")}.`,
      " Mix objective action, conflict, discovery, outcome, decision, relationship-change, and question-hook titles.",
    ].join("");
  }
  if (longestCluster > 3 && clusteredFrame && clusteredFrame !== "plain_statement") {
    return `Adjacent chapter title structures are too repetitive: ${longestCluster} consecutive titles use ${formatFrameLabel(clusteredFrame)}.`;
  }
  return null;
}

export function isChapterTitleDiversityIssue(message: string | null | undefined): boolean {
  const normalized = message?.trim() ?? "";
  return normalized.includes("Chapter title structure is too concentrated")
    || normalized.includes("Adjacent chapter title structures are too repetitive")
    || normalized.includes("Duplicate or near-duplicate chapter title")
    || normalized.includes("Chapter titles must not use a first-person")
    || normalized.includes("Chapter title is too long")
    || normalized.includes("Chapter title reads like a plot synopsis");
}

export function isBlockingChapterTitleQualityIssue(message: string | null | undefined): boolean {
  const normalized = message?.trim() ?? "";
  return normalized.includes("Chapter titles must not use a first-person")
    || normalized.includes("Chapter title is too long")
    || normalized.includes("Chapter title reads like a plot synopsis");
}

export function assertChapterTitleDiversity(titles: string[]): void {
  const issue = getChapterTitleDiversityIssue(titles);
  if (issue) throw new Error(issue);
}

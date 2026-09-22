import { countGeorgianWords, tokenizeGeorgianWords } from "@ai-novel/shared/utils/georgianTextMetrics";
import { estimateTokenCount, normalizeRagText } from "./utils";

const FALLBACK_WORD_PATTERN = /[\p{Letter}\p{Number}]+(?:[-'’][\p{Letter}\p{Number}]+)*/gu;

export function containsGeorgianScript(text: string): boolean {
  return /[\u10A0-\u10FF]/.test(text);
}

export function detectRagLanguage(text: string): "ka" | "zh" | "en" {
  const ka = (text.match(/[\u10A0-\u10FF]/g) ?? []).length;
  const zh = (text.match(/[\u3400-\u9FFF\uF900-\uFAFF]/g) ?? []).length;
  const latin = (text.match(/[A-Za-z]/g) ?? []).length;
  if (ka >= zh && ka >= latin && ka > 0) {
    return "ka";
  }
  if (zh > latin && zh > 0) {
    return "zh";
  }
  return "en";
}

export function isEnglishKnowledgeText(text: string): boolean {
  return detectRagLanguage(text) === "en";
}

type RagLanguage = "ka" | "zh" | "en";

const WORD_CHAR = /[\p{Letter}\p{Number}]/u;

function localeForLanguage(language: RagLanguage): string {
  if (language === "ka") {
    return "ka-GE";
  }
  if (language === "zh") {
    return "zh-CN";
  }
  return "en-US";
}

function createWordSegmenter(language: RagLanguage): Intl.Segmenter | null {
  if (language === "ka" || typeof Intl.Segmenter !== "function") {
    return null;
  }
  return new Intl.Segmenter(localeForLanguage(language), { granularity: "word" });
}

function isWordSegment(segment: string): boolean {
  return WORD_CHAR.test(segment);
}

function countSegmentedWords(text: string, segmenter: Intl.Segmenter): number {
  let count = 0;
  for (const segment of segmenter.segment(text)) {
    if (segment.isWordLike && isWordSegment(segment.segment)) {
      count += 1;
    }
  }
  return count;
}

function tokenizeSegmentedWords(text: string, segmenter: Intl.Segmenter): string[] {
  const words: string[] = [];
  for (const segment of segmenter.segment(text)) {
    if (segment.isWordLike && isWordSegment(segment.segment)) {
      words.push(segment.segment);
    }
  }
  return words;
}

function countFallbackWords(text: string): number {
  return text.match(FALLBACK_WORD_PATTERN)?.length ?? 0;
}

function tokenizeFallbackWords(text: string): string[] {
  return text.match(FALLBACK_WORD_PATTERN) ?? [];
}

export function countRagWords(text: string): number {
  const language = detectRagLanguage(text);
  if (language === "ka") {
    return countGeorgianWords(text);
  }
  const segmenter = createWordSegmenter(language);
  return segmenter ? countSegmentedWords(text, segmenter) : countFallbackWords(text);
}

export function tokenizeRagWords(text: string): string[] {
  const language = detectRagLanguage(text);
  if (language === "ka") {
    return tokenizeGeorgianWords(text);
  }
  const segmenter = createWordSegmenter(language);
  return segmenter ? tokenizeSegmentedWords(text, segmenter) : tokenizeFallbackWords(text);
}

interface IndexedWord {
  word: string;
  index: number;
}

interface PreparedSentence {
  text: string;
  wordCount: number;
  tokens: string[];
}

function collectFallbackIndexedWords(text: string): IndexedWord[] {
  return Array.from(text.matchAll(FALLBACK_WORD_PATTERN), (match) => ({
    word: match[0],
    index: match.index ?? 0,
  }));
}

function collectGeorgianIndexedWords(text: string): IndexedWord[] {
  const normalized = text.normalize("NFC");
  if (typeof Intl.Segmenter !== "function") {
    return collectFallbackIndexedWords(normalized);
  }
  const words: Array<IndexedWord & { end: number }> = [];
  for (const segment of new Intl.Segmenter("ka-GE", { granularity: "word" }).segment(normalized)) {
    if (!segment.isWordLike || !isWordSegment(segment.segment)) {
      continue;
    }
    const previous = words.at(-1);
    const separator = previous ? normalized.slice(previous.end, segment.index) : "";
    if (previous && /^[-'’]$/u.test(separator)) {
      previous.word += `${separator}${segment.segment}`;
      previous.end = segment.index + segment.segment.length;
    } else {
      words.push({
        word: segment.segment,
        index: segment.index,
        end: segment.index + segment.segment.length,
      });
    }
  }
  return words;
}

function collectIndexedWords(text: string, language: RagLanguage): IndexedWord[] {
  if (language === "ka") {
    return collectGeorgianIndexedWords(text);
  }
  if (language === "en") {
    return collectFallbackIndexedWords(text);
  }
  const segmenter = createWordSegmenter(language);
  if (!segmenter) {
    return collectFallbackIndexedWords(text);
  }
  const words: IndexedWord[] = [];
  for (const segment of segmenter.segment(text)) {
    if (segment.isWordLike && isWordSegment(segment.segment)) {
      words.push({ word: segment.segment, index: segment.index });
    }
  }
  return words;
}

function sentenceSpans(text: string, language: RagLanguage): Array<{ text: string; start: number; end: number }> {
  if (language !== "en" && typeof Intl.Segmenter === "function") {
    const spans: Array<{ text: string; start: number; end: number }> = [];
    for (const segment of new Intl.Segmenter(localeForLanguage(language), { granularity: "sentence" }).segment(text)) {
      const value = segment.segment.trim();
      if (value) {
        spans.push({ text: value, start: segment.index, end: segment.index + segment.segment.length });
      }
    }
    if (spans.length > 0) {
      return spans;
    }
  }
  const spans: Array<{ text: string; start: number; end: number }> = [];
  const pattern = /[^.!?。！？]+[.!?。！？]*\s*/g;
  for (const match of text.matchAll(pattern)) {
    const value = match[0].trim();
    if (!value) {
      continue;
    }
    spans.push({ text: value, start: match.index ?? 0, end: (match.index ?? 0) + match[0].length });
  }
  return spans.length > 0 ? spans : [{ text, start: 0, end: text.length }];
}

function prepareSentences(text: string, language: RagLanguage): PreparedSentence[] {
  const words = collectIndexedWords(text, language);
  const spans = sentenceSpans(text, language);
  let cursor = 0;
  return spans.map((span) => {
    const tokens: string[] = [];
    while (cursor < words.length && words[cursor].index < span.start) {
      cursor += 1;
    }
    while (cursor < words.length && words[cursor].index < span.end) {
      tokens.push(words[cursor].word);
      cursor += 1;
    }
    return { text: span.text, wordCount: tokens.length, tokens };
  });
}

function joinSentences(sentences: string[]): string {
  return sentences.join(" ").replace(/\s+/g, " ").trim();
}

function splitByWordWindow(words: string[], wordSize: number, overlapWords: number): string[] {
  if (words.length === 0) {
    return [];
  }
  if (words.length <= wordSize) {
    return [words.join(" ")];
  }
  const overlap = Math.max(0, Math.min(overlapWords, wordSize - 1));
  const step = Math.max(1, wordSize - overlap);
  const chunks: string[] = [];
  for (let start = 0; start < words.length; start += step) {
    const slice = words.slice(start, start + wordSize);
    if (slice.length === 0) {
      break;
    }
    chunks.push(slice.join(" "));
    if (start + wordSize >= words.length) {
      break;
    }
  }
  return chunks;
}

function overlapSentences(sentences: PreparedSentence[], overlapWords: number): PreparedSentence[] {
  if (overlapWords <= 0 || sentences.length === 0) {
    return [];
  }
  const selected: PreparedSentence[] = [];
  let total = 0;
  for (let index = sentences.length - 1; index >= 0; index -= 1) {
    const words = sentences[index].wordCount;
    if (selected.length > 0 && total + words > overlapWords) {
      break;
    }
    selected.unshift(sentences[index]);
    total += words;
    if (total >= overlapWords) {
      break;
    }
  }
  return selected;
}

function countSentenceWords(sentences: PreparedSentence[]): number {
  return sentences.reduce((sum, sentence) => sum + sentence.wordCount, 0);
}

function enforceTokenBudget(
  chunks: string[],
  maxTokens: number,
  overlapWords: number,
  tokenize: (value: string) => string[],
): string[] {
  return chunks.flatMap((chunk) => {
    if (estimateTokenCount(chunk) <= maxTokens) {
      return [chunk];
    }
    const words = tokenize(chunk);
    if (words.length <= 1) {
      return [chunk];
    }
    const parts: string[] = [];
    let current: string[] = [];
    for (const word of words) {
      const candidate = [...current, word];
      if (current.length > 0 && estimateTokenCount(candidate.join(" ")) > maxTokens) {
        parts.push(current.join(" "));
        const keep = Math.min(overlapWords, Math.max(0, current.length - 1));
        current = keep > 0 ? [...current.slice(-keep), word] : [word];
      } else {
        current = candidate;
      }
    }
    if (current.length > 0) {
      parts.push(current.join(" "));
    }
    return parts.filter(Boolean);
  });
}

export function splitRagChunks(
  source: string,
  chunkWordSize: number,
  chunkOverlapWords: number,
  options?: { maxTokens?: number | null },
): string[] {
  const normalized = normalizeRagText(source);
  if (!normalized) {
    return [];
  }
  const wordSize = Math.max(1, Math.floor(chunkWordSize));
  const overlapWords = Math.max(0, Math.min(Math.floor(chunkOverlapWords), Math.max(0, wordSize - 1)));
  const maxTokens = typeof options?.maxTokens === "number" && options.maxTokens > 0
    ? Math.floor(options.maxTokens)
    : null;

  const language = detectRagLanguage(normalized);
  const analysisText = language === "ka" ? normalized.normalize("NFC") : normalized;
  const segmenter = createWordSegmenter(language);
  const tokenize = (text: string): string[] => {
    if (language === "ka") {
      return tokenizeGeorgianWords(text);
    }
    return segmenter ? tokenizeSegmentedWords(text, segmenter) : tokenizeFallbackWords(text);
  };
  const sentences = prepareSentences(analysisText, language);
  const totalWords = sentences.reduce((sum, sentence) => sum + sentence.wordCount, 0);

  if (totalWords <= wordSize && (!maxTokens || estimateTokenCount(normalized) <= maxTokens)) {
    return [normalized];
  }

  const chunks: string[] = [];
  let current: PreparedSentence[] = [];
  let currentWords = 0;

  for (const sentence of sentences) {
    const sentenceWords = sentence.wordCount;
    if (sentenceWords > wordSize) {
      if (current.length > 0) {
        chunks.push(joinSentences(current.map((item) => item.text)));
        current = [];
        currentWords = 0;
      }
      chunks.push(...splitByWordWindow(sentence.tokens, wordSize, overlapWords));
      continue;
    }
    if (current.length > 0 && currentWords + sentenceWords > wordSize) {
      chunks.push(joinSentences(current.map((item) => item.text)));
      current = overlapSentences(current, overlapWords);
      currentWords = countSentenceWords(current);
      if (currentWords + sentenceWords > wordSize) {
        current = [];
        currentWords = 0;
      }
    }
    current.push(sentence);
    currentWords += sentenceWords;
  }

  if (current.length > 0) {
    chunks.push(joinSentences(current.map((item) => item.text)));
  }

  const prepared = chunks.filter(Boolean);
  if (!maxTokens) {
    return prepared;
  }
  return enforceTokenBudget(prepared, maxTokens, overlapWords, tokenize);
}

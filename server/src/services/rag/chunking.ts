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

function localeForLanguage(language: "ka" | "zh" | "en"): string {
  if (language === "ka") {
    return "ka-GE";
  }
  if (language === "zh") {
    return "zh-CN";
  }
  return "en-US";
}

export function countRagWords(text: string): number {
  const language = detectRagLanguage(text);
  if (language === "ka") {
    return countGeorgianWords(text);
  }
  if (typeof Intl.Segmenter !== "function") {
    return text.match(FALLBACK_WORD_PATTERN)?.length ?? 0;
  }
  let count = 0;
  for (const segment of new Intl.Segmenter(localeForLanguage(language), { granularity: "word" }).segment(text)) {
    if (segment.isWordLike && /[\p{Letter}\p{Number}]/u.test(segment.segment)) {
      count += 1;
    }
  }
  return count;
}

export function tokenizeRagWords(text: string): string[] {
  const language = detectRagLanguage(text);
  if (language === "ka") {
    return tokenizeGeorgianWords(text);
  }
  if (typeof Intl.Segmenter !== "function") {
    return text.match(FALLBACK_WORD_PATTERN) ?? [];
  }
  const words: string[] = [];
  for (const segment of new Intl.Segmenter(localeForLanguage(language), { granularity: "word" }).segment(text)) {
    if (segment.isWordLike && /[\p{Letter}\p{Number}]/u.test(segment.segment)) {
      words.push(segment.segment);
    }
  }
  return words;
}

function splitSentences(text: string): string[] {
  const language = detectRagLanguage(text);
  if (typeof Intl.Segmenter === "function") {
    const sentences: string[] = [];
    for (const segment of new Intl.Segmenter(localeForLanguage(language), { granularity: "sentence" }).segment(text)) {
      const value = segment.segment.trim();
      if (value) {
        sentences.push(value);
      }
    }
    if (sentences.length > 0) {
      return sentences;
    }
  }
  return text
    .split(/(?<=[.!?。！？])\s+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function joinSentences(sentences: string[]): string {
  return sentences.join(" ").replace(/\s+/g, " ").trim();
}

function splitByWordWindow(text: string, wordSize: number, overlapWords: number): string[] {
  const words = tokenizeRagWords(text);
  if (words.length === 0) {
    return [];
  }
  if (words.length <= wordSize) {
    return [text.trim()];
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

function overlapSentences(sentences: string[], overlapWords: number): string[] {
  if (overlapWords <= 0 || sentences.length === 0) {
    return [];
  }
  const selected: string[] = [];
  let total = 0;
  for (let index = sentences.length - 1; index >= 0; index -= 1) {
    const words = countRagWords(sentences[index]);
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

function countSentenceWords(sentences: string[]): number {
  return sentences.reduce((sum, sentence) => sum + countRagWords(sentence), 0);
}

function enforceTokenBudget(chunks: string[], maxTokens: number, overlapWords: number): string[] {
  return chunks.flatMap((chunk) => {
    if (estimateTokenCount(chunk) <= maxTokens) {
      return [chunk];
    }
    const words = tokenizeRagWords(chunk);
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

  if (countRagWords(normalized) <= wordSize && (!maxTokens || estimateTokenCount(normalized) <= maxTokens)) {
    return [normalized];
  }

  const sentences = splitSentences(normalized);
  const chunks: string[] = [];
  let current: string[] = [];
  let currentWords = 0;

  for (const sentence of sentences) {
    const sentenceWords = countRagWords(sentence);
    if (sentenceWords > wordSize) {
      if (current.length > 0) {
        chunks.push(joinSentences(current));
        current = [];
        currentWords = 0;
      }
      chunks.push(...splitByWordWindow(sentence, wordSize, overlapWords));
      continue;
    }
    if (current.length > 0 && currentWords + sentenceWords > wordSize) {
      chunks.push(joinSentences(current));
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
    chunks.push(joinSentences(current));
  }

  const prepared = chunks.filter(Boolean);
  if (!maxTokens) {
    return prepared;
  }
  return enforceTokenBudget(prepared, maxTokens, overlapWords);
}

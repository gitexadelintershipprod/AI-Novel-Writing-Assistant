export const GEORGIAN_CONTENT_LANGUAGE = "ka" as const;
export const GEORGIAN_CONTENT_LOCALE = "ka-GE" as const;

const FALLBACK_WORD_PATTERN = /[\p{Letter}\p{Number}]+(?:[-'’][\p{Letter}\p{Number}]+)*/gu;
const JOINER_PATTERN = /^[-'’]$/u;

export function normalizeGeorgianText(value: string): string {
  return value.normalize("NFC");
}

export function tokenizeGeorgianWords(value: string): string[] {
  const normalized = normalizeGeorgianText(value);
  if (typeof Intl.Segmenter !== "function") {
    return normalized.match(FALLBACK_WORD_PATTERN) ?? [];
  }

  const segments = Array.from(new Intl.Segmenter(GEORGIAN_CONTENT_LOCALE, {
    granularity: "word",
  }).segment(normalized));
  const words: Array<{ text: string; end: number }> = [];
  for (const segment of segments) {
    if (!segment.isWordLike || !/[\p{Letter}\p{Number}]/u.test(segment.segment)) {
      continue;
    }
    const previous = words.at(-1);
    const separator = previous ? normalized.slice(previous.end, segment.index) : "";
    if (previous && JOINER_PATTERN.test(separator)) {
      previous.text += `${separator}${segment.segment}`;
      previous.end = segment.index + segment.segment.length;
    } else {
      words.push({ text: segment.segment, end: segment.index + segment.segment.length });
    }
  }
  return words.map((word) => word.text);
}

export function countGeorgianWords(value: string): number {
  return tokenizeGeorgianWords(value).length;
}

export function countUnicodeCodePoints(value: string): number {
  return Array.from(normalizeGeorgianText(value)).length;
}

export function truncateGeorgianWords(value: string, maxWords: number, maxCodePoints: number): string {
  const byWords = tokenizeGeorgianWords(value).slice(0, Math.max(0, maxWords)).join(" ");
  return Array.from(byWords).slice(0, Math.max(0, maxCodePoints)).join("").trim();
}

export function estimateGeorgianOutputTokens(targetWords: number, providerLimit?: number | null): number {
  const requested = Math.max(1, Math.ceil(targetWords * 2.2 + 512));
  return providerLimit && providerLimit > 0 ? Math.min(requested, providerLimit) : requested;
}

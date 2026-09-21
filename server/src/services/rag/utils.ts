import { createHash, randomUUID } from "crypto";

export function normalizeRagText(source: string): string {
  return source
    .replace(/\r\n?/g, "\n")
    .replace(/\u0000/g, "")
    .trim();
}

export function estimateTokenCount(text: string): number {
  const normalized = normalizeRagText(text);
  if (!normalized) {
    return 0;
  }
  const cjkChars = (normalized.match(/[\u3400-\u9FFF\uF900-\uFAFF]/g) ?? []).length;
  const nonCjkText = normalized.replace(/[\u3400-\u9FFF\uF900-\uFAFF]/g, "");
  const compactAscii = nonCjkText.replace(/\s+/g, "");
  const otherTokenEstimate = Math.ceil(compactAscii.length / 4);
  return Math.max(1, cjkChars + otherTokenEstimate);
}

export function computeChunkHash(input: string): string {
  return createHash("sha256").update(input).digest("hex");
}

export function buildChunkId(): string {
  return randomUUID();
}

export function toKeywordTerms(query: string): string[] {
  const normalized = normalizeRagText(query);
  if (!normalized) {
    return [];
  }
  const terms = normalized
    .split(/[\s,，。！？!?;；、\n]+/)
    .map((item) => item.trim())
    .filter((item) => item.length >= 2)
    .slice(0, 8);
  return Array.from(new Set(terms));
}

export function compactSnippet(source: string, maxChars = 280): string {
  const text = source.replace(/\s+/g, " ").trim();
  if (text.length <= maxChars) {
    return text;
  }
  const head = text.slice(0, Math.floor(maxChars * 0.7)).trim();
  const tail = text.slice(-Math.max(40, Math.floor(maxChars * 0.2))).trim();
  return `${head} ... ${tail}`;
}

export async function runWithConcurrency<T>(
  items: T[],
  concurrency: number,
  worker: (item: T, index: number) => Promise<void>,
): Promise<void> {
  if (items.length === 0) {
    return;
  }
  let nextIndex = 0;
  let firstError: unknown = null;
  const workerCount = Math.max(1, Math.min(concurrency, items.length));
  await Promise.all(
    Array.from({ length: workerCount }, async () => {
      while (true) {
        if (firstError) {
          return;
        }
        const index = nextIndex;
        nextIndex += 1;
        if (index >= items.length) {
          return;
        }
        try {
          await worker(items[index], index);
        } catch (error) {
          firstError ??= error;
          return;
        }
      }
    }),
  );
  if (firstError) {
    throw firstError;
  }
}

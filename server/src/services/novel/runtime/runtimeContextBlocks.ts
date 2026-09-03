export function buildPreviousChaptersSummary(
  requestSummary: string[] | undefined,
  summaries: Array<{ chapter: { order: number; title: string }; summary: string }>,
): string[] {
  if (requestSummary?.length) {
    return requestSummary;
  }
  return summaries.map((item) => `Chapter ${item.chapter.order}, “${item.chapter.title}”: ${item.summary}`);
}

export function parseJsonStringArraySafe(value: string | null | undefined): string[] {
  if (!value?.trim()) {
    return [];
  }
  try {
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed)
      ? parsed.map((item) => String(item ?? "").trim()).filter(Boolean)
      : [];
  } catch {
    return [];
  }
}

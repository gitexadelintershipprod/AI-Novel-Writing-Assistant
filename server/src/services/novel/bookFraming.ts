import { parseCommercialTagsJson } from "@ai-novel/shared/types/novelFraming";

interface BookFramingSource {
  targetAudience?: string | null;
  bookSellingPoint?: string | null;
  competingFeel?: string | null;
  first30ChapterPromise?: string | null;
  commercialTags?: string[] | null;
  commercialTagsJson?: string | null;
}

export function resolveCommercialTags(source: BookFramingSource): string[] {
  if (Array.isArray(source.commercialTags)) {
    return source.commercialTags.filter((item) => typeof item === "string" && item.trim().length > 0);
  }
  return parseCommercialTagsJson(source.commercialTagsJson);
}

export function buildBookFramingSummary(source: BookFramingSource): string {
  const commercialTags = resolveCommercialTags(source);
  return [
    source.targetAudience?.trim() ? `Target audience: ${source.targetAudience.trim()}` : "",
    commercialTags.length > 0 ? `Core story tags: ${commercialTags.join(", ")}` : "",
    source.bookSellingPoint?.trim() ? `Core selling point: ${source.bookSellingPoint.trim()}` : "",
    source.competingFeel?.trim() ? `Comparable reading experience: ${source.competingFeel.trim()}` : "",
    source.first30ChapterPromise?.trim() ? `First 30 chapters promise: ${source.first30ChapterPromise.trim()}` : "",
  ].filter(Boolean).join("\n");
}

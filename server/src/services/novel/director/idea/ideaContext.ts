import type { DirectorIdeaContextRequest } from "@ai-novel/shared/types/novelDirector";
import { StructuredOutputError } from "../../../../llm/structuredOutput";
import { buildBookFramingSummary } from "../../bookFraming";

function compactText(value: string | null | undefined): string {
  return value?.replace(/\s+/g, " ").trim() ?? "";
}

function line(label: string, value: string | null | undefined): string {
  const text = compactText(value);
  return text ? `${label}：${text}` : "";
}

function readerChannelPreferenceLabel(value: DirectorIdeaContextRequest["readerChannelPreference"]): string {
  switch (value) {
    case "ai_judge":
      return "AI recommendation";
    case "male_oriented":
      return "Action-oriented audience";
    case "female_oriented":
      return "Character-oriented audience";
    case "general":
      return "General audience / unrestricted";
    default:
      return "";
  }
}

export function buildDirectorIdeaContextSummary(input: DirectorIdeaContextRequest, marketBriefPrompt = ""): string {
  const framing = buildBookFramingSummary({
    targetAudience: input.targetAudience,
    bookSellingPoint: input.bookSellingPoint,
    competingFeel: input.competingFeel,
    first30ChapterPromise: input.first30ChapterPromise,
    commercialTags: input.commercialTags,
  });
  return [
    line("Current idea draft", input.currentIdea),
    line("Working title", input.title),
    line("Existing summary", input.description),
    line("Genre foundation", input.genreLabel ?? input.genreId),
    line("Genre guidance", input.genreDescription),
    line("Primary story mode", input.primaryStoryModeLabel ?? input.primaryStoryModeId),
    line("Primary story mode guidance", input.primaryStoryModeDescription),
    line("Secondary story mode", input.secondaryStoryModeLabel ?? input.secondaryStoryModeId),
    line("Secondary story mode guidance", input.secondaryStoryModeDescription),
    line("World", input.worldName ?? input.worldId),
    marketBriefPrompt.trim() ? `Market brief:\n${marketBriefPrompt.trim()}` : "",
    line("Audience orientation", readerChannelPreferenceLabel(input.readerChannelPreference)),
    input.narrativePov ? `Narrative point of view: ${input.narrativePov}` : "",
    input.pacePreference ? `Pacing preference: ${input.pacePreference}` : "",
    input.emotionIntensity ? `Emotional intensity: ${input.emotionIntensity}` : "",
    line("Style keywords", input.styleTone),
    framing ? `Book-level framing:\n${framing}` : "",
  ].filter(Boolean).join("\n");
}

export function shouldRetryDirectorIdeaWithOriginalContext(error: unknown): error is StructuredOutputError {
  return error instanceof StructuredOutputError && error.category !== "transport_error";
}

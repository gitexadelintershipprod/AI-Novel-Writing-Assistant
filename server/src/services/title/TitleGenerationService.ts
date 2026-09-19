import type { LLMProvider } from "@ai-novel/shared/types/llm";
import type { TitleFactorySuggestion } from "@ai-novel/shared/types/title";
import { prisma } from "../../db/prisma";
import { resolveLLMClientOptions } from "../../llm/factory";
import { selectStructuredOutputStrategy } from "../../llm/structuredOutput";
import { runStructuredPrompt } from "../../prompting/core/promptRunner";
import { titleGenerationPrompt } from "../../prompting/prompts/helper/titleGeneration.prompt";
import {
  collectUniqueSuggestions,
  DEFAULT_TITLE_COUNT,
  detectTitleSurfaceFrame,
  hasEnoughStructuralVariety,
  hasEnoughStyleVariety,
  normalizeRequestedCount,
  toTrimmedString,
  type TitlePromptContext,
} from "./titleGeneration.shared";

export interface TitleGenerationLLMOptions {
  provider?: LLMProvider;
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

export interface GenerateTitleIdeasInput extends TitleGenerationLLMOptions {
  mode: "brief" | "adapt";
  selectionMode?: "pool" | "primary";
  brief?: string;
  referenceTitle?: string;
  genreId?: string | null;
  count?: number;
}

export interface GenerateNovelTitlesInput extends TitleGenerationLLMOptions {
  count?: number;
}

async function shouldForceTitleJsonOutput(input: TitleGenerationLLMOptions): Promise<boolean> {
  const resolved = await resolveLLMClientOptions(input.provider ?? "deepseek", {
    model: input.model,
    temperature: input.temperature ?? 0.85,
    maxTokens: input.maxTokens,
    taskType: titleGenerationPrompt.taskType,
    executionMode: "structured",
  });
  const profile = resolved.structuredProfile;
  if (!profile || !titleGenerationPrompt.outputSchema) {
    return false;
  }
  return selectStructuredOutputStrategy(profile, titleGenerationPrompt.outputSchema) !== "prompt_json";
}

function resolveRetryReason(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }
  return fallback;
}

function extractRawTitlesFromPayload(payload: unknown): unknown[] {
  if (Array.isArray(payload)) {
    return payload;
  }
  if (payload && typeof payload === "object" && Array.isArray((payload as { titles?: unknown }).titles)) {
    return (payload as { titles: unknown[] }).titles;
  }
  throw new Error("The model output is missing the titles array.");
}

function buildNovelBrief(novel: {
  title: string;
  description: string | null;
  genre?: { name: string; description: string | null } | null;
}): string {
  const parts = [
    novel.description?.trim() ? `Synopsis:${novel.description.trim()}` : "",
    novel.genre?.name ? `Theme base:${novel.genre.name}` : "",
    novel.genre?.description?.trim() ? `Genre notes:${novel.genre.description.trim()}` : "",
  ].filter(Boolean);

  if (parts.length > 0) {
    return parts.join("\n");
  }
  return `Project title:${novel.title}`;
}

function batchScore(titles: TitleFactorySuggestion[]): number {
  if (titles.length === 0) {
    return 0;
  }

  const styleCount = new Set(titles.map((item) => item.style)).size;
  const frameCount = new Set(titles.map((item) => detectTitleSurfaceFrame(item.title))).size;
  const totalClickRate = titles.reduce((sum, item) => sum + item.clickRate, 0);

  return titles.length * 1000 + styleCount * 100 + frameCount * 100 + totalClickRate;
}

function isBetterBatch(current: TitleFactorySuggestion[], challenger: TitleFactorySuggestion[]): boolean {
  return batchScore(challenger) > batchScore(current);
}

function ensureGenerationQuality(titles: TitleFactorySuggestion[], targetCount: number): void {
  if (titles.length < targetCount) {
    throw new Error(`Not enough titles; the target is ${targetCount} but only ${titles.length} titles are available.`);
  }
  if (!hasEnoughStyleVariety(titles, targetCount)) {
    throw new Error("The title style distribution is too narrow to meet the minimum style coverage requirement.");
  }
  if (!hasEnoughStructuralVariety(titles, targetCount)) {
    throw new Error("The title sentence patterns are too concentrated and lack sufficient structural variety.");
  }
}

export class TitleGenerationService {
  async generateTitleIdeas(input: GenerateTitleIdeasInput): Promise<{ titles: TitleFactorySuggestion[] }> {
    const mode = input.mode;
    const brief = toTrimmedString(input.brief);
    const referenceTitle = toTrimmedString(input.referenceTitle);
    const count = normalizeRequestedCount(input.count, DEFAULT_TITLE_COUNT);

    if (mode === "brief" && !brief) {
      throw new Error("The free-form title workshop requires a creative brief.");
    }
    if (mode === "adapt" && !referenceTitle) {
      throw new Error("The reference title rewrite mode requires a reference title.");
    }

    const genre = input.genreId
      ? await prisma.novelGenre.findUnique({
        where: { id: input.genreId },
        select: { id: true, name: true, description: true },
      })
      : null;

    return this.runGeneration({
      mode,
      selectionMode: input.selectionMode ?? "pool",
      count,
      brief: brief || `Please study the structure of the reference title "${referenceTitle}" and rewrite from it to produce original titles.`,
      referenceTitle,
      novelTitle: "",
      currentTitle: "",
      genreName: genre?.name ?? "",
      genreDescription: genre?.description ?? "",
    }, {
      provider: input.provider,
      model: input.model,
      temperature: input.temperature,
      maxTokens: input.maxTokens,
    });
  }

  async generateNovelTitles(
    novelId: string,
    input: GenerateNovelTitlesInput = {},
  ): Promise<{ titles: TitleFactorySuggestion[] }> {
    const novel = await prisma.novel.findUnique({
      where: { id: novelId },
      select: {
        id: true,
        title: true,
        description: true,
        genre: {
          select: {
            id: true,
            name: true,
            description: true,
          },
        },
      },
    });

    if (!novel) {
      throw new Error("The novel does not exist.");
    }

    const brief = buildNovelBrief(novel);

    return this.runGeneration({
      mode: "novel",
      selectionMode: "pool",
      count: normalizeRequestedCount(input.count, DEFAULT_TITLE_COUNT),
      brief,
      referenceTitle: "",
      novelTitle: novel.title,
      currentTitle: novel.title,
      genreName: novel.genre?.name ?? "",
      genreDescription: novel.genre?.description ?? "",
    }, input, novel.title ? [novel.title] : []);
  }

  private async runGeneration(
    promptContext: TitlePromptContext,
    llmOptions: TitleGenerationLLMOptions,
    blockedTitles: string[] = [],
  ): Promise<{ titles: TitleFactorySuggestion[] }> {
    const provider = llmOptions.provider ?? "deepseek";
    const forceJson = await shouldForceTitleJsonOutput(llmOptions);
    const count = normalizeRequestedCount(promptContext.count, DEFAULT_TITLE_COUNT);
    const primarySelection = promptContext.selectionMode === "primary";

    let lastError: unknown;
    let bestEffortTitles: TitleFactorySuggestion[] = [];
    let retryReason: string | null = null;

    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        const payload = await runStructuredPrompt({
          asset: titleGenerationPrompt,
          promptInput: {
            context: {
              ...promptContext,
              count,
            },
            forceJson,
            retryReason,
          },
          options: {
            provider,
            model: llmOptions.model,
            temperature: llmOptions.temperature ?? 0.85,
            maxTokens: llmOptions.maxTokens,
          },
        });

        const rawTitles = extractRawTitlesFromPayload(payload.output);
        const titles = collectUniqueSuggestions(rawTitles, count, blockedTitles, {
          preserveOrder: primarySelection,
          enforceFrameDiversity: !primarySelection,
        });

        if (isBetterBatch(bestEffortTitles, titles)) {
          bestEffortTitles = titles;
        }

        if (primarySelection) {
          if (titles.length < count) {
            throw new Error(`Not enough titles; the target is ${count} but only ${titles.length} titles are available.`);
          }
        } else {
          ensureGenerationQuality(titles, count);
        }
        return { titles };
      } catch (error) {
        lastError = error;
        retryReason = resolveRetryReason(error, "The output does not meet the JSON or title quality requirements.");
      }
    }

    const minimumAcceptableCount = Math.max(5, Math.floor(count * 0.8));
    if (
      bestEffortTitles.length >= minimumAcceptableCount
      && hasEnoughStyleVariety(bestEffortTitles, bestEffortTitles.length)
      && hasEnoughStructuralVariety(bestEffortTitles, bestEffortTitles.length)
    ) {
      return { titles: bestEffortTitles };
    }

    if (lastError instanceof Error) {
      throw new Error(`Title generation failed:${lastError.message}`);
    }
    throw new Error("Title generation failed.");
  }
}

export const titleGenerationService = new TitleGenerationService();

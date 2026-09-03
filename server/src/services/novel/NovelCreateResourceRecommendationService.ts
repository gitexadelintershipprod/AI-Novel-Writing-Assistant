import type {
  AIFreedom,
  EmotionIntensity,
  NarrativePov,
  NovelWritingMode,
  PacePreference,
  ProjectMode,
} from "@ai-novel/shared/types/novel";
import type { LLMProvider } from "@ai-novel/shared/types/llm";
import type { NovelCreateResourceRecommendation } from "@ai-novel/shared/types/novelResourceRecommendation";
import { runStructuredPrompt } from "../../prompting/core/promptRunner";
import { novelCreateResourceRecommendationPrompt } from "../../prompting/prompts/novel/resourceRecommendation.prompts";
import { ensureSystemResourceStarterData } from "../bootstrap/SystemResourceBootstrapService";
import { GenreService, type GenreTreeNode } from "../genre/GenreService";
import { StoryModeService, type StoryModeTreeNode } from "../storyMode/StoryModeService";
import { buildStoryModePromptBlock } from "../storyMode/storyModeProfile";
import { buildBookFramingSummary } from "./bookFraming";

interface RecommendNovelCreateResourcesInput {
  marketBriefPrompt?: string;
  title?: string;
  description?: string;
  targetAudience?: string;
  bookSellingPoint?: string;
  competingFeel?: string;
  first30ChapterPromise?: string;
  commercialTags?: string[];
  genreId?: string;
  primaryStoryModeId?: string;
  secondaryStoryModeId?: string;
  writingMode?: NovelWritingMode;
  projectMode?: ProjectMode;
  narrativePov?: NarrativePov;
  pacePreference?: PacePreference;
  styleTone?: string;
  emotionIntensity?: EmotionIntensity;
  aiFreedom?: AIFreedom;
  provider?: LLMProvider;
  model?: string;
  temperature?: number;
}

export interface ResolvedNovelProductionFoundation {
  genreId: string;
  primaryStoryModeId: string;
  secondaryStoryModeId?: string;
  recommendation: NovelCreateResourceRecommendation;
  promptBlock: string;
}

interface FlattenedGenreOption {
  id: string;
  name: string;
  path: string;
  description?: string | null;
  template?: string | null;
}

interface FlattenedStoryModeOption {
  id: string;
  name: string;
  path: string;
  description?: string | null;
  template?: string | null;
  profile: StoryModeTreeNode["profile"];
}

function compactText(value: string | null | undefined): string {
  return value?.replace(/\s+/g, " ").trim() ?? "";
}

function truncateText(value: string | null | undefined, maxLength = 220): string {
  const text = compactText(value);
  if (!text) {
    return "";
  }
  if (text.length <= maxLength) {
    return text;
  }
  return `${text.slice(0, maxLength)}...`;
}

function flattenGenreOptions(nodes: GenreTreeNode[], path: string[] = []): FlattenedGenreOption[] {
  return nodes.flatMap((node) => {
    const nextPath = [...path, node.name];
    return [
      {
        id: node.id,
        name: node.name,
        path: nextPath.join(" / "),
        description: node.description,
        template: node.template,
      },
      ...flattenGenreOptions(node.children, nextPath),
    ];
  });
}

function flattenStoryModeOptions(nodes: StoryModeTreeNode[], path: string[] = []): FlattenedStoryModeOption[] {
  return nodes.flatMap((node) => {
    const nextPath = [...path, node.name];
    return [
      {
        id: node.id,
        name: node.name,
        path: nextPath.join(" / "),
        description: node.description,
        template: node.template,
        profile: node.profile,
      },
      ...flattenStoryModeOptions(node.children, nextPath),
    ];
  });
}

function buildGenreCatalogText(options: FlattenedGenreOption[]): string {
  return options.map((option, index) => [
    `${index + 1}. ID=${option.id}`,
    `Path: ${option.path}`,
    option.description ? `Description: ${option.description}` : "",
    option.template ? `Creative tendency: ${option.template}` : "",
  ].filter(Boolean).join("\n")).join("\n\n");
}

function buildStoryModeCatalogText(options: FlattenedStoryModeOption[]): string {
  return options.map((option, index) => [
    `${index + 1}. ID=${option.id}`,
    `Path: ${option.path}`,
    option.description ? `Description: ${option.description}` : "",
    `Core drive: ${option.profile.coreDrive}`,
    `Reader reward: ${option.profile.readerReward}`,
    `Conflict ceiling: ${option.profile.conflictCeiling}`,
    option.template ? `Supplemental template: ${option.template}` : "",
  ].filter(Boolean).join("\n")).join("\n\n");
}

function buildCurrentSelectionSummary(input: RecommendNovelCreateResourcesInput, options: {
  genres: FlattenedGenreOption[];
  storyModes: FlattenedStoryModeOption[];
}): string {
  const genre = options.genres.find((item) => item.id === input.genreId);
  const primaryStoryMode = options.storyModes.find((item) => item.id === input.primaryStoryModeId);
  const secondaryStoryMode = options.storyModes.find((item) => item.id === input.secondaryStoryModeId);

  return [
    genre ? `Selected genre foundation: ${genre.path}` : "",
    primaryStoryMode ? `Selected primary story mode: ${primaryStoryMode.path}` : "",
    secondaryStoryMode ? `Selected secondary story mode: ${secondaryStoryMode.path}` : "",
  ].filter(Boolean).join("\n");
}

function buildUserIntentSummary(
  input: RecommendNovelCreateResourcesInput,
  options: {
    genres: FlattenedGenreOption[];
    storyModes: FlattenedStoryModeOption[];
  },
): string {
  const bookFramingSummary = buildBookFramingSummary({
    targetAudience: input.targetAudience,
    bookSellingPoint: input.bookSellingPoint,
    competingFeel: input.competingFeel,
    first30ChapterPromise: input.first30ChapterPromise,
    commercialTags: input.commercialTags,
  });
  const currentSelectionSummary = buildCurrentSelectionSummary(input, options);

  return [
    input.title?.trim() ? `Title: ${input.title.trim()}` : "",
    input.marketBriefPrompt?.trim() ? `Market brief: \n${input.marketBriefPrompt.trim()}` : "",
    input.description?.trim() ? `Logline: ${truncateText(input.description, 260)}` : "",
    input.writingMode ? `Writing mode: ${input.writingMode}` : "",
    input.projectMode ? `Project mode: ${input.projectMode}` : "",
    input.narrativePov ? `Narrative POV: ${input.narrativePov}` : "",
    input.pacePreference ? `Pace preference: ${input.pacePreference}` : "",
    input.emotionIntensity ? `Emotional intensity: ${input.emotionIntensity}` : "",
    input.aiFreedom ? `AI freedom: ${input.aiFreedom}` : "",
    input.styleTone?.trim() ? `Style keywords: ${input.styleTone.trim()}` : "",
    bookFramingSummary ? `Book framing: \n${bookFramingSummary}` : "",
    currentSelectionSummary ? `Current manual selections: \n${currentSelectionSummary}` : "",
  ].filter(Boolean).join("\n");
}

export class NovelCreateResourceRecommendationService {
  private readonly genreService = new GenreService();

  private readonly storyModeService = new StoryModeService();

  private async loadOptions(): Promise<{
    genres: FlattenedGenreOption[];
    storyModes: FlattenedStoryModeOption[];
  }> {
    await ensureSystemResourceStarterData();

    const [genreTree, storyModeTree] = await Promise.all([
      this.genreService.listGenreTree(),
      this.storyModeService.listStoryModeTree(),
    ]);
    const genres = flattenGenreOptions(genreTree);
    const storyModes = flattenStoryModeOptions(storyModeTree);
    if (genres.length === 0 || storyModes.length === 0) {
      throw new Error("Built-in creative resources are not ready, so a genre and story mode cannot be recommended yet.");
    }
    return { genres, storyModes };
  }

  private async recommendFromOptions(
    input: RecommendNovelCreateResourcesInput,
    options: { genres: FlattenedGenreOption[]; storyModes: FlattenedStoryModeOption[] },
  ): Promise<NovelCreateResourceRecommendation> {
    const result = await runStructuredPrompt({
      asset: novelCreateResourceRecommendationPrompt,
      promptInput: {
        userIntentSummary: buildUserIntentSummary(input, options),
        genreCatalogText: buildGenreCatalogText(options.genres),
        storyModeCatalogText: buildStoryModeCatalogText(options.storyModes),
        allowedGenreIds: options.genres.map((item) => item.id),
        allowedStoryModeIds: options.storyModes.map((item) => item.id),
      },
      options: {
        provider: input.provider,
        model: input.model,
        temperature: Math.min(input.temperature ?? 0.3, 0.5),
      },
    });

    const parsed = result.output;
    const genre = options.genres.find((item) => item.id === parsed.genreId);
    const primaryStoryMode = options.storyModes.find((item) => item.id === parsed.primaryStoryModeId);
    const secondaryStoryMode = parsed.secondaryStoryModeId
      ? options.storyModes.find((item) => item.id === parsed.secondaryStoryModeId)
      : null;

    if (!genre || !primaryStoryMode) {
      throw new Error("The AI recommendation does not match the current creative-resource catalog.");
    }

    return {
      summary: parsed.summary,
      genre: {
        id: genre.id,
        name: genre.name,
        path: genre.path,
        reason: parsed.genreReason,
      },
      primaryStoryMode: {
        id: primaryStoryMode.id,
        name: primaryStoryMode.name,
        path: primaryStoryMode.path,
        reason: parsed.primaryStoryModeReason,
      },
      secondaryStoryMode: secondaryStoryMode
        ? {
          id: secondaryStoryMode.id,
          name: secondaryStoryMode.name,
          path: secondaryStoryMode.path,
          reason: parsed.secondaryStoryModeReason?.trim() || "Adds complementary flavor and reader rewards to the primary story mode.",
        }
        : null,
      caution: parsed.caution?.trim() || null,
      recommendedAt: new Date().toISOString(),
    };
  }

  async recommend(input: RecommendNovelCreateResourcesInput): Promise<NovelCreateResourceRecommendation> {
    const options = await this.loadOptions();
    return this.recommendFromOptions(input, options);
  }

  async resolveRequired(input: RecommendNovelCreateResourcesInput): Promise<ResolvedNovelProductionFoundation> {
    const options = await this.loadOptions();
    const selectedGenre = input.genreId?.trim()
      ? options.genres.find((item) => item.id === input.genreId?.trim())
      : null;
    const selectedPrimary = input.primaryStoryModeId?.trim()
      ? options.storyModes.find((item) => item.id === input.primaryStoryModeId?.trim())
      : null;
    const selectedSecondary = input.secondaryStoryModeId?.trim()
      ? options.storyModes.find((item) => item.id === input.secondaryStoryModeId?.trim())
      : null;

    if (input.genreId?.trim() && !selectedGenre) {
      throw new Error("The selected genre foundation is no longer available. Choose another or ask AI to recommend one.");
    }
    if (input.primaryStoryModeId?.trim() && !selectedPrimary) {
      throw new Error("The selected primary story mode is no longer available. Choose another or ask AI to recommend one.");
    }
    if (input.secondaryStoryModeId?.trim() && !selectedSecondary) {
      throw new Error("The selected secondary story mode is no longer available. Choose another.");
    }
    if (selectedPrimary && selectedSecondary && selectedPrimary.id === selectedSecondary.id) {
      throw new Error("Primary and secondary story modes must be different.");
    }

    const aiRecommendation = selectedGenre && selectedPrimary && selectedSecondary
      ? null
      : await this.recommendFromOptions(input, options);
    const genre = selectedGenre
      ?? options.genres.find((item) => item.id === aiRecommendation?.genre.id);
    const primary = selectedPrimary
      ?? options.storyModes.find((item) => item.id === aiRecommendation?.primaryStoryMode.id);
    const secondary = selectedSecondary
      ?? (!input.secondaryStoryModeId && aiRecommendation?.secondaryStoryMode
        ? options.storyModes.find((item) => (
          item.id === aiRecommendation.secondaryStoryMode?.id
          && item.id !== primary?.id
        ))
        : null);

    if (!genre || !primary) {
      throw new Error("AI could not determine a valid genre foundation and primary story mode. Try again.");
    }
    if (secondary?.id === primary.id) {
      throw new Error("AI recommended the same primary and secondary story mode. Try again.");
    }

    const recommendation: NovelCreateResourceRecommendation = {
      summary: aiRecommendation?.summary
        ?? `This book uses “${genre.path}” as its genre foundation and advances through “${primary.path}”.`,
      genre: {
        id: genre.id,
        name: genre.name,
        path: genre.path,
        source: selectedGenre ? "user_selected" : "ai_recommended",
        reason: aiRecommendation?.genre.id === genre.id
          ? aiRecommendation.genre.reason
          : "Uses the genre foundation you confirmed.",
      },
      primaryStoryMode: {
        id: primary.id,
        name: primary.name,
        path: primary.path,
        source: selectedPrimary ? "user_selected" : "ai_recommended",
        reason: aiRecommendation?.primaryStoryMode.id === primary.id
          ? aiRecommendation.primaryStoryMode.reason
          : "Uses the primary story mode you confirmed.",
      },
      secondaryStoryMode: secondary
        ? {
          id: secondary.id,
          name: secondary.name,
          path: secondary.path,
          source: selectedSecondary ? "user_selected" : "ai_recommended",
          reason: aiRecommendation?.secondaryStoryMode?.id === secondary.id
            ? aiRecommendation.secondaryStoryMode.reason
            : "Uses the secondary story mode you confirmed.",
        }
        : null,
      caution: aiRecommendation?.caution ?? null,
      recommendedAt: new Date().toISOString(),
    };
    const storyModeBlock = buildStoryModePromptBlock({
      primary,
      secondary: secondary ?? null,
    });
    return {
      genreId: genre.id,
      primaryStoryModeId: primary.id,
      secondaryStoryModeId: secondary?.id,
      recommendation,
      promptBlock: [
        `Genre foundation: ${genre.path}`,
        genre.description ? `Genre positioning: ${genre.description}` : "",
        genre.template ? `Genre creative tendency: ${genre.template}` : "",
        storyModeBlock,
      ].filter(Boolean).join("\n\n"),
    };
  }
}

export const novelCreateResourceRecommendationService = new NovelCreateResourceRecommendationService();

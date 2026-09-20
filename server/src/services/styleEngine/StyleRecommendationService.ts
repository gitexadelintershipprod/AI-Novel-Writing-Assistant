import type { LLMProvider } from "@ai-novel/shared/types/llm";
import type {
  StyleProfile,
  StyleRecommendationCandidate,
  StyleRecommendationResult,
} from "@ai-novel/shared/types/styleEngine";
import { prisma } from "../../db/prisma";
import { runStructuredPrompt } from "../../prompting/core/promptRunner";
import { styleRecommendationPrompt } from "../../prompting/prompts/style/style.prompts";
import { buildBookFramingSummary } from "../novel/bookFraming";
import { ensureStyleEngineSeedData } from "./StyleEngineSeedService";
import { clamp, mapStyleProfileRow } from "./helpers";

interface RecommendForNovelInput {
  novelId: string;
  provider?: LLMProvider;
  model?: string;
  temperature?: number;
}

type RecommendationCandidateRecord = {
  styleProfileId: string;
  fitScore: number;
  recommendationReason: string;
  caution?: string | null;
};

function truncateText(value: string | null | undefined, maxLength = 220): string {
  const text = value?.replace(/\s+/g, " ").trim() ?? "";
  if (!text) {
    return "";
  }
  if (text.length <= maxLength) {
    return text;
  }
  return `${text.slice(0, maxLength)}...`;
}

function collectRuleHighlights(profile: StyleProfile): string[] {
  const blocks: Array<Record<string, unknown>> = [
    profile.narrativeRules,
    profile.characterRules,
    profile.languageRules,
    profile.rhythmRules,
  ];
  const highlights: string[] = [];
  for (const block of blocks) {
    for (const [key, value] of Object.entries(block)) {
      if (value == null) {
        continue;
      }
      if (typeof value === "string" && value.trim()) {
        highlights.push(`${key}: ${value.trim()}`);
        continue;
      }
      if (typeof value === "number" || typeof value === "boolean") {
        highlights.push(`${key}: ${String(value)}`);
        continue;
      }
      if (Array.isArray(value) && value.length > 0) {
        const items = value
          .filter((item): item is string | number | boolean => ["string", "number", "boolean"].includes(typeof item))
          .map((item) => String(item).trim())
          .filter(Boolean)
          .slice(0, 3);
        if (items.length > 0) {
          highlights.push(`${key}: ${items.join(" / ")}`);
        }
      }
      if (highlights.length >= 6) {
        return highlights;
      }
    }
  }
  return highlights;
}

function buildProfileSummary(profile: StyleProfile): string {
  const parts = [
    profile.category?.trim() ? `category: ${profile.category.trim()}` : "",
    profile.tags.length > 0 ? `tags: ${profile.tags.slice(0, 5).join(", ")}` : "",
    profile.applicableGenres.length > 0 ? `fitted genres: ${profile.applicableGenres.slice(0, 4).join(", ")}` : "",
    truncateText(profile.description, 120),
    truncateText(profile.analysisMarkdown, 160),
    collectRuleHighlights(profile).join("; "),
  ].filter(Boolean);
  return parts.join(" | ");
}

function buildNovelSummary(novel: {
  title: string;
  description: string | null;
  targetAudience: string | null;
  bookSellingPoint: string | null;
  competingFeel: string | null;
  first30ChapterPromise: string | null;
  commercialTagsJson: string | null;
  styleTone: string | null;
  narrativePov: string | null;
  pacePreference: string | null;
  emotionIntensity: string | null;
  aiFreedom: string | null;
  estimatedChapterCount: number | null;
  outline: string | null;
  structuredOutline: string | null;
  genre?: { name: string } | null;
  world?: { name: string; worldType: string | null } | null;
}, chapterCount: number): string {
  const bookFramingSummary = buildBookFramingSummary(novel);
  return [
    `Title: ${novel.title}`,
    novel.genre?.name ? `Genre: ${novel.genre.name}` : "",
    novel.description?.trim() ? `Blurb: ${truncateText(novel.description, 220)}` : "",
    bookFramingSummary ? `Book-level framing:\n${bookFramingSummary}` : "",
    novel.styleTone?.trim() ? `Keywords for writing style:${novel.styleTone.trim()}` : "",
    novel.narrativePov ? `Narrative perspective:${novel.narrativePov}` : "",
    novel.pacePreference ? `Rhythm preference:${novel.pacePreference}` : "",
    novel.emotionIntensity ? `Emotional intensity:${novel.emotionIntensity}` : "",
    novel.aiFreedom ? `AI degrees of freedom:${novel.aiFreedom}` : "",
    novel.estimatedChapterCount ? `Estimated number of chapters: ${novel.estimatedChapterCount}` : "",
    chapterCount > 0 ? `Current number of chapters:${chapterCount}` : "",
    novel.world?.name ? `World view:${novel.world.name}${novel.world.worldType ? ` (${novel.world.worldType})` : ""}` : "",
    novel.outline?.trim() ? `Story direction: ${truncateText(novel.outline, 260)}` : "",
    novel.structuredOutline?.trim() ? `Structured outline excerpt: ${truncateText(novel.structuredOutline, 260)}` : "",
  ].filter(Boolean).join("\n");
}

function mapRecommendationCandidate(
  candidate: RecommendationCandidateRecord,
  profile: StyleProfile,
): StyleRecommendationCandidate {
  return {
    styleProfileId: profile.id,
    styleProfileName: profile.name,
    styleProfileDescription: profile.description ?? null,
    fitScore: clamp(candidate.fitScore, 0, 100),
    recommendationReason: candidate.recommendationReason.trim(),
    caution: candidate.caution?.trim() || null,
  };
}

function dedupeCandidates(
  parsed: { candidates: RecommendationCandidateRecord[] },
  profilesById: Map<string, StyleProfile>,
): StyleRecommendationResult["candidates"] {
  const seen = new Set<string>();
  const candidates: StyleRecommendationCandidate[] = [];
  for (const item of parsed.candidates) {
    const profile = profilesById.get(item.styleProfileId);
    if (!profile || seen.has(profile.id)) {
      continue;
    }
    seen.add(profile.id);
    candidates.push(mapRecommendationCandidate(item, profile));
  }
  return candidates.sort((left, right) => right.fitScore - left.fitScore);
}

export class StyleRecommendationService {
  async recommendForNovel(input: RecommendForNovelInput): Promise<StyleRecommendationResult> {
    await ensureStyleEngineSeedData();

    const [novel, chapterCount, profileRows] = await Promise.all([
      prisma.novel.findUnique({
        where: { id: input.novelId },
        include: {
          genre: { select: { name: true } },
          world: { select: { name: true, worldType: true } },
        },
      }),
      prisma.chapter.count({ where: { novelId: input.novelId } }),
      prisma.styleProfile.findMany({
        where: { status: "active" },
        include: {
          antiAiBindings: {
            where: { enabled: true },
            include: { antiAiRule: true },
          },
        },
        orderBy: { updatedAt: "desc" },
        take: 12,
      }),
    ]);

    if (!novel) {
      throw new Error("The novel does not exist.");
    }

    const profiles = profileRows.map((row) => mapStyleProfileRow(row));
    if (profiles.length === 0) {
      return {
        novelId: input.novelId,
        summary: "There is no writing asset to recommend yet. Create or save 1-2 writing assets in the style engine first, then come back for recommendations.",
        candidates: [],
        recommendedAt: new Date().toISOString(),
      };
    }

    const profilesById = new Map(profiles.map((profile) => [profile.id, profile]));
    const targetCount = profiles.length === 1 ? 1 : 2;
    const catalogText = profiles
      .map((profile, index) => (
        `${index + 1}. ID=${profile.id}\nname: ${profile.name}\nsummary: ${buildProfileSummary(profile)}`
      ))
      .join("\n\n");
    const novelSummary = buildNovelSummary(novel, chapterCount);

    const result = await runStructuredPrompt({
      asset: styleRecommendationPrompt,
      promptInput: {
        targetCount,
        novelSummary,
        catalogText,
        allowedProfileIds: profiles.map((profile) => profile.id),
      },
      options: {
        provider: input.provider,
        model: input.model,
        temperature: Math.min(input.temperature ?? 0.3, 0.5),
      },
    });
    const parsed = result.output;

    return {
      novelId: input.novelId,
      summary: parsed.summary,
      candidates: dedupeCandidates(parsed, profilesById),
      recommendedAt: new Date().toISOString(),
    };
  }
}

export const styleRecommendationService = new StyleRecommendationService();

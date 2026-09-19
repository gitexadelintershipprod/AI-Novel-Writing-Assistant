import type { LLMProvider } from "@ai-novel/shared/types/llm";
import { prisma } from "../../../db/prisma";
import { runStructuredPrompt } from "../../../prompting/core/promptRunner";
import {
  dramaSourceSupplementPrompt,
  dramaTrackRecommendationPrompt,
} from "../../../prompting/prompts/drama/drama.prompts";
import { rhythmEngine } from "../engine/rhythmEngine";

export interface DramaLLMOptions {
  provider?: LLMProvider;
  model?: string;
  temperature?: number;
}

export interface RecommendDramaTrackInput extends DramaLLMOptions {
  title: string;
  sourceType: string;
  sourceDigest?: string;
  theme?: string;
  targetEpisodes?: number;
}

export interface AnalyzeDramaSourceSupplementInput extends DramaLLMOptions {
  userSupplement?: string;
}

function safeJson<T>(input: string | null | undefined, fallback: T): T {
  if (!input) {
    return fallback;
  }
  try {
    return JSON.parse(input) as T;
  } catch {
    return fallback;
  }
}

function compactText(input: unknown, max = 900): string {
  const text = typeof input === "string" ? input : JSON.stringify(input);
  const normalized = (text ?? "").replace(/\s+/g, " ").trim();
  return normalized.length > max ? `${normalized.slice(0, max)}...` : normalized;
}

function buildTrackCatalog(): string {
  return rhythmEngine
    .listTracks()
    .map((track) => [
      `- ${track.id}｜${track.label}`,
      `  描述：${track.description}`,
      `  爽点节奏：${track.rhythmNote}`,
      `  禁忌：${track.taboos.join("；")}`,
    ].join("\n"))
    .join("\n");
}

function buildDigestList(items: unknown[], maxItems: number, maxChars = 260): string {
  return items
    .slice(0, maxItems)
    .map((item, index) => `${index + 1}. ${compactText(item, maxChars)}`)
    .join("\n");
}

export class DramaGuidanceService {
  async recommendTrack(input: RecommendDramaTrackInput) {
    const result = await runStructuredPrompt({
      asset: dramaTrackRecommendationPrompt,
      promptInput: {
        title: input.title,
        sourceType: input.sourceType,
        sourceDigest: input.sourceDigest?.trim() || "The user has not given detailed materials yet. Make conservative recommendations from the title, source, and genre.",
        theme: input.theme,
        targetEpisodes: input.targetEpisodes ?? 80,
        trackCatalog: buildTrackCatalog(),
      },
      options: {
        provider: input.provider,
        model: input.model,
        temperature: input.temperature ?? 0.4,
      },
    });

    return result.output;
  }

  async analyzeSourceSupplement(projectId: string, input: AnalyzeDramaSourceSupplementInput = {}) {
    const project = await prisma.dramaProject.findUnique({
      where: { id: projectId },
      include: {
        sourceBundle: true,
        characters: { orderBy: { createdAt: "asc" } },
      },
    });
    if (!project) {
      throw new Error(`Drama project ${projectId} was not found.`);
    }
    if (!project.sourceBundle) {
      throw new Error("Organize the source materials before generating extra suggestions.");
    }

    const beats = safeJson<unknown[]>(project.sourceBundle.beats, []);
    const facts = safeJson<unknown[]>(project.sourceBundle.hardFacts, []);
    const qualitySnapshot = [
      `梗概：${project.sourceBundle.synopsis?.trim() ? "已提供" : "缺少"}`,
      `节拍数量：${beats.length}`,
      `Number of characters：${project.characters.length}`,
      `硬事实数量：${facts.length}`,
      `Number of target sets：${project.targetEpisodes}`,
    ].join("\n");

    const result = await runStructuredPrompt({
      asset: dramaSourceSupplementPrompt,
      promptInput: {
        projectTitle: project.title,
        sourceType: project.source,
        targetEpisodes: project.targetEpisodes,
        qualitySnapshot,
        synopsis: project.sourceBundle.synopsis ?? "",
        beatsDigest: buildDigestList(beats, 24),
        charactersDigest: buildDigestList(project.characters, 20),
        factsDigest: buildDigestList(facts, 20),
        userSupplement: input.userSupplement,
      },
      options: {
        provider: input.provider,
        model: input.model,
        temperature: input.temperature ?? 0.4,
      },
    });

    return result.output;
  }
}

export const dramaGuidanceService = new DramaGuidanceService();

/**
 * Short-drama strategy-planning service (P1-B).
 *
 * Reads the project content bundle + track template → LLM generates an adaptation strategy → persist project.strategy.
 */
import type { LLMProvider } from "@ai-novel/shared/types/llm";
import { prisma } from "../../db/prisma";
import { runStructuredPrompt } from "../../prompting/core/promptRunner";
import { dramaStrategyPrompt } from "../../prompting/prompts/drama/drama.prompts";
import {
  DEFAULT_PAYWALL_STRATEGY,
  rhythmEngine,
  type TrackId,
} from "./engine/rhythmEngine";

export interface DramaLLMOptions {
  provider?: LLMProvider;
  model?: string;
  temperature?: number;
}

export class DramaStrategyService {
  async generateStrategy(projectId: string, options: DramaLLMOptions = {}) {
    const project = await prisma.dramaProject.findUnique({
      where: { id: projectId },
      include: { sourceBundle: true },
    });
    if (!project) {
      throw new Error(`Drama project ${projectId} was not found.`);
    }
    if (!project.track) {
      throw new Error("Set the project track before generating a strategy.");
    }
    const track = rhythmEngine.getTrack(project.track as TrackId);
    if (!track) {
      throw new Error(`Unknown track: ${project.track}`);
    }
    const synopsis = project.sourceBundle?.synopsis?.trim();
    if (!synopsis) {
      throw new Error("Assemble the source-bundle before generating a strategy.");
    }

    const preferredHooks = rhythmEngine
      .recommendHooksForTrack(track.id)
      .map((hook) => hook.label)
      .join(", ");

    const result = await runStructuredPrompt({
      asset: dramaStrategyPrompt,
      promptInput: {
        synopsis,
        trackLabel: track.label,
        trackDescription: track.description,
        rhythmNote: track.rhythmNote,
        taboos: track.taboos.join("; "),
        preferredHooks,
        targetEpisodes: project.targetEpisodes,
        freeEpisodes: DEFAULT_PAYWALL_STRATEGY.freeEpisodes,
        firstPaywallAt: DEFAULT_PAYWALL_STRATEGY.firstPaywallAt,
      },
      options: {
        provider: options.provider,
        model: options.model,
        temperature: options.temperature ?? 0.6,
      },
    });

    const strategy = result.output;
    await prisma.dramaProject.update({
      where: { id: projectId },
      data: { strategy: JSON.stringify(strategy), status: "strategized" },
    });

    return strategy;
  }
}

export const dramaStrategyService = new DramaStrategyService();

/**
 * Short-drama episode-outline service (P1-C).
 *
 * Reads strategy + source beats → LLM generates a range of episode outlines → persist DramaEpisode.
 * Paywall episode numbers come from the rhythm engine deterministically (not left to the LLM)
 * so paid pacing stays controllable.
 */
import type { LLMProvider } from "@ai-novel/shared/types/llm";
import { prisma } from "../../db/prisma";
import { runStructuredPrompt } from "../../prompting/core/promptRunner";
import { dramaEpisodeOutlinePrompt } from "../../prompting/prompts/drama/drama.prompts";
import { rhythmEngine, type TrackId } from "./engine/rhythmEngine";
import {
  describeDramaPaywallPlan,
  resolveDramaPaywallPlan,
} from "./engine/paywallPlanPolicy";
import type { DramaLLMOptions } from "./DramaStrategyService";

interface SourceBeatLite {
  order: number;
  summary: string;
}

export interface GenerateOutlineInput {
  startOrder?: number;
  count?: number;
}

export class DramaEpisodeOutlineService {
  async generateOutline(
    projectId: string,
    input: GenerateOutlineInput = {},
    options: DramaLLMOptions = {},
  ) {
    const project = await prisma.dramaProject.findUnique({
      where: { id: projectId },
      include: { sourceBundle: true },
    });
    if (!project) {
      throw new Error(`Drama project ${projectId} was not found.`);
    }
    if (!project.strategy) {
      throw new Error("Generate the adaptation strategy before generating the episode outline.");
    }
    if (!project.track || !rhythmEngine.getTrack(project.track as TrackId)) {
      throw new Error("The project track is invalid. Set a valid track first.");
    }
    const track = rhythmEngine.getTrack(project.track as TrackId)!;
    const synopsis = project.sourceBundle?.synopsis?.trim() ?? "";
    const paywallPlan = resolveDramaPaywallPlan(project.strategy, project.targetEpisodes);

    const startOrder = Math.max(1, input.startOrder ?? 1);
    const count = Math.min(40, Math.max(1, input.count ?? 12));
    const endOrder = Math.min(project.targetEpisodes, startOrder + count - 1);

    // Beat digest (truncated so it stays inside budget).
    let beats: SourceBeatLite[] = [];
    try {
      beats = JSON.parse(project.sourceBundle?.beats ?? "[]") as SourceBeatLite[];
    } catch {
      beats = [];
    }
    const beatsDigest = beats
      .slice(0, 60)
      .map((beat) => `${beat.order}: ${beat.summary}`)
      .join("\n") || "(No structured beats; split episodes from the synopsis.)";

    const hookLibrary = rhythmEngine
      .listHooks()
      .map((hook) => `${hook.id}: ${hook.label} — ${hook.description}`)
      .join("\n");

    // Deterministic paywall episode numbers.
    const paywallInRange: number[] = [];
    for (let order = startOrder; order <= endOrder; order += 1) {
      if (rhythmEngine.isPaywallEpisode(order, project.targetEpisodes, paywallPlan)) {
        paywallInRange.push(order);
      }
    }

    const result = await runStructuredPrompt({
      asset: dramaEpisodeOutlinePrompt,
      promptInput: {
        synopsis,
        strategyJson: project.strategy,
        beatsDigest,
        trackLabel: track.label,
        hookLibrary,
        startOrder,
        count: endOrder - startOrder + 1,
        paywallEpisodes: paywallInRange.join(", "),
        paywallPlanDigest: describeDramaPaywallPlan(paywallPlan),
      },
      options: {
        provider: options.provider,
        model: options.model,
        temperature: options.temperature ?? 0.7,
      },
    });

    // Persist: upsert by (projectId, order). Paywall is decided by the engine (do not trust the LLM).
    const episodes = result.output.episodes.filter(
      (episode) => episode.order >= startOrder && episode.order <= endOrder,
    );

    for (const episode of episodes) {
      const isPaywall = rhythmEngine.isPaywallEpisode(episode.order, project.targetEpisodes, paywallPlan);
      const sourceMap = episode.sourceBeatRefs && episode.sourceBeatRefs.length > 0
        ? JSON.stringify({ beatRefs: episode.sourceBeatRefs })
        : null;
      const beatSheet = JSON.stringify({
        conflict: episode.conflict,
      });
      await prisma.dramaEpisode.upsert({
        where: { projectId_order: { projectId, order: episode.order } },
        update: {
          title: episode.title,
          hookOpening: episode.hookOpening,
          hookType: episode.hookType,
          cliffhanger: episode.cliffhanger,
          emotionNet: episode.emotionNet,
          isPaywall,
          beatSheet,
          sourceMap,
          status: "planned",
        },
        create: {
          projectId,
          order: episode.order,
          title: episode.title,
          hookOpening: episode.hookOpening,
          hookType: episode.hookType,
          cliffhanger: episode.cliffhanger,
          emotionNet: episode.emotionNet,
          isPaywall,
          beatSheet,
          sourceMap,
          status: "planned",
        },
      });
    }

    await prisma.dramaProject.update({
      where: { id: projectId },
      data: { status: "outlined" },
    });

    return { generated: episodes.length, startOrder, endOrder };
  }
}

export const dramaEpisodeOutlineService = new DramaEpisodeOutlineService();

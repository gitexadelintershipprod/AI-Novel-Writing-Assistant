/**
 * Comic episode-planning service.
 *
 * Reuses the already-validated drama rhythmEngine + paywallPlanPolicy to generate
 * per-episode outlines (hookType / cliffhanger / paywall beats) and persist ComicEpisode rows.
 */
import type { LLMProvider } from "@ai-novel/shared/types/llm";
import { prisma } from "../../db/prisma";
import { runStructuredPrompt } from "../../prompting/core/promptRunner";
import { comicEpisodeOutlinePrompt } from "../../prompting/prompts/comic/comic.prompts";
// rhythmEngine is pure domain knowledge (zero external deps) and can be imported directly.
import { rhythmEngine, type TrackId } from "../drama/engine/rhythmEngine";
import {
  describeDramaPaywallPlan,
  resolveDramaPaywallPlan,
} from "../drama/engine/paywallPlanPolicy";

export interface GenerateComicOutlineInput {
  startOrder?: number;
  count?: number;
}

export class ComicEpisodePlanService {
  async generateOutline(
    projectId: string,
    input: GenerateComicOutlineInput = {},
    provider?: LLMProvider,
  ) {
    const project = await prisma.comicProject.findUnique({
      where: { id: projectId },
      include: { sourceBundle: true },
    });
    if (!project) throw new Error(`Comic project not found: ${projectId}`);
    if (!project.sourceBundle) {
      throw new Error("Import the source bundle (importSourceBundle) before generating the episode outline.");
    }

    const bundle = JSON.parse(project.sourceBundle.bundleJson);
    const synopsis: string = bundle.synopsis ?? "";
    const beats: Array<{ order: number; summary: string }> = bundle.beats ?? [];

    const trackId = project.trackId as TrackId | undefined;
    const track = trackId ? rhythmEngine.getTrack(trackId) : null;

    // Target episode count: derived from beat count, default 20 episodes.
    const targetEpisodes = Math.max(10, Math.min(100, Math.ceil(beats.length / 3)));

    const startOrder = Math.max(1, input.startOrder ?? 1);
    const count = Math.min(40, Math.max(1, input.count ?? 12));
    const endOrder = Math.min(targetEpisodes, startOrder + count - 1);

    const beatsDigest = beats
      .slice(0, 60)
      .map((beat) => `${beat.order}: ${beat.summary}`)
      .join("\n") || "(No structured beats; split episodes freely from the synopsis.)";

    // Paywall episode numbers (only when a track strategy exists).
    const paywallOrders: number[] = [];
    if (track) {
      const paywallPlan = resolveDramaPaywallPlan(
        JSON.stringify({ paywallDensity: "medium" }),
        targetEpisodes,
      );
      for (let order = startOrder; order <= endOrder; order += 1) {
        if (rhythmEngine.isPaywallEpisode(order, targetEpisodes, paywallPlan)) {
          paywallOrders.push(order);
        }
      }
    }

    const hookLibrary = rhythmEngine
      .listHooks()
      .map((hook) => `${hook.id}: ${hook.label} — ${hook.description}`)
      .join("\n");

    const result = await runStructuredPrompt({
      asset: comicEpisodeOutlinePrompt,
      promptInput: {
        title: project.title,
        synopsis,
        beatsDigest,
        startOrder,
        endOrder,
        paywallOrders,
        hookLibrary,
        stylePreset: project.stylePreset
          ? JSON.parse(project.stylePreset).style
          : undefined,
      },
      options: { temperature: 0.6, provider },
    });

    const episodes = result.output.episodes;

    // Transaction: persist ComicEpisode (idempotent; update when order already exists).
    await prisma.$transaction(async (tx) => {
      for (const ep of episodes) {
        await tx.comicEpisode.upsert({
          where: { projectId_order: { projectId, order: ep.order } },
          create: {
            projectId,
            order: ep.order,
            title: ep.title,
            outline: ep.synopsis,
            hookType: ep.hookType ?? null,
            cliffhanger: ep.cliffhanger ?? null,
            isPaywalled: ep.isPaywalled,
            status: "draft",
          },
          update: {
            title: ep.title,
            outline: ep.synopsis,
            hookType: ep.hookType ?? null,
            cliffhanger: ep.cliffhanger ?? null,
            isPaywalled: ep.isPaywalled,
          },
        });
      }
      await tx.comicProject.update({
        where: { id: projectId },
        data: { status: "outlined" },
      });
    });

    return prisma.comicEpisode.findMany({
      where: { projectId, order: { gte: startOrder, lte: endOrder } },
      orderBy: { order: "asc" },
    });
  }

  async listEpisodes(projectId: string) {
    return prisma.comicEpisode.findMany({
      where: { projectId },
      orderBy: { order: "asc" },
      include: { _count: { select: { panels: true } } },
    });
  }

  async getEpisode(episodeId: string) {
    return prisma.comicEpisode.findUnique({
      where: { id: episodeId },
      include: { panels: { orderBy: { order: "asc" } } },
    });
  }

  async updateEpisodeSourceText(episodeId: string, sourceText: string) {
    return prisma.comicEpisode.update({
      where: { id: episodeId },
      data: { sourceText },
    });
  }

  async updateEpisode(
    episodeId: string,
    patch: { title?: string; outline?: string; cliffhanger?: string; isPaywalled?: boolean },
  ) {
    const data: Record<string, unknown> = {};
    if (patch.title !== undefined) data.title = patch.title.trim() || null;
    if (patch.outline !== undefined) data.outline = patch.outline.trim() || null;
    if (patch.cliffhanger !== undefined) data.cliffhanger = patch.cliffhanger.trim() || null;
    if (patch.isPaywalled !== undefined) data.isPaywalled = patch.isPaywalled;
    return prisma.comicEpisode.update({
      where: { id: episodeId },
      data,
      include: { _count: { select: { panels: true } } },
    });
  }
}

import type { LLMProvider } from "@ai-novel/shared/types/llm";
import { prisma } from "../../db/prisma";
import { AppError } from "../../middleware/errorHandler";
import { comicPanelImageService } from "./ComicPanelImageService";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface BatchProgress {
  total: number;
  done: number;
  failed: number;
  failedPanelIds: string[];
  status: "running" | "completed" | "partial";
}

export interface StartBatchOptions {
  provider?: LLMProvider;
  /** Concurrent panels, default 3 (avoid API rate limits). */
  concurrency?: number;
  /** Skip panels that already have an image, default true. */
  skipDone?: boolean;
}

// ─── Provider cost estimate (cents per image, rough) ─────────────────────────

const COST_PER_IMAGE_CENTS: Partial<Record<string, number>> = {
  openai: 4,   // gpt-image-1 ~$0.04/image
  jimeng: 0.5, // Jimeng is about ¥0.04 / image
  grok: 10,
};

// ─── Orchestrator ─────────────────────────────────────────────────────────────

export class ComicBatchOrchestrator {
  /**
   * Batch-generate images for every panel in an episode.
   * - Concurrency is capped (default 3) to avoid API rate limits.
   * - Failed panels are recorded in ComicBatchJob.progress and can be retried.
   * - ComicBatchJob is written so the frontend can poll progress.
   */
  async startEpisodeBatch(
    episodeId: string,
    opts: StartBatchOptions = {},
  ): Promise<{ jobId: string }> {
    const { provider = "openai", concurrency = 3, skipDone = true } = opts;

    const episode = await prisma.comicEpisode.findUnique({
      where: { id: episodeId },
      include: {
        panels: { orderBy: { order: "asc" } },
        project: true,
      },
    });
    if (!episode) throw new AppError(`Episode not found: ${episodeId}`, 404);
    if (episode.panels.length === 0) {
      throw new AppError("This episode has no panel script yet. Generate the script before batch-generating images.", 400);
    }

    // Filter panels that still need generation.
    const targetPanels = skipDone
      ? episode.panels.filter((p) => {
          if (!p.imageData) return true;
          try {
            const d = JSON.parse(p.imageData) as { status?: string };
            return d.status !== "done";
          } catch {
            return true;
          }
        })
      : episode.panels;

    if (targetPanels.length === 0) {
      throw new AppError("Every panel already has an image, so regeneration is not needed. To regenerate, use skipDone=false.", 400);
    }

    // Create the BatchJob record.
    const progress: BatchProgress = {
      total: targetPanels.length,
      done: 0,
      failed: 0,
      failedPanelIds: [],
      status: "running",
    };
    const batchJob = await prisma.comicBatchJob.create({
      data: {
        projectId: episode.projectId,
        type: "episode_image_batch",
        status: "running",
        progress: JSON.stringify(progress),
      },
    });

    // Run asynchronously so the HTTP response is not blocked.
    void this._runBatch(batchJob.id, targetPanels.map((p) => p.id), provider, concurrency);

    return { jobId: batchJob.id };
  }

  private async _runBatch(
    jobId: string,
    panelIds: string[],
    provider: LLMProvider,
    concurrency: number,
  ): Promise<void> {
    const progress: BatchProgress = {
      total: panelIds.length,
      done: 0,
      failed: 0,
      failedPanelIds: [],
      status: "running",
    };

    // Concurrency pool: at most `concurrency` panels at a time.
    const queue = [...panelIds];
    const workers: Promise<void>[] = [];

    const runNext = async () => {
      while (queue.length > 0) {
        const panelId = queue.shift()!;
        try {
          await comicPanelImageService.generatePanelImage(panelId, provider);
          progress.done++;
        } catch {
          progress.failed++;
          progress.failedPanelIds.push(panelId);
        }
        // Persist progress after each panel.
        await prisma.comicBatchJob.update({
          where: { id: jobId },
          data: { progress: JSON.stringify(progress) },
        }).catch(() => { /* Progress-write failure must not stop the batch. */ });
      }
    };

    for (let i = 0; i < concurrency; i++) {
      workers.push(runNext());
    }
    await Promise.all(workers);

    progress.status = progress.failed === 0 ? "completed" : "partial";
    const finalStatus = progress.status === "completed" ? "completed" : "partial";

    await prisma.comicBatchJob.update({
      where: { id: jobId },
      data: {
        status: finalStatus,
        progress: JSON.stringify(progress),
      },
    }).catch(() => {});

    console.log(
      `[comic.batch] job=${jobId} done=${progress.done} failed=${progress.failed} status=${finalStatus}`,
    );
  }

  /**
   * Retry failed panels (read failedPanelIds from the BatchJob).
   */
  async retryFailed(jobId: string, opts: { provider?: LLMProvider } = {}): Promise<{ jobId: string }> {
    const job = await prisma.comicBatchJob.findUnique({ where: { id: jobId } });
    if (!job) throw new AppError(`Batch job not found: ${jobId}`, 404);
    if (job.status === "running") throw new AppError("The task is still running. Wait until it finishes, then retry.", 409);

    const prev = JSON.parse(job.progress) as BatchProgress;
    if (prev.failedPanelIds.length === 0) {
      throw new AppError("There are no failed panels to retry.", 400);
    }

    const provider = opts.provider ?? "openai";
    const newProgress: BatchProgress = {
      total: prev.failedPanelIds.length,
      done: 0,
      failed: 0,
      failedPanelIds: [],
      status: "running",
    };

    await prisma.comicBatchJob.update({
      where: { id: jobId },
      data: { status: "running", progress: JSON.stringify(newProgress) },
    });

    void this._runBatch(jobId, prev.failedPanelIds, provider, 3);
    return { jobId };
  }

  /**
   * Rough estimate of batch-generation cost.
   */
  async estimateCost(episodeId: string, provider: string = "openai"): Promise<{
    totalPanels: number;
    pendingPanels: number;
    estimatedCentsCost: number;
    providerNote: string;
  }> {
    const panels = await prisma.comicPanel.findMany({
      where: { episodeId },
      select: { imageData: true },
    });
    const pending = panels.filter((p) => {
      if (!p.imageData) return true;
      try {
        const d = JSON.parse(p.imageData) as { status?: string };
        return d.status !== "done";
      } catch { return true; }
    });

    const centsPerImage = COST_PER_IMAGE_CENTS[provider] ?? 4;
    return {
      totalPanels: panels.length,
      pendingPanels: pending.length,
      estimatedCentsCost: pending.length * centsPerImage,
      providerNote: `Estimate based on ${provider} at about ${centsPerImage} cents per image; actual cost follows the platform bill.`,
    };
  }

  async getBatchJob(jobId: string) {
    return prisma.comicBatchJob.findUnique({ where: { id: jobId } });
  }

  async listBatchJobs(projectId: string) {
    return prisma.comicBatchJob.findMany({
      where: { projectId },
      orderBy: { createdAt: "desc" },
    });
  }
}

export const comicBatchOrchestrator = new ComicBatchOrchestrator();

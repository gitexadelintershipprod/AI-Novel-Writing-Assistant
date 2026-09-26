import { ragConfig } from "../../config/rag";
import { RagIndexService, RagJobCancelledError, type RagJobProgressSnapshot } from "./RagIndexService";
import type { KnowledgeGraphService } from "./graph";

function backoffMs(attempt: number): number {
  const factor = Math.min(Math.max(attempt, 1), 6);
  return ragConfig.workerRetryBaseMs * (2 ** (factor - 1));
}

export class RagWorker {
  private timer: NodeJS.Timeout | null = null;
  private isTicking = false;
  private startGeneration = 0;
  private started = false;

  constructor(
    private readonly ragIndexService: RagIndexService,
    private readonly knowledgeGraphService?: KnowledgeGraphService,
  ) {}

  private graphProgressQueue: Promise<void> = Promise.resolve();

  private enqueueGraphProgress(
    jobId: string,
    progress: Omit<RagJobProgressSnapshot, "updatedAt">,
  ): Promise<void> {
    const write = this.graphProgressQueue.then(() => this.ragIndexService.updateJobProgress(jobId, progress));
    this.graphProgressQueue = write.then(() => undefined, () => undefined);
    return write;
  }

  private logInfo(message: string, meta?: Record<string, unknown>): void {
    if (!ragConfig.verboseLog) {
      return;
    }
    if (meta) {
      console.info(`[RAG][Worker] ${message}`, meta);
      return;
    }
    console.info(`[RAG][Worker] ${message}`);
  }

  private logWarn(message: string, meta?: Record<string, unknown>): void {
    if (!ragConfig.verboseLog) {
      return;
    }
    if (meta) {
      console.warn(`[RAG][Worker] ${message}`, meta);
      return;
    }
    console.warn(`[RAG][Worker] ${message}`);
  }

  start(): void {
    if (!ragConfig.enabled || this.started) {
      return;
    }
    this.logInfo("Worker started.", {
      pollMs: ragConfig.workerPollMs,
      maxAttempts: ragConfig.workerMaxAttempts,
      retryBaseMs: ragConfig.workerRetryBaseMs,
    });
    this.started = true;
    const generation = ++this.startGeneration;
    void this.requeueInterruptedJobs().then(() => {
      if (!this.started || generation !== this.startGeneration) return;
      this.timer = setInterval(() => { void this.tick(); }, ragConfig.workerPollMs);
      void this.tick();
    }).catch((error: unknown) => {
      if (generation === this.startGeneration) this.started = false;
      console.error("[RAG][Worker] Startup recovery failed; worker not started.", error);
    });
  }

  private async requeueInterruptedJobs(): Promise<void> {
    while (true) {
      const runningJobs = await this.ragIndexService.listJobs(500, "running");
      if (runningJobs.length === 0) {
        return;
      }
      this.logWarn("Requeue interrupted running jobs after restart.", {
        count: runningJobs.length,
      });
      await Promise.all(
        runningJobs.map((job) =>
          this.ragIndexService.updateJobStatus(job.id, {
            status: "queued",
            runAfter: new Date(),
            lastError: job.lastError ?? "RAG worker restarted; interrupted job requeued.",
          })
        ),
      );
    }
  }

  stop(): void {
    this.started = false;
    this.startGeneration += 1;
    if (!this.timer) {
      return;
    }
    clearInterval(this.timer);
    this.timer = null;
    this.logInfo("Worker stopped.");
  }

  private async enqueueGraphFollowUp(job: {
    id: string;
    jobType: string;
    ownerType: string;
    ownerId: string;
    tenantId?: string | null;
  }): Promise<void> {
    if (
      (job.jobType !== "upsert" && job.jobType !== "rebuild")
      || job.ownerType !== "knowledge_document"
      || !this.knowledgeGraphService
      || !ragConfig.graphEnabled
    ) {
      return;
    }
    try {
      await this.ragIndexService.enqueueOwnerJob("graph_sync", "knowledge_document", job.ownerId, {
        tenantId: job.tenantId ?? undefined,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "The relationship graph job could not be queued.";
      console.warn("[RAG][Worker] Indexing finished, but the relationship graph job was not queued.", {
        jobId: job.id,
        ownerId: job.ownerId,
        error: message,
      });
    }
  }

  private async tick(): Promise<void> {
    if (this.isTicking) {
      return;
    }
    this.isTicking = true;
    try {
      const job = await this.ragIndexService.getNextRunnableJob();
      if (!job) {
        return;
      }

      const nextAttempt = job.attempts + 1;
      const startedAt = Date.now();
      this.logInfo("Job picked.", {
        jobId: job.id,
        jobType: job.jobType,
        ownerType: job.ownerType,
        ownerId: job.ownerId,
        tenantId: job.tenantId,
        attempt: nextAttempt,
        maxAttempts: job.maxAttempts,
      });
      await this.ragIndexService.updateJobStatus(job.id, {
        status: "running",
        attempts: nextAttempt,
        lastError: null,
      });

      try {
        if (job.jobType === "graph_sync") {
          this.graphProgressQueue = Promise.resolve();
        }
        const result = job.jobType === "graph_sync"
          ? await (this.knowledgeGraphService?.processSyncJob(job, (progress) => {
            const label = progress.phase === "saving"
              ? `Saving relationships ${progress.current}/${progress.total}`
              : (progress.total > 0
                ? `Reading relationships ${progress.current}/${progress.total}`
                : "Reading relationships");
            const fraction = progress.total > 0 ? progress.current / progress.total : 1;
            const percent = progress.phase === "saving"
              ? 0.85 + (0.15 * fraction)
              : 0.85 * fraction;
            return this.enqueueGraphProgress(job.id, {
              stage: "reading_relationships",
              label,
              detail: progress.phase === "saving"
                ? label
                : (progress.total > 0 ? label : "This book has no sections to read."),
              current: progress.current,
              total: progress.total,
              percent,
            });
          }) ?? Promise.resolve({ chunks: 0 }))
          : await this.ragIndexService.processJob(job);
        await this.ragIndexService.updateJobStatus(job.id, {
          status: "succeeded",
          lastError: null,
        });
        await this.enqueueGraphFollowUp(job);
        if (job.jobType === "delete") {
          await this.knowledgeGraphService?.deleteOwner(job.ownerType, job.ownerId, job.tenantId).catch(() => {});
        }
        this.logInfo("Job succeeded.", {
          jobId: job.id,
          chunks: result.chunks,
          elapsedMs: Date.now() - startedAt,
        });
      } catch (error) {
        if (error instanceof RagJobCancelledError) {
          this.logInfo("Job cancelled.", {
            jobId: job.id,
            elapsedMs: Date.now() - startedAt,
          });
          return;
        }
        const message = error instanceof Error ? error.message : "RAG indexing job failed.";
        if (nextAttempt >= job.maxAttempts) {
          await this.ragIndexService.updateJobStatus(job.id, {
            status: "failed",
            attempts: nextAttempt,
            lastError: message,
          });
          this.logWarn("Job failed permanently.", {
            jobId: job.id,
            attempt: nextAttempt,
            maxAttempts: job.maxAttempts,
            elapsedMs: Date.now() - startedAt,
            error: message,
          });
          return;
        }
        const delayMs = backoffMs(nextAttempt);
        await this.ragIndexService.updateJobStatus(job.id, {
          status: "queued",
          attempts: nextAttempt,
          runAfter: new Date(Date.now() + delayMs),
          lastError: message,
        });
        this.logWarn("Job failed and requeued.", {
          jobId: job.id,
          attempt: nextAttempt,
          nextRetryInMs: delayMs,
          elapsedMs: Date.now() - startedAt,
          error: message,
        });
      }
    } finally {
      this.isTicking = false;
    }
  }
}

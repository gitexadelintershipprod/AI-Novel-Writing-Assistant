import type { NovelCorePipelineService } from "./novelCorePipelineService";

const SERVER_RESTART_RECOVERY_MESSAGE = "The chapter pipeline task stopped after a service restart and is trying to recover.";
const STALE_PIPELINE_RECOVERY_MESSAGE = "The chapter pipeline task heartbeat timed out and is trying to recover.";
const DEFAULT_WATCHDOG_INTERVAL_MS = 60000;
const DEFAULT_STALE_THRESHOLD_MS = 3 * 60 * 1000;

interface PipelineRecoveryPort {
  listPendingCancellationPipelineJobs(): Promise<Array<{ id: string; status: string }>>;
  listRecoverablePipelineJobs(): Promise<Array<{ id: string; status: string }>>;
  listStaleRecoverablePipelineJobs(cutoff: Date): Promise<Array<{ id: string; status: string }>>;
  markPipelineJobCancelled(jobId: string): Promise<void>;
  markPipelineJobFailed(jobId: string, message: string): Promise<void>;
  markPipelineJobPendingManualRecovery(jobId: string, message: string): Promise<void>;
}

interface PipelineResumePort {
  resumePipelineJob(jobId: string): Promise<void>;
}

function createPipelineService(): PipelineRecoveryPort & PipelineResumePort {
  const { NovelCorePipelineService } = require("./novelCorePipelineService") as typeof import("./novelCorePipelineService");
  return new NovelCorePipelineService();
}

export class NovelPipelineRuntimeService {
  private watchdogTimer: NodeJS.Timeout | null = null;

  constructor(
    private readonly pipelineService: PipelineRecoveryPort & PipelineResumePort = createPipelineService(),
  ) {}

  async resumePendingPipelineJobs(): Promise<void> {
    const pendingCancellationRows = await this.pipelineService.listPendingCancellationPipelineJobs();
    await this.finalizeCancelledJobs(pendingCancellationRows);
    const rows = await this.pipelineService.listRecoverablePipelineJobs();
    await this.recoverJobs(rows, SERVER_RESTART_RECOVERY_MESSAGE);
  }

  async markPendingPipelineJobsForManualRecovery(): Promise<void> {
    const pendingCancellationRows = await this.pipelineService.listPendingCancellationPipelineJobs();
    await this.finalizeCancelledJobs(pendingCancellationRows);
    const rows = await this.pipelineService.listRecoverablePipelineJobs();
    for (const row of rows) {
      await this.pipelineService.markPipelineJobPendingManualRecovery(row.id, "The task paused after a service restart and is waiting for manual recovery.");
    }
  }

  async recoverStalePipelineJobs(now = new Date(), staleThresholdMs = DEFAULT_STALE_THRESHOLD_MS): Promise<void> {
    const cutoff = new Date(now.getTime() - Math.max(10000, staleThresholdMs));
    const rows = await this.pipelineService.listStaleRecoverablePipelineJobs(cutoff);
    await this.recoverJobs(rows, STALE_PIPELINE_RECOVERY_MESSAGE);
  }

  startWatchdog(input: {
    intervalMs?: number;
    staleThresholdMs?: number;
  } = {}): void {
    if (this.watchdogTimer) {
      return;
    }
    const intervalMs = Math.max(15000, input.intervalMs ?? DEFAULT_WATCHDOG_INTERVAL_MS);
    const staleThresholdMs = Math.max(intervalMs * 2, input.staleThresholdMs ?? DEFAULT_STALE_THRESHOLD_MS);
    this.watchdogTimer = setInterval(() => {
      void this.recoverStalePipelineJobs(new Date(), staleThresholdMs).catch((error) => {
        console.warn("Failed to recover stale novel pipeline jobs.", error);
      });
    }, intervalMs);
    this.watchdogTimer.unref?.();
  }

  stopWatchdog(): void {
    if (!this.watchdogTimer) {
      return;
    }
    clearInterval(this.watchdogTimer);
    this.watchdogTimer = null;
  }

  private async recoverJobs(
    rows: Array<{ id: string; status: string }>,
    recoveryMessage: string,
  ): Promise<void> {
    for (const row of rows) {
      try {
        await this.pipelineService.resumePipelineJob(row.id);
      } catch (error) {
        const message = error instanceof Error ? error.message : "The chapter pipeline task failed to recover.";
        await this.pipelineService.markPipelineJobPendingManualRecovery(
          row.id,
          `${recoveryMessage} Recovery failed: ${message}`,
        );
      }
    }
  }

  private async finalizeCancelledJobs(rows: Array<{ id: string; status: string }>): Promise<void> {
    for (const row of rows) {
      try {
        await this.pipelineService.markPipelineJobCancelled(row.id);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Cancelling the chapter pipeline task failed during wrap-up.";
        await this.pipelineService.markPipelineJobFailed(row.id, `${SERVER_RESTART_RECOVERY_MESSAGE} Cancel wrap-up failed: ${message}`);
      }
    }
  }
}

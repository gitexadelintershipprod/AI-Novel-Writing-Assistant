import { isDirectorRecoveryNotNeededError } from "../director/runtime/novelDirectorErrors";
import { DirectorCommandService } from "../director/commands/DirectorCommandService";
import { NovelWorkflowService } from "./NovelWorkflowService";

const SERVER_RESTART_RECOVERY_MESSAGE = "The Auto-Director task stopped after a service restart and is trying to recover.";
const STALE_RUNNING_RECOVERY_MESSAGE = "The Auto-Director task lost its heartbeat, likely from a restart or memory pressure. Check it, then continue or retry.";

interface WorkflowRecoveryPort {
  listRecoverableAutoDirectorTasks(options?: { includeStaleRunningFlag?: boolean }): Promise<Array<{ id: string; status: string; stale?: boolean }>>;
  requeueTaskForRecovery(taskId: string, message: string): Promise<unknown>;
  restoreTaskToCheckpoint(taskId: string): Promise<unknown>;
  markTaskFailed(taskId: string, message: string): Promise<unknown>;
}

interface DirectorRecoveryPort {
  enqueueRecoveryCommand?: (taskId: string) => Promise<unknown>;
  continueTask?: (taskId: string) => Promise<unknown>;
}

function createWorkflowService(): WorkflowRecoveryPort {
  return new NovelWorkflowService();
}

function createDirectorService(): DirectorRecoveryPort {
  return new DirectorCommandService();
}

export class NovelWorkflowRuntimeService {
  constructor(
    private readonly workflowService: WorkflowRecoveryPort = createWorkflowService(),
    private readonly directorService: DirectorRecoveryPort = createDirectorService(),
  ) {}

  async resumePendingAutoDirectorTasks(): Promise<void> {
    const rows = await this.workflowService.listRecoverableAutoDirectorTasks();
    for (const row of rows) {
      try {
        if (row.status === "running") {
          await this.workflowService.requeueTaskForRecovery(row.id, SERVER_RESTART_RECOVERY_MESSAGE);
        }
        await this.enqueueRecoveryCommand(row.id);
      } catch (error) {
        if (isDirectorRecoveryNotNeededError(error)) {
          await this.workflowService.restoreTaskToCheckpoint(row.id);
          continue;
        }
        const message = error instanceof Error ? error.message : "The Auto-Director task failed to recover after the service restart.";
        await this.workflowService.markTaskFailed(row.id, `Recovery after restart failed: ${message}`);
      }
    }
  }

  async markPendingAutoDirectorTasksForManualRecovery(options: {
    staleRunningAsFailed?: boolean;
  } = {}): Promise<void> {
    const rows = await this.workflowService.listRecoverableAutoDirectorTasks({
      includeStaleRunningFlag: options.staleRunningAsFailed === true,
    });
    for (const row of rows) {
      if (options.staleRunningAsFailed === true && row.stale) {
        await this.workflowService.markTaskFailed(row.id, STALE_RUNNING_RECOVERY_MESSAGE);
        continue;
      }
      await this.workflowService.requeueTaskForRecovery(row.id, "The task paused after a service restart and is waiting for manual recovery.");
    }
  }

  private enqueueRecoveryCommand(taskId: string): Promise<unknown> {
    if (this.directorService.enqueueRecoveryCommand) {
      return this.directorService.enqueueRecoveryCommand(taskId);
    }
    if (this.directorService.continueTask) {
      return this.directorService.continueTask(taskId);
    }
    throw new Error("Auto director recovery command service is unavailable.");
  }
}

export class DirectorRecoveryNotNeededError extends Error {
  readonly code = "director_recovery_not_needed";

  constructor(message = "Current director artifacts are complete. No need to continue Auto-Director.") {
    super(message);
    this.name = "DirectorRecoveryNotNeededError";
  }
}

export function isDirectorRecoveryNotNeededError(error: unknown): error is DirectorRecoveryNotNeededError {
  const candidate = error as { code?: unknown } | null;
  return error instanceof DirectorRecoveryNotNeededError
    || (
      Boolean(error)
      && typeof error === "object"
      && candidate?.code === "director_recovery_not_needed"
    );
}

export class DirectorTaskCancelledError extends Error {
  readonly code = "director_task_cancelled";

  constructor(message = "The current Auto-Director task was cancelled.") {
    super(message);
    this.name = "DirectorTaskCancelledError";
  }
}

export function isDirectorTaskCancelledError(error: unknown): error is DirectorTaskCancelledError {
  const candidate = error as { code?: unknown } | null;
  return error instanceof DirectorTaskCancelledError
    || (
      Boolean(error)
      && typeof error === "object"
      && candidate?.code === "director_task_cancelled"
    );
}

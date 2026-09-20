export function isHistoricalAutoDirectorRecoveryNotNeededFailure(input: {
  lane?: string | null;
  status?: string | null;
  checkpointType?: string | null;
  lastError?: string | null;
}): boolean {
  if (input.lane !== "auto_director" || input.status !== "failed" || !input.checkpointType) {
    return false;
  }
  const message = input.lastError?.trim() ?? "";
  return message.includes("The current director artifacts are complete") && message.includes("No need to continue Auto-Director");
}

export function isHistoricalAutoDirectorFront10RecoveryUnsupportedFailure(input: {
  lane?: string | null;
  status?: string | null;
  lastError?: string | null;
}): boolean {
  if (input.lane !== "auto_director" || input.status !== "failed") {
    return false;
  }
  const message = input.lastError?.trim() ?? "";
  return message.includes("Recovery after restart failed")
    && message.includes("This checkpoint cannot continue Auto-Director");
}

export function isAutoDirectorRecoveryInProgress(input: {
  status?: string | null;
  lastError?: string | null;
}): boolean {
  if (input.status !== "queued" && input.status !== "running") {
    return false;
  }
  const message = input.lastError?.trim() ?? "";
  return /service restart/i.test(message)
    && /trying to recover/i.test(message);
}

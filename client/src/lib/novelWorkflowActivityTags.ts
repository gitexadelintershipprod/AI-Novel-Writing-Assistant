const WORKFLOW_ACTIVITY_TAGS = [
  "Assets are being reintroduced",
  "Character development",
  "Status synchronizing",
  "Resource ledger synchronization in progress",
  "The foreshadowing ledger is being synchronized",
  "Ledger calibration in progress",
  "Foreshadowing is being backfilled",
] as const;

export function extractWorkflowActivityTags(value: string | null | undefined): string[] {
  const source = value?.trim() ?? "";
  if (!source) {
    return [];
  }
  return WORKFLOW_ACTIVITY_TAGS.filter((label) => source.includes(label));
}

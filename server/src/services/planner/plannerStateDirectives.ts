export function compactPlannerText(value: string | null | undefined, fallback = ""): string {
  return String(value ?? "").replace(/\s+/g, " ").trim() || fallback;
}

export function takeUniquePlannerItems(
  items: Array<string | null | undefined>,
  limit = items.length,
): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const item of items) {
    const normalized = compactPlannerText(item);
    if (!normalized || seen.has(normalized)) {
      continue;
    }
    seen.add(normalized);
    result.push(normalized);
    if (result.length >= limit) {
      break;
    }
  }
  return result;
}

export function buildPlannerStateDrivenDirective(input: {
  nextAction: string;
  pendingReviewProposalCount: number;
  openAuditIssueCount: number;
}): string {
  return [
    `recommended_next_action=${input.nextAction}`,
    `pending_state_review=${input.pendingReviewProposalCount}`,
    `open_audit_issues=${input.openAuditIssueCount}`,
  ].join("\n");
}

export function buildPlannerStateGoalText(input: {
  summary: string | null;
  targetConflicts: string[];
  targetRelationships: string[];
  targetPayoffs: string[];
  protectedSecrets: string[];
  recentTimeline: string[];
}): string {
  return [
    `Chapter state goal: ${compactPlannerText(input.summary, "none")}`,
    `Conflicts to advance: ${takeUniquePlannerItems(input.targetConflicts, 4).join("; ") || "none"}`,
    `Relationships to advance: ${takeUniquePlannerItems(input.targetRelationships, 4).join("; ") || "none"}`,
    `Payoffs to touch: ${takeUniquePlannerItems(input.targetPayoffs, 4).join("; ") || "none"}`,
    `Do not leak early: ${takeUniquePlannerItems(input.protectedSecrets, 4).join("; ") || "none"}`,
    `Recent key events: ${takeUniquePlannerItems(input.recentTimeline, 3).join("; ") || "none"}`,
  ].join("\n");
}

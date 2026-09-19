import type { GenerationContextPackage } from "@ai-novel/shared/types/chapterRuntime";

export function buildSyntheticCharacterResourceIssues(
  context: GenerationContextPackage["characterResourceContext"],
  input: {
    novelId: string;
    chapterId: string;
  },
): GenerationContextPackage["openAuditIssues"] {
  if (!context) {
    return [];
  }
  const now = new Date().toISOString();
  const blockedIssues = context.blockedItems.slice(0, 4).map((item) => ({
    id: `character-resource:${item.id}:blocked`,
    reportId: `character-resource:${input.novelId}:${input.chapterId}`,
    auditType: "continuity" as const,
    severity: item.status === "destroyed" || item.status === "lost" ? "high" as const : "medium" as const,
    code: "character_resource_unavailable",
    description: `${item.name} is currently ${item.status} and cannot be used as an available resource in this chapter.`,
    evidence: item.evidence[0]?.summary ?? item.summary,
    fixSuggestion: `Prefer a local patch: restore it, replace it, or show why it cannot be used, instead of reusing ${item.name} with no setup.`,
    status: "open" as const,
    createdAt: now,
    updatedAt: now,
  }));
  const highRiskIssues = context.highRiskCommittedItems.slice(0, 3).map((item) => ({
    id: `character-resource:${item.id}:high-risk-committed`,
    reportId: `character-resource:${input.novelId}:${input.chapterId}`,
    auditType: "continuity" as const,
    severity: "medium" as const,
    code: "character_resource_high_risk_committed",
    description: `${item.name} is already on the ledger but carries a high-risk signal. Do not rewrite its ownership, visibility, or consumption in this chapter.`,
    evidence: item.evidence[0]?.summary ?? item.summary,
    fixSuggestion: `Write any use of ${item.name} as a recoverable local patch. Do not turn a high-risk resource into a new irreversible fact.`,
    status: "open" as const,
    createdAt: now,
    updatedAt: now,
  }));
  const pendingProposalIssues = context.pendingProposalItems.slice(0, 3).map((proposal) => ({
    id: `character-resource-proposal:${proposal.id}:pending-review`,
    reportId: `character-resource:${input.novelId}:${input.chapterId}`,
    auditType: "continuity" as const,
    severity: proposal.riskLevel === "high" ? "high" as const : "medium" as const,
    code: "character_resource_pending_proposal",
    description: `${proposal.summary} is still pending confirmation. Do not write this resource change as an already-happened fact until it is confirmed.`,
    evidence: proposal.evidence[0] ?? proposal.summary,
    fixSuggestion: "Confirm or ignore this resource change in the task center first. Draft generation should only use resources already in the ledger.",
    status: "open" as const,
    createdAt: now,
    updatedAt: now,
  }));
  const signalIssues = context.riskSignals
    .filter((signal) => signal.severity === "high" || signal.severity === "critical")
    .slice(0, 3)
    .map((signal, index) => ({
      id: `character-resource:signal:${index}:${signal.code}`,
      reportId: `character-resource:${input.novelId}:${input.chapterId}`,
      auditType: "continuity" as const,
      severity: signal.severity,
      code: signal.code || "character_resource_risk",
      description: signal.summary,
      evidence: signal.summary,
      fixSuggestion: "Prefer patch_first: only patch this chapter's resource ownership, consumption, or knowledge relations. Do not rewrite the whole plot.",
      status: "open" as const,
      createdAt: now,
      updatedAt: now,
    }));
  return [...blockedIssues, ...highRiskIssues, ...pendingProposalIssues, ...signalIssues];
}

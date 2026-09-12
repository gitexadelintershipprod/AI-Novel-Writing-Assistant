import type { WorldConsistencyIssue, WorldConsistencyReport } from "@ai-novel/shared/types/world";

const ISSUE_CODE_LABELS: Record<string, string> = {
  THEMATIC_INCOHERENCE: "Inconsistent thematic framework",
  REDUNDANT_AXIOM_APPLICATION: "Redundant world axioms",
  AXIOM_VIOLATION: "World axiom conflict",
  GENRE_MISMATCH: "Genre signal conflict",
  AXIOM_MAGIC_CONFLICT: "Axiom vs power system conflict",
  TECH_ERA_MISMATCH: "Mixed technology eras",
  CONFLICT_WEAK: "Weak core conflict",
  BASELINE_PASS: "Rule check passed",
};

const ISSUE_MESSAGE_LABELS: Record<string, string> = {
  THEMATIC_INCOHERENCE: "Retrieved supplementary content introduced a thematic framework inconsistent with the core setting.",
  REDUNDANT_AXIOM_APPLICATION: "Supplementary content restates existing axioms without adding new effective constraints.",
  AXIOM_VIOLATION: "The world name or a core concept conflicts with existing axioms or background.",
  GENRE_MISMATCH: "Genre signals are inconsistent with world handbook constraints.",
  AXIOM_MAGIC_CONFLICT: "World axioms conflict with the power system setting.",
  TECH_ERA_MISMATCH: "Technology eras are mixed without sufficient explanation.",
  CONFLICT_WEAK: "Core conflict information is too thin to carry the story.",
  BASELINE_PASS: "No hard conflicts found at the rule level.",
};

const ISSUE_DETAIL_LABELS: Record<string, string> = {
  THEMATIC_INCOHERENCE: "Auxiliary context introduced thematic expression that the original setting never established, which can drift the world's main axis.",
  REDUNDANT_AXIOM_APPLICATION: "The supplementary content mostly repeats existing rules; remove the redundant restatements and keep only genuinely new constraints.",
  AXIOM_VIOLATION: "Naming, genre promise, or core concepts are inconsistent with the world's underlying rules; unify the main setting.",
  GENRE_MISMATCH: "Naming or keywords signal a different genre expectation that doesn't match the handbook's style and rules.",
  AXIOM_MAGIC_CONFLICT: "You restricted supernatural/magic content in the world axioms, but the power system or related text reintroduces it.",
  TECH_ERA_MISMATCH: "Technology descriptions mix elements from different eras without explaining their origin, limits, or transition logic.",
  CONFLICT_WEAK: "Add both sides of the conflict, a trigger event, an escalation path, and failure stakes to sharpen the world's central tension.",
};

const FIELD_LABELS: Record<string, string> = {
  description: "World overview",
  background: "Background",
  geography: "Geography",
  cultures: "Cultures and customs",
  magicSystem: "Power system",
  politics: "Political structure",
  races: "Races",
  religions: "Religions",
  technology: "Technology",
  conflicts: "Core conflict",
  history: "History",
  economy: "Economy",
  factions: "Faction relations",
};

function hasChinese(text: string): boolean {
  return /[\u4E00-\u9FFF]/.test(text);
}

function localizeSummary(summary: string, status: WorldConsistencyReport["status"], issues: WorldConsistencyIssue[]): string {
  if (hasChinese(summary)) {
    return summary;
  }
  if (/Consistency check passed/i.test(summary)) {
    return "World handbook check passed; no obvious hard conflicts found.";
  }
  const errorCount = issues.filter((item) => item.severity === "error").length;
  const warnCount = issues.filter((item) => item.severity === "warn").length;
  if (status === "error") {
    return `Detected ${errorCount} critical conflicts and ${warnCount} warnings.`;
  }
  if (status === "warn") {
    return `Detected ${warnCount} warnings; further fixes are recommended.`;
  }
  return "World handbook check completed.";
}

export function parseConsistencyReport(raw: string | null | undefined, issues: WorldConsistencyIssue[]): WorldConsistencyReport | null {
  if (!raw) {
    return null;
  }
  try {
    const parsed = JSON.parse(raw) as Partial<WorldConsistencyReport>;
    if (!parsed || typeof parsed !== "object") {
      return null;
    }
    const status = parsed.status === "error" || parsed.status === "warn" || parsed.status === "pass"
      ? parsed.status
      : "pass";
    return {
      worldId: typeof parsed.worldId === "string" ? parsed.worldId : "",
      score: typeof parsed.score === "number" ? parsed.score : 0,
      summary: localizeSummary(typeof parsed.summary === "string" ? parsed.summary : "", status, issues),
      status,
      generatedAt: typeof parsed.generatedAt === "string" ? parsed.generatedAt : undefined,
      issues,
    };
  } catch {
    return null;
  }
}

export function localizeConsistencySeverity(severity: WorldConsistencyIssue["severity"]): string {
  switch (severity) {
    case "error":
      return "Critical conflict";
    case "warn":
      return "Warning";
    case "pass":
      return "Pass";
    default:
      return severity;
  }
}

export function localizeConsistencyStatus(status: WorldConsistencyIssue["status"] | WorldConsistencyReport["status"]): string {
  switch (status) {
    case "open":
      return "Open";
    case "resolved":
      return "Resolved";
    case "ignored":
      return "Ignored";
    case "error":
      return "Critical conflicts present";
    case "warn":
      return "Warnings present";
    case "pass":
      return "Check passed";
    default:
      return status;
  }
}

export function localizeConsistencySource(source: WorldConsistencyIssue["source"]): string {
  return source === "llm" ? "Model review" : "Rule check";
}

export function localizeConsistencyField(targetField?: string | null): string {
  if (!targetField) {
    return "Not specified";
  }
  return FIELD_LABELS[targetField] ?? targetField;
}

export function localizeConsistencyIssueTitle(code: string): string {
  return ISSUE_CODE_LABELS[code] ?? code;
}

export function localizeConsistencyIssueMessage(issue: WorldConsistencyIssue): string {
  if (hasChinese(issue.message)) {
    return issue.message;
  }
  return ISSUE_MESSAGE_LABELS[issue.code]
    ?? `${localizeConsistencyField(issue.targetField)} has a consistency risk.`;
}

export function localizeConsistencyIssueDetail(issue: WorldConsistencyIssue): string | null {
  if (issue.detail && hasChinese(issue.detail)) {
    return issue.detail;
  }
  if (ISSUE_DETAIL_LABELS[issue.code]) {
    return ISSUE_DETAIL_LABELS[issue.code];
  }
  if (issue.detail) {
    return `The system detected an issue related to ${localizeConsistencyField(issue.targetField)}; review this risk against the world handbook.`;
  }
  return null;
}

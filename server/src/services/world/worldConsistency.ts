const CONSISTENCY_FIELD_LABELS: Record<string, string> = {
  description: "world overview",
  background: "background settings",
  geography: "geographical environment",
  cultures: "cultural customs",
  magicSystem: "power system",
  politics: "political structure",
  races: "Race settings",
  religions: "religious beliefs",
  technology: "Technical system",
  conflicts: "core conflict",
  history: "Historical context",
  economy: "economic system",
  factions: "power relations",
};

export interface ConsistencyIssueDraft {
  severity: "pass" | "warn" | "error";
  code: string;
  message: string;
  detail?: string;
  source: "rule" | "llm";
  targetField?: string;
}

const ISSUE_LOCALIZATION: Record<
  string,
  {
    title: string;
    message: string;
    detail?: string | ((targetField?: string) => string);
  }
> = {
  AXIOM_MAGIC_CONFLICT: {
    title: "Axiom and power system conflict",
    message: "The world's axioms conflict with the setting of the power system.",
    detail: "The current axioms restrict or deny supernatural/magic abilities, yet the power system or related text still contains them. The world's underlying rules need to be unified.",
  },
  TECH_ERA_MISMATCH: {
    title: "Mixed technological times",
    message: "The sense of the technological era is mixed and lacks sufficient explanation.",
    detail: "The current technology description mixes elements from different eras without explaining their origin, limits, or transition logic.",
  },
  CONFLICT_WEAK: {
    title: "The core conflict is weak",
    message: "The core conflict information is too thin and lacks support.",
    detail: "It is recommended to add conflicting parties, triggering events, escalation paths and failure costs to make the main conflict in the world clearer.",
  },
  BASELINE_PASS: {
    title: "Rule check passed",
    message: "No obvious hard conflicts were found at the rule level.",
  },
  THEMATIC_INCOHERENCE: {
    title: "Theme framework is inconsistent",
    message: "Searching for supplemental content introduces thematic frameworks that are inconsistent with the core setting.",
    detail: "The supporting context introduces thematic expressions that the original setting never clearly established, which can drift the world setting's core theme.",
  },
  REDUNDANT_AXIOM_APPLICATION: {
    title: "Repeated application of world axioms",
    message: "The supplementary content reiterates existing axioms without adding new valid constraints.",
    detail: "This kind of repetition amplifies noise and makes the world rules harder to distinguish; keep the genuinely useful new constraints or delete the redundant restatements.",
  },
  AXIOM_VIOLATION: {
    title: "world justice conflict",
    message: "The world name or core concept conflicts with the defined axioms or background.",
    detail: (targetField) =>
      `The current setting is inconsistent with the existing world axioms${targetField ? `, mainly affecting ${localizeConsistencyField(targetField)}` : ""}. Unify the naming, genre commitments, and the world's underlying rules.`,
  },
  GENRE_MISMATCH: {
    title: "Theme Signal Conflict",
    message: "The genre signals are inconsistent with the current world setting constraints.",
    detail: "The current naming, keywords, or retrieval context convey a different genre expectation that does not match the style and rules emphasized by the world setting.",
  },
};

function hasChinese(text: string): boolean {
  return /[\u4E00-\u9FFF]/.test(text);
}

function looksMostlyEnglish(text: string): boolean {
  return /[A-Za-z]/.test(text) && !hasChinese(text);
}

export function localizeConsistencyField(targetField?: string | null): string {
  if (!targetField) {
    return "unspecified";
  }
  return CONSISTENCY_FIELD_LABELS[targetField] ?? targetField;
}

export function localizeConsistencyIssue(issue: ConsistencyIssueDraft): ConsistencyIssueDraft {
  const code = issue.code?.trim() || "LLM_REVIEW";
  const localization = ISSUE_LOCALIZATION[code];
  const message = issue.message?.trim() || "";
  const detail = issue.detail?.trim();

  if (localization) {
    return {
      ...issue,
      code,
      message: hasChinese(message) ? message : localization.message,
      detail: detail && hasChinese(detail)
        ? detail
        : typeof localization.detail === "function"
          ? localization.detail(issue.targetField)
          : localization.detail,
    };
  }

  return {
    ...issue,
    code,
    message: hasChinese(message)
      ? message
      : `${localizeConsistencyField(issue.targetField)} has a consistency risk.`,
    detail: !detail
      ? undefined
      : looksMostlyEnglish(detail)
        ? `The system detected a ${localizeConsistencyField(issue.targetField)} related issue. Please review this risk against the current world setting.`
        : detail,
  };
}

export function buildConsistencySummary(status: "pass" | "warn" | "error", errorCount: number, warnCount: number): string {
  if (status === "pass") {
    return "Consistency check passed; no obvious hard conflicts were found.";
  }
  if (status === "error") {
    return `Detected ${errorCount} serious conflicts and ${warnCount} warnings.`;
  }
  return `Detected ${warnCount} warnings; we recommend continuing to correct them.`;
}

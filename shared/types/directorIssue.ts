import { z } from "zod";

export const DIRECTOR_ISSUE_GOVERNANCE_VERSION = 1 as const;

export const DIRECTOR_ISSUE_CODES = [
  "planning.prerequisite_missing",
  "planning.volume_strategy_high_risk",
  "planning.execution_contract_invalid",
  "planning.route_window_unavailable",
  "generation.empty_content",
  "generation.output_unusable",
  "generation.runtime_failed",
  "quality.chapter_below_threshold",
  "quality.acceptance_unavailable",
  "quality.obligation_gap",
  "quality.local_repair_failed",
  "quality.local_replan_failed",
  "quality.loop_exhausted",
  "quality.replan_required",
  "quality.replan_loop",
  "runtime.model_unavailable",
  "runtime.service_unavailable",
  "runtime.token_budget_exceeded",
  "runtime.protected_content",
  "runtime.data_integrity",
  "runtime.persistence_failed",
  "runtime.worker_stale",
  "runtime.background_prefetch_failed",
  "runtime.unclassified",
] as const;

export const directorIssueCodeSchema = z.enum(DIRECTOR_ISSUE_CODES);
export type DirectorIssueCode = z.infer<typeof directorIssueCodeSchema>;

export const DIRECTOR_ISSUE_ACTIONS = [
  "auto_retry",
  "continue_with_warning",
  "pause_for_manual",
  "fail_task",
] as const;

export const directorIssueActionSchema = z.enum(DIRECTOR_ISSUE_ACTIONS);
export type DirectorIssueAction = z.infer<typeof directorIssueActionSchema>;

export type DirectorIssueCategory = "planning" | "generation" | "quality" | "runtime";

export interface DirectorIssueCatalogEntry {
  code: DirectorIssueCode;
  category: DirectorIssueCategory;
  label: string;
  defaultAction: DirectorIssueAction;
  allowedActions: readonly DirectorIssueAction[];
  exhaustedAction: Exclude<DirectorIssueAction, "auto_retry">;
  enforcedAction?: DirectorIssueAction;
  lockedReason?: string;
}

export const DIRECTOR_ISSUE_CATALOG: readonly DirectorIssueCatalogEntry[] = [
  { code: "planning.prerequisite_missing", category: "planning", label: "Required creative materials are missing", defaultAction: "pause_for_manual", allowedActions: DIRECTOR_ISSUE_ACTIONS, exhaustedAction: "pause_for_manual" },
  { code: "planning.volume_strategy_high_risk", category: "planning", label: "Volume strategy risk is too high", defaultAction: "pause_for_manual", allowedActions: DIRECTOR_ISSUE_ACTIONS, exhaustedAction: "pause_for_manual" },
  { code: "planning.execution_contract_invalid", category: "planning", label: "Chapter execution contract is unavailable", defaultAction: "auto_retry", allowedActions: DIRECTOR_ISSUE_ACTIONS, exhaustedAction: "pause_for_manual" },
  { code: "planning.route_window_unavailable", category: "planning", label: "The next chapter route is not ready", defaultAction: "auto_retry", allowedActions: DIRECTOR_ISSUE_ACTIONS, exhaustedAction: "pause_for_manual" },
  { code: "generation.empty_content", category: "generation", label: "The model returned no chapter body", defaultAction: "auto_retry", allowedActions: DIRECTOR_ISSUE_ACTIONS, exhaustedAction: "fail_task" },
  { code: "generation.output_unusable", category: "generation", label: "The draft cannot be saved", defaultAction: "fail_task", allowedActions: DIRECTOR_ISSUE_ACTIONS, exhaustedAction: "fail_task", enforcedAction: "fail_task", lockedReason: "The run cannot continue without usable chapter text." },
  { code: "generation.runtime_failed", category: "generation", label: "Chapter run failed", defaultAction: "auto_retry", allowedActions: DIRECTOR_ISSUE_ACTIONS, exhaustedAction: "pause_for_manual" },
  { code: "quality.chapter_below_threshold", category: "quality", label: "Chapter quality score is below the bar", defaultAction: "continue_with_warning", allowedActions: DIRECTOR_ISSUE_ACTIONS, exhaustedAction: "continue_with_warning", lockedReason: "Full-book mode records local chapter quality debt and continues." },
  { code: "quality.acceptance_unavailable", category: "quality", label: "Chapter acceptance check is unavailable", defaultAction: "continue_with_warning", allowedActions: DIRECTOR_ISSUE_ACTIONS, exhaustedAction: "continue_with_warning", lockedReason: "Full-book mode keeps usable text and schedules a later review." },
  { code: "quality.obligation_gap", category: "quality", label: "This chapter still has unmet obligations", defaultAction: "continue_with_warning", allowedActions: DIRECTOR_ISSUE_ACTIONS, exhaustedAction: "continue_with_warning", lockedReason: "Full-book mode records local obligation gaps as quality debt and continues." },
  { code: "quality.local_repair_failed", category: "quality", label: "Local repair was not applied safely", defaultAction: "continue_with_warning", allowedActions: DIRECTOR_ISSUE_ACTIONS, exhaustedAction: "continue_with_warning", lockedReason: "When usable text exists, full-book mode records quality debt and continues." },
  { code: "quality.local_replan_failed", category: "quality", label: "Follow-up chapter adjustment failed", defaultAction: "continue_with_warning", allowedActions: DIRECTOR_ISSUE_ACTIONS, exhaustedAction: "continue_with_warning", lockedReason: "When this chapter already has usable text, keep the quality debt and continue." },
  { code: "quality.loop_exhausted", category: "quality", label: "This quality-repair path is exhausted", defaultAction: "continue_with_warning", allowedActions: DIRECTOR_ISSUE_ACTIONS, exhaustedAction: "pause_for_manual" },
  { code: "quality.replan_required", category: "quality", label: "Later chapters must be replanned", defaultAction: "pause_for_manual", allowedActions: DIRECTOR_ISSUE_ACTIONS, exhaustedAction: "pause_for_manual", enforcedAction: "pause_for_manual", lockedReason: "An explicit replan must pause at a safe checkpoint." },
  { code: "quality.replan_loop", category: "quality", label: "Replan loop detected", defaultAction: "continue_with_warning", allowedActions: DIRECTOR_ISSUE_ACTIONS, exhaustedAction: "pause_for_manual" },
  { code: "runtime.model_unavailable", category: "runtime", label: "The writing model is unavailable", defaultAction: "auto_retry", allowedActions: DIRECTOR_ISSUE_ACTIONS, exhaustedAction: "pause_for_manual" },
  { code: "runtime.service_unavailable", category: "runtime", label: "The writing service is temporarily unavailable", defaultAction: "auto_retry", allowedActions: DIRECTOR_ISSUE_ACTIONS, exhaustedAction: "pause_for_manual" },
  { code: "runtime.token_budget_exceeded", category: "runtime", label: "Unusual AI usage", defaultAction: "pause_for_manual", allowedActions: DIRECTOR_ISSUE_ACTIONS, exhaustedAction: "pause_for_manual", enforcedAction: "pause_for_manual", lockedReason: "Unusual usage must stop for inspection first." },
  { code: "runtime.protected_content", category: "runtime", label: "This action may overwrite protected content", defaultAction: "pause_for_manual", allowedActions: DIRECTOR_ISSUE_ACTIONS, exhaustedAction: "pause_for_manual", enforcedAction: "pause_for_manual", lockedReason: "Protected user content needs a manual confirmation." },
  { code: "runtime.data_integrity", category: "runtime", label: "Runtime data-integrity risk", defaultAction: "pause_for_manual", allowedActions: DIRECTOR_ISSUE_ACTIONS, exhaustedAction: "pause_for_manual", enforcedAction: "pause_for_manual", lockedReason: "Data-integrity risk cannot be auto-approved." },
  { code: "runtime.persistence_failed", category: "runtime", label: "Saving a key writing result failed", defaultAction: "fail_task", allowedActions: DIRECTOR_ISSUE_ACTIONS, exhaustedAction: "fail_task", enforcedAction: "fail_task", lockedReason: "If the save cannot be confirmed, the current task must stop." },
  { code: "runtime.worker_stale", category: "runtime", label: "Background execution stopped responding", defaultAction: "auto_retry", allowedActions: DIRECTOR_ISSUE_ACTIONS, exhaustedAction: "pause_for_manual" },
  { code: "runtime.background_prefetch_failed", category: "runtime", label: "Next chapter Background prefetch failed", defaultAction: "continue_with_warning", allowedActions: DIRECTOR_ISSUE_ACTIONS, exhaustedAction: "continue_with_warning", lockedReason: "It will be re-prepared when officially executed and the current chapter will not be blocked." },
  { code: "runtime.unclassified", category: "runtime", label: "Unidentified operational issues", defaultAction: "pause_for_manual", allowedActions: DIRECTOR_ISSUE_ACTIONS, exhaustedAction: "pause_for_manual" },
] as const;

export const DIRECTOR_ISSUE_CATALOG_BY_CODE = Object.fromEntries(
  DIRECTOR_ISSUE_CATALOG.map((entry) => [entry.code, entry]),
) as Record<DirectorIssueCode, DirectorIssueCatalogEntry>;

export const DEFAULT_DIRECTOR_ISSUE_POLICY = {
  maxAutomaticRetries: 1,
  issueActions: {},
} satisfies DirectorIssuePolicy;

export const directorIssuePolicySchema = z.object({
  maxAutomaticRetries: z.number().int().min(0).max(1).default(1),
  issueActions: z.partialRecord(directorIssueCodeSchema, directorIssueActionSchema).default({}),
}).superRefine((policy, context) => {
  for (const [code, action] of Object.entries(policy.issueActions)) {
    const entry = DIRECTOR_ISSUE_CATALOG_BY_CODE[code as DirectorIssueCode];
    if (entry && action && !entry.allowedActions.includes(action)) {
      context.addIssue({ code: "custom", path: ["issueActions", code], message: `${entry.label}This processing action is not allowed.` });
    }
  }
});

export type DirectorIssuePolicy = z.infer<typeof directorIssuePolicySchema>;

export const directorIssuePolicyOverrideSchema = z.object({
  maxAutomaticRetries: z.number().int().min(0).max(1).optional(),
  issueActions: z.partialRecord(directorIssueCodeSchema, directorIssueActionSchema).optional(),
}).superRefine((override, context) => {
  for (const [code, action] of Object.entries(override.issueActions ?? {})) {
    const entry = DIRECTOR_ISSUE_CATALOG_BY_CODE[code as DirectorIssueCode];
    if (entry && action && !entry.allowedActions.includes(action)) {
      context.addIssue({ code: "custom", path: ["issueActions", code], message: `${entry.label}This processing action is not allowed.` });
    }
  }
});

export type DirectorIssuePolicyOverride = z.infer<typeof directorIssuePolicyOverrideSchema>;

export const DIRECTOR_ISSUE_POLICY_PRESETS = [
  {
    id: "finish_full_book",
    name: "Prioritize finishing the full book",
    description: "After handling the local issues once, keep the main text and continue, and leave them all for subsequent optimization.",
    policy: {
      maxAutomaticRetries: 1,
      issueActions: {
        "quality.chapter_below_threshold": "continue_with_warning",
        "quality.acceptance_unavailable": "continue_with_warning",
        "quality.obligation_gap": "continue_with_warning",
        "quality.local_repair_failed": "continue_with_warning",
        "quality.local_replan_failed": "continue_with_warning",
        "quality.loop_exhausted": "continue_with_warning",
        "quality.replan_loop": "continue_with_warning",
      },
    },
  },
  {
    id: "quality_first",
    name: "Prioritize quality",
    description: "When creating in stages, if a partial problem is not solved once, it will be paused; the automatic creation of the entire book will record the quality debt and continue.",
    policy: {
      maxAutomaticRetries: 1,
      issueActions: {
        "quality.chapter_below_threshold": "pause_for_manual",
        "quality.acceptance_unavailable": "pause_for_manual",
        "quality.obligation_gap": "pause_for_manual",
        "quality.local_repair_failed": "pause_for_manual",
        "quality.local_replan_failed": "pause_for_manual",
        "quality.loop_exhausted": "pause_for_manual",
        "quality.replan_loop": "pause_for_manual",
      },
    },
  },
] as const satisfies ReadonlyArray<{
  id: string;
  name: string;
  description: string;
  policy: DirectorIssuePolicy;
}>;

export type DirectorIssuePolicyPreset = (typeof DIRECTOR_ISSUE_POLICY_PRESETS)[number];

export function findDirectorIssuePolicyPreset(policy: DirectorIssuePolicy): DirectorIssuePolicyPreset | null {
  return DIRECTOR_ISSUE_POLICY_PRESETS.find((preset) => (
    JSON.stringify(preset.policy) === JSON.stringify(policy)
  )) ?? null;
}

export const directorIssueAssessmentSchema = z.object({
  issueCode: directorIssueCodeSchema,
  riskScore: z.number().int().min(1).max(8),
  summary: z.string().trim().min(1).max(1_000),
  evidence: z.string().trim().min(1).max(2_000),
  suggestedAction: directorIssueActionSchema,
  canPause: z.boolean(),
});

export type DirectorIssueAssessment = z.infer<typeof directorIssueAssessmentSchema>;

export const directorIssueOccurrenceSchema = z.object({
  schemaVersion: z.literal(1),
  issueCode: directorIssueCodeSchema,
  stage: z.string().trim().min(1),
  summary: z.string().trim().min(1),
  evidence: z.string().trim().optional(),
  affectedScope: z.string().trim().optional(),
  chapterId: z.string().trim().optional(),
  chapterOrder: z.number().int().positive().optional(),
  riskScore: z.number().int().min(1).max(8).nullable().optional(),
  qualityScores: z.record(z.string(), z.number()).optional(),
  attempt: z.number().int().nonnegative().default(0),
  maxAttempts: z.number().int().nonnegative().default(0),
  hasUsableOutput: z.boolean().default(false),
  runMode: z.string().trim().optional(),
  fingerprint: z.string().trim().min(1),
  occurredAt: z.string().datetime(),
});

export type DirectorIssueOccurrence = z.infer<typeof directorIssueOccurrenceSchema>;

export const directorIssueDecisionSchema = z.object({
  issueCode: directorIssueCodeSchema,
  action: directorIssueActionSchema,
  reason: z.string().trim().min(1),
  locked: z.boolean(),
  policySource: z.enum(["global", "novel", "task_snapshot", "safety"]),
  retryExhaustedAction: z.enum(["continue_with_warning", "pause_for_manual", "fail_task"]),
});

export type DirectorIssueDecision = z.infer<typeof directorIssueDecisionSchema>;

export function mergeDirectorIssuePolicy(
  base: DirectorIssuePolicy,
  override?: DirectorIssuePolicyOverride | null,
): DirectorIssuePolicy {
  return directorIssuePolicySchema.parse({
    maxAutomaticRetries: override?.maxAutomaticRetries ?? base.maxAutomaticRetries,
    issueActions: { ...base.issueActions, ...(override?.issueActions ?? {}) },
  });
}

export function resolveDirectorIssueDecision(input: {
  occurrence: Pick<DirectorIssueOccurrence, "issueCode" | "riskScore" | "attempt" | "maxAttempts" | "hasUsableOutput" | "runMode">;
  policy: DirectorIssuePolicy;
  policySource?: DirectorIssueDecision["policySource"];
}): DirectorIssueDecision {
  const entry = DIRECTOR_ISSUE_CATALOG_BY_CODE[input.occurrence.issueCode];
  const configured = input.policy.issueActions[input.occurrence.issueCode];
  let action = configured && entry.allowedActions.includes(configured) ? configured : entry.defaultAction;
  let locked = false;
  let reason = `Applying the ${configured ? "current" : "default"} governance rules.`;

  if (entry.enforcedAction) {
    action = entry.enforcedAction;
    locked = true;
    reason = entry.lockedReason ?? "Security protection rules take precedence over user preferences.";
  }

  const maxAttempts = input.policy.maxAutomaticRetries ?? DEFAULT_DIRECTOR_ISSUE_POLICY.maxAutomaticRetries;
  if (action === "auto_retry" && input.occurrence.attempt >= maxAttempts) {
    action = entry.exhaustedAction;
    reason = `Automatic retries have been reached ${maxAttempts} sub-cap.`;
  }

  if (action === "continue_with_warning" && !input.occurrence.hasUsableOutput) {
    action = entry.exhaustedAction === "continue_with_warning" ? "pause_for_manual" : entry.exhaustedAction;
    locked = true;
    reason = "There is currently no text or saved product available, and you cannot continue with just a warning.";
  }

  if (
    input.occurrence.runMode === "full_book_autopilot"
    && entry.category === "quality"
    && input.occurrence.issueCode !== "quality.replan_required"
    && input.occurrence.hasUsableOutput
    && (action === "pause_for_manual" || action === "fail_task")
  ) {
    action = "continue_with_warning";
    locked = true;
    reason = entry.lockedReason ?? "The entire automatic director will record local quality issues as quality debt and continue.";
  }

  return {
    issueCode: input.occurrence.issueCode,
    action,
    reason,
    locked,
    policySource: locked ? "safety" : (input.policySource ?? "task_snapshot"),
    retryExhaustedAction: entry.exhaustedAction,
  };
}

import type {
  DirectorArtifactRef,
  DirectorPolicyDecision,
  DirectorPolicyMode,
  DirectorRuntimePolicySnapshot,
} from "@ai-novel/shared/types/directorRuntime";
import { buildDefaultDirectorPolicy } from "./directorRuntimeDefaults";

type DirectorPolicyRiskTag = DirectorPolicyDecision["riskTags"][number];

export interface DirectorPolicyRequest {
  mode?: DirectorPolicyMode;
  policy?: DirectorRuntimePolicySnapshot | null;
  action: "analyze" | "run_node" | "repair" | "overwrite" | "auto_continue";
  reads?: string[];
  writes?: string[];
  targetType?: DirectorArtifactRef["targetType"] | null;
  targetId?: string | null;
  affectedArtifacts?: DirectorArtifactRef[];
  mayOverwriteUserContent?: boolean;
  requiresApprovalByDefault?: boolean;
  isExpensiveReview?: boolean;
  mayRecomputeDownstream?: boolean;
  isLargeScopeAutoRun?: boolean;
}

const DOWNSTREAM_RECOMPUTE_WRITE_TYPES = new Set([
  "story_macro",
  "book_contract",
  "character_cast",
  "volume_strategy",
  "chapter_task_sheet",
]);

const EXPENSIVE_REVIEW_WRITE_TYPES = new Set([
  "audit_report",
  "rolling_window_review",
]);

function hasProtectedUserContent(artifacts: DirectorArtifactRef[] | undefined): boolean {
  return (artifacts ?? []).some((artifact) => (
    artifact.status === "active"
    && (artifact.source === "user_edited" || artifact.protectedUserContent === true)
  ));
}

function hasMatchingWrite(writes: string[] | undefined, targets: Set<string>): boolean {
  return (writes ?? []).some((write) => targets.has(write));
}

function affectsExistingArtifacts(artifacts: DirectorArtifactRef[] | undefined): boolean {
  return (artifacts ?? []).some((artifact) => artifact.status === "active" || artifact.status === "stale");
}

function uniqueTags(tags: DirectorPolicyRiskTag[]): DirectorPolicyRiskTag[] {
  return [...new Set(tags)];
}

function buildDecision(input: {
  canRun: boolean;
  requiresApproval: boolean;
  gateType: DirectorPolicyDecision["gateType"];
  reason: string;
  mayOverwriteUserContent: boolean;
  affectedArtifacts: string[];
  riskTags?: DirectorPolicyRiskTag[];
}): DirectorPolicyDecision {
  return {
    canRun: input.canRun,
    requiresApproval: input.requiresApproval,
    gateType: input.gateType,
    reason: input.reason,
    mayOverwriteUserContent: input.mayOverwriteUserContent,
    affectedArtifacts: input.affectedArtifacts,
    riskTags: uniqueTags(input.riskTags ?? []),
  };
}

export class DirectorPolicyEngine {
  decide(input: DirectorPolicyRequest): DirectorPolicyDecision {
    const policy = input.policy ?? buildDefaultDirectorPolicy(input.mode);
    const affectedArtifacts = (input.affectedArtifacts ?? []).map((artifact) => artifact.id);
    const affectsProtectedUserContent = hasProtectedUserContent(input.affectedArtifacts);
    const mayTouchUserContent = Boolean(input.mayOverwriteUserContent)
      || input.action === "overwrite"
      || affectsProtectedUserContent;
    const isExpensiveReview = Boolean(input.isExpensiveReview)
      || hasMatchingWrite(input.writes, EXPENSIVE_REVIEW_WRITE_TYPES);
    const mayRecomputeDownstream = Boolean(input.mayRecomputeDownstream)
      || (
        hasMatchingWrite(input.writes, DOWNSTREAM_RECOMPUTE_WRITE_TYPES)
        && affectsExistingArtifacts(input.affectedArtifacts)
      );
    const isLargeScopeAutoRun = Boolean(input.isLargeScopeAutoRun)
      || (
        (input.action === "auto_continue" || policy.mode === "run_until_gate" || policy.mode === "auto_safe_scope")
        && input.targetType !== "chapter"
        && hasMatchingWrite(input.writes, new Set(["chapter_draft"]))
      );

    if (input.action === "analyze") {
      return buildDecision({
        canRun: true,
        requiresApproval: false,
        gateType: "none",
        reason: "Workspace analysis does not write novel content and can run immediately.",
        mayOverwriteUserContent: false,
        affectedArtifacts,
      });
    }

    if (affectsProtectedUserContent && !policy.mayOverwriteUserContent) {
      return buildDecision({
        canRun: false,
        requiresApproval: true,
        gateType: "approval",
        reason: "This action would affect content the user already edited or protected. Confirm before continuing.",
        mayOverwriteUserContent: true,
        affectedArtifacts,
        riskTags: ["protected_user_content"],
      });
    }

    if (policy.mode === "suggest_only") {
      return buildDecision({
        canRun: false,
        requiresApproval: true,
        gateType: "approval",
        reason: "This is suggestions-only mode. Write actions need confirmation before they run.",
        mayOverwriteUserContent: mayTouchUserContent,
        affectedArtifacts,
        riskTags: ["suggest_only"],
      });
    }

    if (isExpensiveReview && !policy.allowExpensiveReview) {
      return buildDecision({
        canRun: false,
        requiresApproval: true,
        gateType: "approval",
        reason: "This action would trigger a higher-cost review. Confirm before running it.",
        mayOverwriteUserContent: mayTouchUserContent,
        affectedArtifacts,
        riskTags: ["expensive_review"],
      });
    }

    if (input.requiresApprovalByDefault && policy.mode !== "auto_safe_scope") {
      return buildDecision({
        canRun: false,
        requiresApproval: true,
        gateType: "approval",
        reason: "This step needs confirmation by default, so the current strategy will not auto-run it.",
        mayOverwriteUserContent: mayTouchUserContent,
        affectedArtifacts,
        riskTags: ["default_approval"],
      });
    }

    if (mayRecomputeDownstream && policy.mode !== "auto_safe_scope") {
      return buildDecision({
        canRun: false,
        requiresApproval: true,
        gateType: "approval",
        reason: "This action would recompute upstream planning and may affect later chapters or artifacts. Confirm before continuing.",
        mayOverwriteUserContent: mayTouchUserContent,
        affectedArtifacts,
        riskTags: ["downstream_recompute"],
      });
    }

    if (isLargeScopeAutoRun && policy.mode !== "auto_safe_scope") {
      return buildDecision({
        canRun: false,
        requiresApproval: true,
        gateType: "approval",
        reason: "This action will auto-advance a large chapter range and needs confirmation first.",
        mayOverwriteUserContent: mayTouchUserContent,
        affectedArtifacts,
        riskTags: ["large_scope_auto_run"],
      });
    }

    return buildDecision({
      canRun: true,
      requiresApproval: false,
      gateType: "none",
      reason: "The current policy allows this action.",
      mayOverwriteUserContent: mayTouchUserContent,
      affectedArtifacts,
    });
  }
}

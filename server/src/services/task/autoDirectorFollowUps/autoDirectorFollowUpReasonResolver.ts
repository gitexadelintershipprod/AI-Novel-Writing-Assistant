import type {
  AutoDirectorAction,
  AutoDirectorActionCode,
  AutoDirectorFollowUpReason,
  AutoDirectorFollowUpResolverInput,
  AutoDirectorMutationActionCode,
  AutoDirectorResolvedFollowUpReason,
} from "@ai-novel/shared/types/autoDirectorFollowUp";
import { buildWorkflowResumeAction } from "../novelWorkflowExplainability";

const CHANNEL_ACTION_CODES = new Set<AutoDirectorActionCode>([
  "continue_auto_execution",
  "retry_with_task_model",
  "open_detail",
  "open_follow_up_center",
]);

const REASON_LABELS: Record<AutoDirectorFollowUpReason, string> = {
  manual_recovery_required: "Manual recovery pending",
  runtime_failed: "Failed to try again",
  candidate_selection_required: "Book level direction to be confirmed",
  replan_required: "Pending re-planning",
  runtime_cancelled: "Canceled pending restoration",
  chapter_batch_execution_pending: "Automatic execution to be continued",
  quality_repair_pending: "Quality fixes to be continued",
  auto_progress_running: "Automatically advancing",
  auto_approval_completed: "Recently passed automatically",
  runtime_replaced: "Task has been replaced",
  validation_required: "Need to recheck",
};

function mutationAction(input: {
  code: AutoDirectorMutationActionCode;
  label: string;
  riskLevel: AutoDirectorAction["riskLevel"];
  requiresConfirm: boolean;
}): AutoDirectorAction {
  return {
    code: input.code,
    kind: "mutation",
    label: input.label,
    riskLevel: input.riskLevel,
    requiresConfirm: input.requiresConfirm,
  };
}

function navigationAction(input: {
  code: Extract<AutoDirectorActionCode, "go_replan" | "go_candidate_selection" | "open_detail" | "open_follow_up_center">;
  label: string;
  riskLevel?: AutoDirectorAction["riskLevel"];
  requiresConfirm?: boolean;
}): AutoDirectorAction {
  return {
    code: input.code,
    kind: "navigation",
    label: input.label,
    riskLevel: input.riskLevel ?? "low",
    requiresConfirm: input.requiresConfirm ?? false,
  };
}

function getContinueLabel(input: AutoDirectorFollowUpResolverInput, fallback: string): string {
  return buildWorkflowResumeAction(input.status, input.checkpointType ?? null, input.executionScopeLabel) ?? fallback;
}

function finalizeResolvedReason(input: {
  reason: AutoDirectorFollowUpReason;
  priority: AutoDirectorResolvedFollowUpReason["priority"];
  availableActions: AutoDirectorAction[];
  batchActionCodes?: AutoDirectorMutationActionCode[];
}): AutoDirectorResolvedFollowUpReason {
  const batchActionCodes = input.batchActionCodes ?? [];
  const hasChannelAction = input.availableActions.some((item) => CHANNEL_ACTION_CODES.has(item.code));

  return {
    reason: input.reason,
    reasonLabel: REASON_LABELS[input.reason],
    priority: input.priority,
    availableActions: input.availableActions,
    batchActionCodes,
    supportsBatch: batchActionCodes.length > 0,
    channelCapabilities: {
      dingtalk: hasChannelAction,
      wecom: hasChannelAction,
    },
  };
}

export function resolveAutoDirectorFollowUpReason(
  input: AutoDirectorFollowUpResolverInput,
): AutoDirectorResolvedFollowUpReason | null {
  if (input.validationResult && !input.validationResult.allowed) {
    const hasStructuredBackfill = input.validationResult.requiredActions.some((action) => (
      action.code === "auto_backfill_structured_outline"
      && action.safeToAutoFix === true
      && action.riskLevel === "low"
    ));
    const hasSafeFix = input.validationResult.requiredActions.some((action) => (
      action.code !== "auto_backfill_structured_outline"
      && action.safeToAutoFix === true
      && action.riskLevel === "low"
    ));
    return finalizeResolvedReason({
      reason: "validation_required",
      priority: "P0",
      availableActions: [
        navigationAction({
          code: "open_detail",
          label: "View the validation result",
        }),
        ...(hasStructuredBackfill
          ? [
            mutationAction({
              code: "auto_backfill_structured_outline",
              label: "Let AI finish the chapter split, then continue",
              riskLevel: "low",
              requiresConfirm: false,
            }),
          ]
          : []),
        ...(hasSafeFix
          ? [
            mutationAction({
              code: "safe_fix_validation",
              label: "One-click security repair",
              riskLevel: "low",
              requiresConfirm: true,
            }),
          ]
          : []),
      ],
    });
  }

  if (input.replacementTaskId?.trim() && input.status !== "failed" && input.status !== "waiting_approval" && input.status !== "running" && input.status !== "queued") {
    return finalizeResolvedReason({
      reason: "runtime_replaced",
      priority: "P2",
      availableActions: [
        navigationAction({
          code: "open_detail",
          label: "View the replacement details",
        }),
      ],
    });
  }

  if (input.pendingManualRecovery) {
    return finalizeResolvedReason({
      reason: "manual_recovery_required",
      priority: "P0",
      availableActions: [
        mutationAction({
          code: "continue_generic",
          label: "Resume the task",
          riskLevel: "low",
          requiresConfirm: false,
        }),
        navigationAction({
          code: "open_detail",
          label: "View details",
        }),
      ],
    });
  }

  if (input.status === "queued" || input.status === "running") {
    return finalizeResolvedReason({
      reason: "auto_progress_running",
      priority: "P2",
      availableActions: [
        navigationAction({
          code: "open_detail",
          label: "View progress details",
        }),
      ],
    });
  }

  if (input.status === "failed") {
    return finalizeResolvedReason({
      reason: "runtime_failed",
      priority: "P0",
      availableActions: [
        mutationAction({
          code: "retry_with_task_model",
          label: "Retry with the task model",
          riskLevel: "low",
          requiresConfirm: false,
        }),
        mutationAction({
          code: "retry_with_route_model",
          label: "Retry with the routed model",
          riskLevel: "medium",
          requiresConfirm: true,
        }),
        navigationAction({
          code: "open_detail",
          label: "View details",
        }),
      ],
      batchActionCodes: ["retry_with_task_model"],
    });
  }

  if (input.status === "cancelled") {
    return finalizeResolvedReason({
      reason: "runtime_cancelled",
      priority: "P1",
      availableActions: [
        mutationAction({
          code: "retry_with_task_model",
          label: getContinueLabel(input, "Resume from the latest checkpoint"),
          riskLevel: "low",
          requiresConfirm: false,
        }),
        mutationAction({
          code: "retry_with_route_model",
          label: "Retry with the routed model",
          riskLevel: "medium",
          requiresConfirm: true,
        }),
        navigationAction({
          code: "open_detail",
          label: "View details",
        }),
      ],
      batchActionCodes: ["retry_with_task_model"],
    });
  }

  if (input.status !== "waiting_approval") {
    return null;
  }

  if (input.checkpointType === "candidate_selection_required") {
    return finalizeResolvedReason({
      reason: "candidate_selection_required",
      priority: "P1",
      availableActions: [
        navigationAction({
          code: "go_candidate_selection",
          label: getContinueLabel(input, "Go to confirm book level direction"),
        }),
        navigationAction({
          code: "open_detail",
          label: "View details",
        }),
      ],
    });
  }

  if (input.checkpointType === "replan_required") {
    return finalizeResolvedReason({
      reason: "replan_required",
      priority: "P1",
      availableActions: [
        navigationAction({
          code: "go_replan",
          label: getContinueLabel(input, "Handle replan"),
        }),
        navigationAction({
          code: "open_detail",
          label: "View details",
        }),
      ],
    });
  }

  if (input.checkpointType === "chapter_batch_ready" && input.status === "waiting_approval") {
    return finalizeResolvedReason({
      reason: "chapter_batch_execution_pending",
      priority: "P2",
      availableActions: [
        mutationAction({
          code: "continue_auto_execution",
          label: getContinueLabel(input, "Continue auto-running the current range"),
          riskLevel: "low",
          requiresConfirm: false,
        }),
        navigationAction({
          code: "open_detail",
          label: "View details",
        }),
      ],
      batchActionCodes: ["continue_auto_execution"],
    });
  }

  if (input.checkpointType === "chapter_batch_ready") {
    return finalizeResolvedReason({
      reason: "quality_repair_pending",
      priority: "P2",
      availableActions: [
        mutationAction({
          code: "continue_auto_execution",
          label: getContinueLabel(input, "Continue auto-running the current range"),
          riskLevel: "low",
          requiresConfirm: false,
        }),
        navigationAction({
          code: "open_detail",
          label: "View details",
        }),
      ],
      batchActionCodes: ["continue_auto_execution"],
    });
  }

  return null;
}

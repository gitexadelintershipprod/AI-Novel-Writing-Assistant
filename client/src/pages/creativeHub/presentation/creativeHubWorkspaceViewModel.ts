import type { FailureDiagnostic } from "@ai-novel/shared/types/agent";
import type {
  CreativeHubInterrupt,
  CreativeHubNovelSetupStatus,
  CreativeHubProductionStatus,
  CreativeHubThread,
  CreativeHubTurnSummary,
} from "@ai-novel/shared/types/creativeHub";
import type { WorkspaceTone } from "@/components/workspace";

export type CreativeHubWorkspaceAction =
  | "retry_threads"
  | "retry_state"
  | "retry_thread"
  | "retry_novels"
  | "retry_create_thread"
  | "review_interrupt"
  | "view_activity"
  | "send_prompt"
  | "select_novel"
  | "open_production";

export interface CreativeHubWorkspaceRecommendation {
  tone: WorkspaceTone;
  title: string;
  description: string;
  action: CreativeHubWorkspaceAction;
  actionLabel: string;
  prompt?: string;
}

export interface CreativeHubWorkspacePresentation {
  objectTitle: string;
  stageLabel: string;
  threadStatusLabel: string;
  recommendation: CreativeHubWorkspaceRecommendation;
}

export function formatCreativeHubThreadStatus(
  status: CreativeHubThread["status"] | undefined,
): string {
  if (status === "busy") return "Running";
  if (status === "interrupted") return "Awaiting confirmation";
  if (status === "error") return "Error";
  if (status === "idle") return "Idle";
  return "Initializing";
}

function formatSetupStage(stage: CreativeHubNovelSetupStatus["stage"] | undefined): string | null {
  if (stage === "setup_in_progress") return "Completing book setup";
  if (stage === "ready_for_planning") return "Ready for story planning";
  if (stage === "ready_for_production") return "Ready for full production";
  return null;
}

function errorText(value: unknown, fallback: string): string | null {
  if (!value) return null;
  if (value instanceof Error && value.message.trim()) return value.message.trim();
  if (typeof value === "string" && value.trim()) return value.trim();
  return fallback;
}

export function resolveCreativeHubWorkspacePresentation(input: {
  thread?: CreativeHubThread | null;
  currentNovelTitle?: string | null;
  interrupt?: CreativeHubInterrupt | null;
  isRunning: boolean;
  diagnostics?: FailureDiagnostic | null;
  productionStatus?: CreativeHubProductionStatus | null;
  novelSetup?: CreativeHubNovelSetupStatus | null;
  latestTurnSummary?: CreativeHubTurnSummary | null;
  threadsError?: unknown;
  stateError?: unknown;
  threadLoadError?: unknown;
  novelsError?: unknown;
  createThreadError?: unknown;
}): CreativeHubWorkspacePresentation {
  const objectTitle = input.currentNovelTitle?.trim()
    || input.productionStatus?.title?.trim()
    || input.novelSetup?.title?.trim()
    || "No novel bound";
  const stageLabel = input.latestTurnSummary?.currentStage?.trim()
    || input.productionStatus?.currentStage?.trim()
    || formatSetupStage(input.novelSetup?.stage)
    || "Awaiting creative goal";
  const threadStatusLabel = formatCreativeHubThreadStatus(input.thread?.status);

  const threadsError = errorText(input.threadsError, "Failed to load creative threads.");
  if (threadsError) {
    return {
      objectTitle,
      stageLabel,
      threadStatusLabel,
      recommendation: {
        tone: "danger",
        title: "Reload creative threads",
        description: `${threadsError} Saved novels and thread content will not be modified.`,
        action: "retry_threads",
        actionLabel: "Reload threads",
      },
    };
  }

  const createThreadError = errorText(input.createThreadError, "Failed to create creative thread.");
  if (createThreadError) {
    return {
      objectTitle,
      stageLabel,
      threadStatusLabel,
      recommendation: {
        tone: "danger",
        title: "Recreate creative thread",
        description: `${createThreadError} Existing novels and creative data will not be modified.`,
        action: "retry_create_thread",
        actionLabel: "Recreate thread",
      },
    };
  }

  const stateError = errorText(input.stateError, "Failed to load thread state.")
    || errorText(input.threadLoadError, "Failed to load thread content.");
  if (stateError) {
    return {
      objectTitle,
      stageLabel,
      threadStatusLabel,
      recommendation: {
        tone: "danger",
        title: "Reload current creative session",
        description: `${stateError} To avoid confusion, old thread content will no longer be displayed.`,
        action: input.threadLoadError ? "retry_thread" : "retry_state",
        actionLabel: "Reload current thread",
      },
    };
  }

  const novelsError = errorText(input.novelsError, "Failed to load novel list.");
  if (novelsError) {
    return {
      objectTitle,
      stageLabel,
      threadStatusLabel,
      recommendation: {
        tone: "danger",
        title: "Reload novel list",
        description: `${novelsError} Current thread content will still be preserved.`,
        action: "retry_novels",
        actionLabel: "Reload novels",
      },
    };
  }

  if (input.interrupt) {
    return {
      objectTitle,
      stageLabel,
      threadStatusLabel,
      recommendation: {
        tone: "warning",
        title: input.interrupt.title || "Review pending creative operations",
        description: input.interrupt.summary || "The current run is awaiting your confirmation before proceeding.",
        action: "review_interrupt",
        actionLabel: "Review pending items",
      },
    };
  }

  if (input.thread?.status === "interrupted" || input.latestTurnSummary?.status === "interrupted") {
    return {
      objectTitle,
      stageLabel,
      threadStatusLabel,
      recommendation: {
        tone: "warning",
        title: "Review pending creative operations",
        description: input.latestTurnSummary?.nextSuggestion?.trim()
          || "The current thread is still awaiting confirmation. Please handle pending items first.",
        action: "view_activity",
        actionLabel: "Review pending items",
      },
    };
  }

  if (input.isRunning || input.thread?.status === "busy") {
    return {
      objectTitle,
      stageLabel,
      threadStatusLabel,
      recommendation: {
        tone: "info",
        title: "AI is advancing the current creative goal",
        description: `Current stage: ${stageLabel}. The system will keep updating status and prompt you when needed.`,
        action: "view_activity",
        actionLabel: "View current status",
      },
    };
  }

  const failedTurn = input.latestTurnSummary?.status === "failed"
    ? input.latestTurnSummary
    : null;
  const failureSummary = input.diagnostics?.failureSummary?.trim()
    || input.productionStatus?.failureSummary?.trim()
    || input.thread?.latestError?.trim()
    || failedTurn?.impactSummary?.trim()
    || (input.thread?.status === "error" ? "The current creative thread is in an error state." : null);
  if (failureSummary) {
    const recoveryHint = input.diagnostics?.recoveryHint?.trim()
      || input.productionStatus?.recoveryHint?.trim()
      || failedTurn?.nextSuggestion?.trim()
      || "Analyze the current failure and suggest safe recovery steps";
    return {
      objectTitle,
      stageLabel,
      threadStatusLabel,
      recommendation: {
        tone: "danger",
        title: "Review current error state",
        description: `${failureSummary} Recovery will continue using existing novel assets and task records.`,
        action: "send_prompt",
        actionLabel: "View failure details",
        prompt: `Explain the failure cause, execution log, and recommended next steps: ${recoveryHint}`,
      },
    };
  }

  if (input.novelSetup && input.novelSetup.stage !== "ready_for_production") {
    const prompt = input.novelSetup.recommendedAction?.trim()
      || input.novelSetup.nextQuestion?.trim();
    return {
      objectTitle,
      stageLabel,
      threadStatusLabel,
      recommendation: {
        tone: "warning",
        title: "Continue completing book setup",
        description: input.novelSetup.nextQuestion?.trim()
          || "Complete the key information that affects planning before entering full production.",
        action: prompt ? "send_prompt" : "open_production",
        actionLabel: prompt ? "Continue with AI suggestion" : "View book setup",
        ...(prompt ? { prompt } : {}),
      },
    };
  }

  const nextSuggestion = input.latestTurnSummary?.nextSuggestion?.trim();
  if (nextSuggestion) {
    return {
      objectTitle,
      stageLabel,
      threadStatusLabel,
      recommendation: {
        tone: "info",
        title: "Review current diagnostics",
        description: nextSuggestion,
        action: "send_prompt",
        actionLabel: "View suggestion",
        prompt: `Explain the current state, execution log, and recommended entry point: ${nextSuggestion}`,
      },
    };
  }

  if (objectTitle === "No novel bound") {
    return {
      objectTitle,
      stageLabel,
      threadStatusLabel,
      recommendation: {
        tone: "info",
        title: "Select a novel to work on",
        description: "Once a novel is bound, the AI can access its chapters, world, characters, and production state.",
        action: "select_novel",
        actionLabel: "Select novel",
      },
    };
  }

  return {
    objectTitle,
    stageLabel,
    threadStatusLabel,
    recommendation: {
      tone: "neutral",
      title: "Describe the creative goal for this session",
      description: "You can add novel issues, adjust requirements, or open full production settings to continue the current novel.",
      action: "open_production",
      actionLabel: "View production entry",
    },
  };
}

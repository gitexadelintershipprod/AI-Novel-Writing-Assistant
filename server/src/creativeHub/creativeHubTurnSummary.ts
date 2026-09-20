import { asObject, summarizeOutput } from "../agents/runtime/runtimeHelpers";
import type { AgentRuntimeResult, PlannerResult, StructuredIntent } from "../agents/types";
import type { ProductionStatusResult } from "../services/novel/NovelProductionStatusService";
import type { AgentStep } from "@ai-novel/shared/types/agent";
import type {
  CreativeHubInterrupt,
  CreativeHubThread,
  CreativeHubTurnStatus,
  CreativeHubTurnSummary,
} from "@ai-novel/shared/types/creativeHub";

function truncateText(value: string, max = 180): string {
  const normalized = value.replace(/\s+/g, " ").trim();
  if (!normalized) {
    return "";
  }
  return normalized.length > max ? `${normalized.slice(0, max)}...` : normalized;
}

function formatIntentLabel(intent: StructuredIntent["intent"] | undefined): string {
  switch (intent) {
    case "social_opening":
      return "light opening";
    case "list_novels":
      return "Open the novel workspace";
    case "create_novel":
      return "Create a new novel";
    case "select_novel_workspace":
      return "Switch the current workspace";
    case "unbind_world_from_novel":
      return "Unbind the current world";
    case "produce_novel":
      return "Advance full-book production";
    case "query_novel_production_status":
      return "View full-book production progress";
    case "query_chapter_content":
      return "View chapter content";
    case "inspect_failure_reason":
      return "Diagnose the current blocker";
    case "write_chapter":
      return "Advance chapter writing";
    case "rewrite_chapter":
      return "Rewrite the current chapter";
    case "search_knowledge":
      return "Look up knowledge materials";
    case "ideate_novel_setup":
      return "Generate settings alternatives";
    case "workflow_handoff":
      return "Open the formal workspace";
    case "out_of_scope":
      return "Find a better entry point";
    case "inspect_world":
      return "Check world constraints";
    case "inspect_characters":
      return "View character status";
    case "general_chat":
      return "Creative discussion";
    default:
      return "Advance the current work";
  }
}

function toTurnStatus(
  threadStatus: CreativeHubThread["status"],
  latestError: string | null,
  executionResult: AgentRuntimeResult | null,
): CreativeHubTurnStatus {
  if (latestError || executionResult?.run.status === "failed") {
    return "failed";
  }
  if (threadStatus === "interrupted" || executionResult?.run.status === "waiting_approval") {
    return "interrupted";
  }
  if (executionResult?.run.status === "cancelled") {
    return "cancelled";
  }
  if (executionResult?.run.status === "running" || threadStatus === "busy") {
    return "running";
  }
  return "succeeded";
}

function extractToolSummaries(steps: AgentStep[]): string[] {
  return steps
    .filter((step) => step.stepType === "tool_result" && step.status === "succeeded")
    .map((step) => {
      const input = asObject(step.inputJson);
      const output = asObject(step.outputJson);
      const tool = typeof input.tool === "string" ? input.tool : "";
      if (!tool) {
        return "";
      }
      return truncateText(summarizeOutput(tool, output), 120);
    })
    .filter(Boolean);
}

function shouldEmitTurnSummary(
  turnStatus: CreativeHubTurnStatus,
  latestError: string | null,
  plannerResult: PlannerResult | null,
  executionResult: AgentRuntimeResult | null,
): boolean {
  if (plannerResult?.structuredIntent.intent === "social_opening") {
    return false;
  }
  if (latestError) {
    return true;
  }
  if (turnStatus !== "succeeded") {
    return true;
  }
  const steps = executionResult?.steps ?? [];
  return steps.some((step) => step.stepType === "tool_result" && step.status === "succeeded");
}

function buildIntentSummary(goal: string, plannerResult: PlannerResult | null): string {
  const structuredIntent = plannerResult?.structuredIntent;
  const describedGoal = truncateText(structuredIntent?.description ?? structuredIntent?.note ?? goal, 150);
  const label = formatIntentLabel(structuredIntent?.intent);
  return describedGoal ? `${label}: ${describedGoal}` : label;
}

function buildActionSummary(
  turnStatus: CreativeHubTurnStatus,
  plannerResult: PlannerResult | null,
  toolSummaries: string[],
): string {
  if (toolSummaries.length > 0) {
    const preview = toolSummaries.slice(0, 3).join("; ");
    if (toolSummaries.length > 3) {
      return `${preview} and ${toolSummaries.length - 3} more actions.`;
    }
    return preview;
  }
  if ((plannerResult?.actions.length ?? 0) > 0) {
    const count = plannerResult?.actions.reduce((total, action) => total + action.calls.length, 0) ?? 0;
    if (turnStatus === "interrupted") {
      return `${count} actions were planned. The run is waiting on approval or confirmation.`;
    }
    return `${count} actions were planned. This turn focused on creative coordination and status cleanup.`;
  }
  return "This turn did not call an explicit tool. It stayed on creative dialogue and workspace understanding.";
}

function buildImpactSummary(
  latestError: string | null,
  interrupts: CreativeHubInterrupt[],
  productionStatus?: ProductionStatusResult | null,
  toolSummaries: string[] = [],
): string {
  if (latestError) {
    return truncateText(latestError, 180);
  }
  if (interrupts.length > 0) {
    return truncateText(interrupts[0]?.summary ?? "A high-impact action is waiting for confirmation.", 180);
  }
  if (productionStatus?.summary?.trim()) {
    return truncateText(productionStatus.summary, 180);
  }
  if (toolSummaries.length > 0) {
    return toolSummaries[toolSummaries.length - 1];
  }
  return "Workspace status was updated. You can continue along the current direction.";
}

function buildNextSuggestion(
  turnStatus: CreativeHubTurnStatus,
  plannerResult: PlannerResult | null,
  latestError: string | null,
  interrupts: CreativeHubInterrupt[],
  productionStatus?: ProductionStatusResult | null,
): string {
  if (turnStatus === "interrupted" && interrupts.length > 0) {
    return "Handle the current approval card first, then continue production.";
  }
  if (turnStatus === "failed" || latestError) {
    return productionStatus?.recoveryHint?.trim()
      || "Check the failure diagnosis and blocker first, then decide whether to keep generating or adjust context.";
  }
  switch (plannerResult?.structuredIntent.intent) {
    case "create_novel":
      return "Keep filling in the world, characters, or full-book production settings so this book can enter a stable workspace.";
    case "unbind_world_from_novel":
      return "If the world still cannot support the story, pick a better world. Otherwise continue filling in the core setup.";
    case "produce_novel":
      return "Keep advancing full-book production for the current novel. Check the key blocker first if needed.";
    case "query_novel_production_status":
      return "Use the current progress to decide whether to keep generating, fill in assets, or handle the failure first.";
    case "write_chapter":
    case "rewrite_chapter":
      return "Keep advancing the current chapter text, repair remaining issues, or check context consistency.";
    case "search_knowledge":
      return "Keep asking from the materials already found, or bind key materials to the current workspace.";
    case "ideate_novel_setup":
      return "Pick the closest option from the current alternatives, then refine the protagonist, conflict, and story promise.";
    case "workflow_handoff":
    case "out_of_scope":
      return "Open the formal novel workbench, Auto-Director, or Task Center to finish the next steps.";
    default:
      return "View the current status, failure reason, or next-step suggestion.";
  }
}

function buildCurrentStage(
  turnStatus: CreativeHubTurnStatus,
  plannerResult: PlannerResult | null,
  executionResult: AgentRuntimeResult | null,
  productionStatus?: ProductionStatusResult | null,
): string {
  if (turnStatus === "interrupted") {
    return "Waiting for approval";
  }
  if (turnStatus === "failed") {
    return "The run failed";
  }
  if (productionStatus?.currentStage?.trim()) {
    return productionStatus.currentStage.trim();
  }
  if (executionResult?.run.currentStep?.trim()) {
    return executionResult.run.currentStep.trim();
  }
  return formatIntentLabel(plannerResult?.structuredIntent.intent);
}

export function buildCreativeHubTurnSummary(input: {
  checkpointId: string;
  goal: string;
  threadStatus: CreativeHubThread["status"];
  latestError: string | null;
  plannerResult: PlannerResult | null;
  executionResult: AgentRuntimeResult | null;
  interrupts: CreativeHubInterrupt[];
  productionStatus?: ProductionStatusResult | null;
}): CreativeHubTurnSummary | null {
  const executionResult = input.executionResult;
  const runId = executionResult?.run.id;
  if (!runId) {
    return null;
  }

  const turnStatus = toTurnStatus(input.threadStatus, input.latestError, executionResult);
  if (!shouldEmitTurnSummary(turnStatus, input.latestError, input.plannerResult, executionResult)) {
    return null;
  }
  const toolSummaries = extractToolSummaries(executionResult.steps);

  return {
    runId,
    checkpointId: input.checkpointId,
    status: turnStatus,
    currentStage: buildCurrentStage(turnStatus, input.plannerResult, executionResult, input.productionStatus),
    intentSummary: buildIntentSummary(input.goal, input.plannerResult),
    actionSummary: buildActionSummary(turnStatus, input.plannerResult, toolSummaries),
    impactSummary: buildImpactSummary(input.latestError, input.interrupts, input.productionStatus, toolSummaries),
    nextSuggestion: buildNextSuggestion(
      turnStatus,
      input.plannerResult,
      input.latestError,
      input.interrupts,
      input.productionStatus,
    ),
  };
}

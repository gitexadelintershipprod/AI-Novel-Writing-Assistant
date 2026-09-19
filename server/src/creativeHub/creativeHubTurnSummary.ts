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
      return "切换当前工作区";
    case "unbind_world_from_novel":
      return "解除当前世界观绑定";
    case "produce_novel":
      return "推进整本创作";
    case "query_novel_production_status":
      return "查看Whole production进度";
    case "query_chapter_content":
      return "查看Chapter content";
    case "inspect_failure_reason":
      return "诊断currently blocked";
    case "write_chapter":
      return "推进章节创作";
    case "rewrite_chapter":
      return "重写Current chapter";
    case "search_knowledge":
      return "查阅Knowledge materials";
    case "ideate_novel_setup":
      return "Generate settings alternatives";
    case "workflow_handoff":
      return "前往正式工作台";
    case "out_of_scope":
      return "查看合适入口";
    case "inspect_world":
      return "检查世界观约束";
    case "inspect_characters":
      return "View character status";
    case "general_chat":
      return "创作讨论";
    default:
      return "推进当前创作";
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
  return describedGoal ? `${label}：${describedGoal}` : label;
}

function buildActionSummary(
  turnStatus: CreativeHubTurnStatus,
  plannerResult: PlannerResult | null,
  toolSummaries: string[],
): string {
  if (toolSummaries.length > 0) {
    const preview = toolSummaries.slice(0, 3).join("；");
    if (toolSummaries.length > 3) {
      return `${preview} 等 ${toolSummaries.length} items动作。`;
    }
    return preview;
  }
  if ((plannerResult?.actions.length ?? 0) > 0) {
    const count = plannerResult?.actions.reduce((total, action) => total + action.calls.length, 0) ?? 0;
    if (turnStatus === "interrupted") {
      return `已规划 ${count} items动作，当前停在审批或确认环节。`;
    }
    return `已规划 ${count} items动作，本轮以创作协同与状态整理为主。`;
  }
  return "本轮未触发显式工具动作，以creative dialogue与工作区理解为主。";
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
    return truncateText(interrupts[0]?.summary ?? "当前存在待确认的高影响操作。", 180);
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
    return "先处理当前审批卡，再keep pushing forward后续创作。";
  }
  if (turnStatus === "failed" || latestError) {
    return productionStatus?.recoveryHint?.trim()
      || "Check the failure diagnosis and blocker first, then decide whether to keep generating or adjust context.";
  }
  switch (plannerResult?.structuredIntent.intent) {
    case "create_novel":
      return "继续补齐世界观、角色或Whole production参数，让这本书进入稳定工作区。";
    case "unbind_world_from_novel":
      return "If the world still cannot support the story, pick a better world. Otherwise continue filling in the core setup.";
    case "produce_novel":
      return "继续围绕current novel推进Whole production，必要时先检查关键阻塞。";
    case "query_novel_production_status":
      return "Use the current progress to decide whether to keep generating, fill in assets, or handle the failure first.";
    case "write_chapter":
    case "rewrite_chapter":
      return "继续围绕Current chapter推进正文、修复问题或检查上下文一致性。";
    case "search_knowledge":
      return "Keep asking from the materials already found, or bind key materials to the current workspace.";
    case "ideate_novel_setup":
      return "从当前备选里挑出最接近的一版，再继续细化主角、冲突和story promise。";
    case "workflow_handoff":
    case "out_of_scope":
      return "打开正式Novel workbench、Auto-Director或任务中心完成后续操作。";
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

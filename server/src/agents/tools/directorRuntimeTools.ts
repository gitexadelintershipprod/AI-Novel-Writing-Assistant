import type {
  DirectorManualEditImpact,
  DirectorNextAction,
  DirectorPolicyMode,
  DirectorRuntimeProjection,
  DirectorWorkspaceAnalysis,
} from "@ai-novel/shared/types/directorRuntime";
import type { NovelDirectorService } from "../../services/novel/director/NovelDirectorService";
import type { DirectorCommandService } from "../../services/novel/director/commands/DirectorCommandService";
import type { NovelWorkflowService } from "../../services/novel/workflow/NovelWorkflowService";
import { AgentToolError, type AgentToolName, type ToolExecutionContext } from "../types";
import type { AgentToolDefinition } from "./toolTypes";
import {
  analyzeDirectorWorkspaceInputSchema,
  analyzeDirectorWorkspaceOutputSchema,
  evaluateManualEditImpactInputSchema,
  evaluateManualEditImpactOutputSchema,
  explainDirectorNextActionInputSchema,
  explainDirectorNextActionOutputSchema,
  getDirectorRunStatusInputSchema,
  getDirectorRunStatusOutputSchema,
  runDirectorRuntimeInputSchema,
  runDirectorRuntimeOutputSchema,
  switchDirectorPolicyInputSchema,
  switchDirectorPolicyOutputSchema,
} from "./directorRuntimeToolSchemas";

let serviceCache: {
  novelDirectorService: NovelDirectorService;
  directorCommandService: DirectorCommandService;
  workflowService: NovelWorkflowService;
} | null = null;

async function getServices() {
  if (serviceCache) {
    return serviceCache;
  }
  const [
    { NovelDirectorService },
    { DirectorCommandService },
    { NovelWorkflowService },
  ] = await Promise.all([
    import("../../services/novel/director/NovelDirectorService"),
    import("../../services/novel/director/commands/DirectorCommandService"),
    import("../../services/novel/workflow/NovelWorkflowService"),
  ]);
  const workflowService = new NovelWorkflowService();
  serviceCache = {
    novelDirectorService: new NovelDirectorService(),
    directorCommandService: new DirectorCommandService(workflowService),
    workflowService,
  };
  return serviceCache;
}

interface ResolvedDirectorRuntimeScope {
  taskId: string;
  novelId: string;
}

function trimText(value: string | null | undefined): string | null {
  const text = value?.trim();
  return text ? text : null;
}

function resolveNovelId(context: ToolExecutionContext, input: {
  novelId?: string;
}): string | null {
  return trimText(input.novelId) ?? trimText(context.novelId);
}

async function resolveDirectorRuntimeScope(
  context: ToolExecutionContext,
  input: {
    novelId?: string;
    taskId?: string;
  },
): Promise<ResolvedDirectorRuntimeScope> {
  const { workflowService } = await getServices();
  const taskId = trimText(input.taskId);
  if (taskId) {
    const task = await workflowService.getTaskByIdWithoutHealing(taskId);
    if (!task) {
      throw new AgentToolError("NOT_FOUND", "No bound Auto-Director task was found.");
    }
    const novelId = trimText(input.novelId) ?? trimText(task.novelId) ?? trimText(context.novelId);
    if (!novelId) {
      throw new AgentToolError("INVALID_INPUT", "The Auto-Director task is not bound to a novel, so runtime cannot be read.");
    }
    return { taskId: task.id, novelId };
  }

  const novelId = resolveNovelId(context, input);
  if (!novelId) {
    throw new AgentToolError("INVALID_INPUT", "Bind a novel or pass an Auto-Director task ID.");
  }

  const activeTask = await workflowService.findActiveTaskByNovelAndLane(novelId, "auto_director");
  const task = activeTask ?? await workflowService.findLatestVisibleTaskByNovelId(novelId, "auto_director");
  if (!task) {
    throw new AgentToolError("NOT_FOUND", "This novel has no Auto-Director task that can be read yet.");
  }
  return {
    taskId: task.id,
    novelId: trimText(task.novelId) ?? novelId,
  };
}

function toNextAction(action: DirectorNextAction | null | undefined) {
  if (!action) {
    return null;
  }
  return {
    action: action.action,
    reason: action.reason,
    affectedScope: action.affectedScope ?? null,
    riskLevel: action.riskLevel,
  };
}

function buildArtifactSummary(analysis: DirectorWorkspaceAnalysis) {
  const inventory = analysis.inventory;
  return {
    total: inventory.artifacts.length,
    missingArtifactTypes: inventory.missingArtifactTypes,
    staleArtifactCount: inventory.staleArtifacts.length,
    protectedUserContentCount: inventory.protectedUserContentArtifacts.length,
    needsRepairCount: inventory.needsRepairArtifacts.length,
  };
}

function buildWorkspaceOutput(input: {
  taskId: string | null;
  analysis: DirectorWorkspaceAnalysis;
}) {
  const interpretation = input.analysis.interpretation;
  const nextAction = input.analysis.recommendation ?? interpretation?.recommendedAction ?? null;
  return {
    novelId: input.analysis.novelId,
    taskId: input.taskId,
    productionStage: interpretation?.productionStage ?? null,
    summary: interpretation?.summary
      ?? nextAction?.reason
      ?? "Auto-Director workspace analysis for this novel is complete.",
    confidence: input.analysis.confidence,
    nextAction: toNextAction(nextAction),
    artifactSummary: buildArtifactSummary(input.analysis),
  };
}

function buildProjectionSummary(projection: DirectorRuntimeProjection): string {
  if (projection.requiresUserAction && projection.blockedReason) {
    return projection.blockedReason;
  }
  return projection.headline
    ?? projection.detail
    ?? projection.lastEventSummary
    ?? "Auto-Director run status was read.";
}

async function loadRuntimeProjection(scope: ResolvedDirectorRuntimeScope): Promise<DirectorRuntimeProjection> {
  const { novelDirectorService } = await getServices();
  const projection = await novelDirectorService.getRuntimeProjection(scope.taskId);
  if (!projection) {
    throw new AgentToolError("NOT_FOUND", "The current Auto-Director task has no runtime snapshot yet.");
  }
  return projection;
}

function buildStatusOutput(scope: ResolvedDirectorRuntimeScope, projection: DirectorRuntimeProjection) {
  return {
    taskId: scope.taskId,
    novelId: projection.novelId ?? scope.novelId ?? null,
    status: projection.status,
    currentNodeKey: projection.currentNodeKey ?? null,
    currentLabel: projection.currentLabel ?? null,
    headline: projection.headline ?? null,
    detail: projection.detail ?? null,
    nextActionLabel: projection.nextActionLabel ?? null,
    scopeSummary: projection.scopeSummary ?? null,
    progressSummary: projection.progressSummary ?? null,
    progressBreakdown: projection.progressBreakdown ?? null,
    requiresUserAction: projection.requiresUserAction,
    blockedReason: projection.blockedReason ?? null,
    blockingReason: projection.blockingReason ?? projection.blockedReason ?? null,
    recommendedAction: projection.recommendedAction ?? null,
    recoveryDecision: projection.recoveryDecision ?? "requires_manual_recovery",
    isAutopilotRecoverable: projection.isAutopilotRecoverable ?? false,
    visibleRiskBadges: projection.visibleRiskBadges ?? [],
    rootCauseCode: projection.rootCauseCode ?? null,
    blockingObligations: projection.blockingObligations ?? [],
    qualityBudgetSummary: projection.qualityBudgetSummary ?? null,
    qualityDebtSummary: projection.qualityDebtSummary ?? null,
    policyMode: projection.policyMode,
    recentEvents: projection.recentEvents.map((event) => ({
      type: event.type,
      summary: event.summary,
      nodeKey: event.nodeKey ?? null,
      severity: event.severity ?? null,
      occurredAt: event.occurredAt,
    })),
    summary: buildProjectionSummary(projection),
  };
}

function getLlmOptions(context: ToolExecutionContext) {
  return {
    provider: context.provider as any,
    model: context.model,
    temperature: context.temperature,
  };
}

async function analyzeWorkspaceForTool(
  context: ToolExecutionContext,
  input: {
    novelId?: string;
    taskId?: string;
    includeAiInterpretation?: boolean;
  },
) {
  const { novelDirectorService } = await getServices();
  const scope = await resolveDirectorRuntimeScope(context, input);
  const analysis = await novelDirectorService.analyzeRuntimeWorkspace(scope.novelId, {
    workflowTaskId: context.plannerProfile === "creative_hub_readonly" ? null : scope.taskId,
    includeAiInterpretation: input.includeAiInterpretation === true,
    llm: getLlmOptions(context),
  });
  return { scope, analysis };
}

function normalizePolicyPatch(input: {
  mayOverwriteUserContent?: boolean;
  allowExpensiveReview?: boolean;
  modelTier?: "cheap_fast" | "balanced" | "high_quality";
}) {
  return {
    mayOverwriteUserContent: input.mayOverwriteUserContent,
    allowExpensiveReview: input.allowExpensiveReview,
    modelTier: input.modelTier,
  };
}

function describeDirectorPolicyMode(mode: DirectorPolicyMode): string {
  switch (mode) {
    case "suggest_only":
      return "Just give advice";
    case "run_next_step":
      return "Proceed to the next step";
    case "run_until_gate":
      return "推进到下一个检查点";
    case "auto_safe_scope":
      return "Safe range automatic advancement";
    default:
      return "当前Propulsion method";
  }
}

function buildManualImpactOutput(input: {
  taskId: string | null;
  impact: DirectorManualEditImpact;
}) {
  return {
    novelId: input.impact.novelId,
    taskId: input.taskId,
    impactLevel: input.impact.impactLevel,
    summary: input.impact.summary,
    safeToContinue: input.impact.safeToContinue,
    requiresApproval: input.impact.requiresApproval,
    affectedArtifactIds: input.impact.affectedArtifactIds,
    changedChapters: input.impact.changedChapters.map((chapter) => ({
      chapterId: chapter.chapterId,
      title: chapter.title,
      order: chapter.order,
    })),
    minimalRepairPath: input.impact.minimalRepairPath.map((step) => ({
      action: step.action,
      label: step.label,
      reason: step.reason,
      affectedScope: step.affectedScope ?? null,
      requiresApproval: step.requiresApproval,
    })),
    riskNotes: input.impact.riskNotes,
  };
}

async function runDirectorWithMode(
  context: ToolExecutionContext,
  input: {
    novelId?: string;
    taskId?: string;
    dryRun?: boolean;
  },
  mode: DirectorPolicyMode,
) {
  const { novelDirectorService, directorCommandService } = await getServices();
  const scope = await resolveDirectorRuntimeScope(context, input);
  const modeLabel = describeDirectorPolicyMode(mode);
  if (context.dryRun || input.dryRun) {
    return {
      taskId: scope.taskId,
      novelId: scope.novelId,
      mode,
      status: "preview_only" as const,
      summary: `Auto-Director will continue using “${modeLabel}”. Retention policy and approval boundaries stay in effect.`,
    };
  }
  await novelDirectorService.updateRuntimePolicy(scope.taskId, { mode });
  await directorCommandService.enqueueContinueCommand(scope.taskId, {});
  return {
    taskId: scope.taskId,
    novelId: scope.novelId,
    mode,
    status: "accepted" as const,
    summary: `Requested Auto-Director to continue using “${modeLabel}”.`,
  };
}

export const directorRuntimeToolDefinitions: Partial<
  Record<AgentToolName, AgentToolDefinition<Record<string, unknown>, Record<string, unknown>>>
> = {
  analyze_director_workspace: {
    name: "analyze_director_workspace",
    title: "Analyze the Auto-Director workspace",
    description: "Analyze the current novel's assets, missing content, risks, and recommended actions through Auto-Director runtime.",
    category: "inspect",
    riskLevel: "low",
    domainAgent: "NovelAgent",
    resourceScopes: ["novel", "task"],
    parserHints: {
      intent: "analyze_director_workspace",
      aliases: ["Director workspace analysis", "Auto-Director分析", "分析current novel资产"],
      phrases: ["分析这本书现在缺什么", "让Auto-Director检查当前工作区", "current novel资产是否完整"],
      requiresNovelContext: true,
      whenToUse: "The user asks Auto-Director to analyze current-novel assets, gaps, risks, or whether work can continue.",
    },
    inputSchema: analyzeDirectorWorkspaceInputSchema,
    outputSchema: analyzeDirectorWorkspaceOutputSchema,
    execute: async (context, rawInput) => {
      const input = analyzeDirectorWorkspaceInputSchema.parse(rawInput);
      const { scope, analysis } = await analyzeWorkspaceForTool(context, input);
      return analyzeDirectorWorkspaceOutputSchema.parse(buildWorkspaceOutput({
        taskId: scope.taskId,
        analysis,
      }));
    },
  },
  get_director_run_status: {
    name: "get_director_run_status",
    title: "Read Auto-Director status",
    description: "Read the Auto-Director runtime snapshot, including the current node, wait reason, and recent events.",
    category: "inspect",
    riskLevel: "low",
    domainAgent: "NovelAgent",
    resourceScopes: ["novel", "task"],
    parserHints: {
      intent: "query_director_status",
      aliases: ["Auto-Director状态", "Director's progress", "director runtime"],
      phrases: ["Auto-Director到哪了", "导演任务现在什么状态", "当前导演节点是什么"],
      requiresNovelContext: true,
      whenToUse: "The user is asking about Auto-Director running status, the current node, a confirmation wait, or recent events.",
    },
    inputSchema: getDirectorRunStatusInputSchema,
    outputSchema: getDirectorRunStatusOutputSchema,
    execute: async (context, rawInput) => {
      const input = getDirectorRunStatusInputSchema.parse(rawInput);
      const scope = await resolveDirectorRuntimeScope(context, input);
      const projection = await loadRuntimeProjection(scope);
      return getDirectorRunStatusOutputSchema.parse(buildStatusOutput(scope, projection));
    },
  },
  explain_director_next_action: {
    name: "explain_director_next_action",
    title: "Explain Auto-Director next step",
    description: "Use runtime status and workspace analysis to explain how this novel should advance next.",
    category: "inspect",
    riskLevel: "low",
    domainAgent: "NovelAgent",
    resourceScopes: ["novel", "task"],
    parserHints: {
      intent: "explain_director_next_action",
      aliases: ["Suggestions for next steps", "导演建议", "现在该做什么"],
      phrases: ["What this book should do now", "What to do next", "Auto-DirectorSuggest next steps是什么"],
      requiresNovelContext: true,
      whenToUse: "The user wants Creative Hub to explain this novel's next step, risks, and recommended action.",
    },
    inputSchema: explainDirectorNextActionInputSchema,
    outputSchema: explainDirectorNextActionOutputSchema,
    execute: async (context, rawInput) => {
      const input = explainDirectorNextActionInputSchema.parse(rawInput);
      const { scope, analysis } = await analyzeWorkspaceForTool(context, input);
      const projection = await loadRuntimeProjection(scope);
      const nextAction = analysis.recommendation ?? analysis.interpretation?.recommendedAction ?? null;
      const reason = nextAction?.reason
        ?? projection.nextActionLabel
        ?? projection.detail
        ?? "当前Auto-Director会根据运行时状态继续Recommend next step。";
      return explainDirectorNextActionOutputSchema.parse({
        novelId: scope.novelId,
        taskId: scope.taskId,
        runtimeStatus: projection.status,
        currentStep: projection.currentLabel ?? projection.currentNodeKey ?? null,
        recommendedAction: toNextAction(nextAction),
        nextActionLabel: projection.nextActionLabel ?? null,
        requiresUserAction: projection.requiresUserAction,
        blockedReason: projection.blockedReason ?? null,
        reason,
        summary: projection.requiresUserAction && projection.blockedReason
          ? projection.blockedReason
          : reason,
      });
    },
  },
  run_director_next_step: {
    name: "run_director_next_step",
    title: "Continue Auto-Director to the next step",
    description: "Ask Auto-Director runtime to continue to the next step.",
    category: "run",
    riskLevel: "high",
    approvalRequired: true,
    domainAgent: "NovelAgent",
    resourceScopes: ["novel", "task"],
    parserHints: {
      intent: "run_director_next_step",
      aliases: ["continue directing", "Proceed to the next step", "run next step"],
      phrases: ["Continue Auto-Director to the next step", "Let the director take one more step", "执行导演下一步"],
      requiresNovelContext: true,
      whenToUse: "The user explicitly asks Auto-Director to continue with the next step.",
    },
    inputSchema: runDirectorRuntimeInputSchema,
    outputSchema: runDirectorRuntimeOutputSchema,
    execute: async (context, rawInput) => {
      const input = runDirectorRuntimeInputSchema.parse(rawInput);
      return runDirectorRuntimeOutputSchema.parse(await runDirectorWithMode(context, input, "run_next_step"));
    },
  },
  run_director_until_gate: {
    name: "run_director_until_gate",
    title: "Advance automatically to the checkpoint",
    description: "Ask Auto-Director runtime to keep advancing to the next checkpoint or confirmation point.",
    category: "run",
    riskLevel: "high",
    approvalRequired: true,
    domainAgent: "NovelAgent",
    resourceScopes: ["novel", "task"],
    parserHints: {
      intent: "run_director_until_gate",
      aliases: ["Advance to checkpoint", "run until gate", "推进到确认点"],
      phrases: ["Continue Auto-Director to the checkpoint", "Advance to the next place that needs my confirmation", "让导演运行到下一个关口"],
      requiresNovelContext: true,
      whenToUse: "The user explicitly asks Auto-Director to keep advancing until a checkpoint, confirmation point, or blocker.",
    },
    inputSchema: runDirectorRuntimeInputSchema,
    outputSchema: runDirectorRuntimeOutputSchema,
    execute: async (context, rawInput) => {
      const input = runDirectorRuntimeInputSchema.parse(rawInput);
      return runDirectorRuntimeOutputSchema.parse(await runDirectorWithMode(context, input, "run_until_gate"));
    },
  },
  switch_director_policy: {
    name: "switch_director_policy",
    title: "Switch Auto-Director approach",
    description: "Switch Auto-Director runtime policy, for example advice only, next step, advance to checkpoint, or safe-range auto-advance.",
    category: "run",
    riskLevel: "medium",
    domainAgent: "NovelAgent",
    resourceScopes: ["novel", "task"],
    parserHints: {
      intent: "switch_director_policy",
      aliases: ["切换导演策略", "切换Propulsion method", "自动化强度"],
      phrases: ["Switch Auto-Director to suggestions only", "Switch to advancing to a checkpoint", "Allow auto-advance in a safe range"],
      requiresNovelContext: true,
      whenToUse: "The user explicitly asks to adjust Auto-Director policy or automation intensity.",
    },
    inputSchema: switchDirectorPolicyInputSchema,
    outputSchema: switchDirectorPolicyOutputSchema,
    execute: async (context, rawInput) => {
      const input = switchDirectorPolicyInputSchema.parse(rawInput);
      const scope = await resolveDirectorRuntimeScope(context, input);
      if (context.dryRun || input.dryRun) {
        return switchDirectorPolicyOutputSchema.parse({
          taskId: scope.taskId,
          novelId: scope.novelId,
          mode: input.mode,
          status: "preview_only",
          summary: `Will switch the Auto-Director approach to “${describeDirectorPolicyMode(input.mode)}”.`,
        });
      }
      const { novelDirectorService } = await getServices();
      await novelDirectorService.updateRuntimePolicy(scope.taskId, {
        mode: input.mode,
        patch: normalizePolicyPatch(input),
      });
      return switchDirectorPolicyOutputSchema.parse({
        taskId: scope.taskId,
        novelId: scope.novelId,
        mode: input.mode,
        status: "updated",
        summary: `Switched the Auto-Director approach to “${describeDirectorPolicyMode(input.mode)}”.`,
      });
    },
  },
  evaluate_manual_edit_impact: {
    name: "evaluate_manual_edit_impact",
    title: "Assess the impact of a manual edit",
    description: "Use Auto-Director runtime to assess the impact of a manual prose edit and the smallest repair path.",
    category: "inspect",
    riskLevel: "low",
    domainAgent: "NovelAgent",
    resourceScopes: ["novel", "chapter", "task"],
    parserHints: {
      intent: "evaluate_manual_edit_impact",
      aliases: ["改文影响", "手动编辑影响", "manual edit impact"],
      phrases: ["我改了第三章看看影响什么", "我改了主角动机后续要不要重算", "Which chapters would deleting this payoff affect"],
      requiresNovelContext: true,
      whenToUse: "After the user manually edits prose, motive, payoffs, or canon, they want impact scope and a repair path.",
    },
    inputSchema: evaluateManualEditImpactInputSchema,
    outputSchema: evaluateManualEditImpactOutputSchema,
    execute: async (context, rawInput) => {
      const input = evaluateManualEditImpactInputSchema.parse(rawInput);
      const scope = await resolveDirectorRuntimeScope(context, input);
      const { novelDirectorService } = await getServices();
      const impact = await novelDirectorService.evaluateManualEditImpact(scope.novelId, {
        workflowTaskId: context.plannerProfile === "creative_hub_readonly" ? null : scope.taskId,
        chapterId: input.chapterId,
        includeAiInterpretation: input.includeAiInterpretation ?? true,
        llm: getLlmOptions(context),
      });
      return evaluateManualEditImpactOutputSchema.parse(buildManualImpactOutput({
        taskId: scope.taskId,
        impact,
      }));
    },
  },
};

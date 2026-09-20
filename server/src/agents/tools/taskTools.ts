import { prisma } from "../../db/prisma";
import { taskCenterService } from "../../services/task/TaskCenterService";
import { buildTaskRecoveryHint, normalizeFailureSummary } from "../../services/task/taskSupport";
import { AgentToolError, type AgentToolName } from "../types";
import type { AgentToolDefinition } from "./toolTypes";
import {
  explainGenerationBlockerInputSchema,
  explainGenerationBlockerOutputSchema,
  getRunFailureReasonInputSchema,
  getRunFailureReasonOutputSchema,
  getTaskDetailOutputSchema,
  getTaskFailureReasonOutputSchema,
  listTasksInputSchema,
  listTasksOutputSchema,
  taskIdentityInputSchema,
  taskMutationOutputSchema,
} from "./taskToolSchemas";

export const taskToolDefinitions: Partial<
  Record<AgentToolName, AgentToolDefinition<Record<string, unknown>, Record<string, unknown>>>
> = {
  list_tasks: {
    name: "list_tasks",
    title: "List system tasks",
    description: "Read the task center's unified task list, statuses, and recovery hints.",
    category: "read",
    riskLevel: "low",
    domainAgent: "Coordinator",
    resourceScopes: ["task", "agent_run", "generation_job"],
    parserHints: {
      intent: "query_task_status",
      aliases: ["task list", "system tasks", "tasks"],
      phrases: ["List current system task status", "What tasks does the system have now", "View task center status"],
      requiresNovelContext: false,
      whenToUse: "The user is querying the task center, system task status, or the task list.",
      whenNotToUse: "The user is asking about one novel's production progress; that is closer to query_novel_production_status.",
    },
    inputSchema: listTasksInputSchema,
    outputSchema: listTasksOutputSchema,
    execute: async (_context, rawInput) => {
      const input = listTasksInputSchema.parse(rawInput);
      const data = await taskCenterService.listTasks(input);
      return listTasksOutputSchema.parse({
        items: data.items.map((item) => ({
          id: item.id,
          kind: item.kind,
          title: item.title,
          status: item.status,
          progress: item.progress,
          currentStage: item.currentStage ?? null,
          ownerLabel: item.ownerLabel,
          failureSummary: item.failureSummary ?? item.lastError ?? null,
          recoveryHint: item.recoveryHint ?? null,
        })),
        summary: `Read ${data.items.length} system tasks.`,
      });
    },
  },
  get_task_detail: {
    name: "get_task_detail",
    title: "Read task details",
    description: "Read unified-task details, source page, and failure diagnosis.",
    category: "read",
    riskLevel: "low",
    domainAgent: "Coordinator",
    resourceScopes: ["task", "agent_run", "generation_job"],
    inputSchema: taskIdentityInputSchema,
    outputSchema: getTaskDetailOutputSchema,
    execute: async (_context, rawInput) => {
      const input = taskIdentityInputSchema.parse(rawInput);
      const detail = await taskCenterService.getTaskDetail(input.kind, input.id);
      if (!detail) {
        throw new AgentToolError("NOT_FOUND", "Task not found.");
      }
      const failureSummary = detail.failureSummary ?? detail.lastError ?? null;
      return getTaskDetailOutputSchema.parse({
        id: detail.id,
        kind: detail.kind,
        title: detail.title,
        status: detail.status,
        currentStage: detail.currentStage ?? null,
        ownerLabel: detail.ownerLabel,
        sourceRoute: detail.sourceRoute,
        failureSummary,
        failureDetails: detail.failureDetails ?? detail.lastError ?? null,
        recoveryHint: detail.recoveryHint ?? buildTaskRecoveryHint(detail.kind, detail.status),
        summary: `Read task ${detail.title}.`,
      });
    },
  },
  get_task_failure_reason: {
    name: "get_task_failure_reason",
    title: "Explain why the task failed",
    description: "Explain why the unified task failed, is queued, blocked, or waiting for approval.",
    category: "inspect",
    riskLevel: "low",
    domainAgent: "Coordinator",
    resourceScopes: ["task", "agent_run", "generation_job"],
    inputSchema: taskIdentityInputSchema,
    outputSchema: getTaskFailureReasonOutputSchema,
    execute: async (_context, rawInput) => {
      const input = taskIdentityInputSchema.parse(rawInput);
      const detail = await taskCenterService.getTaskDetail(input.kind, input.id);
      if (!detail) {
        throw new AgentToolError("NOT_FOUND", "Task not found.");
      }
      const recoveryHint = detail.recoveryHint ?? buildTaskRecoveryHint(detail.kind, detail.status);
      const failureSummary = normalizeFailureSummary(
        detail.failureSummary ?? detail.lastError,
        detail.status === "failed"
          ? "The task failed without a recorded error."
          : `The task's current status is ${detail.status}.`,
      );
      return getTaskFailureReasonOutputSchema.parse({
        kind: detail.kind,
        id: detail.id,
        status: detail.status,
        failureSummary,
        failureDetails: detail.failureDetails ?? detail.lastError ?? null,
        recoveryHint,
        summary: failureSummary,
      });
    },
  },
  get_run_failure_reason: {
    name: "get_run_failure_reason",
    title: "Explain why the run failed",
    description: "Read the Agent run's last failed step, error summary, and recovery suggestion.",
    category: "inspect",
    riskLevel: "low",
    domainAgent: "Coordinator",
    resourceScopes: ["agent_run", "task"],
    inputSchema: getRunFailureReasonInputSchema,
    outputSchema: getRunFailureReasonOutputSchema,
    execute: async (_context, rawInput) => {
      const input = getRunFailureReasonInputSchema.parse(rawInput);
      const run = await prisma.agentRun.findUnique({
        where: { id: input.runId },
      });
      if (!run) {
        throw new AgentToolError("NOT_FOUND", "Agent run not found.");
      }
      const failedStep = await prisma.agentStep.findFirst({
        where: {
          runId: run.id,
          status: "failed",
        },
        orderBy: [{ seq: "desc" }],
      });
      const failureSummary = normalizeFailureSummary(
        run.error ?? failedStep?.error,
        run.status === "failed"
          ? "The run failed without a recorded error."
          : run.status === "waiting_approval"
            ? "The run is waiting for approval."
            : `The run's current status is ${run.status}.`,
      );
      return getRunFailureReasonOutputSchema.parse({
        runId: run.id,
        status: run.status,
        failureSummary,
        failureDetails: failedStep?.error ?? run.error ?? null,
        recoveryHint: buildTaskRecoveryHint("agent_run", run.status),
        lastFailedStep: failedStep ? `${failedStep.agentName}.${failedStep.stepType}` : null,
        summary: failureSummary,
      });
    },
  },
  retry_task: {
    name: "retry_task",
    title: "Retry the task",
    description: "Retry the unified task and return a new status summary.",
    category: "run",
    riskLevel: "medium",
    domainAgent: "Coordinator",
    resourceScopes: ["task", "agent_run", "generation_job"],
    inputSchema: taskIdentityInputSchema,
    outputSchema: taskMutationOutputSchema,
    execute: async (_context, rawInput) => {
      const input = taskIdentityInputSchema.parse(rawInput);
      const detail = await taskCenterService.retryTask(input.kind, input.id);
      return taskMutationOutputSchema.parse({
        kind: detail.kind,
        id: detail.id,
        status: detail.status,
        summary: `Triggered a retry for task: ${detail.title}.`,
      });
    },
  },
  cancel_task: {
    name: "cancel_task",
    title: "Cancel task",
    description: "Cancel a unified task and return the latest status.",
    category: "run",
    riskLevel: "medium",
    domainAgent: "Coordinator",
    resourceScopes: ["task", "agent_run", "generation_job"],
    inputSchema: taskIdentityInputSchema,
    outputSchema: taskMutationOutputSchema,
    execute: async (_context, rawInput) => {
      const input = taskIdentityInputSchema.parse(rawInput);
      const detail = await taskCenterService.cancelTask(input.kind, input.id);
      return taskMutationOutputSchema.parse({
        kind: detail.kind,
        id: detail.id,
        status: detail.status,
        summary: `Cancelled task: ${detail.title}.`,
      });
    },
  },
  explain_generation_blocker: {
    name: "explain_generation_blocker",
    title: "Explain why chapter generation is blocked",
    description: "Read the novel chapter's latest generation record and explain failure, queueing, or blocking.",
    category: "inspect",
    riskLevel: "low",
    domainAgent: "NovelAgent",
    resourceScopes: ["novel", "chapter", "generation_job", "task"],
    inputSchema: explainGenerationBlockerInputSchema,
    outputSchema: explainGenerationBlockerOutputSchema,
    execute: async (_context, rawInput) => {
      const input = explainGenerationBlockerInputSchema.parse(rawInput);
      if (input.runId?.trim()) {
        const run = await prisma.agentRun.findUnique({
          where: { id: input.runId },
        });
        if (run && run.novelId === input.novelId && run.error?.trim()) {
          return explainGenerationBlockerOutputSchema.parse({
            novelId: input.novelId,
            chapterOrder: input.chapterOrder ?? null,
            blockerType: "agent_run",
            status: run.status,
            failureSummary: run.error.trim(),
            failureDetails: run.error,
            recoveryHint: buildTaskRecoveryHint("agent_run", run.status),
            summary: run.error.trim(),
          });
        }
      }

      const job = await prisma.generationJob.findFirst({
        where: {
          novelId: input.novelId,
          ...(input.chapterOrder != null
            ? {
              startOrder: { lte: input.chapterOrder },
              endOrder: { gte: input.chapterOrder },
            }
            : {}),
        },
        orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
      });

      if (!job) {
        return explainGenerationBlockerOutputSchema.parse({
          novelId: input.novelId,
          chapterOrder: input.chapterOrder ?? null,
          blockerType: "none",
          status: null,
          failureSummary: "No generation-task record was found for this chapter.",
          failureDetails: null,
          recoveryHint: "First confirm whether chapter generation was started, or check the task center for a matching pipeline task.",
          summary: "No generation-task record was found for this chapter.",
        });
      }

      const blockerType = job.status === "failed"
        ? "pipeline_failed"
        : job.status === "running"
          ? "pipeline_running"
          : job.status === "queued"
            ? "pipeline_waiting"
            : "none";
      const failureSummary = job.status === "failed"
        ? normalizeFailureSummary(job.error, "Chapter generation failed without a recorded error.")
        : job.status === "running"
          ? "Chapter generation is still running."
          : job.status === "queued"
            ? "The chapter-generation task is still queued."
            : job.status === "cancelled"
              ? "The chapter-generation task was cancelled."
              : "The latest chapter-generation task has ended.";
      return explainGenerationBlockerOutputSchema.parse({
        novelId: input.novelId,
        chapterOrder: input.chapterOrder ?? null,
        blockerType,
        status: job.status,
        failureSummary,
        failureDetails: job.error ?? null,
        recoveryHint: buildTaskRecoveryHint("novel_pipeline", job.status),
        summary: failureSummary,
      });
    },
  },
};

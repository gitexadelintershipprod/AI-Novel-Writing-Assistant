import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { DirectorContinuationMode } from "@ai-novel/shared/types/novelDirector";
import type { TaskKind, TaskStatus, UnifiedTaskStep } from "@ai-novel/shared/types/task";
import { useNavigate, useSearchParams } from "react-router-dom";
import type { NovelWorkflowMilestone } from "@ai-novel/shared/types/novelWorkflow";
import { getDirectorTaskSnapshot } from "@/api/novelDirector";
import { continueNovelWorkflow } from "@/api/novelWorkflow";
import {
  archiveTask,
  cancelTask,
  getTaskDetail,
  getTaskOverview,
  listRecoveryCandidates,
  listTasks,
  retryTask,
} from "@/api/tasks";
import { queryKeys } from "@/api/queryKeys";
import { Activity, ListChecks, RefreshCw, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { WorkspaceHeader, WorkspaceNextAction } from "@/components/workspace";
import { toast } from "@/components/ui/toast";
import { resolveWorkflowContinuationFeedback } from "@/lib/novelWorkflowContinuation";
import { useDirectorChapterTitleRepair } from "@/hooks/useDirectorChapterTitleRepair";
import { syncKnownTaskCaches } from "@/lib/taskQueryCache";
import { buildTaskNoticeRoute, isChapterTitleDiversitySummary, parseDirectorTaskNotice, resolveChapterTitleWarning } from "@/lib/directorTaskNotice";
import { canCancelDirectorTask, canContinueChapterBatchAutoExecution, getCandidateSelectionLink, requiresCandidateSelection } from "@/lib/novelWorkflowTaskUi";
import { useLLMStore } from "@/store/llmStore";
import TaskCenterFilterPanel from "./components/TaskCenterFilterPanel";
import TaskCenterDetailPanel, { type TaskCenterActionSpec } from "./components/TaskCenterDetailPanel";
import TaskCenterListPanel from "./components/TaskCenterListPanel";
import TaskCenterSummaryCards from "./components/TaskCenterSummaryCards";
import {
  ACTIVE_STATUSES,
  ARCHIVABLE_STATUSES,
  formatCheckpoint,
  formatStatus,
  getTaskListPriority,
  getTaskNoticeSeverity,
  getTaskNoticeTitle,
  getTaskQueueSeverity,
  getTaskQueueTone,
  isTaskFailureQualityReminder,
  isTaskMustHandle,
  isTaskReplanRequired,
  getTimestamp,
  serializeListParams,
  type TaskSortMode,
} from "./taskCenterUtils";

function normalizeTaskMeta(meta: unknown): Record<string, unknown> {
  if (!meta || typeof meta !== "object" || Array.isArray(meta)) {
    return {};
  }
  return meta as Record<string, unknown>;
}

function normalizeTaskSteps(steps: unknown): UnifiedTaskStep[] {
  return Array.isArray(steps) ? (steps as UnifiedTaskStep[]) : [];
}

export default function TaskCenterPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const llm = useLLMStore();
  const [searchParams, setSearchParams] = useSearchParams();
  const [kind, setKind] = useState<TaskKind | "">("");
  const [status, setStatus] = useState<TaskStatus | "">("");
  const [keyword, setKeyword] = useState("");
  const [onlyAnomaly, setOnlyAnomaly] = useState(false);
  const [sortMode, setSortMode] = useState<TaskSortMode>("updated_desc");

  const selectedKind = (searchParams.get("kind") as TaskKind | null) ?? null;
  const selectedId = searchParams.get("id");
  const listParamsKey = serializeListParams({ kind, status, keyword });

  const listQuery = useQuery({
    queryKey: queryKeys.tasks.list(listParamsKey),
    queryFn: () =>
      listTasks({
        kind: kind || undefined,
        status: status || undefined,
        keyword: keyword.trim() || undefined,
        limit: 80,
      }),
    refetchInterval: (query) => {
      const rows = query.state.data?.data?.items ?? [];
      return rows.some((item) => ACTIVE_STATUSES.has(item.status)) ? 4000 : false;
    },
  });

  const overviewQuery = useQuery({
    queryKey: queryKeys.tasks.overview,
    queryFn: getTaskOverview,
    refetchInterval: (query) => {
      const overview = query.state.data?.data;
      if (!overview) return false;
      return overview.runningCount
        + overview.queuedCount
        + overview.waitingApprovalCount
        + overview.recoveryCandidateCount > 0
        ? 4000
        : false;
    },
  });

  const recoveryCandidatesQuery = useQuery({
    queryKey: queryKeys.tasks.recoveryCandidates,
    queryFn: listRecoveryCandidates,
    refetchInterval: (query) => (query.state.data?.data?.items.length ?? 0) > 0 ? 4000 : false,
  });

  const allRows = listQuery.data?.data?.items ?? [];
  const visibleRows = useMemo(
    () =>
      (onlyAnomaly ? allRows.filter(isTaskMustHandle) : allRows)
        .map((item, index) => ({ item, index }))
        .sort((left, right) => {
          if (sortMode !== "default") {
            const leftTime = sortMode.startsWith("heartbeat")
              ? getTimestamp(left.item.heartbeatAt)
              : getTimestamp(left.item.updatedAt);
            const rightTime = sortMode.startsWith("heartbeat")
              ? getTimestamp(right.item.heartbeatAt)
              : getTimestamp(right.item.updatedAt);
            const leftResolved = Number.isNaN(leftTime) ? -Infinity : leftTime;
            const rightResolved = Number.isNaN(rightTime) ? -Infinity : rightTime;
            const timeDiff = sortMode.endsWith("_asc")
              ? leftResolved - rightResolved
              : rightResolved - leftResolved;
            if (timeDiff !== 0) {
              return timeDiff;
            }
          }
          const priorityDiff = getTaskListPriority(left.item) - getTaskListPriority(right.item);
          if (priorityDiff !== 0) {
            return priorityDiff;
          }
          return left.index - right.index;
        })
        .map(({ item }) => item),
    [allRows, onlyAnomaly, sortMode],
  );

  const detailQuery = useQuery({
    queryKey: queryKeys.tasks.detail(selectedKind ?? "none", selectedId ?? "none"),
    queryFn: () => getTaskDetail(selectedKind as TaskKind, selectedId as string),
    enabled: Boolean(selectedKind && selectedId),
    retry: false,
    refetchInterval: (query) => {
      const task = query.state.data?.data;
      return task && ACTIVE_STATUSES.has(task.status) ? 4000 : false;
    },
  });

  useEffect(() => {
    if (!selectedKind || !selectedId) {
      if (visibleRows.length > 0) {
        const fallback = visibleRows[0];
        setSearchParams((prev) => {
          const next = new URLSearchParams(prev);
          next.set("kind", fallback.kind);
          next.set("id", fallback.id);
          return next;
        });
      }
      return;
    }
    const exists = visibleRows.some((item) => item.kind === selectedKind && item.id === selectedId);
    if (!exists && visibleRows.length > 0) {
      const fallback = visibleRows[0];
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        next.set("kind", fallback.kind);
        next.set("id", fallback.id);
        return next;
      });
    }
  }, [selectedKind, selectedId, setSearchParams, visibleRows]);

  const taskOverview = overviewQuery.data?.data;
  const runningCount = taskOverview?.runningCount ?? allRows.filter((item) => item.status === "running").length;
  const queuedCount = taskOverview?.queuedCount ?? allRows.filter((item) => item.status === "queued").length;
  const waitingActionCount = taskOverview?.waitingApprovalCount
    ?? allRows.filter((item) => item.status === "waiting_approval").length;
  const failedTaskCount = taskOverview?.failedCount
    ?? allRows.filter((item) => item.status === "failed" && isTaskMustHandle(item)).length;
  const recoveryCandidateCount = taskOverview?.recoveryCandidateCount
    ?? recoveryCandidatesQuery.data?.data?.items.length
    ?? allRows.filter((item) => item.pendingManualRecovery).length;
  const blockingCount = allRows.filter((item) => getTaskQueueTone(item) === "danger").length;
  const visibleReplanCount = allRows.filter(isTaskReplanRequired).length;
  const mustHandleCount = failedTaskCount + recoveryCandidateCount + visibleReplanCount;
  const qualityReminderCount = allRows.filter((item) => getTaskQueueSeverity(item) === "quality").length;

  const invalidateTaskQueries = async () => {
    await queryClient.invalidateQueries({ queryKey: ["tasks"] });
    if (selectedId) {
      await queryClient.invalidateQueries({ queryKey: queryKeys.tasks.directorRuntime(selectedId) });
      await queryClient.invalidateQueries({ queryKey: queryKeys.tasks.directorTaskSnapshot(selectedId) });
    }
  };

  const retryMutation = useMutation({
    mutationFn: (payload: {
      kind: TaskKind;
      id: string;
      llmOverride?: {
        provider?: typeof llm.provider;
        model?: string;
        temperature?: number;
      };
      resume?: boolean;
    }) => retryTask(payload.kind, payload.id, {
      llmOverride: payload.llmOverride,
      resume: payload.resume,
    }),
    onSuccess: async (response, variables) => {
      const task = response.data;
      syncKnownTaskCaches(queryClient, task);
      await invalidateTaskQueries();
      if (task) {
        setSearchParams((prev) => {
          const next = new URLSearchParams(prev);
          next.set("kind", task.kind);
          next.set("id", task.id);
          return next;
        });
      }
      toast.success(
        variables.llmOverride
          ? `Switched to ${variables.llmOverride.provider ?? "Current provider"} / ${variables.llmOverride.model ?? "current model"} and retry the task`
          : "Task has been requeued",
      );
    },
  });

  const cancelMutation = useMutation({
    mutationFn: (payload: { kind: TaskKind; id: string }) => cancelTask(payload.kind, payload.id),
    onSuccess: async () => {
      await invalidateTaskQueries();
      toast.success("Task cancellation request has been submitted");
    },
  });

  const continueWorkflowMutation = useMutation({
    mutationFn: (payload: { taskId: string; mode?: DirectorContinuationMode }) => continueNovelWorkflow(
      payload.taskId,
      payload.mode ? { continuationMode: payload.mode } : undefined,
    ),
    onSuccess: async (response, variables) => {
      await invalidateTaskQueries();
      const command = response.data;
      const feedback = resolveWorkflowContinuationFeedback(command, {
        mode: variables.mode,
      });
      if (feedback.tone === "error") {
        toast.error(feedback.message);
        return;
      }
      if (variables.mode === "auto_execute_range") {
        toast.success(feedback.message);
        return;
      }
      if (selectedTask?.kind && selectedTask.id) {
        setSearchParams((prev) => {
          const next = new URLSearchParams(prev);
          next.set("kind", selectedTask.kind);
          next.set("id", selectedTask.id);
          return next;
        });
        navigate(selectedTask!.sourceRoute);
        return;
      }
      toast.success(feedback.message);
    },
  });

  const archiveMutation = useMutation({
    mutationFn: (payload: { kind: TaskKind; id: string }) => archiveTask(payload.kind, payload.id),
    onSuccess: async (_, payload) => {
      await queryClient.cancelQueries({
        queryKey: queryKeys.tasks.detail(payload.kind, payload.id),
      });
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        next.delete("kind");
        next.delete("id");
        return next;
      });
      await invalidateTaskQueries();
      toast.success("The task is archived and hidden from the task center");
    },
  });

  const selectedTask = detailQuery.data?.data;
  const selectedTaskMeta = useMemo(
    () => normalizeTaskMeta(selectedTask?.meta),
    [selectedTask?.meta],
  );
  const selectedTaskSteps = useMemo(
    () => normalizeTaskSteps(selectedTask?.steps),
    [selectedTask?.steps],
  );
  const isAutoDirectorTask = Boolean(
    selectedTask
    && selectedTask.kind === "novel_workflow"
    && selectedTaskMeta.lane === "auto_director",
  );
  const canResumeFront10AutoExecution = Boolean(
    selectedTask
    && selectedTask.kind === "novel_workflow"
    && canContinueChapterBatchAutoExecution(selectedTask),
  );
  const needsCandidateSelection = Boolean(
    selectedTask
    && selectedTask.kind === "novel_workflow"
    && requiresCandidateSelection(selectedTask),
  );
  const selectedTaskNotice = useMemo(
    () => parseDirectorTaskNotice(selectedTask ? selectedTaskMeta : null),
    [selectedTask, selectedTaskMeta],
  );
  const selectedTaskNoticeRoute = useMemo(
    () => (selectedTask ? buildTaskNoticeRoute(selectedTask, selectedTaskNotice) : null),
    [selectedTask, selectedTaskNotice],
  );
  const selectedTaskChapterTitleWarning = useMemo(
    () => (isAutoDirectorTask ? resolveChapterTitleWarning(selectedTask ?? null) : null),
    [isAutoDirectorTask, selectedTask],
  );
  const chapterTitleRepairMutation = useDirectorChapterTitleRepair();
  const selectedTaskFailureRepairRoute = selectedTaskChapterTitleWarning?.route ?? null;
  const selectedTaskHasChapterTitleFailure = Boolean(
    selectedTask
    && isChapterTitleDiversitySummary(
      selectedTask.failureSummary ?? selectedTask.lastError ?? null,
    ),
  );
  const selectedTaskHasQualityFailure = Boolean(
    selectedTask && isTaskFailureQualityReminder(selectedTask),
  );
  const directorRuntimeQuery = useQuery({
    queryKey: queryKeys.tasks.directorTaskSnapshot(selectedId ?? "none"),
    queryFn: () => getDirectorTaskSnapshot(selectedId as string),
    enabled: Boolean(selectedId && isAutoDirectorTask),
    retry: false,
    refetchInterval: (query) => {
      const snapshot = query.state.data?.data?.snapshot;
      const projection = snapshot?.projection;
      return (
        (selectedTask && ACTIVE_STATUSES.has(selectedTask.status))
        || snapshot?.dashboardView.mode === "running"
        || snapshot?.dashboardView.mode === "queued"
        || projection?.status === "running"
        || projection?.status === "waiting_approval"
      )
        ? 4000
        : false;
    },
  });
  const selectedDirectorTaskSnapshot = directorRuntimeQuery.data?.data?.snapshot ?? null;
  const selectedDirectorDashboardView = selectedDirectorTaskSnapshot?.dashboardView ?? null;
  const selectedDirectorRuntimeProjection = selectedDirectorTaskSnapshot?.projection ?? null;
  const staleActionProjection = Boolean(
    selectedDirectorDashboardView?.mode === "running"
    && (
      selectedDirectorRuntimeProjection?.requiresUserAction
      || selectedDirectorRuntimeProjection?.status === "blocked"
      || selectedDirectorRuntimeProjection?.status === "waiting_approval"
      || selectedDirectorRuntimeProjection?.status === "failed"
    ),
  );
  const selectedDirectorRuntimeProjectionForDisplay = staleActionProjection
    ? null
    : selectedDirectorRuntimeProjection;
  const runtimeHardBlocked = selectedDirectorDashboardView?.mode === "failed"
    || selectedDirectorDashboardView?.mode === "recovering"
    || (
      selectedDirectorDashboardView?.mode !== "running"
      && selectedDirectorDashboardView?.mode !== "queued"
      && selectedDirectorRuntimeProjection?.status === "blocked"
    );

  const detailActions: TaskCenterActionSpec[] = [];
  if (selectedTask && !isAutoDirectorTask && needsCandidateSelection) {
    detailActions.push({
      key: "candidate-selection",
      title: "Confirm book-level direction",
      label: selectedTask.resumeAction ?? "Continue to confirm the book-level direction",
      consequence: "Opens the candidate confirmation page; only after confirmation will subsequent novel production continue.",
      tone: "warning",
      variant: "default",
      onClick: () => navigate(getCandidateSelectionLink(selectedTask.id)),
    });
  }
  if (selectedTask && !isAutoDirectorTask && canResumeFront10AutoExecution) {
    detailActions.push({
      key: "continue-range",
      title: "Continue current chapter scope",
      label: selectedTask.resumeAction ?? `Continue automatic execution of ${selectedTask.executionScopeLabel ?? "the current chapter range"}`,
      consequence: selectedTask.status === "failed" || selectedTask.status === "cancelled"
        ? "The mission will requeue from the recoverable position and continue the current chapter scope."
        : "The system will submit a continue command and advance the chapter range from the current checkpoint.",
      tone: "info",
      variant: "default",
      disabled: continueWorkflowMutation.isPending || retryMutation.isPending || runtimeHardBlocked,
      onClick: () => {
        if (selectedTask.status === "failed" || selectedTask.status === "cancelled") {
          retryMutation.mutate({ kind: selectedTask.kind, id: selectedTask.id, resume: true });
          return;
        }
        continueWorkflowMutation.mutate({ taskId: selectedTask.id, mode: "auto_execute_range" });
      },
    });
  }
  if (
    selectedTask
    && !isAutoDirectorTask
    && selectedTask.kind === "novel_workflow"
    && !needsCandidateSelection
    && !canResumeFront10AutoExecution
    && (selectedTask.status === "waiting_approval" || selectedTask.status === "queued" || selectedTask.status === "running")
  ) {
    detailActions.push({
      key: "continue-workflow",
      title: selectedTask.status === "waiting_approval" ? "Continue the main flow of the novel" : "View or advance current tasks",
      label: selectedTask.resumeAction ?? (selectedTask.status === "waiting_approval" ? "continue" : "View progress"),
      consequence: selectedTask.status === "waiting_approval"
        ? "The system will submit the continue command based on the current checkpoint."
        : "The system will read and advance the current task and will not switch to other task identities.",
      tone: "info",
      variant: "default",
      disabled: continueWorkflowMutation.isPending || runtimeHardBlocked,
      onClick: () => continueWorkflowMutation.mutate({
        taskId: selectedTask.id,
        mode: selectedTask.status === "waiting_approval" ? "resume" : undefined,
      }),
    });
  }
  if (selectedTask && (selectedTask.status === "failed" || selectedTask.status === "cancelled") && !isAutoDirectorTask) {
    detailActions.push({
      key: "retry",
      title: "Re-execute the task",
      label: "Retry",
      consequence: "Tasks are requeued as per the existing task configuration; saved source content is not deleted by the retry button.",
      tone: "danger",
      variant: "default",
      disabled: retryMutation.isPending,
      onClick: () => retryMutation.mutate({ kind: selectedTask.kind, id: selectedTask.id }),
    });
  }
  if (selectedTask && (
    (selectedTask.kind === "novel_workflow" && canCancelDirectorTask(selectedTask))
    || (selectedTask.kind !== "novel_workflow" && ACTIVE_STATUSES.has(selectedTask.status))
  )) {
    detailActions.push({
      key: "cancel",
      title: "Stop subsequent execution",
      label: "Cancel task",
      consequence: "The system will ask you to stop subsequent steps; the saved product remains on the source page.",
      tone: "warning",
      disabled: cancelMutation.isPending,
      onClick: () => cancelMutation.mutate({ kind: selectedTask.kind, id: selectedTask.id }),
    });
  }
  if (selectedTask && ARCHIVABLE_STATUSES.has(selectedTask.status)) {
    detailActions.push({
      key: "archive",
      title: "Collapse records from task center",
      label: "Archive",
      consequence: "Only the task center records are hidden, and the novel text, plans, or other generated assets are not deleted.",
      disabled: archiveMutation.isPending,
      onClick: () => archiveMutation.mutate({ kind: selectedTask.kind, id: selectedTask.id }),
    });
  }

  const noticeAction = selectedTask && (selectedTaskChapterTitleWarning || selectedTaskNoticeRoute)
    ? {
        label: selectedTaskChapterTitleWarning?.label ?? selectedTaskNotice?.action?.label ?? "Open the current volume and unpack the chapter",
        disabled: chapterTitleRepairMutation.isPending,
        onClick: () => {
          if (selectedTaskChapterTitleWarning) {
            chapterTitleRepairMutation.startRepair(selectedTask);
            return;
          }
          if (selectedTaskNoticeRoute) navigate(selectedTaskNoticeRoute);
        },
      }
    : null;
  const failureAction = selectedTask && (selectedTaskChapterTitleWarning || selectedTaskFailureRepairRoute)
    ? {
        label: selectedTaskChapterTitleWarning?.label ?? "Quickly fix chapter titles",
        disabled: chapterTitleRepairMutation.isPending,
        onClick: () => {
          if (selectedTaskChapterTitleWarning) {
            chapterTitleRepairMutation.startRepair(selectedTask);
            return;
          }
          if (selectedTaskFailureRepairRoute) navigate(selectedTaskFailureRepairRoute);
        },
      }
    : null;

  const listErrorMessage = listQuery.error instanceof Error ? listQuery.error.message : listQuery.isError ? "Failed to read the task list, please try again." : null;
  const overviewErrorMessage = overviewQuery.error instanceof Error
    ? overviewQuery.error.message
    : overviewQuery.isError ? "Failed to read task overview, please try again." : null;
  const detailErrorMessage = detailQuery.error instanceof Error ? detailQuery.error.message : detailQuery.isError ? "Failed to read task details, please try again." : null;
  const recommendedBlockingTask = allRows.find(isTaskMustHandle) ?? null;
  const hasMustHandleTask = mustHandleCount > 0 || blockingCount > 0;
  const recommendedRecoveryCandidate = failedTaskCount === 0
    ? recoveryCandidatesQuery.data?.data?.items[0] ?? null
    : null;
  const recommendedTask = recommendedBlockingTask
    ?? recommendedRecoveryCandidate
    ?? (!hasMustHandleTask
      ? allRows.find((item) => item.status === "waiting_approval")
        ?? allRows.find((item) => getTaskQueueSeverity(item) === "quality")
        ?? allRows.find((item) => item.status === "running")
        ?? allRows[0]
        ?? null
      : null);
  const shouldOpenFailedFilter = hasMustHandleTask && !recommendedBlockingTask && failedTaskCount > 0;
  const shouldRetryRecoveryLookup = hasMustHandleTask
    && !recommendedTask
    && !shouldOpenFailedFilter
    && !recoveryCandidatesQuery.isLoading;
  const hasRecommendedAction = Boolean(recommendedTask || shouldOpenFailedFilter || shouldRetryRecoveryLookup);

  return (
    <div className="space-y-5">
      <WorkspaceHeader
        icon={ListChecks}
        context="Execution history and recovery"
        title="Operation record"
        description='Review the authoring, unpacking, knowledge indexing, and picture tasks, prioritizing records that require your intervention. The real-time generation process can be viewed from the top "AI Live".'
        actions={(
          <Button
            type="button"
            variant="outline"
            onClick={() => void Promise.all([overviewQuery.refetch(), recoveryCandidatesQuery.refetch(), listQuery.refetch()])}
            disabled={overviewQuery.isFetching || recoveryCandidatesQuery.isFetching || listQuery.isFetching}
          >
            <RefreshCw className={overviewQuery.isFetching || recoveryCandidatesQuery.isFetching || listQuery.isFetching ? "h-4 w-4 animate-spin" : "h-4 w-4"} aria-hidden="true" />
            refresh record
          </Button>
        )}
      />

      <WorkspaceNextAction
        className="rounded-2xl border-transparent px-5 py-3 shadow-none"
        icon={overviewErrorMessage ? RefreshCw : hasMustHandleTask ? ShieldAlert : Activity}
        tone={overviewQuery.isLoading ? "info" : overviewErrorMessage ? "danger" : hasMustHandleTask ? "danger" : waitingActionCount > 0 ? "info" : qualityReminderCount > 0 ? "warning" : runningCount + queuedCount > 0 ? "info" : allRows.length > 0 ? "success" : "neutral"}
        title={overviewQuery.isLoading ? "Reading global task status" : overviewErrorMessage ? "Reread task overview" : hasMustHandleTask ? "Check out the tasks that must be done first" : waitingActionCount > 0 ? "Complete pending operation" : qualityReminderCount > 0 ? "View quality alerts" : runningCount + queuedCount > 0 ? "Pay attention to ongoing tasks" : allRows.length > 0 ? "There are currently no blocking tasks" : "Tasks will be summarized here after execution"}
        description={overviewQuery.isLoading
          ? "Summarizing execution, waiting operations, failed and resumable tasks, please wait."
          : overviewErrorMessage
            ? `${overviewErrorMessage} Currently, this will not be used to determine whether there is a blocking task.`
            : hasMustHandleTask
              ? recoveryCandidatesQuery.isLoading && !recommendedBlockingTask && failedTaskCount === 0
                ? "Locating resumable tasks; the corresponding entry will be provided after the reading is completed."
                : "The blocking state may affect the corresponding source process; first check the cause and recovery location before deciding to recover, retry, or replan."
              : waitingActionCount > 0
                ? "Nodes such as candidate confirmation and chapter batch continuation require your operation, but it does not mean that the task has failed."
                : qualityReminderCount > 0
                  ? "These reminders will not prevent the entire book from continuing to execute, and local repairs can be arranged according to the scope of impact."
                  : runningCount + queuedCount > 0
                    ? "The system will continuously refresh the progress, and manual intervention is not required in normal running status."
                    : allRows.length > 0
                      ? "Completed records can be archived as needed, and quality reminders will still remain in the task details."
                      : "After initiating a task from a novel, open book, knowledge base, or image workspace, you can view the status here."}
        consequence={overviewErrorMessage
          ? "Only the task overview is reread, the task will not be resumed, retried or canceled."
          : !overviewQuery.isLoading && hasRecommendedAction
            ? recommendedTask
              ? "Only recommended tasks are targeted and will not be automatically continued, retried or canceled."
              : shouldOpenFailedFilter
                ? "Only failed tasks are filtered and tasks will not be automatically recovered, retried or canceled."
                : "Only recovery candidates are re-read, recovery is not performed automatically."
            : undefined}
        action={overviewErrorMessage ? (
          <Button type="button" size="sm" variant="outline" onClick={() => void overviewQuery.refetch()}>
            reread
          </Button>
        ) : !overviewQuery.isLoading && hasRecommendedAction ? (
          <Button
            type="button"
            size="sm"
            variant={hasMustHandleTask ? "destructive" : "outline"}
            onClick={() => {
              if (!recommendedTask) {
                setKind("");
                setKeyword("");
                if (shouldOpenFailedFilter) {
                  setStatus("failed");
                  setOnlyAnomaly(false);
                } else if (shouldRetryRecoveryLookup) {
                  void recoveryCandidatesQuery.refetch();
                }
                return;
              }
              setSearchParams((prev) => {
                const next = new URLSearchParams(prev);
                next.set("kind", recommendedTask.kind);
                next.set("id", recommendedTask.id);
                return next;
              });
            }}
          >
            {shouldRetryRecoveryLookup ? "Reread recovery tasks" : hasMustHandleTask ? "View tasks to be processed" : "View recommended tasks"}
          </Button>
        ) : undefined}
      />

      <TaskCenterSummaryCards
        activeCount={runningCount + queuedCount}
        waitingActionCount={waitingActionCount}
        mustHandleCount={mustHandleCount}
        qualityReminderCount={qualityReminderCount}
      />

      <TaskCenterFilterPanel
        kind={kind}
        status={status}
        keyword={keyword}
        onlyAnomaly={onlyAnomaly}
        sortMode={sortMode}
        onKindChange={setKind}
        onStatusChange={setStatus}
        onKeywordChange={setKeyword}
        onOnlyAnomalyChange={setOnlyAnomaly}
        onSortModeChange={setSortMode}
      />

      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1.25fr)_minmax(380px,0.75fr)]">
        <TaskCenterListPanel
          tasks={visibleRows}
          selectedKind={selectedKind}
          selectedId={selectedId}
          loading={listQuery.isLoading}
          errorMessage={listErrorMessage}
          onRetry={() => void listQuery.refetch()}
          onSelectTask={(task) => {
            setSearchParams((prev) => {
              const next = new URLSearchParams(prev);
              next.set("kind", task.kind);
              next.set("id", task.id);
              return next;
            });
          }}
        />

        <TaskCenterDetailPanel
          task={selectedTask}
          loading={Boolean(selectedKind && selectedId && detailQuery.isLoading)}
          errorMessage={detailErrorMessage}
          onRetryLoad={() => void detailQuery.refetch()}
          isAutoDirectorTask={isAutoDirectorTask}
          currentModelLabel={`${llm.provider} / ${llm.model}`}
          dashboardView={selectedDirectorDashboardView}
          runtimeProjection={selectedDirectorRuntimeProjectionForDisplay}
          noticeAction={noticeAction}
          noticeSeverity={selectedTask ? getTaskNoticeSeverity(selectedTask) : "normal"}
          noticeTitle={selectedTask ? getTaskNoticeTitle(selectedTask) : "Task reminder"}
          failureAction={failureAction}
          failureIsQualityReminder={selectedTaskHasQualityFailure}
          actions={detailActions}
          steps={selectedTaskSteps}
          milestones={selectedTask?.kind === "novel_workflow" && Array.isArray(selectedTaskMeta.milestones)
            ? selectedTaskMeta.milestones as NovelWorkflowMilestone[]
            : []}
        />
      </div>
    </div>
  );
}

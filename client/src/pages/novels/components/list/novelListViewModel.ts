import type {
  NovelAutoDirectorTaskSummary,
  ProjectProgressStatus,
} from "@ai-novel/shared/types/novel";
import type { NovelListResponse } from "@/api/novel/shared";
import {
  canContinueChapterBatchAutoExecution,
  canContinueDirector,
  canEnterChapterExecution,
  getWorkflowDescription,
  isWorkflowRunningInBackground,
  requiresCandidateSelection,
} from "@/lib/novelWorkflowTaskUi";
import { featureFlags } from "@/config/featureFlags";

export type NovelListItem = NovelListResponse["items"][number];
export type StatusFilter = "all" | "draft" | "published";
export type WritingModeFilter = "all" | "original" | "continuation";
export type NovelListTone = "neutral" | "info" | "success" | "warning" | "danger";

export const DIRECTOR_CREATE_LINK = "/novels/auto-director";
export const SHORT_STORY_CREATE_LINK = featureFlags.creationStudioEnabled
  ? "/create?form=short_story"
  : null;
export const PRIMARY_CREATE_LABEL = "AI automatic director opens book";
export const MANUAL_CREATE_LINK = "/novels/create";
export const NOVEL_LIST_PAGE_SIZE = 24;

export interface NovelListSummaryItem {
  id: string;
  label: string;
  value: number;
  tone: NovelListTone;
}

export interface WorkflowDisplay {
  tone: NovelListTone;
  label: string;
  description: string;
  progress: number;
  currentStage: string;
  currentAction: string;
  lastHealthyStage: string;
  running: boolean;
}

export function getNovelWorkflowTask(novel: NovelListItem): NovelAutoDirectorTaskSummary | null {
  return novel.narrativeForm === "short_story"
    ? novel.latestCreationStudioTask ?? null
    : novel.latestAutoDirectorTask ?? null;
}

export function getNovelWorkspaceHref(novel: NovelListItem): string {
  if (novel.narrativeForm === "short_story") {
    return `/novels/${novel.id}/story`;
  }
  if (novel.creationExperience === "simple") {
    return `/novels/${novel.id}/simple`;
  }
  const task = novel.latestAutoDirectorTask;
  return task?.id
    ? `/novels/${novel.id}/edit?directorTaskId=${encodeURIComponent(task.id)}`
    : `/novels/${novel.id}/edit`;
}

export function filterNovelList(input: {
  novels: NovelListItem[];
  status: StatusFilter;
  writingMode: WritingModeFilter;
}): NovelListItem[] {
  return input.novels.filter((item) => {
    if (input.status !== "all" && item.status !== input.status) {
      return false;
    }
    if (input.writingMode !== "all" && item.writingMode !== input.writingMode) {
      return false;
    }
    return true;
  });
}

export function formatProgressStatus(status?: ProjectProgressStatus | null): string {
  if (status === "completed") {
    return "Completed";
  }
  if (status === "in_progress") {
    return "In Progress";
  }
  if (status === "rework") {
    return "To be reworked";
  }
  if (status === "blocked") {
    return "blocked";
  }
  return "Not Started";
}

export function formatTokenCount(value?: number | null): string {
  const normalized = typeof value === "number" && Number.isFinite(value)
    ? Math.max(0, Math.round(value))
    : 0;
  return new Intl.NumberFormat("zh-CN").format(normalized);
}

export function buildNovelListSummary(novels: NovelListItem[]): NovelListSummaryItem[] {
  const running = novels.filter((novel) => {
    const task = getNovelWorkflowTask(novel);
    return task?.status === "queued" || task?.status === "running";
  }).length;
  const waiting = novels.filter((novel) => getNovelWorkflowTask(novel)?.status === "waiting_approval").length;
  const ready = novels.filter((novel) => (
    novel.narrativeForm === "short_story"
      ? getNovelWorkflowTask(novel)?.status === "succeeded"
      : canEnterChapterExecution(getNovelWorkflowTask(novel))
  )).length;
  const issue = novels.filter((novel) => {
    const status = getNovelWorkflowTask(novel)?.status;
    return status === "failed" || status === "cancelled";
  }).length;

  return [
    { id: "running", label: "Advancing", value: running, tone: running > 0 ? "info" : "neutral" },
    { id: "waiting", label: "To be confirmed", value: waiting, tone: waiting > 0 ? "warning" : "neutral" },
    { id: "ready", label: "Can continue", value: ready, tone: ready > 0 ? "success" : "neutral" },
    { id: "issue", label: "pause/fail", value: issue, tone: issue > 0 ? "danger" : "neutral" },
  ];
}

export function getWorkflowTone(task?: NovelAutoDirectorTaskSummary | null): NovelListTone {
  if (!task) {
    return "neutral";
  }
  if (task.status === "failed" || task.status === "cancelled") {
    return "danger";
  }
  if (task.status === "waiting_approval") {
    return "warning";
  }
  if (canEnterChapterExecution(task)) {
    return "success";
  }
  if (task.status === "running" || task.status === "queued") {
    return "info";
  }
  return "neutral";
}

export function buildWorkflowDisplay(novel: NovelListItem): WorkflowDisplay {
  const task = getNovelWorkflowTask(novel);
  if (novel.narrativeForm === "short_story") {
    return {
      tone: task?.status === "failed" ? "danger" : task?.status === "succeeded" ? "success" : "info",
      label: task?.status === "succeeded" ? "complete short story" : "Short story in progress",
      description: task?.checkpointSummary?.trim()
        || task?.currentItemLabel?.trim()
        || novel.description?.trim()
        || "AI is writing the identified direction into a continuous work.",
      progress: Math.round((task?.progress ?? 0) * 100),
      currentStage: "serial work",
      currentAction: task?.currentItemLabel?.trim() || "",
      lastHealthyStage: "",
      running: task?.status === "queued" || task?.status === "running",
    };
  }
  const description = getWorkflowDescription(task);
  if (!task) {
    return {
      tone: "neutral",
      label: "Data items",
      description: novel.description?.trim() || "There is no automatic director task, you can enter the project to continue improving the materials or chapters.",
      progress: 0,
      currentStage: "Not entering automatic director",
      currentAction: "",
      lastHealthyStage: "",
      running: false,
    };
  }
  const currentAction = task.currentItemLabel?.trim() || "";
  return {
    tone: getWorkflowTone(task),
    label: task.displayStatus?.trim() || task.resumeAction?.trim() || task.nextActionLabel?.trim() || "Auto-Director",
    description: description || "The system remains in the advanced state and can continue to be viewed or restored.",
    progress: Math.round(task.progress * 100),
    currentStage: task.currentStage ?? "Auto-Director",
    currentAction,
    lastHealthyStage: task.lastHealthyStage ?? "",
    running: isWorkflowRunningInBackground(task),
  };
}

export function getPrimaryActionLabel(novel: NovelListItem): string {
  if (novel.narrativeForm === "short_story") {
    return "Open work";
  }
  const task = getNovelWorkflowTask(novel);
  if (canContinueChapterBatchAutoExecution(task)) {
    return task?.resumeAction ?? `Continue automatic execution of ${task?.executionScopeLabel ?? "the current chapter range"}`;
  }
  if (canContinueDirector(task)) {
    return task?.resumeAction ?? "continue directing";
  }
  if (requiresCandidateSelection(task)) {
    return task?.resumeAction ?? "Continue to confirm the direction";
  }
  if (canEnterChapterExecution(task)) {
    return "Enter chapter execution";
  }
  if (task) {
    return "View advancement status";
  }
  return "Edit novel";
}

export function getProjectAssetRows(novel: NovelListItem): Array<{
  label: string;
  value: string;
  tone?: NovelListTone;
}> {
  if (novel.narrativeForm === "short_story") {
    return [
      { label: "form", value: "short story" },
      { label: "target", value: `${(novel.targetWordCount ?? 0).toLocaleString()} characters` },
      { label: "Text", value: getNovelWorkflowTask(novel)?.status === "succeeded" ? "Completed" : "Generating", tone: "info" },
      { label: "Source", value: novel.derivedFromNovelId ? "Derivative works" : "Original" },
    ];
  }
  return [
    { label: "Chapter", value: String(novel._count.chapters) },
    { label: "Character", value: String(novel._count.characters) },
    {
      label: "World",
      value: novel.world?.name ?? "Not bound",
      tone: novel.world?.name ? "neutral" : "warning",
    },
    {
      label: "Resources",
      value: `${novel.resourceReadyScore ?? 0}/100`,
      tone: (novel.resourceReadyScore ?? 0) >= 60 ? "success" : "warning",
    },
  ];
}

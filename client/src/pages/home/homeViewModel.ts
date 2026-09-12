import type { TaskOverviewSummary } from "@ai-novel/shared/types/task";
import type { NovelListResponse } from "@/api/novel/shared";
import {
  canContinueChapterBatchAutoExecution,
  canContinueDirector,
  canEnterChapterExecution,
  getWorkflowDescription,
  isWorkflowActionRequired,
  isWorkflowRunningInBackground,
  requiresCandidateSelection,
} from "@/lib/novelWorkflowTaskUi";
import { featureFlags } from "@/config/featureFlags";

export const HOME_NOVEL_FETCH_LIMIT = 12;
export const HOME_RECENT_LIMIT = 6;
export const DIRECTOR_CREATE_LINK = "/novels/auto-director";
export const SHORT_STORY_CREATE_LINK = featureFlags.creationStudioEnabled
  ? "/create?form=short_story"
  : null;
export const MANUAL_CREATE_LINK = "/novels/create";

export type HomeNovelItem = NovelListResponse["items"][number];
export type HomeTone = "neutral" | "info" | "success" | "warning" | "danger";

export interface HomeMetric {
  id: string;
  title: string;
  value: string | number;
  hint: string;
  tone: HomeTone;
}

export interface HomeAttentionItem {
  id: string;
  title: string;
  description: string;
  tone: HomeTone;
  to?: string;
  actionLabel?: string;
}

export interface HomeAssetHealthItem {
  id: string;
  title: string;
  value: string;
  description: string;
  tone: HomeTone;
}

export interface HomeNextAction {
  kind: "novel" | "starter";
  eyebrow: string;
  title: string;
  description: string;
  reason: string;
  tone: HomeTone;
}

export function getHomeNovelTask(novel: HomeNovelItem) {
  return novel.narrativeForm === "short_story"
    ? novel.latestCreationStudioTask ?? null
    : novel.latestAutoDirectorTask ?? null;
}

export function formatHomeDate(value: string | undefined): string {
  if (!value) {
    return "N/A";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "N/A";
  }
  return date.toLocaleString();
}

export function getNovelPriorityScore(novel: HomeNovelItem): number {
  const task = getHomeNovelTask(novel);
  if (canContinueChapterBatchAutoExecution(task)) {
    return 0;
  }
  if (requiresCandidateSelection(task)) {
    return 1;
  }
  if (canContinueDirector(task)) {
    return 2;
  }
  if (task?.status === "running" || task?.status === "queued") {
    return 3;
  }
  if (canEnterChapterExecution(task)) {
    return 4;
  }
  if (task?.status === "failed" || task?.status === "cancelled") {
    return 5;
  }
  return 6;
}

export function getNovelLeadSummary(novel: HomeNovelItem): string {
  const workflowDescription = getWorkflowDescription(getHomeNovelTask(novel));
  if (workflowDescription) {
    return workflowDescription;
  }
  if (novel.description?.trim()) {
    return novel.description.trim();
  }
  if (novel.world?.name) {
    return `This project is bound to the world setting "${novel.world.name}"; you can keep writing.`;
  }
  return "This project has no description yet; open the editor to keep making progress.";
}

export function selectPrimaryNovel(novels: HomeNovelItem[]): HomeNovelItem | null {
  if (novels.length === 0) {
    return null;
  }
  return novels.reduce<HomeNovelItem | null>((selected, current) => {
    if (!selected) {
      return current;
    }
    const selectedPriority = getNovelPriorityScore(selected);
    const currentPriority = getNovelPriorityScore(current);
    return currentPriority < selectedPriority ? current : selected;
  }, null);
}

export function buildHomeNextAction(primaryNovel: HomeNovelItem | null): HomeNextAction {
  if (!primaryNovel) {
    return {
      kind: "starter",
      eyebrow: "Start your first novel",
      title: "Pick the creation style that fits you",
      description: "Want to finish a full-length novel? Let the Auto-Director prepare the whole-book structure. Want a complete work faster? Start with a short story.",
      reason: "Either way, you only need a rough idea to start; AI will help you shape the creative direction.",
      tone: "info",
    };
  }

  const task = getHomeNovelTask(primaryNovel);
  if (primaryNovel.narrativeForm === "short_story") {
    return {
      kind: "novel",
      eyebrow: task?.status === "succeeded" ? "Finished work" : "Work in progress",
      title: task?.status === "succeeded" ? "Keep refining this work" : "Check the draft progress",
      description: getNovelLeadSummary(primaryNovel),
      reason: task?.status === "succeeded"
        ? "The work is fully generated; you can read, edit, revise, or export it right away."
        : "The short story is being written in the background as one continuous piece; open it to see live progress.",
      tone: task?.status === "succeeded" ? "success" : "info",
    };
  }
  if (canContinueChapterBatchAutoExecution(task)) {
    return {
      kind: "novel",
      eyebrow: "Recommended next step",
      title: "Resume chapter creation",
      description: getNovelLeadSummary(primaryNovel),
      reason: "The chapter batch paused at a recoverable point; resuming it is the fastest way back to producing chapter text.",
      tone: "danger",
    };
  }
  if (requiresCandidateSelection(task)) {
    return {
      kind: "novel",
      eyebrow: "Recommended next step",
      title: "Confirm the full-book direction",
      description: getNovelLeadSummary(primaryNovel),
      reason: "Only after you confirm the direction can the system prepare the world setting, characters, and chapter execution plan.",
      tone: "warning",
    };
  }
  if (canContinueDirector(task)) {
    return {
      kind: "novel",
      eyebrow: "Recommended next step",
      title: "Keep preparing the full novel",
      description: getNovelLeadSummary(primaryNovel),
      reason: "The current stage is waiting for confirmation; continuing moves it to the next round of executable preparation.",
      tone: "warning",
    };
  }
  if (task?.status === "running" || task?.status === "queued") {
    return {
      kind: "novel",
      eyebrow: "AI at work",
      title: "Check creation progress",
      description: getNovelLeadSummary(primaryNovel),
      reason: "The Auto-Director or chapter execution is still working in the background; check the progress and recent stages.",
      tone: "info",
    };
  }
  if (canEnterChapterExecution(task)) {
    return {
      kind: "novel",
      eyebrow: "Recommended next step",
      title: "Start writing chapters",
      description: getNovelLeadSummary(primaryNovel),
      reason: "The planning assets already support chapter production; you can move into drafting and review.",
      tone: "success",
    };
  }
  if (task?.status === "failed" || task?.status === "cancelled") {
    return {
      kind: "novel",
      eyebrow: "Needs attention",
      title: "Handle a creation interruption",
      description: getNovelLeadSummary(primaryNovel),
      reason: "The task has paused or failed records; review the details before resuming, retrying, or adjusting.",
      tone: "danger",
    };
  }
  return {
    kind: "novel",
    eyebrow: "Recommended next step",
    title: "Keep refining the novel",
    description: getNovelLeadSummary(primaryNovel),
    reason: "Nothing more urgent is blocking you; return to the project page to enrich materials or chapters.",
    tone: "neutral",
  };
}

export function buildHomeMetrics(input: {
  novels: HomeNovelItem[];
  taskOverview?: TaskOverviewSummary | null;
}): HomeMetric[] {
  const liveWorkflowCount = input.novels.filter((novel) => (
    isWorkflowRunningInBackground(getHomeNovelTask(novel))
  )).length;
  const actionRequiredCount = input.novels.filter((novel) => (
    isWorkflowActionRequired(getHomeNovelTask(novel))
  )).length;
  const readyForExecutionCount = input.novels.filter((novel) => (
    novel.narrativeForm === "short_story"
      ? getHomeNovelTask(novel)?.status === "succeeded"
      : canEnterChapterExecution(getHomeNovelTask(novel))
  )).length;
  const totalChapterCount = input.novels.reduce((sum, novel) => sum + novel._count.chapters, 0);

  return [
    {
      id: "running",
      title: "In creation",
      value: liveWorkflowCount,
      hint: "Novels or chapters the AI is currently working on.",
      tone: "info",
    },
    {
      id: "attention",
      title: "Awaiting your confirmation",
      value: actionRequiredCount,
      hint: "Projects that continue once you confirm.",
      tone: actionRequiredCount > 0 ? "warning" : "success",
    },
    {
      id: "chapter-ready",
      title: "Ready to write",
      value: readyForExecutionCount,
      hint: "Stories with enough preparation to start drafting.",
      tone: readyForExecutionCount > 0 ? "success" : "neutral",
    },
    {
      id: "chapters",
      title: "Chapters accumulated",
      value: totalChapterCount,
      hint: "Chapters built up across all works.",
      tone: totalChapterCount > 0 ? "info" : "neutral",
    },
  ];
}

export function buildHomeAttentionItems(input: {
  novels: HomeNovelItem[];
  taskOverview?: TaskOverviewSummary | null;
}): HomeAttentionItem[] {
  const actionRequiredCount = input.novels.filter((novel) => (
    isWorkflowActionRequired(getHomeNovelTask(novel))
  )).length;
  const readyForExecutionCount = input.novels.filter((novel) => (
    novel.narrativeForm === "short_story"
      ? getHomeNovelTask(novel)?.status === "succeeded"
      : canEnterChapterExecution(getHomeNovelTask(novel))
  )).length;
  const runningCount = input.taskOverview?.runningCount ?? 0;
  const waitingApprovalCount = input.taskOverview?.waitingApprovalCount ?? 0;
  const recoveryCandidateCount = input.taskOverview?.recoveryCandidateCount ?? 0;
  const failedTaskCount = input.taskOverview?.failedCount ?? 0;
  const items: HomeAttentionItem[] = [];

  if (failedTaskCount > 0 || recoveryCandidateCount > 0) {
    items.push({
      id: "task-recovery",
      title: failedTaskCount > 0 ? `${failedTaskCount} background tasks failed` : `${recoveryCandidateCount} tasks can be recovered`,
      description: "Handling failed or recoverable tasks first keeps later generation from stalling in the same place.",
      tone: failedTaskCount > 0 ? "danger" : "warning",
      to: "/tasks",
      actionLabel: "Open Task Center",
    });
  }
  if (actionRequiredCount > 0 || waitingApprovalCount > 0) {
    items.push({
      id: "workflow-action-required",
      title: `${Math.max(actionRequiredCount, waitingApprovalCount)} creative workflows are waiting for you`,
      description: "These projects may be waiting for a direction decision, a stage continuation, or a recovery decision after a failure.",
      tone: "warning",
      to: "/auto-director/follow-ups",
      actionLabel: "Review follow-ups",
    });
  }
  if (readyForExecutionCount > 0) {
    items.push({
      id: "chapter-ready",
      title: `${readyForExecutionCount} projects are ready for chapter execution`,
      description: "These projects' planning assets already support chapter production; chapters can keep moving forward.",
      tone: "success",
    });
  }
  if (runningCount > 0) {
    items.push({
      id: "running-tasks",
      title: `${runningCount} tasks in progress`,
      description: "Background tasks are still running; come back to the home page later to see results.",
      tone: "info",
      to: "/tasks",
      actionLabel: "View progress",
    });
  }

  return items.slice(0, 4);
}

export function buildHomeAssetHealthItems(novels: HomeNovelItem[]): HomeAssetHealthItem[] {
  const totalNovels = novels.length;
  const worldBoundCount = novels.filter((novel) => Boolean(novel.world?.id || novel.worldId)).length;
  const totalCharacters = novels.reduce((sum, novel) => sum + novel._count.characters, 0);
  const totalChapters = novels.reduce((sum, novel) => sum + novel._count.chapters, 0);
  const resourceScores = novels
    .map((novel) => novel.resourceReadyScore)
    .filter((score): score is number => typeof score === "number" && Number.isFinite(score));
  const averageResourceScore = resourceScores.length > 0
    ? Math.round(resourceScores.reduce((sum, score) => sum + score, 0) / resourceScores.length)
    : null;

  return [
    {
      id: "world",
      title: "World setting coverage",
      value: totalNovels > 0 ? `${worldBoundCount}/${totalNovels}` : "0",
      description: totalNovels > 0
        ? "Projects bound to a world setting keep rules consistent across later chapters more easily."
        : "Once you create a novel, world-setting asset status will appear here.",
      tone: totalNovels === 0 ? "neutral" : worldBoundCount === totalNovels ? "success" : "warning",
    },
    {
      id: "characters",
      title: "Character assets",
      value: String(totalCharacters),
      description: "The character count shows whether a project has the base assets for continuous generation.",
      tone: totalCharacters > 0 ? "success" : "warning",
    },
    {
      id: "chapters",
      title: "Chapter accumulation",
      value: String(totalChapters),
      description: "The more chapters there are, the more summaries, facts, and character timelines need stable write-back.",
      tone: totalChapters > 0 ? "info" : "neutral",
    },
    {
      id: "readiness",
      title: "Resource readiness",
      value: averageResourceScore == null ? "--" : `${averageResourceScore}`,
      description: "An average signal of project material readiness, used to judge how ready you are to start writing.",
      tone: averageResourceScore == null
        ? "neutral"
        : averageResourceScore >= 80
          ? "success"
          : averageResourceScore >= 50
            ? "warning"
            : "danger",
    },
  ];
}

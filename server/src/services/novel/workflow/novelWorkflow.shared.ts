import type {
  NovelWorkflowCheckpoint,
  NovelWorkflowLane,
  NovelWorkflowMilestone,
  NovelWorkflowMilestoneType,
  NovelWorkflowResumeTarget,
  NovelWorkflowStage,
} from "@ai-novel/shared/types/novelWorkflow";
import { getNovelWorkflowLaneDescriptor } from "@ai-novel/shared/types/novelWorkflow";

export const NOVEL_WORKFLOW_STAGE_LABELS: Record<NovelWorkflowStage, string> = {
  project_setup: "Project setup",
  creation_intent: "Understand the creative idea",
  short_story_plan: "Plan a short story",
  short_story_draft: "Generate the full work",
  short_story_review: "Full-text review",
  auto_director: "Auto-Director",
  story_macro: "Story planning",
  world_setup: "World setup",
  character_setup: "Character setup",
  volume_strategy: "Volume strategy / skeleton",
  structured_outline: "Beats / chapters",
  chapter_execution: "Chapter execution",
  quality_repair: "Quality repair",
};

export const NOVEL_WORKFLOW_STAGE_PROGRESS: Record<NovelWorkflowStage, number> = {
  project_setup: 0.08,
  creation_intent: 0.08,
  short_story_plan: 0.2,
  short_story_draft: 0.35,
  short_story_review: 0.9,
  auto_director: 0.15,
  story_macro: 0.26,
  world_setup: 0.34,
  character_setup: 0.42,
  volume_strategy: 0.5,
  structured_outline: 0.68,
  chapter_execution: 0.84,
  quality_repair: 0.94,
};

export const NOVEL_WORKFLOW_STAGE_STEPS = [
  { key: "project_setup", label: "Project setup" },
  { key: "creation_intent", label: "Understand the creative idea" },
  { key: "short_story_plan", label: "Plan a short story" },
  { key: "short_story_draft", label: "Generate the full work" },
  { key: "short_story_review", label: "Full-text review" },
  { key: "auto_director", label: "Auto-Director" },
  { key: "story_macro", label: "Story planning" },
  { key: "world_setup", label: "World setup" },
  { key: "character_setup", label: "Character setup" },
  { key: "volume_strategy", label: "Volume strategy / skeleton" },
  { key: "structured_outline", label: "Beats / chapters" },
  { key: "chapter_execution", label: "Chapter execution" },
  { key: "quality_repair", label: "Quality repair" },
] as const;

export function buildNovelCreateResumeTarget(taskId: string, mode: "director" | null = null): NovelWorkflowResumeTarget {
  return {
    route: "/novels/create",
    taskId,
    mode,
  };
}

export function buildCreationStudioResumeTarget(taskId: string): NovelWorkflowResumeTarget {
  return {
    route: "/create",
    taskId,
    lane: "creation_studio",
  };
}

export function buildShortStoryResumeTarget(novelId: string, taskId?: string | null): NovelWorkflowResumeTarget {
  return {
    route: "/novels/:id/story",
    novelId,
    taskId: taskId ?? null,
    lane: "creation_studio",
  };
}

export function buildNovelEditResumeTarget(params: {
  novelId: string;
  taskId?: string | null;
  lane?: NovelWorkflowResumeTarget["lane"];
  stage: NovelWorkflowResumeTarget["stage"];
  chapterId?: string | null;
  volumeId?: string | null;
}): NovelWorkflowResumeTarget {
  return {
    route: "/novels/:id/edit",
    novelId: params.novelId,
    taskId: params.taskId ?? null,
    lane: params.lane ?? null,
    stage: params.stage,
    chapterId: params.chapterId ?? null,
    volumeId: params.volumeId ?? null,
  };
}

export function resumeTargetToRoute(target: NovelWorkflowResumeTarget | null | undefined): string {
  if (!target) {
    return "/tasks";
  }
  if (target.route === "/create") {
    return target.taskId ? `/create?taskId=${encodeURIComponent(target.taskId)}` : "/create";
  }
  if (target.route === "/novels/create") {
    if (target.mode === "director") {
      const searchParams = new URLSearchParams();
      if (target.taskId) {
        searchParams.set("taskId", target.taskId);
      }
      const query = searchParams.toString();
      return query ? `/novels/auto-director?${query}` : "/novels/auto-director";
    }
    const searchParams = new URLSearchParams();
    if (target.taskId) {
      searchParams.set("workflowTaskId", target.taskId);
    }
    if (target.mode) {
      searchParams.set("mode", target.mode);
    }
    const query = searchParams.toString();
    return query ? `/novels/create?${query}` : "/novels/create";
  }

  if (!target.novelId) {
    return "/tasks";
  }

  if (target.route === "/novels/:id/story") {
    return `/novels/${target.novelId}/story`;
  }

  const searchParams = new URLSearchParams();
  if (target.stage) {
    searchParams.set("stage", target.stage);
  }
  if (target.taskId) {
    if (target.lane === "manual_create") {
      searchParams.set("workspaceTaskId", target.taskId);
    } else {
      searchParams.set("directorTaskId", target.taskId);
    }
  }
  if (target.chapterId) {
    searchParams.set("chapterId", target.chapterId);
  }
  if (target.volumeId) {
    searchParams.set("volumeId", target.volumeId);
  }
  const query = searchParams.toString();
  return query ? `/novels/${target.novelId}/edit?${query}` : `/novels/${target.novelId}/edit`;
}

export function parseMilestones(value: string | null | undefined): NovelWorkflowMilestone[] {
  if (!value?.trim()) {
    return [];
  }
  try {
    const parsed = JSON.parse(value) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed
      .filter((item): item is NovelWorkflowMilestone => (
        Boolean(item)
        && typeof item === "object"
        && typeof (item as NovelWorkflowMilestone).checkpointType === "string"
        && typeof (item as NovelWorkflowMilestone).summary === "string"
        && typeof (item as NovelWorkflowMilestone).createdAt === "string"
      ));
  } catch {
    return [];
  }
}

export function appendMilestone(
  existing: string | null | undefined,
  checkpointType: NovelWorkflowMilestoneType,
  summary: string,
): string {
  const next = [
    ...parseMilestones(existing).filter((item) => item.checkpointType !== checkpointType),
    {
      checkpointType,
      summary,
      createdAt: new Date().toISOString(),
    },
  ];
  return JSON.stringify(next);
}

export function parseResumeTarget(value: string | null | undefined): NovelWorkflowResumeTarget | null {
  if (!value?.trim()) {
    return null;
  }
  try {
    const parsed = JSON.parse(value) as NovelWorkflowResumeTarget;
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

export function stringifyResumeTarget(value: NovelWorkflowResumeTarget | null | undefined): string | null {
  return value ? JSON.stringify(value) : null;
}

export function parseSeedPayload<T>(value: string | null | undefined): T | null {
  if (!value?.trim()) {
    return null;
  }
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

export function mergeSeedPayload<T extends Record<string, unknown>>(
  existing: string | null | undefined,
  patch: Partial<T>,
): string {
  const current = parseSeedPayload<T>(existing) ?? {} as T;
  return JSON.stringify({
    ...current,
    ...patch,
  });
}

export function defaultWorkflowTitle(input: {
  lane: NovelWorkflowLane;
  title?: string | null;
  novelTitle?: string | null;
}): string {
  const novelTitle = input.novelTitle?.trim() || input.title?.trim();
  if (novelTitle) {
    return novelTitle;
  }
  return getNovelWorkflowLaneDescriptor(input.lane).defaultTitle;
}

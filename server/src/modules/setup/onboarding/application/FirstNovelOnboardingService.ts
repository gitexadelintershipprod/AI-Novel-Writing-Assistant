import type {
  FirstNovelMilestone,
  FirstNovelMilestoneKey,
  FirstNovelOnboardingProjection,
} from "@ai-novel/shared/types/onboarding";
import type { NovelWorkflowCheckpoint } from "@ai-novel/shared/types/novelWorkflow";
import type { TaskStatus } from "@ai-novel/shared/types/task";
import { prisma } from "../../../../db/prisma";
import { getQuickSetupStatus } from "./QuickSetupService";

const MILESTONE_DEFINITIONS: Array<Pick<FirstNovelMilestone, "key" | "title" | "description">> = [
  { key: "environment", title: "creative environment", description: "Configure a text model that can complete planning, text and review." },
  { key: "idea_direction", title: "inspiration and direction", description: "Write a sentence of inspiration and choose a set of directions given by the AI." },
  { key: "preparation", title: "Ready to open book", description: "AI prepares story, world, characters, chapter planning and execution resources." },
  { key: "production_choice", title: "production method", description: "Choose AI to continue writing an entire book, or enter a professional workbench." },
  { key: "first_chapter", title: "First chapter completed", description: "After the first chapter is completed, open the main text and start reading." },
];

function milestoneIndex(key: FirstNovelMilestoneKey): number {
  return MILESTONE_DEFINITIONS.findIndex((item) => item.key === key);
}

function buildMilestones(
  current: FirstNovelMilestoneKey,
  attention: boolean,
  summaries: Partial<Record<FirstNovelMilestoneKey, string>>,
): FirstNovelMilestone[] {
  const currentIndex = milestoneIndex(current);
  return MILESTONE_DEFINITIONS.map((item, index) => ({
    ...item,
    status: index < currentIndex
      ? "completed"
      : index === currentIndex
        ? attention ? "attention" : "current"
        : "pending",
    resultSummary: summaries[item.key] ?? null,
  }));
}

export async function getFirstNovelOnboardingProjection(): Promise<FirstNovelOnboardingProjection> {
  const [setup, firstReadableChapter, latestTask, latestNovel] = await Promise.all([
    getQuickSetupStatus(),
    prisma.chapter.findFirst({
      where: {
        content: { not: "" },
        OR: [
          { chapterStatus: "completed" },
          { generationState: { in: ["approved", "published"] } },
        ],
      },
      orderBy: [{ updatedAt: "desc" }, { order: "asc" }],
      select: {
        id: true,
        title: true,
        order: true,
        novelId: true,
        novel: {
          select: {
            id: true,
            title: true,
            creationExperience: true,
          },
        },
      },
    }),
    prisma.novelWorkflowTask.findFirst({
      where: { lane: "auto_director" },
      orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
      select: {
        id: true,
        novelId: true,
        status: true,
        checkpointType: true,
        currentStage: true,
        currentItemLabel: true,
        lastError: true,
        novel: {
          select: {
            id: true,
            title: true,
            creationExperience: true,
          },
        },
      },
    }),
    prisma.novel.findFirst({
      orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
      select: {
        id: true,
        title: true,
        creationExperience: true,
      },
    }),
  ]);

  const task = latestTask ? {
    id: latestTask.id,
    status: latestTask.status as TaskStatus,
    checkpointType: latestTask.checkpointType as NovelWorkflowCheckpoint | null,
    currentStage: latestTask.currentStage,
    currentItemLabel: latestTask.currentItemLabel,
    lastError: latestTask.lastError,
  } : null;
  const novel = latestTask?.novel ?? firstReadableChapter?.novel ?? latestNovel ?? null;
  const isAttention = latestTask?.status === "failed"
    || latestTask?.status === "cancelled"
    || Boolean(latestTask?.lastError);
  const summaries: Partial<Record<FirstNovelMilestoneKey, string>> = {
    ...(setup.readyForCreation ? { environment: `${setup.selectedProvider ?? "model"} · ${setup.selectedModel ?? "available"}` } : {}),
    ...(novel ? { idea_direction: `《${novel.title}》` } : {}),
    ...(latestTask?.novelId ? { preparation: latestTask.currentItemLabel ?? "Open book resources are being prepared" } : {}),
    ...(novel?.creationExperience ? {
      production_choice: novel.creationExperience === "simple" ? "Easy creation" : "Professional creation",
    } : {}),
    ...(firstReadableChapter ? { first_chapter: `《${firstReadableChapter.title}》Readable` } : {}),
  };

  let currentMilestone: FirstNovelMilestoneKey = "environment";
  let headline = "Complete quick setup first";
  let description = "Only one available text model is needed, and the system will automatically prepare task routing for the entire creation chain.";
  let reason = "Automatic directing, text generation and review all require stable model connections.";
  let primaryAction: FirstNovelOnboardingProjection["primaryAction"] = {
    label: "Quick configuration model",
    route: "/help",
    kind: "open_quick_setup",
  };

  if (setup.readyForCreation) {
    currentMilestone = "idea_direction";
    headline = "Start your first novel with a line of inspiration";
    description = "There is no need to write an outline first, AI will sort out two complete sets of directions for you to choose from.";
    reason = "It is more important to first confirm the direction of the entire book that is worth continuing to write than to fill in a large number of professional settings.";
    primaryAction = {
      label: "Let AI take me started",
      route: "/novels/auto-director",
      kind: "navigate",
    };
  }

  if (setup.readyForCreation && latestTask) {
    if (latestTask.checkpointType === "candidate_selection_required" || !latestTask.novelId) {
      primaryAction = {
        label: latestTask.checkpointType === "candidate_selection_required" ? "Choose the direction of the book" : "View direction generation progress",
        route: `/novels/auto-director?taskId=${latestTask.id}`,
        kind: "navigate",
      };
      headline = latestTask.checkpointType === "candidate_selection_required"
        ? "Choose the direction you want to read most"
        : "AI is preparing the direction of the entire book";
      description = latestTask.currentItemLabel ?? "Once the orientation is complete, you just need to choose one of the two options.";
      reason = "This choice will determine the protagonist, the central conflict, and the main reading expectations for the entire book.";
    } else if (latestTask.checkpointType === "production_experience_required") {
      currentMilestone = "production_choice";
      headline = "The book is ready to be opened and the text production method is selected.";
      description = "Simple creation will continue to write the entire book; professional creation will enter the complete editable workbench.";
      reason = "The story, characters and chapter resources are all ready, but the main text has not yet been started.";
      primaryAction = {
        label: "Choose production method",
        route: `/novels/${latestTask.novelId}/edit?directorTaskId=${latestTask.id}`,
        kind: "navigate",
      };
    } else if (
      latestTask.novel?.creationExperience === "simple"
      || latestTask.checkpointType === "chapter_batch_ready"
      || latestTask.currentStage === "chapter_execution"
      || latestTask.currentStage === "quality_repair"
    ) {
      currentMilestone = "first_chapter";
      headline = isAttention ? "Chapter 1 Production Needs Processing" : "AI is completing Chapter 1";
      description = isAttention
        ? latestTask.lastError ?? "Check the reason for the safety pause and proceed after handling it."
        : latestTask.currentItemLabel ?? "Once the text is completed and approved, it will be open for reading.";
      reason = isAttention
        ? "Restoring from the current checkpoint preserves the saved plan and text."
        : "The text being generated will not be displayed in advance to prevent you from reading a version that is not yet stable.";
      primaryAction = {
        label: isAttention ? "View and restore" : "View Chapter Bookshelf",
        route: latestTask.novel?.creationExperience === "simple"
          ? `/novels/${latestTask.novelId}/simple`
          : `/novels/${latestTask.novelId}/edit?directorTaskId=${latestTask.id}`,
        kind: isAttention ? "resume" : "navigate",
      };
    } else {
      currentMilestone = "preparation";
      headline = isAttention ? "Preparations for opening the book need to be processed" : "AI is preparing book resources";
      description = isAttention
        ? latestTask.lastError ?? "View recovery recommendations for the current task."
        : latestTask.currentItemLabel ?? "The system is preparing story, character and chapter planning.";
      reason = isAttention
        ? "Just resume from the current checkpoint, no need to recreate the novel."
        : "These resources will directly drive subsequent chapters and do not require you to review them one by one.";
      primaryAction = {
        label: isAttention ? "View and restore" : "Check preparation progress",
        route: `/novels/${latestTask.novelId}/edit?directorTaskId=${latestTask.id}`,
        kind: isAttention ? "resume" : "navigate",
      };
    }
  } else if (setup.readyForCreation && novel) {
    currentMilestone = "first_chapter";
    headline = "Continue to complete Chapter 1";
    description = "The project can continue to advance and enter the workbench to prepare or generate the first chapter text.";
    reason = "After the first chapter is completed, you have completed the complete link from inspiration to text.";
    primaryAction = {
      label: novel.creationExperience === "simple" ? "Open chapter bookshelf" : "Continue current project",
      route: novel.creationExperience === "simple" ? `/novels/${novel.id}/simple` : `/novels/${novel.id}/edit`,
      kind: "navigate",
    };
  }

  const graduated = Boolean(firstReadableChapter && setup.readyForCreation);
  if (graduated && firstReadableChapter) {
    currentMilestone = "first_chapter";
    headline = "The first chapter can be read";
    description = `《${firstReadableChapter.title}》formed into a readable draft, and the complete process from inspiration to text ran smoothly.`;
    reason = "Next, you can continue to observe the production of the entire book, or enter the workbench to complete subsequent content.";
    primaryAction = {
      label: "Read Chapter 1",
      route: firstReadableChapter.novel.creationExperience === "simple"
        ? `/novels/${firstReadableChapter.novelId}/simple?chapterId=${firstReadableChapter.id}`
        : `/novels/${firstReadableChapter.novelId}/chapters/${firstReadableChapter.id}`,
      kind: "navigate",
    };
  }

  const milestones = buildMilestones(currentMilestone, isAttention && !graduated, summaries);
  if (graduated) {
    milestones.forEach((milestone) => {
      milestone.status = "completed";
    });
  }

  return {
    graduated,
    currentMilestone,
    completedCount: graduated
      ? MILESTONE_DEFINITIONS.length
      : milestones.filter((milestone) => milestone.status === "completed").length,
    totalCount: MILESTONE_DEFINITIONS.length,
    headline,
    description,
    reason,
    primaryAction,
    novel: novel ? {
      id: novel.id,
      title: novel.title,
      creationExperience: novel.creationExperience,
    } : null,
    directorTask: task,
    firstReadableChapter: firstReadableChapter ? {
      id: firstReadableChapter.id,
      title: firstReadableChapter.title,
      order: firstReadableChapter.order,
      novelId: firstReadableChapter.novelId,
    } : null,
    milestones,
    optionalEnhancements: [
      {
        key: "knowledge",
        title: "Knowledge Base",
        description: "Enable it when you need reference materials or long-term settings, and it will not affect the start of creation.",
        route: "/knowledge",
      },
      {
        key: "style",
        title: "writing engine",
        description: "After you have a clear sample of the writing style, you can then extract the writing method. There is no need to wait for this configuration when writing the first chapter.",
        route: "/style-engine",
      },
      {
        key: "image",
        title: "Image capabilities",
        description: "Configure the image model when you need a cover or character image.",
        route: "/settings",
      },
    ],
  };
}

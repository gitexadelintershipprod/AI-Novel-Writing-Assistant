import type { DirectorConfirmRequest } from "@ai-novel/shared/types/novelDirector";
import { getChapterTitleDiversityIssue, isChapterTitleDiversityIssue } from "../../volume/chapterTitleDiversity";
import type { NovelVolumeService } from "../../volume/NovelVolumeService";
import type { NovelWorkflowService } from "../../workflow/NovelWorkflowService";
import {
  buildNovelEditResumeTarget,
  parseSeedPayload,
  parseResumeTarget,
} from "../../workflow/novelWorkflow.shared";
import { getDirectorInputFromSeedPayload, getDirectorLlmOptionsFromSeedPayload, type DirectorWorkflowSeedPayload } from "../runtime/novelDirectorHelpers";
import { buildDirectorSessionState } from "../runtime/novelDirectorHelpers";
import { repairDirectorChapterTitles } from "./novelDirectorChapterTitleRepair";
import { DIRECTOR_PROGRESS } from "../projections/novelDirectorProgress";

function parseResumeTargetLike(value: unknown) {
  if (typeof value === "string") {
    return parseResumeTarget(value);
  }
  if (value && typeof value === "object") {
    return value as NonNullable<ReturnType<typeof parseResumeTarget>>;
  }
  return null;
}

function mergeResumeTargets(
  primary: ReturnType<typeof parseResumeTarget>,
  fallback: ReturnType<typeof parseResumeTarget>,
) {
  if (!primary) {
    return fallback;
  }
  if (!fallback) {
    return primary;
  }
  return {
    ...fallback,
    ...primary,
    stage: primary.stage === "basic" && fallback.stage !== "basic"
      ? fallback.stage
      : primary.stage,
    chapterId: primary.chapterId ?? fallback.chapterId ?? null,
    volumeId: primary.volumeId ?? fallback.volumeId ?? null,
  };
}

export class NovelDirectorChapterTitleRepairRuntime {
  constructor(private readonly deps: {
    workflowService: NovelWorkflowService;
    volumeService: NovelVolumeService;
    buildDirectorSeedPayload: (
      input: DirectorConfirmRequest,
      novelId: string | null,
      extra?: Record<string, unknown>,
    ) => Record<string, unknown>;
    scheduleBackgroundRun: (taskId: string, runner: () => Promise<void>) => void;
  }) {}

  async repairChapterTitles(taskId: string, input?: {
    volumeId?: string | null;
  }): Promise<void> {
    const row = await this.deps.workflowService.getTaskById(taskId);
    if (!row) {
      throw new Error("The current Auto-Director task does not exist.");
    }
    if (row.lane !== "auto_director") {
      throw new Error("Only Auto-Director tasks support AI chapter-title repair.");
    }
    const seedPayload = parseSeedPayload<DirectorWorkflowSeedPayload>(row.seedPayloadJson) ?? {};
    const directorInput = getDirectorInputFromSeedPayload(seedPayload);
    const novelId = row.novelId ?? seedPayload.novelId ?? null;
    if (!directorInput || !novelId) {
      throw new Error("The current Auto-Director task is missing the context needed to resume AI repair.");
    }

    const notice = seedPayload.taskNotice;
    const requestedVolumeId = input?.volumeId?.trim() || null;
    const resumeTarget = mergeResumeTargets(
      parseResumeTarget(row.resumeTargetJson),
      parseResumeTargetLike(seedPayload.resumeTarget),
    );
    const targetVolumeId = requestedVolumeId
      || notice?.action?.volumeId?.trim()
      || resumeTarget?.volumeId?.trim()
      || null;
    const workspace = await this.deps.volumeService.getVolumes(novelId);
    const targetVolume = targetVolumeId
      ? workspace.volumes.find((volume) => volume.id === targetVolumeId)
      : workspace.volumes.find((volume) => getChapterTitleDiversityIssue(volume.chapters.map((chapter) => chapter.title)));
    if (!targetVolume) {
      throw new Error("This task has no duplicate chapter titles that AI can repair directly.");
    }
    const taskHasTitleWarning = notice?.code === "CHAPTER_TITLE_DIVERSITY"
      || isChapterTitleDiversityIssue(row.lastError)
      || Boolean(getChapterTitleDiversityIssue(targetVolume.chapters.map((chapter) => chapter.title)));
    if (!taskHasTitleWarning) {
      throw new Error("The current mission does not have a chapter title reminder that can be directly AI fixed.");
    }

    const boundLlm = getDirectorLlmOptionsFromSeedPayload(seedPayload);
    const repairRequest: DirectorConfirmRequest = {
      ...directorInput,
      provider: boundLlm?.provider ?? directorInput.provider,
      model: boundLlm?.model ?? directorInput.model,
      temperature: typeof boundLlm?.temperature === "number"
        ? boundLlm.temperature
        : directorInput.temperature,
    };
    const directorSession = buildDirectorSessionState({
      runMode: repairRequest.runMode,
      phase: "structured_outline",
      isBackgroundRunning: true,
    });
    const resumeTargetForRepair = buildNovelEditResumeTarget({
      novelId,
      taskId,
      stage: "structured",
      volumeId: targetVolume.id,
    });
    await this.deps.workflowService.bootstrapTask({
      workflowTaskId: taskId,
      novelId,
      lane: "auto_director",
      title: repairRequest.candidate.workingTitle,
      seedPayload: this.deps.buildDirectorSeedPayload(repairRequest, novelId, {
        directorSession,
        resumeTarget: resumeTargetForRepair,
        taskNotice: null,
      }),
    });
    await this.deps.workflowService.markTaskRunning(taskId, {
      stage: "structured_outline",
      itemKey: "chapter_list",
      itemLabel: `AI is repairing Volume ${targetVolume.sortOrder} chapter titles`,
      progress: DIRECTOR_PROGRESS.chapterList,
      clearCheckpoint: true,
    });
    this.deps.scheduleBackgroundRun(taskId, async () => {
      await repairDirectorChapterTitles({
        taskId,
        novelId,
        targetVolumeId: targetVolume.id,
        request: repairRequest,
        volumeService: this.deps.volumeService,
        workflowService: this.deps.workflowService,
        buildDirectorSeedPayload: (request, targetNovelId, extra) => (
          this.deps.buildDirectorSeedPayload(request, targetNovelId, extra)
        ),
      });
    });
  }
}

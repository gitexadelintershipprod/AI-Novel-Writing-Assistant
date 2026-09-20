import type { VolumePlanDocument } from "@ai-novel/shared/types/novel";
import type {
  DirectorConfirmRequest,
} from "@ai-novel/shared/types/novelDirector";
import {
  isDirectorAutoExecutionRunMode,
  isFullBookAutopilotRunMode,
} from "@ai-novel/shared/types/novelDirector";
import type { VolumeGenerationPhaseEvent } from "../../volume/volumeModels";
import { getChapterTitleDiversityIssue } from "../../volume/chapterTitleDiversity";
import { buildNovelEditResumeTarget } from "../../workflow/novelWorkflow.shared";
import { logMemoryUsage } from "../../../../runtime/memoryTelemetry";
import {
  buildDirectorSessionState,
  normalizeDirectorRunMode,
} from "../runtime/novelDirectorHelpers";
import {
  buildChapterDetailBundleLabel,
  buildChapterDetailBundleProgress,
  DIRECTOR_PROGRESS,
  type DirectorProgressItemKey,
} from "../projections/novelDirectorProgress";
import {
  buildDirectorAutoExecutionState,
  countDirectorAutoExecutionChapterRange,
  hasDirectorSyncedChapterExecutionContext,
  normalizeDirectorAutoExecutionPlan,
  resolveDirectorAutoExecutionPlanChapterRange,
} from "../automation/novelDirectorAutoExecution";
import {
  flattenPreparedOutlineChapters,
  resolveStructuredOutlineRecoveryCursor,
  type StructuredOutlineDetailMode,
  type StructuredOutlineRecoveryCursor,
} from "../recovery/novelDirectorStructuredOutlineRecovery";
import { runDirectorTrackedStep } from "../projections/directorProgressTracker";
import type { DirectorPhaseCallbacks, DirectorPhaseDependencies } from "./novelDirectorPhaseTypes";
import { resetDirectorDownstreamChapterState } from "../recovery/novelDirectorDownstreamReset";

function buildChapterOrderRangeLabel(startOrder: number, endOrder: number): string {
  return startOrder === endOrder ? `Chapter ${startOrder}` : `Chapters ${startOrder}–${endOrder}`;
}

function buildFastStartPlanningGuidance(request: DirectorConfirmRequest): string | undefined {
  const preparation = request.startupPreparation;
  if (!preparation || preparation.strategy !== "fast_start") {
    return undefined;
  }
  return [
    "Fast-start mode: the first executable beat only plans the opening route and does not lock later chapters yet.",
    `The first route must cover ${preparation.routeWindow.min}-${preparation.routeWindow.target} chapters and form a causal chain that can enter drafting immediately.`,
    `Before drafting, only the next ${preparation.routeWindow.detailAhead} chapters need full detailing; remaining chapters stay as a brief route.`,
  ].join("\n");
}

function findMissingSelectedChapterOrders(
  selectedOrders: number[],
  range: { startOrder: number; endOrder: number },
): number[] {
  const selected = new Set(selectedOrders);
  const missing: number[] = [];
  for (let order = range.startOrder; order <= range.endOrder; order += 1) {
    if (!selected.has(order)) {
      missing.push(order);
    }
  }
  return missing;
}

async function syncPreparedChapterExecutionContext(input: {
  novelId: string;
  workspace: VolumePlanDocument;
  targetVolumeId: string;
  targetChapterId: string;
  dependencies: DirectorPhaseDependencies;
}): Promise<void> {
  const targetVolume = input.workspace.volumes.find((volume) => volume.id === input.targetVolumeId);
  const targetChapter = targetVolume?.chapters.find((chapter) => chapter.id === input.targetChapterId);
  if (!targetChapter) {
    return;
  }
  if (!targetChapter.taskSheet?.trim() && !targetChapter.sceneCards?.trim()) {
    return;
  }

  await input.dependencies.volumeService.syncVolumeChaptersWithOptions(input.novelId, {
    volumes: input.workspace.volumes,
    preserveContent: true,
    applyDeletes: false,
    executionContractChapterRange: {
      startOrder: targetChapter.chapterOrder,
      endOrder: targetChapter.chapterOrder,
    },
  }, {
    emitEvent: false,
    syncPayoffLedger: false,
  });
}

function buildStructuredOutlinePhaseUpdate(event: VolumeGenerationPhaseEvent): {
  itemKey: DirectorProgressItemKey;
  itemLabel: string;
  progress: number;
} | null {
  if (event.scope === "beat_sheet") {
    return {
      itemKey: "beat_sheet",
      itemLabel: event.label.trim() || (event.phase === "load_context" ? "Preparing beat-sheet context" : "Generating the beat sheet"),
      progress: DIRECTOR_PROGRESS.beatSheet,
    };
  }
  if (event.scope === "chapter_list") {
    return {
      itemKey: "chapter_list",
      itemLabel: event.label.trim() || (event.phase === "load_context" ? "Preparing chapter-split context" : "Generating the chapter list"),
      progress: DIRECTOR_PROGRESS.chapterList,
    };
  }
  if (event.scope === "rebalance") {
    return {
      itemKey: "chapter_list",
      itemLabel: event.label.trim() || "Calibrating the adjacent-volume handoff",
      progress: 0.8,
    };
  }
  return null;
}

function buildStructuredOutlineCursorKey(cursor: StructuredOutlineRecoveryCursor): string {
  return [
    cursor.step,
    cursor.volumeId ?? "",
    cursor.chapterId ?? "",
    cursor.detailMode ?? "",
    cursor.beatKey ?? "",
    cursor.preparedVolumeIds.length,
    cursor.selectedChapters.length,
    cursor.completedChapterCount,
    cursor.totalChapterCount,
    cursor.completedDetailSteps,
    cursor.totalDetailSteps,
  ].join("|");
}

async function persistStructuredOutlineVolumeSnapshot(input: {
  taskId: string;
  novelId: string;
  workspace: VolumePlanDocument;
  itemKey: "beat_sheet" | "chapter_list";
  scope: "beat_sheet" | "chapter_list";
  volumeId?: string | null;
  dependencies: Pick<DirectorPhaseDependencies, "volumeService">;
}): Promise<VolumePlanDocument> {
  return input.dependencies.volumeService.updateVolumesWithOptions(input.novelId, input.workspace, {
    emitEvent: false,
    syncPayoffLedger: false,
    memoryTelemetry: {
      taskId: input.taskId,
      stage: "structured_outline",
      itemKey: input.itemKey,
      scope: input.scope,
      entrypoint: "auto_director",
      volumeId: input.volumeId,
    },
  });
}

export async function runDirectorStructuredOutlinePhase(input: {
  taskId: string;
  novelId: string;
  request: DirectorConfirmRequest;
  baseWorkspace: VolumePlanDocument;
  dependencies: DirectorPhaseDependencies;
  callbacks: DirectorPhaseCallbacks;
}): Promise<void> {
  const { taskId, novelId, request, baseWorkspace, dependencies, callbacks } = input;
  logMemoryUsage({
    event: "start",
    component: "runDirectorStructuredOutlinePhase",
    taskId,
    novelId,
    stage: "structured_outline",
    scope: "structured_outline",
    entrypoint: "auto_director",
    volumeCount: baseWorkspace.volumes.length,
    chapterCount: baseWorkspace.volumes.reduce((sum, volume) => sum + volume.chapters.length, 0),
    beatSheetCount: baseWorkspace.beatSheets.length,
  });
  const firstVolume = baseWorkspace.volumes[0];
  if (!firstVolume) {
    throw new Error("Auto-Director could not generate a usable volume skeleton.");
  }
  const detailPlan = normalizeDirectorAutoExecutionPlan(
    isDirectorAutoExecutionRunMode(normalizeDirectorRunMode(request.runMode))
      ? request.autoExecutionPlan
      : undefined,
  );
  const fastStartGuidance = buildFastStartPlanningGuidance(request);
  const sortedVolumes = baseWorkspace.volumes
    .slice()
    .sort((left, right) => left.sortOrder - right.sortOrder);
  if (detailPlan.mode === "volume" && (detailPlan.volumeOrder ?? 1) > sortedVolumes.length) {
    throw new Error(`The current volume plan only has ${sortedVolumes.length} volumes, so Volume ${detailPlan.volumeOrder} cannot be auto-run yet.`);
  }

  const directorSession = buildDirectorSessionState({
    runMode: request.runMode,
    phase: "structured_outline",
    isBackgroundRunning: true,
  });
  const initialRecoveryCursor = resolveStructuredOutlineRecoveryCursor({
    workspace: baseWorkspace,
    plan: detailPlan,
    allowPartialChapterListReady: isDirectorAutoExecutionRunMode(normalizeDirectorRunMode(request.runMode)),
  });
  const runningResumeTarget = buildNovelEditResumeTarget({
    novelId,
    taskId,
    stage: "structured",
    volumeId: initialRecoveryCursor.volumeId ?? firstVolume.id,
    chapterId: initialRecoveryCursor.chapterId,
  });
  await dependencies.workflowService.bootstrapTask({
    workflowTaskId: taskId,
    novelId,
    lane: "auto_director",
    title: request.candidate.workingTitle,
    seedPayload: callbacks.buildDirectorSeedPayload(request, novelId, {
      directorSession,
      resumeTarget: runningResumeTarget,
    }),
  });

  let workspace = baseWorkspace;
  let previousCursorKey: string | null = null;
  while (true) {
    const recoveryCursor = resolveStructuredOutlineRecoveryCursor({
      workspace,
      plan: detailPlan,
      allowPartialChapterListReady: isDirectorAutoExecutionRunMode(normalizeDirectorRunMode(request.runMode)),
    });
    const cursorKey = buildStructuredOutlineCursorKey(recoveryCursor);
    if (cursorKey === previousCursorKey) {
      throw new Error("Auto-Director structured-outline recovery did not advance. Check the chapter-plan result and retry.");
    }
    previousCursorKey = cursorKey;

    if (recoveryCursor.step === "beat_sheet") {
      const targetVolume = workspace.volumes.find((volume) => volume.id === recoveryCursor.volumeId);
      if (!targetVolume) {
        throw new Error("Auto-Director recovery is missing the target volume waiting for a beat sheet.");
      }
      workspace = await runDirectorTrackedStep({
        taskId,
        stage: "structured_outline",
        itemKey: "beat_sheet",
        itemLabel: `Generating Volume ${targetVolume.sortOrder} beat sheet`,
        progress: DIRECTOR_PROGRESS.beatSheet,
        volumeId: targetVolume.id,
        callbacks,
        run: async ({ updateStatus, signal }) => dependencies.volumeService.generateVolumes(novelId, {
          provider: request.provider,
          model: request.model,
          temperature: request.temperature,
          scope: "beat_sheet",
          guidance: fastStartGuidance,
          targetVolumeId: targetVolume.id,
          draftWorkspace: workspace,
          taskId,
          entrypoint: "auto_director",
          signal,
          onPhaseStart: async (event) => {
            const update = buildStructuredOutlinePhaseUpdate(event);
            if (!update) {
              return;
            }
            await updateStatus(update);
          },
        }),
      });
      workspace = await persistStructuredOutlineVolumeSnapshot({
        taskId,
        novelId,
        workspace,
        itemKey: "beat_sheet",
        scope: "beat_sheet",
        volumeId: targetVolume.id,
        dependencies,
      });
      continue;
    }

    if (recoveryCursor.step === "chapter_list") {
      const targetVolume = workspace.volumes.find((volume) => volume.id === recoveryCursor.volumeId);
      if (!targetVolume) {
        throw new Error("Auto-Director recovery is missing the target volume waiting for chapter split.");
      }
      if (!recoveryCursor.beatKey) {
        throw new Error("Auto-Director recovery is missing the target beat waiting for chapter generation.");
      }
      const targetBeatKey = recoveryCursor.beatKey;
      workspace = await runDirectorTrackedStep({
        taskId,
        stage: "structured_outline",
        itemKey: "chapter_list",
        itemLabel: `Generating Volume ${targetVolume.sortOrder} chapter list`,
        progress: DIRECTOR_PROGRESS.chapterList,
        volumeId: targetVolume.id,
        callbacks,
        run: async ({ updateStatus, signal }) => dependencies.volumeService.generateVolumes(novelId, {
          provider: request.provider,
          model: request.model,
          temperature: request.temperature,
          scope: "chapter_list",
          guidance: fastStartGuidance,
          targetVolumeId: targetVolume.id,
          generationMode: "single_beat",
          targetBeatKey,
          draftWorkspace: workspace,
          taskId,
          entrypoint: "auto_director",
          signal,
          persistIntermediateDocuments: true,
          onPhaseStart: async (event) => {
            const update = buildStructuredOutlinePhaseUpdate(event);
            if (!update) {
              return;
            }
            await updateStatus(update);
          },
          onIntermediateDocument: async (event) => {
            workspace = event.document;
          },
        }),
      });
      const preparedVolume = workspace.volumes.find((item) => item.id === targetVolume.id);
      const titleDiversityIssue = preparedVolume
        ? getChapterTitleDiversityIssue(preparedVolume.chapters.map((chapter) => chapter.title))
        : null;
      if (titleDiversityIssue) {
        throw new Error(titleDiversityIssue);
      }
      workspace = await persistStructuredOutlineVolumeSnapshot({
        taskId,
        novelId,
        workspace,
        itemKey: "chapter_list",
        scope: "chapter_list",
        volumeId: targetVolume.id,
        dependencies,
      });
      await dependencies.workflowService.markTaskRunning(taskId, {
        stage: "structured_outline",
        itemKey: "chapter_list",
        itemLabel: `Volume ${targetVolume.sortOrder} chapter list generated`,
        progress: DIRECTOR_PROGRESS.chapterList,
        volumeId: targetVolume.id,
      });
      continue;
    }

    if (recoveryCursor.step === "chapter_detail_bundle") {
      // Lazy planning (JIT): skip pre-generating the task sheet during full-book auto-execution.
      // Generate it just before execution instead (see ChapterPlanJITService).
      if (isFullBookAutopilotRunMode(request.runMode)) {
        break;
      }

      const targetDetailMode = recoveryCursor.detailMode as StructuredOutlineDetailMode | null;
      if (
        !recoveryCursor.chapterId
        || !recoveryCursor.volumeId
        || !targetDetailMode
        || recoveryCursor.nextChapterIndex == null
      ) {
        throw new Error("Auto-Director recovery is missing the cursor needed for chapter details.");
      }
      const targetVolumeId = recoveryCursor.volumeId;
      const targetChapterId = recoveryCursor.chapterId;
      const targetChapterIndex = recoveryCursor.nextChapterIndex;
      workspace = await runDirectorTrackedStep({
        taskId,
        stage: "structured_outline",
        itemKey: "chapter_detail_bundle",
        itemLabel: buildChapterDetailBundleLabel(
          targetChapterIndex + 1,
          recoveryCursor.totalChapterCount,
          targetDetailMode,
        ),
        progress: buildChapterDetailBundleProgress(
          recoveryCursor.completedDetailSteps,
          recoveryCursor.totalDetailSteps,
        ),
        chapterId: targetChapterId,
        volumeId: targetVolumeId,
        callbacks,
        run: async ({ signal }) => dependencies.volumeService.generateVolumes(novelId, {
          provider: request.provider,
          model: request.model,
          temperature: request.temperature,
          scope: "chapter_detail",
          targetVolumeId,
          targetChapterId,
          detailMode: targetDetailMode,
          chapterTaskSheetQualityMode: isFullBookAutopilotRunMode(request.runMode)
            ? "full_book_autopilot"
            : "ai_copilot",
          draftWorkspace: workspace,
          taskId,
          entrypoint: "auto_director",
          signal,
        }),
      });
      workspace = await dependencies.volumeService.updateVolumesWithOptions(novelId, workspace, {
        volumeUpdateReason: "chapter_execution_contract_refined",
        syncPayoffLedger: false,
        memoryTelemetry: {
          taskId,
          stage: "structured_outline",
          itemKey: "chapter_detail_bundle",
          scope: "chapter_detail",
          entrypoint: "auto_director",
          volumeId: recoveryCursor.volumeId,
          chapterId: recoveryCursor.chapterId,
        },
      });
      await syncPreparedChapterExecutionContext({
        novelId,
        workspace,
        targetVolumeId,
        targetChapterId,
        dependencies,
      });
      continue;
    }

    if (recoveryCursor.step === "chapter_sync" || recoveryCursor.step === "completed") {
      break;
    }
  }

  const preparedVolumeIds = resolveStructuredOutlineRecoveryCursor({
    workspace,
    plan: detailPlan,
    allowPartialChapterListReady: isDirectorAutoExecutionRunMode(normalizeDirectorRunMode(request.runMode)),
  }).preparedVolumeIds;
  const maxPreparedChapterOrder = Math.max(
    0,
    ...flattenPreparedOutlineChapters(workspace).map((chapter) => chapter.chapterOrder),
  );
  const targetChapterRange = resolveDirectorAutoExecutionPlanChapterRange(detailPlan);
  const allowIncrementalExecutionWindow = isDirectorAutoExecutionRunMode(normalizeDirectorRunMode(request.runMode));
  if (targetChapterRange && maxPreparedChapterOrder < targetChapterRange.endOrder && !allowIncrementalExecutionWindow) {
    throw new Error(
      `Chapter planning currently only covers through Chapter ${maxPreparedChapterOrder}, so ${buildChapterOrderRangeLabel(targetChapterRange.startOrder, targetChapterRange.endOrder)} cannot be auto-run yet.`,
    );
  }

  await callbacks.markDirectorTaskRunning(
    taskId,
    "structured_outline",
    "chapter_sync",
    "Syncing prepared chapters into the execution area",
    DIRECTOR_PROGRESS.chapterSync,
  );
  logMemoryUsage({
    event: "before_sync_write",
    component: "runDirectorStructuredOutlinePhase",
    taskId,
    novelId,
    stage: "structured_outline",
    itemKey: "chapter_sync",
    scope: "structured_outline",
    entrypoint: "auto_director",
    volumeCount: workspace.volumes.length,
    chapterCount: workspace.volumes.reduce((sum, volume) => sum + volume.chapters.length, 0),
    beatSheetCount: workspace.beatSheets.length,
  });
  const persistedOutlineWorkspace = await dependencies.volumeService.updateVolumesWithOptions(novelId, workspace, {
    volumeUpdateReason: "chapter_execution_contract_refined",
    syncPayoffLedger: false,
    memoryTelemetry: {
      taskId,
      stage: "structured_outline",
      itemKey: "chapter_sync",
      scope: "structured_outline",
      entrypoint: "auto_director",
    },
  });
  await dependencies.volumeService.syncVolumeChaptersWithOptions(novelId, {
    volumes: persistedOutlineWorkspace.volumes,
    // Structured outline sync refreshes execution contracts; generated prose stays protected.
    preserveContent: true,
    applyDeletes: false,
    executionContractChapterRange: targetChapterRange ?? undefined,
  }, {
    emitEvent: false,
    syncPayoffLedger: false,
  });
  const syncCursor = resolveStructuredOutlineRecoveryCursor({
    workspace: persistedOutlineWorkspace,
    plan: detailPlan,
    allowPartialChapterListReady: allowIncrementalExecutionWindow,
  });
  const selectedChapters = syncCursor.selectedChapters;
  if (selectedChapters.length === 0) {
    throw new Error("Auto-Director could not prepare an executable chapter range.");
  }
  const selectedChapterOrders = selectedChapters.map((chapter) => chapter.chapterOrder).sort((left, right) => left - right);
  if (targetChapterRange && !allowIncrementalExecutionWindow) {
    const missingOrders = findMissingSelectedChapterOrders(selectedChapterOrders, targetChapterRange);
    if (missingOrders.length > 0) {
      throw new Error(
        `The prepared chapter plan is missing Chapter ${missingOrders.slice(0, 5).join(", ")}, so ${buildChapterOrderRangeLabel(targetChapterRange.startOrder, targetChapterRange.endOrder)} cannot be auto-run yet.`,
      );
    }
  }
  const autoExecutionScopeLabel = syncCursor.scopeLabel;
  const downstreamResetRange = {
    startOrder: selectedChapterOrders[0] ?? 1,
    endOrder: selectedChapterOrders[selectedChapterOrders.length - 1] ?? selectedChapterOrders[0] ?? 1,
  };
  await resetDirectorDownstreamChapterState(novelId, downstreamResetRange);

  await callbacks.markDirectorTaskRunning(
    taskId,
    "structured_outline",
    "chapter_detail_bundle",
    `${autoExecutionScopeLabel} detailing is done; syncing chapter execution resources`,
    DIRECTOR_PROGRESS.chapterDetailDone,
    {
      chapterId: selectedChapters[0]?.id ?? null,
      volumeId: selectedChapters[0]?.volumeId ?? null,
    },
  );
  const persistedChapters = await dependencies.novelContextService.listChapters(novelId);
  if (persistedChapters.length === 0) {
    throw new Error("Auto-Director generated the chapter split, but chapter resources did not sync into the execution area.");
  }
  const persistedChapterByOrder = new Map(persistedChapters.map((chapter) => [chapter.order, chapter] as const));
  // Lazy planning (JIT): a missing pre-generated task sheet is expected, so skip the execution-context completeness check.
  // Non-autopilot paths still check completeness so manual execution has a full task sheet.
  if (!isFullBookAutopilotRunMode(request.runMode)) {
    const missingExecutionContextOrders = selectedChapterOrders.filter((order) => {
      const chapter = persistedChapterByOrder.get(order);
      return !chapter || !hasDirectorSyncedChapterExecutionContext(chapter);
    });
    if (missingExecutionContextOrders.length > 0) {
      throw new Error(
        `${autoExecutionScopeLabel} still has Chapter ${missingExecutionContextOrders.slice(0, 5).join(", ")} missing a synced chapter execution context, so chapter execution cannot start. Fill in the basic chapter information first.`,
      );
    }
  }

  await dependencies.novelContextService.updateNovel(novelId, {
    projectStatus: "in_progress",
    storylineStatus: "in_progress",
    outlineStatus: "in_progress",
  });

  const autoExecutionState = buildDirectorAutoExecutionState({
    range: {
      startOrder: selectedChapterOrders[0] ?? 1,
      endOrder: selectedChapterOrders[selectedChapterOrders.length - 1] ?? selectedChapterOrders[0] ?? 1,
      totalChapterCount: targetChapterRange
        ? countDirectorAutoExecutionChapterRange(targetChapterRange)
        : selectedChapters.length,
      firstChapterId: selectedChapters[0]?.id ?? null,
    },
    chapters: persistedChapters.map((chapter) => ({
      id: chapter.id,
      order: chapter.order,
      content: chapter.content ?? null,
      conflictLevel: chapter.conflictLevel ?? null,
      revealLevel: chapter.revealLevel ?? null,
      targetWordCount: chapter.targetWordCount ?? null,
      mustAvoid: chapter.mustAvoid ?? null,
      taskSheet: chapter.taskSheet ?? null,
      sceneCards: chapter.sceneCards ?? null,
      generationState: chapter.generationState ?? null,
      chapterStatus: chapter.chapterStatus ?? null,
    })),
    plan: detailPlan,
    scopeLabel: autoExecutionScopeLabel,
    volumeTitle: detailPlan.mode === "volume" ? selectedChapters[0]?.volumeTitle ?? null : null,
    preparedVolumeIds,
    beatChapterListReady: syncCursor.beatChapterListReady,
    volumeChapterListComplete: syncCursor.volumeChapterListComplete,
  });

  const pausedSession = buildDirectorSessionState({
    runMode: request.runMode,
    phase: "chapter_execution",
    isBackgroundRunning: false,
  });
  const chapterResumeTarget = buildNovelEditResumeTarget({
    novelId,
    taskId,
    stage: "chapter",
    volumeId: selectedChapters[0]?.volumeId ?? firstVolume.id,
    chapterId: selectedChapters[0]?.id ?? null,
  });
  await dependencies.workflowService.recordCheckpoint(taskId, {
    stage: "chapter_execution",
    checkpointType: "production_experience_required",
    checkpointSummary: `${request.candidate.workingTitle.trim() || request.title?.trim() || "Current project"} has finished pre-draft setup. Choose a writing interface.`,
    itemLabel: `${autoExecutionScopeLabel} is ready to write; waiting to choose a writing interface`,
    volumeId: selectedChapters[0]?.volumeId ?? firstVolume.id,
    chapterId: selectedChapters[0]?.id ?? null,
    progress: DIRECTOR_PROGRESS.chapterBatchReady,
    seedPayload: callbacks.buildDirectorSeedPayload(request, novelId, {
      directorSession: pausedSession,
      resumeTarget: chapterResumeTarget,
      autoExecution: autoExecutionState,
      startupPreparation: request.startupPreparation,
    }),
  });
  logMemoryUsage({
    event: "done",
    component: "runDirectorStructuredOutlinePhase",
    taskId,
    novelId,
    stage: "structured_outline",
    itemKey: "production_experience_required",
    scope: autoExecutionScopeLabel,
    entrypoint: "auto_director",
    volumeCount: persistedOutlineWorkspace.volumes.length,
    chapterCount: persistedOutlineWorkspace.volumes.reduce((sum, volume) => sum + volume.chapters.length, 0),
    beatSheetCount: persistedOutlineWorkspace.beatSheets.length,
  });
}

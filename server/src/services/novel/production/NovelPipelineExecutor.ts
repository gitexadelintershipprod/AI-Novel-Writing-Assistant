import type { Prisma } from "@prisma/client";
import { prisma } from "../../../db/prisma";
import { novelEventBus } from "../../../events";
import { runWithLlmUsageTracking } from "../../../llm/usageTracking";
import { ChapterPlanJITService } from "../planning/ChapterPlanJITService";
import { buildDirectorCompletionProfile } from "@ai-novel/shared/types/directorCompletion";
import { ChapterRouteWindowService } from "../planning/ChapterRouteWindowService";
import { NovelVolumeService } from "../volume/NovelVolumeService";
import { ChapterRuntimeCoordinator } from "../runtime/ChapterRuntimeCoordinator";
import { isChapterEmptyContentError } from "../runtime/chapterEmptyContentError";
import { ChapterContentPersistenceError } from "../runtime/lifecycle";
import {
  logPipelineError,
  logPipelineInfo,
  logPipelineWarn,
  type PipelinePayload,
  type PipelineRunOptions,
} from "../novelCoreShared";
import { plannerService } from "../../planner/PlannerService";
import { applyChapterQualityClosure } from "./qualityClosure/ChapterQualityClosure";
import {
  loadDirectorIssueTaskContext,
} from "../director/issues";
import { reportPipelineIssue } from "./issueGovernance/PipelineIssueGovernance";
import {
  buildPipelineCurrentItemLabel,
  buildPipelineStageProgress,
  parsePipelinePayload as parsePipelineJobPayload,
  stringifyPipelinePayload as stringifyPipelineJobPayload,
  type PipelineActiveStage,
} from "../pipelineJobState";

const PIPELINE_HEARTBEAT_INTERVAL_MS = 15000;
const TERMINAL_CONTINUE_QUALITY_LOOP_RISK_FLAG_FRAGMENT = '"terminalAction":"defer_and_continue"';

function clampPipelineMaxRetries(value: number | null | undefined): number {
  return Math.max(0, Math.min(value ?? 1, 1));
}

function buildEmptyChapterDetail(chapter: { order: number; title: string }): string {
  return `Chapter ${chapter.order} "${chapter.title}" text build failed: the model repeatedly returned no savable text, so writing is paused.`;
}

function buildSkipCompletedChapterWhere(): Prisma.ChapterWhereInput {
  return {
    NOT: {
      AND: [
        { content: { not: null } },
        { content: { not: "" } },
        {
          OR: [
            { generationState: { in: ["approved", "published"] } },
            { chapterStatus: "completed" },
            {
              AND: [
                { riskFlags: { not: null } },
                { riskFlags: { contains: TERMINAL_CONTINUE_QUALITY_LOOP_RISK_FLAG_FRAGMENT } },
              ],
            },
          ],
        },
      ],
    },
  };
}

export class NovelPipelineExecutor {
  constructor(private readonly chapterRuntimeCoordinator = new ChapterRuntimeCoordinator()) {}

  private async ensurePipelineNotCancelled(jobId: string): Promise<void> {
    const job = await prisma.generationJob.findUnique({
      where: { id: jobId },
      select: { status: true, cancelRequestedAt: true },
    });
    if (!job || job.status === "cancelled" || job.cancelRequestedAt) {
      throw new Error("PIPELINE_CANCELLED");
    }
  }

  private async updateJobSafe(jobId: string, data: {
    status?: "queued" | "running" | "succeeded" | "failed" | "cancelled";
    progress?: number;
    completedCount?: number;
    totalCount?: number;
    endOrder?: number;
    retryCount?: number;
    pendingManualRecovery?: boolean;
    heartbeatAt?: Date | null;
    currentStage?: string | null;
    currentItemKey?: string | null;
    currentItemLabel?: string | null;
    cancelRequestedAt?: Date | null;
    error?: string | null;
    startedAt?: Date | null;
    finishedAt?: Date | null;
    payload?: string | null;
  }) {
    try {
      await prisma.generationJob.update({ where: { id: jobId }, data });
    } catch {
      // A failed background job-status update must not destabilize the main service.
    }
  }

  private stringifyPipelinePayload(input: PipelinePayload) {
    return stringifyPipelineJobPayload(input);
  }

  private parsePipelinePayload(payload: string | null | undefined) {
    return parsePipelineJobPayload(payload);
  }

  async execute(jobId: string, novelId: string, options: PipelineRunOptions) {
    const maxRetries = clampPipelineMaxRetries(options.maxRetries);
    const qualityThreshold = options.qualityThreshold ?? 75;
    const existingJob = await prisma.generationJob.findUnique({
      where: { id: jobId },
      select: {
        startedAt: true,
        completedCount: true,
        totalCount: true,
        retryCount: true,
        payload: true,
      },
    });
    const persistedPayload = this.parsePipelinePayload(existingJob?.payload);
    const runtimePayload: PipelinePayload = {
      provider: persistedPayload.provider ?? options.provider ?? "deepseek",
      model: persistedPayload.model ?? options.model ?? "",
      temperature: persistedPayload.temperature ?? options.temperature ?? 0.8,
      controlPolicy: persistedPayload.controlPolicy ?? options.controlPolicy,
      workflowTaskId: persistedPayload.workflowTaskId ?? options.workflowTaskId,
      taskStyleProfileId: persistedPayload.taskStyleProfileId ?? options.taskStyleProfileId,
      maxRetries: clampPipelineMaxRetries(persistedPayload.maxRetries ?? options.maxRetries),
      runMode: persistedPayload.runMode ?? options.runMode ?? "fast",
      autoReview: persistedPayload.autoReview ?? options.autoReview ?? true,
      autoRepair: persistedPayload.autoRepair ?? options.autoRepair ?? true,
      skipCompleted: persistedPayload.skipCompleted ?? options.skipCompleted ?? true,
      qualityThreshold: persistedPayload.qualityThreshold ?? options.qualityThreshold,
      repairMode: persistedPayload.repairMode ?? options.repairMode ?? "light_repair",
      artifactSyncMode: persistedPayload.artifactSyncMode ?? options.artifactSyncMode ?? "adaptive",
    };
    const directorTelemetryTask = runtimePayload.workflowTaskId
      ? await prisma.novelWorkflowTask.findUnique({
        where: { id: runtimePayload.workflowTaskId },
        select: {
          lane: true,
          directorRun: {
            select: { id: true },
          },
        },
      }).catch(() => null)
      : null;
    const shouldRecordDirectorTelemetry = directorTelemetryTask?.lane === "auto_director";
    const issueGovernance = shouldRecordDirectorTelemetry
      ? await loadDirectorIssueTaskContext(runtimePayload.workflowTaskId)
      : null;
    let totalRetryCount = Math.max(existingJob?.retryCount ?? 0, 0);
    const qualityAlertDetails = [...(persistedPayload.qualityAlertDetails ?? [])];
    const replanAlertDetails = [...(persistedPayload.replanAlertDetails ?? [])];
    const recoverableRepairDetails = [...(persistedPayload.recoverableRepairDetails ?? [])];

    try {
      await runWithLlmUsageTracking({
        generationJobId: jobId,
        workflowTaskId: runtimePayload.workflowTaskId,
        directorTelemetry: shouldRecordDirectorTelemetry,
        novelId: shouldRecordDirectorTelemetry ? novelId : null,
        directorRunId: shouldRecordDirectorTelemetry
          ? directorTelemetryTask?.directorRun?.id ?? runtimePayload.workflowTaskId ?? null
          : null,
      }, async () => {
        await this.updateJobSafe(jobId, {
          status: "running",
          pendingManualRecovery: false,
          startedAt: existingJob?.startedAt ?? new Date(),
          heartbeatAt: new Date(),
          currentStage: "generating_chapters",
        });
        logPipelineInfo("Task execution started", {
          jobId,
          novelId,
          range: `${options.startOrder}-${options.endOrder}`,
          maxRetries,
        });

        const [novel, chapters] = await Promise.all([
          prisma.novel.findUnique({ where: { id: novelId } }),
          prisma.chapter.findMany({
            where: {
              novelId,
              order: { gte: options.startOrder, lte: options.endOrder },
              ...(options.skipCompleted
                ? buildSkipCompletedChapterWhere()
                : {}),
            },
            orderBy: { order: "asc" },
          }),
        ]);
        if (!novel || chapters.length === 0) {
          throw new Error("The task failed: the novel or chapter does not exist");
        }

        logPipelineInfo("Task loaded", {
          jobId,
          novelId,
          title: novel.title,
          chapterCount: chapters.length,
        });

        const isAutopilotMode = runtimePayload.controlPolicy?.advanceMode === "full_book_autopilot";
        const autopilotTargetEndOrder = isAutopilotMode
          ? Math.max(options.endOrder, novel.estimatedChapterCount ?? options.endOrder)
          : options.endOrder;
        let totalCount = isAutopilotMode
          ? Math.max(1, autopilotTargetEndOrder - options.startOrder + 1)
          : Math.max(existingJob?.totalCount ?? 0, chapters.length, 1);
        const storedCompleted = Math.min(Math.max(existingJob?.completedCount ?? 0, 0), totalCount);
        const filteredCompletedCount = runtimePayload.skipCompleted
          ? Math.max(0, totalCount - chapters.length)
          : 0;
        const remainingStartIndex = Math.min(
          Math.max(0, storedCompleted - filteredCompletedCount),
          chapters.length,
        );
        let completed = storedCompleted;
        const chaptersToProcess = chapters.slice(remainingStartIndex);
        let pendingManualRecovery = false;

        // Phase 3: JIT prefetch service (prefetch execution for chapter N+1).
        const prefetchVolumeService = new NovelVolumeService();
        const prefetchRouteWindowService = new ChapterRouteWindowService(prefetchVolumeService);
        const prefetchJITService = new ChapterPlanJITService({
          ensureChapterExecutionContract: (nId, cId, opts) =>
            prefetchVolumeService.ensureChapterExecutionContract(nId, cId, opts),
          ensureRouteWindow: (nId, fromOrder, opts) => (
            prefetchRouteWindowService.ensureRouteWindow(nId, fromOrder, opts)
          ),
        });
        if (isAutopilotMode) {
          await this.updateJobSafe(jobId, {
            endOrder: autopilotTargetEndOrder,
            totalCount,
          });
        }

        for (let chapterIndex = 0; chapterIndex < chaptersToProcess.length; chapterIndex++) {
          const chapter = chaptersToProcess[chapterIndex];
          await this.ensurePipelineNotCancelled(jobId);

          let shouldStopAfterCurrentChapter = false;
          const currentItemLabel = buildPipelineCurrentItemLabel({
            completedCount: completed,
            totalCount,
            chapterOrder: chapter.order,
            title: chapter.title,
          });
          let activeStage: PipelineActiveStage = "generating_chapters";
          const applyChapterStage = async (stage: PipelineActiveStage) => {
            activeStage = stage;
            await this.updateJobSafe(jobId, {
              heartbeatAt: new Date(),
              currentStage: stage,
              currentItemKey: chapter.id,
              currentItemLabel,
              progress: buildPipelineStageProgress({
                completedCount: completed,
                totalCount,
                stage,
              }),
            });
          };

          await applyChapterStage("generating_chapters");
          logPipelineInfo("Processing chapter", {
            jobId,
            chapterId: chapter.id,
            order: chapter.order,
            hasDraft: Boolean((chapter.content ?? "").trim()),
          });

          const heartbeatTimer = setInterval(() => {
            void this.updateJobSafe(jobId, {
              heartbeatAt: new Date(),
              currentStage: activeStage,
              currentItemKey: chapter.id,
              currentItemLabel,
              progress: buildPipelineStageProgress({
                completedCount: completed,
                totalCount,
                stage: activeStage,
              }),
            });
          }, PIPELINE_HEARTBEAT_INTERVAL_MS);
          heartbeatTimer.unref?.();

          let chapterResult: Awaited<ReturnType<ChapterRuntimeCoordinator["runPipelineChapter"]>> | null = null;
          const chapterRetryBudget = isAutopilotMode
            ? Math.min(maxRetries, issueGovernance?.policy.maxAutomaticRetries ?? maxRetries)
            : maxRetries;
          let chapterRetryCountUsed = 0;
          try {
            while (true) {
              try {
                chapterResult = await this.chapterRuntimeCoordinator.runPipelineChapter(
                  novelId,
                  chapter.id,
                  {
                    provider: runtimePayload.provider,
                    model: runtimePayload.model,
                    temperature: runtimePayload.temperature,
                    workflowTaskId: runtimePayload.workflowTaskId,
                    taskStyleProfileId: runtimePayload.taskStyleProfileId,
                    controlPolicy: runtimePayload.controlPolicy,
                    maxRetries: Math.max(0, chapterRetryBudget - chapterRetryCountUsed),
                    autoReview: runtimePayload.autoReview,
                    autoRepair: runtimePayload.autoRepair,
                    qualityThreshold,
                    repairMode: runtimePayload.repairMode,
                    artifactSyncMode: runtimePayload.artifactSyncMode,
                  },
                  {
                  onCheckCancelled: () => this.ensurePipelineNotCancelled(jobId),
                  onStageChange: async (stage) => {
                    await applyChapterStage(stage);
                  },
                  onRetryConsumed: async () => {
                    chapterRetryCountUsed += 1;
                  },
                  onEmptyContent: async (event) => {
                    const willRetry = event.willRetry || (isAutopilotMode && chapterRetryCountUsed < chapterRetryBudget);
                    const detail = buildEmptyChapterDetail(chapter);
                    const meta = {
                      jobId,
                      workflowTaskId: runtimePayload.workflowTaskId,
                      novelId,
                      chapterId: chapter.id,
                      chapterOrder: chapter.order,
                      provider: runtimePayload.provider,
                      model: runtimePayload.model,
                      runMode: runtimePayload.runMode,
                      emptyAttempt: event.attempt,
                      willRetry,
                      contentLength: event.contentLength,
                      rawContentLength: event.rawContentLength,
                      source: event.error.details.source,
                    };
                    await reportPipelineIssue({
                      governance: issueGovernance,
                      workflowTaskId: runtimePayload.workflowTaskId,
                      novelId,
                      jobId,
                      issueCode: "generation.empty_content",
                      stage: "chapter_generation",
                      summary: detail,
                      evidence: `source=${event.error.details.source}; length=${event.contentLength}`,
                      chapterId: chapter.id,
                      chapterOrder: chapter.order,
                      attempt: event.attempt,
                      hasUsableOutput: false,
                      provider: runtimePayload.provider,
                      model: runtimePayload.model,
                      temperature: runtimePayload.temperature,
                    });
                    if (willRetry) {
                      logPipelineWarn("Chapter generation returned no draft. Retrying this chapter", meta);
                      return;
                    }
                    if (!qualityAlertDetails.includes(detail)) {
                      qualityAlertDetails.push(detail);
                    }
                    logPipelineError("Chapter generation returned no draft several times. Preparing to auto-retry this chapter", meta);
                  },
                  },
                );
                break;
              } catch (error) {
                if (error instanceof Error && error.message === "PIPELINE_CANCELLED") {
                  throw error;
                }
                if (error instanceof ChapterContentPersistenceError) {
                  await reportPipelineIssue({
                    governance: issueGovernance,
                    workflowTaskId: runtimePayload.workflowTaskId,
                    novelId,
                    jobId,
                    issueCode: "runtime.persistence_failed",
                    stage: "chapter_persistence",
                    summary: `Chapter ${chapter.order} text could not be confirmed as saved. Automatic retry has stopped.`,
                    evidence: error.message,
                    chapterId: chapter.id,
                    chapterOrder: chapter.order,
                    hasUsableOutput: false,
                    provider: runtimePayload.provider,
                    model: runtimePayload.model,
                    temperature: runtimePayload.temperature,
                  });
                  throw error;
                }
                const canRetry = isAutopilotMode && chapterRetryCountUsed < chapterRetryBudget;
                if (!canRetry) {
                  throw error;
                }
                chapterRetryCountUsed += 1;
                const retryLabel = `Chapter ${chapter.order} hit a temporary problem. AI is auto-repairing and retrying (${chapterRetryCountUsed}/${chapterRetryBudget})`;
                await this.updateJobSafe(jobId, {
                  heartbeatAt: new Date(),
                  currentStage: "generating_chapters",
                  currentItemKey: chapter.id,
                  currentItemLabel: retryLabel,
                });
                logPipelineWarn("The chapter runtime failed. Auto-retrying this chapter", {
                  jobId,
                  novelId,
                  chapterId: chapter.id,
                  chapterOrder: chapter.order,
                  retry: chapterRetryCountUsed,
                  error: error instanceof Error ? error.message : String(error),
                });
              }
            }
          } finally {
            clearInterval(heartbeatTimer);
          }
          if (!chapterResult) {
            throw new Error(`Chapter ${chapter.order} still has no usable result after automatic retry.`);
          }

          totalRetryCount += Math.max(chapterRetryCountUsed, chapterResult.retryCountUsed);
          const closure = await applyChapterQualityClosure({
            governance: issueGovernance,
            workflowTaskId: runtimePayload.workflowTaskId,
            novelId,
            jobId,
            chapter: { id: chapter.id, order: chapter.order },
            chapterResult,
            qualityThreshold,
            runtimePayload,
            qualityAlertDetails,
            replanAlertDetails,
            recoverableRepairDetails,
            runLocalReplan: (replan) => plannerService.replan(novelId, {
              ...replan,
              provider: runtimePayload.provider,
              model: runtimePayload.model,
              temperature: runtimePayload.temperature,
            }),
          });
          shouldStopAfterCurrentChapter = closure.shouldStopAfterCurrentChapter;

          // Phase 3: JIT prefetch for chapter N+1.
          // After the current chapter finalizes (fact ledger already written), kick off the next chapter's task sheet in the background.
          // Fire-and-forget: prefetch failure does not affect this pipeline; the next chapter retries when it assembles.
          if (!shouldStopAfterCurrentChapter && isAutopilotMode && chapter.order < autopilotTargetEndOrder) {
            await prefetchRouteWindowService.ensureRouteWindow(novelId, chapter.order + 1, {
              min: 3,
              target: 5,
              provider: runtimePayload.provider,
              model: runtimePayload.model,
              temperature: runtimePayload.temperature,
              taskId: runtimePayload.workflowTaskId ?? jobId,
              completionProfile: buildDirectorCompletionProfile(autopilotTargetEndOrder),
            });
            const queuedNextChapter = chaptersToProcess[chapterIndex + 1];
            if (!queuedNextChapter) {
              const persistedNextChapter = await prisma.chapter.findFirst({
                where: {
                  novelId,
                  order: chapter.order + 1,
                },
                orderBy: { order: "asc" },
              });
            if (!persistedNextChapter) {
                await reportPipelineIssue({
                  governance: issueGovernance,
                  workflowTaskId: runtimePayload.workflowTaskId,
                  novelId,
                  jobId,
                  issueCode: "planning.route_window_unavailable",
                  stage: "route_window",
                  summary: `Rolling planning could not prepare chapter ${chapter.order + 1}.`,
                  chapterId: chapter.id,
                  chapterOrder: chapter.order,
                  attempt: maxRetries,
                  hasUsableOutput: true,
                  provider: runtimePayload.provider,
                  model: runtimePayload.model,
                  temperature: runtimePayload.temperature,
                });
                throw new Error(`Rolling planning could not prepare Chapter ${chapter.order + 1}. The current draft is saved safely and can resume after this chapter.`);
              }
              chaptersToProcess.push(persistedNextChapter);
            }
          }

          const nextChapter = chaptersToProcess[chapterIndex + 1];
          if (nextChapter && isAutopilotMode) {
            void prefetchJITService.ensureExecutionReady(novelId, nextChapter.id, {
              min: 3,
              target: 5,
              provider: runtimePayload.provider,
              model: runtimePayload.model,
              temperature: runtimePayload.temperature,
              completionProfile: buildDirectorCompletionProfile(autopilotTargetEndOrder),
            }).catch((error) => {
              logPipelineInfo("N+1 JIT prefetch failed (non-blocking; the next chapter will retry during assembly)", {
                jobId,
                nextChapterId: nextChapter.id,
                nextChapterOrder: nextChapter.order,
                error: error instanceof Error ? error.message : String(error),
              });
              void reportPipelineIssue({
                governance: issueGovernance,
                workflowTaskId: runtimePayload.workflowTaskId,
                novelId,
                jobId,
                issueCode: "runtime.background_prefetch_failed",
                stage: "background_prefetch",
                summary: `Background prefetch for chapter ${nextChapter.order} failed. It will be prepared again during formal execution.`,
                evidence: error instanceof Error ? error.message : String(error),
                chapterId: nextChapter.id,
                chapterOrder: nextChapter.order,
                hasUsableOutput: true,
                provider: runtimePayload.provider,
                model: runtimePayload.model,
                temperature: runtimePayload.temperature,
              });
            });
          }

          completed += 1;
          await this.updateJobSafe(jobId, {
            completedCount: completed,
            progress: Number((completed / totalCount).toFixed(4)),
            retryCount: totalRetryCount,
            heartbeatAt: new Date(),
            payload: this.stringifyPipelinePayload({
              ...runtimePayload,
              qualityAlertDetails,
              replanAlertDetails,
              recoverableRepairDetails,
            }),
          });
          logPipelineInfo("Task progress updated", {
            jobId,
            completed,
            total: totalCount,
            progress: Number((completed / totalCount).toFixed(4)),
            retryCount: totalRetryCount,
          });
          if (shouldStopAfterCurrentChapter) {
            pendingManualRecovery = true;
            logPipelineWarn("The chapter needs manual handling. Later chapter pipeline was paused", {
              jobId,
              order: chapter.order,
              remaining: Math.max(0, totalCount - completed),
            });
            break;
          }
        }

        if (pendingManualRecovery) {
          await this.updateJobSafe(jobId, {
            status: "queued",
            pendingManualRecovery: true,
            error: "The chapter needs manual confirmation. Later generation is paused.",
            heartbeatAt: null,
            currentStage: "queued",
            currentItemKey: null,
            currentItemLabel: null,
            cancelRequestedAt: null,
            finishedAt: null,
            payload: this.stringifyPipelinePayload({
              ...runtimePayload,
              qualityAlertDetails,
              replanAlertDetails,
              recoverableRepairDetails,
            }),
          });
          return;
        }

        const finalStatus: "succeeded" = "succeeded";
        await this.updateJobSafe(jobId, {
          heartbeatAt: new Date(),
          currentStage: "finalizing",
          currentItemKey: null,
          currentItemLabel: "Finishing the chapter pipeline task",
          progress: buildPipelineStageProgress({
            completedCount: completed,
            totalCount,
            stage: "finalizing",
          }),
        });
        await this.updateJobSafe(jobId, {
          status: finalStatus,
          error: null,
          heartbeatAt: null,
          currentStage: null,
          currentItemKey: null,
          currentItemLabel: null,
          cancelRequestedAt: null,
          finishedAt: new Date(),
          payload: this.stringifyPipelinePayload({
            ...runtimePayload,
            qualityAlertDetails,
            replanAlertDetails,
            recoverableRepairDetails,
          }),
        });
        logPipelineInfo("Task execution finished", {
          jobId,
          status: finalStatus,
          qualityAlertCount: qualityAlertDetails.length,
        });
        void novelEventBus.emit({
          type: "pipeline:completed",
          payload: { novelId, jobId, status: finalStatus },
        }).catch(() => {});
      });
    } catch (error) {
      if (error instanceof Error && error.message === "PIPELINE_CANCELLED") {
        await this.updateJobSafe(jobId, {
          status: "cancelled",
          heartbeatAt: null,
          currentStage: null,
          currentItemKey: null,
          currentItemLabel: null,
          cancelRequestedAt: null,
          finishedAt: new Date(),
          payload: this.stringifyPipelinePayload({
            ...runtimePayload,
            qualityAlertDetails,
            replanAlertDetails,
            recoverableRepairDetails,
          }),
        });
        void novelEventBus.emit({
          type: "pipeline:completed",
          payload: { novelId, jobId, status: "cancelled" },
        }).catch(() => {});
        return;
      }

      const message = error instanceof Error ? error.message : "Pipeline execution failed";
      if (isChapterEmptyContentError(error)) {
        logPipelineError("The task failed because the chapter body was empty", {
          jobId,
          novelId,
          provider: runtimePayload.provider,
          model: runtimePayload.model,
          runMode: runtimePayload.runMode,
          workflowTaskId: runtimePayload.workflowTaskId,
          source: error.details.source,
          contentLength: error.details.trimmedLength,
          rawContentLength: error.details.rawLength,
        });
      } else if (!(error instanceof ChapterContentPersistenceError)) {
        await reportPipelineIssue({
          governance: issueGovernance,
          workflowTaskId: runtimePayload.workflowTaskId,
          novelId,
          jobId,
          issueCode: "generation.runtime_failed",
          stage: "chapter_execution",
          summary: message,
          evidence: error instanceof Error ? error.stack : undefined,
          attempt: maxRetries,
          hasUsableOutput: false,
          provider: runtimePayload.provider,
          model: runtimePayload.model,
          temperature: runtimePayload.temperature,
        });
      }
      await this.updateJobSafe(jobId, {
        status: "failed",
        error: message,
        finishedAt: new Date(),
        payload: this.stringifyPipelinePayload({
          ...runtimePayload,
          qualityAlertDetails,
          replanAlertDetails,
          recoverableRepairDetails,
        }),
      });
        logPipelineError("Task execution exception", {
        jobId,
        novelId,
        message,
      });
      void novelEventBus.emit({
        type: "pipeline:completed",
        payload: { novelId, jobId, status: "failed" },
      }).catch(() => {});
    }
  }
}

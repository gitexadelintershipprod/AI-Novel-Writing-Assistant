import type { PipelinePayload } from "../../novelCoreShared";
import { logPipelineError, logPipelineWarn } from "../../novelCoreShared";
import { createQualityReport } from "../../novelCoreReviewService";
import { chapterQualityLoopService } from "../../quality/ChapterQualityLoopService";
import type { ChapterRuntimeCoordinator } from "../../runtime/ChapterRuntimeCoordinator";
import type { DirectorIssueTaskContext } from "../../director/issues";
import { reportPipelineIssue } from "../issueGovernance/PipelineIssueGovernance";
import type { ReplanResult } from "@ai-novel/shared/types/novel";

type ChapterPipelineResult = Awaited<ReturnType<ChapterRuntimeCoordinator["runPipelineChapter"]>>;

function requiresManualStop(result: Awaited<ReturnType<typeof reportPipelineIssue>>): boolean {
  return result?.decision.action === "pause_for_manual" || result?.decision.action === "fail_task";
}

export async function applyChapterQualityClosure(input: {
  governance: DirectorIssueTaskContext | null;
  workflowTaskId?: string;
  novelId: string;
  jobId: string;
  chapter: { id: string; order: number };
  chapterResult: ChapterPipelineResult;
  qualityThreshold: number;
  runtimePayload: PipelinePayload;
  qualityAlertDetails: string[];
  replanAlertDetails: string[];
  recoverableRepairDetails: string[];
  runLocalReplan: (input: {
    chapterId: string;
    triggerType: string;
    sourceIssueIds: string[];
    windowSize: number;
    reason: string;
  }) => Promise<ReplanResult>;
}): Promise<{ shouldStopAfterCurrentChapter: boolean }> {
  const { chapter, chapterResult, runtimePayload } = input;
  const final = { score: chapterResult.score, issues: chapterResult.issues };
  const replanRecommendation = chapterResult.runtimePackage?.replanRecommendation;
  const qualityDebtTerminalAction = chapterResult.pass || replanRecommendation?.scope === "global_book"
    ? null
    : "defer_and_continue" as const;
  let shouldStopAfterCurrentChapter = false;

  if (runtimePayload.autoReview && !chapterResult.reviewExecuted) {
    const result = await reportPipelineIssue({
      governance: input.governance,
      workflowTaskId: input.workflowTaskId,
      novelId: input.novelId,
      jobId: input.jobId,
      issueCode: "quality.acceptance_unavailable",
      stage: "chapter_review",
      summary: `Acceptance could not run for chapter ${chapter.order}. The text is kept and waiting for later review.`,
      chapterId: chapter.id,
      chapterOrder: chapter.order,
      hasUsableOutput: true,
      provider: runtimePayload.provider,
      model: runtimePayload.model,
      temperature: runtimePayload.temperature,
    });
    shouldStopAfterCurrentChapter ||= requiresManualStop(result);
  }

  if (chapterResult.recoverableRepairFailure) {
    input.recoverableRepairDetails.push(
      `Chapter ${chapter.order} still needs later repair: ${chapterResult.recoverableRepairFailure.message}`,
    );
    logPipelineWarn("Local chapter repair was not applied safely. It was recorded and later chapters continued", {
      jobId: input.jobId,
      order: chapter.order,
      reason: chapterResult.recoverableRepairFailure.message,
      failureTypes: chapterResult.recoverableRepairFailure.failureTypes,
    });
    const result = await reportPipelineIssue({
      governance: input.governance,
      workflowTaskId: input.workflowTaskId,
      novelId: input.novelId,
      jobId: input.jobId,
      issueCode: "quality.local_repair_failed",
      stage: "chapter_repair",
      summary: chapterResult.recoverableRepairFailure.message,
      evidence: chapterResult.recoverableRepairFailure.failureTypes.join(", "),
      chapterId: chapter.id,
      chapterOrder: chapter.order,
      hasUsableOutput: true,
      provider: runtimePayload.provider,
      model: runtimePayload.model,
      temperature: runtimePayload.temperature,
    });
    shouldStopAfterCurrentChapter ||= requiresManualStop(result);
  }

  if (chapterResult.reviewExecuted) {
    await createQualityReport(input.novelId, chapter.id, final.score, final.issues);
    await chapterQualityLoopService.recordAssessment({
      novelId: input.novelId,
      chapterId: chapter.id,
      chapterOrder: chapter.order,
      score: final.score,
      issues: final.issues,
      runtimePackage: chapterResult.runtimePackage,
      source: chapterResult.retryCountUsed > 0 ? "repair_recheck" : "pipeline_review",
      terminalAction: qualityDebtTerminalAction,
      taskId: input.workflowTaskId,
      qualityDebtAttribution: chapterResult.qualityDebtAttribution ?? null,
    }).catch((error) => {
      logPipelineError("Recording the chapter quality-loop state failed", {
        jobId: input.jobId,
        novelId: input.novelId,
        chapterId: chapter.id,
        error: error instanceof Error ? error.message : String(error),
      });
    });
  }

  if (chapterResult.reviewExecuted && !chapterResult.pass) {
    input.qualityAlertDetails.push(
      `Chapter ${chapter.order} (coherence=${final.score.coherence}, repetition=${final.score.repetition}, engagement=${final.score.engagement})`,
    );
    logPipelineWarn("Chapter still below quality threshold", {
      jobId: input.jobId,
      order: chapter.order,
      score: final.score,
    });
    const result = await reportPipelineIssue({
      governance: input.governance,
      workflowTaskId: input.workflowTaskId,
      novelId: input.novelId,
      jobId: input.jobId,
      issueCode: "quality.chapter_below_threshold",
      stage: "chapter_review",
      summary: `Chapter ${chapter.order} quality score did not reach ${input.qualityThreshold}.`,
      chapterId: chapter.id,
      chapterOrder: chapter.order,
      qualityScores: {
        coherence: final.score.coherence,
        repetition: final.score.repetition,
        engagement: final.score.engagement,
      },
      hasUsableOutput: true,
      provider: runtimePayload.provider,
      model: runtimePayload.model,
      temperature: runtimePayload.temperature,
    });
    shouldStopAfterCurrentChapter ||= requiresManualStop(result);
  }

  if (shouldStopAfterCurrentChapter) {
    return { shouldStopAfterCurrentChapter: true };
  }

  if (!replanRecommendation?.recommended) {
    return { shouldStopAfterCurrentChapter: false };
  }
  const impactedOrders = replanRecommendation.affectedChapterOrders?.length
    ? `affected chapters=${replanRecommendation.affectedChapterOrders.join(",")}`
    : `anchor chapter=${replanRecommendation.anchorChapterOrder ?? chapter.order}`;
  const detail = `Chapter ${chapter.order}${replanRecommendation.scope === "global_book" ? " needs book-level replan" : " is adjusting later chapter arrangement"} (${impactedOrders}; reason=${replanRecommendation.triggerReason ?? replanRecommendation.reason})`;
  if (replanRecommendation.scope !== "global_book") {
    try {
      const result = await input.runLocalReplan({
        chapterId: chapter.id,
        triggerType: "chapter_quality_local_replan",
        sourceIssueIds: replanRecommendation.blockingIssueIds,
        windowSize: Math.max(1, replanRecommendation.affectedChapterOrders?.length ?? 3),
        reason: replanRecommendation.triggerReason ?? replanRecommendation.reason,
      });
      const plannedOrders = result.affectedChapterOrders.join(",") || "later unfinished chapters";
      const completedDetail = `Chapter ${chapter.order} adjusted later chapter arrangement (refreshed=${plannedOrders}).`;
      if (!input.qualityAlertDetails.includes(completedDetail)) input.qualityAlertDetails.push(completedDetail);
      return { shouldStopAfterCurrentChapter: false };
    } catch (error) {
      const failureDetail = `Chapter ${chapter.order} follow-up chapter adjustment failed; prose was kept and the chain continued: ${error instanceof Error ? error.message : String(error)}`;
      if (!input.recoverableRepairDetails.includes(failureDetail)) input.recoverableRepairDetails.push(failureDetail);
      const result = await reportPipelineIssue({
        governance: input.governance,
        workflowTaskId: input.workflowTaskId,
        novelId: input.novelId,
        jobId: input.jobId,
        issueCode: "quality.local_replan_failed",
        stage: "chapter_review",
        summary: failureDetail,
        evidence: replanRecommendation.reason,
        chapterId: chapter.id,
        chapterOrder: chapter.order,
        hasUsableOutput: true,
        provider: runtimePayload.provider,
        model: runtimePayload.model,
        temperature: runtimePayload.temperature,
      });
      return { shouldStopAfterCurrentChapter: requiresManualStop(result) };
    }
  }
  if (replanRecommendation.action !== "stop_for_replan") {
    if (!input.qualityAlertDetails.includes(detail)) input.qualityAlertDetails.push(detail);
    return { shouldStopAfterCurrentChapter: false };
  }
  await reportPipelineIssue({
    governance: input.governance,
    workflowTaskId: input.workflowTaskId,
    novelId: input.novelId,
    jobId: input.jobId,
    issueCode: "quality.replan_required",
    stage: "chapter_review",
    summary: detail,
    evidence: replanRecommendation.reason,
    chapterId: chapter.id,
    chapterOrder: chapter.order,
    hasUsableOutput: true,
    provider: runtimePayload.provider,
    model: runtimePayload.model,
    temperature: runtimePayload.temperature,
    applyAction: async () => {
      if (!input.replanAlertDetails.includes(detail)) input.replanAlertDetails.push(detail);
    },
  });
  if (!input.replanAlertDetails.includes(detail)) input.replanAlertDetails.push(detail);
  return { shouldStopAfterCurrentChapter: true };
}

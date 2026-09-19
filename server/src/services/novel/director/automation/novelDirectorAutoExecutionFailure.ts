import type { DirectorAutoExecutionState } from "@ai-novel/shared/types/novelDirector";

export function isSkippableAutoExecutionReviewFailure(message: string | null | undefined): boolean {
  const normalized = message?.trim() ?? "";
  return normalized.startsWith("Chapter generation is blocked until review is resolved.");
}

function formatAutoExecutionContinuation(input: Pick<
  DirectorAutoExecutionState,
  "remainingChapterCount" | "nextChapterOrder"
>): string {
  const remainingPart = typeof input.remainingChapterCount === "number"
    ? input.remainingChapterCount > 0
      ? `当前仍有 ${input.remainingChapterCount} chapters待继续`
      : "There are no chapters left to continue"
    : "当前仍有待继续章节";
  const nextPart = typeof input.nextChapterOrder === "number"
    ? `，系统会从Chapter ${input.nextChapterOrder}继续`
    : "，系统会从下一章继续";
  return `${remainingPart}${nextPart}。`;
}

function formatAutoExecutionActionLabel(
  autoExecution?: Pick<DirectorAutoExecutionState, "scopeLabel"> | null,
): string {
  const scopeLabel = autoExecution?.scopeLabel?.trim();
  return scopeLabel ? `Continue automatic execution${scopeLabel}` : "Continue auto-running the current range";
}

export function buildSkippableAutoExecutionReviewFailureSummary(
  autoExecution?: Pick<DirectorAutoExecutionState, "remainingChapterCount" | "nextChapterOrder" | "scopeLabel"> | null,
): string {
  return [
    "This chapter paused because review blocked it, but this kind of issue can skip the chapter and continue.",
    `点击“${formatAutoExecutionActionLabel(autoExecution)}”后，系统会直接续跑剩余章节。`,
    formatAutoExecutionContinuation({
      remainingChapterCount: autoExecution?.remainingChapterCount,
      nextChapterOrder: autoExecution?.nextChapterOrder,
    }),
  ].join(" ");
}

export function buildSkippableAutoExecutionReviewCheckpointSummary(input: {
  scopeLabel: string;
  autoExecution?: Pick<DirectorAutoExecutionState, "remainingChapterCount" | "nextChapterOrder"> | null;
}): string {
  return [
    `${input.scopeLabel} entered auto-run, but the current chapter paused because review blocked it.`,
    "These issues allow skipping the current chapter and continuing.",
    formatAutoExecutionContinuation({
      remainingChapterCount: input.autoExecution?.remainingChapterCount,
      nextChapterOrder: input.autoExecution?.nextChapterOrder,
    }),
  ].join(" ");
}

export function buildSkippableAutoExecutionReviewBlockingReason(
  autoExecution?: Pick<DirectorAutoExecutionState, "nextChapterOrder" | "scopeLabel"> | null,
): string {
  const actionLabel = formatAutoExecutionActionLabel(autoExecution);
  if (typeof autoExecution?.nextChapterOrder === "number") {
    return `This chapter paused because review blocked it, but this kind of issue can skip the chapter and continue.点击“${actionLabel}”后，系统会从Chapter ${autoExecution.nextChapterOrder}继续。`;
  }
  return `This chapter paused because review blocked it, but this kind of issue can skip the chapter and continue.点击“${actionLabel}”后，系统会从下一章继续。`;
}

export function buildSkippableAutoExecutionReviewRecoveryHint(
  autoExecution?: Pick<DirectorAutoExecutionState, "nextChapterOrder" | "scopeLabel"> | null,
): string {
  const actionLabel = formatAutoExecutionActionLabel(autoExecution);
  if (typeof autoExecution?.nextChapterOrder === "number") {
    return `可直接点击“${actionLabel}”，系统会跳过当前审核阻断章并从Chapter ${autoExecution.nextChapterOrder}继续；如需修复当前章，再回到Chapter execution或Quality repair处理。`;
  }
  return `可直接点击“${actionLabel}”，系统会跳过当前审核阻断章并从下一章继续；如需修复当前章，再回到Chapter execution或Quality repair处理。`;
}

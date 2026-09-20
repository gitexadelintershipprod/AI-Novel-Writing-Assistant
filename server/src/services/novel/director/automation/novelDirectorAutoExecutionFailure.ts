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
      ? `There are still ${input.remainingChapterCount} chapters left to continue`
      : "There are no chapters left to continue"
    : "There are still chapters left to continue";
  const nextPart = typeof input.nextChapterOrder === "number"
    ? `, and the system will continue from Chapter ${input.nextChapterOrder}`
    : ", and the system will continue from the next chapter";
  return `${remainingPart}${nextPart}.`;
}

function formatAutoExecutionActionLabel(
  autoExecution?: Pick<DirectorAutoExecutionState, "scopeLabel"> | null,
): string {
  const scopeLabel = autoExecution?.scopeLabel?.trim();
  return scopeLabel ? `Continue automatic execution of ${scopeLabel}` : "Continue auto-running the current range";
}

export function buildSkippableAutoExecutionReviewFailureSummary(
  autoExecution?: Pick<DirectorAutoExecutionState, "remainingChapterCount" | "nextChapterOrder" | "scopeLabel"> | null,
): string {
  return [
    "This chapter paused because review blocked it, but this kind of issue can skip the chapter and continue.",
    `After you click "${formatAutoExecutionActionLabel(autoExecution)}", the system will continue the remaining chapters.`,
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
    return `This chapter paused because review blocked it, but this kind of issue can skip the chapter and continue. After you click "${actionLabel}", the system will continue from Chapter ${autoExecution.nextChapterOrder}.`;
  }
  return `This chapter paused because review blocked it, but this kind of issue can skip the chapter and continue. After you click "${actionLabel}", the system will continue from the next chapter.`;
}

export function buildSkippableAutoExecutionReviewRecoveryHint(
  autoExecution?: Pick<DirectorAutoExecutionState, "nextChapterOrder" | "scopeLabel"> | null,
): string {
  const actionLabel = formatAutoExecutionActionLabel(autoExecution);
  if (typeof autoExecution?.nextChapterOrder === "number") {
    return `You can click "${actionLabel}" to skip the review-blocked chapter and continue from Chapter ${autoExecution.nextChapterOrder}. To repair the current chapter first, go back to Chapter execution or Quality repair.`;
  }
  return `You can click "${actionLabel}" to skip the review-blocked chapter and continue from the next chapter. To repair the current chapter first, go back to Chapter execution or Quality repair.`;
}

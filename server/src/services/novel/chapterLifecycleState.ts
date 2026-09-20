/**
 * Chapters have two parallel fields: `generationState` (pipeline semantics) and `chapterStatus` (ops/editor semantics).
 * This module centralizes the paired values that should be submitted together on the same write path,
 * so states do not drift into cases such as "passed review but not marked complete".
 */

export type PipelineGenerationState = "planned" | "drafted" | "reviewed" | "repaired" | "approved" | "published";

export type OperationalChapterStatus =
  | "unplanned"
  | "pending_generation"
  | "generating"
  | "pending_review"
  | "needs_repair"
  | "completed";

export interface ChapterStatePairPatch {
  generationState?: PipelineGenerationState;
  chapterStatus?: OperationalChapterStatus;
}

/**
 * Align with `novelCoreReviewService` when review ends: complete if it passed, otherwise needs repair.
 */
export function chapterStatePairAfterManualQualityReview(pass: boolean): ChapterStatePairPatch {
  return {
    generationState: "reviewed",
    chapterStatus: pass ? "completed" : "needs_repair",
  };
}

/**
 * Recommended paired values when the pipeline marks a chapter approved in a cycle (auto-review skipped or met the bar).
 */
export function chapterStatePairAfterPipelineApproval(): ChapterStatePairPatch {
  return {
    generationState: "approved",
    chapterStatus: "completed",
  };
}

/**
 * When raising `generationState` to `approved`, also keep `chapterStatus` aligned with the user-visible "completed" state.
 * Safe to call again on updates that already have `generationState === "approved"`.
 */
export function mergeChapterPatchForGenerationStateBump(
  current: ChapterStatePairPatch | undefined,
  nextGenerationState: PipelineGenerationState,
): ChapterStatePairPatch {
  const base: ChapterStatePairPatch = { ...(current ?? {}) };

  base.generationState = nextGenerationState;

  if (nextGenerationState === "approved") {
    base.chapterStatus = "completed";
  }

  return base;
}

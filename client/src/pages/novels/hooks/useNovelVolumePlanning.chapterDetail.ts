import type { VolumePlan, VolumePlanDocument } from "@ai-novel/shared/types/novel";
import {
  CHAPTER_DETAIL_MODES,
  hasAnyChapterDetailDraft,
  hasChapterDetailDraft,
  type ChapterDetailBundleRequest,
  type ChapterDetailMode,
} from "../chapterDetailPlanning.shared";

export interface ChapterDetailTarget {
  chapterId: string;
  chapterOrder: number;
  title: string;
}

export interface ChapterDetailBatchFailure {
  targetVolumeId: string;
  targets: ChapterDetailTarget[];
  chapterId: string;
  chapterOrder: number;
  chapterTitle: string;
  mode: ChapterDetailMode;
  message: string;
}

interface ResolvedChapterDetailBatch {
  label: string;
  missingCount: number;
  targets: ChapterDetailTarget[];
  hasExistingDrafts: boolean;
}

interface ChapterDetailMutationPayload {
  targetVolumeId: string;
  targetChapterId: string;
  detailMode: ChapterDetailMode;
  draftVolumesOverride: VolumePlan[];
  suppressSuccessMessage: true;
}

interface ChapterDetailMutationResult {
  nextDocument: VolumePlanDocument;
}

interface RunChapterDetailBatchGenerationArgs {
  initialDraft: VolumePlan[];
  label: string;
  targetVolumeId: string;
  targets: ChapterDetailTarget[];
  setIsGenerating: (value: boolean) => void;
  setCurrentChapterId: (value: string) => void;
  setCurrentMode: (value: ChapterDetailMode | "") => void;
  setFailure: (failure: ChapterDetailBatchFailure | null) => void;
  setStructuredMessage: (value: string) => void;
  generateChapterDetail: (
    payload: ChapterDetailMutationPayload,
  ) => Promise<ChapterDetailMutationResult>;
}

function describeChapterTarget(target: ChapterDetailTarget): string {
  return `Chapter ${target.chapterOrder}: "${target.title || "Unnamed chapter"}"`;
}

function buildFallbackLabel(targets: ChapterDetailTarget[]): string {
  if (targets.length === 1) {
    return describeChapterTarget(targets[0]);
  }
  const first = targets[0];
  const last = targets[targets.length - 1];
  if (!first || !last) {
    return "Current chapter scope";
  }
  return `Chapters ${first.chapterOrder}–${last.chapterOrder} (${targets.length} chapters)`;
}

function resolveMissingChapterDetailModes(
  draft: VolumePlan[],
  targetVolumeId: string,
  targetChapterId: string,
): ChapterDetailMode[] {
  const chapter = draft
    .find((volume) => volume.id === targetVolumeId)
    ?.chapters.find((item) => item.id === targetChapterId);
  if (!chapter) {
    return [];
  }
  return CHAPTER_DETAIL_MODES.filter((mode) => !hasChapterDetailDraft(chapter, mode));
}

export function resolveChapterDetailBatch(
  volume: VolumePlan | undefined,
  request: ChapterDetailBundleRequest,
): ResolvedChapterDetailBatch {
  const requestedIds = typeof request === "string"
    ? [request]
    : Array.from(new Set(request.chapterIds.map((id) => id.trim()).filter(Boolean)));
  const matchedChapters = requestedIds
    .map((chapterId) => volume?.chapters.find((chapter) => chapter.id === chapterId))
    .filter((chapter): chapter is VolumePlan["chapters"][number] => Boolean(chapter));

  return {
    label: typeof request === "string"
      ? buildFallbackLabel(matchedChapters.map((chapter) => ({
        chapterId: chapter.id,
        chapterOrder: chapter.chapterOrder,
        title: chapter.title,
      })))
      : request.label?.trim() || buildFallbackLabel(matchedChapters.map((chapter) => ({
        chapterId: chapter.id,
        chapterOrder: chapter.chapterOrder,
        title: chapter.title,
      }))),
    missingCount: Math.max(requestedIds.length - matchedChapters.length, 0),
    targets: matchedChapters.map((chapter) => ({
      chapterId: chapter.id,
      chapterOrder: chapter.chapterOrder,
      title: chapter.title,
    })),
    hasExistingDrafts: matchedChapters.some((chapter) => hasAnyChapterDetailDraft(chapter)),
  };
}

export function buildChapterDetailBatchConfirmationMessage(
  batch: ResolvedChapterDetailBatch,
): string {
  return [
    batch.targets.length === 1
      ? `AI will complete chapter goals, production boundaries, and task lists for ${batch.label} based on the current content.`
      : `AI will complete chapter goals, production boundaries, and task lists for ${batch.label}, working through them in order.`,
    batch.hasExistingDrafts
      ? "Priority will be given to using the filled-in results of each chapter, and only the blank, vague and insufficiently executable parts will be corrected."
      : "Currently, these chapters are still blank. AI will first make up the first edition, and then wrap it up chapter by chapter according to the existing titles and abstracts.",
    "Chapter titles and abstracts will not be changed.",
    batch.missingCount > 0 ? `${batch.missingCount} chapters are no longer in the current volume draft and will be skipped.` : "",
  ].filter(Boolean).join("\n\n");
}

export async function runChapterDetailBatchGeneration({
  initialDraft,
  label,
  targetVolumeId,
  targets,
  setIsGenerating,
  setCurrentChapterId,
  setCurrentMode,
  setFailure,
  setStructuredMessage,
  generateChapterDetail,
}: RunChapterDetailBatchGenerationArgs): Promise<void> {
  let workingDraft = initialDraft;
  let processedModeCount = 0;
  setIsGenerating(true);
  setFailure(null);
  setCurrentMode("");
  setCurrentChapterId(targets[0]?.chapterId ?? "");
  setStructuredMessage(`Filling in missing chapter goals, production boundaries, and task lists for ${label}...`);

  try {
    for (const [targetIndex, target] of targets.entries()) {
      const missingModes = resolveMissingChapterDetailModes(workingDraft, targetVolumeId, target.chapterId);
      if (missingModes.length === 0) {
        continue;
      }
      setCurrentChapterId(target.chapterId);
      for (const mode of missingModes) {
        setCurrentMode(mode);
        try {
          const result = await generateChapterDetail({
            targetVolumeId,
            targetChapterId: target.chapterId,
            detailMode: mode,
            draftVolumesOverride: workingDraft,
            suppressSuccessMessage: true,
          });
          workingDraft = result.nextDocument.volumes;
          processedModeCount += 1;
        } catch (error) {
          const message = error instanceof Error ? error.message : "AI has not yet completed this refinement.";
          setFailure({
            targetVolumeId,
            targets: targets.slice(targetIndex),
            chapterId: target.chapterId,
            chapterOrder: target.chapterOrder,
            chapterTitle: target.title,
            mode,
            message,
          });
          setStructuredMessage(`Chapter ${target.chapterOrder} still needs its ${mode === "purpose" ? "chapter goal" : mode === "boundary" ? "production boundary" : "task list"}. You can continue refining it from here.`);
          return;
        }
      }
    }
    setStructuredMessage(
      processedModeCount > 0
        ? `${label}The chapter objectives, execution boundaries and task orders have been completed and automatically saved.`
        : `${label}It is now complete and there is no need to repeatedly generate chapter refinements.`,
    );
  } finally {
    setIsGenerating(false);
    setCurrentChapterId("");
    setCurrentMode("");
  }
}

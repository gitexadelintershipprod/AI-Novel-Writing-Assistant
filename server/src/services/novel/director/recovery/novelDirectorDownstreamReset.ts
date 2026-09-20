import { prisma } from "../../../../db/prisma";

export async function resetDirectorDownstreamChapterState(
  novelId: string,
  range: { startOrder: number; endOrder: number } | null,
): Promise<void> {
  if (!range) {
    return;
  }
  const chapterRows = await prisma.chapter.findMany({
    where: {
      novelId,
      order: {
        gte: range.startOrder,
        lte: range.endOrder,
      },
    },
    select: { id: true, content: true },
  });
  if (chapterRows.length === 0) {
    return;
  }
  // Reset only chapters that have not started writing. Chapters with prose must be kept in full — content, generation state,
  // and derived summaries / continuity facts / character timelines are context later chapters depend on.
  // Never clear them just because the run "returned to beats / chapter-split to fill detail".
  const chapterIds = chapterRows
    .filter((chapter) => !(typeof chapter.content === "string" && chapter.content.trim().length > 0))
    .map((chapter) => chapter.id);
  if (chapterIds.length === 0) {
    return;
  }
  await prisma.$transaction(async (tx) => {
    await tx.chapter.updateMany({
      where: { id: { in: chapterIds } },
      data: {
        content: "",
        generationState: "planned",
        chapterStatus: "unplanned",
        repairHistory: null,
        qualityScore: null,
        continuityScore: null,
        characterScore: null,
        pacingScore: null,
        riskFlags: null,
        hook: null,
      },
    });
    await tx.chapterSummary.deleteMany({ where: { novelId, chapterId: { in: chapterIds } } });
    await tx.consistencyFact.deleteMany({ where: { novelId, chapterId: { in: chapterIds } } });
    await tx.characterTimeline.deleteMany({ where: { novelId, chapterId: { in: chapterIds } } });
    await tx.characterCandidate.deleteMany({ where: { novelId, sourceChapterId: { in: chapterIds } } });
    await tx.characterFactionTrack.deleteMany({ where: { novelId, chapterId: { in: chapterIds } } });
    await tx.characterRelationStage.deleteMany({ where: { novelId, chapterId: { in: chapterIds } } });
    await tx.qualityReport.deleteMany({ where: { novelId, chapterId: { in: chapterIds } } });
    await tx.auditReport.deleteMany({ where: { novelId, chapterId: { in: chapterIds } } });
    await tx.stateChangeProposal.deleteMany({ where: { novelId, chapterId: { in: chapterIds } } });
    await tx.openConflict.deleteMany({ where: { novelId, chapterId: { in: chapterIds } } });
    await tx.storyStateSnapshot.deleteMany({ where: { novelId, sourceChapterId: { in: chapterIds } } });
  });
}

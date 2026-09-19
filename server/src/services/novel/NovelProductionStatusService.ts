import { prisma } from "../../db/prisma";
import {
  DirectorFactSummaryService,
  type DirectorFactBaseSummary,
} from "./director/projections/DirectorFactSummaryService";
import {
  ChapterExecutionProgressInspector,
  type ChapterExecutionProgressSummary,
} from "./director/runtime/ChapterExecutionProgressInspector";
import { parseStructuredOutline } from "./novelProductionHelpers";

export interface ProductionStatusStage {
  key: string;
  label: string;
  status: "pending" | "completed" | "running" | "blocked";
  detail: string | null;
}

export interface ProductionFactProgress {
  planningCompleted: number;
  planningTotal: number;
  planningPercent: number;
  plannedChapterCount: number;
  chapterCount: number;
  draftedChapterCount: number;
  reviewedChapterCount: number;
  approvedChapterCount: number;
  committedChapterCount: number;
  completedChapters: number;
  needsRepairChapters: number;
  currentChapterOrder: number | null;
  activeChapterOrder: number | null;
  chapterExecutionPercent: number;
  qualityRepairPercent: number;
  totalPercent: number;
  facts: {
    hasWorld: boolean;
    hasStoryMacro: boolean;
    hasBookContract: boolean;
    hasStoryBible: boolean;
    hasCharacters: boolean;
    characterCount: number;
    hasVolumeStrategy: boolean;
    volumeCount: number;
    hasChapterTaskSheets: boolean;
    syncedChapterCount: number;
  };
}

export interface ProductionRuntimeStatus {
  jobId: string | null;
  status: string | null;
  state: "idle" | "queued" | "running" | "succeeded" | "failed" | "cancelled" | "unknown";
  label: string;
  failureSummary: string | null;
  isActive: boolean;
  blocksFactProgress: false;
}

type ProductionChapterProgress = DirectorFactBaseSummary["chapterExecution"] | ChapterExecutionProgressSummary | null;

interface ProductionNovelWorldState {
  id: string;
  title: string | null;
  coverSummary: string | null;
  sourceWorldId: string | null;
  hasStructuredData: boolean;
  hasStorySlice: boolean;
}

export interface ProductionStatusResult {
  novelId: string;
  title: string;
  worldId: string | null;
  worldName: string | null;
  chapterCount: number;
  targetChapterCount: number;
  assetStages: ProductionStatusStage[];
  assetsReady: boolean;
  pipelineReady: boolean;
  pipelineJobId: string | null;
  pipelineStatus: string | null;
  failureSummary: string | null;
  recoveryHint: string | null;
  currentStage: string;
  summary: string;
  progressBasis: "facts";
  factProgress: ProductionFactProgress;
  runtimeStatus: ProductionRuntimeStatus;
}

export class NovelProductionStatusService {
  private readonly db: Pick<typeof prisma, "novel">;
  private readonly factSummaryService: Pick<DirectorFactSummaryService, "getBaseSummary"> | null;
  private readonly chapterInspector: Pick<ChapterExecutionProgressInspector, "inspectNovel"> | null;
  private readonly novelWorldReader: ((novelId: string) => Promise<ProductionNovelWorldState | null>) | null;

  constructor(input: {
    db?: Pick<typeof prisma, "novel">;
    factSummaryService?: Pick<DirectorFactSummaryService, "getBaseSummary">;
    chapterInspector?: Pick<ChapterExecutionProgressInspector, "inspectNovel">;
    novelWorldReader?: (novelId: string) => Promise<ProductionNovelWorldState | null>;
  } = {}) {
    this.db = input.db ?? prisma;
    this.factSummaryService = input.factSummaryService ?? null;
    this.chapterInspector = input.chapterInspector ?? null;
    this.novelWorldReader = input.novelWorldReader ?? null;
  }

  async getNovelProductionStatus(input: {
    novelId?: string;
    title?: string;
    targetChapterCount?: number;
  }): Promise<ProductionStatusResult> {
    const novel = input.novelId
      ? await this.db.novel.findUnique({
          where: { id: input.novelId },
          include: {
            world: { select: { id: true, name: true } },
            bible: true,
            characters: { select: { id: true } },
            chapters: { select: { id: true, order: true }, orderBy: { order: "asc" } },
            generationJobs: { orderBy: { createdAt: "desc" }, take: 1 },
          },
        })
      : await this.db.novel.findFirst({
          where: {
            title: {
              contains: input.title?.trim() ?? "",
            },
          },
          include: {
            world: { select: { id: true, name: true } },
            bible: true,
            characters: { select: { id: true } },
            chapters: { select: { id: true, order: true }, orderBy: { order: "asc" } },
            generationJobs: { orderBy: { createdAt: "desc" }, take: 1 },
          },
          orderBy: { updatedAt: "desc" },
        });
    if (!novel) {
      throw new Error("The current novel was not found.");
    }

    const [factSummary, inspectedChapterProgress] = await Promise.all([
      this.loadDirectorFactSummary(novel.id),
      this.inspectChapterProgress(novel.id),
    ]);
    const novelWorldState = await this.loadNovelWorldState(novel.id);
    const worldState = resolveProductionWorldState(novel, novelWorldState);
    const chapterProgress = factSummary?.chapterExecution ?? inspectedChapterProgress;
    const structuredOutlineChapters = novel.structuredOutline?.trim()
      ? parseStructuredOutline(novel.structuredOutline).length
      : 0;
    const plannedChapterCount = factSummary?.outline.plannedChapterCount
      && factSummary.outline.plannedChapterCount > 0
      ? factSummary.outline.plannedChapterCount
      : structuredOutlineChapters;
    const targetChapterCount = input.targetChapterCount
      ?? (plannedChapterCount > 0 ? plannedChapterCount : null)
      ?? (novel.chapters.length > 0 ? novel.chapters.length : null)
      ?? 20;
    const latestJob = novel.generationJobs[0] ?? null;
    const chapterCount = novel.chapters.length;
    const runtimeStatus = buildRuntimeStatus(latestJob);
    const factProgress = buildFactProgress({
      novel,
      factSummary,
      chapterProgress,
      targetChapterCount,
      structuredOutlineChapters,
      hasActiveWorld: worldState.hasWorld,
    });

    const assetStages: ProductionStatusStage[] = [
      { key: "novel_workspace", label: "Novel workspace", status: "completed", detail: `"${novel.title}"` },
      { key: "world", label: "This book's world", status: factProgress.facts.hasWorld ? "completed" : "pending", detail: worldState.worldName },
      { key: "story_macro", label: "Story planning", status: factProgress.facts.hasStoryMacro ? "completed" : "pending", detail: factProgress.facts.hasStoryMacro ? "Story plan is available" : null },
      { key: "book_contract", label: "Book Contract", status: factProgress.facts.hasBookContract ? "completed" : "pending", detail: factProgress.facts.hasBookContract ? "Book-level writing contract is available" : null },
      { key: "characters", label: "Core characters", status: factProgress.facts.hasCharacters ? "completed" : "pending", detail: factProgress.facts.characterCount > 0 ? `${factProgress.facts.characterCount} characters` : null },
      { key: "story_bible", label: "Novel bible", status: factProgress.facts.hasStoryBible || factProgress.facts.hasBookContract ? "completed" : "pending", detail: novel.bible?.mainPromise ?? novel.bible?.coreSetting ?? (factProgress.facts.hasBookContract ? "Book-level facts are available" : null) },
      { key: "volume_strategy", label: "Volume planning", status: factProgress.facts.hasVolumeStrategy ? "completed" : "pending", detail: factProgress.facts.volumeCount > 0 ? `${factProgress.facts.volumeCount} volume` : null },
      { key: "outline", label: "Story direction", status: novel.outline?.trim() || factProgress.facts.hasVolumeStrategy ? "completed" : "pending", detail: novel.outline?.trim() ? "Story direction generated" : (factProgress.facts.hasVolumeStrategy ? "Volume plan is available" : null) },
      { key: "structured_outline", label: "Structured outline", status: novel.structuredOutline?.trim() || factProgress.plannedChapterCount > 0 ? "completed" : "pending", detail: factProgress.plannedChapterCount > 0 ? `${factProgress.plannedChapterCount} chapters planned` : null },
      { key: "chapters", label: "Chapter task sheet", status: factProgress.facts.hasChapterTaskSheets ? "completed" : "pending", detail: chapterCount > 0 ? `${chapterCount}/${targetChapterCount} chapters` : null },
      {
        key: "chapter_drafts",
        label: "Chapter text",
        status: factProgress.draftedChapterCount >= targetChapterCount && targetChapterCount > 0
          ? "completed"
          : factProgress.draftedChapterCount > 0
            ? "running"
            : "pending",
        detail: `${factProgress.draftedChapterCount}/${targetChapterCount} chapters`,
      },
      {
        key: "quality_repair",
        label: "Review and repair",
        status: factProgress.needsRepairChapters > 0
          ? "blocked"
          : factProgress.reviewedChapterCount > 0
            ? "completed"
            : factProgress.draftedChapterCount > 0
              ? "running"
              : "pending",
        detail: factProgress.needsRepairChapters > 0
          ? `${factProgress.needsRepairChapters} chapters waiting for repair`
          : factProgress.reviewedChapterCount > 0
            ? `${factProgress.reviewedChapterCount} chapters reviewed`
            : null,
      },
      {
        key: "state_commit",
        label: "State commit",
        status: factProgress.committedChapterCount >= targetChapterCount && targetChapterCount > 0
          ? "completed"
          : factProgress.committedChapterCount > 0
            ? "running"
            : "pending",
        detail: factProgress.committedChapterCount > 0 ? `${factProgress.committedChapterCount}/${targetChapterCount} chapters` : null,
      },
      {
        key: "pipeline",
        label: "Background tasks",
        status: runtimeStatus.state === "running" || runtimeStatus.state === "queued"
          ? "running"
          : runtimeStatus.state === "succeeded"
            ? "completed"
            : runtimeStatus.state === "failed" || runtimeStatus.state === "cancelled"
              ? "blocked"
              : "pending",
        detail: runtimeStatus.status ? `Background status: ${runtimeStatus.status}` : null,
      },
    ];

    const planningAssetKeys = new Set([
      "novel_workspace",
      "world",
      "story_macro",
      "book_contract",
      "characters",
      "story_bible",
      "volume_strategy",
      "outline",
      "structured_outline",
      "chapters",
    ]);
    const assetsReady = assetStages
      .filter((stage) => planningAssetKeys.has(stage.key))
      .every((stage) => stage.status === "completed");
    const pipelineReady = assetsReady && factProgress.facts.hasChapterTaskSheets;

    const currentStage = resolveFactCurrentStage(factProgress, targetChapterCount);

    const failureSummary = runtimeStatus.failureSummary;
    const recoveryHint = buildRecoveryHint(factProgress, targetChapterCount, runtimeStatus, pipelineReady);
    const summary = buildSummary(novel.title, currentStage, factProgress, targetChapterCount, runtimeStatus);

    return {
      novelId: novel.id,
      title: novel.title,
      worldId: worldState.worldId,
      worldName: worldState.worldName,
      chapterCount,
      targetChapterCount,
      assetStages,
      assetsReady,
      pipelineReady,
      pipelineJobId: latestJob?.id ?? null,
      pipelineStatus: latestJob?.status ?? null,
      failureSummary,
      recoveryHint,
      currentStage,
      summary,
      progressBasis: "facts",
      factProgress,
      runtimeStatus,
    };
  }

  private async loadDirectorFactSummary(novelId: string): Promise<DirectorFactBaseSummary | null> {
    try {
      const factSummaryService = this.factSummaryService ?? new DirectorFactSummaryService();
      return await factSummaryService.getBaseSummary({
        taskId: "__novel_production_status__",
        novelId,
      });
    } catch {
      return null;
    }
  }

  private async inspectChapterProgress(novelId: string): Promise<ChapterExecutionProgressSummary | null> {
    try {
      const inspector = this.chapterInspector ?? new ChapterExecutionProgressInspector();
      return await inspector.inspectNovel(novelId);
    } catch {
      return null;
    }
  }

  private async loadNovelWorldState(novelId: string): Promise<ProductionNovelWorldState | null> {
    if (this.novelWorldReader) {
      return this.novelWorldReader(novelId);
    }
    const [row = null] = await prisma.$queryRaw<ProductionNovelWorldState[]>`
      SELECT
        "id",
        "title",
        "coverSummary",
        "sourceWorldId",
        CASE WHEN "structuredDataJson" IS NOT NULL AND length(trim("structuredDataJson")) > 0 THEN true ELSE false END AS "hasStructuredData",
        CASE WHEN "storySliceJson" IS NOT NULL AND length(trim("storySliceJson")) > 0 THEN true ELSE false END AS "hasStorySlice"
      FROM "NovelWorld"
      WHERE "novelId" = ${novelId}
      LIMIT 1
    `;
    return row;
  }
}

export const novelProductionStatusService = new NovelProductionStatusService();

function percent(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value * 100)));
}

function buildRuntimeStatus(job: {
  id: string;
  status: string;
  error?: string | null;
} | null): ProductionRuntimeStatus {
  const status = job?.status ?? null;
  const state = status === "queued"
    ? "queued"
    : status === "running"
      ? "running"
      : status === "succeeded"
        ? "succeeded"
        : status === "failed"
          ? "failed"
          : status === "cancelled"
            ? "cancelled"
            : status
              ? "unknown"
              : "idle";
  const label = state === "idle"
    ? "Background task has not started"
    : state === "queued"
      ? "Background task is queued"
      : state === "running"
        ? "Background task is running"
        : state === "succeeded"
          ? "Background task finished"
          : state === "failed"
            ? "Background task failed"
            : state === "cancelled"
              ? "Background task cancelled"
              : `Background status: ${status}`;
  return {
    jobId: job?.id ?? null,
    status,
    state,
    label,
    failureSummary: state === "failed" ? job?.error ?? "The background task failed." : null,
    isActive: state === "queued" || state === "running",
    blocksFactProgress: false,
  };
}

function buildFactProgress(input: {
  novel: {
    world: { id: string; name: string } | null;
    bible: { mainPromise?: string | null; coreSetting?: string | null } | null;
    characters: Array<{ id: string }>;
    chapters: Array<{ id: string; order: number }>;
  };
  factSummary: DirectorFactBaseSummary | null;
  chapterProgress: ProductionChapterProgress;
  targetChapterCount: number;
  structuredOutlineChapters: number;
  hasActiveWorld: boolean;
}): ProductionFactProgress {
  const factSummary = input.factSummary;
  const chapterProgress = input.chapterProgress;
  const characterCount = Math.max(input.novel.characters.length, factSummary?.book.characterCount ?? 0);
  const syncedChapterCount = Math.max(input.novel.chapters.length, factSummary?.outline.syncedChapterCount ?? 0);
  const plannedChapterCount = factSummary?.outline.plannedChapterCount
    && factSummary.outline.plannedChapterCount > 0
    ? factSummary.outline.plannedChapterCount
    : input.structuredOutlineChapters;
  const reviewedChapterCount = factSummary?.repair.reviewedChapterCount
    ?? chapterProgress?.chapters?.filter((chapter) => chapter.completedStages.includes("audit_completed")).length
    ?? 0;
  const committedChapterCount = factSummary?.repair.committedChapterCount
    ?? chapterProgress?.chapters?.filter((chapter) => chapter.completedStages.includes("chapter_state_committed")).length
    ?? 0;
  const facts = {
    hasWorld: input.hasActiveWorld,
    hasStoryMacro: Boolean(factSummary?.book.hasStoryMacro),
    hasBookContract: Boolean(factSummary?.book.hasBookContract),
    hasStoryBible: Boolean(input.novel.bible),
    hasCharacters: characterCount > 0,
    characterCount,
    hasVolumeStrategy: Boolean(factSummary?.outline.hasVolumeStrategy),
    volumeCount: factSummary?.outline.volumeCount ?? 0,
    hasChapterTaskSheets: syncedChapterCount > 0 && (
      Boolean(factSummary?.outline.chapterListReady)
      || Boolean(factSummary?.outline.chapterDetailReady)
      || input.novel.chapters.length > 0
    ),
    syncedChapterCount,
  };
  const planningChecks = [
    facts.hasWorld,
    facts.hasStoryMacro,
    facts.hasBookContract || facts.hasStoryBible,
    facts.hasCharacters,
    facts.hasVolumeStrategy || plannedChapterCount > 0,
    facts.hasChapterTaskSheets,
  ];
  const draftedChapterCount = chapterProgress?.draftedChapterCount ?? 0;
  const approvedChapterCount = chapterProgress?.approvedChapterCount ?? 0;
  const completedChapters = chapterProgress?.completedChapters ?? approvedChapterCount;
  const needsRepairChapters = chapterProgress?.needsRepairChapters ?? factSummary?.repair.needsRepairChapterCount ?? 0;
  const planningCompleted = planningChecks.filter(Boolean).length;
  const planningPercent = percent(planningCompleted / planningChecks.length);
  const chapterExecutionPercent = percent(chapterProgress?.ratio ?? (
    input.targetChapterCount > 0 ? draftedChapterCount / input.targetChapterCount : 0
  ));
  const qualityRepairPercent = draftedChapterCount === 0
    ? 0
    : percent((draftedChapterCount - needsRepairChapters) / draftedChapterCount);
  return {
    planningCompleted,
    planningTotal: planningChecks.length,
    planningPercent,
    plannedChapterCount,
    chapterCount: input.novel.chapters.length,
    draftedChapterCount,
    reviewedChapterCount,
    approvedChapterCount,
    committedChapterCount,
    completedChapters,
    needsRepairChapters,
    currentChapterOrder: chapterProgress?.currentChapterOrder ?? null,
    activeChapterOrder: chapterProgress?.activeChapterOrder ?? null,
    chapterExecutionPercent,
    qualityRepairPercent,
    totalPercent: Math.round((planningPercent * 0.35) + (chapterExecutionPercent * 0.5) + (qualityRepairPercent * 0.15)),
    facts,
  };
}

function resolveProductionWorldState(
  novel: { world: { id: string; name: string } | null },
  novelWorld: ProductionNovelWorldState | null,
): { hasWorld: boolean; worldId: string | null; worldName: string | null } {
  if (novelWorld && (novelWorld.hasStructuredData || novelWorld.hasStorySlice || novelWorld.title || novelWorld.coverSummary)) {
    return {
      hasWorld: true,
      worldId: novelWorld.sourceWorldId ?? novel.world?.id ?? null,
      worldName: novelWorld.title ?? novel.world?.name ?? novelWorld.coverSummary ?? "book world",
    };
  }
  return {
    hasWorld: Boolean(novel.world),
    worldId: novel.world?.id ?? null,
    worldName: novel.world?.name ?? null,
  };
}

function resolveFactCurrentStage(progress: ProductionFactProgress, targetChapterCount: number): string {
  if (!progress.facts.hasWorld) return "Waiting to generate the world";
  if (!progress.facts.hasStoryMacro) return "Waiting to generate the story plan";
  if (!progress.facts.hasBookContract && !progress.facts.hasStoryBible) return "Waiting to generate the book contract";
  if (!progress.facts.hasCharacters) return "Waiting to generate core characters";
  if (!progress.facts.hasVolumeStrategy && progress.plannedChapterCount === 0) return "Waiting to generate the volume plan";
  if (!progress.facts.hasChapterTaskSheets) return "Waiting to generate chapter task sheets";
  if (progress.draftedChapterCount === 0) return "Waiting to start chapter writing";
  if (progress.needsRepairChapters > 0) return "Quality repair is pending";
  if (targetChapterCount > 0 && progress.draftedChapterCount < targetChapterCount) return "Chapter text is being written";
  if (targetChapterCount > 0 && progress.committedChapterCount < targetChapterCount) return "State commit is still incomplete";
  return "Novel fact progress is ready to deliver";
}

function buildRecoveryHint(
  progress: ProductionFactProgress,
  targetChapterCount: number,
  runtimeStatus: ProductionRuntimeStatus,
  pipelineReady: boolean,
): string | null {
  if (!progress.facts.hasWorld) return "Generate the world first, then continue book planning.";
  if (!progress.facts.hasStoryMacro) return "Generate the story plan first to clarify the book's spine and promises.";
  if (!progress.facts.hasBookContract && !progress.facts.hasStoryBible) return "Generate the book contract first to lock reader promises and style bounds.";
  if (!progress.facts.hasCharacters) return "Generate core characters first, then move to volume planning and chapter task sheets.";
  if (!progress.facts.hasChapterTaskSheets) return "Generate chapter task sheets first, then start writing chapter text.";
  if (progress.needsRepairChapters > 0) return `Handle quality repair for ${progress.needsRepairChapters} chapters first, then continue later chapters.`;
  if (targetChapterCount > 0 && progress.draftedChapterCount < targetChapterCount) return `Continue writing from chapter ${progress.currentChapterOrder ?? progress.draftedChapterCount + 1}.`;
  if (runtimeStatus.state === "failed") return "The background failure does not affect facts already produced. You can continue from the current fact progress.";
  return pipelineReady ? null : "Fill in planning assets and chapter task sheets before continuing full production.";
}

function buildSummary(
  title: string,
  currentStage: string,
  progress: ProductionFactProgress,
  targetChapterCount: number,
  runtimeStatus: ProductionRuntimeStatus,
): string {
  const parts = [
    `"${title}" fact progress: ${currentStage}.`,
    `Planning ${progress.planningCompleted}/${progress.planningTotal} items, chapter text ${progress.draftedChapterCount}/${targetChapterCount} chapters.`,
  ];
  if (progress.needsRepairChapters > 0) {
    parts.push(`${progress.needsRepairChapters} chapters waiting for repair.`);
  }
  if (runtimeStatus.state !== "idle") {
    parts.push(`${runtimeStatus.label}.`);
  }
  if (runtimeStatus.failureSummary) {
    parts.push("Finished artifacts will not be lost because of this.");
  }
  return parts.join("");
}

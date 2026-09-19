import { randomUUID } from "node:crypto";
import type {
  AuditIssue,
  AuditReport,
  ChapterEditorDiagnosticCard,
  ChapterEditorMacroContext,
  ChapterEditorRecommendedTask,
  ChapterEditorWorkspaceResponse,
  StoryPlan,
  StoryStateSnapshot,
  VolumeChapterPlan,
  VolumePlan,
} from "@ai-novel/shared/types/novel";
import { runStructuredPrompt } from "../../../prompting/core/promptRunner";
import {
  chapterEditorWorkspaceDiagnosisPrompt,
  type ChapterEditorWorkspaceDiagnosisPromptInput,
} from "../../../prompting/prompts/novel/chapterEditor/workspaceDiagnosis.prompts";
import { NovelCoreService } from "../NovelCoreService";
import { NovelVolumeService } from "../volume/NovelVolumeService";
import {
  buildAnchorRangeFromParagraphBounds,
  buildCharacterStateSummary,
  buildMustKeepConstraints,
  buildPaceDirective,
  buildStyleSummary,
  buildWorldConstraintSummary,
  countEditorWords,
  findVolumeLocation,
  normalizeChapterContent,
  parseLooseTextList,
  splitParagraphsWithRanges,
  type ChapterEditorParagraph,
} from "./chapterEditorShared";

type LoadedWorkspaceNovel = NonNullable<Awaited<ReturnType<NovelCoreService["getNovelById"]>>>;

export interface ChapterEditorWorkspaceContext {
  novel: LoadedWorkspaceNovel;
  chapter: LoadedWorkspaceNovel["chapters"][number];
  chapterPlan: StoryPlan | null;
  auditReports: AuditReport[];
  latestStateSnapshot: StoryStateSnapshot | null;
  volumes: VolumePlan[];
  normalizedContent: string;
  paragraphs: ChapterEditorParagraph[];
  styleSummary: string;
  chapterSummary: string;
  openAuditIssues: AuditIssue[];
  macroContext: ChapterEditorMacroContext;
}

function toRoleLabel(planRole?: StoryPlan["planRole"] | null): string | null {
  return ({
    setup: "Establish the situation and expectation",
    progress: "Push the goal forward",
    pressure: "Raise pressure and difficulty",
    turn: "Create a turn or direction change",
    payoff: "Pay off earlier promises",
    cooldown: "Settle the aftermath and transition",
  } as Record<string, string | undefined>)[planRole ?? ""] ?? null;
}

function trimPromptText(text: string, maxLength = 260): string {
  const normalized = text.trim().replace(/\s+/g, " ");
  return normalized.length > maxLength ? `${normalized.slice(0, maxLength)}…` : normalized;
}

function buildBridgeLabel(chapter: { title?: string | null; expectation?: string | null; summary?: string | null } | null | undefined, fallback: string): string {
  if (!chapter) {
    return fallback;
  }
  const body = chapter.summary?.trim() || chapter.expectation?.trim() || chapter.title?.trim() || "";
  return body || fallback;
}

function buildVolumeChapterBridge(chapter: VolumeChapterPlan | null | undefined, fallback: string): string {
  if (!chapter) {
    return fallback;
  }
  return chapter.summary?.trim()
    || chapter.purpose?.trim()
    || chapter.endingState?.trim()
    || chapter.nextChapterEntryState?.trim()
    || chapter.title?.trim()
    || fallback;
}

function buildChapterSummary(chapter: LoadedWorkspaceNovel["chapters"][number], content: string): string {
  const chapterWithSummary = chapter as LoadedWorkspaceNovel["chapters"][number] & {
    chapterSummary?: { summary?: string | null } | null;
  };
  return chapterWithSummary.chapterSummary?.summary?.trim()
    || chapter.expectation?.trim()
    || content.slice(0, 180)
    || "No chapter summary yet.";
}

function buildActivePlotThreads(
  chapterPlan: StoryPlan | null,
  latestStateSnapshot: StoryStateSnapshot | null,
  volume: VolumePlan | null,
): string[] {
  const fromPlan = parseLooseTextList(chapterPlan?.mustAdvanceJson);
  const fromVolume = volume?.openPayoffs ?? [];
  const fromSnapshot = latestStateSnapshot?.foreshadowStates
    .filter((item) => item.status !== "paid_off")
    .map((item) => item.summary?.trim() || item.title?.trim() || "")
    .filter(Boolean) ?? [];
  return Array.from(new Set([
    ...fromPlan,
    ...fromVolume,
    ...fromSnapshot,
  ])).slice(0, 5);
}

function normalizeSnapshotDates(snapshot: Awaited<ReturnType<NovelCoreService["getLatestStateSnapshot"]>>): StoryStateSnapshot | null {
  if (!snapshot) {
    return null;
  }
  return {
    ...snapshot,
    createdAt: snapshot.createdAt instanceof Date ? snapshot.createdAt.toISOString() : snapshot.createdAt,
    updatedAt: snapshot.updatedAt instanceof Date ? snapshot.updatedAt.toISOString() : snapshot.updatedAt,
    characterStates: snapshot.characterStates.map((state) => ({
      ...state,
      createdAt: state.createdAt instanceof Date ? state.createdAt.toISOString() : state.createdAt,
      updatedAt: state.updatedAt instanceof Date ? state.updatedAt.toISOString() : state.updatedAt,
    })),
    relationStates: snapshot.relationStates.map((state) => ({
      ...state,
      createdAt: state.createdAt instanceof Date ? state.createdAt.toISOString() : state.createdAt,
      updatedAt: state.updatedAt instanceof Date ? state.updatedAt.toISOString() : state.updatedAt,
    })),
    informationStates: snapshot.informationStates.map((state) => ({
      ...state,
      createdAt: state.createdAt instanceof Date ? state.createdAt.toISOString() : state.createdAt,
      updatedAt: state.updatedAt instanceof Date ? state.updatedAt.toISOString() : state.updatedAt,
    })),
    foreshadowStates: snapshot.foreshadowStates.map((state) => ({
      ...state,
      createdAt: state.createdAt instanceof Date ? state.createdAt.toISOString() : state.createdAt,
      updatedAt: state.updatedAt instanceof Date ? state.updatedAt.toISOString() : state.updatedAt,
    })),
  };
}

function mapDiagnosticCard(
  card: {
    title: string;
    problemSummary: string;
    whyItMatters: string;
    recommendedAction: ChapterEditorDiagnosticCard["recommendedAction"];
    recommendedScope: ChapterEditorDiagnosticCard["recommendedScope"];
    paragraphStart?: number | null;
    paragraphEnd?: number | null;
    severity: ChapterEditorDiagnosticCard["severity"];
    sourceTags: string[];
  },
  paragraphs: ChapterEditorParagraph[],
): ChapterEditorDiagnosticCard {
  const start = card.paragraphStart ?? null;
  const end = card.paragraphEnd ?? start;
  return {
    id: randomUUID(),
    title: card.title,
    problemSummary: card.problemSummary,
    whyItMatters: card.whyItMatters,
    recommendedAction: card.recommendedAction,
    recommendedScope: card.recommendedScope,
    anchorRange: buildAnchorRangeFromParagraphBounds(paragraphs, start, end),
    paragraphLabel: start && end ? (start === end ? `P${start}` : `P${start}-P${end}`) : null,
    severity: card.severity,
    sourceTags: card.sourceTags,
  };
}

function mapRecommendedTask(
  task: {
    title: string;
    summary: string;
    recommendedAction: ChapterEditorRecommendedTask["recommendedAction"];
    recommendedScope: ChapterEditorRecommendedTask["recommendedScope"];
    paragraphStart?: number | null;
    paragraphEnd?: number | null;
  } | undefined,
  cards: ChapterEditorDiagnosticCard[],
  paragraphs: ChapterEditorParagraph[],
): ChapterEditorRecommendedTask | null {
  if (task) {
    const start = task.paragraphStart ?? null;
    const end = task.paragraphEnd ?? start;
    return {
      title: task.title,
      summary: task.summary,
      recommendedAction: task.recommendedAction,
      recommendedScope: task.recommendedScope,
      anchorRange: buildAnchorRangeFromParagraphBounds(paragraphs, start, end),
      paragraphLabel: start && end ? (start === end ? `P${start}` : `P${start}-P${end}`) : null,
    };
  }
  const firstCard = cards[0];
  if (!firstCard) {
    return null;
  }
  return {
    title: firstCard.title,
    summary: firstCard.whyItMatters,
    recommendedAction: firstCard.recommendedAction,
    recommendedScope: firstCard.recommendedScope,
    anchorRange: firstCard.anchorRange ?? null,
    paragraphLabel: firstCard.paragraphLabel ?? null,
  };
}

export class ChapterEditorWorkspaceService {
  constructor(
    private readonly core: NovelCoreService = new NovelCoreService(),
    private readonly volumeService: NovelVolumeService = new NovelVolumeService(),
    private readonly promptRunner: typeof runStructuredPrompt = runStructuredPrompt,
  ) {}

  async loadContext(novelId: string, chapterId: string): Promise<ChapterEditorWorkspaceContext> {
    const [novel, volumeWorkspace, chapterPlan, auditReports, latestStateSnapshotRaw] = await Promise.all([
      this.core.getNovelById(novelId),
      this.volumeService.getVolumes(novelId).catch(() => null),
      this.core.getChapterPlan(novelId, chapterId).catch(() => null),
      this.core.listChapterAuditReports(novelId, chapterId).catch(() => []),
      this.core.getLatestStateSnapshot(novelId).catch(() => null),
    ]);

    if (!novel) {
      throw new Error("The novel does not exist.");
    }

    const chapter = novel.chapters.find((item) => item.id === chapterId);
    if (!chapter) {
      throw new Error("The chapter does not exist.");
    }

    const latestStateSnapshot = normalizeSnapshotDates(latestStateSnapshotRaw);
    const normalizedContent = normalizeChapterContent(chapter.content ?? "");
    const paragraphs = splitParagraphsWithRanges(normalizedContent);
    const volumes = volumeWorkspace?.volumes ?? [];
    const location = findVolumeLocation(volumes, chapter.order);
    const volumeChapters = location.volume?.chapters.slice().sort((left, right) => left.chapterOrder - right.chapterOrder) ?? [];
    const currentVolumeChapter = volumeChapters.find((item) => item.chapterOrder === chapter.order) ?? null;
    const previousVolumeChapter = location.chapterIndex > 0 ? volumeChapters[location.chapterIndex - 1] ?? null : null;
    const nextVolumeChapter = location.chapterIndex >= 0 ? volumeChapters[location.chapterIndex + 1] ?? null : null;
    const previousChapter = novel.chapters.find((item) => item.order === chapter.order - 1) ?? null;
    const nextChapter = novel.chapters.find((item) => item.order === chapter.order + 1) ?? null;
    const styleSummary = buildStyleSummary(novel);
    const chapterSummary = buildChapterSummary(chapter, normalizedContent);
    const openAuditIssues = auditReports.flatMap((report) => report.issues.filter((issue) => issue.status === "open"));
    const activePlotThreads = buildActivePlotThreads(chapterPlan, latestStateSnapshot, location.volume);
    const chapterMission = chapterPlan?.objective?.trim()
      || currentVolumeChapter?.purpose?.trim()
      || currentVolumeChapter?.summary?.trim()
      || chapter.expectation?.trim()
      || "Current focus is keeping this chapter serving the volume advance.";
    const chapterRoleInVolume = currentVolumeChapter?.purpose?.trim()
      || toRoleLabel(chapterPlan?.planRole)
      || chapterPlan?.phaseLabel?.trim()
      || "Carry this chapter's advance role inside the volume.";
    const macroContext: ChapterEditorMacroContext = {
      chapterRoleInVolume,
      volumeTitle: location.volume?.title?.trim() || "Volume not identified",
      volumePositionLabel: location.volumePositionLabel,
      volumePhaseLabel: location.volumePhaseLabel,
      paceDirective: buildPaceDirective(location.volumePhaseLabel, novel.pacePreference),
      chapterMission,
      previousChapterBridge: buildVolumeChapterBridge(previousVolumeChapter, buildBridgeLabel(previousChapter, "There is no previous-chapter summary to pick up before this chapter.")),
      nextChapterBridge: buildVolumeChapterBridge(nextVolumeChapter, buildBridgeLabel(nextChapter, "There is no next-chapter summary to reference after this chapter.")),
      activePlotThreads: activePlotThreads.length > 0 ? activePlotThreads : ["No clear main-plot reminder was extracted."],
      characterStateSummary: buildCharacterStateSummary(latestStateSnapshot),
      worldConstraintSummary: buildWorldConstraintSummary(novel.world),
      mustKeepConstraints: buildMustKeepConstraints(novel.bookContract, chapterPlan),
    };

    return {
      novel,
      chapter,
      chapterPlan,
      auditReports,
      latestStateSnapshot,
      volumes,
      normalizedContent,
      paragraphs,
      styleSummary,
      chapterSummary,
      openAuditIssues,
      macroContext,
    };
  }

  async getWorkspace(novelId: string, chapterId: string): Promise<ChapterEditorWorkspaceResponse> {
    const context = await this.loadContext(novelId, chapterId);

    if (!context.normalizedContent.trim() || context.paragraphs.length === 0) {
      return {
        chapterMeta: {
          chapterId: context.chapter.id,
          order: context.chapter.order,
          title: context.chapter.title?.trim() || "Unnamed chapter",
          wordCount: countEditorWords(context.normalizedContent),
          openIssueCount: context.openAuditIssues.length,
          styleSummary: context.styleSummary || null,
          updatedAt: context.chapter.updatedAt instanceof Date ? context.chapter.updatedAt.toISOString() : context.chapter.updatedAt,
        },
        macroContext: context.macroContext,
        diagnosticCards: [],
        recommendedTask: null,
        refreshReason: "This chapter body is empty. Add text first, then let AI generate line-edit suggestions.",
      };
    }

    try {
      const result = await this.promptRunner({
        asset: chapterEditorWorkspaceDiagnosisPrompt,
        promptInput: {
          chapterTitle: `Chapter ${context.chapter.order} · ${context.chapter.title?.trim() || "Unnamed chapter"}`,
          chapterMission: context.macroContext.chapterMission,
          volumePositionLabel: context.macroContext.volumePositionLabel,
          volumePhaseLabel: context.macroContext.volumePhaseLabel,
          paceDirective: context.macroContext.paceDirective,
          previousChapterBridge: context.macroContext.previousChapterBridge,
          nextChapterBridge: context.macroContext.nextChapterBridge,
          activePlotThreads: context.macroContext.activePlotThreads,
          paragraphs: context.paragraphs.map((paragraph) => ({
            index: paragraph.index,
            text: trimPromptText(paragraph.text),
          })),
          openIssues: context.openAuditIssues.slice(0, 8).map((issue) => ({
            severity: issue.severity,
            auditType: issue.auditType,
            code: issue.code,
            evidence: trimPromptText(issue.evidence, 180),
            fixSuggestion: trimPromptText(issue.fixSuggestion, 180),
          })),
        } satisfies ChapterEditorWorkspaceDiagnosisPromptInput,
        options: {
          provider: "deepseek",
          temperature: 0.4,
        },
      });

      const diagnosticCards = result.output.cards.map((card) => mapDiagnosticCard(card, context.paragraphs));
      const recommendedTask = mapRecommendedTask(result.output.recommendedTask, diagnosticCards, context.paragraphs);

      return {
        chapterMeta: {
          chapterId: context.chapter.id,
          order: context.chapter.order,
          title: context.chapter.title?.trim() || "Unnamed chapter",
          wordCount: countEditorWords(context.normalizedContent),
          openIssueCount: context.openAuditIssues.length,
          styleSummary: context.styleSummary || null,
          updatedAt: context.chapter.updatedAt instanceof Date ? context.chapter.updatedAt.toISOString() : context.chapter.updatedAt,
        },
        macroContext: context.macroContext,
        diagnosticCards,
        recommendedTask,
        refreshReason: "Line-edit suggestions were generated from this chapter, its place in the volume, and open questions.",
      };
    } catch (error) {
      console.warn("Failed to generate chapter editor workspace diagnosis.", error);
      return {
        chapterMeta: {
          chapterId: context.chapter.id,
          order: context.chapter.order,
          title: context.chapter.title?.trim() || "Unnamed chapter",
          wordCount: countEditorWords(context.normalizedContent),
          openIssueCount: context.openAuditIssues.length,
          styleSummary: context.styleSummary || null,
          updatedAt: context.chapter.updatedAt instanceof Date ? context.chapter.updatedAt.toISOString() : context.chapter.updatedAt,
        },
        macroContext: context.macroContext,
        diagnosticCards: [],
        recommendedTask: null,
        refreshReason: "AI has not finished this chapter's diagnosis yet. You can still locate a passage yourself or tell AI how to change it.",
      };
    }
  }
}

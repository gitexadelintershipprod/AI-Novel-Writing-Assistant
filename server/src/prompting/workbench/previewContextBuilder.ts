import type { PrismaClient } from "@prisma/client";
import type { PromptAsset } from "../core/promptTypes";
import type { PromptExecutionContext } from "../context/types";
import { buildChapterPreviewBlocks } from "./auditPreviewContext";
import {
  asRecord,
  type PreviewChapterRow,
  type PreviewNovelRow,
} from "./previewContextSupport";
import { buildPreviewChapterWriteContext } from "./writerPreviewContext";
import {
  buildShortStoryWriterContextBlocks,
  parseWritingPlatformSnapshot,
  shortStoryProductionFoundationText,
} from "../../modules/novel/short-story/application/shortStoryPromptContext";
import type { CreationIntentInterpretation, ShortStoryPlanContract } from "@ai-novel/shared/types/creationStudio";
import { createContextBlock } from "../core/contextBudget";
import type { WritingPlatformSnapshot } from "@ai-novel/shared/types/writingPlatform";

type UnknownPromptAsset = PromptAsset<unknown, unknown, unknown>;
export type PromptWorkbenchPreviewDb = Pick<PrismaClient, "novel" | "chapter">;

function isAuditPreviewPrompt(asset: UnknownPromptAsset): boolean {
  return asset.id === "audit.chapter.full" || asset.id === "audit.chapter.light";
}

function isChapterWriterPreviewPrompt(asset: UnknownPromptAsset): boolean {
  return asset.id === "novel.chapter.writer";
}

function isShortStoryWriterPreviewPrompt(asset: UnknownPromptAsset): boolean {
  return asset.id === "novel.short_story.segment.write";
}

function hasExtraContextBlocks(context: PromptExecutionContext): boolean {
  return Array.isArray(asRecord(context.metadata)?.extraContextBlocks);
}

function hasChapterWriteContext(context: PromptExecutionContext): boolean {
  return Boolean(asRecord(asRecord(context.metadata)?.chapterWriteContext));
}

async function loadPreviewNovelAndChapter(input: {
  db: PromptWorkbenchPreviewDb;
  novelId: string;
  chapterId: string;
}): Promise<{ novel: PreviewNovelRow | null; chapter: PreviewChapterRow | null }> {
  const [novel, chapter] = await Promise.all([
    input.db.novel.findUnique({
      where: { id: input.novelId },
      select: {
        id: true,
        title: true,
        description: true,
        targetAudience: true,
        bookSellingPoint: true,
        first30ChapterPromise: true,
        narrativePov: true,
        pacePreference: true,
        emotionIntensity: true,
        styleTone: true,
        estimatedChapterCount: true,
        writingPlatformSnapshotJson: true,
        characters: {
          orderBy: { createdAt: "asc" },
          take: 12,
          select: {
            id: true,
            name: true,
            role: true,
            personality: true,
            background: true,
            development: true,
            identityLabel: true,
            factionLabel: true,
            stanceLabel: true,
            powerLevel: true,
            realm: true,
            currentLocation: true,
            availability: true,
            prohibitionsJson: true,
            currentState: true,
            currentGoal: true,
            appearance: true,
            physique: true,
            attireStyle: true,
            signatureDetail: true,
            voiceTexture: true,
            presenceImpression: true,
          },
        },
      },
    }) as Promise<PreviewNovelRow | null>,
    input.db.chapter.findFirst({
      where: { id: input.chapterId, novelId: input.novelId },
      select: {
        id: true,
        title: true,
        order: true,
        content: true,
        expectation: true,
        targetWordCount: true,
        conflictLevel: true,
        revealLevel: true,
        mustAvoid: true,
        taskSheet: true,
        sceneCards: true,
        hook: true,
      },
    }) as Promise<PreviewChapterRow | null>,
  ]);

  return { novel, chapter };
}

export async function prepareWorkbenchPreviewExecutionContext(input: {
  db: PromptWorkbenchPreviewDb;
  asset: UnknownPromptAsset;
  executionContext: PromptExecutionContext;
}): Promise<{
  executionContext: PromptExecutionContext;
  notes: string[];
}> {
  const { asset, db, executionContext } = input;
  if (isShortStoryWriterPreviewPrompt(asset)) {
    const novelId = executionContext.novelId?.trim();
    if (!novelId) return { executionContext, notes: [] };
    const novel = await db.novel.findUnique({
      where: { id: novelId },
      include: {
        genre: true,
        primaryStoryMode: true,
        secondaryStoryMode: true,
        shortStoryPlan: { include: { segments: { orderBy: { order: "asc" } } } },
        intentVersions: { where: { status: "active" }, orderBy: { version: "desc" }, take: 1 },
      },
    });
    const intentRow = novel?.intentVersions[0];
    const planRow = novel?.shortStoryPlan;
    if (!novel || !intentRow || !planRow) return { executionContext, notes: ["The selected novel has no usable short-story production context."] };
    const interpretation = JSON.parse(intentRow.structuredIntentJson) as CreationIntentInterpretation;
    const selectedId = (JSON.parse(intentRow.impactScopeJson || "{}") as { selectedDirectionId?: string }).selectedDirectionId;
    const direction = interpretation.directions.find((item) => item.id === selectedId) ?? interpretation.directions[0];
    const plan = JSON.parse(planRow.structureJson) as ShortStoryPlanContract;
    const row = planRow.segments.find((item) => item.status !== "completed") ?? planRow.segments[0];
    const segment = plan.segments.find((item) => item.order === row?.order) ?? plan.segments[0];
    if (!direction || !segment) return { executionContext, notes: ["The short-story plan has no internal segment available for preview."] };
    const earlier = planRow.segments.filter((item) => item.order < segment.order);
    const previousContentTail = earlier.map((item) => item.content).join("\n\n").slice(-1800);
    const blocks = buildShortStoryWriterContextBlocks({
      originalIdea: intentRow.originalExpression,
      understanding: interpretation.understanding,
      direction,
      plan,
      segment,
      previousContinuity: "Use completed segment prose as the continuity source.",
      previousContentTail,
      platform: parseWritingPlatformSnapshot(novel.writingPlatformSnapshotJson),
      bookStyle: novel.styleTone,
      productionFoundation: shortStoryProductionFoundationText(novel),
    });
    return {
      executionContext: { ...executionContext, metadata: { ...(executionContext.metadata ?? {}), extraContextBlocks: blocks } },
      notes: [`Built the real short-story preview from internal segment ${segment.order} of “${novel.title}”; the regular studio still hides technical segment structure.`],
    };
  }
  const supportsSelectedChapterContext = isAuditPreviewPrompt(asset) || isChapterWriterPreviewPrompt(asset);
  if (!supportsSelectedChapterContext) {
    return { executionContext, notes: [] };
  }
  if (isAuditPreviewPrompt(asset) && hasExtraContextBlocks(executionContext)) {
    return { executionContext, notes: [] };
  }
  if (isChapterWriterPreviewPrompt(asset) && hasChapterWriteContext(executionContext)) {
    return { executionContext, notes: [] };
  }

  const novelId = executionContext.novelId?.trim();
  const chapterId = executionContext.chapterId?.trim();
  if (!novelId || !chapterId) {
    return { executionContext, notes: [] };
  }

  const { novel, chapter } = await loadPreviewNovelAndChapter({ db, novelId, chapterId });
  if (!novel || !chapter) {
    return {
      executionContext,
      notes: ["The selected novel or chapter was not found; using a manual preview."],
    };
  }

  if (isAuditPreviewPrompt(asset)) {
    return {
      executionContext: {
        ...executionContext,
        metadata: {
          ...(executionContext.metadata ?? {}),
          extraContextBlocks: buildChapterPreviewBlocks({ novel, chapter }),
        },
      },
      notes: [
        `Built the book preview context from chapter ${chapter.order}, “${chapter.title || "Untitled chapter"}”, of “${novel.title}”.`,
        chapter.content?.trim() ? "" : "This chapter has no prose yet; the review preview uses its task and task sheet as context.",
      ].filter(Boolean),
    };
  }

  return {
    executionContext: {
      ...executionContext,
      metadata: {
        ...(executionContext.metadata ?? {}),
        chapterBlockMode: "full",
        chapterWriteContext: buildPreviewChapterWriteContext({ novel, chapter }),
        extraContextBlocks: [createContextBlock({
          id: "writing_platform",
          group: "writing_platform",
          priority: 105,
          required: true,
          content: (() => {
            if (!novel.writingPlatformSnapshotJson) return "Use the default Georgian serial-fiction writing profile.";
            try {
              const snapshot = JSON.parse(novel.writingPlatformSnapshotJson) as WritingPlatformSnapshot;
              return `${snapshot.label} (profile version ${snapshot.profileVersion}): ${snapshot.guidance.drafting}`;
            } catch { return "Use the default Georgian serial-fiction writing profile."; }
          })(),
        })],
      },
    },
    notes: [
      `Built the prose preview context from chapter ${chapter.order}, “${chapter.title || "Untitled chapter"}”, of “${novel.title}”.`,
      "The preview only reads novel and chapter data; it does not start prose generation or rewrite the chapter plan.",
    ],
  };
}

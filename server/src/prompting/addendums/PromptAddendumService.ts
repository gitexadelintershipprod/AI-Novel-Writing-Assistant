import { prisma } from "../../db/prisma";
import { createContextBlock } from "../core/contextBudget";
import type { PromptContextBlock } from "../core/promptTypes";
import { listRegisteredPromptAssets } from "../registry";

export type PromptAddendumScope = "global" | "novel";

export interface PromptAddendumView {
  id: string;
  scope: PromptAddendumScope;
  novelId?: string | null;
  promptId: string;
  title: string;
  content: string;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PromptAddendumInput {
  id?: string;
  scope: PromptAddendumScope;
  novelId?: string | null;
  promptId: string;
  title: string;
  content: string;
  enabled?: boolean;
}

export interface PromptAddendumFilter {
  promptId?: string;
  novelId?: string;
}

export const CUSTOM_ADDENDUM_CONTEXT_GROUP = "custom_addendum";

export const SUPPORTED_PROMPT_ADDENDUM_IDS = [
  "novel.chapter.writer",
  "audit.chapter.full",
  "audit.chapter.light",
  "novel.review.repair",
  "novel.review.patch",
] as const;

const SUPPORTED_PROMPT_ADDENDUM_ID_SET = new Set<string>(SUPPORTED_PROMPT_ADDENDUM_IDS);

const PROMPT_ADDENDUM_DESCRIPTIONS: Record<string, string> = {
  "novel.chapter.writer": "Generate chapter text based on chapter tasks, character status, world rules, and style constraints.",
  "audit.chapter.full": "Completely check chapter quality, output structured questions, ratings and repair suggestions.",
  "audit.chapter.light": "Quickly check whether a chapter is suitable to move forward and identify obvious risks.",
  "novel.review.repair": "Make the minimum necessary fixes to the entire chapter based on the review question and context.",
  "novel.review.patch": "Generate local patch plans based on review issues and prioritize reducing entire chapter rewrites.",
  "novel.review.chapter": "Conduct structured review of the chapter text for subsequent revision.",
  "novel.chapter.summary": "Condensate chapter text into trackable, reviewable chapter summaries.",
  "novel.chapter_editor.rewrite_candidates": "Generate candidate rewrites for the chapter editor.",
  "novel.chapter_editor.user_intent": "Understand the user's revision intention in the chapter editor.",
  "novel.chapter_editor.workspace_diagnosis": "Diagnoses the current paragraph and context status of the Chapter Editor.",
  "novel.director.workspace_analysis": "Analyze the automatic director workspace and determine the focus of next step.",
  "novel.director.manual_edit_impact": "Evaluate the impact of manual changes on the director's task and subsequent processes.",
  "planner.intent.parse": "Understand the user's natural language intentions and output executable planning intentions.",
};

const PROMPT_CATALOG_SHORT_DESCRIPTIONS: Record<string, string> = {
  "novel.chapter.writer": "Chapter text generation",
  "novel.short_story.segment.write": "Short text generation",
  "novel.short_story.full.audit": "Short full text review",
  "agent.runtime.fallback_answer": "Full reply at runtime",
  "agent.runtime.setup_guidance": "Creation setup guide",
  "agent.runtime.setup_ideation": "Creative inspiration and guidance",
  "drama.source.original_bundle": "Original short play material",
  "drama.source.text_bundle": "Adaptation of short play material",
  "drama.track.recommendation": "Recommended short drama track",
  "drama.source.supplement": "Supplementary materials for short plays",
  "drama.strategy": "Short play creation strategies",
  "drama.episodeOutline": "Short drama episode outline",
  "drama.episode.script": "Short play single episode script",
  "drama.episode.quality": "Short drama single episode review",
  "drama.episode.compliance": "Skit Compliance Check",
  "drama.episode.repair": "Short drama single episode repair",
  "drama.storyboard": "Short drama storyboard generation",
  "drama.video.prompt": "Short drama video prompt words",
  "comic.episodeOutline": "Comic episode outline",
  "comic.panelScript": "comic storyboard",
  "rag.contextual_chunk.prefix": "knowledge fragment context",
  "audit.chapter.full": "Complete chapter review",
  "audit.chapter.light": "Quick chapter review",
  "novel.review.repair": "Chapter whole chapter repair",
  "novel.review.patch": "Chapter partial patch",
  "novel.review.chapter": "Chapter text review",
  "novel.chapter.summary": "Chapter summary generation",
  "novel.chapter.acceptance_assessment": "Chapter Acceptance Assessment",
  "novel.chapter.artifact_delta.extract": "Chapter fact change extraction",
  "novel.chapter_editor.rewrite_candidates": "Chapter candidate rewrite",
  "novel.chapter_editor.user_intent": "Understanding the intention of revision",
  "novel.chapter_editor.workspace_diagnosis": "Chapter editing diagnostics",
  "novel.director.workspace_analysis": "Director workspace analysis",
  "novel.director.manual_edit_impact": "Manual change impact assessment",
  "novel.volume.strategy.critique": "Review of paper division strategies",
  "novel.volume.chapter_task_sheet_quality": "Chapter task list review",
  "novel.characterDynamics.chapterExtract": "Role relationship change extraction",
  "novel.character_resource.extract_updates": "Role resource change extraction",
  "novel.timeline.extractor": "Timeline extraction",
  "world.consistency.check": "Worldview consistency check",
  "world.import.extract": "World setting extraction",
  "planner.intent.parse": "Understanding planning intentions",
};

const MAX_TITLE_LENGTH = 80;
const MAX_CONTENT_LENGTH = 4000;

type PromptAddendumRecord = {
  id: string;
  scope: string;
  novelId: string | null;
  promptId: string;
  title: string;
  content: string;
  enabled: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export function isPromptAddendumSupported(promptId: string): boolean {
  return SUPPORTED_PROMPT_ADDENDUM_ID_SET.has(promptId);
}

export function getPromptAddendumScopeLabels(promptId: string): string[] {
  return isPromptAddendumSupported(promptId) ? ["overall situation", "single novel"] : [];
}

export function getPromptCatalogDescription(promptId: string, taskType?: string): string {
  const explicit = PROMPT_ADDENDUM_DESCRIPTIONS[promptId];
  if (explicit) {
    return explicit;
  }

  switch (taskType) {
    case "writer":
      return "Generate or rewrite text content for readers.";
    case "critical_review":
      return "Check content quality and output actionable review results.";
    case "repair":
      return "Fix existing content based on issues and constraints.";
    case "planner":
      return "Understand goals and produce structured planning results.";
    case "summary":
      return "Compress content to create easy-to-follow summaries.";
    default:
      return "Internal prompt words registered in the prompt word directory.";
  }
}

export function getPromptCatalogShortDescription(promptId: string, taskType?: string): string {
  const explicit = PROMPT_CATALOG_SHORT_DESCRIPTIONS[promptId];
  if (explicit) {
    return explicit;
  }

  switch (taskType) {
    case "chapter_drafting":
    case "writer":
      return "Text generation";
    case "chapter_review":
    case "review":
    case "light_review":
    case "critical_review":
      return "Content review";
    case "chapter_repair":
    case "repair":
      return "Content fix";
    case "outline_planning":
    case "planner":
      return "content planning";
    case "replan":
      return "Replan";
    case "state_resolution":
      return "Status judgment";
    case "summary_generation":
    case "summary":
      return "Content summary";
    case "fact_extraction":
      return "information extraction";
    case "chat":
      return "Conversation guidance";
    default:
      return "Common tasks";
  }
}

function toView(record: PromptAddendumRecord): PromptAddendumView {
  return {
    id: record.id,
    scope: record.scope as PromptAddendumScope,
    novelId: record.novelId,
    promptId: record.promptId,
    title: record.title,
    content: record.content,
    enabled: record.enabled,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  };
}

function assertSupportedPrompt(promptId: string): void {
  if (!isPromptAddendumSupported(promptId)) {
    throw new Error(`This prompt does not support custom addenda: ${promptId}`);
  }

  const hasRegisteredPrompt = listRegisteredPromptAssets().some((asset) => asset.id === promptId);
  if (!hasRegisteredPrompt) {
    throw new Error(`Prompt is not registered: ${promptId}`);
  }
}

function normalizeInput(input: PromptAddendumInput): PromptAddendumInput {
  const scope = input.scope;
  if (scope !== "global" && scope !== "novel") {
    throw new Error("Supplementary requirement scope can only be global or novel.");
  }

  const promptId = input.promptId.trim();
  assertSupportedPrompt(promptId);

  const title = input.title.trim();
  if (title.length === 0 || title.length > MAX_TITLE_LENGTH) {
    throw new Error(`The title must contain 1-${MAX_TITLE_LENGTH} characters.`);
  }

  const content = input.content.trim();
  if (content.length === 0 || content.length > MAX_CONTENT_LENGTH) {
    throw new Error(`The addendum must contain 1-${MAX_CONTENT_LENGTH} characters.`);
  }

  const novelId = scope === "novel" ? input.novelId?.trim() : null;
  if (scope === "novel" && !novelId) {
    throw new Error("Single novel supplemental request requires novelId.");
  }

  return {
    id: input.id?.trim() || undefined,
    scope,
    novelId,
    promptId,
    title,
    content,
    enabled: input.enabled ?? true,
  };
}

function isMissingPromptAddendumTableError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }
  return error.message.includes("PromptAddendum") && (
    error.message.includes("does not exist")
    || error.message.includes("no such table")
    || error.message.includes("Unknown table")
  );
}

export class PromptAddendumService {
  async list(filter: PromptAddendumFilter = {}): Promise<PromptAddendumView[]> {
    const promptId = filter.promptId?.trim();
    const novelId = filter.novelId?.trim();
    const rows = await prisma.promptAddendum.findMany({
      where: {
        ...(promptId ? { promptId } : {}),
        OR: novelId
          ? [
              { scope: "global", novelId: null },
              { scope: "novel", novelId },
            ]
          : [{ scope: "global", novelId: null }],
      },
      orderBy: [
        { scope: "asc" },
        { promptId: "asc" },
        { updatedAt: "desc" },
      ],
    });
    return rows.map(toView);
  }

  async save(input: PromptAddendumInput): Promise<PromptAddendumView> {
    const normalized = normalizeInput(input);

    if (normalized.scope === "novel" && normalized.novelId) {
      const novel = await prisma.novel.findUnique({
        where: { id: normalized.novelId },
        select: { id: true },
      });
      if (!novel) {
        throw new Error(`Novel does not exist: ${normalized.novelId}`);
      }
    }

    if (normalized.id) {
      const updated = await prisma.promptAddendum.update({
        where: { id: normalized.id },
        data: {
          scope: normalized.scope,
          novelId: normalized.novelId ?? null,
          promptId: normalized.promptId,
          title: normalized.title,
          content: normalized.content,
          enabled: normalized.enabled,
        },
      });
      return toView(updated);
    }

    const existing = await prisma.promptAddendum.findFirst({
      where: {
        scope: normalized.scope,
        novelId: normalized.novelId ?? null,
        promptId: normalized.promptId,
      },
      orderBy: { updatedAt: "desc" },
    });

    const row = existing
      ? await prisma.promptAddendum.update({
          where: { id: existing.id },
          data: {
            title: normalized.title,
            content: normalized.content,
            enabled: normalized.enabled,
          },
        })
      : await prisma.promptAddendum.create({
          data: {
            scope: normalized.scope,
            novelId: normalized.novelId ?? null,
            promptId: normalized.promptId,
            title: normalized.title,
            content: normalized.content,
            enabled: normalized.enabled,
          },
        });
    return toView(row);
  }

  async setEnabled(id: string, enabled: boolean): Promise<PromptAddendumView> {
    const row = await prisma.promptAddendum.update({
      where: { id },
      data: { enabled },
    });
    return toView(row);
  }

  async delete(id: string): Promise<void> {
    await prisma.promptAddendum.delete({
      where: { id },
    });
  }

  async resolveContextBlocks(input: {
    promptId: string;
    novelId?: string;
  }): Promise<PromptContextBlock[]> {
    if (!isPromptAddendumSupported(input.promptId)) {
      return [];
    }

    try {
      const rows = await prisma.promptAddendum.findMany({
        where: {
          promptId: input.promptId,
          enabled: true,
          OR: input.novelId
            ? [
                { scope: "global", novelId: null },
                { scope: "novel", novelId: input.novelId },
              ]
            : [{ scope: "global", novelId: null }],
        },
        orderBy: [
          { scope: "asc" },
          { updatedAt: "asc" },
        ],
      });

      return rows
        .filter((row) => row.content.trim().length > 0)
        .sort((left, right) => {
          const scopeOrder = (scope: string) => scope === "global" ? 0 : 1;
          return scopeOrder(left.scope) - scopeOrder(right.scope)
            || left.updatedAt.getTime() - right.updatedAt.getTime();
        })
        .map((row, index) => createContextBlock({
          id: `${CUSTOM_ADDENDUM_CONTEXT_GROUP}:${row.scope}:${row.id}`,
          group: CUSTOM_ADDENDUM_CONTEXT_GROUP,
          priority: row.scope === "global" ? 999 - index : 899 - index,
          required: true,
          allowSummary: true,
          content: [
            row.scope === "global" ? "[Global supplementary requirements]" : "[Supplementary requirements for this book]",
            row.title,
            row.content,
          ].join("\n"),
        }));
    } catch (error) {
      if (!isMissingPromptAddendumTableError(error)) {
        console.warn("[prompt.addendum] failed to resolve custom addendums", error);
      }
      return [];
    }
  }
}

export const promptAddendumService = new PromptAddendumService();

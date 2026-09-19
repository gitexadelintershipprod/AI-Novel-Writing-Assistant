import { prisma } from "../../db/prisma";
import type { AgentToolName } from "../types";
import type { AgentToolDefinition } from "./toolTypes";
import {
  buildPatchedContent,
  getChapter,
  makeDiffSummary,
  novelService,
} from "./shared";
import {
  applyChapterPatchInputSchema,
  applyChapterPatchOutputSchema,
  diffChapterPatchInputSchema,
  diffChapterPatchOutputSchema,
  previewPipelineRunInputSchema,
  previewPipelineRunOutputSchema,
  queuePipelineRunInputSchema,
  queuePipelineRunOutputSchema,
  saveChapterDraftInputSchema,
  saveChapterDraftOutputSchema,
} from "./writeToolSchemas";

export const writeToolDefinitions: Partial<
  Record<AgentToolName, AgentToolDefinition<Record<string, unknown>, Record<string, unknown>>>
> = {
  diff_chapter_patch: {
    name: "diff_chapter_patch",
    title: "Preview a chapter patch",
    description: "Preview the patch without saving it.",
    category: "inspect",
    riskLevel: "low",
    domainAgent: "NovelAgent",
    resourceScopes: ["novel", "chapter"],
    inputSchema: diffChapterPatchInputSchema,
    outputSchema: diffChapterPatchOutputSchema,
    execute: async (_context, rawInput) => {
      const input = diffChapterPatchInputSchema.parse(rawInput);
      const chapter = await getChapter(input.novelId, input.chapterId);
      const base = chapter.content ?? "";
      const patched = buildPatchedContent(base, input);
      return diffChapterPatchOutputSchema.parse({
        novelId: input.novelId,
        chapterId: input.chapterId,
        mode: input.mode,
        ...makeDiffSummary(base, patched),
      });
    },
  },
  save_chapter_draft: {
    name: "save_chapter_draft",
    title: "Save Chapter Draft",
    description: "Save the chapter draft. dryRun is supported.",
    category: "mutate",
    riskLevel: "medium",
    domainAgent: "NovelAgent",
    resourceScopes: ["novel", "chapter"],
    inputSchema: saveChapterDraftInputSchema,
    outputSchema: saveChapterDraftOutputSchema,
    execute: async (_context, rawInput) => {
      const input = saveChapterDraftInputSchema.parse(rawInput);
      await getChapter(input.novelId, input.chapterId);
      if (input.dryRun) {
        return saveChapterDraftOutputSchema.parse({
          novelId: input.novelId,
          chapterId: input.chapterId,
          contentLength: input.content.length,
          updatedAt: null,
          dryRun: true,
          summary: "dryRun: the chapter draft would be written, but it was not saved.",
        });
      }
      const updated = await novelService.updateChapter(input.novelId, input.chapterId, {
        content: input.content,
        ...(input.title ? { title: input.title } : {}),
      });
      return saveChapterDraftOutputSchema.parse({
        novelId: input.novelId,
        chapterId: updated.id,
        contentLength: (updated.content ?? "").length,
        updatedAt: updated.updatedAt.toISOString(),
        dryRun: false,
        summary: "The chapter draft was saved.",
      });
    },
  },
  apply_chapter_patch: {
    name: "apply_chapter_patch",
    title: "Apply a chapter patch",
    description: "Apply an incremental or overwrite revision to chapter text. Supports dryRun.",
    category: "mutate",
    riskLevel: "high",
    domainAgent: "NovelAgent",
    resourceScopes: ["novel", "chapter", "world"],
    approvalRequired: true,
    inputSchema: applyChapterPatchInputSchema,
    outputSchema: applyChapterPatchOutputSchema,
    execute: async (_context, rawInput) => {
      const input = applyChapterPatchInputSchema.parse(rawInput);
      const chapter = await getChapter(input.novelId, input.chapterId);
      const before = chapter.content ?? "";
      const after = buildPatchedContent(before, input);
      const diff = makeDiffSummary(before, after);
      if (input.dryRun) {
        return applyChapterPatchOutputSchema.parse({
          novelId: input.novelId,
          chapterId: input.chapterId,
          mode: input.mode,
          contentLength: after.length,
          updatedAt: null,
          dryRun: true,
          summary: `dryRun: ${diff.summary}`,
          beforePreview: diff.beforePreview,
          afterPreview: diff.afterPreview,
        });
      }
      const updated = await novelService.updateChapter(input.novelId, input.chapterId, {
        content: after,
      });
      return applyChapterPatchOutputSchema.parse({
        novelId: input.novelId,
        chapterId: updated.id,
        mode: input.mode,
        contentLength: (updated.content ?? "").length,
        updatedAt: updated.updatedAt.toISOString(),
        dryRun: false,
        summary: diff.summary,
        beforePreview: diff.beforePreview,
        afterPreview: diff.afterPreview,
      });
    },
  },
  preview_pipeline_run: {
    name: "preview_pipeline_run",
    title: "Preview the writing pipeline",
    description: "Preview the chapter range the pipeline would cover.",
    category: "inspect",
    riskLevel: "low",
    domainAgent: "NovelAgent",
    resourceScopes: ["novel", "chapter", "generation_job"],
    inputSchema: previewPipelineRunInputSchema,
    outputSchema: previewPipelineRunOutputSchema,
    execute: async (_context, rawInput) => {
      const input = previewPipelineRunInputSchema.parse(rawInput);
      if (input.startOrder > input.endOrder) {
        throw new Error("startOrder must be <= endOrder.");
      }
      const rows = await prisma.chapter.findMany({
        where: {
          novelId: input.novelId,
          order: { gte: input.startOrder, lte: input.endOrder },
        },
        orderBy: { order: "asc" },
        select: { id: true },
      });
      return previewPipelineRunOutputSchema.parse({
        novelId: input.novelId,
        startOrder: input.startOrder,
        endOrder: input.endOrder,
        chapterCount: rows.length,
        chapterIds: rows.map((item) => item.id),
      });
    },
  },
  queue_pipeline_run: {
    name: "queue_pipeline_run",
    title: "Start the writing pipeline",
    description: "Create a novel pipeline task. dryRun is supported.",
    category: "run",
    riskLevel: "high",
    domainAgent: "NovelAgent",
    resourceScopes: ["novel", "chapter", "generation_job", "task"],
    approvalRequired: true,
    inputSchema: queuePipelineRunInputSchema,
    outputSchema: queuePipelineRunOutputSchema,
    execute: async (context, rawInput) => {
      const input = queuePipelineRunInputSchema.parse(rawInput);
      if (input.startOrder > input.endOrder) {
        throw new Error("startOrder must be <= endOrder.");
      }
      if (input.dryRun) {
        return queuePipelineRunOutputSchema.parse({
          novelId: input.novelId,
          jobId: null,
          status: "preview_only",
          startOrder: input.startOrder,
          endOrder: input.endOrder,
          dryRun: true,
          summary: "dryRun: A pipeline task will be created but not actually saved.",
        });
      }
      const job = await novelService.startPipelineJob(input.novelId, {
        startOrder: input.startOrder,
        endOrder: input.endOrder,
        maxRetries: input.maxRetries,
        provider: context.provider,
        model: context.model,
        temperature: context.temperature,
      });
      return queuePipelineRunOutputSchema.parse({
        novelId: input.novelId,
        jobId: job.id,
        status: job.status,
        startOrder: job.startOrder,
        endOrder: job.endOrder,
        dryRun: false,
        summary: "The pipeline task was created.",
      });
    },
  },
};

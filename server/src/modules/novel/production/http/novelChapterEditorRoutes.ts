import type { Router } from "express";
import type { ApiResponse } from "@ai-novel/shared/types/api";
import { z } from "zod";
import { AppError } from "../../../../middleware/errorHandler";
import { validate } from "../../../../middleware/validate";
import type { NovelApplicationServices } from "../../../../services/novel/application/NovelApplicationContracts";

interface RegisterNovelChapterEditorRoutesInput {
  router: Router;
  novelService: Pick<NovelApplicationServices,
    | "getChapterEditorWorkspace"
    | "previewChapterAiRevision"
    | "previewChapterRewrite"
  >;
  chapterParamsSchema: z.ZodType<{ id: string; chapterId: string }>;
  rewritePreviewSchema: z.ZodTypeAny;
  aiRevisionPreviewSchema: z.ZodTypeAny;
  forwardBusinessError: (error: unknown, next: (err?: unknown) => void) => boolean;
}

export function registerNovelChapterEditorRoutes(input: RegisterNovelChapterEditorRoutesInput): void {
  const {
    router,
    novelService,
    chapterParamsSchema,
    rewritePreviewSchema,
    aiRevisionPreviewSchema,
    forwardBusinessError,
  } = input;

  router.get(
    "/:id/chapters/:chapterId/editor/workspace",
    validate({ params: chapterParamsSchema }),
    async (req, res, next) => {
      try {
        const { id, chapterId } = req.params as z.infer<typeof chapterParamsSchema>;
        const data = await novelService.getChapterEditorWorkspace(id, chapterId);
        res.status(200).json({
          success: true,
          data,
          message: "Chapter editor workspace loaded.",
        } satisfies ApiResponse<typeof data>);
      } catch (error) {
        if (forwardBusinessError(error, next)) {
          return;
        }
        if (error instanceof Error && ["The novel does not exist.", "The chapter does not exist."].includes(error.message)) {
          next(new AppError(error.message, 400));
          return;
        }
        next(error);
      }
    },
  );

  router.post(
    "/:id/chapters/:chapterId/editor/ai-revision-preview",
    validate({ params: chapterParamsSchema, body: aiRevisionPreviewSchema }),
    async (req, res, next) => {
      try {
        const { id, chapterId } = req.params as z.infer<typeof chapterParamsSchema>;
        const data = await novelService.previewChapterAiRevision(id, chapterId, req.body as any);
        res.status(200).json({
          success: true,
          data,
          message: "Chapter editor AI revision preview generated.",
        } satisfies ApiResponse<typeof data>);
      } catch (error) {
        if (forwardBusinessError(error, next)) {
          return;
        }
        if (
          error instanceof Error
          && [
            "The novel does not exist.",
            "The chapter does not exist.",
            "This chapter body is empty, so AI repair cannot start.",
            "Inline repair needs selected chapter text first.",
            "The selection range is invalid. Select it again and retry.",
            "The selected text cannot be empty.",
            "The selected text changed. Select it again and retry.",
            "First write how you want AI to revise it.",
            "AI did not return enough candidate versions. Please retry.",
          ].includes(error.message)
            || (error instanceof Error && (error.message.includes("整章修正当前限制为") || error.message.includes("Full-chapter repair is currently limited to")))
        ) {
          next(new AppError(error.message, 400));
          return;
        }
        next(error);
      }
    },
  );

  router.post(
    "/:id/chapters/:chapterId/editor/rewrite-preview",
    validate({ params: chapterParamsSchema, body: rewritePreviewSchema }),
    async (req, res, next) => {
      try {
        const { id, chapterId } = req.params as z.infer<typeof chapterParamsSchema>;
        const data = await novelService.previewChapterRewrite(id, chapterId, req.body as any);
        res.status(200).json({
          success: true,
          data,
          message: "Chapter editor rewrite preview generated.",
        } satisfies ApiResponse<typeof data>);
      } catch (error) {
        if (forwardBusinessError(error, next)) {
          return;
        }
        if (
          error instanceof Error
          && [
            "The novel does not exist.",
            "The chapter does not exist.",
            "This chapter body is empty, so a local rewrite cannot start.",
            "The selection range is invalid. Select it again and retry.",
            "The selected text cannot be empty.",
            "The selected text changed. Select it again and retry.",
            "AI did not return enough candidate versions. Please retry.",
          ].includes(error.message)
        ) {
          next(new AppError(error.message, 400));
          return;
        }
        next(error);
      }
    },
  );
}

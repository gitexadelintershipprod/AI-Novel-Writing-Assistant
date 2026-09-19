import type { Router } from "express";
import type { ApiResponse } from "@ai-novel/shared/types/api";
import { z } from "zod";
import { initSSE, streamToSSE, writeSSEFrame } from "../../../../llm/streaming";
import { validate } from "../../../../middleware/validate";
import type { WorldSkeletonGenerateInput } from "../../../../services/world/worldSkeletonGeneration";
import {
  inspirationSchema,
  libraryCreateSchema,
  libraryListQuerySchema,
  libraryUseParamsSchema,
  libraryUseSchema,
  requireWorldWizard,
  worldGenerateSchema,
  worldSkeletonGenerateSchema,
  worldRefineSchema,
  worldIdSchema,
  worldService,
} from "./worldHttpContext";
import { summarizeStructuredOutputFailure } from "../../../../llm/structuredInvoke";
import { AppError } from "../../../../middleware/errorHandler";

export function registerGenerationWorldRoutes(router: Router): void {
  router.get("/templates", requireWorldWizard, async (_req, res, next) => {
    try {
      const data = await worldService.getTemplates();
      res.status(200).json({
        success: true,
        data,
        message: "Templates loaded.",
      } satisfies ApiResponse<typeof data>);
    } catch (error) {
      next(error);
    }
  });

  router.post("/inspiration/analyze", requireWorldWizard, validate({ body: inspirationSchema }), async (req, res, next) => {
    try {
      const data = await worldService.analyzeInspiration(req.body as z.infer<typeof inspirationSchema>);
      res.status(200).json({
        success: true,
        data,
        message: "Inspiration analyzed.",
      } satisfies ApiResponse<typeof data>);
    } catch (error) {
      next(error);
    }
  });

  router.get("/library", requireWorldWizard, validate({ query: libraryListQuerySchema }), async (req, res, next) => {
    try {
      const query = libraryListQuerySchema.parse(req.query);
      const data = await worldService.listLibrary(query);
      res.status(200).json({
        success: true,
        data,
        message: "Library loaded.",
      } satisfies ApiResponse<typeof data>);
    } catch (error) {
      next(error);
    }
  });

  router.post("/library", requireWorldWizard, validate({ body: libraryCreateSchema }), async (req, res, next) => {
    try {
      const data = await worldService.createLibraryItem(req.body as z.infer<typeof libraryCreateSchema>);
      res.status(201).json({
        success: true,
        data,
        message: "Library item created.",
      } satisfies ApiResponse<typeof data>);
    } catch (error) {
      next(error);
    }
  });

  router.post(
    "/library/:libraryId/use",
    requireWorldWizard,
    validate({ params: libraryUseParamsSchema, body: libraryUseSchema }),
    async (req, res, next) => {
      try {
        const { libraryId } = req.params as z.infer<typeof libraryUseParamsSchema>;
        const data = await worldService.useLibraryItem(libraryId, req.body as z.infer<typeof libraryUseSchema>);
        res.status(200).json({
          success: true,
          data,
          message: "Library item used.",
        } satisfies ApiResponse<typeof data>);
      } catch (error) {
        next(error);
      }
    },
  );

  router.post("/generate", validate({ body: worldGenerateSchema }), async (req, res, next) => {
    try {
      const { stream, onDone } = await worldService.createWorldGenerateStream(
        req.body as z.infer<typeof worldGenerateSchema>,
      );
      await streamToSSE(res, stream, onDone);
    } catch (error) {
      next(error);
    }
  });

  router.post(
    "/skeleton/generate",
    requireWorldWizard,
    validate({ body: worldSkeletonGenerateSchema }),
    async (req, res, next) => {
      try {
        const data = await worldService.generateSkeleton(req.body as WorldSkeletonGenerateInput);
        res.status(200).json({
          success: true,
          data,
          message: "World skeleton generated.",
        } satisfies ApiResponse<typeof data>);
      } catch (error) {
        const failure = summarizeStructuredOutputFailure({ error, fallbackAvailable: false });
        if (["incomplete_json", "malformed_json", "schema_mismatch"].includes(failure.category)) {
          next(new AppError(
            "The world skeleton was not fully generated. Reduce the world scale and retry.",
            422,
            "Incomplete content was not saved. Try a smaller scale first; if it still fails, switch models and generate again.",
          ));
          return;
        }
        const message = error instanceof Error ? error.message : String(error);
        if (/timed?\s*out|timeout|超时/i.test(message)) {
          next(new AppError(
            "World-skeleton generation timed out. Reduce the world scale and retry.",
            504,
            "Unfinished content was not saved. If it still times out, switch models and generate again.",
          ));
          return;
        }
        next(error);
      }
    },
  );

  router.post(
    "/inspiration/analyze/stream",
    requireWorldWizard,
    validate({ body: inspirationSchema }),
    async (req, res) => {
      const runId = `world-inspiration-${Date.now()}`;
      const disposeHeartbeat = initSSE(res);
      const body = req.body as z.infer<typeof inspirationSchema>;
      const isReferenceMode = body.mode === "reference";

      try {
        writeSSEFrame(res, {
          type: "run_status",
          runId,
          status: "queued",
          message: isReferenceMode ? "Started analyzing the reference work" : "Started analyzing world inspiration",
        });

        const data = await worldService.analyzeInspiration(
          body,
          (message) => {
            writeSSEFrame(res, {
              type: "run_status",
              runId,
              status: "running",
              message,
            });
          },
        );

        writeSSEFrame(res, {
          type: "run_status",
          runId,
          status: "succeeded",
          message: isReferenceMode ? "The source-work anchor and adaptation direction were generated" : "Concept cards and attribute options were generated",
        });
        writeSSEFrame(res, {
          type: "done",
          fullContent: JSON.stringify(data),
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : "World-inspiration analysis failed.";
        writeSSEFrame(res, {
          type: "run_status",
          runId,
          status: "failed",
          message,
        });
        writeSSEFrame(res, {
          type: "error",
          error: message,
        });
      } finally {
        disposeHeartbeat();
        if (!res.writableEnded) {
          res.end();
        }
      }
    },
  );

  router.post("/:id/refine", validate({ params: worldIdSchema, body: worldRefineSchema }), async (req, res, next) => {
    try {
      const { id } = req.params as z.infer<typeof worldIdSchema>;
      const { stream, onDone } = await worldService.createRefineStream(
        id,
        req.body as z.infer<typeof worldRefineSchema>,
      );
      await streamToSSE(res, stream, onDone);
    } catch (error) {
      next(error);
    }
  });
}

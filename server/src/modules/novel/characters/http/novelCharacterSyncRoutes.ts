import type { Router } from "express";
import type { ApiResponse } from "@ai-novel/shared/types/api";
import {
  importBaseCharacterToNovelInputSchema,
  novelCharacterSaveToLibraryInputSchema,
} from "@ai-novel/shared/types/characterSync";
import { z } from "zod";
import { llmProviderSchema } from "../../../../llm/providerSchema";
import { validate } from "../../../../middleware/validate";
import { characterLibrarySyncService } from "../../../../services/character/CharacterLibrarySyncService";
import { CharacterDynamicsService } from "../../../../services/novel/dynamics/CharacterDynamicsService";

const characterParamsSchema = z.object({
  id: z.string().trim().min(1),
  charId: z.string().trim().min(1),
});

const proposalParamsSchema = z.object({
  id: z.string().trim().min(1),
  proposalId: z.string().trim().min(1),
});

const syncPreviewSchema = z.object({
  provider: llmProviderSchema.optional(),
  model: z.string().trim().optional(),
  temperature: z.number().min(0).max(2).optional(),
  userIntent: z.string().trim().max(1000).optional(),
}).default({});

interface RegisterNovelCharacterSyncRoutesInput {
  router: Router;
  idParamsSchema: z.ZodType<{ id: string }>;
}

export function registerNovelCharacterSyncRoutes(input: RegisterNovelCharacterSyncRoutesInput): void {
  const { router, idParamsSchema } = input;
  const characterDynamicsService = new CharacterDynamicsService();

  router.get(
    "/:id/character-library-links",
    validate({ params: idParamsSchema }),
    async (req, res, next) => {
      try {
        const { id } = req.params as z.infer<typeof idParamsSchema>;
        const data = await characterLibrarySyncService.listLinks(id);
        res.status(200).json({
          success: true,
          data,
          message: "Character-library references are available.",
        } satisfies ApiResponse<typeof data>);
      } catch (error) {
        next(error);
      }
    },
  );

  router.get(
    "/:id/character-sync-proposals",
    validate({ params: idParamsSchema }),
    async (req, res, next) => {
      try {
        const { id } = req.params as z.infer<typeof idParamsSchema>;
        const data = await characterLibrarySyncService.listProposals({ novelId: id });
        res.status(200).json({
          success: true,
          data,
          message: "Character-sync suggestions are available.",
        } satisfies ApiResponse<typeof data>);
      } catch (error) {
        next(error);
      }
    },
  );

  router.post(
    "/:id/characters/import-base-character",
    validate({ params: idParamsSchema, body: importBaseCharacterToNovelInputSchema }),
    async (req, res, next) => {
      try {
        const { id } = req.params as z.infer<typeof idParamsSchema>;
        const data = await characterLibrarySyncService.importBaseCharacterToNovel(id, req.body as any);
        await characterDynamicsService.rebuildDynamics(id, { sourceType: "rebuild_projection" }).catch(() => null);
        res.status(201).json({
          success: true,
          data,
          message: "The character is in this novel. You can keep setting book-specific state.",
        } satisfies ApiResponse<typeof data>);
      } catch (error) {
        next(error);
      }
    },
  );

  router.post(
    "/:id/characters/:charId/library-sync/export-preview",
    validate({ params: characterParamsSchema, body: syncPreviewSchema }),
    async (req, res, next) => {
      try {
        const { id, charId } = req.params as z.infer<typeof characterParamsSchema>;
        const body = syncPreviewSchema.parse(req.body);
        const data = await characterLibrarySyncService.previewNovelCharacterToLibrary({
          novelId: id,
          characterId: charId,
          provider: body.provider,
          model: body.model,
          temperature: body.temperature,
          userIntent: body.userIntent,
        });
        res.status(200).json({
          success: true,
          data,
          message: "Character-library save suggestions are available.",
        } satisfies ApiResponse<typeof data>);
      } catch (error) {
        next(error);
      }
    },
  );

  router.post(
    "/:id/characters/:charId/library-sync/save-to-library",
    validate({ params: characterParamsSchema, body: novelCharacterSaveToLibraryInputSchema }),
    async (req, res, next) => {
      try {
        const { id, charId } = req.params as z.infer<typeof characterParamsSchema>;
        const data = await characterLibrarySyncService.saveNovelCharacterToLibrary(id, charId, req.body as any);
        res.status(201).json({
          success: true,
          data,
          message: "The character is in the library. This novel keeps its own story state.",
        } satisfies ApiResponse<typeof data>);
      } catch (error) {
        next(error);
      }
    },
  );

  router.post(
    "/:id/character-sync-proposals/:proposalId/apply",
    validate({ params: proposalParamsSchema }),
    async (req, res, next) => {
      try {
        const { id, proposalId } = req.params as z.infer<typeof proposalParamsSchema>;
        const data = await characterLibrarySyncService.applyProposal(proposalId);
        await characterDynamicsService.rebuildDynamics(id, { sourceType: "rebuild_projection" }).catch(() => null);
        res.status(200).json({
          success: true,
          data,
          message: "The current range uses this character-sync suggestion.",
        } satisfies ApiResponse<typeof data>);
      } catch (error) {
        next(error);
      }
    },
  );

  router.post(
    "/:id/character-sync-proposals/:proposalId/ignore",
    validate({ params: proposalParamsSchema }),
    async (req, res, next) => {
      try {
        const { proposalId } = req.params as z.infer<typeof proposalParamsSchema>;
        const data = await characterLibrarySyncService.ignoreProposal(proposalId);
        res.status(200).json({
          success: true,
          data,
          message: "This novel's character settings stay the same.",
        } satisfies ApiResponse<typeof data>);
      } catch (error) {
        next(error);
      }
    },
  );
}

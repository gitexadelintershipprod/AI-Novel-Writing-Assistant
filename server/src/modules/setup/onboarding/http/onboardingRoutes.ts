import { Router } from "express";
import type { ApiResponse } from "@ai-novel/shared/types/api";
import type { CompleteQuickSetupRequest } from "@ai-novel/shared/types/onboarding";
import { z } from "zod";
import { authMiddleware } from "../../../../middleware/auth";
import { validate } from "../../../../middleware/validate";
import {
  completeQuickSetup,
  getQuickSetupStatus,
} from "../application/QuickSetupService";
import { getFirstNovelOnboardingProjection } from "../application/FirstNovelOnboardingService";

const router = Router();

const completeQuickSetupSchema = z.object({
  providerKind: z.enum(["builtin", "custom"]),
  provider: z.string().trim().min(1).optional(),
  customProviderName: z.string().trim().min(1).optional(),
  apiKey: z.string().trim().optional(),
  baseURL: z.string().trim().url("The API address format is incorrect.").optional(),
  model: z.string().trim().min(1, "Model name cannot be empty."),
});

router.use(authMiddleware);

router.get("/settings/quick-setup/status", async (_req, res, next) => {
  try {
    const data = await getQuickSetupStatus();
    res.status(200).json({
      success: true,
      data,
      message: data.readyForCreation ? "The authoring environment is available." : "You also need to complete the creation environment configuration.",
    } satisfies ApiResponse<typeof data>);
  } catch (error) {
    next(error);
  }
});

router.post(
  "/settings/quick-setup/complete",
  validate({ body: completeQuickSetupSchema }),
  async (req, res, next) => {
    try {
      const data = await completeQuickSetup(req.body as CompleteQuickSetupRequest);
      res.status(200).json({
        success: true,
        data,
        message: "The creative environment is configured and you can start writing novels.",
      } satisfies ApiResponse<typeof data>);
    } catch (error) {
      next(error);
    }
  },
);

router.get("/onboarding/first-novel", async (_req, res, next) => {
  try {
    const data = await getFirstNovelOnboardingProjection();
    res.status(200).json({
      success: true,
      data,
      message: "The progress of writing the first book has been updated.",
    } satisfies ApiResponse<typeof data>);
  } catch (error) {
    next(error);
  }
});

export default router;

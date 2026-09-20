import { z } from "zod";

export const novelCoreJsonObjectSchema = z
  .record(z.string(), z.unknown());

// NovelCoreService: character-evolution edit output
export const characterEvolutionOutputSchema = z
  .object({
    personality: z.string().trim().optional(),
    background: z.string().trim().optional(),
    development: z.string().trim().optional(),
    currentState: z.string().trim().optional(),
    currentGoal: z.string().trim().optional(),
  })
  .passthrough();

// NovelCoreService: character-setup audit output
export const characterWorldCheckOutputSchema = z
  .object({
    status: z.enum(["pass", "warn", "error"]).optional(),
    warnings: z.array(z.string().trim()).optional(),
    issues: z
      .array(
        z.object({
          severity: z.enum(["warn", "error"]),
          message: z.string().trim().min(1),
          suggestion: z.string().trim().optional(),
        }),
      )
      .optional(),
  })
  .passthrough();

// NovelBible / other work-bible JSON is usually normalized further by normalizeNovelBiblePayload.
export const novelBiblePayloadSchema = novelCoreJsonObjectSchema;


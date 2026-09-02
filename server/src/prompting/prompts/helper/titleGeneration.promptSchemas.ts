import { z } from "zod";
import {
  countGeorgianWords,
  countUnicodeCodePoints,
} from "@ai-novel/shared/utils/georgianTextMetrics";

export const titleSuggestionStyleSchema = z.enum([
  "literary",
  "conflict",
  "suspense",
  "high_concept",
]);

export const titleSuggestionHookTypeSchema = z.enum([
  "identity_gap",
  "abnormal_situation",
  "power_mutation",
  "rule_hook",
  "direct_conflict",
  "high_concept",
]);

export const rawTitleSuggestionSchema = z
  .object({
    title: z.string().trim().min(1).max(120),
    clickRate: z.number().min(35).max(99).optional(),
    score: z.number().min(35).max(99).optional(),
    style: titleSuggestionStyleSchema.optional(),
    hookType: titleSuggestionHookTypeSchema.optional(),
    angle: z.string().trim().min(2).max(120).optional(),
    coreSell: z.string().trim().min(2).max(120).optional(),
    reason: z.string().trim().min(4).max(320).optional(),
  })
  .passthrough()
  .superRefine((value, context) => {
    const titleWordCount = countGeorgianWords(value.title);
    if (titleWordCount < 1 || titleWordCount > 10 || countUnicodeCodePoints(value.title) > 80) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["title"],
        message: "A Georgian title must contain 1-10 words and no more than 80 Unicode code points.",
      });
    }
    if (value.clickRate === undefined && value.score === undefined) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["clickRate"],
        message: "Each title must include clickRate or score.",
      });
    }

    if (!value.style && !value.hookType) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["style"],
        message: "Each title must include style or hookType.",
      });
    }

    if (!value.angle && !value.coreSell) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["angle"],
        message: "Each title must include angle or coreSell.",
      });
    }
  });

export const titleGenerationRawOutputSchema = z.union([
  z.array(rawTitleSuggestionSchema),
  z.object({
    titles: z.array(rawTitleSuggestionSchema),
  }),
]);

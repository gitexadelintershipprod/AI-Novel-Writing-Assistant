import { z } from "zod";

/**
 * Concrete-fact categories from chapter prose (bridges Fact Ledger NovelFactCategory):
 * - completed: process goals / actions finished in this chapter
 * - revealed: information / secrets revealed in this chapter
 * - state_changed: changes to relationships / state / agreements / deal terms (for example "agreed with a village to screen a private showing for 3 yuan labor fee")
 */
export const chapterConcreteFactCategorySchema = z.enum([
  "completed",
  "revealed",
  "state_changed",
]);

export const chapterConcreteFactSchema = z.object({
  text: z.string().trim().min(1),
  category: chapterConcreteFactCategorySchema,
});

export const chapterSummaryOutputSchema = z.object({
  summary: z.string().trim().min(1),
  /**
   * Hard facts this chapter's prose produced on the fly, which later chapters must keep consistent:
   * protagonist promises, deal terms (amount/quantity/time/method), event nature (private/public),
   * key numbers, dates, and places. Once set, later prose must not contradict them.
   */
  concreteFacts: z.array(chapterConcreteFactSchema).max(12).optional(),
});

export type ChapterConcreteFact = z.infer<typeof chapterConcreteFactSchema>;
export type ChapterSummaryOutput = z.infer<typeof chapterSummaryOutputSchema>;


import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { z } from "zod";
import type { PromptAsset } from "../../core/promptTypes";

export const ragKnowledgeQueryRewriteOutputSchema = z.object({
  queries: z.array(z.string().min(1).max(180)).min(1).max(3),
});

export interface RagKnowledgeQueryRewriteInput {
  query: string;
}

export const ragKnowledgeQueryRewritePrompt: PromptAsset<
  RagKnowledgeQueryRewriteInput,
  z.infer<typeof ragKnowledgeQueryRewriteOutputSchema>
> = {
  id: "rag.knowledge_query.rewrite",
  version: "v1",
  taskType: "fact_extraction",
  mode: "structured",
  language: "ka",
  contextPolicy: {
    maxTokensBudget: 0,
  },
  repairPolicy: {
    maxAttempts: 1,
  },
  management: {
    productPrompt: true,
    editModes: ["readonly"],
  },
  structuredOutputHint: {
    example: {
      queries: ["forbidden palace intrigue", "empress household power"],
    },
    note: "Return only one JSON object with 1-3 short English search phrases for an English book corpus.",
  },
  outputSchema: ragKnowledgeQueryRewriteOutputSchema,
  render: (input) => [
    new SystemMessage([
      "You rewrite a Georgian novel-writing query into English search phrases for an English reference-book index.",
      "The phrases are used only to find similar passages. They are not shown to the author.",
      "",
      "Hard requirements:",
      "1. Output only a legal JSON object.",
      "2. queries must contain 1-3 short English phrases.",
      "3. Keep character names, place names, and distinctive terms when they help retrieval.",
      "4. Do not invent plot that is not in the query.",
      "5. Do not translate the whole chapter. Write search phrases only.",
    ].join("\n")),
    new HumanMessage(`query:\n${input.query}`),
  ],
  postValidate: (output) => ({
    queries: output.queries
      .map((item) => item.replace(/\s+/g, " ").trim())
      .filter(Boolean)
      .slice(0, 3),
  }),
};

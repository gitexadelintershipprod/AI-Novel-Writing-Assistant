import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { z } from "zod";
import type { PromptAsset } from "../../core/promptTypes";

export const ragKnowledgeGraphExtractOutputSchema = z.object({
  entities: z.array(z.object({
    name: z.string().min(1).max(120),
    type: z.enum(["person", "place", "theme", "technique"]),
  })).max(12),
  relations: z.array(z.object({
    from: z.string().min(1).max(120),
    to: z.string().min(1).max(120),
    type: z.string().min(1).max(80),
  })).max(16),
});

export interface RagKnowledgeGraphExtractInput {
  title: string;
  chunkOrder: number;
  chunkText: string;
}

export const ragKnowledgeGraphExtractPrompt: PromptAsset<
  RagKnowledgeGraphExtractInput,
  z.infer<typeof ragKnowledgeGraphExtractOutputSchema>
> = {
  id: "rag.knowledge_graph.extract",
  version: "v1",
  taskType: "fact_extraction",
  mode: "structured",
  language: "en",
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
      entities: [
        { name: "Elizabeth Bennet", type: "person" },
        { name: "Pemberley", type: "place" },
        { name: "free indirect style", type: "technique" },
      ],
      relations: [
        { from: "Elizabeth Bennet", to: "Pemberley", type: "visits" },
      ],
    },
    note: "Return only one JSON object. Names stay in English as they appear in the chunk.",
  },
  outputSchema: ragKnowledgeGraphExtractOutputSchema,
  render: (input) => [
    new SystemMessage([
      "You extract a small knowledge graph from one English book chunk for later retrieval.",
      "",
      "Hard requirements:",
      "1. Output only a legal JSON object.",
      "2. Entity types may only be person, place, theme, or technique.",
      "3. Use names as they appear in the chunk. Do not translate them.",
      "4. Extract only what the chunk states. Do not add plot from outside the chunk.",
      "5. Keep the graph small: at most 12 entities and 16 relations.",
    ].join("\n")),
    new HumanMessage([
      `title: ${input.title || "Untitled"}`,
      `chunkOrder: ${input.chunkOrder}`,
      "",
      "chunkText:",
      input.chunkText,
    ].join("\n")),
  ],
  postValidate: (output) => ({
    entities: output.entities
      .map((item) => ({
        name: item.name.replace(/\s+/g, " ").trim(),
        type: item.type,
      }))
      .filter((item) => item.name.length > 0)
      .slice(0, 12),
    relations: output.relations
      .map((item) => ({
        from: item.from.replace(/\s+/g, " ").trim(),
        to: item.to.replace(/\s+/g, " ").trim(),
        type: item.type.replace(/\s+/g, " ").trim(),
      }))
      .filter((item) => item.from && item.to && item.type)
      .slice(0, 16),
  }),
};

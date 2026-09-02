import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { z } from "zod";
import type { PromptAsset } from "../../core/promptTypes";
export const ragContextualChunkOutputSchema = z.object({
    contextPrefix: z.string().min(0).max(260),
});
export interface RagContextualChunkPromptInput {
    ownerType: string;
    ownerId: string;
    title: string;
    novelId: string;
    worldId: string;
    chunkOrder: number;
    metadataJson: string;
    chunkText: string;
}
export const ragContextualChunkPrompt: PromptAsset<RagContextualChunkPromptInput, z.infer<typeof ragContextualChunkOutputSchema>> = {
    id: "rag.contextual_chunk.prefix",
    version: "v2",
    taskType: "fact_extraction",
    mode: "structured",
    language: "ka",
    contextPolicy: {
        maxTokensBudget: 0,
    },
    repairPolicy: {
        maxAttempts: 1,
    },
    structuredOutputHint: {
        example: {
            contextPrefix: "This content comes from the character setting of \"Example Novel\", which explains that the protagonist Cheng Zhi holds the backdoor copper key and limits it to only explain backdoor access.",
        },
        note: "Return only one JSON object. contextPrefix uses 1-3 Georgian sentences to summarize this chunk's role in the novel, chapter, character, or knowledge document.",
    },
    outputSchema: ragContextualChunkOutputSchema,
    render: (input) => [
        new SystemMessage([
            "You are the contextual tagger for the novel RAG search index.",
            "Your task is to generate short contextual prefixes for individual text chunks that help search systems understand which novel, type of material, chapter or character the chunk belongs to, and its use for continuity retrieval.",
            "",
            "Hard requirements:",
            "1. Only output a legal JSON object, do not output Markdown, explanation or code blocks.",
            "2. contextPrefix must be 1-3 sentences in natural Georgian, with a maximum of 260 words.",
            "3. Can only be summarized based on the entered title, owner, metadata and chunk text. Plot facts that are not included in the input are not allowed.",
            "4. Prioritize writing positioning information that is helpful for retrieval: novel/world/chapter/character/knowledge document title, fact type, time or chapter anchor.",
            "5. Don\u2019t retell the entire text; only provide retrieval clues that would be missing if the chunks are taken out of context.",
        ].join("\n")),
        new HumanMessage([
            `ownerType: ${input.ownerType}`,
            `ownerId: ${input.ownerId}`,
            `title: ${input.title || "Unnamed"}`,
            `novelId: ${input.novelId || "None"}`,
            `worldId: ${input.worldId || "None"}`,
            `chunkOrder: ${input.chunkOrder}`,
            "",
            "metadataJson:",
            input.metadataJson || "{}",
            "",
            "chunkText:",
            input.chunkText,
        ].join("\n")),
    ],
    postValidate: (output) => ({
        contextPrefix: output.contextPrefix.trim().slice(0, 260),
    })
};

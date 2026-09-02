import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import type { PromptAsset, PromptContextBlock } from "../../core/promptTypes";
import { renderSelectedContextBlocks } from "../../core/renderContextBlocks";
import { characterInfluenceOptionsResponseSchema, type CharacterInfluenceOptionsResponse, } from "./characterInfluence.promptSchemas";
export interface CharacterInfluencePromptInput {
    mode: "generate" | "refine";
}
export const characterInfluenceOptionsPrompt: PromptAsset<CharacterInfluencePromptInput, CharacterInfluenceOptionsResponse> = {
    id: "novel.character.influence.options",
    version: "v2",
    taskType: "planner",
    mode: "structured",
    language: "ka",
    contextPolicy: {
        maxTokensBudget: 2600,
        requiredGroups: ["character_influence_target", "character_influence_mind", "character_influence_facts"],
        preferredGroups: ["character_influence_relations", "character_influence_resources", "character_influence_recent_events", "character_influence_author_intent"],
    },
    repairPolicy: { maxAttempts: 1 },
    outputSchema: characterInfluenceOptionsResponseSchema,
    render: (input, context) => [
        new SystemMessage([
            "You are a character impact proposal designer for a Georgian-language novel. Your job is to provide the author with ideas for what to do next, not to rewrite the novel's history or force the plot to happen.",
            "Only output valid JSON, no Markdown or explanations.",
            "All suggestions must be soft character behavioral tendencies that can be naturally inherited in future chapters, and can only be based on the input character's line of thought, official historical facts, relationships, resources, information boundaries, and recent events.",
            "It is strictly prohibited to add or rewrite identities, camps, resources, locations, events that have occurred, world rules or objective truth; it is not allowed to write the author's supplementary intentions, character guesses or hidden intentions as facts that have occurred.",
            "It is strictly forbidden to use one proposal to force a character's personality to change, force a relationship, force a relationship to flip, or skip the cost of conflict.",
            "Each proposal describes observable copywriting signals, reader returns, risks, and input evidence.",
            input.mode === "generate"
                ? "This time, please give 2 to 3 candidate proposals that have obvious trade-offs with each other, and only 1 can have isRecommended=true." : "This time, please reorganize the selected proposals according to the author's supplementary intention, output only 1 proposal, and set isRecommended=true.",
        ].join("\n")),
        new HumanMessage([
            "Please generate a role impact proposal based on the following layered context.",
            renderSelectedContextBlocks(context),
        ].join("\n\n")),
    ],
    postValidate: (output) => {
        const recommendedCount = output.proposals.filter((proposal) => proposal.isRecommended).length;
        if (recommendedCount !== 1) {
            throw new Error("Role impact proposals must have only one recommended solution.");
        }
        return output;
    }
};
export function buildCharacterInfluenceContextBlocks(input: {
    target: string;
    mind: string;
    facts: string;
    relations?: string;
    resources?: string;
    recentEvents?: string;
    authorIntent?: string;
}): PromptContextBlock[] {
    return [
        { id: "character_influence_target", group: "character_influence_target", priority: 100, required: true, estimatedTokens: 220, content: input.target },
        { id: "character_influence_mind", group: "character_influence_mind", priority: 99, required: true, estimatedTokens: 500, content: input.mind },
        { id: "character_influence_facts", group: "character_influence_facts", priority: 98, required: true, estimatedTokens: 720, content: input.facts },
        ...(input.relations ? [{ id: "character_influence_relations", group: "character_influence_relations", priority: 85, required: false, estimatedTokens: 380, content: input.relations }] : []),
        ...(input.resources ? [{ id: "character_influence_resources", group: "character_influence_resources", priority: 80, required: false, estimatedTokens: 360, content: input.resources }] : []),
        ...(input.recentEvents ? [{ id: "character_influence_recent_events", group: "character_influence_recent_events", priority: 75, required: false, estimatedTokens: 480, content: input.recentEvents }] : []),
        ...(input.authorIntent ? [{ id: "character_influence_author_intent", group: "character_influence_author_intent", priority: 97, required: true, estimatedTokens: 120, content: input.authorIntent }] : []),
    ];
}

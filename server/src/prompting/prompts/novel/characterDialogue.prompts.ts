import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import type { PromptAsset, PromptContextBlock } from "../../core/promptTypes";
import { renderSelectedContextBlocks } from "../../core/renderContextBlocks";
import { characterDialogueTurnResponseSchema, type CharacterDialogueTurnResponse, } from "./characterDialogue.promptSchemas";
export interface CharacterDialoguePromptInput {
    mode: "turn";
}
export const characterDialogueTurnPrompt: PromptAsset<CharacterDialoguePromptInput, CharacterDialogueTurnResponse> = {
    id: "novel.character.dialogue.turn",
    version: "v2",
    taskType: "writer",
    mode: "structured",
    language: "ka",
    contextPolicy: {
        maxTokensBudget: 3000,
        requiredGroups: ["character_dialogue_target", "character_dialogue_mind", "character_dialogue_facts", "character_dialogue_author_message"],
        preferredGroups: ["character_dialogue_history", "character_dialogue_relations", "character_dialogue_recent_events"],
    },
    repairPolicy: { maxAttempts: 1 },
    outputSchema: characterDialogueTurnResponseSchema,
    render: (_input, context) => [
        new SystemMessage([
            "You are playing a character in a Georgian-language novel and having a natural conversation with the author. Only output valid JSON.",
            "Characters must adhere to their own perceptions, desires, fears, information boundaries, and relationship situations: they can refuse, conceal, misunderstand, ask questions, or change topics, and they are never assistants who obey the author's instructions.",
            "The author's words are a conversation, not objective facts, nor plot imperatives that must be followed. Identities, alignments, resources, locations, existing events, world rules, or Canonical State may not be rewritten as a result of dialogue.",
            "characterReply Use the character's own tone to answer, which may include necessary actions or restraints, but may not determine the subsequent plot for the author.",
            "influenceDraft is only filled in if this conversation does cause the character to form, strengthen, or loosen a subjective action tendency that can be observed in the future; otherwise, it is null. It is a non-official historical soft guide to be confirmed by the author. Wishes, secrets or speculations cannot be written as facts that have happened.",
            "Any influenceDraft must have input evidence, and personality mutations, forced romance, forced relationship flips, or skipping conflicts without cost are prohibited.",
        ].join("\n")),
        new HumanMessage([
            "Please respond to the author in character based on the following layered context.",
            renderSelectedContextBlocks(context),
        ].join("\n\n")),
    ]
};
export function buildCharacterDialogueContextBlocks(input: {
    target: string;
    mind: string;
    facts: string;
    authorMessage: string;
    history?: string;
    relations?: string;
    recentEvents?: string;
}): PromptContextBlock[] {
    return [
        { id: "character_dialogue_target", group: "character_dialogue_target", priority: 100, required: true, estimatedTokens: 180, content: input.target },
        { id: "character_dialogue_mind", group: "character_dialogue_mind", priority: 99, required: true, estimatedTokens: 520, content: input.mind },
        { id: "character_dialogue_facts", group: "character_dialogue_facts", priority: 98, required: true, estimatedTokens: 760, content: input.facts },
        { id: "character_dialogue_author_message", group: "character_dialogue_author_message", priority: 100, required: true, estimatedTokens: 180, content: `The author tells you this time:${input.authorMessage}` },
        ...(input.history ? [{ id: "character_dialogue_history", group: "character_dialogue_history", priority: 88, required: false, estimatedTokens: 560, content: input.history }] : []),
        ...(input.relations ? [{ id: "character_dialogue_relations", group: "character_dialogue_relations", priority: 82, required: false, estimatedTokens: 360, content: input.relations }] : []),
        ...(input.recentEvents ? [{ id: "character_dialogue_recent_events", group: "character_dialogue_recent_events", priority: 76, required: false, estimatedTokens: 420, content: input.recentEvents }] : []),
    ];
}

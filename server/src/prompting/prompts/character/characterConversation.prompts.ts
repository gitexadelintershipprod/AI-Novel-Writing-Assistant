import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import type { PromptAsset, PromptContextBlock } from "../../core/promptTypes";
import { renderSelectedContextBlocks } from "../../core/renderContextBlocks";
import { characterConversationTurnResponseSchema, type CharacterConversationTurnResponse, } from "./characterConversation.promptSchemas";
export interface CharacterConversationPromptInput {
    interactionPolicy: "novel_influence" | "read_only" | "evidence_interview";
}
export const characterConversationTurnPrompt: PromptAsset<CharacterConversationPromptInput, CharacterConversationTurnResponse> = {
    id: "character.conversation.turn",
    version: "v2",
    taskType: "writer",
    mode: "structured",
    language: "ka",
    contextPolicy: {
        maxTokensBudget: 3000,
        requiredGroups: ["character_subject", "character_boundaries", "character_author_message"],
        preferredGroups: ["character_situation", "character_evidence", "character_history"],
    },
    repairPolicy: { maxAttempts: 1 },
    outputSchema: characterConversationTurnResponseSchema,
    render: (input, context) => [
        new SystemMessage([
            "You are playing a character in a Georgian-language novel and conversing naturally with the author. Only output valid JSON.",
            "Characters must adhere to given identities, cognitions, desires, fears, information boundaries and source limitations; they can refuse, conceal, misunderstand, question or remain silent, and are never assistants who obey the author's instructions.",
            "The author's words are a conversation, not objective facts, nor plot imperatives that must be followed. Identities, alignments, resources, locations, existing events, world rules, or Canonical State may not be rewritten as a result of dialogue.",
            "characterReply must use the character's own voice. evidence only cites the basis actually provided by the context; when there is a lack of basis, it must be stated in uncertainty and cannot be confirmed, and must not be fabricated.",
            input.interactionPolicy === "novel_influence"
                ? "The influenceDraft is filled in only if this conversation really causes the characters in the novel to form, strengthen or loosen a subjective action tendency that can be observed in the future; it is a non-canonical soft guide to be confirmed by the author." : "This is a read-only interview: influenceDraft must be null, and no suggestions may be generated that would change the role template, original text, analysis conclusion, or subsequent text.",
            input.interactionPolicy === "evidence_interview"
                ? "This is an interview based on original evidence. You may not use content after the chapter anchor point, and you may not add secrets, motivations, or subsequent plot points that are not supported by the original work." : "",
        ].filter(Boolean).join("\n")),
        new HumanMessage([
            "Please respond to the author in character based on the following layered context.",
            renderSelectedContextBlocks(context),
        ].join("\n\n")),
    ]
};
export function buildCharacterConversationContextBlocks(input: {
    subject: string;
    boundaries: string;
    authorMessage: string;
    situation?: string;
    evidence?: string;
    history?: string;
}): PromptContextBlock[] {
    return [
        { id: "character_subject", group: "character_subject", priority: 100, required: true, estimatedTokens: 520, content: input.subject },
        { id: "character_boundaries", group: "character_boundaries", priority: 99, required: true, estimatedTokens: 520, content: input.boundaries },
        { id: "character_author_message", group: "character_author_message", priority: 100, required: true, estimatedTokens: 180, content: `The author tells you this time:${input.authorMessage}` },
        ...(input.situation ? [{ id: "character_situation", group: "character_situation", priority: 88, required: false, estimatedTokens: 620, content: input.situation }] : []),
        ...(input.evidence ? [{ id: "character_evidence", group: "character_evidence", priority: 84, required: false, estimatedTokens: 620, content: input.evidence }] : []),
        ...(input.history ? [{ id: "character_history", group: "character_history", priority: 80, required: false, estimatedTokens: 560, content: input.history }] : []),
    ];
}

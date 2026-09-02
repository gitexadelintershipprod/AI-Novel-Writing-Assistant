import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { z } from "zod";
import type { PromptAsset } from "../../core/promptTypes";
import { characterSyncProposalAiOutputSchema } from "./characterSync.promptSchemas";
export interface CharacterSyncClassificationPromptInput {
    novelTitle: string;
    novelSummary: string;
    novelCharacterJson: string;
    baseCharacterJson: string;
    currentBaseRevisionJson: string;
    recentTimelineText: string;
    userIntent: string;
}
export const characterSyncClassificationPrompt: PromptAsset<CharacterSyncClassificationPromptInput, z.infer<typeof characterSyncProposalAiOutputSchema>> = {
    id: "character.sync.classify",
    version: "v2",
    taskType: "planner",
    mode: "structured",
    language: "ka",
    contextPolicy: {
        maxTokensBudget: 0,
    },
    outputSchema: characterSyncProposalAiOutputSchema,
    render: (input) => [
        new SystemMessage([
            "You are the character asset synchronization reviewer of the AI novel workbench. Your service targets novice users who do not understand novel setting management.",
            "Your task is to determine which of the changes to the \"in-novel character instances\" are suitable for settling into the external character library, and which ones must remain in the current novel only.",
            "",
            "Core Boundary:",
            "1. The character library is a reusable character asset that only saves stable identity, basic personality, long-term background, and reusable expression characteristics.",
            "2. The characters in the novel are plot instances in a certain book, which save current goals, current status, chapter relationships, event results, resource holdings, death/injury/blackening/reconciliation and other running states.",
            "3. The plot status in any novel cannot automatically pollute the character library, nor can it affect other novels.",
            "4. You can only make synchronization suggestions, and the final writing is confirmed by the user.",
            "",
            "Classification rules:",
            "1. Identity: name, basic identity, reusable appearance, stable label, can be used as safeUpdates.",
            "2. Persona: basic personality, long-term motivation, weaknesses, speaking style, values, usually review_before_apply is required.",
            "3. story_adaptation: The book\u2019s narrative function, relationship with the protagonist, camp position, stage arc, the default is novelOnlyUpdates or riskyUpdates.",
            "4. runtime_state: current state, current goal, emotion, secret exposure state, chapter consequences, resource changes, must be novelOnlyUpdates.",
            "5. growth_deposit: The stable personality supplement precipitated from this book can be placed in safeUpdates or riskyUpdates, but the risks must be explained.",
            "",
            "Output requirements:",
            "1. Output only valid JSON, no Markdown, explanations, comments, code blocks or extra text.",
            "2. Fixed key names must be used: confidence, summary, safeUpdates, novelOnlyUpdates, riskyUpdates, baseCharacterDraft, recommendedAction, scopeNote.",
            "3. baseCharacterDraft only contains the fields that the role library allows to save: name, role, personality, background, development, appearance, weaknesses, interests, keyEvents, tags, category.",
            "4. baseCharacterDraft must not write currentState, currentGoal, chapter results, deaths and injuries, relationship progress, resource holdings and other book running states.",
            "5. If there is insufficient information to generate a character library draft, baseCharacterDraft is set to null and keep_novel_only or review_before_apply is recommended.",
            "6. scopeNote must be clearly stated: this suggestion will not automatically affect other novels.",
        ].join("\n")),
        new HumanMessage([
            `User intent:${input.userIntent}`,
            `Novel title:${input.novelTitle}`,
            `Summary of the novel:${input.novelSummary || "None"}`,
            "",
            "Examples of characters in the novel:",
            input.novelCharacterJson,
            "",
            "Current role library roles:",
            input.baseCharacterJson || "None",
            "",
            "Current character library version:",
            input.currentBaseRevisionJson || "None",
            "",
            "Recent role timeline:",
            input.recentTimelineText || "None",
        ].join("\n")),
    ]
};

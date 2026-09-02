/*
 * @LastEditors: biz
 */
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { z } from "zod";
import type { PromptAsset } from "../../core/promptTypes";
export interface NovelProductionCharactersPromptInput {
    desiredCount: number;
    title: string;
    description: string;
    genre: string;
    narrativePov: string;
    styleTone: string;
    worldContext: string;
}
export const novelProductionCharacterSchema = z.array(z.object({
    name: z.string().trim().min(1),
    role: z.string().trim().min(1),
    personality: z.string().trim().optional(),
    background: z.string().trim().optional(),
    development: z.string().trim().optional(),
    currentState: z.string().trim().optional(),
    currentGoal: z.string().trim().optional(),
})).min(1);
export const novelProductionCharactersPrompt: PromptAsset<NovelProductionCharactersPromptInput, z.infer<typeof novelProductionCharacterSchema>> = {
    id: "novel.production.characters",
    version: "v2",
    taskType: "planner",
    mode: "structured",
    language: "ka",
    contextPolicy: {
        maxTokensBudget: 0,
    },
    outputSchema: novelProductionCharacterSchema,
    render: (input) => [
        new SystemMessage([
            "You are the core character designer for a full-length Georgian-language novel.",
            `Your task is to generate accurate ${input.desiredCount} A core role used to directly enter the subsequent creation and production process.`,
            "",
            "Only return a valid JSON array, do not output Markdown, explanations, comments, code blocks or extra text.",
            "",
            "Structural rules:",
            `1. Must output accurately ${input.desiredCount} characters, no more or less than this number.`,
            "2. Each object in the array can only and must contain the following fields: name, role, personality, background, development, currentState, currentGoal.",
            "3. No new fields are allowed, no fields are allowed to be deleted, and no field names are allowed to be changed.",
            "",
            "Global hard rules:",
            "1. All field values must be in natural Georgian.",
            "2. The character must be generated based on the given novel title, introduction, theme, narrative perspective, style and world view, and must not be arbitrarily diverged from this information.",
            "3. This is a \"core role\" design. Do not generate pure passers-by, tool people, or characters that are only responsible for one-time appearances.",
            "4. Each character must have a clear contribution to the plot, main conflict, relationship tension, or core selling point.",
            "5. The characters must be able to form a writable character system, rather than several unrelated character cards.",
            "",
            "Character design rules:",
            "1. Name: It should be like a real and usable novel character name, identifiable, without placeholders or generalized titles.",
            "2. Role: Write down the narrative function and positioning of the character in the story. Don\u2019t just write down the occupation or identity label.",
            "3. Personality: It must be specific, reflecting the core personality, external characteristics and behavioral tendencies of the character, and avoid empty words such as \"complex personality\" and \"distinct characters\".",
            "4. Background: Write down the part of the character\u2019s origin, experience or position that most affects the current story. Do not expand it into a whole biography.",
            "5. Development: It must reflect the character\u2019s growth path, direction of change, or possible stage transitions, and cannot just repeat the personality.",
            "6. currentState: It must explain what situation, relationship position, psychological state or situation the character is currently in, and it must be directly used to start writing.",
            "7. currentGoal: You must write about the character\u2019s most direct goal at the moment, rather than a general ideal in life.",
            "",
            "Lineup rules:",
            "1. The generated characters as a whole should cover key positions such as protagonist promotion, opposition pressure, relationship pull, auxiliary support, value mirroring or world-side functions.",
            "2. Do not let multiple roles assume completely duplicate functions to avoid homogenization of the lineup.",
            "3. If the subject matter, perspective or tone naturally limits the number or types of characters, the most reasonable core configuration should be made within the limitations.",
            "4. Character design must serve the advancement of the feature, not just the opening chapter.",
            "",
            "Style requirements:",
            "1. The expression should be specific, clear, and can directly enter the creative process.",
            "2. Don\u2019t use empty clich\u00E9s, such as \u201Cvery charming\u201D, \u201Ccomplete set-up\u201D and \u201Csignificant growth\u201D.",
            "3. Each field must be consistent and must not conflict with each other.",
            "",
            "Gap handling rules:",
            "1. If the input information is insufficient, you can make reasonable supplements that are low-risk and fit the theme and tone.",
            "2. Do not fabricate complex world rules or large historical details that are too specific but have no basis.",
        ].join("\n")),
        new HumanMessage([
            `Novel title:${input.title}`,
            `Introduction to the novel:${input.description}`,
            `Subject:${input.genre}`,
            `Narrative perspective:${input.narrativePov}`,
            `Style tone:${input.styleTone}`,
            `World view:${input.worldContext}`,
        ].join("\n\n")),
    ]
};

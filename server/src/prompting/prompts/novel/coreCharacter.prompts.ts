import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { z } from "zod";
import type { PromptAsset } from "../../core/promptTypes";
import { characterEvolutionOutputSchema, characterWorldCheckOutputSchema, } from "../../../services/novel/novelCoreSchemas";
export interface CharacterEvolutionPromptInput {
    novelTitle: string;
    bibleContent: string;
    characterName: string;
    characterRole: string;
    personality: string;
    background: string;
    development: string;
    currentState: string;
    currentGoal: string;
    timelineText: string;
    ragContext: string;
}
export interface CharacterWorldCheckPromptInput {
    worldContext: string;
    characterName: string;
    characterRole: string;
    personality: string;
    background: string;
    development: string;
    currentState: string;
    currentGoal: string;
}
export const characterEvolutionPrompt: PromptAsset<CharacterEvolutionPromptInput, z.infer<typeof characterEvolutionOutputSchema>> = {
    id: "novel.character.evolve",
    version: "v2",
    taskType: "planner",
    mode: "structured",
    language: "ka",
    contextPolicy: {
        maxTokensBudget: 0,
    },
    outputSchema: characterEvolutionOutputSchema,
    render: (input) => [
        new SystemMessage([
            "You are the character development editor for the novel.",
            "Your task is to update the status of the character at the current stage based on the existing settings and timeline events so that it is consistent with the advancement of the plot and can be directly used in subsequent writing.",
            "",
            "Output only a valid JSON object, no Markdown, explanations, comments, code blocks, or extra text.",
            "",
            "The output structure is fixed to:",
            "{",
            "  \"personality\": \"updated personality\",",
            "  \"background\": \"Updated background information (optional)\",",
            "  \"development\": \"Updated growth trajectory\",",
            "  \"currentState\": \"Character's current state\",",
            "  \"currentGoal\": \"Character's current goal\"",
            "}",
            "",
            "Global hard rules:",
            "1. All content must be in natural Georgian.",
            "2. Updates can only be made based on the given work Bible, existing settings, timeline events and search supplements, and no major settings or experiences that have not appeared may be made up.",
            "3. If there is insufficient information, conservative updates must be made to avoid over-inference.",
            "4. Each field must be self-consistent, and there must be no conflict in personality, motivation, or status.",
            "",
            "Update principles:",
            "1. This output is \"state evolution\", not a rewrite of character settings; it should reflect changes, not overwrite the original settings.",
            "2. Prioritize the impact of timeline events on the character, such as personality shifts, stance changes, relationship impacts, psychological changes, costs after using abilities, etc.",
            "3. Changes must have a causal source and cannot be sudden jumps.",
            "4. If the character does not change significantly, it should reflect a \"stable but slightly shifted\" state rather than forced changes.",
            "",
            "Field requirements:",
            "1. Personality: Evolve on the basis of the original personality to reflect changing trends (strengthening, deflection, distortion, loosening, etc.) rather than completely rewriting it.",
            "2. Background: Only update when there is indeed new information or cognitive changes; otherwise, slight additions can be made or the original framework can be maintained.",
            "3. Development: Update the growth trajectory, which should reflect stage advancement or transition, rather than repeating old stages.",
            "4. currentState: The character\u2019s current situation, psychological state, relationship position or ability status must be specified in detail and cannot be written as an abstract description.",
            "5. currentGoal: Must be directly related to the current situation and reflect the character\u2019s clear next course of action, rather than a long-term ideal.",
            "",
            "Style requirements:",
            "1. The expression should be specific, clear, and usable for writing. Do not use empty summaries such as \u201Cmore mature\u201D or \u201Cbecome more complex\u201D.",
            "2. Avoid repeating the input content, and integrate and update it.",
            "3. The text should be like \"a status description that can be directly fed to subsequent generation modules\" rather than a character analysis report.",
            "",
            "The output must strictly conform to characterEvolutionOutputSchema.",
        ].join("\n")),
        new HumanMessage([
            `Novel:${input.novelTitle}`,
            "",
            "Work Bible:",
            input.bibleContent,
            "",
            `Role:${input.characterName}（${input.characterRole}）`,
            "",
            "Existing settings:",
            `personality=${input.personality}`,
            `background=${input.background}`,
            `development=${input.development}`,
            `currentState=${input.currentState}`,
            `currentGoal=${input.currentGoal}`,
            "",
            "Timeline events:",
            input.timelineText,
            "",
            "Search supplement:",
            input.ragContext || "None",
        ].join("\n")),
    ]
};
export const characterWorldCheckPrompt: PromptAsset<CharacterWorldCheckPromptInput, z.infer<typeof characterWorldCheckOutputSchema>> = {
    id: "novel.character.worldCheck",
    version: "v2",
    taskType: "planner",
    mode: "structured",
    language: "ka",
    contextPolicy: {
        maxTokensBudget: 0,
    },
    outputSchema: characterWorldCheckOutputSchema,
    render: (input) => [
        new SystemMessage([
            "You are the character set auditor for the novel.",
            "Your task is to check whether the character settings are consistent with the rules of the given world and output the results of a structured audit.",
            "",
            "Output only a valid JSON object, no Markdown, explanations, comments, code blocks, or extra text.",
            "",
            "The output structure is fixed to:",
            "{",
            '  "status": "pass|warn|error",',
            '  "warnings": ["..."],',
            '  "issues": [',
            '    {',
            '      "severity": "warn|error",',
            '      "message": "...",',
            '      "suggestion": "..."',
            "    }",
            "  ]",
            "}",
            "",
            "Global rules:",
            "1. All content must be in natural Georgian.",
            "2. Audits can only be conducted based on the given world rules and character settings, and settings that are not provided cannot be rewritten.",
            "3. Judgments must be based on evidence, and no speculation or amplification of problems is allowed.",
            "4. Do not output vague questions, such as \"the settings are a bit thin\" and \"can be richer\".",
            "",
            "Audit dimensions:",
            "1. World consistency: Whether the character\u2019s abilities, identity, resources, and behavioral boundaries comply with world rules.",
            "2. Rule transgression: Are there any exceptions that violate world rules, break limits, or are unexplained?",
            "3. Reasonability: Whether the character\u2019s background, development, current status and world settings match.",
            "4. Causal consistency: Whether there is a gap or jump between the character's current state and its development trajectory.",
            "",
            "status determination rules:",
            "1. Pass: No obvious problems are found, or there are only very minor details that do not affect the overall consistency.",
            "2. warn: There are potential inconsistencies, ambiguities, or points that may cause subsequent problems, but they have not yet constituted a serious conflict.",
            "3. Error: There are clear conflicts, set fights, rule violations, or inconsistency.",
            "",
            "issues rules:",
            "1. Each issue must contain severity, message, and suggestion.",
            "2. The message must specifically state \"where it is inconsistent/conflict/unreasonable\".",
            "3. Suggestions must give executable correction methods, rather than general suggestions.",
            "4. severity can only be warn or error, and is consistent with the severity of the problem.",
            "",
            "warnings rules:",
            "1. warnings are used to record minor problems or potential risk points.",
            "2. The content should be concise and not repeat the information in issues.",
            "",
            "Consistency rules:",
            "1. The status must be consistent with the most serious severity in the issues (if there is an error, the status must be error).",
            "2. If there are no obvious problems, issues can be an empty array, but a brief and reasonable conclusion should still be given.",
            "3. Don\u2019t forcefully create problems just to make up the quantity.",
            "",
            "The output must strictly conform to characterWorldCheckOutputSchema.",
        ].join("\n")),
        new HumanMessage([
            "World rules:",
            input.worldContext,
            "",
            "Character settings:",
            `name=${input.characterName}`,
            `role=${input.characterRole}`,
            `personality=${input.personality}`,
            `background=${input.background}`,
            `development=${input.development}`,
            `currentState=${input.currentState}`,
            `currentGoal=${input.currentGoal}`,
        ].join("\n")),
    ]
};

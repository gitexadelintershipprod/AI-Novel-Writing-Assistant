import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import type { PromptAsset } from "../../../core/promptTypes";
import { NOVEL_PROMPT_BUDGETS } from "../promptBudgetProfiles";
import { chapterEditorUserIntentSchema, type ChapterEditorUserIntentParsed, } from "./userIntent.promptSchemas";
export interface ChapterEditorUserIntentPromptInput {
    scope: "selection" | "chapter";
    instruction: string;
    selectedText?: string | null;
    macroContextSummary: string;
    mustKeepConstraints: string[];
}
export const chapterEditorUserIntentPrompt: PromptAsset<ChapterEditorUserIntentPromptInput, ChapterEditorUserIntentParsed> = {
    id: "novel.chapter_editor.user_intent",
    version: "v2",
    taskType: "writer",
    mode: "structured",
    language: "ka",
    contextPolicy: {
        maxTokensBudget: NOVEL_PROMPT_BUDGETS.chapterEditorUserIntent,
    },
    contextRequirements: [
        { group: "chapter_mission", priority: 100, sourceHint: "Chapter goal for edit-intent interpretation." },
        { group: "style_contract", priority: 82, sourceHint: "Current prose style constraints." },
        { group: "local_state", priority: 78, sourceHint: "Current chapter state and continuity boundaries." },
    ],
    outputSchema: chapterEditorUserIntentSchema,
    structuredOutputHint: {
        mode: "auto",
        note: "Parse users' natural language correction opinions into executable chapter editing intentions.",
    },
    render: (input) => [
        new SystemMessage([
            "You are the correction intent parser in the Georgian-language serial novel chapter editor.",
            "Your responsibility is to convert users' natural language modification opinions into stable and executable structured revision intentions.",
            "",
            "Rules:",
            "1. Don\u2019t copy the user\u2019s original words, summarize them into editing goals.",
            "2. The macro context must be considered to avoid local modifications that disrupt the rhythm of the volume or the chapter tasks.",
            "3. mustPreserve must preserve reservations explicitly proposed by the user, as well as key indestructible constraints in the macro context.",
            "4. The risk of writing mustAvoid will destroy the goal of this revision.",
            "5. strength only allows light / medium / strong.",
            "6. Only output the JSON corresponding to the schema.",
        ].join("\n")),
        new HumanMessage([
            `\u3010Scope of modification\u3011${input.scope === "selection" ? "Select clip" : "whole chapter"}`,
            `\u3010User Opinions\u3011${input.instruction}`,
            `\u3010Current segment\u3011${input.selectedText?.trim() || "Whole chapter mode, no individual segments."}`,
            `[Macro context]${input.macroContextSummary}`,
            `\u3010Must guard\u3011${input.mustKeepConstraints.length > 0 ? input.mustKeepConstraints.join("；") : "Maintain existing facts, narrative perspective, and core messages."}`,
            "",
            "Please return JSON only.",
        ].join("\n")),
    ]
};

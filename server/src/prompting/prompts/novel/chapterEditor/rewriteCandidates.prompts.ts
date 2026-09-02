import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import type { PromptAsset } from "../../../core/promptTypes";
import { NOVEL_PROMPT_BUDGETS } from "../promptBudgetProfiles";
import { chapterEditorRewriteCandidatesSchema, type ChapterEditorRewriteCandidatesParsed, } from "./rewriteCandidates.promptSchemas";
export interface ChapterEditorRewriteCandidatesPromptInput {
    operation: "polish" | "expand" | "compress" | "emotion" | "conflict" | "custom";
    operationLabel: string;
    scope: "selection" | "chapter";
    customInstruction?: string;
    selectedText: string;
    beforeParagraphs: string[];
    afterParagraphs: string[];
    goalSummary?: string | null;
    chapterSummary?: string | null;
    styleSummary?: string | null;
    characterStateSummary?: string | null;
    worldConstraintSummary?: string | null;
    macroContextSummary: string;
    resolvedIntentSummary: string;
    constraintsText: string;
}
function renderOptionalBlock(title: string, value?: string | null): string {
    const text = value?.trim() ?? "";
    return `${title}\n${text || "None"}`;
}
export const chapterEditorRewriteCandidatesPrompt: PromptAsset<ChapterEditorRewriteCandidatesPromptInput, ChapterEditorRewriteCandidatesParsed> = {
    id: "novel.chapter_editor.rewrite_candidates",
    version: "v3",
    taskType: "writer",
    mode: "structured",
    language: "ka",
    contextPolicy: {
        maxTokensBudget: NOVEL_PROMPT_BUDGETS.chapterEditorRewrite,
    },
    contextRequirements: [
        { group: "chapter_mission", priority: 100, sourceHint: "Chapter goal and current editing task." },
        { group: "style_contract", priority: 88, sourceHint: "Current style profile and anti-AI guidance." },
        { group: "participant_subset", priority: 82, sourceHint: "Relevant character state for local rewrite." },
        { group: "world_slice", priority: 76, sourceHint: "World constraints that local edits must preserve." },
        { group: "recent_chapters", priority: 64, sourceHint: "Nearby continuity for editor preview." },
    ],
    editableSlots: [
        {
            key: "chapterEditor.candidateStyle",
            label: "Candidate rewrite style",
            description: "Adjust the differentiation direction and expression bias between candidate versions.",
            riskLevel: "low",
            maxLength: 600,
            defaultValue: "Candidates should have clear distinctions, such as being more natural, more restrained, and more emotionally intensifying, but still usable.",
        },
    ],
    slots: [
        {
            kind: "replace" as const,
            key: "chapterEditor.candidateStyle",
            label: "Candidate rewrite style",
            description: "Adjust the differentiation direction and expression bias between candidate versions.",
            default: "Candidates should have clear distinctions, such as being more natural, more restrained, and more emotionally intensifying, but still usable.",
            maxLength: 600,
        },
    ],
    outputSchema: chapterEditorRewriteCandidatesSchema,
    structuredOutputHint: {
        mode: "auto",
        note: "Returns 2 to 3 candidate rewrites to keep JSON stable.",
    },
    render: (input, context) => {
        const candidateStyle = context.slots?.text("chapterEditor.candidateStyle")
            ?? "Candidates should have clear distinctions, such as being more natural, more restrained, and more emotionally intensifying, but still usable.";
        return [
            new SystemMessage([
                "You are a partial rewriting assistant in the Georgian-language serial novel chapter editor.",
                "Your job is to come up with 2 to 3 directly comparable candidate rewrites of a piece of text selected by the user.",
                "",
                "Task boundaries:",
                "1. Only rewrite selected fragments, do not rewrite the entire chapter.",
                "2. The rewriting must fit the context, tone, character status, and goals of this chapter.",
                "3. Do not explain the process, do not output Markdown, and do not output additional text other than candidates.",
                "4. JSON that conforms to the schema must be returned.",
                "",
                "Hard constraints:",
                "1. Do not change the facts of the plot.",
                "2. Do not change the person's name or narrative perspective.",
                "3. Do not add unauthorized settings.",
                "4. Try to retain the core information and context of the original paragraph.",
                "5. Don\u2019t change the text to look like a templated AI style.",
                "",
                "Candidate requirements:",
                "1. Return 2 to 3 candidates.",
                "2. Each candidate must be a complete replaceable fragment of text.",
                "3. rationale Use one sentence to explain the moderator's main changes.",
                "4. riskNotes lists 0 to 3 risks that require user attention.",
                "5. macroAlignmentNote In one sentence, describe how these candidates serve the goals of this chapter/volume.",
                "6. The label should be short, suitable for candidate switching in the editor.",
                "7. summary Summarize the main changes in one sentence.",
                "8. SemanticTags only retains 2 to 4 high-value tags, such as \"enhance mood\", \"compress repetition\" and \"complement action details\".",
                "",
                "Rewriting range:",
                "1. selection means only overwriting the selected fragment.",
                "2. Chapter means rewriting the entire chapter, but still maintaining the chapter facts, main line, and positioning within the volume.",
                "3. " + candidateStyle,
                "",
                `The intention of this rewrite:${input.operationLabel}`,
                `Rewriting range:${input.scope === "selection" ? "Select clip" : "whole chapter"}`,
                input.customInstruction?.trim()
                    ? `Additional user requirements:${input.customInstruction.trim()}`
                    : "User supplementary requirements: None",
            ].join("\n")),
            new HumanMessage([
                renderOptionalBlock("[Goal of this chapter]", input.goalSummary),
                "",
                renderOptionalBlock("[Summary of this chapter]", input.chapterSummary),
                "",
                renderOptionalBlock("[Writing and Tone]", input.styleSummary),
                "",
                renderOptionalBlock("\u3010Character status\u3011", input.characterStateSummary),
                "",
                renderOptionalBlock("[World and setting constraints]", input.worldConstraintSummary),
                "",
                renderOptionalBlock("[Macro positioning]", input.macroContextSummary),
                "",
                renderOptionalBlock("[Resolved modification target]", input.resolvedIntentSummary),
                "",
                "[Rewrite hard constraints]",
                input.constraintsText,
                "",
                "[Previous excerpt]",
                input.beforeParagraphs.length > 0 ? input.beforeParagraphs.join("\n\n") : "None",
                "",
                "[Original text to be rewritten]",
                input.selectedText,
                "",
                "[fragment of the following text]",
                input.afterParagraphs.length > 0 ? input.afterParagraphs.join("\n\n") : "None",
                "",
                "Please return JSON only.",
            ].join("\n")),
        ];
    }
};

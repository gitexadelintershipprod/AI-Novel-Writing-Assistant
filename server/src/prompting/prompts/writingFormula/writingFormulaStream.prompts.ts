import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import type { PromptAsset } from "../../core/promptTypes";
export interface WritingFormulaExtractStreamInput {
    extractLevel: "basic" | "standard" | "deep";
    focusAreas: string[];
    sourceText: string;
}
export interface WritingFormulaApplyRewriteStreamInput {
    formulaContent: string;
    sourceText: string;
}
export interface WritingFormulaApplyGenerateStreamInput {
    formulaContent: string;
    topic: string;
    targetLength: number;
}
/** Stream-extract a reproducible writing formula (Markdown structure) from sample text. */
export const writingFormulaExtractStreamPrompt: PromptAsset<WritingFormulaExtractStreamInput, string, string> = {
    id: "writingFormula.extract.stream",
    version: "v2",
    taskType: "planner",
    mode: "text",
    language: "ka",
    contextPolicy: {
        maxTokensBudget: 0,
    },
    render: (input) => [
        new SystemMessage(`You are a professional writing style analysis expert who can deeply analyze the creative techniques of literary works.
Please edit the text ${input.extractLevel} Level analysis, focusing on:${input.focusAreas.join(", ")}.
Output format (Markdown):
## Overall style positioning
## Core writing skills (including original text examples)
## Reproducible writing formula
## Application Guide (how to write new text using this formula)`),
        new HumanMessage(input.sourceText),
    ]
};
/** Rewrite the source text according to the given formula. */
export const writingFormulaApplyRewriteStreamPrompt: PromptAsset<WritingFormulaApplyRewriteStreamInput, string, string> = {
    id: "writingFormula.apply.rewrite.stream",
    version: "v2",
    taskType: "writer",
    mode: "text",
    language: "ka",
    contextPolicy: {
        maxTokensBudget: 0,
    },
    render: (input) => [
        new SystemMessage("You are a professional writing assistant. Please strictly follow the following writing formula to rewrite the given text. Requirements: Keep the core meaning of the original text unchanged, but reshape the writing style, rhythm, and sentence structure according to the formula."),
        new HumanMessage(`Writing formula:
${input.formulaContent}

Original text:
${input.sourceText}`),
    ]
};
/** Create new content around a topic according to the given formula. */
export const writingFormulaApplyGenerateStreamPrompt: PromptAsset<WritingFormulaApplyGenerateStreamInput, string, string> = {
    id: "writingFormula.apply.generate.stream",
    version: "v2",
    taskType: "writer",
    mode: "text",
    language: "ka",
    contextPolicy: {
        maxTokensBudget: 0,
    },
    render: (input) => [
        new SystemMessage(`You are a professional writing assistant. Please strictly follow the writing formula below to create new content around the given topic.
Requirements: The number of words should be controlled within ${input.targetLength} Around the word, each paragraph embodies the core features of the formula.`),
        new HumanMessage(`Writing formula:
${input.formulaContent}

Creative theme:
${input.topic}`),
    ]
};

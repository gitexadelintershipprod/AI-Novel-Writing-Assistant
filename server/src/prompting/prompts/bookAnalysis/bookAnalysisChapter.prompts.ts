import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { z } from "zod";
import type { PromptAsset } from "../../core/promptTypes";
import { bookAnalysisChapterSplitOutputSchema } from "../../../services/bookAnalysis/shared/bookAnalysisSchemas";
export interface BookAnalysisChapterSplitPromptInput {
    content: string;
}
export const bookAnalysisChapterSplitPrompt: PromptAsset<BookAnalysisChapterSplitPromptInput, z.infer<typeof bookAnalysisChapterSplitOutputSchema>> = {
    id: "bookAnalysis.chapter.split",
    version: "v2",
    taskType: "planner",
    mode: "structured",
    language: "ka",
    contextPolicy: {
        maxTokensBudget: 0,
    },
    semanticRetryPolicy: {
        maxAttempts: 1,
    },
    outputSchema: bookAnalysisChapterSplitOutputSchema,
    render: (input) => [
        new SystemMessage([
            "You are an assistant for segmenting long-form source text into coherent sections.",
            "Your task is to determine the chapter boundaries based on the given text, and output the chapter title and character offset in the original text.",
            "Output only JSON objects, no Markdown or explanations.",
            "The structure is fixed as:",
            '{ "chapters": [{ "title": "...", "startOffset": 0, "endOffset": 100 }] }',
            "Rules:",
            "1. offset uses 0-based character position, startOffset contains the position of the chapter title, and endOffset is the first character position after the end of the chapter.",
            "2. Chapters must be arranged in the order of the original text and cannot overlap or cross boundaries.",
            "3. If the chapter boundary cannot be reliably determined, return an empty array, do not hardcode it.",
            "4. title uses the short text closest to the chapter title in the original text.",
        ].join("\n")),
        new HumanMessage([
            "Original text:",
            input.content,
        ].join("\n")),
    ]
};

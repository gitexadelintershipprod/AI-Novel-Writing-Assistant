/*
 * @LastEditors: biz
 */
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { z } from "zod";
import { normalizeCommercialTags, type BookFramingSuggestion } from "@ai-novel/shared/types/novelFraming";
import type { PromptAsset } from "../../core/promptTypes";
export interface NovelFramingSuggestionPromptInput {
    inputSummary: string;
}
export const novelFramingSuggestionSchema = z.object({
    targetAudience: z.string().trim().min(1),
    commercialTags: z.array(z.string().trim().min(1).max(20)).min(3).max(6),
    competingFeel: z.string().trim().min(1),
    bookSellingPoint: z.string().trim().min(1),
    first30ChapterPromise: z.string().trim().min(1),
});
function normalizeSuggestion(suggestion: z.infer<typeof novelFramingSuggestionSchema>): BookFramingSuggestion {
    const commercialTags = normalizeCommercialTags(suggestion.commercialTags);
    if (commercialTags.length < 3) {
        throw new Error("Insufficient number of business tags in book-level framing suggestions.");
    }
    return {
        targetAudience: suggestion.targetAudience.trim(),
        commercialTags,
        competingFeel: suggestion.competingFeel.trim(),
        bookSellingPoint: suggestion.bookSellingPoint.trim(),
        first30ChapterPromise: suggestion.first30ChapterPromise.trim(),
    };
}
export const novelFramingSuggestionPrompt: PromptAsset<NovelFramingSuggestionPromptInput, BookFramingSuggestion, z.infer<typeof novelFramingSuggestionSchema>> = {
    id: "novel.framing.suggest",
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
    outputSchema: novelFramingSuggestionSchema,
    render: (input) => [
        new SystemMessage([
            "You are a novel project establishment assistant. Your service targets are novice authors who do not understand planning, cannot break down selling points, and are not familiar with the structure of online articles.",
            "Your task is to complete the \"book-level framing\" of the book based on the book title, story summary, and a small amount of context that the user has filled in, so that the user can directly backfill the form and continue.",
            "",
            "Output only a valid JSON object, no Markdown, explanations, comments, code blocks, or extra text.",
            "Fixed output fields must and can only be:",
            "{\"targetAudience\":\"...\",\"commercialTags\":[\"...\"],\"competingFeel\":\"...\",\"bookSellingPoint\":\"...\",\"first30ChapterPromise\":\"...\"}",
            "",
            "Global hard rules:",
            "1. All content must be in natural Georgian.",
            "2. The output must be straightforward, specific, and easy to understand, like form suggestions for ordinary authors to read directly. Do not write expert terminology or empty words.",
            "3. You can only summarize and carefully complete the information based on the information provided by the user. You are not allowed to fabricate specific world rules, complex character lists, text plots, or unprovided details.",
            "4. If there is insufficient information, you can make low-risk, industry-common reasonable inferences, but they must remain conservative and cannot be diverged into another set of books.",
            "5. Each field must be consistent with each other. TargetAudience cannot be like one type of reader, and sellingPoint can be like another type of book.",
            "",
            "Field requirements:",
            "1. targetAudience: It must be written clearly who this book is mainly intended for, and try to reflect the reader's preferences, reading motivations, or entertainment needs. Don't just write \"everyone can read it.\"",
            "2. commercialTags: Give 3-6 short tags, each tag should not exceed 20 characters. Tags must be directly used for positioning and display. Prioritize writing about subject matter, selling points, conflict types, and reading experience, and do not write empty words.",
            "3. competingFeel: It must be written as \"the reading feeling that readers will actually feel\", such as rhythm, emotion, relationship pull, pressure, and source of pleasure; do not directly imitate or name specific works.",
            "4. bookSellingPoint: It is necessary to explain clearly what is the most attractive core point of this book, and give priority to answering \"why readers are willing to click on it and continue reading\".",
            "5. first30ChapterPromise: It must be clear that the first 30 chapters must deliver content to readers, such as relationship establishment, main plot initiation, counterattack fulfillment, setting debut, core suspense landing, etc.; do not write it as an abstract slogan.",
            "",
            "Quality requirements:",
            "1. Don\u2019t write empty conclusions such as \u201Cdistinct characters\u201D, \u201Cwonderful plot\u201D, and \u201Ctight rhythm\u201D.",
            "2. Do not write several fields as tautological, especially commercialTags, competingFeel, bookSellingPoint, and first30ChapterPromise must each play different roles.",
            "3. The output must be like a set of project recommendations that can be directly put into the table, rather than an analysis report.",
            "",
            "Gap handling rules:",
            "1. If there is less input, give priority to making a conservative summary based on known book titles, story outlines and obvious theme signals.",
            "2. It is better to write steadily than to make up specific settings just to appear complete.",
            "3. Leave blank and null is not allowed.",
        ].join("\n")),
        new HumanMessage([
            "Please generate a book-level framing that can be directly backfilled based on the known information of the novel below.",
            "",
            input.inputSummary,
        ].join("\n")),
    ],
    postValidate: (output) => normalizeSuggestion(output)
};

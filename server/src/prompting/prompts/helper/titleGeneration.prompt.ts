import type { BaseMessage } from "@langchain/core/messages";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import type { PromptAsset } from "../../core/promptTypes";
import type { TitlePromptContext } from "../../../services/title/titleGeneration.shared";
import { maximumFrameClusterSize, minimumStructuralVariety, minimumStyleVariety, } from "../../../services/title/titleGeneration.shared";
import { titleGenerationRawOutputSchema } from "./titleGeneration.promptSchemas";
export interface TitleGenerationPromptInput {
    context: TitlePromptContext;
    forceJson: boolean;
    retryReason: string | null;
}
function resolveModeLabel(mode: TitlePromptContext["mode"]): string {
    switch (mode) {
        case "adapt":
            return "adapt a reference title without copying it";
        case "novel":
            return "generate from the current novel context";
        default:
            return "generate from a creative brief";
    }
}
function buildModeInstruction(input: TitlePromptContext): string {
    if (input.selectionMode === "primary") {
        return "Choose one decisive main title as titles[0]. The remaining entries are secondary alternatives built around different concrete promises.";
    }
    if (input.mode === "adapt") {
        return "Learn only the reference title's information density, rhythm, and hook placement. Do not copy its wording, syntax, or story mechanism.";
    }
    if (input.mode === "novel") {
        return "Use the project's genre, premise, and current working title. Treat the current title only as a duplicate to avoid, not as text to paraphrase.";
    }
    return "Use the brief to create a varied title pool. Express the story's distinctive promise instead of summarizing the plot.";
}
function buildDiversityInstruction(input: TitlePromptContext): string {
    if (input.selectionMode === "primary") {
        return "Keep titles[0] as the single recommendation and make every alternative approach the story from a materially different angle.";
    }
    return [
        `Use at least ${minimumStyleVariety(input.count)} style values and ${minimumStructuralVariety(input.count)} surface structures.`,
        `No structure may appear more than ${maximumFrameClusterSize(input.count)} times.`,
        "Mix natural Georgian forms such as a plain noun phrase, a colon split, a clause with a comma, a question, a conditional or temporal opening, and a first-person or possessive opening.",
    ].join(" ");
}
function buildRetryInstruction(retryReason: string | null | undefined): string {
    return retryReason?.trim()
        ? `The previous output failed validation: ${retryReason.trim()}. Correct that failure before returning the final JSON.`
        : "";
}
function buildTitleGenerationMessages(input: TitlePromptContext, options: {
    forceJson?: boolean;
    retryReason?: string | null;
} = {}): BaseMessage[] {
    const primarySelection = input.selectionMode === "primary";
    const forceJsonInstruction = options.forceJson
        ? "Return the JSON object directly without a code fence."
        : "";
    return [
        new SystemMessage([
            "You are a Georgian-language fiction title editor.",
            primarySelection
                ? "Select the strongest main title for an established story direction and provide a small set of distinct alternatives."
                : "Create cover-ready Georgian title candidates with clear identity, mood, conflict, mystery, or high-concept appeal.",
            "",
            "Output contract:",
            `- Return exactly ${input.count} entries inside one JSON object with a titles array.`,
            "- Each entry contains only title, clickRate, style, hookType, angle, and reason.",
            "- title is natural Georgian, 1-10 words, and no more than 80 Unicode code points.",
            "- clickRate is an internal AI appeal estimate from 35 to 99, not measured market data.",
            "- style is one of literary, conflict, suspense, high_concept.",
            "- hookType is one of identity_gap, abnormal_situation, power_mutation, rule_hook, direct_conflict, high_concept.",
            "- angle is a focused Georgian phrase of 2-12 words; reason is a Georgian explanation of 6-40 words.",
            "- Do not add Markdown, commentary, or extra keys.",
            "",
            "Quality rules:",
            "- A title must sound written in Georgian rather than translated from another language.",
            "- Prefer a concrete image, relationship, event, rule, place, profession, advantage, or cost already present in the input.",
            "- Avoid generic abstractions that could fit almost any story.",
            "- Do not produce near-duplicates or vary only one synonym.",
            `- ${buildDiversityInstruction(input)}`,
            "- Structural examples are illustrative only: „შავი ზღვის უკანასკნელი მეზღვაური“, „ქალაქი, რომელმაც ჩემი სახელი დაივიწყა“, „თუ მთვარე აღარ ამოვა“, „დაკარგული კარი: დაბრუნების ფასი“, „ვინ მოკლა დრო“.",
            "",
            buildModeInstruction(input),
            buildRetryInstruction(options.retryReason),
            forceJsonInstruction,
        ].filter(Boolean).join("\n")),
        new HumanMessage([
            `Mode: ${resolveModeLabel(input.mode)}`,
            `Selection goal: ${primarySelection ? "choose one main title in titles[0]" : "build a candidate pool"}`,
            `Target count: ${input.count}`,
            `Project name: ${input.novelTitle || "Not provided"}`,
            `Current working title: ${input.currentTitle || "None"}`,
            `Genre: ${input.genreName || "Not specified"}`,
            `Genre context: ${input.genreDescription || "None"}`,
            "",
            "Creative brief:",
            input.brief || "Not provided",
            "",
            `Reference title: ${input.referenceTitle || "None"}`,
        ].join("\n")),
    ];
}
export const titleGenerationPrompt: PromptAsset<TitleGenerationPromptInput, typeof titleGenerationRawOutputSchema._output> = {
    id: "title.generation",
    version: "v4",
    taskType: "planner",
    mode: "structured",
    language: "ka",
    contextPolicy: { maxTokensBudget: 0 },
    outputSchema: titleGenerationRawOutputSchema,
    render: (input) => buildTitleGenerationMessages(input.context, {
        forceJson: input.forceJson,
        retryReason: input.retryReason,
    })
};

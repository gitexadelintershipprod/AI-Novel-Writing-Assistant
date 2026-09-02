import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import type { PromptAsset } from "../../../core/promptTypes";
import { renderSelectedContextBlocks } from "../../../core/renderContextBlocks";
import { createVolumeChapterBeatBlockSchema } from "../../../../services/novel/volume/volumeGenerationSchemas";
import { type VolumeChapterListPromptInput } from "./shared";
import { buildVolumeChapterListContextBlocks } from "./contextBlocks";
import { NOVEL_PROMPT_BUDGETS } from "../promptBudgetProfiles";
import { getChapterTitleCollisionIssue, getChapterTitleDiversityIssue, isBlockingChapterTitleQualityIssue, isChapterTitleDuplicateIssue, isChapterTitleDiversityIssue, } from "../../../../services/novel/volume/chapterTitleDiversity";
import { countGeorgianWords, normalizeGeorgianText } from "@ai-novel/shared/utils/georgianTextMetrics";
function safeJsonStringify(value: unknown): string {
    try {
        return JSON.stringify(value, null, 2) ?? String(value);
    }
    catch {
        return String(value);
    }
}
function buildRetryDirective(reason?: string | null): string {
    const normalizedReason = reason?.trim();
    if (!normalizedReason) {
        return "";
    }
    return [
        "The last output did not pass business verification, this time it must be corrected first:",
        normalizedReason,
        "First determine the type of failure: title structure, basic quality of title, chapter function, summary advancement, and ending traction.",
        "Don't just replace a named chapter; if the problem arises from title isomorphism or chapter function duplication, the entire set of title skeletons and chapter function assignments must be rearranged.",
    ].join("\n");
}
function classifyChapterListRetryIssue(reason: string): string {
    if (isChapterTitleDiversityIssue(reason)) {
        return "Title structure: Rearrange the entire set of title skeletons, using a mix of action-propelled, conflict-pressing, anomaly discovery, result-fulfilling, decisive turning, and question-hook types.";
    }
    if (isBlockingChapterTitleQualityIssue(reason)) {
        return "Basic title quality: The title must be short and objective. It cannot be in the first person, cannot be too long, and cannot be written as a complete plot sentence.";
    }
    if (reason.includes("Insufficient active actions of the protagonist or core perspective character in the chapter") || reason.includes("Multiple consecutive chapters showing passive advancement")) {
        return "Chapter function: Rearrange the responsibilities of each chapter to allow the core perspective characters to actively choose, test, counterattack, layout, exchange, tolerate or bear the cost.";
    }
    if (reason.includes("Too many chapter summaries are too vague")) {
        return "Summary advancement: The summary of each chapter must include new information, situation changes, conflict advancement, relationship changes, resource gains and losses, or risk shifts.";
    }
    if (reason.includes("The current rhythm section lacks phased fulfillment") || reason.includes("The ending chapter is missing the current beat")) {
        return "Ending Pull: The reading pressure of the last chapter that must complete the current beat to cash in, make a clear turn, or move on to the next beat.";
    }
    return "Comprehensive quality: Rearrange titles, chapter functions, and summary advancement according to failure reasons to ensure that each chapter has new changes.";
}
function resolvePromptConfig(input: number | {
    targetChapterCount: number;
    targetBeatKey?: string;
    targetBeatLabel?: string | null;
    isBookFinale?: boolean;
    reservedChapterTitles?: string[];
}): {
    targetChapterCount: number;
    targetBeatKey: string;
    targetBeatLabel: string;
    isBookFinale: boolean;
    reservedChapterTitles: string[];
} {
    if (typeof input === "number") {
        return {
            targetChapterCount: input,
            targetBeatKey: "target_beat",
            targetBeatLabel: "target rhythm section",
            isBookFinale: false,
            reservedChapterTitles: [],
        };
    }
    return {
        targetChapterCount: input.targetChapterCount,
        targetBeatKey: input.targetBeatKey?.trim() || "target_beat",
        targetBeatLabel: input.targetBeatLabel?.trim() || "target rhythm section",
        isBookFinale: input.isBookFinale === true,
        reservedChapterTitles: input.reservedChapterTitles ?? [],
    };
}
/** Deterministic shape guard only; semantic chapter quality remains an LLM judgment. */
function getChapterFunctionQualityIssue(chapters: Array<{
    title: string;
    summary: string;
    beatKey: string;
}>): string | null {
    if (!chapters.length) {
        return "Chapter list cannot be empty.";
    }
    const summaryKeys = chapters.map((chapter) => normalizeGeorgianText(chapter.summary)
        .toLocaleLowerCase("ka-GE")
        .replace(/[^\p{Letter}\p{Number}]+/gu, " ")
        .trim());
    if (chapters.some((chapter) => countGeorgianWords(chapter.title) < 1)) {
        return "Every chapter must have a non-empty title.";
    }
    if (chapters.some((chapter) => countGeorgianWords(chapter.summary) < 4)) {
        return "Every chapter summary must contain at least four meaningful words.";
    }
    if (new Set(summaryKeys).size !== summaryKeys.length) {
        return "Chapter summaries must not be exact duplicates.";
    }
    return null;
}
function isChapterFunctionQualityIssue(error: unknown): boolean {
    const message = error instanceof Error ? error.message : String(error);
    return message.includes("chapter summary") || message.includes("chapter must have");
}
export function createVolumeChapterListPrompt(input: number | {
    targetChapterCount: number;
    targetBeatKey?: string;
    targetBeatLabel?: string | null;
    isBookFinale?: boolean;
    reservedChapterTitles?: string[];
}): PromptAsset<VolumeChapterListPromptInput, ReturnType<typeof createVolumeChapterBeatBlockSchema>["_output"]> {
    const { targetChapterCount, targetBeatKey, targetBeatLabel, isBookFinale = false, reservedChapterTitles } = resolvePromptConfig(input);
    return {
        id: "novel.volume.chapter_list",
        version: "v10",
        taskType: "planner",
        mode: "structured",
        language: "ka",
        contextPolicy: {
            maxTokensBudget: NOVEL_PROMPT_BUDGETS.volumeChapterList,
            requiredGroups: ["book_contract", "target_volume", "target_beat_contract"],
            preferredGroups: [
                "macro_constraints",
                "beat_context_window",
                "previous_beat_chapters",
                "preserved_beat_chapters",
                "adjacent_volumes",
                "soft_future_summary",
            ],
            dropOrder: ["soft_future_summary"],
        },
        semanticRetryPolicy: {
            maxAttempts: 2,
            buildMessages: ({ attempt, baseMessages, parsedOutput, validationError, }) => {
                const normalizedValidationError = validationError?.trim() || "Failed the chapter list service verification.";
                const retryIssueClass = classifyChapterListRetryIssue(normalizedValidationError);
                return [
                    ...baseMessages,
                    new HumanMessage([
                        `The last time the chapter block passed the JSON structure verification, but failed the business verification. This is the first ${attempt} Semantic retry.`,
                        `Reason for failure:${normalizedValidationError}`,
                        `Failure type:${retryIssueClass}`,
                        "",
                        "Rewrite requirements:",
                        "1. Only rewrite the chapter list of the current rhythm section, and do not cross the boundary to generate other rhythm section chapters.",
                        "2. The original number of chapters must be retained, and the final chapters.length must still be equal to the target number of chapters.",
                        "3. It must be repaired according to the failure type first: the title structure problem re-arranges the entire set of title skeletons; the title basic quality problem rewrites all unqualified titles; the chapter function problem re-arranges the responsibilities of each chapter; the abstract advancement problem rewrites all empty summaries; the ending pulling problem rewrites the fulfillment and direction of the last chapter.",
                        "4. Don\u2019t just partially replace a chapter that triggers verification; you need to ensure that the title skeleton, chapter function, summary advancement, and ending traction of the entire set of chapters pass at the same time.",
                        "5. If the reason for failure is duplicate titles or concentrated title skeletons, all titles that hit duplicate skeletons must be rewritten instead of only partially patching a few chapters.",
                        "6. If the reason for failure is duplication of chapter functions, the chapter functions must be reassigned to avoid having multiple consecutive chapters that are just investigation, discovery, realization, or foreshadowing.",
                        "7. The summary of each chapter must reflect the new advancement, giving priority to the choices, temptations, counterattacks, layouts, exchanges, tolerance or bearing costs of the core perspective characters.",
                        "8. Explicitly avoid extensive use of the \"Y of X/Y in X/Y in X\" skeleton.",
                        "9. Clearly prevent the whole batch of titles from collapsing into the \"A, B / four-word action, four-word result\" parallel template.",
                        "10. The title must be an objective chapter title, not in the first person, not written as a complete plot sentence, and the number of core words should not exceed 16.",
                        "11. The beatKey of each chapter must remain the current target beatKey.",
                        "12. The abstract must reflect the changes in the situation caused by this chapter and must not restate the title in vain.",
                        isBookFinale
                            ? "13. The final chapter of the book must complete the ending contract and may not create a new main line or next beat hook that must be continued." : "13. The last chapter must complete mustDeliver of the current beat while leaving reading traction, but must not fulfill the core event of the next beat in advance.",
                        "",
                        "Last JSON output:",
                        safeJsonStringify(parsedOutput),
                        "",
                        "Please re-output the complete JSON object.",
                    ].join("\n")),
                ];
            },
        },
        outputSchema: createVolumeChapterBeatBlockSchema({
            exactChapterCount: targetChapterCount,
            expectedBeatKey: targetBeatKey,
            expectedBeatLabel: targetBeatLabel,
        }),
        render: (promptInput, context) => [
            new SystemMessage([
                "You are an online article section splitting planning assistant.",
                "Your task is not to write the main text, nor to expand on the detailed outline, but to generate an executable chapter list for only a single rhythm section of the current volume.",
                "You must meet the following requirements at the same time: the structured output is correct, the chapter functions are clear, the title is like the chapter name, and the abstract has real advancement.",
                "",
                "1. Task Boundaries",
                `1. You can currently only do "${targetBeatLabel}"Generate ${targetChapterCount} Chapter, the number cannot be too much or too little.`,
                "2. Only the current target beat is allowed to be overwritten, and chapters of adjacent beats are not allowed to cross the boundary.",
                "3. Do not combine two chapters into one summary chapter, nor use empty placeholder chapters to make up the number.",
                "4. If the beat information is insufficient, it must be completed to the exact number of chapters, but only conservative transitions can be made, and no major new settings can be created.",
                "5. This task only generates a list of chapters, without writing the main text, detailed scenes, or complete dialogue.",
                "",
                "2. Hard output constraints",
                "1. The top level must output four fields: beatKey, beatLabel, chapterCount, and chapters.",
                "2. Each chapter can only contain three fields: title, summary, and beatKey, and no new fields are allowed.",
                `3. beatKey must be strictly equal to ${targetBeatKey}。`,
                `4. beatLabel must be strictly equal to ${targetBeatLabel}。`,
                `5. chapterCount and chapters.length must be strictly equal to ${targetChapterCount}。`,
                `6. The beatKey of each chapter must be strictly equal to ${targetBeatKey}。`,
                "7. No Markdown, comments, explanations, or any additional text may be output.",
                "8. The summary of each chapter should be limited to 40-120 words. Only the core actions, resistance and new situations created should be written; expansion of scenes, dialogue or main text is prohibited.",
                "9. End the JSON immediately after writing the specified number of final chapters, without additional analysis, self-checking processes, or release candidates.",
                "",
                "3. Core principles of chapter planning",
                "1. The chapter list must strictly obey the current volume skeleton and the current target beat contract, and cannot sneak into adjacent beats.",
                "2. Each chapter must answer: why this chapter must exist, what it advances, and what new changes it creates.",
                "3. The division of chapters in the current rhythm section should reflect the sense of reading the online text, but it cannot be divided evenly mechanically.",
                "4. The chapters must form a continuous progression, and there cannot be repeated chapters that just change the words without adding new information.",
                "5. In each chapter summary, write not only \u201Cwhat happened\u201D but also \u201Cwhat changed as a result\u201D.",
                "",
                "4. Chapter function allocation requirements",
                "1. Before generating, the current beat must be divided into several chapter functions in the mind: undertaking, pressure, testing, discovery, turning, counterattack, cashing out, aftermath or hook.",
                "2. Do not expose these function labels during actual output, but the summary of each chapter must reflect clear functions.",
                "3. Consecutive chapters cannot assume exactly the same function, especially multiple consecutive chapters that only do investigation, discussion, foreshadowing, waiting, realization or discovery.",
                "4. If the target number of chapters is greater than or equal to 5, it should include at least one situation pressure, one key discovery or reversal of judgment, one phased realization or clear turn.",
                "5. Key advancements can take up more chapters, and transitional chapters should be short and powerful. Do not create low-information-density chapters just to make up the numbers.",
                isBookFinale
                    ? "6. The final chapter of the book must complete the main conflict, relationship changes, core rewards and theme points in the ending contract, and must not leave any new main lines that must be continued." : "6. The last chapter must complete the mustDeliver of the current beat while leaving the reading pull to enter the next beat, but the core event of the next beat must not be fulfilled in advance.",
                "",
                "5. Chapter promotion quality requirements",
                "1. The summary of each chapter should reflect the core perspective character\u2019s choices, temptations, counterattacks, tolerance, exchanges, layouts, revelations, compromises, or bearing costs, to prevent characters from just watching external events.",
                "2. Each chapter summary should contain at least one effective advancement: new intelligence, risk escalation, relationship changes, resource gains and losses, misjudgment correction, opponent's back-up, and stage realization.",
                "3. Don\u2019t write chapters as a repetitive chain of \u201Cfind the problem \u2013 realize the danger \u2013 continue investigating\u201D.",
                "4. You can create or exploit information gaps, misjudgments, abnormal discoveries, and hidden costs of apparent victory, but do not stuff complete cause-and-effect sentences into the title.",
                "5. The end of each chapter should imply new problems, threats, opportunities, misjudgments, or choice pressures, giving the next chapter a reason to continue reading.",
                "6. All chapters in the current beat cannot be just foreshadowing; there must be actual advancement, situation changes, or stage fulfillment.",
                "",
                "6. Title requirements",
                "1. The title of each chapter must be like the real chapter name, giving priority to the event anchor, location, conflict, abnormal discovery, situation change, stage realization, relationship change or problem hook.",
                "2. The title uses objective expression by default, and does not use first-person self-narration such as \"I/my/I am/I use/for me/chasing me\".",
                "3. Before starting to write chapters, first complete the \"title syntax matching planning\" in your mind, and then output according to the matching ratio. Do not repeat the template while thinking.",
                "4. The same batch of titles must actively mix different syntaxes such as action-promoting type, conflict-pressing type, exception-finding type, result-fulfilling type, decision-making type, question-hook type, and relationship-changing type.",
                "5. The number of core words in the title should not exceed 16, and 4-12 words are recommended; do not write long sentences, complete cause-and-effect sentences, or plot summaries.",
                "6. The title can be contrasting, but it should be short, such as \"Secret Order Distorted\", \"Soul-Destroying Nail Appears\", \"Crack in the Formation Eye\"; do not write \"Someone did something, so a certain result happened\".",
                "7. Avoid only abstract words: storm, undercurrent, crisis, truth, choice, change, etc., unless there are specific objects, actions or contrasts in the title.",
                "8. If the current rhythm section has 6 chapters or more: any single surface skeleton should not exceed half; skeletons such as \"Y of X / Y in X / Y in",
                "9. Clearly avoid letting most titles continue to collapse into the \"A, B / four-word action, four-word result\" parallel template.",
                "10. Adjacent chapter titles should not use the same grammatical skeleton for more than 3 consecutive chapters.",
                "11. The title should have a sense of advancement and readability, and avoid being literary, abstract, lyrical, slogan-like, or overly templated.",
                "12. The protagonist\u2019s initiative, choices and costs are mainly written in the summary. Do not write the title in the first person to reflect the actions of the protagonist.",
                "13. Self-check before generating: whether there is a first-person title, a title that is too long, too many \"word structures\", too many commas in parallel structures, or multiple consecutive chapters with the same skeleton; if so, change it first and then output.",
                "",
                "7. Abstract requirements",
                "1. The summary of each chapter must clearly state what the chapter specifically advances and what role it plays in the current target beat.",
                "2. The summary must reflect at least one of new information, situation changes, conflict advancement, relationship changes, cost increases, risk shifts, or stage realizations.",
                "3. The summary must reflect the irreversible changes caused by this chapter: changes in character judgment, changes in resource status, changes in the relationship between enemies and enemies, changes in risk levels, changes in plan direction, or changes in readers' cognition.",
                "4. Don\u2019t write the summary as a vague slogan, nor as a detailed plot retelling.",
                "5. Adjacent chapter summaries cannot be mere tautology.",
                "6. Don\u2019t use a lot of low-information-density expressions such as \u201Cfurther promote the plot\u201D, \u201Cmake the situation more complicated\u201D, and \u201Clay the groundwork for the follow-up\u201D.",
                "",
                "8. beat acceptance requirements",
                "1. This time only the current target beat will be covered, and chapters for adjacent beats will not be generated.",
                "2. The beginning chapter must inherit the status of the chapter that has been generated in the previous sequence, and cannot restart the advancement that has already occurred.",
                "3. The middle chapter should focus on the core contradiction of the current beat to continuously increase pressure, test, turn or realize.",
                isBookFinale
                    ? "4. The final chapter of the book must complete the ending contract and no longer requires the next stage of traction." : "4. At the end of the chapter, the mustDeliver of the current beat must be put in place, but do not steal the core of the next beat in advance.",
                "",
                "9. Quality self-inspection requirements",
                "1. Check in your mind before output: whether the number of chapters is accurate, whether the beatKey is consistent, whether it is out of bounds, and whether there are repeated function chapters.",
                "2. Check in your mind before outputting: whether the title is too isomorphic, whether the summary has real advancement, and whether the final chapter has stage fulfillment or reading traction.",
                "3. If you find that the chapter is just a change of narrative, no new advancement, no protagonist action, and no situation change, you must change it first and then output it.",
                "",
                buildRetryDirective(promptInput.retryReason),
            ]
                .filter(Boolean)
                .join("\n")),
            new HumanMessage([
                "Please output the chapter block of the current rhythm section based on the following context.",
                "",
                "Output requirements:",
                "- Only output strict JSON",
                `- beatKey must be strictly equal to ${targetBeatKey}`,
                `- beatLabel must be strictly equal to ${targetBeatLabel}`,
                `- chapterCount and chapters.length must be strictly equal ${targetChapterCount}`,
                "- Each chapter can only contain title, summary, beatKey",
                "- No chapters with adjacent beats may be generated",
                "- Plan the chapter function allocation and title skeleton ratio in your mind first, and then output the complete chapter block",
                "- Prioritize the sense of chapter advancement, rhythm continuity, decentralized title structure, character initiative and ending traction in the summary",
                "- The title must be short and objective, do not use the first person, do not write long sentences or plot synopses",
                "",
                "Current volume and chapter context:",
                renderSelectedContextBlocks(context),
            ].join("\n")),
        ],
        postValidate: (output) => {
            if (output.beatKey !== targetBeatKey) {
                throw new Error(`beatKey must be strictly equal to ${targetBeatKey}。`);
            }
            if (output.beatLabel !== targetBeatLabel) {
                throw new Error(`beatLabel must be strictly equal to ${targetBeatLabel}。`);
            }
            if (output.chapterCount !== targetChapterCount ||
                output.chapters.length !== targetChapterCount) {
                throw new Error(`chapterCount and chapters.length must be strictly equal to ${targetChapterCount}。`);
            }
            output.chapters.forEach((chapter, index) => {
                if (chapter.beatKey !== targetBeatKey) {
                    throw new Error(`No. ${index + 1} The beatKey of each chapter must be strictly equal to ${targetBeatKey}。`);
                }
            });
            const titleDiversityIssue = getChapterTitleDiversityIssue(output.chapters.map((chapter) => chapter.title));
            if (titleDiversityIssue) {
                throw new Error(titleDiversityIssue);
            }
            const titleCollisionIssue = getChapterTitleCollisionIssue(reservedChapterTitles, output.chapters.map((chapter) => chapter.title));
            if (titleCollisionIssue) {
                throw new Error(titleCollisionIssue);
            }
            const chapterFunctionQualityIssue = getChapterFunctionQualityIssue(output.chapters);
            if (chapterFunctionQualityIssue) {
                throw new Error(chapterFunctionQualityIssue);
            }
            return output;
        },
        postValidateFailureRecovery: ({ rawOutput, validationError }) => {
            if (isBlockingChapterTitleQualityIssue(validationError) || isChapterTitleDuplicateIssue(validationError)) {
                throw new Error(validationError);
            }
            if (isChapterTitleDiversityIssue(validationError) || isChapterFunctionQualityIssue(validationError)) {
                return rawOutput;
            }
            throw new Error(validationError);
        }
    };
}
export { buildVolumeChapterListContextBlocks };

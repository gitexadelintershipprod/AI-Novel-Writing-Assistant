import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { z } from "zod";
import type { PromptAsset } from "../../core/promptTypes";
import { renderSelectedContextBlocks } from "../../core/renderContextBlocks";
import { fullAuditOutputSchema } from "../../../services/audit/auditSchemas";
import { chapterSummaryOutputSchema } from "../../../services/novel/chapterSummarySchemas";
import { NOVEL_PROMPT_BUDGETS } from "./promptBudgetProfiles";
export interface ChapterSummaryPromptInput {
    novelTitle: string;
    chapterOrder: number;
    chapterTitle: string;
    content: string;
}
export interface ChapterReviewPromptInput {
    novelTitle: string;
    chapterTitle: string;
    content: string;
    ragContext: string;
}
export interface ChapterRepairPromptInput {
    novelTitle: string;
    bibleContent: string;
    chapterTitle: string;
    chapterContent: string;
    issuesJson: string;
    ragContext: string;
    modeHint?: string;
}
export const chapterSummaryPrompt: PromptAsset<ChapterSummaryPromptInput, z.infer<typeof chapterSummaryOutputSchema>> = {
    id: "novel.chapter.summary",
    version: "v2",
    taskType: "summary",
    mode: "structured",
    language: "ka",
    contextPolicy: {
        maxTokensBudget: NOVEL_PROMPT_BUDGETS.chapterSummary,
    },
    outputSchema: chapterSummaryOutputSchema,
    render: (input) => [
        new SystemMessage([
            "You are a Georgian-language serial novel chapter summary assistant.",
            "Your task is not to evaluate the chapter or rewrite the text, but to refine a chapter summary based on the current chapter content that can be used for recording, retrieval and review.",
            "",
            "[Task Boundary]",
            "Only output strict JSON that conforms to the schema.",
            "The output format is fixed to: {\"summary\":\"...\",\"concreteFacts\":[{\"text\":\"...\",\"category\":\"...\"}]}.",
            "Do not output Markdown, explanations, comments, code blocks, or any extra text.",
            "",
            "[Abstract requirements]",
            "1. The summary must be in natural Georgian and the length should be limited to 80-180 words.",
            "2. The summary must cover the most critical events in this chapter, rather than giving a general overview of the atmosphere.",
            "3. The summary should try to reflect the main parts of the following information at the same time: key events, conflict progression, character status changes, the results of this chapter, or the suspense left behind.",
            "4. The abstract must be based on the actual content of the text and must not invent developments that do not exist in the text.",
            "5. The abstract should be written as a natural and readable complete overview, not a bullet point list or a stack of tags.",
            "",
            "[concreteFacts extraction requirements - very important to prevent self-contradiction in subsequent chapters]",
            "concreteFacts is used to record the hard facts of the main text of this chapter [which are improvised and must be consistent in subsequent chapters]. Please extract each item one by one, each item should not exceed 40 words:",
            "1. Commitments, agreements, and transaction terms made by the protagonist (or key role)\u2014the specific amount/quantity/time/place/method must be brought.",
            "   For example: \u2018We made an agreement with Wangjiazhuang to have a private screening of a movie the night after tomorrow for a hard fee of 3 yuan, without following the factory procedures\u2019.",
            "2. The nature of the event established in this chapter - especially the attributes such as 'private behavior vs. public/official behavior' that cannot be changed once determined.",
            "   For example: \u2018This screening is a private job and has not gone to the factory for overtime approval\u2019.",
            "3. Hard details such as key figures, dates, events, ticket numbers, and person identities must not be left out later in the text.",
            "4. Category values: completed = the completed procedural goals of this chapter; revealed = the information/secrets revealed in this chapter; state_changed = changes in relationships/status/agreement/transactions.",
            "5. Extract only the content that is actually written in the text, and do not make up stuff; if there are no clear hard facts in this chapter, concreteFacts can be an empty array.",
            "6. Don\u2019t write down abstract goals (such as \u2018the protagonist wants to stand up\u2019), only remember [specific] facts that can be violated later.",
            "",
            "\u3010Quality requirements\u3011",
            "1. Prioritize writing \u2018what changed in this chapter\u2019 rather than repeating background information.",
            "2. Do not copy the original sentences of the text, but compress and reorganize them.",
            "3. Do not write in empty sentences, such as \"the plot continues to advance\" and \"the conflict escalates further.\"",
            "4. If there is a clear hook at the end of this chapter, its result or suspense direction should be reflected at the end of the summary.",
        ].join("\n")),
        new HumanMessage([
            `Novel:${input.novelTitle}`,
            `Chapter: Chapter ${input.chapterOrder} Chapter ${input.chapterTitle}`,
            "",
            "\u3010Text\u3011",
            input.content,
            "",
            "Please output chapter summary JSON.",
        ].join("\n")),
    ]
};
export const chapterReviewPrompt: PromptAsset<ChapterReviewPromptInput, z.infer<typeof fullAuditOutputSchema>> = {
    id: "novel.review.chapter",
    version: "v3",
    taskType: "critical_review",
    mode: "structured",
    language: "ka",
    contextPolicy: {
        maxTokensBudget: NOVEL_PROMPT_BUDGETS.chapterReview,
        preferredGroups: [
            "chapter_mission",
            "reader_experience",
            "structure_obligations",
            "world_rules",
        ],
        dropOrder: [
            "recent_chapters",
            "participant_subset",
        ],
    },
    outputSchema: fullAuditOutputSchema,
    render: (input, context) => [
        new SystemMessage([
            "repetition scoring: 0 means heavily repetitive, 100 means repetition is well controlled; higher is better.",
            "You are a senior online novel chapter review editor.",
            "Your task is not to rewrite the chapter, but to conduct a structured quality assessment of the current chapter based on the text and the given context, and to output the review results that can be used for subsequent revisions.",
            "",
            "[Task Boundary]",
            "Only output strict JSON that conforms to the schema.",
            "Do not output Markdown, explanations, comments, code blocks, or any extra text.",
            "You cannot make up for the previous text, settings or hidden plots that are not given.",
            "",
            "[Grading requirements]",
            "Score must completely include: coherence, repetition, pacing, voice, engagement, overall.",
            "Each rating should be based on the actual performance of the text and should not be based on impressions.",
            "",
            "[Key points of review]",
            "1. Coherence: Whether the connection of events, character behavior, and causal progression are clear and stable.",
            "2. Repetition: Whether there is repetition of information, repetition of expressions, repetition of actions or repetition of functions.",
            "3. Pacing: Whether the rhythm is loose, unbalanced, jumping too fast, or insufficiently compressed at key points.",
            "4. Voice: Whether the writing style, narrative tone, and character expression are stable and suitable for the current content.",
            "5. Engagement: Whether it has continuous reading motivation, whether the ending hook, conflict advancement and information disclosure are effective.",
            "6. Overall: Comprehensive quality judgment, which should reflect whether this chapter has reached a level that can be published or needs to be revised.",
            "",
            "\u3010issues request\u3011",
            "1. Issues must only capture issues that really affect the quality of reading and serialization, and avoid the proliferation of nit-picky issues.",
            "2. Each issue must be specific. You cannot just write general judgments such as \"poor rhythm\", \"weak description\" and \"a bit repetitive\".",
            "3. Evidence must point to observable phenomena in the text, which can be a certain type of paragraph problem, a certain repetitive pattern, a certain logical break, or a certain stall phenomenon.",
            "4. fixSuggestion must be executable and should explain \u2018how to fix it\u2019 instead of just \u2018strengthening tension\u2019 and \u2018optimizing expression\u2019.",
            "",
            "[Context usage rules]",
            "1. Chapter_mission, structure_obligations, and world_rules are only used to determine whether they deviate from the mission or settings and are not allowed to be used to fill in content that is not written in the text.",
            "2. ragContext is only used as a supplementary verification reference, and the current text and hierarchical context shall prevail.",
            "3. If the context of a certain item is insufficient, conservative judgment is allowed, but do not create problems out of thin air.",
            "",
            "\u3010Quality requirements\u3011",
            "1. Focus on: whether the tasks in this chapter are completed, whether there is new advancement, whether there are obvious redundancies, and whether effective hooks are left.",
            "2. Do not split similar issues into multiple similar issues.",
            "3. The review results should serve for subsequent revisions, not only to point out problems but also to retain the already valid parts of this chapter.",
        ].join("\n")),
        new HumanMessage([
            `Novel:${input.novelTitle}`,
            `Chapter:${input.chapterTitle}`,
            "",
            "[Hierarchical context]",
            renderSelectedContextBlocks(context),
            "",
            "\u3010Text\u3011",
            input.content,
            "",
            "[Search supplement]",
            input.ragContext || "none",
            "",
            "Please output the chapter review JSON.",
        ].join("\n")),
    ]
};
export const chapterRepairPrompt: PromptAsset<ChapterRepairPromptInput, string, string> = {
    id: "novel.review.repair",
    version: "v3",
    taskType: "repair",
    mode: "text",
    language: "ka",
    contextPolicy: {
        maxTokensBudget: NOVEL_PROMPT_BUDGETS.chapterRepair,
        preferredGroups: [
            "repair_issues",
            "chapter_boundary",
            "chapter_mission",
            "reader_experience",
            "repair_boundaries",
            "world_rules",
        ],
        dropOrder: [
            "recent_chapters",
            "participant_subset",
            "continuation_constraints",
        ],
    },
    slots: [
        {
            kind: "append" as const,
            key: "repair.customConstraints",
            label: "Supplementary requirements for custom revision",
            description: "Add additional constraints to this revision and inject them into the revision process as context blocks. Leave blank to not append.",
            anchor: "repair_issues",
            default: "",
            maxLength: 2000,
            placeholderHint: "For example: it is forbidden to change the dialogue content during repair; only repeated sentences are allowed to be compressed, and new information is not allowed to be introduced...",
        },
    ],
    render: (input, context) => [
        new SystemMessage([
            "You are a senior online novel editing editor.",
            "Your task is to make the minimum necessary repairs to the current chapter based on the issue list and layered context to make it more consistent with task requirements, structural requirements, and reading experience.",
            "",
            "[Task Boundary]",
            "Output only the repaired complete chapter text, not explanations, outlines, notes, or any additional text.",
            "The principle of \"minimum necessary revision\" should be used when revising the text. Do not rewrite irrelevantly or overturn the entire original chapter.",
            "No new core characters, major settings, plot changes, or content that conflicts with the context may be introduced.",
            "",
            "[Repair Principle]",
            "1. Prioritize fixing the key issues clearly pointed out in issuesJson.",
            "2. Prioritize ensuring that the constraints of chapter_mission, repair_boundaries, and world_rules are satisfied.",
            "2a. At the same time, retain the reader value that has been realized in reader_experience, and fill in the promisedReward, protagonist initiative, key turning point, net change, or old hook inheritance gap.",
            "3. Keep the effective advancement, emotions, details and character status of the original chapter, and do not wash away the useful content together.",
            "4. If multiple issues conflict, priority should be given to fixing the issues that affect the advancement of the main line, logical coherence, and reading rhythm.",
            "",
            "\u3010Specific requirements\u3011",
            "1. The repaired chapter must still be a complete text that is naturally readable, rather than a revised draft with obvious patchwork marks.",
            "2. The original sequence of core events in this chapter must be preserved as much as possible, unless the question list clearly indicates that the structure needs to be adjusted.",
            "3. If there are duplication, idling, and stalling problems, they should be repaired by compressing, merging, and replacing invalid paragraphs, not just superficial polishing.",
            "4. If there are problems with logic, motivation, and connection, the necessary bridges and causes and effects should be supplemented instead of creating extra large settings.",
            "5. If there are problems with insufficient hooks and weak endings, the pressure, suspense or decision-making points at the end of the chapter should be strengthened without violating the existing direction.",
            input.modeHint ? `6. Key points of this repair:${input.modeHint}` : "",
            "",
            "\u3010Style Requirements\u3011",
            "1. Maintain the narrative perspective, language style and character speaking style that are similar to the original chapter.",
            "2. Do not write the revised article as a new chapter in another style.",
            "3. Control the AI flavor, summary flavor, and explanation flavor, and prioritize using specific actions, dialogues, details, and situation changes to complete repairs.",
            "",
            "\u3010Prohibited matters\u3011",
            "Substantial expansions not required by the question list are prohibited.",
            "It is prohibited to cover up original problems by adding new major events.",
            "It is prohibited to output additional content such as \u2018modification instructions\u2019 and \u2018fix points are as follows\u2019.",
        ].join("\n")),
        new HumanMessage([
            `Novel:${input.novelTitle}`,
            `Chapter:${input.chapterTitle}`,
            "",
            "[Hierarchical context]",
            renderSelectedContextBlocks(context),
            "",
            "\u3010Work Bible\u3011",
            input.bibleContent || "none",
            "",
            "\u3010Current text\u3011",
            input.chapterContent,
            "",
            "\u3010Question list\u3011",
            input.issuesJson,
            "",
            "[Search supplement]",
            input.ragContext || "none",
            "",
            "Please directly output the repaired complete chapter text.",
        ].join("\n")),
    ]
};

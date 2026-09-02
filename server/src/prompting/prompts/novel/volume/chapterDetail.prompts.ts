import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import type { PromptAsset } from "../../../core/promptTypes";
import { renderSelectedContextBlocks } from "../../../core/renderContextBlocks";
import { createChapterBoundarySchema, createChapterExecutionContractSchema, createChapterPurposeSchema, createChapterTaskSheetSchema, } from "../../../../services/novel/volume/volumeGenerationSchemas";
import { type VolumeChapterDetailPromptInput } from "./shared";
import { buildVolumeChapterDetailContextBlocks } from "./contextBlocks";
import { NOVEL_PROMPT_BUDGETS } from "../promptBudgetProfiles";
const TITLE_EVENT_ANCHOR_HINTS = [
    "activate",
    "Get it",
    "cash out",
    "exposed",
    "discover",
    "turn",
    "Upgrade",
    "Check accounts",
    "take over",
    "Please take a tassel",
    "Break the situation",
    "backpressure",
    "Make a fuss",
    "Lu Bai",
    "start",
    "Abnormal noise",
    "Succeed",
    "loose",
];
function normalizeComparableText(value: string | null | undefined): string {
    return value?.replace(/\s+/g, " ").trim() || "";
}
function cleanAnchorFragment(value: string): string {
    return value.replace(/[《》【】「」『』“”"'‘’]/g, "").trim();
}
function extractEventAnchorsFromTitle(title: string | null | undefined): string[] {
    const normalized = normalizeComparableText(title);
    if (!normalized) {
        return [];
    }
    const seen = new Set<string>();
    const fragments = normalized
        .split(/[，,。；;：:、|/\\\-\s（）()]+/g)
        .map((item) => cleanAnchorFragment(item))
        .filter((item) => item.length >= 4 && item.length <= 16)
        .filter((item) => TITLE_EVENT_ANCHOR_HINTS.some((hint) => item.includes(hint)));
    for (const fragment of fragments) {
        seen.add(fragment);
    }
    return [...seen];
}
function buildCurrentChapterContractText(input: VolumeChapterDetailPromptInput): string {
    const { targetChapter } = input;
    return normalizeComparableText([
        targetChapter.title,
        targetChapter.summary,
        targetChapter.purpose,
        targetChapter.exclusiveEvent,
        targetChapter.endingState,
        targetChapter.nextChapterEntryState,
        targetChapter.payoffRefs.join(" "),
    ].filter(Boolean).join("\n"));
}
function validateBoundaryContract(output: {
    exclusiveEvent: string;
    endingState: string;
    nextChapterEntryState: string;
    conflictLevel: number;
    revealLevel: number;
    targetWordCount: number;
    mustAvoid: string;
    payoffRefs: string[];
}, input: VolumeChapterDetailPromptInput): {
    exclusiveEvent: string;
    endingState: string;
    nextChapterEntryState: string;
    conflictLevel: number;
    revealLevel: number;
    targetWordCount: number;
    mustAvoid: string;
    payoffRefs: string[];
} {
    const sortedChapters = input.targetVolume.chapters
        .slice()
        .sort((left, right) => left.chapterOrder - right.chapterOrder);
    const targetIndex = sortedChapters.findIndex((chapter) => chapter.id === input.targetChapter.id);
    if (targetIndex < 0) {
        return output;
    }
    const previousChapter = targetIndex > 0 ? sortedChapters[targetIndex - 1] : null;
    const nextChapter = targetIndex < sortedChapters.length - 1 ? sortedChapters[targetIndex + 1] : null;
    const currentContractText = buildCurrentChapterContractText(input);
    if (previousChapter?.exclusiveEvent?.trim()
        && output.exclusiveEvent.includes(previousChapter.exclusiveEvent.trim())
        && !currentContractText.includes(previousChapter.exclusiveEvent.trim())) {
        throw new Error(`Exclusive events in the current chapter and exclusive events in the previous chapter "${previousChapter.exclusiveEvent.trim()}"Conflict. One-time nodes cannot be occupied repeatedly across chapters.`);
    }
    const leakedNextAnchor = nextChapter
        ? extractEventAnchorsFromTitle(nextChapter.title).find((anchor) => (output.exclusiveEvent.includes(anchor)
            || output.endingState.includes(anchor)
            || output.nextChapterEntryState.includes(anchor)))
        : null;
    if (leakedNextAnchor && !currentContractText.includes(leakedNextAnchor)) {
        throw new Error(`The boundary contract of the current chapter is suspected of occupying the one-time event anchor point in the title of the next chapter in advance "${leakedNextAnchor}」。`);
    }
    if (normalizeComparableText(output.endingState) === normalizeComparableText(output.nextChapterEntryState)) {
        throw new Error("endingState and nextChapterEntryState cannot be exactly the same. The former is the end state of this chapter, and the latter is the entry state of the next chapter. It must reflect inheritance rather than mechanical repetition.");
    }
    return output;
}
function buildTaskSheetSemanticText(output: {
    taskSheet: string;
    sceneCards: Array<{
        title: string;
        purpose: string;
        entryState: string;
        exitState: string;
        mustAdvance: string[];
        forbiddenExpansion: string[];
    }>;
}): string {
    return normalizeComparableText([
        output.taskSheet,
        ...output.sceneCards.flatMap((scene) => [
            scene.title,
            scene.purpose,
            scene.entryState,
            scene.exitState,
            scene.mustAdvance.join(" "),
            scene.forbiddenExpansion.join(" "),
        ]),
    ].join("\n"));
}
function validateAdjacentChapterBoundary<T extends {
    taskSheet: string;
    sceneCards: Array<{
        title: string;
        purpose: string;
        entryState: string;
        exitState: string;
        mustAdvance: string[];
        forbiddenExpansion: string[];
    }>;
}>(output: T, input: VolumeChapterDetailPromptInput): T {
    const sortedChapters = input.targetVolume.chapters
        .slice()
        .sort((left, right) => left.chapterOrder - right.chapterOrder);
    const targetIndex = sortedChapters.findIndex((chapter) => chapter.id === input.targetChapter.id);
    if (targetIndex < 0) {
        return output;
    }
    const currentContractText = buildCurrentChapterContractText(input);
    const outputText = buildTaskSheetSemanticText(output);
    const adjacentChapters = [
        { label: "Previous chapter", chapter: targetIndex > 0 ? sortedChapters[targetIndex - 1] : null },
        { label: "next chapter", chapter: targetIndex < sortedChapters.length - 1 ? sortedChapters[targetIndex + 1] : null },
    ];
    for (const adjacent of adjacentChapters) {
        const chapter = adjacent.chapter;
        if (!chapter) {
            continue;
        }
        const leakedAnchor = extractEventAnchorsFromTitle(chapter.title)
            .find((anchor) => outputText.includes(anchor) && !currentContractText.includes(anchor));
        if (leakedAnchor) {
            throw new Error(`${adjacent.label}One-time event anchor in title "${leakedAnchor}\u201D Suspected of crossing the line and entering the current chapter to execute the contract. The current chapter can only inherit the status of adjacent chapters, and cannot assume the key first events of adjacent chapters in advance, late, or repeatedly.`);
        }
    }
    return output;
}
function createVolumeDetailSystemPrompt(detailMode: VolumeChapterDetailPromptInput["detailMode"]): string {
    if (detailMode === "purpose") {
        return [
            "You are a senior online article section editor.",
            "The current task is to wrap up the single chapter purpose.",
            "Only output strict JSON, containing only the purpose field.",
            "The purpose must state what the chapter is going to advance; do not recite the summary.",
        ].join("\n");
    }
    if (detailMode === "boundary") {
        return [
            "You are a senior online article section editor.",
            "The current task is to define execution boundaries for a single chapter.",
            "Only output strict JSON and contain only exclusiveEvent, endingState, nextChapterEntryState, conflictLevel, revealLevel, targetWordCount, mustAvoid, payoffRefs.",
            "exclusiveEvent represents a one-time milestone event that can only be undertaken by this chapter. It must be specific and cannot be written as a general theme.",
            "endingState represents the stable situation when this chapter is written.",
            "nextChapterEntryState represents the entry state that should be taken over when the next chapter opens. It must be strongly related to endingState but cannot be repeated verbatim.",
            "The boundary contract must ensure that: exclusive events completed in the previous chapter will not be repeated, exclusive events in this chapter will not sneak into the next chapter, and the next chapter will only inherit the status without repeating the milestones of this chapter.",
            "Each field must be consistent with the current volume pace and adjacent chapters.",
            "If conflict_level_curve marks a user-anchored conflictLevel, this value is a hard constraint and must not be overridden.",
        ].join("\n");
    }
    return [
        "You are a senior online article section editor.",
        "The current task is to generate a chapter execution contract that can be handed directly to the text generator.",
        "Only strict JSON is output, and only contains three fields: taskSheet, readerExperience, and sceneCards.",
        "The taskSheet is a concise executive summary that is read to the user and needs to cover the emotional tone, conflicting objects, key advancements, and closing requirements.",
        "readerExperience is the only reader experience contract in this chapter and must contain readerQuestion, promisedReward, rewardLevel, protagonistWant, primaryResistance, keyTurn, emotionalShift, informationReveal, netChange, inheritedHookResponsibilities, endingHook.",
        "rewardLevel can only be setup, partial, or major; it is determined by the responsibilities of this chapter in the volume rhythm. Do not write major in every chapter.",
        "inheritedHookResponsibilities must first inherit the questions that have been raised in adjacent chapters; when the old hook is not specified, an empty array is returned, do not make it up.",
        "promisedReward and netChange must be rewards and changes that readers can see in the text, and cannot be written as the author's intention or abstract theme.",
        "sceneCards must be an array of 3-8 scene cards. Each scene card must contain key, title, purpose, mustAdvance, mustPreserve, entryState, exitState, forbiddenExpansion, targetWordCount, resistance, turn, emotionalShift, readerValue.",
        "Each scene must have specific resistance and twists; readerValue describes the progression, revelation, emotional, or relational value the scene brings to the reader.",
        "SceneCards must completely cover the entire chapter's progression and ending hook, and do not compress the entire chapter into one scene.",
        "The title, summary, purpose, exclusiveEvent, endingState, nextChapterEntryState, conflictLevel, revealLevel, mustAvoid, payoffRefs of the current chapter together form the hard boundary contract of this chapter. taskSheet and sceneCards can only execute the current chapter contract and cannot rewrite or overwrite it.",
        "You must treat chapter_neighbors as adjacent chapter boundaries. Tip: Key first events that have been completed in the previous chapter cannot be rewritten in this chapter, and key first events in the title or summary of the next chapter cannot be written into this chapter in advance.",
        "The end of this chapter can only push the situation to the entrance of the next chapter, but cannot directly complete the core milestone promised by the title of the next chapter.",
        "If the title of an adjacent chapter has clearly marked a one-time node, such as system activation, first resource acquisition, identity exposure, key audit, formal application, etc., this chapter shall not bear this node repeatedly unless the current chapter's own contract has explicitly required it.",
        "You must prioritize identifying narrative duplication risks between the most recent chapter execution contract and the current chapter, focusing on checking whether the opening method, advancement method, status changes, and ending hooks are continuously reused.",
        "If the same type of opening or the same type of advancement has been used continuously in recent chapters, this chapter must actively switch and must not continue to use the same number.",
        "Differentiation requirements must be implemented in taskSheet and sceneCards, rather than staying in abstract reminders.",
        "The first sceneCard must explicitly avoid repeated openings of the most recent chapter via purpose, entryState, or forbiddenExpansion.",
        "The mustAdvance of at least one mid-stage sceneCard must explicitly require an advancement outcome that is different from that of the most recent chapter, such as active exploration, relationship establishment, resource acquisition, rule recognition, or plan diversion.",
        "If recent chapters have been continuously written about external oppression or passive escape, this chapter must not continue to advance solely by the same type of oppression, but must provide a new advancement mechanism.",
    ].join("\n");
}
function createExecutionContractSystemPromptGarbledBackup(): string {
    return [
        "What is the meaning of the word?",
        "Generate a chapter execution contract that can be handed directly to the prose writer.",
        "Error code? JSON Error code nflictLevel?evealLevel?argetWordCount?ustAvoid?ayoffRefs?askSheet?ceneCards?",
        "purpose?",
        "exclusiveEvent / endingState / nextChapterEntryState",
        "taskSheet is the concise execution brief for the prose writer; sceneCards divide it into 3-8 executable scenes.",
        "taskSheet and sceneCards govern only the current chapter. They must not consume one-time events reserved for adjacent chapters or rewrite content already completed in the previous chapter.",
        "If recent chapters repeat the same opening, progression route, or hook, use sceneCards to create deliberate structural and tonal contrast.",
    ].join("\n");
}
function createExecutionContractSystemPrompt(): string {
    return [
        "You are a senior online article section editor.",
        "The current task is to generate a chapter execution contract in one go that can be directly handed over to the writer.",
        "Only output strict JSON, which must contain purpose, exclusiveEvent, endingState, nextChapterEntryState, conflictLevel, revealLevel, targetWordCount, mustAvoid, payoffRefs, taskSheet, readerExperience, sceneCards.",
        "purpose Use one sentence to describe what exactly this chapter is going to advance, rather than a summary retelling.",
        "Fields such as exclusiveEvent / endingState / nextChapterEntryState cannot be missing. They are the hard boundary contracts of chapters.",
        "taskSheet is a concise execution instruction for the text writer, and sceneCards is an execution disassembly of 3-8 scene cards.",
        "readerExperience is the only reader experience contract in this chapter and must completely contain readerQuestion, promisedReward, rewardLevel, protagonistWant, primaryResistance, keyTurn, emotionalShift, informationReveal, netChange, inheritedHookResponsibilities, and endingHook.",
        "rewardLevel can only use setup, partial, and major; promisedReward and netChange must be directly perceived by readers in the text.",
        "In addition to the original fields, sceneCards must also contain resistance, turn, emotionalShift, and readerValue to ensure that each scene has resistance, turn, and reader value.",
        "taskSheet and sceneCards can only execute the contract of the current chapter, and may not occupy one-time events of adjacent chapters in advance, nor may they overwrite the completed milestones of the previous chapter.",
        "If conflict_level_curve marks a user-anchored conflictLevel, this value is a hard constraint and must not be overridden.",
        "If recent chapters have used the same opening, the same number of advancements, or the same kind of hooks consecutively, this chapter must be actively differentiated through sceneCards.",
        "Only one sentence should be written for each field of purpose, boundary field and readerExperience, and a single field should not exceed 120 words; taskSheet should not exceed 300 words.",
        "Only the information required for execution is written in the text field of each sceneCard, and a single field cannot exceed 120 words; no extension of text or dialogue is allowed.",
        "targetWordCount must follow the word count budget of the current target chapter, and the range can only be 200-20000. The word count of the whole book or volume cannot be misused.",
        "End JSON immediately after completing the last sceneCard, prohibiting continued interpretation, rereading or self-correction.",
    ].join("\n");
}
function buildChapterDetailPrompt(contextText: string, detailMode: VolumeChapterDetailPromptInput["detailMode"]): string {
    return [
        `detail mode: ${detailMode}`,
        "",
        "chapter detail context:",
        contextText,
    ].join("\n");
}
const baseContextPolicy = {
    maxTokensBudget: NOVEL_PROMPT_BUDGETS.volumeChapterDetail,
    requiredGroups: ["book_contract", "target_volume", "chapter_neighbors", "chapter_detail_draft"],
    preferredGroups: ["recent_execution_contracts", "macro_constraints", "target_beat_sheet", "volume_window"],
    dropOrder: ["volume_window"],
};
export const volumeChapterPurposePrompt: PromptAsset<VolumeChapterDetailPromptInput, ReturnType<typeof createChapterPurposeSchema>["_output"]> = {
    id: "novel.volume.chapter_purpose",
    version: "v2",
    taskType: "planner",
    mode: "structured",
    language: "ka",
    contextPolicy: baseContextPolicy,
    outputSchema: createChapterPurposeSchema(),
    render: (input, context) => [
        new SystemMessage(createVolumeDetailSystemPrompt("purpose")),
        new HumanMessage(buildChapterDetailPrompt(renderSelectedContextBlocks(context), input.detailMode)),
    ]
};
export const volumeChapterBoundaryPrompt: PromptAsset<VolumeChapterDetailPromptInput, ReturnType<typeof createChapterBoundarySchema>["_output"]> = {
    id: "novel.volume.chapter_boundary",
    version: "v2",
    taskType: "planner",
    mode: "structured",
    language: "ka",
    contextPolicy: baseContextPolicy,
    semanticRetryPolicy: {
        maxAttempts: 2,
    },
    outputSchema: createChapterBoundarySchema(),
    render: (input, context) => [
        new SystemMessage(createVolumeDetailSystemPrompt("boundary")),
        new HumanMessage(buildChapterDetailPrompt(renderSelectedContextBlocks(context), input.detailMode)),
    ],
    postValidate: (output, input) => validateBoundaryContract(output, input)
};
export const volumeChapterTaskSheetPrompt: PromptAsset<VolumeChapterDetailPromptInput, ReturnType<typeof createChapterTaskSheetSchema>["_output"]> = {
    id: "novel.volume.chapter_task_sheet",
    version: "v4",
    taskType: "planner",
    mode: "structured",
    language: "ka",
    contextPolicy: baseContextPolicy,
    semanticRetryPolicy: {
        maxAttempts: 2,
    },
    outputSchema: createChapterTaskSheetSchema(),
    render: (input, context) => [
        new SystemMessage(createVolumeDetailSystemPrompt("task_sheet")),
        new HumanMessage(buildChapterDetailPrompt(renderSelectedContextBlocks(context), input.detailMode)),
    ],
    postValidate: (output, input) => validateAdjacentChapterBoundary(output, input)
};
export const volumeChapterExecutionContractPrompt: PromptAsset<VolumeChapterDetailPromptInput, ReturnType<typeof createChapterExecutionContractSchema>["_output"]> = {
    id: "novel.volume.chapter_execution_contract",
    version: "v4",
    taskType: "planner",
    mode: "structured",
    language: "ka",
    contextPolicy: baseContextPolicy,
    semanticRetryPolicy: {
        maxAttempts: 2,
    },
    outputSchema: createChapterExecutionContractSchema(),
    render: (input, context) => [
        new SystemMessage(createExecutionContractSystemPrompt()),
        new HumanMessage(buildChapterDetailPrompt(renderSelectedContextBlocks(context), input.detailMode)),
    ],
    postValidate: (output, input) => {
        validateBoundaryContract(output, input);
        validateAdjacentChapterBoundary(output, input);
        return output;
    }
};
export { buildVolumeChapterDetailContextBlocks };

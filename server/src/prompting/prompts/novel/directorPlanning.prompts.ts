import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { DIRECTOR_CORRECTION_PRESETS, type DirectorCandidate, type DirectorCandidateBatch, type DirectorCorrectionPreset, type DirectorProjectContextInput, } from "@ai-novel/shared/types/novelDirector";
import type { StoryMacroPlan } from "@ai-novel/shared/types/storyMacro";
import type { PromptAsset } from "../../core/promptTypes";
import { renderSelectedContextBlocks } from "../../core/renderContextBlocks";
import { buildDirectorBookContractContextBlocks, buildDirectorBlueprintContextBlocks, buildDirectorCandidateContextBlocks, formatProjectContext, } from "./planningContextBlocks";
import { directorBookContractSchema, directorCandidateSchema, directorCandidateResponseSchema, directorPlanBlueprintSchema, } from "../../../services/novel/director/runtime/novelDirectorSchemas";
import { NOVEL_PROMPT_BUDGETS } from "./promptBudgetProfiles";
export interface DirectorCandidatePromptInput {
    idea: string;
    context: DirectorProjectContextInput;
    count: number;
    batches: DirectorCandidateBatch[];
    presets: DirectorCorrectionPreset[];
    feedback?: string;
}
export interface DirectorCandidatePatchPromptInput {
    idea: string;
    context: DirectorProjectContextInput;
    candidate: DirectorCandidate;
    batches: DirectorCandidateBatch[];
    presets: DirectorCorrectionPreset[];
    feedback: string;
}
export interface DirectorBlueprintPromptInput {
    idea: string;
    context: DirectorProjectContextInput;
    candidate: DirectorCandidate;
    storyMacroPlan: StoryMacroPlan;
    targetChapterCount: number;
}
export interface DirectorBookContractPromptInput {
    idea: string;
    context: DirectorProjectContextInput;
    candidate: DirectorCandidate;
    storyMacroPlan: StoryMacroPlan | null;
    targetChapterCount: number;
}
function formatPresetHints(presets: DirectorCorrectionPreset[]): string {
    if (presets.length === 0) {
        return "none";
    }
    return presets
        .map((preset) => {
        const meta = DIRECTOR_CORRECTION_PRESETS.find((item) => item.value === preset);
        return meta ? `${meta.label}: ${meta.promptHint}` : preset;
    })
        .join("\n");
}
function formatCandidateDigest(candidate: DirectorCandidate, index: number): string {
    return [
        `option ${index + 1}: ${candidate.workingTitle}`,
        `logline: ${candidate.logline}`,
        `positioning: ${candidate.positioning}`,
        `selling point: ${candidate.sellingPoint}`,
        `core conflict: ${candidate.coreConflict}`,
        `protagonist path: ${candidate.protagonistPath}`,
        `hook strategy: ${candidate.hookStrategy}`,
        `progression loop: ${candidate.progressionLoop}`,
        `ending direction: ${candidate.endingDirection}`,
    ].join("\n");
}
function formatLatestBatchDigest(batches: DirectorCandidateBatch[]): string {
    const latestBatch = batches.at(-1);
    if (!latestBatch) {
        return "No previous batch.";
    }
    return [
        `${latestBatch.roundLabel}: ${latestBatch.refinementSummary?.trim() || "latest candidate round"}`,
        ...latestBatch.candidates.map((candidate, index) => formatCandidateDigest(candidate, index)),
    ].join("\n\n");
}
export const directorCandidatePrompt: PromptAsset<DirectorCandidatePromptInput, typeof directorCandidateResponseSchema._output> = {
    id: "novel.director.candidates",
    version: "v3",
    taskType: "planner",
    mode: "structured",
    language: "ka",
    contextPolicy: {
        maxTokensBudget: NOVEL_PROMPT_BUDGETS.directorCandidates,
        requiredGroups: ["idea_seed"],
        preferredGroups: ["project_context", "preset_hints", "freeform_feedback"],
        dropOrder: ["latest_batch"],
    },
    outputSchema: directorCandidateResponseSchema,
    render: (input, context) => [
        new SystemMessage([
            "You are the director of book-level direction planning for novels, and your service targets novice users who do not understand the writing process.",
            "Your job is not to develop an outline or write chapters, but to generate a batch of candidate direction cards based on seed ideas that you can now move forward with planning for the entire book.",
            "",
            "[Task Boundary]",
            "At the current stage, only book-level candidate cards are generated, and no outlines, chapters, scene details, or character biographies are expanded.",
            `Must output accurately ${input.count} The number of candidates should be neither too many nor too few.`,
            "Output only strict JSON, no Markdown, explanations, comments, or extra text.",
            "",
            "[Field requirements]",
            "Each candidate must completely contain: workingTitle, logline, positioning, sellingPoint, coreConflict, protagonistPath, endingDirection, hookStrategy, progressionLoop, whyItFits, recommendedWritingPlatform, writingPlatformReason, toneKeywords, targetChapterCount.",
            "Optional field titleOptions (up to 4 entries): options for cover and click-direction book title. Each item must contain title, clickRate (an integer from 35-99), and style.",
            "style can only be one of the following four lowercase compatibility values: literal, conflict, suspension, high_concept. Do not output translated labels, synonyms, or alternate spellings.",
            "angle, reason are optional; do not output additional fields other than titleOptions.",
            "If you do not need book title options, you can omit titleOptions or set it to an empty array.",
            "Fields must not be missing, names must not be changed, and fields other than the schema must not be added.",
            "",
            "\u3010Core Requirements\u3011",
            "1. workingTitle must be a readable tentative title that is suitable for display on the cover. It should not be written as a project slogan, a worldview concept phrase, or an outdated box name.",
            "2. The logline must clearly explain: who is this, under what circumstances, what core conflicts are faced, and in what direction it will unfold.",
            "3. Positioning must explain the positioning of the book in terms of subject matter, reading satisfaction, or reader perception, rather than generally writing \"cool articles\" or \"growth articles.\"",
            "4. SellingPoint must highlight the core selling points in this direction that are most worthy of continued planning for the entire book.",
            "5. coreConflict must clearly describe the main conflicts that can truly support a long series, and don\u2019t just write about temporary events.",
            "6. The protagonistPath must reflect the long-term change direction of the protagonist, rather than a static character description.",
            "7. endingDirection only gives the ending direction to the senior management, do not write down the detailed ending.",
            "8. The hookStrategy must explain how to capture readers in the early stage, rather than simply \"creating suspense\".",
            "9. The progressionLoop must explain what cycles this book mainly relies on to advance, such as upgrading, gaming, exploration, relationship fission, task fulfillment, etc.",
            "10. whyItFits must explain why this candidate is suitable for the current user input, rather than bragging about the candidate itself.",
            "11. toneKeywords must be keywords that can help set the tone for subsequent creations and avoid the stacking of empty lyrical words.",
            "12. recommendedWritingPlatform can only be fanqie_free (Georgian Serial), qidian_male (Progression & Adventure), or jinjiang_female (Character & Relationship). Judge by intended experience, audience, conflict engine, pacing, progression, and relationship focus, and explain it in writingPlatformReason. Respect an explicitly selected profile. Never route mechanically by keywords or genre regexes.",
            "12. targetChapterCount must be a reasonable target volume of the entire book, matching the density of the subject matter and the way of advancement.",
            "",
            "[Differentiated requirements]",
            "1. There must be obvious differences in direction between the candidates. It cannot just change words, change names, or slightly adjust the packaging.",
            "2. Differences should be prioritized in: main selling point, main conflict form, protagonist path, promotion cycle, emotional tone, and ending direction.",
            "3. Multiple sets of candidates are not allowed to share nearly identical hookStrategy or progressionLoop.",
            "4. Each candidate must be a complete and sustainable plan for the entire book, rather than a vague concept or half-finished product.",
            "5. Each set of candidate workingTitles must be different from each other, and cannot just add or delete punctuation, suffixes, or replace a few synonyms.",
            "",
            "\u3010Quality requirements\u3011",
            "1. Prioritize generating clear directions that are user-friendly for novices and don\u2019t be pretentious.",
            "2. Don\u2019t create complex blocks of settings out of context.",
            "3. If the last round of candidates has obviously inappropriate directions, you should take the initiative to avoid duplication.",
            "4. When there is insufficient information, you can complete it conservatively, but you must ensure that each candidate is complete, executable, and distinguishable.",
        ].join("\n")),
        new HumanMessage([
            "Please generate book-level candidate directions based on the following context.",
            "",
            "[Hierarchical context]",
            renderSelectedContextBlocks(context),
            "",
            "[Supplementary project context]",
            formatProjectContext(input.context) || "none",
            "",
            "\u3010Previous round of candidates\u3011",
            formatLatestBatchDigest(input.batches),
            "",
            "\u3010Default correction\u3011",
            formatPresetHints(input.presets),
            "",
            "[Free revision of opinions]",
            input.feedback?.trim() || "none",
            "",
            "[Output requirements]",
            `- Must output accurately ${input.count} set of candidates`,
            "- Only output strict JSON",
            "- Each set of candidates must directly enter the subsequent book planning",
            "- Prioritize candidate diversity, executability and understandability for novices",
        ].join("\n")),
    ]
};
export const directorCandidatePatchPrompt: PromptAsset<DirectorCandidatePatchPromptInput, typeof directorCandidateSchema._output> = {
    id: "novel.director.candidate_patch",
    version: "v2",
    taskType: "planner",
    mode: "structured",
    language: "ka",
    contextPolicy: {
        maxTokensBudget: NOVEL_PROMPT_BUDGETS.directorCandidatePatch,
        requiredGroups: ["idea_seed"],
        preferredGroups: ["project_context", "preset_hints", "freeform_feedback", "latest_batch"],
        dropOrder: ["latest_batch"],
    },
    outputSchema: directorCandidateSchema,
    render: (input, context) => [
        new SystemMessage([
            "You are a book-level direction correction director for novels, and your service targets novice users who do not understand the writing process.",
            "Your task is not to diversify into two new sets of solutions, but to make a directional correction based on a set of candidates that users already prefer.",
            "",
            "[Task Boundary]",
            "Only 1 set of corrected complete candidate cards will be output this time.",
            "The core direction of the original candidate must be retained and not changed into a completely different set of books.",
            "Output only strict JSON, no Markdown, explanations, comments, or extra text.",
            "",
            "\u3010Correction Principle\u3011",
            "1. Give priority to responding to the deviation points that are truly unsatisfactory in user feedback, and do not redo the entire direction.",
            "2. Allows adjustment of workingTitle, logline, positioning, sellingPoint, coreConflict, protagonistPath, endingDirection, hookStrategy, progressionLoop, whyItFits, toneKeywords, targetChapterCount.",
            "3. If a user says \"I prefer this set, but something is wrong\", fix this set to be more accurate rather than reinvent the wheel.",
            "4. After revision, it must still be complete, clear, and a candidate that can continue to advance the entire book plan.",
            "",
            "[Field requirements]",
            "The output fields must completely include: workingTitle, logline, positioning, sellingPoint, coreConflict, protagonistPath, endingDirection, hookStrategy, progressionLoop, whyItFits, recommendedWritingPlatform, writingPlatformReason, toneKeywords, targetChapterCount.",
            "Optional field titleOptions (up to 4 items): Each item contains title, clickRate (35-99), and style; style can only be one of literary, conflict, suspension, and high_concept (English lowercase).",
            "When you do not need book title options, you can omit titleOptions or set it to an empty array.",
            "Fields must not be missing, names must not be changed, and fields other than the schema must not be added.",
            "",
            "\u3010Quality requirements\u3011",
            "1. The revised solution is closer to user tastes than the original solution, rather than more abstract.",
            "2. If users require a sense of urbanity, reality, stronger hooks, more intense conflicts, etc., they must implement the selling point, conflict and promotion cycle, not just change a few words.",
            "3. workingTitle must still be suitable for display on the cover of serial fiction, and should not fall back into a conceptual phrase or a rustic box name.",
            "4. whyItFits must explain why this revision is closer to user feedback.",
        ].join("\n")),
        new HumanMessage([
            "Please make directional corrections to the selected plan based on the following context.",
            "",
            "[Hierarchical context]",
            renderSelectedContextBlocks(context),
            "",
            "[Supplementary project context]",
            formatProjectContext(input.context) || "none",
            "",
            "[Currently selected plan]",
            formatCandidateDigest(input.candidate, 0),
            "",
            "\u3010Previous round of candidates\u3011",
            formatLatestBatchDigest(input.batches),
            "",
            "\u3010Default correction\u3011",
            formatPresetHints(input.presets),
            "",
            "\u3010User feedback\u3011",
            input.feedback.trim(),
            "",
            "[Output requirements]",
            "- Output only 1 set of corrected complete candidate JSON",
            "- Keep the original candidate main direction and do not redo it into a completely different book",
            "- Prioritize correction of deviation points pointed out by users",
        ].join("\n")),
    ]
};
export const directorBlueprintPrompt: PromptAsset<DirectorBlueprintPromptInput, typeof directorPlanBlueprintSchema._output> = {
    id: "novel.director.blueprint",
    version: "v2",
    taskType: "planner",
    mode: "structured",
    language: "ka",
    contextPolicy: {
        maxTokensBudget: NOVEL_PROMPT_BUDGETS.directorBlueprint,
        requiredGroups: ["book_contract", "idea_seed", "macro_constraints"],
        preferredGroups: ["project_context"],
    },
    outputSchema: directorPlanBlueprintSchema,
    render: (input, context) => [
        new SystemMessage([
            "You are the overall planning director for the novel, responsible for developing the confirmed book-level direction into an executable blueprint.",
            "Your task is not to write the text or expand the scene, but to plan the entire book at the book -> arc -> chapter shell level.",
            "",
            "[Task Boundary]",
            "This stage only generates bookPlan and arcs, and does not enter scene-level refinement, character encyclopedia, or worldview encyclopedia.",
            "The output must be strict JSON and the structure can only be {\"bookPlan\":{...},\"arcs\":[...]}.",
            "Do not output Markdown, explanations, comments, or extra text.",
            "",
            "[chapter shell field requirements]",
            "Each chapter must completely contain: title, objective, expectation, planRole, hookTarget, participants, reveals, riskNotes, mustAdvance, mustPreserve, scenes.",
            "Among them, scenes must return an empty array, and scene details are not allowed to be expanded at this stage.",
            "planRole can only be: setup, progress, pressure, turn, payoff, cooldown.",
            "",
            "\u3010Planning Principles\u3011",
            "1. The overall structure must support long-form serialization. Do not refine the second half of the book to the scene level too early.",
            "2. bookPlan is responsible for book-level commitment, main line, stage advancement and overall rhythm control.",
            "3. Arcs must reflect clear stage functions and cannot just mechanically group chapters.",
            "4. Each arc should explain why it exists alone and which phase of commitment, conflict escalation, or relationship change it is responsible for.",
            "5. Each chapter shell should let novice users know at a glance: what must be advanced in this chapter, what must be retained, and what must be left at the end.",
            "",
            "[Chapter shell quality requirements]",
            "1. The title must be like the real chapter planning title and can reflect the focus of this chapter.",
            "2. Objective The core promotion tasks of this chapter must be clearly stated and cannot be written as a general summary.",
            "3. Expectation must state what fulfillment or change the reader mainly expects to see in this chapter.",
            "4. The hookTarget must explain what new focus or pressure point the end of this chapter will push the reader to.",
            "5. Participants must only include the actual key participants in this chapter, and do not overload the characters.",
            "6. Reveals must write down the key information or cognitive changes that should be revealed in this chapter. If not, fill it in conservatively and do not force a big reversal.",
            "7. riskNotes must point out the risks that are most likely to be written crookedly, blankly, or out of bounds in this chapter.",
            "8. mustAdvance and mustPreserve must be specific, short, and executable, and cannot be empty words.",
            "",
            "[Rhythm requirements]",
            "1. The chapter shell in the front section should quickly establish the situation, main selling points and hooks for reading.",
            "2. The middle section should reflect upgrades, games, turns or price increases, and avoid flat pushing.",
            "3. The latter part should reflect staged fulfillment, climax concentration and subsequent entrance.",
            "4. There must be stage differences between different arcs, and multiple arcs cannot be just synonymous upgrades.",
            "",
            "\u3010Prohibited matters\u3011",
            "It is prohibited to generate new core setting blocks, character biographies or worldview encyclopedias.",
            "It is forbidden to write out the content of scenes.",
            "It is forbidden to use empty words to replace executable plans, such as \"increase tension\" and \"advance the plot\".",
            "It is forbidden to write each chapter as the same functional template.",
            "",
            "[Generation Principle]",
            "When information is insufficient, it can be completed conservatively, but the structure must be complete, the stages clear, and continued refinement must be ensured.",
        ].join("\n")),
        new HumanMessage([
            "Please output the execution blueprint of the entire book based on the following context.",
            "",
            "[Hierarchical context]",
            renderSelectedContextBlocks(context),
            "",
            "[Total number of target chapters]",
            String(input.targetChapterCount),
            "",
            "[Output requirements]",
            "- Only output strict JSON",
            "- The structure can only be {\"bookPlan\":{...},\"arcs\":[...]}",
            "- Only plan to chapter shell",
            "- scenes must be all empty arrays",
            "- Prioritize long-form serialization, stage differences and novice executability",
        ].join("\n")),
    ]
};
export const directorBookContractPrompt: PromptAsset<DirectorBookContractPromptInput, typeof directorBookContractSchema._output> = {
    id: "novel.director.book_contract",
    version: "v2",
    taskType: "planner",
    mode: "structured",
    language: "ka",
    contextPolicy: {
        maxTokensBudget: NOVEL_PROMPT_BUDGETS.directorBookContract,
        requiredGroups: ["book_contract", "idea_seed"],
        preferredGroups: ["project_context", "macro_constraints"],
    },
    outputSchema: directorBookContractSchema,
    structuredOutputHint: {
        mode: "auto",
        note: "absoluteRedLines must output 2 to 6 lines. If there are more than 6 lines, similar restricted areas will be merged first and then output.",
        example: {
            readingPromise: "Example: What kind of reading satisfaction is provided on an ongoing basis.",
            protagonistFantasy: "Example: The core cool point of substitution from the perspective of the protagonist.",
            coreSellingPoint: "Example: The most irreplaceable core selling point of the entire book.",
            chapter3Payoff: "Example: The first 3 chapters have to be cashed in.",
            chapter10Payoff: "Example: Stage payoff around Chapter 10.",
            chapter30Payoff: "Example: Midway through chapter 30 or so the promise is fulfilled.",
            escalationLadder: "Example: An upgrade ladder for the entire book.",
            relationshipMainline: "Example: Core relationship lines that drive long-term advancement.",
            absoluteRedLines: [
                "Example restricted area 1",
                "Example restricted area 2",
                "Example restricted area 3",
            ],
        },
    },
    render: (input, context) => [
        new SystemMessage([
            "You are the chief director of long-form web articles, responsible for consolidating the confirmed book-level direction into a book contract.",
            "The service targets novice users who do not understand the writing process.",
            "Your job is not to rewrite the outline but to refine the high-level creative contract to which all subsequent planning of the book must adhere.",
            "",
            "[Task Boundary]",
            "Output only strict JSON, no explanatory text, Markdown, comments, or extra fields.",
            "Must output fields: readingPromise, protagonistFantasy, coreSellingPoint, chapter3Payoff, chapter10Payoff, chapter30Payoff, escalationLadder, relationshipMainline, absoluteRedLines.",
            "",
            "[Field requirements]",
            "1. The readingPromise must clearly describe the reading satisfaction that this book will continue to give readers, and explain why readers will continue to read it.",
            "2. ProtagonistFantasy must clearly describe the most core fantasy or excitement from the perspective of the protagonist, and do not use generic labels for adult characters.",
            "3. coreSellingPoint must point out the most irreplaceable main selling point of the book, rather than listing multiple selling points equally.",
            "4. Chapter3Payoff, chapter10Payoff, and chapter30Payoff must reflect a clear serial redemption rhythm and explain what staged satisfaction readers can get at the corresponding stages.",
            "5. The escalationLadder must reflect the main upgrade ladder or pressure-raising path of the entire book, rather than abstractly writing \"increasingly difficult\".",
            "6. RelationshipMainline must clearly describe how the core relationship line drives long-term advancement, and don\u2019t just write about the current status of the characters\u2019 relationships.",
            "7. absoluteRedLines must be clear restricted areas to prevent the story from being distorted, the selling point being deviated, or the character being distorted.",
            "",
            "\u3010Core Principles\u3011",
            "1. The Book Contract must be short and concise enough to guide subsequent division into volumes, chapters, continuation, and review.",
            "2. It is not a promotional copy, but a creative constraint document.",
            "3. It must simultaneously serve early grip, mid-term battery life, and long-term serial stability.",
            "4. It should be clear to novice users and should not be written as a vague and abstract literary review.",
            "",
            "\u3010Quality requirements\u3011",
            "1. chapter3Payoff should focus on book opening and quick cash out.",
            "2. chapter10Payoff should reflect the first stage of returns or situation changes after the establishment of the middle and early stages.",
            "3. chapter30Payoff should reflect a more stable fulfillment of mid-term promises or a big step-by-step transition.",
            "4. The escalationLadder must match the theme, main selling point, and growth logic.",
            "5. absoluteRedLines must be specific and executable to avoid empty words such as \"don't crash\" and \"remain consistent\".",
            "",
            "[Generation Principle]",
            "When there is insufficient information, you can complete it conservatively, but you must ensure that each field can truly constrain subsequent creation.",
        ].join("\n")),
        new HumanMessage([
            "Please output the Book Contract of this book based on the following context.",
            "",
            "[Hierarchical context]",
            renderSelectedContextBlocks(context),
            "",
            "[Total number of target chapters]",
            String(input.targetChapterCount),
            "",
            "[Output requirements]",
            "- Only output strict JSON",
            "- All specified fields must be output completely",
            "- Prioritize the value of binding, enforceability and serial rhythm guidance",
        ].join("\n")),
    ]
};
export { buildDirectorBookContractContextBlocks, buildDirectorBlueprintContextBlocks, buildDirectorCandidateContextBlocks, };

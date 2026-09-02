import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import type { AiChapterTaskSheetQualityAssessment, ChapterExecutionContractQualityCandidate, } from "@ai-novel/shared/types/chapterTaskSheetQuality";
import { aiChapterTaskSheetQualityAssessmentSchema, } from "@ai-novel/shared/types/chapterTaskSheetQuality";
import type { PromptAsset } from "../../../core/promptTypes";
export interface ChapterTaskSheetQualityPromptInput {
    candidate: ChapterExecutionContractQualityCandidate;
    mode: "full_book_autopilot" | "ai_copilot" | "manual";
}
function renderNullable(value: string | number | string[] | null | undefined): string {
    if (Array.isArray(value)) {
        return value.length > 0 ? value.join(" | ") : "none";
    }
    if (typeof value === "number") {
        return String(value);
    }
    return value?.trim() || "none";
}
function renderCandidate(candidate: ChapterExecutionContractQualityCandidate): string {
    return [
        `novelId: ${candidate.novelId}`,
        `volumeId: ${renderNullable(candidate.volumeId)}`,
        `chapterId: ${candidate.chapterId}`,
        `chapterOrder: ${candidate.chapterOrder}`,
        `title: ${candidate.title}`,
        `summary: ${renderNullable(candidate.summary)}`,
        `purpose: ${renderNullable(candidate.purpose)}`,
        `exclusiveEvent: ${renderNullable(candidate.exclusiveEvent)}`,
        `endingState: ${renderNullable(candidate.endingState)}`,
        `nextChapterEntryState: ${renderNullable(candidate.nextChapterEntryState)}`,
        `conflictLevel: ${renderNullable(candidate.conflictLevel)}`,
        `revealLevel: ${renderNullable(candidate.revealLevel)}`,
        `targetWordCount: ${renderNullable(candidate.targetWordCount)}`,
        `mustAvoid: ${renderNullable(candidate.mustAvoid)}`,
        `payoffRefs: ${renderNullable(candidate.payoffRefs ?? [])}`,
        "",
        "taskSheet:",
        renderNullable(candidate.taskSheet),
        "",
        "sceneCards:",
        renderNullable(candidate.sceneCards),
    ].join("\n");
}
function createSystemPrompt(mode: ChapterTaskSheetQualityPromptInput["mode"]): string {
    const modeRule = mode === "full_book_autopilot"
        ? "Currently the entire book is in automatic mode. You need to judge whether the system can automatically fix it and continue, and you cannot leave ordinary writing quality issues to novice users." : "Currently it is AI co-pilot or manual mode. You need to indicate whether user confirmation is required to avoid silently synchronizing unreliable contracts to the main execution chain.";
    return [
        "You are a web article section execution contract quality evaluator.",
        "Your task is to determine whether the purpose, chapter boundaries, taskSheet, readerExperience, and sceneCards are sufficient to be handed over to the text generator for execution.",
        modeRule,
        "Only the current chapter contract will be evaluated, the text will not be expanded, and the task list will not be rewritten.",
        "The available contracts must meet the following requirements: the chapter's goal is clear, the boundary does not cross the chapter, the task order is executable, the reader experience contract clearly defines the chapter's problem, visible rewards, protagonist's desires, main resistance, key turning point, net change and hook responsibility, and the scene card covers the entire chapter advancement and provides resistance, turning point, emotional displacement and reader value for each scene.",
        "readerExperience.rewardLevel represents the visible reward intensity provided by this chapter's plan, and can only be used with setup, partial, and major; it is not text completion, promise fulfillment ratio, or post-event result rating.",
        "Even if the text fully fulfills the promisedReward, it is not recommended to change rewardLevel to full, complete or other values; only when the reward intensity of the chapter plan itself does not match the chapter responsibilities, it is recommended to adjust between setup, partial and major.",
        "Also determine whether this chapter is crammed into too many must-have tasks competing for space; if the task list shows that the current chapter's responsibilities are overloaded, loadRisk=overloaded, recommendedHandling=replan_window.",
        "If the problem can still be solved within the contract of this chapter, recommendedHandling=repair_contract; use use_as_is only if the contract is stable enough.",
        "If there is a problem, give a specific repairGuidance for the automatic repairer.",
        "",
        "Output strictly JSON, no Markdown, comments, explanations or extra fields.",
        "The top level can only output verdict, safeToSync, loadRisk, recommendedHandling, summary, issues, repairGuidance, and confidence.",
        "Only usable, repairable, and unusable can be used for verdict.",
        "loadRisk can only use normal and overloaded.",
        "recommendedHandling can only use use_as_is, repair_contract, replan_window.",
        "Each item of issues can only contain id, severity, target, summary, repairHint.",
        "issues.severity can only use low, medium, high.",
        "issues.target can only use purpose, boundary, task_sheet, scene_cards, and semantic; rhythm, repetition, responsibility overload, lack of initiative, and conflict of obligations are all classified into semantic.",
        "confidence must be a decimal between 0 and 1, do not output percentage numbers.",
        "Custom enumeration values such as pass, accepted, ok, blocked, pacing, plot, and load must not be output.",
        "",
        "JSON shape example:",
        "{",
        "  \"verdict\": \"repairable\",",
        "  \"safeToSync\": false,",
        "  \"loadRisk\": \"normal\",",
        "  \"recommendedHandling\": \"repair_contract\",",
        "  \"summary\": \"The goal of the chapter contract is clear, but the scene card lacks an ending hook.\",",
        "  \"issues\": [",
        "    {",
        "      \"id\": \"scene_cards_missing_hook\",",
        "      \"severity\": \"medium\",",
        "      \"target\": \"scene_cards\",",
        "      \"summary\": \"The scene card does not cover the end-of-chapter reading traction.\",",
        "      \"repairHint\": \"Supplement the exit status of the last scene and the entrance pressure of the next chapter.\"",
        "    }",
        "  ],",
        "  \"repairGuidance\": [\"Repair the hook and exit status of the last scene.\"],",
        "  \"confidence\": 0.82",
        "}",
    ].join("\n");
}
export const chapterTaskSheetQualityPrompt: PromptAsset<ChapterTaskSheetQualityPromptInput, AiChapterTaskSheetQualityAssessment> = {
    id: "novel.volume.chapter_task_sheet_quality",
    version: "v3",
    taskType: "review",
    mode: "structured",
    language: "ka",
    contextPolicy: {
        maxTokensBudget: 4200,
    },
    outputSchema: aiChapterTaskSheetQualityAssessmentSchema,
    render: (input) => [
        new SystemMessage(createSystemPrompt(input.mode)),
        new HumanMessage([
            `mode: ${input.mode}`,
            "",
            "chapter execution contract candidate:",
            renderCandidate(input.candidate),
        ].join("\n")),
    ]
};

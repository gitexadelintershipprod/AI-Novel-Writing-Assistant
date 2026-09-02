import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import type { AiReplanWindowDecision } from "@ai-novel/shared/types/replanWindowDecision";
import { aiReplanWindowDecisionSchema } from "@ai-novel/shared/types/replanWindowDecision";
import type { PromptAsset } from "../../core/promptTypes";
export interface ReplanWindowDecisionPromptInput {
    triggerType: string;
    reason: string;
    targetChapterOrder: number;
    requestedWindowSize: number;
    availableChapterOrdersJson: string;
    sourceIssueIdsJson: string;
    auditReportsJson: string;
    payoffSummaryJson: string;
    canonicalStateJson: string;
    nextAction: string;
    chapterStateGoalJson: string;
    protectedSecretsJson: string;
}
export const replanWindowDecisionPrompt: PromptAsset<ReplanWindowDecisionPromptInput, AiReplanWindowDecision> = {
    id: "planner.replan.window_decision",
    version: "v2",
    taskType: "planner",
    mode: "structured",
    language: "ka",
    contextPolicy: {
        maxTokensBudget: 2200,
        preferredGroups: ["canonical_state", "audit", "payoff_ledger", "chapter_goal"],
        dropOrder: ["protected_secrets"],
    },
    outputSchema: aiReplanWindowDecisionSchema,
    render: (input) => [
        new SystemMessage([
            "You are the re-planning window decider for the novel's automatic director.",
            "Your task is to decide which chapters should be affected by this replanning and why based on the canonical state, chapter goals, review questions, and foreshadowing ledgers.",
            "Output only strict JSON, no Markdown, paraphrases or extra text.",
            "",
            "\u3010Decision Rules\u3011",
            "1. affectedChapterOrders must be selected only from availableChapterOrders, with priority given to continuous small windows.",
            "2. Default window is Chapters 1-5; unless the status clearly shows inter-chapter chaining issues, do not expand the scope.",
            "3. Prioritize repairIntent=patch_repair for ordinary quality problems; use state_realign for misalignment of plan goals; use payoff_rebalance for misalignment of foreshadowing/commitment.",
            "4. Chapter_rewrite is only used when there is a structural missing chapter or when the original plan is completely unavailable.",
            "5. Do not write protectedSecrets into the plot conclusion. It can only be used as a confidentiality constraint when selecting a window.",
            "6. triggerReason, windowReason, and whyTheseChapters must allow novices to understand why these chapters need to be adjusted.",
        ].join("\n")),
        new HumanMessage([
            `Trigger type:${input.triggerType}`,
            `User/system reasons:${input.reason}`,
            `Anchor Chapter: Chapter${input.targetChapterOrder}Chapter`,
            `Request window size:${input.requestedWindowSize}`,
            `Optional chapters:${input.availableChapterOrdersJson}`,
            `Source question:${input.sourceIssueIdsJson}`,
            "",
            "\u3010Review Report\u3011",
            input.auditReportsJson,
            "",
            "[Summary of Foreshadowing Account Book]",
            input.payoffSummaryJson,
            "",
            "【canonical state】",
            input.canonicalStateJson,
            "",
            `\u3010Next step status\u3011${input.nextAction}`,
            "",
            "\u3010Chapter Objective\u3011",
            input.chapterStateGoalJson,
            "",
            "[Protected secret]",
            input.protectedSecretsJson,
            "",
            "Please output the replanning window decision JSON.",
        ].join("\n")),
    ]
};

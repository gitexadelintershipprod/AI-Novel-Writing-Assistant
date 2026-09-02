import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { DIRECTOR_ISSUE_CODES, directorIssueAssessmentSchema, type DirectorIssueAssessment, } from "@ai-novel/shared/types/directorIssue";
import type { PromptAsset } from "../../core/promptTypes";
export interface DirectorIssueAssessmentPromptInput {
    suggestedIssueCode: string;
    stage: string;
    runMode: string;
    summary: string;
    evidence: string;
    affectedScope: string;
    hasUsableOutput: boolean;
    attempt: number;
    maxAttempts: number;
    detailsJson: string;
}
export const directorIssueAssessmentPrompt: PromptAsset<DirectorIssueAssessmentPromptInput, DirectorIssueAssessment> = {
    id: "director.issue.assessment",
    version: "v2",
    taskType: "critical_review",
    mode: "structured",
    language: "ka",
    contextPolicy: { maxTokensBudget: 1800 },
    outputSchema: directorIssueAssessmentSchema,
    repairPolicy: { maxAttempts: 1 },
    render: (input) => [
        new SystemMessage([
            "You are a question evaluator for the novel autodirector.",
            "You are only responsible for identifying problem codes, assessing 1-8 point risks and giving recommended actions based on the current structured facts.",
            "Output only strict JSON, no Markdown, explanations or extra fields.",
            `issueCode can only be:${DIRECTOR_ISSUE_CODES.join("、")}。`,
            "Local chapter quality issues and recoverable repair failures should not suspend the entire book based on scores alone.",
            "Only clear rescheduling, unavailable content, protection of content, operational security or data integrity issues may recommend suspension or termination.",
        ].join("\n")),
        new HumanMessage([
            `Suggested question code:${input.suggestedIssueCode}`,
            `Stage:${input.stage}`,
            `Operating mode:${input.runMode}`,
            `Summary:${input.summary}`,
            `Evidence:${input.evidence || "No additional evidence"}`,
            `Scope of influence:${input.affectedScope || "unknown"}`,
            `Products available:${input.hasUsableOutput ? "Yes" : "No"}`,
            `Try again:${input.attempt}/${input.maxAttempts}`,
            `Structured details:${input.detailsJson || "{}"}`,
        ].join("\n")),
    ]
};

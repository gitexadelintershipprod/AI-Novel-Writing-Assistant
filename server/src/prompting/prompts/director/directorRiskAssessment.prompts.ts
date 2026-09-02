import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { aiDirectorRiskAssessmentSchema, type AiDirectorRiskAssessment, } from "@ai-novel/shared/types/directorRisk";
import type { PromptAsset } from "../../core/promptTypes";
export interface DirectorRiskAssessmentPromptInput {
    failureStage: string;
    failureType: string;
    failureSummary: string;
    failureDetailsJson: string;
    taskContextJson: string;
    auditReportsJson: string;
    replanDecisionJson: string;
    existingQualityDebtJson: string;
}
export const directorRiskAssessmentPrompt: PromptAsset<DirectorRiskAssessmentPromptInput, AiDirectorRiskAssessment> = {
    id: "director.risk.assessment",
    version: "v2",
    taskType: "critical_review",
    mode: "structured",
    language: "ka",
    contextPolicy: { maxTokensBudget: 1800 },
    outputSchema: aiDirectorRiskAssessmentSchema,
    repairPolicy: { maxAttempts: 1 },
    render: (input) => [
        new SystemMessage([
            "You are the risk assessor of the novel's automatic director.",
            "Assess 1-8 point risk, scope of impact, and recommended actions based on structured facts, output only in strict JSON.",
            "canPause must be false for normal chapter quality debts, partial obligation gaps and recoverable repair failures, priority should be given to continuing or logging quality debts.",
            "Suspension should only be recommended if there is clear replanning, no available context, user context protection, operational security or data integrity risks.",
            "Don\u2019t extend the reach by the risk score itself, and don\u2019t invent facts that don\u2019t exist in the input.",
        ].join("\n")),
        new HumanMessage([
            `Failure stage:${input.failureStage}`,
            `Failure type:${input.failureType}`,
            `Summary:${input.failureSummary}`,
            `Failure details:${input.failureDetailsJson || "{}"}`,
            `Task context:${input.taskContextJson || "{}"}`,
            `Review report:${input.auditReportsJson || "[]"}`,
            `Replanning conclusion:${input.replanDecisionJson || "null"}`,
            `Existing quality debt:${input.existingQualityDebtJson || "[]"}`,
        ].join("\n")),
    ]
};

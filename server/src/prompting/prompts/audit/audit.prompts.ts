import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { z } from "zod";
import type { PromptAsset } from "../../core/promptTypes";
import { renderSelectedContextBlocks } from "../../core/renderContextBlocks";
import { fullAuditOutputSchema, lightAuditOutputSchema } from "../../../services/audit/auditSchemas";
import { NOVEL_PROMPT_BUDGETS } from "../novel/promptBudgetProfiles";
const AUDIT_CHAPTER_EXAMPLE = {
    score: {
        coherence: 82,
        repetition: 76,
        pacing: 79,
        voice: 84,
        engagement: 81,
        overall: 80,
    },
    issues: [
        {
            severity: "medium",
            category: "pacing",
            evidence: "Two consecutive paragraphs in the middle section explain the situation, but there is no new advancement.",
            fixSuggestion: "Condensate the second paragraph of explanation and incorporate the information into action or dialogue.",
        },
    ],
    auditReports: [
        {
            auditType: "plot",
            overallScore: 78,
            summary: "The main line advancement exists, but the resistance upgrade in the middle is not clear enough.",
            issues: [
                {
                    severity: "medium",
                    code: "plot_escalation_soft",
                    description: "The main conflict has emerged, but the price has not been raised enough.",
                    evidence: "After the gang threat emerged, the protagonist escaped quickly and the pressure did not linger.",
                    fixSuggestion: "Make up for a price or follow-up consequence that cannot be avoided immediately.",
                },
            ],
        },
    ],
};
const LIGHT_AUDIT_EXAMPLE = {
    score: {
        coherence: 84,
        repetition: 82,
        pacing: 82,
        voice: 85,
        engagement: 83,
        overall: 84,
    },
    summary: "This chapter can continue to progress, but there are two pacing issues in the middle that could be optimized.",
    issues: [
        {
            severity: "medium",
            category: "pacing",
            evidence: "Two consecutive paragraphs in the middle section explain the current situation, with repeated information and no new advancement.",
            fixSuggestion: "Condensed explanatory paragraphs to incorporate key information into actions or dialogue.",
        },
    ],
    continueRecommendation: "suggest_repair",
    shouldRunFullAudit: false,
    triggerReasons: [],
};
export interface AuditChapterPromptInput {
    novelTitle: string;
    chapterTitle: string;
    requestedTypes: string[];
    storyModeContext: string;
    content: string;
    ragContext: string;
}
export const auditChapterLightPrompt: PromptAsset<AuditChapterPromptInput, z.infer<typeof lightAuditOutputSchema>> = {
    id: "audit.chapter.light",
    version: "v2",
    taskType: "light_review",
    mode: "structured",
    language: "ka",
    contextPolicy: {
        maxTokensBudget: NOVEL_PROMPT_BUDGETS.chapterLightAudit,
        preferredGroups: [
            "chapter_boundary",
            "chapter_mission",
            "structure_obligations",
            "local_state",
        ],
        dropOrder: [
            "recent_chapters",
            "participant_subset",
            "world_rules",
            "historical_issues",
        ],
    },
    contextRequirements: [
        { group: "chapter_mission", priority: 100 },
        { group: "chapter_boundary", required: true, priority: 99 },
        { group: "structure_obligations", priority: 94 },
        { group: "local_state", priority: 89 },
        { group: "world_rules", priority: 84 },
        { group: "historical_issues", priority: 82 },
        { group: "recent_chapters", priority: 70 },
        { group: "participant_subset", priority: 68 },
    ],
    slots: [
        {
            kind: "replace" as const,
            key: "audit.reportStyle",
            label: "Expression of light review report",
            description: "Adjust the expression emphasis and judgment bias of light review results.",
            default: "Questions must be specific and actionable, with default priority given to moving the chapter forward.",
            maxLength: 500,
        },
        {
            kind: "append" as const,
            key: "audit.light.customConstraints",
            label: "Custom review supplementary requirements",
            description: "Append additional concerns or constraints to light review as contextual blocks injected into the review process. Leave blank to not append.",
            anchor: "chapter_boundary",
            default: "",
            maxLength: 2000,
            placeholderHint: "For example: the term \"Volume 1\" is prohibited in this book, and it is regarded as a style problem when it occurs; each chapter must be checked to see if there are any characters who misuse written language for their spoken language...",
        },
    ],
    structuredOutputHint: {
        example: LIGHT_AUDIT_EXAMPLE,
        note: "The light reviewer only makes a quick judgment on whether to proceed. Set continueRecommendation to full_audit only when there are obvious structural abnormalities, serious deviations from the contract, or out-of-control hard lengths.",
    },
    outputSchema: lightAuditOutputSchema,
    render: (input, context) => {
        const reportStyle = context.slots?.text("audit.reportStyle")
            ?? "Questions must be specific and actionable, with default priority given to moving the chapter forward.";
        return [
            new SystemMessage([
                "You are a light proofreading assistant for chapters of Georgian-language novels.",
                "Your job is to quickly determine whether the current chapter can be moved forward, or whether it must be upgraded to a full review.",
                "",
                "Output only a valid JSON object, no Markdown, explanations, comments, or extra text.",
                "",
                "Judgment rules:",
                "1. The default priority is to keep chapters moving forward, and do not upgrade ordinary quality suggestions to blocking.",
                "2. Full_audit is recommended only when there are obvious structural abnormalities, serious deviations from chapter tasks, key information fragmentation, and obviously out-of-control length.",
                "3. Issues reporting requirements:" + reportStyle,
                "4. continueRecommendation can only be continue, suggest_repair, full_audit.",
                "5. shouldRunFullAudit is only set to true when a complete re-audit is really needed.",
            ].join("\n")),
            new HumanMessage([
                `Novel:${input.novelTitle}`,
                `Chapter:${input.chapterTitle}`,
                `Scope of review:${input.requestedTypes.join(", ")}`,
                "",
                "Hierarchical context:",
                renderSelectedContextBlocks(context),
                "",
                "Story mode constraints:",
                input.storyModeContext || "none",
                "",
                "Text:",
                input.content,
                "",
                "Search supplement:",
                input.ragContext || "none",
            ].join("\n")),
        ];
    }
};
export const auditChapterPrompt: PromptAsset<AuditChapterPromptInput, z.infer<typeof fullAuditOutputSchema>> = {
    id: "audit.chapter.full",
    version: "v3",
    taskType: "critical_review",
    mode: "structured",
    language: "ka",
    contextPolicy: {
        maxTokensBudget: NOVEL_PROMPT_BUDGETS.chapterReview,
        preferredGroups: [
            "chapter_boundary",
            "chapter_mission",
            "structure_obligations",
            "world_rules",
            "historical_issues",
        ],
        dropOrder: [
            "recent_chapters",
            "participant_subset",
            "open_conflicts",
        ],
    },
    contextRequirements: [
        { group: "chapter_mission", priority: 100 },
        { group: "chapter_boundary", required: true, priority: 99 },
        { group: "structure_obligations", required: true, priority: 94 },
        { group: "local_state", priority: 89 },
        { group: "world_rules", priority: 84 },
        { group: "historical_issues", priority: 82 },
        { group: "recent_chapters", priority: 70 },
        { group: "participant_subset", priority: 68 },
        { group: "open_conflicts", priority: 66 },
    ],
    editableSlots: [
        {
            key: "audit.reportStyle",
            label: "Complete review report expression",
            description: "Adjust the reporting expression and standards for complete review.",
            riskLevel: "low",
            maxLength: 600,
            defaultValue: "All questions must be specific, the evidence must point to a clear phenomenon, and the fixSuggestion must be executable.",
        },
    ],
    slots: [
        {
            kind: "replace" as const,
            key: "audit.reportStyle",
            label: "Complete review report expression",
            description: "Adjust the reporting expression and standards for complete review.",
            default: "All questions must be specific, the evidence must point to a clear phenomenon, and the fixSuggestion must be executable.",
            maxLength: 600,
        },
        {
            kind: "append" as const,
            key: "audit.full.customConstraints",
            label: "Custom review supplementary requirements",
            description: "Append additional concerns or constraints to a complete review as contextual blocks injected into the review process. Leave blank to not append.",
            anchor: "chapter_boundary",
            default: "",
            maxLength: 2000,
            placeholderHint: "For example: Each chapter of this book must check the continuity of foreshadowing; focus on the consistency of the protagonist's motivations for action...",
        },
    ],
    structuredOutputHint: {
        example: AUDIT_CHAPTER_EXAMPLE,
        note: "severity can only be low/medium/high/critical; issues.category can only be coherence/repetition/pacing/voice/engagement/logic. Do not output plot, character or Chinese category name.",
    },
    outputSchema: fullAuditOutputSchema,
    render: (input, context) => {
        const reportStyle = context.slots?.text("audit.reportStyle")
            ?? "All questions must be specific, the evidence must point to a clear phenomenon, and the fixSuggestion must be executable.";
        return [
            new SystemMessage([
                "repetition scoring: 0 means heavily repetitive, 100 means repetition is well controlled; higher is better.",
                "You are a chapter review assistant for a Georgian-language novel.",
                "Your task is to output rigorous JSON review results that can be directly consumed by the system based on the chapter body, hierarchical context, story mode constraints, and search supplements.",
                "",
                "Output only a valid JSON object, no Markdown, explanations, comments, or extra text.",
                "",
                "Hard enumeration requirements:",
                "1. Top-level issues.category can only be coherence, repetition, pacing, voice, engagement, and logic.",
                "2. Do not output plot, character, Chinese category name or any custom category.",
                "3. auditReports.auditType can only use continuity, character, plot, mode_fit.",
                "",
                "Review principles:",
                "1. Make judgments only based on the given text and context, and do not infer plots, settings or authorial intentions that are not provided.",
                "2. " + reportStyle,
                "3. The three parts score, issues, and auditReports must be consistent with each other and cannot contradict each other.",
                "4. All types requested in requestedTypes must be covered; even if the problem is not obvious, a brief conclusion must be given.",
                "",
                "Rating dimensions:",
                "1. coherence: coherence, cause and effect, and self-consistency of information.",
                "2. repetition: repetition of expression or information.",
                "3. Pacing: Promoting efficiency and rhythm balance.",
                "4. Voice: narrative voice and text stability.",
                "5. Engagement: attraction, tension and motivation to read.",
                "6. Overall: comprehensive score, which must generally match the aforementioned dimensions.",
                "",
                "Output must strictly conform to fullAuditOutputSchema.",
            ].join("\n")),
            new HumanMessage([
                `Novel:${input.novelTitle}`,
                `Chapter:${input.chapterTitle}`,
                `Scope of review:${input.requestedTypes.join(", ")}`,
                "",
                "Hierarchical context:",
                renderSelectedContextBlocks(context),
                "",
                "Story mode constraints:",
                input.storyModeContext || "none",
                "",
                "Text:",
                input.content,
                "",
                "Search supplement:",
                input.ragContext || "none",
                "",
                "Output reminder: Top-level issues.category can only use coherence/repetition/pacing/voice/engagement/logic.",
            ].join("\n")),
        ];
    }
};

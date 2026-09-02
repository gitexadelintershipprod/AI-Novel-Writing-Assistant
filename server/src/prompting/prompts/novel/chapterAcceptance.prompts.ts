import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { z } from "zod";
import type { PromptAsset } from "../../core/promptTypes";
import { renderSelectedContextBlocks } from "../../core/renderContextBlocks";
import { NOVEL_PROMPT_BUDGETS } from "./promptBudgetProfiles";
export const chapterAcceptanceIssueCategorySchema = z.enum([
    "continuity",
    "character",
    "plot",
    "mode_fit",
    "voice",
]);
function normalizeAcceptanceCategory(value: unknown): unknown {
    if (typeof value !== "string") {
        return value;
    }
    const normalized = value.trim().toLowerCase();
    if (normalized === "coherence" || normalized === "logic") {
        return "continuity";
    }
    if (normalized === "pacing" || normalized === "repetition" || normalized === "ending") {
        return "plot";
    }
    if (normalized === "style" || normalized === "tone") {
        return "voice";
    }
    if (normalized === "mode" || normalized === "mode-fit" || normalized === "mode fit") {
        return "mode_fit";
    }
    return normalized;
}
function normalizeAcceptanceStatus(value: unknown): unknown {
    if (typeof value !== "string") {
        return value;
    }
    const normalized = value.trim().toLowerCase().replace(/[\s-]+/g, "_");
    if (["acceptable", "accept", "pass", "passed", "approved", "ok", "okay"].includes(normalized)) {
        return "accepted";
    }
    if (["needs_repair", "fixable", "repair", "patchable", "needs_fix"].includes(normalized)) {
        return "repairable";
    }
    if (["manual", "stop", "review_required", "needs_review", "manual_review"].includes(normalized)) {
        return "needs_manual_review";
    }
    if (["continue", "go_on", "proceed", "continue_risk"].includes(normalized)) {
        return "continue_with_risk";
    }
    return normalized;
}
function normalizeRepairTarget(value: unknown): unknown {
    if (typeof value !== "string") {
        return value;
    }
    const normalized = value.trim().toLowerCase();
    if (normalized === "coherence" || normalized === "logic") {
        return "continuity";
    }
    if (normalized === "pacing"
        || normalized === "repetition"
        || normalized === "middle"
        || normalized === "internal_monologue"
        || normalized === "internal monologue") {
        return "plot";
    }
    if (normalized === "ending_hook" || normalized === "ending hook" || normalized === "hook") {
        return "ending";
    }
    if (normalized === "style" || normalized === "tone" || normalized === "ending_tone" || normalized === "ending tone") {
        return "voice";
    }
    return normalized;
}
function normalizeRepairMode(value: unknown): unknown {
    if (typeof value !== "string") {
        return value;
    }
    const normalized = value.trim().toLowerCase();
    if (normalized === "local" || normalized === "light" || normalized === "minor" || normalized === "fix") {
        return "patch";
    }
    if (normalized === "full_rewrite" || normalized === "full rewrite" || normalized === "redo") {
        return "rewrite";
    }
    if (normalized === "pause" || normalized === "human" || normalized === "review") {
        return "manual";
    }
    return normalized;
}
function normalizeContinuePolicy(value: unknown): unknown {
    if (typeof value !== "string") {
        return value;
    }
    const normalized = value.trim().toLowerCase();
    if (normalized === "go_on" || normalized === "proceed" || normalized === "continue_with_risk") {
        return "continue";
    }
    if (normalized === "repair" || normalized === "patch" || normalized === "fix_once") {
        return "repair_once";
    }
    if (normalized === "manual" || normalized === "needs_manual_review" || normalized === "stop") {
        return "pause";
    }
    return normalized;
}
function normalizeMissingObligationKind(value: unknown): unknown {
    if (typeof value !== "string") {
        return value;
    }
    const normalized = value.trim().toLowerCase();
    const aliases: Record<string, string> = {
        must_hit: "must_hit_now",
        required_must_hit: "must_hit_now",
        required_hit: "must_hit_now",
        must_preserve_now: "must_preserve",
        required_preserve: "must_preserve",
        required_payoff_touch: "payoff_touch",
        payoff: "payoff_touch",
        required_character_appearance: "character_appearance",
        character: "character_appearance",
        character_required: "character_appearance",
        required_goal_change: "goal_change",
        goal: "goal_change",
        forbidden: "forbidden_crossing",
        forbidden_event: "forbidden_crossing",
    };
    return aliases[normalized] ?? normalized;
}
function readAliasString(record: Record<string, unknown>, keys: string[]): string | undefined {
    for (const key of keys) {
        const value = record[key];
        if (typeof value === "string" && value.trim()) {
            return value.trim();
        }
    }
    return undefined;
}
function normalizeMissingObligation(value: unknown): unknown {
    if (typeof value !== "object" || value === null || Array.isArray(value)) {
        return value;
    }
    const record = value as Record<string, unknown>;
    const kind = normalizeMissingObligationKind(record.kind ?? record.obligationType ?? record.type ?? record.category);
    const summary = readAliasString(record, ["summary", "target", "fixSuggestion", "description", "issue"]);
    const evidence = readAliasString(record, ["evidence", "reason", "text"]);
    return {
        ...record,
        kind,
        ...(summary ? { summary } : {}),
        ...(evidence ? { evidence } : {}),
    };
}
export const chapterAcceptanceAssessmentSchema = z.object({
    status: z.preprocess(normalizeAcceptanceStatus, z.enum(["accepted", "repairable", "needs_manual_review", "continue_with_risk"])),
    score: z.object({
        coherence: z.number().min(0).max(100),
        pacing: z.number().min(0).max(100),
        repetition: z.number().min(0).max(100),
        engagement: z.number().min(0).max(100),
        voice: z.number().min(0).max(100),
        overall: z.number().min(0).max(100),
    }),
    summary: z.string().trim().min(1),
    blockingIssues: z.array(z.object({
        severity: z.enum(["low", "medium", "high", "critical"]),
        category: z.preprocess(normalizeAcceptanceCategory, chapterAcceptanceIssueCategorySchema),
        code: z.string().trim().min(1),
        evidence: z.string().trim().min(1),
        fixSuggestion: z.string().trim().min(1),
    })).default([]),
    repairDirectives: z.array(z.object({
        mode: z.preprocess(normalizeRepairMode, z.enum(["patch", "rewrite", "manual"])),
        target: z.preprocess(normalizeRepairTarget, z.enum(["continuity", "character", "plot", "ending", "voice"])),
        instruction: z.string().trim().min(1),
    })).default([]),
    missingObligations: z.array(z.preprocess(normalizeMissingObligation, z.object({
        kind: z.preprocess(normalizeMissingObligationKind, z.enum([
            "must_hit_now",
            "must_preserve",
            "payoff_touch",
            "character_appearance",
            "goal_change",
            "forbidden_crossing",
        ])),
        summary: z.string().trim().min(1),
        evidence: z.string().trim().min(1).nullable().optional(),
    }))).default([]),
    repairability: z.enum([
        "none",
        "patchable_obligation_gap",
        "rewrite_needed",
        "plan_misalignment",
    ]).default("none"),
    decisionReason: z.string().trim().min(1).default("The text can be continued."),
    riskTags: z.array(z.string().trim().min(1)).default([]),
    assetSyncRecommendation: z.object({
        priority: z.enum(["normal", "high"]).default("normal"),
        reason: z.string().trim().min(1),
        requiresFullPayoffReconcile: z.boolean().default(false),
    }),
    continuePolicy: z.preprocess(normalizeContinuePolicy, z.enum(["continue", "repair_once", "pause"])),
});
export type ChapterAcceptanceAssessmentOutput = z.infer<typeof chapterAcceptanceAssessmentSchema>;
export interface ChapterAcceptancePromptInput {
    novelTitle: string;
    chapterOrder: number;
    chapterTitle: string;
    targetWordCount?: number | null;
    content: string;
}
const CHAPTER_ACCEPTANCE_EXAMPLE: ChapterAcceptanceAssessmentOutput = {
    status: "repairable",
    score: {
        coherence: 82,
        pacing: 78,
        repetition: 86,
        engagement: 80,
        voice: 81,
        overall: 81,
    },
    summary: "The main plot of this chapter can be established, but the ending hook and middle advancement need to be lightly revised before continuing.",
    blockingIssues: [
        {
            severity: "medium",
            category: "plot",
            code: "ending_hook_soft",
            evidence: "The ending only shows that the protagonist is ready to take action, without creating new pressure or suspense.",
            fixSuggestion: "Enhance the cost of decision-making or external pressure at the end to make the entrance to the next chapter clearer.",
        },
    ],
    repairDirectives: [
        {
            mode: "patch",
            target: "ending",
            instruction: "Keep the main body of the text and only reinforce the hook and pressure within 300 words at the end.",
        },
    ],
    missingObligations: [
        {
            kind: "must_hit_now",
            summary: "This chapter must allow the protagonist to discover the enemy's temptation, but the main text only writes about daily transitions.",
            evidence: "There are no enemy attempts or visible actions by the protagonist to see through in the text.",
        },
        {
            kind: "character_appearance",
            summary: "The key character Chuntao must appear and perform observation tasks.",
            evidence: "Chuntao does not appear in the text, and there is no substitute executor.",
        },
    ],
    repairability: "patchable_obligation_gap",
    decisionReason: "The ending hook can be completed through local patches without rearranging the chapter plan.",
    riskTags: ["ending_hook"],
    assetSyncRecommendation: {
        priority: "normal",
        reason: "There is recordable plot advancement in this chapter, but there is no obvious risk of requiring full foreshadowing and reconciliation.",
        requiresFullPayoffReconcile: false,
    },
    continuePolicy: "repair_once",
};
export const chapterAcceptanceAssessmentPrompt: PromptAsset<ChapterAcceptancePromptInput, ChapterAcceptanceAssessmentOutput> = {
    id: "novel.chapter.acceptance_assessment",
    version: "v3",
    taskType: "review",
    mode: "structured",
    language: "ka",
    contextPolicy: {
        maxTokensBudget: NOVEL_PROMPT_BUDGETS.chapterAcceptance,
        preferredGroups: [
            "chapter_mission",
            "reader_experience",
            "obligation_contract",
            "structure_obligations",
            "local_state",
            "style_contract",
            "open_conflicts",
        ],
        dropOrder: [
            "recent_chapters",
            "participant_subset",
            "world_rules",
            "historical_issues",
        ],
    },
    contextRequirements: [
        { group: "chapter_mission", required: true, priority: 100 },
        { group: "reader_experience", required: true, priority: 100 },
        { group: "obligation_contract", required: true, priority: 98 },
        { group: "structure_obligations", priority: 94 },
        { group: "local_state", priority: 89 },
        { group: "style_contract", priority: 74 },
        { group: "open_conflicts", priority: 70 },
    ],
    structuredOutputHint: {
        example: CHAPTER_ACCEPTANCE_EXAMPLE,
        note: "Determine at one time whether the chapter is acceptable, whether partial revision is needed, whether suspension confirmation is needed, and the priority of subsequent asset synchronization.",
    },
    outputSchema: chapterAcceptanceAssessmentSchema,
    render: (input, context) => [
        new SystemMessage([
            "You are the gateway to receive the text of Georgian-language novels.",
            "Your task is to judge at one time whether the current chapter text can be saved and continued to advance, whether it only needs partial light repair, whether manual confirmation needs to be suspended, and whether subsequent asset synchronization requires high-priority processing.",
            "",
            "Only output valid JSON objects, no Markdown, explanations, comments, or extra text.",
            "",
            "Judgment principles:",
            "1. Continued advancement is supported by default; common optimizable issues should not be escalated to suspension.",
            "2. Use needs_manual_review only when chapter tasks are seriously exceeded, key continuity is broken, character behavior is seriously distorted, protected information is leaked in advance, and the text is unreadable.",
            "3. Use repairable for problems that can be solved by local patches and give repairDirectives.",
            "4. Use continue_with_risk when the chapter can continue but there are subsequent risks, and use riskTags to describe the risk.",
            "5. BlockingIssues retain the most critical 0-5 issues, each of which must have clear evidence and executable repair suggestions.",
            "6. Obligation contract is the hard contract in this chapter. The must hit now and forbidden crossing gaps must be written in missingObligations; the payoff, character appearance or goal change gaps that can be taken over later will only be written in missingObligations if they will affect the entrance to the next chapter, otherwise put in riskTags.",
            "7. Repairability can only use none, patchable_obligation_gap, rewrite_needed, plan_misalignment. When partial writing is missed but does not block the next chapter, continue_with_risk is preferred; patchable_obligation_gap is used only when the current chapter needs to be completed immediately.",
            "8. Style_contract or anti-AI requirements are strong constraints; when obvious source entity leaks, template cavities, and summary cavities are found, they are classified as voice.",
            "9. assetSyncRecommendation only determines the asset synchronization priority and whether full reconciliation is required, and does not output the details of the inventory dropout.",
            "10. blockingIssues.category can only use continuity, character, plot, mode_fit, and voice; rhythm, repetition, middle foreshadowing, and ending hook are all classified into plot.",
            "11. repairDirectives.target can only use continuity, character, plot, ending, voice; do not output custom targets such as middle, pacing, internal_monologue, ending_tone, etc.",
            "12. repairDirectives.mode can only use patch, rewrite, and manual; continuePolicy can only use continue, repair_once, and pause.",
            "13. missingObligations must be an object array, and each item can only use kind, summary, and evidence; it is not allowed to output a string array, nor is it allowed to output alias fields such as obligationType, target, fixSuggestion, and type.",
            "14. missingObligations.kind can only use must_hit_now, must_preserve, payoff_touch, character_appearance, goal_change, forbidden_crossing.",
            "15. Status can only use accepted, repairable, needs_manual_review, continue_with_risk; aliases such as acceptable, pass, passed, ok, approved, etc. are not allowed.",
            "16. reader_experience is the reader experience contract for this chapter. Check whether promisedReward is visible in the text, whether the protagonist takes the initiative around protagonistWant and encounters primaryResistance, whether keyTurn and netChange are established, whether inheritedHookResponsibilities are responded to, and whether endingHook generates readability.",
            "17. Ordinary reader experience gaps should output executable blockingIssues/repairDirectives, and use repairable or continue_with_risk first; they should not be upgraded to needs_manual_review or global replanning just because of insufficient cool points, hooks, or emotional strength.",
        ].join("\n")),
        new HumanMessage([
            `Novel:${input.novelTitle}`,
            `Chapter: Chapter ${input.chapterOrder} Chapter ${input.chapterTitle}`,
            typeof input.targetWordCount === "number" ? `Target length: approx. ${input.targetWordCount} word` : "Target length: unspecified",
            "",
            "Hierarchical context:",
            renderSelectedContextBlocks(context),
            "",
            "Text:",
            input.content,
        ].join("\n")),
    ]
};

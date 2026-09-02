import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { z } from "zod";
import type { CreationDirection, ShortStoryPlanContract, ShortStoryPlanSegment, ShortStoryQualityResult, } from "@ai-novel/shared/types/creationStudio";
import type { PromptAsset } from "../../core/promptTypes";
import { countGeorgianWords } from "@ai-novel/shared/utils/georgianTextMetrics";
const planSegmentSchema = z.object({
    order: z.number().int().min(1).max(8),
    purpose: z.string().min(4).max(500),
    targetWordCount: z.number().int().min(300).max(15000),
    openingState: z.string().min(2).max(500),
    openingHook: z.string().min(4).max(500),
    immediateGoal: z.string().min(4).max(500),
    progressionBeats: z.array(z.string().min(4).max(500)).min(2).max(6),
    turningPoint: z.string().min(2).max(500),
    payoff: z.string().min(4).max(500),
    closingPull: z.string().min(4).max(500),
    closingState: z.string().min(2).max(500),
}).strict();
const planSchema = z.object({
    title: z.string().min(1).max(100),
    targetWordCount: z.number().int().min(3000).max(30000),
    endingPromise: z.string().min(4).max(500),
    segments: z.array(planSegmentSchema).min(2).max(8),
    causalContract: z.object({
        protagonistGoal: z.string().min(4).max(500),
        centralQuestion: z.string().min(4).max(500),
        fixedFacts: z.array(z.string().min(4).max(500)).min(3).max(12),
        causeEffectChain: z.array(z.string().min(8).max(700)).min(3).max(8),
        setupPayoffs: z.array(z.object({
            setup: z.string().min(4).max(500),
            setupSegmentOrder: z.number().int().min(1).max(8),
            payoff: z.string().min(4).max(500),
            payoffSegmentOrder: z.number().int().min(1).max(8),
        }).strict()).min(2).max(8),
    }).strict(),
}).strict();
const qualityIssueSchema = z.object({
    code: z.string().min(1).max(80),
    severity: z.enum(["critical", "standard"]),
    description: z.string().min(4).max(500),
    affectedSegmentOrders: z.array(z.number().int().min(1).max(8)).max(8),
    repairInstruction: z.string().min(4).max(1000).optional(),
}).strict();
const auditSchema = z.object({
    decision: z.enum(["accepted", "patchable", "replan_required"]),
    summary: z.string().min(4).max(1000),
    issues: z.array(qualityIssueSchema).max(20),
}).strict();
const writtenSegmentSchema = z.object({
    content: z.string().min(200),
    continuitySummary: z.string().min(10).max(1200),
}).strict();
const patchSchema = z.object({
    patches: z.array(z.object({
        segmentOrder: z.number().int().min(1).max(8),
        content: z.string().min(200),
    }).strict()).max(8),
    residualQualityDebt: z.array(z.string().min(4).max(500)).max(20),
}).strict();
export interface ShortStoryPlanPromptInput {
    originalIdea: string;
    understanding: string;
    direction: CreationDirection;
    targetWordCount: number;
    revisionInstruction?: string;
    requiredSegmentCount?: number;
    writingPlatform?: string;
    productionFoundation?: string;
}
function validatePlan(output: ShortStoryPlanContract, input: ShortStoryPlanPromptInput): z.output<typeof planSchema> {
    if (input.requiredSegmentCount && output.segments.length !== input.requiredSegmentCount) {
        throw new Error(`Replanning must be maintained ${input.requiredSegmentCount} internal fragment.`);
    }
    const orders = output.segments.map((segment) => segment.order);
    if (orders.some((order, index) => order !== index + 1)) {
        throw new Error("Short story sequence must be sequentially increasing from 1.");
    }
    const budget = output.segments.reduce((sum, segment) => sum + segment.targetWordCount, 0);
    const tolerance = Math.max(500, Math.round(input.targetWordCount * 0.08));
    if (Math.abs(budget - input.targetWordCount) > tolerance) {
        throw new Error("The sum of the segment word budgets must be close to the target total word count.");
    }
    if (Math.abs(output.targetWordCount - input.targetWordCount) > tolerance) {
        throw new Error("The planned target word count must be subject to the user-confirmed target.");
    }
    const segmentCount = output.segments.length;
    if (!output.causalContract) {
        throw new Error("The short story plan must include cause and effect and foreshadowing accounts.");
    }
    if (output.causalContract.setupPayoffs.some((item) => (item.setupSegmentOrder > item.payoffSegmentOrder
        || item.payoffSegmentOrder > segmentCount))) {
        throw new Error("The foreshadowing must precede the fulfillment and fall within a valid internal sequence.");
    }
    return {
        ...output,
        targetWordCount: input.targetWordCount,
        causalContract: output.causalContract,
    };
}
function validateAudit(output: ShortStoryQualityResult, input: ShortStoryAuditPromptInput): z.output<typeof auditSchema> {
    const wordCount = countGeorgianWords(input.content);
    const targetWordCount = input.plan.targetWordCount;
    if (output.decision === "accepted" && wordCount < Math.round(targetWordCount * 0.7)) {
        throw new Error("The finished manuscript is significantly lower than the target word count and cannot be judged to be directly deliverable.");
    }
    if (output.decision === "accepted" && output.issues.some((issue) => issue.severity === "critical")) {
        throw new Error("It cannot be judged to be directly deliverable when there are key causal or factual issues.");
    }
    return output as z.output<typeof auditSchema>;
}
export const shortStoryPlanPrompt: PromptAsset<ShortStoryPlanPromptInput, z.output<typeof planSchema>, ShortStoryPlanContract> = {
    id: "novel.short_story.plan",
    version: "v3",
    taskType: "planner",
    mode: "structured",
    language: "ka",
    contextPolicy: { maxTokensBudget: 0 },
    outputSchema: planSchema,
    repairPolicy: { maxAttempts: 1 },
    semanticRetryPolicy: { maxAttempts: 1 },
    render: (input) => [
        new SystemMessage([
            "You are the overall structure director of Georgian-language short stories.",
            "The short stories here are shorter online novels that can be read and concluded in one go. They are not traditional literary short stories, essays, story summaries or film and television scenes.",
            "Plan your identified intentions into 2 to 8 internal writing segments. These snippets are only used for backend production and are not chapters for display to readers.",
            "The structure must be able to complete the protagonist change, core conflict and clear ending reward within the target number of words, while maintaining the hook, advancement, reversal and reward density of a serial fiction.",
            "The first 300 to 500 words of the opening chapter must introduce the pressure, anomaly, conflict, or decision point, without slowly warming up to scenes, dreams, life experiences, or world settings.",
            "The protagonist must have a visible immediate goal and actively choose it; each internal segment should be arranged with 2 to 6 causally connected progressionBeats, rather than summarizing a period of time.",
            "First establish the causalContract: it is a causal ledger that cannot be rewritten at will. fixedFacts Write down the confirmed identity of the prop, character relationship, rules, location and information source; causeEffectChain Write out \"the next change occurred because of the previous action/fact\" item by item from the opening pressure to the ending.",
            "setupPayoffs lists at least 2 foreshadowings and redemptions: any key solution, reversal, identity, password, weapon, rule or resource must appear in the segment before redemption with specific information that can be reviewed. Do not suddenly add universal props, hidden identities, technical rules or external help to solve problems when a crisis occurs.",
            "Stories can only be developed around the user\u2019s original ideas and confirmed directions. It can be deepened, but it must not replace the user's core experience with another set of unprepared grand conspiracy, disaster or world view.",
            "If a creative base is provided, subject matter expectations, main propulsion units, conflict ceilings, reader rewards, and prohibition signals must all be implemented into the plan.",
            "Each fragment must produce a theme-matching payoff and use closingPull to push to the next change. Reward does not mean a slap in the face; it can be breaking a situation, discovering something, advancing a relationship, realizing the price, or releasing emotions.",
            "Avoid continuous large paragraphs of atmosphere, inner monologue, background explanation, and content that only has literary talent and no changes in events.",
            "Decide the number of fragments according to the needs of the story, do not mechanically cut them into pieces according to a fixed number of words.",
            "If requiredSegmentCount is provided, this number of segments must be maintained in order to safely update existing works.",
            "The sum of the target word counts for all segments must be close to the total target, and the order must be consecutively increasing from 1.",
            "The last segment must fully fulfill the endingPromise, and may not replace the ending with a long suspense.",
            "Only output strict JSON.",
        ].join("\n")),
        new HumanMessage(JSON.stringify(input, null, 2)),
    ],
    postValidate: validatePlan
};
export interface ShortStorySegmentWritePromptInput {
    originalIdea: string;
    understanding: string;
    direction: CreationDirection;
    plan: ShortStoryPlanContract;
    segment: ShortStoryPlanSegment;
    previousContinuity: string;
    previousContentTail: string;
    writingPlatform?: string;
    bookStyle?: string;
    productionFoundation?: string;
}
export const shortStorySegmentWritePrompt: PromptAsset<ShortStorySegmentWritePromptInput, z.output<typeof writtenSegmentSchema>> = {
    id: "novel.short_story.segment.write",
    version: "v3",
    taskType: "writer",
    mode: "structured",
    language: "ka",
    contextPolicy: { maxTokensBudget: 12000 },
    contextRequirements: [
        { group: "creation_intent", required: true, priority: 100 },
        { group: "short_story_plan", required: true, priority: 100 },
        { group: "short_story_continuity", required: true, priority: 96 },
        { group: "writing_platform", required: true, priority: 104 },
        { group: "production_foundation", required: true, priority: 103 },
        { group: "book_style", required: true, priority: 80 },
    ],
    slots: [
        {
            kind: "replace",
            key: "shortWriter.tone",
            label: "tone and reading",
            description: "Control the language texture and reading speed of short text.",
            default: "Use natural, direct, and picturesque serial fiction expressions to let character actions and scene changes drive reading.",
            maxLength: 800,
        },
        {
            kind: "replace",
            key: "shortWriter.openingPressure",
            label: "opening pressure",
            description: "Control how quickly the story reaches anomalies, conflicts, or decision points.",
            default: "The first paragraph enters the stress, anomaly, conflict, or decision point within the first 300 to 500 words.",
            maxLength: 500,
        },
        {
            kind: "replace",
            key: "shortWriter.paragraphing",
            label: "paragraph mode",
            description: "Control mobile paragraph length and dialogue segmentation.",
            default: "For reading on mobile phones, paragraphs of 1 to 4 sentences are mainly used; dialogues can be divided into independent paragraphs, but do not chop each sentence into pieces.",
            maxLength: 500,
        },
        {
            kind: "replace",
            key: "shortWriter.payoffDensity",
            label: "Conflict and reward density",
            description: "Control the density of information, resistance, choices, gains and losses in each segment.",
            default: "The text continues to generate new information, resistance, choices, gains and losses, or changes in relationships, and does not allow for long periods of stay in atmosphere or explanation.",
            maxLength: 700,
        },
        {
            kind: "replace",
            key: "shortWriter.endingDelivery",
            label: "Cash out at the end",
            description: "Control how the final sequence delivers on the promise of climax and ending.",
            default: "The final clip must fully realize the climax and core ending. It can leave a lingering taste, but it cannot replace the answer with an abrupt end.",
            maxLength: 600,
        },
        {
            kind: "replace",
            key: "shortWriter.antiAiRules",
            label: "Anti-AI flavor rules",
            description: "Reduce templated sentence patterns, empty discussions, tautology and summary expressions.",
            default: "Avoid empty philosophies, authorial judgments, piles of metaphors, tautology, and substitution of summaries for ongoing scenes.",
            maxLength: 800,
        },
        {
            kind: "append",
            key: "shortWriter.customConstraints",
            label: "Custom writing constraints",
            description: "Add the writing methods that need to be followed in this book or current short story.",
            anchor: "book_style",
            default: "",
            maxLength: 4000,
            placeholderHint: "For example: the heroine speaks restrainedly and does not use hot Internet memes; the twist must have clues that can be reviewed in the previous text.",
        },
    ],
    management: {
        productPrompt: true,
        proseGeneration: true,
        editModes: ["slots", "advanced_template"],
        advancedTemplate: {
            scope: "novel",
            requiredContextGroups: [
                "creation_intent", "short_story_plan", "short_story_continuity", "writing_platform", "book_style",
            ],
        },
    },
    outputSchema: writtenSegmentSchema,
    repairPolicy: { maxAttempts: 1 },
    render: (input, context) => [
        new SystemMessage([
            "You are the author of short Georgian-language short fiction.",
            "The finished manuscript must be like a shorter but complete online novel: a quick start, a clear goal, continuous changes in scenes, intensive rewards, and smooth language. It must not be written as prose, pure literary sketches, or plot outlines.",
            "Write only the current internal fragment, but the main text must feel like part of a continuous work.",
            "Do not output chapter names, segment names, serial numbers, writing instructions, or Markdown.",
            "It naturally follows the previous text without repeating the opening or summarizing the plan.",
            "Strictly complete the openingHook, immediateGoal, progressionBeats, turningPoint, payoff, closingPull and closingState of the current fragment; when the old plan lacks new fields, the same web rhythm must still be supplemented according to purpose.",
            "Treat plan.causalContract as the only account of facts and causation: the confirmed prop identities, character relationships, rules, locations and sources of information must not be changed. Every action must be triggered by something that has already happened and have visible consequences.",
            "It is forbidden to \"suddenly know/obtain/invent the solution after the crisis occurs\": key clues, capabilities, technical rules, help and reversal must have been laid out in the setupPayoffs of causalContract. If there is no usable foreshadowing for the current plan, let the characters bear the cost, change strategies, or advance existing clues, and do not make up settings on the spot.",
            "The first paragraph must enter the pressure, abnormality, conflict or decision point in the first 300 to 500 words. It is forbidden to start with the weather, getting up, looking in the mirror, recalling life experience or setting up a paragraph.",
            "Use concrete scenes, actions, choices, and natural dialogue to drive cause and effect. The explanation only appears when it affects the current action, and cannot explain the world view or summarize the character's feelings for a long time.",
            "Organize Georgian paragraphs for mobile reading: mainly 1 to 4 sentences, with dialogue allowed in separate paragraphs; avoid dense walls of text without fragmenting every sentence.",
            "The text must continue to generate new information, resistance, choices, gains and losses, or changes in relationships; it cannot last about 800 words with only atmosphere, memories, psychological descriptions, or tautologies.",
            "The language is direct, picturesque, and consistent with the subject matter and temperament. Use less empty philosophies, piles of metaphors, authorial arguments, and pretentiously deep opening sentences.",
            "If this is the last paragraph, a complete ending must be completed; otherwise, do not fake the ending.",
            "The last paragraph must fulfill the climax and ending, and make the identity, relationship, goal or core mystery clear and clear; it can leave a lingering flavor, but it cannot use an abrupt end to pretend to be a sense of sophistication.",
            "Returns JSON: content is plain text and continuitySummary is a summary of facts and character status for the next fragment.",
            "[Editable writing]",
            context.slots?.text("shortWriter.tone") ?? "Use natural, direct, vivid Georgian prose with idiomatic syntax and varied rhythm.",
            context.slots?.text("shortWriter.openingPressure") ?? "The first paragraph comes into pressure in the first 300 to 500 words.",
            context.slots?.text("shortWriter.paragraphing") ?? "Organize paragraphs for mobile reading.",
            context.slots?.text("shortWriter.payoffDensity") ?? "Continuously generate information, resistance, choices, and rewards.",
            context.slots?.text("shortWriter.endingDelivery") ?? "The final segment fully realizes the ending.",
            context.slots?.text("shortWriter.antiAiRules") ?? "Avoid generalities, repetitions and generalizations.",
            input.writingPlatform ? `[How to write the target platform]
${input.writingPlatform}` : "",
            input.productionFoundation ? `\u3010Creative base\u3011
${input.productionFoundation}` : "",
            input.bookStyle ? `\u3010How to write this book\u3011
${input.bookStyle}` : "",
        ].join("\n")),
        new HumanMessage(JSON.stringify(input, null, 2)),
    ]
};
export interface ShortStoryAuditPromptInput {
    originalIdea: string;
    understanding: string;
    direction: CreationDirection;
    plan: ShortStoryPlanContract;
    content: string;
    writingPlatform?: string;
    productionFoundation?: string;
}
export const shortStoryFullAuditPrompt: PromptAsset<ShortStoryAuditPromptInput, z.output<typeof auditSchema>, ShortStoryQualityResult> = {
    id: "novel.short_story.full.audit",
    version: "v3",
    taskType: "review",
    mode: "structured",
    language: "ka",
    contextPolicy: { maxTokensBudget: 0 },
    outputSchema: auditSchema,
    repairPolicy: { maxAttempts: 1 },
    semanticRetryPolicy: { maxAttempts: 1 },
    postValidate: validateAudit,
    render: (input) => [
        new SystemMessage([
            "You are the full-length review editor of short Georgian-language short fiction.",
            "Check the complete work's intention fulfillment, cause and effect, character changes, continuity, ending payoff, and readability of online novels at once.",
            "It is necessary to check: whether there is an effective hook in the first 300 to 500 words; whether the protagonist's goals and actions are clear; whether the scene continues to advance; whether there is enough resistance, reversal and thematic payoff; whether the ending is clearly fulfilled.",
            "Check plan.causalContract item by item: whether the fixed facts are consistent; whether each key result is driven by the reasons that have emerged; whether the key props, identities, rules, abilities and technical solutions are foreshadowed before being realized; whether the characters make reasonable choices based on known information and their own goals.",
            "Mark the following situations as severity=critical: The identity/quantity/authenticity of the same key prop or information is inconsistent before and after; the climax is solved with new rules, new abilities, new helpers or new props that have never been foreshadowed; the character has no motivation to change his position; there is no traceable reason for the key result; the work is significantly lower than the user's target word count. critical issues cannot be delivered directly as ordinary quality debt.",
            "List slow exposition, plot synopsis, continuous long interior monologues, empty lyricism, overlong and dense paragraphs, misuse of broken sentences, unnatural dialogue, lack of excitement or lack of emotional return as executable problems.",
            "Literary quality is not a problem, but you cannot sacrifice the advancement of events, clear cause and effect, and smooth reading on mobile phones; do not misjudge pretentiousness, obscurity, or an open-ended ending as advanced.",
            "accepted: can be delivered directly; patchable: can be partially rewritten and repaired; replan_required: used only when the core structure cannot be restored through local repair.",
            "Ordinary style flaws, local rhythm, patchable foreshadowing, or wording issues must be deemed patchable and cannot be upgraded to replan_required.",
            "affectedSegmentOrders only fills in the internal segments that really need to be modified.",
            "Only output strict JSON.",
        ].join("\n")),
        new HumanMessage(JSON.stringify(input, null, 2)),
    ]
};
export interface ShortStoryPatchPromptInput extends ShortStoryAuditPromptInput {
    audit: ShortStoryQualityResult;
    segments: Array<{
        order: number;
        content: string;
        humanEdited: boolean;
    }>;
}
export const shortStoryPatchRepairPrompt: PromptAsset<ShortStoryPatchPromptInput, z.output<typeof patchSchema>> = {
    id: "novel.short_story.patch.repair",
    version: "v3",
    taskType: "repair",
    mode: "structured",
    language: "ka",
    contextPolicy: { maxTokensBudget: 0 },
    outputSchema: patchSchema,
    repairPolicy: { maxAttempts: 1 },
    render: (input) => [
        new SystemMessage([
            "You are a partial restoration editor for Georgian-language short stories.",
            "Only complete internal fragment text that must be replaced based on full text review is returned.",
            "Fragments with humanEdited=true must not return patches and must not silently overwrite artificial content; related issues are written to residualQualityDebt.",
            "Preserve plot, facts, tone, and ending promises that have not been named by the reviewer.",
            "Strictly use plan.causalContract as the fact ledger to fix. Problems with severity=critical must be fixed first: make up for the foreshadowing, remove new on-the-spot solutions, unify key props and rules, and return character choices to traceable motives. Do not cover up old conflicts with another new setting.",
            "The restored text must maintain the readability of online novels: quickly enter the scene, advance with action, conflict and dialogue, supplement the theme rewards, control the length of paragraphs, and delete empty lyricism and summary narratives.",
            "Do not include chapter names, fragment names, serial numbers or revision notes in the text.",
            "At most this round of fixes is performed; only ordinary issues that cannot be safely fixed can enter residualQualityDebt, and critical causal/factual inconsistencies may not be downgraded to ordinary recommendations.",
            "Only output strict JSON.",
        ].join("\n")),
        new HumanMessage(JSON.stringify(input, null, 2)),
    ]
};
const revisionImpactSchema = z.object({
    understoodGoal: z.string().min(4).max(1000),
    affectedSegmentOrders: z.array(z.number().int().min(1).max(8)).min(1).max(8),
    changesEnding: z.boolean(),
    changesScale: z.boolean(),
    changesCoreIntent: z.boolean(),
    recommendedTargetWordCount: z.number().int().min(3000).max(30000),
    recommendedStrategy: z.enum(["local_patch", "rewrite_downstream", "full_replan"]),
    summary: z.string().min(4).max(1200),
    revisedDirection: z.object({
        title: z.string().min(1).max(100),
        premise: z.string().min(10).max(1000),
        coreExperience: z.string().min(4).max(500),
        protagonist: z.string().min(4).max(500),
        centralConflict: z.string().min(4).max(500),
        endingPromise: z.string().min(4).max(500),
        styleKeywords: z.array(z.string().min(1).max(30)).min(2).max(8),
    }).strict(),
}).strict();
export interface ShortStoryRevisionImpactPromptInput {
    instruction: string;
    originalIdea: string;
    understanding: string;
    direction: CreationDirection;
    plan: ShortStoryPlanContract;
    segments: Array<{
        order: number;
        content: string;
        humanEdited: boolean;
    }>;
}
export const shortStoryRevisionImpactPrompt: PromptAsset<ShortStoryRevisionImpactPromptInput, z.output<typeof revisionImpactSchema>> = {
    id: "novel.short_story.revision.impact",
    version: "v3",
    taskType: "planner",
    mode: "structured",
    language: "ka",
    contextPolicy: { maxTokensBudget: 0 },
    outputSchema: revisionImpactSchema,
    repairPolicy: { maxAttempts: 1 },
    semanticRetryPolicy: { maxAttempts: 1 },
    render: (input) => [
        new SystemMessage([
            "You are a revision impact analyst for short online works.",
            "First understand what the user really wants to change, and then determine which internal fragments will be affected; never change the text at this stage.",
            "local_patch is suitable for single-point content patching; rewrite_downstream is suitable for changes somewhere that will affect subsequent causality; full_replan is only used for scale, core intent, or overall structural changes.",
            "If it affects the ending, volume, or core experience, it must be marked truthfully.",
            "revisedDirection is the complete direction that should be followed after applying the modification; fields not required to be modified retain their original meaning.",
            "revisedDirection must continue to serve shorter but complete Georgian-language serial novels, and must not drift into prose, pure literary sketches or plot summaries.",
            "Only output strict JSON.",
        ].join("\n")),
        new HumanMessage(JSON.stringify(input, null, 2)),
    ]
};

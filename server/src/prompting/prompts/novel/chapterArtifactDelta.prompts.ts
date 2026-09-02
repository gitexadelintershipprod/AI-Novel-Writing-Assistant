import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { z } from "zod";
import type { PromptAsset } from "../../core/promptTypes";
import { characterMindDeltaSchema } from "./characterMind.promptSchemas";
import { characterDialogueInfluenceResolutionSchema } from "@ai-novel/shared/types/characterDialogue";
import { chapterConcreteFactSchema } from "../../../services/novel/chapterSummarySchemas";
import { characterResourceExtractionUpdateSchema } from "./characterResource.promptSchemas";
import { NOVEL_PROMPT_BUDGETS } from "./promptBudgetProfiles";
import { payoffLedgerSyncItemSchema } from "../payoff/payoffLedgerSync.promptSchemas";
const nullableText = z.string().trim().optional().nullable();
const confidenceSchema = z.number().min(0).max(1).optional().nullable();
function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}
function readString(record: Record<string, unknown>, keys: string[]): string | undefined {
    for (const key of keys) {
        const value = record[key];
        if (typeof value === "string" && value.trim()) {
            return value.trim();
        }
    }
    return undefined;
}
function normalizeCharacterResourceDelta(value: unknown): unknown {
    if (!isRecord(value)) {
        return value;
    }
    const updateTypeAliases: Record<string, string> = {
        create: "introduced",
        created: "introduced",
        craft: "introduced",
        crafted: "introduced",
        generate: "introduced",
        generated: "introduced",
        produce: "introduced",
        produced: "introduced",
        refine: "introduced",
        refined: "introduced",
        discover: "revealed",
        discovered: "revealed",
        expose: "revealed",
        exposed: "revealed",
        gain: "acquired",
        gained: "acquired",
        obtain: "acquired",
        obtained: "acquired",
        buy: "acquired",
        bought: "acquired",
        purchase: "acquired",
        purchased: "acquired",
        spend: "consumed",
        spent: "consumed",
    };
    const resourceTypeAliases: Record<string, string> = {
        material: "consumable",
        materials: "consumable",
        medicine: "consumable",
        pill: "consumable",
        elixir: "consumable",
        currency: "world_resource",
        money: "world_resource",
        points: "world_resource",
        score: "world_resource",
        spirit_stone: "world_resource",
        spirit_stones: "world_resource",
        item: "physical_item",
        object: "physical_item",
        token: "relationship_token",
        ability: "ability_resource",
        skill: "ability_resource",
        secret: "hidden_card",
    };
    const updateType = typeof value.updateType === "string"
        ? updateTypeAliases[value.updateType.trim().toLowerCase()] ?? value.updateType
        : value.updateType;
    const resourceType = typeof value.resourceType === "string"
        ? resourceTypeAliases[value.resourceType.trim().toLowerCase()] ?? value.resourceType
        : value.resourceType;
    const statusAfterAliases: Record<string, string> = {
        active: "available",
        owned: "available",
        usable: "available",
        in_hand: "available",
        "in hand": "available",
        held: "available",
        known: "available",
        revealed: "available",
        concealed: "hidden",
        secret: "hidden",
        spent: "consumed",
        used: "consumed",
        exhausted: "consumed",
        broken: "damaged",
        removed: "lost",
        gone: "lost",
        missing: "lost",
    };
    const statusAfter = typeof value.statusAfter === "string"
        ? statusAfterAliases[value.statusAfter.trim().toLowerCase()] ?? value.statusAfter
        : value.statusAfter;
    const narrativeFunction = normalizeCharacterResourceNarrativeFunction({
        rawValue: value.narrativeFunction,
        normalizedResourceType: resourceType,
        statusAfter,
    });
    return {
        ...value,
        resourceType,
        updateType,
        statusAfter,
        narrativeFunction,
    };
}
function normalizeCharacterResourceNarrativeFunction(input: {
    rawValue: unknown;
    normalizedResourceType: unknown;
    statusAfter: unknown;
}): unknown {
    if (typeof input.rawValue !== "string") {
        return input.rawValue;
    }
    const normalized = input.rawValue.trim().toLowerCase();
    const aliases: Record<string, string> = {
        cultivation: "tool",
        cultivate: "tool",
        power_up: "tool",
        upgrade: "tool",
        material: "cost",
        materials: "cost",
        ingredient: "cost",
        resource: "tool",
        finance: "cost",
        financial: "cost",
        money: "cost",
        currency: "cost",
        transaction: "cost",
        debt: "constraint",
        obligation: "constraint",
        permission: "key",
        access: "key",
        evidence: "proof",
    };
    if (normalized === "finance" && input.normalizedResourceType === "credential") {
        return "proof";
    }
    if (normalized === "finance" && input.statusAfter === "consumed") {
        return "cost";
    }
    return aliases[normalized] ?? input.rawValue;
}
function normalizeChapterReferenceText(value: unknown): unknown {
    if (typeof value === "number" && Number.isFinite(value)) {
        return String(value);
    }
    return value;
}
function normalizePayoffRiskSignal(value: unknown, index: number): unknown {
    if (typeof value === "string") {
        return {
            code: `chapter_artifact_risk_${index + 1}`,
            severity: "medium",
            summary: value.trim() || "Chapter asset extraction identifies foreshadowing risks.",
        };
    }
    if (!isRecord(value)) {
        return value;
    }
    const summary = readString(value, ["summary", "reason", "description", "risk", "text"]);
    return {
        ...value,
        code: readString(value, ["code"]) ?? `chapter_artifact_risk_${index + 1}`,
        severity: readString(value, ["severity"]) ?? "medium",
        summary: summary ?? "Chapter asset extraction identifies foreshadowing risks.",
    };
}
function normalizePayoffDelta(value: unknown): unknown {
    if (!isRecord(value)) {
        return value;
    }
    const statusAliases: Record<string, string> = {
        active: "pending_payoff",
        progressed: "pending_payoff",
        progressing: "pending_payoff",
        in_progress: "pending_payoff",
        pending: "pending_payoff",
        resolved: "paid_off",
        payoff: "paid_off",
        paid: "paid_off",
    };
    const currentStatus = typeof value.currentStatus === "string"
        ? statusAliases[value.currentStatus.trim().toLowerCase()] ?? value.currentStatus
        : value.currentStatus;
    const scopeTypeAliases: Record<string, string> = {
        story: "book",
        novel: "book",
        global: "book",
        book_level: "book",
        volume_level: "volume",
        chapter_level: "chapter",
    };
    const scopeType = typeof value.scopeType === "string"
        ? scopeTypeAliases[value.scopeType.trim().toLowerCase()] ?? value.scopeType
        : value.scopeType;
    const riskSignals = Array.isArray(value.riskSignals)
        ? value.riskSignals.map((signal, index) => normalizePayoffRiskSignal(signal, index))
        : value.riskSignals;
    return {
        ...value,
        scopeType,
        currentStatus,
        riskSignals,
    };
}
function normalizeSyncPlan(value: unknown): unknown {
    if (!isRecord(value)) {
        return value;
    }
    const characterDynamicsAliases: Record<string, string> = {
        delta: "write",
        full_reconcile: "write",
        reconcile: "write",
    };
    const characterDynamics = typeof value.characterDynamics === "string"
        ? characterDynamicsAliases[value.characterDynamics.trim().toLowerCase()] ?? value.characterDynamics
        : value.characterDynamics;
    return {
        ...value,
        characterDynamics,
    };
}
function normalizeRelationDynamic(value: unknown): unknown {
    if (!isRecord(value)) {
        return value;
    }
    const evidence = value.evidence;
    const evidenceText = Array.isArray(evidence)
        ? evidence.map((item) => String(item ?? "").trim()).filter(Boolean).join("；")
        : typeof evidence === "string"
            ? evidence.trim()
            : "";
    return {
        ...value,
        sourceCharacterName: readString(value, [
            "sourceCharacterName",
            "characterName1",
            "character1Name",
            "fromCharacterName",
            "sourceName",
        ]),
        targetCharacterName: readString(value, [
            "targetCharacterName",
            "characterName2",
            "character2Name",
            "toCharacterName",
            "targetName",
        ]),
        stageLabel: readString(value, [
            "stageLabel",
            "phaseAfter",
            "relationshipType",
            "relationType",
            "changeType",
        ]) ?? "relationship changes",
        stageSummary: readString(value, ["stageSummary", "summary"]) ?? evidenceText,
    };
}
function normalizeCharacterCandidate(value: unknown): unknown {
    if (!isRecord(value)) {
        return value;
    }
    const summary = readString(value, ["summary", "appearanceSummary", "relationToKnown", "narrativeRole"]);
    const evidence = Array.isArray(value.evidence)
        ? value.evidence
        : readString(value, ["appearanceSummary"])
            ? [readString(value, ["appearanceSummary"])]
            : [];
    return {
        ...value,
        proposedName: readString(value, ["proposedName", "characterName", "name"]),
        proposedRole: readString(value, ["proposedRole", "narrativeRole", "role"]),
        summary,
        evidence,
    };
}
const chapterArtifactStateCharacterSchema = z.object({
    characterId: nullableText,
    characterName: nullableText,
    currentGoal: nullableText,
    emotion: nullableText,
    stressLevel: z.number().min(0).max(100).optional().nullable(),
    secretExposure: nullableText,
    knownFacts: z.array(z.string().trim().min(1)).default([]),
    misbeliefs: z.array(z.string().trim().min(1)).default([]),
    summary: nullableText,
});
const chapterArtifactRelationStateSchema = z.object({
    sourceCharacterId: nullableText,
    sourceCharacterName: nullableText,
    targetCharacterId: nullableText,
    targetCharacterName: nullableText,
    trustScore: z.number().min(0).max(100).optional().nullable(),
    intimacyScore: z.number().min(0).max(100).optional().nullable(),
    conflictScore: z.number().min(0).max(100).optional().nullable(),
    dependencyScore: z.number().min(0).max(100).optional().nullable(),
    summary: nullableText,
});
const chapterArtifactInformationStateSchema = z.object({
    holderType: z.enum(["reader", "character"]).default("reader"),
    holderRefId: nullableText,
    holderRefName: nullableText,
    fact: z.string().trim().min(1),
    status: z.string().trim().min(1).default("known"),
    summary: nullableText,
});
const chapterArtifactForeshadowStateSchema = z.object({
    title: z.string().trim().min(1),
    summary: nullableText,
    status: z.string().trim().min(1).default("setup"),
    setupChapterId: z.preprocess(normalizeChapterReferenceText, nullableText),
    payoffChapterId: z.preprocess(normalizeChapterReferenceText, nullableText),
});
export const chapterArtifactDeltaStateSchema = z.object({
    summary: z.string().trim().optional().nullable(),
    characterStates: z.array(chapterArtifactStateCharacterSchema).default([]),
    relationStates: z.array(chapterArtifactRelationStateSchema).default([]),
    informationStates: z.array(chapterArtifactInformationStateSchema).default([]),
    foreshadowStates: z.array(chapterArtifactForeshadowStateSchema).default([]),
});
const chapterArtifactRelationDynamicSchema = z.preprocess(normalizeRelationDynamic, z.object({
    sourceCharacterName: z.string().trim().min(1),
    targetCharacterName: z.string().trim().min(1),
    stageLabel: z.string().trim().min(1),
    stageSummary: z.string().trim().min(1),
    nextTurnPoint: nullableText,
    confidence: confidenceSchema,
}));
const chapterArtifactFactionUpdateSchema = z.object({
    characterName: z.string().trim().min(1),
    factionLabel: z.string().trim().min(1),
    stanceLabel: nullableText,
    summary: nullableText,
    confidence: confidenceSchema,
});
const chapterArtifactCharacterCandidateSchema = z.preprocess(normalizeCharacterCandidate, z.object({
    proposedName: z.string().trim().min(1),
    proposedRole: nullableText,
    summary: nullableText,
    evidence: z.array(z.string().trim().min(1)).default([]),
    matchedCharacterName: nullableText,
    confidence: confidenceSchema,
}));
const chapterArtifactCharacterKnowledgeStateSchema = z.object({
    characterName: z.string().trim().min(1),
    knownFacts: z.array(z.string().trim().min(1)).max(5).default([]),
    hiddenFacts: z.array(z.string().trim().min(1)).max(5).default([]),
});
export const chapterArtifactDeltaSyncPlanSchema = z.preprocess(normalizeSyncPlan, z.object({
    stateSnapshot: z.enum(["skip", "write"]).default("write"),
    characterResources: z.enum(["skip", "write"]).default("write"),
    payoffLedger: z.enum(["skip", "delta", "full_reconcile"]).default("delta"),
    characterDynamics: z.enum(["skip", "write"]).default("write"),
    reason: z.string().trim().min(1),
}));
export const chapterArtifactDeltaOutputSchema = z.object({
    summary: z.string().trim().min(1),
    concreteFacts: z.array(chapterConcreteFactSchema).max(12).default([]),
    stateDeltas: chapterArtifactDeltaStateSchema,
    characterResourceDeltas: z.array(z.preprocess(normalizeCharacterResourceDelta, characterResourceExtractionUpdateSchema)).max(8).default([]),
    payoffDeltas: z.array(z.preprocess(normalizePayoffDelta, payoffLedgerSyncItemSchema)).default([]),
    relationDynamics: z.array(chapterArtifactRelationDynamicSchema).default([]),
    factionUpdates: z.array(chapterArtifactFactionUpdateSchema).default([]),
    characterCandidates: z.array(chapterArtifactCharacterCandidateSchema).default([]),
    characterKnowledgeStates: z.array(chapterArtifactCharacterKnowledgeStateSchema).default([]),
    characterMindDeltas: z.array(characterMindDeltaSchema).max(4).default([]),
    characterDialogueInfluenceResolutions: z.array(characterDialogueInfluenceResolutionSchema).max(4).default([]),
    syncPlan: chapterArtifactDeltaSyncPlanSchema,
    confidence: z.number().min(0).max(1),
    requiresFullReconcile: z.boolean().default(false),
});
export type ChapterArtifactDeltaOutput = z.infer<typeof chapterArtifactDeltaOutputSchema>;
export interface ChapterArtifactDeltaPromptInput {
    novelTitle: string;
    chapterOrder: number;
    chapterTitle: string;
    chapterGoal: string;
    characterRosterText: string;
    previousStateText: string;
    existingResourceText: string;
    existingPayoffText: string;
    activeCharacterDialogueInfluenceText: string;
    chapterContent: string;
}
const CHAPTER_ARTIFACT_DELTA_EXAMPLE: ChapterArtifactDeltaOutput = {
    summary: "In this chapter, Cheng Zhi confirms that there is an exploitable access loophole in the back door of the warehouse, and obtains the copper key that can open the back door. From this, the reader knows that sneaking into the warehouse is the next step of action, but he still does not know the layout of the guards in the warehouse, and the relevant clues are pushed to the status of pending redemption.",
    concreteFacts: [
        {
            text: "Cheng Zhi has obtained the copper key that can open the back door of the warehouse",
            category: "completed",
        },
    ],
    stateDeltas: {
        summary: "The protagonist gets the copper key to the backdoor, and the reader knows that backdoor infiltration becomes the next possible step.",
        characterStates: [
            {
                characterName: "Cheng Zhi",
                currentGoal: "Use the back door copper key to enter the warehouse",
                emotion: "Nervous but more confident",
                stressLevel: 62,
                secretExposure: "The reader knows he has the key",
                knownFacts: ["The back door copper key can open the back door of the warehouse"],
                misbeliefs: [],
                summary: "Cheng Zhi mastered a new infiltration method, but still didn't know the layout of the guards in the warehouse.",
            },
        ],
        relationStates: [],
        informationStates: [
            {
                holderType: "reader",
                fact: "The copper key to the back door has been obtained by Cheng Zhi.",
                status: "known",
                summary: "Readers know key resources are in place.",
            },
        ],
        foreshadowStates: [
            {
                title: "Warehouse back door",
                summary: "The backdoor copper key prompts that there will be a sneak or escape scene later.",
                status: "hinted",
                setupChapterId: "Current chapter",
            },
        ],
    },
    characterResourceDeltas: [
        {
            resourceName: "Back door copper key",
            resourceType: "credential",
            updateType: "acquired",
            holderCharacterName: "Cheng Zhi",
            ownerType: "character",
            ownerName: "Cheng Zhi",
            statusAfter: "available",
            readerKnows: true,
            holderKnows: true,
            knownByCharacterNames: ["Cheng Zhi"],
            narrativeFunction: "key",
            summary: "Cheng Zhi got the copper key that could open the back door of the warehouse.",
            narrativeImpact: "You can then reasonably enter the warehouse or escape through the back door.",
            expectedFutureUse: "Infiltrate the warehouse.",
            constraints: ["It can only explain backdoor access and cannot replace the main entrance authority."],
            evidence: ["Cheng Zhi put the copper key to the back door into his sleeve."],
            confidence: 0.88,
            riskLevel: "low",
            riskReason: "",
        },
    ],
    payoffDeltas: [
        {
            ledgerKey: "ku_fang_hou_men",
            title: "Warehouse back door",
            summary: "The copper key provides a clear basis for subsequent warehouse actions.",
            scopeType: "chapter",
            currentStatus: "hinted",
            targetStartChapterOrder: 4,
            targetEndChapterOrder: 6,
            firstSeenChapterOrder: 3,
            lastTouchedChapterOrder: 3,
            setupChapterOrder: 3,
            sourceRefs: [],
            evidence: [{ summary: "Cheng Zhi got the bronze key to the back door.", chapterOrder: 3 }],
            riskSignals: [],
            statusReason: "This chapter completes the preparation and needs to be fulfilled later.",
            confidence: 0.86,
        },
    ],
    relationDynamics: [],
    factionUpdates: [],
    characterCandidates: [],
    characterKnowledgeStates: [
        {
            characterName: "Cheng Zhi",
            knownFacts: ["The back door copper key can open the back door of the warehouse"],
            hiddenFacts: ["Guard layout in the warehouse"],
        },
    ],
    characterMindDeltas: [
        {
            characterName: "Cheng Zhi",
            currentInterpretation: "He believed the backdoor key made infiltration feasible, but underestimated the preparedness of the warehouse guards.",
            privateIntent: "Verify the backdoor on your own before Manager Zhao notices.",
            activePlan: "First find out the changing time, and then use the key to enter the warehouse.",
            emotionalStance: "In the tension, there is a determination to take the initiative to fight for it.",
            actionTendency: "He will first conceal clues and test them alone before deciding whether to ask for help.",
            decisionTrigger: "If the number of guards increases abnormally, they will turn to look for allies.",
            beliefs: ["Keys provide a hidden opportunity for entry"],
            misbeliefs: ["He thought Manager Zhao hadn't noticed the missing key yet."],
            evidence: ["Cheng Zhi put the copper key to the back door into his sleeve and decided to observe the changing of the guard first."],
            confidence: 0.78,
        },
    ],
    characterDialogueInfluenceResolutions: [],
    syncPlan: {
        stateSnapshot: "write",
        characterResources: "write",
        payoffLedger: "delta",
        characterDynamics: "skip",
        reason: "There are no relationship stage changes in this chapter, but there are status, resources, and foreshadowing deltas.",
    },
    confidence: 0.86,
    requiresFullReconcile: false,
};
export const chapterArtifactDeltaPrompt: PromptAsset<ChapterArtifactDeltaPromptInput, ChapterArtifactDeltaOutput> = {
    id: "novel.chapter.artifact_delta.extract",
    version: "v2",
    taskType: "fact_extraction",
    mode: "structured",
    language: "ka",
    contextPolicy: {
        maxTokensBudget: NOVEL_PROMPT_BUDGETS.chapterArtifactDelta,
    },
    repairPolicy: {
        maxAttempts: 1,
    },
    structuredOutputHint: {
        example: CHAPTER_ARTIFACT_DELTA_EXAMPLE,
        note: [
            "Extract chapter summaries, hard facts, status snapshots, character resources, foreshadowing/payoff, relationship dynamics, information boundaries, and synchronization plans in one go.",
            "Only record changes that have clear evidence in the text or are strongly related to the task objectives.",
            "syncPlan and requiresFullReconcile are judged by you based on plot risks, and the code is only responsible for verification and drop-in.",
        ].join(" "),
    },
    outputSchema: chapterArtifactDeltaOutputSchema,
    render: (input) => [
        new SystemMessage([
            "You are a Georgian-language novel chapter asset delta extractor.",
            "Your task is to extract the incremental assets needed for subsequent writing from the main text of a single chapter at once, and give a synchronization plan.",
            "",
            "Only output valid JSON objects, not Markdown, explanations, comments, or code blocks.",
            "",
            "Extraction principle:",
            "1. Only extract changes that have already occurred in the text, are known to the reader, are known to the characters, or are clearly required by the chapter tasks.",
            "2. Don\u2019t misjudge ordinary descriptions, one-time environmental objects, and purely psychological descriptions as long-term ledger assets.",
            "3. Character resources must have evidence; foreshadowing/payoff must be able to explain setup, advancement, redemption or risk.",
            "4. Relationship dynamics only record the content of this chapter when there are stage changes, camp stance changes, or new character candidates.",
            "5. The default output is delta; full_reconcile is only recommended when there is an obvious conflict in the ledger, the cash has been cashed out but no pre-padding can be found, key clues are misplaced across multiple chapters, or this chapter focuses on processing multiple payoffs.",
            "6. It\u2019s up to you to judge syncPlan, don\u2019t rely on keywords; if there is no corresponding change, clearly skip and explain the reason.",
            "7. Priority will be given to all character names using the list of known characters; new characters that cannot be confirmed will be put into characterCandidates, and do not be forcibly assigned to existing characters.",
            "8. The summary must be in natural Georgian and be limited to 80-180 words, covering key events, conflict progression, character status changes, the results of this chapter, or suspense direction.",
            "9. concreteFacts only records hard facts that are improvised in the main text of this chapter and must be consistent in the future. Each item should not exceed 40 words; including commitments, transaction terms, nature of events, key figures, dates and locations, identity and status changes.",
            "10. concreteFacts.category can only use completed, revealed, and state_changed; no clear hard facts can be output in real time [], and abstract goals or atmosphere descriptions cannot be written into concreteFacts.",
            "11. characterKnowledgeStates is only filled in when there is a significant information gap in this chapter; knownFacts is written for the facts that the character clearly knows after this chapter, and hiddenFacts is written for the facts that the character still does not know and cannot be informed in advance, with a maximum of 5 entries per group; no information gap is output [].",
            "11a. characterMindDeltas is only filled in when the main text clearly changes the character's understanding of the situation, emotions, intentions, plans, misjudgments, or action choices, up to 4 entries; it is a traceable subjective inference of the character, not an objective fact, and secrets must not be made up out of thin air. Each item must be given evidence; if there is no obvious change, output [].",
            "11b. characterDialogueInfluenceResolutions only evaluates the \"currently valid character dialogue influence\" provided below. They are soft behavioral tendencies confirmed by the author's dialogue with the characters, not objective facts or forced plots. { influenceId, status: \"applied\", evidence, confidence } will be output only when the main text has clearly taken over the action, emotion or relationship tension of an influence; when it has not been taken over, there is only vague foreshadowing, or the main text is opposite, defer can be output, or not output. It does not create facts, and cannot be based on plans or narration to infer that the mark applied. applied must give text evidence.",
            "12. payoffDeltas.currentStatus can only use setup, hinted, pending_payoff, paid_off, failed, overdue; do not output active, use pending_payoff if it has been advanced but not cashed out.",
            "13. payoffDeltas.riskSignals must be an object array in the form of {code, severity, summary}; if there is no risk, output [] instead of a string array.",
            "14. relationDynamics must use sourceCharacterName, targetCharacterName, stageLabel, and stageSummary; characterCandidates must use proposedName, proposedRole, and summary.",
            "15. characterResourceDeltas.updateType can only use introduced, acquired, revealed, used, transferred, lost, consumed, damaged, destroyed, recovered, stale_marked; new creations/first occurrences are unified with introduced.",
            "16. characterResourceDeltas.resourceType can only use physical_item, clue, credential, ability_resource, relationship_token, consumable, hidden_card, world_resource; consumable is used for materials, elixirs, and disposable herbs, and world_resource is used for points/currency/sect resources.",
            "17. characterResourceDeltas.narrativeFunction can only use tool, clue, weapon, proof, key, cost, promise, hidden_card, constraint; tool is usually used for practice gain, cost is used for consuming materials/points, and proof or constraint is used for credentials/IOUs.",
            "18. characterResourceDeltas.statusAfter can only use available, hidden, borrowed, transferred, lost, consumed, damaged, destroyed, stale; do not output custom statuses such as active, owned, usable, used, broken, etc.",
            "19. CharacterResourceDeltas can output up to 8 items; priority retention will affect changes in action boundaries, foreshadowing fulfillment, or resource ownership across chapters.",
            "20. payoffDeltas.scopeType can only use book, volume, and chapter; use book for the whole book/story-level foreshadowing, and do not output story, novel, or global.",
            "21. The setupChapterId/payoffChapterId of stateDeltas.foreshadowStates should only be filled in when the real chapterId can be confirmed; if you can only confirm which chapter, it is better to omit or write the chapter serial number string instead of outputting the number.",
            "22. syncPlan.stateSnapshot, characterResources, characterDynamics can only be skip or write; only payoffLedger can be skip, delta or full_reconcile.",
        ].join("\n")),
        new HumanMessage([
            `Novel:${input.novelTitle}`,
            `Chapter: Chapter ${input.chapterOrder} Chapter "${input.chapterTitle}》`,
            `Chapter Objectives:${input.chapterGoal || "no clear goals"}`,
            "",
            "Known roles:",
            input.characterRosterText || "No character list yet",
            "",
            "Summary of previous status:",
            input.previousStateText || "No previous status snapshot",
            "",
            "Existing role resource ledger:",
            input.existingResourceText || "There are currently no key resources",
            "",
            "Already have a foreshadowing ledger:",
            input.existingPayoffText || "There is no foreshadowing account book yet",
            "",
            "The current effective character dialogue influence (only for checking whether the main text is accepted; it is a soft behavioral tendency, not an objective fact or a forced plot):",
            input.activeCharacterDialogueInfluenceText || "None",
            "",
            "Chapter text:",
            input.chapterContent,
        ].join("\n")),
    ],
    postValidate: (output) => {
        for (const update of output.characterResourceDeltas) {
            if (update.evidence.length === 0) {
                throw new Error(`Lack of evidence for resource changes:${update.resourceName}`);
            }
        }
        for (const resolution of output.characterDialogueInfluenceResolutions) {
            if (resolution.status === "applied" && resolution.evidence.length === 0) {
                throw new Error(`Lack of evidence on the impact of character dialogue on engagement:${resolution.influenceId}`);
            }
        }
        if (output.syncPlan.payoffLedger === "skip" && output.payoffDeltas.length > 0) {
            throw new Error("payoffDeltas should not be output when syncPlan.payoffLedger is skip.");
        }
        return output;
    }
};

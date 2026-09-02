import type { ChapterRepairContext, ChapterReviewContext, ChapterWriteContext, } from "@ai-novel/shared/types/chapterRuntime";
import { createContextBlock } from "../../../core/contextBudget";
import type { PromptContextBlock } from "../../../core/promptTypes";
import { buildWriterStyleContractText } from "../../../../services/styleEngine/styleContractText";
import { buildCharacterGuidanceText, buildLedgerItemLine, buildParticipantText, buildPendingCandidateGuardText, buildRelationStageText, compactText, resolveTargetWordRange, takeUnique, toListBlock, } from "../chapterLayeredContextShared";
import { normalizeChapterWriteContext } from "./chapterContextPolicies";
export const WRITER_FORBIDDEN_GROUPS = [
    "full_outline",
    "full_bible",
    "all_characters",
    "all_audit_issues",
    "anti_copy_corpus",
    "raw_rag_dump",
] as const;
export type ChapterWriterBlockMode = "full" | "incremental" | "review" | "repair";
interface ChapterWriterBlockOptions {
    mode?: ChapterWriterBlockMode;
    incrementalContext?: {
        previousRoundSummary?: string | null;
        roundInstruction?: string | null;
        currentSceneProgress?: string | null;
    } | null;
}
export function sanitizeWriterContextBlocks(blocks: PromptContextBlock[]): {
    allowedBlocks: PromptContextBlock[];
    removedBlockIds: string[];
} {
    const forbidden = new Set<string>(WRITER_FORBIDDEN_GROUPS);
    const removedBlockIds = blocks
        .filter((block) => forbidden.has(block.group))
        .map((block) => block.id);
    return {
        allowedBlocks: blocks.filter((block) => !forbidden.has(block.group)),
        removedBlockIds,
    };
}
function hasLedgerPressure(writeContext: ChapterWriteContext): boolean {
    return writeContext.ledgerUrgentItems.length > 0
        || writeContext.ledgerOverdueItems.length > 0
        || writeContext.ledgerPendingItems.length > 0;
}
function hasCharacterResourcePressure(writeContext: ChapterWriteContext): boolean {
    const context = writeContext.characterResourceContext;
    if (!context) {
        return false;
    }
    return context.availableItems.length > 0
        || context.setupNeededItems.length > 0
        || context.blockedItems.length > 0
        || context.highRiskCommittedItems.length > 0
        || context.pendingProposalItems.length > 0
        || context.riskSignals.length > 0;
}
function buildCharacterHardFactsText(writeContext: ChapterWriteContext): string {
    const hardFacts = writeContext.characterHardFacts ?? [];
    if (hardFacts.length === 0) {
        return [
            "\u3010Character Hard Facts\u3011",
            "There are currently no registered character hard facts; character alignment, identity, realm, location, or action availability cannot be rewritten out of thin air.",
            "If the chapter mission does not clearly require it, do not add irreversible character states.",
        ].join("\n");
    }
    const hasPendingReviewFields = hardFacts.some((fact) => (fact.pendingReviewFields ?? []).length > 0);
    return [
        "\u3010Character Hard Facts\u3011",
        "The following content is a writing constraint that cannot be violated before the main text is generated, and has a higher priority than soft character introductions.",
        hasPendingReviewFields
            ? "The current status/current goal marked as pending confirmation is for reference only; if it conflicts with the latest plot, it can be adjusted according to reasonable logic." : "",
        ...hardFacts.slice(0, 8).map((fact) => {
            const pendingReviewFields = new Set(fact.pendingReviewFields ?? []);
            const parts = takeUnique([
                fact.role ? `role positioning =${fact.role}` : "",
                fact.identityLabel ? `Identity =${fact.identityLabel}` : "",
                fact.factionLabel ? `camp =${fact.factionLabel}` : "",
                fact.stanceLabel ? `position=${fact.stanceLabel}` : "",
                fact.powerLevel ? `Combat strength =${fact.powerLevel}` : "",
                fact.realm ? `Realm =${fact.realm}` : "",
                fact.currentLocation ? `Current location=${fact.currentLocation}` : "",
                fact.availability ? `Available status=${fact.availability}` : "",
                fact.currentState
                    ? pendingReviewFields.has("currentState")
                        ? `Current status (to be confirmed, if it conflicts with the latest plot, it can be adjusted according to reasonable logic) =${fact.currentState}`
                        : `current status=${fact.currentState}`
                    : "",
                fact.currentGoal
                    ? pendingReviewFields.has("currentGoal")
                        ? `Current goal (to be confirmed, if it conflicts with the latest plot, it can be adjusted according to reasonable logic) =${fact.currentGoal}`
                        : `current target =${fact.currentGoal}`
                    : "",
                fact.prohibitions.length > 0 ? `Miswriting is prohibited =${fact.prohibitions.join(" / ")}` : "",
            ], 12);
            return `- ${fact.name}: ${parts.join(" | ")}`;
        }),
    ].filter(Boolean).join("\n");
}
function buildResourceItemLine(item: NonNullable<ChapterWriteContext["characterResourceContext"]>["availableItems"][number]): string {
    const holder = item.holderCharacterName ? `holder=${item.holderCharacterName}` : "holder=unknown";
    const window = item.expectedUseStartChapterOrder || item.expectedUseEndChapterOrder
        ? `window=${item.expectedUseStartChapterOrder ?? "?"}-${item.expectedUseEndChapterOrder ?? "?"}`
        : "";
    const constraints = item.constraints.length > 0 ? `constraints=${item.constraints.slice(0, 2).join(" / ")}` : "";
    return `${item.name} [${item.status}; ${holder}; ${item.narrativeFunction}] ${item.summary}${window ? ` | ${window}` : ""}${constraints ? ` | ${constraints}` : ""}`;
}
function buildResourceProposalLine(item: NonNullable<ChapterWriteContext["characterResourceContext"]>["pendingProposalItems"][number]): string {
    const evidence = item.evidence[0] ? ` | evidence=${item.evidence[0]}` : "";
    return `${item.summary} [risk=${item.riskLevel}; status=${item.status}]${evidence}`;
}
function buildCharacterResourceContextBlock(writeContext: ChapterWriteContext): string {
    const context = writeContext.characterResourceContext;
    if (!context) {
        return "";
    }
    return [
        `Resource ledger summary: ${context.summary}`,
        toListBlock("Available resources", context.availableItems.slice(0, 6).map(buildResourceItemLine)),
        toListBlock("Needs setup before use", context.setupNeededItems.slice(0, 5).map(buildResourceItemLine)),
        toListBlock("Unavailable or risky to reuse", context.blockedItems.slice(0, 5).map(buildResourceItemLine)),
        toListBlock("High-risk committed resources", context.highRiskCommittedItems.slice(0, 4).map(buildResourceItemLine)),
        toListBlock("Pending resource proposals (not committed)", context.pendingProposalItems.slice(0, 4).map(buildResourceProposalLine)),
        toListBlock("Resource risk signals", context.riskSignals.slice(0, 5).map((item) => `${item.severity}: ${item.summary}`)),
    ].filter(Boolean).join("\n");
}
function shouldIncludeCharacterDynamics(writeContext: ChapterWriteContext, mode: ChapterWriterBlockMode): boolean {
    if (mode === "incremental") {
        return writeContext.activeRelationStages.length > 0
            || writeContext.pendingCandidateGuards.length > 0;
    }
    if (mode === "repair") {
        return writeContext.characterBehaviorGuides.length > 0 || writeContext.activeRelationStages.length > 0;
    }
    return writeContext.characterBehaviorGuides.length > 0
        || writeContext.activeRelationStages.length > 0
        || writeContext.pendingCandidateGuards.length > 0;
}
function buildIncrementalRoundContextBlock(incrementalContext: ChapterWriterBlockOptions["incrementalContext"]): PromptContextBlock | null {
    if (!incrementalContext) {
        return null;
    }
    const content = [
        incrementalContext.previousRoundSummary?.trim()
            ? `Previous round summary: ${incrementalContext.previousRoundSummary.trim()}`
            : "",
        incrementalContext.currentSceneProgress?.trim()
            ? `Current scene progress: ${incrementalContext.currentSceneProgress.trim()}`
            : "",
        incrementalContext.roundInstruction?.trim()
            ? `Current round instruction: ${incrementalContext.roundInstruction.trim()}`
            : "",
    ].filter(Boolean).join("\n");
    if (!content) {
        return null;
    }
    return createContextBlock({
        id: "incremental_round_context",
        group: "incremental_round_context",
        priority: 99,
        required: true,
        content,
    });
}
function buildChapterBoundaryContextBlock(writeContext: ChapterWriteContext): PromptContextBlock | null {
    const boundary = writeContext.chapterBoundary;
    if (!boundary) {
        return null;
    }
    return createContextBlock({
        id: "chapter_boundary",
        group: "chapter_boundary",
        priority: 99,
        required: true,
        allowSummary: false,
        content: [
            "Chapter boundary:",
            boundary.exclusiveEvent ? `Exclusive event: ${compactText(boundary.exclusiveEvent)}` : "",
            boundary.entryState ? `Entry state: ${compactText(boundary.entryState)}` : "",
            boundary.endingState ? `Ending state: ${compactText(boundary.endingState)}` : "",
            boundary.nextChapterEntryState ? `Next chapter entry state: ${compactText(boundary.nextChapterEntryState)}` : "",
            typeof boundary.allowedRevealLevel === "number" ? `Allowed reveal level: ${boundary.allowedRevealLevel}` : "",
            toListBlock("Do not cross", boundary.doNotCross ?? []),
            toListBlock("Protected reveals", boundary.protectedReveals ?? []),
        ].filter(Boolean).join("\n"),
    });
}
export function buildChapterWriterContextBlocks(writeContext: ChapterWriteContext, options: ChapterWriterBlockOptions = {}): PromptContextBlock[] {
    writeContext = normalizeChapterWriteContext(writeContext);
    const mode = options.mode ?? "full";
    const isIncremental = mode === "incremental";
    const includeVolumeWindow = mode === "full" || mode === "review";
    const includePayoffLedger = mode === "full" && hasLedgerPressure(writeContext);
    const includePayoffDirectives = writeContext.payoffDirectives.length > 0;
    const hasObligationContract = Object.values(writeContext.obligationContract).some((items) => items.length > 0);
    const includeCharacterResources = !isIncremental && hasCharacterResourcePressure(writeContext);
    const includeCharacterDynamics = shouldIncludeCharacterDynamics(writeContext, mode);
    const includeOpenConflicts = !isIncremental && writeContext.openConflictSummaries.length > 0;
    const includeRecentChapters = mode === "full" && writeContext.recentChapterSummaries.length > 0;
    const includeStyleContract = mode !== "incremental" && Boolean(writeContext.styleContract);
    const includeContinuationConstraints = mode === "full" && writeContext.continuationConstraints.length > 0;
    const wordRange = resolveTargetWordRange(writeContext.chapterMission.targetWordCount);
    const blocks: Array<PromptContextBlock | null> = [
        writeContext.productionFoundationPrompt
            ? createContextBlock({
                id: "production_foundation",
                group: "production_foundation",
                priority: 100,
                required: true,
                allowSummary: false,
                content: [
                    "The basis for the creation of this book (the text, acceptance and restoration must be adhered to together):",
                    writeContext.productionFoundationPrompt,
                ].join("\n"),
            })
            : null,
        createContextBlock({
            id: "chapter_mission",
            group: "chapter_mission",
            priority: 100,
            required: true,
            content: [
                `Chapter tasks:${writeContext.chapterMission.title}`,
                `Goal:${writeContext.chapterMission.objective}`,
                `Expected results:${writeContext.chapterMission.expectation}`,
                `State-driven next action:${writeContext.nextAction}`,
                writeContext.chapterMission.planRole ? `Program roles:${writeContext.chapterMission.planRole}` : "",
                wordRange.targetWordCount != null
                    ? `Target length: approx. ${wordRange.targetWordCount} words (acceptable range ${wordRange.minWordCount}-${wordRange.maxWordCount}; not significantly lower than the minimum value).`
                    : "",
                writeContext.completedMilestones.length > 0
                    ? toListBlock("Completed items (cannot be re-pursued or re-triggered)", writeContext.completedMilestones, "None")
                    : "",
                toListBlock("Must advance", writeContext.chapterMission.mustAdvance, "None"),
                toListBlock("must be retained", writeContext.chapterMission.mustPreserve, "None"),
                toListBlock("Risk warning", writeContext.chapterMission.riskNotes, "None"),
                writeContext.chapterMission.taskSheet
                    ? `Original task order:
${writeContext.chapterMission.taskSheet}`
                    : "",
                writeContext.chapterMission.hookTarget ? `End of chapter hook:${writeContext.chapterMission.hookTarget}` : "",
            ].filter(Boolean).join("\n"),
        }),
        writeContext.previousChapterTail
            ? createContextBlock({
                id: "previous_chapter_tail",
                group: "previous_chapter_tail",
                priority: 100,
                required: true,
                allowSummary: false,
                content: [
                    "The actual end of the previous chapter (the beginning of this chapter must directly take over the time, place, character status and unrealized actions here):",
                    writeContext.previousChapterTail,
                ].join("\n"),
            })
            : null,
        createContextBlock({
            id: "reader_experience",
            group: "reader_experience",
            priority: 100,
            required: true,
            allowSummary: false,
            content: [
                "Reader experience contract (shared by the text of this chapter, acceptance and repair):",
                `Readers\u2019 core questions:${writeContext.readerExperience.readerQuestion}`,
                `Visible rewards for this chapter:${writeContext.readerExperience.promisedReward}`,
                `Return level:${writeContext.readerExperience.rewardLevel}`,
                `The protagonist\u2019s immediate desire:${writeContext.readerExperience.protagonistWant}`,
                `Main resistance:${writeContext.readerExperience.primaryResistance}`,
                `Key turning point:${writeContext.readerExperience.keyTurn}`,
                `Emotional Displacement:${writeContext.readerExperience.emotionalShift}`,
                `Information delivery:${writeContext.readerExperience.informationReveal}`,
                `Net change at end of chapter:${writeContext.readerExperience.netChange}`,
                toListBlock("Inherited hook responsibilities (respond first before creating new problems)", writeContext.readerExperience.inheritedHookResponsibilities, "No clear responsibility for old hooks"),
                `End-of-chapter catch-up hook:${writeContext.readerExperience.endingHook}`,
            ].join("\n"),
        }),
        hasObligationContract
            ? createContextBlock({
                id: "obligation_contract",
                group: "obligation_contract",
                priority: 99,
                required: true,
                allowSummary: false,
                content: [
                    "Chapter implementation obligations:",
                    toListBlock("This chapter must hit", writeContext.obligationContract.mustHitNow, "None"),
                    toListBlock("must be retained", writeContext.obligationContract.mustPreserve, "None"),
                    toListBlock("Foreshadowing that must be touched", writeContext.obligationContract.requiredPayoffTouches, "None"),
                    toListBlock("A must-play role", writeContext.obligationContract.requiredCharacterAppearances, "None"),
                    toListBlock("Goals that must change", writeContext.obligationContract.requiredGoalChanges, "None"),
                    toListBlock("Can be deferred", writeContext.obligationContract.canDefer, "None"),
                    toListBlock("No crossing the line", writeContext.obligationContract.forbiddenCrossings, "None"),
                ].filter(Boolean).join("\n"),
            })
            : null,
        includePayoffDirectives
            ? createContextBlock({
                id: "payoff_directives",
                group: "payoff_directives",
                priority: 98,
                required: true,
                allowSummary: false,
                content: [
                    "Payoff directives:",
                    ...writeContext.payoffDirectives.map((item) => [
                        `- ${item.title} [${item.operation}]`,
                        item.ledgerKey ? `ledger=${item.ledgerKey}` : "",
                        item.reason ? `reason=${item.reason}` : "",
                        item.forbiddenReveal ? `forbiddenReveal=${item.forbiddenReveal}` : "",
                    ].filter(Boolean).join(" | ")),
                ].join("\n"),
            })
            : null,
        createContextBlock({
            id: "state_goal",
            group: "state_goal",
            priority: 97,
            required: Boolean(writeContext.chapterStateGoal),
            content: writeContext.chapterStateGoal
                ? [
                    `State goal: ${writeContext.chapterStateGoal.summary}`,
                    toListBlock("Target conflicts", writeContext.chapterStateGoal.targetConflicts),
                    toListBlock("Target relationships", writeContext.chapterStateGoal.targetRelationships),
                    toListBlock("Protected secrets", writeContext.protectedSecrets),
                ].filter(Boolean).join("\n")
                : "",
        }),
        buildIncrementalRoundContextBlock(options.incrementalContext),
        includeVolumeWindow
            ? createContextBlock({
                id: "volume_window",
                group: "volume_window",
                priority: 96,
                content: writeContext.volumeWindow
                    ? [
                        `Current volume: ${writeContext.volumeWindow.title}`,
                        `Volume mission: ${writeContext.volumeWindow.missionSummary}`,
                        writeContext.volumeWindow.coreReward
                            ? `Current volume reader reward: ${writeContext.volumeWindow.coreReward}`
                            : "",
                        writeContext.volumeWindow.readerRewardLadder
                            ? `Book reader reward ladder: ${writeContext.volumeWindow.readerRewardLadder}`
                            : "",
                        toListBlock("Current volume pending payoffs", writeContext.volumeWindow.pendingPayoffs.slice(0, 3)),
                        writeContext.volumeWindow.keyMilestoneGuards.length > 0
                            ? toListBlock("Volume key milestone guards — pacing constraints", writeContext.volumeWindow.keyMilestoneGuards
                                .filter((guard) => guard.status !== "done")
                                .map((guard) => `[${guard.targetChapterRange}] ${guard.event}: ${guard.note}`))
                            : "",
                    ].filter(Boolean).join("\n")
                    : "Current volume: none",
            })
            : null,
        writeContext.narrativeProgressHint
            ? createContextBlock({
                id: "narrative_progress_hint",
                group: "narrative_progress_hint",
                priority: 98,
                required: false,
                content: writeContext.narrativeProgressHint,
            })
            : null,
        includePayoffLedger
            ? createContextBlock({
                id: "payoff_ledger",
                group: "payoff_ledger",
                priority: 95,
                content: [
                    writeContext.ledgerSummary
                        ? `Payoff ledger summary: pending=${writeContext.ledgerSummary.pendingCount}, urgent=${writeContext.ledgerSummary.urgentCount}, overdue=${writeContext.ledgerSummary.overdueCount}`
                        : "Payoff ledger summary: none",
                    toListBlock("Urgent payoffs", writeContext.ledgerUrgentItems.map((item) => buildLedgerItemLine(item, "urgent"))),
                    toListBlock("Overdue payoffs", writeContext.ledgerOverdueItems.map((item) => buildLedgerItemLine(item, "overdue"))),
                    toListBlock("Active pending payoffs", writeContext.ledgerPendingItems.slice(0, 3).map((item) => buildLedgerItemLine(item, "pending"))),
                ].join("\n"),
            })
            : null,
        createContextBlock({
            id: "character_hard_facts",
            group: "character_hard_facts",
            priority: 99,
            required: true,
            allowSummary: false,
            content: buildCharacterHardFactsText(writeContext),
        }),
        createContextBlock({
            id: "participant_subset",
            group: "participant_subset",
            priority: 92,
            required: true,
            content: buildParticipantText(writeContext),
        }),
        includeCharacterDynamics
            ? createContextBlock({
                id: "character_dynamics",
                group: "character_dynamics",
                priority: 91,
                content: [
                    buildCharacterGuidanceText(writeContext),
                    buildRelationStageText(writeContext),
                    buildPendingCandidateGuardText(writeContext),
                ].join("\n\n"),
            })
            : null,
        includeCharacterResources
            ? createContextBlock({
                id: "character_resource_context",
                group: "character_resource_context",
                priority: 90,
                required: mode === "review" || mode === "repair",
                content: buildCharacterResourceContextBlock(writeContext),
            })
            : null,
        createContextBlock({
            id: "local_state",
            group: "local_state",
            priority: 89,
            required: true,
            content: `Current situation before writing:
${writeContext.localStateSummary}`,
        }),
        includeOpenConflicts
            ? createContextBlock({
                id: "open_conflicts",
                group: "open_conflicts",
                priority: 88,
                content: toListBlock("Open conflicts", writeContext.openConflictSummaries.slice(0, 6)),
            })
            : null,
        includeRecentChapters
            ? createContextBlock({
                id: "recent_chapters",
                group: "recent_chapters",
                priority: 86,
                content: toListBlock("Recent chapter summaries", writeContext.recentChapterSummaries),
            })
            : null,
        mode === "full"
            ? createContextBlock({
                id: "opening_constraints",
                group: "opening_constraints",
                priority: 80,
                content: [
                    `Opening anti-repeat hint:\n${writeContext.openingAntiRepeatHint}`,
                    writeContext.recentScenePatterns.length > 0
                        ? toListBlock("Scene pattern blacklist — do NOT repeat these exact time+location+action combinations", writeContext.recentScenePatterns.slice(0, 6))
                        : "",
                ].filter(Boolean).join("\n\n"),
            })
            : null,
        includeStyleContract
            ? createContextBlock({
                id: "style_contract",
                group: "style_contract",
                priority: 74,
                required: mode === "full",
                content: buildWriterStyleContractText(writeContext.styleContract),
            })
            : null,
        includeContinuationConstraints
            ? createContextBlock({
                id: "continuation_constraints",
                group: "continuation_constraints",
                priority: 74,
                required: mode === "full",
                allowSummary: false,
                content: toListBlock("Continuation constraints", writeContext.continuationConstraints),
            })
            : null,
    ];
    return blocks.filter((block): block is PromptContextBlock => block !== null && block.content.trim().length > 0);
}
export function buildChapterReviewContextBlocks(reviewContext: ChapterReviewContext): PromptContextBlock[] {
    return [
        ...buildChapterWriterContextBlocks(reviewContext, { mode: "review" }),
        buildChapterBoundaryContextBlock(reviewContext),
        createContextBlock({
            id: "structure_obligations",
            group: "structure_obligations",
            priority: 94,
            required: true,
            content: toListBlock("Structure obligations", reviewContext.structureObligations),
        }),
        createContextBlock({
            id: "world_rules",
            group: "world_rules",
            priority: 84,
            content: toListBlock("Relevant world rules", reviewContext.worldRules),
        }),
        createContextBlock({
            id: "historical_issues",
            group: "historical_issues",
            priority: 82,
            content: toListBlock("Historical unresolved issues", reviewContext.historicalIssues),
        }),
    ].filter((block): block is PromptContextBlock => block !== null && block.content.trim().length > 0);
}
export function buildChapterRepairContextBlocks(repairContext: ChapterRepairContext): PromptContextBlock[] {
    return [
        ...buildChapterWriterContextBlocks(repairContext.writeContext, { mode: "repair" }),
        createContextBlock({
            id: "repair_issues",
            group: "repair_issues",
            priority: 100,
            required: true,
            content: repairContext.issues.length > 0
                ? [
                    "Repair issues:",
                    ...repairContext.issues.map((issue) => (`- ${issue.severity}/${issue.category}: ${issue.evidence} | fix: ${issue.fixSuggestion}`)),
                ].join("\n")
                : "Repair issues: none",
        }),
        buildChapterBoundaryContextBlock(repairContext.writeContext),
        createContextBlock({
            id: "structure_obligations",
            group: "structure_obligations",
            priority: 95,
            required: true,
            content: toListBlock("Structure obligations", repairContext.structureObligations),
        }),
        createContextBlock({
            id: "repair_boundaries",
            group: "repair_boundaries",
            priority: 96,
            required: true,
            content: toListBlock("Allowed edit boundaries", repairContext.allowedEditBoundaries),
        }),
        createContextBlock({
            id: "world_rules",
            group: "world_rules",
            priority: 84,
            content: toListBlock("Relevant world rules", repairContext.worldRules),
        }),
        createContextBlock({
            id: "historical_issues",
            group: "historical_issues",
            priority: 82,
            content: toListBlock("Historical unresolved issues", repairContext.historicalIssues),
        }),
    ].filter((block): block is PromptContextBlock => block !== null && block.content.trim().length > 0);
}

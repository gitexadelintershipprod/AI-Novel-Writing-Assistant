import type { BookContractContext, ChapterWriteContext, GenerationContextPackage, MacroConstraintContext, } from "@ai-novel/shared/types/chapterRuntime";
import { resolveLengthBudgetContract } from "@ai-novel/shared/types/chapterLengthControl";
import { buildPlannerStyleContractSummaryText } from "../../../services/styleEngine/styleContractText";
export function compactText(value: string | null | undefined, fallback = ""): string {
    return value?.replace(/\s+/g, " ").trim() || fallback;
}
export function takeUnique(items: Array<string | null | undefined>, limit = items.length): string[] {
    const seen = new Set<string>();
    const results: string[] = [];
    for (const item of items) {
        const normalized = compactText(item);
        if (!normalized || seen.has(normalized)) {
            continue;
        }
        seen.add(normalized);
        results.push(normalized);
        if (results.length >= limit) {
            break;
        }
    }
    return results;
}
export function splitLines(value: string | null | undefined, limit = 4): string[] {
    return takeUnique((value ?? "")
        .split(/\r?\n+/g)
        .map((line) => line.replace(/^[-*\d.\s]+/, "").trim()), limit);
}
export function toListBlock(title: string, values: string[], emptyLabel = "none"): string {
    if (values.length === 0) {
        return `${title}: ${emptyLabel}`;
    }
    return [title, ...values.map((value) => `- ${value}`)].join("\n");
}
function displayPromptValue(value: string | null | undefined, fallback = "unspecified"): string {
    const normalized = compactText(value);
    const labels: Record<string, string> = {
        unknown: fallback,
        "not specified": fallback,
        none: "None",
        first_person: "first person",
        third_person: "third person",
        omniscient: "omniscient perspective",
        fast: "fast paced",
        balanced: "balanced rhythm",
        slow: "slow pace",
        low: "low",
        medium: "in",
        high: "high",
    };
    return labels[normalized] ?? (normalized || fallback);
}
export function renderBookContractText(contract: BookContractContext): string {
    return [
        `Title:${displayPromptValue(contract.title)}`,
        `Subject:${displayPromptValue(contract.genre)}`,
        `Target readers:${displayPromptValue(contract.targetAudience)}`,
        `Core selling points:${displayPromptValue(contract.sellingPoint)}`,
        `${contract.promiseScope === "whole_book" ? "Core Commitments of the Book" : "First 30 Chapters Promise"}：${displayPromptValue(contract.first30ChapterPromise)}`,
        contract.completionMode === "compact_book"
            ? `Compact Full Book Contract: Objectives ${contract.targetChapterCount ?? "Undecided"} Chapter, the ending is the latest chapter ${contract.endingRequiredBy ?? "target"} Chapter completed; the final chapter may not open a new main line that must be continued.`
            : "",
        contract.readingPromise ? `Read the pledge:${displayPromptValue(contract.readingPromise)}` : "",
        contract.protagonistFantasy ? `Protagonist Fantasy:${displayPromptValue(contract.protagonistFantasy)}` : "",
        contract.coreSellingPoint ? `Core selling points of the contract:${displayPromptValue(contract.coreSellingPoint)}` : "",
        contract.chapter3Payoff ? `Chapter 3 Cash Out:${displayPromptValue(contract.chapter3Payoff)}` : "",
        contract.chapter10Payoff ? `Chapter 10 Cashing out:${displayPromptValue(contract.chapter10Payoff)}` : "",
        contract.chapter30Payoff ? `Chapter 30 Cashing out:${displayPromptValue(contract.chapter30Payoff)}` : "",
        contract.escalationLadder ? `Upgrade ladder:${displayPromptValue(contract.escalationLadder)}` : "",
        contract.relationshipMainline ? `Main line of relationship:${displayPromptValue(contract.relationshipMainline)}` : "",
        (contract.activeMilestonePayoffs?.length ?? 0) > 0
            ? `Implementations that must be paid attention to at the current stage:${contract.activeMilestonePayoffs.join(" | ")}`
            : "",
        `Narrative perspective:${displayPromptValue(contract.narrativePov)}`,
        `Rhythm preference:${displayPromptValue(contract.pacePreference)}`,
        `Emotional intensity:${displayPromptValue(contract.emotionIntensity)}`,
        contract.toneGuardrails.length > 0 ? `Tone guardrails:${contract.toneGuardrails.join(" | ")}` : "",
        contract.hardConstraints.length > 0 ? `Hard constraints:${contract.hardConstraints.join(" | ")}` : "",
    ].filter(Boolean).join("\n");
}
export function renderStoryMacroText(macro: MacroConstraintContext): string {
    return [
        `Core selling points:${displayPromptValue(macro.sellingPoint)}`,
        `Core conflict:${displayPromptValue(macro.coreConflict)}`,
        `Main hook:${displayPromptValue(macro.mainHook)}`,
        `Advance cycle:${displayPromptValue(macro.progressionLoop)}`,
        `Growth path:${displayPromptValue(macro.growthPath)}`,
        `Final taste:${displayPromptValue(macro.endingFlavor)}`,
        macro.hardConstraints.length > 0 ? `Hard constraints:${macro.hardConstraints.join(" | ")}` : "",
    ].filter(Boolean).join("\n");
}
export function resolveTargetWordRange(targetWordCount: number | null | undefined): {
    targetWordCount: number | null;
    minWordCount: number | null;
    maxWordCount: number | null;
} {
    const budget = resolveLengthBudgetContract(targetWordCount);
    if (!budget) {
        return {
            targetWordCount: null,
            minWordCount: null,
            maxWordCount: null,
        };
    }
    return {
        targetWordCount: budget.targetWordCount,
        minWordCount: budget.softMinWordCount,
        maxWordCount: budget.softMaxWordCount,
    };
}
export function summarizeStateSnapshot(contextPackage: GenerationContextPackage): string {
    if (contextPackage.canonicalState) {
        const snapshot = contextPackage.canonicalState;
        const fragments = takeUnique([
            snapshot.narrative.currentChapterGoal,
            ...snapshot.characters
                .slice(0, 3)
                .map((state) => {
                const parts = takeUnique([
                    state.currentGoal ? `Goal:${state.currentGoal}` : "",
                    state.currentState ? `Status:${state.currentState}` : "",
                    state.emotion ? `Emotions:${state.emotion}` : "",
                    state.summary,
                ]);
                if (parts.length === 0) {
                    return "";
                }
                return `${state.name}: ${parts.join(" | ")}`;
            }),
            ...snapshot.narrative.publicKnowledge
                .slice(0, 2)
                .map((fact) => `${fact}(Already known to readers)`),
        ], 6);
        return fragments.join("\n") || "There is currently no authoritative status snapshot for the last round.";
    }
    const characterNameById = new Map(contextPackage.characterRoster.map((character) => [character.id, character.name.trim() || "unnamed role"]));
    const fragments = takeUnique([
        contextPackage.stateSnapshot?.summary,
        ...contextPackage.stateSnapshot?.characterStates
            .slice(0, 3)
            .map((state) => {
            const parts = takeUnique([
                state.currentGoal ? `Goal:${state.currentGoal}` : "",
                state.emotion ? `Emotions:${state.emotion}` : "",
                state.summary ? `Status:${state.summary}` : "",
            ]);
            if (parts.length === 0) {
                return "";
            }
            const characterName = characterNameById.get(state.characterId) ?? "unnamed role";
            return `${characterName}: ${parts.join(" | ")}`;
        }) ?? [],
        ...contextPackage.stateSnapshot?.informationStates
            .slice(0, 2)
            .map((info) => `${info.fact} (Status: ${info.status})`) ?? [],
    ], 6);
    return fragments.join("\n") || "There is no previous round of status snapshot.";
}
export function summarizeOpenConflicts(contextPackage: GenerationContextPackage): string[] {
    if (contextPackage.canonicalState) {
        return contextPackage.canonicalState.narrative.openConflicts
            .slice(0, 4)
            .map((conflict) => {
            const parts = takeUnique([
                conflict.title,
                conflict.summary,
                conflict.resolutionHint ? `resolution hint: ${conflict.resolutionHint}` : "",
            ], 3);
            return parts.join(" | ");
        })
            .filter(Boolean);
    }
    return contextPackage.openConflicts
        .slice(0, 4)
        .map((conflict) => {
        const parts = takeUnique([
            conflict.title,
            conflict.summary,
            conflict.resolutionHint ? `resolution hint: ${conflict.resolutionHint}` : "",
        ], 3);
        return parts.join(" | ");
    })
        .filter(Boolean);
}
export function summarizeWorldRules(contextPackage: GenerationContextPackage): string[] {
    const worldSlice = contextPackage.storyWorldSlice;
    if (worldSlice) {
        return takeUnique([
            worldSlice.coreWorldFrame,
            ...worldSlice.appliedRules.slice(0, 3).map((rule) => `${rule.name}: ${rule.summary}`),
            ...worldSlice.forbiddenCombinations.slice(0, 2),
            worldSlice.storyScopeBoundary,
        ], 6);
    }
    if (!contextPackage.canonicalState?.worldState) {
        return [];
    }
    const world = contextPackage.canonicalState.worldState;
    return takeUnique([
        world.summary ? `Continuity record:${world.summary}` : "",
        ...world.rules.slice(0, 3).map((rule) => `Continuity rule record:${rule}`),
        ...world.tabooRules.slice(0, 2).map((rule) => `Continuity Taboo Records:${rule}`),
        world.currentSituation ? `Current world state record:${world.currentSituation}` : "",
    ], 6);
}
export function summarizeHistoricalIssues(contextPackage: GenerationContextPackage): string[] {
    return contextPackage.openAuditIssues
        .slice(0, 4)
        .map((issue) => `${issue.severity}/${issue.auditType}: ${issue.description}`)
        .filter(Boolean);
}
export function summarizeStyleConstraints(contextPackage: GenerationContextPackage): string[] {
    const contract = contextPackage.styleContext?.compiledBlocks?.contract;
    if (!contract) {
        return [];
    }
    return takeUnique(buildPlannerStyleContractSummaryText(contract)
        .split(/\r?\n/g)
        .map((line) => line.trim())
        .filter(Boolean), 8);
}
export function summarizeContinuationConstraints(contextPackage: GenerationContextPackage): string[] {
    if (!contextPackage.continuation.enabled) {
        return [];
    }
    const humanBlock = contextPackage.continuation.humanBlock ?? "";
    const sourceLine = takeUnique([
        findInlineValue(humanBlock, "Continuation source"),
        findInlineValue(humanBlock, "续写来源"),
        findInlineValue(humanBlock, "Previous title"),
        findInlineValue(humanBlock, "前作标题"),
        findInlineValue(humanBlock, "Knowledge base document title"),
        findInlineValue(humanBlock, "知识库文档标题"),
        findInlineValue(humanBlock, "Book split analysis"),
        findInlineValue(humanBlock, "拆书分析"),
    ], 4);
    const sectionLines = [
        ...extractContinuationSectionLines(humanBlock, "The status of the core characters in the previous game", 3),
        ...extractContinuationSectionLines(humanBlock, "前作核心角色状态", 3),
        ...extractContinuationSectionLines(humanBlock, "Summary of the final chapters of the previous game", 3),
        ...extractContinuationSectionLines(humanBlock, "前作终局章节摘要", 3),
        ...extractContinuationSectionLines(humanBlock, "Key facts from the previous work", 3),
        ...extractContinuationSectionLines(humanBlock, "前作关键事实", 3),
        ...extractContinuationSectionLines(humanBlock, "Unfinished clues from the previous work", 3),
        ...extractContinuationSectionLines(humanBlock, "前作未完线索", 3),
        ...extractContinuationSectionLines(humanBlock, "Summary of acceptable information", 4),
        ...extractContinuationSectionLines(humanBlock, "可承接信息摘要", 4),
    ];
    return takeUnique([
        compactText(contextPackage.continuation.systemRule),
        sourceLine.length > 0 ? `Continuation source constraints:${sourceLine.join(" / ")}` : "",
        ...sectionLines,
    ], 12);
}
function findInlineValue(source: string, label: string): string {
    const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const match = source.match(new RegExp(`^${escaped}[：:]\\s*(.+)$`, "m"));
    return compactText(match?.[1]);
}
function extractContinuationSectionLines(source: string, sectionLabel: string, limit: number): string[] {
    const normalizedLabel = sectionLabel.replace(/[（(].*$/, "");
    const lines = source.replace(/\r\n?/g, "\n").split("\n");
    const results: string[] = [];
    let collecting = false;
    for (const rawLine of lines) {
        const line = rawLine.trim();
        if (!line) {
            if (collecting && results.length > 0) {
                break;
            }
            continue;
        }
        if (line.startsWith(sectionLabel) || line.startsWith(normalizedLabel)) {
            collecting = true;
            const inlineValue = line.replace(/^.*?[：:]\s*/, "").trim();
            if (inlineValue && inlineValue !== line) {
                results.push(`${normalizedLabel}：${inlineValue}`);
            }
            continue;
        }
        if (collecting && /^[^：:\n]{2,32}[：:]$/.test(line)) {
            break;
        }
        if (!collecting) {
            continue;
        }
        const cleaned = compactText(line.replace(/^[-*•\d.、\s]+/, ""));
        if (cleaned) {
            results.push(`${normalizedLabel}：${cleaned}`);
        }
        if (results.length >= limit) {
            break;
        }
    }
    return takeUnique(results, limit);
}
function formatLedgerWindow(start?: number | null, end?: number | null): string {
    if (typeof start === "number" && typeof end === "number") {
        return `target window =${start}-${end}`;
    }
    if (typeof end === "number") {
        return `The target window ends at${end}Chapter`;
    }
    if (typeof start === "number") {
        return `The target window starts at${start}Chapter`;
    }
    return "";
}
export function buildLedgerItemLine(item: GenerationContextPackage["ledgerPendingItems"][number], label: string): string {
    return takeUnique([
        `${label}: ${item.title}`,
        item.summary,
        formatLedgerWindow(item.targetStartChapterOrder, item.targetEndChapterOrder),
        item.statusReason ?? "",
    ], 4).join(" | ");
}
export function buildParticipantText(writeContext: ChapterWriteContext): string {
    if (writeContext.participants.length === 0) {
        return "Appearance role: none";
    }
    const guideByCharacterId = new Map(writeContext.characterBehaviorGuides.map((guide) => [guide.characterId, guide]));
    return [
        "Appearing roles:",
        ...writeContext.participants.map((character) => {
            const guide = guideByCharacterId.get(character.id);
            const visibleProfile = takeUnique([
                character.appearance || character.physique
                    ? `Appearance:${compactText([character.appearance, character.physique].filter(Boolean).join("；"))}`
                    : "",
                character.attireStyle ? `Commonly worn:${compactText(character.attireStyle)}` : "",
                character.signatureDetail ? `Logo details:${compactText(character.signatureDetail)}` : "",
                character.voiceTexture ? `Sound:${compactText(character.voiceTexture)}` : "",
                character.presenceImpression ? `Debut impression:${compactText(character.presenceImpression)}` : "",
            ], 3).join(" | ");
            const parts = takeUnique([
                character.role,
                visibleProfile,
                guide?.volumeRoleLabel ? `Positioning within the volume:${guide.volumeRoleLabel}` : "",
                guide?.volumeResponsibility ? `Responsibilities within the volume:${guide.volumeResponsibility}` : "",
                character.personality,
                character.currentState ? `Status:${character.currentState}` : "",
                character.currentGoal ? `Goal:${character.currentGoal}` : "",
                guide?.relationStageLabels.length ? `Relationship stages:${guide.relationStageLabels.join(" / ")}` : "",
                guide?.mindGuidance ? `Subjective tendency:${guide.mindGuidance}` : "",
                guide?.authorInfluenceGuidance ? `Soft behavioral tendencies confirmed after character dialogue (not objective facts):${guide.authorInfluenceGuidance}` : "",
                guide?.absenceRisk && guide.absenceRisk !== "none"
                    ? `Risk of absence:${guide.absenceRisk}(span ${guide.absenceSpan}）`
                    : "",
            ], 4);
            return `- ${character.name}：${parts.join(" | ")}`;
        }),
    ].join("\n");
}
export function buildCharacterGuidanceText(writeContext: ChapterWriteContext): string {
    if (writeContext.characterBehaviorGuides.length === 0) {
        return "Character behavior guidance: none";
    }
    return [
        "Role behavior guidance:",
        ...writeContext.characterBehaviorGuides.map((guide) => {
            const parts = takeUnique([
                guide.isCoreInVolume ? "The core characters of this volume" : "Supporting role in this volume",
                guide.mindGuidance ? `Subjective tendencies (not objective facts):${guide.mindGuidance}` : "",
                guide.authorInfluenceGuidance ? `Soft behavioral tendencies confirmed after character dialogue (not objective facts):${guide.authorInfluenceGuidance}` : "",
                guide.visibleProfileSummary ? `Visible performance:${guide.visibleProfileSummary}` : "",
                guide.volumeRoleLabel ? `Positioning within the volume:${guide.volumeRoleLabel}` : "",
                guide.volumeResponsibility ? `Responsibilities:${guide.volumeResponsibility}` : "",
                guide.currentGoal ? `Goal:${guide.currentGoal}` : "",
                guide.currentState ? `Status:${guide.currentState}` : "",
                guide.relationStageLabels.length ? `Relationship stages:${guide.relationStageLabels.join(" / ")}` : "",
                guide.absenceRisk !== "none" ? `Risk of absence:${guide.absenceRisk}(span ${guide.absenceSpan}）` : "",
                guide.factionLabel ? `Faction:${guide.factionLabel}` : "",
                guide.stanceLabel ? `Position:${guide.stanceLabel}` : "",
                guide.shouldPreferAppearance ? "This chapter gives priority to appearance details" : "",
            ], 6);
            return `- ${guide.name}：${parts.join(" | ")}`;
        }),
    ].join("\n");
}
export function buildRelationStageText(writeContext: ChapterWriteContext): string {
    if (writeContext.activeRelationStages.length === 0) {
        return "Active relationship stage: None";
    }
    return [
        "Active relationship stage:",
        ...writeContext.activeRelationStages.map((relation) => (`- ${relation.sourceCharacterName} -> ${relation.targetCharacterName}：${relation.stageLabel} | ${relation.stageSummary}${relation.nextTurnPoint ? ` | The next turning point:${relation.nextTurnPoint}` : ""}`)),
    ].join("\n");
}
export function buildPendingCandidateGuardText(writeContext: ChapterWriteContext): string {
    if (writeContext.pendingCandidateGuards.length === 0) {
        return "Candidate Guardrails: None";
    }
    return [
        "Candidate role guardrails (read only, do not write directly into the text):",
        ...writeContext.pendingCandidateGuards.map((candidate) => {
            const parts = takeUnique([
                candidate.proposedRole ? `Positioning:${candidate.proposedRole}` : "",
                candidate.summary ?? "",
                candidate.sourceChapterOrder != null ? `Source Chapter: Chapter ${candidate.sourceChapterOrder} Chapter` : "",
                ...candidate.evidence.slice(0, 2),
            ], 4);
            return `- ${candidate.proposedName}：${parts.join(" | ")}`;
        }),
    ].join("\n");
}

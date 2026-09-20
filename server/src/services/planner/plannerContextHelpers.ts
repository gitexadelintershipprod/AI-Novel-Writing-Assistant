import type { StoryMacroPlan } from "@ai-novel/shared/types/storyMacro";
import type { ResolvedStyleContext } from "@ai-novel/shared/types/styleEngine";
import type { PayoffLedgerResponse } from "@ai-novel/shared/types/payoffLedger";
import { isPayoffOverdueAtChapter } from "../payoff/payoffLedgerShared";
import { buildPlannerStyleContractSummaryText } from "../styleEngine/styleContractText";
import { buildStoryModePromptBlock, normalizeStoryModeOutput } from "../storyMode/storyModeProfile";
import { characterDynamicsQueryService } from "../novel/dynamics/CharacterDynamicsQueryService";

export type PlannerStoryModeRow = {
  id: string;
  name: string;
  description: string | null;
  template: string | null;
  parentId: string | null;
  profileJson: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type PlannerMappedVolume = {
  sortOrder: number;
  title: string;
  summary: string | null;
  mainPromise: string | null;
  climax: string | null;
  openPayoffs: string[];
  updatedAt: string;
  chapters: Array<{
    chapterOrder: number;
    title: string;
    summary: string | null;
    conflictLevel?: number | null;
    conflictLevelSource?: "ai" | "user" | null;
  }>;
};

type PlannerCharacterDynamicsOverview = Awaited<ReturnType<typeof characterDynamicsQueryService.getOverview>>;

function compactText(value: string | null | undefined, fallback = ""): string {
  const trimmed = value?.trim();
  return trimmed || fallback;
}

function takeNonEmptyLines(text: string | null | undefined, maxLines: number): string[] {
  if (!text?.trim()) {
    return [];
  }
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, maxLines);
}

export function buildPlannerStoryModeBlock(input: {
  primaryStoryMode?: PlannerStoryModeRow | null;
  secondaryStoryMode?: PlannerStoryModeRow | null;
}): string {
  return buildStoryModePromptBlock({
    primary: input.primaryStoryMode ? normalizeStoryModeOutput(input.primaryStoryMode) : null,
    secondary: input.secondaryStoryMode ? normalizeStoryModeOutput(input.secondaryStoryMode) : null,
  });
}

export function buildStoryMacroSummary(plan: StoryMacroPlan | null): string {
  if (!plan) {
    return "None";
  }
  const lines = [
    plan.expansion?.expanded_premise ? `Expanded premise: ${plan.expansion.expanded_premise}` : "",
    plan.expansion?.protagonist_core ? `Protagonist core: ${plan.expansion.protagonist_core}` : "",
    plan.decomposition?.selling_point ? `Selling-point breakdown: ${plan.decomposition.selling_point}` : "",
    plan.decomposition?.core_conflict ? `Core conflict: ${plan.decomposition.core_conflict}` : "",
    plan.decomposition?.main_hook ? `Main hook: ${plan.decomposition.main_hook}` : "",
    plan.decomposition?.progression_loop ? `Progression loop: ${plan.decomposition.progression_loop}` : "",
    plan.decomposition?.growth_path ? `Growth path: ${plan.decomposition.growth_path}` : "",
    plan.decomposition?.major_payoffs?.length
      ? `Key payoffs: ${plan.decomposition.major_payoffs.join("; ")}`
      : "",
    plan.decomposition?.ending_flavor ? `Ending flavor: ${plan.decomposition.ending_flavor}` : "",
    plan.constraints.length > 0 ? `Hard constraints: ${plan.constraints.join("; ")}` : "",
    plan.constraintEngine?.phase_model?.length
      ? `stage model: ${plan.constraintEngine.phase_model.map((item) => `${item.name}:${item.goal}`).join(" | ")}`
      : "",
  ].filter(Boolean);
  return lines.join("\n") || "None";
}

export function buildCurrentVolumeWindowSummary(
  volumes: PlannerMappedVolume[],
  chapterOrder: number,
): string {
  if (volumes.length === 0) {
    return "No volume window is set up yet. Confirm the volume workspace first.";
  }
  const currentIndex = volumes.findIndex((volume) => (
    volume.chapters.some((chapter) => chapter.chapterOrder === chapterOrder)
  ));
  if (currentIndex < 0) {
    return [
      `Current chapter:Chapter ${chapterOrder}`,
      "This is not bound to any volume structure yet. Sync chapters and the volume window first.",
      `Existing volume windows: ${volumes.map((volume) => `Volume ${volume.sortOrder} "${volume.title}"`).join("; ")}`,
    ].join("\n");
  }

  const currentVolume = volumes[currentIndex];
  const previousVolume = currentIndex > 0 ? volumes[currentIndex - 1] : null;
  const nextVolume = currentIndex < volumes.length - 1 ? volumes[currentIndex + 1] : null;
  const chapterOrders = currentVolume.chapters.map((chapter) => chapter.chapterOrder).sort((a, b) => a - b);
  const chapterIndex = currentVolume.chapters
    .slice()
    .sort((left, right) => left.chapterOrder - right.chapterOrder)
    .findIndex((chapter) => chapter.chapterOrder === chapterOrder);

  return [
    `Current chapter: Chapter ${chapterOrder} (position ${chapterIndex + 1}/${currentVolume.chapters.length} in this volume)`,
    `Current volume: Volume ${currentVolume.sortOrder} "${currentVolume.title}"`,
    `Volume mission: ${currentVolume.mainPromise ?? currentVolume.summary ?? "none"}`,
    currentVolume.climax ? `Climax at the end of the volume: ${currentVolume.climax}` : "",
    chapterOrders.length > 0 ? `Volume chapter range: ${chapterOrders[0]}-${chapterOrders[chapterOrders.length - 1]}` : "",
    currentVolume.openPayoffs.length > 0 ? `Items still owed in this volume: ${currentVolume.openPayoffs.join("; ")}` : "",
    previousVolume
      ? `Carry-in from previous volume: Volume ${previousVolume.sortOrder} "${previousVolume.title}" | ${previousVolume.mainPromise ?? previousVolume.summary ?? "none"}`
      : "Carry-in from previous volume: none",
    nextVolume
      ? `Expected next volume: Volume ${nextVolume.sortOrder} "${nextVolume.title}" | ${nextVolume.mainPromise ?? nextVolume.summary ?? "none"}`
      : "Expected next volume: none",
  ].filter(Boolean).join("\n");
}

function describeConflictStep(
  previous: number | null | undefined,
  current: number | null | undefined,
): string {
  if (typeof previous !== "number" || typeof current !== "number") {
    return "unknown";
  }
  if (current > previous) {
    return "rising";
  }
  if (current < previous) {
    return "falling";
  }
  return "flat";
}

export function buildPlannerConflictLevelAnchorContext(
  volumes: PlannerMappedVolume[],
  affectedChapterOrders: number[] = [],
): string {
  const affectedOrderSet = new Set(affectedChapterOrders);
  const lines: string[] = [];
  for (const volume of volumes) {
    const chapters = volume.chapters
      .slice()
      .sort((left, right) => left.chapterOrder - right.chapterOrder);
    for (const [index, chapter] of chapters.entries()) {
      if (chapter.conflictLevelSource !== "user" || typeof chapter.conflictLevel !== "number") {
        continue;
      }
      if (affectedOrderSet.size > 0 && !affectedOrderSet.has(chapter.chapterOrder)) {
        continue;
      }
      const previous = index > 0 ? chapters[index - 1] : null;
      const next = index < chapters.length - 1 ? chapters[index + 1] : null;
      lines.push([
        `Chapter ${chapter.chapterOrder}"${chapter.title}"`,
        `conflictLevel=${chapter.conflictLevel}`,
        "user-anchored, do not change",
        `vs previous chapter=${describeConflictStep(previous?.conflictLevel, chapter.conflictLevel)}`,
        `vs next chapter=${describeConflictStep(chapter.conflictLevel, next?.conflictLevel)}`,
      ].join(" | "));
    }
  }
  return lines.join("\n") || "None";
}

export function buildPlannerCharacterDynamicsContext(overview: PlannerCharacterDynamicsOverview | null): {
  summary: string;
  volumeAssignments: string;
  relationStages: string;
  candidateGuards: string;
} {
  if (!overview) {
    return {
      summary: "None",
      volumeAssignments: "None",
      relationStages: "None",
      candidateGuards: "None",
    };
  }

  const highRiskCharacters = overview.characters
    .filter((item) => item.absenceRisk === "high" || item.absenceRisk === "warn")
    .slice(0, 4)
    .map((item) => `${item.name}(${item.absenceRisk}, absence span=${item.absenceSpan})`);
  const coreCharacters = overview.characters
    .filter((item) => item.isCoreInVolume)
    .slice(0, 6)
    .map((item) => (
      [
        item.name,
        item.volumeRoleLabel ? `Volume role=${item.volumeRoleLabel}` : "",
        item.volumeResponsibility ? `volume duty=${item.volumeResponsibility}` : "",
        item.plannedChapterOrders.length > 0 ? `planned chapters=${item.plannedChapterOrders.join(", ")}` : "",
        item.absenceRisk !== "none" ? `absence risk=${item.absenceRisk} (span=${item.absenceSpan})` : "",
      ].filter(Boolean).join(" | ")
    ));
  const relationStages = overview.relations
    .slice(0, 8)
    .map((item) => (
      `${item.sourceCharacterName} -> ${item.targetCharacterName}: ${item.stageLabel} | ${item.stageSummary}${item.nextTurnPoint ? ` | next=${item.nextTurnPoint}` : ""}`
    ));
  const candidateGuards = overview.candidates
    .slice(0, 4)
    .map((item) => (
      `${item.proposedName}${item.proposedRole ? `(${item.proposedRole})` : ""} | ${item.summary ?? "pending candidate"} | Source chapter=${item.sourceChapterOrder ?? "unknown"} | read-only; do not write into the formal execution chain before confirm`
    ));

  return {
    summary: [
      overview.summary,
      overview.currentVolume ? `Current volume:${overview.currentVolume.title}` : "Current volume: not located",
      coreCharacters.length > 0 ? `Current-volume core roles: ${coreCharacters.map((item) => item.split(" | ")[0]).join(", ")}` : "Current-volume core roles: none",
      highRiskCharacters.length > 0 ? `High-risk absences: ${highRiskCharacters.join("; ")}` : "High-risk absences: none",
      overview.pendingCandidateCount > 0 ? `Pending candidates: ${overview.pendingCandidateCount}` : "Pending candidates: none",
    ].join("\n"),
    volumeAssignments: coreCharacters.join("\n") || "None",
    relationStages: relationStages.join("\n") || "None",
    candidateGuards: candidateGuards.join("\n") || "None",
  };
}

export function buildPlannerStyleEngineSummary(styleContext: ResolvedStyleContext | null | undefined): string {
  const matchedBindings = styleContext?.matchedBindings ?? [];
  const compiled = styleContext?.compiledBlocks;

  if (matchedBindings.length === 0 && !compiled) {
    return "None";
  }

  const bindingLine = matchedBindings.length > 0
    ? `Current hit writing: ${matchedBindings
      .map((binding) => compactText(binding.styleProfile?.name, binding.styleProfileId))
      .join(" / ")}`
    : "";

  const summaryText = buildPlannerStyleContractSummaryText(compiled?.contract);
  const sections = takeNonEmptyLines(summaryText, 10);

  return [
    bindingLine,
    sections.length > 0 ? `Planning-period writing constraints:\n${sections.join("\n")}` : "",
  ].filter(Boolean).join("\n\n") || "None";
}

export function buildPlannerPayoffLedgerContext(ledger: PayoffLedgerResponse, chapterOrder: number): string {
  if (!ledger.items.length) {
    return "None";
  }

  const pendingItems = ledger.items
    .filter((item) => item.currentStatus === "setup" || item.currentStatus === "hinted" || item.currentStatus === "pending_payoff")
    .slice(0, 6)
    .map((item) => `${item.title} | ${item.summary}`);
  const overdueItems = ledger.items
    .filter((item) => isPayoffOverdueAtChapter(item, chapterOrder))
    .slice(0, 4)
    .map((item) => `${item.title} | ${item.statusReason ?? item.summary}`);
  const touchNowItems = ledger.items
    .filter((item) => item.currentStatus !== "paid_off" && item.currentStatus !== "failed")
    .filter((item) => (
      (typeof item.targetStartChapterOrder === "number" && item.targetStartChapterOrder <= chapterOrder)
      || (typeof item.targetEndChapterOrder === "number" && item.targetEndChapterOrder <= chapterOrder + 1)
      || isPayoffOverdueAtChapter(item, chapterOrder)
    ))
    .slice(0, 5)
    .map((item) => `${item.title} | window=${item.targetStartChapterOrder ?? "?"}-${item.targetEndChapterOrder ?? "?"}`);
  const recentlyPaidOff = ledger.items
    .filter((item) => item.currentStatus === "paid_off")
    .sort((left, right) => (right.lastTouchedChapterOrder ?? 0) - (left.lastTouchedChapterOrder ?? 0))
    .slice(0, 4)
    .map((item) => `${item.title} | paid off near Chapter ${item.lastTouchedChapterOrder ?? "?"}`);

  return [
    `Ledger summary: pending=${ledger.summary.pendingCount}, urgent=${ledger.summary.urgentCount}, overdue=${ledger.summary.overdueCount}, paid off=${ledger.summary.paidOffCount}`,
    `Currently unpaid: ${pendingItems.join("; ") || "none"}`,
    `Currently overdue: ${overdueItems.join("; ") || "none"}`,
    `Should touch this chapter: ${touchNowItems.join("; ") || "none"}`,
    `Recently paid off: ${recentlyPaidOff.join("; ") || "none"}`,
  ].join("\n");
}

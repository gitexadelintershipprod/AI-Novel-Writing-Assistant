import type {
  ChapterEditorAiRevisionIntent,
  ChapterEditorContextWindow,
  ChapterEditorMacroContext,
  ChapterEditorOperation,
  ChapterEditorTargetRange,
  PacePreference,
  StoryPlan,
  StoryStateSnapshot,
  VolumePlan,
} from "@ai-novel/shared/types/novel";
import { countGeorgianWords } from "@ai-novel/shared/utils/georgianTextMetrics";

type WorldLike = {
  name?: string | null;
  worldType?: string | null;
  description?: string | null;
  overviewSummary?: string | null;
  conflicts?: string | null;
  magicSystem?: string | null;
  axioms?: string | null;
} | null | undefined;

type BookContractLike = {
  readingPromise?: string | null;
  protagonistFantasy?: string | null;
  coreSellingPoint?: string | null;
  escalationLadder?: string | null;
  absoluteRedLines?: string[] | null;
} | null | undefined;

export interface ChapterEditorParagraph {
  index: number;
  text: string;
  from: number;
  to: number;
}

export interface ChapterEditorVolumeLocation {
  volume: VolumePlan | null;
  chapterIndex: number;
  chapterCount: number;
  volumePositionLabel: string;
  volumePhaseLabel: string;
}

export function normalizeEditorText(text: string | null | undefined): string {
  return (text ?? "").replace(/\r\n/g, "\n");
}

function normalizeParagraphText(text: string): string {
  return normalizeEditorText(text)
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

export function normalizeChapterContent(text: string | null | undefined): string {
  const paragraphs = normalizeEditorText(text)
    .split(/\n{2,}/)
    .map((paragraph) => normalizeParagraphText(paragraph))
    .filter(Boolean);
  return paragraphs.join("\n\n");
}

export function countEditorWords(text: string | null | undefined): number {
  return countGeorgianWords(normalizeEditorText(text));
}

export function splitParagraphsWithRanges(text: string | null | undefined): ChapterEditorParagraph[] {
  const normalized = normalizeChapterContent(text);
  if (!normalized) {
    return [];
  }

  const paragraphs = normalized.split(/\n{2,}/);
  let cursor = 0;
  return paragraphs.map((paragraph, index) => {
    const from = cursor;
    const to = from + paragraph.length;
    cursor = to + 2;
    return {
      index: index + 1,
      text: paragraph,
      from,
      to,
    };
  });
}

export function buildParagraphWindow(
  content: string,
  range: ChapterEditorTargetRange,
): ChapterEditorContextWindow {
  const paragraphs = splitParagraphsWithRanges(content);
  if (paragraphs.length === 0) {
    return { beforeParagraphs: [], afterParagraphs: [] };
  }

  const startIndex = paragraphs.findIndex((paragraph) => range.from >= paragraph.from && range.from <= paragraph.to);
  const endIndex = paragraphs.findIndex((paragraph) => range.to >= paragraph.from && range.to <= paragraph.to);
  const resolvedStart = startIndex >= 0 ? startIndex : 0;
  const resolvedEnd = endIndex >= 0 ? endIndex : resolvedStart;

  return {
    beforeParagraphs: paragraphs.slice(Math.max(0, resolvedStart - 3), resolvedStart).map((paragraph) => paragraph.text),
    afterParagraphs: paragraphs.slice(resolvedEnd + 1, resolvedEnd + 3).map((paragraph) => paragraph.text),
  };
}

export function createTargetRangeForWholeChapter(content: string): ChapterEditorTargetRange {
  return {
    from: 0,
    to: content.length,
    text: content,
  };
}

export function buildAnchorRangeFromParagraphBounds(
  paragraphs: ChapterEditorParagraph[],
  paragraphStart?: number | null,
  paragraphEnd?: number | null,
): Pick<ChapterEditorTargetRange, "from" | "to"> | null {
  if (!paragraphStart || !paragraphEnd || paragraphs.length === 0) {
    return null;
  }
  const start = paragraphs.find((paragraph) => paragraph.index === paragraphStart);
  const end = paragraphs.find((paragraph) => paragraph.index === paragraphEnd);
  if (!start || !end) {
    return null;
  }
  return {
    from: Math.max(0, Math.min(start.from, end.from)),
    to: Math.max(start.to, end.to),
  };
}

export function parseLooseTextList(value: string | null | undefined): string[] {
  const source = value?.trim();
  if (!source) {
    return [];
  }
  try {
    const parsed = JSON.parse(source) as unknown;
    if (Array.isArray(parsed)) {
      return parsed.filter((item): item is string => typeof item === "string" && item.trim().length > 0).map((item) => item.trim());
    }
  } catch {
    // Fall back to plain-text split below.
  }
  return source
    .split(/[\n,，;；]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export function buildStyleSummary(novel: {
  styleTone?: string | null;
  narrativePov?: string | null;
  pacePreference?: string | null;
  emotionIntensity?: string | null;
}): string {
  return [
    novel.styleTone?.trim(),
    novel.narrativePov ? `Point of view: ${novel.narrativePov}` : null,
    novel.pacePreference ? `Pacing: ${novel.pacePreference}` : null,
    novel.emotionIntensity ? `emotional intensity: ${novel.emotionIntensity}` : null,
  ].filter((item): item is string => Boolean(item && item.trim())).join(" · ");
}

export function buildWorldConstraintSummary(world: WorldLike): string {
  if (!world) {
    return "No extra world constraints.";
  }
  const lines = [
    world.name?.trim() ? `${world.name}${world.worldType?.trim() ? ` (${world.worldType.trim()})` : ""}` : null,
    world.overviewSummary?.trim() || world.description?.trim() || null,
    world.conflicts?.trim() ? `Main conflict: ${world.conflicts.trim()}` : null,
    world.magicSystem?.trim() ? `Power / rules: ${world.magicSystem.trim()}` : null,
  ].filter((item): item is string => Boolean(item));
  const axioms = parseLooseTextList(world.axioms).slice(0, 3);
  if (axioms.length > 0) {
    lines.push(`Hard rules:${axioms.join("; ")}`);
  }
  return lines.join("\n") || "No extra world constraints.";
}

export function buildCharacterStateSummary(snapshot?: StoryStateSnapshot | null): string {
  if (!snapshot || snapshot.characterStates.length === 0) {
    return "No character state was extracted.";
  }
  return snapshot.characterStates
    .slice(0, 5)
    .map((state) => {
      const parts = [
        state.summary?.trim(),
        state.currentGoal?.trim(),
        state.emotion?.trim(),
      ].filter(Boolean);
      return parts.length > 0 ? `- ${parts.join(" / ")}` : null;
    })
    .filter((item): item is string => Boolean(item))
    .join("\n") || "No character state was extracted.";
}

export function buildMustKeepConstraints(
  bookContract?: BookContractLike,
  chapterPlan?: StoryPlan | null,
): string[] {
  const mustPreserve = parseLooseTextList(chapterPlan?.mustPreserveJson);
  const redLines = (bookContract?.absoluteRedLines ?? []).filter((item): item is string => typeof item === "string" && item.trim().length > 0);
  return Array.from(new Set([
    ...mustPreserve,
    ...redLines,
    "Keep the current story facts consistent",
    "Keep the current point of view and person",
  ])).slice(0, 6);
}

export function findVolumeLocation(volumes: VolumePlan[], chapterOrder: number): ChapterEditorVolumeLocation {
  const volume = volumes.find((candidate) => candidate.chapters.some((chapter) => chapter.chapterOrder === chapterOrder)) ?? null;
  if (!volume) {
    return {
      volume: null,
      chapterIndex: -1,
      chapterCount: 0,
      volumePositionLabel: "Volume position not identified",
      volumePhaseLabel: "Standalone line-edit",
    };
  }

  const sortedChapters = volume.chapters.slice().sort((left, right) => left.chapterOrder - right.chapterOrder);
  const chapterIndex = sortedChapters.findIndex((chapter) => chapter.chapterOrder === chapterOrder);
  const chapterCount = sortedChapters.length;
  const ordinal = chapterIndex + 1;

  return {
    volume,
    chapterIndex,
    chapterCount,
    volumePositionLabel: `Volume position ${ordinal} / ${chapterCount}`,
    volumePhaseLabel: resolveVolumePhaseLabel(chapterIndex, chapterCount),
  };
}

function resolveVolumePhaseLabel(chapterIndex: number, chapterCount: number): string {
  if (chapterCount <= 0 || chapterIndex < 0) {
    return "Standalone line-edit";
  }
  if (chapterCount === 1 || chapterIndex === 0) {
    return "open book";
  }

  const ratio = chapterCount === 1 ? 1 : chapterIndex / (chapterCount - 1);
  if (ratio < 0.28) {
    return "Early advance";
  }
  if (ratio < 0.6) {
    return "Mid-volume pressure";
  }
  if (ratio < 0.82) {
    return "Pre-climax";
  }
  if (chapterIndex >= chapterCount - 1) {
    return "Close and transition";
  }
  return "Climax payoff";
}

export function buildPaceDirective(
  volumePhaseLabel: string,
  preference?: PacePreference | null,
): string {
  const paceLabel = preference === "slow"
    ? "Overall pacing is slower"
    : preference === "fast"
      ? "Overall pacing is faster"
      : "Overall pacing stays balanced";
  const phaseDirective = ({
    "open book": "Establish the situation, conflict, and reading hook quickly. Do not spend too much space on static explanation too early.",
    "Early advance": "Keep advancing the problem and the goal. Do not re-explain information that is already established.",
    "Mid-volume pressure": "Raise pressure and cost so characters stay pushed by the situation.",
    "Pre-climax": "Concentrate on gathering clues and raising expectation, preparing for the burst.",
    "Climax payoff": "Stronger conflict, emotion, and payoff are allowed, but do not leave the main task.",
    "Close and transition": "Pay off consequences, complete the transition, and carry readers steadily into the next chapter or volume.",
    开卷: "Establish the situation, conflict, and reading hook quickly. Do not spend too much space on static explanation too early.",
    前段推进: "Keep advancing the problem and the goal. Do not re-explain information that is already established.",
    中段承压: "Raise pressure and cost so characters stay pushed by the situation.",
    高潮前: "Concentrate on gathering clues and raising expectation, preparing for the burst.",
    高潮兑现: "Stronger conflict, emotion, and payoff are allowed, but do not leave the main task.",
    收束过渡: "Pay off consequences, complete the transition, and carry readers steadily into the next chapter or volume.",
  } as Record<string, string>)[volumePhaseLabel] ?? "Keep this chapter's task and volume continuity first.";
  return `${paceLabel}; ${phaseDirective}`;
}

export function buildMacroContextSummary(context: ChapterEditorMacroContext): string {
  return [
    `Role of this chapter in the volume: ${context.chapterRoleInVolume}`,
    `Volume title: ${context.volumeTitle}`,
    `Volume position: ${context.volumePositionLabel}`,
    `Stage: ${context.volumePhaseLabel}`,
    `Pacing guidance: ${context.paceDirective}`,
    `Task in this chapter: ${context.chapterMission}`,
    `Continuing from the previous chapter: ${context.previousChapterBridge}`,
    `Going to the next chapter: ${context.nextChapterBridge}`,
    `Mainline / planted setups: ${context.activePlotThreads.join("; ") || "none"}`,
    `Character status: ${context.characterStateSummary}`,
    `World constraints: ${context.worldConstraintSummary}`,
    `Must keep: ${context.mustKeepConstraints.join("; ") || "Keep existing facts and person"}`,
  ].join("\n");
}

export function buildPresetIntent(
  operation: ChapterEditorOperation,
  mustKeepConstraints: string[],
  customInstruction?: string,
): ChapterEditorAiRevisionIntent {
  const preserved = Array.from(new Set([
    ...mustKeepConstraints,
    "Keep the current plot facts",
    "Keep the core information of the original passage",
  ])).slice(0, 6);
  const shared = {
    mustPreserve: preserved,
    mustAvoid: ["Do not rewrite into templated AI voice", "Do not break context continuity"],
    strength: "medium" as const,
  };

  switch (operation) {
    case "expand":
      return {
        editGoal: "Add details so the information is more perceptible",
        toneShift: "Keep the original tone",
        paceAdjustment: "Slow slightly in exchange for clearer images and action",
        conflictAdjustment: "Keep the current conflict intensity",
        emotionAdjustment: "Keep the current emotional tone",
        reasoningSummary: "This rewrite focuses on details and texture, without changing the original passage's task.",
        ...shared,
      };
    case "compress":
      return {
        editGoal: "Cut redundancy so the advance is tighter",
        toneShift: "Keep the original tone",
        paceAdjustment: "Speed up clearly and reduce repetition and static description",
        conflictAdjustment: "Keep the current conflict direction",
        emotionAdjustment: "Keep existing emotional signals without extra heightening",
        reasoningSummary: "This rewrite focuses on removing what slows the advance so readers reach the next beat faster.",
        ...shared,
      };
    case "emotion":
      return {
        editGoal: "Strengthen mood delivery",
        toneShift: "Add emotional tension without leaving the original style",
        paceAdjustment: "Keep pacing steady; do not stretch the action chain",
        conflictAdjustment: "Emotional tension can be more obvious",
        emotionAdjustment: "Significantly strengthen character emotion and feeling",
        reasoningSummary: "This rewrite focuses on letting readers feel the character's emotion, not just watch events.",
        ...shared,
      };
    case "conflict":
      return {
        editGoal: "Intensify conflict and pressure",
        toneShift: "Keep the original tone, but with more confrontation",
        paceAdjustment: "Speed up moderately so conflict surfaces sooner",
        conflictAdjustment: "Significantly strengthen conflict and discomfort",
        emotionAdjustment: "Keep emotion aligned with the conflict",
        reasoningSummary: "This rewrite focuses on pushing conflict forward so readers feel the tension earlier.",
        ...shared,
      };
    case "custom":
      return {
        editGoal: customInstruction?.trim() || "Revise to the user's request",
        toneShift: "Adjust to the user's request",
        paceAdjustment: "Adjust to the user's request",
        conflictAdjustment: "Adjust to the user's request",
        emotionAdjustment: "Adjust to the user's request",
        reasoningSummary: "This rewrite follows the user's extra correction request while keeping chapter facts and continuity.",
        ...shared,
      };
    case "polish":
    default:
      return {
        editGoal: "Polish the wording so the text is more natural and smooth",
        toneShift: "Keep the original tone",
        paceAdjustment: "Keep pacing as stable as possible",
        conflictAdjustment: "Keep the current conflict direction",
        emotionAdjustment: "Keep the original emotion, but make the expression more accurate",
        reasoningSummary: "This rewrite focuses on smoother, more stable sentences without changing the original passage's plot job.",
        ...shared,
      };
  }
}

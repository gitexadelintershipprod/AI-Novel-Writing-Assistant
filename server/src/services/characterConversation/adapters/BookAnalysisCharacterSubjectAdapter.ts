import type {
  BookAnalysisCharacter,
  BookAnalysisCharacterArc,
  BookAnalysisCharacterAppearanceSnapshot,
  BookAnalysisCharacterEvidenceItem,
  BookAnalysisCharacterProfileSection,
  BookAnalysisCharacterScene,
} from "@ai-novel/shared/types/bookAnalysisCharacter";
import type {
  CharacterConversationEvidence,
  CharacterSubjectProjection,
} from "@ai-novel/shared/types/characterConversation";
import type { CharacterSubjectAdapter } from "./types";

export interface BookAnalysisCharacterSubjectAdapterInput {
  analysisId: string;
  characterId: string;
  chapterAnchor: number;
  character: BookAnalysisCharacter;
}

const PROMPT_ITEM_LIMIT = 300;
const MAX_EVIDENCE = 12;

function compact(value: string | null | undefined, limit = PROMPT_ITEM_LIMIT): string {
  const text = value?.trim() ?? "";
  return text.length > limit ? `${text.slice(0, limit)}…` : text;
}

function evidenceAtOrBefore(
  evidence: BookAnalysisCharacterEvidenceItem[],
  chapterAnchor: number,
): BookAnalysisCharacterEvidenceItem[] {
  // An evidence item without a chapter cannot prove it belongs before the
  // anchor, so it is intentionally excluded rather than guessed into scope.
  return evidence.filter((item) =>
    typeof item.chapterIndex === "number" && item.chapterIndex > 0 && item.chapterIndex + 1 <= chapterAnchor,
  );
}

function isFullyAnchored(
  evidence: BookAnalysisCharacterEvidenceItem[],
  chapterAnchor: number,
): boolean {
  return evidence.length > 0 && evidenceAtOrBefore(evidence, chapterAnchor).length === evidence.length;
}

function toConversationEvidence(
  evidence: BookAnalysisCharacterEvidenceItem[],
  sourceType: string,
  sourceRefPrefix: string,
): CharacterConversationEvidence[] {
  return evidence.map((item, index) => ({
    label: compact(item.label, 160) || "Source evidence",
    detail: compact(item.quote || item.excerpt, 360) || compact(item.sourceLabel, 360) || "Source-evidence excerpt.",
    sourceType,
    sourceRef: `${sourceRefPrefix}:${item.chunkId || item.noteSegmentId || index}`,
    chapterOrder: typeof item.chapterIndex === "number" ? item.chapterIndex + 1 : null,
  }));
}

function appearanceSnapshotsAtOrBefore(
  character: BookAnalysisCharacter,
  chapterAnchor: number,
): BookAnalysisCharacterAppearanceSnapshot[] {
  return (character.appearance?.snapshots ?? []).filter((snapshot) => (
    snapshot.chapterIndex >= 0
    && snapshot.chapterIndex + 1 <= chapterAnchor
    && snapshot.evidence.length > 0
  ));
}

function toAppearanceSnapshotEvidence(
  snapshots: BookAnalysisCharacterAppearanceSnapshot[],
  sourceRefPrefix: string,
): CharacterConversationEvidence[] {
  return snapshots.flatMap((snapshot) => snapshot.evidence.map((item, index) => ({
    label: compact(item.label, 160) || "Chapter-appearance evidence",
    detail: compact(item.quote || item.excerpt, 360) || compact(item.sourceLabel, 360) || "Chapter-appearance evidence excerpt.",
    sourceType: "book_analysis_appearance_snapshot",
    sourceRef: `${sourceRefPrefix}:${snapshot.id}:${index}`,
    chapterOrder: snapshot.chapterIndex + 1,
  })));
}

function formatProfileSection(section: BookAnalysisCharacterProfileSection): string {
  return `${compact(section.title, 80) || section.dimension}: ${compact(section.content)}`;
}

function formatArc(arc: BookAnalysisCharacterArc): string {
  const state = arc.stateSnapshot ? `; state: ${compact(JSON.stringify(arc.stateSnapshot), 220)}` : "";
  const chapterLabel = typeof arc.chapterIndex === "number" ? `Chapter ${arc.chapterIndex + 1}` : "Confirmed stage";
  return `${chapterLabel}: ${compact(arc.stageLabel)}${state}`;
}

function formatScene(scene: BookAnalysisCharacterScene): string {
  const performance = scene.performance ? `; performance: ${compact(JSON.stringify(scene.performance), 220)}` : "";
  return `${compact(scene.sceneLabel)}${scene.sceneType ? ` (${compact(scene.sceneType, 60)})` : ""}${performance}`;
}

function assertInput(input: BookAnalysisCharacterSubjectAdapterInput): void {
  if (!input.analysisId.trim() || !input.characterId.trim()) {
    throw new Error("Book-analysis character chat requires analysisId and characterId.");
  }
  if (!Number.isInteger(input.chapterAnchor) || input.chapterAnchor <= 0) {
    throw new Error("Book-analysis character chat requires a valid chapter anchor.");
  }
  if (input.character.id !== input.characterId || input.character.analysisId !== input.analysisId) {
    throw new Error("The book-analysis character does not match the specified analysis range.");
  }
}

function collectAnchoredContent(input: BookAnalysisCharacterSubjectAdapterInput) {
  assertInput(input);
  const { character, chapterAnchor } = input;
  const characterEvidence = evidenceAtOrBefore(character.evidence, chapterAnchor);
  const sections = character.profileSections.filter((section) => isFullyAnchored(section.evidence, chapterAnchor));
  const arcs = character.arcs.filter((arc) =>
    typeof arc.chapterIndex === "number"
    && arc.chapterIndex > 0
    && arc.chapterIndex <= chapterAnchor
    && isFullyAnchored(arc.evidence, chapterAnchor),
  );
  const scenes = character.scenes.filter((scene) => isFullyAnchored(scene.evidence, chapterAnchor));
  const appearanceSnapshots = appearanceSnapshotsAtOrBefore(character, chapterAnchor);
  const evidence = [
    ...toConversationEvidence(characterEvidence, "book_analysis_character", `${character.analysisId}:${character.id}:character`),
    ...sections.flatMap((section) => toConversationEvidence(
      section.evidence,
      "book_analysis_profile",
      `${character.analysisId}:${character.id}:profile:${section.dimension}`,
    )),
    ...arcs.flatMap((arc) => toConversationEvidence(
      arc.evidence,
      "book_analysis_arc",
      `${character.analysisId}:${character.id}:arc:${arc.id}`,
    )),
    ...scenes.flatMap((scene) => toConversationEvidence(
      scene.evidence,
      "book_analysis_scene",
      `${character.analysisId}:${character.id}:scene:${scene.id}`,
    )),
    ...toAppearanceSnapshotEvidence(
      appearanceSnapshots,
      `${character.analysisId}:${character.id}:appearance`,
    ),
  ].slice(0, MAX_EVIDENCE);

  return { characterEvidence, sections, arcs, scenes, appearanceSnapshots, evidence };
}

/**
 * Projects a character inferred from a source text. Only material that can be
 * proven to be within the selected chapter anchor is passed onward.
 */
export const bookAnalysisCharacterSubjectAdapter: CharacterSubjectAdapter<BookAnalysisCharacterSubjectAdapterInput> = {
  project(input): CharacterSubjectProjection {
    const { character, analysisId, chapterAnchor } = input;
    const { characterEvidence, sections, arcs, scenes, appearanceSnapshots, evidence } = collectAnchoredContent(input);
    const hasEvidence = evidence.length > 0;
    const identityLines = [
      `Source-text role: ${character.role}`,
      ...sections.slice(0, 3).map(formatProfileSection),
    ];
    const situationLines = [
      arcs.length > 0 ? `Confirmed stage: ${formatArc(arcs[arcs.length - 1])}` : null,
      scenes.length > 0 ? `Confirmed scene performance: ${formatScene(scenes[scenes.length - 1])}` : null,
      appearanceSnapshots.length > 0 ? `Confirmed look node: Chapter ${appearanceSnapshots[appearanceSnapshots.length - 1]!.chapterIndex + 1}.` : null,
      !hasEvidence ? "There is not enough source evidence up to this chapter anchor to confirm the character's situation, motive, or unrevealed information." : null,
    ].filter((line): line is string => Boolean(line));

    return {
      subject: {
        kind: "book_analysis_character",
        id: character.id,
        scopeKind: "book_analysis",
        scopeId: analysisId,
      },
      name: character.name,
      role: character.role,
      sourceLabel: "Open book character files",
      sourceDescription: `Respond only from source-text evidence in this book-analysis project up through chapter ${chapterAnchor}. Do not rewrite the source or treat speculation as fact.`,
      interactionPolicy: "evidence_interview",
      identity: identityLines.join("\n"),
      currentSituation: situationLines.join("\n") || "Source evidence is insufficient, so the current situation cannot be confirmed.",
      hardBoundaries: [
        `Use only source-text evidence through Chapter ${chapterAnchor} that has a traceable chapter number.`,
        "Do not use plot, character changes, or reader-known information after this anchor.",
        "When evidence is insufficient, say clearly that it cannot be confirmed from the source. Do not invent secrets, motives, or later plot.",
        "This conversation is only for understanding the source character. It will not change the source text, book-analysis conclusions, or any novel prose.",
      ],
      subjectiveState: characterEvidence.length > 0 || appearanceSnapshots.length > 0
        ? "The following judgments only reflect what the source evidence supports. They are not a confirmation of the character's inner truth."
        : null,
      evidence,
      chapterAnchor,
      chapterAnchorLabel: `Source-evidence range through chapter ${chapterAnchor}`,
    };
  },

  buildPromptContext(input): string {
    const { character, chapterAnchor } = input;
    const { sections, arcs, scenes, appearanceSnapshots, evidence } = collectAnchoredContent(input);
    const evidenceLines = evidence.slice(0, 8).map((item) =>
      `- Chapter ${item.chapterOrder}｜${item.label}: ${item.detail}`,
    );
    const lines = [
      "Character source: Open book character files (evidence-bounded interview)",
      `Character: ${compact(character.name)} (${compact(character.role)})`,
      `Evidence anchor: through Chapter ${chapterAnchor}.`,
      sections.length > 0 ? `Available profile: ${sections.slice(0, 4).map(formatProfileSection).join("; ")}` : null,
      arcs.length > 0 ? `Available stages: ${arcs.slice(-3).map(formatArc).join("; ")}` : null,
      scenes.length > 0 ? `Available scene performance: ${scenes.slice(-3).map(formatScene).join("; ")}` : null,
      appearanceSnapshots.length > 0 ? `Available look nodes: ${appearanceSnapshots.slice(-3).map((snapshot) => `Chapter ${snapshot.chapterIndex + 1}`).join(", ")}` : null,
      evidenceLines.length > 0 ? `Source evidence:\n${evidenceLines.join("\n")}` : "Source evidence is insufficient: do not confirm the character's inner life, secrets, motives, or later development.",
      "Boundary: answer only from the evidence above. Do not cite content after the anchor, and do not present reasonable guesses as source facts.",
    ];
    return lines.filter((line): line is string => Boolean(line)).join("\n");
  },
};

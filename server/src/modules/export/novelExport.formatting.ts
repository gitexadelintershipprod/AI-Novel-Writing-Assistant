import { NOVEL_EXPORT_SCOPE_LABELS, type NovelExportScope } from "@ai-novel/shared/types/novelExport";
import type {
  NovelExportBasicSection,
  NovelExportBundle,
  NovelExportCharacterSection,
  NovelExportChapterSection,
  NovelExportOutlineSection,
  NovelExportPipelineSection,
  NovelExportSectionMap,
  NovelExportSectionScope,
  NovelExportStoryMacroSection,
  NovelExportStructuredSection,
} from "./novelExport.types";

const FULL_SECTION_ORDER: NovelExportSectionScope[] = [
  "basic",
  "story_macro",
  "character",
  "outline",
  "structured",
  "chapter",
  "pipeline",
];

function normalizeText(input: string | null | undefined): string {
  return (input ?? "").replace(/\r\n?/g, "\n").trim();
}

function hasMeaningfulText(input: string | null | undefined): boolean {
  return normalizeText(input).length > 0;
}

export interface NovelTxtRecord {
  title: string;
  description: string | null;
  narrativeForm?: "short_story" | "long_novel";
  shortStoryContent?: string | null;
  chapters: Array<{
    order: number;
    title: string;
    content: string | null;
  }>;
}

export interface NovelExportResult {
  fileName: string;
  contentType: string;
  content: string;
}

export function safeFileNamePart(input: string): string {
  const cleaned = input
    .replace(/[\\/:*?"<>|]/g, "_")
    .replace(/\s+/g, " ")
    .trim();
  return cleaned || "novel";
}

function padTimeUnit(value: number): string {
  return String(Math.max(0, Math.floor(value))).padStart(2, "0");
}

export function buildExportTimestamp(input: Date = new Date()): string {
  return [
    input.getFullYear(),
    padTimeUnit(input.getMonth() + 1),
    padTimeUnit(input.getDate()),
  ].join("")
    + "-"
    + [
      padTimeUnit(input.getHours()),
      padTimeUnit(input.getMinutes()),
      padTimeUnit(input.getSeconds()),
    ].join("");
}

export function buildTxtContent(novel: NovelTxtRecord): string {
  const lines: string[] = [];
  lines.push(novel.title);
  lines.push("");

  const description = normalizeText(novel.description);
  if (description) {
    lines.push("[Synopsis]");
    lines.push(description);
    lines.push("");
  }

  if (novel.narrativeForm === "short_story") {
    lines.push(normalizeText(novel.shortStoryContent) || "(No story body yet)");
    return lines.join("\n");
  }

  if (novel.chapters.length === 0) {
    lines.push("(No chapter content yet)");
    return lines.join("\n");
  }

  for (const chapter of novel.chapters) {
    lines.push("=".repeat(48));
    lines.push(`Chapter ${chapter.order} ${chapter.title}`);
    lines.push("-".repeat(48));
    lines.push(normalizeText(chapter.content) || "(This chapter has no content yet)");
    lines.push("");
  }

  return lines.join("\n");
}

function addBullet(lines: string[], label: string, value: string | number | null | undefined): void {
  if (value === null || value === undefined) {
    return;
  }
  const text = typeof value === "number" ? String(value) : normalizeText(value);
  if (!text) {
    return;
  }
  lines.push(`- ${label}: ${text}`);
}

function addParagraph(lines: string[], title: string, value: string | null | undefined, level = 3): void {
  const text = normalizeText(value);
  if (!text) {
    return;
  }
  lines.push(`${"#".repeat(level)} ${title}`);
  lines.push("");
  lines.push(text);
  lines.push("");
}

function addJsonBlock(lines: string[], title: string, value: unknown): void {
  lines.push(`### ${title}`);
  lines.push("");
  lines.push("```json");
  lines.push(JSON.stringify(value, null, 2));
  lines.push("```");
  lines.push("");
}

function buildBasicSummary(section: NovelExportBasicSection): string[] {
  const lines: string[] = [];
  addBullet(lines, "Title", section.novel.title);
  addBullet(lines, "Writing mode", section.novel.writingMode);
  addBullet(lines, "project mode", section.novel.projectMode ?? null);
  addBullet(lines, "Genre", section.novel.genre?.name ?? null);
  addBullet(lines, "Primary story mode", section.novel.primaryStoryMode?.name ?? null);
  addBullet(lines, "Secondary story mode", section.novel.secondaryStoryMode?.name ?? null);
  addBullet(lines, "Bound world", section.novel.world?.name ?? null);
  addBullet(lines, "Estimated number of chapters", section.novel.estimatedChapterCount ?? null);
  if ((section.novel.commercialTags ?? []).length > 0) {
    addBullet(lines, "business label", section.novel.commercialTags.join(" / "));
  }
  addParagraph(lines, "One sentence introduction", section.novel.description);
  addParagraph(lines, "target audience", section.novel.targetAudience);
  addParagraph(lines, "core selling point", section.novel.bookSellingPoint);
  addParagraph(lines, "Competitive feel", section.novel.competingFeel);
  addParagraph(lines, "First 30 Chapters Promise", section.novel.first30ChapterPromise);
  addParagraph(lines, "World-slice core frame", section.worldSlice?.slice?.coreWorldFrame ?? null);
  return lines;
}

function buildStoryMacroSummary(section: NovelExportStoryMacroSection): string[] {
  const lines: string[] = [];
  addParagraph(lines, "Story input", section.storyMacroPlan?.storyInput);
  addParagraph(lines, "Expanded premise", section.storyMacroPlan?.expansion?.expanded_premise ?? null);
  addParagraph(lines, "Protagonist Core", section.storyMacroPlan?.expansion?.protagonist_core ?? null);
  addParagraph(lines, "conflict engine", section.storyMacroPlan?.expansion?.conflict_engine ?? null);
  addParagraph(lines, "core conflict", section.storyMacroPlan?.decomposition?.core_conflict ?? null);
  addParagraph(lines, "main hook", section.storyMacroPlan?.decomposition?.main_hook ?? null);
  addParagraph(lines, "advance cycle", section.storyMacroPlan?.decomposition?.progression_loop ?? null);
  addParagraph(lines, "Book-level reading promise", section.bookContract?.readingPromise ?? null);
  addParagraph(lines, "Core selling point", section.bookContract?.coreSellingPoint ?? null);
  addParagraph(lines, "Escalation ladder", section.bookContract?.escalationLadder ?? null);
  if ((section.bookContract?.absoluteRedLines ?? []).length > 0) {
    lines.push("### Absolute red lines");
    lines.push("");
    for (const item of section.bookContract?.absoluteRedLines ?? []) {
      lines.push(`- ${item}`);
    }
    lines.push("");
  }
  return lines;
}

function buildCharacterSummary(section: NovelExportCharacterSection): string[] {
  const lines: string[] = [];
  addBullet(lines, "Character count", section.characters.length);
  addBullet(lines, "relationship number", section.relations.length);
  addBullet(lines, "Cast-option count", section.castOptions.length);
  if (section.characters.length > 0) {
    lines.push("### Current characters");
    lines.push("");
    for (const character of section.characters) {
      const parts = [character.name, character.role, character.castRole].filter((item): item is string => Boolean(item?.trim()));
      lines.push(`- ${parts.join(" / ")}`);
    }
    lines.push("");
  }
  return lines;
}

function buildOutlineSummary(section: NovelExportOutlineSection): string[] {
  const lines: string[] = [];
  addBullet(lines, "Volume source", section.workspace?.source ?? null);
  addBullet(lines, "Volume count", section.workspace?.volumes.length ?? 0);
  addBullet(lines, "Recommended volume count", section.workspace?.strategyPlan?.recommendedVolumeCount ?? null);
  addParagraph(lines, "Volume export outline", section.workspace?.derivedOutline ?? null);
  addParagraph(lines, "Reader-reward ladder", section.workspace?.strategyPlan?.readerRewardLadder ?? null);
  addParagraph(lines, "Escalation ladder", section.workspace?.strategyPlan?.escalationLadder ?? null);
  addParagraph(lines, "Strategy notes", section.workspace?.strategyPlan?.notes ?? null);
  addParagraph(lines, "Critique summary", section.workspace?.critiqueReport?.summary ?? null);
  return lines;
}

function buildStructuredSummary(section: NovelExportStructuredSection): string[] {
  const lines: string[] = [];
  const beatCount = (section.workspace?.beatSheets ?? []).reduce((sum, item) => sum + item.beats.length, 0);
  const chapterCount = (section.workspace?.volumes ?? []).reduce((sum, item) => sum + item.chapters.length, 0);
  addBullet(lines, "Beat-card count", beatCount);
  addBullet(lines, "Chapter-plan count", chapterCount);
  addBullet(lines, "Rebalance-decision count", section.workspace?.rebalanceDecisions.length ?? 0);
  addParagraph(lines, "Structured outline", section.workspace?.derivedStructuredOutline ?? null);
  return lines;
}

function buildChapterSummary(section: NovelExportChapterSection): string[] {
  const lines: string[] = [];
  const generatedCount = section.chapters.filter((chapter) => hasMeaningfulText(chapter.content)).length;
  addBullet(lines, "Total chapters", section.chapters.length);
  addBullet(lines, "Chapter text already exists", generatedCount);
  addBullet(lines, "Chapter-plan count", section.chapterPlans.length);
  if (section.chapters.length > 0) {
    lines.push("### Chapter list");
    lines.push("");
    for (const chapter of section.chapters) {
      lines.push(`- Chapter ${chapter.order}: ${chapter.title}`);
    }
    lines.push("");
  }
  return lines;
}

function buildPipelineSummary(section: NovelExportPipelineSection): string[] {
  const lines: string[] = [];
  addBullet(lines, "Overall quality score", section.qualityReport.summary.overall);
  addBullet(lines, "Quality-report count", section.qualityReport.totalReports ?? section.qualityReport.chapterReports.length);
  addBullet(lines, "Audit-report count", section.chapterAuditReports.length);
  addBullet(lines, "Plot-beat count", section.plotBeats.length);
  addBullet(lines, "Payoff-ledger items", section.payoffLedger?.items.length ?? 0);
  addBullet(lines, "Latest pipeline status", section.latestPipelineJob?.status ?? null);
  addParagraph(lines, "Novel-bible source", section.bible?.rawContent ?? null);
  return lines;
}

function buildSectionSummary(scope: NovelExportSectionScope, section: NovelExportSectionMap[NovelExportSectionScope]): string[] {
  switch (scope) {
    case "basic":
      return buildBasicSummary(section as NovelExportBasicSection);
    case "story_macro":
      return buildStoryMacroSummary(section as NovelExportStoryMacroSection);
    case "character":
      return buildCharacterSummary(section as NovelExportCharacterSection);
    case "outline":
      return buildOutlineSummary(section as NovelExportOutlineSection);
    case "structured":
      return buildStructuredSummary(section as NovelExportStructuredSection);
    case "chapter":
      return buildChapterSummary(section as NovelExportChapterSection);
    case "pipeline":
      return buildPipelineSummary(section as NovelExportPipelineSection);
    default:
      return [];
  }
}

export function buildScopedNovelExportPayload(
  bundle: NovelExportBundle,
  scope: NovelExportScope,
): {
  metadata: NovelExportBundle["metadata"] & {
    scope: NovelExportScope;
    scopeLabel: string;
  };
  data: NovelExportSectionMap | NovelExportSectionMap[NovelExportSectionScope];
} {
  return {
    metadata: {
      ...bundle.metadata,
      scope,
      scopeLabel: NOVEL_EXPORT_SCOPE_LABELS[scope],
    },
    data: scope === "full" ? bundle.sections : bundle.sections[scope],
  };
}

export function buildMarkdownExportContent(bundle: NovelExportBundle, scope: NovelExportScope): string {
  const lines: string[] = [];
  const scopeLabel = NOVEL_EXPORT_SCOPE_LABELS[scope];
  const sectionScopes = scope === "full" ? FULL_SECTION_ORDER : [scope];

  lines.push(`# ${bundle.metadata.novelTitle} export`);
  lines.push("");
  lines.push(`- Export scope: ${scopeLabel}`);
  lines.push(`- Exported at: ${bundle.metadata.exportedAt}`);
  lines.push(`- Novel ID:${bundle.metadata.novelId}`);
  lines.push("");

  for (const sectionScope of sectionScopes) {
    const section = bundle.sections[sectionScope];
    lines.push(`## ${NOVEL_EXPORT_SCOPE_LABELS[sectionScope]}`);
    lines.push("");
    const summaryLines = buildSectionSummary(sectionScope, section);
    if (summaryLines.length > 0) {
      lines.push(...summaryLines);
    } else {
      lines.push("(No structured content to summarize yet)");
      lines.push("");
    }
    addJsonBlock(lines, "Full data", section);
  }

  return lines.join("\n");
}

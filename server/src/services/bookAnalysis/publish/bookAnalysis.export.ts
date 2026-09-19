import {
  BOOK_ANALYSIS_STRUCTURED_FIELD_SPECS,
  BOOK_ANALYSIS_STRUCTURED_FIELD_LABELS,
  type BookAnalysisDetail,
  type BookAnalysisSection,
  type BookAnalysisTimelineNode,
} from "@ai-novel/shared/types/bookAnalysis";
import {
  groupBookAnalysisTimelineNodesByPhase,
  normalizeBookAnalysisTimelineNode,
  normalizeBookAnalysisTimelineNodes,
} from "@ai-novel/shared/utils/bookAnalysisTimeline";
import { getEffectiveContent } from "../shared/bookAnalysis.utils";

function sectionContentToMarkdown(section: BookAnalysisSection): string {
  const content = getEffectiveContent(section);
  if (!content) {
    return "_No content yet_";
  }
  return content;
}

function formatTimelineNode(node: BookAnalysisTimelineNode): string {
  const meta = [
    node.timeHint ? `Time: ${node.timeHint}` : "",
    node.phase ? `Phase: ${node.phase}` : "",
    node.sourceRefs?.length ? `Sources: ${node.sourceRefs.join(", ")}` : "",
  ].filter(Boolean).join("; ");
  return meta ? `${node.label} (${meta})` : node.label;
}

function normalizeStructuredValue(value: unknown): string[] {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed ? [trimmed] : [];
  }
  if (Array.isArray(value)) {
    return value
      .map((item) => {
        if (typeof item === "string") {
          return item.trim();
        }
        const timelineNode = normalizeBookAnalysisTimelineNode(item);
        return timelineNode ? formatTimelineNode(timelineNode) : "";
      })
      .filter(Boolean)
      .slice(0, 8);
  }
  return [];
}

function buildTimelineSummaryRows(label: string, nodes: BookAnalysisTimelineNode[]): string[] {
  if (nodes.length === 0) {
    return [];
  }
  const groups = groupBookAnalysisTimelineNodesByPhase(nodes).map((group) => ({
    phase: group.phase,
    items: group.nodes.map((node) => {
      const meta = [
        node.timeHint ? `Time: ${node.timeHint}` : "",
        node.sourceRefs?.length ? `Sources: ${node.sourceRefs.join(", ")}` : "",
      ].filter(Boolean).join("; ");
      return meta ? `${node.label} (${meta})` : node.label;
    }),
  }));
  const lines = [`- ${label}:`];
  for (const { phase, items } of groups) {
    lines.push(`  - ${phase}: ${items.join("; ")}`);
  }
  return lines;
}

function buildStructuredSummaryMarkdown(section: BookAnalysisSection): string[] {
  const structuredData = section.structuredData;
  if (!structuredData || typeof structuredData !== "object") {
    return [];
  }

  const fieldSpecs = new Map((BOOK_ANALYSIS_STRUCTURED_FIELD_SPECS[section.sectionKey] ?? [])
    .map((field) => [field.key, field.type]));
  const rows = Object.entries(structuredData)
    .flatMap(([key, value]) => {
      const label = BOOK_ANALYSIS_STRUCTURED_FIELD_LABELS[key] ?? key;
      if (fieldSpecs.get(key) === "timelineNodeArray") {
        return buildTimelineSummaryRows(label, normalizeBookAnalysisTimelineNodes(value, 12));
      }
      const values = normalizeStructuredValue(value);
      return values.length > 0 ? [`- ${label}: ${values.join("; ")}`] : [];
    })
    .slice(0, 18);

  if (rows.length === 0) {
    return [];
  }

  return [
    "### Key conclusions",
    "",
    ...rows,
    "",
  ];
}

export function buildPublishDocumentTitle(input: { novelTitle: string; versionNumber: number }): string {
  const title = input.novelTitle.trim() || "Untitled novel";
  return `${title} book analysis v${input.versionNumber}`;
}

export function buildPublishFileName(
  detail: Pick<BookAnalysisDetail, "id" | "documentTitle" | "documentVersionNumber">,
): string {
  const slug = `${detail.documentTitle}-v${detail.documentVersionNumber}`.replace(/[\\/:*?"<>|]/g, "-");
  return `${slug}-book-analysis-${detail.id}.md`;
}

export function buildPublishMarkdown(
  detail: Pick<
    BookAnalysisDetail,
    | "id"
    | "title"
    | "status"
    | "documentTitle"
    | "documentFileName"
    | "documentVersionNumber"
    | "currentDocumentVersionNumber"
    | "sourceRange"
    | "sections"
  >,
  publishedAtISO: string,
): { content: string; hasPublishableContent: boolean } {
  const markdownParts: string[] = [
    `# ${detail.title} (published edition)`,
    "",
    "## Publish metadata",
    "",
    `- Source analysis ID: ${detail.id}`,
    `- Source document: ${detail.documentTitle}`,
    `- Source file name: ${detail.documentFileName}`,
    `- Source version: v${detail.documentVersionNumber}`,
    `- Source range: ${detail.sourceRange?.label ?? "Full text"}`,
    `- Currently active version: v${detail.currentDocumentVersionNumber}`,
    `- Analysis status: ${detail.status}`,
    `- Published at: ${publishedAtISO}`,
    "",
  ];

  let hasPublishableContent = false;

  for (const section of detail.sections) {
    const content = getEffectiveContent(section).trim();
    const notes = section.notes?.trim() ?? "";
    const evidence = section.evidence.filter((item) => item.label.trim() || item.excerpt.trim());
    const structuredSummary = buildStructuredSummaryMarkdown(section);
    if (!content && !notes && evidence.length === 0 && structuredSummary.length === 0) {
      continue;
    }
    hasPublishableContent = true;
    markdownParts.push(`## ${section.title}`);
    markdownParts.push("");
    markdownParts.push(...structuredSummary);
    markdownParts.push(content || "_No content yet_");
    markdownParts.push("");

    if (notes) {
      markdownParts.push("### Manual notes");
      markdownParts.push("");
      markdownParts.push(notes);
      markdownParts.push("");
    }

    if (evidence.length > 0) {
      markdownParts.push("### Evidence excerpts");
      markdownParts.push("");
      for (const item of evidence) {
        markdownParts.push(`- [${item.sourceLabel}] ${item.label}: ${item.excerpt}`);
      }
      markdownParts.push("");
    }
  }

  return {
    content: markdownParts.join("\n"),
    hasPublishableContent,
  };
}

export function buildAnalysisExportContent(
  detail: BookAnalysisDetail,
  format: "markdown" | "json",
): { fileName: string; contentType: string; content: string } {
  const slugBase = `${detail.documentTitle}-v${detail.documentVersionNumber}`.replace(/[\\/:*?"<>|]/g, "-");
  if (format === "json") {
    return {
      fileName: `${slugBase}-book-analysis.json`,
      contentType: "application/json; charset=utf-8",
      content: JSON.stringify(detail, null, 2),
    };
  }

  const markdownParts: string[] = [
    `# ${detail.title}`,
    "",
    `- Document: ${detail.documentTitle}`,
    `- Original file: ${detail.documentFileName}`,
    `- Source version: v${detail.documentVersionNumber}`,
    `- Source range: ${detail.sourceRange?.label ?? "Full text"}`,
    `- Currently active version: v${detail.currentDocumentVersionNumber}`,
    `- Status: ${detail.status}`,
    detail.summary ? `- Summary: ${detail.summary}` : "",
    "",
  ];

  for (const section of detail.sections) {
    markdownParts.push(`## ${section.title}`);
    markdownParts.push("");
    markdownParts.push(...buildStructuredSummaryMarkdown(section));
    markdownParts.push(sectionContentToMarkdown(section));
    if (section.notes?.trim()) {
      markdownParts.push("");
      markdownParts.push("### Manual notes");
      markdownParts.push("");
      markdownParts.push(section.notes.trim());
    }
    if (section.evidence.length > 0) {
      markdownParts.push("");
      markdownParts.push("### Evidence excerpts");
      markdownParts.push("");
      for (const evidence of section.evidence) {
        markdownParts.push(`- [${evidence.sourceLabel}] ${evidence.label}: ${evidence.excerpt}`);
      }
    }
    markdownParts.push("");
  }

  return {
    fileName: `${slugBase}-book-analysis.md`,
    contentType: "text/markdown; charset=utf-8",
    content: markdownParts.join("\n"),
  };
}

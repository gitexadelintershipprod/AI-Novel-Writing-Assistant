import type {
  BookAnalysisDetail,
  BookAnalysisSection,
  BookAnalysisStatus,
} from "@ai-novel/shared/types/bookAnalysis";
import { isBookAnalysisBudgetExceeded } from "./bookAnalysis.utils.ts";

export type BookAnalysisWorkspaceTone = "neutral" | "info" | "success" | "warning" | "danger";

export type BookAnalysisPrimaryAction =
  | "create"
  | "select"
  | "view_results"
  | "resume_budget"
  | "rebuild"
  | "copy";

export interface BookAnalysisSectionSummary {
  total: number;
  expected: number;
  frozen: number;
  unselected: number;
  frozenReadable: number;
  readable: number;
  readableExpected: number;
  missingExpected: number;
  failedExpected: number;
  succeeded: number;
  running: number;
  failed: number;
}

export interface BookAnalysisNextAction {
  tone: BookAnalysisWorkspaceTone;
  title: string;
  description: string;
  action: BookAnalysisPrimaryAction | null;
  actionLabel?: string;
}

function hasStructuredContent(value: Record<string, unknown> | null | undefined): boolean {
  return Boolean(value && Object.keys(value).length > 0);
}

export function isReadableBookAnalysisSection(section: BookAnalysisSection): boolean {
  return Boolean(
    section.editedContent?.trim()
      || section.aiContent?.trim()
      || hasStructuredContent(section.structuredData),
  );
}

export function isUnselectedBookAnalysisSection(section: BookAnalysisSection): boolean {
  return section.frozen && !isReadableBookAnalysisSection(section);
}

export function summarizeBookAnalysisSections(
  analysis: Pick<BookAnalysisDetail, "sections"> | null | undefined,
): BookAnalysisSectionSummary {
  const summary: BookAnalysisSectionSummary = {
    total: 0,
    expected: 0,
    frozen: 0,
    unselected: 0,
    frozenReadable: 0,
    readable: 0,
    readableExpected: 0,
    missingExpected: 0,
    failedExpected: 0,
    succeeded: 0,
    running: 0,
    failed: 0,
  };
  for (const section of analysis?.sections ?? []) {
    summary.total += 1;
    if (section.frozen) {
      summary.frozen += 1;
    } else {
      summary.expected += 1;
    }
    const readable = isReadableBookAnalysisSection(section);
    if (section.frozen) {
      if (readable) {
        summary.frozenReadable += 1;
      } else {
        summary.unselected += 1;
      }
    }
    if (readable) {
      summary.readable += 1;
    }
    if (!section.frozen && readable) {
      summary.readableExpected += 1;
    }
    if (!section.frozen && !readable) {
      summary.missingExpected += 1;
    }
    if (section.status === "succeeded") {
      summary.succeeded += 1;
    } else if (section.status === "running") {
      summary.running += 1;
    } else if (section.status === "failed") {
      summary.failed += 1;
      if (!section.frozen) {
        summary.failedExpected += 1;
      }
    }
  }
  return summary;
}

export function getPreferredBookAnalysisSection(
  sections: BookAnalysisSection[],
): BookAnalysisSection | null {
  return sections.find(isReadableBookAnalysisSection)
    ?? sections.find((section) => section.status === "succeeded")
    ?? sections[0]
    ?? null;
}

function describeMissingExpectedSections(sections: BookAnalysisSectionSummary): string {
  return sections.missingExpected > 0
    ? `${sections.missingExpected} planned sections still lack readable results. `
    : "No sections are missing from the planned scope. ";
}

export function resolveBookAnalysisNextAction(input: {
  analysis?: BookAnalysisDetail | null;
  analysesCount: number;
  status?: BookAnalysisStatus | null;
}): BookAnalysisNextAction {
  const analysis = input.analysis ?? null;
  if (!analysis) {
    if (input.analysesCount > 0) {
      return {
        tone: "info",
        title: "Select a book analysis",
        description: "After you select a record from the analysis list, this area shows its source, generation stage, and readable results.",
        action: "select",
      };
    }
    return {
      tone: "info",
      title: "Create your first book analysis",
      description: "Pick a knowledge document and an analysis scope; the AI will organize the results into readable, citable sections.",
      action: "create",
      actionLabel: "New book analysis",
    };
  }

  const status = input.status ?? analysis.status;
  const sections = summarizeBookAnalysisSections(analysis);
  if (status === "queued" || status === "running") {
    const hasReadableResults = sections.readable > 0;
    return {
      tone: "info",
      title: status === "queued" ? "Book analysis is queued" : "Book analysis is generating",
      description: hasReadableResults
        ? `Current progress ${Math.round(analysis.progress * 100)}%; ${sections.readable} sections are readable, and the remaining planned sections are still generating.`
        : `Current progress ${Math.round(analysis.progress * 100)}%. Completed sections are kept, and you can read them under "Book analysis content" once everything finishes.`,
      action: hasReadableResults ? "view_results" : null,
      actionLabel: hasReadableResults ? "View existing results" : undefined,
    };
  }

  if ((status === "failed" || status === "cancelled") && isBookAnalysisBudgetExceeded(analysis.lastError)) {
    return {
      tone: "warning",
      title: "Raise the budget to continue generating",
      description: `${sections.readable} readable sections will be kept. ${describeMissingExpectedSections(sections)}Resuming after a budget raise only processes the sections that have not succeeded yet.`,
      action: "resume_budget",
      actionLabel: "Raise budget and resume",
    };
  }

  if (status === "succeeded") {
    if (sections.readable === 0) {
      return {
        tone: "danger",
        title: "Task finished, but there is no book analysis content to show",
        description: "The source document is not affected. Regenerate the analysis, or open Task Center to see this task's detailed record.",
        action: "rebuild",
        actionLabel: "Regenerate analysis",
      };
    }
    if (sections.missingExpected > 0) {
      return {
        tone: "warning",
        title: "Review the existing book analysis results first",
        description: `${sections.readableExpected}/${sections.expected} planned sections are readable; the remaining ${sections.missingExpected} sections can be filled in by regenerating.`,
        action: "view_results",
        actionLabel: "View existing results",
      };
    }
    if (sections.failedExpected > 0) {
      return {
        tone: "warning",
        title: "Results are readable, and some sections need review",
        description: `${sections.readableExpected}/${sections.expected} planned sections have readable content, and ${sections.failedExpected} of them failed on their most recent generation. Check the retained content first, then decide whether to regenerate.`,
        action: "view_results",
        actionLabel: "View existing results",
      };
    }
    return {
      tone: "success",
      title: "Book analysis results are ready to read",
      description: `${sections.readable} sections have been generated. You can review the evidence, organize characters, or publish to the novel's knowledge base.`,
      action: "view_results",
      actionLabel: "View book analysis results",
    };
  }

  if (status === "failed" || status === "cancelled") {
    if (sections.readable > 0) {
      return {
        tone: "warning",
        title: "Analysis stopped, but existing results are still readable",
        description: `${sections.readable} readable sections have been kept. ${describeMissingExpectedSections(sections)}Check the existing results first, then decide whether to regenerate.`,
        action: "view_results",
        actionLabel: "View existing results",
      };
    }
    return {
      tone: "danger",
      title: "This book analysis needs to be regenerated",
      description: analysis.lastError?.trim() || "This analysis produced no readable results, and the source document is not affected.",
      action: "rebuild",
      actionLabel: "Regenerate analysis",
    };
  }

  if (status === "archived") {
    return {
      tone: "neutral",
      title: sections.readable > 0 ? "View archived results" : "Copy the archived analysis to continue",
      description: sections.readable > 0
        ? "Archived analyses stay read-only, and existing results, evidence, and character profiles remain viewable."
        : "This archived analysis has no readable results; copy it as a new analysis and regenerate.",
      action: sections.readable > 0 ? "view_results" : "copy",
      actionLabel: sections.readable > 0 ? "View archived results" : "Copy as new analysis",
    };
  }

  return {
    tone: "info",
    title: "Start generating book analysis results",
    description: "The AI will generate structure, character, world, and writing-formula conclusions for the selected scope, keeping every completed section.",
    action: "rebuild",
    actionLabel: "Start generating",
  };
}

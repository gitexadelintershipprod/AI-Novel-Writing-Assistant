import { prisma } from "../../db/prisma";
import { novelReferenceService } from "../novel/NovelReferenceService";

const MAX_DOCUMENT_REFERENCE_CHARS = 2_400;
const MAX_ANALYSIS_SUMMARY_CHARS = 400;
const MAX_ANALYSIS_SECTION_CHARS = 500;
const MAX_ANALYSIS_SECTION_COUNT = 5;
const MAX_REFERENCE_CONTEXT_CHARS = 12_000;

function dedupeIds(ids: string[] | undefined): string[] {
  return Array.from(new Set((ids ?? []).map((item) => item.trim()).filter(Boolean)));
}

function clipText(source: string, maxChars: number): string {
  const normalized = source.replace(/\r\n?/g, "\n").trim();
  if (normalized.length <= maxChars) {
    return normalized;
  }
  return `${normalized.slice(0, maxChars).trim()}\n...(truncated)`;
}

export async function buildReferenceContext(input: {
  novelId?: string;
  knowledgeDocumentIds?: string[];
  bookAnalysisIds?: string[];
}): Promise<string> {
  const knowledgeDocumentIds = dedupeIds(input.knowledgeDocumentIds);
  const bookAnalysisIds = dedupeIds(input.bookAnalysisIds);

  if (knowledgeDocumentIds.length === 0 && bookAnalysisIds.length === 0) {
    if (input.novelId?.trim()) {
      const ref = await novelReferenceService.buildReferenceForStage(
        input.novelId.trim(),
        "character",
      );
      return ref ? clipText(ref, MAX_REFERENCE_CONTEXT_CHARS) : "";
    }
    return "";
  }

  const [documents, analyses] = await Promise.all([
    knowledgeDocumentIds.length > 0
      ? prisma.knowledgeDocument.findMany({
          where: {
            id: { in: knowledgeDocumentIds },
            status: { not: "archived" },
          },
          include: {
            activeVersion: {
              select: {
                versionNumber: true,
                content: true,
              },
            },
            versions: {
              orderBy: [{ versionNumber: "desc" }],
              take: 1,
              select: {
                versionNumber: true,
                content: true,
              },
            },
          },
        })
      : Promise.resolve([]),
    bookAnalysisIds.length > 0
      ? prisma.bookAnalysis.findMany({
          where: {
            id: { in: bookAnalysisIds },
            status: { not: "archived" },
          },
          include: {
            document: {
              select: {
                title: true,
              },
            },
            documentVersion: {
              select: {
                versionNumber: true,
              },
            },
            sections: {
              orderBy: [{ sortOrder: "asc" }],
              select: {
                title: true,
                aiContent: true,
                editedContent: true,
                notes: true,
              },
            },
          },
        })
      : Promise.resolve([]),
  ]);

  if (knowledgeDocumentIds.length > 0 && documents.length !== knowledgeDocumentIds.length) {
    throw new Error("Reference missing: some knowledge documents do not exist or were archived.");
  }
  if (bookAnalysisIds.length > 0 && analyses.length !== bookAnalysisIds.length) {
    throw new Error("Reference missing: some book-analysis results do not exist or were archived.");
  }

  const documentById = new Map(documents.map((item) => [item.id, item] as const));
  const analysisById = new Map(analyses.map((item) => [item.id, item] as const));

  const orderedDocuments = knowledgeDocumentIds
    .map((id) => documentById.get(id))
    .filter((item): item is NonNullable<typeof item> => Boolean(item));
  const orderedAnalyses = bookAnalysisIds
    .map((id) => analysisById.get(id))
    .filter((item): item is NonNullable<typeof item> => Boolean(item));

  const documentReferences = orderedDocuments.map((document) => {
    const version = document.activeVersion ?? document.versions[0];
    const excerpt = version?.content
      ? clipText(version.content, MAX_DOCUMENT_REFERENCE_CHARS)
      : "(This document has no usable content)";
    return `[Knowledge base] ${document.title} (v${version?.versionNumber ?? 0})\n${excerpt}`;
  });

  const analysisReferences = orderedAnalyses.map((analysis) => {
    const summary = analysis.summary?.trim()
      ? clipText(analysis.summary, MAX_ANALYSIS_SUMMARY_CHARS)
      : "None";
    const sectionLines = analysis.sections
      .map((section) => {
        const content = section.editedContent?.trim()
          || section.aiContent?.trim()
          || section.notes?.trim()
          || "";
        if (!content) {
          return null;
        }
        return `- ${section.title}: ${clipText(content, MAX_ANALYSIS_SECTION_CHARS)}`;
      })
      .filter((line): line is string => Boolean(line))
      .slice(0, MAX_ANALYSIS_SECTION_COUNT);

    return [
      `[Book analysis] ${analysis.title} (document: ${analysis.document.title} v${analysis.documentVersion.versionNumber})`,
      `Summary: ${summary}`,
      sectionLines.length > 0 ? `Section points:\n${sectionLines.join("\n")}` : "Section points: none",
    ].join("\n");
  });

  const sections: string[] = [];
  if (documentReferences.length > 0) {
    sections.push(`### Knowledge-base reference\n${documentReferences.join("\n\n")}`);
  }
  if (analysisReferences.length > 0) {
    sections.push(`### Book-analysis reference\n${analysisReferences.join("\n\n")}`);
  }
  return clipText(sections.join("\n\n"), MAX_REFERENCE_CONTEXT_CHARS);
}

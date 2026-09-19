import type {
  StyleExtractionSourceProcessingMode,
  StyleSourceType,
} from "@ai-novel/shared/types/styleEngine";

export type StyleExtractionTaskSourceType = Extract<StyleSourceType, "from_text" | "from_knowledge_document">;

export const DEFAULT_KNOWLEDGE_SOURCE_PROCESSING_MODE: StyleExtractionSourceProcessingMode = "representative_sample";
export const DEFAULT_REPRESENTATIVE_SAMPLE_LIMIT_CHARS = 60_000;

interface BuildStyleExtractionSourceInputInput {
  sourceText: string;
  sourceType: StyleExtractionTaskSourceType;
  sourceProcessingMode?: StyleExtractionSourceProcessingMode | null;
}

interface StyleExtractionSourceInputSnapshot {
  sourceProcessingMode: StyleExtractionSourceProcessingMode;
  sourceInputText: string | null;
  sourceInputCharLimit: number | null;
  sourceInputCharCount: number;
}

export function normalizeTaskSourceType(value: string | null | undefined): StyleExtractionTaskSourceType {
  return value === "from_knowledge_document" ? "from_knowledge_document" : "from_text";
}

export function resolveTaskProfileSource(task: {
  id: string;
  sourceType?: string | null;
  sourceRefId?: string | null;
}): { sourceType: StyleExtractionTaskSourceType; sourceRefId: string } | null {
  const sourceType = normalizeTaskSourceType(task.sourceType);
  const sourceRefId = task.sourceRefId?.trim() || (sourceType === "from_text" ? task.id : "");
  if (!sourceRefId) {
    return null;
  }
  return {
    sourceType,
    sourceRefId,
  };
}

export function normalizeSourceProcessingMode(
  value: string | null | undefined,
  sourceType: StyleExtractionTaskSourceType,
): StyleExtractionSourceProcessingMode {
  if (value === "full_text" || value === "representative_sample") {
    return value;
  }
  return sourceType === "from_knowledge_document" ? DEFAULT_KNOWLEDGE_SOURCE_PROCESSING_MODE : "full_text";
}

function buildRepresentativeRanges(textLength: number, sliceLength: number): Array<{ label: string; start: number; end: number }> {
  const labels = ["Beginning", "Early", "Setup", "Early-middle", "Middle", "Late-middle", "Late", "Resolution"];
  const lastStart = Math.max(0, textLength - sliceLength);
  return labels.map((label, index) => {
    const start = labels.length === 1
      ? 0
      : Math.round(lastStart * (index / (labels.length - 1)));
    return {
      label,
      start,
      end: Math.min(textLength, start + sliceLength),
    };
  });
}

function buildRepresentativeSample(sourceText: string, limitChars: number): string {
  const normalized = sourceText.trim();
  if (normalized.length <= limitChars) {
    return normalized;
  }

  const intro = [
    "[System sampling note]",
    "The following excerpts are representative samples from the full knowledge-base source text, used to learn narrative rhythm, language texture, dialogue style, and paragraph organization.",
    "The full source text was saved as a snapshot. Do not treat missing plot as a source defect.",
    "",
  ].join("\n");
  const estimatedHeaderChars = intro.length + 900;
  const sliceLength = Math.max(2_400, Math.floor((limitChars - estimatedHeaderChars) / 8));
  const ranges = buildRepresentativeRanges(normalized.length, sliceLength);
  const sections = ranges.map((range) => [
    `[Sample: ${range.label} | positions ${range.start + 1}-${range.end} / ${normalized.length}]`,
    normalized.slice(range.start, range.end).trim(),
  ].join("\n"));

  const sampled = `${intro}${sections.join("\n\n")}`;
  if (sampled.length <= limitChars) {
    return sampled;
  }
  return `${sampled.slice(0, Math.max(0, limitChars - 24)).trimEnd()}\n[Sample truncated]`;
}

export function buildStyleExtractionSourceInput(
  input: BuildStyleExtractionSourceInputInput,
): StyleExtractionSourceInputSnapshot {
  const sourceType = normalizeTaskSourceType(input.sourceType);
  const sourceProcessingMode = normalizeSourceProcessingMode(input.sourceProcessingMode, sourceType);

  if (sourceProcessingMode === "full_text") {
    return {
      sourceProcessingMode,
      sourceInputText: null,
      sourceInputCharLimit: null,
      sourceInputCharCount: input.sourceText.length,
    };
  }

  const sourceInputText = buildRepresentativeSample(input.sourceText, DEFAULT_REPRESENTATIVE_SAMPLE_LIMIT_CHARS);
  return {
    sourceProcessingMode,
    sourceInputText,
    sourceInputCharLimit: DEFAULT_REPRESENTATIVE_SAMPLE_LIMIT_CHARS,
    sourceInputCharCount: sourceInputText.length,
  };
}

export function resolveStyleExtractionInputText(task: {
  sourceText: string;
  sourceInputText?: string | null;
}): string {
  return task.sourceInputText?.trim() || task.sourceText;
}

import { z } from "zod";
import type { BookAnalysisStatus } from "@ai-novel/shared/types/bookAnalysis";
import {
  toolCountSchema,
  toolListLimitSchema,
  toolNullableTextSchema,
  toolOptionalTextSchema,
  toolProgressSchema,
  toolRequiredIdSchema,
  toolSummarySchema,
  toolTimestampSchema,
} from "./toolSchemaPrimitives";

const BOOK_ANALYSIS_STATUS_VALUES = [
  "draft",
  "queued",
  "running",
  "succeeded",
  "failed",
  "cancelled",
  "archived",
] as const satisfies readonly BookAnalysisStatus[];

export const bookAnalysisStatusSchema = z.enum(BOOK_ANALYSIS_STATUS_VALUES);

export const listBookAnalysesInputSchema = z.object({
  documentId: toolOptionalTextSchema,
  status: bookAnalysisStatusSchema.optional(),
  limit: toolListLimitSchema,
});

export const bookAnalysisSummarySchema = z.object({
  id: z.string(),
  title: z.string(),
  documentId: z.string(),
  documentTitle: z.string(),
  status: bookAnalysisStatusSchema,
  progress: toolProgressSchema,
  currentStage: toolNullableTextSchema,
  lastError: toolNullableTextSchema,
  updatedAt: toolTimestampSchema,
});

export const listBookAnalysesOutputSchema = z.object({
  items: z.array(bookAnalysisSummarySchema),
  summary: toolSummarySchema,
});

export const bookAnalysisIdInputSchema = z.object({
  analysisId: toolRequiredIdSchema,
});

export const getBookAnalysisDetailOutputSchema = z.object({
  id: z.string(),
  title: z.string(),
  documentId: z.string(),
  documentTitle: z.string(),
  status: bookAnalysisStatusSchema,
  summary: toolNullableTextSchema,
  progress: toolProgressSchema,
  currentStage: toolNullableTextSchema,
  currentItemLabel: toolNullableTextSchema,
  lastError: toolNullableTextSchema,
  sectionCount: toolCountSchema,
  updatedAt: toolTimestampSchema,
});

export const getBookAnalysisFailureReasonOutputSchema = z.object({
  analysisId: z.string(),
  status: bookAnalysisStatusSchema,
  failureSummary: toolSummarySchema,
  failureDetails: toolNullableTextSchema,
  recoveryHint: toolSummarySchema,
  summary: toolSummarySchema,
});

export const auditChapterContinuityInputSchema = z.object({
  novelId: toolRequiredIdSchema,
  startOrder: z.number().int().min(1).optional().describe("Starting chapter number, default 1"),
  endOrder: z.number().int().min(1).optional().describe("Ending chapter number; defaults to the novel's last chapter"),
});

export const continuityMilestoneBreakSchema = z.object({
  chapterOrder: toolCountSchema,
  milestone: z.string(),
  issue: z.string(),
});

export const continuitySubplotResetSchema = z.object({
  subplot: z.string(),
  resetAtChapterOrder: toolCountSchema,
  previousState: z.string(),
});

export const continuityRepetitionClusterSchema = z.object({
  pattern: z.string(),
  occurrences: z.array(toolCountSchema),
});

export const auditChapterContinuityOutputSchema = z.object({
  novelId: z.string(),
  checkedRange: z.string(),
  chapterCount: toolCountSchema,
  milestoneBreaks: z.array(continuityMilestoneBreakSchema),
  repetitionClusters: z.array(continuityRepetitionClusterSchema),
  openingPatternClusters: z.array(continuityRepetitionClusterSchema),
  hasCriticalIssues: z.boolean(),
  summary: toolSummarySchema,
  recommendation: toolSummarySchema,
});

// analyze_quality_debt_attribution

export const analyzeQualityDebtAttributionInputSchema = z.object({
  novelId: toolRequiredIdSchema,
  startOrder: z.number().int().min(1).optional().describe("Starting chapter number, default 1"),
  endOrder: z.number().int().min(1).optional().describe("Ending chapter number; defaults to all chapters"),
});

export const qualityDebtChapterAttributionSchema = z.object({
  chapterOrder: toolCountSchema,
  chapterId: z.string(),
  title: z.string(),
  firstFailureIssueCodes: z.array(z.string()),
  secondFailureIssueCodes: z.array(z.string()),
  firstFailureClassificationCode: z.string().nullable(),
  patchAnchorFailed: z.boolean(),
  sameObligationRepeated: z.boolean(),
  planMisaligned: z.boolean(),
  lengthVsContentDrift: z.boolean(),
  missingObligationKinds: z.array(z.string()),
  /** Inferred primary root-cause label */
  primaryRootCause: z.enum(["A", "B", "D", "E", "unknown"]),
});

export type QualityDebtChapterAttribution = z.infer<typeof qualityDebtChapterAttributionSchema>;

export const analyzeQualityDebtAttributionOutputSchema = z.object({
  novelId: z.string(),
  checkedRange: z.string(),
  totalDeferredChapters: toolCountSchema,
  /** Chapters with attribution data (no attribution = legacy data generated before the fix) */
  attributedChapters: toolCountSchema,
  /** Root-cause share (0–1; attributed chapters only) */
  rootCauseRatios: z.object({
    A: z.number().describe("Open-loop repair: the same obligation failed repeatedly"),
    B: z.number().describe("Patch-anchor mismatch"),
    D: z.number().describe("Unreachable obligation / plan misalignment"),
    E: z.number().describe("Signature drift: length → content"),
    unknown: z.number().describe("Cannot attribute"),
  }),
  /** Top 5 most common failed issue codes */
  topFailureIssueCodes: z.array(z.object({
    code: z.string(),
    count: toolCountSchema,
  })),
  /** Top 3 most common missing obligation kinds */
  topMissingObligationKinds: z.array(z.object({
    kind: z.string(),
    count: toolCountSchema,
  })),
  /** Attribution details for each deferred chapter */
  chapters: z.array(qualityDebtChapterAttributionSchema),
  /** Decision recommendation */
  recommendation: toolSummarySchema,
});

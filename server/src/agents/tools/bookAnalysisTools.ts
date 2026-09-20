import { prisma } from "../../db/prisma";
import { AgentToolError, type AgentToolName } from "../types";
import type { AgentToolDefinition } from "./toolTypes";
import {
  analyzeQualityDebtAttributionInputSchema,
  analyzeQualityDebtAttributionOutputSchema,
  auditChapterContinuityInputSchema,
  auditChapterContinuityOutputSchema,
  bookAnalysisIdInputSchema,
  getBookAnalysisDetailOutputSchema,
  getBookAnalysisFailureReasonOutputSchema,
  listBookAnalysesInputSchema,
  listBookAnalysesOutputSchema,
  type QualityDebtChapterAttribution,
} from "./bookAnalysisToolSchemas";

export const bookAnalysisToolDefinitions: Partial<
  Record<AgentToolName, AgentToolDefinition<Record<string, unknown>, Record<string, unknown>>>
> = {
  list_book_analyses: {
    name: "list_book_analyses",
    title: "List book-analysis tasks",
    description: "Read the book-analysis task list, statuses, and latest errors.",
    category: "read",
    riskLevel: "low",
    domainAgent: "BookAnalysisAgent",
    resourceScopes: ["book_analysis", "knowledge_document", "task"],
    inputSchema: listBookAnalysesInputSchema,
    outputSchema: listBookAnalysesOutputSchema,
    execute: async (_context, rawInput) => {
      const input = listBookAnalysesInputSchema.parse(rawInput);
      const rows = await prisma.bookAnalysis.findMany({
        where: {
          ...(input.documentId ? { documentId: input.documentId } : {}),
          ...(input.status ? { status: input.status } : {}),
        },
        include: {
          document: {
            select: {
              id: true,
              title: true,
            },
          },
        },
        orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
        take: input.limit ?? 20,
      });
      return listBookAnalysesOutputSchema.parse({
        items: rows.map((row) => ({
          id: row.id,
          title: row.title,
          documentId: row.documentId,
          documentTitle: row.document.title,
          status: row.status,
          progress: row.progress,
          currentStage: row.currentStage ?? null,
          lastError: row.lastError ?? null,
          updatedAt: row.updatedAt.toISOString(),
        })),
        summary: `Read ${rows.length} book-analysis tasks.`,
      });
    },
  },
  get_book_analysis_detail: {
    name: "get_book_analysis_detail",
    title: "Read book-analysis details",
    description: "Read a single book-analysis task's progress, chapter count, and latest status.",
    category: "read",
    riskLevel: "low",
    domainAgent: "BookAnalysisAgent",
    resourceScopes: ["book_analysis", "knowledge_document"],
    inputSchema: bookAnalysisIdInputSchema,
    outputSchema: getBookAnalysisDetailOutputSchema,
    execute: async (_context, rawInput) => {
      const input = bookAnalysisIdInputSchema.parse(rawInput);
      const row = await prisma.bookAnalysis.findUnique({
        where: { id: input.analysisId },
        include: {
          document: {
            select: {
              id: true,
              title: true,
            },
          },
          sections: {
            select: { id: true },
          },
        },
      });
      if (!row) {
        throw new AgentToolError("NOT_FOUND", "Book analysis not found.");
      }
      return getBookAnalysisDetailOutputSchema.parse({
        id: row.id,
        title: row.title,
        documentId: row.documentId,
        documentTitle: row.document.title,
        status: row.status,
        summary: row.summary ?? null,
        progress: row.progress,
        currentStage: row.currentStage ?? null,
        currentItemLabel: row.currentItemLabel ?? null,
        lastError: row.lastError ?? null,
        sectionCount: row.sections.length,
        updatedAt: row.updatedAt.toISOString(),
      });
    },
  },
  get_book_analysis_failure_reason: {
    name: "get_book_analysis_failure_reason",
    title: "Explain why book analysis failed",
    description: "Explain why the book-analysis task failed, blocked, or cannot continue now.",
    category: "inspect",
    riskLevel: "low",
    domainAgent: "BookAnalysisAgent",
    resourceScopes: ["book_analysis", "task"],
    inputSchema: bookAnalysisIdInputSchema,
    outputSchema: getBookAnalysisFailureReasonOutputSchema,
    execute: async (_context, rawInput) => {
      const input = bookAnalysisIdInputSchema.parse(rawInput);
      const row = await prisma.bookAnalysis.findUnique({
        where: { id: input.analysisId },
      });
      if (!row) {
        throw new AgentToolError("NOT_FOUND", "Book analysis not found.");
      }
      const failureSummary = row.status === "failed"
        ? (row.lastError?.trim() || "Book analysis failed without a recorded error.")
        : row.status === "cancelled"
          ? "The book-analysis task was cancelled."
          : row.status === "running"
            ? "The book-analysis task is still running and has not failed."
            : row.status === "queued"
              ? "The book-analysis task is still queued and has not started."
              : "This book-analysis task has no failure record.";
      const recoveryHint = row.status === "failed"
        ? "Check document completeness, model settings, and the latest chapter-generation record before deciding whether to retry."
        : row.status === "running"
          ? "Wait for the current task to finish, or check live progress in the task center."
          : row.status === "queued"
            ? "Check queue pressure and model availability to confirm the task is being scheduled."
            : "No recovery action is needed now.";
      return getBookAnalysisFailureReasonOutputSchema.parse({
        analysisId: row.id,
        status: row.status,
        failureSummary,
        failureDetails: row.lastError ?? null,
        recoveryHint,
        summary: failureSummary,
      });
    },
  },
  audit_chapter_continuity: {
    name: "audit_chapter_continuity",
    title: "Chapter continuity diagnosis",
    description: "Scan generated text in the selected chapter range for repeated scene patterns (time + place + action) and repeated chapter openings, then output a diagnosis. No LLM is needed; detect from chapter content directly.",
    category: "inspect",
    riskLevel: "low",
    domainAgent: "NovelAgent",
    resourceScopes: ["novel", "chapter"],
    parserHints: {
      intent: "inspect_failure_reason",
      aliases: [
        "Chapter continuity diagnosis",
        "audit chapter continuity",
        "chapter repeat detection",
        "plot consistency check",
                                              ],
      phrases: [
        "Check whether chapters are repeating",
        "See which chapter content is repeating",
        "Diagnose the novel's continuity problems",
        "Which scenes were written repeatedly",
        "Are the openings repeating a pattern",
      ],
      requiresNovelContext: true,
      whenToUse: "The user wants to diagnose repeated scenes, repeated openings, or milestone-state issues in generated chapters.",
      whenNotToUse: "The user is querying task status or production progress.",
    },
    inputSchema: auditChapterContinuityInputSchema,
    outputSchema: auditChapterContinuityOutputSchema,
    execute: async (context, rawInput) => {
      const input = auditChapterContinuityInputSchema.parse(rawInput);
      const novelId = input.novelId?.trim() || context.novelId;
      if (!novelId) {
        throw new AgentToolError("INVALID_INPUT", "Without the current novel context, continuity diagnosis cannot run.");
      }

      const chapters = await prisma.chapter.findMany({
        where: {
          novelId,
          order: {
            gte: input.startOrder ?? 1,
            ...(input.endOrder != null ? { lte: input.endOrder } : {}),
          },
          NOT: { content: null },
        },
        orderBy: { order: "asc" },
        select: { id: true, order: true, title: true, content: true },
      });

      if (chapters.length === 0) {
        return auditChapterContinuityOutputSchema.parse({
          novelId,
          checkedRange: `ch${input.startOrder ?? 1}-end`,
          chapterCount: 0,
          milestoneBreaks: [],
          repetitionClusters: [],
          openingPatternClusters: [],
          hasCriticalIssues: false,
          summary: "The selected range has no generated chapter text, so diagnosis cannot run.",
          recommendation: "Generate the chapter draft before running diagnosis.",
        });
      }

      const OPENING_LENGTH = 120;
      const SCENE_PATTERN_KEYWORDS = [
        ["early morning", "hotel", "stakeout"],
        ["early morning", "stakeout"],
        ["neighborhood office", "stamp"],
        ["neighborhood office", "chapter"],
        ["commerce bureau", "license"],
        ["commerce bureau", "chapter"],
        ["stall", "contract"],
        ["stall", "sign"],
        ["four in the morning"],
        ["4 a.m."],
        ["tailing", "lost them"],
        ["tomorrow morning"],
      ];

      function extractOpeningSnippet(content: string): string {
        return content.replace(/\s+/g, "").slice(0, OPENING_LENGTH);
      }

      function matchesPatternGroup(content: string, keywords: string[]): boolean {
        return keywords.every((kw) => content.includes(kw));
      }

      const repetitionMap = new Map<string, number[]>();
      const openingMap = new Map<string, number[]>();

      for (const chapter of chapters) {
        if (!chapter.content) {
          continue;
        }
        const content = chapter.content;
        for (const patternGroup of SCENE_PATTERN_KEYWORDS) {
          if (matchesPatternGroup(content, patternGroup)) {
            const key = patternGroup.join("+");
            const existing = repetitionMap.get(key) ?? [];
            existing.push(chapter.order);
            repetitionMap.set(key, existing);
          }
        }
        const opening = extractOpeningSnippet(content);
        if (opening.length >= 30) {
          const prefix = opening.slice(0, 30);
          const existing = openingMap.get(prefix) ?? [];
          existing.push(chapter.order);
          openingMap.set(prefix, existing);
        }
      }

      const repetitionClusters = Array.from(repetitionMap.entries())
        .filter(([, orders]) => orders.length >= 2)
        .map(([pattern, occurrences]) => ({ pattern, occurrences }));

      const openingPatternClusters = Array.from(openingMap.entries())
        .filter(([, orders]) => orders.length >= 3)
        .map(([pattern, occurrences]) => ({ pattern: `Same opening fragment: ${pattern}`, occurrences }));

      const hasCriticalIssues = repetitionClusters.some((c) => c.occurrences.length >= 3)
        || openingPatternClusters.length > 0;

      const firstOrder = chapters[0]?.order ?? (input.startOrder ?? 1);
      const lastOrder = chapters[chapters.length - 1]?.order ?? firstOrder;
      const checkedRange = `ch${firstOrder}-ch${lastOrder}`;

      const issueLines: string[] = [
        ...repetitionClusters.map((c) => `Scene repeat [${c.pattern}] appears in chapters ${c.occurrences.join(", ")}`),
        ...openingPatternClusters.map((c) => `Opening repeat appears in chapters ${c.occurrences.join(", ")}`),
      ];

      const summary = issueLines.length > 0
        ? `Found ${issueLines.length} continuity issues: ${issueLines.slice(0, 3).join("; ")}`
        : `No obvious repeat pattern was found across ${chapters.length} chapters in ${checkedRange}.`;

      const recommendation = issueLines.length > 0
        ? "Suggestion: 1) Add chapters with repeated scenes to the recentScenePatterns blacklist so later chapters do not keep repeating them; 2) Manually or via apply_chapter_patch differentiate the repeated chapter content."
        : "Chapter continuity looks fine. No repair is needed.";

      return auditChapterContinuityOutputSchema.parse({
        novelId,
        checkedRange,
        chapterCount: chapters.length,
        milestoneBreaks: [],
        repetitionClusters,
        openingPatternClusters,
        hasCriticalIssues,
        summary,
        recommendation,
      });
    },
  },

  analyze_quality_debt_attribution: {
    name: "analyze_quality_debt_attribution",
    title: "Quality-debt root-cause analysis",
    description: "Scan chapters with recorded quality debt (defer_and_continue), aggregate root-cause A/B/D/E share, top failed issue codes, and missing obligation types, then produce a decision report. No LLM is needed; it is computed from riskFlags.",
    category: "inspect",
    riskLevel: "low",
    domainAgent: "NovelAgent",
    resourceScopes: ["novel", "chapter"],
    parserHints: {
      intent: "inspect_failure_reason",
      aliases: [
        "analyze quality debt",
        "quality debt attribution",
        "root-cause analysis",
                                                      ],
      phrases: [
        "Why chapter repair keeps failing",
        "What is the root cause of the quality debt",
        "Analyze which chapters have quality issues",
        "Quality-debt root-cause report",
        "Repair-failure cause stats",
      ],
      requiresNovelContext: true,
      whenToUse: "The user wants the root-cause mix of recorded quality-debt chapters so they can choose what to improve.",
      whenNotToUse: "The user is asking about one chapter's details or generation status.",
    },
    inputSchema: analyzeQualityDebtAttributionInputSchema,
    outputSchema: analyzeQualityDebtAttributionOutputSchema,
    execute: async (context, rawInput) => {
      const input = analyzeQualityDebtAttributionInputSchema.parse(rawInput);
      const novelId = input.novelId?.trim() || context.novelId;
      if (!novelId) {
        throw new AgentToolError("INVALID_INPUT", "Without the current novel context, quality-debt attribution cannot run.");
      }

      const chapters = await prisma.chapter.findMany({
        where: {
          novelId,
          order: {
            gte: input.startOrder ?? 1,
            ...(input.endOrder != null ? { lte: input.endOrder } : {}),
          },
          riskFlags: { not: null },
        },
        orderBy: { order: "asc" },
        select: { id: true, order: true, title: true, riskFlags: true },
      });

      // Keep chapters whose terminalAction is defer_and_continue.
      const deferredChapters: QualityDebtChapterAttribution[] = [];

      for (const chapter of chapters) {
        let riskFlagsObj: Record<string, unknown> = {};
        try {
          if (chapter.riskFlags) {
            const parsed = JSON.parse(chapter.riskFlags) as unknown;
            if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
              riskFlagsObj = parsed as Record<string, unknown>;
            }
          }
        } catch {
          continue;
        }

        const qualityLoop = riskFlagsObj.qualityLoop;
        if (!qualityLoop || typeof qualityLoop !== "object" || Array.isArray(qualityLoop)) {
          continue;
        }
        const loop = qualityLoop as Record<string, unknown>;
        if (loop.terminalAction !== "defer_and_continue") {
          continue;
        }

        const attribution = loop.qualityDebtAttribution;
        if (!attribution || typeof attribution !== "object" || Array.isArray(attribution)) {
          // Legacy data with no attribution.
          deferredChapters.push({
            chapterOrder: chapter.order,
            chapterId: chapter.id,
            title: chapter.title ?? `Chapter ${chapter.order}`,
            firstFailureIssueCodes: [],
            secondFailureIssueCodes: [],
            firstFailureClassificationCode: null,
            patchAnchorFailed: false,
            sameObligationRepeated: false,
            planMisaligned: false,
            lengthVsContentDrift: false,
            missingObligationKinds: [],
            primaryRootCause: "unknown",
          });
          continue;
        }

        const attr = attribution as Record<string, unknown>;
        const firstIssueCodes = Array.isArray(attr.firstFailureIssueCodes)
          ? attr.firstFailureIssueCodes.filter((c): c is string => typeof c === "string")
          : [];
        const secondIssueCodes = Array.isArray(attr.secondFailureIssueCodes)
          ? attr.secondFailureIssueCodes.filter((c): c is string => typeof c === "string")
          : [];
        const obligationKinds = Array.isArray(attr.missingObligationKinds)
          ? attr.missingObligationKinds.filter((k): k is string => typeof k === "string")
          : [];
        const patchAnchorFailed = attr.patchAnchorFailed === true;
        const sameObligationRepeated = attr.sameObligationRepeated === true;
        const planMisaligned = attr.planMisaligned === true;
        const lengthVsContentDrift = attr.lengthVsContentDrift === true;
        const classCode = typeof attr.firstFailureClassificationCode === "string"
          ? attr.firstFailureClassificationCode
          : null;

        // Infer the primary root cause (priority: D > B > A > E > unknown).
        let primaryRootCause: QualityDebtChapterAttribution["primaryRootCause"] = "unknown";
        if (planMisaligned) {
          primaryRootCause = "D";
        } else if (patchAnchorFailed) {
          primaryRootCause = "B";
        } else if (sameObligationRepeated) {
          primaryRootCause = "A";
        } else if (lengthVsContentDrift) {
          primaryRootCause = "E";
        }

        deferredChapters.push({
          chapterOrder: chapter.order,
          chapterId: chapter.id,
          title: chapter.title ?? `Chapter ${chapter.order}`,
          firstFailureIssueCodes: firstIssueCodes,
          secondFailureIssueCodes: secondIssueCodes,
          firstFailureClassificationCode: classCode,
          patchAnchorFailed,
          sameObligationRepeated,
          planMisaligned,
          lengthVsContentDrift,
          missingObligationKinds: obligationKinds,
          primaryRootCause,
        });
      }

      const attributed = deferredChapters.filter((c) => c.primaryRootCause !== "unknown" || c.firstFailureIssueCodes.length > 0);
      const attributedCount = attributed.length;
      const totalDeferred = deferredChapters.length;

      // Root-cause share
      const countByRoot = { A: 0, B: 0, D: 0, E: 0, unknown: 0 };
      for (const c of deferredChapters) {
        countByRoot[c.primaryRootCause] += 1;
      }
      const denominator = totalDeferred || 1;
      const rootCauseRatios = {
        A: Number((countByRoot.A / denominator).toFixed(3)),
        B: Number((countByRoot.B / denominator).toFixed(3)),
        D: Number((countByRoot.D / denominator).toFixed(3)),
        E: Number((countByRoot.E / denominator).toFixed(3)),
        unknown: Number((countByRoot.unknown / denominator).toFixed(3)),
      };

      // Top failed issue codes
      const issueCodeCount: Record<string, number> = {};
      for (const c of deferredChapters) {
        for (const code of [...c.firstFailureIssueCodes, ...c.secondFailureIssueCodes]) {
          issueCodeCount[code] = (issueCodeCount[code] ?? 0) + 1;
        }
      }
      const topFailureIssueCodes = Object.entries(issueCodeCount)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([code, count]) => ({ code, count }));

      // Top missing obligation kinds
      const obligationKindCount: Record<string, number> = {};
      for (const c of deferredChapters) {
        for (const kind of c.missingObligationKinds) {
          obligationKindCount[kind] = (obligationKindCount[kind] ?? 0) + 1;
        }
      }
      const topMissingObligationKinds = Object.entries(obligationKindCount)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([kind, count]) => ({ kind, count }));

      // Build the decision recommendation
      const dominantRoot = Object.entries(countByRoot)
        .filter(([k]) => k !== "unknown")
        .sort((a, b) => b[1] - a[1])[0]?.[0] ?? "unknown";
      const recommendationMap: Record<string, string> = {
        D: "Root cause D (unreachable obligation) dominates → prefer phase-one lazy planning. JIT task-sheet generation can solve this directly.",
        A: "Root cause A (open-loop repair) dominates → fix the repair loop first so the repairer gets structured obligations.",
        B: "Root cause B (patch-anchor mismatch) dominates → consider raising the patchRepair budget to 2 and allowing a looser-anchor retry.",
        E: "Root cause E (signature drift) dominates → split length/content issue signatures so budgets are counted separately.",
        unknown: "There is not enough attribution data yet. Run more chapters before analyzing.",
      };
      const recommendation = totalDeferred === 0
        ? "This novel has no recorded quality-debt chapters, so nothing to handle."
        : recommendationMap[dominantRoot] ?? recommendationMap.unknown;

      const startOrder = input.startOrder ?? 1;
      const endOrder = input.endOrder ?? chapters[chapters.length - 1]?.order ?? startOrder;
      const checkedRange = `ch${startOrder}-${endOrder}`;

      return analyzeQualityDebtAttributionOutputSchema.parse({
        novelId,
        checkedRange,
        totalDeferredChapters: totalDeferred,
        attributedChapters: attributedCount,
        rootCauseRatios,
        topFailureIssueCodes,
        topMissingObligationKinds,
        chapters: deferredChapters,
        recommendation,
      });
    },
  },
};

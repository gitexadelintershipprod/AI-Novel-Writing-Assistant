import type { ChapterRepairContext, ChapterRuntimePackage } from "@ai-novel/shared/types/chapterRuntime";
import type { LLMProvider } from "@ai-novel/shared/types/llm";
import type { ReviewIssue } from "@ai-novel/shared/types/novel";
import { runTextPrompt } from "../../../../prompting/core/promptRunner";
import { buildChapterRepairContextBlocks } from "../../../../prompting/prompts/novel/chapterLayeredContext";
import { chapterRepairPrompt } from "../../../../prompting/prompts/novel/review.prompts";
import {
  ChapterPatchRepairFailedError,
  ChapterPatchRepairService,
  type PatchRepairMode,
} from "../../chapterPatchRepairService";

export interface ChapterRepairExecutionOptions {
  provider?: LLMProvider;
  model?: string;
  temperature?: number;
  repairMode?: PatchRepairMode;
}

export interface PrepareChapterRepairExecutionInput {
  novelId: string;
  chapterId: string;
  novelTitle: string;
  chapterTitle: string;
  content: string;
  issues: ReviewIssue[];
  runtimePackage?: ChapterRuntimePackage | null;
  repairContext?: ChapterRepairContext | null;
  bibleContent?: string | null;
  forceFullRewrite?: boolean;
  options: ChapterRepairExecutionOptions;
}

export interface ChapterHeavyRepairPromptRequest {
  promptInput: {
    novelTitle: string;
    bibleContent: string;
    chapterTitle: string;
    chapterContent: string;
    issuesJson: string;
    ragContext: string;
    modeHint: string;
  };
  contextBlocks?: ReturnType<typeof buildChapterRepairContextBlocks>;
  options: {
    provider?: LLMProvider;
    model?: string;
    temperature: number;
    novelId: string;
    chapterId: string;
    stage: "chapter_repair";
    triggerReason: PatchRepairMode;
  };
  fallbackContent: string;
}

export type PreparedChapterRepairExecution =
  | {
      kind: "patched";
      content: string;
      issues: ReviewIssue[];
      finalRepairMode: PatchRepairMode;
      modeHint: string;
      escalatedFromPatch: false;
      patchFailure: null;
    }
  | {
      kind: "heavy_repair";
      issues: ReviewIssue[];
      finalRepairMode: "heavy_repair";
      modeHint: string;
      escalatedFromPatch: boolean;
      patchFailure: ChapterPatchRepairFailedError | null;
      prompt: ChapterHeavyRepairPromptRequest;
    };

export interface ExecutedChapterRepair {
  content: string;
  finalRepairMode: PatchRepairMode;
  escalatedFromPatch: boolean;
  patchFailure: ChapterPatchRepairFailedError | null;
}

function normalizeRepairIssues(issues: ReviewIssue[]): ReviewIssue[] {
  return issues.length > 0
    ? issues
    : [{
        severity: "medium",
        category: "coherence",
        evidence: "Pipeline quality threshold not met.",
        fixSuggestion: "Tighten continuity, sharpen conflict progression, and improve readability.",
      }];
}

function resolveIssueCodes(runtimePackage: ChapterRuntimePackage | null | undefined): string[] {
  return runtimePackage?.audit.openIssues
    ?.map((issue) => issue.code)
    .filter((code): code is string => typeof code === "string" && code.trim().length > 0)
    ?? [];
}

/**
 * Build the structured issuesJson used by the repair prompt.
 *
 * Root A fix: besides the ReviewIssue list, also pass through:
 *  - missingObligations: unpaid obligations for this chapter (kind/summary/evidence) so the repairer can patch them directly
 *  - blockingIssueCodes: exact codes from the audit layer (for example OBLIGATION_UNMET / LENGTH_OVER_HARD_MAX),
 *    so the repairer does not have to guess the issue type from flattened text
 */
function buildRepairIssuesPayload(
  issues: ReviewIssue[],
  runtimePackage: ChapterRuntimePackage | null | undefined,
): string {
  const missingObligations = runtimePackage?.obligationCoverage?.missing ?? [];
  const blockingIssueCodes = resolveIssueCodes(runtimePackage);

  if (missingObligations.length === 0 && blockingIssueCodes.length === 0) {
    return JSON.stringify(issues, null, 2);
  }

  return JSON.stringify(
    {
      issues,
      missingObligations: missingObligations.map((o) => ({
        kind: o.kind,
        summary: o.summary,
        ...(o.evidence ? { evidence: o.evidence } : {}),
      })),
      blockingIssueCodes,
    },
    null,
    2,
  );
}

function resolveRepairContext(input: {
  repairContext?: ChapterRepairContext | null;
  runtimePackage?: ChapterRuntimePackage | null;
}): ChapterRepairContext | null {
  return input.repairContext ?? input.runtimePackage?.context.chapterRepairContext ?? null;
}

function resolveBibleContent(input: {
  bibleContent?: string | null;
  runtimePackage?: ChapterRuntimePackage | null;
}): string {
  const explicitBible = input.bibleContent?.trim();
  if (explicitBible) {
    return explicitBible;
  }
  return buildRepairBibleFallback(input.runtimePackage);
}

function buildRepairRagContext(input: {
  repairContext?: ChapterRepairContext | null;
  runtimePackage?: ChapterRuntimePackage | null;
}): string {
  const repairContext = resolveRepairContext(input);
  const writeContext = repairContext?.writeContext ?? input.runtimePackage?.context.chapterWriteContext ?? null;
  if (!writeContext) {
    return "none";
  }
  const fragments = [
    writeContext.previousChapterTail
      ? `Previous chapter ending:\n${writeContext.previousChapterTail}`
      : "",
    writeContext.recentChapterSummaries?.length
      ? `Recent chapter summaries:\n${writeContext.recentChapterSummaries.slice(0, 3).map((item) => `- ${item}`).join("\n")}`
      : "",
    writeContext.openConflictSummaries?.length
      ? `Open conflicts still to recover:\n${writeContext.openConflictSummaries.slice(0, 5).map((item) => `- ${item}`).join("\n")}`
      : "",
    writeContext.characterHardFacts?.length
      ? `character hard facts：\n${writeContext.characterHardFacts.slice(0, 6).map((item) => [
          item.name,
          item.currentState ? `state=${item.currentState}` : "",
          item.currentGoal ? `goal=${item.currentGoal}` : "",
          item.currentLocation ? `location=${item.currentLocation}` : "",
          item.prohibitions?.length ? `forbidden=${item.prohibitions.join(" / ")}` : "",
        ].filter(Boolean).join(" | ")).join("\n")}`
      : "",
    writeContext.characterResourceContext
      ? [
          "Resource facts:",
          ...writeContext.characterResourceContext.availableItems.slice(0, 4).map((item) => `- available: ${item.name} / ${item.summary}`),
          ...writeContext.characterResourceContext.blockedItems.slice(0, 4).map((item) => `- not directly usable: ${item.name} / ${item.status} / ${item.summary}`),
          ...writeContext.characterResourceContext.highRiskCommittedItems.slice(0, 3).map((item) => `- High risk has been accounted for: ${item.name} / ${item.summary}`),
          ...writeContext.characterResourceContext.pendingProposalItems.slice(0, 3).map((item) => `- unconfirmed change: ${item.summary}; do not write it as an already-happened fact before confirmation`),
        ].join("\n")
      : "",
  ].filter((item) => item.trim().length > 0);
  return fragments.join("\n\n") || "none";
}

export async function prepareChapterRepairExecution(
  input: PrepareChapterRepairExecutionInput,
): Promise<PreparedChapterRepairExecution> {
  const issues = normalizeRepairIssues(input.issues);
  const issueCodes = resolveIssueCodes(input.runtimePackage);
  let activeRepairMode = input.options.repairMode ?? "light_repair";
  let modeHint = getRepairModeHint(activeRepairMode, issueCodes);

  if (input.forceFullRewrite && activeRepairMode !== "heavy_repair") {
    activeRepairMode = "heavy_repair";
    modeHint = getRepairModeHint(activeRepairMode, issueCodes);
  }

  if (!input.forceFullRewrite && activeRepairMode !== "heavy_repair") {
    const patchRepairService = new ChapterPatchRepairService();
    try {
      const patched = await patchRepairService.repair({
        novelId: input.novelId,
        chapterId: input.chapterId,
        novelTitle: input.novelTitle,
        chapterTitle: input.chapterTitle,
        content: input.content,
        issues,
        runtimePackage: input.runtimePackage,
        repairContext: input.repairContext,
        provider: input.options.provider,
        model: input.options.model,
        temperature: input.options.temperature,
        repairMode: activeRepairMode,
        modeHint,
      });
      return {
        kind: "patched",
        content: patched.content,
        issues,
        finalRepairMode: activeRepairMode,
        modeHint,
        escalatedFromPatch: false,
        patchFailure: null,
      };
    } catch (error) {
      if (!(error instanceof ChapterPatchRepairFailedError)) {
        throw error;
      }
      if (activeRepairMode === "detect_only") {
        throw error;
      }

      activeRepairMode = "heavy_repair";
      modeHint = getRepairModeHint(activeRepairMode, issueCodes);
      return {
        kind: "heavy_repair",
        issues,
        finalRepairMode: activeRepairMode,
        modeHint,
        escalatedFromPatch: true,
        patchFailure: error,
        prompt: {
          promptInput: {
            novelTitle: input.novelTitle,
            bibleContent: resolveBibleContent(input),
            chapterTitle: input.chapterTitle,
            chapterContent: input.content,
            issuesJson: buildRepairIssuesPayload(issues, input.runtimePackage),
            ragContext: buildRepairRagContext(input),
            modeHint,
          },
          contextBlocks: resolveRepairContext(input)
            ? buildChapterRepairContextBlocks(resolveRepairContext(input) as ChapterRepairContext)
            : undefined,
          options: {
            provider: input.options.provider,
            model: input.options.model,
            temperature: Math.min(input.options.temperature ?? 0.55, 0.65),
            novelId: input.novelId,
            chapterId: input.chapterId,
            stage: "chapter_repair",
            triggerReason: activeRepairMode,
          },
          fallbackContent: input.content,
        },
      };
    }
  }

  return {
    kind: "heavy_repair",
    issues,
    finalRepairMode: "heavy_repair",
    modeHint,
    escalatedFromPatch: false,
    patchFailure: null,
    prompt: {
      promptInput: {
        novelTitle: input.novelTitle,
        bibleContent: resolveBibleContent(input),
        chapterTitle: input.chapterTitle,
        chapterContent: input.content,
        issuesJson: buildRepairIssuesPayload(issues, input.runtimePackage),
        ragContext: buildRepairRagContext(input),
        modeHint,
      },
      contextBlocks: resolveRepairContext(input)
        ? buildChapterRepairContextBlocks(resolveRepairContext(input) as ChapterRepairContext)
        : undefined,
      options: {
        provider: input.options.provider,
        model: input.options.model,
        temperature: Math.min(input.options.temperature ?? 0.55, 0.65),
        novelId: input.novelId,
        chapterId: input.chapterId,
        stage: "chapter_repair",
        triggerReason: activeRepairMode,
      },
      fallbackContent: input.content,
    },
  };
}

export function createHeavyRepairPromptExecution(
  plan: Extract<PreparedChapterRepairExecution, { kind: "heavy_repair" }>,
): {
  asset: typeof chapterRepairPrompt;
  promptInput: ChapterHeavyRepairPromptRequest["promptInput"];
  contextBlocks?: ChapterHeavyRepairPromptRequest["contextBlocks"];
  options: ChapterHeavyRepairPromptRequest["options"];
} {
  return {
    asset: chapterRepairPrompt,
    promptInput: plan.prompt.promptInput,
    contextBlocks: plan.prompt.contextBlocks,
    options: plan.prompt.options,
  };
}

export async function runChapterRepairText(
  input: PrepareChapterRepairExecutionInput,
): Promise<ExecutedChapterRepair> {
  const prepared = await prepareChapterRepairExecution(input);
  if (prepared.kind === "patched") {
    return {
      content: prepared.content,
      finalRepairMode: prepared.finalRepairMode,
      escalatedFromPatch: false,
      patchFailure: null,
    };
  }

  const repaired = await runTextPrompt(createHeavyRepairPromptExecution(prepared));
  return {
    content: repaired.output.trim() || prepared.prompt.fallbackContent,
    finalRepairMode: prepared.finalRepairMode,
    escalatedFromPatch: prepared.escalatedFromPatch,
    patchFailure: prepared.patchFailure,
  };
}

function buildRepairBibleFallback(runtimePackage: ChapterRuntimePackage | null | undefined): string {
  const context = runtimePackage?.context;
  if (!context) {
    return "none";
  }
  const fragments = [
    context.bookContract?.sellingPoint ? `Core selling points:${context.bookContract.sellingPoint}` : "",
    context.bookContract?.first30ChapterPromise ? `The first 30 chapters promise:${context.bookContract.first30ChapterPromise}` : "",
    context.macroConstraints?.coreConflict ? `Core conflict:${context.macroConstraints.coreConflict}` : "",
    context.macroConstraints?.progressionLoop ? `Propulsion circuit: ${context.macroConstraints.progressionLoop}` : "",
    context.volumeWindow?.missionSummary ? `Current volume mission: ${context.volumeWindow.missionSummary}` : "",
  ].filter(Boolean);
  return fragments.join("\n") || "none";
}

export function getRepairModeHint(
  repairMode: PatchRepairMode | undefined,
  issueCodes: string[] = [],
): string {
  if (issueCodes.includes("LENGTH_OVER_HARD_MAX")) {
    return "compress_chapter_for_length: Compress repeated wording, explanation, and empty turns across the chapter, while keeping the core advance and ending pressure.";
  }
  if (issueCodes.includes("LENGTH_OVER_SOFT_MAX")) {
    return "compress_tail_for_length: Prefer trimming redundant tail expansion while keeping the ending hook and key conflict.";
  }
  if (issueCodes.includes("LENGTH_UNDER_SOFT_MIN")) {
    return "extend_for_length: Only add the last owed scene or ending hook. Increase real advance; do not pad with recap.";
  }
  switch (repairMode) {
    case "continuity_only":
      return "Prefer repairing continuity, timeline, and event handoff. Do not do a large style rewrite.";
    case "character_only":
      return "Prefer repairing character speech, motive, and relationship behavior. Do not change the spine task.";
    case "ending_only":
      return "Prefer repairing chapter closure, hooks, and ending decisiveness so the tail has more pull.";
    case "heavy_repair":
      return "Larger sentence-level rewrites are allowed as long as the plot direction stays the same.";
    case "light_repair":
    default:
      return "Prefer light repair. Keep the existing content frame and event order first.";
  }
}

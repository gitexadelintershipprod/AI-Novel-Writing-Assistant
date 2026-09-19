import { randomUUID } from "node:crypto";
import type {
  ChapterEditorAiRevisionIntent,
  ChapterEditorMacroContext,
  ChapterEditorAiRevisionRequest,
  ChapterEditorAiRevisionResponse,
  ChapterEditorCandidate,
  ChapterEditorOperation,
  ChapterEditorRewritePreviewRequest,
  ChapterEditorRewritePreviewResponse,
  ChapterEditorTargetRange,
} from "@ai-novel/shared/types/novel";
import { runStructuredPrompt } from "../../../prompting/core/promptRunner";
import {
  chapterEditorRewriteCandidatesPrompt,
  type ChapterEditorRewriteCandidatesPromptInput,
} from "../../../prompting/prompts/novel/chapterEditor/rewriteCandidates.prompts";
import {
  chapterEditorUserIntentPrompt,
  type ChapterEditorUserIntentPromptInput,
} from "../../../prompting/prompts/novel/chapterEditor/userIntent.prompts";
import { buildChapterEditorDiffChunks } from "./chapterEditorDiff";
import { ChapterEditorWorkspaceService } from "./ChapterEditorWorkspaceService";
import {
  buildCharacterStateSummary,
  buildMacroContextSummary,
  buildParagraphWindow,
  buildPresetIntent,
  countEditorWords,
  createTargetRangeForWholeChapter,
  normalizeChapterContent,
  normalizeEditorText,
} from "./chapterEditorShared";

const FULL_CHAPTER_REVISION_LIMIT = 8000;

const OPERATION_LABELS: Record<ChapterEditorOperation, string> = {
  polish: "Optimize expression",
  expand: "扩写细节",
  compress: "精简压缩",
  emotion: "Strengthen mood",
  conflict: "intensify conflict",
  custom: "Custom instructions改写",
};

function buildConstraintsText(input: ChapterEditorAiRevisionRequest["constraints"]): string {
  const lines = [
    input.keepFacts ? "- 保留现有剧情事实" : "- 可调整部分事实",
    input.keepPov ? "- 保持当前人称与narrative perspective" : "- 可调整narrative perspective",
    input.noUnauthorizedSetting ? "- 不新增未授权设定" : "- 可引入补充设定",
    input.preserveCoreInfo ? "- 尽量保留原段核心信息" : "- 可重组核心信息",
  ];
  return lines.join("\n");
}

function dedupeCandidates(candidates: ChapterEditorCandidate[]): ChapterEditorCandidate[] {
  const seen = new Set<string>();
  const deduped: ChapterEditorCandidate[] = [];
  for (const candidate of candidates) {
    const key = candidate.content.trim();
    if (!key || seen.has(key)) {
      continue;
    }
    seen.add(key);
    deduped.push(candidate);
  }
  return deduped;
}

function buildIntentSummary(intent: ChapterEditorAiRevisionIntent): string {
  return [
    `Goal: ${intent.editGoal}`,
    `Tone: ${intent.toneShift}`,
    `Pacing: ${intent.paceAdjustment}`,
    `Conflict: ${intent.conflictAdjustment}`,
    `Emotion: ${intent.emotionAdjustment}`,
    `Strength: ${intent.strength}`,
    `Keep: ${intent.mustPreserve.join("; ") || "Keep core facts and continuity"}`,
    `Avoid: ${intent.mustAvoid.join("; ") || "Do not break chapter continuity"}`,
    `Notes: ${intent.reasoningSummary}`,
  ].join("\n");
}

function resolveSelectionTargetRange(content: string, targetRange?: ChapterEditorTargetRange): ChapterEditorTargetRange {
  if (!targetRange) {
    throw new Error("Inline repair needs selected chapter text first.");
  }
  if (
    typeof targetRange.from !== "number"
    || typeof targetRange.to !== "number"
    || targetRange.from < 0
    || targetRange.to <= targetRange.from
    || targetRange.to > content.length
  ) {
    throw new Error("The selection range is invalid. Select it again and retry.");
  }
  const selectedText = content.slice(targetRange.from, targetRange.to);
  if (!selectedText.trim()) {
    throw new Error("The selected text cannot be empty.");
  }
  if (normalizeEditorText(targetRange.text) !== selectedText) {
    throw new Error("The selected text changed. Select it again and retry.");
  }
  return {
    from: targetRange.from,
    to: targetRange.to,
    text: selectedText,
  };
}

export class NovelChapterEditorService {
  constructor(
    private readonly workspaceService: ChapterEditorWorkspaceService = new ChapterEditorWorkspaceService(),
    private readonly promptRunner: typeof runStructuredPrompt = runStructuredPrompt,
  ) {}

  async previewAiRevision(
    novelId: string,
    chapterId: string,
    input: ChapterEditorAiRevisionRequest,
  ): Promise<ChapterEditorAiRevisionResponse> {
    const context = await this.workspaceService.loadContext(novelId, chapterId);
    const content = normalizeChapterContent(input.contentSnapshot || context.chapter.content || "");
    if (!content.trim()) {
      throw new Error("This chapter body is empty, so AI repair cannot start.");
    }

    if (input.scope === "chapter" && countEditorWords(content) > FULL_CHAPTER_REVISION_LIMIT) {
      throw new Error(`Full-chapter repair is currently limited to ${FULL_CHAPTER_REVISION_LIMIT} non-whitespace characters. Switch to inline repair.`);
    }

    const targetRange = input.scope === "chapter"
      ? createTargetRangeForWholeChapter(content)
      : resolveSelectionTargetRange(content, input.selection);

    const resolvedIntent = await this.resolveRevisionIntent(input, context.macroContext, targetRange.text);
    const contextWindow = input.scope === "selection"
      ? input.context ?? buildParagraphWindow(content, targetRange)
      : { beforeParagraphs: [], afterParagraphs: [] };

    const result = await this.promptRunner({
      asset: chapterEditorRewriteCandidatesPrompt,
      promptInput: {
        operation: input.presetOperation ?? (input.source === "freeform" ? "custom" : "polish"),
        operationLabel: input.presetOperation ? OPERATION_LABELS[input.presetOperation] : "Revise to the user's request",
        scope: input.scope,
        customInstruction: input.instruction?.trim() || undefined,
        selectedText: targetRange.text,
        beforeParagraphs: contextWindow.beforeParagraphs,
        afterParagraphs: contextWindow.afterParagraphs,
        goalSummary: context.chapterPlan?.objective?.trim() || context.chapter.expectation?.trim() || null,
        chapterSummary: context.chapterSummary,
        styleSummary: context.styleSummary || null,
        characterStateSummary: buildCharacterStateSummary(context.latestStateSnapshot),
        worldConstraintSummary: context.macroContext.worldConstraintSummary,
        macroContextSummary: buildMacroContextSummary(context.macroContext),
        resolvedIntentSummary: buildIntentSummary(resolvedIntent),
        constraintsText: buildConstraintsText(input.constraints),
      } satisfies ChapterEditorRewriteCandidatesPromptInput,
      options: {
        provider: input.provider ?? "deepseek",
        model: input.model,
        temperature: input.temperature ?? 0.45,
      },
    });

    const candidates = dedupeCandidates(
      result.output.candidates.slice(0, 3).map((candidate, index) => ({
        id: randomUUID(),
        label: candidate.label?.trim() || `Option ${index + 1}`,
        content: candidate.content.trim(),
        summary: candidate.summary?.trim() || null,
        rationale: candidate.rationale?.trim() || null,
        riskNotes: candidate.riskNotes?.filter((item) => item.trim().length > 0) ?? [],
        semanticTags: candidate.semanticTags?.filter((tag) => tag.trim().length > 0) ?? [],
        diffChunks: buildChapterEditorDiffChunks(targetRange.text, candidate.content.trim()),
      })),
    );

    if (candidates.length < 2) {
      throw new Error("AI did not return enough candidate versions. Please retry.");
    }

    return {
      sessionId: randomUUID(),
      scope: input.scope,
      resolvedIntent,
      targetRange,
      macroAlignmentNote: result.output.macroAlignmentNote?.trim() || null,
      candidates,
      activeCandidateId: candidates[0]?.id ?? null,
    };
  }

  async previewRewrite(
    novelId: string,
    chapterId: string,
    input: ChapterEditorRewritePreviewRequest,
  ): Promise<ChapterEditorRewritePreviewResponse> {
    const response = await this.previewAiRevision(novelId, chapterId, {
      source: "preset",
      scope: "selection",
      presetOperation: input.operation,
      instruction: input.customInstruction,
      contentSnapshot: input.contentSnapshot,
      selection: input.targetRange,
      context: input.context,
      constraints: input.constraints,
      provider: input.provider,
      model: input.model,
      temperature: input.temperature,
    });

    return {
      sessionId: response.sessionId,
      operation: input.operation,
      targetRange: response.targetRange,
      candidates: response.candidates,
      activeCandidateId: response.activeCandidateId,
    };
  }

  private async resolveRevisionIntent(
    input: ChapterEditorAiRevisionRequest,
    macroContext: ChapterEditorMacroContext,
    selectedText: string,
  ): Promise<ChapterEditorAiRevisionIntent> {
    if (input.source === "preset") {
      return buildPresetIntent(
        input.presetOperation ?? "polish",
        macroContext.mustKeepConstraints,
        input.instruction,
      );
    }

    if (!input.instruction?.trim()) {
      throw new Error("First write how you want AI to revise it.");
    }

    const result = await this.promptRunner({
      asset: chapterEditorUserIntentPrompt,
      promptInput: {
        scope: input.scope,
        instruction: input.instruction.trim(),
        selectedText: input.scope === "selection" ? selectedText.slice(0, 800) : null,
        macroContextSummary: buildMacroContextSummary(macroContext),
        mustKeepConstraints: macroContext.mustKeepConstraints,
      } satisfies ChapterEditorUserIntentPromptInput,
      options: {
        provider: input.provider ?? "deepseek",
        model: input.model,
        temperature: 0.2,
      },
    });

    return result.output;
  }
}

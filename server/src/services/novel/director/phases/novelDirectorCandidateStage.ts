import { randomUUID } from "node:crypto";
import {
  DIRECTOR_CANDIDATE_SETUP_STEPS,
  type DirectorCandidate,
  type DirectorCandidateBatch,
  type DirectorCandidatePatchRequest,
  type DirectorCandidatePatchResponse,
  type DirectorCandidateTitleRefineRequest,
  type DirectorCandidateTitleRefineResponse,
  type DirectorCandidatesRequest,
  type DirectorCandidatesResponse,
  type DirectorCorrectionPreset,
  type DirectorProjectContextInput,
  type DirectorRefineResponse,
  type DirectorRefinementRequest,
} from "@ai-novel/shared/types/novelDirector";
import type { TitleFactorySuggestion } from "@ai-novel/shared/types/title";
import type { NovelCreateResourceRecommendation } from "@ai-novel/shared/types/novelResourceRecommendation";
import { runStructuredPrompt } from "../../../../prompting/core/promptRunner";
import { novelCreateResourceRecommendationService } from "../../NovelCreateResourceRecommendationService";
import {
  buildDirectorCandidateContextBlocks,
  directorCandidatePatchPrompt,
  directorCandidatePrompt,
} from "../../../../prompting/prompts/novel/directorPlanning.prompts";
import { titleGenerationService } from "../../../title/TitleGenerationService";
import { isNearDuplicateTitle } from "../../../title/titleGeneration.shared";
import type { NovelWorkflowService } from "../../workflow/NovelWorkflowService";
import {
  buildRefinementSummary,
  buildWorkflowSeedPayload,
  enhanceCandidateTitles,
  normalizeCandidate,
  selectDistinctCandidateTitle,
  type CandidateGenerationContext,
} from "../runtime/novelDirectorHelpers";
import { DIRECTOR_PROGRESS } from "../projections/novelDirectorProgress";
import { marketRadarService } from "../../../../modules/marketRadar/application/MarketRadarService";

type WorkflowDependency = Pick<NovelWorkflowService, "bootstrapTask" | "markTaskRunning" | "recordCandidateSelectionRequired">;

function clampTemperature(value: number | undefined, ceiling: number): number {
  return Math.min(value ?? ceiling, ceiling);
}

function buildFallbackTitleOption(candidate: DirectorCandidate): TitleFactorySuggestion {
  return {
    title: candidate.workingTitle,
    clickRate: 60,
    style: "high_concept",
    angle: "Current project title",
    reason: "Keep the current project title.",
  };
}

function mergeTitleOptions(
  generatedTitles: TitleFactorySuggestion[],
  candidate: DirectorCandidate,
): TitleFactorySuggestion[] {
  const merged: TitleFactorySuggestion[] = [];
  for (const option of generatedTitles) {
    if (!merged.some((existing) => isNearDuplicateTitle(existing.title, option.title))) {
      merged.push(option);
    }
  }

  const fallback = buildFallbackTitleOption(candidate);
  if (!merged.some((existing) => isNearDuplicateTitle(existing.title, fallback.title))) {
    merged.push(fallback);
  }

  return merged.slice(0, 4);
}

function buildTargetedTitleBrief(input: {
  candidate: DirectorCandidate;
  idea: string;
  context: DirectorProjectContextInput;
  feedback: string;
}): string {
  const currentTitleGroup = [
    input.candidate.workingTitle,
    ...(input.candidate.titleOptions ?? []).map((item) => item.title),
  ]
    .filter(Boolean)
    .join(", ");
  const readerChannel = readerChannelPreferenceLabel(input.context.readerChannelPreference);

  return [
    `story inspiration: ${input.idea.trim()}`,
    `Current plan: ${input.candidate.workingTitle}`,
    `Positioning of the work: ${input.candidate.positioning}`,
    `Core selling points: ${input.candidate.sellingPoint}`,
    `main conflict: ${input.candidate.coreConflict}`,
    `Protagonist path: ${input.candidate.protagonistPath}`,
    `Main hook:${input.candidate.hookStrategy}`,
    `Advance cycle:${input.candidate.progressionLoop}`,
    input.candidate.toneKeywords.length > 0 ? `Tone keywords: ${input.candidate.toneKeywords.join(", ")}` : "",
    input.context.targetAudience?.trim() ? `Target readers:${input.context.targetAudience.trim()}` : "",
    readerChannel ? `Reader channel tendencies: ${readerChannel}` : "",
    input.context.competingFeel?.trim() ? `Comparable tone: ${input.context.competingFeel.trim()}` : "",
    currentTitleGroup ? `Current title group: ${currentTitleGroup}` : "",
    `Title revision notes: ${input.feedback.trim()}`,
    "Create a more suitable set of Georgian titles for the same story direction.",
    "Prefer the tone the user asked for, such as more urban, more suspenseful, lighter, more refined, or less cliche.",
    "Do not repeat the current title set, and do not fall back to concept phrases, slogan names, or stock templates.",
  ].filter(Boolean).join("\n");
}

function readerChannelPreferenceLabel(value: DirectorProjectContextInput["readerChannelPreference"]): string {
  switch (value) {
    case "ai_judge":
      return "AI judgment";
    case "male_oriented":
      return "male frequency";
    case "female_oriented":
      return "Female frequency";
    case "general":
      return "General reader/unlimited";
    default:
      return "";
  }
}

function findTargetBatch(previousBatches: DirectorCandidateBatch[], batchId: string): DirectorCandidateBatch {
  const batch = previousBatches.find((item) => item.id === batchId);
  if (!batch) {
    throw new Error("The target plan round does not exist.");
  }
  return batch;
}

function findTargetCandidate(batch: DirectorCandidateBatch, candidateId: string): DirectorCandidate {
  const candidate = batch.candidates.find((item) => item.id === candidateId);
  if (!candidate) {
    throw new Error("The target plan does not exist.");
  }
  return candidate;
}

function replaceCandidateInBatch(
  batch: DirectorCandidateBatch,
  nextCandidate: DirectorCandidate,
  summary: string,
): DirectorCandidateBatch {
  return {
    ...batch,
    refinementSummary: summary,
    candidates: batch.candidates.map((candidate) => (
      candidate.id === nextCandidate.id ? nextCandidate : candidate
    )),
  };
}

function replaceBatchInList(
  batches: DirectorCandidateBatch[],
  nextBatch: DirectorCandidateBatch,
): DirectorCandidateBatch[] {
  return batches.map((batch) => (batch.id === nextBatch.id ? nextBatch : batch));
}

export class NovelDirectorCandidateStageService {
  constructor(private readonly workflowService: WorkflowDependency) {}

  private async markCandidateProgress(
    workflowTaskId: string | undefined,
    itemKey: typeof DIRECTOR_CANDIDATE_SETUP_STEPS[number]["key"],
    itemLabel: string,
    progress: number,
  ): Promise<void> {
    if (!workflowTaskId?.trim()) {
      return;
    }
    await this.workflowService.markTaskRunning(workflowTaskId, {
      stage: "auto_director",
      itemKey,
      itemLabel,
      progress,
    });
  }

  private async generateBatch(context: CandidateGenerationContext & {
    workflowTaskId?: string;
    productionFoundation?: NovelCreateResourceRecommendation;
  }): Promise<{ batch: DirectorCandidateBatch }> {
    await this.markCandidateProgress(
      context.workflowTaskId,
      "candidate_direction_batch",
      context.batches.length === 0 ? "Generating the first book-level options" : "Generating a new plan from the revision notes",
      DIRECTOR_PROGRESS.candidateDirectionBatch,
    );

    const parsed = await runStructuredPrompt({
      asset: directorCandidatePrompt,
      promptInput: {
        idea: context.idea,
        context: context.request,
        count: context.count,
        batches: context.batches,
        presets: context.presets,
        feedback: context.feedback,
      },
      contextBlocks: buildDirectorCandidateContextBlocks({
        idea: context.idea,
        context: context.request,
        latestBatch: context.batches.at(-1),
        presets: context.presets,
        feedback: context.feedback,
      }),
      options: {
        provider: context.options.provider,
        model: context.options.model,
        temperature: clampTemperature(context.options.temperature, 0.45),
        taskId: context.workflowTaskId,
        stage: "auto_director",
        itemKey: "candidate_direction_batch",
        entrypoint: "auto_director_create",
      },
    });

    const productionFoundation = context.productionFoundation
      ?? context.batches.at(-1)?.candidates[0]?.productionFoundation;
    const normalizedCandidates = parsed.output.candidates.map((candidate, index) => ({
      ...normalizeCandidate(candidate, index),
      productionFoundation,
    }));

    await this.markCandidateProgress(
      context.workflowTaskId,
      "candidate_title_pack",
      "Strengthening title sets for each option",
      DIRECTOR_PROGRESS.candidateTitlePack,
    );
    const independentlyEnrichedCandidates = await Promise.all(
      normalizedCandidates.map((candidate) => enhanceCandidateTitles(candidate, context)),
    );
    const enrichedCandidates: DirectorCandidate[] = [];
    const selectedTitles: string[] = [];
    for (let index = 0; index < independentlyEnrichedCandidates.length; index += 1) {
      const enrichedCandidate = independentlyEnrichedCandidates[index];
      let distinctCandidate = selectDistinctCandidateTitle(enrichedCandidate, selectedTitles);
      if (!distinctCandidate) {
        const regeneratedCandidate = await enhanceCandidateTitles(normalizedCandidates[index], context, {
          excludedTitles: selectedTitles,
        });
        distinctCandidate = selectDistinctCandidateTitle(regeneratedCandidate, selectedTitles);
      }
      if (!distinctCandidate) {
        throw new Error(`Option ${index + 1} did not generate a title that is distinct from the other options. Please retry.`);
      }
      enrichedCandidates.push(distinctCandidate);
      selectedTitles.push(distinctCandidate.workingTitle);
    }

    const round = (context.batches.at(-1)?.round ?? 0) + 1;
    return {
      batch: {
        id: randomUUID(),
        round,
        roundLabel: `Round ${round}`,
        idea: context.idea.trim(),
        refinementSummary: buildRefinementSummary(context.presets, context.feedback, round),
        presets: context.presets,
        candidates: enrichedCandidates,
        createdAt: new Date().toISOString(),
      },
    };
  }

  async generateCandidates(input: DirectorCandidatesRequest): Promise<DirectorCandidatesResponse> {
    const marketBriefPrompt = await marketRadarService.getBriefPromptBlock(input.marketBriefId);
    const foundation = await novelCreateResourceRecommendationService.resolveRequired({
      marketBriefPrompt,
      title: input.title,
      description: input.description || input.idea,
      targetAudience: input.targetAudience,
      bookSellingPoint: input.bookSellingPoint,
      competingFeel: input.competingFeel,
      first30ChapterPromise: input.first30ChapterPromise,
      commercialTags: input.commercialTags,
      genreId: input.genreId,
      primaryStoryModeId: input.primaryStoryModeId,
      secondaryStoryModeId: input.secondaryStoryModeId,
      writingMode: input.writingMode,
      projectMode: input.projectMode,
      narrativePov: input.narrativePov,
      pacePreference: input.pacePreference,
      styleTone: input.styleTone,
      emotionIntensity: input.emotionIntensity,
      aiFreedom: input.aiFreedom,
      provider: input.provider,
      model: input.model,
      temperature: input.temperature,
    });
    const resolvedInput: DirectorCandidatesRequest = {
      ...input,
      marketBriefPrompt,
      genreId: foundation.genreId,
      primaryStoryModeId: foundation.primaryStoryModeId,
      secondaryStoryModeId: foundation.secondaryStoryModeId,
      productionFoundationPrompt: foundation.promptBlock,
    };
    if (resolvedInput.workflowTaskId?.trim()) {
      await this.workflowService.bootstrapTask({
        workflowTaskId: resolvedInput.workflowTaskId,
        lane: "auto_director",
        title: resolvedInput.title ?? null,
        seedPayload: buildWorkflowSeedPayload(resolvedInput, {
          batches: [],
          candidateStage: {
            mode: "generate",
          },
        }),
      });
    }

    await this.markCandidateProgress(
      input.workflowTaskId,
      "candidate_seed_alignment",
      "Organizing your project setup and starting inspiration",
      DIRECTOR_PROGRESS.candidateSeedAlignment,
    );
    await this.markCandidateProgress(
      input.workflowTaskId,
      "candidate_project_framing",
      "Aligning book-level framing with earlier promises",
      DIRECTOR_PROGRESS.candidateProjectFraming,
    );

    const result = await this.generateBatch({
      idea: resolvedInput.idea,
      count: 2,
      batches: [],
      presets: [],
      request: resolvedInput,
      options: resolvedInput,
      workflowTaskId: resolvedInput.workflowTaskId,
      productionFoundation: foundation.recommendation,
    });
    if (!resolvedInput.workflowTaskId?.trim()) {
      return result;
    }

    const workflowTask = await this.workflowService.bootstrapTask({
      workflowTaskId: resolvedInput.workflowTaskId,
      lane: "auto_director",
      title: resolvedInput.title ?? null,
      seedPayload: buildWorkflowSeedPayload(resolvedInput, {
        batches: [result.batch],
        productionFoundation: foundation.recommendation,
        candidateStage: {
          mode: "generate",
        },
      }),
    });
    await this.workflowService.recordCandidateSelectionRequired(workflowTask.id, {
      summary: `${result.batch.roundLabel} generated ${result.batch.candidates.length} book-level orientations and finished a title set for each.`,
      seedPayload: buildWorkflowSeedPayload(resolvedInput, {
        batches: [result.batch],
        productionFoundation: foundation.recommendation,
        candidateStage: {
          mode: "generate",
        },
      }),
    });
    return {
      ...result,
      workflowTaskId: workflowTask.id,
    };
  }

  async refineCandidates(input: DirectorRefinementRequest): Promise<DirectorRefineResponse> {
    if (input.workflowTaskId?.trim()) {
      await this.workflowService.bootstrapTask({
        workflowTaskId: input.workflowTaskId,
        lane: "auto_director",
        title: input.title ?? null,
        seedPayload: buildWorkflowSeedPayload(input, {
          batches: input.previousBatches,
          candidateStage: {
            mode: "refine",
            presets: input.presets ?? [],
            feedback: input.feedback?.trim() || null,
          },
        }),
      });
    }

    await this.markCandidateProgress(
      input.workflowTaskId,
      "candidate_seed_alignment",
      "Reading the previous options and your revision notes",
      DIRECTOR_PROGRESS.candidateSeedAlignment,
    );
    await this.markCandidateProgress(
      input.workflowTaskId,
      "candidate_project_framing",
      "Aligning the new taste preference with book-level framing",
      DIRECTOR_PROGRESS.candidateProjectFraming,
    );

    const result = await this.generateBatch({
      idea: input.idea,
      count: 2,
      batches: input.previousBatches,
      presets: input.presets ?? [],
      feedback: input.feedback,
      request: input,
      options: input,
      workflowTaskId: input.workflowTaskId,
    });
    if (!input.workflowTaskId?.trim()) {
      return result;
    }

    const nextBatches = [...input.previousBatches, result.batch];
    const workflowTask = await this.workflowService.bootstrapTask({
      workflowTaskId: input.workflowTaskId,
      lane: "auto_director",
      title: input.title ?? null,
      seedPayload: buildWorkflowSeedPayload(input, {
        batches: nextBatches,
        candidateStage: {
          mode: "refine",
          presets: input.presets ?? [],
          feedback: input.feedback?.trim() || null,
        },
      }),
    });
    await this.workflowService.recordCandidateSelectionRequired(workflowTask.id, {
      summary: `${result.batch.roundLabel} generated ${result.batch.candidates.length} new directions from your notes and strengthened the title sets.`,
      seedPayload: buildWorkflowSeedPayload(input, {
        batches: nextBatches,
        candidateStage: {
          mode: "refine",
          presets: input.presets ?? [],
          feedback: input.feedback?.trim() || null,
        },
      }),
    });
    return {
      ...result,
      workflowTaskId: workflowTask.id,
    };
  }

  async patchCandidate(input: DirectorCandidatePatchRequest): Promise<DirectorCandidatePatchResponse> {
    if (input.workflowTaskId?.trim()) {
      await this.workflowService.bootstrapTask({
        workflowTaskId: input.workflowTaskId,
        lane: "auto_director",
        title: input.title ?? null,
        seedPayload: buildWorkflowSeedPayload(input, {
          batches: input.previousBatches,
          candidateStage: {
            mode: "patch_candidate",
            presets: input.presets ?? [],
            feedback: input.feedback.trim(),
            batchId: input.batchId,
            candidateId: input.candidateId,
          },
        }),
      });
    }

    const targetBatch = findTargetBatch(input.previousBatches, input.batchId);
    const targetCandidate = findTargetCandidate(targetBatch, input.candidateId);

    await this.markCandidateProgress(
      input.workflowTaskId,
      "candidate_seed_alignment",
      `Reading the current plan for "${targetCandidate.workingTitle}"`,
      DIRECTOR_PROGRESS.candidateSeedAlignment,
    );
    await this.markCandidateProgress(
      input.workflowTaskId,
      "candidate_direction_batch",
      `Applying your notes to "${targetCandidate.workingTitle}"`,
      DIRECTOR_PROGRESS.candidateDirectionBatch,
    );

    const parsed = await runStructuredPrompt({
      asset: directorCandidatePatchPrompt,
      promptInput: {
        idea: input.idea,
        context: input,
        candidate: targetCandidate,
        batches: input.previousBatches,
        presets: input.presets ?? [],
        feedback: input.feedback,
      },
      contextBlocks: buildDirectorCandidateContextBlocks({
        idea: input.idea,
        context: input,
        latestBatch: input.previousBatches.at(-1),
        presets: input.presets ?? [],
        feedback: input.feedback,
      }),
      options: {
        provider: input.provider,
        model: input.model,
        temperature: clampTemperature(input.temperature, 0.4),
        taskId: input.workflowTaskId,
        stage: "auto_director",
        itemKey: "candidate_direction_batch",
        entrypoint: "auto_director_create",
      },
    });

    await this.markCandidateProgress(
      input.workflowTaskId,
      "candidate_title_pack",
      `Rebuilding the title set for "${targetCandidate.workingTitle}"`,
      DIRECTOR_PROGRESS.candidateTitlePack,
    );
    const enrichedCandidate = await enhanceCandidateTitles({
      ...normalizeCandidate(parsed.output, 0),
      id: targetCandidate.id,
      productionFoundation: targetCandidate.productionFoundation,
    }, {
      idea: input.idea,
      count: 1,
      batches: input.previousBatches,
      presets: input.presets ?? [],
      feedback: input.feedback,
      request: input,
      options: input,
    });

    const nextBatch = replaceCandidateInBatch(
      targetBatch,
      enrichedCandidate,
      `Directed revision: ${input.feedback.trim()}`,
    );
    const nextBatches = replaceBatchInList(input.previousBatches, nextBatch);

    if (!input.workflowTaskId?.trim()) {
      return {
        batch: nextBatch,
        candidate: enrichedCandidate,
      };
    }

    const workflowTask = await this.workflowService.bootstrapTask({
      workflowTaskId: input.workflowTaskId,
      lane: "auto_director",
      title: input.title ?? null,
      seedPayload: buildWorkflowSeedPayload(input, {
        batches: nextBatches,
        candidateStage: {
          mode: "patch_candidate",
          presets: input.presets ?? [],
          feedback: input.feedback.trim(),
          batchId: input.batchId,
          candidateId: input.candidateId,
        },
      }),
    });
    await this.workflowService.recordCandidateSelectionRequired(workflowTask.id, {
      summary: `Directed revision for "${targetCandidate.workingTitle}" is done.`,
      seedPayload: buildWorkflowSeedPayload(input, {
        batches: nextBatches,
        candidateStage: {
          mode: "patch_candidate",
          presets: input.presets ?? [],
          feedback: input.feedback.trim(),
          batchId: input.batchId,
          candidateId: input.candidateId,
        },
      }),
    });
    return {
      batch: nextBatch,
      candidate: enrichedCandidate,
      workflowTaskId: workflowTask.id,
    };
  }

  async refineCandidateTitleOptions(input: DirectorCandidateTitleRefineRequest): Promise<DirectorCandidateTitleRefineResponse> {
    if (input.workflowTaskId?.trim()) {
      await this.workflowService.bootstrapTask({
        workflowTaskId: input.workflowTaskId,
        lane: "auto_director",
        title: input.title ?? null,
        seedPayload: buildWorkflowSeedPayload(input, {
          batches: input.previousBatches,
          candidateStage: {
            mode: "refine_titles",
            feedback: input.feedback.trim(),
            batchId: input.batchId,
            candidateId: input.candidateId,
          },
        }),
      });
    }

    const targetBatch = findTargetBatch(input.previousBatches, input.batchId);
    const targetCandidate = findTargetCandidate(targetBatch, input.candidateId);

    await this.markCandidateProgress(
      input.workflowTaskId,
      "candidate_title_pack",
      `Rebuilding the title set for "${targetCandidate.workingTitle}"`,
      DIRECTOR_PROGRESS.candidateTitlePack,
    );

    const response = await titleGenerationService.generateTitleIdeas({
      mode: "brief",
      brief: buildTargetedTitleBrief({
        candidate: targetCandidate,
        idea: input.idea,
        context: input,
        feedback: input.feedback,
      }),
      genreId: input.genreId ?? null,
      count: 4,
      provider: input.provider,
      model: input.model,
      temperature: clampTemperature(input.temperature, 0.85),
    });

    const titleOptions = mergeTitleOptions(response.titles, targetCandidate);
    const nextCandidate: DirectorCandidate = {
      ...targetCandidate,
      workingTitle: titleOptions[0]?.title?.trim() || targetCandidate.workingTitle,
      titleOptions,
    };
    const nextBatch = replaceCandidateInBatch(
      targetBatch,
      nextCandidate,
      `Title-set revision: ${input.feedback.trim()}`,
    );
    const nextBatches = replaceBatchInList(input.previousBatches, nextBatch);

    if (!input.workflowTaskId?.trim()) {
      return {
        batch: nextBatch,
        candidate: nextCandidate,
      };
    }

    const workflowTask = await this.workflowService.bootstrapTask({
      workflowTaskId: input.workflowTaskId,
      lane: "auto_director",
      title: input.title ?? null,
      seedPayload: buildWorkflowSeedPayload(input, {
        batches: nextBatches,
        candidateStage: {
          mode: "refine_titles",
          feedback: input.feedback.trim(),
          batchId: input.batchId,
          candidateId: input.candidateId,
        },
      }),
    });
    await this.workflowService.recordCandidateSelectionRequired(workflowTask.id, {
      summary: `The title set for "${targetCandidate.workingTitle}" was rebuilt from your notes.`,
      seedPayload: buildWorkflowSeedPayload(input, {
        batches: nextBatches,
        candidateStage: {
          mode: "refine_titles",
          feedback: input.feedback.trim(),
          batchId: input.batchId,
          candidateId: input.candidateId,
        },
      }),
    });
    return {
      batch: nextBatch,
      candidate: nextCandidate,
      workflowTaskId: workflowTask.id,
    };
  }
}

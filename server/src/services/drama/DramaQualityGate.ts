import { prisma } from "../../db/prisma";
import { runStructuredPrompt } from "../../prompting/core/promptRunner";
import {
  dramaQualityPrompt,
  type DramaQualityOutput,
} from "../../prompting/prompts/drama/drama.prompts";
import { dramaContextAssembler } from "./DramaContextAssembler";
import {
  describeDramaPaywallPlan,
  resolveDramaPaywallPlan,
} from "./engine/paywallPlanPolicy";
import {
  dramaComplianceService,
  mergeComplianceIntoQuality,
} from "./DramaComplianceService";
import { rhythmEngine } from "./engine/rhythmEngine";
import type { DramaLLMOptions } from "./DramaStrategyService";

interface EpisodeRhythmLite {
  order: number;
  title: string;
  cliffhanger?: string | null;
  emotionNet?: number | null;
  isPaywall?: boolean;
}

type DramaQualityFlag = DramaQualityOutput["flags"][number];

function buildEpisodeRhythmDigest(episodes: EpisodeRhythmLite[], focusOrder: number): string {
  return episodes
    .filter((episode) => episode.order >= focusOrder - 3 && episode.order <= focusOrder + 3)
    .map((episode) => [
      `Episode ${episode.order}"${episode.title}"`,
      episode.isPaywall ? "Pay card points" : "Ordinary set",
      `情绪净值:${episode.emotionNet ?? "待定"}`,
      `结尾:${episode.cliffhanger ?? "待定"}`,
    ].join(" | "))
    .join("\n") || "No neighboring-episode rhythm yet.";
}

function addRepairInstruction(existing: DramaQualityOutput["repairPlan"], flags: DramaQualityFlag[]): DramaQualityOutput["repairPlan"] {
  if (existing) {
    return existing;
  }
  return {
    mode: "patch",
    instruction: flags.map((flag) => flag.suggestion).join("；"),
  };
}

export function applyPaywallQualityRules(
  output: DramaQualityOutput,
  input: {
    episode: EpisodeRhythmLite;
    episodes: EpisodeRhythmLite[];
    strategyJson?: string | null;
    targetEpisodes: number;
  },
): DramaQualityOutput {
  const plan = resolveDramaPaywallPlan(input.strategyJson, input.targetEpisodes);
  const flags: DramaQualityFlag[] = [];
  const isPaywallEpisode = input.episode.isPaywall
    || rhythmEngine.isPaywallEpisode(input.episode.order, input.targetEpisodes, plan);

  if (input.episode.order === plan.firstPaywallAt - 1) {
    const freeStageEpisodes = input.episodes.filter((episode) =>
      episode.order < plan.firstPaywallAt && typeof episode.emotionNet === "number"
    );
    const minEmotionNet = freeStageEpisodes.length
      ? Math.min(...freeStageEpisodes.map((episode) => episode.emotionNet as number))
      : null;
    if (minEmotionNet !== null && typeof input.episode.emotionNet === "number" && input.episode.emotionNet > minEmotionNet) {
      flags.push({
        severity: "high",
        code: "pre_paywall_buildup_not_lowest",
        evidence: `Episode ${input.episode.order} emotion net is ${input.episode.emotionNet}, which is not the pre-paywall low of ${minEmotionNet}.`,
        suggestion: `把Episode ${input.episode.order}结尾改成更强的受压、误解或危机蓄势，让Episode ${plan.firstPaywallAt}Pay card points有更高释放空间。`,
      });
    }
  }

  if (isPaywallEpisode && output.score.paywall < plan.cliffhangerStrengthThreshold) {
    flags.push({
      severity: "high",
      code: "paywall_cliffhanger_below_plan",
      evidence: `Paywall score ${output.score.paywall} is below the planned threshold ${plan.cliffhangerStrengthThreshold}.`,
      suggestion: "Strengthen this episode's ending with an identity reveal, crisis escalation, or a promised reversal, so viewers have a clear reason to pay for the next episode.",
    });
  }

  if (!flags.length) {
    return output;
  }

  const status = output.status === "blocked" ? "blocked" : "repairable";
  return {
    ...output,
    status,
    flags: output.flags.concat(flags),
    repairPlan: status === "repairable" ? addRepairInstruction(output.repairPlan, flags) : output.repairPlan,
  };
}

export class DramaQualityGate {
  async reviewEpisode(projectId: string, episodeOrder: number, options: DramaLLMOptions = {}) {
    const context = await dramaContextAssembler.buildEpisodeContext(projectId, episodeOrder);
    if (!context.episode.content?.trim()) {
      throw new Error(`Episode ${episodeOrder} has no script yet, so the quality gate cannot run.`);
    }
    const paywallPlan = resolveDramaPaywallPlan(context.strategyJson, context.project.targetEpisodes);
    const result = await runStructuredPrompt({
      asset: dramaQualityPrompt,
      promptInput: {
        episodeJson: context.episodeJson,
        content: context.episode.content,
        factsDigest: context.factsDigest,
        charactersDigest: context.charactersDigest,
        strategyJson: context.strategyJson,
        paywallPlanDigest: describeDramaPaywallPlan(paywallPlan),
        episodeRhythmDigest: buildEpisodeRhythmDigest(context.project.episodes, episodeOrder),
      },
      options: {
        provider: options.provider,
        model: options.model,
        temperature: options.temperature ?? 0.2,
      },
    });
    const qualityOutput = applyPaywallQualityRules(result.output, {
      episode: context.episode,
      episodes: context.project.episodes,
      strategyJson: context.strategyJson,
      targetEpisodes: context.project.targetEpisodes,
    });
    const compliance = await dramaComplianceService.checkEpisodeContext(context, options);
    const output = mergeComplianceIntoQuality(qualityOutput, compliance);
    const status = output.status === "approved" ? "approved"
      : output.status === "repairable" || output.status === "blocked" ? "needs_repair"
        : "reviewed";
    await prisma.dramaEpisode.update({
      where: { id: context.episode.id },
      data: {
        status,
        qualityFlags: JSON.stringify(output),
      },
    });
    return output;
  }
}

export const dramaQualityGate = new DramaQualityGate();

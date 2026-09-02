import { randomUUID } from "node:crypto";
import type { CharacterInfluenceProposal } from "@ai-novel/shared/types/characterInfluence";
import { prisma } from "../../../db/prisma";
import { runStructuredPrompt } from "../../../prompting/core/promptRunner";
import {
  buildCharacterInfluenceContextBlocks,
  characterInfluenceOptionsPrompt,
} from "../../../prompting/prompts/novel/characterInfluence.prompts";
import type { CharacterInfluenceOption } from "../../../prompting/prompts/novel/characterInfluence.promptSchemas";

type InfluenceGenerationOptions = {
  provider?: any;
  model?: string;
  temperature?: number;
};

type AcceptInfluenceProposalInput = {
  authorIntent?: string;
  options?: InfluenceGenerationOptions;
};

function compact(value: string | null | undefined, fallback = ""): string {
  return String(value ?? "").replace(/\s+/g, " ").trim() || fallback;
}

function optionalText(value: string | null | undefined): string | null {
  const normalized = compact(value);
  return normalized || null;
}

function parseStringArray(value: string | null | undefined): string[] {
  try {
    const parsed = JSON.parse(value ?? "[]");
    return Array.isArray(parsed)
      ? parsed.map((item) => compact(String(item))).filter(Boolean)
      : [];
  } catch {
    return [];
  }
}

function serialize(row: {
  id: string;
  novelId: string;
  characterId: string;
  proposalSetId: string;
  sourceMindSnapshotId: string | null;
  title: string;
  directionSummary: string;
  recommendationReason: string;
  isRecommended: boolean;
  behaviorGuidance: string;
  emotionalGuidance: string | null;
  relationTension: string | null;
  readerPayoff: string;
  risk: string;
  observableSignalsJson: string;
  evidenceJson: string;
  confidence: number | null;
  authorIntent: string | null;
  targetStartChapterOrder: number;
  targetEndChapterOrder: number;
  status: string;
  acceptedAt: Date | null;
  appliedAt: Date | null;
  resolvedChapterId: string | null;
  resolutionEvidenceJson: string;
  createdAt: Date;
  updatedAt: Date;
}): CharacterInfluenceProposal {
  return {
    id: row.id,
    novelId: row.novelId,
    characterId: row.characterId,
    proposalSetId: row.proposalSetId,
    sourceMindSnapshotId: row.sourceMindSnapshotId,
    title: row.title,
    directionSummary: row.directionSummary,
    recommendationReason: row.recommendationReason,
    isRecommended: row.isRecommended,
    behaviorGuidance: row.behaviorGuidance,
    emotionalGuidance: row.emotionalGuidance,
    relationTension: row.relationTension,
    readerPayoff: row.readerPayoff,
    risk: row.risk,
    observableSignals: parseStringArray(row.observableSignalsJson),
    evidence: parseStringArray(row.evidenceJson),
    confidence: row.confidence,
    authorIntent: row.authorIntent,
    targetStartChapterOrder: row.targetStartChapterOrder,
    targetEndChapterOrder: row.targetEndChapterOrder,
    status: row.status as CharacterInfluenceProposal["status"],
    acceptedAt: row.acceptedAt?.toISOString() ?? null,
    appliedAt: row.appliedAt?.toISOString() ?? null,
    resolvedChapterId: row.resolvedChapterId,
    resolutionEvidence: parseStringArray(row.resolutionEvidenceJson),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function toProposalData(option: CharacterInfluenceOption) {
  return {
    title: option.title,
    directionSummary: option.directionSummary,
    recommendationReason: option.recommendationReason,
    isRecommended: option.isRecommended,
    behaviorGuidance: option.behaviorGuidance,
    emotionalGuidance: optionalText(option.emotionalGuidance),
    relationTension: optionalText(option.relationTension),
    readerPayoff: option.readerPayoff,
    risk: option.risk,
    observableSignalsJson: JSON.stringify(option.observableSignals),
    evidenceJson: JSON.stringify(option.evidence),
    confidence: option.confidence,
  };
}

export class CharacterInfluenceService {
  async listInfluenceProposals(novelId: string, characterId: string): Promise<CharacterInfluenceProposal[]> {
    await this.expireEndedProposals(novelId, characterId);
    const rows = await prisma.characterInfluenceProposal.findMany({
      where: { novelId, characterId },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: 40,
    });
    return rows.map(serialize);
  }

  async generateInfluenceProposals(
    novelId: string,
    characterId: string,
    options: InfluenceGenerationOptions = {},
  ): Promise<CharacterInfluenceProposal[]> {
    await this.expireEndedProposals(novelId, characterId);
    const context = await this.loadPromptContext(novelId, characterId);
    if (!context.mindSnapshot) {
      throw new Error("Ask AI to organize this character's current thinking before preparing the next direction.");
    }
    const sourceMindSnapshotId = context.mindSnapshot.id;
    const window = await this.resolveProposalWindow(novelId);
    const generated = await runStructuredPrompt({
      asset: characterInfluenceOptionsPrompt,
      promptInput: { mode: "generate" },
      contextBlocks: buildCharacterInfluenceContextBlocks(context),
      options: {
        provider: options.provider,
        model: options.model,
        temperature: options.temperature ?? 0.35,
        novelId,
        stage: "character_influence",
        entrypoint: "manual_generate",
      },
    });
    if (generated.output.proposals.length < 2 || generated.output.proposals.length > 3) {
      throw new Error("AI did not provide enough alternatives. Please try again later.");
    }
    const proposalSetId = randomUUID();
    const rows = await prisma.$transaction(async (tx) => {
      await tx.characterInfluenceProposal.updateMany({
        where: { novelId, characterId, status: "draft" },
        data: { status: "superseded" },
      });
      return Promise.all(generated.output.proposals.map((proposal) => tx.characterInfluenceProposal.create({
        data: {
          novelId,
          characterId,
          proposalSetId,
          sourceMindSnapshotId,
          ...toProposalData(proposal),
          targetStartChapterOrder: window.start,
          targetEndChapterOrder: window.end,
          status: "draft",
        },
      })));
    });
    return rows.map(serialize);
  }

  async acceptInfluenceProposal(
    novelId: string,
    characterId: string,
    proposalId: string,
    input: AcceptInfluenceProposalInput = {},
  ): Promise<CharacterInfluenceProposal> {
    await this.expireEndedProposals(novelId, characterId);
    const proposal = await prisma.characterInfluenceProposal.findFirst({
      where: { id: proposalId, novelId, characterId },
    });
    if (!proposal) {
      throw new Error("This character-influence proposal was not found.");
    }
    if (proposal.status !== "draft") {
      throw new Error("This proposal cannot be confirmed in its current state. Choose a pending direction.");
    }

    const authorIntent = input.authorIntent?.trim() || undefined;
    if (authorIntent && authorIntent.length > 160) {
      throw new Error("Keep the additional intent within 160 characters.");
    }
    let refined: CharacterInfluenceOption | null = null;
    if (authorIntent) {
      const context = await this.loadPromptContext(novelId, characterId);
      if (!context.mindSnapshot) {
        throw new Error("Ask AI to organize this character's current thinking before confirming the next direction.");
      }
      const selectedProposal = [
        `Selected direction: ${proposal.title}`,
        `Tendency: ${proposal.directionSummary}`,
        `Behavior guidance: ${proposal.behaviorGuidance}`,
        `Risk: ${proposal.risk}`,
      ].join("\n");
      const result = await runStructuredPrompt({
        asset: characterInfluenceOptionsPrompt,
        promptInput: { mode: "refine" },
        contextBlocks: buildCharacterInfluenceContextBlocks({
          ...context,
          target: `${context.target}\n\n${selectedProposal}`,
          authorIntent,
        }),
        options: {
          provider: input.options?.provider,
          model: input.options?.model,
          temperature: input.options?.temperature ?? 0.3,
          novelId,
          stage: "character_influence",
          entrypoint: "manual_refine",
        },
      });
      if (result.output.proposals.length !== 1) {
        throw new Error("AI did not produce a confirmable character direction. Please try again later.");
      }
      refined = result.output.proposals[0];
    }

    const row = await prisma.$transaction(async (tx) => {
      await tx.characterInfluenceProposal.updateMany({
        where: {
          proposalSetId: proposal.proposalSetId,
          id: { not: proposalId },
          status: "draft",
        },
        data: { status: "superseded" },
      });
      await tx.characterInfluenceProposal.updateMany({
        where: {
          novelId,
          characterId,
          id: { not: proposalId },
          status: "accepted",
          targetStartChapterOrder: { lte: proposal.targetEndChapterOrder },
          targetEndChapterOrder: { gte: proposal.targetStartChapterOrder },
        },
        data: { status: "superseded" },
      });
      return tx.characterInfluenceProposal.update({
        where: { id: proposalId },
        data: {
          ...(refined ? toProposalData(refined) : {}),
          status: "accepted",
          acceptedAt: new Date(),
          authorIntent: authorIntent ?? proposal.authorIntent,
        },
      });
    });
    return serialize(row);
  }

  async dismissInfluenceProposal(
    novelId: string,
    characterId: string,
    proposalId: string,
  ): Promise<CharacterInfluenceProposal> {
    await this.expireEndedProposals(novelId, characterId);
    const proposal = await prisma.characterInfluenceProposal.findFirst({
      where: { id: proposalId, novelId, characterId },
    });
    if (!proposal) {
      throw new Error("This character-influence proposal was not found.");
    }
    if (proposal.status !== "draft" && proposal.status !== "accepted") {
      throw new Error("This proposal cannot be abandoned in its current state.");
    }
    const row = await prisma.characterInfluenceProposal.update({
      where: { id: proposalId },
      data: { status: "dismissed" },
    });
    return serialize(row);
  }

  private async expireEndedProposals(novelId: string, characterId: string): Promise<void> {
    const latestCompletedChapter = await prisma.chapter.findFirst({
      where: { novelId, chapterStatus: "completed" },
      orderBy: { order: "desc" },
      select: { order: true },
    });
    if (!latestCompletedChapter) {
      return;
    }
    await prisma.characterInfluenceProposal.updateMany({
      where: {
        novelId,
        characterId,
        status: { in: ["draft", "accepted"] },
        targetEndChapterOrder: { lt: latestCompletedChapter.order },
      },
      data: { status: "expired" },
    });
  }

  private async resolveProposalWindow(novelId: string): Promise<{ start: number; end: number }> {
    const [nextUnfinished, latestCompleted] = await Promise.all([
      prisma.chapter.findFirst({
        where: { novelId, chapterStatus: { not: "completed" } },
        orderBy: { order: "asc" },
        select: { order: true },
      }),
      prisma.chapter.findFirst({
        where: { novelId, chapterStatus: "completed" },
        orderBy: { order: "desc" },
        select: { order: true },
      }),
    ]);
    const start = nextUnfinished?.order ?? (latestCompleted?.order ?? 0) + 1;
    return { start: Math.max(start, 1), end: Math.max(start, 1) + 2 };
  }

  private async loadPromptContext(novelId: string, characterId: string) {
    const [character, mind, latestState, relations, resources, recentChapters, novel] = await Promise.all([
      prisma.character.findFirst({
        where: { id: characterId, novelId },
        select: {
          id: true, name: true, role: true, storyFunction: true, personality: true, background: true, development: true,
          currentState: true, currentGoal: true, identityLabel: true, factionLabel: true, stanceLabel: true,
          outerGoal: true, innerNeed: true, fear: true, wound: true, misbelief: true, secret: true, moralLine: true,
        },
      }),
      prisma.characterMindSnapshot.findFirst({
        where: { novelId, characterId, isCurrent: true },
        orderBy: { updatedAt: "desc" },
      }),
      prisma.storyStateSnapshot.findFirst({
        where: { novelId },
        orderBy: { updatedAt: "desc" },
        select: {
          summary: true,
          characterStates: {
            where: { characterId },
            select: { currentGoal: true, emotion: true, summary: true, knownFactsJson: true, misbeliefsJson: true },
          },
          informationStates: {
            where: { OR: [{ holderType: "reader" }, { holderRefId: characterId }] },
            select: { holderType: true, fact: true, status: true, summary: true },
            take: 12,
          },
        },
      }),
      prisma.characterRelationStage.findMany({
        where: { novelId, isCurrent: true, OR: [{ sourceCharacterId: characterId }, { targetCharacterId: characterId }] },
        orderBy: { updatedAt: "desc" },
        take: 10,
        include: { sourceCharacter: { select: { name: true } }, targetCharacter: { select: { name: true } } },
      }),
      prisma.characterResourceLedgerItem.findMany({
        where: { novelId, OR: [{ ownerCharacterId: characterId }, { holderCharacterId: characterId }] },
        orderBy: { updatedAt: "desc" },
        take: 10,
        select: { name: true, summary: true, status: true, holderCharacterName: true, ownerName: true, constraintsJson: true },
      }),
      prisma.chapter.findMany({
        where: { novelId, chapterStatus: "completed" },
        orderBy: { order: "desc" },
        take: 2,
        select: { order: true, title: true, content: true },
      }),
      prisma.novel.findUnique({
        where: { id: novelId },
        select: {
          title: true,
          bible: { select: { coreSetting: true, mainPromise: true } },
          storyMacroPlan: { select: { decompositionJson: true, constraintEngineJson: true } },
          bookContract: { select: { coreSellingPoint: true, relationshipMainline: true } },
        },
      }),
    ]);
    if (!character || !novel) {
      throw new Error("This character was not found in the current novel.");
    }
    const state = latestState?.characterStates[0];
    const mindText = mind ? [
      `Current interpretation of the situation: ${mind.currentInterpretation}`,
      `Private intent: ${compact(mind.privateIntent, "Unspecified")}`,
      `Action plan: ${compact(mind.activePlan, "Unspecified")}`,
      `Emotional and action tendency: ${compact(mind.emotionalStance, "Unspecified")} | ${compact(mind.actionTendency, "Unspecified")}`,
      `Possible misbeliefs: ${parseStringArray(mind.misbeliefsJson).join("; ") || "Unspecified"}`,
      `Evidence for inference: ${parseStringArray(mind.evidenceJson).join("; ") || "Not provided"}`,
    ].join("\n") : "";
    const facts = [
      `Novel: ${novel.title}`,
      `Characters: ${character.name} (${character.role})`,
      `Identity/faction/stance: ${compact(character.identityLabel, "unspecified")} | ${compact(character.factionLabel, "unspecified")} | ${compact(character.stanceLabel, "unspecified")}`,
      `Personality and history: ${compact(character.personality, "To be completed")} | ${compact(character.background, "To be completed")} | ${compact(character.development, "To be completed")}`,
      `Goal and situation: ${compact(character.currentGoal, "To be specified")} | ${compact(character.currentState, "To be specified")}`,
      `Internal constraints: ${compact(character.outerGoal, "Unspecified")} | ${compact(character.innerNeed, "Unspecified")} | Fear/wound=${compact(character.fear || character.wound, "Unspecified")} | Moral line=${compact(character.moralLine, "Unspecified")}`,
      `Existing secrets and misbeliefs: ${compact(character.secret, "Unspecified")} | ${compact(character.misbelief, "Unspecified")}`,
      `Book-level constraints: ${compact(novel.bookContract?.coreSellingPoint || novel.bible?.mainPromise, "To be completed")} | ${compact(novel.storyMacroPlan?.decompositionJson || novel.storyMacroPlan?.constraintEngineJson, "To be completed")}`,
      `World rules: ${compact(novel.bible?.coreSetting, "To be completed")}`,
      latestState?.summary ? `Latest canonical state: ${compact(latestState.summary)}` : "",
      state ? `Canonical character state: goal=${compact(state.currentGoal, "Not updated")} | Emotion=${compact(state.emotion, "Not updated")} | Summary=${compact(state.summary, "Not updated")}` : "",
      ...parseStringArray(state?.knownFactsJson).map((fact) => `Known to character: ${fact}`),
      ...parseStringArray(state?.misbeliefsJson).map((fact) => `Character misbelief: ${fact}`),
      ...latestState?.informationStates.map((item) => `${item.holderType} information boundary: ${item.status} | ${item.fact}${item.summary ? ` (${item.summary})` : ""}`) ?? [],
    ].filter(Boolean).join("\n");
    return {
      mindSnapshot: mind,
      target: `Target character: ${character.name}\nProvide only a soft behavioral tendency that future chapters can adopt naturally for this character.`,
      mind: mindText,
      facts,
      relations: [
        ...relations.map((relation) => `${relation.sourceCharacter.name} -> ${relation.targetCharacter.name}: ${relation.stageLabel}; ${relation.stageSummary}${relation.nextTurnPoint ? `; Next turn=${relation.nextTurnPoint}` : ""}`),
        novel.bookContract?.relationshipMainline ? `Book-level relationship mainline: ${novel.bookContract.relationshipMainline}` : "",
      ].filter(Boolean).join("\n"),
      resources: resources.map((item) => `${item.holderCharacterName || item.ownerName || character.name} linked to ${item.name} (${item.status}): ${compact(item.summary)}; Constraints=${compact(item.constraintsJson, "None")}`).join("\n"),
      recentEvents: recentChapters.map((chapter) => `Chapter ${chapter.order}“${chapter.title}”: ${compact(chapter.content).slice(0, 900)}`).join("\n\n"),
    };
  }
}

export const characterInfluenceService = new CharacterInfluenceService();

import type {
  CharacterDialogueInfluence,
  CharacterDialogueSession,
  CharacterDialogueTurn,
  CharacterDialogueTurnResult,
} from "@ai-novel/shared/types/characterDialogue";
import { prisma } from "../../../db/prisma";
import { runStructuredPrompt } from "../../../prompting/core/promptRunner";
import {
  buildCharacterConversationContextBlocks,
  characterConversationTurnPrompt,
} from "../../../prompting/prompts/character/characterConversation.prompts";
import type { CharacterConversationInfluenceDraft } from "../../../prompting/prompts/character/characterConversation.promptSchemas";

type DialogueOptions = {
  provider?: any;
  model?: string;
  temperature?: number;
};

type DialogueSessionRow = {
  id: string;
  novelId: string;
  characterId: string;
  sourceMindSnapshotId: string | null;
  status: string;
  turns: Array<{ id: string; role: string; content: string; createdAt: Date }>;
  influences: Array<DialogueInfluenceRow>;
  createdAt: Date;
  updatedAt: Date;
};

type DialogueInfluenceRow = {
  id: string;
  sessionId: string;
  novelId: string;
  characterId: string;
  sourceMindSnapshotId: string | null;
  summary: string;
  behaviorGuidance: string;
  emotionalGuidance: string | null;
  relationTension: string | null;
  evidenceJson: string;
  confidence: number | null;
  targetStartChapterOrder: number;
  targetEndChapterOrder: number;
  status: string;
  activatedAt: Date | null;
  appliedAt: Date | null;
  resolvedChapterId: string | null;
  resolutionEvidenceJson: string;
  createdAt: Date;
  updatedAt: Date;
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

function serializeTurn(row: { id: string; role: string; content: string; createdAt: Date }): CharacterDialogueTurn {
  return {
    id: row.id,
    role: row.role as CharacterDialogueTurn["role"],
    content: row.content,
    createdAt: row.createdAt.toISOString(),
  };
}

function serializeInfluence(row: DialogueInfluenceRow): CharacterDialogueInfluence {
  return {
    id: row.id,
    sessionId: row.sessionId,
    novelId: row.novelId,
    characterId: row.characterId,
    sourceMindSnapshotId: row.sourceMindSnapshotId,
    summary: row.summary,
    behaviorGuidance: row.behaviorGuidance,
    emotionalGuidance: row.emotionalGuidance,
    relationTension: row.relationTension,
    evidence: parseStringArray(row.evidenceJson),
    confidence: row.confidence,
    targetStartChapterOrder: row.targetStartChapterOrder,
    targetEndChapterOrder: row.targetEndChapterOrder,
    status: row.status as CharacterDialogueInfluence["status"],
    activatedAt: row.activatedAt?.toISOString() ?? null,
    appliedAt: row.appliedAt?.toISOString() ?? null,
    resolvedChapterId: row.resolvedChapterId,
    resolutionEvidence: parseStringArray(row.resolutionEvidenceJson),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function serializeSession(row: DialogueSessionRow): CharacterDialogueSession {
  return {
    id: row.id,
    novelId: row.novelId,
    characterId: row.characterId,
    sourceMindSnapshotId: row.sourceMindSnapshotId,
    status: row.status as CharacterDialogueSession["status"],
    turns: row.turns.map(serializeTurn),
    latestInfluence: row.influences[0] ? serializeInfluence(row.influences[0]) : null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function draftData(draft: CharacterConversationInfluenceDraft) {
  if (!draft) {
    return null;
  }
  return {
    summary: draft.summary,
    behaviorGuidance: draft.behaviorGuidance,
    emotionalGuidance: optionalText(draft.emotionalGuidance),
    relationTension: optionalText(draft.relationTension),
    evidenceJson: JSON.stringify(draft.evidence),
    confidence: draft.confidence,
  };
}

export class CharacterDialogueService {
  async getActiveSession(novelId: string, characterId: string): Promise<CharacterDialogueSession | null> {
    await this.expireEndedInfluences(novelId, characterId);
    const row = await prisma.characterDialogueSession.findFirst({
      where: { novelId, characterId, status: "active" },
      orderBy: { updatedAt: "desc" },
      include: this.sessionInclude(),
    });
    return row ? serializeSession(row as DialogueSessionRow) : null;
  }

  async startSession(novelId: string, characterId: string): Promise<CharacterDialogueSession> {
    const mind = await this.requireCurrentMind(novelId, characterId);
    const row = await prisma.$transaction(async (tx) => {
      await tx.characterDialogueSession.updateMany({
        where: { novelId, characterId, status: "active" },
        data: { status: "archived" },
      });
      return tx.characterDialogueSession.create({
        data: { novelId, characterId, sourceMindSnapshotId: mind.id, status: "active" },
        include: this.sessionInclude(),
      });
    });
    return serializeSession(row as DialogueSessionRow);
  }

  async sendTurn(
    novelId: string,
    characterId: string,
    sessionId: string,
    message: string,
    options: DialogueOptions = {},
  ): Promise<CharacterDialogueTurnResult> {
    const authorMessage = compact(message);
    if (!authorMessage || authorMessage.length > 800) {
      throw new Error("Keep each message to the character within 800 characters.");
    }
    await this.expireEndedInfluences(novelId, characterId);
    const session = await prisma.characterDialogueSession.findFirst({
      where: { id: sessionId, novelId, characterId, status: "active" },
      include: { turns: { orderBy: { createdAt: "asc" }, take: 14 } },
    });
    if (!session) {
      throw new Error("No continuable character conversation was found. Start a new one.");
    }
    const context = await this.loadPromptContext(novelId, characterId, session.turns);
    const result = await runStructuredPrompt({
      asset: characterConversationTurnPrompt,
      promptInput: { interactionPolicy: "novel_influence" },
      contextBlocks: buildCharacterConversationContextBlocks({
        subject: `${context.target}\n${context.mind}`,
        boundaries: context.facts,
        authorMessage,
        situation: [context.relations, context.recentEvents].filter(Boolean).join("\n\n"),
        history: context.history,
      }),
      options: {
        provider: options.provider,
        model: options.model,
        temperature: options.temperature ?? 0.55,
        novelId,
        stage: "character_dialogue",
        entrypoint: "dialogue_turn",
      },
    });
    const window = await this.resolveInfluenceWindow(novelId);
    const influenceData = draftData(result.output.influenceDraft);
    const persisted = await prisma.$transaction(async (tx) => {
      await tx.characterDialogueTurn.createMany({
        data: [
          { sessionId, role: "author", content: authorMessage },
          { sessionId, role: "character", content: result.output.characterReply },
        ],
      });
      if (influenceData) {
        await tx.characterDialogueInfluence.updateMany({
          where: { sessionId, status: "draft" },
          data: { status: "superseded" },
        });
        await tx.characterDialogueInfluence.create({
          data: {
            novelId,
            characterId,
            sessionId,
            sourceMindSnapshotId: context.mindSnapshot.id,
            ...influenceData,
            targetStartChapterOrder: window.start,
            targetEndChapterOrder: window.end,
            status: "draft",
          },
        });
      }
      return tx.characterDialogueSession.findUniqueOrThrow({
        where: { id: sessionId },
        include: this.sessionInclude(),
      });
    });
    const serialized = serializeSession(persisted as DialogueSessionRow);
    const characterTurn = serialized.turns.at(-1);
    if (!characterTurn || characterTurn.role !== "character") {
      throw new Error("The character reply was not saved. Please try again.");
    }
    return { session: serialized, characterTurn, influence: serialized.latestInfluence };
  }

  async activateLatestDraftInfluence(
    novelId: string,
    characterId: string,
    sessionId: string,
  ): Promise<CharacterDialogueInfluence> {
    await this.expireEndedInfluences(novelId, characterId);
    const draft = await prisma.characterDialogueInfluence.findFirst({
      where: { novelId, characterId, sessionId, status: "draft" },
      orderBy: { createdAt: "desc" },
    });
    if (!draft) {
      throw new Error("This conversation has no character-action inclination waiting for confirmation.");
    }
    const row = await prisma.$transaction(async (tx) => {
      await tx.characterDialogueInfluence.updateMany({
        where: {
          novelId,
          characterId,
          id: { not: draft.id },
          status: "active",
          targetStartChapterOrder: { lte: draft.targetEndChapterOrder },
          targetEndChapterOrder: { gte: draft.targetStartChapterOrder },
        },
        data: { status: "superseded" },
      });
      return tx.characterDialogueInfluence.update({
        where: { id: draft.id },
        data: { status: "active", activatedAt: new Date() },
      });
    });
    return serializeInfluence(row as DialogueInfluenceRow);
  }

  async dismissLatestDraftInfluence(
    novelId: string,
    characterId: string,
    sessionId: string,
  ): Promise<CharacterDialogueInfluence> {
    const draft = await prisma.characterDialogueInfluence.findFirst({
      where: { novelId, characterId, sessionId, status: "draft" },
      orderBy: { createdAt: "desc" },
    });
    if (!draft) {
      throw new Error("This conversation has no pending-confirmation inclination that can be dropped.");
    }
    const row = await prisma.characterDialogueInfluence.update({
      where: { id: draft.id },
      data: { status: "dismissed" },
    });
    return serializeInfluence(row as DialogueInfluenceRow);
  }

  private sessionInclude() {
    return {
      turns: { orderBy: { createdAt: "asc" as const } },
      influences: { orderBy: { createdAt: "desc" as const }, take: 1 },
    };
  }

  private async requireCurrentMind(novelId: string, characterId: string) {
    const mind = await prisma.characterMindSnapshot.findFirst({
      where: { novelId, characterId, isCurrent: true },
      orderBy: { updatedAt: "desc" },
    });
    if (!mind) {
      throw new Error("Let AI gather this character's current thoughts before starting the conversation.");
    }
    return mind;
  }

  private async expireEndedInfluences(novelId: string, characterId: string): Promise<void> {
    const latestCompletedChapter = await prisma.chapter.findFirst({
      where: { novelId, chapterStatus: "completed" },
      orderBy: { order: "desc" },
      select: { order: true },
    });
    if (!latestCompletedChapter) {
      return;
    }
    await prisma.characterDialogueInfluence.updateMany({
      where: {
        novelId,
        characterId,
        status: { in: ["draft", "active"] },
        targetEndChapterOrder: { lt: latestCompletedChapter.order },
      },
      data: { status: "expired" },
    });
  }

  private async resolveInfluenceWindow(novelId: string): Promise<{ start: number; end: number }> {
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

  private async loadPromptContext(
    novelId: string,
    characterId: string,
    turns: Array<{ role: string; content: string }>,
  ) {
    const [character, mindSnapshot, latestState, relations, resources, recentChapters, novel] = await Promise.all([
      prisma.character.findFirst({
        where: { id: characterId, novelId },
        select: {
          id: true, name: true, role: true, storyFunction: true, personality: true, background: true, development: true,
          currentState: true, currentGoal: true, identityLabel: true, factionLabel: true, stanceLabel: true,
          outerGoal: true, innerNeed: true, fear: true, wound: true, misbelief: true, secret: true, moralLine: true,
        },
      }),
      this.requireCurrentMind(novelId, characterId),
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
    const mind = [
      `How they currently read the situation: ${mindSnapshot.currentInterpretation}`,
      `Private intent: ${compact(mindSnapshot.privateIntent, "unclear")}`,
      `Action plan: ${compact(mindSnapshot.activePlan, "unclear")}`,
      `Emotion and action tendencies: ${compact(mindSnapshot.emotionalStance, "unclear")} | ${compact(mindSnapshot.actionTendency, "unclear")}`,
      `Possible misjudgment: ${parseStringArray(mindSnapshot.misbeliefsJson).join("; ") || "unclear"}`,
      `Inference basis: ${parseStringArray(mindSnapshot.evidenceJson).join("; ") || "not provided"}`,
    ].join("\n");
    const facts = [
      `Novel: ${novel.title}`,
      `Character: ${character.name} (${character.role})`,
      `Identity / faction / stance: ${compact(character.identityLabel, "unspecified")} | ${compact(character.factionLabel, "unspecified")} | ${compact(character.stanceLabel, "unspecified")}`,
      `Personality and history: ${compact(character.personality, "to be filled")} | ${compact(character.background, "to be filled")} | ${compact(character.development, "to be filled")}`,
      `Goal and situation: ${compact(character.currentGoal, "to be clarified")} | ${compact(character.currentState, "to be clarified")}`,
      `Inner constraints: ${compact(character.outerGoal, "unclear")} | ${compact(character.innerNeed, "unclear")} | fear/wound=${compact(character.fear || character.wound, "unclear")} | moral line=${compact(character.moralLine, "unclear")}`,
      `Secret and misbelief: ${compact(character.secret, "unclear")} | ${compact(character.misbelief, "unclear")}`,
      `Book-level constraints: ${compact(novel.bookContract?.coreSellingPoint || novel.bible?.mainPromise, "to be filled")} | ${compact(novel.storyMacroPlan?.decompositionJson || novel.storyMacroPlan?.constraintEngineJson, "to be filled")}`,
      `World rules: ${compact(novel.bible?.coreSetting, "to be filled")}`,
      latestState?.summary ? `Latest canon state: ${compact(latestState.summary)}` : "",
      state ? `Character canon status: goal=${compact(state.currentGoal, "not updated")} | emotion=${compact(state.emotion, "not updated")} | summary=${compact(state.summary, "not updated")}` : "",
      ...parseStringArray(state?.knownFactsJson).map((fact) => `Character knows: ${fact}`),
      ...parseStringArray(state?.misbeliefsJson).map((fact) => `Character already misbelieves: ${fact}`),
      ...(latestState?.informationStates.map((item) => `${item.holderType} information boundary: ${item.status} | ${item.fact}${item.summary ? ` (${item.summary})` : ""}`) ?? []),
      ...resources.map((item) => `${item.holderCharacterName || item.ownerName || character.name} relates to ${item.name} (${item.status}): ${compact(item.summary)}; constraints=${compact(item.constraintsJson, "none")}`),
    ].filter(Boolean).join("\n");
    return {
      mindSnapshot,
      target: `Target character: ${character.name} (${character.role})\nAlways answer the author from this character's knowledge and stance.`,
      mind,
      facts,
      relations: [
        ...relations.map((relation) => `${relation.sourceCharacter.name} -> ${relation.targetCharacter.name}: ${relation.stageLabel}; ${relation.stageSummary}${relation.nextTurnPoint ? `; next turn=${relation.nextTurnPoint}` : ""}`),
        novel.bookContract?.relationshipMainline ? `Book-level relationship main line: ${novel.bookContract.relationshipMainline}` : "",
      ].filter(Boolean).join("\n"),
      recentEvents: recentChapters.map((chapter) => `Chapter ${chapter.order} "${chapter.title}": ${compact(chapter.content).slice(0, 900)}`).join("\n\n"),
      history: turns.slice(-12).map((turn) => `${turn.role === "author" ? "Author" : character.name}: ${compact(turn.content)}`).join("\n"),
    };
  }
}

export const characterDialogueService = new CharacterDialogueService();

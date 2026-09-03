import type {
  Character,
  CharacterGender,
  CharacterCastRole,
  SupplementalCharacterApplyResult,
  SupplementalCharacterCandidate,
  SupplementalCharacterGenerateInput,
  SupplementalCharacterGenerationResult,
} from "@ai-novel/shared/types/novel";
import { prisma } from "../../../db/prisma";
import { runStructuredPrompt } from "../../../prompting/core/promptRunner";
import { buildSupplementalCharacterContextBlocks } from "../../../prompting/prompts/novel/characterPreparation.contextBlocks";
import {
  supplementalCharacterPrompt,
} from "../../../prompting/prompts/novel/characterPreparation.prompts";
import { NovelContextService } from "../NovelContextService";
import { CharacterDynamicsService } from "../dynamics/CharacterDynamicsService";
import {
  supplementalCharacterCandidateSchema,
  type SupplementalCharacterGenerationResponseParsed,
} from "../../../prompting/prompts/novel/characterPreparation.promptSchemas";
import { buildStoryModePromptBlock, normalizeStoryModeOutput } from "../../storyMode/storyModeProfile";
import { parseCharacterProhibitionsJson } from "../characters/characterHardFacts";
import { WorldContextGateway } from "../worldContext/WorldContextGateway";
import { characterMindService } from "../characterMind/CharacterMindService";

type CharacterRowForOutput = Awaited<ReturnType<typeof prisma.character.create>>;

const SUPPLEMENTAL_MODE_PROMPT_LABELS: Record<NonNullable<SupplementalCharacterGenerateInput["mode"]>, string> = {
  auto: "Let AI choose the most useful way to fill the cast gap",
  linked: "Create a relationship-driven character connected to the existing cast",
  independent: "Create a relatively independent character with a clear story function",
};

const CAST_ROLE_PROMPT_LABELS: Record<CharacterCastRole | "auto", string> = {
  auto: "Let AI choose",
  protagonist: "Protagonist",
  antagonist: "Primary antagonist",
  ally: "Ally",
  foil: "Foil",
  mentor: "Mentor",
  love_interest: "Relationship focus",
  pressure_source: "Pressure source",
  catalyst: "Catalyst",
};

function getCastRolePromptLabel(castRole: string | null | undefined): string {
  if (!castRole) {
    return "Not specified";
  }
  if (castRole in CAST_ROLE_PROMPT_LABELS) {
    return CAST_ROLE_PROMPT_LABELS[castRole as CharacterCastRole | "auto"];
  }
  return castRole;
}

function toOptionalText(value: string | null | undefined): string | null {
  const normalized = value?.trim() ?? "";
  return normalized || null;
}

function serializeCharacter(row: CharacterRowForOutput): Character {
  return {
    id: row.id,
    name: row.name,
    role: row.role,
    gender: row.gender as CharacterGender | null,
    castRole: row.castRole as CharacterCastRole | null,
    storyFunction: row.storyFunction,
    relationToProtagonist: row.relationToProtagonist,
    personality: row.personality,
    background: row.background,
    development: row.development,
    identityLabel: row.identityLabel,
    factionLabel: row.factionLabel,
    stanceLabel: row.stanceLabel,
    powerLevel: row.powerLevel,
    realm: row.realm,
    currentLocation: row.currentLocation,
    availability: row.availability,
    prohibitions: parseCharacterProhibitionsJson(row.prohibitionsJson),
    prohibitionsJson: row.prohibitionsJson,
    outerGoal: row.outerGoal,
    innerNeed: row.innerNeed,
    fear: row.fear,
    wound: row.wound,
    misbelief: row.misbelief,
    secret: row.secret,
    moralLine: row.moralLine,
    firstImpression: row.firstImpression,
    arcStart: row.arcStart,
    arcMidpoint: row.arcMidpoint,
    arcClimax: row.arcClimax,
    arcEnd: row.arcEnd,
    currentState: row.currentState,
    currentGoal: row.currentGoal,
    lastEvolvedAt: row.lastEvolvedAt?.toISOString() ?? null,
    novelId: row.novelId,
    baseCharacterId: row.baseCharacterId,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function toPromptFallback(value: string | null | undefined, fallback: string): string {
  const normalized = value?.trim();
  return normalized && normalized.length > 0 ? normalized : fallback;
}

export class CharacterPreparationSupplementalService {
  constructor(
    private readonly novelContextService: NovelContextService,
    private readonly characterDynamicsService: CharacterDynamicsService,
    private readonly worldContextGateway = new WorldContextGateway(),
  ) {}

  async generateSupplementalCharacters(
    novelId: string,
    options: SupplementalCharacterGenerateInput = {},
  ): Promise<SupplementalCharacterGenerationResult> {
    const mode = options.mode ?? "auto";
    const novel = await prisma.novel.findUnique({
      where: { id: novelId },
      include: {
        genre: { select: { name: true } },
        bible: {
          select: {
            coreSetting: true,
            mainPromise: true,
            characterArcs: true,
          },
        },
        storyMacroPlan: {
          select: {
            storyInput: true,
            decompositionJson: true,
            constraintEngineJson: true,
          },
        },
        primaryStoryMode: {
          select: {
            id: true,
            name: true,
            description: true,
            template: true,
            parentId: true,
            profileJson: true,
            createdAt: true,
            updatedAt: true,
          },
        },
        secondaryStoryMode: {
          select: {
            id: true,
            name: true,
            description: true,
            template: true,
            parentId: true,
            profileJson: true,
            createdAt: true,
            updatedAt: true,
          },
        },
        characters: {
          orderBy: { createdAt: "asc" },
          select: {
            id: true,
            name: true,
            role: true,
            gender: true,
            castRole: true,
            storyFunction: true,
            relationToProtagonist: true,
            personality: true,
            background: true,
            development: true,
            identityLabel: true,
            factionLabel: true,
            stanceLabel: true,
            powerLevel: true,
            realm: true,
            currentLocation: true,
            availability: true,
            prohibitionsJson: true,
            outerGoal: true,
            currentState: true,
            currentGoal: true,
          },
        },
        characterRelations: {
          orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
          include: {
            sourceCharacter: { select: { id: true, name: true } },
            targetCharacter: { select: { id: true, name: true } },
          },
        },
      },
    });

    if (!novel) {
      throw new Error("Novel not found.");
    }

    const anchorIds = Array.from(new Set((options.anchorCharacterIds ?? []).filter(Boolean)));
    const storyInput = novel.storyMacroPlan?.storyInput?.trim() || novel.description?.trim() || "";
    const worldContext = options.useWorldContext === false
      ? null
      : await this.worldContextGateway.getWorldContextBlock(novelId, {
        purpose: "character",
        strength: "normal",
        storyInput,
        provider: options.provider,
        model: options.model,
        temperature: options.temperature,
      });
    const storyModeBlock = buildStoryModePromptBlock({
      primary: novel.primaryStoryMode ? normalizeStoryModeOutput(novel.primaryStoryMode) : null,
      secondary: novel.secondaryStoryMode ? normalizeStoryModeOutput(novel.secondaryStoryMode) : null,
    });
    const anchorCharacters = novel.characters.filter((character) => anchorIds.includes(character.id));
    const relevantRelations = anchorCharacters.length > 0
      ? novel.characterRelations.filter(
        (relation) => anchorIds.includes(relation.sourceCharacterId) || anchorIds.includes(relation.targetCharacterId),
      )
      : novel.characterRelations.slice(0, 12);
    const targetCountText = typeof options.count === "number"
      ? `Generate exactly ${options.count} candidate character(s) in this run.`
      : "When the user does not specify a count, infer whether the cast needs one, two, or three candidates and place that number in recommendedCount.";
    const contextBlocks = buildSupplementalCharacterContextBlocks({
      projectTitle: novel.title,
      modeLabel: `${mode} (${SUPPLEMENTAL_MODE_PROMPT_LABELS[mode]})`,
      targetRoleLabel: `${options.targetCastRole ?? "auto"} (${getCastRolePromptLabel(options.targetCastRole ?? "auto")})`,
      requestedCountText: targetCountText,
      userPrompt: toPromptFallback(options.userPrompt, "None"),
      storyInput: toPromptFallback(
        novel.storyMacroPlan?.storyInput?.trim() || novel.description?.trim(),
        "No explicit story input is available. Infer the most useful cast addition from the genre, story world, and existing characters.",
      ),
      genreName: novel.genre?.name ?? "Not specified",
      storyModeBlock,
      styleTone: novel.styleTone ?? "Not specified",
      narrativePov: novel.narrativePov ?? "Not specified",
      pacePreference: novel.pacePreference ?? "Not specified",
      emotionIntensity: novel.emotionIntensity ?? "Not specified",
      corePromise: novel.bible?.mainPromise ?? "None",
      coreSetting: novel.bible?.coreSetting ?? "None",
      characterArcs: novel.bible?.characterArcs ?? "None",
      worldRules: worldContext?.worldRulesText ?? "None",
      worldStage: worldContext?.worldStageText ?? "The story world is not yet organized. Infer the character's stage from the story input and book-level constraints.",
      worldFocusHints: options.useWorldContext === false ? null : options.worldFocusHints,
      storyDecomposition: novel.storyMacroPlan?.decompositionJson ?? "None",
      constraintEngine: novel.storyMacroPlan?.constraintEngineJson ?? "None",
      existingCharactersText: novel.characters.length > 0
        ? novel.characters
          .map((character) => [
            `${character.name} (${character.role})`,
            character.castRole ? `castRole=${getCastRolePromptLabel(character.castRole)} (${character.castRole})` : "",
            character.storyFunction ? `storyFunction=${character.storyFunction}` : "",
            character.relationToProtagonist ? `relationToProtagonist=${character.relationToProtagonist}` : "",
            character.personality ? `personality=${character.personality}` : "",
            character.background ? `background=${character.background}` : "",
            character.development ? `development=${character.development}` : "",
            character.identityLabel ? `identity=${character.identityLabel}` : "",
            character.factionLabel ? `faction=${character.factionLabel}` : "",
            character.stanceLabel ? `stance=${character.stanceLabel}` : "",
            character.powerLevel ? `powerLevel=${character.powerLevel}` : "",
            character.realm ? `realm=${character.realm}` : "",
            character.currentLocation ? `location=${character.currentLocation}` : "",
            character.availability ? `availability=${character.availability}` : "",
            character.prohibitionsJson ? `prohibitions=${parseCharacterProhibitionsJson(character.prohibitionsJson).join(" / ")}` : "",
            character.outerGoal ? `outerGoal=${character.outerGoal}` : "",
            character.currentState ? `currentState=${character.currentState}` : "",
            character.currentGoal ? `currentGoal=${character.currentGoal}` : "",
          ].filter(Boolean).join(" | "))
          .join("\n")
        : "No characters have been created yet.",
      anchorCharactersText: anchorCharacters.length > 0
        ? anchorCharacters
          .map((character) => [
            `${character.name} (${character.role})`,
            character.storyFunction ? `storyFunction=${character.storyFunction}` : "",
            character.relationToProtagonist ? `relationToProtagonist=${character.relationToProtagonist}` : "",
            character.identityLabel ? `identity=${character.identityLabel}` : "",
            character.factionLabel ? `faction=${character.factionLabel}` : "",
            character.powerLevel ? `powerLevel=${character.powerLevel}` : "",
            character.currentState ? `currentState=${character.currentState}` : "",
            character.currentGoal ? `currentGoal=${character.currentGoal}` : "",
          ].filter(Boolean).join(" | "))
          .join("\n")
        : "No anchor character was selected.",
      relationsText: relevantRelations.length > 0
        ? relevantRelations
          .map((relation) => [
            `${relation.sourceCharacter.name} -> ${relation.targetCharacter.name}`,
            `surfaceRelation=${relation.surfaceRelation}`,
            relation.hiddenTension ? `hiddenTension=${relation.hiddenTension}` : "",
            relation.conflictSource ? `conflictSource=${relation.conflictSource}` : "",
            relation.dynamicLabel ? `dynamicLabel=${relation.dynamicLabel}` : "",
            relation.nextTurnPoint ? `nextTurnPoint=${relation.nextTurnPoint}` : "",
          ].filter(Boolean).join(" | "))
          .join("\n")
        : "None.",
      forbiddenNames: novel.characters.map((character) => character.name),
    });

    const result = await runStructuredPrompt({
      asset: supplementalCharacterPrompt,
      promptInput: {},
      contextBlocks,
      options: {
        provider: options.provider,
        model: options.model,
        temperature: options.temperature ?? 0.55,
      },
    });
    const parsed = result.output;

    const requestedCount = typeof options.count === "number" ? options.count : null;
    const normalizedCandidates = (requestedCount ? parsed.candidates.slice(0, requestedCount) : parsed.candidates)
      .map((candidate) => supplementalCharacterCandidateSchema.parse(candidate))
      .slice(0, 3);

    return {
      mode: parsed.mode,
      recommendedCount: requestedCount ?? Math.min(Math.max(parsed.recommendedCount, 1), normalizedCandidates.length || 1),
      planningSummary: toOptionalText(parsed.planningSummary),
      candidates: normalizedCandidates.map((candidate) => ({
        name: candidate.name,
        role: candidate.role,
        gender: candidate.gender,
        castRole: candidate.castRole,
        summary: candidate.summary,
        storyFunction: candidate.storyFunction,
        relationToProtagonist: toOptionalText(candidate.relationToProtagonist),
        personality: toOptionalText(candidate.personality),
        background: toOptionalText(candidate.background),
        development: toOptionalText(candidate.development),
        identityLabel: toOptionalText(candidate.identityLabel),
        factionLabel: toOptionalText(candidate.factionLabel),
        stanceLabel: toOptionalText(candidate.stanceLabel),
        powerLevel: toOptionalText(candidate.powerLevel),
        realm: toOptionalText(candidate.realm),
        currentLocation: toOptionalText(candidate.currentLocation),
        availability: toOptionalText(candidate.availability),
        prohibitions: candidate.prohibitions,
        outerGoal: toOptionalText(candidate.outerGoal),
        innerNeed: toOptionalText(candidate.innerNeed),
        fear: toOptionalText(candidate.fear),
        wound: toOptionalText(candidate.wound),
        misbelief: toOptionalText(candidate.misbelief),
        secret: toOptionalText(candidate.secret),
        moralLine: toOptionalText(candidate.moralLine),
        firstImpression: toOptionalText(candidate.firstImpression),
        currentState: toOptionalText(candidate.currentState),
        currentGoal: toOptionalText(candidate.currentGoal),
        whyNow: toOptionalText(candidate.whyNow),
        relations: candidate.relations.map((relation) => ({
          sourceName: relation.sourceName,
          targetName: relation.targetName,
          surfaceRelation: relation.surfaceRelation,
          hiddenTension: toOptionalText(relation.hiddenTension),
          conflictSource: toOptionalText(relation.conflictSource),
          dynamicLabel: toOptionalText(relation.dynamicLabel),
          nextTurnPoint: toOptionalText(relation.nextTurnPoint),
        })),
      })),
    };
  }

  async applySupplementalCharacter(
    novelId: string,
    candidate: SupplementalCharacterCandidate,
  ): Promise<SupplementalCharacterApplyResult> {
    const parsedCandidate = supplementalCharacterCandidateSchema.parse(candidate);
    const existingCharacters = await prisma.character.findMany({
      where: { novelId },
      select: { id: true, name: true },
      orderBy: { createdAt: "asc" },
    });

    if (existingCharacters.some((character) => character.name === parsedCandidate.name)) {
      throw new Error(`A character named "${parsedCandidate.name}" already exists. Generate another candidate or rename it before creating the character.`);
    }

    const created = await this.novelContextService.createCharacter(novelId, {
      name: parsedCandidate.name,
      role: parsedCandidate.role,
      gender: parsedCandidate.gender,
      castRole: parsedCandidate.castRole,
      storyFunction: parsedCandidate.storyFunction,
      relationToProtagonist: toOptionalText(parsedCandidate.relationToProtagonist) ?? undefined,
      personality: toOptionalText(parsedCandidate.personality) ?? undefined,
      background: toOptionalText(parsedCandidate.background) ?? undefined,
      development: toOptionalText(parsedCandidate.development) ?? undefined,
      identityLabel: toOptionalText(parsedCandidate.identityLabel) ?? undefined,
      factionLabel: toOptionalText(parsedCandidate.factionLabel) ?? undefined,
      stanceLabel: toOptionalText(parsedCandidate.stanceLabel) ?? undefined,
      powerLevel: toOptionalText(parsedCandidate.powerLevel) ?? undefined,
      realm: toOptionalText(parsedCandidate.realm) ?? undefined,
      currentLocation: toOptionalText(parsedCandidate.currentLocation) ?? undefined,
      availability: toOptionalText(parsedCandidate.availability) ?? undefined,
      prohibitions: parsedCandidate.prohibitions,
      outerGoal: toOptionalText(parsedCandidate.outerGoal) ?? undefined,
      innerNeed: toOptionalText(parsedCandidate.innerNeed) ?? undefined,
      fear: toOptionalText(parsedCandidate.fear) ?? undefined,
      wound: toOptionalText(parsedCandidate.wound) ?? undefined,
      misbelief: toOptionalText(parsedCandidate.misbelief) ?? undefined,
      secret: toOptionalText(parsedCandidate.secret) ?? undefined,
      moralLine: toOptionalText(parsedCandidate.moralLine) ?? undefined,
      firstImpression: toOptionalText(parsedCandidate.firstImpression) ?? undefined,
      currentState: toOptionalText(parsedCandidate.currentState) ?? undefined,
      currentGoal: toOptionalText(parsedCandidate.currentGoal) ?? undefined,
    });

    const characterIdByName = new Map(existingCharacters.map((character) => [character.name, character.id]));
    characterIdByName.set(created.name, created.id);

    const seenRelationKeys = new Set<string>();
    let relationCount = 0;
    for (const relation of parsedCandidate.relations) {
      const sourceCharacterId = characterIdByName.get(relation.sourceName);
      const targetCharacterId = characterIdByName.get(relation.targetName);
      if (!sourceCharacterId || !targetCharacterId || sourceCharacterId === targetCharacterId) {
        continue;
      }
      const relationKey = `${sourceCharacterId}:${targetCharacterId}`;
      if (seenRelationKeys.has(relationKey)) {
        continue;
      }
      seenRelationKeys.add(relationKey);
      await prisma.characterRelation.upsert({
        where: {
          novelId_sourceCharacterId_targetCharacterId: {
            novelId,
            sourceCharacterId,
            targetCharacterId,
          },
        },
        create: {
          novelId,
          sourceCharacterId,
          targetCharacterId,
          surfaceRelation: relation.surfaceRelation,
          hiddenTension: toOptionalText(relation.hiddenTension),
          conflictSource: toOptionalText(relation.conflictSource),
          dynamicLabel: toOptionalText(relation.dynamicLabel),
          nextTurnPoint: toOptionalText(relation.nextTurnPoint),
        },
        update: {
          surfaceRelation: relation.surfaceRelation,
          hiddenTension: toOptionalText(relation.hiddenTension),
          conflictSource: toOptionalText(relation.conflictSource),
          dynamicLabel: toOptionalText(relation.dynamicLabel),
          nextTurnPoint: toOptionalText(relation.nextTurnPoint),
        },
      });
      relationCount += 1;
    }

    await this.characterDynamicsService.rebuildDynamics(novelId, {
      sourceType: "supplemental_character_projection",
    }).catch(() => null);

    void characterMindService.bootstrapMindStates(novelId, [created.id]).catch((error) => {
      console.warn("[supplemental-character] failed to bootstrap character mind state", {
        novelId,
        characterId: created.id,
        error,
      });
    });

    return {
      character: serializeCharacter(created),
      relationCount,
    };
  }
}

import type {
  Character,
  CharacterVisibleProfileApplyResult,
  CharacterVisibleProfileBatchResult,
  CharacterVisibleProfileField,
  CharacterVisibleProfileFields,
  CharacterVisibleProfileSuggestion,
} from "@ai-novel/shared/types/novel";
import { prisma } from "../../../db/prisma";
import { runStructuredPrompt } from "../../../prompting/core/promptRunner";
import { characterVisibleProfileCompletionPrompt } from "../../../prompting/prompts/novel/characterVisibleProfile.prompts";
import { normalizeStoryModeOutput, buildStoryModePromptBlock } from "../../storyMode/storyModeProfile";
import type { LLMGenerateOptions } from "../novelCoreShared";
import { WorldContextGateway } from "../worldContext/WorldContextGateway";

export interface CharacterVisibleProfileGenerateOptions extends LLMGenerateOptions {
  userGuidance?: string;
  overwriteExisting?: boolean;
}

interface CharacterVisibleProfileApplyOptions {
  overwriteExisting?: boolean;
}

export const VISIBLE_PROFILE_FIELDS: CharacterVisibleProfileField[] = [
  "appearance",
  "physique",
  "attireStyle",
  "signatureDetail",
  "voiceTexture",
  "presenceImpression",
];

const FIELD_LABELS: Record<CharacterVisibleProfileField, string> = {
  appearance: "Appearance memory point",
  physique: "body base",
  attireStyle: "common wear",
  signatureDetail: "Signature detail",
  voiceTexture: "tone of voice",
  presenceImpression: "First impression",
};

const GENERIC_VISIBLE_PROFILE_PATTERN = /^(暂无|待补全|无|未知|很好看|很漂亮|气质很好|气质独特|很有辨识度|身材匀称|清冷|温柔|帅气|美丽|普通|不详)$/;

type CharacterRow = {
  id: string;
  name: string;
  role: string;
  gender?: string | null;
  castRole?: string | null;
  storyFunction?: string | null;
  relationToProtagonist?: string | null;
  personality?: string | null;
  background?: string | null;
  development?: string | null;
  outerGoal?: string | null;
  innerNeed?: string | null;
  fear?: string | null;
  wound?: string | null;
  misbelief?: string | null;
  secret?: string | null;
  moralLine?: string | null;
  firstImpression?: string | null;
} & Record<CharacterVisibleProfileField, string | null | undefined>;

function compactText(value: string | null | undefined, limit = 500): string {
  const normalized = String(value ?? "").replace(/\s+/g, " ").trim();
  if (!normalized) {
    return "";
  }
  return normalized.length > limit ? `${normalized.slice(0, limit)}...` : normalized;
}

function normalizeVisibleProfileText(value: string | null | undefined): string {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

export function isVagueVisibleProfileText(value: string | null | undefined): boolean {
  const normalized = normalizeVisibleProfileText(value);
  if (!normalized) {
    return true;
  }
  if (normalized.length < 6) {
    return true;
  }
  return GENERIC_VISIBLE_PROFILE_PATTERN.test(normalized);
}

export function pickApplicableVisibleProfileFields(input: {
  existing: CharacterVisibleProfileFields;
  suggested: CharacterVisibleProfileFields;
  overwriteExisting?: boolean;
}): {
  fields: CharacterVisibleProfileFields;
  skippedFields: Partial<Record<CharacterVisibleProfileField, string>>;
} {
  const fields: CharacterVisibleProfileFields = {};
  const skippedFields: Partial<Record<CharacterVisibleProfileField, string>> = {};

  for (const field of VISIBLE_PROFILE_FIELDS) {
    const existingText = normalizeVisibleProfileText(input.existing[field]);
    const suggestedText = normalizeVisibleProfileText(input.suggested[field]);
    if (existingText && !isVagueVisibleProfileText(existingText)) {
      if (!input.overwriteExisting) {
        skippedFields[field] = "Clear materials already exist";
        continue;
      }
    }
    if (!suggestedText || isVagueVisibleProfileText(suggestedText)) {
      skippedFields[field] = "The AI suggestion is not specific enough";
      continue;
    }
    fields[field] = suggestedText;
  }

  return { fields, skippedFields };
}

function buildCharacterProfileText(character: CharacterRow): string {
  return [
    `姓名：${character.name}`,
    `定位：${character.role}`,
    character.gender ? `性别：${character.gender}` : "",
    character.castRole ? `阵容功能：${character.castRole}` : "",
    character.storyFunction ? `Story function:${character.storyFunction}` : "",
    character.relationToProtagonist ? `Relationship with the protagonist:${character.relationToProtagonist}` : "",
    character.personality ? `性格：${compactText(character.personality, 180)}` : "",
    character.background ? `背景：${compactText(character.background, 180)}` : "",
    character.development ? `成长弧：${compactText(character.development, 180)}` : "",
    character.outerGoal ? `External goals:${compactText(character.outerGoal, 120)}` : "",
    character.innerNeed ? `Inner need：${compactText(character.innerNeed, 120)}` : "",
    character.fear ? `恐惧：${compactText(character.fear, 100)}` : "",
    character.wound ? `伤口：${compactText(character.wound, 100)}` : "",
    character.misbelief ? `False belief:${compactText(character.misbelief, 100)}` : "",
    character.secret ? `隐藏秘密：${compactText(character.secret, 100)}` : "",
    character.moralLine ? `moral bottom line：${compactText(character.moralLine, 100)}` : "",
    character.firstImpression ? `首次印象：${compactText(character.firstImpression, 120)}` : "",
  ].filter(Boolean).join("\n");
}

function buildExistingVisibleProfileText(character: CharacterRow): string {
  return VISIBLE_PROFILE_FIELDS
    .map((field) => {
      const text = normalizeVisibleProfileText(character[field]);
      return text ? `${FIELD_LABELS[field]}：${text}` : "";
    })
    .filter(Boolean)
    .join("\n");
}

function extractBookContractText(bookContract: {
  readingPromise?: string | null;
  protagonistFantasy?: string | null;
  coreSellingPoint?: string | null;
  chapter3Payoff?: string | null;
  chapter10Payoff?: string | null;
  chapter30Payoff?: string | null;
  escalationLadder?: string | null;
  relationshipMainline?: string | null;
} | null | undefined): string {
  if (!bookContract) {
    return "";
  }
  return [
    bookContract.readingPromise ? `Read the pledge:${bookContract.readingPromise}` : "",
    bookContract.protagonistFantasy ? `主角爽感：${bookContract.protagonistFantasy}` : "",
    bookContract.coreSellingPoint ? `Core selling points:${bookContract.coreSellingPoint}` : "",
    bookContract.relationshipMainline ? `Main line of relationship:${bookContract.relationshipMainline}` : "",
    bookContract.escalationLadder ? `Upgrade ladder:${bookContract.escalationLadder}` : "",
    bookContract.chapter3Payoff ? `3章兑现：${bookContract.chapter3Payoff}` : "",
    bookContract.chapter10Payoff ? `10章兑现：${bookContract.chapter10Payoff}` : "",
    bookContract.chapter30Payoff ? `30章兑现：${bookContract.chapter30Payoff}` : "",
  ].filter(Boolean).join("\n");
}

export class CharacterVisibleProfileService {
  private readonly worldContextGateway = new WorldContextGateway();

  async generateCharacterVisibleProfile(
    novelId: string,
    characterId: string,
    options: CharacterVisibleProfileGenerateOptions = {},
  ): Promise<CharacterVisibleProfileSuggestion> {
    const [novel, character, relations] = await Promise.all([
      prisma.novel.findUnique({
        where: { id: novelId },
        include: {
          genre: true,
          bible: true,
          bookContract: true,
          storyMacroPlan: true,
          primaryStoryMode: true,
          secondaryStoryMode: true,
        },
      }),
      prisma.character.findFirst({
        where: { id: characterId, novelId },
      }),
      prisma.characterRelation.findMany({
        where: {
          novelId,
          OR: [
            { sourceCharacterId: characterId },
            { targetCharacterId: characterId },
          ],
        },
        include: {
          sourceCharacter: { select: { name: true } },
          targetCharacter: { select: { name: true } },
        },
        take: 12,
      }),
    ]);

    if (!novel || !character) {
      throw new Error("The novel or character does not exist");
    }

    const relationText = relations
      .map((relation) => [
        `${relation.sourceCharacter.name} -> ${relation.targetCharacter.name}`,
        relation.surfaceRelation,
        relation.hiddenTension ? `暗线：${relation.hiddenTension}` : "",
        relation.conflictSource ? `冲突：${relation.conflictSource}` : "",
      ].filter(Boolean).join("；"))
      .join("\n");

    const storyModeBlock = buildStoryModePromptBlock({
      primary: novel.primaryStoryMode ? normalizeStoryModeOutput(novel.primaryStoryMode) : null,
      secondary: novel.secondaryStoryMode ? normalizeStoryModeOutput(novel.secondaryStoryMode) : null,
    });
    const worldContext = await this.worldContextGateway.getWorldContextBlock(novelId, {
      purpose: "character",
      provider: options.provider,
      model: options.model,
      temperature: options.temperature,
    });

    const result = await runStructuredPrompt({
      asset: characterVisibleProfileCompletionPrompt,
      promptInput: {
        novelTitle: novel.title,
        genreName: novel.genre?.name ?? "unspecified",
        projectMode: novel.projectMode ?? "co_pilot",
        storyModeBlock: compactText(storyModeBlock, 900),
        bookContractText: compactText(extractBookContractText(novel.bookContract), 1_200),
        worldContextText: compactText(worldContext?.promptBlock, 1_600),
        bibleText: compactText([
          novel.bible?.mainPromise ? `main line commitment：${novel.bible.mainPromise}` : "",
          novel.bible?.coreSetting ? `Core settings:${novel.bible.coreSetting}` : "",
          novel.bible?.characterArcs ? `角色成长：${novel.bible.characterArcs}` : "",
        ].filter(Boolean).join("\n"), 1_000),
        storyMacroText: compactText([
          novel.storyMacroPlan?.storyInput ? `Story input:${novel.storyMacroPlan.storyInput}` : "",
          novel.storyMacroPlan?.decompositionJson ? `拆解：${compactText(novel.storyMacroPlan.decompositionJson, 500)}` : "",
          novel.storyMacroPlan?.constraintEngineJson ? `约束：${compactText(novel.storyMacroPlan.constraintEngineJson, 500)}` : "",
        ].filter(Boolean).join("\n"), 1_200),
        characterName: character.name,
        characterRole: character.role,
        characterFunction: character.storyFunction ?? character.castRole ?? "",
        relationToProtagonist: character.relationToProtagonist ?? "",
        existingCharacterProfile: buildCharacterProfileText(character),
        existingVisibleProfile: buildExistingVisibleProfileText(character),
        relationText: compactText(relationText, 1_200),
        userGuidance: compactText(options.userGuidance, 800),
      },
      options: {
        provider: options.provider,
        model: options.model,
        temperature: options.temperature ?? 0.45,
        maxTokens: 1_400,
      },
    });

    const output = result.output;
    const suggested: CharacterVisibleProfileFields = {
      appearance: output.appearance,
      physique: output.physique,
      attireStyle: output.attireStyle,
      signatureDetail: output.signatureDetail,
      voiceTexture: output.voiceTexture,
      presenceImpression: output.presenceImpression,
    };
    const allowsOverwriteExisting = Boolean(options.overwriteExisting || options.userGuidance?.trim());
    const applicable = pickApplicableVisibleProfileFields({
      existing: this.extractFields(character),
      suggested,
      overwriteExisting: allowsOverwriteExisting,
    });
    const warnings = [...output.warnings];
    if (output.confidence < 0.55) {
      warnings.push("AI is less confident about the current visible profile. Please review it first.");
      return {
        characterId,
        characterName: character.name,
        fields: {},
        skippedFields: Object.fromEntries(VISIBLE_PROFILE_FIELDS.map((field) => [field, "AI 把握较低"])) as Partial<Record<CharacterVisibleProfileField, string>>,
        confidence: output.confidence,
        warnings,
        hasApplicableChanges: false,
        allowsOverwriteExisting,
      };
    }

    return {
      characterId,
      characterName: character.name,
      fields: applicable.fields,
      skippedFields: applicable.skippedFields,
      confidence: output.confidence,
      warnings,
      hasApplicableChanges: Object.keys(applicable.fields).length > 0,
      allowsOverwriteExisting,
    };
  }

  async generateBatchVisibleProfiles(
    novelId: string,
    options: CharacterVisibleProfileGenerateOptions = {},
  ): Promise<CharacterVisibleProfileBatchResult> {
    const characters = await prisma.character.findMany({
      where: { novelId },
      orderBy: { createdAt: "asc" },
    });
    const results: CharacterVisibleProfileSuggestion[] = [];
    const skippedCharacters: CharacterVisibleProfileBatchResult["skippedCharacters"] = [];

    for (const character of characters) {
      if (!this.needsVisibleProfile(character)) {
        skippedCharacters.push({
          characterId: character.id,
          characterName: character.name,
          reason: "Visible profile is fairly complete",
        });
        continue;
      }
      try {
        const result = await this.generateCharacterVisibleProfile(novelId, character.id, options);
        results.push(result);
      } catch (error) {
        skippedCharacters.push({
          characterId: character.id,
          characterName: character.name,
          reason: error instanceof Error ? error.message : "Visible-profile generation failed",
        });
      }
    }

    return { novelId, results, skippedCharacters };
  }

  async applyCharacterVisibleProfile(
    novelId: string,
    characterId: string,
    fields: CharacterVisibleProfileFields,
    options: CharacterVisibleProfileApplyOptions = {},
  ): Promise<CharacterVisibleProfileApplyResult> {
    const character = await prisma.character.findFirst({
      where: { id: characterId, novelId },
    });
    if (!character) {
      throw new Error("The character does not exist");
    }

    const applicable = pickApplicableVisibleProfileFields({
      existing: this.extractFields(character),
      suggested: fields,
      overwriteExisting: options.overwriteExisting,
    });
    const appliedFields = Object.keys(applicable.fields) as CharacterVisibleProfileField[];
    if (appliedFields.length === 0) {
      return {
        character: character as unknown as Character,
        appliedFields: [],
        skippedFields: applicable.skippedFields,
        warnings: ["There is no visible profile to write."],
      };
    }

    const updated = await prisma.character.update({
      where: { id: character.id },
      data: applicable.fields,
    });
    return {
      character: updated as unknown as Character,
      appliedFields,
      skippedFields: applicable.skippedFields,
      warnings: [],
    };
  }

  async applyBatchVisibleProfiles(
    novelId: string,
    items: Array<{ characterId: string; fields: CharacterVisibleProfileFields; overwriteExisting?: boolean }>,
  ): Promise<{
    novelId: string;
    results: CharacterVisibleProfileApplyResult[];
  }> {
    const results: CharacterVisibleProfileApplyResult[] = [];
    for (const item of items) {
      results.push(await this.applyCharacterVisibleProfile(novelId, item.characterId, item.fields, {
        overwriteExisting: item.overwriteExisting,
      }));
    }
    return { novelId, results };
  }

  async autoCompleteVisibleProfilesForCharacters(
    novelId: string,
    characterIds: string[],
    options: CharacterVisibleProfileGenerateOptions = {},
  ): Promise<CharacterVisibleProfileBatchResult> {
    const uniqueIds = Array.from(new Set(characterIds.filter(Boolean)));
    const results: CharacterVisibleProfileSuggestion[] = [];
    const skippedCharacters: CharacterVisibleProfileBatchResult["skippedCharacters"] = [];

    for (const characterId of uniqueIds) {
      const character = await prisma.character.findFirst({ where: { id: characterId, novelId } });
      if (!character) {
        skippedCharacters.push({ characterId, characterName: characterId, reason: "The character does not exist" });
        continue;
      }
      if (!this.needsVisibleProfile(character)) {
        skippedCharacters.push({ characterId, characterName: character.name, reason: "Visible profile is fairly complete" });
        continue;
      }
      try {
        const suggestion = await this.generateCharacterVisibleProfile(novelId, characterId, options);
        results.push(suggestion);
        if (suggestion.hasApplicableChanges) {
          await this.applyCharacterVisibleProfile(novelId, characterId, suggestion.fields);
        }
      } catch (error) {
        skippedCharacters.push({
          characterId,
          characterName: character.name,
          reason: error instanceof Error ? error.message : "Automatic visible-profile fill-in failed",
        });
      }
    }

    return { novelId, results, skippedCharacters };
  }

  private needsVisibleProfile(character: CharacterRow): boolean {
    return VISIBLE_PROFILE_FIELDS.some((field) => isVagueVisibleProfileText(character[field]));
  }

  private extractFields(character: CharacterRow): CharacterVisibleProfileFields {
    return Object.fromEntries(
      VISIBLE_PROFILE_FIELDS.map((field) => [field, character[field] ?? null]),
    ) as CharacterVisibleProfileFields;
  }
}

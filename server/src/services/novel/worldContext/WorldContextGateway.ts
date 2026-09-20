import type { LLMProvider } from "@ai-novel/shared/types/llm";
import type { NovelWorldGenerateInput } from "@ai-novel/shared/types/novelWorld";
import type {
  StoryWorldSlice,
  StoryWorldSliceBuilderMode,
  StoryWorldSliceForce,
  StoryWorldSliceLocation,
} from "@ai-novel/shared/types/storyWorldSlice";
import { NovelWorldSliceService } from "../storyWorldSlice/NovelWorldSliceService";
import { NovelWorldInstanceService } from "./NovelWorldInstanceService";

export type WorldContextPurpose = "outline" | "character" | "chapter" | "bible" | "optimize";
export type WorldContextStrength = "light" | "normal" | "strict";

export interface WorldContextBlock {
  novelWorldId: string;
  sourceType: "story_slice";
  purpose: WorldContextPurpose;
  strength: WorldContextStrength;
  summaryText: string;
  promptBlock: string;
  worldRulesText: string;
  worldStageText: string;
  hardRules: string[];
  softRules: string[];
  activeForces: Array<{
    id: string;
    name: string;
    roleInStory: string;
    pressure: string;
  }>;
  activeLocations: Array<{
    id: string;
    name: string;
    storyUse: string;
  }>;
  forbiddenCombinations: string[];
  expansionHints: string[];
  rawSlice: StoryWorldSlice;
}

export interface WorldContextGatewayOptions {
  purpose: WorldContextPurpose;
  strength?: WorldContextStrength;
  forceRefresh?: boolean;
  storyInput?: string;
  provider?: LLMProvider;
  model?: string;
  temperature?: number;
}

export interface WorldContextGatewayGenerateOptions extends NovelWorldGenerateInput {
  storyMacroContext?: string;
  bookContractContext?: string;
  openingOnly?: boolean;
}

function compactList(items: string[], fallback = "None yet"): string {
  const normalized = items.map((item) => item.trim()).filter(Boolean);
  return normalized.length > 0 ? normalized.map((item) => `- ${item}`).join("\n") : fallback;
}

function mapPurposeToBuilderMode(purpose: WorldContextPurpose): StoryWorldSliceBuilderMode {
  switch (purpose) {
    case "outline":
      return "outline";
    case "bible":
      return "bible";
    case "character":
    case "chapter":
    case "optimize":
      return "runtime";
    default:
      return "runtime";
  }
}

function formatRule(rule: StoryWorldSlice["appliedRules"][number]): string {
  return [
    rule.name,
    rule.summary ? `Note: ${rule.summary}` : "",
    rule.whyItMatters ? `Impact: ${rule.whyItMatters}` : "",
  ].filter(Boolean).join(" | ");
}

function formatForce(force: StoryWorldSlice["activeForces"][number]): string {
  return [
    force.name,
    force.roleInStory ? `Role in this book: ${force.roleInStory}` : "",
    force.pressure ? `Pressure tactics: ${force.pressure}` : "",
    force.summary ? `Summary: ${force.summary}` : "",
  ].filter(Boolean).join(" | ");
}

function formatLocation(location: StoryWorldSlice["activeLocations"][number]): string {
  return [
    location.name,
    location.storyUse ? `Story use: ${location.storyUse}` : "",
    location.risk ? `Risk: ${location.risk}` : "",
    location.summary ? `Summary: ${location.summary}` : "",
  ].filter(Boolean).join(" | ");
}

function buildPurposeLead(purpose: WorldContextPurpose): string {
  switch (purpose) {
    case "character":
      return "Character generation must fit this book's world: prefer active factions, identity bounds, place pressure, and forbidden pairings. Do not invent profiles that break world rules.";
    case "outline":
      return "Story planning must use this book's world: design the spine around core rules, pressure sources, opening entries, and expansion bounds.";
    case "chapter":
      return "Chapter generation must follow this book's world: use only rules, places, factions, and pressure sources allowed by the current slice.";
    case "bible":
      return "The bible can only summarize this book's world handbook. It cannot rewrite world rules into a different source of truth.";
    case "optimize":
      return "Optimization and review must check whether the text crossed this book's world boundaries, hard rules, or forbidden pairings.";
    default:
      return "Generation must stay inside this book's world bounds.";
  }
}

export function buildWorldContextBlockFromSlice(input: {
  slice: StoryWorldSlice;
  purpose: WorldContextPurpose;
  strength?: WorldContextStrength;
  novelWorldId?: string;
}): WorldContextBlock {
  const { slice, purpose } = input;
  const strength = input.strength ?? "normal";
  const hardRules = slice.appliedRules.map(formatRule).filter(Boolean);
  const activeForces = slice.activeForces.map((force: StoryWorldSliceForce) => ({
    id: force.id,
    name: force.name,
    roleInStory: force.roleInStory,
    pressure: force.pressure,
  }));
  const activeLocations = slice.activeLocations.map((location: StoryWorldSliceLocation) => ({
    id: location.id,
    name: location.name,
    storyUse: location.storyUse,
  }));

  const worldRulesText = [
    slice.coreWorldFrame ? `World background: ${slice.coreWorldFrame}` : "",
    hardRules.length > 0 ? `Hard rules:\n${compactList(hardRules)}` : "",
    slice.forbiddenCombinations.length > 0
      ? `Forbidden pairings:\n${compactList(slice.forbiddenCombinations)}`
      : "",
    slice.storyScopeBoundary ? `Book boundary: ${slice.storyScopeBoundary}` : "",
  ].filter(Boolean).join("\n\n");

  const worldStageText = [
    slice.coreWorldFrame ? `Core stage: ${slice.coreWorldFrame}` : "",
    slice.activeForces.length > 0
      ? `Active forces:\n${slice.activeForces.map((force: StoryWorldSliceForce) => `- ${formatForce(force)}`).join("\n")}`
      : "",
    slice.activeLocations.length > 0
      ? `This book's stage:\n${slice.activeLocations.map((location: StoryWorldSliceLocation) => `- ${formatLocation(location)}`).join("\n")}`
      : "",
    slice.pressureSources.length > 0 ? `Pressure sources:\n${compactList(slice.pressureSources)}` : "",
    slice.conflictCandidates.length > 0 ? `Conflicts that can open:\n${compactList(slice.conflictCandidates)}` : "",
    slice.recommendedEntryPoints.length > 0 ? `Recommended entries:\n${compactList(slice.recommendedEntryPoints)}` : "",
  ].filter(Boolean).join("\n\n");

  const promptBlock = [
    `[Book-world context | purpose: ${purpose} | strength: ${strength}]`,
    buildPurposeLead(purpose),
    worldRulesText,
    worldStageText,
    slice.mysterySources.length > 0 ? `Mystery sources:\n${compactList(slice.mysterySources)}` : "",
    slice.suggestedStoryAxes.length > 0 ? `Suggested story axes:\n${compactList(slice.suggestedStoryAxes)}` : "",
  ].filter(Boolean).join("\n\n");

  return {
    novelWorldId: input.novelWorldId ?? slice.worldId,
    sourceType: "story_slice",
    purpose,
    strength,
    summaryText: slice.coreWorldFrame,
    promptBlock,
    worldRulesText,
    worldStageText,
    hardRules,
    softRules: [],
    activeForces,
    activeLocations,
    forbiddenCombinations: slice.forbiddenCombinations,
    expansionHints: [
      ...slice.recommendedEntryPoints,
      ...slice.suggestedStoryAxes,
    ],
    rawSlice: slice,
  };
}

export class WorldContextGateway {
  constructor(
    private readonly worldSliceService = new NovelWorldSliceService(),
    private readonly novelWorldService = new NovelWorldInstanceService(),
  ) {}

  async hasActiveWorld(novelId: string): Promise<boolean> {
    const novelWorld = await this.novelWorldService.ensureFromLegacyNovel(novelId);
    if (novelWorld) {
      return true;
    }
    const view = await this.worldSliceService.getWorldSliceView(novelId);
    return view.hasWorld;
  }

  async getWorldContextBlock(
    novelId: string,
    options: WorldContextGatewayOptions,
  ): Promise<WorldContextBlock | null> {
    const novelWorld = await this.novelWorldService.ensureFromLegacyNovel(novelId);
    const builderMode = mapPurposeToBuilderMode(options.purpose);
    const slice = options.forceRefresh
      ? (await this.worldSliceService.refreshWorldSlice(novelId, {
        builderMode,
        storyInput: options.storyInput,
        provider: options.provider,
        model: options.model,
        temperature: options.temperature,
      })).slice
      : await this.worldSliceService.ensureStoryWorldSlice(novelId, {
        builderMode,
        storyInput: options.storyInput,
      });

    if (!slice) {
      return null;
    }
    await this.novelWorldService.persistStorySlice(novelId, slice);
    const persistedNovelWorld = novelWorld ?? await this.novelWorldService.getByNovelId(novelId);

    return buildWorldContextBlockFromSlice({
      slice,
      purpose: options.purpose,
      strength: options.strength,
      novelWorldId: persistedNovelWorld?.id,
    });
  }

  async generateWorldFromNovelTheme(
    novelId: string,
    options: WorldContextGatewayGenerateOptions = {},
  ) {
    return this.novelWorldService.generateFromNovelTheme({
      novelId,
      saveToLibrary: options.saveToLibrary,
      provider: options.provider,
      model: options.model,
      temperature: options.temperature,
      storyMacroContext: options.storyMacroContext,
      bookContractContext: options.bookContractContext,
      openingOnly: options.openingOnly,
    });
  }
}

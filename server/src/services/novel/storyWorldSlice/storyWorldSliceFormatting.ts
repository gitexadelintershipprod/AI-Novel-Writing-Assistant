import type {
  StoryWorldSlice,
  StoryWorldSliceForce,
  StoryWorldSliceLocation,
  StoryWorldSliceRule,
} from "@ai-novel/shared/types/storyWorldSlice";

export interface LegacyWorldContextSource {
  name: string;
  worldType?: string | null;
  description?: string | null;
  axioms?: string | null;
  background?: string | null;
  geography?: string | null;
  magicSystem?: string | null;
  politics?: string | null;
  races?: string | null;
  religions?: string | null;
  technology?: string | null;
  conflicts?: string | null;
  history?: string | null;
  economy?: string | null;
  factions?: string | null;
}

function formatRule(rule: StoryWorldSliceRule): string {
  return [
    rule.name,
    rule.summary && `Note: ${rule.summary}`,
    rule.whyItMatters && `Role: ${rule.whyItMatters}`,
  ].filter(Boolean).join(" | ");
}

function formatForce(force: StoryWorldSliceForce): string {
  return [
    force.name,
    force.summary && `Summary: ${force.summary}`,
    force.roleInStory && `Role in this book: ${force.roleInStory}`,
    force.pressure && `Pressure it creates: ${force.pressure}`,
  ].filter(Boolean).join(" | ");
}

function formatLocation(location: StoryWorldSliceLocation): string {
  return [
    location.name,
    location.summary && `Summary: ${location.summary}`,
    location.storyUse && `Story uses: ${location.storyUse}`,
    location.risk && `Risk: ${location.risk}`,
  ].filter(Boolean).join(" | ");
}

export function formatStoryWorldSlicePromptBlock(slice: StoryWorldSlice): string {
  return [
    "World setting this book will use:",
    slice.coreWorldFrame ? `Core stage: ${slice.coreWorldFrame}` : "",
    slice.appliedRules.length > 0
      ? `Rules that must be followed now:\n${slice.appliedRules.map((item) => `- ${formatRule(item)}`).join("\n")}`
      : "",
    slice.activeForces.length > 0
      ? `Organizations and powers that will enter the story:\n${slice.activeForces.map((item) => `- ${formatForce(item)}`).join("\n")}`
      : "",
    slice.activeLocations.length > 0
      ? `Places that will actually be used:\n${slice.activeLocations.map((item) => `- ${formatLocation(item)}`).join("\n")}`
      : "",
    slice.conflictCandidates.length > 0
      ? `Conflict directions that can open now:\n${slice.conflictCandidates.map((item) => `- ${item}`).join("\n")}`
      : "",
    slice.pressureSources.length > 0
      ? `Main sources of stress:\n${slice.pressureSources.map((item) => `- ${item}`).join("\n")}`
      : "",
    slice.mysterySources.length > 0
      ? `Questions that can keep holding the reader:\n${slice.mysterySources.map((item) => `- ${item}`).join("\n")}`
      : "",
    slice.suggestedStoryAxes.length > 0
      ? `Story axes to advance first:\n${slice.suggestedStoryAxes.map((item) => `- ${item}`).join("\n")}`
      : "",
    slice.recommendedEntryPoints.length > 0
      ? `Recommended opening entries:\n${slice.recommendedEntryPoints.map((item) => `- ${item}`).join("\n")}`
      : "",
    slice.forbiddenCombinations.length > 0
      ? `Pairings that must stay in bounds:\n${slice.forbiddenCombinations.map((item) => `- ${item}`).join("\n")}`
      : "",
    slice.storyScopeBoundary ? `Book boundary: ${slice.storyScopeBoundary}` : "",
  ].filter(Boolean).join("\n\n");
}

export function buildLegacyWorldContextFromWorld(world: LegacyWorldContextSource | null | undefined): string {
  if (!world) {
    return "World context: none";
  }

  let axiomsText = "";
  if (world.axioms) {
    try {
      const parsed = JSON.parse(world.axioms) as string[];
      axiomsText = Array.isArray(parsed) && parsed.length > 0
        ? parsed.map((item) => `- ${item}`).join("\n")
        : world.axioms;
    } catch {
      axiomsText = world.axioms;
    }
  }

  return [
    "World context:",
    `World name:${world.name}`,
    `World type:${world.worldType ?? "unspecified"}`,
    `World overview: ${world.description ?? ""}`,
    "Core axioms:",
    axiomsText,
    `Background: ${world.background ?? ""}`,
    `Geography: ${world.geography ?? ""}`,
    `Power system:${world.magicSystem ?? ""}`,
    `Society and politics: ${world.politics ?? ""}`,
    `Races: ${world.races ?? ""}`,
    `Religion: ${world.religions ?? ""}`,
    `Technology: ${world.technology ?? ""}`,
    `History: ${world.history ?? ""}`,
    `Economy: ${world.economy ?? ""}`,
    `Power relations: ${world.factions ?? ""}`,
    `Core conflict:${world.conflicts ?? ""}`,
  ].join("\n");
}

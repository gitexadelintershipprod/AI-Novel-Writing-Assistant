import type { World as PrismaWorld } from "@prisma/client";
import type { WorldLayerKey } from "@ai-novel/shared/types/world";
import {
  parseWorldGenerationBlueprint,
  type WorldGenerationBlueprint,
} from "@ai-novel/shared/types/worldWizard";

type WorldTextField =
  | "description"
  | "background"
  | "geography"
  | "cultures"
  | "magicSystem"
  | "politics"
  | "races"
  | "religions"
  | "technology"
  | "conflicts"
  | "history"
  | "economy"
  | "factions";

const WORLD_LAYER_LABELS: Record<WorldLayerKey, string> = {
  foundation: "base layer",
  power: "strength layer",
  society: "social layer",
  culture: "cultural layer",
  history: "historical layer",
  conflict: "conflict layer",
};

const STORED_DIMENSION_LABELS: Record<string, string> = {
  foundation: "base layer",
  power: "strength layer",
  society: "social layer",
  culture: "cultural layer",
  history: "historical layer",
  conflict: "conflict layer",
  geography: "geographical environment",
  magicSystem: "power system",
  technology: "Technical system",
};

const WORLD_REFERENCE_MODE_LABELS = {
  extract_base: "Extract the original world base",
  adapt_world: "An overhead transformation based on the original work",
  tone_rebuild: "Rebuild using only the temperament and structure of the original work",
} as const;

function parseStoredDimensionLabels(raw: string | null | undefined): string[] {
  if (!raw?.trim()) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    if (!parsed || typeof parsed !== "object") {
      return [];
    }

    return Object.entries(parsed)
      .filter(([, value]) => value === true)
      .map(([key]) => STORED_DIMENSION_LABELS[key] ?? key)
      .filter(Boolean);
  } catch {
    return [];
  }
}

export function parseWorldBlueprintFromWorld(world: Pick<PrismaWorld, "selectedElements">): WorldGenerationBlueprint {
  return parseWorldGenerationBlueprint(world.selectedElements);
}

export function buildWorldBlueprintPromptBlock(
  world: Pick<PrismaWorld, "selectedDimensions" | "selectedElements">,
): string {
  const blueprint = parseWorldBlueprintFromWorld(world);
  const enabledDimensions = parseStoredDimensionLabels(world.selectedDimensions);

  const sections: string[] = [];

  if (enabledDimensions.length > 0) {
    sections.push(`User-selected generation dimensions:${enabledDimensions.join("、")}`);
  }

  if (blueprint.classicElements.length > 0) {
    sections.push(`User-kept classic elements:${blueprint.classicElements.join("、")}`);
  }

  if (blueprint.propertySelections.length > 0) {
    const propertyLines = blueprint.propertySelections.map((selection) => {
      const choice = selection.choiceLabel?.trim()
        ? `; Selected direction:${selection.choiceLabel.trim()}${selection.choiceSummary?.trim() ? `（${selection.choiceSummary.trim()}）` : ""}`
        : "";
      const detail = selection.detail?.trim() ? `; User notes:${selection.detail.trim()}` : "";
      return `- [${WORLD_LAYER_LABELS[selection.targetLayer]}] ${selection.name}：${selection.description}${choice}${detail}`;
    });
    sections.push(`World attributes preselected by the user:\n${propertyLines.join("\n")}`);
  }

  if (blueprint.referenceContext) {
    sections.push(`Reference work handling:${WORLD_REFERENCE_MODE_LABELS[blueprint.referenceContext.mode]}`);

    if (blueprint.referenceContext.anchors.length > 0) {
      sections.push(
        `Reference work world anchors:\n${blueprint.referenceContext.anchors.map((item) => `- ${item.label}：${item.content}`).join("\n")}`,
      );
    }

    if (blueprint.referenceContext.preserveElements.length > 0) {
      sections.push(`Must be retained:${blueprint.referenceContext.preserveElements.join("、")}`);
    }

    if (blueprint.referenceContext.allowedChanges.length > 0) {
      sections.push(`Allowed changes:${blueprint.referenceContext.allowedChanges.join("、")}`);
    }

    if (blueprint.referenceContext.forbiddenElements.length > 0) {
      sections.push(`Must not deviate from:${blueprint.referenceContext.forbiddenElements.join("、")}`);
    }

    const selectedRuleNames = (blueprint.referenceContext.referenceSeeds?.rules ?? [])
      .filter((item) => blueprint.referenceContext?.selectedSeedIds?.ruleIds.includes(item.id))
      .map((item) => item.name);
    if (selectedRuleNames.length > 0) {
      sections.push(`Original-work rules carried over directly:${selectedRuleNames.join("、")}`);
    }

    const selectedFactionNames = (blueprint.referenceContext.referenceSeeds?.factions ?? [])
      .filter((item) => blueprint.referenceContext?.selectedSeedIds?.factionIds.includes(item.id))
      .map((item) => item.name);
    if (selectedFactionNames.length > 0) {
      sections.push(`Original-work factions carried over directly:${selectedFactionNames.join("、")}`);
    }

    const selectedForceNames = (blueprint.referenceContext.referenceSeeds?.forces ?? [])
      .filter((item) => blueprint.referenceContext?.selectedSeedIds?.forceIds.includes(item.id))
      .map((item) => item.name);
    if (selectedForceNames.length > 0) {
      sections.push(`Original-work forces carried over directly:${selectedForceNames.join("、")}`);
    }

    const selectedLocationNames = (blueprint.referenceContext.referenceSeeds?.locations ?? [])
      .filter((item) => blueprint.referenceContext?.selectedSeedIds?.locationIds.includes(item.id))
      .map((item) => item.name);
    if (selectedLocationNames.length > 0) {
      sections.push(`Original-work locations carried over directly:${selectedLocationNames.join("、")}`);
    }
  }

  return sections.length > 0 ? sections.join("\n\n") : "No additional world blueprint constraints.";
}

export function applyGeneratedWorldFields<T extends Pick<PrismaWorld, WorldTextField>>(
  world: T,
  generated: Partial<Record<WorldTextField, string>>,
): T {
  return {
    ...world,
    ...generated,
  };
}

import type { WorldLayerKey, WorldTemplate } from "@ai-novel/shared/types/world";
import { canonicalizeWorldType } from "@ai-novel/shared/types/legacyProtocolValues";

export const WORLD_LAYER_ORDER: WorldLayerKey[] = [
  "foundation",
  "power",
  "society",
  "culture",
  "history",
  "conflict",
];

export const LAYER_FIELD_MAP: Record<
  WorldLayerKey,
  Array<
    | "background"
    | "geography"
    | "magicSystem"
    | "technology"
    | "races"
    | "politics"
    | "factions"
    | "cultures"
    | "religions"
    | "economy"
    | "history"
    | "conflicts"
    | "description"
  >
> = {
  foundation: ["background", "geography"],
  power: ["magicSystem", "technology"],
  society: ["races", "politics", "factions"],
  culture: ["cultures", "religions", "economy"],
  history: ["history"],
  conflict: ["conflicts", "description"],
};

export const WORLD_TEMPLATES: WorldTemplate[] = [
  {
    key: "xuanhuan_eastern",
    name: "Oriental fantasy",
    description: "Built around cultivation systems, sect power, and the laws of heaven and earth.",
    worldType: "Oriental fantasy",
    requiredLayers: ["foundation", "power", "society", "history", "conflict"],
    optionalLayers: ["culture"],
    classicElements: ["Sects", "Secret realms", "Realm breakthroughs", "Rare treasures", "Dynasties / clans"],
    pitfalls: ["Do not add too many realms", "Power must have a clear cost", "Sect boundaries must stay clear"],
  },
  {
    key: "xianxia",
    name: "Xianxia",
    description: "Emphasizes the mortal-immortal divide, ascension, and heavenly law.",
    worldType: "Xianxia",
    requiredLayers: ["foundation", "power", "society", "history", "conflict"],
    optionalLayers: ["culture"],
    classicElements: ["Ascension", "Blessed grotto-heavens", "Karma", "Tribulation", "Immortal sects"],
    pitfalls: ["Heavenly laws must not contradict themselves", "The ascension path must close the loop"],
  },
  {
    key: "urban_superpower",
    name: "Urban superpower",
    description: "Superhuman abilities and hidden organizations inside modern society.",
    worldType: "Urban superpower",
    requiredLayers: ["foundation", "power", "society", "conflict"],
    optionalLayers: ["culture", "history"],
    classicElements: ["Ability ranks", "Special agencies", "Underground factions", "Urban rules"],
    pitfalls: ["The clash between the extraordinary and ordinary society must be explainable"],
  },
  {
    key: "scifi",
    name: "Science fiction",
    description: "Emphasizes tech trees, social structure, and civilizational conflict.",
    worldType: "Science fiction",
    requiredLayers: ["foundation", "power", "society", "history", "conflict"],
    optionalLayers: ["culture"],
    classicElements: ["AI", "Interstellar politics", "Jump drives", "Corporate alliances", "Colonies"],
    pitfalls: ["Tech level must stay consistent", "Key technology limits must be explicit"],
  },
  {
    key: "western_fantasy",
    name: "Western fantasy",
    description: "Multi-race, multi-mythology adventure storytelling.",
    worldType: "Western fantasy",
    requiredLayers: ["foundation", "power", "society", "history", "conflict"],
    optionalLayers: ["culture"],
    classicElements: ["Elves", "Dragons", "Kingdom alliances", "Academies", "Relics"],
    pitfalls: ["Racial differences should serve conflict"],
  },
  {
    key: "post_apocalypse",
    name: "Post-apocalyptic wasteland",
    description: "Survival order and mutation systems under scarce resources.",
    worldType: "Post-apocalyptic wasteland",
    requiredLayers: ["foundation", "power", "society", "conflict"],
    optionalLayers: ["history", "culture"],
    classicElements: ["Shelters", "Infected", "Scavengers", "Resource sites", "Wasteland factions"],
    pitfalls: ["Survival resource loops must actually work"],
  },
  {
    key: "historical_alt",
    name: "Alternate history",
    description: "A historical divergence that reshapes politics and civilization.",
    worldType: "Alternate history",
    requiredLayers: ["foundation", "society", "history", "conflict"],
    optionalLayers: ["culture", "power"],
    classicElements: ["Divergence event", "New regime", "Remnants of the old order", "Contested histories"],
    pitfalls: ["Cause and effect around the divergence must be traceable"],
  },
  {
    key: "cyberpunk",
    name: "Cyberpunk",
    description: "Corporate rule, body augmentation, and digital space.",
    worldType: "Cyberpunk",
    requiredLayers: ["foundation", "power", "society", "conflict"],
    optionalLayers: ["history", "culture"],
    classicElements: ["Mega-corps", "Cybernetics", "Hackers", "Street-level districts", "Data sovereignty"],
    pitfalls: ["Tech windfalls and class oppression must both hold"],
  },
  {
    key: "custom",
    name: "Custom",
    description: "Mix layers freely for a custom world.",
    worldType: "Custom",
    requiredLayers: ["foundation", "conflict"],
    optionalLayers: ["power", "society", "culture", "history"],
    classicElements: [],
    pitfalls: ["Define core axioms before expanding details"],
  },
];

export function getTemplateByKey(templateKey: string | null | undefined): WorldTemplate {
  return WORLD_TEMPLATES.find((item) => item.key === templateKey) ?? WORLD_TEMPLATES[WORLD_TEMPLATES.length - 1];
}

export function getTemplateByWorldType(worldType: string | null | undefined): WorldTemplate {
  const canonical = canonicalizeWorldType(worldType);
  return WORLD_TEMPLATES.find((item) => item.worldType === canonical || item.worldType === worldType)
    ?? WORLD_TEMPLATES[WORLD_TEMPLATES.length - 1];
}

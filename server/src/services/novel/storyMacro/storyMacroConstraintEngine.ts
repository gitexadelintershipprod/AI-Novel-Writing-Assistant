import type {
  StoryConstraintEngine,
  StoryDecomposition,
  StoryExpansion,
  StoryMacroField,
  StoryMacroFieldValue,
  StoryMacroLocks,
  StoryMacroPhase,
  StoryMacroTurningPoint,
} from "@ai-novel/shared/types/storyMacro";
import {
  normalizeConflictLayers,
  normalizeConstraints,
  normalizeDecomposition,
  normalizeExpansion,
  STORY_MACRO_FIELDS,
} from "./storyMacroPlanSchema";

export interface StoryMacroEditablePlan {
  expansion: StoryExpansion;
  decomposition: StoryDecomposition;
  constraints: string[];
}

function mergeUnique(items: string[], maxItems: number): string[] {
  return Array.from(new Set(items.map((item) => item.trim()).filter(Boolean))).slice(0, maxItems);
}

function summarizeText(value: string, fallback: string): string {
  const parts = value
    .split(/\r?\n|。|！|!|？|\?|；|;/)
    .map((item) => item.trim())
    .filter(Boolean);
  return parts[0] ?? fallback;
}

function negativeConstraintsOnly(value: string[]): string[] {
  return value.filter((item) => /^(不要|禁止|避免|不可|不能|do not|don't|avoid|never|forbidden|no )/i.test(item.trim()));
}

export function toGrowthSteps(value: string): string[] {
  const steps = value
    .split(/\r?\n|->|→|=>|，|、|；|;/)
    .map((item) => item.trim())
    .filter(Boolean);
  return Array.from(new Set(steps)).slice(0, 6);
}

function buildPressureRoles(expansion: StoryExpansion): string[] {
  return mergeUnique([
    `Protagonist: ${summarizeText(expansion.protagonist_core, "The protagonist is trapped in a situation they cannot easily leave.")}`,
    `Opposition: ${summarizeText(expansion.conflict_layers.external, "External forces keep pressing the protagonist.")}`,
    `Relationship stress: ${summarizeText(expansion.conflict_layers.relational, "Key relations keep applying pressure and creating a price for each choice.")}`,
  ], 4);
}

const DEFAULT_PHASE_NAMES = [
  "Locked predicament",
  "Misjudged action",
  "Rising cost",
  "Cognitive reversal",
  "Ending payoff",
] as const;

function buildPhaseModel(plan: StoryMacroEditablePlan): StoryMacroPhase[] {
  const { expansion, decomposition } = plan;
  return [
    {
      name: DEFAULT_PHASE_NAMES[0],
      goal: `First trap the protagonist in "${summarizeText(expansion.protagonist_core, decomposition.core_conflict)}" and throw out the core unknown: ${expansion.mystery_box || decomposition.main_hook}`,
    },
    {
      name: DEFAULT_PHASE_NAMES[1],
      goal: `Advance the first action around "${decomposition.progression_loop}" and make the protagonist pay a price for the misjudgment.`,
    },
    {
      name: DEFAULT_PHASE_NAMES[2],
      goal: `Raise the external, internal, and relationship pressure lines together and cash the conflict engine: ${summarizeText(expansion.conflict_engine, decomposition.core_conflict)}`,
    },
    {
      name: DEFAULT_PHASE_NAMES[3],
      goal: `Close in on and rewrite the core unknown "${expansion.mystery_box || decomposition.main_hook}", flipping the protagonist's understanding.`,
    },
    {
      name: DEFAULT_PHASE_NAMES[4],
      goal: `Close with "${decomposition.ending_flavor}" and cash the key burst points and emotional aftertaste.`,
    },
  ];
}

function buildTurningPoints(payoffs: string[]): StoryMacroTurningPoint[] {
  return payoffs.map((item, index) => ({
    title: `Redeem node ${index + 1}`,
    summary: item,
    phase: DEFAULT_PHASE_NAMES[Math.min(index, DEFAULT_PHASE_NAMES.length - 1)] ?? DEFAULT_PHASE_NAMES[DEFAULT_PHASE_NAMES.length - 1],
  }));
}

function buildHardConstraints(plan: StoryMacroEditablePlan): string[] {
  const growthSteps = toGrowthSteps(plan.decomposition.growth_path).map((item) => `The protagonist's understanding must pass through: ${item}`);
  return mergeUnique([
    ...plan.constraints,
    "Before character creation, do not invent specific names, a fixed cast, or full biographies.",
    `Every advance must keep answering the core unknown: ${plan.expansion.mystery_box || plan.decomposition.main_hook}`,
    `Plot escalation must be driven by the conflict engine: ${summarizeText(plan.expansion.conflict_engine, plan.decomposition.core_conflict)}`,
    `High-tension set pieces must serve the spine, not show off on their own: ${plan.expansion.setpiece_seeds.join(" / ")}`,
    ...growthSteps,
  ], 10);
}

export function buildConstraintEngine(plan: StoryMacroEditablePlan): StoryConstraintEngine {
  const growthSteps = toGrowthSteps(plan.decomposition.growth_path);
  const hardConstraints = buildHardConstraints(plan);
  const mustNotHave = mergeUnique([
    ...negativeConstraintsOnly(plan.constraints),
    "Replace the story engine with specific character bios",
    "Let worldbuilding explanation crowd out conflict advance",
  ], 6);
  return {
    premise: plan.expansion.expanded_premise || `${plan.decomposition.selling_point} The spine turns on "${plan.decomposition.core_conflict}".`,
    conflict_axis: plan.decomposition.core_conflict,
    mystery_box: plan.expansion.mystery_box || plan.decomposition.main_hook,
    pressure_roles: buildPressureRoles(plan.expansion),
    growth_path: growthSteps.length > 0 ? growthSteps : [plan.decomposition.growth_path].filter(Boolean),
    phase_model: buildPhaseModel(plan),
    hard_constraints: hardConstraints,
    turning_points: buildTurningPoints(plan.decomposition.major_payoffs),
    ending_constraints: {
      must_have: mergeUnique([
        `Answer the spine question: ${plan.decomposition.main_hook}`,
        `Keep the final taste: ${plan.decomposition.ending_flavor}`,
        plan.decomposition.major_payoffs[plan.decomposition.major_payoffs.length - 1] ?? "",
      ], 4),
      must_not_have: mustNotHave,
    },
  };
}

export function getEditablePlanFieldValue(plan: StoryMacroEditablePlan, field: StoryMacroField): StoryMacroFieldValue {
  switch (field) {
    case "expanded_premise":
    case "protagonist_core":
    case "conflict_engine":
    case "mystery_box":
    case "emotional_line":
    case "tone_reference":
      return plan.expansion[field];
    case "conflict_layers":
      return plan.expansion.conflict_layers;
    case "setpiece_seeds":
      return plan.expansion.setpiece_seeds;
    case "selling_point":
    case "core_conflict":
    case "main_hook":
    case "progression_loop":
    case "growth_path":
    case "ending_flavor":
      return plan.decomposition[field];
    case "major_payoffs":
      return plan.decomposition.major_payoffs;
    case "constraints":
      return plan.constraints;
  }
}

export function setEditablePlanFieldValue(
  plan: StoryMacroEditablePlan,
  field: StoryMacroField,
  value: StoryMacroFieldValue,
): StoryMacroEditablePlan {
  const nextPlan: StoryMacroEditablePlan = {
    expansion: normalizeExpansion(plan.expansion),
    decomposition: normalizeDecomposition(plan.decomposition),
    constraints: normalizeConstraints(plan.constraints),
  };
  switch (field) {
    case "expanded_premise":
    case "protagonist_core":
    case "conflict_engine":
    case "mystery_box":
    case "emotional_line":
    case "tone_reference":
      nextPlan.expansion = normalizeExpansion({
        ...nextPlan.expansion,
        [field]: typeof value === "string" ? value : "",
      });
      return nextPlan;
    case "conflict_layers":
      nextPlan.expansion = normalizeExpansion({
        ...nextPlan.expansion,
        conflict_layers: normalizeConflictLayers(value),
      });
      return nextPlan;
    case "setpiece_seeds":
      nextPlan.expansion = normalizeExpansion({
        ...nextPlan.expansion,
        setpiece_seeds: Array.isArray(value) ? value : [],
      });
      return nextPlan;
    case "selling_point":
    case "core_conflict":
    case "main_hook":
    case "progression_loop":
    case "growth_path":
    case "ending_flavor":
      nextPlan.decomposition = normalizeDecomposition({
        ...nextPlan.decomposition,
        [field]: typeof value === "string" ? value : "",
      });
      return nextPlan;
    case "major_payoffs":
      nextPlan.decomposition = normalizeDecomposition({
        ...nextPlan.decomposition,
        major_payoffs: Array.isArray(value) ? value : [],
      });
      return nextPlan;
    case "constraints":
      nextPlan.constraints = normalizeConstraints(value);
      return nextPlan;
  }
}

export function mergeLockedFields(
  nextPlan: StoryMacroEditablePlan,
  previousPlan: StoryMacroEditablePlan | null,
  locks: StoryMacroLocks,
): StoryMacroEditablePlan {
  if (!previousPlan) {
    return nextPlan;
  }
  let merged = {
    expansion: normalizeExpansion(nextPlan.expansion),
    decomposition: normalizeDecomposition(nextPlan.decomposition),
    constraints: normalizeConstraints(nextPlan.constraints),
  };
  for (const field of STORY_MACRO_FIELDS) {
    if (!locks[field]) {
      continue;
    }
    merged = setEditablePlanFieldValue(
      merged,
      field,
      getEditablePlanFieldValue(previousPlan, field),
    );
  }
  return merged;
}

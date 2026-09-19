import type {
  CharacterRules,
  LanguageRules,
  NarrativeRules,
  RhythmRules,
} from "@ai-novel/shared/types/styleEngine";

export type RuleSection = "narrativeRules" | "characterRules" | "languageRules" | "rhythmRules";
type RuleObject = NarrativeRules | CharacterRules | LanguageRules | RhythmRules;

export interface RuleEntry {
  key: string;
  label: string;
  value: string;
}

const FIELD_ORDER: Record<RuleSection, string[]> = {
  narrativeRules: [
    "summary",
    "progressionMode",
    "sceneUnitPattern",
    "multiPov",
    "looping",
    "endingStyle",
    "povSwitchStyle",
  ],
  characterRules: [
    "summary",
    "dialogueStyle",
    "emotionExpression",
    "defenseMechanisms",
    "allowSelfReflection",
    "facePriority",
  ],
  languageRules: [
    "summary",
    "register",
    "roughness",
    "sentenceVariation",
    "allowIncompleteSentences",
    "allowSwearing",
    "allowUselessDetails",
  ],
  rhythmRules: [
    "summary",
    "pace",
    "paragraphDensity",
    "allowFragmentedFlow",
    "actionOverExplanation",
  ],
};

const FIELD_LABELS: Record<RuleSection, Record<string, string>> = {
  narrativeRules: {
    summary: "Overall sense of advancement",
    progressionMode: "Propulsion method",
    sceneUnitPattern: "scene unit",
    multiPov: "multiple perspectives",
    looping: "loopback hook",
    endingStyle: "Finishing method",
    povSwitchStyle: "perspective switch",
  },
  characterRules: {
    summary: "Summary of character expressions",
    dialogueStyle: "dialogue style",
    emotionExpression: "Emotional display",
    defenseMechanisms: "defense mechanism",
    allowSelfReflection: "introspective expression",
    facePriority: "Dignity first",
  },
  languageRules: {
    summary: "Overview of language quality",
    register: "language tone",
    roughness: "Roughness",
    sentenceVariation: "Sentence changes",
    allowIncompleteSentences: "incomplete sentence",
    allowSwearing: "foul language",
    allowUselessDetails: "Noise of life",
  },
  rhythmRules: {
    summary: "Rhythm Control Overview",
    pace: "propulsion speed",
    paragraphDensity: "paragraph density",
    allowFragmentedFlow: "Fragmented advancement",
    actionOverExplanation: "action priority",
  },
};

const FIELD_VALUE_MAPS: Record<string, Record<string, string>> = {
  progressionMode: {
    time_sequence: "Push forward by time",
    goal_driven: "Goal-driven advancement",
    mystery_escalation: "Suspense increases layer by layer",
    relationship_push_pull: "Relationship pull and push",
    multi_thread: "Multi-line interweaving promotion",
    scene_immersion: "Scene immersion promotion",
    fact_driven: "Fact-driven advancement",
    contrast_driven: "Contrast driven advancement",
  },
  endingStyle: {
    unresolved: "Unresolved core dilemma",
    hook: "Hook throw at the end",
    suspense: "suspense ending",
    emotional_hook: "Emotional hook ending",
    cross_hook: "Crosshatch hook finish",
    soft_open: "Soft open finish",
    pressure_continue: "Pressure continuation ending",
    bitter_aftertaste: "Finishing with a bitter aftertaste",
  },
  povSwitchStyle: {
    controlled: "controlled switching",
  },
  emotionExpression: {
    behavior_only: "Exposed only through movement",
    dialogue_and_action: "Dialogue and action are exposed together",
    reaction_only: "Mainly exposed through reactions",
    subtext: "Revealed through subtext",
    mixed: "Dialogue, action and reactions are mixed and exposed",
    light_behavior: "Use light actions and light reactions to expose yourself",
    suppressed: "Don't say it directly",
    deadpan: "cold reaction exposed",
  },
  dialogueStyle: {
    short_colloquial: "Short sentence spoken style",
    direct: "Direct and tough",
    restrained: "Restrain it and say it",
    subtext_heavy: "The implication is heavy",
    distinct_by_role: "Significantly widen the differences in mouths by role",
    daily_natural: "Everyday natural tone",
    informational: "Informational restraint dialogue",
    deadpan_colloquial: "cold spoken style",
  },
  register: {
    colloquial: "colloquial",
    direct: "Direct and crisp",
    restrained: "restraint",
    natural: "natural everyday",
    flexible: "Flexible to suit the role",
    professional: "Professional restraint",
  },
  sentenceVariation: {
    high: "Big changes",
    medium: "Moderate change",
    medium_high: "The change is relatively large",
  },
  pace: {
    medium_fast: "medium fast",
    fast: "Fast",
    medium: "medium speed",
    medium_slow: "medium slow",
    balanced: "equilibrium",
    slow: "slow",
  },
  paragraphDensity: {
    high: "high density",
    medium: "medium density",
    medium_high: "medium to high density",
  },
};

function compactText(value: unknown): string {
  if (typeof value !== "string") {
    return "";
  }

  return value.replace(/\s+/g, " ").trim();
}

function humanizeUnknownToken(value: string): string {
  return value.replace(/_/g, " ").trim();
}

function formatBooleanValue(key: string, value: boolean): string {
  if (key === "multiPov") {
    return value ? "Allows multi-view switching" : "Try to maintain a single perspective";
  }
  if (key === "looping") {
    return value ? "Allow loopback hooks" : "Push in a straight line as much as possible";
  }
  if (key === "allowSelfReflection") {
    return value ? "allow for explicit introspection" : "Try to do as little direct introspection as possible";
  }
  if (key === "facePriority") {
    return value ? "Prioritize keeping your dignity" : "Don't insist on respectability";
  }
  if (key === "allowIncompleteSentences") {
    return value ? "Allow incomplete sentences" : "Sentences should be as complete as possible";
  }
  if (key === "allowSwearing") {
    return value ? "Swear words or dirty words are allowed" : "Try to avoid foul language";
  }
  if (key === "allowUselessDetails") {
    return value ? "Allow the noise of life to remain" : "Minimize irrelevant noise";
  }
  if (key === "allowFragmentedFlow") {
    return value ? "Allow for fragmented advancement" : "Try to keep the progress intact";
  }
  if (key === "actionOverExplanation") {
    return value ? "Action precedes explanation" : "Explanation is more important than action";
  }
  return value ? "Yes" : "No";
}

function formatArrayValue(value: unknown[]): string {
  return value
    .map((item) => {
      if (typeof item === "string") {
        return humanizeUnknownToken(item);
      }
      return String(item);
    })
    .filter(Boolean)
    .join(" / ");
}

export function formatRuleFieldLabel(section: RuleSection, key: string): string {
  return FIELD_LABELS[section][key] ?? humanizeUnknownToken(key);
}

export function formatRuleFieldValue(section: RuleSection, key: string, value: unknown): string {
  if (value === null || value === undefined) {
    return "";
  }

  if (typeof value === "boolean") {
    return formatBooleanValue(key, value);
  }

  if (typeof value === "number") {
    if (key === "roughness") {
      return `${Math.round(value * 100)} / 100`;
    }
    return String(value);
  }

  if (Array.isArray(value)) {
    return formatArrayValue(value);
  }

  if (typeof value === "string") {
    const normalized = compactText(value);
    if (!normalized) {
      return "";
    }
    return FIELD_VALUE_MAPS[key]?.[normalized] ?? normalized;
  }

  return "";
}

export function buildReadableRuleEntries(section: RuleSection, rules: RuleObject | Record<string, unknown>): RuleEntry[] {
  const record = rules as Record<string, unknown>;
  const keySet = new Set<string>([
    ...FIELD_ORDER[section],
    ...Object.keys(record),
  ]);

  return Array.from(keySet)
    .map((key) => ({
      key,
      label: formatRuleFieldLabel(section, key),
      value: formatRuleFieldValue(section, key, record[key]),
    }))
    .filter((entry) => Boolean(entry.value))
    .sort((left, right) => {
      const leftIndex = FIELD_ORDER[section].indexOf(left.key);
      const rightIndex = FIELD_ORDER[section].indexOf(right.key);
      const normalizedLeft = leftIndex === -1 ? Number.MAX_SAFE_INTEGER : leftIndex;
      const normalizedRight = rightIndex === -1 ? Number.MAX_SAFE_INTEGER : rightIndex;
      return normalizedLeft - normalizedRight;
    });
}

export function buildReadableRuleSummary(
  section: RuleSection,
  rules: RuleObject | Record<string, unknown>,
  fallback: string,
): string {
  const entries = buildReadableRuleEntries(section, rules);
  if (entries.length === 0) {
    return fallback;
  }

  return entries
    .slice(0, 3)
    .map((entry) => (entry.key === "summary" ? entry.value : `${entry.label}: ${entry.value}`))
    .join("; ");
}

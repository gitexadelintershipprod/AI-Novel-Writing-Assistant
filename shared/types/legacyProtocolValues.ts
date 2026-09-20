/**
 * Canonical English protocol values.
 * Stored rows are English-only. Do not dual-read Chinese aliases.
 */

export const STORY_FUNCTION_VALUES = [
  "protagonist",
  "antagonist",
  "mentor",
  "foil",
  "supporting",
] as const;
export type StoryFunctionValue = (typeof STORY_FUNCTION_VALUES)[number];

export const GROWTH_STAGE_VALUES = [
  "origin",
  "setback",
  "turn",
  "awakening",
  "resolution",
] as const;
export type GrowthStageValue = (typeof GROWTH_STAGE_VALUES)[number];

export const DEFAULT_THREAD_TITLE = "New thread";
export const LEGACY_THREAD_TITLES = ["new conversation", DEFAULT_THREAD_TITLE] as const;

export const BEAT_FALLBACK_LABEL = "Beat";
export const VOLUME_ROLE_FALLBACK_PREFIX = "Volume";

export const STORY_FUNCTION_MAP: Record<string, StoryFunctionValue> = {
  protagonist: "protagonist",
  antagonist: "antagonist",
  mentor: "mentor",
  foil: "foil",
  supporting: "supporting",
};

export const STORY_FUNCTION_LABELS: Record<StoryFunctionValue, string> = {
  protagonist: "Protagonist",
  antagonist: "Antagonist",
  mentor: "Mentor",
  foil: "Foil",
  supporting: "Supporting",
};

export const GROWTH_STAGE_MAP: Record<string, GrowthStageValue> = {
  origin: "origin",
  setback: "setback",
  turn: "turn",
  awakening: "awakening",
  resolution: "resolution",
};

export const GROWTH_STAGE_LABELS: Record<GrowthStageValue, string> = {
  origin: "Origin",
  setback: "Setback",
  turn: "Turn",
  awakening: "Awakening",
  resolution: "Resolution",
};

export const WORLD_TYPE_MAP: Record<string, string> = {
  "Oriental fantasy": "Oriental fantasy",
  Xianxia: "Xianxia",
  "Urban superpower": "Urban superpower",
  "Science fiction": "Science fiction",
  "Western fantasy": "Western fantasy",
  "Post-apocalyptic wasteland": "Post-apocalyptic wasteland",
  "Alternate history": "Alternate history",
  Cyberpunk: "Cyberpunk",
  Custom: "Custom",
};

export const WORLD_LAYER_MAP: Record<string, string> = {
  foundation: "foundation",
  power: "power",
  society: "society",
  culture: "culture",
  history: "history",
  conflict: "conflict",
};

export const BEAT_ROLE_LABEL_MAP: Record<string, string> = {
  "Opening hook": "Opening hook",
  "First escalation": "First escalation",
  "Early complication": "Early complication",
  "Midpoint turn": "Midpoint turn",
  "Pre-climax pressure": "Pre-climax pressure",
  "Late complication": "Late complication",
  "Volume climax": "Volume climax",
  "Ending hook": "Ending hook",
  Beat: "Beat",
};

/** Exact-match product labels snapshotted onto tasks (currentItemLabel, titles). */
export const PRODUCT_SNAPSHOT_LABEL_MAP: Record<string, string> = {
  "new conversation": DEFAULT_THREAD_TITLE,
};

const EXACT_REWRITE_MAP: Record<string, string> = {
  ...STORY_FUNCTION_MAP,
  ...GROWTH_STAGE_MAP,
  ...WORLD_TYPE_MAP,
  ...WORLD_LAYER_MAP,
  ...BEAT_ROLE_LABEL_MAP,
  ...PRODUCT_SNAPSHOT_LABEL_MAP,
};

export function canonicalizeStoryFunction(value: string | null | undefined): StoryFunctionValue | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return STORY_FUNCTION_MAP[trimmed];
}

export function canonicalizeGrowthStage(value: string | null | undefined): GrowthStageValue | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return GROWTH_STAGE_MAP[trimmed];
}

export function canonicalizeWorldType(value: string | null | undefined): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return WORLD_TYPE_MAP[trimmed] ?? (trimmed ? trimmed : undefined);
}

export function canonicalizeWorldLayer(value: string | null | undefined): string | undefined {
  if (typeof value !== "string") return undefined;
  return WORLD_LAYER_MAP[value.trim()];
}

export function canonicalizeBeatRoleLabel(value: string | null | undefined): string | undefined {
  if (typeof value !== "string") return undefined;
  return BEAT_ROLE_LABEL_MAP[value.trim()];
}

export function isPlaceholderThreadTitle(value: string | null | undefined): boolean {
  if (typeof value !== "string") return false;
  return (LEGACY_THREAD_TITLES as readonly string[]).includes(value.trim());
}

export function rewriteExactProtocolString(value: string): string {
  const trimmed = value.trim();
  return EXACT_REWRITE_MAP[trimmed] ?? value;
}

export function rewriteProtocolJsonValue(value: unknown): unknown {
  if (typeof value === "string") {
    return rewriteExactProtocolString(value);
  }
  if (Array.isArray(value)) {
    return value.map((item) => rewriteProtocolJsonValue(item));
  }
  if (value && typeof value === "object") {
    const next: Record<string, unknown> = {};
    for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
      next[key] = rewriteProtocolJsonValue(nested);
    }
    return next;
  }
  return value;
}

export function rewriteProtocolJsonText(raw: string | null | undefined): string | null {
  if (!raw?.trim()) return raw ?? null;
  try {
    const parsed: unknown = JSON.parse(raw);
    const rewritten = rewriteProtocolJsonValue(parsed);
    const next = JSON.stringify(rewritten);
    return next === raw ? raw : next;
  } catch {
    return raw;
  }
}

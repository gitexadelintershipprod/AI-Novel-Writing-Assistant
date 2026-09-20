import { z } from "zod";
import type { NovelStoryMode, StoryModeConflictCeiling, StoryModeProfile } from "@ai-novel/shared/types/storyMode";

export const storyModeConflictCeilingSchema = z.enum(["low", "medium", "high"]);

export const storyModeProfileSchema = z.object({
  coreDrive: z.string().trim().min(1).max(300),
  readerReward: z.string().trim().min(1).max(300),
  progressionUnits: z.array(z.string().trim().min(1).max(120)).min(1).max(8),
  allowedConflictForms: z.array(z.string().trim().min(1).max(120)).min(1).max(8),
  forbiddenConflictForms: z.array(z.string().trim().min(1).max(120)).min(1).max(8),
  conflictCeiling: storyModeConflictCeilingSchema,
  resolutionStyle: z.string().trim().min(1).max(300),
  chapterUnit: z.string().trim().min(1).max(300),
  volumeReward: z.string().trim().min(1).max(300),
  mandatorySignals: z.array(z.string().trim().min(1).max(120)).min(1).max(8),
  antiSignals: z.array(z.string().trim().min(1).max(120)).min(1).max(8),
}).strict();

const DEFAULT_STORY_MODE_PROFILE: StoryModeProfile = {
  coreDrive: "Keep serial momentum by steadily cashing the core reading expectation.",
  readerReward: "Every few chapters, give a clear, noticeable payoff.",
  progressionUnits: ["Key-relation advance", "Stage-goal payoff"],
  allowedConflictForms: ["Low to medium intensity conflict consistent with primary drive"],
  forbiddenConflictForms: ["Unrelated high-pressure bloody conflict"],
  conflictCeiling: "medium",
  resolutionStyle: "Resolve problems in a way that fits this mode instead of forcing an escalation.",
  chapterUnit: "Each chapter turns on one clear unit of advance.",
  volumeReward: "Give a stage payoff at volume end that matches this mode.",
  mandatorySignals: ["Main drive keeps showing up", "Reader expectation is confirmed again"],
  antiSignals: ["Long-term deviation from main drive", "The intensity of the conflict is out of control"],
};

function normalizeText(value: unknown, fallback: string): string {
  const trimmed = typeof value === "string" ? value.trim() : "";
  return trimmed || fallback;
}

function normalizeList(value: unknown, fallback: string[]): string[] {
  if (!Array.isArray(value)) {
    return fallback;
  }
  const normalized = value
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter(Boolean)
    .slice(0, 8);
  return normalized.length > 0 ? normalized : fallback;
}

function normalizeConflictCeiling(value: unknown): StoryModeConflictCeiling {
  return value === "low" || value === "medium" || value === "high"
    ? value
    : DEFAULT_STORY_MODE_PROFILE.conflictCeiling;
}

export function sanitizeStoryModeProfile(value: unknown): StoryModeProfile {
  if (!value || typeof value !== "object") {
    return DEFAULT_STORY_MODE_PROFILE;
  }
  const record = value as Partial<StoryModeProfile>;
  return storyModeProfileSchema.parse({
    coreDrive: normalizeText(record.coreDrive, DEFAULT_STORY_MODE_PROFILE.coreDrive),
    readerReward: normalizeText(record.readerReward, DEFAULT_STORY_MODE_PROFILE.readerReward),
    progressionUnits: normalizeList(record.progressionUnits, DEFAULT_STORY_MODE_PROFILE.progressionUnits),
    allowedConflictForms: normalizeList(record.allowedConflictForms, DEFAULT_STORY_MODE_PROFILE.allowedConflictForms),
    forbiddenConflictForms: normalizeList(record.forbiddenConflictForms, DEFAULT_STORY_MODE_PROFILE.forbiddenConflictForms),
    conflictCeiling: normalizeConflictCeiling(record.conflictCeiling),
    resolutionStyle: normalizeText(record.resolutionStyle, DEFAULT_STORY_MODE_PROFILE.resolutionStyle),
    chapterUnit: normalizeText(record.chapterUnit, DEFAULT_STORY_MODE_PROFILE.chapterUnit),
    volumeReward: normalizeText(record.volumeReward, DEFAULT_STORY_MODE_PROFILE.volumeReward),
    mandatorySignals: normalizeList(record.mandatorySignals, DEFAULT_STORY_MODE_PROFILE.mandatorySignals),
    antiSignals: normalizeList(record.antiSignals, DEFAULT_STORY_MODE_PROFILE.antiSignals),
  });
}

export function parseStoryModeProfileJson(profileJson: string | null | undefined): StoryModeProfile {
  if (!profileJson?.trim()) {
    return DEFAULT_STORY_MODE_PROFILE;
  }
  try {
    return sanitizeStoryModeProfile(JSON.parse(profileJson));
  } catch {
    return DEFAULT_STORY_MODE_PROFILE;
  }
}

export function serializeStoryModeProfile(profile: unknown): string {
  return JSON.stringify(sanitizeStoryModeProfile(profile));
}

type StoryModeRow = {
  id: string;
  name: string;
  description?: string | null;
  template?: string | null;
  parentId?: string | null;
  profileJson?: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
};

export function normalizeStoryModeOutput<T extends StoryModeRow>(
  storyMode: T,
): Omit<T, "profileJson" | "createdAt" | "updatedAt"> & NovelStoryMode {
  const { profileJson, createdAt, updatedAt, ...rest } = storyMode;
  return {
    ...rest,
    profile: parseStoryModeProfileJson(profileJson),
    createdAt: typeof createdAt === "string" ? createdAt : createdAt.toISOString(),
    updatedAt: typeof updatedAt === "string" ? updatedAt : updatedAt.toISOString(),
  };
}

export function buildStoryModePromptBlock(input: {
  primary?: (Pick<NovelStoryMode, "id" | "name" | "description" | "template" | "profile">) | null;
  secondary?: (Pick<NovelStoryMode, "id" | "name" | "description" | "template" | "profile">) | null;
}): string {
  const sections: string[] = [];
  if (input.primary) {
    sections.push(formatSingleStoryModeBlock("Main story mode", input.primary, true));
  }
  if (input.secondary) {
    sections.push(formatSingleStoryModeBlock("Supporting story mode", input.secondary, false));
  }
  if (sections.length === 0) {
    return "";
  }
  return [
    "Story-mode constraint: the main mode is a hard constraint. The supporting mode can only add flavor and must not override the main mode's conflict ceiling or forbidden signals.",
    ...sections,
  ].join("\n\n");
}

function formatSingleStoryModeBlock(
  label: string,
  storyMode: Pick<NovelStoryMode, "name" | "description" | "template" | "profile">,
  isPrimary: boolean,
): string {
  const profile = storyMode.profile;
  return [
    `${label}: ${storyMode.name}`,
    storyMode.description ? `Note: ${storyMode.description}` : "",
    storyMode.template ? `Extra template: ${storyMode.template}` : "",
    `Core driver:${profile.coreDrive}`,
    `Reader reward: ${profile.readerReward}`,
    `Chapter advancement unit: ${profile.chapterUnit}`,
    `Volume-end payoff: ${profile.volumeReward}`,
    `Allowed conflict forms: ${profile.allowedConflictForms.join(", ")}`,
    `Forbidden conflict forms: ${profile.forbiddenConflictForms.join(", ")}`,
    `Conflict limit:${profile.conflictCeiling}`,
    `Resolution style: ${profile.resolutionStyle}`,
    `Signals that must keep recurring: ${profile.mandatorySignals.join(", ")}`,
    `Deviation signals that must be avoided: ${profile.antiSignals.join(", ")}`,
    `Main plot-advance units: ${profile.progressionUnits.join(", ")}`,
    isPrimary
      ? "Usage rule: later planning and generation must follow this mode first."
      : "Usage rule: use this only as extra flavor; do not break the main mode's bounds.",
  ].filter(Boolean).join("\n");
}

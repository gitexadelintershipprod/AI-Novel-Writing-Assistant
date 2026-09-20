import { z } from "zod";
import { generatedChapterSceneCardSchema } from "@ai-novel/shared/types/chapterLengthControl";
import { generatedReaderExperienceContractSchema } from "@ai-novel/shared/types/novel/readerExperience";

const conciseRequiredText = z.string().trim().min(1).max(240);
const conciseTextList = z.array(z.string().trim().min(1).max(160)).max(8).default([]);
const boundedReaderExperienceSchema = generatedReaderExperienceContractSchema.extend({
  readerQuestion: conciseRequiredText,
  promisedReward: conciseRequiredText,
  protagonistWant: conciseRequiredText,
  primaryResistance: conciseRequiredText,
  keyTurn: conciseRequiredText,
  emotionalShift: conciseRequiredText,
  informationReveal: conciseRequiredText,
  netChange: conciseRequiredText,
  inheritedHookResponsibilities: z.array(z.string().trim().min(1).max(160)).max(4),
  endingHook: conciseRequiredText,
});
const boundedSceneCardSchema = generatedChapterSceneCardSchema.extend({
  key: z.string().trim().min(1).max(48),
  title: z.string().trim().min(1).max(64),
  purpose: conciseRequiredText,
  mustAdvance: conciseTextList,
  mustPreserve: conciseTextList,
  entryState: conciseRequiredText,
  exitState: conciseRequiredText,
  forbiddenExpansion: conciseTextList,
  resistance: conciseRequiredText,
  turn: conciseRequiredText,
  emotionalShift: conciseRequiredText,
  readerValue: conciseRequiredText,
});

function normalizeObjectAlias(raw: unknown, aliasMap: Record<string, string[]>): unknown {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return raw;
  }
  const record = { ...(raw as Record<string, unknown>) };
  for (const [canonicalKey, aliases] of Object.entries(aliasMap)) {
    if (record[canonicalKey] !== undefined && record[canonicalKey] !== null) {
      continue;
    }
    for (const alias of aliases) {
      if (record[alias] !== undefined && record[alias] !== null) {
        record[canonicalKey] = record[alias];
        break;
      }
    }
  }
  return record;
}

function normalizeInteger(value: unknown): unknown {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.round(value);
  }
  if (typeof value === "string") {
    const parsed = Number(value.trim());
    if (Number.isFinite(parsed)) {
      return Math.round(parsed);
    }
  }
  return value;
}

function normalizeStringArray(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value;
  }
  if (typeof value === "string") {
    return value
      .split(/[\n,，;；、|]/g)
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return value;
}

function normalizeSceneCardPayload(raw: unknown): unknown {
  const normalized = normalizeObjectAlias(raw, {
    key: ["sceneKey", "id"],
    title: ["sceneTitle", "label", "name"],
    purpose: ["objective", "goal", "summary"],
    mustAdvance: ["mustAdvanceItems", "advanceItems", "deliverables"],
    mustPreserve: ["mustPreserveItems", "preserveItems", "guardrails"],
    entryState: ["startState", "sceneEntry", "openingState"],
    exitState: ["endState", "sceneExit", "closingState"],
    forbiddenExpansion: ["forbiddenExpansions", "mustAvoid", "forbidden"],
    targetWordCount: ["target_word_count", "targetWords", "wordCount", "budget", "word count"],
    resistance: ["obstacle", "opposition", "sceneResistance", "resistance"],
    turn: ["turningPoint", "reversal", "sceneTurn", "Turn"],
    emotionalShift: ["emotionShift", "emotionalTurn", "emotional displacement"],
    readerValue: ["readerReward", "scenePayoff", "reader value", "Reader feedback"],
  });
  if (!normalized || typeof normalized !== "object" || Array.isArray(normalized)) {
    return normalized;
  }
  const record = normalized as Record<string, unknown>;
  return {
    ...record,
    mustAdvance: normalizeStringArray(record.mustAdvance),
    mustPreserve: normalizeStringArray(record.mustPreserve),
    forbiddenExpansion: normalizeStringArray(record.forbiddenExpansion),
    targetWordCount: normalizeInteger(record.targetWordCount),
  };
}

function normalizeScenePlanPayload(raw: unknown): unknown {
  const normalized = normalizeObjectAlias(raw, {
    taskSheet: ["task_sheet", "writingTask"],
    sceneCards: ["scenePlan", "scenes", "scene_cards", "sceneCardList"],
    readerExperience: ["readerExperienceContract", "reader_experience"],
  });
  if (!normalized || typeof normalized !== "object" || Array.isArray(normalized)) {
    return normalized;
  }
  const record = normalized as Record<string, unknown>;
  return {
    ...record,
    sceneCards: Array.isArray(record.sceneCards)
      ? record.sceneCards.map((item) => normalizeSceneCardPayload(item))
      : record.sceneCards,
  };
}

function normalizeBoundaryPayload(raw: unknown): unknown {
  const normalized = normalizeObjectAlias(raw, {
    exclusiveEvent: ["exclusive_event", "chapterExclusiveEvent"],
    endingState: ["ending_state", "chapterEndingState"],
    nextChapterEntryState: ["next_chapter_entry_state", "nextEntryState"],
    conflictLevel: ["conflict_level", "conflict"],
    revealLevel: ["reveal_level", "reveal"],
    targetWordCount: ["target_word_count", "wordCount"],
    mustAvoid: ["must_avoid"],
    payoffRefs: ["payoff_refs", "payoffs"],
  });
  if (!normalized || typeof normalized !== "object" || Array.isArray(normalized)) {
    return normalized;
  }
  const record = normalized as Record<string, unknown>;
  return {
    ...record,
    conflictLevel: normalizeInteger(record.conflictLevel),
    revealLevel: normalizeInteger(record.revealLevel),
    targetWordCount: normalizeInteger(record.targetWordCount),
    mustAvoid: Array.isArray(record.mustAvoid)
      ? record.mustAvoid.map((item) => String(item).trim()).filter(Boolean).join("；")
      : record.mustAvoid,
    payoffRefs: normalizeStringArray(record.payoffRefs),
  };
}

export function createChapterPurposeSchema() {
  return z.preprocess(
    (raw) => normalizeObjectAlias(raw, {
      purpose: ["chapterGoal", "goal", "objective"],
    }),
    z.object({
      purpose: conciseRequiredText,
    }),
  );
}

export function createChapterBoundarySchema() {
  return z.preprocess(normalizeBoundaryPayload, z.object({
    exclusiveEvent: conciseRequiredText,
    endingState: conciseRequiredText,
    nextChapterEntryState: conciseRequiredText,
    conflictLevel: z.number().int().min(0).max(100),
    revealLevel: z.number().int().min(0).max(100),
    targetWordCount: z.number().int().min(200).max(20000),
    mustAvoid: conciseRequiredText,
    payoffRefs: z.array(z.string().trim().min(1).max(160)).max(8).default([]),
  }));
}

export function createChapterTaskSheetSchema() {
  return z.preprocess(normalizeScenePlanPayload, z.object({
    taskSheet: z.string().trim().min(1).max(600),
    readerExperience: boundedReaderExperienceSchema,
    sceneCards: z.array(z.preprocess(normalizeSceneCardPayload, boundedSceneCardSchema)).min(3).max(8),
  }));
}

export function createChapterExecutionContractSchema() {
  return z.preprocess(
    (raw) => normalizeScenePlanPayload(normalizeBoundaryPayload(normalizeObjectAlias(raw, {
      purpose: ["chapterGoal", "goal", "objective"],
    }))),
    z.object({
      purpose: conciseRequiredText,
      exclusiveEvent: conciseRequiredText,
      endingState: conciseRequiredText,
      nextChapterEntryState: conciseRequiredText,
      conflictLevel: z.number().int().min(0).max(100),
      revealLevel: z.number().int().min(0).max(100),
      targetWordCount: z.number().int().min(200).max(20000),
      mustAvoid: conciseRequiredText,
      payoffRefs: z.array(z.string().trim().min(1).max(160)).max(8).default([]),
      taskSheet: z.string().trim().min(1).max(600),
      readerExperience: boundedReaderExperienceSchema,
      sceneCards: z.array(z.preprocess(normalizeSceneCardPayload, boundedSceneCardSchema)).min(3).max(8),
    }),
  );
}

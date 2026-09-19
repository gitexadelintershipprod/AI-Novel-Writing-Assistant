import type {
  VolumeChapterTargetRange,
  VolumeCountGuidance,
  VolumeCountRange,
  VolumeScaleProfile,
} from "./novel";

export const MIN_TOTAL_CHAPTER_BUDGET = 12;
export const MAX_VOLUME_COUNT = 24;
export const DEFAULT_VOLUME_CHAPTER_TARGET_RANGE: VolumeChapterTargetRange = {
  min: 40,
  ideal: 55,
  max: 70,
};

function clampInteger(value: number, min: number, max: number): number {
  return Math.min(Math.max(Math.round(value), min), max);
}

function normalizePositiveInteger(value: number | null | undefined): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return null;
  }
  const rounded = Math.round(value);
  return rounded > 0 ? rounded : null;
}

export function buildHardPlannedVolumeRange(recommendedVolumeCount: number): VolumeCountRange {
  const normalizedCount = Math.max(1, Math.round(recommendedVolumeCount));
  if (normalizedCount <= 3) {
    return {
      min: normalizedCount,
      max: normalizedCount,
    };
  }
  if (normalizedCount <= 6) {
    return {
      min: 3,
      max: Math.min(4, normalizedCount),
    };
  }
  return {
    min: 3,
    max: Math.min(6, normalizedCount),
  };
}

function buildDecisionVolumeCountRange(chapterBudget: number, maxVolumeCount: number): {
  range: VolumeCountRange;
  profile: VolumeScaleProfile;
  rationale: string;
} {
  if (chapterBudget < 60) {
    return {
      range: { min: 1, max: Math.min(2, maxVolumeCount) },
      profile: "short",
      rationale: "A short story or short novella can retain the structure of one or two paragraphs, and the priority is to ensure that the opening promise and the fulfillment of the ending are not broken up.",
    };
  }
  if (chapterBudget < 120) {
    return {
      range: { min: 3, max: Math.min(4, maxVolumeCount) },
      profile: "compact",
      rationale: "Chapters 60 and above require a structure of more than three paragraphs by default to avoid the middle part being out of focus after being compressed into the opening volume and the ending volume.",
    };
  }
  if (chapterBudget < 250) {
    return {
      range: { min: 4, max: Math.min(6, maxVolumeCount) },
      profile: "standard",
      rationale: "The volume of the novel requires multiple stages of commitment, leaving independent space for the opening, the turning in the middle, and the fulfillment at the end.",
    };
  }
  if (chapterBudget < 500) {
    return {
      range: { min: 6, max: Math.min(9, maxVolumeCount) },
      profile: "long",
      rationale: "Long stories need to have a clearer volume-level rhythm based on selling point switching, pressure escalation, and stage fulfillment.",
    };
  }
  if (chapterBudget < 900) {
    return {
      range: { min: 9, max: Math.min(14, maxVolumeCount) },
      profile: "epic",
      rationale: "Larger novels need more volume-level reward points to avoid a single volume that is too thick, which will weaken the sense of stage and the motivation to follow reading.",
    };
  }
  if (chapterBudget < 1500) {
    return {
      range: { min: 14, max: Math.min(20, maxVolumeCount) },
      profile: "epic",
      rationale: "Ultra-long stories need to maintain volume-level granularity, allowing maps, forces, abilities, and relationship stages to unfold gradually.",
    };
  }
  return {
    range: { min: 18, max: maxVolumeCount },
    profile: "mega",
    rationale: "By default, the number of volumes for super-long novels is close to the maximum, and priority is given to ensuring the density of redemption and subsequent schedulable space for long-term serialization.",
  };
}

export function buildVolumeCountGuidance(params: {
  chapterBudget: number;
  existingVolumeCount?: number | null;
  respectExistingVolumeCount?: boolean;
  userPreferredVolumeCount?: number | null;
  maxVolumeCount?: number;
  targetChapterRange?: VolumeChapterTargetRange;
}): VolumeCountGuidance {
  const maxVolumeCount = Math.max(1, Math.round(params.maxVolumeCount ?? MAX_VOLUME_COUNT));
  const targetChapterRange = params.targetChapterRange ?? DEFAULT_VOLUME_CHAPTER_TARGET_RANGE;
  const chapterBudget = Math.max(
    MIN_TOTAL_CHAPTER_BUDGET,
    Math.round(Number.isFinite(params.chapterBudget) ? params.chapterBudget : MIN_TOTAL_CHAPTER_BUDGET),
  );

  const allowedVolumeCountRange: VolumeCountRange = {
    min: 1,
    max: maxVolumeCount,
  };
  if (allowedVolumeCountRange.max < allowedVolumeCountRange.min) {
    allowedVolumeCountRange.max = allowedVolumeCountRange.min;
  }

  const decisionGuidance = buildDecisionVolumeCountRange(chapterBudget, maxVolumeCount);
  const decisionVolumeCountRange: VolumeCountRange = {
    min: clampInteger(decisionGuidance.range.min, allowedVolumeCountRange.min, allowedVolumeCountRange.max),
    max: clampInteger(decisionGuidance.range.max, allowedVolumeCountRange.min, allowedVolumeCountRange.max),
  };
  if (decisionVolumeCountRange.max < decisionVolumeCountRange.min) {
    decisionVolumeCountRange.max = decisionVolumeCountRange.min;
  }

  const systemRecommendedVolumeCount = clampInteger(
    Math.round(chapterBudget / targetChapterRange.ideal),
    decisionVolumeCountRange.min,
    decisionVolumeCountRange.max,
  );

  const normalizedUserPreferredVolumeCount = normalizePositiveInteger(params.userPreferredVolumeCount);
  const userPreferredVolumeCount = normalizedUserPreferredVolumeCount == null
    ? null
    : clampInteger(
      normalizedUserPreferredVolumeCount,
      allowedVolumeCountRange.min,
      allowedVolumeCountRange.max,
    );

  const normalizedExistingVolumeCount = normalizePositiveInteger(params.existingVolumeCount);
  const respectedExistingVolumeCount = (
    params.respectExistingVolumeCount !== false
    && userPreferredVolumeCount == null
    && normalizedExistingVolumeCount != null
  )
    ? clampInteger(
      normalizedExistingVolumeCount,
      allowedVolumeCountRange.min,
      allowedVolumeCountRange.max,
    )
    : null;

  const recommendedVolumeCount = userPreferredVolumeCount
    ?? respectedExistingVolumeCount
    ?? systemRecommendedVolumeCount;

  return {
    chapterBudget,
    targetChapterRange,
    allowedVolumeCountRange,
    decisionVolumeCountRange,
    volumeScaleProfile: decisionGuidance.profile,
    volumeCountRationale: decisionGuidance.rationale,
    recommendedVolumeCount,
    systemRecommendedVolumeCount,
    hardPlannedVolumeRange: buildHardPlannedVolumeRange(recommendedVolumeCount),
    userPreferredVolumeCount,
    respectedExistingVolumeCount,
  };
}

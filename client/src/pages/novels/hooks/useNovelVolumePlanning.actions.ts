import type {
  VolumeBeatSheet,
  VolumeChapterListGenerationMode,
  VolumeGenerationScopeInput,
  VolumePlan,
  VolumePlanDocument,
} from "@ai-novel/shared/types/novel";
import { findBeatSheet } from "../volumePlan.utils";
import type { ChapterDetailMode } from "../chapterDetailPlanning.shared";

export interface ChapterListGenerationRequest {
  generationMode?: VolumeChapterListGenerationMode;
  targetBeatKey?: string;
}

export interface VolumeGenerationPayload {
  scope: VolumeGenerationScopeInput;
  generationMode?: VolumeChapterListGenerationMode;
  targetVolumeId?: string;
  targetBeatKey?: string;
  targetChapterId?: string;
  detailMode?: ChapterDetailMode;
  draftVolumesOverride?: VolumePlan[];
  suppressSuccessMessage?: boolean;
}

export function startStrategyGenerationAction(params: {
  ensureCharacterGuard: () => boolean;
  userPreferredVolumeCount: number | null;
  forceSystemRecommendedVolumeCount: boolean;
  volumeCountGuidance: {
    systemRecommendedVolumeCount: number;
    allowedVolumeCountRange: { min: number; max: number };
    decisionVolumeCountRange: { min: number; max: number };
    respectedExistingVolumeCount?: number | null;
  };
  hasUnsavedVolumeDraft: boolean;
  generate: (payload: VolumeGenerationPayload) => void;
}): void {
  if (!params.ensureCharacterGuard()) {
    return;
  }
  const confirmed = window.confirm([
    "Volume strategy recommendations will be generated to help determine the number of recommended volumes, the number of hard-planned volumes, and the role of each volume.",
    "This step will not directly generate the volume skeleton, nor will it split chapters.",
    params.userPreferredVolumeCount != null
      ? `This run will generate the volume strategy as exactly ${params.userPreferredVolumeCount} volumes.`
      : params.forceSystemRecommendedVolumeCount
        ? `This run will use the system-recommended volume count (currently ${params.volumeCountGuidance.systemRecommendedVolumeCount}) and will not keep the draft volume count.`
        : params.volumeCountGuidance.respectedExistingVolumeCount != null
          ? `This run will prefer the current draft's ${params.volumeCountGuidance.respectedExistingVolumeCount}-volume structure, while staying inside the allowed range ${params.volumeCountGuidance.allowedVolumeCountRange.min}-${params.volumeCountGuidance.allowedVolumeCountRange.max}.`
          : `The system currently recommends ${params.volumeCountGuidance.systemRecommendedVolumeCount} volumes, with a structure range of ${params.volumeCountGuidance.decisionVolumeCountRange.min}-${params.volumeCountGuidance.decisionVolumeCountRange.max}.`,
    params.hasUnsavedVolumeDraft ? "This time, the unsaved draft of the current page will be used directly as a reference." : "This time suggestions will be generated based on the current workspace status.",
  ].join("\n\n"));
  if (!confirmed) {
    return;
  }
  params.generate({ scope: "strategy" });
}

export function startStrategyCritiqueAction(params: {
  ensureCharacterGuard: () => boolean;
  generate: (payload: VolumeGenerationPayload) => void;
}): void {
  if (!params.ensureCharacterGuard()) {
    return;
  }
  params.generate({ scope: "strategy_critique" });
}

export function startSkeletonGenerationAction(params: {
  ensureCharacterGuard: () => boolean;
  hasUnsavedVolumeDraft: boolean;
  generate: (payload: VolumeGenerationPayload) => void;
}): void {
  if (!params.ensureCharacterGuard()) {
    return;
  }
  const confirmed = window.confirm([
    "A full volume skeleton will be generated or regenerated based on current volume strategy recommendations.",
    "This step will clear the existing rhythm board and adjacent volume rebalancing suggestions, but it will not directly delete the chapter text.",
    params.hasUnsavedVolumeDraft ? "This time, the current page draft will be used directly as the volume skeleton context." : "This time we will continue to advance based on the current volume workspace.",
  ].join("\n\n"));
  if (!confirmed) {
    return;
  }
  params.generate({ scope: "skeleton" });
}

export function startBeatSheetGenerationAction(params: {
  volumeId: string;
  normalizedVolumeDraft: VolumePlan[];
  strategyPlan: object | null;
  beatSheets: VolumeBeatSheet[];
  ensureCharacterGuard: () => boolean;
  setStructuredMessage: (value: string) => void;
  generate: (payload: VolumeGenerationPayload) => void;
}): void {
  const targetVolume = params.normalizedVolumeDraft.find((volume) => volume.id === params.volumeId);
  if (!targetVolume) {
    params.setStructuredMessage("The current volume does not exist and the rhythm board cannot be generated.");
    return;
  }
  if (!params.strategyPlan) {
    params.setStructuredMessage("Please generate volume strategy suggestions first, then generate the current volume rhythm board.");
    return;
  }
  if (!params.ensureCharacterGuard()) {
    return;
  }
  const existingBeatSheet = findBeatSheet(params.beatSheets, params.volumeId);
  if (existingBeatSheet) {
    const confirmed = window.confirm([
      `This will regenerate the beat sheet for "${targetVolume.title?.trim() || `Volume ${targetVolume.sortOrder}`}".`,
      "This step will overwrite existing rhythm sections and deliverables for the current volume.",
      "Existing chapter lists and chapter refinement assets will not be deleted directly, but if the new pacing interval changes, it is recommended to check later to see if the chapter lists still match.",
    ].join("\n\n"));
    if (!confirmed) {
      return;
    }
  }
  params.generate({
    scope: "beat_sheet",
    targetVolumeId: params.volumeId,
  });
}

export function startChapterListGenerationAction(params: {
  volumeId: string;
  request?: ChapterListGenerationRequest;
  normalizedVolumeDraft: VolumePlan[];
  beatSheets: VolumeBeatSheet[];
  ensureCharacterGuard: () => boolean;
  setStructuredMessage: (value: string) => void;
  generate: (payload: VolumeGenerationPayload) => void;
}): void {
  const targetVolume = params.normalizedVolumeDraft.find((volume) => volume.id === params.volumeId);
  if (!targetVolume) {
    params.setStructuredMessage("The current volume does not exist and the chapter list cannot be generated.");
    return;
  }
  if (!findBeatSheet(params.beatSheets, params.volumeId)) {
    params.setStructuredMessage("There is no rhythm board in the current volume, so the chapter list cannot be directly opened by default.");
    return;
  }
  if (!params.ensureCharacterGuard()) {
    return;
  }
  const generationMode = params.request?.generationMode ?? "full_volume";
  const targetBeatKey = params.request?.targetBeatKey?.trim();
  if (generationMode === "single_beat" && !targetBeatKey) {
    params.setStructuredMessage("The current rhythm section does not exist, and the chapter title of this section cannot be reborn.");
    return;
  }
  params.generate({
    scope: "chapter_list",
    generationMode,
    targetVolumeId: params.volumeId,
    targetBeatKey,
  });
}

export function buildChapterListSuccessMessage(params: {
  document: VolumePlanDocument;
  targetVolumeId?: string;
  generationMode?: VolumeChapterListGenerationMode;
  targetBeatKey?: string;
  autoSyncedToChapterExecution?: boolean;
}): string {
  const updatedVolume = params.targetVolumeId
    ? params.document.volumes.find((volume) => volume.id === params.targetVolumeId)
    : undefined;
  const updatedChapterCount = updatedVolume?.chapters.length ?? 0;
  const syncSuffix = params.autoSyncedToChapterExecution ? ", and connect to the chapter execution area" : "";
  if (params.generationMode === "single_beat" && params.targetVolumeId && params.targetBeatKey) {
    const targetBeat = findBeatSheet(params.document.beatSheets, params.targetVolumeId)?.beats
      .find((beat) => beat.key === params.targetBeatKey);
    const beatLabel = targetBeat
      ? `${targetBeat.label}${targetBeat.title ? ` · ${targetBeat.title}` : ""}`
      : params.targetBeatKey;
    return updatedChapterCount > 0
      ? `Beat "${beatLabel}" in the current volume was generated and saved automatically${syncSuffix}. This volume now has ${updatedChapterCount} chapters.`
      : `Beat "${beatLabel}" in the current volume was generated and saved automatically${syncSuffix}.`;
  }
  return updatedChapterCount > 0
    ? `The current volume chapter list was generated and saved automatically${syncSuffix}. It now has ${updatedChapterCount} chapters, and neighboring-volume rebalance suggestions were updated.`
    : `The current volume chapter list was generated and saved automatically${syncSuffix}, and neighboring-volume rebalance suggestions were updated.`;
}

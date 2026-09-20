/**
 * Unified image-generation runtime types and Adapter interface.
 *
 * Intent: comic had 5 image-generation entry points and drama had 2 (7 total),
 * each historically duplicating the same boilerplate:
 * "business-table JSON field + idle→generating→done/error state machine + disk persist + cleanup of old extensions".
 * This module lifts that boilerplate into the runner so it runs once, while each Adapter maps that entry's state fields.
 *
 * Persistence is unchanged: status still lives in business-table JSON fields (sheetData/imageData/portraitData/keyframeData).
 * This does not replace ImageGenerationService (novel covers and the older character-image flow use a two-table model).
 */
import type { ImageSize } from "../types";
import type { LLMProvider } from "@ai-novel/shared/types/llm";

// ─── State ────────────────────────────────────────────────────────────────────

export type GeneratedImageStatus = "idle" | "generating" | "done" | "error";

export interface GeneratedImageHistoryItem {
  version: number;
  url?: string;
  prompt?: string;
  provider?: string;
  generatedAt?: string;
}

/** Metadata for generated reference material (written after a successful image, for frontend provenance). */
export interface GeneratedReferenceImageMeta {
  /** character_sheet=turnaround | character_expression=expression sheet | character_face=face crop | asset=character asset | scene=scene setting art */
  kind: "character_sheet" | "character_expression" | "character_face" | "asset" | "scene";
  /** Human-readable label */
  label: string;
  /** HTTP URL */
  url: string;
}

/** Unified state shape for every image-generation entry point. */
export interface GeneratedImageState {
  status: GeneratedImageStatus;
  version?: number;
  url?: string;
  prompt?: string;
  provider?: string;
  generatedAt?: string;
  error?: string;
  origin?: "generated" | "uploaded";
  history?: GeneratedImageHistoryItem[];
  /** Reference material actually used for this generation (written only on success). */
  referenceImages?: GeneratedReferenceImageMeta[];
}

// ─── Adapter interface ────────────────────────────────────────────────────────

/**
 * Adapts read/write of a business table's state fields. Each image-generation entry
 * (character turnaround / expression sheet / asset / scene / panel / drama character / drama keyframe)
 * implements an Adapter that encapsulates how to read current status from the business table,
 * how to write the new state back, and how to compute the disk path and HTTP URL.
 *
 * `TState` may extend GeneratedImageState to keep entry-specific fields
 * (nested expression-sheet location, drama portraitData compatibility fields).
 */
export interface ImageTargetAdapter<TState extends GeneratedImageState = GeneratedImageState> {
  /** Identifier used in logs/trace (e.g. "comic.character.sheet" / "drama.shot.keyframe"). */
  readonly kind: string;
  /** Read current state (return { status: "idle" } if missing). */
  loadState(): Promise<TState>;
  /** Write state (generating / done / error all go through this). */
  saveState(state: TState): Promise<void>;
  /** Compute the absolute disk path (extension is already known). */
  diskPath(ext: string): string;
  /** Return an HTTP-accessible URL (written to state.url). */
  publicUrl(): string;
  /** Delete old files with other extensions in the same directory (overwrite generation); optional. */
  cleanupOtherExts?(keepExt: string): Promise<void>;
  /** Versioning: archive history + increment version. If omitted, history is kept but the current image is not archived. */
  versioning?: {
    enabled: boolean;
    /** Max history entries to keep; default 5. */
    maxHistory?: number;
    /** Convert the current done state into a history item on archive; default copies url/prompt/provider/generatedAt/version. */
    archiveCurrent?: (current: TState) => Promise<GeneratedImageHistoryItem | null>;
  };
  /** Merge business-specific state fields (e.g. also write the result into compatibility fields); optional. */
  buildExtraDoneState?(base: GeneratedImageState): Partial<TState>;
}

// ─── runImageGeneration options ───────────────────────────────────────────────

export interface RunImageGenerationOptions {
  /** LLM provider (defaults to the caller's default). */
  provider?: LLMProvider | string;
  /** Fully built prompt. */
  prompt: string;
  negativePrompt?: string;
  /** Image size (default 1024x1536, portrait comic/character). */
  size?: ImageSize;
  /** Number of images to generate (default 1). */
  count?: number;
  /** Local reference-image paths (higher priority than refImages). */
  refImagePaths?: string[];
  /** Reference-image URLs. */
  refImages?: string[];
  /** Reference metadata written to imageData.referenceImages (for frontend provenance). */
  referenceImages?: GeneratedReferenceImageMeta[];
  /** sceneType passed through to the underlying provider (providers have different defaults). */
  sceneType?: "character" | "novel_cover" | "chapter_illustration";
}

export const DEFAULT_RUNTIME_PROVIDER: LLMProvider = "openai";
export const DEFAULT_RUNTIME_SIZE: ImageSize = "1024x1536";

// ─── Pre-generation preview (confirmation dialog) ─────────────────────────────

/**
 * Snapshot returned by service.prepare() of all material that will be sent to the image model.
 * The frontend shows this in a dialog; the user confirms (and may temporarily change prompt/provider/size)
 * before calling generate.
 */
export interface ImageGenerationPreview {
  /** Entry kind, e.g. "comic.character-asset" / "comic.scene" / "comic.panel" / "drama.character". */
  kind: string;
  /** Entry title shown in the frontend, e.g. "Generate scene setting art: Sect Hall". */
  title: string;
  /** Prompt about to be sent (full text; the frontend may edit it and pass it back via override). */
  prompt: string;
  negativePrompt?: string;
  /** Reference material list (frontend thumbnails; URLs can be used as img src). */
  referenceImages: GeneratedReferenceImageMeta[];
  /** Default provider; the user may change it in the dialog. */
  provider: string;
  /** Default size; the user may change it in the dialog. */
  size: ImageSize;
  /** Optional provider list for the frontend dropdown (supplied by the caller). */
  availableProviders?: Array<{ value: string; label: string }>;
  /** Optional size list for the frontend dropdown. */
  availableSizes?: ImageSize[];
}

/**
 * Override parameters sent back when the frontend confirms.
 * All optional — omitted fields keep the service defaults.
 */
export interface ImageGenerationOverrides {
  promptOverride?: string;
  providerOverride?: string;
  sizeOverride?: ImageSize;
  negativePromptOverride?: string;
  /** Reference-image URLs the user temporarily removed in the confirm dialog; they are not sent for this generation. */
  excludedReferenceImageUrls?: string[];
}

/**
 * Image-generation runner: the single flow that runs "business-table JSON state machine + disk persist".
 *
 * Adapters handle field read/write for each business table; this file does not know concrete business models.
 *
 * Flow:
 *   resolve/validate provider → resolve model → loadState → archive history / increment version
 *   → save generating → generateImagesByProvider → persist to disk → cleanupOtherExts
 *   → save done (write url/prompt/provider/generatedAt/history/referenceImages, etc.)
 *   catch → save error
 *
 * Adapter.buildExtraDoneState is for business customization (drama compatibility fields, nested expression-sheet location).
 */
import path from "path";

import { AppError } from "../../../middleware/errorHandler";
import {
  generateImagesByProvider,
  isImageProviderSupported,
  resolveImageModel,
} from "../provider";
import type { LLMProvider } from "@ai-novel/shared/types/llm";

import {
  DEFAULT_RUNTIME_PROVIDER,
  DEFAULT_RUNTIME_SIZE,
  type GeneratedImageHistoryItem,
  type GeneratedImageState,
  type ImageTargetAdapter,
  type RunImageGenerationOptions,
} from "./types";
import { describeError, inferExtension, saveImageToDisk } from "./utils";

const DEFAULT_HISTORY_MAX = 5;

/** Archive the current done state as a history item. */
function defaultArchive<TState extends GeneratedImageState>(current: TState): GeneratedImageHistoryItem | null {
  if (current.status !== "done") return null;
  return {
    version: current.version ?? 1,
    url: current.url,
    prompt: current.prompt,
    provider: current.provider,
    generatedAt: current.generatedAt,
  };
}

/** Read the next version number. */
function readVersion(state: GeneratedImageState): number {
  const v = Number(state.version);
  if (Number.isFinite(v) && v > 0) return Math.round(v);
  return state.status === "done" ? 1 : 0;
}

export async function runImageGeneration<TState extends GeneratedImageState>(
  adapter: ImageTargetAdapter<TState>,
  opts: RunImageGenerationOptions,
): Promise<TState> {
  // 1. Resolve and validate provider
  const provider = (opts.provider as LLMProvider | undefined) ?? DEFAULT_RUNTIME_PROVIDER;
  if (!isImageProviderSupported(provider)) {
    throw new AppError(`Image provider ${provider} is not supported yet.`, 400);
  }

  // 2. Resolve model
  const model = await resolveImageModel(provider);

  // 3. loadState + archive / version
  const existing = await adapter.loadState();
  const versioning = adapter.versioning ?? { enabled: false };
  const archiver = versioning.archiveCurrent ?? defaultArchive;
  const archived = versioning.enabled ? await archiver(existing) : null;
  const prevHistory: GeneratedImageHistoryItem[] = Array.isArray(existing.history) ? existing.history : [];
  const nextHistory = (archived ? [...prevHistory, archived] : prevHistory).slice(-(versioning.maxHistory ?? DEFAULT_HISTORY_MAX));
  const nextVersion = existing.status === "done"
    ? readVersion(existing) + 1
    : Math.max(1, readVersion(existing) || 1);

  // 4. Mark generating
  const generatingState = {
    ...existing,
    status: "generating",
    provider,
    version: nextVersion,
    history: nextHistory,
    // Clear the previous error so it is not shown by mistake
    error: undefined,
  } as TState;
  await adapter.saveState(generatingState);

  // 5. Call provider and persist to disk
  try {
    const result = await generateImagesByProvider({
      sceneType: opts.sceneType ?? "chapter_illustration",
      provider,
      model,
      prompt: opts.prompt,
      ...(opts.negativePrompt ? { negativePrompt: opts.negativePrompt } : {}),
      size: opts.size ?? DEFAULT_RUNTIME_SIZE,
      count: opts.count ?? 1,
      ...(opts.refImagePaths && opts.refImagePaths.length > 0 ? { refImagePaths: opts.refImagePaths } : {}),
      ...(opts.refImages && opts.refImages.length > 0 ? { refImages: opts.refImages } : {}),
    });

    const imageUrl = result.images?.[0]?.url;
    if (!imageUrl) throw new Error("The image-generation result is empty");

    const ext = inferExtension(imageUrl);
    const destPath = adapter.diskPath(ext);
    await saveImageToDisk(imageUrl, destPath);
    if (adapter.cleanupOtherExts) await adapter.cleanupOtherExts(ext);

    console.log(`[image.runtime] done kind=${adapter.kind} provider=${provider} model=${model} -> ${path.basename(destPath)}`);

    // 6. Write done
    const doneBase: GeneratedImageState = {
      status: "done",
      version: nextVersion,
      url: adapter.publicUrl(),
      prompt: opts.prompt,
      provider,
      generatedAt: new Date().toISOString(),
      history: nextHistory,
      ...(opts.referenceImages && opts.referenceImages.length > 0 ? { referenceImages: opts.referenceImages } : {}),
    };
    const extraDone = adapter.buildExtraDoneState ? adapter.buildExtraDoneState(doneBase) : ({} as Partial<TState>);
    const doneState = { ...existing, ...doneBase, ...extraDone } as TState;
    await adapter.saveState(doneState);
    return doneState;
  } catch (err) {
    const errMsg = describeError(err);
    console.error(`[image.runtime] error kind=${adapter.kind} provider=${provider}:`, errMsg);
    const errorState = {
      ...existing,
      status: "error",
      provider,
      version: nextVersion,
      error: errMsg,
      history: nextHistory,
    } as TState;
    await adapter.saveState(errorState);
    throw err;
  }
}

/**
 * DramaCharacterImageService
 * Generate a short-drama character design sheet: one landscape image with a face close-up plus front/side/back turnaround.
 * Aligns with industry character-reference conventions: generate once, keep all views consistent, and use it as the visual anchor for video.
 *
 * Design rules:
 * - Depend only on platform image capability (provider.ts); do not import novel business services.
 * - Store images under drama-characters/{charId}/ and serve them through a dedicated endpoint.
 * - characterSheetData holds the design sheet (primary); portraitData/threeViewData stay as compatibility fallbacks.
 */
import fs from "fs/promises";
import path from "path";

import { prisma } from "../../db/prisma";
import { AppError } from "../../middleware/errorHandler";
import { resolveGeneratedImagesRoot } from "../../runtime/appPaths";
import { runImageGeneration, safeJsonParse, type ImageTargetAdapter } from "../image/runtime";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type CharacterImageStatus = "idle" | "generating" | "done" | "error";

export interface CharacterImageHistoryItem {
  version: number;
  url?: string;
  prompt?: string;
  provider?: string;
  generatedAt?: string;
}

export interface CharacterSheetData {
  status: CharacterImageStatus;
  version?: number;
  /** Public URL of the character design sheet (face close-up + turnaround composite). */
  url?: string;
  prompt?: string;
  provider?: string;
  generatedAt?: string;
  error?: string;
  history?: CharacterImageHistoryItem[];
}

export interface PortraitData {
  status: CharacterImageStatus;
  version?: number;
  url?: string;
  prompt?: string;
  provider?: string;
  generatedAt?: string;
  error?: string;
  history?: CharacterImageHistoryItem[];
}

export type ThreeViewName = "front" | "side" | "back";

export interface ThreeViewItem {
  view: ThreeViewName;
  status: CharacterImageStatus;
  url?: string;
  prompt?: string;
  generatedAt?: string;
  error?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

const DRAMA_IMAGES_DIR = "drama-characters";
const DEFAULT_PROVIDER = "openai" as const;
const IMAGE_EXTS: Array<[string, string]> = [
  ["png", "image/png"],
  ["jpg", "image/jpeg"],
  ["webp", "image/webp"],
];

function dramaCharacterDir(charId: string): string {
  return path.join(resolveGeneratedImagesRoot(), DRAMA_IMAGES_DIR, charId);
}

function currentCharacterSheetUrl(characterId: string): string {
  return `/api/drama/character-images/${characterId}/character-sheet`;
}

function archivedCharacterSheetUrl(characterId: string, version: number): string {
  return `/api/drama/character-images/${characterId}/character-sheet/v${version}`;
}

function normalizePositiveVersion(value: unknown): number | null {
  const numeric = Number(value);
  return Number.isFinite(numeric) && numeric > 0 ? Math.round(numeric) : null;
}

function readImageVersion(data: CharacterSheetData): number {
  const explicit = normalizePositiveVersion(data.version);
  if (explicit) return explicit;
  return data.status === "done" ? 1 : 0;
}

function normalizeHistoryItem(input: unknown): CharacterImageHistoryItem | null {
  if (!input || typeof input !== "object") return null;
  const record = input as Record<string, unknown>;
  const version = normalizePositiveVersion(record.version);
  if (!version) return null;
  return {
    version,
    url: typeof record.url === "string" && record.url.trim() ? record.url.trim() : undefined,
    prompt: typeof record.prompt === "string" ? record.prompt : undefined,
    provider: typeof record.provider === "string" ? record.provider : undefined,
    generatedAt: typeof record.generatedAt === "string" ? record.generatedAt : undefined,
  };
}

function readImageHistory(data: CharacterSheetData): CharacterImageHistoryItem[] {
  return Array.isArray(data.history)
    ? data.history.map(normalizeHistoryItem).filter((item): item is CharacterImageHistoryItem => Boolean(item))
    : [];
}

async function removeCurrentCharacterSheetVariants(characterId: string, keepExt: string): Promise<void> {
  await Promise.all(IMAGE_EXTS
    .filter(([ext]) => ext !== keepExt)
    .map(async ([ext]) => {
      try {
        await fs.unlink(path.join(dramaCharacterDir(characterId), `character-sheet.${ext}`));
      } catch {
        // Missing alternate formats are expected.
      }
    }));
}

function extractVisualDesc(visualAnchor: string | null | undefined): string {
  if (!visualAnchor?.trim()) return "";
  try {
    const parsed = JSON.parse(visualAnchor) as Record<string, unknown>;
    return typeof parsed.description === "string" ? parsed.description : JSON.stringify(parsed);
  } catch {
    return visualAnchor;
  }
}

/**
 * Build the character-design-sheet prompt:
 * one landscape image = left-third face close-up + right two-thirds full-body front/side/back turnaround
 */
function buildCharacterSheetPrompt(character: {
  name: string;
  archetype?: string | null;
  persona?: string | null;
  visualAnchor?: string | null;
}): string {
  const visualDesc = extractVisualDesc(character.visualAnchor);

  const lines: string[] = [
    "professional character design reference sheet, single image",
    "LEFT THIRD: close-up portrait of the character's face (frontal view, detailed facial features, natural expression)",
    "RIGHT TWO-THIRDS: full-body character turnaround showing three views side by side — front view, side view (90-degree profile), back view",
    "all four views depict the SAME character with IDENTICAL costume, hairstyle, and color scheme",
    "white background, clean studio lighting, no text or watermarks",
    "cinematic quality, photorealistic, 8K detail",
  ];

  if (character.archetype) lines.push(`character archetype: ${character.archetype}`);
  if (character.persona) lines.push(`character trait: ${character.persona}`);
  if (visualDesc) lines.push(`appearance: ${visualDesc}`);

  lines.push("Asian face, vertical short drama style, professional costume design");

  return lines.join(", ");
}

// ─────────────────────────────────────────────────────────────────────────────
// Service
// ─────────────────────────────────────────────────────────────────────────────

export class DramaCharacterImageService {
  private async buildCharacterSheetGenerationContext(
    characterId: string,
  ) {
    const character = await prisma.dramaCharacter.findUnique({
      where: { id: characterId },
    });
    if (!character) {
      throw new AppError(`Drama character not found: ${characterId}`, 404);
    }

    const prompt = buildCharacterSheetPrompt(character);

    const adapter: ImageTargetAdapter<CharacterSheetData> = {
      kind: `drama.character.sheet:${characterId}`,
      loadState: async () => safeJsonParse<CharacterSheetData>(character.portraitData, { status: "idle" }),
      saveState: async (next) => {
        await prisma.dramaCharacter.update({ where: { id: characterId }, data: { portraitData: JSON.stringify(next) } });
      },
      diskPath: (ext) => path.join(dramaCharacterDir(characterId), `character-sheet.${ext}`),
      publicUrl: () => currentCharacterSheetUrl(characterId),
      cleanupOtherExts: (keepExt) => removeCurrentCharacterSheetVariants(characterId, keepExt),
      versioning: {
        enabled: true,
        maxHistory: 5,
        archiveCurrent: (current) => this.archiveCurrentCharacterSheet(characterId, current),
      },
    };

    return {
      adapter,
      prompt,
      referenceImages: [] as import("../image/runtime").GeneratedReferenceImageMeta[],
      size: "1536x1024" as const,
      title: `Generate drama character design draft: ${character.name}`,
    };
  }

  async prepareCharacterSheet(
    characterId: string,
    provider = DEFAULT_PROVIDER,
  ): Promise<import("../image/runtime").ImageGenerationPreview> {
    const ctx = await this.buildCharacterSheetGenerationContext(characterId);
    return {
      kind: ctx.adapter.kind,
      title: ctx.title,
      prompt: ctx.prompt,
      referenceImages: ctx.referenceImages,
      provider,
      size: ctx.size,
    };
  }

  /**
   * Generate the character design sheet (primary method):
   * one landscape image = left face close-up + right full-body front/side/back turnaround.
   * Also written back to portraitData (legacy field; video generation reads this URL).
   */
  async generateCharacterSheet(
    characterId: string,
    provider = DEFAULT_PROVIDER,
    overrides?: import("../image/runtime").ImageGenerationOverrides,
  ): Promise<CharacterSheetData> {
    const ctx = await this.buildCharacterSheetGenerationContext(characterId);
    return runImageGeneration(ctx.adapter, {
      provider: overrides?.providerOverride ?? provider,
      prompt: overrides?.promptOverride ?? ctx.prompt,
      size: overrides?.sizeOverride ?? ctx.size,
      sceneType: "character",
      referenceImages: ctx.referenceImages.length > 0 ? ctx.referenceImages : undefined,
    });
  }

  private async archiveCurrentCharacterSheet(characterId: string, data: CharacterSheetData): Promise<CharacterImageHistoryItem | null> {
    if (data.status !== "done") {
      return null;
    }
    const version = readImageVersion(data);
    if (!version) {
      return null;
    }
    const resolved = await this.resolveExistingImagePath(characterId, "character-sheet");
    const historyItem: CharacterImageHistoryItem = {
      version,
      prompt: data.prompt,
      provider: data.provider,
      generatedAt: data.generatedAt,
    };
    if (!resolved) {
      return historyItem;
    }
    const ext = path.extname(resolved.filePath).replace(".", "").toLowerCase() || "png";
    const archivePath = path.join(dramaCharacterDir(characterId), `character-sheet.v${version}.${ext}`);
    await fs.copyFile(resolved.filePath, archivePath);
    return {
      ...historyItem,
      url: archivedCharacterSheetUrl(characterId, version),
    };
  }

  /**
   * @deprecated Use generateCharacterSheet() instead.
   * Kept so old callers do not fail; internally forwards to generateCharacterSheet.
   */
  async generatePortrait(
    characterId: string,
    provider = DEFAULT_PROVIDER,
  ): Promise<PortraitData> {
    return this.generateCharacterSheet(characterId, provider);
  }

  /**
   * @deprecated Use generateCharacterSheet() instead.
   * The turnaround is now merged into the design sheet; this method returns an empty array as a compatibility stub.
   */
  async generateThreeView(
    characterId: string,
    provider = DEFAULT_PROVIDER,
  ): Promise<ThreeViewItem[]> {
    // Turnaround now lives in the design sheet; generate the sheet and return a stub.
    await this.generateCharacterSheet(characterId, provider);
    return [];
  }

  async getImageStatus(characterId: string): Promise<{
    portrait: PortraitData;
    threeView: ThreeViewItem[];
  }> {
    const character = await prisma.dramaCharacter.findUnique({
      where: { id: characterId },
      select: { portraitData: true, threeViewData: true },
    });
    if (!character) {
      throw new AppError(`Drama character not found: ${characterId}`, 404);
    }

    const portrait: PortraitData = character.portraitData
      ? (JSON.parse(character.portraitData) as PortraitData)
      : { status: "idle" };

    const threeView: ThreeViewItem[] = character.threeViewData
      ? (JSON.parse(character.threeViewData) as ThreeViewItem[])
      : [];

    return { portrait, threeView };
  }

  /**
   * Resolve the local path of the character design sheet (for HTTP file serving).
   */
  async resolveExistingImagePath(
    characterId: string,
    type: "portrait" | "character-sheet" | `three-view-${"front" | "side" | "back"}`,
  ): Promise<{ filePath: string; mimeType: string } | null> {
    const dir = dramaCharacterDir(characterId);

    // character-sheet and portrait both point at the same file.
    const fileBase = (type === "portrait" || type === "character-sheet")
      ? "character-sheet"
      : type;

    for (const [ext, mime] of IMAGE_EXTS) {
      const fp = path.join(dir, `${fileBase}.${ext}`);
      try {
        await fs.access(fp);
        return { filePath: fp, mimeType: mime };
      } catch {
        // not found, try next
      }
    }
    return null;
  }

  async resolveArchivedImagePath(
    characterId: string,
    type: "character-sheet",
    version: number,
  ): Promise<{ filePath: string; mimeType: string } | null> {
    const dir = dramaCharacterDir(characterId);
    for (const [ext, mimeType] of IMAGE_EXTS) {
      const filePath = path.join(dir, `${type}.v${version}.${ext}`);
      try {
        await fs.access(filePath);
        return { filePath, mimeType };
      } catch {
        // Try the next supported extension.
      }
    }
    return null;
  }
}

export const dramaCharacterImageService = new DramaCharacterImageService();

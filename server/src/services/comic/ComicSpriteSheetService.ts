/**
 * ComicSpriteSheetService
 * Before generating a panel image, horizontally composite the character turnaround,
 * costume assets, and prop assets into one sprite sheet and send it as a single
 * reference image so character appearance stays consistent.
 *
 * Layout (left to right):
 *   [turnaround] | [costume] | [weapons / props / other assets...]
 *
 * Every column shares TARGET_HEIGHT; width scales with the source aspect ratio.
 * An SVG label (character name or asset name) is attached under each column.
 * Output: a temporary PNG that the caller must clean up after use.
 */
import fs from "fs/promises";
import os from "os";
import path from "path";

import sharp from "sharp";

import { resolveGeneratedImagesRoot } from "../../runtime/appPaths";
import { resolveAssetFile } from "./ComicCharacterAssetService";
import type { CharacterAssetType } from "./ComicCharacterAssetService";

// ─── Constants ────────────────────────────────────────────────────────────────

const TARGET_HEIGHT = 512;
const LABEL_HEIGHT = 28;
const LABEL_FONT_SIZE = 14;
const TOTAL_HEIGHT = TARGET_HEIGHT + LABEL_HEIGHT;
const MAX_ASSET_COLS = 5; // Cap extra asset columns so the sheet does not get too wide.

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SpriteSheetInput {
  characterId: string;
  characterName: string;
  /** Resolved turnaround disk path; empty means skip that column. */
  sheetFilePath?: string;
  /** Costume assets (use the first completed one). */
  costumeAssets: Array<{ id: string; name: string }>;
  /** Other assets (in caller order, at most MAX_ASSET_COLS - 1). */
  propAssets: Array<{ id: string; name: string; assetType: CharacterAssetType }>;
}

export interface SpriteSheetResult {
  /** Temporary PNG path; the caller should call cleanup() after use. */
  filePath: string;
  cleanup: () => Promise<void>;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Truncate a label so it does not overflow. */
function truncLabel(text: string, maxLen = 12): string {
  return text.length > maxLen ? `${text.slice(0, maxLen)}…` : text;
}

/** Build a bottom-label SVG buffer. */
function buildLabelBuffer(label: string, width: number): Buffer {
  const escaped = label.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${LABEL_HEIGHT}">
  <rect width="${width}" height="${LABEL_HEIGHT}" fill="#1a1a2e" opacity="0.85"/>
  <text x="${width / 2}" y="${LABEL_HEIGHT / 2 + LABEL_FONT_SIZE / 2 - 2}"
    font-family="sans-serif" font-size="${LABEL_FONT_SIZE}" fill="#ffffff"
    text-anchor="middle" dominant-baseline="auto">${escaped}</text>
</svg>`;
  return Buffer.from(svg);
}

/** Resize an image to the target height and return the buffer plus width. */
async function resizeToHeight(filePath: string, height: number): Promise<{ buf: Buffer; width: number }> {
  const resized = sharp(filePath).resize({ height, withoutEnlargement: false });
  const meta = await resized.metadata();
  const width = meta.width ?? height; // fallback
  const buf = await resized.png().toBuffer();
  return { buf, width };
}

/** Composite one column (image + label) into a TARGET_HEIGHT + LABEL_HEIGHT buffer. */
async function buildColumn(filePath: string, label: string): Promise<{ buf: Buffer; width: number }> {
  const { buf: imgBuf, width } = await resizeToHeight(filePath, TARGET_HEIGHT);
  const labelBuf = buildLabelBuffer(truncLabel(label), width);

  // Stack the image and label vertically.
  const combined = await sharp({
    create: { width, height: TOTAL_HEIGHT, channels: 4, background: { r: 255, g: 255, b: 255, alpha: 1 } },
  })
    .composite([
      { input: imgBuf, top: 0, left: 0 },
      { input: labelBuf, top: TARGET_HEIGHT, left: 0 },
    ])
    .png()
    .toBuffer();

  return { buf: combined, width };
}

/** Build a placeholder column when no image is available. */
function buildPlaceholderColumn(label: string, width = 256): { buf: Buffer; width: number } {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${TOTAL_HEIGHT}">
  <rect width="${width}" height="${TOTAL_HEIGHT}" fill="#f0f0f0"/>
  <text x="${width / 2}" y="${TARGET_HEIGHT / 2}"
    font-family="sans-serif" font-size="13" fill="#999999"
    text-anchor="middle" dominant-baseline="middle">No reference</text>
  ${buildLabelBuffer(label, width).toString("utf-8").replace(/<svg[^>]*>|<\/svg>/g, "")}
</svg>`;
  return { buf: Buffer.from(svg), width };
}

// ─── Service ─────────────────────────────────────────────────────────────────

export class ComicSpriteSheetService {
  /**
   * Build a sprite sheet from the input: turnaround column + costume column + prop columns.
   * Returns null when no column has a usable image (caller then uses the original turnaround or no reference).
   */
  async buildSpriteSheet(input: SpriteSheetInput): Promise<SpriteSheetResult | null> {
    const columns: Array<{ buf: Buffer; width: number }> = [];

    // Column 1: turnaround
    if (input.sheetFilePath) {
      try {
        const col = await buildColumn(input.sheetFilePath, `${truncLabel(input.characterName, 8)} · turnaround`);
        columns.push(col);
      } catch (err) {
        console.warn(`[sprite] Failed to load turnaround: ${err instanceof Error ? err.message : err}`);
      }
    }

    // Column 2: costume — use the first asset that has an image.
    for (const asset of input.costumeAssets.slice(0, 3)) {
      const resolved = await resolveAssetFile(asset.id);
      if (!resolved) continue;
      try {
        const col = await buildColumn(resolved.filePath, `Costume · ${asset.name}`);
        columns.push(col);
        break;
      } catch { /* skip a damaged image */ }
    }

    // Columns 3+: other props / weapons, capped at MAX_ASSET_COLS total columns.
    const remaining = MAX_ASSET_COLS - columns.length;
    for (const asset of input.propAssets.slice(0, remaining)) {
      const resolved = await resolveAssetFile(asset.id);
      if (!resolved) continue;
      try {
        const col = await buildColumn(resolved.filePath, asset.name);
        columns.push(col);
      } catch { /* skip */ }
    }

    // No usable images.
    if (columns.length === 0) return null;

    // Composite horizontally.
    const totalWidth = columns.reduce((sum, c) => sum + c.width, 0);
    const compositeInputs: Array<sharp.OverlayOptions> = [];
    let xOffset = 0;
    for (const col of columns) {
      compositeInputs.push({ input: col.buf, top: 0, left: xOffset });
      xOffset += col.width;
    }

    const finalBuf = await sharp({
      create: { width: totalWidth, height: TOTAL_HEIGHT, channels: 4, background: { r: 255, g: 255, b: 255, alpha: 1 } },
    })
      .composite(compositeInputs)
      .png()
      .toBuffer();

    // Write to a temporary file.
    const tmpFile = path.join(os.tmpdir(), `comic-sprite-${Date.now()}-${Math.random().toString(36).slice(2)}.png`);
    await fs.writeFile(tmpFile, finalBuf);

    return {
      filePath: tmpFile,
      cleanup: async () => {
        try { await fs.unlink(tmpFile); } catch { /* ignore */ }
      },
    };
  }
}

export const comicSpriteSheetService = new ComicSpriteSheetService();

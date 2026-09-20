/**
 * Speech-bubble lettering engine.
 *
 * Input: ComicPanel (imageData path + dialogues JSON)
 * Output: a new image with bubbles composited onto the panel (written to ComicPanel.letteredData)
 *
 * Implementation: sharp + handwritten SVG bubble templates, rendered by librsvg. No headless browser.
 * CJK fonts: try system fonts in priority order, then fall back to a sans-serif family (librsvg fallback).
 */
import fs from "fs/promises";
import path from "path";
import sharp from "sharp";
import { prisma } from "../../db/prisma";
import { AppError } from "../../middleware/errorHandler";
import { resolveGeneratedImagesRoot } from "../../runtime/appPaths";

// ─── Types ────────────────────────────────────────────────────────────────────

export type BubbleType = "round" | "spike" | "cloud" | "caption";
export type AnchorHint =
  | "top-left" | "top-center" | "top-right"
  | "mid-left" | "mid-center" | "mid-right"
  | "bottom-left" | "bottom-center" | "bottom-right";

export interface Dialogue {
  speaker: string;
  text: string;
  bubbleType: BubbleType;
  anchorHint?: string;
}

export interface LetterPanelOptions {
  /** Bubble background opacity (0-1), default 0.95. */
  bubbleOpacity?: number;
  /** Max bubble width (pixels), default image width * 0.45. */
  maxBubbleWidthRatio?: number;
}

export interface LetterPanelResult {
  buffer: Buffer;
  ext: string;
  width: number;
  height: number;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const COMIC_LETTERED_DIR = "comic-panels-lettered";
const CJK_FONT_STACK = `"Microsoft YaHei", "PingFang SC", "Noto Sans CJK SC", "Source Han Sans CN", sans-serif`;
const DEFAULT_FONT_SIZE = 24;
const BUBBLE_PADDING = 16;
const LINE_HEIGHT_RATIO = 1.45;
const MAX_CHARS_PER_LINE = 10;

// Anchor position → [x%, y%] (percent of image width/height)
const ANCHOR_POSITIONS: Record<string, [number, number]> = {
  "top-left":      [0.18, 0.12],
  "top-center":    [0.50, 0.12],
  "top-right":     [0.82, 0.12],
  "mid-left":      [0.18, 0.50],
  "mid-center":    [0.50, 0.50],
  "mid-right":     [0.82, 0.50],
  "bottom-left":   [0.18, 0.88],
  "bottom-center": [0.50, 0.88],
  "bottom-right":  [0.82, 0.88],
};
// Default occupancy order when anchorHint is missing (by dialogue order).
const DEFAULT_ANCHOR_ORDER: AnchorHint[] = [
  "top-right", "top-left", "mid-right", "mid-left", "bottom-right", "bottom-left",
];

// ─── SVG generation ───────────────────────────────────────────────────────────

function wrapText(text: string, maxCharsPerLine: number): string[] {
  const lines: string[] = [];
  let current = "";
  for (const char of text) {
    current += char;
    if (current.length >= maxCharsPerLine) {
      lines.push(current);
      current = "";
    }
  }
  if (current) lines.push(current);
  return lines.length > 0 ? lines : [text];
}

/**
 * Build one bubble's SVG string (coordinates relative to the bubble's own top-left).
 * cx/cy are the bubble center in the full image (pixels).
 */
function buildBubbleSvg(
  dialogue: Dialogue,
  cx: number,
  cy: number,
  imgWidth: number,
  imgHeight: number,
  opts: LetterPanelOptions,
): { svgStr: string; bw: number; bh: number; bx: number; by: number } {
  const fontSize = DEFAULT_FONT_SIZE;
  const padding = BUBBLE_PADDING;
  const maxBubbleWidth = Math.floor((opts.maxBubbleWidthRatio ?? 0.42) * imgWidth);
  const lineHeightPx = Math.ceil(fontSize * LINE_HEIGHT_RATIO);
  const charsPerLine = Math.min(MAX_CHARS_PER_LINE, Math.floor(maxBubbleWidth / (fontSize * 0.8)));
  const lines = wrapText(dialogue.text, charsPerLine);

  const textW = Math.min(
    lines.reduce((max, l) => Math.max(max, l.length), 0) * fontSize * 0.85,
    maxBubbleWidth,
  );
  const textH = lines.length * lineHeightPx;
  const bw = Math.ceil(textW + padding * 2);
  const bh = Math.ceil(textH + padding * 2);

  // Bubble top-left, clamped inside the image.
  let bx = Math.round(cx - bw / 2);
  let by = Math.round(cy - bh / 2);
  bx = Math.max(4, Math.min(imgWidth - bw - 4, bx));
  by = Math.max(4, Math.min(imgHeight - bh - 4, by));

  const opacity = opts.bubbleOpacity ?? 0.95;
  const textY0 = padding + fontSize;

  const textElems = lines.map((line, i) =>
    `<text x="${padding}" y="${textY0 + i * lineHeightPx}"
      font-family="${CJK_FONT_STACK}"
      font-size="${fontSize}"
      fill="#1a1a1a">${escapeXml(line)}</text>`
  ).join("\n");

  let bgShape = "";
  switch (dialogue.bubbleType) {
    case "round": {
      const rx = bw / 2;
      const ry = bh / 2;
      bgShape = `<ellipse cx="${bw / 2}" cy="${bh / 2}" rx="${rx}" ry="${ry}"
        fill="white" fill-opacity="${opacity}" stroke="#333" stroke-width="1.5"/>`;
      break;
    }
    case "spike": {
      // Spike bubble: rounded rectangle + jagged stroke.
      bgShape = `<rect x="2" y="2" width="${bw - 4}" height="${bh - 4}" rx="4" ry="4"
        fill="white" fill-opacity="${opacity}" stroke="#e53e3e" stroke-width="2" stroke-dasharray="6 2"/>`;
      break;
    }
    case "cloud": {
      // Thought cloud: overlapping circles as an approximation.
      const r = Math.min(bw, bh) * 0.35;
      bgShape = `
        <circle cx="${bw * 0.3}" cy="${bh * 0.45}" r="${r * 0.85}" fill="white" fill-opacity="${opacity}" stroke="#333" stroke-width="1"/>
        <circle cx="${bw * 0.55}" cy="${bh * 0.38}" r="${r * 0.9}" fill="white" fill-opacity="${opacity}" stroke="#333" stroke-width="1"/>
        <circle cx="${bw * 0.72}" cy="${bh * 0.48}" r="${r * 0.82}" fill="white" fill-opacity="${opacity}" stroke="#333" stroke-width="1"/>
        <ellipse cx="${bw / 2}" cy="${bh * 0.62}" rx="${bw * 0.42}" ry="${bh * 0.3}"
          fill="white" fill-opacity="${opacity}" stroke="#333" stroke-width="1"/>`;
      break;
    }
    case "caption": {
      bgShape = `<rect x="0" y="0" width="${bw}" height="${bh}"
        fill="#1a1a1a" fill-opacity="0.78" rx="3" ry="3"/>`;
      break;
    }
    default: {
      bgShape = `<rect x="0" y="0" width="${bw}" height="${bh}" rx="${Math.min(bw, bh) * 0.15}" ry="${Math.min(bw, bh) * 0.15}"
        fill="white" fill-opacity="${opacity}" stroke="#333" stroke-width="1.5"/>`;
    }
  }

  const textFill = dialogue.bubbleType === "caption" ? "#f5f0e8" : "#1a1a1a";
  const textElemsAdj = lines.map((line, i) =>
    `<text x="${bw / 2}" y="${textY0 + i * lineHeightPx - 4}"
      font-family="${CJK_FONT_STACK}"
      font-size="${fontSize}"
      text-anchor="middle"
      fill="${textFill}">${escapeXml(line)}</text>`
  ).join("\n");

  const svgStr = `<svg xmlns="http://www.w3.org/2000/svg" width="${bw}" height="${bh}">
${bgShape}
${textElemsAdj}
</svg>`;

  return { svgStr, bw, bh, bx, by };
}

function escapeXml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&apos;");
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function letteredPanelDir(panelId: string): string {
  return path.join(resolveGeneratedImagesRoot(), COMIC_LETTERED_DIR, panelId);
}

function letteredPanelUrl(panelId: string): string {
  return `/api/comic/panel-images/${panelId}/lettered`;
}

async function findPanelImageBuffer(panelId: string): Promise<Buffer> {
  const rawDir = path.join(resolveGeneratedImagesRoot(), "comic-panels", panelId);
  let entries: string[];
  try { entries = await fs.readdir(rawDir); } catch { throw new AppError("The panel image has not been generated yet. Generate the image first.", 400); }
  const file = entries.find((f) => /^panel\.(png|jpg|webp)$/i.test(f));
  if (!file) throw new AppError("The panel image file does not exist.", 400);
  return fs.readFile(path.join(rawDir, file));
}

// ─── Service ──────────────────────────────────────────────────────────────────

export class ComicBubbleLayoutService {
  /**
   * Overlay bubbles on one panel and produce a lettered image.
   * Persist to disk and write letteredData on ComicPanel.
   */
  async letterPanel(panelId: string, opts: LetterPanelOptions = {}): Promise<LetterPanelResult> {
    const panel = await prisma.comicPanel.findUnique({ where: { id: panelId } });
    if (!panel) throw new AppError(`Comic panel not found: ${panelId}`, 404);

    const dialogues: Dialogue[] = panel.dialogues
      ? (JSON.parse(panel.dialogues) as Dialogue[])
      : [];

    // Load the original panel image.
    const rawBuffer = await findPanelImageBuffer(panelId);
    const meta = await sharp(rawBuffer).metadata();
    const imgWidth = meta.width ?? 1024;
    const imgHeight = meta.height ?? 1536;

    let composited = sharp(rawBuffer);

    if (dialogues.length > 0) {
      const usedAnchors = new Set<string>();
      const composites: sharp.OverlayOptions[] = [];

      for (let idx = 0; idx < dialogues.length; idx++) {
        const dlg = dialogues[idx];
        const hint = dlg.anchorHint?.toLowerCase();

        // Pick an anchor.
        let anchor: [number, number];
        const knownHint = hint && ANCHOR_POSITIONS[hint] ? hint : null;
        if (knownHint && !usedAnchors.has(knownHint)) {
          usedAnchors.add(knownHint);
          anchor = ANCHOR_POSITIONS[knownHint];
        } else {
          const fallback = DEFAULT_ANCHOR_ORDER.find((a) => !usedAnchors.has(a));
          const fallbackKey = fallback ?? "mid-center";
          usedAnchors.add(fallbackKey);
          anchor = ANCHOR_POSITIONS[fallbackKey];
        }

        const cx = Math.round(anchor[0] * imgWidth);
        const cy = Math.round(anchor[1] * imgHeight);
        const { svgStr, bx, by } = buildBubbleSvg(dlg, cx, cy, imgWidth, imgHeight, opts);
        composites.push({
          input: Buffer.from(svgStr),
          top: by,
          left: bx,
        });
      }

      composited = sharp(rawBuffer).composite(composites);
    }

    const outBuffer = await composited.png().toBuffer();
    const outDir = letteredPanelDir(panelId);
    await fs.mkdir(outDir, { recursive: true });
    await fs.writeFile(path.join(outDir, "lettered.png"), outBuffer);

    const letteredData = {
      status: "done",
      url: letteredPanelUrl(panelId),
      generatedAt: new Date().toISOString(),
    };
    await prisma.comicPanel.update({
      where: { id: panelId },
      data: { letteredData: JSON.stringify(letteredData) },
    });

    return { buffer: outBuffer, ext: "png", width: imgWidth, height: imgHeight };
  }

  /** Read a lettered image file (for HTTP streaming). */
  async getLetteredImageFile(panelId: string): Promise<Buffer | null> {
    const filePath = path.join(letteredPanelDir(panelId), "lettered.png");
    try {
      return await fs.readFile(filePath);
    } catch {
      return null;
    }
  }
}

export const comicBubbleLayoutService = new ComicBubbleLayoutService();

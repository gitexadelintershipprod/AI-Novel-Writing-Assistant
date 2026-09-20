import fs from "fs/promises";
import path from "path";

import { prisma } from "../../db/prisma";
import { AppError } from "../../middleware/errorHandler";
import { resolveGeneratedImagesRoot } from "../../runtime/appPaths";
import {
  filterImageGenerationReferences,
  runImageGeneration,
  safeJsonParse,
  type ImageTargetAdapter,
} from "../image/runtime";
import {
  comicCharacterImageService,
  describeCharacterExpression,
  isCharacterExpressionId,
  type CharacterExpressionId,
} from "./ComicCharacterImageService";
import { resolveAssetFile } from "./ComicCharacterAssetService";
import { comicSpriteSheetService } from "./ComicSpriteSheetService";
import { resolveSceneFile, type SceneBible } from "./ComicSceneService";
import { IMAGE_SIZES, type ImageSize } from "../image/types";
import type { LLMProvider } from "@ai-novel/shared/types/llm";

// ─── Types ────────────────────────────────────────────────────────────────────

export type PanelImageStatus = "idle" | "generating" | "done" | "error";

/** Metadata for the reference images actually used in generation (written to imageData.referenceImages for the frontend provenance dialog). */
export interface PanelReferenceImageMeta {
  /** character_sheet=turnaround | character_expression=expression sheet | character_face=face crop | asset=character asset | scene=scene setting art */
  kind: "character_sheet" | "character_expression" | "character_face" | "asset" | "scene";
  /** Human-readable label, e.g. "Bai Qianyu · turnaround" / "costume: battle set" / "scene: sect hall" */
  label: string;
  /** Accessible HTTP URL (the frontend can use it as img src). */
  url: string;
}

export interface PanelImageData {
  status: PanelImageStatus;
  version?: number;
  url?: string;
  prompt?: string;
  provider?: string;
  generatedAt?: string;
  error?: string;
  /** Reference material actually used for this generation (written on success; omitted on failure / skipped generation). */
  referenceImages?: PanelReferenceImageMeta[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const COMIC_IMAGES_DIR = "comic-panels";
const DEFAULT_PROVIDER: LLMProvider = "openai";

function comicPanelDir(panelId: string): string {
  return path.join(resolveGeneratedImagesRoot(), COMIC_IMAGES_DIR, panelId);
}

function panelImageUrl(panelId: string): string {
  return `/api/comic/panel-images/${panelId}/panel`;
}

interface DialogueEntry {
  speaker?: string;
  text: string;
  bubbleType?: "round" | "spike" | "cloud" | "caption";
  anchorHint?: string;
}

interface StructuredCharacterRef {
  name: string;
  costume?: string;
  expression?: CharacterExpressionId;
  lighting?: string;
  props?: string[];
}

function normalizeCharacterRefs(raw: string | null | undefined): StructuredCharacterRef[] {
  const parsed = safeJsonParse<unknown[]>(raw, []);
  const refs: StructuredCharacterRef[] = [];
  for (const item of parsed) {
    if (typeof item === "string" && item.trim()) {
      refs.push({ name: item.trim(), costume: "default", expression: "neutral" });
      continue;
    }
    if (!item || typeof item !== "object") continue;
    const record = item as Record<string, unknown>;
    const name = typeof record.name === "string" ? record.name.trim() : "";
    if (!name) continue;
    const expression = isCharacterExpressionId(record.expression) ? record.expression : "neutral";
    const rawProps = record.props;
    const props = Array.isArray(rawProps)
      ? (rawProps as unknown[]).filter((p): p is string => typeof p === "string" && p.trim().length > 0).map((p) => p.trim())
      : undefined;
    refs.push({
      name,
      costume: typeof record.costume === "string" && record.costume.trim() ? record.costume.trim() : "default",
      expression,
      lighting: typeof record.lighting === "string" && record.lighting.trim() ? record.lighting.trim() : undefined,
      props: props && props.length > 0 ? props : undefined,
    });
  }
  return refs.slice(0, 5);
}

function extractVisualAnchorDesc(visualAnchor: string): string {
  try {
    const parsed = JSON.parse(visualAnchor) as Record<string, unknown>;
    if (typeof parsed.description === "string") return parsed.description;
    if (typeof parsed.hint === "string") return parsed.hint;
    return visualAnchor;
  } catch {
    return visualAnchor;
  }
}

// Format keywords for the image model (aligned with frontend COMIC_FORMATS.value)
const FORMAT_ZH_KEYWORDS: Record<string, string> = {
  webtoon:         "vertical webtoon panel, Korean manhwa phone-scroll grid, single tall comic cell",
  "4koma":         "four-panel comic, vertical yonkoma, setup-development-twist-punchline layout",
  single_page:     "single-page manga, Japanese panel page, mixed large and small panels",
  cinematic:       "movie storyboard frame, wide landscape, cinematic composition",
  chat_comic:      "chat-comic panel, speech-bubble layout, light everyday manga",
  chibi_comic:     "chibi comic panel, SD characters, cute exaggerated proportions",
  ink_comic:       "ink-wash comic panel, brush lines, classical negative space",
  drama_screenshot:"vertical short-drama screenshot look, subtitle bar, story-frame feeling",
};

const STYLE_ZH_KEYWORDS: Record<string, string> = {
  webtoon_color:   "Color manhwa style, clean lines, vivid colors",
  bl_manga:        "Colorful shojo comics style, soft colors, refined facial features",
  shounen_bw:      "black and white shounen comics style, rough lines, dynamic composition",
  ink_traditional: "Chinese ink-painting style, traditional brush strokes, light color smudges",
  chibi:           "chibi cute comics style, mellow and cute, with exaggerated expressions",
  realistic:       "realistic comics style, delicate light and shadow, realism",
};

// Nine-grid anchor → position the image model can understand
const ANCHOR_HINT_ZH: Record<string, string> = {
  "top-left":      "top-left",
  "top-center":    "top-center",
  "top-right":     "top-right",
  "left-center":   "left",
  "center":        "center",
  "right-center":  "right",
  "bottom-left":   "bottom-left",
  "bottom-center": "bottom-center",
  "bottom-right":  "bottom-right",
};

const BUBBLE_TYPE_ZH: Record<string, string> = {
  round:   "Round speech bubbles",
  spike:   "spiky burst bubble (excited shouting)",
  cloud:   "cloud thought bubble (inner monologue)",
  caption: "rectangular caption box (narration)",
};

/** Strip speaker prefixes the LLM sometimes stuffs into text (e.g. "Luyuan said: xxx" / "Luyuan: xxx" / quotes). Keeps historical Chinese prefixes working. */
function stripSpeakerPrefix(text: string, speaker?: string): string {
  let cleaned = text.trim();
  // 1. Explicit "XX said:" plus dual-read speaker prefixes (`XX道：`, `XX 说，`)
  if (speaker) {
    const safeName = speaker.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    cleaned = cleaned.replace(new RegExp(`^${safeName}\\s*[说道讲喊问]?\\s*[：:，,]\\s*`), "");
  }
  // 2. Any Chinese or Latin name + dual-read 说/道/： (fallback, 1-6 Han letters + punctuation)
  cleaned = cleaned.replace(/^[一-龥A-Za-z]{1,6}\s*[说道讲喊问]\s*[：:，,]?\s*/, "");
  cleaned = cleaned.replace(/^[一-龥A-Za-z]{1,6}\s*[：:]\s*/, "");
  // 3. Strip wrapping quotes
  cleaned = cleaned.replace(/^[「『""'']+|[」』""'']+$/g, "");
  return cleaned.trim() || text.trim();
}

function buildDialoguePrompt(dialogues: DialogueEntry[]): string {
  if (dialogues.length === 0) return "";
  const lines = dialogues.map((d, i) => {
    const bubbleDesc = BUBBLE_TYPE_ZH[d.bubbleType ?? "round"] ?? "Round speech bubbles";
    const placement = d.anchorHint ? `placed at ${ANCHOR_HINT_ZH[d.anchorHint] ?? d.anchorHint}` : "";
    const speakerHint = d.speaker ? ` (bubble tail points to ${d.speaker})` : "";
    const cleanText = stripSpeakerPrefix(d.text, d.speaker);
    return `${i + 1}. ${bubbleDesc}${placement ? ", " + placement : ""}${speakerHint}, bubble text is only "${cleanText}"`;
  });
  return `Speech bubbles (render only the spoken line inside the bubble; never show "said", speaker names, colons, quotes, or narration prefixes; text must be readable and must not cover faces): ${lines.join("; ")}`;
}

const CROWD_DIVERSITY_PROMPT = [
  "Crowd / passerby / background-character rule: if this panel shows unnamed crowds, onlookers, passersby, disciple groups, soldier groups, or other background people, they must not be leads and must not share the same-face template",
  "Each crowd person must differ clearly in age, face shape, hairstyle, clothing color, body type, and stance",
  "Named character reference pictures apply only to the matching named character; do not copy that face, hair, or costume onto crowd people",
  "avoid repeated identical faces, cloned faces, same hairstyle, same outfit template, duplicated crowd members",
].join("; ");

interface StylePresetData {
  style?: string;
  format?: string;
  promptKeywords?: string;
  imageSize?: string;
}

function buildPanelPrompt(
  visualPrompt: string,
  dialogues: DialogueEntry[],
  presetData: StylePresetData,
  characterDescs: string[] = [],
  sceneDesc = "",
  hasSceneRefImage = false,
): string {
  // 1. Format declaration (model anchors style first)
  const formatEn = presetData.promptKeywords ?? "webtoon vertical strip panel, single frame, tall aspect ratio";
  const formatZh = FORMAT_ZH_KEYWORDS[presetData.format ?? "webtoon"] ?? FORMAT_ZH_KEYWORDS.webtoon;

  // 2. Art-style declaration
  const styleEn = presetData.style ?? "webtoon style, vibrant colors, clean lines";
  const styleZh = STYLE_ZH_KEYWORDS[presetData.style ?? ""] ?? "Color manhwa style, clean lines, vivid colors";

  // 3. Character appearance anchor (secondary text when a design sheet exists; primary consistency when it does not)
  const charPart = characterDescs.length > 0
    ? `Character appearance (draw gender strictly from the bracket tags; do not draw men as women or women as men): ${characterDescs.join("; ")}`
    : "";

  // 4. Dialogue / bubbles
  const dialoguePart = buildDialoguePrompt(dialogues);

  // Order: format → style → appearance → scene anchor → dialogue → panel content → quality words
  // Dialogue sits before panel content so the image model weights it higher
  const parts = [
    `${formatZh}, ${formatEn}`,
    `${styleZh}, ${styleEn}`,
  ];
  if (charPart) parts.push(charPart);
  if (sceneDesc) parts.push(sceneDesc);
  // Scene reference must not freeze camera: lock spatial identity only; this panel may choose its own shot
  if (hasSceneRefImage) {
    parts.push("The scene reference only locks tone, layout, and material identity. Camera angle, shot size, and composition must follow this panel's content. Do not copy the reference camera position.");
  }
  parts.push(CROWD_DIVERSITY_PROMPT);
  if (dialoguePart) parts.push(dialoguePart);
  parts.push(`Panel content: ${visualPrompt}`);
  parts.push("high quality manga panel, professional illustration");
  return parts.join(". ");
}

// ─── Service ──────────────────────────────────────────────────────────────────

export class ComicPanelImageService {
  /**
   * Generate an image for one comic panel.
   * - Pull reference images from ComicCharacter.sheetData when present
   * - Save the image to disk and write the path into ComicPanel.imageData
   */
  private async buildPanelGenerationContext(panelId: string) {
    const panel = await prisma.comicPanel.findUnique({
      where: { id: panelId },
      include: {
        episode: {
          include: {
            project: {
              include: {
                characters: true,
                characterAssets: {
                  orderBy: [{ assetType: "asc" }, { sortOrder: "asc" }],
                },
                scenes: true,
              },
            },
          },
        },
      },
    });
    if (!panel) throw new AppError(`Comic panel not found: ${panelId}`, 404);
    if (!panel.visualPrompt) throw new AppError("This panel is missing visualPrompt, so an image cannot be generated.", 400);

    const project = panel.episode.project;
    const presetData = safeJsonParse<StylePresetData>(project.stylePreset, {});

    // Visual description text from characterRefs (text anchor, injected whether or not a reference image exists)
    const characterRefs = normalizeCharacterRefs(panel.characterRefs);
    const characterVisualDescs: string[] = [];
    const spriteCleanups: Array<() => Promise<void>> = [];

    // Final reference-image paths (sprite-sheet mode: at most 1 image per character)
    const finalRefImagePaths: string[] = [];
    // Reference-material metadata (written to imageData.referenceImages for the frontend dialog)
    const referenceMetas: PanelReferenceImageMeta[] = [];

    if (characterRefs.length > 0) {
      for (const character of project.characters) {
        const ref = characterRefs.find((item) => item.name === character.name);
        if (!ref) continue;

        // ── Text-description anchor ──────────────────────────
        const desc = character.visualAnchor?.trim()
          ? extractVisualAnchorDesc(character.visualAnchor)
          : "Keep appearance consistent with the character reference picture";
        const genderTag = character.gender === "male" ? "[male]"
          : character.gender === "female" ? "[female]"
          : character.gender === "other" ? "[androgynous]"
          : "";
        const refParts = [
          `${genderTag}[${character.name}] ${desc}`,
          `costume: ${ref.costume ?? "default"}`,
          `expression: ${describeCharacterExpression(ref.expression ?? "neutral")}`,
        ];
        if (ref.lighting) refParts.push(`lighting: ${ref.lighting}`);
        if (ref.props?.length) refParts.push(`holding: ${ref.props.join(", ")}`);
        characterVisualDescs.push(refParts.join(", "));

        // ── Sprite-sheet reference composition ───────────────
        const sheetData = safeJsonParse<{ status?: string }>(character.sheetData, {});
        const sheetRef = sheetData.status === "done"
          ? await comicCharacterImageService.resolveSheetFile(character.id)
          : null;

        // Matching costume asset (look up a costume image when costume is not default)
        const costumeAssets = project.characterAssets
          .filter((a) => a.characterId === character.id && a.assetType === "costume")
          .map((a) => ({ id: a.id, name: a.name }));

        // Match prop / weapon assets by props name
        const propNames = new Set(ref.props ?? []);
        const propAssets = project.characterAssets
          .filter((a) => a.characterId === character.id && a.assetType !== "costume" && propNames.has(a.name))
          .map((a) => ({ id: a.id, name: a.name, assetType: a.assetType as import("./ComicCharacterAssetService").CharacterAssetType }));

        // Compose a sprite sheet only when a turnaround or any asset image exists
        const hasAnyAssetImage = costumeAssets.length > 0 || propAssets.length > 0;

        if (sheetRef || hasAnyAssetImage) {
          const usedCostume = ref.costume !== "default"
            ? costumeAssets.filter((a) => a.name === ref.costume)
            : costumeAssets.slice(0, 1);
          const spriteResult = await comicSpriteSheetService.buildSpriteSheet({
            characterId: character.id,
            characterName: character.name,
            sheetFilePath: sheetRef?.filePath,
            costumeAssets: usedCostume,
            propAssets,
          });
          if (spriteResult) {
            finalRefImagePaths.push(spriteResult.filePath);
            spriteCleanups.push(spriteResult.cleanup);
          } else if (sheetRef) {
            // Fallback: use the original turnaround when that is all we have
            finalRefImagePaths.push(sheetRef.filePath);
          }

          // Record material metadata for the elements actually composed into the sprite sheet
          if (sheetRef) {
            referenceMetas.push({
              kind: "character_sheet",
              label: `${character.name} · three-view sheet`,
              url: `/api/comic/character-images/${character.id}/sheet`,
            });
          }
          for (const a of usedCostume) {
            referenceMetas.push({
              kind: "asset",
              label: `${character.name} · costume: ${a.name}`,
              url: `/api/comic/character-assets/${a.id}/image`,
            });
          }
          for (const a of propAssets) {
            referenceMetas.push({
              kind: "asset",
              label: `${character.name} · ${a.name}`,
              url: `/api/comic/character-assets/${a.id}/image`,
            });
          }
        }
      }

      // When several characters share a frame, append each expression sheet as extra reference (stay under the total cap)
      if (characterRefs.length > 1) {
        for (const character of project.characters) {
          const ref = characterRefs.find((item) => item.name === character.name);
          if (!ref?.expression) continue;
          const expressionRef = await comicCharacterImageService.resolveExpressionRegionFile(character.id, ref.expression);
          if (expressionRef) {
            finalRefImagePaths.push(expressionRef.filePath);
            referenceMetas.push({
              kind: "character_expression",
              label: `${character.name} · expression: ${describeCharacterExpression(ref.expression ?? "neutral")}`,
              url: `/api/comic/character-images/${character.id}/expressions`,
            });
          }
        }
      }
    }

    // Scene consistency: find the scene by sceneRef → inject bible text + setting art as a lower-weight second reference
    let sceneDesc = "";
    let hasSceneRefImage = false;
    if (panel.sceneRef) {
      const scene = project.scenes.find((s) => s.name === panel.sceneRef);
      if (scene) {
        const bible = safeJsonParse<SceneBible>(scene.bible, {});
        const bibleParts: string[] = [];
        if (bible.palette) bibleParts.push(`palette ${bible.palette}`);
        if (bible.keyElements) bibleParts.push(`key elements ${bible.keyElements}`);
        if (bible.materials) bibleParts.push(`materials ${bible.materials}`);
        if (bible.ambiance) bibleParts.push(`ambiance ${bible.ambiance}`);
        if (bible.layout) bibleParts.push(`layout ${bible.layout}`);
        if (bibleParts.length > 0) {
          sceneDesc = `Scene setting [${scene.name}]: ${bibleParts.join(", ")}`;
        }
        // L1: setting art as a reference image (only when already generated)
        const sceneSheet = safeJsonParse<{ status?: string }>(scene.sheetData, {});
        if (sceneSheet.status === "done") {
          const sceneRef = await resolveSceneFile(scene.id);
          if (sceneRef) {
            finalRefImagePaths.push(sceneRef.filePath);
            hasSceneRefImage = true;
            referenceMetas.push({
              kind: "scene",
              label: `Scene: ${scene.name}`,
              url: `/api/comic/scenes/${scene.id}/image`,
            });
          }
        }
      }
    }

    const dialogues = safeJsonParse<DialogueEntry[]>(panel.dialogues, []);
    const prompt = buildPanelPrompt(panel.visualPrompt, dialogues, presetData, characterVisualDescs, sceneDesc, hasSceneRefImage);
    const rawSize = presetData.imageSize ?? "1024x1536";
    const imageSize: ImageSize = (IMAGE_SIZES as readonly string[]).includes(rawSize)
      ? rawSize as ImageSize
      : "1024x1536";
    const uniqueRefImagePaths = Array.from(new Set(finalRefImagePaths)).slice(0, 4);

    const adapter: ImageTargetAdapter<PanelImageData> = {
      kind: `comic.panel:${panelId}`,
      loadState: async () => safeJsonParse<PanelImageData>(panel.imageData, { status: "idle" }),
      saveState: async (next) => {
        await prisma.comicPanel.update({ where: { id: panelId }, data: { imageData: JSON.stringify(next) } });
      },
      diskPath: (ext) => path.join(comicPanelDir(panelId), `panel.${ext}`),
      publicUrl: () => panelImageUrl(panelId),
      cleanupOtherExts: (keepExt) => cleanOldPanelFiles(panelId, keepExt),
    };

    return {
      adapter,
      prompt,
      size: imageSize,
      refImagePaths: uniqueRefImagePaths,
      referenceImages: referenceMetas,
      title: `Generate panel ${panel.order} image`,
      cleanup: async () => {
        await Promise.allSettled(spriteCleanups.map((fn) => fn()));
      },
    };
  }

  async preparePanelImage(
    panelId: string,
    provider: LLMProvider = DEFAULT_PROVIDER,
  ): Promise<import("../image/runtime").ImageGenerationPreview> {
    const ctx = await this.buildPanelGenerationContext(panelId);
    try {
      return {
        kind: ctx.adapter.kind,
        title: ctx.title,
        prompt: ctx.prompt,
        referenceImages: ctx.referenceImages,
        provider,
        size: ctx.size,
      };
    } finally {
      await ctx.cleanup();
    }
  }

  async generatePanelImage(
    panelId: string,
    provider: LLMProvider = DEFAULT_PROVIDER,
    overrides?: import("../image/runtime").ImageGenerationOverrides,
  ): Promise<PanelImageData> {
    const ctx = await this.buildPanelGenerationContext(panelId);
    try {
      const refs = filterImageGenerationReferences({
        refImagePaths: ctx.refImagePaths,
        referenceImages: ctx.referenceImages,
        excludedReferenceImageUrls: overrides?.excludedReferenceImageUrls,
      });
      return await runImageGeneration(ctx.adapter, {
        provider: overrides?.providerOverride ?? provider,
        prompt: overrides?.promptOverride ?? ctx.prompt,
        size: overrides?.sizeOverride ?? ctx.size,
        refImagePaths: refs.refImagePaths,
        referenceImages: refs.referenceImages && refs.referenceImages.length > 0 ? refs.referenceImages : undefined,
      });
    } finally {
      await ctx.cleanup();
    }
  }

  getPanelImageData(panelId: string): Promise<PanelImageData> {
    return prisma.comicPanel
      .findUnique({ where: { id: panelId }, select: { imageData: true } })
      .then((p) => {
        if (!p) throw new AppError(`Comic panel not found: ${panelId}`, 404);
        return safeJsonParse<PanelImageData>(p.imageData, { status: "idle" });
      });
  }

  /** Read the local image file (for HTTP routes to stream the response). */
  async getPanelImageFile(
    panelId: string,
  ): Promise<{ buffer: Buffer; ext: string } | null> {
    const dir = comicPanelDir(panelId);
    let entries: string[];
    try {
      entries = await fs.readdir(dir);
    } catch {
      return null;
    }
    const panelFile = entries.find((f) => /^panel\.(png|jpg|webp)$/i.test(f));
    if (!panelFile) return null;
    const ext = path.extname(panelFile).replace(".", "").toLowerCase();
    const buffer = await fs.readFile(path.join(dir, panelFile));
    return { buffer, ext };
  }
}

async function cleanOldPanelFiles(panelId: string, keepExt: string): Promise<void> {
  const dir = comicPanelDir(panelId);
  let entries: string[];
  try { entries = await fs.readdir(dir); } catch { return; }
  for (const f of entries) {
    const fExt = path.extname(f).replace(".", "").toLowerCase();
    if (/^panel\.(png|jpg|webp)$/i.test(f) && fExt !== keepExt) {
      await fs.unlink(path.join(dir, f)).catch(() => {});
    }
  }
}

export const comicPanelImageService = new ComicPanelImageService();

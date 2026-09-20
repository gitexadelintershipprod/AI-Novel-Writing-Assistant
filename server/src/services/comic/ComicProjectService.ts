/**
 * Comic project service.
 *
 * Low coupling: depends only on prisma (infrastructure) and the adaptation shared layer.
 * Does not import any services/novel/* or services/drama/* implementation
 * (enforced by the CI guard comicDecoupling.test.js).
 */
import { prisma } from "../../db/prisma";
import { adaptationSourceRegistry } from "../adaptation/source/SourceContentPort";
import { novelSourceAdapter } from "../adaptation/source/NovelSourceAdapter";
import type { AdaptationSourceType, SourceBundle, SourceRef } from "../adaptation/contracts/sourceBundle";
import { runStructuredPrompt } from "../../prompting/core/promptRunner";
import { comicVisualAnchorRewritePrompt, type ComicVisualAnchorRewriteOutput } from "../../prompting/prompts/comic/comic.prompts";
import type { LLMProvider } from "@ai-novel/shared/types/llm";

adaptationSourceRegistry.register(novelSourceAdapter);

interface ComicVisualAnchorData {
  description: string;
  visualSpec?: {
    appearance?: string;
    signatureFeatures?: string;
  };
  defaultCostume?: {
    id: "default";
    description: string;
  };
  behaviorSignature?: {
    persona?: string;
  };
}

function compactVisualAnchor(text: string, maxChars = 40): string {
  return text
    .replace(/[，。；、,\.;\s]+/g, "，")
    .replace(/^，+|，+$/g, "")
    .slice(0, maxChars);
}

function buildComicVisualAnchor(character: SourceBundle["characters"][number]): string | null {
  const visualHint = character.visualHint?.trim() ?? "";
  const persona = character.persona?.trim() ?? "";
  const description = compactVisualAnchor(visualHint || persona);
  if (!description) return null;
  const data: ComicVisualAnchorData = {
    description,
    visualSpec: visualHint ? { appearance: visualHint, signatureFeatures: description } : undefined,
    defaultCostume: visualHint ? { id: "default", description: visualHint } : undefined,
    behaviorSignature: persona ? { persona } : undefined,
  };
  return JSON.stringify(data);
}

export interface CreateComicProjectInput {
  title: string;
  sourceType: AdaptationSourceType;
  /** Soft reference: novelId when sourceType is novel_import. */
  sourceRef?: string;
  trackId?: string;
  /** Raw input for original / text_import. */
  inspiration?: string;
  rawText?: string;
  /** JSON-serialized art-style / format preset, passed in from the wizard at create time. */
  stylePreset?: string;
}

export class ComicProjectService {
  async createProject(input: CreateComicProjectInput) {
    return prisma.comicProject.create({
      data: {
        title: input.title,
        sourceType: input.sourceType,
        sourceRef: input.sourceRef ?? null,
        sourceInput: input.rawText ?? input.inspiration ?? null,
        trackId: input.trackId ?? null,
        status: "draft",
        stylePreset: input.stylePreset ?? null,
      },
    });
  }

  async listProjects() {
    return prisma.comicProject.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        sourceBundle: { select: { id: true, importedAt: true } },
        _count: { select: { episodes: true, characters: true } },
      },
    });
  }

  async getProject(projectId: string) {
    return prisma.comicProject.findUnique({
      where: { id: projectId },
      include: {
        sourceBundle: true,
        characters: { orderBy: { createdAt: "asc" } },
        scenes: { orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] },
        episodes: {
          orderBy: { order: "asc" },
          include: { panels: { orderBy: { order: "asc" } } },
        },
        batchJobs: { orderBy: { createdAt: "desc" }, take: 20 },
      },
    });
  }

  async deleteProject(projectId: string) {
    return prisma.comicProject.delete({ where: { id: projectId } });
  }

  /**
   * Update a character's appearance anchor.
   * - appearance: main appearance description (primary source for the image-generation chain)
   * - faceShapeOverride: optional hard face-shape override. When it conflicts with appearance
   *   (e.g. appearance says "sharp features" but the user wants a round face), this field is
   *   appended in the image prompt as FINAL OVERRIDE with higher weight than appearance, and
   *   the model is told to ignore earlier face-shape words that conflict. Only provided fields
   *   are updated; others stay as they are.
   */
  async updateCharacterVisualAnchor(
    charId: string,
    patch: { appearance?: string; faceShapeOverride?: string },
  ) {
    const character = await prisma.comicCharacter.findUnique({ where: { id: charId } });
    if (!character) throw new Error(`The character does not exist:${charId}`);

    let existing: Record<string, unknown> = {};
    if (character.visualAnchor) {
      try { existing = JSON.parse(character.visualAnchor) as Record<string, unknown>; } catch { /* ignore */ }
    }
    const visualSpec = (existing.visualSpec as Record<string, unknown> | undefined) ?? {};

    const nextSpec: Record<string, unknown> = { ...visualSpec };
    let nextDescription = existing.description as string | undefined;

    if (patch.appearance !== undefined) {
      const trimmed = patch.appearance.trim();
      nextSpec.appearance = trimmed;
      // description is a compatibility field (older / some pipelines still read it).
      nextDescription = trimmed.length > 80 ? trimmed.slice(0, 80) : trimmed;
    }
    if (patch.faceShapeOverride !== undefined) {
      const trimmed = patch.faceShapeOverride.trim();
      if (trimmed) nextSpec.faceShapeOverride = trimmed;
      else delete nextSpec.faceShapeOverride; // Empty string clears the override.
    }

    const next: Record<string, unknown> = {
      ...existing,
      ...(nextDescription !== undefined && { description: nextDescription }),
      visualSpec: nextSpec,
    };

    return prisma.comicCharacter.update({
      where: { id: charId },
      data: { visualAnchor: JSON.stringify(next) },
    });
  }

  /**
   * Update character gender. The full image-generation chain (turnaround / expression sheet /
   * assets / panel images) injects GENDER LOCK from this value so the model does not flip
   * gender when appearance copy is ambiguous.
   */
  async updateCharacterGender(charId: string, gender: "male" | "female" | "other" | "unknown") {
    const character = await prisma.comicCharacter.findUnique({ where: { id: charId } });
    if (!character) throw new Error(`The character does not exist:${charId}`);
    return prisma.comicCharacter.update({
      where: { id: charId },
      data: { gender },
    });
  }

  /**
   * AI-assisted rewrite of the appearance anchor.
   * Does not persist. Returns { appearance, faceShapeOverride?, rationale } for frontend review;
   * the user confirms, then updateCharacterVisualAnchor saves it.
   */
  async rewriteCharacterVisualAnchor(
    charId: string,
    input: { userInstruction?: string; provider?: LLMProvider },
  ): Promise<ComicVisualAnchorRewriteOutput> {
    const character = await prisma.comicCharacter.findUnique({ where: { id: charId } });
    if (!character) throw new Error(`The character does not exist:${charId}`);

    let currentAppearance = "";
    let currentFaceShapeOverride: string | undefined;
    if (character.visualAnchor) {
      try {
        const parsed = JSON.parse(character.visualAnchor) as Record<string, unknown>;
        const spec = parsed.visualSpec as Record<string, unknown> | undefined;
        if (spec && typeof spec.appearance === "string") currentAppearance = spec.appearance;
        else if (typeof parsed.description === "string") currentAppearance = parsed.description;
        if (spec && typeof spec.faceShapeOverride === "string" && spec.faceShapeOverride.trim()) {
          currentFaceShapeOverride = spec.faceShapeOverride.trim();
        }
      } catch { /* ignore */ }
    }

    const result = await runStructuredPrompt({
      asset: comicVisualAnchorRewritePrompt,
      promptInput: {
        characterName: character.name,
        persona: character.persona,
        currentAppearance,
        currentFaceShapeOverride,
        userInstruction: input.userInstruction?.trim() || undefined,
      },
      options: { temperature: 0.5, provider: input.provider },
    });
    return result.output;
  }

  async updateProjectStyle(projectId: string, stylePreset: string) {
    return prisma.comicProject.update({
      where: { id: projectId },
      data: { stylePreset },
    });
  }

  async updateProjectPreset(
    projectId: string,
    patch: { format?: string; style?: string; promptKeywords?: string; imageSize?: string },
  ) {
    const project = await prisma.comicProject.findUnique({ where: { id: projectId }, select: { stylePreset: true } });
    if (!project) throw new Error(`The comic project does not exist: ${projectId}`);
    let current: Record<string, unknown> = {};
    try { if (project.stylePreset) current = JSON.parse(project.stylePreset); } catch { /* ignore */ }
    const merged = { ...current, ...Object.fromEntries(Object.entries(patch).filter(([, v]) => v !== undefined)) };
    return prisma.comicProject.update({
      where: { id: projectId },
      data: { stylePreset: JSON.stringify(merged) },
    });
  }

  async updateProjectStatus(projectId: string, status: string) {
    return prisma.comicProject.update({
      where: { id: projectId },
      data: { status },
    });
  }

  /**
   * Assemble a source into a standard content bundle through the anti-corruption layer
   * and persist it (import is a snapshot):
   * 1) ComicSourceBundle (synopsis / beats / characters / hard facts)
   * 2) ComicCharacter (character-resource import)
   */
  async importSourceBundle(projectId: string) {
    const project = await prisma.comicProject.findUnique({ where: { id: projectId } });
    if (!project) throw new Error(`Comic project not found: ${projectId}`);

    const sourceRef: SourceRef = {
      type: project.sourceType as AdaptationSourceType,
      ref: project.sourceRef ?? undefined,
      inspiration: project.sourceInput ?? undefined,
      rawText: project.sourceInput ?? undefined,
    };

    const adapter = adaptationSourceRegistry.resolve(sourceRef.type);
    const bundle: SourceBundle = await adapter.loadBundle(sourceRef);

    // Transaction: persist sourceBundle + characters.
    await prisma.$transaction(async (tx) => {
      // Idempotent: replace if it already exists.
      await tx.comicSourceBundle.upsert({
        where: { projectId },
        create: { projectId, bundleJson: JSON.stringify(bundle) },
        update: { bundleJson: JSON.stringify(bundle), importedAt: new Date() },
      });

      // Delete old character resources and rebuild so they stay in sync with the source.
      await tx.comicCharacter.deleteMany({ where: { projectId } });
      if (bundle.characters.length > 0) {
        await tx.comicCharacter.createMany({
          data: bundle.characters.map((character) => ({
            projectId,
            name: character.name,
            gender: character.gender ?? "unknown",
            persona: character.persona ?? null,
            visualAnchor: buildComicVisualAnchor(character),
            sourceCharacterRef: character.sourceCharacterRef ?? null,
          })),
        });
      }

      await tx.comicProject.update({
        where: { id: projectId },
        data: { status: "outlined" },
      });
    });

    return prisma.comicProject.findUnique({
      where: { id: projectId },
      include: { sourceBundle: true, characters: true },
    });
  }
}

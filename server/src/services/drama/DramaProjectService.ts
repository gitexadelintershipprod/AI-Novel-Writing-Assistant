/**
 * Short-drama project service (P0 skeleton).
 *
 * Owns the basic project lifecycle, and assembles any content source into a
 * standard content bundle through the anti-corruption layer (including character
 * import and the initial fact ledger).
 *
 * Low coupling: this file depends only on prisma (infrastructure) and drama's own
 * contracts/ports. It does not import any services/novel/* business logic.
 */
import { prisma } from "../../db/prisma";
import { sourceContentRegistry } from "./source/SourceContentPort";
import { novelSourceAdapter } from "./source/NovelSourceAdapter";
import { originalSourceAdapter } from "./source/OriginalSourceAdapter";
import { textImportSourceAdapter } from "./source/TextImportSourceAdapter";
import type { DramaSourceType, SourceBundle, SourceRef } from "./contracts/sourceBundle";

sourceContentRegistry.register(novelSourceAdapter);
sourceContentRegistry.register(originalSourceAdapter);
sourceContentRegistry.register(textImportSourceAdapter);

export interface CreateDramaProjectInput {
  title: string;
  source: DramaSourceType;
  /** Soft reference: novelId when source is novel_import. */
  sourceRef?: string;
  track?: string;
  theme?: string;
  targetEpisodes?: number;
  /** Raw input for original / text_import (passed through to the adapter). */
  inspiration?: string;
  rawText?: string;
}

export class DramaProjectService {
  async createProject(input: CreateDramaProjectInput) {
    return prisma.dramaProject.create({
      data: {
        title: input.title,
        source: input.source,
        sourceRef: input.sourceRef ?? null,
        sourceInput: input.rawText ?? input.inspiration ?? null,
        track: input.track ?? null,
        theme: input.theme ?? null,
        targetEpisodes: input.targetEpisodes ?? 80,
        status: "draft",
      },
    });
  }

  async listProjects() {
    return prisma.dramaProject.findMany({ orderBy: { createdAt: "desc" } });
  }

  async getProject(projectId: string) {
    return prisma.dramaProject.findUnique({
      where: { id: projectId },
      include: {
        sourceBundle: true,
        characters: { orderBy: { createdAt: "asc" } },
        episodes: {
          orderBy: { order: "asc" },
          include: {
            storyboards: {
              orderBy: { createdAt: "desc" },
              include: { shots: { orderBy: { order: "asc" } } },
            },
            videoPrompts: { orderBy: [{ version: "desc" }, { createdAt: "desc" }] },
          },
        },
        videoPrompts: { orderBy: [{ version: "desc" }, { createdAt: "desc" }] },
        batchJobs: { orderBy: { createdAt: "desc" }, take: 20 },
      },
    });
  }

  /**
   * Assemble a source into a standard content bundle through the anti-corruption layer and persist:
   * 1) DramaSourceBundle (synopsis / beats / setting / hard facts / source text)
   * 2) DramaCharacter (character-resource import)
   * 3) DramaFact (initial fact ledger; episodeOrder=0 means source-initial facts)
   */
  async assembleSourceBundle(projectId: string): Promise<SourceBundle> {
    const project = await prisma.dramaProject.findUnique({ where: { id: projectId } });
    if (!project) {
      throw new Error(`Drama project ${projectId} was not found.`);
    }

    const adapter = sourceContentRegistry.resolve(project.source as DramaSourceType);
    const ref: SourceRef = {
      type: project.source as DramaSourceType,
      ref: project.sourceRef ?? undefined,
      inspiration: project.source === "original" ? project.sourceInput ?? undefined : undefined,
      rawText: project.source === "text_import" ? project.sourceInput ?? undefined : undefined,
    };
    const bundle = await adapter.loadBundle(ref);

    await prisma.$transaction(async (tx) => {
      await tx.dramaSourceBundle.upsert({
        where: { projectId },
        update: {
          synopsis: bundle.synopsis,
          beats: JSON.stringify(bundle.beats),
          worldNotes: bundle.worldNotes ?? null,
          hardFacts: bundle.hardFacts ? JSON.stringify(bundle.hardFacts) : null,
          rawText: bundle.rawText ?? null,
        },
        create: {
          projectId,
          synopsis: bundle.synopsis,
          beats: JSON.stringify(bundle.beats),
          worldNotes: bundle.worldNotes ?? null,
          hardFacts: bundle.hardFacts ? JSON.stringify(bundle.hardFacts) : null,
          rawText: bundle.rawText ?? null,
        },
      });

      // Import character resources (reset then rebuild so it stays idempotent).
      await tx.dramaCharacter.deleteMany({ where: { projectId } });
      if (bundle.characters.length > 0) {
        await tx.dramaCharacter.createMany({
          data: bundle.characters.map((character) => ({
            projectId,
            name: character.name,
            persona: character.persona ?? null,
            relations: character.relations ?? null,
            visualAnchor: character.visualHint
              ? JSON.stringify({ hint: character.visualHint })
              : null,
            sourceCharacterRef: character.sourceCharacterRef ?? null,
          })),
        });
      }

      // Initial fact ledger (episodeOrder=0 means hard facts brought in from the source).
      await tx.dramaFact.deleteMany({ where: { projectId, episodeOrder: 0 } });
      if (bundle.hardFacts && bundle.hardFacts.length > 0) {
        await tx.dramaFact.createMany({
          data: bundle.hardFacts.map((fact) => ({
            projectId,
            episodeOrder: 0,
            text: fact.text,
            category: fact.category,
            source: "auto",
          })),
        });
      }

      // After the content bundle is ready, only refresh updatedAt; status advances in later strategy/outline stages.
      await tx.dramaProject.update({
        where: { id: projectId },
        data: { updatedAt: new Date() },
      });
    });

    return bundle;
  }
}

export const dramaProjectService = new DramaProjectService();

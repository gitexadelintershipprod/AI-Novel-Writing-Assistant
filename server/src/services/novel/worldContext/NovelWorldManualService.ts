import type { NovelWorldManualInput } from "@ai-novel/shared/types/novelWorld";
import { prisma } from "../../../db/prisma";
import {
  applyStructuredWorldToLegacyFields,
  buildWorldBindingSupport,
  normalizeWorldStructuredData,
  WORLD_STRUCTURE_SCHEMA_VERSION,
} from "../../world/worldStructure";
import { normalizeLayerStates } from "../../world/worldServiceShared";
import { NovelWorldInstanceService, type NovelWorldInstanceView } from "./NovelWorldInstanceService";

export class NovelWorldManualService {
  constructor(private readonly viewService = new NovelWorldInstanceService()) {}

  async createManualNovelWorld(input: {
    novelId: string;
  } & NovelWorldManualInput): Promise<NovelWorldInstanceView> {
    const novel = await prisma.novel.findUnique({
      where: { id: input.novelId },
      select: {
        id: true,
        title: true,
        description: true,
      },
    });
    if (!novel) {
      throw new Error("The novel does not exist.");
    }

    const title = input.title?.trim() || `${novel.title} world`;
    const coverSummary = input.coverSummary?.trim()
      || novel.description?.trim()
      || `A book world built around "${novel.title}".`;
    const structuredData = normalizeWorldStructuredData(null);
    structuredData.profile = {
      ...structuredData.profile,
      summary: coverSummary,
      identity: "Book-customized world",
      themes: structuredData.profile.themes.length > 0 ? structuredData.profile.themes : ["To be filled in"],
    };
    structuredData.metadata = {
      ...structuredData.metadata,
      schemaVersion: WORLD_STRUCTURE_SCHEMA_VERSION,
      seededFrom: "manual",
      lastGeneratedAt: new Date().toISOString(),
    };
    const bindingSupport = buildWorldBindingSupport(structuredData);
    const novelWorldId = `novel_world_${input.novelId}`;
    const structuredDataJson = JSON.stringify(structuredData);
    const bindingContractJson = JSON.stringify(bindingSupport);
    const structuredFields = applyStructuredWorldToLegacyFields(structuredData, {
      id: "",
      name: title,
      worldType: "custom",
      description: coverSummary,
      overviewSummary: coverSummary,
      axioms: null,
      background: null,
      geography: null,
      cultures: null,
      magicSystem: null,
      politics: null,
      races: null,
      religions: null,
      technology: null,
      conflicts: null,
      history: null,
      economy: null,
      factions: null,
      selectedElements: null,
      structureJson: null,
      bindingSupportJson: null,
      structureSchemaVersion: WORLD_STRUCTURE_SCHEMA_VERSION,
    }, bindingSupport);

    await prisma.$transaction(async (tx) => {
      const world = await tx.world.create({
        data: {
          name: title,
          description: (structuredFields.description as string | null | undefined) ?? coverSummary,
          worldType: "custom",
          templateKey: "custom",
          axioms: structuredFields.axioms as string | null | undefined,
          geography: structuredFields.geography as string | null | undefined,
          politics: structuredFields.politics as string | null | undefined,
          conflicts: structuredFields.conflicts as string | null | undefined,
          factions: structuredFields.factions as string | null | undefined,
          status: "draft",
          layerStates: JSON.stringify(normalizeLayerStates(undefined)),
          overviewSummary: (structuredFields.overviewSummary as string | null | undefined) ?? coverSummary,
          structureJson: structuredDataJson,
          bindingSupportJson: bindingContractJson,
          structureSchemaVersion: WORLD_STRUCTURE_SCHEMA_VERSION,
        },
      });
      await tx.worldSnapshot.create({
        data: {
          worldId: world.id,
          label: "novel-world-manual-created",
          data: JSON.stringify(world),
        },
      });
      await tx.novel.update({
        where: { id: input.novelId },
        data: {
          worldId: world.id,
          storyWorldSliceJson: null,
          storyWorldSliceOverridesJson: null,
        },
      });
      await tx.$executeRaw`
        INSERT INTO "NovelWorld" (
          "id",
          "novelId",
          "sourceWorldId",
          "sourceType",
          "title",
          "coverSummary",
          "structuredDataJson",
          "bindingContractJson",
          "storySliceJson",
          "storySliceOverridesJson",
          "storySliceSchemaVersion",
          "storySliceBuiltAt",
          "storySliceDigest",
          "syncEnabled",
          "syncDirection",
          "syncBaseVersion",
          "createdAt",
          "updatedAt"
        ) VALUES (
          ${novelWorldId},
          ${input.novelId},
          ${world.id},
          ${"manual"},
          ${title},
          ${coverSummary},
          ${structuredDataJson},
          ${bindingContractJson},
          ${null},
          ${null},
          ${1},
          ${null},
          ${null},
          ${true},
          ${"bidirectional"},
          ${1},
          CURRENT_TIMESTAMP,
          CURRENT_TIMESTAMP
        )
        ON CONFLICT ("novelId") DO UPDATE SET
          "sourceWorldId" = EXCLUDED."sourceWorldId",
          "sourceType" = EXCLUDED."sourceType",
          "title" = EXCLUDED."title",
          "coverSummary" = EXCLUDED."coverSummary",
          "structuredDataJson" = EXCLUDED."structuredDataJson",
          "bindingContractJson" = EXCLUDED."bindingContractJson",
          "storySliceJson" = NULL,
          "storySliceOverridesJson" = NULL,
          "storySliceBuiltAt" = NULL,
          "storySliceDigest" = NULL,
          "syncEnabled" = EXCLUDED."syncEnabled",
          "syncDirection" = EXCLUDED."syncDirection",
          "syncBaseVersion" = EXCLUDED."syncBaseVersion",
          "updatedAt" = CURRENT_TIMESTAMP
      `;
    });

    return this.viewService.getNovelWorldView(input.novelId);
  }
}

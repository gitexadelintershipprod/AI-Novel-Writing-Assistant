import type { NovelWorldSyncDiff, NovelWorldSyncInput, NovelWorldSyncSection } from "@ai-novel/shared/types/novelWorld";
import type { WorldStructuredData } from "@ai-novel/shared/types/world";
import { prisma } from "../../../db/prisma";
import {
  applyStructuredWorldToLegacyFields,
  buildWorldBindingSupport,
  normalizeWorldStructuredData,
  parseWorldStructurePayload,
  WORLD_STRUCTURE_SCHEMA_VERSION,
} from "../../world/worldStructure";
import type { NovelWorldInstanceRow } from "./NovelWorldInstanceService";
import { safeJsonParse } from "./novelWorldProjection";

export const SYNC_SECTIONS: NovelWorldSyncSection[] = ["profile", "rules", "factions", "forces", "locations", "relations"];

const SYNC_SECTION_LABELS: Record<NovelWorldSyncSection, string> = {
  profile: "world summary",
  rules: "core rules",
  factions: "camp",
  forces: "power",
  locations: "location",
  relations: "relationship network",
};

function stableStringify(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(",")}]`;
  }
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    return `{${Object.keys(record).sort().map((key) => `${JSON.stringify(key)}:${stableStringify(record[key])}`).join(",")}}`;
  }
  return JSON.stringify(value ?? null);
}

function getSection(structure: WorldStructuredData, section: NovelWorldSyncSection): unknown {
  return structure[section];
}

function compactItems(items: Array<string | null | undefined>, fallback: string): string {
  const normalized = items.map((item) => item?.trim()).filter((item): item is string => Boolean(item));
  if (normalized.length === 0) {
    return fallback;
  }
  const visible = normalized.slice(0, 3).join(", ");
  return normalized.length > 3 ? `${visible} and ${normalized.length} items total` : visible;
}

function summarizeProfile(structure: WorldStructuredData): string {
  return compactItems([
    structure.profile.identity,
    structure.profile.tone,
    structure.profile.coreConflict,
    structure.profile.summary,
  ], "summary not filled in");
}

function summarizeRules(structure: WorldStructuredData): string {
  return compactItems([
    structure.rules.summary,
    ...structure.rules.axioms.map((rule) => rule.name || rule.summary),
    ...structure.rules.taboo.map((item) => `taboo: ${item}`),
  ], "rules not filled in");
}

function summarizeRelations(structure: WorldStructuredData): string {
  const forceNameById = new Map(structure.forces.map((force) => [force.id, force.name]));
  return compactItems([
    ...structure.relations.forceRelations.map((relation) => {
      const source = forceNameById.get(relation.sourceForceId) ?? relation.sourceForceId;
      const target = forceNameById.get(relation.targetForceId) ?? relation.targetForceId;
      return [source, relation.relation, target].filter(Boolean).join(" / ");
    }),
    ...structure.relations.locationControls.map((relation) => {
      const force = forceNameById.get(relation.forceId) ?? relation.forceId;
      return [force, relation.relation, relation.locationId].filter(Boolean).join(" / ");
    }),
  ], "relations not filled in");
}

function summarizeSection(structure: WorldStructuredData, section: NovelWorldSyncSection): string {
  switch (section) {
    case "profile":
      return summarizeProfile(structure);
    case "rules":
      return summarizeRules(structure);
    case "factions":
      return compactItems(structure.factions.map((item) => item.name), "factions not filled in");
    case "forces":
      return compactItems(structure.forces.map((item) => item.name), "forces not filled in");
    case "locations":
      return compactItems(structure.locations.map((item) => item.name), "locations not filled in");
    case "relations":
      return summarizeRelations(structure);
    default:
      return "content not filled in";
  }
}

function buildDifferenceSummary(input: {
  section: NovelWorldSyncSection;
  status: "changed" | "local_only" | "library_only";
  localStructure: WorldStructuredData;
  libraryStructure: WorldStructuredData;
}): string {
  const label = SYNC_SECTION_LABELS[input.section];
  const localSummary = summarizeSection(input.localStructure, input.section);
  const librarySummary = summarizeSection(input.libraryStructure, input.section);
  if (input.status === "local_only") {
    return `This book's world "${label}" is: ${localSummary}. The world library is missing this part.`;
  }
  if (input.status === "library_only") {
    return `The world library "${label}" is: ${librarySummary}. This book's world is missing this part.`;
  }
  return `This book's world "${label}" is: ${localSummary}. The world library is: ${librarySummary}.`;
}

function setSection(
  structure: WorldStructuredData,
  section: NovelWorldSyncSection,
  value: unknown,
): WorldStructuredData {
  return normalizeWorldStructuredData({
    ...structure,
    [section]: value,
  }, structure);
}

export function buildSyncDiffItems(
  localStructure: WorldStructuredData,
  libraryStructure: WorldStructuredData,
): NovelWorldSyncDiff["differences"] {
  return SYNC_SECTIONS.flatMap((section) => {
    const localValue = getSection(localStructure, section);
    const libraryValue = getSection(libraryStructure, section);
    const localText = stableStringify(localValue);
    const libraryText = stableStringify(libraryValue);
    if (localText === libraryText) {
      return [];
    }
    const hasLocal = localText !== stableStringify(getSection(normalizeWorldStructuredData(null), section));
    const hasLibrary = libraryText !== stableStringify(getSection(normalizeWorldStructuredData(null), section));
    const status = hasLocal && hasLibrary ? "changed" : hasLocal ? "local_only" : "library_only";
    return [{
      section,
      label: SYNC_SECTION_LABELS[section],
      status,
      summary: buildDifferenceSummary({
        section,
        status,
        localStructure,
        libraryStructure,
      }),
    }];
  });
}

export function buildSyncPendingChangesPayload(
  differences: NovelWorldSyncDiff["differences"],
): string | null {
  if (differences.length === 0) {
    return null;
  }
  return JSON.stringify({
    differenceCount: differences.length,
    sections: differences.map((item) => item.section),
    summary: differences.map((item) => `${item.label}: ${item.summary}`).join("\n"),
    computedAt: new Date().toISOString(),
  });
}

export class NovelWorldSyncService {
  constructor(
    private readonly ensureNovelWorld: (novelId: string) => Promise<NovelWorldInstanceRow | null>,
  ) {}

  async getSyncDiff(novelId: string): Promise<NovelWorldSyncDiff> {
    const novelWorld = await this.ensureNovelWorld(novelId);
    if (!novelWorld) {
      return {
        canSync: false,
        reason: "This book does not have a book world yet.",
        novelWorldId: null,
        sourceWorldId: null,
        sourceWorldName: null,
        differenceCount: 0,
        differences: [],
      };
    }
    if (!novelWorld.sourceWorldId) {
      await this.persistPendingChanges(novelWorld.id, null);
      return {
        canSync: false,
        reason: "This book's world is not linked to a world-library sample.",
        novelWorldId: novelWorld.id,
        sourceWorldId: null,
        sourceWorldName: null,
        differenceCount: 0,
        differences: [],
      };
    }

    const sourceWorld = await prisma.world.findUnique({
      where: { id: novelWorld.sourceWorldId },
      select: {
        id: true,
        name: true,
        structureJson: true,
        bindingSupportJson: true,
      },
    });
    if (!sourceWorld) {
      await this.persistPendingChanges(novelWorld.id, null);
      return {
        canSync: false,
        reason: "The linked world-library sample does not exist.",
        novelWorldId: novelWorld.id,
        sourceWorldId: novelWorld.sourceWorldId,
        sourceWorldName: null,
        differenceCount: 0,
        differences: [],
      };
    }

    const localStructure = normalizeWorldStructuredData(safeJsonParse<unknown>(novelWorld.structuredDataJson, null));
    const libraryStructure = parseWorldStructurePayload(
      sourceWorld.structureJson,
      sourceWorld.bindingSupportJson,
    ).structure;
    const differences = buildSyncDiffItems(localStructure, libraryStructure);
    await this.persistPendingChanges(novelWorld.id, buildSyncPendingChangesPayload(differences));
    return {
      canSync: true,
      reason: null,
      novelWorldId: novelWorld.id,
      sourceWorldId: sourceWorld.id,
      sourceWorldName: sourceWorld.name,
      differenceCount: differences.length,
      differences,
    };
  }

  async syncWithLibrary(novelId: string, input: NovelWorldSyncInput): Promise<NovelWorldSyncDiff> {
    const novelWorld = await this.ensureNovelWorld(novelId);
    if (!novelWorld?.sourceWorldId) {
      throw new Error("This book's world is not linked to a world-library sample.");
    }
    if (input.direction === "none") {
      await prisma.$transaction(async (tx) => {
        await tx.$executeRaw`
          UPDATE "NovelWorld"
          SET
            "syncEnabled" = ${false},
            "syncDirection" = ${"none"},
            "syncPendingChangesJson" = NULL,
            "updatedAt" = CURRENT_TIMESTAMP
          WHERE "id" = ${novelWorld.id}
        `;
        await tx.$executeRaw`
          INSERT INTO "WorldSyncRecord" (
            "id",
            "novelWorldId",
            "sourceWorldId",
            "direction",
            "syncedFieldsJson",
            "diffSummary",
            "triggeredBy",
            "createdAt"
          ) VALUES (
            ${`world_sync_${novelWorld.id}_${Date.now()}`},
            ${novelWorld.id},
            ${novelWorld.sourceWorldId},
            ${"none"},
            ${JSON.stringify([])},
            ${"Turn off sync: keep this book world as an independent copy."},
            ${"user"},
            CURRENT_TIMESTAMP
          )
        `;
      });
      return {
        canSync: false,
        reason: "Sync is off. This book's world will stay as an independent copy.",
        novelWorldId: novelWorld.id,
        sourceWorldId: novelWorld.sourceWorldId,
        sourceWorldName: null,
        differenceCount: 0,
        differences: [],
      };
    }
    const sourceWorld = await prisma.world.findUnique({
      where: { id: novelWorld.sourceWorldId },
    });
    if (!sourceWorld) {
      throw new Error("The linked world-library sample does not exist.");
    }

    const selectedSections = (input.sections?.length ? input.sections : SYNC_SECTIONS)
      .filter((section, index, sections) => SYNC_SECTIONS.includes(section) && sections.indexOf(section) === index);
    if (selectedSections.length === 0) {
      throw new Error("Choose at least one world part to sync.");
    }

    const localStructure = normalizeWorldStructuredData(safeJsonParse<unknown>(novelWorld.structuredDataJson, null));
    const libraryStructure = parseWorldStructurePayload(sourceWorld.structureJson, sourceWorld.bindingSupportJson).structure;
    const mergedStructure = selectedSections.reduce((current, section) => {
      const source = input.direction === "push" ? localStructure : libraryStructure;
      return setSection(current, section, getSection(source, section));
    }, input.direction === "push" ? libraryStructure : localStructure);
    mergedStructure.metadata = {
      ...mergedStructure.metadata,
      schemaVersion: WORLD_STRUCTURE_SCHEMA_VERSION,
      lastGeneratedAt: new Date().toISOString(),
    };
    const nextBindingSupport = buildWorldBindingSupport(mergedStructure);
    const structuredFields = applyStructuredWorldToLegacyFields(
      mergedStructure,
      input.direction === "push"
        ? sourceWorld
        : {
          id: novelWorld.id,
          name: novelWorld.title ?? sourceWorld.name,
          worldType: sourceWorld.worldType,
          description: novelWorld.coverSummary ?? sourceWorld.description,
          overviewSummary: novelWorld.coverSummary ?? sourceWorld.overviewSummary,
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
        },
      nextBindingSupport,
    );

    await prisma.$transaction(async (tx) => {
      if (input.direction === "push") {
        const updatedWorld = await tx.world.update({
          where: { id: sourceWorld.id },
          data: {
            ...structuredFields,
            version: { increment: 1 },
          },
        });
        await tx.$executeRaw`
          UPDATE "NovelWorld"
          SET
            "syncEnabled" = ${true},
            "syncDirection" = CASE WHEN "syncDirection" = 'none' THEN ${"bidirectional"} ELSE "syncDirection" END,
            "syncBaseVersion" = ${updatedWorld.version},
            "lastSyncedAt" = CURRENT_TIMESTAMP,
            "updatedAt" = CURRENT_TIMESTAMP
          WHERE "id" = ${novelWorld.id}
        `;
      } else {
        await tx.$executeRaw`
          UPDATE "NovelWorld"
          SET
            "title" = COALESCE("title", ${sourceWorld.name}),
            "coverSummary" = ${((structuredFields.overviewSummary as string | null | undefined) ?? sourceWorld.overviewSummary ?? sourceWorld.description ?? null)},
            "structuredDataJson" = ${structuredFields.structureJson as string},
            "bindingContractJson" = ${structuredFields.bindingSupportJson as string},
            "storySliceJson" = NULL,
            "storySliceOverridesJson" = NULL,
            "storySliceBuiltAt" = NULL,
            "storySliceDigest" = NULL,
            "syncEnabled" = ${true},
            "syncDirection" = CASE WHEN "syncDirection" = 'none' THEN ${"bidirectional"} ELSE "syncDirection" END,
            "syncBaseVersion" = ${sourceWorld.version},
            "lastSyncedAt" = CURRENT_TIMESTAMP,
            "updatedAt" = CURRENT_TIMESTAMP
          WHERE "id" = ${novelWorld.id}
        `;
      }
      await tx.$executeRaw`
        INSERT INTO "WorldSyncRecord" (
          "id",
          "novelWorldId",
          "sourceWorldId",
          "direction",
          "syncedFieldsJson",
          "diffSummary",
          "triggeredBy",
          "createdAt"
        ) VALUES (
          ${`world_sync_${novelWorld.id}_${Date.now()}`},
          ${novelWorld.id},
          ${sourceWorld.id},
          ${input.direction},
          ${JSON.stringify(selectedSections)},
          ${`${input.direction === "push" ? "push" : "pull"}: ${selectedSections.map((section) => SYNC_SECTION_LABELS[section]).join(", ")}`},
          ${"user"},
          CURRENT_TIMESTAMP
        )
      `;
    });

    return this.getSyncDiff(novelId);
  }

  private async persistPendingChanges(novelWorldId: string, payload: string | null): Promise<void> {
    await prisma.$executeRaw`
      UPDATE "NovelWorld"
      SET "syncPendingChangesJson" = ${payload}
      WHERE "id" = ${novelWorldId}
    `;
  }
}

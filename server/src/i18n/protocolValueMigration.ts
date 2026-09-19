import { prisma } from "../db/prisma";
import {
  BEAT_ROLE_LABEL_MAP,
  STORY_FUNCTION_MAP,
  WORLD_TYPE_MAP,
  rewriteExactProtocolString,
  rewriteProtocolJsonText,
} from "./legacyValueMap";

const PROTOCOL_MIGRATION_SETTING_KEY = "system.protocol_values_en@1";

export interface ProtocolValueMigrationReport {
  characters: number;
  baseCharacters: number;
  castMembers: number;
  worlds: number;
  worldLibrary: number;
  threads: number;
  volumePlanVersions: number;
  taskLabels: number;
  genres: number;
  storyModes: number;
}

const EMPTY_REPORT: ProtocolValueMigrationReport = {
  characters: 0,
  baseCharacters: 0,
  castMembers: 0,
  worlds: 0,
  worldLibrary: 0,
  threads: 0,
  volumePlanVersions: 0,
  taskLabels: 0,
  genres: 0,
  storyModes: 0,
};

function uniquePairs(map: Record<string, string>): Array<[string, string]> {
  const seen = new Set<string>();
  const pairs: Array<[string, string]> = [];
  for (const [from, to] of Object.entries(map)) {
    if (from === to || seen.has(from)) continue;
    seen.add(from);
    pairs.push([from, to]);
  }
  return pairs;
}

async function rewriteStringColumn(
  updateMany: (from: string, to: string) => Promise<{ count: number }>,
  map: Record<string, string>,
): Promise<number> {
  let count = 0;
  for (const [from, to] of uniquePairs(map)) {
    const result = await updateMany(from, to);
    count += result.count;
  }
  return count;
}

async function rewriteTaskLabelColumn(
  findMany: () => Promise<Array<{ id: string; currentItemLabel: string | null }>>,
  update: (id: string, currentItemLabel: string) => Promise<unknown>,
): Promise<number> {
  const rows = await findMany();
  let count = 0;
  for (const row of rows) {
    const current = row.currentItemLabel?.trim();
    if (!current) continue;
    const next = rewriteExactProtocolString(current);
    if (next === current) continue;
    await update(row.id, next);
    count += 1;
  }
  return count;
}

export async function migratePersistedProtocolValues(): Promise<ProtocolValueMigrationReport> {
  const marker = await prisma.appSetting.findUnique({
    where: { key: PROTOCOL_MIGRATION_SETTING_KEY },
    select: { value: true },
  });
  if (marker?.value === "done") {
    return EMPTY_REPORT;
  }

  const report: ProtocolValueMigrationReport = { ...EMPTY_REPORT };

  report.characters += await rewriteStringColumn(
    (from, to) => prisma.character.updateMany({ where: { storyFunction: from }, data: { storyFunction: to } }),
    STORY_FUNCTION_MAP,
  );
  report.characters += await rewriteStringColumn(
    (from, to) => prisma.character.updateMany({ where: { role: from }, data: { role: to } }),
    STORY_FUNCTION_MAP,
  );

  report.baseCharacters += await rewriteStringColumn(
    (from, to) => prisma.baseCharacter.updateMany({ where: { category: from }, data: { category: to } }),
    STORY_FUNCTION_MAP,
  );
  report.baseCharacters += await rewriteStringColumn(
    (from, to) => prisma.baseCharacter.updateMany({ where: { role: from }, data: { role: to } }),
    STORY_FUNCTION_MAP,
  );

  report.castMembers += await rewriteStringColumn(
    (from, to) => prisma.characterCastOptionMember.updateMany({
      where: { storyFunction: from },
      data: { storyFunction: to },
    }),
    STORY_FUNCTION_MAP,
  );
  report.castMembers += await rewriteStringColumn(
    (from, to) => prisma.characterCastOptionMember.updateMany({ where: { role: from }, data: { role: to } }),
    STORY_FUNCTION_MAP,
  );

  report.worlds += await rewriteStringColumn(
    (from, to) => prisma.world.updateMany({ where: { worldType: from }, data: { worldType: to } }),
    WORLD_TYPE_MAP,
  );
  report.worldLibrary += await rewriteStringColumn(
    (from, to) => prisma.worldPropertyLibrary.updateMany({ where: { worldType: from }, data: { worldType: to } }),
    WORLD_TYPE_MAP,
  );

  report.threads += await rewriteStringColumn(
    (from, to) => prisma.creativeHubThread.updateMany({ where: { title: from }, data: { title: to } }),
    { 新对话: "New thread" },
  );

  const protocolTokens = [
    ...Object.keys(STORY_FUNCTION_MAP),
    ...Object.keys(WORLD_TYPE_MAP),
    ...Object.keys(BEAT_ROLE_LABEL_MAP),
    "第",
  ].filter((token, index, all) => token !== WORLD_TYPE_MAP[token] && all.indexOf(token) === index);
  const versions = await prisma.volumePlanVersion.findMany({
    where: {
      OR: protocolTokens.slice(0, 40).map((token) => ({ contentJson: { contains: token } })),
    },
    select: { id: true, contentJson: true },
  });
  for (const row of versions) {
    const next = rewriteProtocolJsonText(row.contentJson);
    if (!next || next === row.contentJson) continue;
    await prisma.volumePlanVersion.update({ where: { id: row.id }, data: { contentJson: next } });
    report.volumePlanVersions += 1;
  }

  report.taskLabels += await rewriteTaskLabelColumn(
    () => prisma.novelWorkflowTask.findMany({ select: { id: true, currentItemLabel: true } }),
    (id, currentItemLabel) => prisma.novelWorkflowTask.update({ where: { id }, data: { currentItemLabel } }),
  );
  report.taskLabels += await rewriteTaskLabelColumn(
    () => prisma.generationJob.findMany({ select: { id: true, currentItemLabel: true } }),
    (id, currentItemLabel) => prisma.generationJob.update({ where: { id }, data: { currentItemLabel } }),
  );
  report.taskLabels += await rewriteTaskLabelColumn(
    () => prisma.imageGenerationTask.findMany({ select: { id: true, currentItemLabel: true } }),
    (id, currentItemLabel) => prisma.imageGenerationTask.update({ where: { id }, data: { currentItemLabel } }),
  );
  report.taskLabels += await rewriteTaskLabelColumn(
    () => prisma.styleExtractionTask.findMany({ select: { id: true, currentItemLabel: true } }),
    (id, currentItemLabel) => prisma.styleExtractionTask.update({ where: { id }, data: { currentItemLabel } }),
  );
  report.taskLabels += await rewriteTaskLabelColumn(
    () => prisma.bookAnalysis.findMany({ select: { id: true, currentItemLabel: true } }),
    (id, currentItemLabel) => prisma.bookAnalysis.update({ where: { id }, data: { currentItemLabel } }),
  );

  report.genres += await rewriteStringColumn(
    (from, to) => prisma.novelGenre.updateMany({ where: { name: from }, data: { name: to } }),
    WORLD_TYPE_MAP,
  );
  report.storyModes += await rewriteStringColumn(
    (from, to) => prisma.novelStoryMode.updateMany({ where: { name: from }, data: { name: to } }),
    WORLD_TYPE_MAP,
  );

  await prisma.appSetting.upsert({
    where: { key: PROTOCOL_MIGRATION_SETTING_KEY },
    create: { key: PROTOCOL_MIGRATION_SETTING_KEY, value: "done" },
    update: { value: "done" },
  });

  return report;
}

export function hasProtocolValueMigrationChanges(report: ProtocolValueMigrationReport): boolean {
  return Object.values(report).some((value) => value > 0);
}

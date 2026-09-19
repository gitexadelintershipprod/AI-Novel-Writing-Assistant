import type { NovelWorldAssetSummary, WorldAssetType } from "@ai-novel/shared/types/novelWorld";

export interface WorldAssetRow {
  id: string;
  assetType: WorldAssetType;
  title: string;
  description: string | null;
  status: string;
  thumbnailUrl: string | null;
  version: number;
  renderDataJson: string | null;
  updatedAt: Date | string;
}

const WORLD_ASSET_BLUEPRINTS: Array<{
  assetType: WorldAssetType;
  title: string;
  description: string;
}> = [
  {
    assetType: "map",
    title: "world map",
    description: "Organize regions, routes, faction control, and where the story takes place.",
  },
  {
    assetType: "faction_diagram",
    title: "power map",
    description: "Show alliances, rivalries, vassal ties, and competition.",
  },
  {
    assetType: "timeline",
    title: "world timeline",
    description: "Hold historical events, the current situation, and later changes.",
  },
  {
    assetType: "character_network",
    title: "role network",
    description: "Connect characters, faction membership, position changes, and relationship tension.",
  },
  {
    assetType: "power_system_tree",
    title: "Power system tree",
    description: "Capture ranks, resources, costs, and taboo bounds.",
  },
];

export function serializeNovelWorldAssetRows(rows: WorldAssetRow[]): NovelWorldAssetSummary[] {
  const rowByType = new Map<WorldAssetType, WorldAssetRow>();
  for (const row of rows) {
    const existing = rowByType.get(row.assetType);
    if (!existing || compareAssetFreshness(row, existing) > 0) {
      rowByType.set(row.assetType, row);
    }
  }
  return WORLD_ASSET_BLUEPRINTS.map((blueprint) => {
    const row = rowByType.get(blueprint.assetType);
    return {
      id: row?.id ?? null,
      assetType: blueprint.assetType,
      title: row?.title ?? blueprint.title,
      description: row?.description ?? blueprint.description,
      status: row?.status ?? "placeholder",
      thumbnailUrl: row?.thumbnailUrl ?? null,
      version: row?.version ?? null,
      updatedAt: row?.updatedAt ? new Date(row.updatedAt).toISOString() : null,
      hasRenderData: Boolean(row?.renderDataJson?.trim()),
    };
  });
}

function compareAssetFreshness(left: WorldAssetRow, right: WorldAssetRow): number {
  const leftTime = new Date(left.updatedAt).getTime();
  const rightTime = new Date(right.updatedAt).getTime();
  const normalizedLeftTime = Number.isFinite(leftTime) ? leftTime : 0;
  const normalizedRightTime = Number.isFinite(rightTime) ? rightTime : 0;
  if (normalizedLeftTime !== normalizedRightTime) {
    return normalizedLeftTime - normalizedRightTime;
  }
  return left.version - right.version;
}

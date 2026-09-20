import type { World as PrismaWorld } from "@prisma/client";
import type {
  WorldGeographyDirection,
  WorldGeographyMapEdge,
  WorldGeographyMapNode,
  WorldGeographyRegionType,
  WorldGeographyRouteType,
  WorldVisualizationPayload,
} from "@ai-novel/shared/types/world";
import { runStructuredPrompt } from "../../prompting/core/promptRunner";
import { worldVisualizationPrompt } from "../../prompting/prompts/world/world.prompts";
import {
  buildWorldBindingSupport,
  parseWorldStructurePayload,
} from "./worldStructure";

type FactionNodeType = "state" | "faction" | "race" | "organization" | "other";

type VisualizationSource = Pick<
  PrismaWorld,
  | "id"
  | "name"
  | "worldType"
  | "description"
  | "background"
  | "geography"
  | "cultures"
  | "magicSystem"
  | "politics"
  | "races"
  | "religions"
  | "technology"
  | "conflicts"
  | "history"
  | "economy"
  | "factions"
  | "structureJson"
  | "bindingSupportJson"
>;

interface VisualizationDraft {
  factionGraph?: {
    nodes?: Array<{ id?: string; label?: string; type?: string }>;
    edges?: Array<{ source?: string; target?: string; relation?: string }>;
  };
  powerTree?: Array<{ level?: string; description?: string }>;
  geographyMap?: {
    nodes?: Array<{
      id?: string;
      label?: string;
      x?: number;
      y?: number;
      directionHint?: string;
      regionType?: string;
      terrain?: string;
      summary?: string;
      parentId?: string | null;
      controllingForceIds?: string[];
      risk?: string;
      storyRelevance?: string;
    }>;
    edges?: Array<{
      source?: string;
      target?: string;
      relation?: string;
      routeType?: string;
      distanceHint?: string;
      direction?: string;
      risk?: string;
    }>;
  };
  timeline?: Array<{ year?: string; event?: string }>;
}

type GeographyNodeInput = {
  id?: string;
  label?: string;
  x?: number;
  y?: number;
  directionHint?: unknown;
  regionType?: unknown;
  terrain?: unknown;
  summary?: unknown;
  parentId?: unknown;
  controllingForceIds?: unknown;
  risk?: unknown;
  storyRelevance?: unknown;
};

type GeographyEdgeInput = {
  source?: unknown;
  target?: unknown;
  relation?: unknown;
  routeType?: unknown;
  distanceHint?: unknown;
  direction?: unknown;
  risk?: unknown;
};

const MAX_FACTION_NODES = 12;
const MAX_FACTION_EDGES = 18;
const MAX_GEO_NODES = 10;
const MAX_TIMELINE_ITEMS = 12;
const MAX_POWER_ITEMS = 8;

const GEO_DIRECTIONS = new Set<WorldGeographyDirection>([
  "north",
  "south",
  "east",
  "west",
  "center",
  "northeast",
  "northwest",
  "southeast",
  "southwest",
]);

const GEO_REGION_TYPES = new Set<WorldGeographyRegionType>([
  "continent",
  "country",
  "region",
  "city",
  "landmark",
  "border",
  "route",
  "other",
]);

const GEO_ROUTE_TYPES = new Set<WorldGeographyRouteType>([
  "road",
  "river",
  "sea",
  "portal",
  "trade",
  "military",
  "border",
  "other",
]);

const DIRECTION_COORDINATES: Record<WorldGeographyDirection, { x: number; y: number }> = {
  north: { x: 50, y: 18 },
  south: { x: 50, y: 82 },
  east: { x: 82, y: 50 },
  west: { x: 18, y: 50 },
  center: { x: 50, y: 50 },
  northeast: { x: 76, y: 24 },
  northwest: { x: 24, y: 24 },
  southeast: { x: 76, y: 76 },
  southwest: { x: 24, y: 76 },
};

const FACTION_TYPE_ALIASES: Record<string, FactionNodeType> = {
  state: "state",
  country: "state",
  kingdom: "state",
  empire: "state",
  republic: "state",
  federation: "state",
  government: "state",
  faction: "faction",
  force: "faction",
  camp: "faction",
  race: "race",
  tribe: "race",
  species: "race",
  organization: "organization",
  org: "organization",
  army: "organization",
  party: "organization",
  group: "organization",
  guild: "organization",
  other: "other",
};

const EDGE_RELATION_LABELS = [
  "alliance",
  "cooperation",
  "Support",
  "Confrontation",
  "hostile",
  "Subordination",
  "suppress",
  "Trade",
  "Competition",
  "Neutral",
  "association",
] as const;

function cleanJsonText(source: string): string {
  return source.replace(/```json|```/gi, "").trim();
}

function extractJSONObject(source: string): string {
  const text = cleanJsonText(source);
  const first = text.indexOf("{");
  const last = text.lastIndexOf("}");
  if (first === -1 || last === -1 || first >= last) {
    throw new Error("Invalid JSON object.");
  }
  return text.slice(first, last + 1);
}

function safeParseJSON<T>(raw: string, fallback: T): T {
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function normalizeAliasKey(raw: string): string {
  return raw.trim().toLowerCase().replace(/[\s_\-:/\\|（）()【】\[\]·、，,。.!?？：:]/g, "");
}

function uniqueStrings(values: string[]): string[] {
  return Array.from(new Set(values.map((item) => item.trim()).filter(Boolean)));
}

function splitIntoLines(source: string): string[] {
  return source
    .split(/[\n;；]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function splitIntoSentences(source: string): string[] {
  return source
    .split(/[\n。！？!?；;]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseListFromText(content: string, fallback: string[]): string[] {
  const parsed = content
    .split(/[\n,，;；]/)
    .map((item) => item.replace(/^[-*]\s*/, "").trim())
    .filter(Boolean);
  return parsed.length > 0 ? parsed : fallback;
}

function normalizeNodeLabel(raw: unknown): string {
  if (typeof raw !== "string") {
    return "";
  }
  return raw.trim().replace(/^[-*]\s*/, "");
}

function inferFactionNodeType(label: string): FactionNodeType {
  const normalized = normalizeAliasKey(label);
  const alias = FACTION_TYPE_ALIASES[normalized];
  if (alias) {
    return alias;
  }
  if (/(company|group|enterprise|department|institution|agency|property management|school|hospital|government office|family alliance|community|social group|circle|social circle|military|army|troops|legion|brigade|regiment|headquarters|underground party|organization|association|society|alliance|gang|faction|club|cult)/.test(label)) {
    return "organization";
  }
  if (/(clan|ethnic group|ethnicity|descent)/.test(label)) {
    return "race";
  }
  if (/(power|camp|group|alliance|league)/.test(label)) {
    return "faction";
  }
  if (/(state|kingdom|empire|republic|federation|government)/i.test(label)) {
    return "state";
  }
  if (/(army|organization|guild|party|group)/i.test(label)) {
    return "organization";
  }
  if (/(race|tribe|clan)/i.test(label)) {
    return "race";
  }
  return "faction";
}

function normalizeNodeType(raw: unknown, label: string): FactionNodeType {
  if (typeof raw === "string") {
    const alias = FACTION_TYPE_ALIASES[normalizeAliasKey(raw)];
    if (alias) {
      return alias;
    }
    if (/(company|enterprise|department|institution|social group|social circle|family community|community organization|agency|government office|residential community|interest league|regional power)/.test(raw)) {
      return "organization";
    }
    if (/(temporary league|figure|character|emotion|relationship line)/.test(raw)) {
      return "other";
    }
  }
  return inferFactionNodeType(label);
}

function normalizeEdgeRelation(raw: unknown, sentence?: string): string {
  const value = typeof raw === "string" ? raw.trim() : "";
  if (value) {
    if (EDGE_RELATION_LABELS.includes(value as (typeof EDGE_RELATION_LABELS)[number])) {
      return value;
    }
    const normalized = normalizeAliasKey(value);
    if (/(alliance|ally|alliance|united|joining forces)/.test(normalized)) {
      return "alliance";
    }
    if (/(cooperate|cooperation|collaboration|coordination)/.test(normalized)) {
      return "cooperation";
    }
    if (/(support|aid|assistance)/.test(normalized)) {
      return "Support";
    }
    if (/(conflict|confrontation|hostility|warfare|encirclement|suppression)/.test(normalized)) {
      return "Confrontation";
    }
    if (/(trade|transaction|commerce)/.test(normalized)) {
      return "Trade";
    }
    if (/(subordinate|dominion|subordination|jurisdiction|control)/.test(normalized)) {
      return "Subordination";
    }
    if (/(rival|competition|contest)/.test(normalized)) {
      return "Competition";
    }
  }
  if (!sentence) {
    return "association";
  }
  if (/alliance|united|joining forces|forming an alliance/.test(sentence)) {
    return "alliance";
  }
  if (/cooperation|collaboration|coordination|joint resistance|jointly/.test(sentence)) {
    return "cooperation";
  }
  if (/support|aid|reinforcement|coordination/.test(sentence)) {
    return "Support";
  }
  if (/hostility|confrontation|conflict|encirclement|suppression|warfare|strikes|offensive|oppression/.test(sentence)) {
    return "Confrontation";
  }
  if (/subordination|dominion|control|jurisdiction|dependency/.test(sentence)) {
    return "Subordination";
  }
  if (/commerce|transaction|transport|trade relations/.test(sentence)) {
    return "Trade";
  }
  if (/competition|contest|power struggle/.test(sentence)) {
    return "Competition";
  }
  return "association";
}

function clampMapCoordinate(value: unknown): number | undefined {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return undefined;
  }
  return Math.max(0, Math.min(100, Math.round(value)));
}

function normalizeDirection(raw: unknown): WorldGeographyDirection | undefined {
  if (typeof raw !== "string") {
    return undefined;
  }
  const normalized = normalizeAliasKey(raw);
  const aliases: Record<string, WorldGeographyDirection> = {
    north: "north",
    south: "south",
    east: "east",
    west: "west",
    center: "center",
    central: "center",
    northeast: "northeast",
    northwest: "northwest",
    southeast: "southeast",
    southwest: "southwest",
  };
  const alias = aliases[normalized];
  return alias && GEO_DIRECTIONS.has(alias) ? alias : undefined;
}

function inferDirectionFromText(text: string, index: number): WorldGeographyDirection {
  if (/northwest|north west/.test(text)) {
    return "northwest";
  }
  if (/southeast|south east/.test(text)) {
    return "southeast";
  }
  if (/southwest|south west/.test(text)) {
    return "southwest";
  }
  if (/north|northern|northern reaches|north shore|northern front|ice plain|snowfield/.test(text)) {
    return "north";
  }
  if (/south|southern|southern reaches|south shore|southern front|rainforest|tropical/.test(text)) {
    return "south";
  }
  if (/east|eastern|eastern reaches|east shore|eastern front|seaport|port|coast/.test(text)) {
    return "east";
  }
  if (/west|western|western reaches|west shore|western front|wasteland|desert/.test(text)) {
    return "west";
  }
  if (/center|central|royal city|imperial capital|capital|core|heartland|inner city/.test(text)) {
    return "center";
  }
  const sequence: WorldGeographyDirection[] = [
    "center",
    "north",
    "east",
    "south",
    "west",
    "northeast",
    "southwest",
    "northwest",
    "southeast",
  ];
  return sequence[index % sequence.length] ?? "center";
}

function offsetCoordinate(base: { x: number; y: number }, index: number): { x: number; y: number } {
  const ringOffsets = [
    { x: 0, y: 0 },
    { x: 6, y: -5 },
    { x: -6, y: 5 },
    { x: 8, y: 6 },
    { x: -8, y: -6 },
  ];
  const offset = ringOffsets[index % ringOffsets.length] ?? ringOffsets[0];
  return {
    x: Math.max(8, Math.min(92, base.x + offset.x)),
    y: Math.max(8, Math.min(92, base.y + offset.y)),
  };
}

function inferRegionType(text: string): WorldGeographyRegionType {
  if (/continent|landmass|mainland/.test(text)) {
    return "continent";
  }
  if (/country|dynasty|kingdom|empire|federation|republic|territory/.test(text)) {
    return "country";
  }
  if (/city|capital|town|port|fortress|pass/.test(text)) {
    return "city";
  }
  if (/mountain|valley|river|lake|sea|island|forest|plain|desert|mine|tower|ruins|temple/.test(text)) {
    return "landmark";
  }
  if (/border|frontier|boundary|defense line|blockade line/.test(text)) {
    return "border";
  }
  if (/road|route|shipping lane|trade route|railway|waterway/.test(text)) {
    return "route";
  }
  return "region";
}

function normalizeRegionType(raw: unknown, label: string): WorldGeographyRegionType {
  if (typeof raw === "string") {
    const normalized = normalizeAliasKey(raw);
    if (GEO_REGION_TYPES.has(normalized as WorldGeographyRegionType)) {
      return normalized as WorldGeographyRegionType;
    }
  }
  return inferRegionType(label);
}

function normalizeRouteType(raw: unknown, relation: string): WorldGeographyRouteType {
  if (typeof raw === "string") {
    const normalized = normalizeAliasKey(raw);
    if (GEO_ROUTE_TYPES.has(normalized as WorldGeographyRouteType)) {
      return normalized as WorldGeographyRouteType;
    }
    if (/road|road|roadway/.test(normalized)) {
      return "road";
    }
    if (/river|river/.test(normalized)) {
      return "river";
    }
    if (/sea|sea|navigation/.test(normalized)) {
      return "sea";
    }
    if (/portal|teleport|gate/.test(normalized)) {
      return "portal";
    }
    if (/trade|merchant|commerce/.test(normalized)) {
      return "trade";
    }
    if (/military|army|war/.test(normalized)) {
      return "military";
    }
    if (/border|border/.test(normalized)) {
      return "border";
    }
  }
  if (/control|blockade|border|boundary/.test(relation)) {
    return "border";
  }
  if (/passage|road|trade route/.test(relation)) {
    return "road";
  }
  return "other";
}

function normalizeTextField(raw: unknown): string | undefined {
  return typeof raw === "string" && raw.trim() ? raw.trim() : undefined;
}

function makeId(prefix: string, index: number): string {
  return `${prefix}-${index + 1}`;
}

function normalizeGraphNodes(
  nodes: Array<{ id?: string; label?: string; type?: string }>,
  prefix: string,
): Array<{ id: string; label: string; type: string }> {
  const seenLabels = new Set<string>();
  const result: Array<{ id: string; label: string; type: string }> = [];
  for (const node of nodes) {
    const label = normalizeNodeLabel(node.label);
    if (!label || seenLabels.has(label)) {
      continue;
    }
    seenLabels.add(label);
    result.push({
      id: node.id?.trim() || makeId(prefix, result.length),
      label,
      type: normalizeNodeType(node.type, label),
    });
  }
  return result;
}

function normalizeGraphEdges(
  edges: Array<{ source?: string; target?: string; relation?: string }>,
  nodes: Array<{ id: string; label: string }>,
  fallbackEdges: Array<{ source: string; target: string; relation: string }>,
): Array<{ source: string; target: string; relation: string }> {
  const idMap = new Map(nodes.map((node) => [node.id, node.id]));
  const labelMap = new Map(nodes.map((node) => [node.label, node.id]));
  const seen = new Set<string>();
  const result: Array<{ source: string; target: string; relation: string }> = [];

  for (const edge of edges) {
    const sourceKey = typeof edge.source === "string" ? edge.source.trim() : "";
    const targetKey = typeof edge.target === "string" ? edge.target.trim() : "";
    const source = idMap.get(sourceKey) ?? labelMap.get(sourceKey);
    const target = idMap.get(targetKey) ?? labelMap.get(targetKey);
    if (!source || !target || source === target) {
      continue;
    }
    const pairKey = [source, target].sort().join("|");
    if (seen.has(pairKey)) {
      continue;
    }
    seen.add(pairKey);
    result.push({
      source,
      target,
      relation: normalizeEdgeRelation(edge.relation),
    });
  }

  if (result.length > 0) {
    return result.slice(0, MAX_FACTION_EDGES);
  }
  return fallbackEdges.slice(0, MAX_FACTION_EDGES);
}

function normalizeGeographyNodes(
  nodes: GeographyNodeInput[],
  fallbackNodes: WorldGeographyMapNode[],
): WorldGeographyMapNode[] {
  const seenLabels = new Set<string>();
  const result: WorldGeographyMapNode[] = [];
  for (const node of nodes) {
    const label = normalizeNodeLabel(node.label);
    if (!label || seenLabels.has(label)) {
      continue;
    }
    seenLabels.add(label);
    const directionHint = normalizeDirection(node.directionHint) ?? inferDirectionFromText(
      [label, node.terrain, node.summary, node.risk, node.storyRelevance].filter(Boolean).join(" "),
      result.length,
    );
    const basePoint = DIRECTION_COORDINATES[directionHint];
    const fallbackPoint = offsetCoordinate(basePoint, result.length);
    result.push({
      id: node.id?.trim() || makeId("geo", result.length),
      label,
      x: clampMapCoordinate(node.x) ?? fallbackPoint.x,
      y: clampMapCoordinate(node.y) ?? fallbackPoint.y,
      directionHint,
      regionType: normalizeRegionType(node.regionType, label),
      terrain: normalizeTextField(node.terrain),
      summary: normalizeTextField(node.summary),
      parentId: normalizeTextField(node.parentId) ?? null,
      controllingForceIds: Array.isArray(node.controllingForceIds)
        ? uniqueStrings(node.controllingForceIds.filter((item): item is string => typeof item === "string"))
        : undefined,
      risk: normalizeTextField(node.risk),
      storyRelevance: normalizeTextField(node.storyRelevance),
    });
  }
  return (result.length > 0 ? result : fallbackNodes).slice(0, MAX_GEO_NODES);
}

function normalizeGeographyEdges(
  edges: GeographyEdgeInput[],
  nodes: WorldGeographyMapNode[],
  fallbackEdges: WorldGeographyMapEdge[],
): WorldGeographyMapEdge[] {
  const idMap = new Map(nodes.map((node) => [node.id, node.id]));
  const labelMap = new Map(nodes.map((node) => [node.label, node.id]));
  const seen = new Set<string>();
  const result: WorldGeographyMapEdge[] = [];

  for (const edge of edges) {
    const sourceKey = typeof edge.source === "string" ? edge.source.trim() : "";
    const targetKey = typeof edge.target === "string" ? edge.target.trim() : "";
    const source = idMap.get(sourceKey) ?? labelMap.get(sourceKey);
    const target = idMap.get(targetKey) ?? labelMap.get(targetKey);
    if (!source || !target || source === target) {
      continue;
    }
    const pairKey = [source, target].sort().join("|");
    if (seen.has(pairKey)) {
      continue;
    }
    seen.add(pairKey);
    const relation = typeof edge.relation === "string" && edge.relation.trim()
      ? edge.relation.trim()
      : "Adjacent";
    result.push({
      source,
      target,
      relation,
      routeType: normalizeRouteType(edge.routeType, relation),
      distanceHint: normalizeTextField(edge.distanceHint),
      direction: normalizeDirection(edge.direction),
      risk: normalizeTextField(edge.risk),
    });
  }

  return (result.length > 0 ? result : fallbackEdges).slice(0, MAX_FACTION_EDGES);
}

function buildFactionLabels(world: VisualizationSource): string[] {
  const combined = [
    world.factions ?? "",
    world.politics ?? "",
    world.races ?? "",
    world.conflicts ?? "",
  ].filter(Boolean).join("\n");
  const fromLists = parseListFromText(combined, []);
  return uniqueStrings(fromLists).slice(0, MAX_FACTION_NODES);
}

function buildFactionEdges(
  nodes: Array<{ id: string; label: string; type: string }>,
  world: VisualizationSource,
): Array<{ source: string; target: string; relation: string }> {
  const sentences = splitIntoSentences([
    world.politics ?? "",
    world.factions ?? "",
    world.conflicts ?? "",
    world.background ?? "",
  ].filter(Boolean).join("。"));
  const relationCounter = new Map<string, Map<string, number>>();

  for (const sentence of sentences) {
    const mentioned = nodes.filter((node) => sentence.includes(node.label));
    if (mentioned.length < 2) {
      continue;
    }
    const relation = normalizeEdgeRelation("", sentence);
    for (let i = 0; i < mentioned.length; i += 1) {
      for (let j = i + 1; j < mentioned.length; j += 1) {
        const left = mentioned[i];
        const right = mentioned[j];
        const key = [left.id, right.id].sort().join("|");
        const bucket = relationCounter.get(key) ?? new Map<string, number>();
        bucket.set(relation, (bucket.get(relation) ?? 0) + 1);
        relationCounter.set(key, bucket);
      }
    }
  }

  const edges = Array.from(relationCounter.entries())
    .map(([key, bucket]) => {
      const [source, target] = key.split("|");
      const relation = Array.from(bucket.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "association";
      return { source, target, relation };
    })
    .slice(0, MAX_FACTION_EDGES);

  if (edges.length > 0) {
    return edges;
  }
  if (nodes.length <= 1) {
    return [];
  }
  const defaultRelation = world.conflicts?.trim() ? "Confrontation" : "association";
  return nodes.slice(1).map((node) => ({
    source: nodes[0].id,
    target: node.id,
    relation: defaultRelation,
  }));
}

function buildGeographyMap(world: VisualizationSource): WorldVisualizationPayload["geographyMap"] {
  const geoSeeds = parseListFromText(
    [world.geography ?? "", world.background ?? ""].filter(Boolean).join("\n"),
    ["Core region", "Border region", "Unknown region"],
  )
    .slice(0, MAX_GEO_NODES)
    .map((label, index) => {
      const directionHint = inferDirectionFromText(label, index);
      const point = offsetCoordinate(DIRECTION_COORDINATES[directionHint], index);
      return {
        id: makeId("geo", index),
        label,
        x: point.x,
        y: point.y,
        directionHint,
        regionType: inferRegionType(label),
      };
    });

  const edges = geoSeeds.slice(1).map((node, index) => ({
    source: geoSeeds[index]?.id ?? geoSeeds[0].id,
    target: node.id,
    relation: "Adjacent",
    routeType: "other" as const,
    direction: node.directionHint,
  }));

  return {
    nodes: geoSeeds,
    edges,
  };
}

function buildPowerTree(world: VisualizationSource): WorldVisualizationPayload["powerTree"] {
  return parseListFromText(world.magicSystem ?? world.technology ?? "", ["Power hierarchy not yet defined"])
    .slice(0, MAX_POWER_ITEMS)
    .map((description, index) => ({
      level: `L${index + 1}`,
      description,
    }));
}

function buildStructuredWorldVisualizationPayload(world: VisualizationSource): WorldVisualizationPayload | null {
  const { structure, hasStructuredData } = parseWorldStructurePayload(world.structureJson, world.bindingSupportJson);
  if (!hasStructuredData) {
    return null;
  }

  const forceNodes = structure.forces.map((item) => ({
    id: item.id,
    label: item.name,
    type: normalizeNodeType(item.type, item.name),
  }));
  const factionNodes = structure.factions
    .filter((item) => !forceNodes.some((force) => force.label === item.name))
    .map((item) => ({
      id: item.id,
      label: item.name,
      type: "faction",
    }));
  const factionNodesMerged = [...forceNodes, ...factionNodes].slice(0, MAX_FACTION_NODES);
  const factionNodeIds = new Set(factionNodesMerged.map((item) => item.id));
  const factionEdges = structure.relations.forceRelations
    .filter((item) => factionNodeIds.has(item.sourceForceId) && factionNodeIds.has(item.targetForceId))
    .map((item) => ({
      source: item.sourceForceId,
      target: item.targetForceId,
      relation: item.relation || "association",
    }))
    .slice(0, MAX_FACTION_EDGES);

  const geographyNodes = structure.locations
    .map((item, index) => {
      const directionHint = inferDirectionFromText(
        [item.name, item.terrain, item.summary, item.narrativeFunction, item.risk].join(" "),
        index,
      );
      const point = offsetCoordinate(DIRECTION_COORDINATES[directionHint], index);
      return {
        id: item.id,
        label: item.name,
        x: item.x ?? point.x,
        y: item.y ?? point.y,
        directionHint: item.directionHint ?? directionHint,
        regionType: inferRegionType([item.name, item.type, item.terrain].filter(Boolean).join(" ")),
        terrain: item.terrain || undefined,
        summary: item.summary || undefined,
        controllingForceIds: item.controllingForceIds,
        risk: item.risk || (item.riskLevel ? `Risk level ${item.riskLevel}` : undefined),
        storyRelevance: item.storyRelevance || item.narrativeFunction || undefined,
      };
    })
    .slice(0, MAX_GEO_NODES);
  const geographyNodeIdSet = new Set(geographyNodes.map((item) => item.id));
  const forceNameById = new Map(structure.forces.map((item) => [item.id, item.name]));
  const explicitLocationEdges = (structure.relations.locationConnections ?? [])
    .filter((item) => geographyNodeIdSet.has(item.sourceLocationId) && geographyNodeIdSet.has(item.targetLocationId))
    .map((item) => ({
      source: item.sourceLocationId,
      target: item.targetLocationId,
      relation: item.connectionType || "Adjacent",
      routeType: normalizeRouteType(item.connectionType, item.connectionType),
      distanceHint: item.distanceHint || undefined,
      risk: item.narrativeUse || undefined,
    }));
  const geographyEdges = explicitLocationEdges.length > 0 ? explicitLocationEdges : structure.relations.locationControls
    .filter((item) => geographyNodeIdSet.has(item.locationId))
    .reduce<WorldGeographyMapEdge[]>((acc, relation, index, list) => {
      const sibling = list.find(
        (candidate, siblingIndex) =>
          siblingIndex > index
          && candidate.forceId === relation.forceId
          && candidate.locationId !== relation.locationId
          && geographyNodeIdSet.has(candidate.locationId),
      );
      if (!sibling) {
        return acc;
      }
      acc.push({
        source: relation.locationId,
        target: sibling.locationId,
        relation: `${forceNameById.get(relation.forceId) ?? relation.forceId}${relation.relation ? `:${relation.relation}` : "control"}`,
        routeType: "border",
      });
      return acc;
    }, [])
    .slice(0, MAX_FACTION_EDGES);

  const powerTree = (
    structure.rules.axioms.length > 0
      ? structure.rules.axioms.map((item, index) => ({
        level: `R${index + 1}`,
        description: [item.name, item.summary].filter(Boolean).join("："),
      }))
      : buildPowerTree(world)
  ).slice(0, MAX_POWER_ITEMS);

  const bindingSupport = buildWorldBindingSupport(structure);
  const timeline = bindingSupport.compatibleConflicts.length > 0
    ? bindingSupport.compatibleConflicts.slice(0, MAX_TIMELINE_ITEMS).map((item, index) => ({
      year: `Stage ${index + 1}`,
      event: item,
    }))
    : buildTimeline(world);

  if (factionNodesMerged.length === 0 && geographyNodes.length === 0) {
    return null;
  }

  const fallback = buildFallbackWorldVisualizationPayload(world);
  const shouldUseFallbackFactions = factionNodesMerged.length === 0;
  const shouldUseFallbackGeography = geographyNodes.length === 0;

  return {
    worldId: world.id,
    factionGraph: {
      nodes: shouldUseFallbackFactions ? fallback.factionGraph.nodes : factionNodesMerged,
      edges: shouldUseFallbackFactions ? fallback.factionGraph.edges : factionEdges,
    },
    powerTree,
    geographyMap: {
      nodes: shouldUseFallbackGeography ? fallback.geographyMap.nodes : geographyNodes,
      edges: shouldUseFallbackGeography ? fallback.geographyMap.edges : geographyEdges,
    },
    timeline,
  };
}

function buildTimeline(world: VisualizationSource): WorldVisualizationPayload["timeline"] {
  return parseListFromText(world.history ?? "", ["Current historical context not yet defined"])
    .slice(0, MAX_TIMELINE_ITEMS)
    .map((event, index) => {
      const yearMatch = event.match(/\d{2,4}(?:year)?|Minguo\d+year|Showa\d+year|stage\s*\d+/i);
      return {
        year: yearMatch?.[0] ?? `Stage ${index + 1}`,
        event,
      };
    });
}

export function buildFallbackWorldVisualizationPayload(world: VisualizationSource): WorldVisualizationPayload {
  const factionLabels = buildFactionLabels(world);
  const factionNodes = factionLabels.map((label, index) => ({
    id: makeId("faction", index),
    label,
    type: inferFactionNodeType(label),
  }));
  const factionEdges = buildFactionEdges(factionNodes, world);

  return {
    worldId: world.id,
    factionGraph: {
      nodes: factionNodes,
      edges: factionEdges,
    },
    powerTree: buildPowerTree(world),
    geographyMap: buildGeographyMap(world),
    timeline: buildTimeline(world),
  };
}

function buildVisualizationPrompt(world: VisualizationSource): string {
  return [
    `World name:${world.name}`,
    `World type:${world.worldType ?? "custom"}`,
    `Overview: ${world.description ?? "none"}`,
    `Background: ${world.background ?? "none"}`,
    `Factions: ${world.factions ?? "none"}`,
    `Politics: ${world.politics ?? "none"}`,
    `Races: ${world.races ?? "none"}`,
    `Geography: ${world.geography ?? "none"}`,
    `History: ${world.history ?? "none"}`,
    `Conflict: ${world.conflicts ?? "none"}`,
    `Power/Technology:${[world.magicSystem, world.technology].filter(Boolean).join("\n") || "none"}`,
  ].join("\n\n");
}

async function tryBuildWorldVisualizationWithLLM(
  world: VisualizationSource,
): Promise<VisualizationDraft | null> {
  try {
    const result = await runStructuredPrompt({
      asset: worldVisualizationPrompt,
      promptInput: {
        worldPromptSource: buildVisualizationPrompt(world),
      },
      options: {
        temperature: 0.2,
      },
    });
    return result.output;
  } catch {
    return null;
  }
}

function sanitizeVisualizationPayload(
  world: VisualizationSource,
  draft: VisualizationDraft | null,
  fallback: WorldVisualizationPayload,
): WorldVisualizationPayload {
  const factionNodes = normalizeGraphNodes(draft?.factionGraph?.nodes ?? fallback.factionGraph.nodes, "faction")
    .slice(0, MAX_FACTION_NODES);
  const factionEdges = normalizeGraphEdges(
    draft?.factionGraph?.edges ?? [],
    factionNodes,
    fallback.factionGraph.edges,
  );

  const geographyNodes = normalizeGeographyNodes(
    draft?.geographyMap?.nodes ?? fallback.geographyMap.nodes,
    fallback.geographyMap.nodes,
  );
  const geographyEdges = normalizeGeographyEdges(
    draft?.geographyMap?.edges ?? [],
    geographyNodes,
    fallback.geographyMap.edges,
  );

  const powerTree = (draft?.powerTree ?? fallback.powerTree)
    .map((item, index) => ({
      level: typeof item.level === "string" && item.level.trim() ? item.level.trim() : `L${index + 1}`,
      description: typeof item.description === "string" ? item.description.trim() : "",
    }))
    .filter((item) => item.description)
    .slice(0, MAX_POWER_ITEMS);

  const timeline = (draft?.timeline ?? fallback.timeline)
    .map((item, index) => ({
      year: typeof item.year === "string" && item.year.trim() ? item.year.trim() : `Stage ${index + 1}`,
      event: typeof item.event === "string" ? item.event.trim() : "",
    }))
    .filter((item) => item.event)
    .slice(0, MAX_TIMELINE_ITEMS);

  return {
    worldId: world.id,
    factionGraph: {
      nodes: factionNodes.length > 0 ? factionNodes : fallback.factionGraph.nodes,
      edges: factionEdges,
    },
    powerTree: powerTree.length > 0 ? powerTree : fallback.powerTree,
    geographyMap: {
      nodes: geographyNodes.length > 0 ? geographyNodes : fallback.geographyMap.nodes,
      edges: geographyEdges,
    },
    timeline: timeline.length > 0 ? timeline : fallback.timeline,
  };
}

export async function buildWorldVisualizationPayload(world: VisualizationSource): Promise<WorldVisualizationPayload> {
  const structured = buildStructuredWorldVisualizationPayload(world);
  if (structured) {
    return structured;
  }
  const fallback = buildFallbackWorldVisualizationPayload(world);
  const draft = await tryBuildWorldVisualizationWithLLM(world);
  return sanitizeVisualizationPayload(world, draft, fallback);
}

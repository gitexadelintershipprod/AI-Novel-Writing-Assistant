import type { LLMProvider } from "@ai-novel/shared/types/llm";
import type {
  WorldLayerKey,
  WorldStructuredData,
  WorldStructureSectionKey,
} from "@ai-novel/shared/types/world";
import type {
  WorldOptionRefinementLevel,
  WorldReferenceMode,
} from "@ai-novel/shared/types/worldWizard";
import { WORLD_LAYER_ORDER } from "./worldTemplates";
import { normalizeWorldStructuredData } from "./worldStructure";

export const LAYER_STATUSES = ["pending", "generated", "confirmed", "stale"] as const;
export type LayerStatus = (typeof LAYER_STATUSES)[number];
export type RefineMode = "replace" | "alternatives";

export const WORLD_TEXT_FIELDS = [
  "description",
  "background",
  "geography",
  "cultures",
  "magicSystem",
  "politics",
  "races",
  "religions",
  "technology",
  "conflicts",
  "history",
  "economy",
  "factions",
] as const;
export type WorldTextField = (typeof WORLD_TEXT_FIELDS)[number];

const WORLD_TEXT_FIELD_SET = new Set<WorldTextField>(WORLD_TEXT_FIELDS);

const DEEPENING_LAYER_PRIMARY_FIELD: Record<WorldLayerKey, WorldTextField> = {
  foundation: "background",
  power: "magicSystem",
  society: "politics",
  culture: "cultures",
  history: "history",
  conflict: "conflicts",
};

const DEEPENING_TARGET_LAYER_ALIASES: Record<string, WorldLayerKey> = {
  foundation: "foundation",
  power: "power",
  society: "society",
  culture: "culture",
  history: "history",
  conflict: "conflict",
};

const DEEPENING_TARGET_FIELD_ALIASES: Record<string, WorldTextField> = {
  description: "description",
  summary: "description",
  overview: "description",
  background: "background",
  geography: "geography",
  location: "geography",
  cultures: "cultures",
  culture: "cultures",
  magicsystem: "magicSystem",
  powersystem: "magicSystem",
  power: "magicSystem",
  politics: "politics",
  races: "races",
  race: "races",
  religions: "religions",
  religion: "religions",
  technology: "technology",
  tech: "technology",
  conflicts: "conflicts",
  conflict: "conflicts",
  history: "history",
  economy: "economy",
  factions: "factions",
  faction: "factions",
  organization: "factions",
  organizations: "factions",
};

export type LayerStateMap = Record<
  WorldLayerKey,
  {
    key: WorldLayerKey;
    status: LayerStatus;
    updatedAt: string;
  }
>;

export interface CreateWorldInput {
  name: string;
  description?: string;
  worldType?: string;
  templateKey?: string;
  axioms?: string;
  background?: string;
  geography?: string;
  cultures?: string;
  magicSystem?: string;
  politics?: string;
  races?: string;
  religions?: string;
  technology?: string;
  conflicts?: string;
  history?: string;
  economy?: string;
  factions?: string;
  selectedDimensions?: string;
  selectedElements?: string;
  knowledgeDocumentIds?: string[];
  structure?: unknown;
  bindingSupport?: unknown;
}

export interface WorldGenerateInput {
  name: string;
  description: string;
  worldType: string;
  complexity: "simple" | "standard" | "detailed";
  dimensions: {
    geography: boolean;
    culture: boolean;
    magicSystem: boolean;
    technology: boolean;
    history: boolean;
  };
  provider?: LLMProvider;
  model?: string;
}

export interface RefineWorldInput {
  attribute: WorldTextField;
  currentValue: string;
  refinementLevel: "light" | "deep";
  mode?: RefineMode;
  alternativesCount?: number;
  provider?: LLMProvider;
  model?: string;
}

export interface InspirationInput {
  input?: string;
  mode?: "free" | "reference" | "random";
  worldType?: string;
  knowledgeDocumentIds?: string[];
  referenceMode?: WorldReferenceMode;
  preserveElements?: string[];
  allowedChanges?: string[];
  forbiddenElements?: string[];
  refinementLevel?: WorldOptionRefinementLevel;
  optionsCount?: number;
  provider?: LLMProvider;
  model?: string;
}

export interface LayerGenerateInput {
  provider?: LLMProvider;
  model?: string;
  temperature?: number;
}

export interface LayerUpdateInput {
  content: string;
}

export interface DeepeningAnswerInput {
  questionId: string;
  answer: string;
}

export interface ImportWorldInput {
  format: "json" | "markdown" | "text";
  content: string;
  name?: string;
  provider?: LLMProvider;
  model?: string;
}

export interface LibraryUseInput {
  worldId?: string;
  targetField?: WorldTextField;
  targetCollection?: "forces" | "locations";
}

export interface StructureBackfillInput {
  provider?: LLMProvider;
  model?: string;
}

export interface StructureGenerateInput extends StructureBackfillInput {
  section: WorldStructureSectionKey;
  structure?: unknown;
  bindingSupport?: unknown;
}

export interface StructureUpdateInput {
  structure: unknown;
  bindingSupport?: unknown;
}

export function cleanJsonText(source: string): string {
  return source.replace(/```json|```/gi, "").trim();
}

export function extractJSONObject(source: string): string {
  const text = cleanJsonText(source);
  const first = text.indexOf("{");
  const last = text.lastIndexOf("}");
  if (first === -1 || last === -1 || first >= last) {
    throw new Error("Invalid JSON object.");
  }
  return text.slice(first, last + 1);
}

export function extractJSONArray(source: string): string {
  const text = cleanJsonText(source);
  const first = text.indexOf("[");
  const last = text.lastIndexOf("]");
  if (first === -1 || last === -1 || first >= last) {
    throw new Error("Invalid JSON array.");
  }
  return text.slice(first, last + 1);
}

export function safeParseJSON<T>(raw: string | null | undefined, fallback: T): T {
  if (!raw) {
    return fallback;
  }
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function nowISO(): string {
  return new Date().toISOString();
}

export function uniqueKnowledgeDocumentIds(ids: string[] | undefined): string[] {
  if (!ids || ids.length === 0) {
    return [];
  }
  return Array.from(new Set(ids.map((item) => item.trim()).filter(Boolean)));
}

export function normalizeLayerStates(raw: string | null | undefined): LayerStateMap {
  const fallback = WORLD_LAYER_ORDER.reduce((acc, key) => {
    acc[key] = { key, status: "pending", updatedAt: nowISO() };
    return acc;
  }, {} as LayerStateMap);
  const parsed = safeParseJSON<Partial<LayerStateMap>>(raw, {});

  for (const key of WORLD_LAYER_ORDER) {
    const existing = parsed[key];
    fallback[key] = {
      key,
      status: LAYER_STATUSES.includes(existing?.status as LayerStatus)
        ? (existing?.status as LayerStatus)
        : "pending",
      updatedAt: existing?.updatedAt ?? fallback[key].updatedAt,
    };
  }
  return fallback;
}

export function markDownstreamStale(states: LayerStateMap, fromLayer: WorldLayerKey): LayerStateMap {
  const index = WORLD_LAYER_ORDER.indexOf(fromLayer);
  if (index < 0) {
    return states;
  }
  for (let i = index + 1; i < WORLD_LAYER_ORDER.length; i += 1) {
    const key = WORLD_LAYER_ORDER[i];
    if (states[key].status === "generated" || states[key].status === "confirmed") {
      states[key] = { ...states[key], status: "stale", updatedAt: nowISO() };
    }
  }
  return states;
}

export function buildFieldDiff(
  older: Partial<Record<WorldTextField, string | null>>,
  newer: Partial<Record<WorldTextField, string | null>>,
): Array<{ field: WorldTextField; before: string | null; after: string | null }> {
  const changes: Array<{ field: WorldTextField; before: string | null; after: string | null }> = [];
  for (const field of WORLD_TEXT_FIELDS) {
    const before = older[field] ?? null;
    const after = newer[field] ?? null;
    if ((before ?? "") !== (after ?? "")) {
      changes.push({ field, before, after });
    }
  }
  return changes;
}

export function buildWorldStructurePromptSource(world: {
  name: string;
  worldType?: string | null;
  description?: string | null;
  axioms?: string | null;
  background?: string | null;
  geography?: string | null;
  cultures?: string | null;
  magicSystem?: string | null;
  politics?: string | null;
  races?: string | null;
  religions?: string | null;
  technology?: string | null;
  conflicts?: string | null;
  history?: string | null;
  economy?: string | null;
  factions?: string | null;
}): string {
  return [
    `World name:${world.name}`,
    `World type:${world.worldType ?? "custom"}`,
    `World summary: ${world.description ?? "none"}`,
    `Rules/Axioms:${world.axioms ?? "none"}`,
    `Background: ${world.background ?? "none"}`,
    `Geography: ${world.geography ?? "none"}`,
    `Culture: ${world.cultures ?? "none"}`,
    `Power system:${world.magicSystem ?? "none"}`,
    `Politics: ${world.politics ?? "none"}`,
    `Races: ${world.races ?? "none"}`,
    `Religion: ${world.religions ?? "none"}`,
    `Technology: ${world.technology ?? "none"}`,
    `Conflict: ${world.conflicts ?? "none"}`,
    `History: ${world.history ?? "none"}`,
    `Economy: ${world.economy ?? "none"}`,
    `Factions: ${world.factions ?? "none"}`,
  ].join("\n\n");
}

export function buildStructureSectionInstructions(section: WorldStructureSectionKey): string {
  switch (section) {
    case "profile":
      return `Output only a JSON object with the following structure:
{
  "summary": "...",
  "identity": "...",
  "tone": "...",
  "themes": ["..."],
  "coreConflict": "..."
}`;
    case "rules":
      return `Output only a JSON object with the following structure:
{
  "summary": "...",
  "axioms": [{"id":"rule-1","name":"...","summary":"...","cost":"...","boundary":"...","enforcement":"..."}],
  "taboo": ["..."],
  "sharedConsequences": ["..."]
}`;
    case "factions":
      return `Output only a JSON object with the following structure:
{
  "factions": [{"id":"faction-1","name":"...","position":"...","doctrine":"...","goals":["..."],"methods":["..."],"representativeForceIds":["force-1"]}],
  "forces": [{"id":"force-1","name":"...","type":"...","factionId":"faction-1","summary":"...","baseOfPower":"...","currentObjective":"...","pressure":"...","leader":"...","narrativeRole":"..."}]
}
Additional constraints:
1. A faction is an abstract camp, stance, route, or world-side alignment, not an industry rule, social-pressure mechanism, or interpersonal law.
2. A force is a concrete organization, circle, department, company, network, or institution, and must be an actor that can apply pressure, join conflicts, and form relationships with locations.
3. Put world-level mechanisms such as social sources of stress, industry operating rules, and default interpersonal laws into rules, not into factions or forces.`;
    case "locations":
      return `Output only a JSON array whose elements have the following structure:
[{"id":"location-1","name":"...","terrain":"...","summary":"...","narrativeFunction":"...","risk":"...","entryConstraint":"...","exitCost":"...","controllingForceIds":["force-1"]}]`;
    case "relations":
      return `Output only a JSON object with the following structure:
{
  "forceRelations": [{"id":"force-relation-1","sourceForceId":"force-1","targetForceId":"force-2","relation":"...","tension":"...","detail":"..."}],
  "locationControls": [{"id":"location-control-1","forceId":"force-1","locationId":"location-1","relation":"...","detail":"..."}]
}`;
    default:
      return "Output only valid JSON.";
  }
}

export function mergeWorldStructureSection(
  current: WorldStructuredData,
  section: WorldStructureSectionKey,
  raw: unknown,
): WorldStructuredData {
  switch (section) {
    case "profile":
      return normalizeWorldStructuredData({
        ...current,
        profile: raw,
      }, current);
    case "rules":
      return normalizeWorldStructuredData({
        ...current,
        rules: raw,
      }, current);
    case "factions": {
      const record = raw && typeof raw === "object" && !Array.isArray(raw)
        ? (raw as Record<string, unknown>)
        : {};
      return normalizeWorldStructuredData({
        ...current,
        factions: record.factions ?? current.factions,
        forces: record.forces ?? current.forces,
      }, current);
    }
    case "locations":
      return normalizeWorldStructuredData({
        ...current,
        locations: raw,
      }, current);
    case "relations":
      return normalizeWorldStructuredData({
        ...current,
        relations: raw,
      }, current);
    default:
      return current;
  }
}

export function normalizeAxiomList(raw: unknown): string[] {
  if (!Array.isArray(raw)) {
    return [];
  }
  const normalized = raw
    .map((item) => {
      if (typeof item === "string") {
        return item.trim();
      }
      if (item && typeof item === "object") {
        const record = item as Record<string, unknown>;
        const candidate = record.text ?? record.content ?? record.axiom ?? record.rule ?? record.value;
        if (typeof candidate === "string") {
          return candidate.trim();
        }
      }
      return "";
    })
    .filter(Boolean);
  return Array.from(new Set(normalized)).slice(0, 5);
}

export function normalizeQuickOptionList(raw: unknown): string[] {
  if (!Array.isArray(raw)) {
    return [];
  }
  const normalized = raw
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter(Boolean);
  return Array.from(new Set(normalized)).slice(0, 4);
}

function normalizeAliasKey(raw: string): string {
  return raw.trim().toLowerCase().replace(/[\s_\-:/\\|（）()【】\[\]·、，,。.!?？：:]/g, "");
}

export function normalizeDeepeningTargetLayer(raw: unknown): WorldLayerKey | null {
  if (typeof raw !== "string") {
    return null;
  }
  const normalized = normalizeAliasKey(raw);
  return DEEPENING_TARGET_LAYER_ALIASES[normalized] ?? null;
}

export function normalizeDeepeningTargetField(
  raw: unknown,
  targetLayer?: WorldLayerKey | null,
  questionText?: string | null,
): WorldTextField | null {
  if (typeof raw === "string") {
    const trimmed = raw.trim();
    if (WORLD_TEXT_FIELD_SET.has(trimmed as WorldTextField)) {
      return trimmed as WorldTextField;
    }
    const alias = DEEPENING_TARGET_FIELD_ALIASES[normalizeAliasKey(trimmed)];
    if (alias) {
      return alias;
    }
  }

  const question = questionText?.trim() ?? "";
  if (question) {
    const questionField = DEEPENING_TARGET_FIELD_ALIASES[normalizeAliasKey(question)];
    if (questionField) {
      return questionField;
    }
  }

  if (targetLayer) {
    return DEEPENING_LAYER_PRIMARY_FIELD[targetLayer];
  }
  return null;
}

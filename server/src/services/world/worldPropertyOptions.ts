import type { LLMProvider } from "@ai-novel/shared/types/llm";
import type { WorldLayerKey } from "@ai-novel/shared/types/world";
import type {
  WorldPropertyChoice,
  WorldOptionRefinementLevel,
  WorldPropertyOption,
  WorldReferenceAnchor,
  WorldReferenceMode,
} from "@ai-novel/shared/types/worldWizard";
import { runStructuredPrompt } from "../../prompting/core/promptRunner";
import { worldPropertyOptionsPrompt } from "../../prompting/prompts/world/world.prompts";

interface GenerateWorldPropertyOptionsInput {
  provider?: LLMProvider;
  model?: string;
  worldType: string;
  templateName: string;
  templateDescription: string;
  classicElements: string[];
  pitfalls: string[];
  conceptSummary: string;
  coreImagery: string[];
  keywords: string[];
  tone: string;
  sourcePrompt: string;
  ragContext?: string;
  referenceMode?: WorldReferenceMode | null;
  referenceAnchors?: WorldReferenceAnchor[];
  preserveElements?: string[];
  allowedChanges?: string[];
  forbiddenElements?: string[];
  refinementLevel?: WorldOptionRefinementLevel;
  optionsCount?: number;
}

const LAYER_ALIASES: Record<string, WorldLayerKey> = {
  foundation: "foundation",
  "基础": "foundation",
  "基础层": "foundation",
  "世界基础": "foundation",
  power: "power",
  "力量": "power",
  "力量层": "power",
  "力量体系": "power",
  "能力体系": "power",
  society: "society",
  "社会": "society",
  "社会层": "society",
  "势力": "society",
  "政治": "society",
  culture: "culture",
  "文化": "culture",
  "文化层": "culture",
  "风俗": "culture",
  history: "history",
  "历史": "history",
  "历史层": "history",
  conflict: "conflict",
  "冲突": "conflict",
  "冲突层": "conflict",
};

function normalizeLayer(raw: unknown): WorldLayerKey | null {
  if (typeof raw !== "string") {
    return null;
  }
  const normalized = raw.trim().toLowerCase();
  return LAYER_ALIASES[normalized] ?? null;
}

function slugifyWorldOptionId(name: string, targetLayer: WorldLayerKey, index: number): string {
  const slug = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 36);
  return slug ? `${targetLayer}-${slug}` : `${targetLayer}-option-${index + 1}`;
}

function resolveDefaultCount(refinementLevel: WorldOptionRefinementLevel): number {
  switch (refinementLevel) {
    case "basic":
      return 5;
    case "detailed":
      return 8;
    default:
      return 6;
  }
}

function clampOptionsCount(value: number): number {
  return Math.max(4, Math.min(8, Math.floor(value)));
}

function normalizeChoices(raw: unknown, optionName: string, targetLayer: WorldLayerKey): WorldPropertyChoice[] {
  if (!Array.isArray(raw)) {
    return [];
  }

  const items = raw
    .map<WorldPropertyChoice | null>((item, index) => {
      if (!item || typeof item !== "object") {
        return null;
      }
      const record = item as Record<string, unknown>;
      const label = typeof record.label === "string" ? record.label.trim() : "";
      const summary = typeof record.summary === "string" ? record.summary.trim() : "";
      const id = typeof record.id === "string" && record.id.trim()
        ? record.id.trim()
        : slugifyWorldOptionId(`${optionName}-${label || index + 1}`, targetLayer, index);
      if (!label || !summary) {
        return null;
      }
      return { id, label, summary };
    })
    .filter((item): item is WorldPropertyChoice => Boolean(item));

  return Array.from(new Map(items.map((item) => [item.id, item])).values()).slice(0, 4);
}

function normalizeOptions(raw: unknown, limit: number): WorldPropertyOption[] {
  if (!Array.isArray(raw)) {
    return [];
  }

  const items = raw
    .map<WorldPropertyOption | null>((item, index) => {
      if (!item || typeof item !== "object") {
        return null;
      }

      const record = item as Record<string, unknown>;
      const name = typeof record.name === "string" ? record.name.trim() : "";
      const description = typeof record.description === "string" ? record.description.trim() : "";
      const targetLayer = normalizeLayer(record.targetLayer);
      const reason = typeof record.reason === "string" ? record.reason.trim() : "";
      const choices = targetLayer ? normalizeChoices(record.choices, name, targetLayer) : [];

      if (!name || !description || !targetLayer) {
        return null;
      }

      return {
        id: typeof record.id === "string" && record.id.trim()
          ? record.id.trim()
          : slugifyWorldOptionId(name, targetLayer, index),
        name,
        description,
        targetLayer,
        reason: reason || null,
        choices,
        source: "ai" as const,
        libraryItemId: null,
      };
    })
    .filter((item): item is WorldPropertyOption => Boolean(item));

  return Array.from(new Map(items.map((item) => [item.id, item])).values()).slice(0, limit);
}

function buildPrompt(input: GenerateWorldPropertyOptionsInput, optionsCount: number): string {
  return [
    `World type: ${input.worldType}`,
    `Template: ${input.templateName}`,
    `Template description: ${input.templateDescription}`,
    input.classicElements.length > 0 ? `Classic elements to consider: ${input.classicElements.join(", ")}` : "",
    input.pitfalls.length > 0 ? `Common pitfalls to avoid: ${input.pitfalls.join(", ")}` : "",
    `World concept summary: ${input.conceptSummary}`,
    input.coreImagery.length > 0 ? `Core imagery: ${input.coreImagery.join(", ")}` : "",
    input.keywords.length > 0 ? `Keywords: ${input.keywords.join(", ")}` : "",
    input.tone.trim() ? `Overall tone: ${input.tone.trim()}` : "",
    input.sourcePrompt.trim() ? `User original inspiration: ${input.sourcePrompt.trim()}` : "",
    input.ragContext?.trim() ? `Reference material: ${input.ragContext.trim()}` : "",
    `Generate ${optionsCount} key world-property options that should be decided before formal world generation.`,
    "Keep the older V2 generator pattern of choosing properties first, then filling in details.",
    "Requirements:",
    "1. Each property must be a concrete, choosable decision that changes later world-building.",
    "2. Properties should stay independent, but combine into a coherent world.",
    "3. Cover the important forks, not broad items such as world name or a generic synopsis.",
    "4. Descriptions must make it obvious what the user is deciding.",
    "5. Spread options across foundation, power, society, culture, history, and conflict layers instead of crowding one layer.",
    "6. Classic web-novel world logic is allowed, but keep the options distinctive instead of cliché.",
  ]
    .filter(Boolean)
    .join("\n");
}

export async function generateWorldPropertyOptions(
  input: GenerateWorldPropertyOptionsInput,
): Promise<WorldPropertyOption[]> {
  const refinementLevel = input.refinementLevel ?? "standard";
  const optionsCount = clampOptionsCount(input.optionsCount ?? resolveDefaultCount(refinementLevel));

  for (const retryStrict of [false, true]) {
    const result = await runStructuredPrompt({
      asset: worldPropertyOptionsPrompt,
      promptInput: {
        retryStrict,
        referenceMode: input.referenceMode,
        optionsCount,
        worldType: input.worldType,
        templateName: input.templateName,
        templateDescription: input.templateDescription,
        classicElements: input.classicElements,
        pitfalls: input.pitfalls,
        conceptSummary: input.conceptSummary,
        coreImagery: input.coreImagery,
        keywords: input.keywords,
        tone: input.tone,
        sourcePrompt: input.sourcePrompt,
        ragContext: input.ragContext,
        referenceAnchors: input.referenceAnchors,
        preserveElements: input.preserveElements,
        allowedChanges: input.allowedChanges,
        forbiddenElements: input.forbiddenElements,
      },
      options: {
        provider: input.provider ?? "deepseek",
        model: input.model,
        temperature: retryStrict ? 0.25 : 0.4,
      },
    });
    const options = normalizeOptions((result.output as { options?: unknown[] }).options ?? [], optionsCount);
    if (options.length >= Math.min(4, optionsCount)) {
      return options;
    }
  }

  throw new Error("World-property option generation failed; the model did not return enough valid structure.");
}

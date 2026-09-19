import type { LLMProvider } from "@ai-novel/shared/types/llm";
import {
  createEmptyWorldReferenceSeedBundle,
  type WorldOptionRefinementLevel,
  type WorldReferenceMode,
} from "@ai-novel/shared/types/worldWizard";
import { runStructuredPrompt } from "../../prompting/core/promptRunner";
import {
  worldInspirationConceptCardLocalizationPrompt,
  worldInspirationConceptCardPrompt,
} from "../../prompting/prompts/world/world.prompts";
import { getTemplateByKey, WORLD_TEMPLATES } from "./worldTemplates";
import { generateWorldPropertyOptions } from "./worldPropertyOptions";
import { generateReferenceInspirationAnalysis } from "./worldReferenceInspiration";
import { listActiveKnowledgeDocumentContents } from "../knowledge/common";

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

interface InspirationConceptCard {
  worldType: string;
  templateKey: string;
  coreImagery: string[];
  tone: string;
  keywords: string[];
  summary: string;
}

interface PreparedInspirationSource {
  promptText: string;
  originalLength: number;
  chunkCount: number;
  extracted: boolean;
}

const INSPIRATION_INPUT_SOFT_LIMIT = 14_000;
const INSPIRATION_CHUNK_SIZE = 1_200;
const INSPIRATION_CHUNK_OVERLAP = 120;
const INSPIRATION_MAX_SELECTED_CHUNKS = 12;
const INSPIRATION_MAX_EXCERPT_CHARS = 260;
const INSPIRATION_MAX_DIGEST_CHARS = 18_000;

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

function safeParseJSON<T>(raw: string | null | undefined, fallback: T): T {
  if (!raw) {
    return fallback;
  }
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function uniqueKnowledgeDocumentIds(ids: string[] | undefined): string[] {
  if (!ids || ids.length === 0) {
    return [];
  }
  return Array.from(new Set(ids.map((item) => item.trim()).filter(Boolean)));
}

function normalizeInspirationText(source: string): string {
  return source
    .replace(/\r\n?/g, "\n")
    .replace(/\u0000/g, "")
    .trim();
}

function compactInspirationExcerpt(source: string, maxChars = INSPIRATION_MAX_EXCERPT_CHARS): string {
  const text = source.replace(/\s+/g, " ").trim();
  if (text.length <= maxChars) {
    return text;
  }
  const headLength = Math.max(40, Math.floor(maxChars * 0.7));
  const tailLength = Math.max(30, maxChars - headLength - 5);
  const head = text.slice(0, headLength).trim();
  const tail = text.slice(-tailLength).trim();
  return `${head} ... ${tail}`;
}

function splitInspirationTextIntoChunks(
  source: string,
  chunkSize = INSPIRATION_CHUNK_SIZE,
  overlap = INSPIRATION_CHUNK_OVERLAP,
): string[] {
  const normalized = normalizeInspirationText(source);
  if (!normalized) {
    return [];
  }

  const paragraphs = normalized
    .split(/\n{2,}/)
    .map((item) => item.trim())
    .filter(Boolean);
  const units = paragraphs.length > 1
    ? paragraphs
    : normalized
      .split(/(?<=[。！？!?])\s*/)
      .map((item) => item.trim())
      .filter(Boolean);

  const chunks: string[] = [];
  let current = "";

  const pushLongUnit = (unit: string) => {
    const step = Math.max(1, chunkSize - overlap);
    for (let cursor = 0; cursor < unit.length; cursor += step) {
      const part = unit.slice(cursor, cursor + chunkSize).trim();
      if (part) {
        chunks.push(part);
      }
      if (cursor + chunkSize >= unit.length) {
        break;
      }
    }
  };

  for (const unit of units) {
    if (!unit) {
      continue;
    }
    if (!current) {
      if (unit.length <= chunkSize) {
        current = unit;
      } else {
        pushLongUnit(unit);
      }
      continue;
    }

    const merged = `${current}\n${unit}`;
    if (merged.length <= chunkSize) {
      current = merged;
      continue;
    }

    chunks.push(current);
    if (unit.length <= chunkSize) {
      current = unit;
    } else {
      pushLongUnit(unit);
      current = "";
    }
  }

  if (current) {
    chunks.push(current);
  }
  return chunks;
}

function scoreInspirationChunk(chunk: string): number {
  const lengthScore = Math.min(chunk.length, INSPIRATION_CHUNK_SIZE);
  const newlineScore = (chunk.match(/\n/g) ?? []).length * 8;
  const quoteScore = (chunk.match(/[“”"「」『』]/g) ?? []).length * 3;
  const signalScore = (chunk.match(/世界|帝国|王朝|宗门|魔法|科技|神|历史|冲突|势力|文明|大陆|城邦|种族/g) ?? []).length * 14;
  return lengthScore + newlineScore + quoteScore + signalScore;
}

function pickRepresentativeChunkIndexes(chunks: string[], limit = INSPIRATION_MAX_SELECTED_CHUNKS): number[] {
  if (chunks.length <= limit) {
    return chunks.map((_, index) => index);
  }

  const selected = new Set<number>();
  const total = chunks.length;
  const add = (index: number) => {
    if (index >= 0 && index < total) {
      selected.add(index);
    }
  };

  add(0);
  add(1);
  add(total - 2);
  add(total - 1);
  const middle = Math.floor(total / 2);
  add(middle - 1);
  add(middle);

  const ranked = chunks
    .map((chunk, index) => ({ index, score: scoreInspirationChunk(chunk) }))
    .sort((a, b) => b.score - a.score || a.index - b.index);

  for (const item of ranked) {
    add(item.index);
    if (selected.size >= limit) {
      break;
    }
  }

  return Array.from(selected).sort((a, b) => a - b);
}

function prepareInspirationSource(source: string): PreparedInspirationSource {
  const normalized = normalizeInspirationText(source);
  if (!normalized) {
    return {
      promptText: "A vague world setting idea.",
      originalLength: 0,
      chunkCount: 0,
      extracted: false,
    };
  }

  if (normalized.length <= INSPIRATION_INPUT_SOFT_LIMIT) {
    return {
      promptText: normalized,
      originalLength: normalized.length,
      chunkCount: 1,
      extracted: false,
    };
  }

  const chunks = splitInspirationTextIntoChunks(normalized);
  const selectedIndexes = pickRepresentativeChunkIndexes(chunks);
  const excerptLines = selectedIndexes
    .map((index) => `[片段 ${index + 1}/${chunks.length}] ${compactInspirationExcerpt(chunks[index])}`);

  const digest = [
    `Source length:${normalized.length} characters; chunks:${chunks.length}; excerpts selected:${selectedIndexes.length}。`,
    ...excerptLines,
  ].join("\n");

  return {
    promptText: digest.slice(0, INSPIRATION_MAX_DIGEST_CHARS),
    originalLength: normalized.length,
    chunkCount: chunks.length,
    extracted: true,
  };
}

function needsChineseConceptTranslation(card: InspirationConceptCard): boolean {
  const content = [
    card.worldType,
    card.tone,
    card.summary,
    ...card.coreImagery,
    ...card.keywords,
  ].join(" ");
  const latinCount = (content.match(/[A-Za-z]/g) ?? []).length;
  const cjkCount = (content.match(/[\u4E00-\u9FFF]/g) ?? []).length;
  return latinCount >= 12 && cjkCount < latinCount;
}

async function translateConceptCardToChinese(
  options: { provider?: LLMProvider; model?: string },
  conceptCard: InspirationConceptCard,
): Promise<InspirationConceptCard> {
  if (!needsChineseConceptTranslation(conceptCard)) {
    return conceptCard;
  }

  try {
    const result = await runStructuredPrompt({
      asset: worldInspirationConceptCardLocalizationPrompt,
      promptInput: {
        conceptCardJson: JSON.stringify(conceptCard),
      },
      options: {
        provider: options.provider ?? "deepseek",
        model: options.model,
        temperature: 0.2,
      },
    });
    const parsed = result.output as Partial<InspirationConceptCard>;
    const translatedCoreImagery = Array.isArray(parsed.coreImagery)
      ? parsed.coreImagery.map((item) => String(item).trim()).filter(Boolean)
      : conceptCard.coreImagery;
    const translatedKeywords = Array.isArray(parsed.keywords)
      ? parsed.keywords.map((item) => String(item).trim()).filter(Boolean)
      : conceptCard.keywords;

    return {
      worldType: parsed.worldType?.trim() || conceptCard.worldType,
      templateKey: parsed.templateKey ? getTemplateByKey(parsed.templateKey).key : conceptCard.templateKey,
      coreImagery: translatedCoreImagery,
      tone: parsed.tone?.trim() || conceptCard.tone,
      keywords: translatedKeywords,
      summary: parsed.summary?.trim() || conceptCard.summary,
    };
  } catch {
    return conceptCard;
  }
}

export async function analyzeWorldInspiration(
  input: InspirationInput,
  onProgress?: (message: string) => void,
) {
  onProgress?.(input.mode === "reference" ? "Organizing reference materials" : "Organizing inspiration input");
  let nextInput = input;
  let seededConceptCard: InspirationConceptCard | null = null;
  let inspirationSource = nextInput.input?.trim() || "A vague world setting idea.";
  let seededPreparedSource: PreparedInspirationSource | null = null;

  if (nextInput.mode === "random") {
    const randomTemplate = WORLD_TEMPLATES[Math.floor(Math.random() * WORLD_TEMPLATES.length)];
    const randomPool = [
      "Floating islands",
      "Deathly silent ancient city",
      "Forbidden laboratory",
      "Rift gate",
      "Ancient pact",
      "Bloodline awakening",
      "Memory tax",
      "Soul currency",
    ];
    const pickedImagery = [...randomPool].sort(() => Math.random() - 0.5).slice(0, 4);
    seededConceptCard = {
      worldType: randomTemplate.worldType,
      templateKey: randomTemplate.key,
      coreImagery: pickedImagery,
      tone: Math.random() > 0.5 ? "Grim epic" : "Adventure epic",
      keywords: pickedImagery,
      summary: `This is a ${randomTemplate.name} world whose core imagery is ${pickedImagery.join("、")}, with a distinctive overall feel and ample dramatic tension.`,
    };
    inspirationSource = seededConceptCard.summary;
    seededPreparedSource = {
      promptText: inspirationSource,
      originalLength: inspirationSource.length,
      chunkCount: 1,
      extracted: false,
    };
  }

  const activeKnowledgeDocuments = await listActiveKnowledgeDocumentContents(
    uniqueKnowledgeDocumentIds(nextInput.knowledgeDocumentIds),
    { allowDisabled: true },
  );
  if (activeKnowledgeDocuments.length > 0) {
    nextInput = {
      ...nextInput,
      input: [
        nextInput.input?.trim(),
        activeKnowledgeDocuments.map((item) => `Knowledge document:${item.title}\n${item.content}`).join("\n\n"),
      ]
        .filter(Boolean)
        .join("\n\n"),
    };
    inspirationSource = nextInput.input?.trim() || inspirationSource;
  }

  const normalizedSource = seededPreparedSource ?? prepareInspirationSource(inspirationSource);
  const inspirationRagContext = "";

  let resolvedConceptCard = seededConceptCard;
  let referenceAnchors: Array<{ id: string; label: string; content: string }> = [];
  let referenceSeeds = createEmptyWorldReferenceSeedBundle();
  if (nextInput.mode === "reference") {
    onProgress?.("Extracting world anchors from the reference work");
    const referenceAnalysis = await generateReferenceInspirationAnalysis({
      sourceText: normalizedSource.promptText,
      worldTypeHint: nextInput.worldType,
      referenceMode: nextInput.referenceMode ?? "adapt_world",
      preserveElements: Array.from(new Set((nextInput.preserveElements ?? []).map((item) => item.trim()).filter(Boolean))),
      allowedChanges: Array.from(new Set((nextInput.allowedChanges ?? []).map((item) => item.trim()).filter(Boolean))),
      forbiddenElements: Array.from(new Set((nextInput.forbiddenElements ?? []).map((item) => item.trim()).filter(Boolean))),
      provider: nextInput.provider,
      model: nextInput.model,
    });
    resolvedConceptCard = await translateConceptCardToChinese({
      provider: nextInput.provider,
      model: nextInput.model,
    }, referenceAnalysis.conceptCard);
    referenceAnchors = referenceAnalysis.anchors;
    referenceSeeds = referenceAnalysis.referenceSeeds;
  } else if (!resolvedConceptCard) {
    onProgress?.("Generating the concept card");
    const conceptResult = await runStructuredPrompt({
      asset: worldInspirationConceptCardPrompt,
      promptInput: {
        mode: nextInput.mode ?? "free",
        worldTypeHint: nextInput.worldType ?? "None",
        promptText: normalizedSource.promptText,
        extracted: normalizedSource.extracted,
        originalLength: normalizedSource.originalLength,
        ragContext: inspirationRagContext || "None",
        templateKeysText: WORLD_TEMPLATES.map((item) => item.key).join("|"),
      },
      options: {
        provider: nextInput.provider ?? "deepseek",
        model: nextInput.model,
        temperature: 0.7,
      },
    });
    const parsedConcept = conceptResult.output as {
      worldType?: string;
      templateKey?: string;
      coreImagery?: string[];
      tone?: string;
      keywords?: string[];
      summary?: string;
    };
    const rawConceptCard: InspirationConceptCard = {
      worldType: parsedConcept.worldType ?? nextInput.worldType ?? "Custom",
      templateKey: parsedConcept.templateKey
        ? getTemplateByKey(parsedConcept.templateKey).key
        : getTemplateByKey(undefined).key,
      coreImagery: parsedConcept.coreImagery ?? [],
      tone: parsedConcept.tone ?? "Neutral",
      keywords: parsedConcept.keywords ?? [],
      summary: parsedConcept.summary ?? compactInspirationExcerpt(inspirationSource, 360),
    };
    resolvedConceptCard = await translateConceptCardToChinese({
      provider: nextInput.provider,
      model: nextInput.model,
    }, rawConceptCard);
  }

  const resolvedTemplate = getTemplateByKey(resolvedConceptCard.templateKey);
  let generatedPropertyOptions: Awaited<ReturnType<typeof generateWorldPropertyOptions>> = [];
  try {
    onProgress?.(nextInput.mode === "reference" ? "Generating alternate-world rework decisions" : "Generating upfront attribute options");
    generatedPropertyOptions = await generateWorldPropertyOptions({
      provider: nextInput.provider,
      model: nextInput.model,
      worldType: resolvedConceptCard.worldType || nextInput.worldType || resolvedTemplate.worldType,
      templateName: resolvedTemplate.name,
      templateDescription: resolvedTemplate.description,
      classicElements: resolvedTemplate.classicElements,
      pitfalls: resolvedTemplate.pitfalls,
      conceptSummary: resolvedConceptCard.summary,
      coreImagery: resolvedConceptCard.coreImagery,
      keywords: resolvedConceptCard.keywords,
      tone: resolvedConceptCard.tone,
      sourcePrompt: normalizedSource.promptText,
      ragContext: inspirationRagContext,
      referenceMode: nextInput.mode === "reference" ? (nextInput.referenceMode ?? "adapt_world") : null,
      referenceAnchors,
      preserveElements: nextInput.preserveElements,
      allowedChanges: nextInput.allowedChanges,
      forbiddenElements: nextInput.forbiddenElements,
      refinementLevel: nextInput.refinementLevel,
      optionsCount: nextInput.optionsCount,
    });
  } catch (error) {
    const reason = error instanceof Error ? error.message : "unknown";
    throw new Error(`Upfront world attribute generation failed:${reason}`);
  }

  return {
    mode: nextInput.mode ?? "free",
    conceptCard: resolvedConceptCard,
    propertyOptions: generatedPropertyOptions,
    referenceAnchors,
    referenceSeeds,
    sourceMeta: {
      extracted: normalizedSource.extracted,
      originalLength: normalizedSource.originalLength,
      chunkCount: normalizedSource.chunkCount,
    },
  };
}

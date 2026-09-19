import type { LLMProvider } from "@ai-novel/shared/types/llm";
import { runStructuredPrompt } from "../../prompting/core/promptRunner";
import { worldReferenceInspirationPrompt } from "../../prompting/prompts/world/world.prompts";
import {
  createEmptyWorldReferenceSeedBundle,
  normalizeWorldReferenceSeedBundle,
  type WorldReferenceAnchor,
  type WorldReferenceMode,
  type WorldReferenceSeedBundle,
} from "@ai-novel/shared/types/worldWizard";

export interface ReferenceConceptCard {
  worldType: string;
  templateKey: string;
  coreImagery: string[];
  tone: string;
  keywords: string[];
  summary: string;
}

interface GenerateReferenceInspirationInput {
  sourceText: string;
  worldTypeHint?: string;
  referenceMode: WorldReferenceMode;
  preserveElements?: string[];
  allowedChanges?: string[];
  forbiddenElements?: string[];
  provider?: LLMProvider;
  model?: string;
}

interface ReferenceInspirationPayload {
  conceptCard: ReferenceConceptCard;
  anchors: WorldReferenceAnchor[];
  referenceSeeds: WorldReferenceSeedBundle;
}

const MIN_ANCHOR_COUNT = 4;

export function buildReferenceModeLabel(mode: WorldReferenceMode): string {
  switch (mode) {
    case "extract_base":
      return "Extract the original world base";
    case "tone_rebuild":
      return "Borrowing the temperament and structure of the original work to reconstruct it";
    case "adapt_world":
    default:
      return "An overhead transformation based on the original work";
  }
}

function uniqueStrings(items: Array<string | null | undefined>): string[] {
  return Array.from(
    new Set(
      items
        .map((item) => (typeof item === "string" ? item.trim() : ""))
        .filter(Boolean),
    ),
  );
}

function compactText(source: string, maxChars: number): string {
  const normalized = source.replace(/\s+/g, " ").trim();
  if (normalized.length <= maxChars) {
    return normalized;
  }
  return `${normalized.slice(0, maxChars - 3).trim()}...`;
}

function normalizeAnchors(raw: unknown): WorldReferenceAnchor[] {
  if (!Array.isArray(raw)) {
    return [];
  }

  const anchors = raw
    .map<WorldReferenceAnchor | null>((item, index) => {
      if (!item || typeof item !== "object") {
        return null;
      }
      const record = item as Record<string, unknown>;
      const label = typeof record.label === "string" ? record.label.trim() : "";
      const content = typeof record.content === "string" ? record.content.trim() : "";
      const id = typeof record.id === "string" ? record.id.trim() : "";
      if (!label || !content) {
        return null;
      }
      return {
        id: id || `anchor-${index + 1}`,
        label,
        content,
      };
    })
    .filter((item): item is WorldReferenceAnchor => Boolean(item));

  return Array.from(new Map(anchors.map((item) => [item.label, item])).values()).slice(0, 6);
}

function buildFallbackAnchors(input: GenerateReferenceInspirationInput): WorldReferenceAnchor[] {
  const anchors: WorldReferenceAnchor[] = [];
  const push = (label: string, content: string) => {
    const normalizedLabel = label.trim();
    const normalizedContent = content.trim();
    if (!normalizedLabel || !normalizedContent || anchors.some((item) => item.label === normalizedLabel)) {
      return;
    }
    anchors.push({
      id: `anchor-${anchors.length + 1}`,
      label: normalizedLabel,
      content: normalizedContent,
    });
  };

  if (input.worldTypeHint?.trim()) {
    push("Theme base", `This rework should still stay within the "${input.worldTypeHint.trim()}" world type.`);
  }
  if (input.preserveElements && input.preserveElements.length > 0) {
    push("must be retained", `The core foundations that must not be lost from the original work include:${input.preserveElements.join("、")}。`);
  }
  if (input.allowedChanges && input.allowedChanges.length > 0) {
    push("Modifications allowed", `You may make alternate-world changes along the following dimensions:${input.allowedChanges.join("、")}。`);
  }
  if (input.forbiddenElements && input.forbiddenElements.length > 0) {
    push("Deviation is prohibited", `The following boundaries must not be broken:${input.forbiddenElements.join("、")}。`);
  }
  push("Reference summary", compactText(input.sourceText, 140));
  push(
    "World boundaries",
    input.referenceMode === "tone_rebuild"
      ? "You may rebuild the concrete facts, but you must still preserve the original work's interpersonal tension, texture of life, and narrative feel."
      : "The rework must build on the original work's world foundation; it cannot jump straight to an unrelated genre or a distorted template.",
  );
  push("Social foundation", "First identify the social realities, industry ecosystem, and life-pressure structure the original work depends on.");
  push("Rework focus", "Focus the rework on location systems, force networks, implicit rules, and the boundaries of public order.");

  return anchors.slice(0, 6);
}

function normalizeConceptCard(
  raw: unknown,
  input: GenerateReferenceInspirationInput,
  anchors: WorldReferenceAnchor[],
): ReferenceConceptCard {
  const record = raw && typeof raw === "object" && !Array.isArray(raw)
    ? raw as Record<string, unknown>
    : {};
  const coreImagery = Array.isArray(record.coreImagery)
    ? uniqueStrings(record.coreImagery.map((item) => (typeof item === "string" ? item : ""))).slice(0, 6)
    : [];
  const keywords = Array.isArray(record.keywords)
    ? uniqueStrings(record.keywords.map((item) => (typeof item === "string" ? item : ""))).slice(0, 8)
    : [];

  const fallbackSummary = input.referenceMode === "extract_base"
    ? `This world should first distill the original work's stable foundation, then decide the direction of further expansion. The key anchors identified so far include:${anchors.map((item) => item.label).join("、")}。`
    : input.referenceMode === "tone_rebuild"
      ? `The goal this time is not to copy the original work's facts but to preserve its urban character, relationship structure, and narrative feel, then rebuild a new way of organizing the world. The key reference anchors include:${anchors.map((item) => item.label).join("、")}。`
      : `This world should be built on the original work's foundation for an alternate-world rework: first preserve the original's character and realistic skeleton, then reorganize the world rules around the dimensions open to change. The key anchors include:${anchors.map((item) => item.label).join("、")}。`;

  return {
    worldType: typeof record.worldType === "string" && record.worldType.trim()
      ? record.worldType.trim()
      : input.worldTypeHint?.trim() || "Reworking a world from a reference work",
    templateKey: "custom",
    coreImagery: coreImagery.length > 0 ? coreImagery : anchors.map((item) => item.label).slice(0, 5),
    tone: typeof record.tone === "string" && record.tone.trim()
      ? record.tone.trim()
      : "Keep the original work's character and make controlled changes",
    keywords: keywords.length > 0 ? keywords : uniqueStrings(anchors.flatMap((item) => [item.label, item.content])).slice(0, 8),
    summary: typeof record.summary === "string" && record.summary.trim()
      ? record.summary.trim()
      : fallbackSummary,
  };
}

function buildPrompt(input: GenerateReferenceInspirationInput): string {
  return [
    `Reference mode:${buildReferenceModeLabel(input.referenceMode)}`,
    input.worldTypeHint?.trim() ? `World type hint:${input.worldTypeHint.trim()}` : "",
    input.preserveElements && input.preserveElements.length > 0
      ? `Must be retained:${input.preserveElements.join("、")}`
      : "",
    input.allowedChanges && input.allowedChanges.length > 0
      ? `Allowed changes:${input.allowedChanges.join("、")}`
      : "",
    input.forbiddenElements && input.forbiddenElements.length > 0
      ? `Must not deviate from:${input.forbiddenElements.join("、")}`
      : "",
    `Reference material:${input.sourceText}`,
  ]
    .filter(Boolean)
    .join("\n");
}

export async function generateReferenceInspirationAnalysis(
  input: GenerateReferenceInspirationInput,
): Promise<ReferenceInspirationPayload> {
  const retryPrompt = `${buildPrompt(input)}

Please note:
1. For "alternate-world rework of the original work", focus on distilling the original work's world anchors, the original settings that can be carried over directly, and the rework boundaries, not on generating a new genre template.
2. For "extracting the original work's world foundation", focus on stable facts and how the world is organized; do not amplify the rework on your own.
3. 如果是“Borrowing the temperament and structure of the original work to reconstruct it”，重点是保留氛围、关系结构和生活质感，不要求保留全部具体事实。`;

  for (const prompt of [buildPrompt(input), retryPrompt]) {
    try {
      const result = await runStructuredPrompt({
        asset: worldReferenceInspirationPrompt,
        promptInput: {
          userPrompt: prompt,
          isRetry: prompt === retryPrompt,
        },
        options: {
          provider: input.provider ?? "deepseek",
          model: input.model,
          temperature: 0.2,
        },
      });
      const parsed = result.output;

      const anchors = normalizeAnchors((parsed as any).anchors);
      const safeAnchors = anchors.length >= MIN_ANCHOR_COUNT ? anchors : buildFallbackAnchors(input);
      const referenceSeeds = normalizeWorldReferenceSeedBundle(
        (parsed as any).seedPackage ?? (parsed as any).referenceSeeds,
      );
      return {
        conceptCard: normalizeConceptCard((parsed as any).conceptCard, input, safeAnchors),
        anchors: safeAnchors,
        referenceSeeds,
      };
    } catch {
      continue;
    }
  }

  const fallbackAnchors = buildFallbackAnchors(input);
  return {
    conceptCard: normalizeConceptCard(null, input, fallbackAnchors),
    anchors: fallbackAnchors,
    referenceSeeds: createEmptyWorldReferenceSeedBundle(),
  };
}

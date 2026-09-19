import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { z } from "zod";
import type { PromptAsset } from "../../core/promptTypes";
import {
  marketCreativeBriefSchema,
  marketPlatformDigestSchema,
  marketTrendReportSchema,
} from "./marketRadar.promptSchemas";

interface PlatformDigestInput {
  platformLabel: string;
  rankingText: string;
  evidenceItemIds: string[];
}

interface TrendReportInput {
  platformDigestsText: string;
  historyText: string;
  genreCatalogText: string;
  storyModeCatalogText: string;
  allowedGenreIds: string[];
  allowedStoryModeIds: string[];
  evidenceItemIds: string[];
  hasComparableHistory: boolean;
}

interface CreativeBriefInput {
  influenceMode: "follow_hot" | "differentiate" | "light";
  selectedSignalsText: string;
}

const analystSystem = [
  "You are a market analyst for Chinese online literature. Only analyze the metadata of the public list in the input, do not add the text of the work, and do not pretend to know the information that is not provided.",
  "Semantic classification, routine induction and opportunity judgment must be completed by you; you cannot just count mechanically based on title keywords.",
  "All conclusions must reference evidenceItemIds present in the input. No fabrication of works, names, data or evidence IDs is allowed.",
  "Key analysis: popular theme combination, protagonist identity, cheat mechanism, opening crisis, relationship selling point, title sentence structure, crowded routines and differentiation opportunities.",
  "When entering a new book list or a new author list, only these new book evidence will be analyzed; the mature list will only be used as fallback data when there is no new book list available.",
  "kind can only use genre, protagonist, advantage, opening, relationship, title_pattern, opportunity, crowding; it is not allowed to create synonymous enumeration values.",
  "The high frequency of the list does not mean that it is suitable for copying. Opportunity proposals must address points of reader satisfaction while avoiding direct reproduction of specific works.",
].join("\n");

export const marketPlatformDigestPrompt: PromptAsset<PlatformDigestInput, z.infer<typeof marketPlatformDigestSchema>> = {
  id: "market_radar.platform_digest",
  version: "v3",
  taskType: "planner",
  mode: "structured",
  language: "zh",
  contextPolicy: { maxTokensBudget: 0 },
  repairPolicy: { maxAttempts: 1 },
  outputSchema: marketPlatformDigestSchema,
  management: { productPrompt: true, editModes: ["readonly"] },
  render: (input) => [
    new SystemMessage(analystSystem),
    new HumanMessage([
      `Platform: ${input.platformLabel}`,
      "Please summarize the market signals of the current list on this platform. The direction of the first cross-sectional analysis always uses current.",
      "Each category only retains multiple pieces of evidence or signals with clear business significance, and a total of 5 to 10 items are output; the id uses a short and stable English dash format.",
      "",
      input.rankingText,
    ].join("\n")),
  ],
  postValidate: (output, input) => {
    const allowed = new Set(input.evidenceItemIds);
    if (output.signals.some((signal) => signal.evidenceItemIds.some((id) => !allowed.has(id)))) {
      throw new Error("The platform list summarizes citing evidence that does not exist.");
    }
    return output;
  },
};

export const marketTrendSynthesisPrompt: PromptAsset<TrendReportInput, z.infer<typeof marketTrendReportSchema>> = {
  id: "market_radar.cross_platform_synthesis",
  version: "v4",
  taskType: "planner",
  mode: "structured",
  language: "zh",
  contextPolicy: { maxTokensBudget: 0 },
  repairPolicy: { maxAttempts: 1 },
  outputSchema: marketTrendReportSchema,
  management: { productPrompt: true, editModes: ["readonly"] },
  render: (input) => [
    new SystemMessage(analystSystem),
    new HumanMessage([
      "Please summarize the results based on each platform, retain platform differences, and do not confuse male channels, female channels, and the free reading market into one conclusion.",
      "The input is the compressed new book signal of each platform; only do cross-platform mergers, trade-offs and difference judgments, do not copy the platform results one by one.",
      input.hasComparableHistory
        ? "Rising, stable, and falling can be judged based on historical comparison; current is still used when there is insufficient evidence."
        : "There is no comparable history, all signal directions must use current, and claims of rising or falling tide are prohibited.",
      "A total of 8 to 12 items are output. recommended=true should give priority to one differentiation opportunity and up to three supporting signals; highly crowded routines should generally not be recommended.",
      "At the same time, the productionFoundation is output, condensing the market conclusion into a theme base, a main promotion mode and an optional auxiliary promotion mode.",
      "The subject matter basis answers ‘what kind of book is this’, and the promotion model answers ‘how does this book continue to advance and be realized?’ The two cannot be mixed.",
      "If there is already a semantic equivalent in the resource library, the corresponding existingId must be filled in and its name must be used; existingId can be null only when there is indeed a lack of suitable assets, and a complete description, template and promotion mode profile that can be directly entered into the resource library will be output.",
      "Resource names must be stable and reusable, and cannot contain short-term words such as date, popularity, rankings, or ‘currently popular’.",
      "",
      "Platform summary:",
      input.platformDigestsText,
      "",
      `Historical comparison: ${input.historyText || "none"}`,
      "",
      "Existing theme base library:",
      input.genreCatalogText || "empty",
      "",
      "Existing propulsion pattern library:",
      input.storyModeCatalogText || "empty",
    ].join("\n")),
  ],
  postValidate: (output, input) => {
    const allowed = new Set(input.evidenceItemIds);
    if (!input.hasComparableHistory && output.signals.some((signal) => signal.direction !== "current")) {
      throw new Error("A trend change cannot be claimed without a historical snapshot.");
    }
    if (output.signals.some((signal) => signal.evidenceItemIds.some((id) => !allowed.has(id)))) {
      throw new Error("Cross-platform analysis cites evidence that doesn't exist.");
    }
    const foundationAssets = [
      output.productionFoundation.genre,
      output.productionFoundation.primaryStoryMode,
      output.productionFoundation.secondaryStoryMode,
    ].filter(Boolean);
    if (foundationAssets.some((asset) => asset!.evidenceItemIds.some((id) => !allowed.has(id)))) {
      throw new Error("Production base recommendations cite evidence that does not exist.");
    }
    if (
      output.productionFoundation.genre.existingId
      && !input.allowedGenreIds.includes(output.productionFoundation.genre.existingId)
    ) {
      throw new Error("The production base references a non-existent subject matter base.");
    }
    if ([
      output.productionFoundation.primaryStoryMode.existingId,
      output.productionFoundation.secondaryStoryMode?.existingId,
    ].some((id) => id && !input.allowedStoryModeIds.includes(id))) {
      throw new Error("The production base references a propulsion mode that does not exist.");
    }
    return output;
  },
};

export const marketCreativeBriefPrompt: PromptAsset<CreativeBriefInput, z.infer<typeof marketCreativeBriefSchema>> = {
  id: "market_radar.creative_brief",
  version: "v1",
  taskType: "planner",
  mode: "structured",
  language: "zh",
  contextPolicy: { maxTokensBudget: 0 },
  repairPolicy: { maxAttempts: 1 },
  outputSchema: marketCreativeBriefSchema,
  management: { productPrompt: true, editModes: ["readonly"] },
  render: (input) => [
    new SystemMessage([
      "You are the AutoDirector's opening book marketing briefing editor. Organize the market signals selected by the user into executable constraints for the first creative generation.",
      "It is strictly prohibited to reuse names, exclusive settings, introductory sentences and complete book titles of the listed works; only readers’ needs, exciting mechanisms and structural opportunities can be refined.",
      "promptBlock must be able to directly guide subject recommendation, cheats, hot spots in the first chapter, the direction of the entire book, and the title of the online book.",
      "Don't ask for follow-up quality review remediation, the goal is to improve first-time build quality.",
    ].join("\n")),
    new HumanMessage([
      `Impact model:${input.influenceMode}`,
      input.influenceMode === "follow_hot" ? "Priority will be given to current popular content, but copying of specific works is still prohibited." : "",
      input.influenceMode === "differentiate" ? "Keep the popular reader satisfaction points while replacing at least one of the protagonist's identity, stage, or cheat mechanic." : "",
      input.influenceMode === "light" ? "Market signals are only used as secondary reference, and users’ own ideas and selected topics take priority." : "",
      "",
      input.selectedSignalsText,
    ].filter(Boolean).join("\n")),
  ],
};

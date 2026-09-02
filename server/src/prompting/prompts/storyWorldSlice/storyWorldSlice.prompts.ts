import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { z } from "zod";
import type { StoryWorldSliceBuilderMode, StoryWorldSliceOverrides, } from "@ai-novel/shared/types/storyWorldSlice";
import type { WorldBindingSupport, WorldStructuredData, } from "@ai-novel/shared/types/world";
import type { PromptAsset } from "../../core/promptTypes";
import { buildBookFramingSummary } from "../../../services/novel/bookFraming";
import { storyWorldSliceRawPayloadSchema } from "./storyWorldSlice.promptSchemas";
export interface StoryWorldSlicePromptInput {
    novel: {
        id: string;
        title: string;
        description?: string | null;
        targetAudience?: string | null;
        bookSellingPoint?: string | null;
        competingFeel?: string | null;
        first30ChapterPromise?: string | null;
        commercialTagsJson?: string | null;
        styleTone?: string | null;
        narrativePov?: string | null;
        pacePreference?: string | null;
        emotionIntensity?: string | null;
    };
    structure: WorldStructuredData;
    bindingSupport: WorldBindingSupport;
    storyInput: string;
    overrides: StoryWorldSliceOverrides;
    builderMode: StoryWorldSliceBuilderMode;
}
function formatRules(structure: WorldStructuredData): string {
    if (structure.rules.axioms.length === 0) {
        return "There are no clear rules yet.";
    }
    return structure.rules.axioms
        .map((rule) => [
        `- [${rule.id}] ${rule.name}`,
        rule.summary && `Description: ${rule.summary}`,
        rule.cost && `Price: ${rule.cost}`,
        rule.boundary && `Border: ${rule.boundary}`,
        rule.enforcement && `Execution consequences: ${rule.enforcement}`,
    ].filter(Boolean).join(" | "))
        .join("\n");
}
function formatForces(structure: WorldStructuredData): string {
    if (structure.forces.length === 0) {
        return "No clear force yet.";
    }
    return structure.forces
        .map((force) => [
        `- [${force.id}] ${force.name}`,
        force.type && `Type: ${force.type}`,
        force.summary && `Overview: ${force.summary}`,
        force.currentObjective && `Current goals: ${force.currentObjective}`,
        force.pressure && `Pressure method: ${force.pressure}`,
        force.narrativeRole && `Narrative function: ${force.narrativeRole}`,
    ].filter(Boolean).join(" | "))
        .join("\n");
}
function formatLocations(structure: WorldStructuredData): string {
    if (structure.locations.length === 0) {
        return "No specific location yet.";
    }
    return structure.locations
        .map((location) => [
        `- [${location.id}] ${location.name}`,
        location.terrain && `Terrain: ${location.terrain}`,
        location.summary && `Overview: ${location.summary}`,
        location.narrativeFunction && `Narrative function: ${location.narrativeFunction}`,
        location.risk && `Risk: ${location.risk}`,
        location.entryConstraint && `Access restrictions: ${location.entryConstraint}`,
        location.exitCost && `Cost of leaving: ${location.exitCost}`,
    ].filter(Boolean).join(" | "))
        .join("\n");
}
function buildStoryWorldSlicePrompt(input: StoryWorldSlicePromptInput): {
    system: string;
    user: string;
} {
    const { novel, structure, bindingSupport, storyInput, overrides, builderMode } = input;
    const bookFramingSummary = buildBookFramingSummary(novel);
    return {
        system: [
            "You are the novel world access planner.",
            "Your task is not to recite the entire world encyclopedia, but to tailor the upstream world setting into \"the world setting that this book will actually use.\"",
            "Priority must be reserved: the parts that will actually affect the book's conflicts, locations, rules, sources of suspense, and sources of stress.",
            "When cutting, decisions about what world to keep must be prioritized around target readers, core selling points, commercial tags, and the promise of the first 30 chapters.",
            "Don't cram all the world setting into the outcome. Settings that are irrelevant to the current story must be actively deleted.",
            "If a user-entered story idea clearly conflicts with world boundaries or forbidden combinations, the risk of conflict must be reflected in storyScopeBoundary and forbiddenCombinations.",
            "Only strict JSON output is allowed, no interpretation.",
            "The first issue of activeElements is only allowed to be refined into clues, rule fragments, location clues or force clues that can be used in narratives. No new world models are allowed to be invented.",
            "activeForces, activeLocations, appliedRules must all reference existing ids.",
            "recommendedEntryPoints, pressureSources, conflictCandidates can be directly combined with bindingSupport and current story intent tailoring.",
            "[Key constraints to prevent the world setting from contaminating the story text]",
            "coreWorldFrame、pressureSources、conflictCandidates、suggestedStoryAxes、recommendedEntryPoints、",
            "All free text fields such as storyScopeBoundary and mysterySources must be described using the common narrative language within the story.",
            "For example, \"local dignitaries\", \"law enforcement agencies\", \"competitors\", \"market management rules\",",
            "Instead of directly copying the proprietary names of world assets (the name field corresponding to the force id, the name field corresponding to the location id, etc.).",
            "Distinguished names are only allowed in the id reference field of appliedRules/activeForces/activeLocations,",
            "It must not appear in the above-mentioned free text fields to prevent world-specific words from other eras or regions from contaminating the current story text generation.",
            "If there is an obvious era/region mismatch between the world source and the novel's story background (such as a historical war world vs a modern urban story),",
            "The mapping description must be clearly written in the storyScopeBoundary: \"X in the world is mapped to Y in this book\",",
            "And write the original world-specific words in forbiddenCombinations that should not be used directly.",
            "The JSON structure must be:",
            "{",
            "  \"coreWorldFrame\": \"A stage summary that this book will actually use\",",
            "  \"appliedRules\": [{\"id\":\"rule-id\",\"whyItMatters\":\"Why this rule really affects this book\"}],",
            "  \"activeForces\": [{\"id\":\"force-id\",\"roleInStory\":\"Role in this book\",\"pressure\":\"What pressure will this force bring to the protagonist/main line\"}],",
            "  \"activeLocations\": [{\"id\":\"location-id\",\"storyUse\":\"What plot is this location suitable for?\",\"risk\":\"What problems will occur here\"}],",
            "  \"activeElements\": [{\"id\":\"element-id\",\"label\":\"Element name\",\"type\":\"rule|force|location|binding\",\"summary\":\"One sentence description\"}],",
            "  \"conflictCandidates\": [\"Directly expandable conflicts\"],",
            "  \"pressureSources\": [\"Main pressure sources\"],",
            "  \"mysterySources\": [\"Questions suitable for continuing to amaze readers\"],",
            "  \"suggestedStoryAxes\": [\"Suggested story axes to focus on\"],",
            "  \"recommendedEntryPoints\": [\"A suitable entry point for the start\"],",
            "  \"forbiddenCombinations\": [\"combinations that should not appear at the same time or will obviously deviate\"],",
            "  \"storyScopeBoundary\": \"What boundaries should this book control the story within?\"",
            "}",
        ].join("\n"),
        user: [
            `Novel title:${novel.title}`,
            novel.description?.trim() ? `Introduction to the novel:${novel.description.trim()}` : "",
            bookFramingSummary ? `Book-level framing:
${bookFramingSummary}` : "",
            storyInput.trim() ? `Current story ideas:${storyInput.trim()}` : "Current story ideas: None yet, tailored according to the known introduction and world setting of the novel.",
            `Current use:${builderMode}`,
            novel.styleTone ? `Style tendencies:${novel.styleTone}` : "",
            novel.narrativePov ? `Narrator:${novel.narrativePov}` : "",
            novel.pacePreference ? `Rhythm preference:${novel.pacePreference}` : "",
            novel.emotionIntensity ? `Emotional intensity:${novel.emotionIntensity}` : "",
            `World Summary:${structure.profile.summary || structure.profile.identity || "None yet"}`,
            structure.profile.coreConflict ? `World Core Conflict:${structure.profile.coreConflict}` : "",
            `Available rules:
${formatRules(structure)}`,
            `Available forces:
${formatForces(structure)}`,
            `Available locations:
${formatLocations(structure)}`,
            bindingSupport.recommendedEntryPoints.length > 0
                ? `Entry in the binding suggestion:
${bindingSupport.recommendedEntryPoints.map((item) => `- ${item}`).join("\n")}`
                : "",
            bindingSupport.highPressureForces.length > 0
                ? `Sources of high voltage in binding recommendations:
${bindingSupport.highPressureForces.map((item) => `- ${item}`).join("\n")}`
                : "",
            bindingSupport.compatibleConflicts.length > 0
                ? `Conflict candidates in binding suggestions:
${bindingSupport.compatibleConflicts.map((item) => `- ${item}`).join("\n")}`
                : "",
            bindingSupport.forbiddenCombinations.length > 0
                ? `Prohibitions in binding recommendations:
${bindingSupport.forbiddenCombinations.map((item) => `- ${item}`).join("\n")}`
                : "",
            `Mandatory reserved items on the novel side:${JSON.stringify(overrides)}`,
            "Please cut based on the parts that are really needed for this novel, and do not copy the entire world.",
        ].filter(Boolean).join("\n\n"),
    };
}
export const storyWorldSlicePrompt: PromptAsset<StoryWorldSlicePromptInput, z.infer<typeof storyWorldSliceRawPayloadSchema>> = {
    id: "storyWorldSlice.generate",
    version: "v2",
    taskType: "planner",
    mode: "structured",
    language: "ka",
    contextPolicy: {
        maxTokensBudget: 0,
    },
    outputSchema: storyWorldSliceRawPayloadSchema,
    render: (input) => {
        const prompt = buildStoryWorldSlicePrompt(input);
        return [
            new SystemMessage(prompt.system),
            new HumanMessage(prompt.user),
        ];
    }
};

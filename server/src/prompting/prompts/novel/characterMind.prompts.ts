import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import type { PromptAsset, PromptContextBlock } from "../../core/promptTypes";
import { renderSelectedContextBlocks } from "../../core/renderContextBlocks";
import { characterMindSnapshotResponseSchema, type CharacterMindSnapshotResponse, } from "./characterMind.promptSchemas";
export interface CharacterMindSnapshotPromptInput {
    mode: "bootstrap" | "refresh";
}
export const characterMindSnapshotPrompt: PromptAsset<CharacterMindSnapshotPromptInput, CharacterMindSnapshotResponse> = {
    id: "novel.character.mind.snapshot",
    version: "v2",
    taskType: "planner",
    mode: "structured",
    language: "ka",
    contextPolicy: {
        maxTokensBudget: 2600,
        requiredGroups: ["character_mind_roster", "character_mind_facts"],
        preferredGroups: [
            "character_mind_relations",
            "character_mind_world",
            "character_mind_recent_events",
            "character_mind_resources",
            "character_mind_information_boundaries",
        ],
    },
    repairPolicy: { maxAttempts: 1 },
    outputSchema: characterMindSnapshotResponseSchema,
    render: (input, context) => [
        new SystemMessage([
            "You are a character line analyzer for Georgian-language novels. Your conclusion serves the writing of subsequent chapters and the author's understanding, rather than rewriting the official history of the novel.",
            "Only output valid JSON, no Markdown or explanations.",
            "Character lines of thought are subjective inferences based on the current material: characters may misjudge, suspect, or conceal, but these can never be written as objective facts.",
            "Only character names from the character roster may be used; no new characters, identities, resources, events, relationships, or secrets may be added.",
            "evidence must refer to explicit facts, textual events, or relationship status in the input material. Be conservative when there is insufficient material, write out the uncertainties, don\u2019t make it up.",
            "currentInterpretation describes how the character understands the situation now; privateIntent, activePlan, emotionalStance, actionTendency, and decisionTrigger should all be short sentences.",
            "Beliefs are judgments that the character currently believes or is inclined to believe; misbeliefs only write down well-founded misjudgments or information gaps, and do not force the truth known to the author onto the character.",
            `This time mode:${input.mode === "bootstrap" ? "Prepare an initial line of thought for your newly created character" : "Refresh the character's current line of thinking based on the latest official history and chapter changes"}。`,
        ].join("\n")),
        new HumanMessage([
            "Please generate character idea lines based on hierarchical context.",
            renderSelectedContextBlocks(context),
        ].join("\n\n")),
    ],
    postValidate: (output) => {
        const duplicateNames = new Set<string>();
        for (const snapshot of output.snapshots) {
            const key = snapshot.characterName.replace(/\s+/g, "").toLowerCase();
            if (duplicateNames.has(key)) {
                throw new Error(`Character idea lines repeated:${snapshot.characterName}`);
            }
            duplicateNames.add(key);
            if (snapshot.evidence.length === 0) {
                throw new Error(`Lack of evidence for character line of thought:${snapshot.characterName}`);
            }
        }
        return output;
    }
};
export function buildCharacterMindContextBlocks(input: {
    roster: string;
    facts: string;
    relations?: string;
    world?: string;
    recentEvents?: string;
    resources?: string;
    informationBoundaries?: string;
}): PromptContextBlock[] {
    return [
        { id: "character_mind_roster", group: "character_mind_roster", priority: 100, required: true, estimatedTokens: 700, content: input.roster },
        { id: "character_mind_facts", group: "character_mind_facts", priority: 99, required: true, estimatedTokens: 800, content: input.facts },
        ...(input.relations ? [{ id: "character_mind_relations", group: "character_mind_relations", priority: 80, required: false, estimatedTokens: 450, content: input.relations }] : []),
        ...(input.world ? [{ id: "character_mind_world", group: "character_mind_world", priority: 60, required: false, estimatedTokens: 350, content: input.world }] : []),
        ...(input.recentEvents ? [{ id: "character_mind_recent_events", group: "character_mind_recent_events", priority: 70, required: false, estimatedTokens: 500, content: input.recentEvents }] : []),
        ...(input.resources ? [{ id: "character_mind_resources", group: "character_mind_resources", priority: 82, required: false, estimatedTokens: 420, content: input.resources }] : []),
        ...(input.informationBoundaries ? [{ id: "character_mind_information_boundaries", group: "character_mind_information_boundaries", priority: 88, required: false, estimatedTokens: 420, content: input.informationBoundaries }] : []),
    ];
}

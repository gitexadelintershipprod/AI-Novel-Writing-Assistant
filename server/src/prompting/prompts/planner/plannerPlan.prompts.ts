import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import type { StoryPlanLevel } from "@ai-novel/shared/types/novel";
import type { PromptAsset } from "../../core/promptTypes";
import { normalizePlannerOutput, type PlannerOutput } from "../../../services/planner/plannerOutputNormalization";
import { plannerOutputSchema } from "../../../services/planner/plannerSchemas";
interface PlannerPlanPromptInput {
    scopeLabel: string;
}
function buildPlannerPlanAsset(input: {
    id: string;
    version: string;
    planLevel: StoryPlanLevel;
    includeScenes: boolean;
    maxTokensBudget: number;
}): PromptAsset<PlannerPlanPromptInput, PlannerOutput> {
    return {
        id: input.id,
        version: input.version,
        taskType: "planner",
        mode: "structured",
        language: "ka",
        contextPolicy: {
            maxTokensBudget: input.maxTokensBudget,
            requiredGroups: input.planLevel === "chapter"
                ? ["novel_overview", "chapter_target", "outline_source", "state_snapshot"]
                : undefined,
            preferredGroups: input.planLevel === "chapter"
                ? ["book_plan", "arc_plans", "volume_summary", "story_mode"]
                : ["story_mode", "book_bible"],
            dropOrder: [
                "recent_decisions",
                "character_dynamics",
                "plot_beats",
                "recent_summaries",
                "arc_plans",
                "book_plan",
                "volume_summary",
            ],
        },
        semanticRetryPolicy: input.planLevel === "chapter"
            ? { maxAttempts: 1 }
            : undefined,
        outputSchema: plannerOutputSchema,
        structuredOutputHint: {
            example: {
                title: "Example title",
                objective: "Example target",
                participants: ["Example parties"],
                reveals: ["Example Revealed"],
                riskNotes: ["Example risks"],
                hookTarget: "Example suspense",
                planRole: input.planLevel === "chapter" ? "progress" : "",
                phaseLabel: "Example stage",
                mustAdvance: ["Example advancement items"],
                mustPreserve: ["Example reserved items"],
                scenes: input.includeScenes
                    ? [{
                            title: "Example scenario",
                            objective: "Example scenario goals",
                            conflict: "Example conflict",
                            reveal: "Example variations",
                            emotionBeat: "Sample mood beats",
                        }]
                    : [],
            },
            note: input.includeScenes
                ? "The current level must return executable scenes examples." : "The current level's scenes must remain an empty array.",
        },
        render: (promptInput, context) => {
            const contextText = context.blocks.map((block) => block.content).join("\n\n");
            const systemPrompt = [
                "You are the novel planning assistant, responsible for organizing the current level of story requirements into structured planning results that can directly enter the next step of writing or refinement process.",
                "",
                "Output only strict JSON, no Markdown, explanations, comments, code blocks, or extra text.",
                `Current planning level:${input.planLevel}。`,
                "",
                "The output must contain the following fields:",
                "title、objective、participants、reveals、riskNotes、hookTarget、planRole、phaseLabel、mustAdvance、mustPreserve、scenes。",
                input.includeScenes
                    ? "scenes must be a non-empty array, and each item must contain: title, objective, conflict, reveal, emotionBeat." : "scenes must return an empty array.",
                input.planLevel === "chapter"
                    ? "When the planning level is chapter, planRole is required and can only be: setup, progress, pressure, turn, payoff, cooldown." : "When the planning level is book or arc, planRole can be an empty string, but invalid values must not be filled in randomly.",
                "",
                "Global hard rules:",
                "1. All content must be in natural Georgian.",
                "2. Planning can only be based on the given context, and no key settings, character relationships, or major plot points outside the context may be added.",
                "3. The output must serve subsequent creative execution rather than writing analysis instructions.",
                "4. Each field must be self-consistent and must not conflict with each other.",
                "5. mustAdvance and mustPreserve must be short, specific, and directly usable in subsequent writing.",
                "",
                "Field requirements:",
                "1. title: Write the title of the current level planning item, concisely and clearly, without placeholders.",
                "2. Objective: The core promotion goal of this level of planning must be clearly stated and cannot be written as a general summary.",
                "3. Participants: Only list key people, key forces or key relationship participants, do not include everyone.",
                "4. reveals: Only write about important information revelations, structural transitions or key cognitive changes, do not write about ordinary processes.",
                "5. riskNotes: Write down the risk points that are most likely to be out of focus, flattened, distorted, deviated or violated, and must be specific.",
                "6. HookTarget: The suspense, tension, expectation or emotional pull that should be left to the reader at the end of the writing stage or chapter should not be written as empty words.",
                "7. phaseLabel: Use phrases to summarize the current phase, such as \"testing and oppression period\", \"relationship binding period\" and \"identity loosening period\". It should not be too long.",
                "8. mustAdvance: List the advancement items that must not be absent at this level. They must be action, result or structural advancement.",
                "9. mustPreserve: List continuity, world rules, character states, tone boundaries, or pattern constraints that cannot be broken.",
                input.includeScenes
                    ? "10. Scenes must be organized in order, and each item must be directly used in the writing stage, and should not be written as concept tags." : "10. Since the current level does not require scene refinement, scenes must be an empty array.",
                "",
                "Story mode rules:",
                "1. When the context has story mode constraints, the primary mode is regarded as a hard constraint, and the secondary mode can only be used as a lightweight flavor layer.",
                "2. Do not exceed the conflict limit given by the story mode.",
                "3. No reliance shall be placed on forms of conflict that are expressly prohibited.",
                "",
                "Quality requirements:",
                "1. The output must be like \"planning results that can be directly handed over to the next link for execution\" rather than a concept memo.",
                "2. Avoid empty expressions, such as \u201Cadvance the plot\u201D, \u201Cincrease conflict\u201D and \u201Cdeepen the characters\u201D.",
                "3. All array items should use phrases or short sentences to avoid lengthy analysis.",
            ].join("\n");
            const userPrompt = [
                promptInput.scopeLabel,
                "",
                "Context:",
                contextText || "None",
                "",
                "Output requirements:",
                "1. objective must clearly answer \"what exactly is going to be promoted at this level now?\"",
                "2. Participants only retain the characters, forces or relationship subjects that really affect the advancement of this layer.",
                "3. Reveals Only write key revelations and don\u2019t mix in process details.",
                "4. RiskNotes should give priority to pointing out the places where this layer is most likely to be broken.",
                "5. HookTarget should be able to directly serve readers to follow up, rather than writing in the abstract to \"create suspense\".",
                "6. phaseLabel must be short, accurate, and identifiable.",
                "7. mustAdvance must list the advancement items that cannot be absent.",
                "8. mustPreserve must list continuity, tone, and hard constraints that cannot be broken.",
                input.includeScenes
                    ? "9. The scenes must be in a clear sequence, and each scene should reflect specific actions, conflicts, or changes." : "9. scenes returns an empty array.",
            ].join("\n");
            return [new SystemMessage(systemPrompt), new HumanMessage(userPrompt)];
        },
        postValidate: (output) => {
            const normalized = normalizePlannerOutput(output);
            if (!normalized.title?.trim()) {
                throw new Error("Planner output is missing title.");
            }
            if (!normalized.objective?.trim()) {
                throw new Error("Planner output is missing objective.");
            }
            if (!normalized.phaseLabel?.trim()) {
                throw new Error("Planner output is missing phaseLabel.");
            }
            if ((normalized.mustAdvance ?? []).length === 0) {
                throw new Error("Planner output is missing mustAdvance.");
            }
            if ((normalized.mustPreserve ?? []).length === 0) {
                throw new Error("Planner output is missing mustPreserve.");
            }
            if (input.planLevel === "chapter") {
                if (!normalized.planRole) {
                    throw new Error("Chapter planner output is missing planRole.");
                }
                if (!["setup", "progress", "pressure", "turn", "payoff", "cooldown"].includes(normalized.planRole)) {
                    throw new Error("Chapter planner output has invalid planRole.");
                }
                if ((normalized.scenes ?? []).length === 0) {
                    throw new Error("Chapter planner output is missing scenes.");
                }
            }
            if (!input.includeScenes && (normalized.scenes ?? []).length > 0) {
                throw new Error("Planner output should not include scenes for this plan level.");
            }
            if (input.includeScenes) {
                for (const scene of normalized.scenes ?? []) {
                    if (!scene.title?.trim()) {
                        throw new Error("Planner scene is missing title.");
                    }
                    if (!scene.objective?.trim()) {
                        throw new Error("Planner scene is missing objective.");
                    }
                    if (!scene.conflict?.trim()) {
                        throw new Error("Planner scene is missing conflict.");
                    }
                    if (!scene.reveal?.trim()) {
                        throw new Error("Planner scene is missing reveal.");
                    }
                    if (!scene.emotionBeat?.trim()) {
                        throw new Error("Planner scene is missing emotionBeat.");
                    }
                }
            }
            return normalized;
        },
    };
}
export const plannerBookPlanPrompt = buildPlannerPlanAsset({
    id: "planner.book.plan",
    version: "v2",
    planLevel: "book",
    includeScenes: false,
    maxTokensBudget: 1800,
});
export const plannerArcPlanPrompt = buildPlannerPlanAsset({
    id: "planner.arc.plan",
    version: "v2",
    planLevel: "arc",
    includeScenes: false,
    maxTokensBudget: 1800,
});
export const plannerChapterPlanPrompt = buildPlannerPlanAsset({
    id: "planner.chapter.plan",
    version: "v2",
    planLevel: "chapter",
    includeScenes: true,
    maxTokensBudget: 2400,
});

import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { z } from "zod";
import type { AiManualEditImpactDecision, DirectorManualEditInventory, DirectorWorkspaceInventory, } from "@ai-novel/shared/types/directorRuntime";
import type { PromptAsset } from "../../core/promptTypes";
import { renderSelectedContextBlocks } from "../../core/renderContextBlocks";
export interface DirectorManualEditImpactPromptInput {
    inventory: DirectorWorkspaceInventory;
    editInventory: DirectorManualEditInventory;
}
const repairStepSchema = z.object({
    action: z.enum([
        "continue_chapter_execution",
        "review_recent_chapters",
        "update_continuity_state",
        "repair_scope",
        "ask_user_confirmation",
    ]),
    label: z.string().min(1),
    reason: z.string().min(1),
    affectedScope: z.string().nullable().optional(),
    requiresApproval: z.boolean(),
});
export const directorManualEditImpactDecisionSchema = z.object({
    impactLevel: z.enum(["none", "low", "medium", "high"]),
    affectedArtifactIds: z.array(z.string()).default([]),
    minimalRepairPath: z.array(repairStepSchema).default([]),
    safeToContinue: z.boolean(),
    requiresApproval: z.boolean(),
    summary: z.string().min(1),
    riskNotes: z.array(z.string()).default([]),
    evidenceRefs: z.array(z.string()).default([]),
    confidence: z.number().min(0).max(1),
}) satisfies z.ZodType<AiManualEditImpactDecision>;
function formatManualEditContext(input: DirectorManualEditImpactPromptInput): string {
    return JSON.stringify({
        novelId: input.inventory.novelId,
        novelTitle: input.inventory.novelTitle,
        changedChapters: input.editInventory.changedChapters,
        relatedArtifacts: input.inventory.artifacts
            .filter((artifact) => (input.editInventory.changedChapters.some((chapter) => (chapter.relatedArtifactIds.includes(artifact.id)
            || artifact.targetId === chapter.chapterId
            || artifact.dependsOn?.some((dependency) => chapter.relatedArtifactIds.includes(dependency.artifactId))))))
            .map((artifact) => ({
            id: artifact.id,
            artifactType: artifact.artifactType,
            targetType: artifact.targetType,
            targetId: artifact.targetId,
            status: artifact.status,
            source: artifact.source,
            protectedUserContent: artifact.protectedUserContent,
            dependsOn: artifact.dependsOn,
        })),
        productionSignals: {
            hasStoryMacro: input.inventory.hasStoryMacro,
            hasCharacters: input.inventory.hasCharacters,
            hasVolumeStrategy: input.inventory.hasVolumeStrategy,
            hasChapterPlan: input.inventory.hasChapterPlan,
            draftedChapterCount: input.inventory.draftedChapterCount,
            pendingRepairChapterCount: input.inventory.pendingRepairChapterCount,
        },
    }, null, 2);
}
export const directorManualEditImpactPrompt: PromptAsset<DirectorManualEditImpactPromptInput, AiManualEditImpactDecision> = {
    id: "novel.director.manual_edit_impact",
    version: "v2",
    taskType: "planner",
    mode: "structured",
    language: "ka",
    contextPolicy: {
        maxTokensBudget: 3600,
        requiredGroups: ["manual_edit_inventory"],
    },
    contextRequirements: [
        { group: "manual_edit_inventory", required: true, priority: 100 },
        { group: "workspace_inventory", priority: 80 },
    ],
    outputSchema: directorManualEditImpactDecisionSchema,
    render: (_input, context) => [
        new SystemMessage([
            "You are a manual editing impact analyzer for the feature-length novel autodirector.",
            "Your task is to determine which subsequent products will be affected by user changes based on the deterministic editing manifest and product dependencies, and provide the minimum repair path.",
            "",
            "Must comply with:",
            "1. Give priority to protecting the text that has been modified by the user, and do not recommend directly overwriting user content.",
            "2. Make judgments only based on the chapters, products, dependencies and status in the list. Do not make up non-existent chapters or assets.",
            "3. If it is just a slight polish, it is recommended to review or update the continuity instead of redoing the macro plan.",
            "4. If the change may affect character motivation, key foreshadowing, promise fulfillment, or subsequent chapter missions, indicate the minimum scope that requires review.",
            "5. Output strict JSON, do not output Markdown or additional explanations.",
        ].join("\n")),
        new HumanMessage([
            "Please evaluate the impact scope and continuation path after manual modification by the user.",
            "",
            "[Hierarchical context]",
            renderSelectedContextBlocks(context),
            "",
            "Please output structured judgments: impactLevel, affectedArtifactIds, minimalRepairPath, safeToContinue, requiresApproval, summary, riskNotes, evidenceRefs, confidence.",
        ].join("\n")),
    ],
    structuredOutputHint: {
        example: (input: DirectorManualEditImpactPromptInput) => ({
            impactLevel: input.editInventory.changedChapters.length > 0 ? "low" : "none",
            affectedArtifactIds: input.editInventory.changedChapters.flatMap((chapter) => chapter.relatedArtifactIds),
            minimalRepairPath: input.editInventory.changedChapters.length > 0
                ? [{
                        action: "review_recent_chapters",
                        label: "Review recently modified chapters",
                        reason: "After the user has modified the text, first confirm the continuity of this chapter and whether the review results are still available.",
                        affectedScope: input.editInventory.changedChapters.map((chapter) => `chapter:${chapter.chapterId}`).join(","),
                        requiresApproval: false,
                    }]
                : [],
            safeToContinue: input.editInventory.changedChapters.length === 0,
            requiresApproval: false,
            summary: input.editInventory.changedChapters.length > 0
                ? "If a change in the chapter text is detected, it is recommended to do a partial review first." : "No manual text changes were detected that require processing.",
            riskNotes: [],
            evidenceRefs: ["manual_edit_inventory"],
            confidence: 0.72,
        }),
    }
};
export function buildDirectorManualEditImpactContextBlocks(input: DirectorManualEditImpactPromptInput) {
    const content = formatManualEditContext(input);
    return [
        {
            id: "manual_edit_inventory",
            group: "manual_edit_inventory",
            priority: 100,
            required: true,
            estimatedTokens: Math.ceil(content.length / 4),
            content,
        },
    ];
}

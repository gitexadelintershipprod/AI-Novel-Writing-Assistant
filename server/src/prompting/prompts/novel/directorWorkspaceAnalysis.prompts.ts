import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { z } from "zod";
import type { DirectorWorkspaceInventory, AiWorkspaceInterpretation, } from "@ai-novel/shared/types/directorRuntime";
import { DIRECTOR_ARTIFACT_TYPES, } from "@ai-novel/shared/types/directorRuntime";
import type { PromptAsset } from "../../core/promptTypes";
import { renderSelectedContextBlocks } from "../../core/renderContextBlocks";
export interface DirectorWorkspaceAnalysisPromptInput {
    inventory: DirectorWorkspaceInventory;
}
const artifactTypeSchema = z.enum(DIRECTOR_ARTIFACT_TYPES);
export const directorWorkspaceInterpretationSchema = z.object({
    productionStage: z.enum([
        "empty",
        "has_seed",
        "has_contract",
        "has_macro",
        "has_characters",
        "has_volume_plan",
        "has_chapter_plan",
        "has_drafts",
        "needs_repair",
        "unknown",
    ]),
    missingArtifacts: z.array(artifactTypeSchema).default([]),
    staleArtifacts: z.array(artifactTypeSchema).default([]),
    protectedUserContent: z.array(z.string()).default([]),
    recommendedAction: z.object({
        action: z.enum([
            "generate_candidates",
            "create_book_contract",
            "complete_story_macro",
            "prepare_characters",
            "build_volume_strategy",
            "build_chapter_tasks",
            "continue_chapter_execution",
            "review_recent_chapters",
            "repair_scope",
            "ask_user_confirmation",
        ]),
        reason: z.string().min(1),
        affectedScope: z.string().nullable().optional(),
        riskLevel: z.enum(["low", "medium", "high"]),
    }),
    confidence: z.number().min(0).max(1),
    evidenceRefs: z.array(z.string()).default([]),
    summary: z.string().min(1),
    riskNotes: z.array(z.string()).default([]),
}) satisfies z.ZodType<AiWorkspaceInterpretation>;
function formatInventory(inventory: DirectorWorkspaceInventory): string {
    return JSON.stringify({
        novelId: inventory.novelId,
        novelTitle: inventory.novelTitle,
        hasBookContract: inventory.hasBookContract,
        hasStoryMacro: inventory.hasStoryMacro,
        hasCharacters: inventory.hasCharacters,
        hasVolumeStrategy: inventory.hasVolumeStrategy,
        hasChapterPlan: inventory.hasChapterPlan,
        chapterCount: inventory.chapterCount,
        draftedChapterCount: inventory.draftedChapterCount,
        approvedChapterCount: inventory.approvedChapterCount,
        pendingRepairChapterCount: inventory.pendingRepairChapterCount,
        hasActivePipelineJob: inventory.hasActivePipelineJob,
        hasActiveDirectorRun: inventory.hasActiveDirectorRun,
        hasWorldBinding: inventory.hasWorldBinding,
        hasSourceKnowledge: inventory.hasSourceKnowledge,
        hasContinuationAnalysis: inventory.hasContinuationAnalysis,
        ledgerSummary: {
            missingArtifactTypes: inventory.missingArtifactTypes,
            staleArtifacts: inventory.staleArtifacts.map((artifact) => ({
                id: artifact.id,
                artifactType: artifact.artifactType,
                targetType: artifact.targetType,
                targetId: artifact.targetId,
                dependsOn: artifact.dependsOn,
            })),
            protectedUserContentArtifacts: inventory.protectedUserContentArtifacts.map((artifact) => ({
                id: artifact.id,
                artifactType: artifact.artifactType,
                targetType: artifact.targetType,
                targetId: artifact.targetId,
                source: artifact.source,
            })),
            needsRepairArtifacts: inventory.needsRepairArtifacts.map((artifact) => ({
                id: artifact.id,
                targetType: artifact.targetType,
                targetId: artifact.targetId,
            })),
        },
        artifactTypes: inventory.artifacts.map((artifact) => ({
            id: artifact.id,
            artifactType: artifact.artifactType,
            targetType: artifact.targetType,
            targetId: artifact.targetId,
            status: artifact.status,
            source: artifact.source,
            contentRef: artifact.contentRef,
        })),
    }, null, 2);
}
export const directorWorkspaceAnalysisPrompt: PromptAsset<DirectorWorkspaceAnalysisPromptInput, AiWorkspaceInterpretation> = {
    id: "novel.director.workspace_analysis",
    version: "v2",
    taskType: "planner",
    mode: "structured",
    language: "ka",
    contextPolicy: {
        maxTokensBudget: 3200,
        requiredGroups: ["workspace_inventory"],
    },
    contextRequirements: [
        { group: "workspace_inventory", required: true, priority: 100 },
    ],
    outputSchema: directorWorkspaceInterpretationSchema,
    render: (_input, context) => [
        new SystemMessage([
            "You are the workspace analyzer for the novel autodirector runtime.",
            "Your task is to determine based on the deterministic inventory what stage of production the novel is currently in, what directorial artifacts are missing, what content needs to be protected, and what the best next steps should be.",
            "",
            "Must comply with:",
            "1. Don\u2019t make up assets that don\u2019t exist in inventory.",
            "2. If the main text already exists, user content protection must be considered and do not suggest overwriting easily.",
            "3. Quality issues, commitment issues or repair issues should not directly freeze the entire book. The affected scope and minimum repair path should be given first.",
            "4. The output must be strict JSON, do not output Markdown or explanations.",
        ].join("\n")),
        new HumanMessage([
            "Please analyze the current novel workspace.",
            "",
            "[Hierarchical context]",
            renderSelectedContextBlocks(context),
            "",
            "Please output structured judgments: productionStage, missingArtifacts, staleArtifacts, protectedUserContent, recommendedAction, confidence, evidenceRefs, summary, riskNotes.",
        ].join("\n")),
    ],
    structuredOutputHint: {
        example: (input: DirectorWorkspaceAnalysisPromptInput) => ({
            productionStage: input.inventory.hasVolumeStrategy ? "has_volume_plan" : "has_seed",
            missingArtifacts: input.inventory.missingArtifactTypes.length > 0
                ? input.inventory.missingArtifactTypes
                : input.inventory.hasBookContract ? [] : ["book_contract"],
            staleArtifacts: input.inventory.staleArtifacts.map((artifact) => artifact.artifactType),
            protectedUserContent: input.inventory.protectedUserContentArtifacts.length > 0
                ? input.inventory.protectedUserContentArtifacts.map((artifact) => artifact.id)
                : input.inventory.draftedChapterCount > 0 ? ["Already has chapter text"] : [],
            recommendedAction: {
                action: input.inventory.hasBookContract ? "continue_chapter_execution" : "create_book_contract",
                reason: "Select the minimum next step based on current asset integrity.",
                affectedScope: "novel",
                riskLevel: "low",
            },
            confidence: 0.78,
            evidenceRefs: ["workspace_inventory"],
            summary: "Some pre-production assets have been completed in the current workspace, and the next step of directing products needs to be completed.",
            riskNotes: [],
        }),
    }
};
export function buildDirectorWorkspaceAnalysisContextBlocks(input: DirectorWorkspaceAnalysisPromptInput) {
    return [
        {
            id: "workspace_inventory",
            group: "workspace_inventory",
            priority: 100,
            required: true,
            estimatedTokens: Math.ceil(formatInventory(input.inventory).length / 4),
            content: formatInventory(input.inventory),
        },
    ];
}

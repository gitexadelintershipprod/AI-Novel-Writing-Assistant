import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import type { PromptAsset } from "../../../core/promptTypes";
import { renderSelectedContextBlocks } from "../../../core/renderContextBlocks";
import { createBookVolumeSkeletonSchema } from "../../../../services/novel/volume/volumeGenerationSchemas";
import { type VolumeSkeletonPromptInput } from "./shared";
import { buildVolumeSkeletonContextBlocks } from "./contextBlocks";
import { NOVEL_PROMPT_BUDGETS } from "../promptBudgetProfiles";
export function createVolumeSkeletonPrompt(targetVolumeCount: number): PromptAsset<VolumeSkeletonPromptInput, ReturnType<typeof createBookVolumeSkeletonSchema>["_output"]> {
    return {
        id: "novel.volume.skeleton",
        version: "v4",
        taskType: "planner",
        mode: "structured",
        language: "ka",
        contextPolicy: {
            maxTokensBudget: NOVEL_PROMPT_BUDGETS.volumeSkeleton,
            requiredGroups: ["book_contract", "strategy_context", "chapter_budget"],
            preferredGroups: ["macro_constraints", "existing_volume_window", "guidance"],
        },
        outputSchema: createBookVolumeSkeletonSchema(targetVolumeCount),
        render: (_input, context) => [
            new SystemMessage([
                "You are the volume-level skeleton planning assistant for long online articles, responsible for breaking down the upstream strategy of the entire book into an executable volume-level skeleton.",
                "",
                "[Task Boundary]",
                `Must be strictly output ${targetVolumeCount} Volume, no more or less.`,
                "At the current stage, only \"volume-level skeleton planning\" is being done, and it cannot be expanded into chapter outlines, scene outlines, character biographies, or specific dialogues.",
                "The summary of each volume must be a volume-level summary and cannot be written as a detailed plot retelling.",
                "Only write 1-2 sentences in each text field, and a single field cannot exceed 120 words; openPayoffs can have a maximum of 8 entries, each of which cannot exceed 80 words.",
                "End JSON immediately after completing the last volume, no continuation of chapters, text, self-examination process, or paraphrase.",
                "",
                "[Field requirements]",
                "Each volume must completely contain the following fields and cannot be omitted, merged or renamed:",
                "title、summary、openingHook、mainPromise、primaryPressureSource、coreSellingPoint、escalationMode、protagonistChange、midVolumeRisk、climax、payoffType、nextVolumeHook、resetPoint、openPayoffs。",
                "",
                "\u3010Planning Principles\u3011",
                "1. The skeleton must strictly obey the upstream strategy and book contract.",
                "2. Hard planning determines the main line advancement, stage goals, core cause and effect, and key fulfillment sequence that cannot be violated.",
                "3. Soft planning determines the rhythm packaging, conflict expression, emotional color and selling point presentation of each volume.",
                "4. The output must reflect: hard advancement and continuity, soft experience changes.",
                "",
                "[Quality requirements for sub-rolls]",
                "1. Each volume must have an independently established reading commitment and cannot be just a transitional volume.",
                "2. The coreSellingPoint of two adjacent volumes should not be repeated and must reflect the difference in selling points.",
                "3. The primaryPressureSource or escalationMode of two adjacent volumes should be changed as much as possible to avoid homogeneous upgrades.",
                "4. Each volume must answer: why this volume deserves its own existence.",
                "5. The overall sub-volume must form a clear progression: set a hook at the beginning, raise the price in the middle, amplify irreversible risks in the later period, and increase the density of cashing out near the end.",
                "6. If the target number of volumes is 3-4, it must reflect a clear three-act or four-part structure and cannot be compressed into an opening volume and an ending volume.",
                "7. If the target number of volumes is 12 or more, the rotation of selling points, pressure sources, and stage redemption density must be reflected to avoid repeating the same upgrade in multiple volumes.",
                "",
                "[Rhythm requirements]",
                "1. The first volume must serve as a strong opening, quickly establishing the main selling point, core dilemma and reasons for updating.",
                "2. The middle volume cannot only be responsible for carrying the plot, but must provide new changes in the situation, new pressure or new realization.",
                "3. The second part of the volume must strengthen the sense of irreversibility and avoid just repeating the routines of the early and mid-term.",
                "4. nextVolumeHook must push readers to naturally enter the next volume, and cannot just leave them in suspense.",
                "",
                "\u3010Prohibited matters\u3011",
                "It is forbidden to invent big settings without context.",
                "Early overdrafts are prohibited for upstream core payoffs that are not allowed to be cashed out.",
                "It is forbidden to allow multiple volumes to assume the same conflicting function without layer changes.",
                "It is forbidden to write resetPoint as a \"return to calm\" empty talk. It must explain how the end state of the volume reorganizes the starting point of the next volume.",
                "",
                "Your goal is not to write a long plot, but to structure the book into volumes.",
            ].join("\n")),
            new HumanMessage([
                "Please plan the volume structure for the entire book based on the following context.",
                "",
                "[Output requirements]",
                `- Strict output ${targetVolumeCount} volume`,
                "- Do not add fields other than schema",
                "- The information in each volume should be concise, clear and actionable",
                "- Prioritize ensuring the differences, progressive relationships and commercial readability of volumes",
                "",
                "[Volume Skeleton Context]",
                renderSelectedContextBlocks(context),
            ].join("\n")),
        ]
    };
}
export { buildVolumeSkeletonContextBlocks };

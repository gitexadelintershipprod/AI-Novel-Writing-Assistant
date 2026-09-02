import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import type { PromptAsset } from "../../../core/promptTypes";
import type { VolumeCountRange } from "@ai-novel/shared/types/novel";
import { MAX_VOLUME_COUNT } from "@ai-novel/shared/types/volumePlanning";
import { renderSelectedContextBlocks } from "../../../core/renderContextBlocks";
import { createVolumeStrategyCritiqueSchema, createVolumeStrategySchema, } from "../../../../services/novel/volume/volumeGenerationSchemas";
import { type VolumeStrategyCritiquePromptInput, type VolumeStrategyPromptInput, } from "./shared";
import { buildVolumeStrategyContextBlocks, buildVolumeStrategyCritiqueContextBlocks, } from "./contextBlocks";
import { NOVEL_PROMPT_BUDGETS } from "../promptBudgetProfiles";
interface CreateVolumeStrategyPromptConfig {
    maxVolumeCount?: number;
    allowedVolumeCountRange?: VolumeCountRange | null;
    decisionVolumeCountRange?: VolumeCountRange | null;
    fixedRecommendedVolumeCount?: number | null;
    hardPlannedVolumeRange?: VolumeCountRange | null;
}
export function createVolumeStrategyPrompt(config: CreateVolumeStrategyPromptConfig = {}): PromptAsset<VolumeStrategyPromptInput, ReturnType<typeof createVolumeStrategySchema>["_output"]> {
    const maxVolumeCount = config.maxVolumeCount ?? MAX_VOLUME_COUNT;
    const allowedVolumeCountRange = config.allowedVolumeCountRange ?? {
        min: 1,
        max: maxVolumeCount,
    };
    const decisionVolumeCountRange = config.decisionVolumeCountRange ?? allowedVolumeCountRange;
    const fixedRecommendedVolumeCount = typeof config.fixedRecommendedVolumeCount === "number"
        ? config.fixedRecommendedVolumeCount
        : null;
    const hardPlannedVolumeRange = config.hardPlannedVolumeRange ?? {
        min: 1,
        max: maxVolumeCount,
    };
    return {
        id: "novel.volume.strategy",
        version: "v3",
        taskType: "planner",
        mode: "structured",
        language: "ka",
        contextPolicy: {
            maxTokensBudget: NOVEL_PROMPT_BUDGETS.volumeStrategy,
            requiredGroups: ["book_contract", "volume_count_guidance"],
            preferredGroups: ["macro_constraints", "existing_volume_window", "guidance"],
            dropOrder: ["existing_volume_window"],
        },
        outputSchema: createVolumeStrategySchema({
            maxVolumeCount,
            allowedVolumeCountRange,
            decisionVolumeCountRange,
            fixedRecommendedVolumeCount,
            hardPlannedVolumeRange,
        }),
        render: (_input, context) => [
            new SystemMessage([
                "You are a strategic planning assistant for long-form online articles.",
                "Your task is not to directly generate the final volume structure, but to first determine how many volumes the entire book should be divided into, which volumes require hard planning, which volumes only retain soft planning, and come up with a set of volume division strategies suitable for serialization.",
                "",
                "[Task Boundary]",
                "At the current stage, we are only working on a volume division strategy at the level of the entire book. We will not expand the skeleton of a single volume, expand chapters, or write down a detailed plot outline.",
                "Your output should serve the subsequent volume skeleton generation, so the focus is on: volume number, stage division, planning depth, and pre- and post-production control methods.",
                "Output only strict JSON, no Markdown, explanations, comments, or extra text.",
                "",
                "\u3010Hard requirement\u3011",
                fixedRecommendedVolumeCount == null
                    ? `recommendedVolumeCount must fall within the structure recommendation range ${decisionVolumeCountRange.min}-${decisionVolumeCountRange.max} between and equal to volumes.length.`
                    : `recommendedVolumeCount must be strictly equal to ${fixedRecommendedVolumeCount}, and equal to volumes.length.`,
                `hardPlannedVolumeCount must fall within ${hardPlannedVolumeRange.min}-${hardPlannedVolumeRange.max} between and cannot be greater than recommendedVolumeCount.`,
                "The planningMode of the first hardPlannedVolumeCount volume must be hard and subsequent volumes must be soft.",
                "If recommendedVolumeCount is large, enough soft planning space must be reserved in the second half and cannot be hard-coded in advance.",
                "If the user preferred volume count is given in the context, it must be strictly adopted and the volume number must not be changed without authorization.",
                "If the context gives a respected existing volume count, this must also be strictly followed. This volume number represents the structure of the draft that the author has confirmed.",
                "If there is no fixed number of volumes, you must make decisions on story structure within the structure recommendation range, and do not just divide the volumes by average division by the number of chapters.",
                "For chapters 60 and above, at least a three-part structure should be retained by default to avoid being compressed into \"opening volume + ending volume\" and causing the middle section to lose focus.",
                "For super-long novels, it is necessary to avoid compressing a large number of chapters into a few huge volumes; do not let a single volume be so thick that it loses the sense of stages, reward nodes, and volume-level workbench significance.",
                "If the Story macro exists, each volume.roleLabel must map to one of the main selling points, conflict escalation, growth path, or ending flavor.",
                "If the Story macro is none, do not invent a detailed mainline stage; use a more conservative number of volumes and higher uncertainty to illustrate the risks caused by the lack of a mainline skeleton.",
                "",
                "\u3010Core Goal\u3011",
                "1. The strategy must give priority to serving the motivation of serial reading, rather than writing half of the book at once.",
                "2. The volume dividing strategy must take into account the opening grip, mid-term battery life, late-stage upgrade space, and long-term serialization schedulability.",
                "3. Hard planning is used to lock in the most critical commitments, selling points, promotion order and rhythm stability in the early stage.",
                "4. Soft planning is used to retain the flexibility of subsequent volumes to facilitate adjustments based on serial feedback, changes in length, strengthening of selling points, and natural growth of the plot.",
                "",
                "\u3010Planning Principles\u3011",
                "1. recommendedVolumeCount is not an even distribution of plots, but is determined based on stage commitments, selling point switching, situation escalation and staged fulfillment.",
                "2. hardPlannedVolumeCount only covers the number of early volumes that really need to be locked in advance, and does not require more mechanically.",
                "3. The further forward the volume is, the more clear control is needed; the further back the volume is, the more room for adjustment should be reserved.",
                "4. The volume division strategy must have clear starting points, commitments, and progression in the first few volumes to avoid falling into a long-term layout at the beginning of the book.",
                "5. Don\u2019t let soft volumes become empty placeholders. They should still retain clear stage responsibilities, just without the specific details being hard-coded up front.",
                "",
                "[Key judgment items]",
                "1. Is this book suitable for rapid advancement with short volumes or for larger volumes to be expanded in stages? However, the decision must respect the allowable range and fixed volume constraints given by the context.",
                "2. Whether the first few volumes undertake key tasks such as opening the book, establishing the main selling point, fulfilling the first phase, expanding the world, and upgrading the structure, etc., and whether hard planning is necessary.",
                "3. Whether there is greater flexibility in the middle and later stages, it is suitable to retain soft planning to avoid excessive overdraft in the early stage.",
                "4. Whether the number of volumes matches the subject matter, density of main selling points, growth span, conflict level and serialization mode.",
                "5. Determine whether the story requires three acts, staged dungeons, map/power expansion, power growth ladders, relationship stage changes, or long-term villain hierarchies.",
                "6. Whether the roleLabel of each volume can rebate the selling point, long-term conflict, advancement loop, growth path or ending flavor of the Story macro; when the Story macro is missing, the uncertainties must be written into uncertainties.",
                "",
                "\u3010Quality requirements\u3011",
                "1. The overall strategy must reflect the progression of stages and cannot be just a general allocation of \"hard in the front and soft in the back\".",
                "2. Each volume item should reflect the volume's stage responsibilities in the entire book, rather than simply \"advancing the plot\".",
                "3. The hard volume should be more clear, and the soft volume should retain the direction but not write down the details.",
                "4. Do not invent major settings or additional main lines out of context.",
                "5. Provide conservative but complete strategies even when information is insufficient.",
                "6. If the chapter budget is large, the default should be to increase the number of volumes to maintain the stage granularity of each volume, instead of compressing the super long article into several volumes.",
            ].join("\n")),
            new HumanMessage([
                "Please output the volume division strategy for the entire book based on the following context.",
                "",
                "[Output requirements]",
                "- Only output strict JSON",
                fixedRecommendedVolumeCount == null
                    ? `- recommendedVolumeCount must fall within the structure recommendation range ${decisionVolumeCountRange.min}-${decisionVolumeCountRange.max} between`
                    : `- recommendedVolumeCount must be strictly equal to ${fixedRecommendedVolumeCount}`,
                "- volumes.length must equal recommendedVolumeCount",
                `- hardPlannedVolumeCount must fall within ${hardPlannedVolumeRange.min}-${hardPlannedVolumeRange.max} between`,
                "- The first hardPlannedVolumeCount volume must be hard, subsequent volumes must be soft",
                "- Prioritize ensuring early grip, mid-term battery life and late-stage schedulability",
                "",
                "[Planning context]",
                renderSelectedContextBlocks(context),
            ].join("\n")),
        ]
    };
}
export const volumeStrategyCritiquePrompt: PromptAsset<VolumeStrategyCritiquePromptInput, ReturnType<typeof createVolumeStrategyCritiqueSchema>["_output"]> = {
    id: "novel.volume.strategy.critique",
    version: "v2",
    taskType: "review",
    mode: "structured",
    language: "ka",
    contextPolicy: {
        maxTokensBudget: NOVEL_PROMPT_BUDGETS.volumeStrategyCritique,
        requiredGroups: ["book_contract", "strategy_context"],
        preferredGroups: ["macro_constraints", "existing_volume_window", "guidance"],
    },
    outputSchema: createVolumeStrategyCritiqueSchema(),
    render: (_input, context) => [
        new SystemMessage([
            "You are a review assistant for long-form web writing strategies.",
            "Your task is not to rewrite the volume strategy, but to identify key issues in the current strategy that will affect the stability of the long-form series, and to output the results of a structured review that can be revised later.",
            "",
            "[Task Boundary]",
            "Only examine whether the current roll strategy exists: premature lock-in, imbalance in early and late planning, homogeneous returns, broken stage upgrades, distortion in roll allocation, loss of meaning in soft planning, insufficient uncertainty statements, etc.",
            "Do not rewrite the entire strategy, do not output a new complete paper scheme, do not output Markdown, explanations, comments or additional text.",
            "Only output strict JSON.",
            "",
            "[Output requirements]",
            "Each issue in issues must completely contain the four fields of targetRef, severity, title, and detail, and cannot be omitted or renamed.",
            "severity Use one of low, medium, or high.",
            "If the overall strategy is acceptable, you can also output empty issues, but do not create fake issues just to make up for the problem.",
            "",
            "[Review Objective]",
            "The focus is to determine whether the current volume division strategy truly serves the serialization of long-form web articles, rather than superficially completing hard/soft division.",
            "Your review should focus on structural risks, not on how well worded it is.",
            "",
            "[Key inspection items]",
            "1. Whether the second half of the book is locked prematurely, causing the soft plan to exist in name but in reality.",
            "2. Whether hardPlannedVolumeCount is too much or too little, resulting in instability in the early stage or insufficient flexibility in the later stage.",
            "3. Whether recommendedVolumeCount clearly mismatches the subject volume, selling point density, growth span and conflict level.",
            "4. Do the previous volumes have a clear starting point, establishment of main selling points, and phased commitment advancement? If not, it should be regarded as a high-priority issue.",
            "5. Are the responsibilities of each volume stage too homogeneous? For example, for multiple volumes in a row, they just \"continue to advance\" and \"continue to upgrade.\"",
            "6. Whether there are upgrade gaps, stage goal gaps, reward density imbalances, or duplication of functions between volumes.",
            "7. Does the soft volume only have empty directions and does not retain real schedulable flexibility?",
            "8. Is there a lack of acknowledgment of uncertainty in the strategy, such as overwriting the mid- to late-stage development that is not yet stable?",
            "",
            "[targetRef rule]",
            "targetRef must point to the problem location as accurately as possible.",
            "Can point to the overall strategy, for example: strategy/recommendedVolumeCount/hardPlannedVolumeCount.",
            "It can also point to specific volumes, for example: volumes[0] / volumes[3] / volumes[5].planningMode.",
            "Don't use vague references, such as \"the front part\" or \"the back there.\"",
            "",
            "\u3010detail requirements\u3011",
            "detail must explain: what the problem is, why it is a structural risk, and what serial consequences it will cause.",
            "Don\u2019t just write empty judgments such as \u201Cthere is a problem with the rhythm\u201D, \u201Cthe planning is too poor\u201D and \u201Cneeds optimization\u201D.",
            "Try to point out the structural nature of the problem, for example:",
            "- Insufficient early commitment makes it difficult for readers to establish a reason to continue reading",
            "- The middle and later sections were written to death prematurely, which reduced the room for adjustments in the middle of the series.",
            "- Duplication of responsibilities in adjacent volume stages leads to homogeneous reward experience",
            "",
            "\u3010Quality requirements\u3011",
            "1. Only focus on key issues that really affect the structure and avoid being overwhelmed by details.",
            "2. Do not split similar issues into multiple similar issues.",
            "3. If a problem affects the entire strategy, it should be pointed out with a higher-level targetRef instead of reporting errors in fragments.",
            "4. The review conclusion must have a web-text serialization perspective, with priority given to grip, battery life, upgrades, fulfillment and schedulability.",
            "5. You can be conservative when there is insufficient information, but do not overlook obvious structural risks.",
        ].join("\n")),
        new HumanMessage([
            "Please review the structural risks of the current roll strategy based on the following context and output a list of issues.",
            "",
            "[Output requirements]",
            "- Only output strict JSON",
            "- Each issue must contain targetRef, severity, title, detail",
            "- Only point out key issues that really affect the stability of the roll strategy",
            "- Don\u2019t rewrite the policy, just review it",
            "",
            "[Context of sub-volume strategy to be reviewed]",
            renderSelectedContextBlocks(context),
        ].join("\n")),
    ]
};
export { buildVolumeStrategyContextBlocks, buildVolumeStrategyCritiqueContextBlocks, };

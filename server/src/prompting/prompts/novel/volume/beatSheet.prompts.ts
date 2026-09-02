import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import type { PromptAsset } from "../../../core/promptTypes";
import { renderSelectedContextBlocks } from "../../../core/renderContextBlocks";
import { createVolumeBeatSheetSchema } from "../../../../services/novel/volume/volumeGenerationSchemas";
import { validateBeatSheetChapterCoverage } from "../../../../services/novel/volume/volumeBeatSheetChapterBudget";
import { VOLUME_BEAT_OPTIONAL_SLOT_KEYS, VOLUME_BEAT_REQUIRED_SLOT_KEYS, VOLUME_BEAT_SLOT_DEFINITIONS, getVolumeBeatRoleLabel, } from "@ai-novel/shared/types/volumeBeatSlots";
import { type VolumeBeatSheetPromptInput } from "./shared";
import { buildVolumeBeatSheetContextBlocks } from "./contextBlocks";
import { NOVEL_PROMPT_BUDGETS } from "../promptBudgetProfiles";
const REQUIRED_SLOT_LINES = VOLUME_BEAT_REQUIRED_SLOT_KEYS
    .map((key) => `- ${key}（${getVolumeBeatRoleLabel(key)}）`)
    .join("\n");
const OPTIONAL_SLOT_LINES = VOLUME_BEAT_OPTIONAL_SLOT_KEYS
    .map((key) => `- ${key}（${getVolumeBeatRoleLabel(key)}）`)
    .join("\n");
const SLOT_ORDER_LINE = VOLUME_BEAT_SLOT_DEFINITIONS
    .map((slot) => slot.key)
    .join(" -> ");
export const volumeBeatSheetPrompt: PromptAsset<VolumeBeatSheetPromptInput, ReturnType<typeof createVolumeBeatSheetSchema>["_output"]> = {
    id: "novel.volume.beat_sheet",
    version: "v4",
    taskType: "planner",
    mode: "structured",
    language: "ka",
    contextPolicy: {
        maxTokensBudget: NOVEL_PROMPT_BUDGETS.volumeBeatSheet,
        requiredGroups: ["book_contract", "target_volume", "target_chapter_count"],
        preferredGroups: ["macro_constraints", "strategy_context", "volume_window"],
        dropOrder: ["soft_future_summary"],
    },
    repairPolicy: {
        maxAttempts: 2,
    },
    semanticRetryPolicy: {
        maxAttempts: 1,
    },
    outputSchema: createVolumeBeatSheetSchema(),
    render: (input, context) => [
        new SystemMessage([
            "You are the rhythm planning assistant for single-volume web articles.",
            "Your task is not to write a chapter table of contents, nor to expand the plot summary, but to convert the \"volume skeleton\" into a beat sheet that can be used for subsequent chapters.",
            "beat is a phased rhythm task unit in the volume, representing the most important promotion responsibilities, reading functions and content that must be fulfilled within a chapter.",
            "",
            "[Task Boundary]",
            "At the current stage, only a single volume of beat sheet is generated. Specific chapters are not expanded, scene outlines are not written, character biographies are not added, and dialogues are not written.",
            "Each beat must serve the subsequent chapters, emphasizing \u2018what rhythmic tasks this chapter is to accomplish\u2019, rather than listing trivial events.",
            "Output only strict JSON, no Markdown, explanations, comments or extra fields.",
            "",
            "[Output format]",
            "{",
            '  "beats": [',
            "    {",
            '      "key": "open_hook",',
            "      \"label\": \"Unwinding Handle\",",
            "      \"title\": \"Night Market Seal\",",
            "      \"summary\": \"What this beat mainly advances, what its role is in the rhythm of the volume, and how it carries out the corresponding commitments in the volume's skeleton.\",",
            "      \"chapterSpanHint\": \"Chapter 1-2\",",
            "      \"mustDeliver\": [\"The key signal that the reader must perceive 1\", \"The situation or conflict that must be established 2\"]",
            "    }",
            "  ]",
            "}",
            "",
            "[Fixed functional slots]",
            "The rhythm function key and label must use system fixed slots, and function names cannot be freely invented.",
            "Required slots (must all appear and can only appear once each):",
            REQUIRED_SLOT_LINES,
            "Optional slots (use up to 2 for extra stages you really need for this volume):",
            OPTIONAL_SLOT_LINES,
            `Recommended order:${SLOT_ORDER_LINE}`,
            "",
            "\u3010Hard requirement\u3011",
            "1. Beats must output 6-8 beats and must cover all 6 required slots.",
            "2. Each beat must completely contain six fields: key, label, title, summary, chapterSpanHint, and mustDeliver.",
            "3. The key can only use the fixed slots listed above; the label must be equal to the stable function name of the slot, for example, open_hook corresponds to \"opening hook\".",
            "4. The title must be a customized short title of this volume, within 8 words, reflecting the specific selling points or situations of this volume, and cannot just repeat the label.",
            "5. The summary must clearly state: what this beat advances, what rhythmic responsibilities it assumes, and what type of commitment or pressure it is related to in the skeleton of the volume.",
            "6. chapterSpanHint must be a non-empty string, using expressions similar to \"Chapter 1-2\", \"Chapter 3\" and \"Chapter 7-8\".",
            "7. mustDeliver must be 1-6 non-empty strings. Prioritize writing the situation, signal, pressure, direction, and reader perception that must be fulfilled. Don\u2019t just write abstract slogans.",
            "8. The rhythm responsibilities of each beat must be different, and multiple beats cannot be written as 'conflict escalation' or 'continue to advance'.",
            "9. Don\u2019t write the pre-climax squeeze as early climax, and don\u2019t write the curling hook as a general blank.",
            `10. All chapterSpanHint must cover continuously from chapter 1 to chapter ${input.targetChapterCount} chapter, you can't just cover a few opening chapters.`,
            "11. Summary should be limited to 40-120 words; each mustDeliver should be limited to 12-80 words, and expansion into plot text is prohibited.",
            "12. The entire output only retains the information required for 6-8 rhythm sections, and the JSON ends immediately after completing the last beat.",
            "",
            "[Requirements for undertaking roll frames]",
            "1. open_hook must inherit openingHook and mainPromise in target_volume.",
            "2. The first_escalation and the middle and front beats must gradually reflect the primaryPressureSource and escalationMode.",
            "3. midpoint_turn must reflect midVolumeRisk or an equivalent situation turn, and cannot just be a linear increase.",
            "4. The climax must take on the climax promise and make it clear and fulfilled.",
            "5. end_hook must inherit nextVolumeHook and form the next volume entrance through resetPoint or endgame reorganization.",
            "",
            "\u3010Quality requirements\u3011",
            "1. Each beat must answer: why this section must exist.",
            "2. Adjacent beats should form a progressive or turning relationship, rather than being tautologically repeated.",
            "3. The rhythm should reflect the hook and commitment in the front section, shifting gears and raising prices in the middle section, squeezing and cashing out in the back section, and leaving an entrance at the end.",
            "4. The title should be specific to this volume, such as \"Securing the Seal in the Night Market\" and \"Starting the Sect Trial\". Do not output functions such as \"Opening Handle\" and \"First Upgrade\" for review.",
            "5. Complete fields must be provided when the information is insufficient, but they should be conservative and do not create large settings that are out of context.",
            "",
            `Current volume target chapter count: ${input.targetChapterCount}.`,
            `chapterSpanHint must use volume-local numbering only, start from 1 inside the current volume, and never exceed ${input.targetChapterCount}. Never use whole-book absolute chapter numbers.`,
        ].join("\n")),
        new HumanMessage([
            "Please generate a single volume beat sheet for the current target volume based on the following context.",
            "",
            "[Output requirements]",
            "- Output JSON only",
            "- Do not add fields outside the schema",
            "- key/label uses fixed function slots, title writes a customized short title for this volume",
            "- beats are rhythm task segments, not chapter lists",
            "- Give priority to ensuring that the relationship with the volume skeleton is clear, the rhythm and responsibilities are clear, and the chapters can be separated later",
            "",
            "[Current volume rhythm board context]",
            `- Current volume target chapter count: ${input.targetChapterCount}`,
            "- chapterSpanHint must stay within this volume only; do not use whole-book absolute chapter numbers",
            `- all beat spans together must cover chapters 1-${input.targetChapterCount} of this volume`,
            "",
            renderSelectedContextBlocks(context),
        ].join("\n")),
    ],
    postValidate: (output, input) => {
        const coverage = validateBeatSheetChapterCoverage({
            beatSheet: output,
            targetChapterCount: input.targetChapterCount,
        });
        if (!coverage.accepted) {
            throw new Error(coverage.message ?? "The chapter span of the current volume's rhythm board does not cover the target number of chapters.");
        }
        return output;
    }
};
export { buildVolumeBeatSheetContextBlocks };

import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import type { ChapterPatchRepairPlan } from "@ai-novel/shared/types/chapterPatchRepair";
import { chapterPatchRepairPlanSchema } from "@ai-novel/shared/types/chapterPatchRepair";
import type { PromptAsset } from "../../core/promptTypes";
import { renderSelectedContextBlocks } from "../../core/renderContextBlocks";
import { NOVEL_PROMPT_BUDGETS } from "./promptBudgetProfiles";
export interface ChapterPatchRepairPromptInput {
    novelTitle: string;
    chapterTitle: string;
    chapterContent: string;
    issuesJson: string;
    modeHint?: string;
}
export const chapterPatchRepairPrompt: PromptAsset<ChapterPatchRepairPromptInput, ChapterPatchRepairPlan> = {
    id: "novel.review.patch",
    version: "v3",
    taskType: "repair",
    mode: "structured",
    language: "ka",
    contextPolicy: {
        maxTokensBudget: NOVEL_PROMPT_BUDGETS.chapterRepair,
        preferredGroups: [
            "repair_issues",
            "chapter_mission",
            "reader_experience",
            "repair_boundaries",
            "world_rules",
        ],
        dropOrder: [
            "recent_chapters",
            "participant_subset",
            "continuation_constraints",
        ],
    },
    outputSchema: chapterPatchRepairPlanSchema,
    slots: [
        {
            kind: "append" as const,
            key: "patch.customConstraints",
            label: "Custom patch supplementary requirements",
            description: "Append additional constraints on local patch generation, injected as context blocks. Leave blank to not append.",
            anchor: "repair_issues",
            default: "",
            maxLength: 2000,
            placeholderHint: "For example: each patch block should not exceed 3 sentences; fix pacing issues first, structure issues marked but not fixed...",
        },
    ],
    render: (input, context) => [
        new SystemMessage([
            "You are the partial editing editor of online novels.",
            "The current task is not to rewrite the entire chapter, but to output a partial patch plan that can be safely applied by the program.",
            "Only output strict JSON, no Markdown, paraphrases, or full text.",
            "",
            "[Patch Principles]",
            "1. Strategy must be patch_first by default.",
            "2. Each targetExcerpt in patches must be extracted verbatim from the current text, and should be long enough to ensure that it only appears once in the text.",
            "3. Replacement only replaces the fragment corresponding to targetExcerpt, do not rewrite irrelevant paragraphs; if the repair goal is to delete duplicate fragments, replacement can be an empty string.",
            "4. Prioritize fixing the key issues in the issue list that affect the progression of the main plot, continuity, character motivation, pacing, and ending hooks.",
            "4a. If the problem involves the reader experience contract, only modify the necessary fragments to complete the promisedReward, the protagonist's initiative, the key turning point, the net change, or the inheritance of the old hook, and retain the already valid reader rewards.",
            "5. No new major settings, core characters, or plot turns that conflict with chapter missions are allowed.",
            "6. Partial patches only deal with problems where complete segments can be located in the text; system risks such as the unavailability of the review system, lack of structured judgment, and insufficient scoring do not belong to the repair of text fragments.",
            "7. targetExcerpt must be a complete sentence or paragraph in the text, and cannot be a single word, title, punctuation or short phrase.",
            "8. If a source text fragment of at least 6 characters that appears uniquely in the text cannot be found, do not output patch; requiresFullRewrite is set to true and escalationReason is specified.",
            "9. If it cannot be safely fixed with a partial patch, requireFullRewrite is set to true and the escalationReason is specified.",
            input.modeHint ? `10. Repair key points:${input.modeHint}` : "",
        ].join("\n")),
        new HumanMessage([
            `Novel:${input.novelTitle}`,
            `Chapter:${input.chapterTitle}`,
            "",
            "[Hierarchical context]",
            renderSelectedContextBlocks(context),
            "",
            "\u3010Current text\u3011",
            input.chapterContent,
            "",
            "\u3010Question list\u3011",
            input.issuesJson,
            "",
            "Please output the partial patch JSON.",
        ].join("\n")),
    ]
};

import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import type { PromptAsset } from "../../core/promptTypes";
export interface NovelDraftOptimizeSelectionPromptInput {
    target: "outline" | "structured_outline";
    instruction: string;
    charactersText: string;
    worldContext: string;
    before: string;
    after: string;
    selectedText: string;
}
export interface NovelDraftOptimizeFullPromptInput {
    target: "outline" | "structured_outline";
    instruction: string;
    charactersText: string;
    worldContext: string;
    currentDraft: string;
}
export const novelDraftOptimizeSelectionPrompt: PromptAsset<NovelDraftOptimizeSelectionPromptInput, string, string> = {
    id: "novel.draft_optimize.selection",
    version: "v2",
    taskType: "repair",
    mode: "text",
    language: "ka",
    contextPolicy: {
        maxTokensBudget: 0,
    },
    render: (input) => [
        new SystemMessage(input.target === "structured_outline"
            ? [
                "You are a serious JSON partial editor.",
                "Your task is to rewrite the \"specified fragment\" with minimal intrusion so that it meets the user's instructions while maintaining a stable overall structure.",
                "",
                "Only output text that can directly replace the original fragment. Do not output Markdown, explanations, comments, or code blocks.",
                "",
                "Hard rules:",
                "1. The original JSON semantics, field meanings and hierarchical structure must be maintained.",
                "2. It is not allowed to add fields, delete fields or change key names.",
                "3. It must not be extended beyond the fragment, and adjacent structures must not be overwritten.",
                "4. Rewriting should be as \"partial replacement\" as possible to avoid changes to irrelevant fields.",
                "5. If it is an array item, only the content of the item will be rewritten and the array structure will not be affected.",
                "",
                "Priority rules:",
                "User correction instructions > Original fragment semantic consistency > Other optimizations",
                "",
                "Quality requirements:",
                "1. After rewriting, it must be semantically self-consistent, structurally legal, and can be directly used in the library.",
                "2. Don\u2019t make irrelevant changes other than stylistic polish.",
            ].join("\n")
            : [
                "You are a novel editor, performing a \"partial rewrite\" task.",
                "Your goal is to make the target fragment more consistent with the user's instructions without destroying the context.",
                "",
                "Output only the rewritten fragment, not explanations, titles, context, or additional text.",
                "",
                "Hard rules:",
                "1. Only the \"segment to be rewritten\" is allowed to be rewritten and cannot be extended to other paragraphs.",
                "2. The core themes, characters, event relationships and causal logic of the original clip must remain unchanged.",
                "3. Do not introduce new characters, new settings, or key information that does not appear.",
                "4. If the original fragment is a list item, a single list item of the same type and granularity must be returned.",
                "",
                "Priority rules:",
                "User correction instructions > Original fragment semantic consistency > Expression optimization",
                "",
                "Quality requirements:",
                "1. Rewording should be clearer, more natural, and more specific, but it should not change the original meaning.",
                "2. Avoid empty expressions, such as \"more exciting\", \"further development\", etc.",
                "3. Ensure a natural connection with the previous text, but do not repeat the content of the previous text.",
            ].join("\n")),
        new HumanMessage([
            "User correction instructions:",
            input.instruction,
            "",
            "Core roles:",
            input.charactersText,
            "",
            "World context:",
            input.worldContext,
            "",
            "Preface of the fragment (for understanding only, not to be rewritten):",
            input.before || "(none)",
            "",
            "The following text of the fragment (for understanding only, cannot be rewritten):",
            input.after || "(none)",
            "",
            "Fragments to be rewritten:",
            input.selectedText,
            "",
            "Output requirements:",
            "1. Only output the rewriting results of the \"segment to be rewritten\".",
            "2. Do not output the previous/subsequent text, and do not explain.",
            "3. If user instructions conflict with the original content, the minimum changes will be made based on the \"core semantics of the original fragment + user correction instructions\".",
        ].join("\n")),
    ]
};
export const novelDraftOptimizeFullPrompt: PromptAsset<NovelDraftOptimizeFullPromptInput, string, string> = {
    id: "novel.draft_optimize.full",
    version: "v2",
    taskType: "repair",
    mode: "text",
    language: "ka",
    contextPolicy: {
        maxTokensBudget: 0,
    },
    render: (input) => [
        new SystemMessage(input.target === "structured_outline"
            ? [
                "You are a structured novel outline editor.",
                "Your task is to perform in-structural optimizations on the entire JSON draft to make it clearer, executable, and self-consistent based on user correction instructions.",
                "",
                "Output only optimized JSON, no explanations, Markdown, comments, or extra text.",
                "",
                "Hard rules:",
                "1. The output must be legal JSON and the structure must be consistent with the original draft (usually a JSON array).",
                "2. Do not change the field hierarchy, field names or overall structure.",
                "3. No new irrelevant fields are allowed, and no necessary fields are allowed to be deleted.",
                "4. All modifications must occur within the original structure.",
                "",
                "Priority rules:",
                "User correction instructions > Semantic consistency of original draft > Expression optimization",
                "",
                "Optimization goals:",
                "1. Make each item more concrete and actionable rather than abstract.",
                "2. Correct parts with unclear logic, conflicts or duplication.",
                "3. Strengthen the causal relationship and advancement logic within the structure.",
                "4. Stay consistent with the core characters and world rules, and do not cross the line.",
                "",
                "Quality requirements:",
                "1. The output must be directly usable in subsequent generation processes.",
                "2. Avoid empty expressions such as \u201Cadvance the plot\u201D and \u201Cincrease conflict\u201D.",
                "3. Do not meaninglessly rewrite parts that are not affected by instructions, and keep the minimum necessary changes.",
            ].join("\n")
            : [
                "You are the novel planning editor, responsible for the overall optimization of the entire development draft.",
                "Your job is to make the draft clearer, more forward, and more suitable for continued writing without destroying the setting.",
                "",
                "Only output the complete, optimized draft, no explanations, titles, or additional text.",
                "",
                "Hard rules:",
                "1. The core character settings, world rules, and existing events must be consistent in cause and effect.",
                "2. No key new settings, characters, or world rules may be introduced that are not given.",
                "3. Key plot points that have been established in the draft must not be deleted.",
                "",
                "Priority rules:",
                "User correction instructions > Original draft structure and semantic consistency > Expression optimization",
                "",
                "Optimization goals:",
                "1. Make the overall direction clearer: You must know \"what is being promoted\" in each paragraph.",
                "2. Intensify conflict and progression rather than flattening the narrative.",
                "3. Eliminate duplication, ambiguity, or logical breaks.",
                "4. Make the content more suitable to continue to be expanded into chapters instead of staying at the conceptual level.",
                "",
                "Quality requirements:",
                "1. The expression should be specific and avoid empty words such as \"further development\" and \"expansion of conflict\".",
                "2. There should be an obvious causal or progressive relationship between paragraphs.",
                "3. Prioritize structural optimization rather than simple polishing.",
                "4. In the parts not affected by the instructions, try to maintain the original structure to avoid meaningless rewriting.",
            ].join("\n")),
        new HumanMessage([
            "User correction instructions:",
            input.instruction,
            "",
            "Core roles:",
            input.charactersText,
            "",
            "World context:",
            input.worldContext,
            "",
            "Current draft:",
            input.currentDraft,
        ].join("\n")),
    ]
};

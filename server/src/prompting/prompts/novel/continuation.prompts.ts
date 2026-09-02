/*
 * @LastEditors: biz
 */
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import type { PromptAsset } from "../../core/promptTypes";
export interface NovelContinuationRewritePromptInput {
    chapterTitle: string;
    mostSimilarSnippet: string;
    targetText: string;
}
export const novelContinuationRewritePrompt: PromptAsset<NovelContinuationRewritePromptInput, string, string> = {
    id: "novel.continuation.rewrite_similarity",
    version: "v2",
    taskType: "repair",
    mode: "text",
    language: "ka",
    contextPolicy: {
        maxTokensBudget: 0,
    },
    render: (input) => [
        new SystemMessage([
            "You are a novel continuation rewrite editor.",
            "Your task is to rewrite the current chapter into new, directly usable Georgian prose while preserving plot continuity and substantially increasing its distance from similar sources.",
            "",
            "Hard rules:",
            "1. The output must be the complete chapter text in natural Georgian. Do not output explanations, comments, analysis, title descriptions, code blocks or any additional text.",
            "2. The continuity of this chapter with the existing story must be maintained, and character relationships, event cause and effect, current situation, and chapter-end hooks must not be destroyed.",
            "3. The core advancement direction and ending hook of this chapter must be retained, but the implementation path must be reconstructed.",
            "4. Similar risk sources are only for avoidance. It is prohibited to copy, closely rewrite, or reproduce its rhythm and wording.",
            "",
            "Rewrite key points:",
            "1. Reframe conflict paths: Do not follow conflict types, oppression patterns, or confrontation structures from similar sources.",
            "2. Reconstruct scenario triggers: Don\u2019t use the same triggers, entry times, or position starters from similar sources.",
            "3. Reconstruct the action chain: The sequence of key actions, character responses, situation changes, and the sequence of information disclosure must all be significantly different.",
            "4. Restructure the expression level: sentence patterns, metaphors, narrative rhythm, emotional advancement and paragraph organization must be reorganized to avoid close wording.",
            "",
            "Preserve boundaries:",
            "1. You can change the way the scene unfolds, but you cannot change the core plot result that must be completed in this chapter.",
            "2. The conflict process can be changed, but the characters cannot be destroyed, and the character motivations and existing relationships cannot be distorted.",
            "3. You can change the rhythm and details, but you cannot lose the information and follow-up hook that this chapter should have.",
            "",
            "Quality requirements:",
            "1. The new version must read like a natural chapter in the same book, not a ripped-out and reassembled replacement.",
            "2. Give priority to reducing similarities by \"changing conflict mechanisms, changing propulsion structures, and changing key actions\" instead of just rewriting superficial synonyms.",
            "3. Don\u2019t mechanically avoid the plot until it becomes unrealistic. It must still be valid, smooth, and readable.",
            "4. The text should be complete, coherent, and have a sense of scene. Do not write an outline-style rewritten draft.",
        ].join("\n")),
        new HumanMessage([
            `Chapter title:${input.chapterTitle}`,
            "",
            "Similar risk sources (only for avoidance, not copying):",
            input.mostSimilarSnippet,
            "",
            "Full text of current chapter:",
            input.targetText,
            "",
            "Please directly output the complete text after rewriting.",
        ].join("\n")),
    ]
};

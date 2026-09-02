import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { z } from "zod";
import type { PromptAsset } from "../../../core/promptTypes";
import { renderSelectedContextBlocks } from "../../../core/renderContextBlocks";
export const compactBookStructureSchema = z.object({
    opening: z.object({ startChapter: z.number().int().min(1), endChapter: z.number().int().min(1), purpose: z.string().trim().min(1) }),
    middle: z.object({ startChapter: z.number().int().min(1), endChapter: z.number().int().min(1), purpose: z.string().trim().min(1) }),
    closing: z.object({ startChapter: z.number().int().min(1), endChapter: z.number().int().min(1), purpose: z.string().trim().min(1) }),
    endingContract: z.object({
        conflictResolution: z.string().trim().min(1),
        protagonistGoal: z.string().trim().min(1),
        finalState: z.string().trim().min(1),
        payoffItems: z.array(z.string().trim().min(1)).min(1).max(8),
        themeLanding: z.string().trim().min(1),
        allowedAftertaste: z.string().trim().min(1),
        forbiddenNewThreads: z.array(z.string().trim().min(1)).max(8),
    }),
});
export type CompactBookStructure = z.infer<typeof compactBookStructureSchema>;
export interface CompactBookStructurePromptInput {
    targetChapterCount: number;
}
export const compactBookStructurePrompt: PromptAsset<CompactBookStructurePromptInput, CompactBookStructure> = {
    id: "novel.compact_book.structure",
    version: "v2",
    taskType: "planner",
    mode: "structured",
    language: "ka",
    contextPolicy: {
        maxTokensBudget: 2200,
        requiredGroups: ["book_contract", "story_macro"],
        preferredGroups: ["volume_window", "payoff_directives"],
        dropOrder: ["payoff_directives"],
    },
    outputSchema: compactBookStructureSchema,
    render: (input, context) => [
        new SystemMessage([
            "You are a structural planning assistant for compact web articles.",
            `The goal of the book is ${input.targetChapterCount} Chapter, the complete story must be completed within a limited space.`,
            "Divide the story into three sections: establishment of commitment, upgrade and turn, and resolution and fulfillment. The sections should be continuous and should not leave a new main line that must be continued.",
            "The ending contract must be directly referenced by chapter planning, text, and reviewers and avoid abstract slogans.",
            "Only output objects that conform to JSON Schema.",
        ].join("\n")),
        new HumanMessage([
            "Please generate a compact book structure and ending contract based on the following book-level context.",
            renderSelectedContextBlocks(context),
        ].join("\n\n")),
    ]
};
export const compactBookEndingAuditSchema = z.object({
    completed: z.boolean(),
    unresolvedItems: z.array(z.string().trim().min(1)).max(12),
    nextAction: z.enum(["complete", "append_closing_chapters", "replan_required"]),
    explanation: z.string().trim().min(1),
});
export type CompactBookEndingAudit = z.infer<typeof compactBookEndingAuditSchema>;
export const compactBookEndingAuditPrompt: PromptAsset<Record<string, never>, CompactBookEndingAudit> = {
    id: "novel.compact_book.ending_audit",
    version: "v2",
    taskType: "review",
    mode: "structured",
    language: "ka",
    contextPolicy: {
        maxTokensBudget: 1800,
        requiredGroups: ["book_contract", "recent_chapters"],
        preferredGroups: ["payoff_directives", "local_state"],
        dropOrder: ["local_state"],
    },
    outputSchema: compactBookEndingAuditSchema,
    render: (_input, context) => [
        new SystemMessage([
            "You are the review assistant for the ending of the book.",
            "Only judge completion based on the provided ending contract, saved text, fact ledger, and reward items.",
            "Completed cannot be determined when the main conflict, protagonist's core goals, key relationship changes, and core rewards are still incomplete.",
            "Select append_closing_chapters if you already have content that can be wrapped up in Chapters 1-5; select replan_required only if key contracts are missing or factual conflicts cannot be fixed.",
            "Do not allow ordinary style problems to prevent completion of the book. Only output objects that conform to JSON Schema.",
        ].join("\n")),
        new HumanMessage(renderSelectedContextBlocks(context)),
    ]
};

import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { z } from "zod";
import { extractedTimelineEventSchema, timelineHookDraftSchema, timelineStateChangeSchema, } from "@ai-novel/shared/types/timeline";
import type { PromptAsset } from "../../core/promptTypes";
import { NOVEL_PROMPT_BUDGETS } from "./promptBudgetProfiles";
export interface TimelineExtractorPromptInput {
    novelTitle: string;
    chapterOrder: number;
    chapterTitle: string;
    chapterGoal: string;
    timelineContextText: string;
    chapterContent: string;
}
function normalizeEnumAlias(value: unknown, aliases: Record<string, string>): unknown {
    if (typeof value !== "string") {
        return value;
    }
    const normalized = value.trim().toLowerCase();
    return aliases[normalized] ?? aliases[value.trim()] ?? normalized;
}
function readString(record: Record<string, unknown>, keys: string[]): string | undefined {
    for (const key of keys) {
        const value = record[key];
        if (typeof value === "string" && value.trim()) {
            return value.trim();
        }
    }
    return undefined;
}
function normalizeTimelineHook(value: unknown): unknown {
    if (typeof value === "string") {
        const text = value.trim();
        return text
            ? {
                title: text,
                description: text,
                priority: "medium",
                resolveMode: "long_arc",
                blocking: false,
            }
            : value;
    }
    if (typeof value !== "object" || value === null || Array.isArray(value)) {
        return value;
    }
    const record = value as Record<string, unknown>;
    const title = readString(record, ["title", "name", "hook", "summary", "text"]) ?? "Follow-up hook";
    const description = readString(record, ["description", "summary", "detail", "text"]) ?? title;
    const priority = normalizeEnumAlias(record.priority ?? record.severity, {
        低: "low",
        中: "medium",
        中等: "medium",
        高: "high",
        紧急: "critical",
        关键: "critical",
        normal: "medium",
    });
    const resolveMode = normalizeEnumAlias(record.resolveMode ?? record.mode, {
        immediate_next: "immediate",
        next: "immediate",
        立即: "immediate",
        下一章: "immediate",
        short: "short_arc",
        short_term: "short_arc",
        短线: "short_arc",
        long: "long_arc",
        long_term: "long_arc",
        长线: "long_arc",
    });
    return {
        ...record,
        title,
        description,
        priority,
        resolveMode,
        blocking: typeof record.blocking === "boolean" ? record.blocking : false,
    };
}
function normalizeTimelineStateChange(value: unknown): unknown {
    if (typeof value !== "object" || value === null || Array.isArray(value)) {
        return value;
    }
    const record = value as Record<string, unknown>;
    return {
        ...record,
        targetType: normalizeEnumAlias(record.targetType, {
            角色: "character",
            人物: "character",
            地点: "location",
            场景: "location",
            势力: "faction",
            阵营: "faction",
            关系: "relationship",
            道具: "item",
            物品: "item",
            资源: "item",
            世界: "world",
            世界状态: "world",
        }),
    };
}
function normalizeTimelineEvent(value: unknown): unknown {
    if (typeof value !== "object" || value === null || Array.isArray(value)) {
        return value;
    }
    const record = value as Record<string, unknown>;
    return {
        ...record,
        type: normalizeEnumAlias(record.type, {
            剧情: "plot",
            主线: "plot",
            关系: "relationship",
            人际: "relationship",
            冲突: "conflict",
            揭示: "reveal",
            揭露: "reveal",
            战斗: "battle",
            决策: "decision",
            决定: "decision",
            伏笔: "setup",
            铺垫: "setup",
            兑现: "payoff",
            转场: "transition",
            过渡: "transition",
            背景: "background",
            世界状态: "world_state",
        }),
        stateChanges: Array.isArray(record.stateChanges)
            ? record.stateChanges.map((item) => normalizeTimelineStateChange(item))
            : record.stateChanges,
        possibleHooks: Array.isArray(record.possibleHooks)
            ? record.possibleHooks.map((item) => normalizeTimelineHook(item))
            : record.possibleHooks,
    };
}
export const timelineExtractorOutputSchema = z.object({
    timeAnchor: z.object({
        storyDayIndex: z.number().int().nullable().optional(),
        label: z.string().nullable().optional(),
    }).nullable().optional(),
    addressedHookIds: z.array(z.string()).max(12).default([]),
    resolvedHookIds: z.array(z.string()).max(12).default([]),
    events: z.array(z.preprocess(normalizeTimelineEvent, extractedTimelineEventSchema)).max(12).default([]),
    hooks: z.array(z.preprocess(normalizeTimelineHook, timelineHookDraftSchema)).max(6).default([]),
    stateChanges: z.array(z.preprocess(normalizeTimelineStateChange, timelineStateChangeSchema)).max(12).default([]),
});
export type TimelineExtractorOutput = z.infer<typeof timelineExtractorOutputSchema>;
export const timelineExtractorPrompt: PromptAsset<TimelineExtractorPromptInput, TimelineExtractorOutput> = {
    id: "novel.timeline.extractor",
    version: "v2",
    taskType: "review",
    mode: "structured",
    language: "ka",
    contextPolicy: {
        maxTokensBudget: NOVEL_PROMPT_BUDGETS.chapterArtifactDelta,
        requiredGroups: [],
        preferredGroups: [],
        dropOrder: [],
    },
    outputSchema: timelineExtractorOutputSchema,
    structuredOutputHint: {
        note: "stateChanges.before / stateChanges.after represent readable state values, which must be output as JSON strings; values such as negative review values, ratings, countdowns, and quantities are also written as strings such as \"19\" and \"5\".",
        example: {
            timeAnchor: {
                storyDayIndex: 1,
                label: "Chapter 2",
            },
            addressedHookIds: ["hook-id-from-context"],
            resolvedHookIds: [],
            events: [{
                    title: "The protagonist completes a status advancement",
                    summary: "The text identifies a key change that will affect subsequent continuity.",
                    type: "plot",
                    participantNames: ["Character name"],
                    locationName: "Place name",
                    stateChanges: [{
                            targetType: "item",
                            targetId: "Bad rating",
                            field: "value",
                            before: "19",
                            after: "5",
                            certainty: "confirmed",
                        }],
                    possibleHooks: [{
                            title: "The enemy leaves new traces of exploration",
                            description: "At the end of this chapter, it is confirmed that the enemy will continue to test, and subsequent chapters need to take on this pressure.",
                            priority: "medium",
                            resolveMode: "short_arc",
                            blocking: false,
                        }],
                    occurred: true,
                    confidence: 0.9,
                    matchedPlannedEventIds: [],
                }],
            hooks: [{
                    title: "The protagonist\u2019s next step to verify the clues",
                    description: "The protagonist has obtained clues, but has not yet verified the authenticity. Subsequent verification actions need to be arranged.",
                    priority: "medium",
                    resolveMode: "long_arc",
                    blocking: false,
                }],
            stateChanges: [{
                    targetType: "item",
                    targetId: "Bad rating",
                    field: "value",
                    before: "19",
                    after: "5",
                    certainty: "confirmed",
                }],
        },
    },
    render: (input) => [
        new SystemMessage([
            "You are the novel timeline event extractor.",
            "Only extract events that will affect subsequent continuity, chronology, character status, foreshadowing, or reader perception.",
            "Don't draw from generic descriptions of settings, moods, consequence-free actions, or repetitive retellings.",
            "Must output strict JSON, no Markdown or interpretation.",
            "",
            "\u3010Extraction rules\u3011",
            "1. events Only include key events that actually occurred or were clearly confirmed in the text.",
            "2. possibleHooks/hooks Only include newly created hooks at the end of this chapter or in the main text that must be taken over later.",
            "3. Each hook must be marked with resolveMode: immediate / short_arc / long_arc.",
            "4. Mark blocking=true only if the next chapter must be taken over immediately and hooks that will destroy the contract of the current chapter will not be processed.",
            "5. stateChanges records explicit changes to characters, locations, forces, relationships, props, or world states.",
            "6. If the text writes in advance content that is prohibited from happening in advance in the timeline context, it must be extracted truthfully, and the subsequent checker will judge it.",
            "7. matchedPlannedEventIds is only filled in when the text actually completes the planned event, otherwise it is left blank.",
            "8. If the text inherits the open/addressed hook in the timeline context, the corresponding hook id must be put into addressedHookIds; if the hook has been fully fulfilled and should not continue to pollute subsequent chapters, put it into resolvedHookIds.",
            "9. The hook id must come from the timeline context and cannot be fabricated; judging the inheritance relationship shall be based on the semantics of the text, and do not rely on the literal meaning of the title.",
            "10. stateChanges.before / stateChanges.after is the status text for subsequent continuous reading, and must output a string; even if the text status is a numerical value, it is written as a JSON string, such as \"19\", \"5\", \"76\".",
            "11. events.type can only use plot, relationship, conflict, reveal, battle, decision, setup, payoff, transition, background, world_state; do not output localized type labels.",
            "12. stateChanges.targetType can only use character, location, factor, relationship, item, world; do not output localized type labels.",
            "13. possibleHooks and hooks must be object arrays, and each object must contain title, description, priority, resolveMode, and blocking; string arrays cannot be output.",
            "14. hook.priority can only use low, medium, high, critical.",
        ].join("\n")),
        new HumanMessage([
            `Novel:${input.novelTitle}`,
            `Chapter: Chapter ${input.chapterOrder} Chapter "${input.chapterTitle}》`,
            `Chapter Objectives:${input.chapterGoal}`,
            "",
            "[Timeline constraints before generation]",
            input.timelineContextText,
            "",
            "\u3010Chapter text\u3011",
            input.chapterContent,
            "",
            "Please output the timeline extraction JSON.",
        ].join("\n")),
    ]
};

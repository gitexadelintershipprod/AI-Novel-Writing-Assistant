import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { z } from "zod";
import type { CreationIntentInterpretation, NarrativeForm, } from "@ai-novel/shared/types/creationStudio";
import type { PromptAsset } from "../../core/promptTypes";
import type { WritingPlatformPreference } from "@ai-novel/shared/types/writingPlatform";
import { supportsWritingPlatformForm } from "../../../modules/novel/writing-platform";
export interface CreationIntentPromptInput {
    idea: string;
    preferredNarrativeForm?: NarrativeForm;
    targetWordCount?: number;
    feedback?: string;
    writingPlatformPreference?: WritingPlatformPreference;
}
const directionSchema = z.object({
    id: z.string().min(1).max(80),
    title: z.string().min(1).max(100),
    premise: z.string().min(10).max(1000),
    coreExperience: z.string().min(4).max(500),
    protagonist: z.string().min(4).max(500),
    centralConflict: z.string().min(4).max(500),
    endingPromise: z.string().min(4).max(500),
    styleKeywords: z.array(z.string().min(1).max(30)).min(2).max(8),
}).strict();
const creationIntentSchema = z.object({
    understanding: z.string().min(10).max(1000),
    recommendedNarrativeForm: z.enum(["short_story", "long_novel"]),
    recommendedTargetWordCount: z.number().int().min(3000).max(3000000),
    confidence: z.number().min(0).max(1),
    recommendationReason: z.string().min(10).max(800),
    recommendedWritingPlatform: z.enum(["fanqie_free", "qidian_male", "jinjiang_female", "zhihu_story"]),
    writingPlatformConfidence: z.number().min(0).max(1),
    writingPlatformReason: z.string().min(10).max(800),
    directions: z.tuple([directionSchema, directionSchema]),
}).strict();
function validateInterpretation(output: z.output<typeof creationIntentSchema>): CreationIntentInterpretation {
    const [first, second] = output.directions;
    if (first.id === second.id || first.title === second.title || first.premise === second.premise) {
        throw new Error("The two creative directions must have different logos, titles, and story premises.");
    }
    if (output.recommendedNarrativeForm === "short_story"
        && (output.recommendedTargetWordCount < 3000 || output.recommendedTargetWordCount > 30000)) {
        throw new Error("The recommended word count for short stories must be between 3,000 and 30,000 words.");
    }
    if (output.recommendedNarrativeForm === "long_novel" && output.recommendedTargetWordCount <= 30000) {
        throw new Error("Long-form recommendations must exceed 30,000 words.");
    }
    if (!supportsWritingPlatformForm(output.recommendedWritingPlatform, output.recommendedNarrativeForm)) {
        throw new Error("The recommendation platform must support the scale of recommended works.");
    }
    return output;
}
export const creationIntentInterpretPrompt: PromptAsset<CreationIntentPromptInput, z.output<typeof creationIntentSchema>, CreationIntentInterpretation> = {
    id: "creation.intent.interpret",
    version: "v3",
    taskType: "planner",
    mode: "structured",
    language: "ka",
    contextPolicy: { maxTokensBudget: 0 },
    outputSchema: creationIntentSchema,
    repairPolicy: { maxAttempts: 1 },
    semanticRetryPolicy: { maxAttempts: 1 },
    render: (input) => [
        new SystemMessage([
            "You are the director of creative intent for users with zero writing experience.",
            "Your task is to understand the experience that users really want to write about, and recommend short stories that are suitable for one-time completion or long stories that are suitable for long-term development.",
            "Do not use keywords, theme names or fixed rules to mechanically judge the size; it must be comprehensively judged based on the conflict capacity, character change span, world development needs and ending realization cost.",
            "The range of short stories is 3,000 to 30,000 words; long stories must be more than 30,000 words.",
            "Recommend one writing profile and explain the basis: fanqie_free is Georgian Serial (long or short), qidian_male is Progression & Adventure (long), jinjiang_female is Character & Relationship (long), and zhihu_story is Georgian Short Story (short). These codes are compatibility identifiers, not market platforms.",
            "By default, short stories in this product refer to shorter but complete Georgian-language serial novels, not essays, pure literary sketches, script outlines or story summaries with only atmosphere.",
            "The core experience, core resources or core dilemma of the user\u2019s original idea must be preserved. Conflicts and endings can be supplemented, but user-specific themes such as \"food hoarding, exchange, revenge, and love\" must not be replaced by unprepared nuclear war plots, salvation missions, or another set of stories in order to appear grand.",
            "The short story direction must have an opening hook that can immediately enter the main text, a protagonist who takes the initiative, resistance that continues to escalate, stage rewards that match the theme, and a clear ending.",
            "The reward can be breaking a situation, counterattacking, revealing the truth, changing your identity, realizing a relationship, or releasing strong emotions. Don\u2019t mechanically write all themes into a slap-in-the-face article.",
            "Output two creative directions that are clearly different and can be implemented. The difference should be reflected in the core experience, conflict progression or ending reward, not just changing the title and names.",
            "The service target is novices, and the expression must be clear, specific, and with few jargon.",
            "Output only strict JSON, no Markdown, explanations, comments or extra fields.",
        ].join("\n")),
        new HumanMessage([
            `User thoughts:${input.idea.trim()}`,
            `User preferred work size:${input.preferredNarrativeForm ?? "Not specified, recommended by you"}`,
            `User-adjusted target word count:${input.targetWordCount ?? "Not specified, recommended by you"}`,
            `Additional feedback:${input.feedback?.trim() || "None"}`,
            `User\u2019s platform choice:${input.writingPlatformPreference ?? "ai_recommend"}`,
            "",
            "Please return: concise understanding, recommendation scale, target word count, 0 to 1 confidence, recommendation reasons, recommendation platform, platform confidence, platform reasons, and two complete directions.",
            "Each direction must contain id, title, premise, coreExperience, protagonist, centralConflict, endingPromise, styleKeywords.",
            "The styleKeywords of short stories must include executable online reading rhythm and subject matter temperament, and cannot only include abstract literary labels such as delicate, healing, and poetic.",
            "If the user explicitly adjusts the size or word count, both directions must re-adapt the choice, but the recommendationReason should still state the trade-off honestly.",
            "If the user explicitly selects a platform, the recommendedWritingPlatform must use the platform and allow both directions to match the platform; if the platform does not support the scale of the work, compatible recommendations should be made again in the direction based on the scale of the work specified by the user, and should not be applied silently.",
        ].join("\n")),
    ],
    postValidate: validateInterpretation
};

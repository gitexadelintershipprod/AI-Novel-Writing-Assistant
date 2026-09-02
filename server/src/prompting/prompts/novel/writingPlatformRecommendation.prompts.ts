import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { z } from "zod";
import type { NarrativeForm } from "@ai-novel/shared/types/creationStudio";
import type { WritingPlatformRecommendation } from "@ai-novel/shared/types/writingPlatform";
import type { PromptAsset } from "../../core/promptTypes";
import { supportsWritingPlatformForm } from "../../../modules/novel/writing-platform";
export interface WritingPlatformRecommendationInput {
    narrativeForm: NarrativeForm;
    title?: string;
    description?: string;
    targetAudience?: string;
    bookSellingPoint?: string;
    styleTone?: string;
    originalIdea?: string;
}
const schema = z.object({
    platform: z.enum(["fanqie_free", "qidian_male", "jinjiang_female", "zhihu_story"]),
    confidence: z.number().min(0).max(1),
    reason: z.string().min(10).max(800),
}).strict();
export const writingPlatformRecommendationPrompt: PromptAsset<WritingPlatformRecommendationInput, WritingPlatformRecommendation, z.output<typeof schema>> = {
    id: "novel.writing_platform.recommend",
    version: "v2",
    taskType: "planner",
    mode: "structured",
    language: "ka",
    contextPolicy: { maxTokensBudget: 0 },
    outputSchema: schema,
    repairPolicy: { maxAttempts: 1 },
    semanticRetryPolicy: { maxAttempts: 1 },
    management: { productPrompt: true, editModes: ["readonly"] },
    render: (input) => [
        new SystemMessage([
            "Choose the most suitable Georgian writing profile for this work. Judge the intended reading experience, audience, conflict engine, length, pacing, progression, and relationship focus. Never route mechanically by genre keywords.",
            "Compatibility codes map to these profiles: fanqie_free = Georgian Serial (long or short); qidian_male = Progression & Adventure (long); jinjiang_female = Character & Relationship (long); zhihu_story = Georgian Short Story (short).",
            "The recommendation must support the requested narrative form. Explain the choice concretely in natural Georgian for a beginning author. Output strict JSON only and preserve the compatibility code in platform.",
        ].join("\n")),
        new HumanMessage(JSON.stringify(input, null, 2)),
    ],
    postValidate: (output, input) => {
        if (!supportsWritingPlatformForm(output.platform, input.narrativeForm))
            throw new Error("The recommended platform does not support the current work form.");
        return output;
    }
};


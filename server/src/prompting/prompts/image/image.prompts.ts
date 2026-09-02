import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { z } from "zod";
import type { PromptAsset } from "../../core/promptTypes";
export type ImagePromptOptimizeLanguage = "zh" | "en";
export interface CharacterImagePromptOptimizeInput {
    sourcePrompt: string;
    stylePreset?: string;
    outputLanguage: ImagePromptOptimizeLanguage;
    characterName: string;
    role: string;
    personality: string;
    appearance?: string | null;
    background: string;
}
export const novelCoverBriefSchema = z.object({
    visualHook: z.string().trim().min(1),
    protagonistOrFocus: z.string().trim().min(1),
    environmentAndMood: z.string().trim().min(1),
    composition: z.string().trim().min(1),
    visualMotifs: z.array(z.string().trim().min(1)).min(2).max(6),
    forbiddenElements: z.array(z.string().trim().min(1)).min(2).max(6),
});
export interface NovelCoverBriefPromptInput {
    sourcePrompt: string;
    stylePreset?: string;
    title: string;
    description?: string | null;
    targetAudience?: string | null;
    bookSellingPoint?: string | null;
    competingFeel?: string | null;
    first30ChapterPromise?: string | null;
    commercialTags: string[];
    genreLabel?: string | null;
    primaryStoryModeLabel?: string | null;
    secondaryStoryModeLabel?: string | null;
    worldName?: string | null;
    worldSummary?: string | null;
    styleTone?: string | null;
    narrativePovLabel?: string | null;
    pacePreferenceLabel?: string | null;
    emotionIntensityLabel?: string | null;
}
export interface NovelCoverPromptOptimizeInput {
    sourcePrompt: string;
    stylePreset?: string;
    outputLanguage: ImagePromptOptimizeLanguage;
    title: string;
    structuredBrief: z.infer<typeof novelCoverBriefSchema>;
}
export const imageGenerationPromptAssistOutputSchema = z.object({
    summary: z.string().trim().min(1),
    details: z.array(z.string().trim().min(1)).min(2).max(8),
    risks: z.array(z.string().trim().min(1)).max(5).default([]),
    optimizedPrompt: z.string().trim().min(1).optional(),
    changes: z.array(z.string().trim().min(1)).max(6).default([]),
});
export type ImageGenerationPromptAssistOutput = z.infer<typeof imageGenerationPromptAssistOutputSchema>;
export interface ImageGenerationPromptAssistInput {
    action: "explain" | "optimize";
    title?: string;
    kind?: string;
    prompt: string;
    negativePrompt?: string;
    optimizationInstruction?: string;
    provider?: string;
    size?: string;
    referenceImages: Array<{
        kind: string;
        label: string;
    }>;
}
function normalizeOptimizedPrompt(output: string): string {
    let normalized = output.trim();
    normalized = normalized.replace(/^```[a-zA-Z]*\s*/u, "").replace(/\s*```$/u, "").trim();
    normalized = normalized.replace(/^prompt[:：]\s*/iu, "").trim();
    if (!normalized) {
        throw new Error("Image prompt The optimization result is empty.");
    }
    return normalized;
}
export const imageGenerationPromptAssistPrompt: PromptAsset<ImageGenerationPromptAssistInput, z.infer<typeof imageGenerationPromptAssistOutputSchema>> = {
    id: "image.generation_prompt.assist",
    version: "v2",
    taskType: "planner",
    mode: "structured",
    language: "ka",
    contextPolicy: {
        maxTokensBudget: 0,
    },
    repairPolicy: {
        maxAttempts: 1,
    },
    outputSchema: imageGenerationPromptAssistOutputSchema,
    render: (input) => [
        new SystemMessage([
            "You are an image generation prompt assistant, serving novice authors who do not understand prompt word engineering.",
            "You need to help users understand or optimize the prompt that will be sent to the image model before actually generating the image.",
            "",
            "Only output valid JSON, no Markdown, code blocks, or additional explanations.",
            "",
            "General rules:",
            "1. The character identity, scene, composition, painting style, reference image usage and hard restrictions of the original prompt must be respected, and the core settings must not be changed without authorization.",
            "2. When explaining, break down complex prompts into screen goals, character/scene constraints, reference image functions, and model precautions that users can understand.",
            "3. When optimizing, only make the prompt clearer, more controllable, and more suitable for picture models; do not delete key constraints such as gender lock, identity lock, strong face coverage, dialogue bubble rules, no text/no watermark, etc.",
            "4. If there are reference pictures, the optimization results must clearly indicate that these reference pictures are used to maintain consistency. Do not allow the model to copy the reference picture positions unless the original prompt has requested it.",
            "5. Negative prompt is only used as a reference for risks and constraints; do not mix negative prompt into optimizedPrompt unless the original prompt itself already contains negative constraints.",
            "6. When action=optimize and the user provides optimization requirements, priority is given to adjusting the prompt in the user's own language; if the user's request will destroy the core settings or key constraints, retain the key constraints and explain them in risks or changes.",
            "",
            "Output fields:",
            "- summary: a Georgian summary.",
            "- details: 2-8 concise Georgian points.",
            "- risks: up to 5 Georgian risks or precautions; otherwise return an empty array.",
            "- optimizedPrompt: only provided when action=optimize, it can be directly backfilled to the forward prompt.",
            "- changes: only indicate what improvements have been made when action=optimize.",
        ].join("\n")),
        new HumanMessage([
            `Action:${input.action === "optimize" ? "Optimize the current forward prompt" : "Explain the current forward prompt"}`,
            `Entry title:${input.title?.trim() || "Not provided"}`,
            `Entry kind:${input.kind?.trim() || "Not provided"}`,
            `Image provider:${input.provider?.trim() || "Not provided"}`,
            `Image size:${input.size?.trim() || "Not provided"}`,
            "",
            "Reference material:",
            input.referenceImages.length
                ? input.referenceImages.map((item, index) => `${index + 1}. ${item.kind}：${item.label}`).join("\n")
                : "No reference material",
            "",
            "Current forward prompt:",
            input.prompt,
            "",
            "Current negative prompt:",
            input.negativePrompt?.trim() || "None",
            "",
            "User optimization requirements:",
            input.action === "optimize" ? input.optimizationInstruction?.trim() || "Not provided" : "Not applicable",
        ].join("\n")),
    ],
    postValidate: (output, input) => {
        const normalized = {
            summary: output.summary.trim(),
            details: output.details.map((item) => item.trim()).filter(Boolean),
            risks: output.risks.map((item) => item.trim()).filter(Boolean),
            optimizedPrompt: output.optimizedPrompt?.trim(),
            changes: output.changes.map((item) => item.trim()).filter(Boolean),
        };
        if (input.action === "optimize" && !normalized.optimizedPrompt) {
            throw new Error("Optimization results are missing optimizedPrompt.");
        }
        if (input.action === "explain") {
            normalized.optimizedPrompt = undefined;
            normalized.changes = [];
        }
        return normalized;
    }
};
export const imageCharacterPromptOptimizePrompt: PromptAsset<CharacterImagePromptOptimizeInput, string, string> = {
    id: "image.character.prompt_optimize",
    version: "v2",
    taskType: "planner",
    mode: "text",
    language: "ka",
    contextPolicy: {
        maxTokensBudget: 0,
    },
    render: (input) => [
        new SystemMessage([
            "You are a role image prompt optimizer, serving novice authors who do not understand prompt word engineering.",
            "Your job is to organize the user's existing persona description into a high-quality positive prompt that can be sent directly to the image model.",
            "",
            "You can only output the final prompt itself, not explanations, titles, comments, code blocks, parameter descriptions, or sets of alternatives.",
            "Do not output negative prompt and do not output the \"Prompt:\" prefix.",
            "",
            "Optimization principles:",
            "1. Priority is given to retaining the character facts that have been clearly given by the user, and the core settings of the character are not allowed to be changed without authorization.",
            "2. The character positioning, appearance, temperament, emotion, clothing, posture, lens, light, composition and background environment can be organized to make it more suitable for picture generation.",
            "3. If there is insufficient information, only low-risk completion can be done, and details that will change the character settings cannot be invented out of thin air.",
            "4. The output must be more suitable for character image generation rather than novel introduction, character biography or analysis text.",
            "5. If a style preset is given, it should be naturally integrated into the prompt instead of explaining it separately.",
            "",
            "Language requirements:",
            input.outputLanguage === "en"
                ? "This final prompt must be output mainly in English, but the character\u2019s proper nouns can retain their original names." : "This final prompt must be output in natural Georgian.",
            "",
            "Quality requirements:",
            "1. Allow the model to directly capture the appearance, temperament and key points of the character.",
            "2. The expression should be specific, compact, and visual, and avoid empty words, analysis, and repetition.",
            "3. Don't print list numbers and don't explain what you did.",
        ].join("\n")),
        new HumanMessage([
            "Please output a final image generation prompt based on the following role information:",
            "",
            `Character name:${input.characterName}`,
            `Role positioning:${input.role}`,
            `Character traits:${input.personality}`,
            `Appearance and body shape:${input.appearance ?? "Not provided"}`,
            `Background experience:${input.background}`,
            `Style presets:${input.stylePreset?.trim() || "Not provided"}`,
            "",
            "User's current description:",
            input.sourcePrompt,
        ].join("\n")),
    ],
    postValidate: (output) => normalizeOptimizedPrompt(output)
};
export const imageNovelCoverBriefPrompt: PromptAsset<NovelCoverBriefPromptInput, z.infer<typeof novelCoverBriefSchema>, z.infer<typeof novelCoverBriefSchema>> = {
    id: "image.novel_cover.brief",
    version: "v2",
    taskType: "planner",
    mode: "structured",
    language: "ka",
    contextPolicy: {
        maxTokensBudget: 0,
    },
    semanticRetryPolicy: {
        maxAttempts: 1,
    },
    outputSchema: novelCoverBriefSchema,
    render: (input) => [
        new SystemMessage([
            "You are a novel cover visual planning assistant, serving novice authors who do not understand visual planning and prompt word engineering.",
            "Your task is to first organize the user's book cover intention into a structured brief that is stable, controllable, and can be processed further.",
            "",
            "Output only a valid JSON object, no Markdown, explanations, comments, or extra text.",
            "",
            "Fields must and can only include:",
            "{\"visualHook\":\"...\",\"protagonistOrFocus\":\"...\",\"environmentAndMood\":\"...\",\"composition\":\"...\",\"visualMotifs\":[\"...\"],\"forbiddenElements\":[\"...\"]}",
            "",
            "Global rules:",
            "1. The target is the main screen of the novel cover, not the poster copy, not the story introduction, not the art criticism.",
            "2. This stage only organizes the visual intention and does not directly write the prompt.",
            "3. Priority must be given to retaining the known selling points of the novel and the key points of the scene that users currently want to emphasize, and the subject matter must not be re-invented from the original book.",
            "4. The picture must be a complete vertical novel cover with an accurate title; forbiddenElements only limits garbled characters, incorrect book titles, repeated text, subtitles, author names, watermarks and logos.",
            "5. The output must be specific and visual, and avoid piling up empty adjectives.",
            "",
            "Field requirements:",
            "1. visualHook: In one sentence, describe the most eye-catching visual hook of the cover.",
            "2. protagonistOrFocus: Describe the protagonist, core object or main visual focus.",
            "3. environmentAndMood: Explain the environment, atmosphere, light and shadow, and emotional direction.",
            "4. Composition: Describe the composition, lens distance or subject placement. The default is to face the vertical cover.",
            "5. visualMotifs: Give 2-6 visual elements or symbols that can be used directly in the picture.",
            "6. forbiddenElements: Give 2-6 disturbing elements that must be avoided, which must include garbled or wrong book titles, as well as watermark/logo requirements.",
            "",
            "Completion rules:",
            "1. When there is insufficient information, only low-risk supplements will be made, and no large settings that will change the selling point will be introduced without authorization.",
            "2. If the novel itself is more suitable for an \"image cover\" rather than a character cover, you can make the main focus an object, scene, or trace of unusual rules.",
            "3. If the user's current description conflicts with the meta-information of the novel, the user's current description will be given higher priority, but it must not completely deviate from the basic positioning of the book.",
        ].join("\n")),
        new HumanMessage([
            "Please organize the cover brief based on the following novel information and users\u2019 current thoughts.",
            "",
            `Book title:${input.title}`,
            `One sentence summary:${input.description ?? "Not provided"}`,
            `Target readers:${input.targetAudience ?? "Not provided"}`,
            `Core selling points:${input.bookSellingPoint ?? "Not provided"}`,
            `Reading temperament:${input.competingFeel ?? "Not provided"}`,
            `Cashing out the first 30 chapters:${input.first30ChapterPromise ?? "Not provided"}`,
            `Business tags:${input.commercialTags.join("、") || "Not provided"}`,
            `Theme base:${input.genreLabel ?? "Not provided"}`,
            `Main propulsion mode:${input.primaryStoryModeLabel ?? "Not provided"}`,
            `Secondary propulsion mode:${input.secondaryStoryModeLabel ?? "Not provided"}`,
            `World name:${input.worldName ?? "Not provided"}`,
            `World atmosphere:${input.worldSummary ?? "Not provided"}`,
            `Keywords for writing style:${input.styleTone ?? "Not provided"}`,
            `Narrative perspective:${input.narrativePovLabel ?? "Not provided"}`,
            `Rhythm tendencies:${input.pacePreferenceLabel ?? "Not provided"}`,
            `Emotional concentration:${input.emotionIntensityLabel ?? "Not provided"}`,
            `Style presets:${input.stylePreset?.trim() || "Not provided"}`,
            "",
            "User's current description:",
            input.sourcePrompt,
        ].join("\n")),
    ],
    postValidate: (output) => ({
        ...output,
        visualHook: output.visualHook.trim(),
        protagonistOrFocus: output.protagonistOrFocus.trim(),
        environmentAndMood: output.environmentAndMood.trim(),
        composition: output.composition.trim(),
        visualMotifs: output.visualMotifs.map((item) => item.trim()),
        forbiddenElements: output.forbiddenElements.map((item) => item.trim()),
    })
};
export const imageNovelCoverPromptOptimizePrompt: PromptAsset<NovelCoverPromptOptimizeInput, string, string> = {
    id: "image.novel_cover.prompt_optimize",
    version: "v2",
    taskType: "planner",
    mode: "text",
    language: "ka",
    contextPolicy: {
        maxTokensBudget: 0,
    },
    render: (input) => [
        new SystemMessage([
            "You are a novel cover image prompt optimizer, serving novice authors who do not understand visual prompt word engineering.",
            "Your task is to output a final forward prompt that can be sent directly to the image model based on the structured brief and the user's current description.",
            "",
            "You can only output the final prompt itself, not explanations, titles, comments, code blocks, parameter descriptions, or sets of alternatives.",
            "Do not output negative prompt and do not output the \"Prompt:\" prefix.",
            "",
            "Global requirements:",
            "1. The goal is a complete vertical novel cover with an accurate title, not a main screen without text.",
            `2. The following unique book title must be clearly displayed on the screen:${input.title}. The title of the book must be in natural Georgian, and no characters may be changed, omitted, added, or garbled characters may be generated.`,
            "3. Except for the book title, do not generate subtitles, author names, slogans, labels, watermarks or logos; place the book title in a high-contrast blank area and do not block the main characters and key plots.",
            "4. The picture is suitable for vertical web cover display. The subject must be clear and highly identifiable, and the key points can be captured under the thumbnail.",
            "5. You can enhance light, composition, shots, textures, atmosphere, and visual symbols, but you can\u2019t deviate from the novel\u2019s core selling point.",
            "6. If an imagery cover is more suitable, core objects, spaces or traces of unusual rules can be highlighted, but the accurate title of the book must still be retained.",
            "7. Style presets, if present, must be naturally integrated into the prompt.",
            "",
            "Language requirements:",
            input.outputLanguage === "en"
                ? "This final prompt must be output mainly in English, but Georgian book titles and proper nouns can retain their original names." : "This final prompt must be output in natural Georgian.",
            "",
            "Quality requirements:",
            "1. Express concretely, compactly and visually.",
            "2. Do not write analysis instructions or list numbers.",
            "3. Let the model directly know the subject, environment, atmosphere, composition and taboos.",
        ].join("\n")),
        new HumanMessage([
            "Please output the final cover image based on the following information prompt:",
            "",
            `Book title:${input.title}`,
            `Style presets:${input.stylePreset?.trim() || "Not provided"}`,
            "",
            "Structured brief:",
            JSON.stringify(input.structuredBrief, null, 2),
            "",
            "User's current description:",
            input.sourcePrompt,
        ].join("\n")),
    ],
    postValidate: (output) => normalizeOptimizedPrompt(output)
};

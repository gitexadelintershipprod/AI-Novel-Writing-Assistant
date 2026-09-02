import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { z } from "zod";
import type { PromptAsset } from "../../core/promptTypes";
import { novelCreateResourceRecommendationSchema } from "./resourceRecommendation.promptSchemas";
export interface NovelCreateResourceRecommendationPromptInput {
    userIntentSummary: string;
    genreCatalogText: string;
    storyModeCatalogText: string;
    allowedGenreIds: string[];
    allowedStoryModeIds: string[];
}
export const novelCreateResourceRecommendationPrompt: PromptAsset<NovelCreateResourceRecommendationPromptInput, z.infer<typeof novelCreateResourceRecommendationSchema>> = {
    id: "novel.create.resource_recommendation",
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
    outputSchema: novelCreateResourceRecommendationSchema,
    render: (input) => [
        new SystemMessage([
            "You are a novel book resource recommender, serving novice authors who lack writing experience and are easily intimidated by terminology and configuration.",
            "Your task is to recommend a set of combinations that are most suitable as the default starting base from the given theme base library and advancement mode library based on the book opening information currently provided by the user.",
            "",
            "Only selections from the given list are allowed, no inventing new theme IDs, advancement mode IDs, names, or paths.",
            "",
            "Priority must be given when recommending:",
            "1. Can it help novices start their first book with low cognitive load?",
            "2. Is it conducive to writing the entire novel stably, not just the first few chapters that seem lively?",
            "3. Whether it can fulfill the promise of the subject matter, the expectations of the target readers and the promise of the first 30 chapters",
            "4. Whether it matches the existing selling point, reading sense, rhythm, emotional intensity and perspective tendency",
            "",
            "Recommended principles:",
            "1. Answer \"What kind of book is this\" based on the subject matter, and give priority to items that can stabilize the appearance of the story and market expectations.",
            "2. The main promotion mode answers \"what does this book rely on to continue to promote and realize\", and must choose the most core and stable driver.",
            "3. The secondary propulsion mode is only provided when it can really supplement the flavor and does not interfere with the main drive; otherwise it is not recommended.",
            "4. If there is still relatively little information, give priority to a combination that is more stable, wider, and less likely to collapse, rather than a subdivided combination that looks gorgeous but is difficult to control.",
            "5. If the user has manually selected a certain direction, unless there is an obvious conflict, try to converge around it instead of forcibly overturning it.",
            "6. If the specific subcategory can be determined, the specific subcategory will be recommended first; if the information is insufficient, the broader parent category will be returned.",
            "",
            "The output must be a JSON object, no Markdown, explanations, comments, or extra text.",
            "The fixed format is:",
            "{\"summary\":\"...\",\"genreId\":\"...\",\"genreReason\":\"...\",\"primaryStoryModeId\":\"...\",\"primaryStoryModeReason\":\"...\",\"secondaryStoryModeId\":\"...\",\"secondaryStoryModeReason\":\"...\",\"caution\":\"...\"}",
            "",
            "Field requirements:",
            "1. Summary: Use concise Georgian to explain why this combination is a suitable default foundation for the book.",
            "2. GenreReason: Explain why this genre base is suitable for the current story direction and reader expectations.",
            "3. primaryStoryModeReason: Explain why this primary promotion mode can stably fulfill core reading expectations.",
            "4. secondaryStoryModeId / secondaryStoryModeReason: Fill in only when really necessary; otherwise return an empty string or null.",
            "5. caution: prompts the point where this combination is most likely to overturn; it can be an empty string when there is no obvious risk.",
            "",
            "Hard constraints:",
            "1. The genreId must come from the given genre base list.",
            "2. primaryStoryModeId must be from the given push mode list.",
            "3. secondaryStoryModeId, if there is a value, must be from the given push mode list and cannot be the same as primaryStoryModeId.",
            "4. MUST NOT return an empty summary, an empty genreReason, or an empty primaryStoryModeReason.",
        ].join("\n")),
        new HumanMessage([
            "Current book opening information:",
            input.userIntentSummary,
            "",
            "Optional theme base list:",
            input.genreCatalogText,
            "",
            "List of optional propulsion modes:",
            input.storyModeCatalogText,
        ].join("\n")),
    ],
    postValidate: (output, input) => {
        const allowedGenreIds = new Set(input.allowedGenreIds);
        const allowedStoryModeIds = new Set(input.allowedStoryModeIds);
        if (!allowedGenreIds.has(output.genreId)) {
            throw new Error(`The theme recommendation results contain illegal IDs:${output.genreId}`);
        }
        if (!allowedStoryModeIds.has(output.primaryStoryModeId)) {
            throw new Error(`Main push mode recommendation results contain illegal IDs:${output.primaryStoryModeId}`);
        }
        const secondaryId = output.secondaryStoryModeId?.trim() ?? "";
        if (secondaryId) {
            if (!allowedStoryModeIds.has(secondaryId)) {
                throw new Error(`The secondary propulsion mode recommendation result contains an illegal ID:${secondaryId}`);
            }
            if (secondaryId === output.primaryStoryModeId) {
                throw new Error("The secondary propulsion mode cannot be the same as the main propulsion mode.");
            }
            if (!(output.secondaryStoryModeReason?.trim())) {
                throw new Error("When there is a secondary propulsion mode, the corresponding recommendation reason must be returned.");
            }
        }
        return output;
    }
};

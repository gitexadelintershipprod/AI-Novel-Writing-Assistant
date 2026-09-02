import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import type { z } from "zod";
import type { PromptAsset } from "../../core/promptTypes";
import { characterVisibleProfileOutputSchema, } from "./characterVisibleProfile.promptSchemas";
export interface CharacterVisibleProfilePromptInput {
    novelTitle: string;
    genreName: string;
    projectMode: string;
    storyModeBlock: string;
    bookContractText: string;
    worldContextText: string;
    bibleText: string;
    storyMacroText: string;
    characterName: string;
    characterRole: string;
    characterFunction: string;
    relationToProtagonist: string;
    existingCharacterProfile: string;
    existingVisibleProfile: string;
    relationText: string;
    userGuidance: string;
}
export const characterVisibleProfileCompletionPrompt: PromptAsset<CharacterVisibleProfilePromptInput, z.infer<typeof characterVisibleProfileOutputSchema>> = {
    id: "novel.character.visible_profile.complete",
    version: "v3",
    taskType: "planner",
    mode: "structured",
    language: "ka",
    contextPolicy: {
        maxTokensBudget: 0,
    },
    outputSchema: characterVisibleProfileOutputSchema,
    render: (input) => [
        new SystemMessage([
            "You are a top novelist and character editor.",
            "Your task is to complete the stable explicit information for the characters in the novel, so that the subsequent text can more easily write characters that \"readers can recognize at a glance\".",
            "",
            "Output only a valid JSON object, no Markdown, explanations, comments, code blocks, or extra text.",
            "",
            "The output structure is fixed to:",
            "{",
            "  \"appearance\": \"Appearance memory point\",",
            "  \"physique\": \"posture, sense of age, base of physical condition\",",
            "  \"attireStyle\": \"Common clothing or identity-related appearance\",",
            "  \"signatureDetail\": \"Signs, actions or details that readers can remember\",",
            "  \"voiceTexture\": \"Voice texture, speaking rhythm, tone characteristics\",",
            "  \"presenceImpression\": \"The intuitive feeling given to readers by the first or regular appearance\",",
            '  "confidence": 0.86,',
            '  "warnings": []',
            "}",
            "",
            "Hard rules:",
            "1. All content must be in natural Georgian.",
            "2. Only provide stable external information, do not include temporary injuries, temporary changes of clothes, current emotions, temporary fatigue or one-time states.",
            "3. Each field must directly help the text description or character identification, and empty words such as \"very good-looking\", \"cool temperament\", \"very recognizable\" and \"well-proportioned\" are prohibited.",
            "4. Do not overwrite the existing clear settings in the input; if the existing content is clear, make it more writable in the same direction and do not overturn it.",
            "5. Explicit materials must serve the subject matter, role functions, relationship tension, and book-level commitment, and cannot just be static character illustrations.",
            "6. Do not write character analysis, plot summary, and growth arc analysis into explicit fields.",
            "7. If the author gives a completion tendency, it will be absorbed as an explicit direction first; but it cannot violate the given subject matter, identity, world rules and clear character information.",
            "8. Each explicit field should be limited to 24-80 words, and only a stable and reusable identification point should be written; expansion of action scenes, plot fragments or long rhetoric is prohibited.",
            "9. The entire JSON should be controlled within 900 words; end with } immediately after completing warnings, and no continuation, re-reading or self-correction is allowed.",
            "",
            "Quality requirements:",
            "1. Appearance should include visual memory points, such as specific combinations of eyebrows, skin color, hairstyle, and expression habits.",
            "2. Physique should include posture, age, movement posture or body base, but do not write it as a numerical file.",
            "3. AttireStyle should reflect the stable wearing tendency in identity, class, occupation, world view or life status.",
            "4. The signatureDetail should appear repeatedly and lightly in the text. It can be stable details such as objects, gestures, micro-movements, smells, scars, organizing habits, etc.",
            "5. voiceTexture makes character dialogue easier to distinguish, including voice lines, sentence rhythm or oral habits.",
            "6. presenceImpression should describe the reader\u2019s feelings of intuitive oppression, closeness, danger, comedy, alienation, etc. when seeing this person for the first time or regularly.",
            "",
            "warnings are used to record points where information is insufficient, may conflict with existing data, and can only be inferred conservatively; if not, an empty array is output.",
            "Output must strictly conform to characterVisibleProfileOutputSchema.",
        ].join("\n")),
        new HumanMessage([
            `Novel:${input.novelTitle}`,
            `Theme/genre:${input.genreName}`,
            `Project mode:${input.projectMode}`,
            "",
            "Story mode:",
            input.storyModeBlock || "None yet",
            "",
            "Book Level Commitment:",
            input.bookContractText || "None yet",
            "",
            "The world context of this book:",
            input.worldContextText || "None yet",
            "",
            "Work Bible:",
            input.bibleText || "None yet",
            "",
            "Development trends/macro constraints:",
            input.storyMacroText || "None yet",
            "",
            `Role:${input.characterName}（${input.characterRole}）`,
            `Role functions:${input.characterFunction || "None yet"}`,
            `Relationship with the protagonist:${input.relationToProtagonist || "None yet"}`,
            "",
            "Current role information:",
            input.existingCharacterProfile || "None yet",
            "",
            "Explicit data already available:",
            input.existingVisibleProfile || "None yet",
            "",
            "Role relationships:",
            input.relationText || "None yet",
            "",
            "The author's tendency to complete:",
            input.userGuidance || "None yet",
        ].join("\n")),
    ]
};

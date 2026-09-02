import type { BookAnalysisCharacterDimension, BookAnalysisCharacterGenerationDepth, } from "@ai-novel/shared/types/bookAnalysisCharacter";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { z } from "zod";
import type { PromptAsset } from "../../core/promptTypes";
import { bookAnalysisCharacterAppearanceConsolidateOutputSchema, bookAnalysisCharacterAppearanceMergeOutputSchema, bookAnalysisCharacterAppearanceSnapshotOutputSchema, bookAnalysisCharacterGenerateOutputSchema, bookAnalysisCharacterIdentifyOutputSchema, bookAnalysisCharacterProfileOutputSchema, } from "../../../services/bookAnalysis/shared/bookAnalysisSchemas";
export interface BookAnalysisCharacterIdentifyPromptInput {
    characterSystemContext: string;
    notesText: string;
    existingCharacters: string[];
    limit: number;
}
export interface BookAnalysisCharacterGeneratePromptInput {
    generationDepth: BookAnalysisCharacterGenerationDepth;
    selectedDimensions: BookAnalysisCharacterDimension[];
    characterNames: string[];
    characterSystemContext: string;
    notesText: string;
}
export interface BookAnalysisCharacterProfilePromptInput {
    generationDepth: BookAnalysisCharacterGenerationDepth;
    selectedDimensions: BookAnalysisCharacterDimension[];
    character: {
        name: string;
        role: string;
        briefDescription?: string | null;
        importance?: string | null;
        occurringChapters?: string[];
    };
    characterSystemContext: string;
    notesText: string;
    ragEvidenceText?: string;
}
export interface BookAnalysisCharacterAppearanceSnapshotPromptInput {
    character: {
        name: string;
        role: string;
        profile?: Record<string, unknown> | null;
    };
    chapter: {
        chapterIndex: number;
        title: string;
        content: string;
    };
    notesText: string;
}
export interface BookAnalysisCharacterAppearanceConsolidatePromptInput {
    character: {
        name: string;
        role: string;
        profile?: Record<string, unknown> | null;
    };
    snapshotsText: string;
}
export interface BookAnalysisCharacterAppearanceMergePromptInput {
    character: {
        name: string;
        role: string;
        profile?: Record<string, unknown> | null;
    };
    currentAppearance: string;
    consolidatedAppearance?: Record<string, unknown> | null;
    selectedTerms: Array<{
        id: string;
        text: string;
        category?: string | null;
        confidence?: number | null;
        stability?: string | null;
        evidence?: unknown[];
    }>;
}
export const bookAnalysisCharacterIdentifyPrompt: PromptAsset<BookAnalysisCharacterIdentifyPromptInput, z.infer<typeof bookAnalysisCharacterIdentifyOutputSchema>> = {
    id: "bookAnalysis.character.identify",
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
    outputSchema: bookAnalysisCharacterIdentifyOutputSchema,
    render: (input) => [
        new SystemMessage([
            "You are a character-recognition assistant for Georgian-language fiction.",
            "Your task is to identify role candidates worthy of deep profiles in a low-cost way, not to generate full profiles.",
            "Output only JSON objects, no Markdown or explanations.",
            "The structure is fixed as:",
            '{ "candidates": [{ "name": "...", "roleHint": "...", "importance": "...", "briefDescription": "...", "occurringChapters": [] }] }',
            "Hard rules:",
            "1. Only identify characters based on notes and character system context, and do not add facts outside the original text.",
            "2. Use the most common, shortest, and most stable title for name; do not incorporate titles, companion titles, or honorifics into your name.",
            "3. roleHint Use one sentence to describe the function of the character in the work, such as protagonist, core supporting role, villain, mentor, and emotional line role.",
            "4. Importance can only be one of the three levels: high, medium, or low.",
            "5. The briefDescription should be limited to 60 words and explain why it is worth digging into.",
            "6. occurringChapters Only fill in chapter or stage labels that can be judged from the context, no guessing is allowed.",
            `7. Return at most ${Math.max(1, Math.min(16, input.limit))} candidates, sorted by importance.`,
        ].join("\n")),
        new HumanMessage([
            input.existingCharacters.length > 0 ? `Existing roles:${input.existingCharacters.join("、")}` : "Existing roles: None",
            "",
            "Character system context:",
            input.characterSystemContext || "(None yet)",
            "",
            "Available notes:",
            input.notesText,
        ].join("\n")),
    ]
};
export const bookAnalysisCharacterProfilePrompt: PromptAsset<BookAnalysisCharacterProfilePromptInput, z.infer<typeof bookAnalysisCharacterProfileOutputSchema>> = {
    id: "bookAnalysis.character.profile",
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
    outputSchema: bookAnalysisCharacterProfileOutputSchema,
    render: (input) => [
        new SystemMessage([
            "You analyze character profiles in Georgian-language fiction.",
            "Your task is to generate an in-depth character profile for novices to learn character building based on the unpacked notes, character system sections, and designated character candidates.",
            "Output only JSON objects, no Markdown or explanations.",
            "The structure is fixed as:",
            '{ "character": { "name": "...", "role": "...", "profile": {}, "profileSections": [], "evidence": [], "arcs": [], "scenes": [] } }',
            "Hard rules:",
            "1. Only analyze the specified roles, do not generate additional roles.",
            "2. All conclusions must come from notes or character system context, and facts outside the original text are not allowed.",
            "3. Profile contains at least name and role; it can include appearance, personality, outerGoal, innerNeed, growthTrajectory, speakingStyle and other fields according to the selected dimensions.",
            "4. ProfileSections are split according to the selected dimension, each item includes dimension, title, depth, content, and evidence; the deep/exhaustive mode must prioritize the original chunk evidence into the corresponding dimension.",
            "5. arcs is used for character stage changes; stageLabel must be specific. chapterIndex is the chapter index starting from 0. You can only fill in 0 when it is confirmed that it is Chapter 1; it must be omitted when the chapter is unknown, and 0 must not be used to represent unknown.",
            "6. scenes Use sceneLabel strings to describe highlight scenes or typical performances. Do not create formal scene entities.",
            "7. evidence.excerpt should be as close as possible to the clear information in the original text excerpt or notes; when it comes from the original text chunk, write sourceType=chapter_chunk, chunkId and quote.",
        ].join("\n")),
        new HumanMessage([
            `Generate depth:${input.generationDepth}`,
            `Generate dimensions:${input.selectedDimensions.join("、") || "basic"}`,
            "",
            "Designated role candidates:",
            `Name:${input.character.name}`,
            `Role positioning:${input.character.role}`,
            input.character.importance ? `Importance:${input.character.importance}` : "",
            input.character.briefDescription ? `Candidate Description:${input.character.briefDescription}` : "",
            input.character.occurringChapters?.length ? `Known appearance location:${input.character.occurringChapters.join("、")}` : "",
            "",
            "Character system context:",
            input.characterSystemContext || "(None yet)",
            "",
            "Available notes:",
            input.notesText,
            "",
            "RAG original text evidence (deep/exhaustive mode may provide):",
            input.ragEvidenceText || "(The original chunk is not provided this time and is strictly based on notes analysis)",
        ].filter(Boolean).join("\n")),
    ]
};
export const bookAnalysisCharacterGeneratePrompt: PromptAsset<BookAnalysisCharacterGeneratePromptInput, z.infer<typeof bookAnalysisCharacterGenerateOutputSchema>> = {
    id: "bookAnalysis.character.generate",
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
    outputSchema: bookAnalysisCharacterGenerateOutputSchema,
    render: (input) => [
        new SystemMessage([
            "You analyze character profiles in Georgian-language fiction.",
            "Your task is to generate an in-depth character profile for novices to learn character building based on the book notes and character system sections.",
            "Output only JSON objects, no Markdown or explanations.",
            "The structure is fixed as:",
            '{ "characters": [{ "name": "...", "role": "...", "profile": {}, "evidence": [], "arcs": [], "scenes": [] }] }',
            "Hard rules:",
            "1. All conclusions must come from notes or character system context, and facts outside the original text are not allowed.",
            "2. Profile contains at least name and role; it can include appearance, personality, outerGoal, innerNeed, growthTrajectory, speakingStyle and other fields as needed.",
            "3. arcs is used for character stage changes; stageLabel must be specific. chapterIndex is the chapter index starting from 0. You can only fill in 0 when it is confirmed that it is Chapter 1; it must be omitted when the chapter is unknown, and 0 must not be used to represent unknown.",
            "4. scenes Use sceneLabel strings to describe highlight scenes or typical performances. Do not create formal scene entities.",
            "5. evidence.excerpt should be as close as possible to the clear information in the original excerpt or notes.",
            "6. If the role name is specified, only these roles will be generated; if not specified, up to 6 most critical roles will be generated.",
        ].join("\n")),
        new HumanMessage([
            `Generate depth:${input.generationDepth}`,
            `Generate dimensions:${input.selectedDimensions.join("、") || "basic"}`,
            input.characterNames.length > 0 ? `Specify role:${input.characterNames.join("、")}` : "Specified role: Not specified, please select the most critical role",
            "",
            "Character system context:",
            input.characterSystemContext || "(None yet)",
            "",
            "Available notes:",
            input.notesText,
        ].join("\n")),
    ]
};
export const bookAnalysisCharacterAppearanceSnapshotPrompt: PromptAsset<BookAnalysisCharacterAppearanceSnapshotPromptInput, z.infer<typeof bookAnalysisCharacterAppearanceSnapshotOutputSchema>> = {
    id: "bookAnalysis.character.appearance.snapshot",
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
    outputSchema: bookAnalysisCharacterAppearanceSnapshotOutputSchema,
    render: (input) => [
        new SystemMessage([
            "You are the character image analysis assistant in Georgian-language serial novels.",
            "Your task is to extract the visual image status of the specified character in this chapter from the text of a single chapter for subsequent image evolution and drawing prompts.",
            "Output only JSON objects, no Markdown or explanations.",
            "The structure is fixed as:",
            '{ "appearance": {}, "evidence": [], "candidateTerms": [], "summaryCaption": "...", "contextSceneRefs": [] }',
            "Hard rules:",
            "1. Only analyze the specified character; when there is no reliable image information in this chapter, appearance returns an empty object, and summaryCaption can be left empty.",
            "2. Appearance can include fields such as appearance, clothing, accessories, physical condition, scars, mental outlook, posture, movement, expression and temperament.",
            "3. The original text of this chapter has been provided in full. Please use the text of the chapter as the only source of evidence. Do not add settings other than the original text or make up based on your impressions.",
            "4. SourceNotes are only for cross-chapter background reference (e.g. stable characteristics/historical clothing) and may not be used as direct evidence of the imagery in this chapter.",
            "5. summaryCaption Use one sentence to summarize the image status of this chapter that is suitable for drawing.",
            "6. contextSceneRefs records scene or event anchor points related to the image state.",
            "7. Evidence only outputs label, excerpt, sourceLabel, and chapterIndex; do not output sourceType, chunkId, noteSegmentId, and dimension. These are processed by the server-side evidence merging stage.",
            "8. candidateTerms outputs short terms that can be selected by users. Each entry contains id, text, category, confidence, stability, and evidence. There is no need to output.",
            "9. candidateTerms.text must be short terms, such as \"silver-gray short hair\", \"old left shoulder injury\", \"often wears dark windbreaker\"; do not write plot actions, temporary emotions, scene atmosphere or long explanations.",
            "10. For category, it is recommended to use stable_feature, chapter_state, clothing, accessory, scar, expression, physics, and aura; for stability, it is recommended to use stable, chapter_state, and uncertainty.",
        ].join("\n")),
        new HumanMessage([
            `Role:${input.character.name}`,
            `Positioning:${input.character.role}`,
            input.character.profile ? `Already have files:${JSON.stringify(input.character.profile).slice(0, 4000)}` : "",
            "",
            `Chapter: Chapter ${input.chapter.chapterIndex + 1} Chapter ${input.chapter.title}`,
            "Chapter text (the only source of evidence for the image in this chapter):",
            input.chapter.content,
            "",
            "SourceNotes background reference (only relevant to this character, cross-chapter background, not used as evidence for this chapter):",
            input.notesText || "(None yet)",
        ].filter(Boolean).join("\n")),
    ]
};
export const bookAnalysisCharacterAppearanceMergePrompt: PromptAsset<BookAnalysisCharacterAppearanceMergePromptInput, z.infer<typeof bookAnalysisCharacterAppearanceMergeOutputSchema>> = {
    id: "bookAnalysis.character.appearance.merge",
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
    outputSchema: bookAnalysisCharacterAppearanceMergeOutputSchema,
    render: (input) => [
        new SystemMessage([
            "You merge appearance details for characters in Georgian-language fiction.",
            "Your task is to integrate the appearance entries selected by the user into the character profile appearance, and at the same time provide a stable feature patch.",
            "Output only JSON objects, no Markdown or explanations.",
            "The structure is fixed as:",
            '{ "mergedAppearance": "...", "consolidatedAppearancePatch": {}, "acceptedTermIds": [], "ignoredTermIds": [], "mergeNotes": [] }',
            "Hard rules:",
            "1. Does not cover high-confidence stable features in the current appearance; can only be supplemented or rewritten more clearly based on input entries and evidence.",
            "2. Temporary clothing, injuries, disguises, and emotional states will be included in the stable appearance description of mergedAppearance only if the evidence shows that they are stable or recurring.",
            "3. If the term belongs to a single chapter but is not suitable for writing into the character file, please put it into ignoredTermIds and explain the reason in mergeNotes.",
            "4. The conflict information retains the party with more sufficient and stable evidence; the conflict description is written into mergeNotes.",
            "5. AcceptedTermIds and ignoredTermIds can only use the term id in the input, do not make up the id.",
        ].join("\n")),
        new HumanMessage([
            `Role:${input.character.name}`,
            `Positioning:${input.character.role}`,
            input.character.profile ? `Existing file summary:${JSON.stringify(input.character.profile).slice(0, 4000)}` : "",
            "",
            "Current character appearance:",
            input.currentAppearance || "(None yet)",
            "",
            "Current stable features:",
            JSON.stringify(input.consolidatedAppearance ?? {}),
            "",
            "Appearance entries selected by the user:",
            JSON.stringify(input.selectedTerms),
        ].filter(Boolean).join("\n")),
    ]
};
export const bookAnalysisCharacterAppearanceConsolidatePrompt: PromptAsset<BookAnalysisCharacterAppearanceConsolidatePromptInput, z.infer<typeof bookAnalysisCharacterAppearanceConsolidateOutputSchema>> = {
    id: "bookAnalysis.character.appearance.consolidate",
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
    outputSchema: bookAnalysisCharacterAppearanceConsolidateOutputSchema,
    render: (input) => [
        new SystemMessage([
            "You are an assistant for character image induction in serial fiction.",
            "Your task is to merge multiple chapter image snapshots into stable features and chapter differentiation strategies.",
            "Output only JSON objects, no Markdown or explanations.",
            "The structure is fixed as:",
            '{ "consolidatedAppearance": {}, "variantPolicy": {} }',
            "Hard rules:",
            "1. consolidatedAppearance only writes stable or high-confidence features across chapters.",
            "2. variantPolicy explains how variable information such as clothing, injuries, mental status, disguise, age, etc. changes from chapter to chapter.",
            "3. Do not perform a hard merge when a conflict is found. The source of the conflict and usage suggestions should be stated in the variantPolicy.",
        ].join("\n")),
        new HumanMessage([
            `Role:${input.character.name}`,
            `Positioning:${input.character.role}`,
            input.character.profile ? `Already have files:${JSON.stringify(input.character.profile).slice(0, 4000)}` : "",
            "",
            "Chapter image snapshot:",
            input.snapshotsText,
        ].filter(Boolean).join("\n")),
    ]
};

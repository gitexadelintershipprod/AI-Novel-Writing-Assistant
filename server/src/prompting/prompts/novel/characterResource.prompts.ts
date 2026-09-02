import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { z } from "zod";
import type { PromptAsset } from "../../core/promptTypes";
import { characterResourceExtractionOutputSchema } from "./characterResource.promptSchemas";
export interface CharacterResourceExtractionPromptInput {
    novelTitle: string;
    chapterOrder: number;
    chapterTitle: string;
    chapterContent: string;
    rosterText: string;
    existingResourceText: string;
}
const CHARACTER_RESOURCE_EXAMPLE = {
    updates: [
        {
            resourceName: "Back door copper key",
            resourceType: "credential",
            updateType: "acquired",
            holderCharacterName: "Cheng Zhi",
            ownerType: "character",
            ownerName: "Cheng Zhi",
            statusAfter: "available",
            readerKnows: true,
            holderKnows: true,
            knownByCharacterNames: ["Cheng Zhi"],
            narrativeFunction: "key",
            summary: "Cheng Zhi got the copper key that could open the back door.",
            narrativeImpact: "You can sneak in through the back door later, but you cannot enter the front entrance restricted area out of thin air.",
            expectedFutureUse: "Sneak into the warehouse or escape capture.",
            constraints: ["The key can only explain backdoor access and cannot replace other permissions."],
            evidence: ["Cheng Zhi put the copper key to the back door into his sleeve."],
            confidence: 0.86,
            riskLevel: "low",
            riskReason: "",
        },
    ],
    continuityRisks: [],
};
export const characterResourceExtractionPrompt: PromptAsset<CharacterResourceExtractionPromptInput, z.infer<typeof characterResourceExtractionOutputSchema>> = {
    id: "novel.character_resource.extract_updates",
    version: "v2",
    taskType: "fact_extraction",
    mode: "structured",
    language: "ka",
    contextPolicy: {
        maxTokensBudget: 0,
    },
    repairPolicy: {
        maxAttempts: 1,
    },
    structuredOutputHint: {
        example: CHARACTER_RESOURCE_EXAMPLE,
        note: [
            "Only output key resource changes for which there is clear evidence in the chapter.",
            "Don\u2019t mistake metaphors, common household items, or environmental disposables for long-term resources.",
            "Temporary character resources only enter updates when they are reused across chapters, affect conflicts, are bound to foreshadowing, or are taken away by the protagonist.",
            "confidence must be a 0-1 number; omit it if in doubt.",
        ].join(" "),
    },
    outputSchema: characterResourceExtractionOutputSchema,
    render: (input) => [
        new SystemMessage([
            "You are a novel character resource ledger extractor.",
            "Your task is to extract from the text of a single chapter the key resource changes in the character that will affect subsequent writing, review, repair, or replanning.",
            "",
            "Only output a valid JSON object, no Markdown, explanations, comments or code blocks.",
            "The top-level fixed format is {\"updates\":[],\"continuityRisks\":[]}.",
            "",
            "Extraction range:",
            "1. Key items, clues, credentials, trump cards, ability costs, relationship tokens, and consumable resources for the protagonist and long-term role.",
            "2. Hidden resources, traps, evidence, and control held by the villain or opponent.",
            "3. Temporary characters provide clues or resources that will affect subsequent chapters across chapters.",
            "",
            "Don't extract:",
            "1. Ordinary food and clothing items, purely environmental furnishings, and disposable small items with no subsequent impact.",
            "2. Metaphorical expressions, such as \"He holds the key to destiny.\"",
            "3. New items, new characters, or new abilities for which there is no evidence in the input.",
            "",
            "Judgment rules:",
            "1. All updates must have evidence.",
            "2. holderCharacterName must give priority to the name in the known character list; you can omit it if you are not sure, but do not make up the name.",
            "3. Key resources are destroyed, consumed, lost, or exposed in advance, and the risk is at least medium.",
            "4. The risk of changes that affect subsequent volume planning, fulfillment of foreshadowing, or boundaries of the protagonist\u2019s actions is at least medium.",
            "5. Put obvious continuity problems into continuityRisks, such as using without obtaining, reusing after consuming, and being unknown to the reader but considered as foreshadowing.",
            "6. Updates can output up to 8 updates; give priority to changes that affect action boundaries, foreshadowing fulfillment, or resource ownership across chapters.",
        ].join("\n")),
        new HumanMessage([
            `Novel:${input.novelTitle}`,
            `Chapter: Chapter${input.chapterOrder}Chapter "${input.chapterTitle}》`,
            "",
            "Known roles:",
            input.rosterText,
            "",
            "Existing role resource ledger summary:",
            input.existingResourceText || "There are currently no key resources.",
            "",
            "Chapter text:",
            input.chapterContent,
        ].join("\n")),
    ],
    postValidate: (output) => {
        for (const update of output.updates) {
            if (update.evidence.length === 0) {
                throw new Error(`Lack of evidence for resource changes:${update.resourceName}`);
            }
            if (update.expectedUseStartChapterOrder
                && update.expectedUseEndChapterOrder
                && update.expectedUseStartChapterOrder > update.expectedUseEndChapterOrder) {
                throw new Error(`Resources ${update.resourceName} The usage window is illegal.`);
            }
        }
        return output;
    }
};

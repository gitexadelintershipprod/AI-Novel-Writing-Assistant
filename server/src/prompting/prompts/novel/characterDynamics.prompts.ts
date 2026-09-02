import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { z } from "zod";
import type { PromptAsset } from "../../core/promptTypes";
import { chapterDynamicExtractionSchema, volumeDynamicsProjectionSchema, } from "../../../services/novel/dynamics/characterDynamicsSchemas";
const VOLUME_DYNAMICS_PROJECTION_TEMPLATE = `{
  "assignments": [
    {
      "characterName": "string",
      "volumeSortOrder": 1,
      "roleLabel": "string or null",
      "responsibility": "string",
      "plannedChapterOrders": [1, 2],
      "isCore": true,
      "absenceWarningThreshold": 3,
      "absenceHighRiskThreshold": 5
    }
  ],
  "factionTracks": [
    {
      "characterName": "string",
      "volumeSortOrder": 1,
      "factionLabel": "string",
      "stanceLabel": "string or null",
      "summary": "string or null"
    }
  ],
  "relationStages": [
    {
      "sourceCharacterName": "string",
      "targetCharacterName": "string",
      "volumeSortOrder": 1,
      "stageLabel": "string",
      "stageSummary": "string"
    }
  ]
}`;
export interface VolumeDynamicsProjectionPromptInput {
    novelTitle: string;
    description: string;
    targetAudience: string;
    sellingPoint: string;
    firstPromise: string;
    outline: string;
    structuredOutline: string;
    appliedCastOption: string;
    rosterText: string;
    relationText: string;
    volumePlansText: string;
}
export interface ChapterDynamicsExtractionPromptInput {
    novelTitle: string;
    targetAudience: string;
    sellingPoint: string;
    firstPromise: string;
    currentVolumeTitle: string;
    rosterText: string;
    relationText: string;
    chapterOrder: number;
    chapterTitle: string;
    chapterContent: string;
}
export const volumeDynamicsProjectionPrompt: PromptAsset<VolumeDynamicsProjectionPromptInput, z.infer<typeof volumeDynamicsProjectionSchema>> = {
    id: "novel.characterDynamics.volumeProjection",
    version: "v4",
    taskType: "planner",
    mode: "structured",
    language: "ka",
    contextPolicy: {
        maxTokensBudget: 0,
    },
    structuredOutputHint: {
        note: [
            "assignments cannot be empty; each input volume outputs at least the volume-level responsibilities of the protagonist or the core role of the volume.",
            "The volumeSortOrder in factionTracks and relationStages must be filled with the corresponding volume serial number.",
            "plannedChapterOrders can only be an array of positive integers; if in doubt, omit it or output an empty array. Do not output null, [null], or string array.",
            "If optional fields such as roleLabel, stanceLabel, and summary are not sure, they should be omitted first. Do not output null to make up the structure.",
            "Do not output confidence.",
        ].join(" "),
    },
    outputSchema: volumeDynamicsProjectionSchema,
    render: (input) => [
        new SystemMessage([
            "You are the character dynamic planner for long-form serial fiction.",
            "Your task is to generate an executable \"volume character dynamic projection\" based on the novel's positioning, selling points, first 30 chapter commitments, character roster, relationship structure, and volume planning.",
            "",
            "Output only a valid JSON object, no Markdown, explanations, comments, code blocks, or any extra text.",
            "The top level can only contain assignments, factionTracks, and relationshipStages.",
            "",
            "Global hard rules:",
            "1. Only character names that exist in the known roster can be used. Adding new characters, changing names, or using ambiguous nicknames is prohibited.",
            "2. All arrangements must be based on input materials, and no new settings, new relationships, or new identities beyond what the materials support may be invented.",
            "3. When there is insufficient material, conservative inferences must be made, and low-risk, tenable arrangements must be given priority. Do not forcefully fill in complex dynamics just to achieve completeness.",
            "4. The results must serve volume-level advancement, rather than being written into character cards or static files.",
            "5. assignments cannot be empty; each input volume outputs at least the volume-level responsibilities of the protagonist or the core role of the volume.",
            "6. If factionTracks and relationStages are output, the corresponding volumeSortOrder must be filled in. Omission or null output is not allowed.",
            "",
            "Threshold hard rules:",
            "1. absenceWarningThreshold and absenceHighRiskThreshold must be integers from 1-12.",
            "2. Even if the characters only appear together at the end of the volume, the threshold must not exceed 12.",
            "3. absenceHighRiskThreshold must not be less than absenceWarningThreshold.",
            "4. Priority is given to 3 / 5 under normal circumstances; deviations are only allowed if there are sufficient narrative reasons.",
            "",
            "Planning principles:",
            "1. The core roles are not distributed evenly, but according to the volume's mission, selling point fulfillment, and narrative function.",
            "2. The same character can be heated up, cooled down, transferred, retired or reactivated across volumes, but the changes must be logical.",
            "3. If a certain volume has the function of turning, upgrading, breaking point or closing, the character configuration must reflect this simultaneously.",
            "4. plannedChapterOrders is only filled in when the characters need to appear sparsely and anchored; it can be omitted when the characters appear frequently and continuously.",
            "5. plannedChapterOrders, if filled in, must be an array of positive integers; omit or output an empty array if in doubt, and never output null, [null] or a string array.",
            "6. If optional fields such as roleLabel, stanceLabel, and summary are not sure, they should be omitted first. Do not write null to make up the structure.",
            "",
            "Compressed output rules:",
            "1. Only retain the minimum results that the system really needs to consume later, and do not output a summary.",
            "2. factionTracks and relationStages only keep records that affect writing decisions.",
            "3. Do not output confidence.",
            "",
            "The fixed JSON structure is as follows:",
            VOLUME_DYNAMICS_PROJECTION_TEMPLATE,
            "",
            "Additional reminder: Legal examples of plannedChapterOrders are [4, 7] or [], [null], [\"4\"], [\"Chapter 4\"] are not allowed.",
            "Do not output confidence.",
            "",
            "The output content must strictly conform to volumeDynamicsProjectionSchema.",
        ].join("\n")),
        new HumanMessage([
            `Novel:${input.novelTitle}`,
            `Introduction to the novel:${input.description}`,
            `Target readers:${input.targetAudience}`,
            `Core selling points:${input.sellingPoint}`,
            `The first 30 chapters promise:${input.firstPromise}`,
            `Outline:${input.outline}`,
            `Structured outline:${input.structuredOutline}`,
            `Role scheme applied:${input.appliedCastOption}`,
            `List of known characters:
${input.rosterText}`,
            `Known structured relationships:
${input.relationText}`,
            `Volume planning:
${input.volumePlansText}`,
            "",
            "Output reminder: The threshold can only be an integer from 1-12, and highRiskThreshold cannot be less than warningThreshold.",
        ].join("\n\n")),
    ]
};
export const chapterDynamicsExtractionPrompt: PromptAsset<ChapterDynamicsExtractionPromptInput, z.infer<typeof chapterDynamicExtractionSchema>> = {
    id: "novel.characterDynamics.chapterExtract",
    version: "v2",
    taskType: "fact_extraction",
    mode: "structured",
    language: "ka",
    contextPolicy: {
        maxTokensBudget: 0,
    },
    structuredOutputHint: {
        note: [
            "confidence is an optional field.",
            "If confidence is output, it must be a 0-1 number.",
            "Do not output 5, 10, 80, percentile, localized rating, or stringified confidence; omit when in doubt.",
        ].join(" "),
    },
    outputSchema: chapterDynamicExtractionSchema,
    render: (input) => [
        new SystemMessage([
            "You are the character dynamic information extractor for long web articles.",
            "Your task is to extract \"fact-level changes that will actually affect subsequent updates to the character system\" from a given chapter.",
            "",
            "Output only a valid JSON object, no Markdown, explanations, comments, code blocks, or any extra text.",
            "",
            "Extraction target:",
            "1. Identify the key information in this chapter that affects the character structure, including new characters, camp changes, relationship changes, etc.",
            "2. All output must be fact-level extraction, not analysis, evaluation, or speculation.",
            "3. If there is a significant information gap in this chapter (a character knows something that others do not know, or a character is kept in the dark), extract the information boundaries of each main character: the key facts they confirm they know at the end of the chapter, and the key facts they do not yet know. This field can be omitted when there is no information difference.",
            "",
            "Global rules:",
            "1. It can only be extracted based on the main text of this chapter, and no settings or relationships that do not appear may be added.",
            "2. Do not write speculation as fact; do not output this item when the information is unclear.",
            "3. Do not retell the plot, do not write a long summary, only extract structural changes.",
            "4. All characters must use clear names and do not use pronouns such as \"he\", \"she\" and \"the other person\".",
            "5. Confidence is an optional field; if filled in, it must be a number between 0 and 1. If you are unsure, omit it.",
            "6. Do not output 5, 10, 80, percentile, localized rating, or stringified confidence.",
            "",
            "Minimal legal example (omit characterKnowledgeStates when there is no information difference):",
            "{\"candidates\":[{\"proposedName\":\"Old Wu\",\"proposedRole\":\"Head of the handymen\",\"summary\":\"Responsible for supervising the backyard handymen.\",\"evidence\":[\"Old Wu is responsible for supervising the work\"],\"matchedCharacterName\":\"\",\"confidence\":0.8}],\"factionUpdates\":[],\"re lationStages\":[{\"sourceCharacterName\":\"Guan Shi Zhao\",\"targetCharacterName\":\"Cheng Zhi\",\"stageLabel\":\"Monitoring Upgrade\",\"stageSummary\":\"Guan Shi Zhao began to keep an eye on Cheng Zhi. \",\"nextTurnPoint\":\"Cheng Zhi was ready to change his response strategy.",
            "Example snippet with information gap:",
            "\"characterKnowledgeStates\":[{\"characterName\":\"Cheng Zhi\",\"knownFacts\":[\"The account books are hidden in the west wing\"],\"hiddenFacts\":[\"Manager Zhao already knows the location of the account books\"]}]",
            "",
            "The output must strictly conform to chapterDynamicExtractionSchema.",
        ].join("\n")),
        new HumanMessage([
            `Novel:${input.novelTitle}`,
            `Target readers:${input.targetAudience}`,
            `Core selling points:${input.sellingPoint}`,
            `The first 30 chapters promise:${input.firstPromise}`,
            `Current volume:${input.currentVolumeTitle}`,
            `List of known characters:
${input.rosterText}`,
            `Known structured relationships:
${input.relationText}`,
            "",
            `Chapter ${input.chapterOrder}：《${input.chapterTitle}》`,
            input.chapterContent,
        ].join("\n\n")),
    ]
};

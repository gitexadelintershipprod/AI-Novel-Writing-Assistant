import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { z } from "zod";
import type { PromptAsset } from "../../core/promptTypes";
import { renderSelectedContextBlocks } from "../../core/renderContextBlocks";
import { characterCastAutoResponseSchema, characterCastOptionResponseSchema, supplementalCharacterGenerationResponseSchema, } from "./characterPreparation.promptSchemas";
const CHARACTER_CAST_OPTION_RESPONSE_TEMPLATE = `{
  "options": [
    {
      "title": "string",
      "summary": "string",
      "whyItWorks": "string",
      "recommendedReason": "string",
      "members": [
        {
          "name": "string",
          "role": "string",
          "gender": "male",
          "castRole": "protagonist",
          "relationToProtagonist": "string",
          "storyFunction": "string",
          "shortDescription": "string",
          "personality": "string",
          "background": "string",
          "development": "string",
          "identityLabel": "string",
          "factionLabel": "string",
          "stanceLabel": "string",
          "powerLevel": "string",
          "realm": "string",
          "currentLocation": "string",
          "availability": "string",
          "prohibitions": ["string"],
          "outerGoal": "string",
          "innerNeed": "string",
          "fear": "string",
          "wound": "string",
          "misbelief": "string",
          "secret": "string",
          "moralLine": "string",
          "firstImpression": "string"
        }
      ],
      "relations": [
        {
          "sourceName": "string",
          "targetName": "string",
          "surfaceRelation": "string",
          "hiddenTension": "string",
          "conflictSource": "string",
          "secretAsymmetry": "string",
          "dynamicLabel": "string",
          "nextTurnPoint": "string"
        }
      ]
    }
  ]
}`;
const CHARACTER_CAST_AUTO_RESPONSE_TEMPLATE = `{
  "option": {
    "title": "string",
    "summary": "string",
    "whyItWorks": "string",
    "recommendedReason": "string",
    "members": [
      {
        "name": "string",
        "role": "string",
        "gender": "male",
        "castRole": "protagonist",
        "relationToProtagonist": "string",
        "storyFunction": "string",
        "shortDescription": "string",
        "personality": "string",
        "background": "string",
        "development": "string",
        "identityLabel": "string",
        "factionLabel": "string",
        "stanceLabel": "string",
        "powerLevel": "string",
        "realm": "string",
        "currentLocation": "string",
        "availability": "string",
        "prohibitions": ["string"],
        "outerGoal": "string",
        "innerNeed": "string",
        "fear": "string",
        "wound": "string",
        "misbelief": "string",
        "secret": "string",
        "moralLine": "string",
        "firstImpression": "string"
      }
    ],
    "relations": [
      {
        "sourceName": "string",
        "targetName": "string",
        "surfaceRelation": "string",
        "hiddenTension": "string",
        "conflictSource": "string",
        "secretAsymmetry": "string",
        "dynamicLabel": "string",
        "nextTurnPoint": "string"
      }
    ]
  }
}`;
const SUPPLEMENTAL_CHARACTER_RESPONSE_TEMPLATE = `{
  "mode": "linked",
  "recommendedCount": 2,
  "planningSummary": "string",
  "candidates": [
    {
      "name": "string",
      "role": "string",
      "gender": "female",
      "castRole": "ally",
      "summary": "string",
      "storyFunction": "string",
      "relationToProtagonist": "string",
      "personality": "string",
      "background": "string",
      "development": "string",
      "identityLabel": "string",
      "factionLabel": "string",
      "stanceLabel": "string",
      "powerLevel": "string",
      "realm": "string",
      "currentLocation": "string",
      "availability": "string",
      "prohibitions": ["string"],
      "outerGoal": "string",
      "innerNeed": "string",
      "fear": "string",
      "wound": "string",
      "misbelief": "string",
      "secret": "string",
      "moralLine": "string",
      "firstImpression": "string",
      "currentState": "string",
      "currentGoal": "string",
      "whyNow": "string",
      "relations": [
        {
          "sourceName": "string",
          "targetName": "string",
          "surfaceRelation": "string",
          "hiddenTension": "string",
          "conflictSource": "string",
          "dynamicLabel": "string",
          "nextTurnPoint": "string"
        }
      ]
    }
  ]
}`;
export interface CharacterCastOptionPromptInput {
    optionCount: number;
}
export interface CharacterCastOptionRepairPromptInput {
    payloadJson: string;
    failureReasons: string[];
}
export interface CharacterCastOptionNormalizePromptInput {
    payloadJson: string;
}
export interface CharacterCastAutoPromptInput {
}
export interface CharacterCastAutoRepairPromptInput {
    payloadJson: string;
    failureReasons: string[];
}
export interface CharacterCastAutoNormalizePromptInput {
    payloadJson: string;
}
export interface SupplementalCharacterPromptInput {
}
export interface SupplementalCharacterNormalizePromptInput {
    payloadJson: string;
}
export const characterCastOptionPrompt: PromptAsset<CharacterCastOptionPromptInput, z.infer<typeof characterCastOptionResponseSchema>> = {
    id: "novel.character.castOptions",
    version: "v3",
    taskType: "planner",
    mode: "structured",
    language: "ka",
    contextPolicy: {
        maxTokensBudget: 0,
        requiredGroups: ["idea_seed", "protagonist_anchor", "output_policy"],
        preferredGroups: [
            "hidden_identity_anchor",
            "project_context",
            "book_contract",
            "macro_constraints",
            "world_stage",
            "forbidden_names",
        ],
    },
    repairPolicy: {
        maxAttempts: 2,
    },
    outputSchema: characterCastOptionResponseSchema,
    render: (input, context) => [
        new SystemMessage([
            "You are the character lineup planner for long-form serial fiction, and your service targets novice users who do not understand the writing process.",
            "Your task is to generate a core cast of characters for the current novel that can go directly into text planning, not to output an abstract functional network.",
            "",
            "Only return strict JSON, no Markdown, explanations, comments, code blocks, or extra text.",
            `Must be output accurately ${input.optionCount} set of plans, not less than or more than ${input.optionCount} set.`,
            "",
            "[Structural Hard Rules]",
            "1. The given JSON structure must be strictly adhered to.",
            "2. Field names must remain in English, and field value contents must be in natural Georgian.",
            "3. Each plan must contain 3-6 members and 2-12 relationships.",
            "4. Each role must output gender, and the only allowed values are male, female, other, and unknown.",
            "5. CastRole can only use: protagonist, antagonist, ally, foil, mentor, love_interest, pressure_source, catalyst.",
            "6. Each character must output personality, background, and development, and must not only give shortDescription.",
            "7. Each role must output the role hard fact fields: identityLabel, factorLabel, stanceLabel, powerLevel, realm, currentLocation, availability, prohibitions; if you are unsure, you can fill in empty strings or empty arrays, but you are not allowed to make up important facts that exceed the book-level settings.",
            "",
            "[Hard naming rules]",
            "1. Name can only be written as a real person's name, stable title, historical official title, palace title, Jianghu title or camp status title that can be directly entered into the text.",
            "2. It is absolutely forbidden to write function words into the name, such as: mystery catalyst, knowledge mentor, external threat, emotion, relationship variable, and function.",
            "3. storyFunction is responsible for writing narrative responsibilities, and name is not responsible for carrying function descriptions.",
            "4. Role names in the same scheme must be distinguishable from each other, and there should not be a batch of abstract template names.",
            "",
            "[Lineup quality requirements]",
            "1. Each plan must have a clear protagonist anchor point, and the protagonist cannot be written as a functional position.",
            "2. If the story has a hidden identity, historical real name, disguised identity, or identity reversal in the end, this line must be explicitly picked up by the character cast.",
            "3. Each plan should reflect real character relationship dynamics, sources of stress, growth costs, and long-term conflicts, rather than a stack of character descriptions.",
            "4. Do not let multiple characters assume almost the same storyFunction in the same scheme.",
            "5. The combination of characters must be able to support the advancement of the feature, rather than just serve the one-time hit point in the opening chapter.",
            "6. The hard facts of the character should give priority to the theme setting and camp relationship, such as identity, camp, realm/combat power, and current playable status, to avoid writing camp, cultivation level, or identity backwards in subsequent text.",
            "",
            "[Subject matter restrictions]",
            "If the context is history, time travel, palace, officialdom or strong institutional environment, the lineup must reflect the identity of the era, institutional oppression, power chains and identity contrast, and cannot degenerate into a general functional network.",
            "",
            "\u3010Express request\u3011",
            "1. All descriptions must be specific and avoid empty words such as \"distinct characters\", \"complex relationships\" and \"promoting the plot\".",
            "2. Except for summary, whyItWorks, and recommendedReason, the remaining text fields are preferably controlled to short sentences or short phrases.",
            "3. If you are not sure about your gender, fill in unknown and leave it blank.",
            "",
            "The fixed template is as follows:",
            CHARACTER_CAST_OPTION_RESPONSE_TEMPLATE,
        ].join("\n")),
        new HumanMessage([
            "Please generate a character lineup based on the following context.",
            "",
            "[Hierarchical context]",
            renderSelectedContextBlocks(context),
            "",
            "[Output requirements]",
            `- Accurate output ${input.optionCount} set of plans`,
            "- name must be a playable character name or a stable title",
            "- storyFunction is responsible for writing functions, name cannot be written as function bits",
            "- Each character must have gender",
            "- Only output strict JSON",
        ].join("\n")),
    ]
};
export const characterCastOptionRepairPrompt: PromptAsset<CharacterCastOptionRepairPromptInput, z.infer<typeof characterCastOptionResponseSchema>> = {
    id: "novel.character.castOptions.repair",
    version: "v2",
    taskType: "planner",
    mode: "structured",
    language: "ka",
    contextPolicy: {
        maxTokensBudget: 0,
    },
    outputSchema: characterCastOptionResponseSchema,
    render: (input, context) => [
        new SystemMessage([
            "You are a Georgian-language fiction character planning and repair editor. Correct a generated but underqualified character-lineup JSON into a version that can be stored directly without changing the schema.",
            "You can only fix the content, not change the overall story direction.",
            "",
            "Output only valid JSON, no Markdown, explanations, comments, or extra text.",
            "",
            "Hard rules:",
            "1. The outermost structure and number of options of the original JSON must be retained.",
            "2. You can rewrite the contents of title, summary, members, and relations, but you cannot delete the plan, nor can you change the 3 sets to other quantities.",
            "3. All functional character names must be corrected and changed into real playable names or stable titles.",
            "4. Each role must have a gender, and the only allowed values are male, female, other, and unknown.",
            "5. All displayed text must be in natural natural Georgian, and no obvious English residue should be retained.",
            "6. The same story direction, protagonist anchor, core conflict, and hidden identity clues must be maintained and not rewritten into another set of books.",
            "",
            "Key repair principles:",
            "1. Abstract slots such as \"a certain position, catalyst, threat source, functional position, relationship variable\" can no longer appear in name.",
            "2. If there are clues about the protagonist\u2019s current identity or hidden identity in the context, at least let the protagonist plan explicitly take over these clues.",
            "3. Avoid multiple people taking on the same story function within the same plan.",
        ].join("\n")),
        new HumanMessage([
            "The following JSON needs fixing.",
            "",
            "[Hierarchical context]",
            renderSelectedContextBlocks(context),
            "",
            "[Cause of failure]",
            input.failureReasons.map((reason, index) => `${index + 1}. ${reason}`).join("\n") || "Not provided",
            "",
            "[JSON to be fixed]",
            input.payloadJson,
            "",
            "Please output the complete repaired JSON.",
        ].join("\n")),
    ]
};
export const characterCastOptionNormalizePrompt: PromptAsset<CharacterCastOptionNormalizePromptInput, z.infer<typeof characterCastOptionResponseSchema>> = {
    id: "novel.character.castOptions.zhNormalize",
    version: "v2",
    taskType: "planner",
    mode: "structured",
    language: "ka",
    contextPolicy: {
        maxTokensBudget: 0,
    },
    outputSchema: characterCastOptionResponseSchema,
    render: (input) => [
        new SystemMessage([
            "You are the character planning editor for Georgian-language novels, responsible for language normalization of the character lineup JSON.",
            "Your task is to rewrite all text values displayed to users into natural, smooth, and directly readable natural Georgian expressions.",
            "",
            "Output only valid JSON, no Markdown, explanations, comments, code blocks, or extra text.",
            "",
            "Hard rules for structure:",
            "1. The original JSON structure, field names, hierarchical relationships and array length must be strictly retained.",
            "2. It is not allowed to add fields, delete fields, rename fields or adjust the order of fields.",
            "3. Array elements are not allowed to be added or deleted, only the content is allowed to be rewritten.",
            "",
            "Content rewriting rules:",
            "1. All display text must be rewritten into natural natural Georgian.",
            "2. Retain the original semantics, relationship meanings and role functions, and the setting logic must not be changed.",
            "3. The castRole and gender enumeration values must remain intact and may not be translated or rewritten.",
            "4. Existing proper names and titles should be kept as stable as possible and do not change names without authorization.",
            "5. No new plots, world settings or relationships are allowed.",
        ].join("\n")),
        new HumanMessage(`Please rewrite all text content displayed to users in the JSON below into natural Georgian, and keep the structure and meaning unchanged:
${input.payloadJson}`),
    ]
};
export const characterCastAutoPrompt: PromptAsset<CharacterCastAutoPromptInput, z.infer<typeof characterCastAutoResponseSchema>> = {
    id: "novel.character.castAuto",
    version: "v2",
    taskType: "planner",
    mode: "structured",
    language: "ka",
    contextPolicy: {
        maxTokensBudget: 0,
        requiredGroups: ["idea_seed", "protagonist_anchor", "output_policy"],
        preferredGroups: [
            "hidden_identity_anchor",
            "project_context",
            "book_contract",
            "macro_constraints",
            "world_stage",
            "forbidden_names",
        ],
    },
    repairPolicy: {
        maxAttempts: 2,
    },
    outputSchema: characterCastAutoResponseSchema,
    render: (_input, context) => [
        new SystemMessage([
            "You are the character lineup planner for long-form serial fiction, and your service targets novice users who do not understand the writing process.",
            "Your task is to directly produce a set of core character lineups that can be automatically dropped into the inventory and can directly enter the main text planning, rather than providing multiple sets of alternative plans.",
            "",
            "Only return strict JSON, no Markdown, explanations, comments, code blocks, or extra text.",
            "",
            "[Structural Hard Rules]",
            "1. The given JSON structure must be strictly adhered to.",
            "2. Field names must remain in English, and field value contents must be in natural Georgian.",
            "3. The lineup must contain 3-6 members and 2-12 relationships.",
            "4. Each role must output gender, and the only allowed values are male, female, other, and unknown.",
            "5. CastRole can only use: protagonist, antagonist, ally, foil, mentor, love_interest, pressure_source, catalyst.",
            "6. Each character must output personality, background, and development, and must not only give shortDescription.",
            "7. Each role must output the role hard fact fields: identityLabel, factorLabel, stanceLabel, powerLevel, realm, currentLocation, availability, prohibitions; if you are unsure, you can fill in empty strings or empty arrays, but you are not allowed to make up important facts that exceed the book-level settings.",
            "",
            "[Hard naming rules]",
            "1. Name can only be written as a real person\u2019s name, stable title, historical official title, palace title, Jianghu title or camp status title that can be directly entered into the text.",
            "2. It is absolutely forbidden to write function words into the name, such as: mystery catalyst, knowledge mentor, external threat, emotion, relationship variable, and function.",
            "3. storyFunction is responsible for writing narrative responsibilities, and name is not responsible for carrying function descriptions.",
            "4. Character names in the same lineup must be distinguishable from each other, and there should not be a batch of abstract template titles.",
            "",
            "[Lineup quality requirements]",
            "1. There must be a clear anchor point for the protagonist, and the protagonist cannot be written as a functional position.",
            "2. If the story has a hidden identity, historical real name, disguised identity, or identity reversal in the end, this line must be explicitly picked up by the character cast.",
            "3. Relationships must reflect real character dynamics, stressors, growth costs, and long-term conflicts rather than just character descriptions.",
            "4. Don\u2019t have multiple characters responsible for almost the same storyFunction.",
            "5. This lineup must be able to support the advancement of the long-form story, rather than just serve the one-time hit point in the opening chapter.",
            "6. The hard facts of the character should give priority to the theme setting and camp relationship, such as identity, camp, realm/combat power, and current playable status, to avoid writing camp, cultivation level, or identity backwards in subsequent text.",
            "",
            "[Subject matter restrictions]",
            "If the context is history, time travel, palace, officialdom or strong institutional environment, the lineup must reflect the identity of the era, institutional oppression, power chains and identity contrast, and cannot degenerate into a general functional network.",
            "",
            "\u3010Express request\u3011",
            "1. All descriptions must be specific and avoid empty words such as \"distinct characters\", \"complex relationships\" and \"promoting the plot\".",
            "2. Except for summary, whyItWorks, and recommendedReason, the remaining text fields are preferably controlled to short sentences or short phrases.",
            "3. If you are not sure about your gender, fill in unknown and leave it blank.",
            "",
            "The fixed template is as follows:",
            CHARACTER_CAST_AUTO_RESPONSE_TEMPLATE,
        ].join("\n")),
        new HumanMessage([
            "Please generate a cast of characters to be directly adopted by the automatic director based on the following context.",
            "",
            "[Hierarchical context]",
            renderSelectedContextBlocks(context),
            "",
            "[Output requirements]",
            "- Only output 1 set of character lineup",
            "- name must be a playable character name or a stable title",
            "- storyFunction is responsible for writing functions, name cannot be written as function bits",
            "- Each character must have gender",
            "- Only output strict JSON",
        ].join("\n")),
    ]
};
export const characterCastAutoRepairPrompt: PromptAsset<CharacterCastAutoRepairPromptInput, z.infer<typeof characterCastAutoResponseSchema>> = {
    id: "novel.character.castAuto.repair",
    version: "v2",
    taskType: "planner",
    mode: "structured",
    language: "ka",
    contextPolicy: {
        maxTokensBudget: 0,
    },
    outputSchema: characterCastAutoResponseSchema,
    render: (input, context) => [
        new SystemMessage([
            "You are a Georgian-language fiction character planning and repair editor. Correct a generated but underqualified character-lineup JSON into a version that can be stored directly without changing the schema.",
            "You can only fix the content, not change the overall story direction.",
            "",
            "Output only valid JSON, no Markdown, explanations, comments, or extra text.",
            "",
            "Hard rules:",
            "1. The outermost structure and option object of the original JSON must be retained.",
            "2. You can rewrite the content of title, summary, members, and relations, but you cannot change it to multiple plans.",
            "3. All functional character names must be corrected and changed into real playable names or stable titles.",
            "4. Each role must have a gender, and the only allowed values are male, female, other, and unknown.",
            "5. All displayed text must be in natural natural Georgian, and no obvious English residue should be retained.",
            "6. The same story direction, protagonist anchor, core conflict, and hidden identity clues must be maintained and not rewritten into another set of books.",
            "",
            "Key repair principles:",
            "1. Abstract slots such as \"a certain position, catalyst, threat source, functional position, relationship variable\" can no longer appear in name.",
            "2. If there are clues about the protagonist\u2019s current identity or hidden identity in the context, at least let the protagonist plan explicitly take over these clues.",
            "3. Avoid multiple people in the same lineup taking on the same story function.",
        ].join("\n")),
        new HumanMessage([
            "The following JSON needs fixing.",
            "",
            "[Hierarchical context]",
            renderSelectedContextBlocks(context),
            "",
            "[Cause of failure]",
            input.failureReasons.map((reason, index) => `${index + 1}. ${reason}`).join("\n") || "Not provided",
            "",
            "[JSON to be fixed]",
            input.payloadJson,
            "",
            "Please output the complete repaired JSON.",
        ].join("\n")),
    ]
};
export const characterCastAutoNormalizePrompt: PromptAsset<CharacterCastAutoNormalizePromptInput, z.infer<typeof characterCastAutoResponseSchema>> = {
    id: "novel.character.castAuto.zhNormalize",
    version: "v2",
    taskType: "planner",
    mode: "structured",
    language: "ka",
    contextPolicy: {
        maxTokensBudget: 0,
    },
    outputSchema: characterCastAutoResponseSchema,
    render: (input) => [
        new SystemMessage([
            "You are the character planning editor for Georgian-language novels, responsible for language normalization of the character lineup JSON.",
            "Your task is to rewrite all text values displayed to users into natural, smooth, and directly readable natural Georgian expressions.",
            "",
            "Output only valid JSON, no Markdown, explanations, comments, code blocks, or extra text.",
            "",
            "Hard rules for structure:",
            "1. The original JSON structure, field names, hierarchical relationships and object order must be strictly retained.",
            "2. It is not allowed to add fields, delete fields, rename fields or adjust the order of fields.",
            "3. You are not allowed to make up a second set of plans, you can only rewrite the content of the existing option.",
            "",
            "Content rewriting rules:",
            "1. All display text must be rewritten into natural natural Georgian.",
            "2. Retain the original semantics, relationship meanings and role functions, and the setting logic must not be changed.",
            "3. The castRole and gender enumeration values must remain intact and may not be translated or rewritten.",
            "4. Existing names and titles should be kept as stable as possible and do not change names without authorization.",
            "5. No new plots, world settings or relationships are allowed.",
        ].join("\n")),
        new HumanMessage(`Please rewrite all text content displayed to users in the JSON below into natural Georgian, and keep the structure and meaning unchanged:
${input.payloadJson}`),
    ]
};
export const supplementalCharacterPrompt: PromptAsset<SupplementalCharacterPromptInput, z.infer<typeof supplementalCharacterGenerationResponseSchema>> = {
    id: "novel.character.supplemental",
    version: "v2",
    taskType: "planner",
    mode: "structured",
    language: "ka",
    contextPolicy: {
        maxTokensBudget: 0,
    },
    outputSchema: supplementalCharacterGenerationResponseSchema,
    render: (_input, context) => [
        new SystemMessage([
            "You are the complementary character planner for a full-length Georgian-language novel project.",
            "Your task is not to rebuild the entire lineup, but to accurately fill the character pressure, emotional tension, relationship pull or functional gaps based on the existing character system.",
            "",
            "Only return strict JSON, no Markdown, explanations, comments, code blocks, or extra text.",
            "",
            "Hard rules:",
            "1. Candidate roles must be used directly in the main text and must not be written as function placeholders.",
            "2. Each candidate must output gender; if in doubt, fill in unknown and cannot be omitted.",
            "3. All display text values must be in natural and smooth natural Georgian.",
            "4. It is forbidden to reuse existing character names in forbidden names.",
            "5. CastRole can only use: protagonist, antagonist, ally, foil, mentor, love_interest, pressure_source, catalyst.",
            "6. Each candidate must output personality, background, development, and role hard fact fields: identityLabel, factorLabel, stanceLabel, powerLevel, realm, currentLocation, availability, prohibitions.",
            "",
            "Filling requirements:",
            "1. The candidate character must truly fill the gap in the existing lineup, rather than mechanically recreating a position with the same function.",
            "2. When mode=linked, priority is given to forming sustainable relationships; when mode=independent, priority is given to independent but high-value story responsibilities.",
            "3. The generated results should serve the purpose of long-form development, rather than being a one-time tool.",
            "4. The hard facts must be able to help the subsequent text avoid errors in identity, camp, realm, location or available status; fill in empty strings or empty arrays when in doubt.",
            "",
            "The fixed template is as follows:",
            SUPPLEMENTAL_CHARACTER_RESPONSE_TEMPLATE,
        ].join("\n")),
        new HumanMessage([
            "Please generate candidates for complementary roles based on the following context.",
            "",
            "[Hierarchical context]",
            renderSelectedContextBlocks(context),
            "",
            "[Output requirements]",
            "- The character name must be a specific person's name or a stable title",
            "- Each character must have gender",
            "- Only output strict JSON",
        ].join("\n")),
    ]
};
export const supplementalCharacterNormalizePrompt: PromptAsset<SupplementalCharacterNormalizePromptInput, z.infer<typeof supplementalCharacterGenerationResponseSchema>> = {
    id: "novel.character.supplemental.zhNormalize",
    version: "v2",
    taskType: "planner",
    mode: "structured",
    language: "ka",
    contextPolicy: {
        maxTokensBudget: 0,
    },
    outputSchema: supplementalCharacterGenerationResponseSchema,
    render: (input) => [
        new SystemMessage([
            "You are the Georgian-language novel character planning editor, responsible for language normalization and polishing of the supplementary character JSON.",
            "Your task is to rewrite all text values displayed to users into natural, smooth, and directly readable natural Georgian expressions.",
            "",
            "Output only valid JSON, no Markdown, explanations, comments, code blocks, or extra text.",
            "",
            "Hard rules for structure:",
            "1. The original JSON structure, field names, hierarchical relationships and array length must be strictly retained.",
            "2. It is not allowed to add fields, delete fields, rename fields or adjust the order of fields.",
            "3. Array elements are not allowed to be added or deleted, only the content is allowed to be rewritten.",
            "",
            "Content rewriting rules:",
            "1. All display text must be rewritten into natural natural Georgian.",
            "2. When rewriting, the original semantics, role functions, relationship meanings and conflict directions must be retained, and the setting logic must not be changed.",
            "3. The castRole and gender enumeration values must remain intact and may not be translated or rewritten.",
            "4. No new settings, plots or relationships may be added.",
        ].join("\n")),
        new HumanMessage(`Please rewrite all text content displayed to users in the JSON below into natural Georgian, and keep the structure and meaning unchanged:
${input.payloadJson}`),
    ]
};

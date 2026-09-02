import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { z } from "zod";
import type { PromptAsset } from "../../core/promptTypes";
import { renderSelectedContextBlocks } from "../../core/renderContextBlocks";
import { characterCastAutoMembersResponseSchema, characterCastAutoRelationsResponseSchema, } from "./characterPreparation.promptSchemas";
export interface CharacterCastAutoMembersPromptInput {
}
export interface CharacterCastAutoRelationsPromptInput {
    storyInput: string;
    optionTitle: string;
    optionSummary: string;
    protagonistName: string;
    memberNames: string[];
    memberRosterText: string;
}
export const characterCastAutoMembersPrompt: PromptAsset<CharacterCastAutoMembersPromptInput, z.infer<typeof characterCastAutoMembersResponseSchema>> = {
    id: "novel.character.castAuto.members",
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
        maxAttempts: 1,
    },
    semanticRetryPolicy: {
        maxAttempts: 1,
    },
    outputSchema: characterCastAutoMembersResponseSchema,
    render: (_input, context) => [
        new SystemMessage([
            "You are the character lineup planner for long-form serial fiction, and your service targets novice users who do not understand the writing process.",
            "Your task is to first produce character member skeletons that can be directly dropped into the library. Do not generate relations at this step.",
            "",
            "Only return strict JSON, no Markdown, explanations, comments, code blocks, or extra text.",
            "The final JSON can only contain: title, summary, whyItWorks, recommendedReason, members.",
            "",
            "Hard rules:",
            "1. members must be 3-6 roles.",
            "2. There must be and can only be 1 protagonist.",
            "3. Each role must output gender, and the only allowed values are male, female, other, and unknown.",
            "4. CastRole can only use: protagonist, antagonist, ally, foil, mentor, love_interest, pressure_source, catalyst.",
            "5. Name can only be written as a person's name or stable title that can be directly entered into the text. Functional names are prohibited.",
            "6. If the story contains hidden identities, historical real names, disguised identities, or identity reversals in the end, this line must be explicitly inherited in the member information.",
            "7. Each role must output personality, background, development and role hard fact fields: identityLabel, factorLabel, stanceLabel, powerLevel, realm, currentLocation, availability, prohibitions.",
            "8. Don't print relations, and don't pretend to stuff relational arrays in fields.",
            "",
            "Express a request:",
            "1. All field values use natural Georgian.",
            "2. Except for summary, whyItWorks, and recommendedReason, try to keep the rest of the text in short sentences or short phrases.",
            "3. StoryFunction must write responsibilities, and name does not carry function description.",
            "4. The hard facts of the character are given priority to identity, camp, realm/combat power, current location and available status; it is not allowed to fill in empty strings or empty arrays.",
        ].join("\n")),
        new HumanMessage([
            "Please generate character member skeletons to be directly adopted by the automatic director based on the following context.",
            "",
            "[Hierarchical context]",
            renderSelectedContextBlocks(context),
            "",
            "[Output requirements]",
            "- Only output member skeletons, not relations.",
            "- The protagonist must be unique and stable",
            "- name must be directly accessible",
            "- Only output strict JSON",
        ].join("\n")),
    ],
    postValidate: (output) => {
        const protagonistCount = output.members.filter((member) => member.castRole === "protagonist").length;
        if (protagonistCount !== 1) {
            throw new Error(`The member skeleton must and can only contain 1 protagonist, currently ${protagonistCount} .`);
        }
        const seenNames = new Set<string>();
        for (const member of output.members) {
            const normalizedName = member.name.trim();
            if (seenNames.has(normalizedName)) {
                throw new Error(`Duplicate character names appear in the member skeleton:${member.name}`);
            }
            seenNames.add(normalizedName);
        }
        return output;
    }
};
export const characterCastAutoRelationsPrompt: PromptAsset<CharacterCastAutoRelationsPromptInput, z.infer<typeof characterCastAutoRelationsResponseSchema>> = {
    id: "novel.character.castAuto.relations",
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
    semanticRetryPolicy: {
        maxAttempts: 1,
    },
    outputSchema: characterCastAutoRelationsResponseSchema,
    render: (input) => [
        new SystemMessage([
            "You are the character relationship planner for a long-form Georgian-language serial novel.",
            "Your task is to make up relations that can be directly dropped into the library based on the locked member list.",
            "",
            "Only return strict JSON, no Markdown, explanations, comments, code blocks, or extra text.",
            "The final JSON can only contain relations.",
            "",
            "Hard rules:",
            "1. SourceName and targetName must reuse the names in the given member list verbatim, and may not be renamed, bracketed, aliased, or added.",
            "2. You are not allowed to add, delete or rewrite member settings; you are only responsible for the relationship layer.",
            "3. Each relationship must connect two different roles, and self-referential relationships are prohibited.",
            "4. Do not output duplicate relationship pairs.",
            "5. Relations must reflect long-term relationship dynamics, sources of conflict, information asymmetry, or the next turning point, and cannot be empty words.",
            "6. The protagonist must enter into at least one relationship.",
            "",
            "Express a request:",
            "1. All field values use natural Georgian.",
            "2. Each relationship should serve the purpose of long-form promotion, rather than a one-time event description.",
        ].join("\n")),
        new HumanMessage([
            "Please generate relations based on the locked character member skeleton below.",
            "",
            `\u3010Story input\u3011
${input.storyInput || "None yet"}`,
            "",
            `\u3010Lineup title\u3011
${input.optionTitle}`,
            "",
            `\u3010Lineup summary\u3011
${input.optionSummary}`,
            "",
            `\u3010Protagonist\u3011
${input.protagonistName}`,
            "",
            `[Permitted character names]
${input.memberNames.join("、")}`,
            "",
            `\u3010Member Profile\u3011
${input.memberRosterText}`,
            "",
            "[Output requirements]",
            "- only output relations",
            "- Names must be reused verbatim in the given list",
            "- No new roles will be added and no member settings will be changed.",
            "- Only output strict JSON",
        ].join("\n")),
    ],
    postValidate: (output, input) => {
        const allowedNames = new Set(input.memberNames.map((name) => name.trim()).filter(Boolean));
        const seenPairs = new Set<string>();
        let protagonistLinked = false;
        for (const relation of output.relations) {
            if (!allowedNames.has(relation.sourceName) || !allowedNames.has(relation.targetName)) {
                throw new Error(`relations uses an unregistered member name:${relation.sourceName} -> ${relation.targetName}`);
            }
            if (relation.sourceName === relation.targetName) {
                throw new Error(`relations A self-referential relationship appears:${relation.sourceName}`);
            }
            const pairKey = `${relation.sourceName}=>${relation.targetName}`;
            if (seenPairs.has(pairKey)) {
                throw new Error(`relations Duplicate relationship pairs appear:${pairKey}`);
            }
            seenPairs.add(pairKey);
            if (relation.sourceName === input.protagonistName || relation.targetName === input.protagonistName) {
                protagonistLinked = true;
            }
        }
        if (input.protagonistName && !protagonistLinked) {
            throw new Error(`relations must explicitly contain the protagonist "${input.protagonistName}」。`);
        }
        return output;
    }
};

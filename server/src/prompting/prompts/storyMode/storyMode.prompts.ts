import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { z } from "zod";
import type { PromptAsset } from "../../core/promptTypes";
import type { StoryModeProfile } from "@ai-novel/shared/types/storyMode";
import { storyModeChildDraftListSchema, storyModeChildDraftNodeSchema, storyModeDraftNodeSchema, storyModeExpansionDraftListSchema, } from "./storyMode.promptSchemas";
export interface StoryModeTreePromptInput {
    prompt: string;
}
export interface StoryModeChildPromptInput {
    prompt?: string;
    count: number;
    parentName: string;
    parentDescription: string;
    parentTemplate: string;
    parentProfile: StoryModeProfile;
    existingSiblingNames: string[];
}
export interface StoryModeExpansionPromptInput extends Omit<StoryModeChildPromptInput, "count" | "existingSiblingNames"> {
    count: number;
    existingSiblingNames: string[];
    librarySummary: string;
}
function formatOptionalSection(label: string, value: string): string {
    const trimmed = value.trim();
    return `${label}：${trimmed || "None"}`;
}
function formatStoryModeProfile(profile: StoryModeProfile): string {
    return [
        `coreDrive：${profile.coreDrive}`,
        `readerReward：${profile.readerReward}`,
        `progressionUnits：${profile.progressionUnits.join("、")}`,
        `allowedConflictForms：${profile.allowedConflictForms.join("、")}`,
        `forbiddenConflictForms：${profile.forbiddenConflictForms.join("、")}`,
        `conflictCeiling：${profile.conflictCeiling}`,
        `resolutionStyle：${profile.resolutionStyle}`,
        `chapterUnit：${profile.chapterUnit}`,
        `volumeReward：${profile.volumeReward}`,
        `mandatorySignals：${profile.mandatorySignals.join("、")}`,
        `antiSignals：${profile.antiSignals.join("、")}`,
    ].join("\n");
}
function normalizeNameKey(value: string): string {
    return value.trim().toLocaleLowerCase("zh-CN");
}
export const storyModeTreePrompt: PromptAsset<StoryModeTreePromptInput, z.infer<typeof storyModeDraftNodeSchema>> = {
    id: "storyMode.tree.generate",
    version: "v2",
    taskType: "planner",
    mode: "structured",
    language: "ka",
    contextPolicy: {
        maxTokensBudget: 0,
    },
    outputSchema: storyModeDraftNodeSchema,
    render: (input) => [
        new SystemMessage([
            "You are a senior online novel genre model planning expert.",
            "Your task is to generate a \"two-level genre pattern tree\" that can be used for creative planning, pattern constraints and product configuration based on the creative direction given by the user.",
            "This tree is not just a simple column label, but a genre pattern structure that is distinguishable, executable, and reusable.",
            "",
            "Only return a valid JSON object, do not output Markdown, explanations, comments, code blocks or extra text.",
            "",
            "Structural rules:",
            "1. Up to two levels of tree: the top level is the genre mode parent class, and the second level is the specific genre mode subclass.",
            "2. Each node must output and only output the following fixed keys: name, description, template, profile, children.",
            "3. The children of the second-level node must be [].",
            "4. Do not leave missing keys, do not change key names, and do not add new synonymous fields.",
            "5. The whole tree must be a single tree with a clear structure, and do not output multiple parallel root nodes.",
            "",
            "Node requirements:",
            "1. name: The name must be concise, stable, and can be used directly as a system label or mode name. Do not write long sentences or slogans.",
            "2. Description: Explain the mode\u2019s core narrative features, main sources of excitement, conflict organization methods or readers\u2019 expectations, and avoid empty words such as \u201Cvery beautiful\u201D and \u201Cvery immersive\u201D.",
            "3. Template: Write the most typical plot advancement template or narrative skeleton of this mode. It must be specific to the creative level and cannot just write abstract concepts.",
            "4. Profile: It must bear the real control logic and is not allowed to hide key rules in name or description.",
            "",
            "profile fixed structure requirements:",
            "profile must contain strictly the following keys:",
            "coreDrive, readerReward, progressionUnits, allowedConflictForms, forbiddenConflictForms, conflictCeiling, resolutionStyle, chapterUnit, volumeReward, mandatorySignals, antiSignals。",
            "",
            "profile field explanation:",
            "1. coreDrive: The core driving force of this mode, explaining why the story can continue to move forward.",
            "2. readerReward: The most stable type of satisfaction that readers get when they continue to read this mode.",
            "3. progressionUnits: The commonly used advancement units in this mode, indicating the units in which the plot usually scrolls forward.",
            "4. allowedConflictForms: Conflict forms suitable for this mode, write acceptable and frequently used conflict types.",
            "5. forbiddenConflictForms: Conflict forms that are not suitable for the mode and can easily destroy the mode experience.",
            "6. conflictCeiling: In what range should the upper limit of conflict or pressure in this mode be controlled, reflecting the intensity boundary.",
            "7. resolutionStyle: the common resolution, cashing or closing methods of this model.",
            "8. chapterUnit: The content unit or small hook unit that is most suitable for carrying at the single chapter level.",
            "9. volumeReward: The phased rewards or phased results that should be honored at the volume level.",
            "10. MandatorySignals: The pattern must repeatedly give clear signals to readers to stabilize pattern expectations.",
            "11. antiSignals: Anti-signals that cause readers to misjudge the model, weaken the model experience, or cause the model to deviate.",
            "",
            "Planning rules:",
            "1. The top-level parent class is responsible for the abstract pattern direction, and the second-level subclass is responsible for the executable concrete pattern variant.",
            "2. There must be a clear distinction between nodes at the same level, and you cannot just repeat the same pattern in another way.",
            "3. Subcategories must be natural subdivisions under the logic of the parent category, and do not suddenly switch classification dimensions.",
            "4. Do not use the lazy writing method of hard binding by name such as \"because it is called such-and-such stream, so it must be like this\". The constraint logic must be written into the profile.",
            "5. If the user description is vague, it should be summarized into conservative, low-risk, and common industry models and should not be overly divergent.",
            "6. The output results must be directly consumed by the subsequent creation system, so the field content should be specific, stable, and avoid empty rhetoric.",
            "",
            "Style rules:",
            "1. All content is in natural Georgian.",
            "2. Use concise phrases for array fields and do not write long explanations.",
            "3. String fields should be specific and executable, and avoid abstract clich\u00E9s.",
            "4. Each field must be consistent and must not conflict with each other.",
        ].join("\n")),
        new HumanMessage([
            "Please generate a draft of the root genre pattern and its subcategories according to the creative direction below:",
            "",
            input.prompt.trim(),
        ].join("\n")),
    ]
};
export const storyModeChildPrompt: PromptAsset<StoryModeChildPromptInput, z.infer<typeof storyModeChildDraftListSchema>, z.infer<typeof storyModeChildDraftListSchema>> = {
    id: "storyMode.child.generate",
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
    outputSchema: storyModeChildDraftListSchema,
    render: (input) => [
        new SystemMessage([
            "You are a senior online novel genre model planning expert.",
            "Your task is not to generate the entire tree, but to make up a set of subclass genre mode nodes based on a given parent class that can be directly mounted to the parent class.",
            "These subclass nodes must be distinguishable, executable, and directly accessible for use in subsequent creation systems.",
            "",
            "Only return a valid JSON array, do not output Markdown, explanations, comments, code blocks or extra text.",
            "",
            "Structural rules:",
            `1. Must be accurately generated ${input.count} For subclass nodes, do not generate parent nodes, and do not generate less or more than the required number.`,
            "2. The outermost layer must be a JSON array, and each item in the array is a subclass node object.",
            "3. Each node only outputs and allows only the following fixed keys: name, description, template, profile, and children.",
            "4. The children of each node must be [], and no more grandchild nodes are allowed.",
            "5. Do not leave missing keys, do not change key names, and do not add new synonymous fields.",
            "",
            "Subclass generation rules:",
            "1. Each subcategory must be a natural subdivision under the logic of a given parent category and cannot be switched to other classification dimensions.",
            "2. The core control logic of the parent profile must be continued, but a clear distinction must be made in the experience structure, conflict organization, promotion unit, redemption method or narrative focus.",
            "3. The multiple generated subcategories must be significantly different from each other, and cannot just repeat the same pattern in another way.",
            "4. It cannot have the same name as an existing sibling node, it cannot just repeat the existing sibling node, and it cannot output the parent class itself.",
            "5. You must drill down to specific sub-modes that can be used directly, and do not stay at the fuzzy label level.",
            "6. If the user adds less, conservative, low-risk, industry-common subdivisions must be made directly based on the parent class logic and existing sibling nodes, and do not avoid generation.",
            "7. If the parent category itself is very specific, the subcategory should be subdivided into experiential, organizational or cash-based categories without destroying the logic of the parent category, rather than forcibly carving out unnatural categories.",
            "",
            "Node requirements:",
            "1. name: The name must be concise, stable, and can be used directly as a system label. Do not write slogans, slogans, or long explanatory names.",
            "2. Description: Describe the core narrative features, source of excitement, conflict organization, or reader expectations of this subgenre. It must be specific and avoid empty words.",
            "3. Template: Write the most typical plot advancement template or narrative skeleton of this sub-category. It must be specific to the creative level and cannot just write abstract concepts.",
            "4. Profile: It must bear the real control logic and is not allowed to hide key rules in name or description.",
            "",
            "profile fixed structure requirements:",
            "profile must contain strictly the following keys:",
            "coreDrive, readerReward, progressionUnits, allowedConflictForms, forbiddenConflictForms, conflictCeiling, resolutionStyle, chapterUnit, volumeReward, mandatorySignals, antiSignals。",
            "",
            "profile field requirements:",
            "1. coreDrive: Describes the core driving force for continuous advancement of this sub-mode.",
            "2. readerReward: describes the most stable type of satisfaction that readers get when they continue to read.",
            "3. progressionUnits: Describes the units in which the plot continues to advance.",
            "4. allowedConflictForms: Write conflict forms suitable for high-frequency use.",
            "5. forbiddenConflictForms: Write conflict forms that would ruin the experience of this mode.",
            "6. conflictCeiling: Write down the conflict intensity or pressure limit clearly, don\u2019t be vague.",
            "7. resolutionStyle: Write down the common resolution or redemption methods of this mode.",
            "8. chapterUnit: A propulsion unit or a small hook unit that is most suitable for writing a single chapter.",
            "9. volumeReward: The phased reward or achievement that should be realized at the volume writing level.",
            "10. MandatorySignals: Write stable signals that must be given to readers repeatedly.",
            "11. antiSignals: Write countersignals that deflect the model, weaken the experience, or mislead the reader\u2019s expectations.",
            "",
            "Style rules:",
            "1. All content is in natural Georgian.",
            "2. Use concise phrases for array fields and do not write long explanations.",
            "3. String fields should be specific and executable, and avoid abstract clich\u00E9s.",
            "4. Each field must be consistent and must not conflict with each other.",
            "5. The output results should be like pattern nodes that can be directly dropped into the library and configured, rather than general planning instructions.",
        ].join("\n")),
        new HumanMessage([
            `Current task: Please accurately generate the following parent class ${input.count} A new subcategory genre mode node.`,
            "",
            `Parent class name:${input.parentName.trim()}`,
            formatOptionalSection("Parent class description", input.parentDescription),
            formatOptionalSection("Parent class template", input.parentTemplate),
            "Parent profile:",
            formatStoryModeProfile(input.parentProfile),
            "",
            `Existing sibling nodes:${input.existingSiblingNames.length > 0 ? input.existingSiblingNames.join("、") : "None"}`,
            "",
            "User supplementary directions:",
            input.prompt?.trim() ? input.prompt.trim() : "None. Please derive directly based on parent class logic and existing sibling nodes.",
        ].join("\n")),
    ],
    postValidate: (output, input) => {
        if (output.length !== input.count) {
            throw new Error(`Genre mode subcategory output number is incorrect, expected ${input.count} one, actual ${output.length} .`);
        }
        const siblingNames = new Set(input.existingSiblingNames.map(normalizeNameKey));
        const batchNames = new Set<string>();
        for (const item of output) {
            if ((item.children ?? []).length > 0) {
                throw new Error("Genre mode subclass output cannot continue to generate grandchild nodes.");
            }
            const generatedName = normalizeNameKey(item.name);
            if (generatedName === normalizeNameKey(input.parentName)) {
                throw new Error("Genre mode subclass output duplicates parent class name.");
            }
            if (siblingNames.has(generatedName)) {
                throw new Error("Genre mode subclass output has the same name as an existing sibling node.");
            }
            if (batchNames.has(generatedName)) {
                throw new Error("There are duplicate name candidates within the genre mode subcategory output.");
            }
            batchNames.add(generatedName);
        }
        return output.map((item) => ({
            ...item,
            children: [],
        }));
    }
};
export const storyModeExpansionPrompt: PromptAsset<StoryModeExpansionPromptInput, z.infer<typeof storyModeExpansionDraftListSchema>, z.infer<typeof storyModeExpansionDraftListSchema>> = {
    id: "storyMode.expansion.recommend",
    version: "v2",
    taskType: "planner",
    mode: "structured",
    language: "ka",
    contextPolicy: { maxTokensBudget: 0 },
    semanticRetryPolicy: { maxAttempts: 1 },
    outputSchema: storyModeExpansionDraftListSchema,
    render: (input) => [
        new SystemMessage([
            "You are a senior online novel promotion model architect.",
            "Your task is to design a set of truly different new modes based on the existing library of advancement modes to help the author expand gameplay coverage, rather than renaming existing modes.",
            input.parentName.trim()
                ? "Candidates must fall within the logical scope of the selected root pattern and can be directly used in the planning, chapter advancement and return design of long web articles." : "When no root mode is selected, the candidate must be a brand new root mode that can be established independently and complement the advancement experience not covered by the existing root mode.",
            "Only return valid JSON arrays, do not output Markdown, explanations, comments or code blocks.",
            `must be generated accurately ${input.count} Candidates, each item only allows five keys: name, description, template, profile, and children, and children must be [].`,
            "There should be clear differences between candidates in terms of reader reward, progression, organization of conflict, delivery, or chapter pacing.",
            "It cannot repeat the pattern in the existing library, cannot have the same name as an existing node of the same level, and cannot be separated from the core driver of the parent class.",
            "profile must be completely filled in coreDrive, readerReward, progressionUnits, allowedConflictForms, forbiddenConflictForms, conflictCeiling, resolutionStyle, chapterUnit, volumeReward, mandatorySignals, antiSignals.",
            "The name should be concise and stable; descriptions and templates must be specific and executable; all use natural Georgian.",
        ].join("\n")),
        new HumanMessage([
            input.parentName.trim()
                ? `Please root mode"${input.parentName.trim()}"Recommended ${input.count} a new advancement model.`
                : `Please make recommendations based on the entire propulsion pattern library ${input.count} A brand new root propulsion mode.`,
            formatOptionalSection("Root mode description", input.parentDescription),
            formatOptionalSection("root pattern template", input.parentTemplate),
            input.parentName.trim()
                ? ["Root mode profile:", formatStoryModeProfile(input.parentProfile)].join("\n")
                : "Root mode is not specified: Please design a complete and executable root mode profile yourself.",
            "",
            `Existing peer modes:${input.existingSiblingNames.length ? input.existingSiblingNames.join("、") : "None"}`,
            "",
            "Summary of current advancement pattern library (used to avoid duplication and find gaps):",
            input.librarySummary.trim() || "None",
            "",
            "Directions the author hopes to expand on:",
            input.prompt?.trim() || "Please give priority to filling in reader returns and advancement rhythms that are not covered by the existing library.",
        ].join("\n")),
    ],
    postValidate: (output, input) => {
        if (output.length !== input.count) {
            throw new Error(`Incorrect number of push mode extension candidates, expected ${input.count} one, actual ${output.length} .`);
        }
        const existing = new Set(input.existingSiblingNames.map(normalizeNameKey));
        const names = new Set<string>();
        for (const item of output) {
            const key = normalizeNameKey(item.name);
            if (existing.has(key) || names.has(key) || key === normalizeNameKey(input.parentName)) {
                throw new Error("The push pattern extension candidate is a duplicate of an existing pattern.");
            }
            if ((item.children ?? []).length > 0) {
                throw new Error("Push mode extension candidates cannot contain child nodes.");
            }
            names.add(key);
        }
        return output.map((item) => ({ ...item, children: [] }));
    }
};

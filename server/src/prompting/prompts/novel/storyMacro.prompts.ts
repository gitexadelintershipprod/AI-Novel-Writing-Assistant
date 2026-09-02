import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { z } from "zod";
import type { StoryDecomposition, StoryExpansion, StoryMacroField, StoryMacroLocks, } from "@ai-novel/shared/types/storyMacro";
import type { PromptAsset } from "../../core/promptTypes";
import { renderSelectedContextBlocks } from "../../core/renderContextBlocks";
import { STORY_MACRO_RESPONSE_SCHEMA } from "../../../services/novel/storyMacro/storyMacroPlanSchema";
import { NOVEL_PROMPT_BUDGETS } from "./promptBudgetProfiles";
export interface StoryMacroDecompositionPromptInput {
    storyInput: string;
    projectContext: string;
}
export interface StoryMacroFieldRegenerationPromptInput {
    field: StoryMacroField;
    storyInput: string;
    expansion: StoryExpansion;
    decomposition: StoryDecomposition;
    constraints: string[];
    lockedFields: StoryMacroLocks;
    projectContext: string;
}
function buildExpansionAndDecompositionPrompt(storyInput: string, projectContext = ""): {
    system: string;
    user: string;
} {
    return {
        system: [
            "You are a senior fiction writer + story planning editor.",
            "Your task is not to polish the user's idea, but to reconstruct it into a \"story engine prototype\" with continuous narrative capabilities that can be used for subsequent constraint generation.",
            "",
            "Mission objectives:",
            "1. Strengthen the dramatic conflict instead of completing the setting in a straightforward manner.",
            "2. Build a driving force for the story to advance in the long term, rather than just wrapping the premise in a short story.",
            "3. Prioritize character situations, cognitive conflicts, crisis escalations, relationship pressures, key scenes and narrative temperament.",
            "4. Control the density of information and avoid unfounded expansion of a large number of worldview settings.",
            "5. The output content will serve as a hard constraint for the subsequent creative process and must be stable, clear, and executable.",
            "",
            "Stage constraints:",
            "1. The current stage is before character creation, and only abstract character slots are allowed, such as protagonist position, antagonist position, relationship pressure position, induction position, and observation position.",
            "2. Specific character names, complete character biographies, and fixed character lists are prohibited.",
            "3. It is forbidden to make the character system into a human design table in advance.",
            "4. It is prohibited to add a large number of organizational, geographical, historical, and system settings out of thin air in order to create a sense of complexity.",
            "",
            "You must complete the following build:",
            "1. Trap the protagonist into a clear situation that cannot be easily exited.",
            "2. Construct a core contradiction that can continue to escalate, repeatedly deform, and oppress the protagonist for a long time.",
            "3. Set up a mystery box that can continue to attract readers to read, that is: the most critical unknown that cannot be completely known yet.",
            "4. Design 2-3 high-tension scene seeds with a sense of imagery, conflict, and subsequent scalability.",
            "5. Clarify the narrative temperament so that subsequent writing will know how the book should be written, not just what to write.",
            "",
            "Theme adaptation requirements:",
            "1. If the subject matter shows a Cthulhu/indescribable tendency, it must reflect: cognitive collapse, unreliable reality, and the inability to see the truth directly.",
            "2. If the subject matter shows a suspense/reasoning tendency, it must reflect: the rhythm of information disclosure, cognitive misdirection, and layered advancement of the truth.",
            "3. If the subject shows a growth tendency, it must reflect: staged cognitive changes, costs, cognitive correction and self-reconstruction.",
            "",
            "Project context usage rules:",
            "1. If the project context includes a \"world setting in which this book will be used,\" the existing rules, organizations, locations, conflicts, boundaries, and prohibitions must be used first.",
            "2. No expansion beyond these boundaries is allowed.",
            "3. If there is an obvious conflict between the story idea and the project context, conflict must be marked in issues.",
            "",
            "Generating principles:",
            "1. Prioritize \u201Cconflict reconstruction\u201D and \u201Cnarrative-driven construction\u201D instead of focusing on setting instructions.",
            "2. All fields should serve \u2018why this book can continue to be written\u2019.",
            "3. expanded_premise is not an introduction polish, but an enhanced story premise.",
            "4. Protagonist_core is not a character introduction, but the protagonist\u2019s trapped structure + inner cracks + changeable space.",
            "5. conflict_engine must answer: Why can the plot continue to escalate, transform, reverse, and continue to advance.",
            "6. Mystery_box must be critical enough and cannot be a meaningless trick.",
            "7. Progression_loop must clearly reflect the circular logic of discovery -> intervention -> upgrade -> backlash/reversal -> rediscovery.",
            "8. Constraints must be narrative rules that can be followed directly in subsequent generation stages, rather than empty suggestions.",
            "",
            "Missing and conflict handling:",
            "1. If the information is insufficient, don\u2019t pretend to be complete and don\u2019t make up details.",
            "2. When there is insufficient information, mark missing_info in issues.",
            "3. When user input conflicts with each other or with the project context, mark conflict in issues.",
            "4. Even if there are problems, try to produce a usable but restrained story engine prototype as much as possible.",
            "",
            "Output requirements:",
            "1. Only output strictly legal JSON objects.",
            "2. Do not output explanations, notes, Markdown, code blocks, or any additional text.",
            "3. All fields must be filled in; if it cannot be completely determined, the most secure and restrained result should be given and explained in issues.",
            "",
            "JSON structure:",
            "{",
            '  "expansion": {',
            "    \"expanded_premise\": \"Strengthened post-conflict story premise\",",
            "    \"protagonist_core\": \"The protagonist's trapped situation + inner cracks + changeable space\",",
            "    \"conflict_engine\": \"The core mechanism that drives the continuous advancement and upgrading of the plot\",",
            '    "conflict_layers": {',
            "      \"external\": \"External pressure/threat\",",
            "      \"internal\": \"Inner collapse/desire/fear\",",
            "      \"relational\": \"The tension between people\"",
            "    },",
            "    \"mystery_box\": \"The core unknown that readers continue to want to know but can't get the answer yet\",",
            "    \"emotional_line\": \"Emotional promotion logic\",",
            "    \"setpiece_seeds\": [\"High tension scene 1\", \"High tension scene 2\"],",
            "    \"tone_reference\": \"Narrative temperament and writing direction\"",
            "  },",
            '  "decomposition": {',
            "    \"selling_point\": \"One sentence selling point\",",
            "    \"core_conflict\": \"Long-term irreconcilable opposition\",",
            "    \"main_hook\": \"Unknown main line question\",",
            "    \"progression_loop\": \"How to discover the story -> upgrade -> advance in a reverse cycle\",",
            "    \"growth_path\": \"How the protagonist's cognition or status changes in stages\",",
            "    \"major_payoffs\": [\"Highlight 1\", \"Highlight 2\"],",
            "    \"ending_flavor\": \"ending style\"",
            "  },",
            "  \"constraints\": [\"Narrative rules that must be followed 1\", \"Narrative rules that must be followed 2\"],",
            "  \"issues\": [{\"type\":\"conflict|missing_info\",\"field\":\"expanded_premise|protagonist_core|conflict_engine|conflict_layers|mystery_box|emotional_line|setpiece_seed s|tone_reference|selling_point|core_conflict|main_hook|progression_loop|growth_path|major_payoffs|ending_flavor|constraints|global\",\"message\":\"Description\"}]",
            "}",
        ].join("\n"),
        user: [
            projectContext ? `Project context:
${projectContext}` : "",
            `Story ideas:
${storyInput}`,
        ].filter(Boolean).join("\n\n"),
    };
}
function buildFieldRegenerationPrompt(input: {
    field: StoryMacroField;
    storyInput: string;
    expansion: StoryExpansion | null;
    decomposition: StoryDecomposition;
    constraints: string[];
    lockedFields: StoryMacroLocks;
    projectContext?: string;
}): {
    system: string;
    user: string;
} {
    const fieldFormat = input.field === "conflict_layers"
        ? "{\"value\":{\"external\":\"...\",\"internal\":\"...\",\"relational\":\"...\"}}"
        : (input.field === "major_payoffs" || input.field === "setpiece_seeds" || input.field === "constraints")
            ? "{\"value\":[\"...\"]}"
            : "{\"value\":\"...\"}";
    return {
        system: [
            "You are the novel story engine field rewriting assistant.",
            "Your task is: rewrite only one specified field so that it is consistent with the existing story engine prototype and can be directly used as a replacement for the original field.",
            "",
            "Hard requirements:",
            "1. You can only rewrite the target field, and cannot modify, rewrite, or insinuate changes to other fields.",
            "2. All other fields are regarded as hard context and can only be referenced and cannot be overturned.",
            "3. The current stage is before character creation, and only abstract character slots are allowed, such as protagonist position, antagonist position, relationship pressure position, induction position, and observation position.",
            "4. It is prohibited to output specific character names, detailed biographies, and fixed character lists.",
            "5. If the project context includes \"the world setting that this book will use\", the rewriting results must strictly comply with the existing rules, locations, organizations, boundaries, prohibitions and conflicts, and must not be expanded beyond the boundaries.",
            "6. Must comply with existing constraints.",
            "7. The established direction represented by lockedFields must be respected, and the foundation of the locked field must not be indirectly destroyed by rewriting the target field.",
            "",
            "Rewriting principles:",
            "1. Rewriting is not about repeating the original text in another way, but about reconstructing the target field to be more stable, stronger, and more suitable for continuous narrative.",
            "2. The new result must be consistent with the original story idea and compatible with expansion, decomposition, and constraints.",
            "3. If there is insufficient contextual information, do not add major settings indiscriminately; make the most secure enhancements within the scope of existing information.",
            "4. If there is tension between the target field and the existing context, give priority to making compatibility corrections rather than reinventing the wheel.",
            "5. The output content must be complete and usable, and cannot be written as outlines, notes, explanations, analyses, or semi-finished products.",
            "",
            "Field-specific requirements:",
            "1. If the target field is expanded_premise: The story premise and dramatic conflict should be strengthened, and do not be written in an introductory tone.",
            "2. If the target field is protagonist_core: The structure, inner cracks and changeable space where the protagonist is trapped should be written clearly, and do not write the character card.",
            "3. If the target field is conflict_engine: it must reflect why the plot can continue to advance, escalate, reverse, and backlash.",
            "4. If the target field is conflict_layers: external / internal / relational must be clearly distinguished from each other, but together serve the same core conflict.",
            "5. If the target field is mystery_box: it must be the key unknown, rather than just selling off the key.",
            "6. If the target field is emotional_line: It must reflect how the emotion gradually increases, deforms, unbalances or reverses.",
            "7. If the target field is setpiece_seeds: Each scene must have a sense of graphics, conflict and subsequent extension value, do not make up the numbers.",
            "8. If the target field is tone_reference: It is necessary to give a clear narrative temperament and writing direction, and do not pile up empty adjectives.",
            "9. If the target field is selling_point: it must be concise enough to reflect distinction and attractiveness.",
            "10. If the target field is core_conflict: it must be a long-term irreconcilable opposition, not a one-time event.",
            "11. If the target field is main_hook: it must reflect the unknown and continuous traction of the main line.",
            "12. If the target field is progression_loop: it must clearly reflect the cycle mechanism of \"discovery -> intervention -> upgrade -> backlash/reversal -> rediscovery\".",
            "13. If the target field is growth_path: it must reflect the staged changes and costs of the protagonist's cognition or status.",
            "14. If the target field is major_payoffs: it must be a breaking point that is truly worth cashing in. Do not write ordinary plot points.",
            "15. If the target field is ending_flavor: it should reflect the temperament and final aftertaste of the ending, rather than the specific ending details.",
            "16. If the target field is constraints: it must be written in narrative rules that can be directly followed by subsequent generation, and empty words are prohibited.",
            "",
            "Output requirements:",
            "1. Only output strictly legal JSON objects.",
            "2. Do not output explanations, Markdown, code blocks, or any additional text.",
            `3. The output format must be strictly:${fieldFormat}`,
            "4. Do not output any additional fields except value.",
            `5. The only fields you currently need to rewrite are:${input.field}`,
        ].join("\n"),
        user: [
            input.projectContext ? `Project context:
${input.projectContext}` : "",
            `Original story idea:
${input.storyInput}`,
            input.expansion ? `Story engine prototype (expansion):
${JSON.stringify(input.expansion, null, 2)}` : "",
            `Promotion and fulfillment summary (decomposition):
${JSON.stringify(input.decomposition, null, 2)}`,
            `Hard constraints:
${JSON.stringify(input.constraints, null, 2)}`,
            `Locked fields (lockedFields):
${JSON.stringify(input.lockedFields, null, 2)}`,
            `Please only rewrite fields:${input.field}`,
        ].filter(Boolean).join("\n\n"),
    };
}
export const storyMacroDecompositionPrompt: PromptAsset<StoryMacroDecompositionPromptInput, typeof STORY_MACRO_RESPONSE_SCHEMA._output> = {
    id: "novel.story_macro.decomposition",
    version: "v2",
    taskType: "planner",
    mode: "structured",
    language: "ka",
    contextPolicy: {
        maxTokensBudget: NOVEL_PROMPT_BUDGETS.storyMacroDecomposition,
        requiredGroups: ["story_input"],
        preferredGroups: ["project_context"],
    },
    outputSchema: STORY_MACRO_RESPONSE_SCHEMA,
    render: (input, context) => {
        const prompt = buildExpansionAndDecompositionPrompt(input.storyInput, input.projectContext);
        return [
            new SystemMessage(prompt.system),
            new HumanMessage(renderSelectedContextBlocks(context)),
        ];
    }
};
export const storyMacroFieldRegenerationSchema = z.object({
    value: z.unknown().optional(),
}).passthrough();
export const storyMacroFieldRegenerationPrompt: PromptAsset<StoryMacroFieldRegenerationPromptInput, typeof storyMacroFieldRegenerationSchema._output> = {
    id: "novel.story_macro.field_regeneration",
    version: "v2",
    taskType: "planner",
    mode: "structured",
    language: "ka",
    contextPolicy: {
        maxTokensBudget: NOVEL_PROMPT_BUDGETS.storyMacroFieldRegeneration,
        requiredGroups: ["story_input", "target_field", "decomposition_summary", "constraints"],
        preferredGroups: ["project_context", "expansion_summary", "locked_fields"],
    },
    outputSchema: storyMacroFieldRegenerationSchema,
    render: (input, context) => {
        const prompt = buildFieldRegenerationPrompt({
            field: input.field,
            storyInput: input.storyInput,
            expansion: input.expansion,
            decomposition: input.decomposition,
            constraints: input.constraints,
            lockedFields: input.lockedFields,
            projectContext: input.projectContext,
        });
        return [
            new SystemMessage(prompt.system),
            new HumanMessage(renderSelectedContextBlocks(context)),
        ];
    }
};

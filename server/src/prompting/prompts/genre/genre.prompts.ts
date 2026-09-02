import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { z } from "zod";
import type { PromptAsset } from "../../core/promptTypes";
import { genreTreeDraftNodeSchema } from "./genre.promptSchemas";
export interface GenreTreePromptInput {
    prompt: string;
    retry: boolean;
    forceJson: boolean;
}
export const genreTreePrompt: PromptAsset<GenreTreePromptInput, z.infer<typeof genreTreeDraftNodeSchema>> = {
    id: "genre.tree.generate",
    version: "v2",
    taskType: "planner",
    mode: "structured",
    language: "ka",
    contextPolicy: {
        maxTokensBudget: 0,
    },
    outputSchema: genreTreeDraftNodeSchema,
    render: (input) => {
        const retryInstruction = input.retry
            ? "\nYou did not output valid JSON last time. Only one JSON object body can be returned at this time, without explanations, Markdown, comments, code blocks, or any additional text." : "";
        const providerJsonInstruction = input.forceJson
            ? "\nThe current model supports stable JSON output, please return the JSON object body directly." : "";
        return [
            new SystemMessage([
                "You are a senior online novel type planning expert.",
                "Your task is to generate a \"genre tree\" suitable for novel planning and product labeling based on the creative direction given by the user.",
                "The goal of this tree is not to pile up nouns, but to establish a clear, distinguishable, and implementable subject hierarchy to help with subsequent positioning, label organization, and content planning.",
                "",
                "Only return a JSON object, do not output Markdown, explanations, comments, code blocks, or extra text.",
                "",
                "The fixed JSON structure is as follows:",
                "{",
                "  \"name\": \"Main type name\",",
                "  \"description\": \"Main type description\",",
                '  "children": [',
                "    {",
                "      \"name\": \"Subtype name\",",
                "      \"description\": \"Subtype description\",",
                '      "children": [',
                "        {",
                "          \"name\": \"Subordinate type name\",",
                "          \"description\": \"Description of subordinate types\",",
                '          "children": []',
                "        }",
                "      ]",
                "    }",
                "  ]",
                "}",
                "",
                "Structural rules:",
                "1. Up to three levels, and can only be: main type -> subtype -> subordinate type.",
                "2. Each node must contain three keys: name, description, and children. There should be no missing keys, no name changes, and no new synonymous fields.",
                "3. If a node is no longer subdivided, children must return an empty array.",
                "4. The result must be a single tree with a clear structure, and do not output multiple parallel main types.",
                "",
                "Naming rules:",
                "1. The name must be concise, clear, and stable, and suitable for use directly as a type label in the product.",
                "2. Do not use overly long names, explanatory names, slogans, or slogan-like expressions.",
                "3. There must be a clear distinction between nodes at the same level to avoid synonymous rewriting or slight wording changes.",
                "4. The name should give priority to reflecting the core differences of the subject matter, rather than general emotional words or quality judgments.",
                "",
                "Description rules:",
                "1. The description must explain the subject matter characteristics, common highlights, narrative focus or readers\u2019 expectations of the genre.",
                "2. The description should be specific and concise, and should not be written in empty words, such as \"wonderful content\", \"rich plot\" and \"very immersive\".",
                "3. The description should serve to differentiate between types and help users understand \"why it belongs to this category.\"",
                "",
                "Planning rules:",
                "1. Prioritize establishing a differentiated hierarchy rather than mechanically listing as many subcategories as possible.",
                "2. The number of sub-types should be restrained. It is better to be few and clear, rather than pile up into a label market.",
                "3. Subordinate types should be further subdivisions of subtypes, rather than jumping to other classification dimensions.",
                "4. The division dimensions of the entire tree should be as unified as possible. Do not divide one layer according to the world view, and the next layer suddenly divide according to the emotional line or the identity of the protagonist.",
                "5. If the user description is vague, it should be summarized into conservative, low-risk, and common types in the industry, and should not be overly divergent.",
                "6. The output results should be natural, self-consistent, and can be directly used for subsequent productization and creative planning.",
                retryInstruction,
                providerJsonInstruction,
            ].join("\n")),
            new HumanMessage([
                "Please generate a type tree according to the following creative direction:",
                "",
                input.prompt.trim(),
            ].join("\n")),
        ];
    }
};

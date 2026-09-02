import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { z } from "zod";
import type { PromptAsset } from "../../../core/promptTypes";
import { directorIdeaConstellationComposeSchema, directorIdeaConstellationOptionsSchema, } from "./ideaConstellation.promptSchemas";
export interface DirectorIdeaConstellationOptionsPromptInput {
    contextSummary: string;
}
export interface DirectorIdeaConstellationComposePromptInput {
    contextSummary: string;
    selectedSummary: string;
}
export const directorIdeaConstellationOptionsPrompt: PromptAsset<DirectorIdeaConstellationOptionsPromptInput, z.infer<typeof directorIdeaConstellationOptionsSchema>> = {
    id: "novel.director.idea_constellation_options",
    version: "v4",
    taskType: "planner",
    mode: "structured",
    language: "ka",
    contextPolicy: { maxTokensBudget: 0 },
    repairPolicy: { maxAttempts: 0 },
    semanticRetryPolicy: { maxAttempts: 1 },
    outputSchema: directorIdeaConstellationOptionsSchema,
    structuredOutputHint: {
        example: {
            options: [
                { id: "protagonist-1", category: "protagonist", label: "The underlying planning of the stolen project", hint: "I just took the blame and lost my job, but I found a project loophole that the company did not dare to disclose.", relevance: "high" },
                { id: "advantage-1", category: "advantage", label: "See hidden costs in contracts", hint: "You can see who will benefit and who will pay for the transaction before signing.", relevance: "high" },
            ],
        },
        note: "options must strictly output 35 items, 5 items for each of the seven categories; the fields are complete and no additional instructions are output.",
    },
    render: (input) => [
        new SystemMessage([
            "You design practical Georgian-language fiction material for beginning authors. Generate concrete story material that can be assembled directly into an opening concept from the current genre, progression method, and user idea, not abstract keywords or screenwriting theory.",
            "Seven categories, five items in each category, must be strictly output, a total of 35 items: protagonist protagonist\u2019s starting identity and predicament, setting theme stage and interest rules, advantage cheat or core advantage, opening_crisis first chapter explosive point, core_goal early goals and stage rewards, story_variable core opponent or main resistance, relationship key relationship that can continue to advance.",
            "Each label must be specific, suitable for click selection, and controlled between 2 and 48 characters; you can use short sentences when you need to express complete settings, and don\u2019t lose key mechanisms just to make it shorter. The hint explains how it will fall into the opening action, progression, or reader reward.",
            "The five items in the same category must be significantly different and cannot be just synonymous rewrites; the 35 labels cannot be repeated.",
            "Relevance indicates how well it matches the context of the current book. At least one item in each category is high, and the rest are reasonably assigned to medium or low.",
            "If the context has already given a theme or progression model, they are a fixed basis for creation and all options must be compatible; only missing information is allowed to be filled in.",
            "The protagonist must include the identity of the subject and the immediate dilemma; the setting must give the specific stage and interest rules on which events can occur, and cannot just write that the world is cruel.",
            "Advantage must explain what the protagonist can do, as well as the triggering conditions, usage boundaries, growth direction or cost; realistic themes can use professional abilities, information gaps, identity resources or scarce relationships, and do not forcibly add a supernatural system.",
            "The opening_crisis must be an event that can actually happen in the first chapter; the core_goal must describe what the first 10 to 30 chapters are trying to achieve and what the reader can see fulfilled.",
            "The story_variable must be an opponent, organization, rule or countdown pressure with an identity and the ability to act; the relationship must clearly state the identities and binding methods of both parties.",
            "It is strictly prohibited to output abstract sentences such as \"Everyone lives a lie, rules only protect the winner, every time you win, you lose, and the truth is hidden in lies\" that will still hold true in most stories.",
            "Common systems, rebirth, abilities, inheritance, space, panels, predictions, simulations, professional skills or resource advantages common in serial fiction can be used, but they must fit the current theme and provide differentiated mechanisms, and the proper names of the works cannot be copied.",
            "Do not output titles, outlines, body text, Markdown, or explanations.",
            "The id uses category-serial number, such as protagonist-1. Only output strict JSON.",
        ].join("\n")),
        new HumanMessage([
            "Please generate a story star map for the following book opening context. When there is no clear context, it is still necessary to provide serial fiction elements that are clearly differentiated, easy to start, and suitable for continuous creation.",
            "",
            input.contextSummary || "No clear context yet.",
        ].join("\n")),
    ],
    postValidate: (output) => {
        const labels = new Set(output.options.map((option) => option.label.replace(/\s+/g, "")));
        if (labels.size !== output.options.length) {
            throw new Error("Story star map options cannot be repeated.");
        }
        return output;
    }
};
export const directorIdeaConstellationComposePrompt: PromptAsset<DirectorIdeaConstellationComposePromptInput, z.infer<typeof directorIdeaConstellationComposeSchema>> = {
    id: "novel.director.idea_constellation_compose",
    version: "v3",
    taskType: "planner",
    mode: "structured",
    language: "ka",
    contextPolicy: { maxTokensBudget: 0 },
    repairPolicy: { maxAttempts: 0 },
    semanticRetryPolicy: { maxAttempts: 1 },
    outputSchema: directorIdeaConstellationComposeSchema,
    structuredOutputHint: {
        example: {
            idea: "In a post-apocalyptic closed city, an amnesiac doctor is forced to use a time loop that resets once a day to track down taboo experiments deep in the hospital in order to find his missing sister.",
        },
        note: "Idea is a single-paragraph book-opening idea of 45-220 words, without outputting a title, Markdown or additional explanation.",
    },
    render: (input) => [
        new SystemMessage([
            "You are a Georgian-language fiction inspiration assistant. Condense the selected story elements into a usable starting idea from which the author can begin writing immediately.",
            "The core meaning of each selected element must be retained and let them form a causal relationship. You cannot just mechanically connect labels.",
            "Prioritize writing down the specific identity of the protagonist, cheats or core advantages, events that happened in the first chapter, and the goals that must be completed in the early stage; do not re-abstract it into a topic sentence.",
            "The existing themes and promotion modes are fixed foundations and cannot be changed without authorization. Even if the user only selects one element, it should be combined with a fixed foundation to lightly complement the protagonist, opening actions, and long-term traction, so that the results can be directly used to open the book.",
            "Supplementary content is only used to establish cause and effect. It cannot overwhelm user choices, and do not add another complex main line without authorization.",
            "Write only a paragraph of 45-220 words of plain text, without a title, outline, ending, Markdown, numbering, or process description. Only output strict JSON.",
        ].join("\n")),
        new HumanMessage([
            "Current book opening context:",
            input.contextSummary || "No clear context yet.",
            "",
            "User-selected story elements:",
            input.selectedSummary,
        ].join("\n")),
    ],
    postValidate: (output) => {
        if (/^\s*(სათაური|მოთხრობის აღწერა|საწყისი იდეა|title|story summary|starting idea)\s*[:：]/iu.test(output.idea) || output.idea.includes("```")) {
            throw new Error("The starting idea cannot contain a title or formatting markup.");
        }
        return output;
    }
};

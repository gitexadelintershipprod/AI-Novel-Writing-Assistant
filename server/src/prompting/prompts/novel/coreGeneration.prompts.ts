import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { z } from "zod";
import type { PromptAsset } from "../../core/promptTypes";
import { novelBiblePayloadSchema } from "../../../services/novel/novelCoreSchemas";
export interface NovelOutlinePromptInput {
    title: string;
    description: string;
    charactersText: string;
    worldContext: string;
    referenceContext?: string;
    initialPrompt?: string;
}
export interface NovelStructuredOutlinePromptInput {
    charactersText: string;
    worldContext: string;
    outline: string;
    referenceContext?: string;
    totalChapters: number;
}
export interface NovelStructuredOutlineRepairPromptInput {
    rawContent: string;
    totalChapters: number;
    reason: string;
}
export interface NovelBiblePromptInput {
    title: string;
    genreName: string;
    description: string;
    charactersText: string;
    worldContext: string;
    referenceContext?: string;
}
export interface NovelBeatPromptInput {
    title: string;
    description: string;
    worldContext: string;
    bibleRawContent: string;
    targetChapters: number;
    referenceContext?: string;
}
export interface NovelChapterHookPromptInput {
    title: string;
    content: string;
}
const novelBeatPayloadSchema = z.array(z.object({
    chapterOrder: z.union([z.number(), z.string()]).optional(),
    beatType: z.string().optional(),
    title: z.string().optional(),
    content: z.string().optional(),
    status: z.string().optional(),
}).passthrough());
const novelChapterHookSchema = z.object({
    hook: z.string().optional(),
    nextExpectation: z.string().optional(),
}).passthrough();
function buildStructuredOutlineSystemPrompt(totalChapters: number): string {
    return [
        "You are a structured novel outline planning engine.",
        "Your task is to generate a chapter-by-chapter outline for a novel as strict structured data, not prose.",
        "",
        "[Task Boundary]",
        "Output exactly one JSON array and nothing else.",
        `The array must contain exactly ${totalChapters} objects.`,
        "Do not output markdown, code fences, comments, explanations, or any text before or after the JSON.",
        "",
        "[Schema Requirements]",
        "Each object must contain exactly these keys, with no additional keys:",
        "- chapter: positive integer",
        "- title: string",
        "- summary: string",
        "- key_events: string[]",
        "- roles: string[]",
        "",
        "[Hard Constraints]",
        `Chapter numbers must be continuous integers from 1 to ${totalChapters}.`,
        "The value of chapter must match the chapter's actual position in the array.",
        "title must be a non-empty string and should feel like a real chapter title, not a placeholder.",
        "summary must be a non-empty string that explains what newly advances in that chapter and why the chapter matters in the story flow.",
        "key_events must contain 1-5 non-empty strings describing concrete developments, turns, reveals, conflicts, or decisions.",
        "roles must contain the major participating characters or forces that are materially involved in that chapter.",
        "",
        "[Quality Requirements]",
        "Each chapter must create real forward movement and should not feel like filler.",
        "Adjacent chapters must not repeat the same function, event pattern, or summary in different wording.",
        "The outline should show progression, escalation, turning points, and payoff rhythm across the full chapter sequence.",
        "Do not write vague generic summaries such as 'the plot continues' or 'tension rises'.",
        "Do not use placeholder role names unless they already exist in the provided context.",
        "",
        "[Consistency Rules]",
        "Do not introduce contradictions with the provided setting, characters, or prior constraints.",
        "Do not invent major new core characters, world rules, or premise shifts unless the user context explicitly supports them.",
        "Maintain continuity across chapters so later chapters feel like natural consequences of earlier ones.",
        "",
        "[Output Reminder]",
        "Return only the JSON array.",
    ].join("\n");
}
function buildStructuredOutlineRepairSystemPrompt(totalChapters: number): string {
    return [
        "You are a strict JSON repair engine.",
        "Your task is to transform the given input into a valid JSON array that strictly follows the required schema.",
        "",
        "[Task Boundary]",
        "Output exactly one JSON array and nothing else.",
        `The array must contain exactly ${totalChapters} objects.`,
        "Do not output markdown, code fences, comments, explanations, or any extra text.",
        "",
        "[Schema Requirements]",
        "Each object must contain exactly these keys (no more, no less):",
        "- chapter: positive integer",
        "- title: string",
        "- summary: string",
        "- key_events: string[]",
        "- roles: string[]",
        "",
        "[Hard Constraints]",
        `Chapter numbers must be continuous from 1 to ${totalChapters}.`,
        "The value of chapter must match its position in the array.",
        "All string fields must be non-empty.",
        "key_events must contain 1-5 non-empty strings.",
        "roles must contain at least 1 non-empty string.",
        "",
        "[Repair Rules]",
        "If the input contains extra fields, remove them.",
        "If required fields are missing, infer and fill them conservatively based on the input.",
        "If chapter count is incorrect, trim or expand to match the required count.",
        "If structure is broken, reconstruct it into valid JSON.",
        "If text contains non-JSON content, extract and convert it into valid JSON.",
        "",
        "[Consistency Rules]",
        "Preserve as much original content as possible while fixing structure.",
        "Do not invent major new plot elements or characters unless necessary to complete missing fields.",
        "Maintain logical continuity across chapters when possible.",
        "",
        "[Output Reminder]",
        "Return only the JSON array.",
    ].join("\n");
}
export const novelOutlinePrompt: PromptAsset<NovelOutlinePromptInput, string, string> = {
    id: "novel.outline.generate",
    version: "v2",
    taskType: "planner",
    mode: "text",
    language: "ka",
    contextPolicy: {
        maxTokensBudget: 0,
    },
    render: (input) => {
        const referenceBlock = input.referenceContext?.trim()
            ? `

[Reference materials (for technical reference only, do not copy the structure or plot)]
${input.referenceContext}`
            : "";
        const initialPrompt = input.initialPrompt?.trim() ?? "";
        const initialPromptBlock = initialPrompt
            ? `

[User supplementary requirements (priority for reference, but must not violate existing character and world settings)]
${initialPrompt.slice(0, 2000)}`
            : "";
        return [
            new SystemMessage([
                "You are the planner for the development of full-length online novels.",
                "Your task is not to write the main text, but to output an overall development trend with writability, scalability, and serialization potential based on the existing settings.",
                "",
                "[Task Boundary]",
                "Only output the development direction of the novel, without writing the main text, dialogue, or specific chapter divisions.",
                "No explanation, Markdown, or additional explanations may be output.",
                "",
                "\u3010Core constraints\u3011",
                "1. The given core roles must be strictly used and key roles must not be added, replaced or omitted.",
                "2. The existing world settings must be obeyed, and conflicting rules or out-of-bounds settings must not be introduced.",
                "3. Do not expand a large number of worldview details without any basis, and focus on plot advancement and structural design.",
                "",
                "[Output target]",
                "Generate a \"sustainable\" development direction, rather than a complete spoiler at once.",
                "It needs to have both: initial grip, room for expansion in the middle, and potential for upgrades in the later stages.",
                "",
                "\u3010Structural requirements\u3011",
                "The development direction must include the following levels:",
                "1. Starting situation: the protagonist\u2019s current situation, core dilemma and initial driving force.",
                "2. Main line driver: the core goal or problem throughout the book.",
                "3. Conflict evolution path: from primary conflict \u2192 extended conflict \u2192 escalation mode of complex conflict.",
                "4. Phased advancement: Clarify multiple stages, each stage should have different goals, pressure sources and situation changes.",
                "5. Key turning points: Design at least a few key nodes that will change the situation (cognitive changes/relationship changes/rules revealed/situation reversal).",
                "6. Growth and change: The protagonist\u2019s ability, cognition or position changes at different stages.",
                "7. High-level direction: overall development direction and possible final trends (but don\u2019t write down all the details).",
                "",
                "[Requirements for serialization guidance]",
                "1. The main selling points and reading hooks must be quickly established in the early stage to avoid long-term preparation.",
                "2. In the mid-term, new changes (new pressures/new relationships/new situations) must be continuously introduced to avoid repeating the same pattern.",
                "3. There must be room for upgrades in the later period to avoid premature capping or early overdraft climax.",
                "4. The overall direction should leave room for adjustment, and do not write down all development paths.",
                "",
                "\u3010Quality requirements\u3011",
                "1. Each stage should reflect \"why it is worth writing\" instead of general promotion.",
                "2. Avoid repeating similar conflicts or the same routine cycle.",
                "3. Prioritize strengthening the character's situation, choice pressure and emotional promotion, rather than stacking settings.",
                "4. Reasonable reinforcement is allowed when information is insufficient, but it must be restrained and consistent.",
            ].join("\n")),
            new HumanMessage([
                `Novel title:${input.title}`,
                `Introduction to the novel:${input.description}`,
                "",
                "[Core roles (must be used, cannot be replaced or ignored)]",
                input.charactersText,
                "",
                "\u3010World Context\u3011",
                input.worldContext,
                referenceBlock,
                initialPromptBlock,
                "",
                "Please output the complete development direction.",
            ].join("\n")),
        ];
    }
};
export const novelStructuredOutlinePrompt: PromptAsset<NovelStructuredOutlinePromptInput, string, string> = {
    id: "novel.structuredOutline.generate",
    version: "v2",
    taskType: "planner",
    mode: "text",
    language: "ka",
    contextPolicy: {
        maxTokensBudget: 0,
    },
    render: (input) => {
        const referenceBlock = input.referenceContext?.trim()
            ? `

[Reference materials (for technical reference only, do not copy the plot or structure)]
${input.referenceContext}`
            : "";
        return [
            new SystemMessage([
                buildStructuredOutlineSystemPrompt(input.totalChapters),
                "",
                "[Content Requirements]",
                "The outline must reflect clear progression, escalation, and turning points across chapters.",
                "Each chapter must introduce meaningful change (event, decision, reveal, conflict, or consequence).",
                "Avoid filler chapters or repeated patterns across adjacent chapters.",
                "",
                "[Continuity Rules]",
                "All chapters must follow the provided outline direction and remain consistent with characters and world context.",
                "Do not introduce new core characters unless clearly implied by the context.",
                "Do not contradict established setting or prior developments.",
                "",
                "[Chapter Function Guidance]",
                "Early chapters must establish hook, situation, and main conflict.",
                "Middle chapters must expand, complicate, and escalate.",
                "Later chapters must intensify pressure and deliver partial or major payoffs.",
            ].join("\n")),
            new HumanMessage([
                "[Core roles (must be used, cannot be replaced or ignored)]",
                input.charactersText,
                "",
                "\u3010World Context\u3011",
                input.worldContext,
                "",
                "[Development trend (must be strictly followed and must not deviate from the main line)]",
                input.outline,
                referenceBlock,
                "",
                `Based on the above content, please generate ${input.totalChapters} Structured chapter planning for chapters.`,
                "",
                "[Output requirements (must be strictly followed)]",
                "1. Only output a JSON array.",
                "2. Each object must contain exactly: chapter, title, summary, key_events, roles.",
                "3. chapter must be continuous from 1.",
                "4. key_events and roles must be non-empty string arrays.",
                "5. No explanations, no extra text.",
            ].join("\n")),
        ];
    }
};
export const novelStructuredOutlineRepairPrompt: PromptAsset<NovelStructuredOutlineRepairPromptInput, string, string> = {
    id: "novel.structuredOutline.repair",
    version: "v2",
    taskType: "planner",
    mode: "text",
    language: "ka",
    contextPolicy: {
        maxTokensBudget: 0,
    },
    render: (input) => [
        new SystemMessage([
            buildStructuredOutlineRepairSystemPrompt(input.totalChapters),
            "",
            "[Priority]",
            "Fix structural validity first (JSON shape, keys, count, types).",
            "Then ensure minimal semantic correctness while preserving original content.",
            "",
            "[Strict Enforcement]",
            "If input is partially valid, do not re-generate everything; repair in place.",
            "Do not add explanations or comments.",
        ].join("\n")),
        new HumanMessage([
            "Please amend the following content to a strictly structured JSON array (repair the structure first, then the semantics):",
            "",
            `[Reason for verification failure]`,
            input.reason,
            "",
            "\u3010Original content\u3011",
            input.rawContent,
            "",
            "[Output requirements (must be strictly followed)]",
            `- must be output ${input.totalChapters} objects`,
            "- Each object can only contain: chapter, title, summary, key_events, roles",
            "- chapter must increase continuously from 1",
            "- No explanation or additional text is allowed to be output",
        ].join("\n")),
    ]
};
export const novelBiblePrompt: PromptAsset<NovelBiblePromptInput, typeof novelBiblePayloadSchema._output> = {
    id: "novel.bible.generate",
    version: "v2",
    taskType: "planner",
    mode: "structured",
    language: "ka",
    contextPolicy: {
        maxTokensBudget: 0,
    },
    outputSchema: novelBiblePayloadSchema,
    render: (input) => {
        const referenceBlock = input.referenceContext?.trim()
            ? `

[Reference materials (only for reference on technique and direction, no plot or structure may be copied)]
${input.referenceContext}`
            : "";
        return [
            new SystemMessage([
                "You are a Bible planning assistant for online works.",
                "Your task is not to write the text or expand the outline, but to generate a work Bible based on the given information that can be used for subsequent long-term creation.",
                "",
                "[Task Boundary]",
                "Only output strict JSON that conforms to the schema.",
                "Do not output Markdown, explanations, comments, code blocks, or any extra text.",
                "Fields other than the schema must not be added, and existing fields must not be omitted.",
                "",
                "[Output field requirements]",
                "The following fields must be output:",
                "1. coreSetting: The core setting of the work, which explains the most essential world/subject/conflict basis of the book.",
                "2. forbiddenRules: hard rules, restricted areas or conflict boundaries that must not be violated in creation, focusing on \"no set conflicts can occur\".",
                "3. mainPromise: The main reading promise that this book continues to provide readers, explaining why readers will continue to follow it.",
                "4. characterArcs: The main axis of growth and direction of change of the core character, emphasizing staged changes and not talking in general terms.",
                "5. worldRules: world operating rules, basic order, key restrictions and causal boundaries, which are required to constrain subsequent creation.",
                "",
                "\u3010Core constraints\u3011",
                "1. Must be generated strictly based on the input title, genre, introduction, characters and world context.",
                "2. Do not create big settings that are irrelevant to the main line out of context.",
                "3. Do not ignore the given roles or obscure the role's functions to the point where it cannot guide subsequent writing.",
                "4. forbiddenRules and worldRules must truly constrain subsequent content and cannot be written as empty words.",
                "5. mainPromise must reflect the serialization value of the web article and cannot just write the theme slogan.",
                "",
                "\u3010Quality requirements\u3011",
                "1. coreSetting To grasp the \"most irreplaceable bone of this book\", it cannot just be a retelling of the subject matter.",
                "2. forbiddenRules should be specific, clear, and executable, and avoid empty expressions such as \"maintain consistency.\"",
                "3. characterArcs should reflect the growth or change direction of the character in the long-term serialization, rather than static labels.",
                "4. worldRules should write rules that really affect the advancement of the plot, rather than background introduction.",
                "5. The overall content should serve the long-term stability of creation and be suitable as a constraint basis for subsequent volume division, chapter splitting, and continuation of writing.",
                "",
                "[Generation Principle]",
                "When there is insufficient information, conservative completion can be done, but it must be restrained and coherent, and priority must be given to ensuring the stability of the setting.",
            ].join("\n")),
            new HumanMessage([
                `Novel title:${input.title}`,
                `Type:${input.genreName}`,
                `Introduction:${input.description}`,
                "",
                "\u3010Character\u3011",
                input.charactersText,
                "",
                "\u3010World Context\u3011",
                input.worldContext,
                referenceBlock,
                "",
                "Please output the work Bible JSON.",
            ].join("\n")),
        ];
    }
};
export const novelBeatPrompt: PromptAsset<NovelBeatPromptInput, z.infer<typeof novelBeatPayloadSchema>> = {
    id: "novel.beat.generate",
    version: "v2",
    taskType: "planner",
    mode: "structured",
    language: "ka",
    contextPolicy: {
        maxTokensBudget: 0,
    },
    outputSchema: novelBeatPayloadSchema,
    render: (input) => {
        const referenceBlock = input.referenceContext?.trim()
            ? `

[Reference materials (only for reference on technique and rhythm, no plot or structure may be copied)]
${input.referenceContext}`
            : "";
        return [
            new SystemMessage([
                "You are the rhythm planning assistant for online plots.",
                "Your task is not to write the main text, nor to output a prose outline, but to generate a plot beat list that can be used for subsequent chapter planning and writing based on the work Bible and the target number of chapters.",
                "",
                "[Task Boundary]",
                "Only output strict JSON that conforms to the schema.",
                "Do not output Markdown, explanations, comments, code blocks, or any extra text.",
                "Fields other than the schema must not be added, and fields must not be missing.",
                "",
                "[Output requirements]",
                "The output must be a JSON array.",
                "Each item must completely contain the following fields:",
                "- chapterOrder",
                "- beatType",
                "- title",
                "- content",
                "- status",
                "",
                "[Field constraints]",
                "1. chapterOrder must correspond to the order of chapters, increase continuously starting from 1, and cover the target number of chapters.",
                "2. The beatType must accurately express the main beat functions of the chapter, such as opening establishment, conflict escalation, information revelation, relationship changes, situation reversal, climax fulfillment, tail hook, etc.",
                "3. The title must be like a real and usable beat title, clearly reflecting the core advancement of the chapter, and should not be written as a vague label.",
                "4. Content must clearly describe what this chapter specifically advances, what has changed, and what role it plays in the overall rhythm.",
                "5. status must be used to indicate the current status of the beat, keeping the semantics of the entire array consistent, and must not be used indiscriminately.",
                "",
                "\u3010Core constraints\u3011",
                "1. The novel\u2019s introduction, world context, and work Bible must be strictly adhered to, and the main line commitment must not be deviated from.",
                "2. Do not invent new core characters, major world rules, or main plot directions out of context.",
                "3. Each chapter must have substantial advancement, and there cannot be pure filler, pure atmosphere, or pure retelling beats.",
                "4. The beats in adjacent chapters cannot just be tautological, but must reflect at least one of advancement, change, upgrade, turn, or fulfillment.",
                "5. The overall beat sequence must form a clear rhythm: establishing the hook and situation in the front section, expanding and upgrading in the middle section, and pressing and cashing in the latter section.",
                "",
                "\u3010Quality requirements\u3011",
                "1. The first few chapters must quickly establish the main situation, main conflict or main selling point to avoid being delayed in entering the story.",
                "2. New variables, new pressures, new choices or new consequences must be continuously introduced in the middle stage to avoid linear repetitive overloading.",
                "3. The latter part must reflect staged rewards, the end of the situation, or greater suspense, rather than ending in a flat push.",
                "4. Content should emphasize \"why this chapter deserves to exist\" rather than generally summarizing the plot.",
                "5. Reference materials can only draw on techniques, rhythm, and organization, but cannot copy character relationships, plot structures, or plots.",
                "",
                "[Generation Principle]",
                "When information is insufficient, conservative completion is allowed, but coherence and restraint must be maintained, and rhythm stability and writeability must be prioritized.",
            ].join("\n")),
            new HumanMessage([
                `Novel title:${input.title}`,
                `Introduction to the novel:${input.description}`,
                "",
                "\u3010World Context\u3011",
                input.worldContext,
                "",
                "\u3010Work Bible\u3011",
                input.bibleRawContent,
                "",
                `[Target number of chapters]${input.targetChapters}`,
                referenceBlock,
                "",
                "Please output the corresponding plot beat JSON array.",
            ].join("\n")),
        ];
    }
};
export const novelChapterHookPrompt: PromptAsset<NovelChapterHookPromptInput, z.infer<typeof novelChapterHookSchema>> = {
    id: "novel.chapterHook.generate",
    version: "v3",
    taskType: "planner",
    mode: "structured",
    language: "ka",
    contextPolicy: {
        maxTokensBudget: 0,
    },
    outputSchema: novelChapterHookSchema,
    render: (input) => [
        new SystemMessage([
            "You are the web article hook planning assistant.",
            "Your task is not to rewrite the text, but to refine an effective end-of-chapter hook and expectations for the next chapter based on the content of the current chapter.",
            "",
            "[Task Boundary]",
            "Only output strict JSON that conforms to the schema.",
            "Do not output Markdown, explanations, comments, code blocks, or any extra text.",
            "Fields other than the schema must not be added, and fields must not be missing.",
            "",
            "[Output format]",
            "Must output: {\"hook\":\"Hook at the end of the chapter\",\"nextExpectation\":\"Expectation points for the next chapter\"}",
            "",
            "[Field requirements]",
            "1. The hook must be like the follow-up hook that would be formed at the end of a real online article, giving priority to suspense, sudden changes, unfinished decisions, risk escalation, the aftermath of information disclosure, or sudden changes in the situation.",
            "2. nextExpectation must clearly state what progress the reader will naturally expect to see in the next chapter. It cannot be written in a general way as \"subsequent development\" or \"what will happen next.\"",
            "",
            "\u3010Core constraints\u3011",
            "1. It must be generated strictly based on the current chapter title and chapter content, and no major events may be fabricated away from the content.",
            "2. The hook must take over the progress that has already occurred in this chapter, like a natural extension from the main text, rather than adding an external suspense out of thin air.",
            "3. nextExpectation must form a continuous relationship with hook, indicating the most noteworthy fulfillment direction in the next chapter.",
            "4. Do not repeat large sections of the original sentences in the text of this chapter, but refine and reorganize them.",
            "5. Don\u2019t write the hook as a summary sentence, topic sentence, lyrical sentence or empty exclamation sentence.",
            "",
            "\u3010Quality requirements\u3011",
            "1. Prioritize making the hook immediately readable, rather than broadly summarizing the plot.",
            "2. If the chapter ends on the eve of decision-making, the hook should highlight the pressure of decision-making; if the chapter ends on an abnormal exposure, the hook should highlight the consequences or the entrance to the truth; if the chapter ends on a reversal of the situation, the hook should highlight the new unstable state.",
            "3. nextExpectation should be specific to \u2018what will most likely be advanced in the next chapter\u2019, rather than abstract emotions.",
            "4. Even when there is insufficient information, give a conservative but effective hook and don\u2019t write empty words.",
        ].join("\n")),
        new HumanMessage([
            `Chapter title:${input.title}`,
            "",
            "\u3010Chapter content\u3011",
            input.content,
            "",
            "Please output the chapter end hook JSON.",
        ].join("\n")),
    ]
};

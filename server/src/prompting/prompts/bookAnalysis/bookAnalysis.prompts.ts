import type { BookAnalysisSectionKey } from "@ai-novel/shared/types/bookAnalysis";
import { BOOK_ANALYSIS_STRUCTURED_FIELD_LABELS, BOOK_ANALYSIS_STRUCTURED_FIELD_SPECS, } from "@ai-novel/shared/types/bookAnalysis";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { z } from "zod";
import type { PromptAsset } from "../../core/promptTypes";
import { bookAnalysisOptimizeDraftOutputSchema, bookAnalysisSectionOutputSchema, bookAnalysisSourceNoteOutputSchema, } from "../../../services/bookAnalysis/shared/bookAnalysisSchemas";
import { BOOK_ANALYSIS_STRUCTURED_ARRAY_LIMIT, BOOK_ANALYSIS_TIMELINE_NODE_LIMIT, } from "../../../services/bookAnalysis/shared/bookAnalysis.utils";
export interface BookAnalysisSourceNotePromptInput {
    segmentLabel: string;
    segmentContent: string;
}
export interface BookAnalysisSectionPromptInput {
    sectionKey: BookAnalysisSectionKey;
    sectionTitle: string;
    promptFocus: string;
    overviewContextText?: string;
    userFocusInstructionText?: string;
    sectionFocusInstructionText?: string;
    notesText: string;
}
export interface BookAnalysisOptimizeDraftPromptInput {
    sectionKey: BookAnalysisSectionKey;
    sectionTitle: string;
    instruction: string;
    currentDraft: string;
    notesText: string;
}
function buildSectionStructuredDataContract(sectionKey: BookAnalysisSectionKey): string {
    const commonRules = [
        "structuredData must be a JSON object.",
        "Prioritize using the fixed key names agreed in the current section, and do not rewrite, delete or add synonymous key names without authorization.",
        "If there is insufficient basis for a certain piece of information, the string field returns an empty string, and the array field returns an empty array.",
        "Use concise Georgian phrases for array elements and avoid long explanations.",
        "Do not move large sections of analysis in markdown into structuredData as is; structuredData should be more suitable as a data layer for programs to read, filter, display and subsequently reuse.",
        "All content must be based on established generalizations from existing notes or analyses, and unfounded information must not be added.",
    ].join("\n");
    const specs = BOOK_ANALYSIS_STRUCTURED_FIELD_SPECS[sectionKey] ?? [];
    if (specs.length === 0) {
        return [
            commonRules,
            "When the current section does not have a preset fixed structure, structuredData must still keep the field names concise, stable, and directly correspond to the analysis focus of the section.",
        ].join("\n\n");
    }
    const structureExample = specs.reduce<Record<string, unknown>>((acc, field) => {
        const label = BOOK_ANALYSIS_STRUCTURED_FIELD_LABELS[field.key] ?? field.key;
        if (field.type === "string") {
            acc[field.key] = label;
        }
        else if (field.type === "timelineNodeArray") {
            acc[field.key] = [{
                    label,
                    timeHint: "Time reminder, can be omitted",
                    phase: "Stage label, can be omitted",
                    sourceRefs: ["Fragment tag, can be omitted"],
                }];
        }
        else {
            acc[field.key] = [label];
        }
        return acc;
    }, {});
    const stringFields = specs.filter((field) => field.type === "string").map((field) => field.key);
    const arrayFields = specs.filter((field) => field.type === "stringArray").map((field) => field.key);
    const timelineNodeFields = specs.filter((field) => field.type === "timelineNodeArray").map((field) => field.key);
    const typeRules = [
        stringFields.length > 0 ? `${stringFields.join("、")} is a string.` : "",
        arrayFields.length > 0 ? `${arrayFields.join("、")} is an array of strings.` : "",
        timelineNodeFields.length > 0
            ? `${timelineNodeFields.join("、")} It is an array of timeline nodes; each item must have a label, and timeHint, phase, and sourceRefs are optional.`
            : "",
    ].filter(Boolean).join(" ");
    const extraRules: Partial<Record<BookAnalysisSectionKey, string[]>> = {
        overview: [
            "targetReaders and weaknesses allow low-risk comprehensive judgments based on multiple notes, but they must be supported by information such as subject matter, selling points, reader signals, weak signals, characterization, and narrative methods; if the support is insufficient, an empty array will be returned.",
        ],
        market_highlights: [
            "targetReaderMatches allows low-risk matching judgments based on subject matter, selling points, and reader signals, but does not pretend to be an accurate crowd portrait.",
        ],
        timeline: [
            "timeNodes and eventOrder use node object arrays, do not return string arrays; label writes the event or the node itself, timeHint writes the relative or absolute time hint, and phase writes the phase it belongs to.",
            "sourceRefs can only fill in the sourceLabel that already appears in notes; if the source fragment cannot be determined, sourceRefs can be omitted and do not make up the fragment name.",
        ],
    };
    return [
        commonRules,
        `The current section must use the following fixed structure:
${JSON.stringify(structureExample, null, 2)}`,
        `Type requirements:${typeRules}`,
        ...(extraRules[sectionKey] ?? []),
    ].join("\n\n");
}
function buildOverviewMarkdownRequirements(sectionTitle: string, promptFocus: string): string {
    return [
        `markdown must be written into a "${sectionTitle}\u300BAnalysis manuscript, the entire article is in natural Georgian.`,
        "The main text must output secondary headings in the following order:",
        "## Positioning in one sentence",
        "## theme tag",
        "## Selling point tag",
        "## Target readers",
        "## Overall advantages",
        "## Overall shortcomings",
        "Do not write an audit report in the structure of \u201Coverall judgment/key analysis/reserved judgment or explanation of limitations\u201D.",
        "It is allowed to make low-risk comprehensive judgments based on multiple notes, especially the target readers and overall shortcomings; but the judgment must be based on the given information such as subject matter, plot, characters, writing style, selling points, reader signals, shortcomings signals, etc.",
        "If it is a comprehensive inference, please use careful expressions such as \"more biased\", \"relatively suitable\", \"may be\", \"more attractive to... readers\", etc., and do not pretend to be certain facts.",
        "Only when even a low-stakes generalization cannot be formed is written \"Insufficient material\" or \"Existing notes cannot support stronger judgment.\"",
        "Each section should give a direct conclusion first, and then use 1-3 sentences to explain where it is reflected, why it is established, and what reading effect or product value it will bring.",
        "Don't repeat all the notes mechanically, and don't write an entire section as a vague outline.",
        "The following key points must be covered as a priority:",
        promptFocus,
    ].join("\n");
}
function buildGenericSectionMarkdownRequirements(sectionTitle: string, promptFocus: string): string {
    return [
        `markdown must be written into a "${sectionTitle}\u300BAnalysis manuscript, the entire article is in natural Georgian.`,
        "The text should have a clear hierarchy, but should not be written in the style of an audit report.",
        "The conclusion must be specific and try to explain \"where it is reflected, why it is established, and what reading effect or creative value it will bring.\"",
        "Low-risk generalizations based on multiple notes are allowed, but no new facts, original text details, author intentions, or implicit causation beyond the notes are allowed.",
        "If a judgment comes primarily from a combination of inferences, use careful wording to reduce the strength of the conclusion rather than presenting the inference as a definite fact.",
        "Write \"Insufficient material\" or \"Existing notes cannot support stronger judgment\" only when the support of the notes is clearly insufficient.",
        "Do not recite all the original text or all notes, but screen, summarize, compare and judge.",
        "The following key points must be covered as a priority:",
        promptFocus,
    ].join("\n");
}
function buildSectionMarkdownRequirements(sectionKey: BookAnalysisSectionKey, sectionTitle: string, promptFocus: string): string {
    if (sectionKey === "overview") {
        return buildOverviewMarkdownRequirements(sectionTitle, promptFocus);
    }
    return buildGenericSectionMarkdownRequirements(sectionTitle, promptFocus);
}
export const bookAnalysisSourceNotePrompt: PromptAsset<BookAnalysisSourceNotePromptInput, z.infer<typeof bookAnalysisSourceNoteOutputSchema>> = {
    id: "bookAnalysis.source.note",
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
    outputSchema: bookAnalysisSourceNoteOutputSchema,
    render: (input) => [
        new SystemMessage([
            "You analyze openings in Georgian-language fiction.",
            "Your task is not to write a book review, nor to do a literary appreciation, but to organize \"single original text fragments\" into structured notes that can be analyzed and reused in subsequent chapters.",
            "",
            "You can only extract based on information that clearly appears in the current fragment. Low-risk, close-to-the-original summarization is allowed, but it is prohibited to make up the characters\u2019 deep motivations, hidden causes and effects, author\u2019s intentions, book-level conclusions, or overly strong market judgments that are not directly reflected in the original text.",
            "",
            "Output only a JSON object, no Markdown, explanations, comments, or extra text.",
            "The structure is fixed as:",
            "{",
            "  \"summary\": \"1-2 sentences Georgian summary\",",
            '  "plotPoints": ["..."],',
            '  "timelineEvents": ["..."],',
            '  "characters": ["..."],',
            '  "worldbuilding": ["..."],',
            '  "themes": ["..."],',
            '  "styleTechniques": ["..."],',
            '  "marketHighlights": ["..."],',
            '  "readerSignals": ["..."],',
            '  "weaknessSignals": ["..."],',
            '  "evidence": [{"label": "...", "excerpt": "..."}]',
            "}",
            "",
            "Field description:",
            "1. Summary: Use 1-2 sentences to summarize what is written in this fragment. It only summarizes the fragment itself and does not extend to the entire book.",
            "2. PlotPoints: Extract the key plot information, conflicts, turning points, and action results in this clip, focusing on \"what happened\".",
            "3. timelineEvents: Only extract information with time advancement, sequence, and stage changes. If the fragments do not have a clear time sequence, an empty array can be returned and should not be mechanically repeated with plotPoints.",
            "4. Characters: Extract character information that clearly appears, is mentioned, or has a role in the clip. It can include status, relationship, and behavioral characteristics, but do not add deep psychology.",
            "5. Worldbuilding: Extract the background setting, rules, social environment, geographical space, professional system, power structure, etc. clearly reflected in the fragment. If not, leave it blank.",
            "6. Themes: Extract thematic tendencies or emotional motifs that have been clearly revealed in the clip, such as survival, revenge, loyalty, oppression, and trust rifts. Don\u2019t elevate it into empty value judgments.",
            "7. styleTechniques: Extract expressions or narrative techniques that can be directly seen in the clip, such as contrast, suspense hooks, sensory description, group portrait switching, dialogue advancement, and fast-paced cutting. Don't write it as an empty compliment.",
            "8. marketHighlights: Extract the selling points that can be directly seen in the current clip and are helpful for reading appeal, such as strong opening conflicts, clear character labels, clear undercover suspense, strong battle scenes, and sufficient emotional stimulation.",
            "9. readerSignals: Extract reading satisfaction points or audience preference signals revealed by the current clip, such as wits, passion, group collaboration, ambiguous pull, regional customs, and clear sense of value. Don\u2019t jump right up to a certain target audience tag.",
            "10. weaknessSignals: Only record the creative shortcomings or controversial point signals that have been exposed in the current clip and have low risk, such as facial makeup, excessive explanations, slogan-like dialogue, repeated conflicts, reliance on coincidences for advancement, weak emotional lines, and strong period style. If not, leave it blank.",
            "11. evidence: Provide up to 3 pieces of evidence. label is the name of the evidence information point, and excerpt must be a short excerpt as close to the original text as possible. Priority is given to retaining the wording of the original sentence, and do not rewrite the growth analysis.",
            "",
            "Hard rules:",
            "1. All values must be in natural Georgian.",
            "2. Only extract information that is clearly present in the clip or can be summarized with low risk, and do not make assumptions.",
            "3. Each array has a maximum of 5 items; evidence has a maximum of 3 items.",
            "4. If a certain type of information is not obvious, return an empty array and do not hardcode it.",
            "5. evidence.excerpt must be a short excerpt and cannot be written as an analysis description.",
            "6. Do not repeatedly insert the same information into multiple arrays.",
            "7. The output content should be as specific as possible, and use less empty words such as \u201Cembodying tension\u201D and \u201Ccreating atmosphere\u201D.",
            "8. Keep the most recognizable signals for themes, styleTechniques, marketHighlights, readerSignals, and weaknessSignals. Do not mechanically clear them, and do not fill them in just to make up the numbers.",
        ].join("\n")),
        new HumanMessage([
            `Fragment tags:${input.segmentLabel}`,
            "",
            "Original snippet:",
            input.segmentContent,
        ].join("\n")),
    ]
};
export const bookAnalysisSectionPrompt: PromptAsset<BookAnalysisSectionPromptInput, z.infer<typeof bookAnalysisSectionOutputSchema>> = {
    id: "bookAnalysis.section.generate",
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
    outputSchema: bookAnalysisSectionOutputSchema,
    render: (input) => [
        new SystemMessage([
            `You are a senior serial fiction book analyst. You are currently only responsible for writing the opening chapter of the book "${input.sectionTitle}》。`,
            "Your task is to, based on the given notes, produce a formal analysis draft that can be directly displayed for users to read, and a structuredData that is convenient for program consumption.",
            "You are not retelling the original text, writing a review, or completing the content beyond the notes.",
            "",
            "Output only a JSON object, no explanations, code blocks, prefaces, postscripts, or extra text. The fixed structure is:",
            "{",
            "  \"markdown\": \"Markdown analysis draft displayed to users\",",
            '  "structuredData": {},',
            '  "evidence": [{ "label": "...", "excerpt": "...", "sourceLabel": "...", "fieldKey": "...", "fieldIndex": 0, "chapterIndex": 0, "excerptOffsetRange": { "start": 0, "end": 10 } }]',
            "}",
            "",
            "Global hard rules:",
            "1. All content must be in natural Georgian.",
            "2. The analysis can only be based on the facts, summaries and excerpts that have appeared in the given notes. No additional details of the original text, author's intention, hidden cause and effect or deep motivation of the characters outside the notes are allowed.",
            "3. Low-risk comprehensive judgments based on multiple notes are allowed, but comprehensive judgments must not be disguised as certain facts.",
            "4. If a certain conclusion is an inference, please use careful wording such as \"more biased\", \"relatively suitable\", \"may be\", \"easy for readers to pay\", etc. to reduce the intensity.",
            "5. Only write \"insufficient materials\" or \"existing notes cannot support stronger judgment\" when the support of the notes is obviously insufficient; do not mechanically avoid the need to summarize whenever you encounter it.",
            "6. The analysis should give priority to the most critical information that best supports the conclusion. Do not spread it evenly, and do not repeat the same point of view in other words.",
            "7. The three parts markdown, structuredData, and evidence must be consistent with each other and must not conflict with each other.",
            "8. If the user message provides \"entire book positioning (from the overview section)\", it should be used as the caliber anchor point of the current section to maintain consistency in the judgment of the work's positioning, subject matter, selling points, and shortcomings; however, the specific conclusion must still be supported by the notes of the current section.",
            "9. If the user message provides book-opening concerns, it should be used as a filtering and expression priority; but the concerns cannot cover evidence constraints, fixed structures, and current section responsibilities.",
            "",
            buildSectionMarkdownRequirements(input.sectionKey, input.sectionTitle, input.promptFocus),
            "",
            "structuredData rules:",
            buildSectionStructuredDataContract(input.sectionKey),
            "",
            "Additional constraints:",
            "1. StructuredData must be more suitable as a data layer for programs to read, filter, display and reuse. Do not move markdown analysis into it as it is.",
            "2. If there is insufficient basis for a certain piece of information, the string field returns an empty string, and the array field returns an empty array; do not omit fields, do not return null, and do not create synonymous key names.",
            `3. Ordinary string array fields can retain at most ${BOOK_ANALYSIS_STRUCTURED_ARRAY_LIMIT} items; the timeline node array retains at most ${BOOK_ANALYSIS_TIMELINE_NODE_LIMIT} items; if more information is available, please filter and retain it in order of importance and narrative.`,
            "4. Use concise Georgian phrases for array items; avoid long explanations and synonymous repetition within an array.",
            "5. When outputting, try to keep the field order consistent with the agreed structure.",
            "",
            "evidence rules:",
            "1. Evidence Only retain the 3-8 pieces of evidence that best support the conclusion.",
            "2. The excerpt must come from existing excerpts or clear information in the given notes. Priority is given to retaining the original wording and not making up original sentences.",
            "3. The label should clearly correspond to a certain judgment point or analysis point, and should not be written as a vague label.",
            "4. sourceLabel must correspond to the specific fragment label as much as possible.",
            "5. If you cannot find sufficient basis for a certain conclusion, reduce the strength of the conclusion instead of forcing evidence.",
            "6. Don\u2019t let multiple pieces of evidence repeatedly prove the same thing. Give priority to retaining evidence with wider coverage and higher information content.",
            "7. Each piece of evidence must be set with a fieldKey, pointing to the specific field of the structuredData of this section; the fieldKey must come from the fixed structure of this section, and cannot create its own key name.",
            "8. Omit fieldIndex for string fields; fieldIndex must be set for array fields, and use 0-based subscripts to point to the corresponding array items.",
            "9. If the chapter can be determined from the fragment tag or excerpt position of notes, you can set chapterIndex; if it cannot be determined reliably, it can be omitted, and the backend will perform supplementary matching.",
            "10. excerptOffsetRange represents the 0-based character range excerpted in the source document; fill it in only when you are very sure, and omit it if you are not sure.",
        ].join("\n")),
        new HumanMessage([
            `Please generate "${input.sectionTitle}\u300BAnalysis draft.`,
            "",
            "Analysis focus:",
            input.promptFocus,
            "",
            ...(input.overviewContextText?.trim()
                ? [
                    input.overviewContextText.trim(),
                    "",
                ]
                : []),
            ...(input.userFocusInstructionText?.trim()
                ? [
                    "This unpacking of the book focuses on:",
                    input.userFocusInstructionText.trim(),
                    "",
                ]
                : []),
            ...(input.sectionFocusInstructionText?.trim()
                ? [
                    "This section focuses specifically on:",
                    input.sectionFocusInstructionText.trim(),
                    "",
                ]
                : []),
            "Available notes:",
            input.notesText,
        ].join("\n")),
    ]
};
export const bookAnalysisOptimizedDraftPrompt: PromptAsset<BookAnalysisOptimizeDraftPromptInput, z.infer<typeof bookAnalysisOptimizeDraftOutputSchema>> = {
    id: "bookAnalysis.section.optimize",
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
    outputSchema: bookAnalysisOptimizeDraftOutputSchema,
    render: (input) => [
        new SystemMessage([
            `You are the optimization editor of the unpacked manuscript. Currently you are only responsible for optimizing "${input.sectionTitle}\u300BThe analysis draft of this section.`,
            "Your goal is: on the premise of strictly obeying the user's modification intention, revise the current draft into a formal analysis draft that is more accurate, clearer, and more suitable for direct display to users for reading.",
            "",
            "Only output a JSON object: {\"optimizedDraft\":\"...\"}",
            "Do not output explanations, code blocks, comments, prefaces, postscripts, or additional text.",
            "",
            "Global hard rules:",
            "1. User modification instructions must be implemented first, but new facts, new conclusions, new original text details or overly strong judgments that are not supported by notes cannot be introduced.",
            "2. Revisions can only be made based on the current draft and given notes; low-risk comprehensive judgments based on multiple notes are allowed, but the supportable boundaries of the notes must not be exceeded.",
            "3. If the current draft is empty, you can make up the first version based on notes, but it must still strictly focus on the topic of the current section and do not expand into a whole book report.",
            "4. Try to retain the valid judgments that have been established in the current draft, and do not overturn it without reason; if adjustments are necessary, priority should be given to partial revisions rather than overall rewriting.",
            "5. If the user's request exceeds the support range of notes, it can be abbreviated, deleted, or rewritten into a more cautious statement, or clearly written as \"insufficient materials\" and \"existing notes cannot support stronger judgment.\" Do not make up.",
            "6. If there is any content in the current draft that is inconsistent with notes, lacks evidence, is too expressive, is repetitive or deviates from the topic of this section, you should take the initiative to correct it.",
            "7. optimizedDraft must be Georgian Markdown text that can be displayed directly to users, not a JSON explanation, modification instruction, or outline.",
            "",
            "Text requirements:",
            "1. The entire text is in natural Georgian.",
            "2. The conclusion must be specific and avoid empty words such as \"the characters are distinct\", \"the rhythm is good\" and \"the tension is strong\"; try to write clearly where it is reflected, why it is established and what it means.",
            "3. Do not recite all the notes or the original text, but filter, summarize, compare and judge.",
            "4. If multiple opinions are essentially repetitive, they should be expressed in a combined manner to avoid tautology.",
            "5. The language should be more stable and more like a formal analysis draft, rather than spoken comments or editor\u2019s notes.",
            `6. Optimized content must still focus on${input.sectionTitle}\u300BDon\u2019t go off topic in this section.`,
            "",
            "Modify priority:",
            "1. First satisfy the user modification instructions.",
            "2. Revise the factual basis and the strength of the conclusion.",
            "3. Re-optimize structure, expression, repetition and readability.",
            "4. If user instructions conflict with notes, conservative modifications will be made based on the supported range of notes.",
        ].join("\n")),
        new HumanMessage([
            `Chapter:${input.sectionTitle}`,
            `sectionKey：${input.sectionKey}`,
            "",
            "User modification instructions:",
            input.instruction,
            "",
            "Current draft:",
            input.currentDraft || "(empty)",
            "",
            "Available notes:",
            input.notesText,
        ].join("\n")),
    ]
};

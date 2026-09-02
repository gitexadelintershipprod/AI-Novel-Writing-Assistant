import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { z } from "zod";
import type { PromptAsset } from "../../core/promptTypes";
import { antiAiRuleAiDraftSchema, styleDetectionPayloadSchema, styleProfileAntiAiSelectionSchema, styleGeneratedProfileSchema, styleProfileExtractionSchema, styleProfileMetadataSchema, styleProfileSanitizeForGenerationSchema, styleRecommendationSchema, } from "./style.promptSchemas";
export interface StyleDetectionPromptInput {
    styleContractText: string;
    styleContractMetaText: string;
    antiRuleCatalogText: string;
    content: string;
}
export interface StyleRecommendationPromptInput {
    targetCount: number;
    novelSummary: string;
    catalogText: string;
    allowedProfileIds: string[];
}
export interface StyleGenerationPromptInput {
    styleBlock: string;
    characterBlock: string;
    antiAiBlock: string;
    selfCheckBlock: string;
    mode: "generate" | "rewrite";
    prompt: string;
    targetLength: number;
}
export interface StyleRewritePromptInput {
    styleContractText: string;
    content: string;
    issuesBlock: string;
}
export interface StyleProfileExtractionPromptInput {
    name: string;
    category?: string;
    sourceText: string;
    retryForFeatures?: boolean;
}
export interface StyleProfileFromBookAnalysisPromptInput {
    analysisTitle: string;
    name: string;
    sourceText: string;
}
export interface StyleProfileFromBriefPromptInput {
    brief: string;
    name?: string;
    category?: string;
}
export interface StyleProfileMetadataPromptInput {
    name: string;
    sourceType: "from_text" | "from_brief" | "from_book_analysis";
    preferredCategory?: string;
    styleDigest: string;
}
export interface StyleProfileAntiAiSelectionPromptInput {
    name: string;
    summary?: string;
    styleDigest: string;
    riskDigest: string;
    catalogText: string;
    maxRuleCount?: number;
}
export interface StyleProfileSanitizeForGenerationPromptInput {
    profileName: string;
    styleContractText: string;
    sourceDigest: string;
}
export interface AntiAiRuleAiDraftPromptInput {
    mode: "create" | "improve";
    instruction: string;
    currentRuleText?: string;
}
export const styleDetectionPrompt: PromptAsset<StyleDetectionPromptInput, z.infer<typeof styleDetectionPayloadSchema>> = {
    id: "style.detection",
    version: "v3",
    taskType: "planner",
    mode: "structured",
    language: "ka",
    contextPolicy: {
        maxTokensBudget: 0,
    },
    outputSchema: styleDetectionPayloadSchema,
    render: (input) => [
        new SystemMessage([
            "You are a novel writing detector, responsible for checking whether the text violates the current writing contract and anti-AI rules.",
            "Your task is not to polish the text, nor to rewrite it directly, but to output a structured detection result that can be used in the subsequent repair process.",
            "",
            "Output only a valid JSON object, no Markdown, explanations, comments, code blocks, or extra text.",
            "",
            "Output fields must and can only include:",
            "riskScore, summary, canAutoRewrite, violations。",
            "",
            "Each item in violations must and can only contain the following fields:",
            "ruleName, ruleType, severity, issueCategory, excerpt, reason, suggestion, canAutoRewrite。",
            "",
            "Global hard rules:",
            "1. All content must be in natural Georgian.",
            "2. Judgments can only be made based on the given rules and the text to be detected, and problems that do not exist are not allowed to be filled in out of thin air.",
            "3. A violation can only be determined if a clear basis can be found in the text.",
            "4. If there is insufficient evidence, do not force a violation.",
            "5. If there are no violations, violations must return an empty array.",
            "",
            "Detection range:",
            "1. Writing contract: Check whether the text violates the current required narrative method, character expression, language style, rhythmic organization, use of techniques or expression boundaries.",
            "2. Anti-AI rules: Check whether the text contains routines, stereotypes, empty summaries, mechanical comparisons, fake emotions, traces of templates, or other obvious AI-flavored issues.",
            "3. issueCategory must determine whether the issue is closer to \"style_expression\" or \"story_structure\". Only when the problem has transcended the expression level and begins to interfere with the plot structure or scene advancement, it can be marked as story_structure.",
            "4. You must read the entire text for recall, don\u2019t just focus on the beginning, the end, or the most conspicuous 1-3 problems; if AI smells appear in multiple adjacent paragraphs, merge them into high-value violations that can be repaired.",
            "5. Scan the full text for Georgian-specific risks: unnatural word order, case or agreement errors, malformed verb forms, English or Russian calques, bureaucratic phrasing, repeated connectors or pronouns, uniform sentence frames, exposition dumps, identical character voices, and artificial summaries.",
            "6. Literal pattern matches are supporting evidence only. Evaluate semantics and context before reporting a violation, and merge repeated instances into a useful repair direction.",
            "",
            "riskScore rules:",
            "1. riskScore is an integer from 0-100.",
            "2. The higher the score, the greater the overall risk of text violations, the heavier the AI traces, and the higher the pressure for automatic repair.",
            "3. Don\u2019t give a high score just because you find 1 minor problem; the riskScore must reflect the overall risk, not a single point amplification.",
            "4. If there are more than 5 obvious template words, stunning templates, abstract psychological summaries or scene clich\u00E9s in the full text, the riskScore should usually not be lower than 60.",
            "",
            "summary rules:",
            "1. summary must state the overall detection conclusion in concise Georgian.",
            "2. Explain what type of issues the main risks are concentrated on, such as empty expressions, distorted characters, high anti-AI risks, weak rhythm, etc.",
            "3. Don\u2019t just write \u201Cthere are some problems\u201D in general, but point out the focus of the problem.",
            "",
            "canAutoRewrite rules:",
            "1. canAutoRewrite indicates whether this text is suitable for repair through automatic rewriting.",
            "2. If the problem is mainly expression level, sentence level, mild to moderate style deviation, it can usually be true.",
            "3. If the problem involves core plot, character logic, setting conflicts, or large-scale structural distortion, it should usually be false.",
            "",
            "violations rules:",
            "1. Only record issues that are truly worth entering into the repair process. Don\u2019t go into detail about minor flaws.",
            "2. If similar problems appear repeatedly in the text, they can be combined into one high-quality violation instead of being mechanically broken into many duplicate items.",
            "3. Each violation must explain \"why this is a problem\" and \"how it should be changed\".",
            "4. For long texts, 4-8 high-value violations are usually output first, covering different problem areas such as opening, character tags, templated descriptions, explanations, end-of-paragraph summaries, and ending hooks.",
            "",
            "Field requirements:",
            "1. ruleName: Indicate the name of the triggered problem rule. The original name in the input rule or the closest rule reference will be used first.",
            "2. ruleType: The source category must be clearly distinguished, which should be one of the writing rules, role expression rules or anti-AI rules.",
            "3. Severity: The severity of the problem must be reflected and expressed in stable, clear, and comparable grades.",
            "4. issueCategory: Use style_expression for expression layer deviation; use story_structure only when it affects the chapter structure or event advancement.",
            "5. excerpt: You must excerpt specific problem fragments from the text, and try to be as short, accurate, and positionable as possible; do not copy the entire paragraph.",
            "6. Reason: You must specify why this excerpt violates the rules. You cannot just read the rule name.",
            "7. Suggestion: You must give executable modification directions and directly explain how to adjust expressions, characters, rhythm or techniques; it is forbidden to output complete and reproducible replacement sentences, and it is forbidden to use \"for example:...\" followed by a paragraph of text.",
            "8. canAutoRewrite: Indicates whether the problem is suitable for automatic rewriting and repair, and must be consistent with the nature of the problem.",
            "",
            "Quality requirements:",
            "1. Don\u2019t output generic clich\u00E9s, such as \u201CIt can be more vivid\u201D and \u201CIt is recommended to optimize the expression\u201D.",
            "2. Don\u2019t misjudge normal web text expressions as AI traces.",
            "3. Don\u2019t mistake a difference in style choice as a violation unless it clearly violates a given rule.",
            "4. The output results must be directly used by the subsequent repair / rewrite process.",
            "",
            "The output must strictly conform to styleDetectionPayloadSchema.",
        ].join("\n")),
        new HumanMessage([
            "Current writing contract meta information:",
            input.styleContractMetaText,
            "",
            "Current writing contract:",
            input.styleContractText,
            "",
            "Anti-AI rules directory:",
            input.antiRuleCatalogText,
            "",
            "Text to be detected:",
            input.content,
        ].join("\n")),
    ]
};
export const styleRecommendationPrompt: PromptAsset<StyleRecommendationPromptInput, z.infer<typeof styleRecommendationSchema>> = {
    id: "style.recommendation",
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
    outputSchema: styleRecommendationSchema,
    render: (input) => [
        new SystemMessage([
            "You are a novel writing asset recommender, serving novice authors who lack writing experience, tend to go off track, and hope to write a complete book stably.",
            "Your task is to filter out the most suitable candidates from the given list of writing assets based on the current novel information.",
            "",
            "Only allow selection from the given list, no inventing new asset IDs, names, tags or ability descriptions.",
            "",
            "The following dimensions must be prioritized when making recommendations:",
            "1. Target reader matching degree",
            "2. Ability to fulfill promises in the first 30 chapters",
            "3. Business tag matching degree",
            "4. Matching of themes",
            "5. Matching degree of narrative perspective",
            "6. Rhythm matching",
            "7. Language texture matching",
            "8. Is it suitable for a novice to write a complete book stably?",
            "",
            "Recommended principles:",
            "1. Give priority to recommending solutions with \"high adaptability and high stability\" rather than solutions that are advanced in theory and difficult to control in practice.",
            "2. If a certain writing style, although outstanding in style, is not conducive to Xiaobai\u2019s continued output, fulfilling the promise of the first 30 chapters, or maintaining commercial readability, the score should be lowered.",
            "3. If multiple solutions are available, give priority to retaining differentiated candidates so that there is a clear distinction between candidates, and do not give repeated recommendations that are essentially the same.",
            "",
            "The output must be a JSON object, no Markdown, explanations, comments, or extra text.",
            "The fixed format is:",
            "{\"summary\":\"...\",\"candidates\":[{\"styleProfileId\":\"...\",\"fitScore\":88,\"recommendationReason\":\"...\",\"caution\":\"...\"}]}",
            "",
            "Output requirements:",
            `1. Output under normal circumstances ${input.targetCount} candidates; if there are obviously not enough suitable candidates, it can be less than this number, but at least 1 valid candidate will be output.`,
            "2. fitScore must be an integer from 0 to 100, indicating the overall adaptability of the writing asset to the current novel.",
            "3. Candidates must be sorted by fitScore from high to low.",
            "4. The summary must briefly summarize the judgment logic of this recommendation and cannot be vague.",
            "5. recommendationReason must specify:",
            "   - Why it is appropriate for the target audience of this book",
            "   - Why it is beneficial to fulfill the promise of the first 30 chapters",
            "   - Why it fits the key features of the current theme, label, rhythm, and perspective",
            "6. caution is used to describe the risks of using the solution, overturning points, or areas that novices need to pay special attention to; it can be an empty string when there are no obvious risks.",
            "",
            "Hard constraints:",
            "1. Empty candidates must not be returned.",
            "2. A styleProfileId that does not appear in the given list must not be output.",
            "3. The target number of candidates must not be exceeded.",
        ].join("\n")),
        new HumanMessage([
            "Current novel information:",
            input.novelSummary,
            "",
            "Optional writing asset list:",
            input.catalogText,
        ].join("\n")),
    ],
    postValidate: (output, input) => {
        const allowedIds = new Set(input.allowedProfileIds);
        const candidates = output.candidates ?? [];
        if (candidates.length === 0) {
            throw new Error("There are no candidates in the writing method recommendation results.");
        }
        if (candidates.length > input.targetCount) {
            throw new Error(`The number of writing recommendation results exceeds the target number: the most expected ${input.targetCount} one, actual ${candidates.length} .`);
        }
        const invalidCandidateIds = candidates
            .map((candidate) => candidate.styleProfileId)
            .filter((id) => !allowedIds.has(id));
        if (invalidCandidateIds.length > 0) {
            throw new Error(`The writing method recommendation results contain illegal candidates:${invalidCandidateIds.join(", ")}`);
        }
        return output;
    }
};
export const styleGenerationPrompt: PromptAsset<StyleGenerationPromptInput, string, string> = {
    id: "style.generate",
    version: "v2",
    taskType: "writer",
    mode: "text",
    language: "ka",
    contextPolicy: {
        maxTokensBudget: 0,
    },
    render: (input) => [
        new SystemMessage([
            "You are a Georgian-language novel writing assistant.",
            "Your task is to generate or rewrite text based on user requirements, and strictly obey the given writing constraints.",
            "",
            "You must also comply with the requirements in the following rule blocks, in order of priority:",
            "Character expression rules and hard setting constraints > Writing rules > Anti-AI rules > Default language habits.",
            "",
            "[Writing rules]",
            input.styleBlock || "None",
            "",
            "[Role expression rules]",
            input.characterBlock || "None",
            "",
            "\u3010Anti-AI rules\u3011",
            input.antiAiBlock || "None",
            "",
            "Global hard rules:",
            "1. Only output the final text, do not output explanations, comments, modification instructions, title supplements, code blocks or additional text.",
            "2. All content must be in natural Georgian.",
            "3. Priority must be given to ensuring that the characters\u2019 words, deeds, tone, relationships, and settings do not go astray.",
            "4. Do not write obvious empty words, clich\u00E9s, summaries, outlines or model explanations.",
            "5. Do not repeat the rules directly into the text.",
            "",
            input.mode === "rewrite"
                ? [
                    "Current mission mode: Rewrite.",
                    "Rewrite request:",
                    "1. Directly output the rewritten complete text.",
                    "2. Keep the core semantics, event relationships, character relationships and plot direction of the original text, and do not change the plot without reason.",
                    "3. Focus on optimizing the language texture, writing fit, character expression consistency and anti-AI performance.",
                    "4. If there are obviously illegal expressions in the original text, they should be naturally corrected without destroying the original meaning.",
                ].join("\n")
                : [
                    "Current mission mode: Generate.",
                    `Directly output the text, the target length is about ${input.targetLength} words.`,
                    "Build requirements:",
                    "1. Prioritize ensuring that the text is complete, natural, and readable, rather than mechanically limiting the number of words.",
                    "2. If the target number of words cannot be hit absolutely accurately, it can float within a reasonable range, but it should not be obviously too short or too long.",
                    "3. The text must reflect the given writing style, character expression rules and anti-AI requirements.",
                ].join("\n"),
            "",
            "Writing quality requirements:",
            "1. Scenes, actions, emotions and information advancement should be expressed in concrete terms, and do not just write general judgments.",
            "2. The character's speaking style, behavioral habits and emotional reactions should be distinguishable and should not be model-like.",
            "3. The progression of paragraphs should be natural and avoid mechanical parallelism, repeated summaries, and hard transitions.",
            "4. If there is tension between the rules, the priority is to keep the characters from collapsing, the plot from being confusing, and the text to be readable.",
            "",
            "Self-check before output:",
            "1. Whether you strictly obey the writing rules and do not go off topic.",
            "2. Whether it complies with the rules of role expression and does not string the roles.",
            "3. Whether the obvious AI flavor has been eliminated, such as empty summaries, template sentences, fake liveliness, and mechanical lyricism.",
            "4. Whether to output only the main text without any additional instructions.",
            input.selfCheckBlock ? `5. Additional self-test requirements:
${input.selfCheckBlock}` : "",
        ].filter(Boolean).join("\n\n")),
        new HumanMessage(input.prompt),
    ]
};
export const styleRewritePrompt: PromptAsset<StyleRewritePromptInput, string, string> = {
    id: "style.rewrite",
    version: "v3",
    taskType: "repair",
    mode: "text",
    language: "ka",
    contextPolicy: {
        maxTokensBudget: 0,
    },
    render: (input) => [
        new SystemMessage([
            "You are a Georgian-language novel editing editor.",
            "Your task is to make targeted corrections to the original text based on the detected violations to make the text more compliant with writing rules, character expression rules, and anti-AI requirements.",
            "",
            "You must also abide by all constraints of the current writing contract:",
            "\u3010Writing Contract\u3011",
            input.styleContractText || "None",
            "",
            "Global hard rules:",
            "1. Only output the corrected complete text, do not output explanations, comments, modification instructions, code blocks or additional text.",
            "2. All content must be in natural Georgian.",
            "3. Prioritize the correction of issues in the issuesBlock; if there are obvious AI traces of the same type in adjacent paragraphs, the expression layer correction can be made simultaneously.",
            "4. The facts, sequence of events, character relationships, character positions, information sequence and core plot results must not be changed.",
            "5. Do not introduce new settings, new characters, new conflicts or new conclusions that are not found in the original text.",
            "6. The suggestion in issuesBlock only indicates the modification direction, not copyable text. Direct copying of example sentences in suggestion is prohibited.",
            "",
            "Correction principle:",
            "1. Prioritize making the minimum necessary changes, and don\u2019t overturn the entire thing if it can be partially repaired.",
            "2. If the problem is a writing violation, give priority to correcting sentence structure, wording, rhythm and expression rather than changing the plot.",
            "3. If the problem is a violation of character expression, you must ensure that the character's speaking style, emotional response, and behavioral logic fall within the character's rules.",
            "4. If the problem is anti-AI risks, focus on eliminating empty words, cliches, summaries, templates, mechanical comparisons, fake excitement and ineffective lyricism.",
            "5. Naturalization is not colloquialism. You should not only add superficial physical reactions such as \"very, too, a little, tight throat, sweaty palms\" to disguise the natural feeling.",
            "6. The narrative quality of the original theme must be retained, but excessive neatness, gorgeousness, uniformity and summary expressions must be reduced.",
            "7. The ending can be changed from a summary declaration to specific actions, abnormal reactions or resistance, but no additional plot information such as factual settings, hard twists, hidden identities, map annotations, secret messages, dead people, assassins, missing persons, etc. that are not in the original text are allowed.",
            "8. For characters\u2019 emotions, give priority to using actions, pauses, sight lines, dialogue and choices to express them; delete judgment sentences that summarize for readers.",
            "",
            "Quality requirements:",
            "1. The revised text must be natural, coherent, and readable, without any obvious patchiness.",
            "2. Don\u2019t just do mechanical synonymous replacement, you must actually fix the violation points.",
            "3. Do not over-rewrite the original normal expression to the point where it becomes stiff or distorted.",
            "4. If multiple questions are concentrated in the same paragraph, partial rewriting can be done, but the original meaning and original plot function must still be maintained.",
            "5. If the full text still contains template words such as \"as if, seemingly, perfect, bottomless, skin as bright as snow, eyebrows as picturesque, formed, shocking separation, singing and dancing, toasting, flattery, another layer of truth\", continue to compress, replace or change them into specific actions and on-site information.",
            "",
            "Self-check before output:",
            "1. Whether only the illegal expressions were corrected, and the facts and sequence of events were not changed.",
            "2. Whether it complies with writing rules, character expression rules and anti-AI rules.",
            "3. Have the main issues identified in issuesBlock been eliminated.",
            "4. Did you copy the example sentences in suggestion?",
            "5. Whether there are no new factual clues or screenwriter-style hard hooks.",
            "6. Whether to output only the corrected text without any additional instructions.",
        ].join("\n\n")),
        new HumanMessage([
            "Original text:",
            input.content,
            "",
            "Detected issues:",
            input.issuesBlock,
        ].join("\n")),
    ]
};
export const styleProfileExtractionPrompt: PromptAsset<StyleProfileExtractionPromptInput, z.infer<typeof styleProfileExtractionSchema>> = {
    id: "style.profile.extract",
    version: "v3",
    taskType: "planner",
    mode: "structured",
    language: "ka",
    contextPolicy: {
        maxTokensBudget: 0,
    },
    outputSchema: styleProfileExtractionSchema,
    render: (input) => [
        new SystemMessage([
            "You are the novel writing style feature extractor, responsible for organizing the text provided by the user into a \"writing style core draft JSON\" that can be used for imitation, migration, parameter adjustment and subsequent rule generation.",
            "Your task is not to write an appreciation or a review, but to extract executable, transferable, and controllable writing features as completely as possible.",
            "",
            "Output only a valid JSON object, no Markdown, explanations, comments, code blocks, or extra text.",
            "Output fields must and can only include:",
            "name, description, analysisMarkdown, summary, features。",
            "",
            "Global hard rules:",
            "1. All field values must be in natural Georgian.",
            "2. It can only be extracted based on the original text provided by the user, and no writing features that do not exist in the original text are allowed to be fabricated.",
            "3. Low-risk generalizations are allowed, but vague impressions are not allowed to be turned into strong conclusions.",
            "4. The output goal is to \"serve for subsequent imitation and migration\", so priority is given to extracting operable features rather than empty evaluations.",
            "5. This step is only responsible for high-value core information and is not responsible for classification labels, adaptation themes, anti-AI rule selection or preset combinations.",
            "",
            "Field requirements:",
            "1. name: Keep the input written name, or make a minimal standardization based on it. Do not create a new name.",
            "2. description: Use concise Georgian to summarize the method's recognizable traits, readability, and suitable use.",
            "3. analysisMarkdown: Write a short analysis draft for internal use, explaining the composition, advantages, migration boundaries and risks of this writing method. It should be short, substantial, and editable, and should not be written in an appreciation style.",
            "4. Summary: Use 1-2 sentences to summarize \"the most important core of this writing method.\"",
            "",
            "features rules:",
            "1. Features are the core of this output and must try to fully cover the five types of features: narrative, language, dialogue, rhythm, and fingerprint.",
            "2. Don\u2019t cut too much for the sake of conservatism. Keep everything that can be extracted stably.",
            "3. Each feature must provide keepRulePatch; if the feature is suitable for weakening during migration, then provide weakenRulePatch.",
            "4. Each feature must be specific and executable, and cannot be written in empty words such as \"good writing\", \"good rhythm\", or \"distinct characters\".",
            "5. Feature should give priority to describing \"how to write it\" instead of just describing \"what it reads like\".",
            "6. Group can only use: narrative, language, dialogue, rhythm, fingerprint.",
            "7. importance / imitationValue / transferability / fingerprintRisk must be decimals between 0-1.",
            "8. Special attention should be paid to fingerprint features: it is necessary to point out the source of identification and to assess the risk of direct copying.",
            "",
            "Quality requirements:",
            "1. Priority extraction of narrative features: advancement method, information release method, perspective control, conflict organization, scene switching logic.",
            "2. Prioritize the extraction of language features: sentence length, rhetorical habits, word density, spoken/written tendencies, and sensory description methods.",
            "3. Prioritize extraction of dialogue features: line length, information carrying method, subtext strength, and character distinction.",
            "4. Priority extraction of rhythm features: paragraph density, speed switching, hook points, pause patterns, and burst rhythm.",
            "5. Fingerprint feature priority extraction: It is easiest for people to recognize the structural traces of \"writing like this\".",
            "6. Don\u2019t write analysisMarkdown and features as tautologies. analysisMarkdown is responsible for the overall analysis, and features is responsible for the structural dismantling.",
            "",
            input.retryForFeatures
                ? [
                    "Retry hard rules:",
                    "1. The features returned last time are not available, and a non-empty features array must be returned this time.",
                    "2. If the original text length and information density allow, at least 8 features will be returned first.",
                    "3. If other fields are difficult to judge, they can be briefly processed, but features must not be omitted.",
                    "4. Prioritize complementing structural features instead of continuing to write general analysis.",
                ].join("\n")
                : "",
        ].filter(Boolean).join("\n")),
        new HumanMessage([
            `Written name:${input.name}`,
            `Suggested categories:${input.category ?? "unspecified"}`,
            "",
            "Original text:",
            input.sourceText,
            input.retryForFeatures
                ? [
                    "",
                    "Retry requirements:",
                    "- Return at least 8 features (if the original text is long enough).",
                    "- The exact field name features must be used.",
                    "- feature.group can only be narrative, language, dialogue, rhythm, and fingerprint.",
                ].join("\n")
                : "",
        ].filter(Boolean).join("\n")),
    ]
};
export const styleProfileFromBookAnalysisPrompt: PromptAsset<StyleProfileFromBookAnalysisPromptInput, z.infer<typeof styleGeneratedProfileSchema>> = {
    id: "style.profile.from_book_analysis",
    version: "v4",
    taskType: "planner",
    mode: "structured",
    language: "ka",
    contextPolicy: {
        maxTokensBudget: 0,
    },
    outputSchema: styleGeneratedProfileSchema,
    render: (input) => [
        new SystemMessage([
            "You are a novel writing asset editor.",
            "Your task is to organize the \"writing style and techniques\" in the book analysis into a \"writing style core asset JSON\" that can be directly entered into the system.",
            "This is not a review, nor a literary appreciation, nor a general summary, but to break down the writing method into rule-based assets that can be implemented, transferred, and controlled.",
            "",
            "Output only a valid JSON object, no Markdown, explanations, comments, code blocks, or extra text.",
            "Output fields must and can only include:",
            "name, description, analysisMarkdown, narrativeRules, characterRules, languageRules, rhythmRules。",
            "",
            "Global hard rules:",
            "1. All field values must be in natural Georgian.",
            "2. Refining can only be based on the given split-book analysis text, and writing features that have no basis in the original analysis must not be fabricated.",
            "3. Low-risk generalizations are allowed, but vague impressions are not allowed to be written into strong rules.",
            "4. The output goal is \"to be directly used by the subsequent writing system\", so the priority must be given to executability rather than analysis.",
            "5. This step is only responsible for core rules and short analysis drafts, and is not responsible for classification labels, adaptation themes or anti-AI rule selection.",
            "",
            "Field requirements:",
            "1. name: Use the given writing name, which can be slightly standardized, but do not create a new set of names.",
            "2. description: Use concise Georgian to summarize the method's style position, use, and source of recognition.",
            "3. analysisMarkdown: Write a short structured analysis draft to explain the composition, applicable boundaries, strengths, migration risks and key points of use of this writing method, but do not be vague.",
            "",
            "Rule layer requirements:",
            "1. narrativeRules / characterRules / languageRules / rhythmRules must be structured objects and cannot be written as string or array abstracts.",
            "2. Each set of rules must try to reflect \"how to write\", \"what to avoid\" and \"what to keep first\", rather than just writing style impressions.",
            "3. Rules must be specific, clear, and enforceable, and avoid empty words such as \"enhance the sense of substitution,\" \"pay attention to the rhythm,\" and \"make the characters more distinct.\"",
            "4. Key points extracted from narrativeRules: promotion method, information release, perspective organization, conflict organization, scene switching, hook design.",
            "5. CharacterRules key extraction: character appearance, emotional expression, relationship tension, line carrying, character differentiation, and behavioral logic presentation.",
            "6. LanguageRules key extraction: sentence length tendency, wording style, rhetorical habits, description density, spoken/written tendency, expression restraint.",
            "7. RhythmRules focuses on extraction: fast and slow rhythm, paragraph density, pause method, explosive point arrangement, information advancement frequency, and ending traction method.",
            "",
            "Quality requirements:",
            "1. The output must be like a written asset that can be directly stored in the system, rather than an analysis note.",
            "2. Each field must be consistent, and description must not state one style or rule but implement another way of writing.",
            "3. Do not write analysisMarkdown as a tautology with each rule layer. analysisMarkdown is responsible for the overall analysis, and the rule layer is responsible for executing constraints.",
            "4. If the input analysis is too small, it should be conservatively refined. It is better to be small and stable than to fill in complex rules out of thin air.",
        ].join("\n")),
        new HumanMessage([
            `Open the book and analyze the title:${input.analysisTitle}`,
            `Written name:${input.name}`,
            "",
            "Breaking down the writing styles and techniques in the book:",
            input.sourceText,
        ].join("\n")),
    ]
};
export const styleProfileFromBriefPrompt: PromptAsset<StyleProfileFromBriefPromptInput, z.infer<typeof styleGeneratedProfileSchema>> = {
    id: "style.profile.from_brief",
    version: "v3",
    taskType: "planner",
    mode: "structured",
    language: "ka",
    contextPolicy: {
        maxTokensBudget: 0,
    },
    outputSchema: styleGeneratedProfileSchema,
    render: (input) => [
        new SystemMessage([
            "You are a novel writing method asset editor, serving novice authors who have just started writing novels and only know how they want to feel, but do not know how to break down the rules themselves.",
            "Your task is to organize the \"desired writing style feeling\" described by the user in one sentence or a few sentences into a \"writing style core asset JSON\" that can be directly entered into the system.",
            "This is not a post-reading review, nor an imitation exercise, nor a general style review, but rather a set of starting writing methods that can be directly used by novices to revise and continue to refine.",
            "",
            "Output only a valid JSON object, no Markdown, explanations, comments, code blocks, or extra text.",
            "Output fields must and can only include:",
            "name, description, analysisMarkdown, narrativeRules, characterRules, languageRules, rhythmRules。",
            "",
            "Global hard rules:",
            "1. All field values must be in natural Georgian.",
            "2. The input may be short, vague, or even just one sentence \"like the way a certain work is written\". What you want to do is extract transferable writing dimensions, rather than requiring users to understand the terminology first.",
            "3. If the input mentions specific works, authors or style references, only transferable writing characteristics can be extracted, such as narrative restraint, dialogue tension, information density, rhythmic organization, sense of realistic friction, sense of speculation, etc.",
            "4. It is strictly prohibited to reproduce specific plots, character names, setting nouns, iconic sentences, famous scene structures or other identifiable expressions that can easily constitute direct imitation.",
            "5. Allow conservative inferences, but do not exaggerate vague impressions into overly specific rules.",
            "6. The output goal is to \"help novices get started directly\", so the rules must be clear, stable, and enforceable, and should not be written in expert jargon.",
            "7. This step is only responsible for core rules and short analysis drafts, and is not responsible for classification labels, adaptation themes or anti-AI rule selection.",
            "",
            "Field requirements:",
            "1. name: If the user gives a name, keep it and standardize it slightly; if not, give it a stable and easy-to-understand name based on the abstract writing essence. Do not directly use the title of a protected work as a title.",
            "2. description: Use concise Georgian to summarize the method's style position, readability, and suitable use.",
            "3. analysisMarkdown: Write a short structured analysis draft, explaining the core starting points, applicable boundaries, turning points and usage reminders for novices of this writing method.",
            "",
            "Rule layer requirements:",
            "1. narrativeRules / characterRules / languageRules / rhythmRules must be structured objects and cannot be written as string or array abstracts.",
            "2. Each set of rules must reflect \"how to write\", \"what to keep first\" and \"what to avoid as much as possible\", so that novices will know how to use it after opening it.",
            "3. Key points of narrativeRules extraction: advancement method, information release, perspective organization, conflict organization, scene switching, chapter ending traction.",
            "4. Key points extracted from characterRules: character expression restraint, emotional exposure, line carrying, relationship building, and behavioral logic.",
            "5. LanguageRules focuses on extraction: sentence length, spoken/written tendency, rhetorical density, interpretive impulse, abstract expression proportion, and language sharpness.",
            "6. Key points extracted from rhythmRules: paragraph density, speed and slow switching, white space, sense of pressure, arrangement of explosive points, and recycling methods.",
            "7. Rules must be specific and enforceable, and empty words such as \u201Cincreasing appeal\u201D, \u201Cmore immersive\u201D and \u201Cpaying attention to the rhythm\u201D are prohibited.",
            "",
            "Quality requirements:",
            "1. The output must look like a writing asset that can be saved immediately to the system, rather than a vague suggestion.",
            "2. Each field must be consistent, and the description, analysisMarkdown and rule layers cannot fight with each other.",
            "3. If the input is very short, make a \"small and stable\" starting version instead of generating a large and imaginary complex system out of thin air.",
            "4. If the input involves advanced feelings such as realistic thinking, philosophical dialogue, restrained expression, etc., it should also be translated into written rules that ordinary users can directly follow, rather than abstract evaluation.",
        ].join("\n")),
        new HumanMessage([
            `Written name:${input.name?.trim() || "Not specified, please generate a suitable name"}`,
            `Suggested categories:${input.category?.trim() || "unspecified"}`,
            "",
            "User's description of how they want to write:",
            input.brief,
        ].join("\n")),
    ]
};
export const styleProfileMetadataPrompt: PromptAsset<StyleProfileMetadataPromptInput, z.infer<typeof styleProfileMetadataSchema>> = {
    id: "style.profile.metadata",
    version: "v2",
    taskType: "planner",
    mode: "structured",
    language: "ka",
    contextPolicy: {
        maxTokensBudget: 0,
    },
    outputSchema: styleProfileMetadataSchema,
    render: (input) => [
        new SystemMessage([
            "You are a novel writing method asset meta-information organizer.",
            "Your task is to complete the meta-information for easy retrieval and recommendation based on the refined core summary of writing.",
            "",
            "Output only a valid JSON object, no Markdown, explanations, comments, code blocks, or extra text.",
            "Output fields must and can only include:",
            "category, tags, applicableGenres。",
            "",
            "Global hard rules:",
            "1. All field values must be in natural Georgian.",
            "2. It can only be summarized based on the given writing summary and cannot be diverged into tags that have no basis in the summary.",
            "3. Category must be stable, short, and reusable. Do not write long sentences.",
            "4. tags Only retain short and distinctive tags and avoid empty adjectives; usually 3-8 are returned.",
            "5. applicableGenres only retains the themes that are truly suitable for migration; usually 2-6 are returned, do not overwhelm them.",
            "6. If a suggested classification is given and it does not conflict with the abstract, the suggested classification will take precedence.",
            "7. It\u2019s better to be precise and precise than to pile up meaningless labels.",
        ].join("\n")),
        new HumanMessage([
            `Written name:${input.name}`,
            `Source:${input.sourceType}`,
            `Suggested categories:${input.preferredCategory?.trim() || "unspecified"}`,
            "",
            "Core summary of writing method:",
            input.styleDigest,
        ].join("\n")),
    ]
};
export const styleProfileAntiAiSelectionPrompt: PromptAsset<StyleProfileAntiAiSelectionPromptInput, z.infer<typeof styleProfileAntiAiSelectionSchema>> = {
    id: "style.profile.select_anti_ai",
    version: "v2",
    taskType: "planner",
    mode: "structured",
    language: "ka",
    contextPolicy: {
        maxTokensBudget: 0,
    },
    outputSchema: styleProfileAntiAiSelectionSchema,
    render: (input) => [
        new SystemMessage([
            "You are the fine orchestrator of anti-AI rules for novel writing assets.",
            "Your task is to select only the anti-AI rule keys that are truly suitable for the current writing method from the given legal rule directory.",
            "",
            "Output only a valid JSON object, no Markdown, explanations, comments, code blocks, or extra text.",
            "Output fields must and can only include:",
            "antiAiRuleKeys。",
            "",
            "Global hard rules:",
            "1. You can only select from keys that have appeared in the input directory. Creating new keys is strictly prohibited.",
            "2. Only select a rule if it can really help maintain the current writing style and suppress the corresponding risks.",
            "3. If there is no real matching rule in the directory, an empty array is returned.",
            `4. Return at most ${input.maxRuleCount ?? 4} key.`,
            "5. Prioritize rules that directly correspond to high-risk points and common overturning points in the current writing method. Do not select randomly just to make up for the quantity.",
            "6. Don\u2019t mistake \u201Cuniversal sense of security\u201D for \u201Cstrong correlation\u201D; it\u2019s better not to choose weak correlation rules.",
        ].join("\n")),
        new HumanMessage([
            `Written name:${input.name}`,
            `Writing summary:${input.summary?.trim() || "Not provided"}`,
            "",
            "Core summary of writing method:",
            input.styleDigest,
            "",
            "Risk summary:",
            input.riskDigest,
            "",
            "Legal rules directory:",
            input.catalogText,
        ].join("\n")),
    ]
};
export const styleProfileSanitizeForGenerationPrompt: PromptAsset<StyleProfileSanitizeForGenerationPromptInput, z.infer<typeof styleProfileSanitizeForGenerationSchema>> = {
    id: "style.profile.sanitize_for_generation",
    version: "v2",
    taskType: "planner",
    mode: "structured",
    language: "ka",
    contextPolicy: {
        maxTokensBudget: 0,
    },
    outputSchema: styleProfileSanitizeForGenerationSchema,
    render: (input) => [
        new SystemMessage([
            "You are a safe purifier of novel writing assets.",
            "Your task is to convert the writing profile into abstract writing guidance that can be used for generation, and to identify the entities of the source work that are prohibited from disclosure.",
            "Output only strict JSON, no Markdown, paraphrases or extra text.",
            "",
            "Output fields can only contain: writingGuidance, forbiddenEntities, sourceRiskSummary.",
            "",
            "Rules:",
            "1. WritingGuidance can only retain transferable writing dimensions, such as narrative rhythm, information density, dialogue tension, sentence organization, and blank space.",
            "2. forbiddenEntities must list character names, place names, proper titles, organization names, iconic memes and identifiable combinations of words from the source work.",
            "3. Any words in forbiddenEntities are strictly prohibited in writingGuidance.",
            "4. Do not retell the plot, set nouns, character relationships or famous scenes of the source work.",
            "5. If it is impossible to determine whether a specific noun is transferable, put forbiddenEntities first.",
        ].join("\n")),
        new HumanMessage([
            `Writing profile:${input.profileName}`,
            "",
            "Current writing contract:",
            input.styleContractText,
            "",
            "Source material summary:",
            input.sourceDigest,
        ].join("\n")),
    ]
};
export const antiAiRuleAiDraftPrompt: PromptAsset<AntiAiRuleAiDraftPromptInput, z.infer<typeof antiAiRuleAiDraftSchema>> = {
    id: "style.anti_ai_rule.draft",
    version: "v2",
    taskType: "planner",
    mode: "structured",
    language: "ka",
    contextPolicy: {
        maxTokensBudget: 0,
    },
    outputSchema: antiAiRuleAiDraftSchema,
    render: (input) => [
        new SystemMessage([
            "You are the anti-AI rule editing assistant in a novel writing product.",
            "Your task is to organize the user's natural language needs into an executable, editable, and detectable draft anti-AI rule.",
            "",
            "Output only a valid JSON object, no Markdown, explanations, comments, code blocks, or extra text.",
            "Output fields must and can only include: draft, rationale, safetyNotes.",
            "draft must and can only contain: key, name, type, severity, description, detectPatterns, promptInstruction, rewriteSuggestion.",
            "",
            "Rule type meaning:",
            "1. forbidden: explicitly forbidden AI flavor, template traces, or expressions not suitable for text generation.",
            "2. Risk: Common risks that need to be reminded to avoid the model, but are allowed to appear naturally in specific contexts.",
            "3. encourage: encourage alternative expressions or positive writing.",
            "",
            "Build requirements:",
            "1. All text fields must use natural Georgian, and keys must use English lowercase, numbers, and underlines.",
            "2. Rules must be specific and enforceable, and do not write empty requirements such as \u201Cenhance the sense of realism\u201D or \u201Cavoid the sense of AI\u201D.",
            "3. detectPatterns only put a small number of high-value phrases, usually 3-8; don\u2019t pile up synonyms.",
            "4. promptInstruction should be able to directly enter the text to generate constraints and use imperative expressions.",
            "5. rewriteSuggestion To give how to change the hit, don't just repeat the problem name.",
            "6. Don\u2019t generate rules that require the model to copy a specific work, author, character, setting, or iconic sentence.",
            "7. If the user's requirements are too broad, condense them into one rule rather than making multiple rules at once.",
            "",
            input.mode === "improve"
                ? [
                    "Current mode: Optimize existing rules.",
                    "You must make the current rules clearer and more enforceable.",
                    "Unless the user explicitly requests to change the rule ID, the key should be kept as original as possible.",
                    "Do not change the enabled state, global default state, or auto-override switches; these switches are handled by the system.",
                ].join("\n")
                : [
                    "Current mode: New rule.",
                    "You need to generate a new draft rule based on the user description.",
                    "Don't assume that this rule will go into global default, and don't decide to automatically override the switch.",
                ].join("\n"),
            "",
            "rationale In one sentence, explain why the rules are organized the way they are.",
            "safetyNotes uses 0-3 items to explain the risks of use, such as suitable for writing binding, not recommended for global default, and contexts that are easy to cause accidental injuries.",
        ].join("\n")),
        new HumanMessage([
            `Mode:${input.mode}`,
            "",
            input.currentRuleText
                ? [
                    "Current rules:",
                    input.currentRuleText,
                    "",
                ].join("\n")
                : "",
            "User needs:",
            input.instruction,
        ].filter(Boolean).join("\n")),
    ]
};

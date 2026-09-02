import type { PromptContextBlock } from "../../core/promptTypes";
function toOptionalText(value: string | null | undefined): string | null {
    const normalized = value?.trim() ?? "";
    return normalized || null;
}
function estimateTokens(content: string): number {
    return Math.max(1, Math.ceil(content.length / 2));
}
function createBlock(input: {
    id: string;
    group: string;
    priority: number;
    content: string | null | undefined;
    required?: boolean;
}): PromptContextBlock | null {
    const content = toOptionalText(input.content);
    if (!content) {
        return null;
    }
    return {
        id: input.id,
        group: input.group,
        priority: input.priority,
        required: input.required ?? false,
        estimatedTokens: estimateTokens(content),
        content,
    };
}
function joinLines(lines: Array<string | null | undefined>): string | null {
    const normalized = lines
        .map((line) => toOptionalText(line))
        .filter((line): line is string => Boolean(line));
    return normalized.length > 0 ? normalized.join("\n") : null;
}
function stringifyJsonLike(value: string | null | undefined, fallback: string): string {
    return toOptionalText(value) ?? fallback;
}
export interface CharacterCastContextBlocksInput {
    projectTitle: string;
    storyInput: string;
    genreName?: string | null;
    storyModeBlock?: string | null;
    styleTone?: string | null;
    narrativePov?: string | null;
    pacePreference?: string | null;
    emotionIntensity?: string | null;
    corePromise?: string | null;
    coreSetting?: string | null;
    characterArcs?: string | null;
    worldRules?: string | null;
    worldStage?: string | null;
    worldFocusHints?: {
        preferFaction?: string | null;
        forceCompliance?: boolean;
    } | null;
    storyDecomposition?: string | null;
    constraintEngine?: string | null;
    bookContract?: {
        readingPromise: string;
        protagonistFantasy: string;
        coreSellingPoint: string;
        chapter3Payoff: string;
        chapter10Payoff: string;
        chapter30Payoff: string;
        escalationLadder: string;
        relationshipMainline: string;
    } | null;
    existingCharacterNames?: string[];
}
function formatWorldFocusHints(input: {
    preferFaction?: string | null;
    forceCompliance?: boolean;
} | null | undefined): string | null {
    const preferFaction = toOptionalText(input?.preferFaction);
    const lines = [
        preferFaction ? `Prioritize from "${preferFaction}"Design roles in relevant identities, interest chains, friend-enemy relationships, or sources of pressure.` : null,
        input?.forceCompliance
            ? "World rules compliance checks must be carried out: character identity, ability source, camp affiliation, location and taboo combinations cannot cross the boundaries of this book's world." : null,
    ].filter((line): line is string => Boolean(line));
    return lines.length > 0 ? lines.join("\n") : null;
}
export function buildCharacterCastContextBlocks(input: CharacterCastContextBlocksInput): PromptContextBlock[] {
    const blocks = [
        createBlock({
            id: "character_cast_story_input",
            group: "idea_seed",
            priority: 100,
            required: true,
            content: joinLines([
                "\u3010Story input\u3011",
                input.storyInput,
            ]),
        }),
        createBlock({
            id: "character_cast_project_context",
            group: "project_context",
            priority: 95,
            content: joinLines([
                "\u3010Project context\u3011",
                `Project title:${input.projectTitle}`,
                `Subject:${toOptionalText(input.genreName) ?? "unspecified"}`,
                input.storyModeBlock ? `Story mode:
${input.storyModeBlock}` : "Story mode: none",
                `The tone of the writing style:${toOptionalText(input.styleTone) ?? "unspecified"}`,
                `Narrative perspective:${toOptionalText(input.narrativePov) ?? "unspecified"}`,
                `Rhythm preference:${toOptionalText(input.pacePreference) ?? "unspecified"}`,
                `Emotional intensity:${toOptionalText(input.emotionIntensity) ?? "unspecified"}`,
            ]),
        }),
        createBlock({
            id: "character_cast_book_contract",
            group: "book_contract",
            priority: 92,
            content: input.bookContract ? joinLines([
                "[Book Contract Constraints]",
                `Read the pledge:${input.bookContract.readingPromise}`,
                `Protagonist Fantasy:${input.bookContract.protagonistFantasy}`,
                `Core selling points:${input.bookContract.coreSellingPoint}`,
                `Chapter 3 Cashing out:${input.bookContract.chapter3Payoff}`,
                `Chapter 10 Cashing out:${input.bookContract.chapter10Payoff}`,
                `Chapter 30 Cashing out:${input.bookContract.chapter30Payoff}`,
                `Upgrade ladder:${input.bookContract.escalationLadder}`,
                `Main line of relationship:${input.bookContract.relationshipMainline}`,
            ]) : null,
        }),
        createBlock({
            id: "character_cast_macro_constraints",
            group: "macro_constraints",
            priority: 90,
            content: joinLines([
                "[Story Macro Constraints]",
                `Core Commitments:${toOptionalText(input.corePromise) ?? "None yet"}`,
                `Core settings:${toOptionalText(input.coreSetting) ?? "None yet"}`,
                `Character Arc Tips:${toOptionalText(input.characterArcs) ?? "None yet"}`,
                `World rules:${toOptionalText(input.worldRules) ?? "None yet"}`,
                `Macroscopic breakdown:${stringifyJsonLike(input.storyDecomposition, "None yet")}`,
                `Constraint engine:${stringifyJsonLike(input.constraintEngine, "None yet")}`,
            ]),
        }),
        createBlock({
            id: "character_cast_world_stage",
            group: "world_stage",
            priority: 88,
            content: joinLines([
                "\u3010World Stage\u3011",
                toOptionalText(input.worldStage) ?? "The world of this book has not been sorted out. Please give priority to inferring the character stage from story input and book-level constraints.",
                formatWorldFocusHints(input.worldFocusHints),
            ]),
        }),
        createBlock({
            id: "character_cast_protagonist_anchor",
            group: "protagonist_anchor",
            priority: 99,
            required: true,
            content: joinLines([
                "[Protagonist Anchor Point]",
                "The protagonist must be a specific character who can directly enter the main text, and is not allowed to be written as a functional position or abstract slot.",
                "Please directly understand the protagonist's identity, era stage, institutional pressure and relationship position based on the story input, project context, Book Contract and macro constraints.",
                "If there are theme selling points, reader experience, identity disguise, or final truth in the input, please use the overall semantics to determine how they fall on the specific characters. Do not treat the theme words as names or character identities.",
            ]),
        }),
        createBlock({
            id: "character_cast_hidden_identity",
            group: "hidden_identity_anchor",
            priority: 97,
            content: joinLines([
                "\u3010Hidden Identity/Truth Anchor\u3011",
                "If the story contains identity reversal, disguise, destiny truth, or historical real name, use AI semantic understanding to determine which specific character should carry this line.",
                "You cannot rely on keywords, regular rules or fixed text fragments to extract identity clues; when it is impossible to make a stable judgment, give priority to generating available role candidates, and write uncertainty into role responsibilities or recommendation reasons.",
            ]),
        }),
        createBlock({
            id: "character_cast_forbidden_names",
            group: "forbidden_names",
            priority: 80,
            content: joinLines([
                "\u3010Name boundary\u3011",
                `Existing character names that are prohibited from reuse:${(input.existingCharacterNames ?? []).filter(Boolean).join("、") || "None"}`,
            ]),
        }),
        createBlock({
            id: "character_cast_output_policy",
            group: "output_policy",
            priority: 100,
            required: true,
            content: joinLines([
                "\u3010Output Strategy\u3011",
                "name can only be written as a person's name that can be used in the play, palace title, camp title, Jianghu title or a stable title established in the historical context.",
                "It is forbidden to write abstract responsibility names such as \"mystery catalyst, knowledge mentor position, external threat position, emotional position, relationship variable, functional position\" into the name.",
                "storyFunction is responsible for writing narrative responsibilities, and name is not responsible for carrying function descriptions.",
                "Each character must output gender; if in doubt, fill in unknown and cannot be omitted.",
                "If it is a historical/travel/palace theme, the lineup must reflect the identity of the era, institutional oppression, power chains and identity contrasts, and cannot degenerate into a general functional network.",
            ]),
        }),
    ];
    return blocks.filter((block): block is PromptContextBlock => Boolean(block));
}
export interface CharacterCastSupplementalContextBlocksInput {
    projectTitle: string;
    modeLabel: string;
    targetRoleLabel: string;
    requestedCountText: string;
    userPrompt?: string | null;
    storyInput?: string | null;
    genreName?: string | null;
    storyModeBlock?: string | null;
    styleTone?: string | null;
    narrativePov?: string | null;
    pacePreference?: string | null;
    emotionIntensity?: string | null;
    corePromise?: string | null;
    coreSetting?: string | null;
    characterArcs?: string | null;
    worldRules?: string | null;
    worldStage?: string | null;
    worldFocusHints?: {
        preferFaction?: string | null;
        forceCompliance?: boolean;
    } | null;
    storyDecomposition?: string | null;
    constraintEngine?: string | null;
    existingCharactersText?: string | null;
    anchorCharactersText?: string | null;
    relationsText?: string | null;
    forbiddenNames?: string[];
}
export function buildSupplementalCharacterContextBlocks(input: CharacterCastSupplementalContextBlocksInput): PromptContextBlock[] {
    const blocks = [
        createBlock({
            id: "supplemental_character_request",
            group: "idea_seed",
            priority: 100,
            required: true,
            content: joinLines([
                "\u3010Request for replacement\u3011",
                `Project title:${input.projectTitle}`,
                `Fill-in mode:${input.modeLabel}`,
                `Target role functions:${input.targetRoleLabel}`,
                input.requestedCountText,
                `Additional instructions for users:${toOptionalText(input.userPrompt) ?? "None"}`,
            ]),
        }),
        createBlock({
            id: "supplemental_character_story_context",
            group: "project_context",
            priority: 90,
            content: joinLines([
                "\u3010Story context\u3011",
                `Story input:${toOptionalText(input.storyInput) ?? "There is no clear story input yet, please make inferences based on existing characters and the world stage. "}`,
                `Subject:${toOptionalText(input.genreName) ?? "unspecified"}`,
                input.storyModeBlock ? `Story mode:
${input.storyModeBlock}` : "Story mode: none",
                `The tone of the writing style:${toOptionalText(input.styleTone) ?? "unspecified"}`,
                `Narrative perspective:${toOptionalText(input.narrativePov) ?? "unspecified"}`,
                `Rhythm preference:${toOptionalText(input.pacePreference) ?? "unspecified"}`,
                `Emotional intensity:${toOptionalText(input.emotionIntensity) ?? "unspecified"}`,
                `Core Commitments:${toOptionalText(input.corePromise) ?? "None yet"}`,
                `Core settings:${toOptionalText(input.coreSetting) ?? "None yet"}`,
                `Character Arc Tips:${toOptionalText(input.characterArcs) ?? "None yet"}`,
                `World rules:${toOptionalText(input.worldRules) ?? "None yet"}`,
            ]),
        }),
        createBlock({
            id: "supplemental_character_world_stage",
            group: "world_stage",
            priority: 85,
            content: joinLines([
                "[World and macro constraints]",
                toOptionalText(input.worldStage) ?? "The world of this book is not organized.",
                formatWorldFocusHints(input.worldFocusHints),
                `Macroscopic breakdown:${stringifyJsonLike(input.storyDecomposition, "None yet")}`,
                `Constraint engine:${stringifyJsonLike(input.constraintEngine, "None yet")}`,
            ]),
        }),
        createBlock({
            id: "supplemental_character_existing_cast",
            group: "existing_cast",
            priority: 95,
            content: joinLines([
                "\u3010Existing role\u3011",
                toOptionalText(input.existingCharactersText) ?? "There are currently no roles created.",
                "\u3010Anchor role\u3011",
                toOptionalText(input.anchorCharactersText) ?? "There is currently no anchor role explicitly selected.",
            ]),
        }),
        createBlock({
            id: "supplemental_character_relations",
            group: "relation_context",
            priority: 88,
            content: joinLines([
                "[Known structured relationship]",
                toOptionalText(input.relationsText) ?? "None yet.",
            ]),
        }),
        createBlock({
            id: "supplemental_character_forbidden_names",
            group: "forbidden_names",
            priority: 80,
            content: joinLines([
                "\u3010Name boundary\u3011",
                `Character names that are prohibited from reuse:${(input.forbiddenNames ?? []).filter(Boolean).join("、") || "None"}`,
            ]),
        }),
    ];
    return blocks.filter((block): block is PromptContextBlock => Boolean(block));
}

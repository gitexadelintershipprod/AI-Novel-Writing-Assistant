import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { z } from "zod";
import type { PromptAsset } from "../../core/promptTypes";
import type { WorldGenerateInput, WorldTextField } from "../../../services/world/worldServiceShared";
import type { WorldGenerationBlueprint, WorldReferenceContext, WorldSkeletonGenerationOptions, } from "@ai-novel/shared/types/worldWizard";
const worldDraftFieldSchema = z.string().trim().min(1).optional().nullable();
export const worldDraftGenerationSchema = z.object({
    description: worldDraftFieldSchema,
    background: worldDraftFieldSchema,
    geography: worldDraftFieldSchema,
    cultures: worldDraftFieldSchema,
    magicSystem: worldDraftFieldSchema,
    politics: worldDraftFieldSchema,
    races: worldDraftFieldSchema,
    religions: worldDraftFieldSchema,
    technology: worldDraftFieldSchema,
    conflicts: worldDraftFieldSchema,
    history: worldDraftFieldSchema,
    economy: worldDraftFieldSchema,
    factions: worldDraftFieldSchema,
    overviewSummary: worldDraftFieldSchema,
}).strict();
export const worldRefineAlternativeSchema = z.object({
    title: z.string().trim().min(1),
    content: z.string().trim().min(1),
}).strict();
export const worldRefineAlternativeListSchema = z.array(worldRefineAlternativeSchema).min(1).max(3);
export interface WorldDraftGenerationPromptInput extends Pick<WorldGenerateInput, "name" | "description" | "worldType" | "complexity" | "dimensions"> {
}
export interface WorldDraftRefinePromptInput {
    worldName: string;
    attribute: WorldTextField;
    refinementLevel: "light" | "deep";
    currentValue: string;
}
export interface WorldDraftRefineAlternativesPromptInput extends WorldDraftRefinePromptInput {
    count: number;
}
const stringListSchema = z.array(z.string().trim().min(1)).default([]);
const worldSkeletonSchema = z.object({
    concept: z.object({
        name: z.string().trim().min(1),
        oneSentence: z.string().trim().min(1),
        readerImpression: z.string().trim().min(1),
        genrePromise: z.string().trim().min(1),
    }).strict(),
    structuredData: z.object({
        profile: z.object({
            summary: z.string().trim().min(1),
            identity: z.string().trim().min(1),
            tone: z.string().trim().min(1),
            themes: stringListSchema,
            coreConflict: z.string().trim().min(1),
        }).strict(),
        rules: z.object({
            summary: z.string().trim().min(1),
            axioms: z.array(z.object({
                id: z.string().trim().min(1),
                name: z.string().trim().min(1),
                summary: z.string().trim().min(1),
                cost: z.string().trim(),
                boundary: z.string().trim(),
                enforcement: z.string().trim(),
            }).strict()),
            taboo: stringListSchema,
            sharedConsequences: stringListSchema,
        }).strict(),
        factions: z.array(z.object({
            id: z.string().trim().min(1),
            name: z.string().trim().min(1),
            position: z.string().trim(),
            doctrine: z.string().trim(),
            goals: stringListSchema,
            methods: stringListSchema,
            representativeForceIds: stringListSchema,
        }).strict()),
        forces: z.array(z.object({
            id: z.string().trim().min(1),
            name: z.string().trim().min(1),
            type: z.string().trim(),
            factionId: z.string().trim().nullable().optional(),
            role: z.string().trim().nullable().optional(),
            resources: stringListSchema.optional(),
            controlledLocationIds: stringListSchema.optional(),
            summary: z.string().trim().min(1),
            baseOfPower: z.string().trim(),
            currentObjective: z.string().trim(),
            pressure: z.string().trim(),
            leader: z.string().trim().nullable().optional(),
            narrativeRole: z.string().trim(),
        }).strict()),
        locations: z.array(z.object({
            id: z.string().trim().min(1),
            name: z.string().trim().min(1),
            type: z.string().trim().nullable().optional(),
            region: z.string().trim().nullable().optional(),
            x: z.number().min(0).max(100).optional(),
            y: z.number().min(0).max(100).optional(),
            directionHint: z.enum(["north", "south", "east", "west", "center", "northeast", "northwest", "southeast", "southwest"]).optional(),
            terrain: z.string().trim(),
            summary: z.string().trim().min(1),
            narrativeFunction: z.string().trim(),
            risk: z.string().trim(),
            riskLevel: z.number().int().min(1).max(5).optional(),
            storyRelevance: z.string().trim().optional(),
            entryConstraint: z.string().trim(),
            exitCost: z.string().trim(),
            controllingForceIds: stringListSchema,
        }).strict()),
        relations: z.object({
            forceRelations: z.array(z.object({
                id: z.string().trim().min(1),
                sourceForceId: z.string().trim().min(1),
                targetForceId: z.string().trim().min(1),
                relation: z.string().trim().min(1),
                tension: z.string().trim(),
                detail: z.string().trim(),
            }).strict()),
            locationControls: z.array(z.object({
                id: z.string().trim().min(1),
                forceId: z.string().trim().min(1),
                locationId: z.string().trim().min(1),
                relation: z.string().trim().min(1),
                detail: z.string().trim(),
            }).strict()),
            locationConnections: z.array(z.object({
                id: z.string().trim().min(1),
                sourceLocationId: z.string().trim().min(1),
                targetLocationId: z.string().trim().min(1),
                connectionType: z.string().trim().min(1),
                distanceHint: z.string().trim(),
                narrativeUse: z.string().trim(),
            }).strict()).optional(),
        }).strict(),
        metadata: z.object({
            schemaVersion: z.number().optional(),
            seededFrom: z.string().nullable().optional(),
            lastBackfilledAt: z.string().nullable().optional(),
            lastGeneratedAt: z.string().nullable().optional(),
            lastSectionGenerated: z.string().nullable().optional(),
        }).passthrough(),
    }).strict(),
    bindingSupport: z.object({
        recommendedEntryPoints: stringListSchema,
        highPressureForces: stringListSchema,
        suggestedLocationClusters: z.array(z.object({
            id: z.string().trim().min(1),
            label: z.string().trim().min(1),
            locationIds: stringListSchema,
            reason: z.string().trim(),
        }).strict()),
        compatibleConflicts: stringListSchema,
        forbiddenCombinations: stringListSchema,
    }).strict().optional(),
    storyEntrySuggestions: z.array(z.object({
        title: z.string().trim().min(1),
        description: z.string().trim().min(1),
        recommendedLocationIds: stringListSchema,
        involvedForceIds: stringListSchema,
        firstConflict: z.string().trim().min(1),
    }).strict()),
    assessment: z.object({
        completenessScore: z.number().min(0).max(100),
        readyForNovelUse: z.boolean(),
        missingParts: z.array(z.object({
            area: z.enum(["rules", "forces", "locations", "relations", "storyEntry"]),
            issue: z.string().trim().min(1),
            suggestedAction: z.string().trim().min(1),
        }).strict()),
        recommendedNextActions: stringListSchema,
    }).strict(),
}).strict();
export interface WorldSkeletonGenerationPromptInput {
    idea: string;
    worldType?: string;
    template?: string;
    referenceContext?: WorldReferenceContext | null;
    blueprint?: WorldGenerationBlueprint | null;
    options: WorldSkeletonGenerationOptions;
}
function buildWorldDraftRequirements(input: WorldDraftGenerationPromptInput): string[] {
    const requirements: string[] = [
        "description: Use 2-4 sentences to summarize the logic of the world\u2019s operation + reading experience. It must reflect \u201Chow the world works + what the reader\u2019s experience is\u201D. Empty words are prohibited.",
        "Background: Clarify the starting point of the world, the era stage and the current starting situation, which must be able to support the start of the plot.",
        "conflicts: Refining structural conflicts (long-standing conflicts) at the world level, not a single event",
    ];
    if (input.dimensions.geography) {
        requirements.push("geography: terrain structure, regional distribution and key locations must reflect \"how space affects conflict and action\"");
    }
    if (input.dimensions.culture) {
        requirements.push("Cultures: social style and values, must be able to explain character behavior and choice logic");
        requirements.push("Politics: power structure and governance methods must reflect the relationship between control and confrontation");
        requirements.push("races: ethnic groups or class divisions, must reflect differences and resource distribution");
        requirements.push("Religions: Beliefs or spiritual orders that must embody mechanisms that constrain or influence behavior");
        requirements.push("factions: the main forces and camp structures, which must be used to build conflicts and alliances");
    }
    if (input.dimensions.magicSystem) {
        requirements.push("magicSystem: the source of power, usage methods, limitations and costs, must reflect the \"cost and boundaries of obtaining abilities\"");
    }
    if (input.dimensions.technology) {
        requirements.push("technology: technical level and key technology, must explain how it changes the social structure");
        requirements.push("Economy: The way resources and wealth flow, must reflect survival pressure or competition mechanism");
    }
    if (input.dimensions.history) {
        requirements.push("history: key historical nodes and turning points, which must explain why the current world has become what it is now");
    }
    return requirements;
}
function formatBlueprint(input: WorldSkeletonGenerationPromptInput): string {
    const blueprint = input.blueprint;
    if (!blueprint) {
        return "None";
    }
    const propertyLines = blueprint.propertySelections.map((item) => [
        item.name,
        item.choiceLabel && `Select:${item.choiceLabel}`,
        item.description,
        item.detail && `Supplement:${item.detail}`,
    ].filter(Boolean).join(" | "));
    return [
        blueprint.classicElements.length > 0 ? `Classic elements:${blueprint.classicElements.join("、")}` : "",
        propertyLines.length > 0 ? `User selected attributes:
${propertyLines.map((item, index) => `${index + 1}. ${item}`).join("\n")}` : "",
    ].filter(Boolean).join("\n") || "None";
}
function formatReferenceContext(input: WorldSkeletonGenerationPromptInput): string {
    const context = input.referenceContext;
    if (!context) {
        return "None";
    }
    return [
        `Reference method:${context.mode}`,
        context.preserveElements.length > 0 ? `Must be retained:${context.preserveElements.join("、")}` : "",
        context.allowedChanges.length > 0 ? `Modifications allowed:${context.allowedChanges.join("、")}` : "",
        context.forbiddenElements.length > 0 ? `Prohibited deviations from:${context.forbiddenElements.join("、")}` : "",
        context.anchors.length > 0
            ? `Reference anchor:
${context.anchors.map((item, index) => `${index + 1}. ${item.label}：${item.content}`).join("\n")}`
            : "",
    ].filter(Boolean).join("\n") || "None";
}
export const worldSkeletonGenerationPrompt: PromptAsset<WorldSkeletonGenerationPromptInput, z.infer<typeof worldSkeletonSchema>> = {
    id: "world.skeleton.generate",
    version: "v3",
    taskType: "planner",
    mode: "structured",
    language: "ka",
    contextPolicy: {
        maxTokensBudget: 0,
    },
    // World skeletons contain several cross-referenced collections. Retrying the
    // same large request after truncated JSON only adds latency without ensuring
    // that the provider will return a complete second response.
    repairPolicy: {
        maxAttempts: 0,
    },
    semanticRetryPolicy: {
        maxAttempts: 0,
    },
    outputSchema: worldSkeletonSchema,
    render: (input) => {
        const counts = input.options.counts;
        return [
            new SystemMessage([
                "You are a web novel world skeleton generator, serving novice authors who do not understand setting engineering.",
                "Your task is not to generate a form of fields, but to generate a structured world sample that can be used directly in novel creation.",
                "",
                "Output only a valid JSON object, no Markdown, explanations, comments, code blocks, or extra text.",
                "",
                "The output object must contain and can only contain: concept, structuredData, bindingSupport, storyEntrySuggestions, assessment.",
                "",
                "Hard constraints on output capacity:",
                "1. This is the skeleton of the world, not the text of the world setting. Complete the referenceable cards first, and then expand them layer by layer in the saved world manual.",
                "2. Short fields such as name, ID, type, and location should not exceed 16 words; description fields should not exceed 28 words, use phrases or short sentences, and do not write paragraphs.",
                "3. Each item in all string arrays must not exceed 12 words, and each array can have a maximum of 2 items; an empty array will be output when there is no necessary information.",
                "4. Do not explain the same rule, power or location repeatedly; when users choose a larger scale, they should still compress each entry rather than increase the length of the description.",
                "5. Except for JSON key names, ids, and coordinates, the total text size is limited to approximately 3,200 words.",
                "",
                "Global hard rules:",
                "1. All field values must be in natural Georgian.",
                "2. It must be generated strictly around the user's world intention, theme, template, reference constraints and user-selected attributes.",
                "3. Do not write the plot outline of the novel into the world setting; the world setting only provides rules, forces, locations, relationships, and book opening entrances.",
                "4. Do not output empty labels, such as \"power disputes\", \"complex society\" and \"many locations\". You must explain how it works, who controls it, and where conflicts occur.",
                "5. structuredData must be the main content source, and the old background/geography/facts fields do not appear in this output.",
                "6. Factions are abstract camps, lines or positions; forces are specific organizations, institutions, companies, secret groups, government departments or actors.",
                "7. Forces cannot be character lists, emotional relationship lines, temporary plot character collections, abstract social pressures, value labels, life phenomena, or pure location groups.",
                "8. If the subject is urban/reality/workplace/marriage, the forces should give priority to: company/department/leadership, landlord or intermediary, dating resource circle, family interest community, freelance job acceptance circle, community/property/school/hospital/institution and other actionable groups.",
                "9. Character relationships, exes, romantic partners, cheating partners, the protagonist\u2019s roommates, etc. should be placed in storyEntrySuggestions or narrative entry descriptions and should not be used as force.",
                "10. Each force must meet four conditions: have a stable name, have resources or powers, have a current goal, and be able to put pressure on characters or locations; otherwise, do not generate forces.",
                "11. Locations must have map drawability: each location must be given x/y coordinates from 0-100, directionHint, terrain, riskLevel, and controllingForceIds.",
                "12. relations.forceRelations must describe the interest relationship, control relationship, competition relationship or conflict relationship between specific forces. Do not write about one-way emotional influence such as \"the workplace affects the life circle\".",
                "13. relations.locationConnections must describe pathways, borders, contamination spreads, or movement paths between locations.",
                "14. storyEntrySuggestions must be directly used as the starting direction of the novel, and reference the generated location id and force id.",
                "",
                "Quantity hard constraints:",
                `1. Core rules rules.axioms must be exactly ${counts.rules} article.`,
                `2. Factions must be exactly right ${counts.factionGroups} .`,
                `3. The specific forces must be exactly ${counts.forces} .`,
                `4. Key locations must be exactly right ${counts.locations} .`,
                `5. force relations forceRelations at least ${Math.max(1, counts.conflicts)} article.`,
                `6. Story entry storyEntrySuggestions must be exactly ${counts.storyEntrySuggestions} .`,
                "",
                "Map field requirements:",
                "1. force.type uses concise Georgian type labels, such as: company, department, family community, community organization, community organization, intermediary agency, school, hospital, agency, secret organization, religious force, scientific and technological force, neutral force.",
                "2. force.role Write the narrative identity of the force in the map, such as suppressor, investigator, polluter, cover-up, and trader.",
                "3. Force.resources is written to compete for resources, do not leave it blank.",
                "4. location.type uses concise Georgian type labels, such as: continent, country, city, border, restricted area, ruins, base, and alien rift.",
                "5. location.directionHint can only use north/south/east/west/center/northeast/northwest/southeast/southwest.",
                "6. locationConnections.connectionType uses concise Georgian labels, such as roads, sea routes, borders, underground passages, transmission paths, or contamination paths.",
                "",
                "Completeness diagnostic requirements:",
                "1. CompletenessScore reflects whether it is possible to start writing a novel directly in the current world.",
                "2. readyForNovelUse is true only when the rules, forces, locations, relationships, and story entrances are clear enough.",
                "3. missingParts only lists real gaps; if there are no obvious gaps, an empty array is output.",
            ].join("\n")),
            new HumanMessage([
                `World intention:${input.idea}`,
                `World type:${input.worldType || "Customize"}`,
                `Template:${input.template || "Customize"}`,
                `Size defaults:${input.options.preset}`,
                "",
                "User selected blueprint:",
                formatBlueprint(input),
                "",
                "Reference constraints:",
                formatReferenceContext(input),
                "",
                "Please generate the complete world skeleton JSON.",
            ].join("\n")),
        ];
    },
    postValidate: (output, input) => {
        const counts = input.options.counts;
        if (output.structuredData.rules.axioms.length !== counts.rules) {
            throw new Error(`The number of core rules for the world skeleton generation result does not meet the requirements. Expected ${counts.rules} article.`);
        }
        if (output.structuredData.factions.length !== counts.factionGroups) {
            throw new Error(`The number of camps generated by the world skeleton does not meet the requirements. Expected ${counts.factionGroups} .`);
        }
        if (output.structuredData.forces.length !== counts.forces) {
            throw new Error(`The specific number of forces in the world skeleton generation result does not meet the requirements. It is expected that ${counts.forces} .`);
        }
        if (output.structuredData.locations.length !== counts.locations) {
            throw new Error(`The number of key locations in the world skeleton generation result does not meet the requirements. Expected ${counts.locations} .`);
        }
        if (output.storyEntrySuggestions.length !== counts.storyEntrySuggestions) {
            throw new Error(`The number of story entries in the world skeleton generation result does not meet the requirements. Expected ${counts.storyEntrySuggestions} .`);
        }
        const forceIds = new Set(output.structuredData.forces.map((item) => item.id));
        const locationIds = new Set(output.structuredData.locations.map((item) => item.id));
        const invalidRepresentativeForceId = output.structuredData.factions
            .flatMap((item) => item.representativeForceIds)
            .find((id) => !forceIds.has(id));
        if (invalidRepresentativeForceId) {
            throw new Error(`There is an unmatched camp representative force ID in the world skeleton generation result:${invalidRepresentativeForceId}。`);
        }
        const weakForce = output.structuredData.forces.find((item) => (item.resources ?? []).length === 0
            || !item.currentObjective.trim()
            || !item.pressure.trim()
            || (item.controlledLocationIds ?? []).length === 0);
        if (weakForce) {
            throw new Error(`The world skeleton generation results in weak forces that cannot be acted upon or cannot be pressured:${weakForce.name}。`);
        }
        const invalidForceRelation = output.structuredData.relations.forceRelations.find((item) => !forceIds.has(item.sourceForceId) || !forceIds.has(item.targetForceId));
        if (invalidForceRelation) {
            throw new Error("The world skeleton generation result has a force relationship that cannot match the force id.");
        }
        const invalidLocationConnection = (output.structuredData.relations.locationConnections ?? []).find((item) => !locationIds.has(item.sourceLocationId) || !locationIds.has(item.targetLocationId));
        if (invalidLocationConnection) {
            throw new Error("The world skeleton generation results in a place connection that cannot match the place id.");
        }
        return output;
    }
};
export const worldDraftGenerationPrompt: PromptAsset<WorldDraftGenerationPromptInput, z.infer<typeof worldDraftGenerationSchema>> = {
    id: "world.draft.generate",
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
    outputSchema: worldDraftGenerationSchema,
    render: (input) => {
        const requirements = buildWorldDraftRequirements(input);
        return [
            new SystemMessage([
                "You are a novel worldview generation assistant, serving novice authors who do not understand world building.",
                "Your task is to organize the world inspiration given by the user into a \"World Draft JSON\" that can directly enter the subsequent refinement stage.",
                "This is not a prose-style introduction to the world, nor is it a vague concept display, but a setting draft that can directly support the creation of the novel.",
                "",
                "Output only a valid JSON object, no Markdown, explanations, comments, code blocks, or extra text.",
                "",
                "The only fields allowed are:",
                "description, background, geography, cultures, magicSystem, politics, races, religions, technology, conflicts, history, economy, factions, overviewSummary。",
                "No new fields are allowed, no field names are allowed to be changed, and no content outside the fields is allowed to be output.",
                "",
                "Global hard rules:",
                "1. All field values must be in natural Georgian.",
                "2. It can only be generated based on the world name, world type, complexity and demand description given by the user. It is not allowed to create a new world without input.",
                "3. The fields required to be refined this time must be completed first.",
                "4. Don\u2019t be lyrical, don\u2019t write in an encyclopedic tone, and don\u2019t write empty words such as \u201Cvery complex\u201D, \u201Cvery grand\u201D and \u201Cfull of tension\u201D.",
                "5. In each field, try to answer \"how the world works, how it affects the characters, and how it supports the plot.\"",
                "6. If the information in a certain field is insufficient, it can be omitted, but do not omit the fields that are clearly required to be completed first because of being conservative.",
                "7. Each field must be self-consistent, and world rules, history, power, and culture must not conflict with each other.",
                "",
                "Generating principles:",
                "1. The world draft must serve the creation of the novel, rather than just provide settings for viewing.",
                "2. Prioritize the generation of hard settings that will affect plot advancement, character selection, resource competition, order operation, and sources of conflict.",
                "3. Don\u2019t write specific plot segments, characters\u2019 personal motivations or emotional advancement as world settings.",
                "4. If it is a high-complexity world, you can increase the level appropriately; if it is a low-complexity world, you should give priority to being clear, stable, and easy to write, rather than forcefully expanding it.",
                "",
                "Field requirements:",
                "1. Description: Use 2-4 sentences to summarize the core working methods and reading experience of the world. It must reflect \"how the world works + what readers will feel.\"",
                "2. Background: Explain the starting point of the world, the current era, and the starting situation. It must be able to support where the story begins.",
                "3. Conflicts: Refining the most important structural conflicts in the current world, they must be long-term conflicts, not a single incident.",
                "4. Geography: If generated, it must reflect how terrain structure, regional distribution and key locations affect conflict, flow and action.",
                "5. Cultures: If generated, it must reflect how social styles, customs and values shape behavior.",
                "6. Politics: If generated, it must reflect how the power structure, governance methods and main positions create control and confrontation.",
                "7. Races: If generated, it must reflect the main ethnic groups, circles or identity differentiation, do not just list the names.",
                "8. Religions: If generated, it must embody the actual constraints of religion, belief or alternative spiritual order on society.",
                "9. magicSystem: If generated, the source of power, usage, restrictions and costs must be explained, especially the boundaries.",
                "10. Technology: If generated, the technical level, key technologies and how they change the social structure must be explained.",
                "11. Economy: If generated, it must explain how resources, industries or wealth flow, and reflect the survival pressure or competition mechanism.",
                "12. History: If generated, it must explain the key historical nodes and the causes of the current era, and explain why the world has become what it is now.",
                "13. Factions: If generated, it must reflect the main forces, organizations or camp patterns, and how they participate in world conflicts.",
                "14. overviewSummary: If generated, it should be used as a compressed summary of the entire world draft to facilitate quick reading by subsequent systems, but it cannot be mechanically repeated with description.",
                "",
                "Quality requirements:",
                "1. The output should be like a world draft that can go directly to the next step of refinement, rather than an inspiration essay.",
                "2. Each field should be as specific as possible to write a story, rather than remaining in abstract concepts.",
                "3. Prioritize retaining the truly important points of disagreement, stressors, and rule boundaries, and don\u2019t get distracted by bits and pieces.",
            ].join("\n")),
            new HumanMessage([
                `World name:${input.name}`,
                `World type:${input.worldType}`,
                `Complexity:${input.complexity}`,
                "",
                "User needs:",
                input.description,
                "",
                "Fields that must be completed first this time:",
                ...requirements.map((item, index) => `${index + 1}. ${item}`),
            ].join("\n")),
        ];
    },
    postValidate: (output, input) => {
        const requiredFields = ["description", "background", "conflicts"] as const;
        for (const field of requiredFields) {
            if (!output[field]?.trim()) {
                throw new Error(`World draft generation results are missing ${field}。`);
            }
        }
        if (input.dimensions.geography && !output.geography?.trim()) {
            throw new Error("World draft generation results are missing geography.");
        }
        if (input.dimensions.magicSystem && !output.magicSystem?.trim()) {
            throw new Error("World draft build results are missing magicSystem.");
        }
        if (input.dimensions.technology && !output.technology?.trim()) {
            throw new Error("World draft generation results are missing technology.");
        }
        if (input.dimensions.history && !output.history?.trim()) {
            throw new Error("The world draft generation result is missing history.");
        }
        if (input.dimensions.culture) {
            const cultureFields = [
                output.cultures,
                output.politics,
                output.races,
                output.religions,
                output.factions,
            ].filter((value) => value?.trim());
            if (cultureFields.length < 3) {
                throw new Error("World draft generation results lack sufficient culture related fields.");
            }
        }
        return output;
    }
};
export const worldDraftRefinePrompt: PromptAsset<WorldDraftRefinePromptInput, string, string> = {
    id: "world.draft.refine",
    version: "v2",
    taskType: "repair",
    mode: "text",
    language: "ka",
    contextPolicy: {
        maxTokensBudget: 0,
    },
    render: (input) => [
        new SystemMessage([
            "You are the worldview polishing editor.",
            "Your task is to rewrite and enhance specific world fields to make them clearer, more specific, and more suitable for novel creation.",
            "",
            "Only output the final rewritten text, not Markdown, explanations, comments, modification notes, code blocks, or additional text.",
            "",
            "Global hard rules:",
            "1. Only the contents of the target field can be rewritten, and do not extend to other fields.",
            "2. The core facts, causal relationships, structural logic and known constraints of the world must be kept unchanged.",
            "3. New settings, new rules, new historical conclusions or new power relationships that conflict with the original content may not be introduced.",
            "4. If the original content information is insufficient, low-risk enhancements can be made, but they must fit the current field responsibilities and cannot take the opportunity to create a new set of settings.",
            "",
            input.refinementLevel === "deep"
                ? [
                    "Current enhancement strength: deep.",
                    "Requirements:",
                    "1. Significantly improve information density, logical association and writing usability without changing the core settings.",
                    "2. Prioritize filling in the key gaps of \"how this setting works, how to constrain the characters, and how to support the conflict.\"",
                    "3. Larger rewriting is allowed, but the core semantics and direction of the original field must be retained.",
                ].join("\n")
                : [
                    "Current enhancement strength: light (light enhancement).",
                    "Requirements:",
                    "1. Focus on expression optimization, detail enhancement and clarity.",
                    "2. Try to maintain the original content structure and main expression direction, and do not make unnecessary major changes.",
                    "3. Prioritize correcting blunt, vague, vague and repetitive questions.",
                ].join("\n"),
            "",
            "Rewrite goal:",
            "1. Make the text more like a finished draft that can go directly into the world setting draft, rather than a jot or inspired sentence.",
            "2. Make the content more specific and avoid empty phrases such as \u201Cthe world is complex\u201D, \u201Cconflicts abound\u201D and \u201Ccultures are diverse\u201D.",
            "3. Make this field better serve novel creation and reflect how it affects plot, characters, survival, order or conflict.",
            "4. If the target field naturally requires structural relationships, causal or functional relationships should be added instead of isolated descriptions.",
            "",
            "Express a request:",
            "1. The entire text is in natural Georgian.",
            "2. Only output a piece of text that can directly replace the current field.",
            "3. Do not write lists, do not break points, and do not add titles.",
            "4. The language should be stable, accurate and clear, and avoid encyclopedia tone, manual tone and empty lyricism.",
            "",
            "Self-test requirements:",
            "1. Whether it is still consistent with the core facts of the original field.",
            "2. Whether to enhance the writability instead of just changing synonyms.",
            "3. Whether there is no cross-border generation of other field contents.",
            "4. Whether to output only the rewritten text.",
        ].join("\n")),
        new HumanMessage([
            `World name:${input.worldName}`,
            `Target field:${input.attribute}`,
            "",
            "Current content:",
            input.currentValue,
            "",
            "Please directly output the enhanced and rewritten version of this field.",
        ].join("\n")),
    ]
};
export const worldDraftRefineAlternativesPrompt: PromptAsset<WorldDraftRefineAlternativesPromptInput, z.infer<typeof worldRefineAlternativeListSchema>> = {
    id: "world.draft.refine_alternatives",
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
    outputSchema: worldRefineAlternativeListSchema,
    render: (input) => [
        new SystemMessage([
            "You are the worldview field rewrite candidate generator.",
            "Your task is: based on the user's current field content, generate multiple candidate versions that can directly replace the original text for the user to choose from.",
            "",
            "Hard requirements:",
            "1. Output only JSON arrays, no explanations, Markdown, code blocks, or any extra text.",
            "2. The array element structure is fixed as: {\"title\":\"...\",\"content\":\"...\"}.",
            "3. The specified number of candidates must be output strictly.",
            "4. Each content must be a complete and usable rewrite of the field, not an outline, comments, notes or semi-finished product.",
            "5. Different candidates must reflect clear and perceptible directional differences, and cannot just be word order adjustments, synonymous substitutions or slight polishing.",
            "6. All candidates must retain the core facts, existing settings, causal relationships, and key constraints of the original content. Important facts that will change the direction of the world setting must not be added out of thin air.",
            "",
            "Candidate differences should preferably be reflected in one or a combination of the following dimensions:",
            " - Express different temperaments: cold, epic, concise, heavy, mysterious, documentary, legendary",
            " - Information organization is different: summarize first and then divide, rules first and then phenomena, first background and then core contradictions",
            " - Emphasize different key points: setting logic, conflict tension, historical precipitation, operating mechanism, narrative writeability",
            " - Different refinement methods: lightweight purification, structural reorganization, and deep enhancement",
            "",
            "The title should concisely summarize the rewriting direction of this version, allowing users to see the difference between it and other versions at a glance.",
            "Content should directly output the complete text after rewriting, without words such as \"Version 1\", \"Rewritten as follows\" and \"Explanation\".",
            "",
            "If there is less information in the original text, do not expand it randomly. On the premise of retaining the original meaning, the candidate differences should be widened by reorganizing expressions, strengthening logical connections, and improving readability.",
        ].join("\n")),
        new HumanMessage([
            `World name:${input.worldName}`,
            `Target field:${input.attribute}`,
            `Depth of refinement:${input.refinementLevel}`,
            `Number of candidates:${input.count}`,
            "",
            "Current content:",
            input.currentValue,
        ].join("\n")),
    ],
    postValidate: (output, input) => {
        if (output.length !== input.count) {
            throw new Error(`The number of world polish candidates does not meet the requirements, expectations ${input.count} one, actual ${output.length} .`);
        }
        return output;
    }
};

import type { Prisma } from "@prisma/client";
import { prisma } from "../../db/prisma";
import { BUILT_IN_STORY_MODE_SEEDS, type StoryModeSeedNode } from "../../db/storyModeSeeds";
import { DEFAULT_ANTI_AI_RULES, DEFAULT_STARTER_STYLE_PROFILES, DEFAULT_STYLE_TEMPLATES, type DefaultAntiAiRuleDefinition, type DefaultStarterStyleProfileDefinition, type DefaultTemplateDefinition, } from "../styleEngine/defaults";
import { serializeJson } from "../styleEngine/helpers";
import { serializeStoryModeProfile } from "../storyMode/storyModeProfile";
export type SystemResourceSeedMode = "missing_only" | "sync_existing";
const STARTER_STYLE_PROFILE_SOURCE_PREFIX = "starter-style-profile:";
export const CREATIVE_SEED_PROFILE_KEY = "system.creative_seed_profile";
export const CREATIVE_SEED_PROFILE_VERSION = "ka-GE@1";
interface GenreSeedNode {
    id: string;
    name: string;
    description: string;
    template: string;
    children?: GenreSeedNode[];
}
export interface StyleEngineSeedReport {
    styleTemplatesCreated: number;
    styleTemplatesUpdated: number;
    antiAiRulesCreated: number;
    antiAiRulesUpdated: number;
    styleProfilesCreated: number;
    styleProfilesUpdated: number;
}
export interface SystemResourceBootstrapReport extends StyleEngineSeedReport {
    genresCreated: number;
    genresUpdated: number;
    storyModesCreated: number;
    storyModesUpdated: number;
}
const EMPTY_STYLE_ENGINE_REPORT: StyleEngineSeedReport = {
    styleTemplatesCreated: 0,
    styleTemplatesUpdated: 0,
    antiAiRulesCreated: 0,
    antiAiRulesUpdated: 0,
    styleProfilesCreated: 0,
    styleProfilesUpdated: 0,
};
const EMPTY_BOOTSTRAP_REPORT: SystemResourceBootstrapReport = {
    genresCreated: 0,
    genresUpdated: 0,
    storyModesCreated: 0,
    storyModesUpdated: 0,
    ...EMPTY_STYLE_ENGINE_REPORT,
};
const BUILT_IN_GENRE_SEEDS: GenreSeedNode[] = [
    {
        id: "genre_fantasy_root",
        name: "Fantasy",
        description: "Including Eastern fantasy, Western magic and other fantasy types.",
        template: "Highlight the conflict between worldview setting and growth line.",
        children: [
            {
                id: "genre_fantasy_eastern",
                name: "Oriental fantasy",
                description: "The cultivation system, sect power and the narrative of family and country are equally important.",
                template: "Emphasis on realm breakthroughs and power games.",
            },
            {
                id: "genre_fantasy_western",
                name: "Western fantasy",
                description: "Classic elements such as knights, mages, mythical creatures, etc.",
                template: "Emphasis on adventurous missions and epic conflicts.",
            },
            {
                id: "genre_fantasy_xianxia",
                name: "Immortal Xia Cultivation",
                description: "It takes the system of cultivation, Taoism, cause and effect, and immortality as its core themes.",
                template: "Emphasizes the path of cultivation, the cost of cause and effect, and the choice of sect/immortal path.",
            },
            {
                id: "genre_fantasy_high_martial",
                name: "High martial arts fantasy",
                description: "High-intensity power system, combat growth and world class jump are equally emphasized.",
                template: "Emphasis on power upgrade, combat suppression and order level breakthrough.",
            },
        ],
    },
    {
        id: "genre_urban_root",
        name: "Urban",
        description: "Taking modern cities as the main stage, it emphasizes real-life conflicts and character relationships.",
        template: "Highlight the sense of rhythm and life-oriented details.",
        children: [
            {
                id: "genre_urban_superpower",
                name: "Urban superpower",
                description: "Supernormal abilities, secret rules or special professions are superimposed under the modern urban framework.",
                template: "Emphasis on the sense of contrast and room for upgrade after the collision between real order and superpower settings.",
            },
            {
                id: "genre_urban_workplace",
                name: "urban workplace",
                description: "The plot is advanced around career growth, organizational relationships and real interests.",
                template: "Emphasis on project pressure, workplace gaming, and ability fulfillment.",
            },
            {
                id: "genre_urban_life",
                name: "Urban Life",
                description: "Taking real life, neighborhood relations, family and daily operations as the main stage.",
                template: "Emphasize the sense of life, small advancement and continuous recovery or accumulation.",
            },
        ],
    },
    {
        id: "genre_history_root",
        name: "Historical",
        description: "Taking ancient or historical social structures as the stage, it emphasizes the constraints of the times and changes in the situation.",
        template: "Highlight the atmosphere of the times, status, class and general trend.",
        children: [
            {
                id: "genre_history_alt",
                name: "historical fiction",
                description: "Borrowing historical texture and institutional logic, but allowing the reconstruction of key forces and event trends.",
                template: "Emphasis on the atmosphere of the times, institutional games and rewriting of destiny.",
            },
            {
                id: "genre_history_power",
                name: "Court intrigues",
                description: "It revolves around the government situation, factions, officialdom survival and political choices.",
                template: "Emphasis on factional games, situation reversal and power choices with clear costs.",
            },
            {
                id: "genre_history_war",
                name: "Dynasty Clash",
                description: "It continues to revolve around the expansion of power, advancement of war, and reorganization of the general pattern.",
                template: "Emphasis is placed on the pace of conquest, resource scheduling and territory changes.",
            },
        ],
    },
    {
        id: "genre_scifi_root",
        name: "Science Fiction",
        description: "The core driving force is technological change, future order, space exploration or apocalyptic survival.",
        template: "Highlight the technical settings, future rules and survival costs.",
        children: [
            {
                id: "genre_scifi_near_future",
                name: "near future science fiction",
                description: "Near-future society, technology, and everyday conflicts based on the extension of reality.",
                template: "Emphasizes how technological change rewrites real life, institutional and relational structures.",
            },
            {
                id: "genre_scifi_cyberpunk",
                name: "cyberpunk",
                description: "High technology and low living standards, capital monopoly, prosthetic body transformation and identity alienation coexist.",
                template: "Emphasis on technological oppression, class divisions and personal resistance.",
            },
            {
                id: "genre_scifi_apocalypse",
                name: "apocalyptic science fiction",
                description: "Catastrophe, resource crisis and order reconstruction jointly drive character selection.",
                template: "Emphasizes the pressure of survival, competition for resources and the establishment of a new order.",
            },
            {
                id: "genre_scifi_space",
                name: "interstellar adventure",
                description: "Advance the plot through voyages, unknown civilizations, fleet operations or interstellar missions.",
                template: "Emphasis on exploring the unknown, group collaboration and collision of civilizations.",
            },
        ],
    },
    {
        id: "genre_suspense_root",
        name: "suspense thriller",
        description: "Continue reading driven by mysteries, anomalies, approaching danger, and the recovery of truth.",
        template: "Highlight clue progression, unusual details, and pressure build-up.",
        children: [
            {
                id: "genre_suspense_detective",
                name: "Criminal investigation reasoning",
                description: "Continue to advance around case investigation, evidence chain and logical deduction.",
                template: "Emphasize case structure, investigation process and reasoning recovery.",
            },
            {
                id: "genre_suspense_thriller",
                name: "thriller suspense",
                description: "Danger continues to approach, with both unknown threats and psychological oppression.",
                template: "Highlights escalating risks, information gaps, and oppressive climates.",
            },
            {
                id: "genre_suspense_weird_rules",
                name: "Weird stories about rules",
                description: "Organize the story around rules, taboos, unusual logic, and the cost of mistakes.",
                template: "Emphasis on rule identification, boundary testing and exception recovery.",
            },
            {
                id: "genre_suspense_infinite",
                name: "Unlimited copies",
                description: "Advance survival and breakthrough through dungeons, levels or cycle spaces.",
                template: "Emphasis on dungeon objectives, clearance mechanisms, death pressure and staged escape.",
            },
        ],
    },
    {
        id: "genre_romance_root",
        name: "Romance",
        description: "The main driving forces for reading are relationship promotion, emotional realization and character companionship.",
        template: "Highlight relationship changes, emotional pull and staged responses.",
        children: [
            {
                id: "genre_romance_modern",
                name: "modern romance",
                description: "Relationship promotion, emotional pull and realistic choices in the context of modern life.",
                template: "Emphasizes life scenarios, relationship misreadings and emotional recycling.",
            },
            {
                id: "genre_romance_ancient",
                name: "ancient romance",
                description: "Ancient etiquette, identity constraints and fateful entanglements work together to develop relationships.",
                template: "Emphasis on etiquette restrictions, status differences and relationship choices.",
            },
            {
                id: "genre_romance_campus",
                name: "campus youth",
                description: "It revolves around growth, peer relationships, tentative approach and youthful atmosphere.",
                template: "Emphasis on growth concerns, relationship trials and staged heartbeat fulfillment.",
            },
        ],
    },
    {
        id: "genre_game_root",
        name: "Game competition",
        description: "Continue to advance around competitions, career systems, numerical growth or systematic tasks.",
        template: "Highlight the rules and objectives, staged growth and results fulfillment.",
        children: [
            {
                id: "genre_game_esports",
                name: "eSports",
                description: "The main lines are competition competition, team running-in, training growth and performance breakthroughs.",
                template: "Emphasis is placed on the rhythm of the game, teamwork, and delivering key rounds.",
            },
            {
                id: "genre_game_online",
                name: "virtual online games",
                description: "It revolves around the career system, dungeons, union relations and the growth of the game world.",
                template: "Emphasize system growth, copy promotion and resource competition.",
            },
        ],
    },
];
function mergeBootstrapReport(base: SystemResourceBootstrapReport, patch: Partial<SystemResourceBootstrapReport>): SystemResourceBootstrapReport {
    return {
        genresCreated: base.genresCreated + (patch.genresCreated ?? 0),
        genresUpdated: base.genresUpdated + (patch.genresUpdated ?? 0),
        storyModesCreated: base.storyModesCreated + (patch.storyModesCreated ?? 0),
        storyModesUpdated: base.storyModesUpdated + (patch.storyModesUpdated ?? 0),
        styleTemplatesCreated: base.styleTemplatesCreated + (patch.styleTemplatesCreated ?? 0),
        styleTemplatesUpdated: base.styleTemplatesUpdated + (patch.styleTemplatesUpdated ?? 0),
        antiAiRulesCreated: base.antiAiRulesCreated + (patch.antiAiRulesCreated ?? 0),
        antiAiRulesUpdated: base.antiAiRulesUpdated + (patch.antiAiRulesUpdated ?? 0),
        styleProfilesCreated: base.styleProfilesCreated + (patch.styleProfilesCreated ?? 0),
        styleProfilesUpdated: base.styleProfilesUpdated + (patch.styleProfilesUpdated ?? 0),
    };
}
function mergeStyleEngineReport(base: StyleEngineSeedReport, patch: Partial<StyleEngineSeedReport>): StyleEngineSeedReport {
    return {
        styleTemplatesCreated: base.styleTemplatesCreated + (patch.styleTemplatesCreated ?? 0),
        styleTemplatesUpdated: base.styleTemplatesUpdated + (patch.styleTemplatesUpdated ?? 0),
        antiAiRulesCreated: base.antiAiRulesCreated + (patch.antiAiRulesCreated ?? 0),
        antiAiRulesUpdated: base.antiAiRulesUpdated + (patch.antiAiRulesUpdated ?? 0),
        styleProfilesCreated: base.styleProfilesCreated + (patch.styleProfilesCreated ?? 0),
        styleProfilesUpdated: base.styleProfilesUpdated + (patch.styleProfilesUpdated ?? 0),
    };
}
async function seedGenreNode(tx: Prisma.TransactionClient, node: GenreSeedNode, parentId: string | null, mode: SystemResourceSeedMode): Promise<Pick<SystemResourceBootstrapReport, "genresCreated" | "genresUpdated">> {
    let report = { genresCreated: 0, genresUpdated: 0 };
    const existing = await tx.novelGenre.findUnique({
        where: { id: node.id },
        select: { id: true },
    });
    if (existing) {
        if (mode === "sync_existing") {
            await tx.novelGenre.update({
                where: { id: node.id },
                data: {
                    name: node.name,
                    description: node.description,
                    template: node.template,
                    parentId,
                },
            });
            report = { genresCreated: 0, genresUpdated: 1 };
        }
    }
    else {
        await tx.novelGenre.create({
            data: {
                id: node.id,
                name: node.name,
                description: node.description,
                template: node.template,
                parentId,
            },
        });
        report = { genresCreated: 1, genresUpdated: 0 };
    }
    for (const child of node.children ?? []) {
        const childReport = await seedGenreNode(tx, child, node.id, mode);
        report = {
            genresCreated: report.genresCreated + childReport.genresCreated,
            genresUpdated: report.genresUpdated + childReport.genresUpdated,
        };
    }
    return report;
}
async function seedStoryModeNode(tx: Prisma.TransactionClient, node: StoryModeSeedNode["children"][number] | StoryModeSeedNode, parentId: string | null, mode: SystemResourceSeedMode): Promise<Pick<SystemResourceBootstrapReport, "storyModesCreated" | "storyModesUpdated">> {
    let report = { storyModesCreated: 0, storyModesUpdated: 0 };
    const existing = await tx.novelStoryMode.findUnique({
        where: { id: node.id },
        select: { id: true },
    });
    const data = {
        name: node.name,
        description: node.description,
        template: node.template,
        profileJson: serializeStoryModeProfile(node.profile),
        parentId,
    };
    if (existing) {
        if (mode === "sync_existing") {
            await tx.novelStoryMode.update({
                where: { id: node.id },
                data,
            });
            report = { storyModesCreated: 0, storyModesUpdated: 1 };
        }
    }
    else {
        await tx.novelStoryMode.create({
            data: {
                id: node.id,
                ...data,
            },
        });
        report = { storyModesCreated: 1, storyModesUpdated: 0 };
    }
    if ("children" in node && Array.isArray(node.children)) {
        for (const child of node.children) {
            const childReport = await seedStoryModeNode(tx, child, node.id, mode);
            report = {
                storyModesCreated: report.storyModesCreated + childReport.storyModesCreated,
                storyModesUpdated: report.storyModesUpdated + childReport.storyModesUpdated,
            };
        }
    }
    return report;
}
function buildStyleTemplateWriteData(template: DefaultTemplateDefinition) {
    return {
        name: template.name,
        description: template.description,
        category: template.category,
        tagsJson: serializeJson(template.tags),
        applicableGenresJson: serializeJson(template.applicableGenres),
        analysisMarkdown: template.analysisMarkdown,
        narrativeRulesJson: serializeJson(template.narrativeRules),
        characterRulesJson: serializeJson(template.characterRules),
        languageRulesJson: serializeJson(template.languageRules),
        rhythmRulesJson: serializeJson(template.rhythmRules),
        defaultAntiAiRuleKeysJson: serializeJson(template.defaultAntiAiRuleKeys),
    };
}
function buildAntiAiRuleWriteData(rule: DefaultAntiAiRuleDefinition) {
    return {
        name: rule.name,
        type: rule.type,
        severity: rule.severity,
        description: rule.description,
        detectPatternsJson: serializeJson(rule.detectPatterns),
        rewriteSuggestion: rule.rewriteSuggestion,
        promptInstruction: rule.promptInstruction,
        autoRewrite: rule.autoRewrite,
        enabled: rule.enabled,
        globalBaselineEnabled: rule.globalBaselineEnabled,
    };
}
function buildStarterStyleProfileSourceRef(definition: DefaultStarterStyleProfileDefinition): string {
    return `${STARTER_STYLE_PROFILE_SOURCE_PREFIX}${definition.key}`;
}
function buildStarterStyleProfileWriteData(input: {
    definition: DefaultStarterStyleProfileDefinition;
    template: DefaultTemplateDefinition;
}) {
    return {
        name: input.definition.name,
        description: input.definition.description,
        category: input.template.category,
        tagsJson: serializeJson(input.template.tags),
        applicableGenresJson: serializeJson(input.template.applicableGenres),
        sourceType: "manual",
        sourceRefId: buildStarterStyleProfileSourceRef(input.definition),
        sourceContent: null,
        extractedFeaturesJson: serializeJson([]),
        analysisMarkdown: input.template.analysisMarkdown,
        narrativeRulesJson: serializeJson(input.template.narrativeRules),
        characterRulesJson: serializeJson(input.template.characterRules),
        languageRulesJson: serializeJson(input.template.languageRules),
        rhythmRulesJson: serializeJson(input.template.rhythmRules),
        status: "active",
    };
}
async function seedStarterStyleProfiles(tx: Prisma.TransactionClient, mode: SystemResourceSeedMode): Promise<StyleEngineSeedReport> {
    let report = { ...EMPTY_STYLE_ENGINE_REPORT };
    const totalProfiles = await tx.styleProfile.count();
    if (mode === "missing_only" && totalProfiles > 0) {
        return report;
    }
    for (const definition of DEFAULT_STARTER_STYLE_PROFILES) {
        const template = DEFAULT_STYLE_TEMPLATES.find((item) => item.key === definition.templateKey);
        if (!template) {
            continue;
        }
        const sourceRefId = buildStarterStyleProfileSourceRef(definition);
        const existing = await tx.styleProfile.findFirst({
            where: { sourceRefId },
            select: { id: true },
        });
        const antiAiRules = template.defaultAntiAiRuleKeys.length > 0
            ? await tx.antiAiRule.findMany({
                where: {
                    key: {
                        in: template.defaultAntiAiRuleKeys,
                    },
                },
                select: { id: true },
            })
            : [];
        if (existing) {
            if (mode === "sync_existing") {
                await tx.styleProfile.update({
                    where: { id: existing.id },
                    data: buildStarterStyleProfileWriteData({ definition, template }),
                });
                await tx.styleProfileAntiAiRule.deleteMany({
                    where: { styleProfileId: existing.id },
                });
                if (antiAiRules.length > 0) {
                    await tx.styleProfileAntiAiRule.createMany({
                        data: antiAiRules.map((rule) => ({
                            styleProfileId: existing.id,
                            antiAiRuleId: rule.id,
                            enabled: true,
                        })),
                    });
                }
                report = mergeStyleEngineReport(report, { styleProfilesUpdated: 1 });
            }
            continue;
        }
        const created = await tx.styleProfile.create({
            data: {
                ...buildStarterStyleProfileWriteData({ definition, template }),
            },
            select: { id: true },
        });
        if (antiAiRules.length > 0) {
            await tx.styleProfileAntiAiRule.createMany({
                data: antiAiRules.map((rule) => ({
                    styleProfileId: created.id,
                    antiAiRuleId: rule.id,
                    enabled: true,
                })),
            });
        }
        report = mergeStyleEngineReport(report, { styleProfilesCreated: 1 });
    }
    return report;
}
export async function seedStyleEngineStarterData(mode: SystemResourceSeedMode = "missing_only"): Promise<StyleEngineSeedReport> {
    return prisma.$transaction(async (tx) => {
        let report = { ...EMPTY_STYLE_ENGINE_REPORT };
        for (const rule of DEFAULT_ANTI_AI_RULES) {
            const existing = await tx.antiAiRule.findUnique({
                where: { key: rule.key },
                select: { id: true },
            });
            if (existing) {
                if (mode === "sync_existing") {
                    await tx.antiAiRule.update({
                        where: { key: rule.key },
                        data: buildAntiAiRuleWriteData(rule),
                    });
                    report = mergeStyleEngineReport(report, { antiAiRulesUpdated: 1 });
                }
                continue;
            }
            await tx.antiAiRule.create({
                data: {
                    key: rule.key,
                    ...buildAntiAiRuleWriteData(rule),
                },
            });
            report = mergeStyleEngineReport(report, { antiAiRulesCreated: 1 });
        }
        for (const template of DEFAULT_STYLE_TEMPLATES) {
            const existing = await tx.styleTemplate.findUnique({
                where: { key: template.key },
                select: { id: true },
            });
            if (existing) {
                if (mode === "sync_existing") {
                    await tx.styleTemplate.update({
                        where: { key: template.key },
                        data: buildStyleTemplateWriteData(template),
                    });
                    report = mergeStyleEngineReport(report, { styleTemplatesUpdated: 1 });
                }
                continue;
            }
            await tx.styleTemplate.create({
                data: {
                    key: template.key,
                    ...buildStyleTemplateWriteData(template),
                },
            });
            report = mergeStyleEngineReport(report, { styleTemplatesCreated: 1 });
        }
        report = mergeStyleEngineReport(report, await seedStarterStyleProfiles(tx, mode));
        return report;
    });
}
export async function ensureSystemResourceStarterData(options: {
    mode?: SystemResourceSeedMode;
} = {}): Promise<SystemResourceBootstrapReport> {
    const currentMarker = await prisma.appSetting.findUnique({
        where: { key: CREATIVE_SEED_PROFILE_KEY },
        select: { value: true },
    });
    const mode = options.mode
        ?? (currentMarker?.value === CREATIVE_SEED_PROFILE_VERSION ? "missing_only" : "sync_existing");
    let report = { ...EMPTY_BOOTSTRAP_REPORT };
    const genreReport = await prisma.$transaction(async (tx) => {
        let acc = { genresCreated: 0, genresUpdated: 0 };
        for (const root of BUILT_IN_GENRE_SEEDS) {
            const seeded = await seedGenreNode(tx, root, null, mode);
            acc = {
                genresCreated: acc.genresCreated + seeded.genresCreated,
                genresUpdated: acc.genresUpdated + seeded.genresUpdated,
            };
        }
        return acc;
    });
    report = mergeBootstrapReport(report, genreReport);
    const storyModeReport = await prisma.$transaction(async (tx) => {
        let acc = { storyModesCreated: 0, storyModesUpdated: 0 };
        for (const root of BUILT_IN_STORY_MODE_SEEDS) {
            const seeded = await seedStoryModeNode(tx, root, null, mode);
            acc = {
                storyModesCreated: acc.storyModesCreated + seeded.storyModesCreated,
                storyModesUpdated: acc.storyModesUpdated + seeded.storyModesUpdated,
            };
        }
        return acc;
    });
    report = mergeBootstrapReport(report, storyModeReport);
    const styleReport = await seedStyleEngineStarterData(mode);
    report = mergeBootstrapReport(report, styleReport);
    await prisma.appSetting.upsert({
        where: { key: CREATIVE_SEED_PROFILE_KEY },
        create: { key: CREATIVE_SEED_PROFILE_KEY, value: CREATIVE_SEED_PROFILE_VERSION },
        update: { value: CREATIVE_SEED_PROFILE_VERSION },
    });
    return report;
}
export function hasSystemResourceBootstrapChanges(report: SystemResourceBootstrapReport): boolean {
    return Object.values(report).some((value) => value > 0);
}

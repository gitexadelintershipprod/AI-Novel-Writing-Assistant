import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { z } from "zod";
import type { PromptAsset } from "../../core/promptTypes";
const sourceFactSchema = z.object({
    text: z.string().trim().min(1),
    category: z.enum(["completed", "revealed", "state_changed"]).default("completed"),
});
const sourceCharacterSchema = z.object({
    name: z.string().trim().min(1),
    persona: z.string().trim().optional(),
    relations: z.string().trim().optional(),
    visualHint: z.string().trim().optional(),
    sourceCharacterRef: z.string().trim().optional(),
});
const sourceBeatSchema = z.object({
    order: z.number().int().min(1),
    summary: z.string().trim().min(1),
    sourceChapterStart: z.number().int().min(1).optional(),
    sourceChapterEnd: z.number().int().min(1).optional(),
});
export const dramaSourceBundleOutputSchema = z.object({
    synopsis: z.string().trim().min(1),
    beats: z.array(sourceBeatSchema).min(1).max(120),
    characters: z.array(sourceCharacterSchema).min(1).max(30),
    worldNotes: z.string().trim().optional(),
    hardFacts: z.array(sourceFactSchema).optional(),
    rawText: z.string().trim().optional(),
});
export type DramaSourceBundleOutput = z.infer<typeof dramaSourceBundleOutputSchema>;
const dramaTrackIdSchema = z.enum([
    "counterattack",
    "rebirth_revenge",
    "war_god",
    "live_in_son",
    "miracle_doctor",
    "rich_family",
    "sweet_love",
    "hidden_identity",
]);
export const dramaTrackRecommendationOutputSchema = z.object({
    recommendedTrack: dramaTrackIdSchema,
    reason: z.string().trim().min(1),
    fitSignals: z.array(z.string().trim().min(1)).min(1).max(6),
    risks: z.array(z.string().trim().min(1)).max(5).default([]),
    alternatives: z.array(z.object({
        track: dramaTrackIdSchema,
        reason: z.string().trim().min(1),
    })).max(3).default([]),
});
export type DramaTrackRecommendationOutput = z.infer<typeof dramaTrackRecommendationOutputSchema>;
export interface DramaTrackRecommendationPromptInput {
    title: string;
    sourceType: string;
    sourceDigest: string;
    theme?: string;
    targetEpisodes: number;
    trackCatalog: string;
}
export const dramaTrackRecommendationPrompt: PromptAsset<DramaTrackRecommendationPromptInput, DramaTrackRecommendationOutput> = {
    id: "drama.track.recommendation",
    version: "v2",
    taskType: "outline_planning",
    mode: "structured",
    language: "ka",
    contextPolicy: { maxTokensBudget: 5000 },
    outputSchema: dramaTrackRecommendationOutputSchema,
    render: (input) => [
        new SystemMessage([
            "You are the topic selection planner for vertical screen paid short dramas, responsible for helping novice creators choose the most suitable short drama track from story materials.",
            "The judgment must be made based on the core conflict of the story, the situation of the protagonist, the method of redeeming cool points, and the rules of the paid short drama track.",
            "Only recommendedTrack and alternatives.track can be selected from a given track directory.",
            "Only output JSON that conforms to the schema, not Markdown.",
        ].join("\n")),
        new HumanMessage([
            `\u3010Project name\u3011${input.title}`,
            `\u3010Content source\u3011${input.sourceType}`,
            `[Supplementary theme]${input.theme || "Not filled in"}`,
            `\u3010Target number of sets\u3011${input.targetEpisodes}`,
            "",
            `\u3010Track Catalog\u3011
${input.trackCatalog}`,
            "",
            `\u3010Story material\u3011
${input.sourceDigest}`,
            "",
            "Please recommend a most suitable skit track and give adaptation signals, risks and alternative tracks.",
        ].join("\n")),
    ]
};
export const dramaSourceSupplementOutputSchema = z.object({
    readiness: z.enum(["ready", "needs_supplement", "needs_rebuild"]),
    summary: z.string().trim().min(1),
    missingItems: z.array(z.object({
        area: z.enum(["synopsis", "beats", "characters", "facts", "world", "other"]),
        problem: z.string().trim().min(1),
        impact: z.string().trim().min(1),
    })).max(8),
    questions: z.array(z.object({
        question: z.string().trim().min(1),
        guidance: z.string().trim().min(1),
        priority: z.enum(["high", "medium", "low"]),
    })).min(1).max(8),
    nextAction: z.enum(["continue", "supplement_notes", "rebuild_source_bundle"]),
});
export type DramaSourceSupplementOutput = z.infer<typeof dramaSourceSupplementOutputSchema>;
export interface DramaSourceSupplementPromptInput {
    projectTitle: string;
    sourceType: string;
    targetEpisodes: number;
    qualitySnapshot: string;
    synopsis: string;
    beatsDigest: string;
    charactersDigest: string;
    factsDigest: string;
    userSupplement?: string;
}
export const dramaSourceSupplementPrompt: PromptAsset<DramaSourceSupplementPromptInput, DramaSourceSupplementOutput> = {
    id: "drama.source.supplement",
    version: "v2",
    taskType: "outline_planning",
    mode: "structured",
    language: "ka",
    contextPolicy: { maxTokensBudget: 7000 },
    outputSchema: dramaSourceSupplementOutputSchema,
    render: (input) => [
        new SystemMessage([
            "You are the diagnostic assistant for vertical screen short drama materials, responsible for determining whether the SourceBundle is sufficient for strategy, episode and script generation.",
            "Your output should help novice creators complete the most critical information. The questions must be specific, easy to answer, and can directly improve subsequent generation.",
            "Don't call ordinary minor flaws blocking; rebuild_source_bundle is only recommended when there is a serious shortage of materials or when the content bundle needs to be reorganized.",
            "Only output JSON that conforms to the schema, not Markdown.",
        ].join("\n")),
        new HumanMessage([
            `\u3010Project\u3011${input.projectTitle}`,
            `\u3010Source\u3011${input.sourceType}`,
            `\u3010Target number of sets\u3011${input.targetEpisodes}`,
            `\u3010Quality Snapshot\u3011
${input.qualitySnapshot}`,
            "",
            `\u3010Summary\u3011
${input.synopsis || "empty"}`,
            `[Beat summary]
${input.beatsDigest || "empty"}`,
            `\u3010Character summary\u3011
${input.charactersDigest || "empty"}`,
            `\u3010Hard facts\u3011
${input.factsDigest || "empty"}`,
            input.userSupplement ? `[User supplement]
${input.userSupplement}` : "",
            "",
            "Please output material availability diagnosis, gaps, supplementary questions, and next step suggestions.",
        ].filter(Boolean).join("\n")),
    ]
};
export interface DramaOriginalSourcePromptInput {
    title: string;
    inspiration: string;
    track?: string;
    theme?: string;
    targetEpisodes: number;
}
export const dramaOriginalSourcePrompt: PromptAsset<DramaOriginalSourcePromptInput, DramaSourceBundleOutput> = {
    id: "drama.source.original_bundle",
    version: "v2",
    taskType: "outline_planning",
    mode: "structured",
    language: "ka",
    contextPolicy: { maxTokensBudget: 5000 },
    outputSchema: dramaSourceBundleOutputSchema,
    render: (input) => [
        new SystemMessage([
            "You are the vertical screen paid short drama planner, responsible for organizing original inspiration into standard content packages that can enter the short drama production line.",
            "The plot, characters, key beats, and hard facts must be filled in with AI structured understanding.",
            "Only output JSON that conforms to the schema, not Markdown.",
        ].join("\n")),
        new HumanMessage([
            `\u3010Title\u3011${input.title}`,
            `\u3010Inspiration\u3011${input.inspiration}`,
            `\u3010Track\u3011${input.track || "Not specified, it\u2019s up to you to judge based on the short drama market"}`,
            `\u3010Subject\u3011${input.theme || "unspecified"}`,
            `\u3010Target number of sets\u3011${input.targetEpisodes}`,
            "",
            "Please generate SourceBundle: synopsis, beats, characters, worldNotes, hardFacts.",
            "Beats should be expressed in 12-24 high-density plot beats, rather than long chapters.",
        ].join("\n")),
    ]
};
export interface DramaTextImportSourcePromptInput {
    title: string;
    rawText: string;
    track?: string;
    theme?: string;
    targetEpisodes: number;
}
export const dramaTextImportSourcePrompt: PromptAsset<DramaTextImportSourcePromptInput, DramaSourceBundleOutput> = {
    id: "drama.source.text_bundle",
    version: "v2",
    taskType: "outline_planning",
    mode: "structured",
    language: "ka",
    contextPolicy: { maxTokensBudget: 9000 },
    outputSchema: dramaSourceBundleOutputSchema,
    render: (input) => [
        new SystemMessage([
            "You are the vertical screen short drama adaptation planner, responsible for parsing imported text into source-independent SourceBundle.",
            "Keep the core characters, conflicts, twists, hard facts, and adaptable beats and avoid verbatim retellings.",
            "Only output JSON that conforms to the schema, not Markdown.",
        ].join("\n")),
        new HumanMessage([
            `\u3010Title\u3011${input.title}`,
            `\u3010Track\u3011${input.track || "unspecified"}`,
            `\u3010Subject\u3011${input.theme || "unspecified"}`,
            `\u3010Target number of sets\u3011${input.targetEpisodes}`,
            "",
            `\u3010Import text\u3011
${input.rawText.slice(0, 24000)}`,
            "",
            "Please output the SourceBundle. The beats should be organized according to the plot progression into beats that can be used in the short drama episodes.",
        ].join("\n")),
    ]
};
export const dramaStrategyOutputSchema = z.object({
    positioning: z.string().trim().min(1),
    mainPleasureLine: z.string().trim().min(1),
    paywallNote: z.string().trim().min(1),
    paywallPlan: z.object({
        firstPaywallAt: z.number().int().min(8).max(15),
        freeEpisodes: z.number().int().min(1).max(20),
        paywallCadence: z.number().int().min(1).max(5),
        cliffhangerStrengthThreshold: z.number().int().min(60).max(100),
        buildupBeforePaywall: z.string().trim().min(1),
        intensityCurve: z.array(z.object({
            fromEpisode: z.number().int().min(1),
            toEpisode: z.number().int().min(1),
            goal: z.string().trim().min(1),
            targetEmotionNet: z.number().int().min(-5).max(5),
        })).min(1).max(8),
    }),
    emotionCurveNote: z.string().trim().min(1),
    deviationDeclaration: z.string().trim().min(1),
});
export type DramaStrategyOutput = z.infer<typeof dramaStrategyOutputSchema>;
export interface DramaStrategyPromptInput {
    synopsis: string;
    trackLabel: string;
    trackDescription: string;
    rhythmNote: string;
    taboos: string;
    preferredHooks: string;
    targetEpisodes: number;
    freeEpisodes: number;
    firstPaywallAt: number;
}
export const dramaStrategyPrompt: PromptAsset<DramaStrategyPromptInput, DramaStrategyOutput> = {
    id: "drama.strategy",
    version: "v2",
    taskType: "outline_planning",
    mode: "structured",
    language: "ka",
    contextPolicy: { maxTokensBudget: 4000 },
    outputSchema: dramaStrategyOutputSchema,
    render: (input) => [
        new SystemMessage([
            "You are a top vertical screen paid short drama operator, good at adapting a story into a short drama with high completion and high paid conversion.",
            "Your task is to produce an adaptation strategy for this short drama based on the content outline and track rules.",
            "Only output strict JSON that conforms to the schema, no Markdown, explanations, or code blocks.",
        ].join("\n")),
        new HumanMessage([
            `\u3010Content Summary\u3011
${input.synopsis}`,
            "",
            `\u3010Track\u3011${input.trackLabel}：${input.trackDescription}`,
            `[This track has a nicer pace]${input.rhythmNote}`,
            `[This track prefers the hook]${input.preferredHooks}`,
            `[Taboos on the track]${input.taboos}`,
            `\u3010Total number of episodes\u3011${input.targetEpisodes}`,
            `\u3010Free traffic\u3011Previous ${input.freeEpisodes} set`,
            `\u3010First payment point\u3011No. ${input.firstPaywallAt} set`,
            "",
            "Please output the JSON adaptation strategy for this paid vertical screen drama.",
            "paywallPlan.firstPaywallAt must be between episodes 8-15 and combined with the material to determine the first payment point.",
            "paywallPlan.intensityCurve will split free traffic, pre-payment accumulation points, strong card points for first payment and subsequent continuous payment card points into executable intervals.",
        ].join("\n")),
    ]
};
export const dramaEpisodeOutlineItemSchema = z.object({
    order: z.number().int().min(1),
    title: z.string().trim().min(1),
    hookOpening: z.string().trim().min(1),
    hookType: z.string().trim().min(1),
    conflict: z.string().trim().min(1),
    cliffhanger: z.string().trim().min(1),
    emotionNet: z.number().int().min(-5).max(5),
    sourceBeatRefs: z.array(z.number().int()).optional(),
});
export const dramaEpisodeOutlineOutputSchema = z.object({
    episodes: z.array(dramaEpisodeOutlineItemSchema).min(1).max(40),
});
export type DramaEpisodeOutlineOutput = z.infer<typeof dramaEpisodeOutlineOutputSchema>;
export interface DramaEpisodeOutlinePromptInput {
    synopsis: string;
    strategyJson: string;
    beatsDigest: string;
    trackLabel: string;
    hookLibrary: string;
    startOrder: number;
    count: number;
    paywallEpisodes: string;
    paywallPlanDigest: string;
}
export const dramaEpisodeOutlinePrompt: PromptAsset<DramaEpisodeOutlinePromptInput, DramaEpisodeOutlineOutput> = {
    id: "drama.episodeOutline",
    version: "v2",
    taskType: "outline_planning",
    mode: "structured",
    language: "ka",
    contextPolicy: { maxTokensBudget: 8000 },
    outputSchema: dramaEpisodeOutlineOutputSchema,
    render: (input) => [
        new SystemMessage([
            "You are a top vertical screen paid short drama screenwriter, responsible for cutting the story into an episode structure with strong hooks and strong points.",
            "Each episode must include the golden 3-second hook, main hook type, core conflict, end-of-episode hook, emotional net worth, and source mapping.",
            "Only output strict JSON that conforms to the schema, no Markdown, explanations, or code blocks.",
        ].join("\n")),
        new HumanMessage([
            `\u3010Content Summary\u3011
${input.synopsis}`,
            `\u3010Adaptation strategy\u3011
${input.strategyJson}`,
            `\u3010Track\u3011${input.trackLabel}`,
            `\u3010Hook library\u3011
${input.hookLibrary}`,
            `\u3010Content beat summary\u3011
${input.beatsDigest}`,
            `[This generation interval] No. ${input.startOrder} Gather together, total ${input.count} set`,
            `[Payment card point collection number]${input.paywallEpisodes || "None"}`,
            `\u3010Paid Card Point Plan\u3011
${input.paywallPlanDigest}`,
            "",
            "Please output the episode outline JSON for this interval.",
            "If this interval includes a first-payment set, the episode before the first-payment should form a periodic trough, and the end of the first-payment set must reach the planned strong card point target.",
        ].join("\n")),
    ]
};
export const dramaScriptOutputSchema = z.object({
    content: z.string().trim().min(1),
    durationSec: z.number().int().min(20).max(300),
    sceneCount: z.number().int().min(1).max(12),
    opening3s: z.string().trim().min(1),
    endingCliffhanger: z.string().trim().min(1),
    newlyIntroducedFacts: z.array(sourceFactSchema).optional(),
    episodeSummary: z.string().trim().min(1),
});
export type DramaScriptOutput = z.infer<typeof dramaScriptOutputSchema>;
export interface DramaScriptPromptInput {
    projectTitle: string;
    strategyJson: string;
    episodeJson: string;
    charactersDigest: string;
    factsDigest: string;
    previousDigest: string;
    sourceDigest: string;
}
export const dramaScriptPrompt: PromptAsset<DramaScriptPromptInput, DramaScriptOutput> = {
    id: "drama.episode.script",
    version: "v2",
    taskType: "chapter_drafting",
    mode: "structured",
    language: "ka",
    contextPolicy: { maxTokensBudget: 9000 },
    outputSchema: dramaScriptOutputSchema,
    render: (input) => [
        new SystemMessage([
            "You are a vertical screen paid short drama script writer. The output must be filmable, dialogue dense, and conflicts advanced quickly.",
            "The script should include character names, action cues and dialogue; do not write long novel-like psychological descriptions.",
            "There must be conflict/suspense/contrast in the opening 3 seconds, and there must be a strong point at the end.",
            "Only output JSON that conforms to the schema.",
        ].join("\n")),
        new HumanMessage([
            `\u3010Project\u3011${input.projectTitle}`,
            `\u3010Strategy\u3011
${input.strategyJson}`,
            `\u3010Outline of this episode\u3011
${input.episodeJson}`,
            `\u3010Character\u3011
${input.charactersDigest}`,
            `\u3010Fact Ledger\u3011
${input.factsDigest}`,
            `\u3010Preface summary\u3011
${input.previousDigest}`,
            `[source beat]
${input.sourceDigest}`,
            "",
            "Please generate the skit script JSON for this episode.",
        ].join("\n")),
    ]
};
export const dramaQualityOutputSchema = z.object({
    status: z.enum(["approved", "repairable", "continue_with_warning", "blocked"]),
    score: z.object({
        hook: z.number().int().min(0).max(100),
        density: z.number().int().min(0).max(100),
        paywall: z.number().int().min(0).max(100),
        emotion: z.number().int().min(0).max(100),
        duration: z.number().int().min(0).max(100),
        consistency: z.number().int().min(0).max(100),
        overall: z.number().int().min(0).max(100),
    }),
    flags: z.array(z.object({
        severity: z.enum(["low", "medium", "high", "critical"]),
        code: z.string().trim().min(1),
        evidence: z.string().trim().min(1),
        suggestion: z.string().trim().min(1),
    })),
    repairPlan: z.object({
        mode: z.enum(["patch", "regenerate"]),
        instruction: z.string().trim().min(1),
    }).optional(),
});
export type DramaQualityOutput = z.infer<typeof dramaQualityOutputSchema>;
export const dramaComplianceOutputSchema = z.object({
    level: z.enum(["pass", "warn", "block"]),
    items: z.array(z.object({
        rule: z.string().trim().min(1),
        excerpt: z.string().trim().min(1),
        suggestion: z.string().trim().min(1),
    })).max(12).default([]),
});
export type DramaComplianceOutput = z.infer<typeof dramaComplianceOutputSchema>;
export interface DramaQualityPromptInput {
    episodeJson: string;
    content: string;
    factsDigest: string;
    charactersDigest: string;
    strategyJson: string;
    paywallPlanDigest: string;
    episodeRhythmDigest: string;
}
export const dramaQualityPrompt: PromptAsset<DramaQualityPromptInput, DramaQualityOutput> = {
    id: "drama.episode.quality",
    version: "v2",
    taskType: "chapter_review",
    mode: "structured",
    language: "ka",
    contextPolicy: { maxTokensBudget: 7000 },
    outputSchema: dramaQualityOutputSchema,
    render: (input) => [
        new SystemMessage([
            "You are the quality gate for vertical screen paid short dramas. Check whether the script is suitable for high completion and paid conversion.",
            "Focus on checking the golden 3 seconds, information density, paid card points, emotional curve, duration, consistent facts and consistent roles.",
            "Local quality issues should be suggested for fixability; only blocked if no content is available or if there are serious factual conflicts.",
            "Only output JSON that conforms to the schema.",
        ].join("\n")),
        new HumanMessage([
            `\u3010Outline of this episode\u3011
${input.episodeJson}`,
            `\u3010Script\u3011
${input.content}`,
            `\u3010Strategy\u3011
${input.strategyJson}`,
            `\u3010Paid Card Point Plan\u3011
${input.paywallPlanDigest}`,
            `[Rhythm of adjacent episodes]
${input.episodeRhythmDigest}`,
            `\u3010Fact Ledger\u3011
${input.factsDigest}`,
            `\u3010Character\u3011
${input.charactersDigest}`,
            "",
            "Please output quality assessment JSON. The paid episode should focus on judging whether the stuck points at the end have reached the planned strength; the episode before the first payment should judge whether it has the function of accumulating troughs.",
        ].join("\n")),
    ]
};
export interface DramaCompliancePromptInput {
    episodeJson: string;
    content: string;
    charactersDigest: string;
    factsDigest: string;
}
export const dramaCompliancePrompt: PromptAsset<DramaCompliancePromptInput, DramaComplianceOutput> = {
    id: "drama.episode.compliance",
    version: "v2",
    taskType: "chapter_review",
    mode: "structured",
    language: "ka",
    contextPolicy: { maxTokensBudget: 7000 },
    outputSchema: dramaComplianceOutputSchema,
    render: (input) => [
        new SystemMessage([
            "You are the compliance pre-inspector of the vertical screen short drama platform, responsible for discovering high-frequency rejection risks before the script is shot or the video is generated.",
            "The scope of the inspection includes but is not limited to: excessive presentation of violence and gore, medical misleading, claims of feudal superstition, vulgarity, illegal and criminal teaching, absolute terms in advertising laws, inappropriate content for minors, and imitation of dangerous behaviors.",
            "level=pass means no obvious risk of platform rejection is found; level=warn means it can continue but it is recommended to rewrite; level=block means it must be repaired before entering production.",
            "Only output JSON that conforms to the schema, not Markdown.",
        ].join("\n")),
        new HumanMessage([
            `\u3010Outline of this episode\u3011
${input.episodeJson}`,
            `\u3010Script\u3011
${input.content}`,
            `\u3010Character\u3011
${input.charactersDigest}`,
            `\u3010Fact Ledger\u3011
${input.factsDigest}`,
            "",
            "Please output the platform compliance pre-check report JSON. Each item in items must give the hit rule, the original text fragment and the modification suggestions for the screenwriter.",
        ].join("\n")),
    ]
};
export const dramaRepairPrompt: PromptAsset<{
    content: string;
    repairInstruction: string;
    episodeJson: string;
}, DramaScriptOutput> = {
    id: "drama.episode.repair",
    version: "v2",
    taskType: "chapter_repair",
    mode: "structured",
    language: "ka",
    contextPolicy: { maxTokensBudget: 8000 },
    outputSchema: dramaScriptOutputSchema,
    render: (input) => [
        new SystemMessage([
            "You are a script writer for vertical screen short plays. This episode was rewritten based on explicit repair instructions.",
            "Keep the episode outline goals the same and fix hooks, sticking points, duration, facts, or character issues.",
            "Only output JSON that conforms to the schema.",
        ].join("\n")),
        new HumanMessage([
            `\u3010Outline of this episode\u3011
${input.episodeJson}`,
            `\u3010Repair Instructions\u3011
${input.repairInstruction}`,
            `\u3010Original script\u3011
${input.content}`,
        ].join("\n")),
    ]
};
export const dramaStoryboardOutputSchema = z.object({
    summary: z.string().trim().min(1),
    shots: z.array(z.object({
        order: z.number().int().min(1),
        shotSize: z.string().trim().optional(),
        cameraMove: z.string().trim().optional(),
        durationSec: z.number().int().min(1).max(30).optional(),
        location: z.string().trim().optional(),
        action: z.string().trim().min(1),
        dialogue: z.string().trim().optional(),
        characterRefs: z.array(z.string().trim()).optional(),
        visualPrompt: z.string().trim().optional(),
    })).min(1).max(40),
});
export type DramaStoryboardOutput = z.infer<typeof dramaStoryboardOutputSchema>;
export const dramaStoryboardPrompt: PromptAsset<{
    content: string;
    charactersDigest: string;
}, DramaStoryboardOutput> = {
    id: "drama.storyboard",
    version: "v2",
    taskType: "outline_planning",
    mode: "structured",
    language: "ka",
    contextPolicy: { maxTokensBudget: 8000 },
    outputSchema: dramaStoryboardOutputSchema,
    render: (input) => [
        new SystemMessage([
            "You are a vertical screen short storyboard artist. Divide the script into shootable shot sequences, giving priority to close shots, medium close shots, strong expressions and clear actions.",
            "Each shot must be able to advance the conflict and avoid empty shots and environmental presentation.",
            "Only output JSON that conforms to the schema.",
        ].join("\n")),
        new HumanMessage([
            `[Character visual anchor point]
${input.charactersDigest}`,
            `\u3010Script\u3011
${input.content}`,
        ].join("\n")),
    ]
};
export const dramaVideoPromptOutputSchema = z.object({
    prompt: z.string().trim().min(1),
    negativePrompt: z.string().trim().optional(),
    aspectRatio: z.string().trim().default("9:16"),
    durationSec: z.number().int().min(1).max(30).optional(),
});
export type DramaVideoPromptOutput = z.infer<typeof dramaVideoPromptOutputSchema>;
export const dramaVideoPromptPrompt: PromptAsset<{
    shotJson: string;
    charactersDigest: string;
}, DramaVideoPromptOutput> = {
    id: "drama.video.prompt",
    version: "v2",
    taskType: "outline_planning",
    mode: "structured",
    language: "ka",
    contextPolicy: { maxTokensBudget: 4000 },
    outputSchema: dramaVideoPromptOutputSchema,
    render: (input) => [
        new SystemMessage([
            "You are the vertical screen AI video prompt word director. Convert single skit footage into video to generate prompt words.",
            "Prompt words must preserve the character\u2019s visual anchor, movement, emotion, shot language, and 9:16 vertical composition.",
            "Only output JSON that conforms to the schema.",
        ].join("\n")),
        new HumanMessage([
            `[Character visual anchor point]
${input.charactersDigest}`,
            `\u3010Lens\u3011
${input.shotJson}`,
        ].join("\n")),
    ]
};

import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { z } from "zod";
import type { PromptAsset } from "../../core/promptTypes";

export const comicFactExtractionOutputSchema = z.object({
    facts: z.array(z.object({
        text: z.string().trim().min(1).max(200),
        category: z.enum(["completed", "revealed", "state_changed"]).default("completed"),
    })).max(10),
});

export interface ComicFactExtractionPromptInput {
    projectTitle: string;
    episodeOrder: number;
    episodeTitle: string;
    panelSummary: string;
    existingFacts: string;
}

export const comicFactExtractionPrompt: PromptAsset<
    ComicFactExtractionPromptInput,
    z.infer<typeof comicFactExtractionOutputSchema>
> = {
    id: "comic.factExtraction",
    version: "v2",
    taskType: "chapter_drafting",
    mode: "structured",
    language: "ka",
    contextPolicy: { maxTokensBudget: 3000 },
    outputSchema: comicFactExtractionOutputSchema,
    render(input) {
        return [
            new SystemMessage(`You maintain visual continuity for a serialized comic.
Extract only durable visual facts that constrain future episodes. Ignore incidental details.
Use category "completed" for consequential events, "revealed" for first appearances, and "state_changed" for persistent character-state changes.
Write every fact naturally and concisely in Georgian.`),
            new HumanMessage(`Comic project: ${input.projectTitle}
Episode ${input.episodeOrder}: ${input.episodeTitle}

## Current episode panel summary
${input.panelSummary}

${input.existingFacts ? `## Existing cross-episode facts (do not repeat)\n${input.existingFacts}\n` : ""}
## Task
Return a facts array containing only new visual constraints that future image generation must preserve.
Keep each fact within 200 Unicode characters. State the constraint directly and in Georgian.
Do not repeat existing facts. Return an empty array when the episode introduces no durable visual fact.`),
        ];
    },
};
// ─── Episode planning ───────────────────────────────────────────────────────────────
export const comicEpisodeOutlineOutputSchema = z.object({
    episodes: z.array(z.object({
        order: z.number().int().min(1),
        title: z.string().trim().min(1).max(30),
        synopsis: z.string().trim().min(10).max(300),
        hookType: z.string().trim().optional(),
        cliffhanger: z.string().trim().max(100).optional(),
        isPaywalled: z.boolean().default(false),
        sourceChapterStart: z.number().int().min(1).optional(),
        sourceChapterEnd: z.number().int().min(1).optional(),
    })).min(1).max(40),
});
export type ComicEpisodeOutlineOutput = z.infer<typeof comicEpisodeOutlineOutputSchema>;
export interface ComicEpisodeOutlinePromptInput {
    title: string;
    synopsis: string;
    beatsDigest: string;
    startOrder: number;
    endOrder: number;
    paywallOrders: number[];
    hookLibrary: string;
    stylePreset?: string;
}
export const comicEpisodeOutlinePrompt: PromptAsset<ComicEpisodeOutlinePromptInput, ComicEpisodeOutlineOutput> = {
    id: "comic.episodeOutline",
    version: "v2",
    taskType: "outline_planning",
    mode: "structured",
    language: "ka",
    contextPolicy: { maxTokensBudget: 7000 },
    outputSchema: comicEpisodeOutlineOutputSchema,
    render(input) {
        return [
            new SystemMessage(`You are a professional content planner for comics (comics/comics), and are good at adapting novels/original stories into vertical comics published in episodes.
The goal of each episode is: 30-80 frames, with a hook at the beginning, suspense/stuck point at the end, and a complete emotional curve.
Painting style reference:${input.stylePreset ?? "Colorful Korean comics"}。`),
            new HumanMessage(`Please contribute to the comic project "${input.title}"Plan No. ${input.startOrder}-${input.endOrder} An outline of the story.

## Content summary
${input.synopsis}

## Plot beat summary
${input.beatsDigest}

## Constraints
- Paywalled collection number (isPaywalled=true):${input.paywallOrders.length > 0 ? input.paywallOrders.join("、") : "None"}
- Opening hook type library (hookType is selected from here):
${input.hookLibrary}

## Output format
Returns an array of episodes, each containing: order / title / synopsis / hookType / cliffhanger / isPaywalled / sourceChapterStart / sourceChapterEnd.
In ascending order, plot continuity is maintained, with suspense centered around the isPaywalled episode.`),
        ];
    }
};
// ─── Panel-script generation ──────────────────────────────────────────────────────────
const dialogueSchema = z.object({
    speaker: z.string().trim().min(1),
    text: z.string().trim().min(1).max(60),
    // round=dialogue bubble, spike=shout spike, cloud=thought cloud, caption=narration rectangle
    bubbleType: z.enum(["round", "spike", "cloud", "caption"]).default("round"),
    // 3x3 grid + direction, e.g. top-left / bottom-center / right-center
    anchorHint: z.string().trim().optional(),
});
const characterExpressionSchema = z.enum(["neutral", "happy", "angry", "sad", "surprised", "cold"]);
const panelCharacterRefSchema = z.object({
    name: z.string().trim().min(1),
    // Costume: default, or a costume name from the asset library (e.g. "Battle Suit")
    costume: z.string().trim().max(60).default("default"),
    expression: characterExpressionSchema.default("neutral"),
    lighting: z.string().trim().max(40).optional(),
    // Names of props/weapons this panel's character holds or uses (from the character asset library)
    props: z.array(z.string().trim().max(60)).max(4).optional(),
});
// Scene Bible: scenes identified in this episode, reused across panels/episodes to lock spatial consistency
const sceneSchema = z.object({
    name: z.string().trim().min(1).max(60),
    sceneType: z.enum(["interior", "exterior", "landscape", "abstract", "other"]).default("interior"),
    palette: z.string().trim().max(120),
    keyElements: z.string().trim().max(200),
    materials: z.string().trim().max(120).optional(),
    ambiance: z.string().trim().max(120).optional(),
    layout: z.string().trim().max(160).optional(),
});
const panelScriptSchema = z.object({
    order: z.number().int().min(1),
    panelType: z.enum(["establishing", "close_up", "action", "reaction", "transition"]),
    densityLevel: z.enum(["low", "medium", "high"]).default("medium"),
    focus: z.string().trim().min(1).max(120),
    action: z.string().trim().min(1).max(200),
    // Scene name for this panel; must come from the scenes list
    sceneRef: z.string().trim().max(60).optional(),
    dialogues: z.array(dialogueSchema).max(3).default([]),
    characterRefs: z.array(panelCharacterRefSchema).max(5).default([]),
    // Image-model visual prompt (no bubble text)
    visualPrompt: z.string().trim().min(1).max(400),
    layoutData: z
        .object({
        layout: z.enum(["single", "four_koma"]).default("single"),
        subPanels: z
            .array(z.object({
            order: z.number().int().min(1).max(4),
            beat: z.enum(["from", "inherit", "turn", "combine"]),
            visualPrompt: z.string().trim().min(1).max(180),
        }))
            .max(4)
            .optional(),
    })
        .optional(),
});
export const comicPanelScriptOutputSchema = z.object({
    // Identify this episode's scenes (scene bible) first, then split into panels
    scenes: z.array(sceneSchema).max(8).default([]),
    panels: z.array(panelScriptSchema).min(10).max(80),
});
export type ComicPanelScriptOutput = z.infer<typeof comicPanelScriptOutputSchema>;
export interface ComicPanelScriptPromptInput {
    projectTitle: string;
    episodeOrder: number;
    episodeTitle: string;
    episodeSynopsis: string;
    sourceText?: string;
    characters: Array<{
        name: string;
        visualAnchor?: string | null;
    }>;
    /** Optional visual assets per character, for the LLM to pick from while boarding panels */
    characterAssets?: Array<{
        characterName: string;
        assetType: string;
        name: string;
        description?: string;
    }>;
    /** Scenes already in the project (cross-episode reuse: if this episode uses the same location, keep the same name; do not create a new one) */
    existingScenes?: Array<{
        name: string;
        sceneType: string;
        summary?: string;
    }>;
    stylePreset?: string;
    /** stylePreset.promptKeywords, injected as a prefix on every panel visualPrompt to lock art style */
    stylePromptKeywords?: string;
    /** stylePreset.format, affects visualPrompt structure (4koma must explicitly describe 4 sub-panels) */
    comicFormat?: string;
    /** Cross-episode continuity facts */
    factDigest?: string;
    /** Panel information density: relaxed, balanced, or compact */
    densityMode?: "relaxed" | "balanced" | "compact";
    /** Extra panel-script preferences for this request; may only affect expression, not structured-output rules */
    scriptPromptInstruction?: string;
    targetPanelCount?: number;
}
export const comicPanelScriptPrompt: PromptAsset<ComicPanelScriptPromptInput, ComicPanelScriptOutput> = {
    id: "comic.panelScript",
    version: "v2",
    taskType: "chapter_drafting",
    mode: "structured",
    language: "ka",
    contextPolicy: { maxTokensBudget: 9000 },
    outputSchema: comicPanelScriptOutputSchema,
    render(input) {
        const panelTarget = input.targetPanelCount ?? 45;
        const characterList = input.characters
            .map((c) => `- ${c.name}：${c.visualAnchor ?? "(No visual description yet)"}`)
            .join("\n");
        // Character-assets list: grouped by character so the LLM can see who has what
        const assetsByChar = new Map<string, typeof input.characterAssets>();
        for (const asset of input.characterAssets ?? []) {
            if (!assetsByChar.has(asset.characterName))
                assetsByChar.set(asset.characterName, []);
            assetsByChar.get(asset.characterName)!.push(asset);
        }
        const assetSection = assetsByChar.size > 0
            ? Array.from(assetsByChar.entries()).map(([charName, assets]) => {
                const lines = assets!.map((a) => {
                    const desc = a.description ? `（${a.description}）` : "";
                    return `  - [${a.assetType}] ${a.name}${desc}`;
                });
                return `${charName}：\n${lines.join("\n")}`;
            }).join("\n")
            : null;
        const stylePrefix = input.stylePromptKeywords
            ?? (input.stylePreset ? `${input.stylePreset} style` : "webtoon style, vibrant colors, clean lines");
        // Existing scene list (cross-episode reuse: same location keeps the same name)
        const existingSceneSection = (input.existingScenes?.length ?? 0) > 0
            ? input.existingScenes!
                .map((s) => `- ${s.name}（${s.sceneType}）${s.summary ? `：${s.summary}` : ""}`)
                .join("\n")
            : null;
        const is4koma = input.comicFormat === "4koma";
        const densityMode = input.densityMode ?? "balanced";
        const densityRuleMap: Record<NonNullable<ComicPanelScriptPromptInput["densityMode"]>, string> = {
            relaxed: "Information Density Mode: Stretch. Prioritize emotional reactions, single actions and clear blank spaces; use only 1 visual focus, 0-1 lines of dialogue, 1-2 characters in most cells, and use less complex backgrounds. Arrange a low-density mood buffer every 5-8 cells.",
            balanced: "Information Density Pattern: Equilibrium. Most cells carry 1 action or emotional transition, 1-2 characters, 1-2 lines of dialogue; key conflict cells can increase the number of backgrounds and characters, but don't pile them up continuously.",
            compact: "Information Density Mode: Compact. Allows more plot advancement and information in the same frame, but each grid can still only have one main visual focus; high-density grids can have up to 3 lines of dialogue and 2-4 characters, and avoid more than 3 high-density grids appearing continuously.",
        };
        const visualPromptRule = is4koma
            ? `9. visualPrompt must be prefixed with style "${stylePrefix}\u201D, and then explicitly describe the content of each subgrid according to the four-grid structure, the format is:
   Panel1:[Start] <Screen content>. Panel2:[Continue] <Screen content>. Panel3:[Transfer] <Screen content>. Panel4:[Close] <Screen content>.
   Each frame is described independently, and the shots/emotions/content must be obviously different. Do not repeat similar scenes. The total amount of information in the four grids is >3 times that of a single grid.`
            : `9. visualPrompt must be prefixed with a fixed style "${stylePrefix}\u201D at the beginning, and then describe the content of the picture (characters, costumes, expressions, scenes, composition), without bubble text`;
        return [
            new SystemMessage(`You are a senior comic storyboard artist, specializing in vertical screen comics/comics (webtoon form).
Responsibility: First identify the scene of this chapter (scene bible), and then split the outline into ${panelTarget} frame-by-frame storyboard script.

[Step 1: Identify scenes] (up to 8)
- Each scene is given: name (location name), sceneType (interior/exterior/landscape/abstract/other), palette (main color palette), keyElements (marker/furniture/terrain), optional materials (material)/ambiance (lighting atmosphere)/layout (space structure)
- Continuous spaces (such as "outside of the bamboo forest \u2192 deep in the bamboo forest") should be classified into the same scene as much as possible to avoid fragmentation caused by one scene per grid
- If "the project already has a scene" is provided, the exact same name must be used when the same place appears in this episode, and do not create a new synonymous name

[Step 2: Panel-by-frame splitting], each sceneRef must be taken from a name in the scenes list above
Rules:
1. Each frame only focuses on one action/emotion, and the lens language is diverse (establishing/close_up/action/reaction/transition)
2. Each bubble of dialogue should be \u226430 words, with a maximum of 3 bubbles per box; use cloud bubbles for thinking content and caption for narration.
2b. The dialogues[].text field can only contain the text of the dialogue itself. Do not add "XX said", "XX Dao", speaker's name, colon, quotation marks or any narrative prefix. The speaker is filled in the speaker field, and the bubble ownership is automatically determined by the speaker.
3. anchorHint specifies the bubble position (top-left/top-right/bottom-center, etc.) to avoid the main body
4. characterRefs must be an object array: { name, costume, expression, lighting?, props? }
5. Expression can only be neutral/happy/angry/sad/surprised/cold; choose according to the dialogue mood, action and shot purpose of the frame, do not rely on fixed words to replace
6. Costume defaults to "default"; when there is a clear costume switch in the plot, fill in the name of the corresponding costume in the character asset library (such as "Battle Suit")
6b. props is an array of props/weapon names held/used by the character in this grid, which must come from the character asset library; if none, omit
7. densityLevel must be low/medium/high: low=emotional response or blank space, medium=regular advancement, high=scene explanation/conflict outbreak/multiple people in the same frame
8. Focus Use one sentence to describe the main visual focus of the grid. Do not write a general summary.
${visualPromptRule}
10. ${densityRuleMap[densityMode]}
11. Painting style:${input.stylePreset ?? "Colorful Korean comics"}`),
            new HumanMessage(`Comic project:${input.projectTitle}
This chapter: Chapter ${input.episodeOrder} Words "${input.episodeTitle}\u300B

## Plot outline of this chapter
${input.episodeSynopsis}

${input.sourceText ? `## Original text of this episode (source of dialogue)
${input.sourceText.slice(0, 3000)}\n` : ""}
## Appearance role
${characterList}

${assetSection ? `## Character available assets (clothing/weapons/props, etc.)
Reference in characterRefs according to plot needs: costume fills in the costume name, props fills in the prop/weapon name list
${assetSection}\n` : ""}${existingSceneSection ? `## The project already has a scene (please use the same name for the same location, do not create a new synonymous name)
${existingSceneSection}\n` : ""}${input.factDigest ? `## Cross-language consistency facts (please strictly abide by them)
${input.factDigest}\n` : ""}
${input.scriptPromptInstruction ? `## Supplementary requirements for this division
${input.scriptPromptInstruction}\n` : ""}
## Task
First identify the scenes of this story (\u22648), and then generate the approximate ${panelTarget} The complete grid script for the grid, returning { scenes, panels }.
Each panel contains: order/panelType/densityLevel/focus/action/sceneRef/dialogues/characterRefs/visualPrompt/layoutData.
scenes example: [{ "name": "Zongmen Hall", "sceneType": "interior", "palette": "Dark gold and vermilion", "keyElements": "Pailing dragon stone pillar, hanging plaque, bronze incense burner", "ambiance": "Dark candlelight", "layout": "Symmetrical depth, high platform in the center" }].
characterRefs example: [{ "name": "Shen Jianxin", "costume": "Battle Suit", "expression": "cold", "lighting": "side_lit", "props": ["Moonlight Sword"] }].
Example of layoutData in four-panel mode: { "layout": "four_koma", "subPanels": [{ "order": 1, "beat": "start", "visualPrompt": "..." }] }.
Keep the plot coherent, the shots rich in language, the dialogue concise, and the last frame left in suspense.`),
        ];
    }
};
// ─── Appearance-anchor AI rewrite ─────────────────────────────────────────────────────────
// Used on the character tab for AI-assisted visualAnchor optimization: remove internal contradictions, apply user tweaks, keep character highlights.
export const comicVisualAnchorRewriteOutputSchema = z.object({
    /** Rewritten primary appearance description */
    appearance: z.string().trim().min(10).max(2000),
    /** Optional: a suggested "face-shape override" fragment (when the user request conflicts with the current description in a way that is hard to reconcile) */
    faceShapeOverride: z.string().trim().max(500).optional(),
    /** Short user-facing revision rationale in Georgian (1-3 sentences). */
    rationale: z.string().trim().min(1).max(300),
});
export type ComicVisualAnchorRewriteOutput = z.infer<typeof comicVisualAnchorRewriteOutputSchema>;
export interface ComicVisualAnchorRewriteInput {
    characterName: string;
    persona?: string | null;
    /** Current primary appearance */
    currentAppearance: string;
    /** Current face-shape override, if any (may be empty) */
    currentFaceShapeOverride?: string;
    /** User rewrite request (may be empty → only remove contradictions) */
    userInstruction?: string;
}
export const comicVisualAnchorRewritePrompt: PromptAsset<ComicVisualAnchorRewriteInput, ComicVisualAnchorRewriteOutput> = {
    id: "comic.visualAnchorRewrite",
    version: "v2",
    taskType: "chapter_drafting",
    mode: "structured",
    language: "ka",
    contextPolicy: { maxTokensBudget: 2500 },
    outputSchema: comicVisualAnchorRewriteOutputSchema,
    render(input) {
        return [
            new SystemMessage(`You are a comic character design optimizer. Task: Rewrite the character's "Appearance Anchor" text to make it more controllable and less prone to internal contradictions when fed into the image generation model.

[hard rules]
1. Keep the character\u2019s iconic personality highlights (signature features, scars, accessories, temperament, atmosphere, etc.), and only modify the specific facial features/face description that conflicts with user expectations.
2. Prioritize the use of specific and visual bone-level words (face shape/eye shape/brow bone/nose shape/mouth shape/age group/body type) and avoid general atmosphere words
3. For image-provider compatibility, mix Georgian and English keywords where useful; important appearance traits may include standard English anatomy terms
4. The output appearance is a complete description that can be used independently, about 60-250 words, natural sentences rather than keyword stacking
5. If there is a serious conflict between the user's expectation and the original description (such as the original "features as sharp as a knife" vs the user's desire for a "round face"), there are two solutions:
   a. Priority solution: **directly rewrite the contradictory word** in appearance** (recommended, cleanest)
   b. Alternative: When contradictory words form the key to the character (such as the villain's fierce eyes), retain the "sharpness" of the eyes/temperament, but change the "face shape/mandibular/cheekbones" to user expectations, and output additional face-shape-stressed fragments in faceShapeOverride
6. rationale uses 1-3 Georgian sentences to explain what changed and why; do not repeat the original text`),
            new HumanMessage(`Role:${input.characterName}${input.persona ? `(Character:${input.persona}）` : ""}

## Current main appearance (to be optimized)
${input.currentAppearance || "(None yet)"}

${input.currentFaceShapeOverride ? `## Strong coverage of current face shape
${input.currentFaceShapeOverride}\n` : ""}
## User expectations
${input.userInstruction?.trim() || "(No specific expectations, please detect and eliminate internal contradictory words and optimize according to the above rules)"}

## Task
Return { appearance, faceShapeOverride?, rationale }.`),
        ];
    }
};

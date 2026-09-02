import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { z } from "zod";
import type { PromptAsset } from "../../core/promptTypes";
// ─── 分话规划 ───────────────────────────────────────────────────────────────
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
// ─── 分格脚本生成 ──────────────────────────────────────────────────────────
const dialogueSchema = z.object({
    speaker: z.string().trim().min(1),
    text: z.string().trim().min(1).max(60),
    // round=对白圆泡 spike=呐喊刺泡 cloud=思维云泡 caption=旁白矩形
    bubbleType: z.enum(["round", "spike", "cloud", "caption"]).default("round"),
    // 九宫格 + 方向，如 top-left / bottom-center / right-center
    anchorHint: z.string().trim().optional(),
});
const characterExpressionSchema = z.enum(["neutral", "happy", "angry", "sad", "surprised", "cold"]);
const panelCharacterRefSchema = z.object({
    name: z.string().trim().min(1),
    // 服装：default 或资产库中的服装名（如"战斗套装"）
    costume: z.string().trim().max(60).default("default"),
    expression: characterExpressionSchema.default("neutral"),
    lighting: z.string().trim().max(40).optional(),
    // 该格角色持有/使用的道具/武器等资产名列表（来自角色资产库）
    props: z.array(z.string().trim().max(60)).max(4).optional(),
});
// 场景圣经：本话识别出的场景，跨格/跨话复用以锁定空间一致性
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
    // 本格所属场景名，必须取自 scenes 清单
    sceneRef: z.string().trim().max(60).optional(),
    dialogues: z.array(dialogueSchema).max(3).default([]),
    characterRefs: z.array(panelCharacterRefSchema).max(5).default([]),
    // 发给图像模型的画面提示词（不含气泡文字）
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
    // 先识别本话场景（场景圣经），再分格
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
    /** 每个角色拥有的可选视觉资产，供 LLM 在分格时按情节选用 */
    characterAssets?: Array<{
        characterName: string;
        assetType: string;
        name: string;
        description?: string;
    }>;
    /** 项目中已存在的场景（跨话复用：本话出现同一地点时直接沿用同名，不要新建） */
    existingScenes?: Array<{
        name: string;
        sceneType: string;
        summary?: string;
    }>;
    stylePreset?: string;
    /** stylePreset.promptKeywords，注入每格 visualPrompt 前缀以锁定画风 */
    stylePromptKeywords?: string;
    /** stylePreset.format，影响 visualPrompt 结构（4koma 需显式描述4子格） */
    comicFormat?: string;
    /** 跨话一致性事实 */
    factDigest?: string;
    /** 分格信息密度：relaxed=舒展，balanced=均衡，compact=紧凑 */
    densityMode?: "relaxed" | "balanced" | "compact";
    /** 用户本次补充的分格要求，只能影响表达偏好，不得覆盖结构化输出规则 */
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
        // 角色资产清单：按角色分组，方便 LLM 理解"谁有什么"
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
        // 已有场景清单（跨话复用：同地点沿用同名）
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
// ─── 外貌锚点 AI 重写 ─────────────────────────────────────────────────────────
// 用于在角色 tab 由 AI 协助优化 visualAnchor：去除内部矛盾词、按用户期望微调、保留人设亮点。
export const comicVisualAnchorRewriteOutputSchema = z.object({
    /** 重写后的主外貌描述 */
    appearance: z.string().trim().min(10).max(2000),
    /** 可选：建议的"脸型强覆盖"片段（当用户要求与现有描述存在难以调和的冲突时） */
    faceShapeOverride: z.string().trim().max(500).optional(),
    /** Short user-facing revision rationale in Georgian (1-3 sentences). */
    rationale: z.string().trim().min(1).max(300),
});
export type ComicVisualAnchorRewriteOutput = z.infer<typeof comicVisualAnchorRewriteOutputSchema>;
export interface ComicVisualAnchorRewriteInput {
    characterName: string;
    persona?: string | null;
    /** 当前主外貌 */
    currentAppearance: string;
    /** 当前已有的脸型强覆盖（可空） */
    currentFaceShapeOverride?: string;
    /** 用户的改写期望（可空 → 仅做矛盾去重） */
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

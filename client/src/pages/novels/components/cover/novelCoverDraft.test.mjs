import test from "node:test";
import assert from "node:assert/strict";
import {
  buildNovelCoverDraftContext,
  buildNovelCoverDraftSourcePrompt,
} from "./novelCoverDraft.ts";

const baseBasicForm = {
  title: "雾港审判局",
  description: "黑雾侵城后，主角被迫成为审判者。",
  targetAudience: "喜欢都市悬疑和高压追更感的读者",
  bookSellingPoint: "审判升级与迷雾悬案并行",
  competingFeel: "冷峻、压迫、强悬念",
  first30ChapterPromise: "前 30 章先破第一案，再掀开黑雾交易链",
  commercialTagsText: "强冲突，都市奇诡，强冲突，持续追更",
  genreId: "genre-urban",
  primaryStoryModeId: "mode-judge",
  secondaryStoryModeId: "mode-case",
  worldId: "world-fog",
  status: "draft",
  writingMode: "original",
  projectMode: "co_pilot",
  narrativePov: "third_person",
  pacePreference: "fast",
  styleTone: "冷峻克制",
  emotionIntensity: "high",
  aiFreedom: "medium",
  postGenerationStyleReviewEnabled: true,
  defaultChapterLength: 2800,
  estimatedChapterCount: 80,
  projectStatus: "not_started",
  storylineStatus: "not_started",
  outlineStatus: "not_started",
  resourceReadyScore: 20,
  continuationSourceType: "novel",
  sourceNovelId: "",
  sourceKnowledgeDocumentId: "",
  continuationBookAnalysisId: "",
  continuationBookAnalysisSections: [],
};

test("novel cover draft context reuses basic info and world slice labels", () => {
  const context = buildNovelCoverDraftContext({
    basicForm: baseBasicForm,
    genreOptions: [{ id: "genre-urban", label: "Urban superpower", path: "Urban / urban superpower" }],
    storyModeOptions: [
      { id: "mode-judge", name: "Judgment-escalation flow", label: "Judgment-escalation flow", path: "Power fantasy / judgment-escalation" },
      { id: "mode-case", name: "Cold-case pursuit flow", label: "Cold-case pursuit flow", path: "Mystery / cold-case pursuit" },
    ],
    worldOptions: [{ id: "world-fog", name: "雾港" }],
    worldSliceView: {
      hasWorld: true,
      worldId: "world-fog",
      worldName: "雾港",
      slice: {
        coreWorldFrame: "高压雾港里，审判机构与地下交易同时运作。",
      },
      overrides: {},
      availableRules: [],
      availableForces: [],
      availableLocations: [],
      storyInputSource: "story_macro",
      isStale: false,
    },
  });

  assert.equal(context.title, "雾港审判局");
  assert.deepEqual(context.commercialTags, ["强冲突", "都市奇诡", "持续追更"]);
  assert.equal(context.genreLabel, "Urban / urban superpower");
  assert.equal(context.primaryStoryModeLabel, "Power fantasy / judgment-escalation");
  assert.equal(context.secondaryStoryModeLabel, "Mystery / cold-case pursuit");
  assert.equal(context.worldSummary, "高压雾港里，审判机构与地下交易同时运作。");
  assert.equal(context.narrativePovLabel, "third person");
  assert.equal(context.pacePreferenceLabel, "fast paced");
  assert.equal(context.emotionIntensityLabel, "high emotional concentration");
});

test("novel cover draft source prompt includes beginner-facing cover cues", () => {
  const prompt = buildNovelCoverDraftSourcePrompt({
    basicForm: baseBasicForm,
    genreOptions: [{ id: "genre-urban", label: "Urban superpower", path: "Urban / urban superpower" }],
    storyModeOptions: [
      { id: "mode-judge", name: "Judgment-escalation flow", label: "Judgment-escalation flow", path: "Power fantasy / judgment-escalation" },
      { id: "mode-case", name: "Cold-case pursuit flow", label: "Cold-case pursuit flow", path: "Mystery / cold-case pursuit" },
    ],
    worldOptions: [{ id: "world-fog", name: "雾港" }],
    worldSliceView: {
      hasWorld: true,
      worldId: "world-fog",
      worldName: "雾港",
      slice: {
        coreWorldFrame: "高压雾港里，审判机构与地下交易同时运作。",
      },
      overrides: {},
      availableRules: [],
      availableForces: [],
      availableLocations: [],
      storyInputSource: "story_macro",
      isStale: false,
    },
  });

  assert.match(prompt, /Primary fiction-cover artwork for 雾港审判局/);
  assert.match(prompt, /Target audience: 喜欢都市悬疑和高压追更感的读者/);
  assert.match(prompt, /Story tags: 强冲突, 都市奇诡, 持续追更/);
  assert.match(prompt, /World atmosphere: 高压雾港里，审判机构与地下交易同时运作。/);
  assert.match(prompt, /Cover goal: emphasize the story's strongest visual promise.*exact Georgian title “雾港审判局”/);
});

const test = require("node:test");
const assert = require("node:assert/strict");

const { SystemMessage } = require("@langchain/core/messages");
const {
  CONTENT_LANGUAGE,
  CONTENT_LOCALE,
  GEORGIAN_CONTENT_POLICY_VERSION,
  applyContentLanguagePolicy,
} = require("../dist/prompting/core/contentLanguagePolicy.js");
const { preparePromptExecution } = require("../dist/prompting/core/promptRunner.js");
const { listRegisteredPromptAssets } = require("../dist/prompting/registry.js");
const { titleGenerationPrompt } = require("../dist/prompting/prompts/helper/titleGeneration.prompt.js");

test("Georgian content policy exposes the locked locale and injects before active prompt messages", () => {
  assert.equal(CONTENT_LANGUAGE, "ka");
  assert.equal(CONTENT_LOCALE, "ka-GE");
  assert.equal(GEORGIAN_CONTENT_POLICY_VERSION, "ka-GE@1");

  const prepared = preparePromptExecution({
    asset: titleGenerationPrompt,
    promptInput: {
      context: {
        mode: "brief",
        selectionMode: "pool",
        count: 3,
        novelTitle: "",
        currentTitle: "",
        genreName: "Mystery",
        genreDescription: "A closed-room mystery in Tbilisi.",
        brief: "A restorer finds a message hidden beneath an old fresco.",
        referenceTitle: "",
      },
      forceJson: true,
      retryReason: null,
    },
  });
  const policy = String(prepared.messages[0].content);
  assert.match(policy, /\[content-language:ka-GE@1\]/);
  assert.match(policy, /natural Georgian using the Mkhedruli script/);
  assert.match(policy, /correct case marking, agreement, postpositions, and verb forms/);
  assert.match(policy, /Keep JSON property names, schema keys, IDs, enum values/);
  assert.match(policy, /English image-provider prompt/);
});

test("all active registered creative prompt families use Georgian metadata", () => {
  const assets = listRegisteredPromptAssets();
  assert.ok(assets.length >= 100);
  const requiredFamilies = [
    "creation.", "novel.director.", "novel.volume.", "novel.chapter.",
    "novel.short_story.", "character.", "world.", "style.", "title.",
    "bookAnalysis.", "rag.", "comic.", "drama.",
  ];
  for (const family of requiredFamilies) {
    assert.ok(assets.some((asset) => asset.id.startsWith(family)), `missing representative ${family} prompt family`);
  }
  for (const asset of assets) {
    assert.equal(asset.language, asset.id.startsWith("market_radar.") ? "zh" : "ka", asset.id);
  }
});

test("non-Georgian technical prompt metadata does not receive the creative language policy", () => {
  const technicalAsset = { language: "en" };
  const messages = [new SystemMessage("Return a provider-specific technical payload.")];
  assert.equal(applyContentLanguagePolicy(technicalAsset, messages), messages);
});

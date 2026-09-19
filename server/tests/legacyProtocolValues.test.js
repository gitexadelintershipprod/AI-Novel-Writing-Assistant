const test = require("node:test");
const assert = require("node:assert/strict");
const {
  canonicalizeBeatRoleLabel,
  canonicalizeGrowthStage,
  canonicalizeStoryFunction,
  canonicalizeWorldType,
  isPlaceholderThreadTitle,
  rewriteExactProtocolString,
} = require("../../shared/dist/types/legacyProtocolValues.js");

test("legacy protocol map dual-reads Chinese and writes English", () => {
  assert.equal(canonicalizeStoryFunction("主角"), "protagonist");
  assert.equal(canonicalizeStoryFunction("protagonist"), "protagonist");
  assert.equal(canonicalizeGrowthStage("起点"), "origin");
  assert.equal(canonicalizeWorldType("东方玄幻"), "Oriental fantasy");
  assert.equal(canonicalizeBeatRoleLabel("开卷抓手"), "Opening hook");
  assert.equal(isPlaceholderThreadTitle("新对话"), true);
  assert.equal(isPlaceholderThreadTitle("New thread"), true);
  assert.equal(rewriteExactProtocolString("第3卷定位"), "Volume 3 role");
  assert.equal(rewriteExactProtocolString("第2卷"), "Volume 2");
});

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

test("protocol values accept English stored values only", () => {
  assert.equal(canonicalizeStoryFunction("protagonist"), "protagonist");
  assert.equal(canonicalizeGrowthStage("origin"), "origin");
  assert.equal(canonicalizeWorldType("Oriental fantasy"), "Oriental fantasy");
  assert.equal(canonicalizeBeatRoleLabel("Opening hook"), "Opening hook");
  assert.equal(isPlaceholderThreadTitle("New thread"), true);
  assert.equal(isPlaceholderThreadTitle("new conversation"), true);
  assert.equal(rewriteExactProtocolString("Opening hook"), "Opening hook");
  assert.equal(rewriteExactProtocolString("Volume 3 role"), "Volume 3 role");
});

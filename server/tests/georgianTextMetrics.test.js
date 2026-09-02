const test = require("node:test");
const assert = require("node:assert/strict");

const {
  countGeorgianWords,
  countUnicodeCodePoints,
  estimateGeorgianOutputTokens,
  normalizeGeorgianText,
  tokenizeGeorgianWords,
} = require("@ai-novel/shared/utils/georgianTextMetrics");

test("Georgian word counting ignores punctuation and whitespace", () => {
  assert.equal(countGeorgianWords("გამარჯობა, სამყარო!\nეს ტესტია."), 4);
});

test("Georgian word counting preserves hyphenated and apostrophe forms", () => {
  assert.deepEqual(tokenizeGeorgianWords("ქართულ-ინგლისური დ'არტანიანი"), ["ქართულ-ინგლისური", "დ'არტანიანი"]);
  assert.equal(countGeorgianWords("ქართულ-ინგლისური დ'არტანიანი"), 2);
});

test("Georgian text is normalized to NFC before counting", () => {
  const decomposed = "e\u0301";
  assert.equal(normalizeGeorgianText(decomposed), "é");
  assert.equal(countGeorgianWords(`${decomposed} სიტყვა`), 2);
});

test("Unicode code point count does not count surrogate pairs twice", () => {
  assert.equal(countUnicodeCodePoints("ა🙂ბ"), 3);
});

test("output token estimate applies safety margin and provider cap", () => {
  assert.equal(estimateGeorgianOutputTokens(1_000), 2_712);
  assert.equal(estimateGeorgianOutputTokens(1_000, 2_000), 2_000);
});

const test = require("node:test");
const assert = require("node:assert/strict");

const {
  resolveEmbeddingChunkTokenBudget,
} = require("../dist/services/rag/embeddingModelLimits.js");
const {
  estimateTokenCount,
} = require("../dist/services/rag/utils.js");
const {
  splitRagChunks,
  tokenizeRagWords,
} = require("../dist/services/rag/chunking.js");

test("embedding model limits expose the siliconflow bge-large-v1.5 input cap", () => {
  const { resolveEmbeddingInputTokenLimit } = require("../dist/services/rag/embeddingModelLimits.js");
  assert.equal(resolveEmbeddingInputTokenLimit("siliconflow", "BAAI/bge-large-zh-v1.5"), 512);
  assert.equal(resolveEmbeddingChunkTokenBudget("siliconflow", "BAAI/bge-large-zh-v1.5"), 435);
  assert.equal(resolveEmbeddingInputTokenLimit("openai", "text-embedding-3-small"), null);
});

test("estimateTokenCount keeps chinese-heavy text close to one token per char", () => {
  assert.equal(estimateTokenCount("深宫夜雨"), 4);
  assert.equal(estimateTokenCount("hello world"), 3);
});

test("splitRagChunks keeps long chinese chunks under the embedding token budget", () => {
  const source = "深宫夜雨，长灯未熄，旧怨与新局同时压来。".repeat(80);
  const maxTokens = resolveEmbeddingChunkTokenBudget("siliconflow", "BAAI/bge-large-zh-v1.5");
  const chunks = splitRagChunks(source, 320, 40, { maxTokens });

  assert.equal(chunks.length > 1, true);
  assert.equal(chunks.every((chunk) => estimateTokenCount(chunk) <= maxTokens), true);
});

test("splitRagChunks uses English periods as sentence boundaries and does not cut words", () => {
  const source = Array.from({ length: 40 }, (_, index) => `The closed palace still waited for morning number ${index + 1}.`).join(" ");
  const chunks = splitRagChunks(source, 24, 6);
  const allowedWords = new Set(tokenizeRagWords(source));

  assert.equal(chunks.length > 1, true);
  assert.equal(chunks.every((chunk) => chunk.includes("palace")), true);
  assert.equal(
    chunks.every((chunk) => tokenizeRagWords(chunk).every((word) => allowedWords.has(word))),
    true,
  );
  assert.equal(chunks.some((chunk) => /morning number \d+\. The closed/.test(chunk)), true);
});

test("splitRagChunks keeps Georgian words whole", () => {
  const source = Array.from({ length: 30 }, () => "მეფემ კარი გახსნა. დედოფალი შიგნით შევიდა.").join(" ");
  const chunks = splitRagChunks(source, 16, 4);

  assert.equal(chunks.length > 1, true);
  assert.equal(chunks.every((chunk) => !chunk.includes("კარიგახსნა")), true);
  assert.equal(chunks.every((chunk) => chunk.includes("მეფემ") || chunk.includes("დედოფალი")), true);
});

#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");
const { ROOT, scanGeorgianContent } = require("./georgian-content-audit.cjs");

const allowlistPath = path.join(ROOT, "config/georgian-content-allowlist.json");

function entryKey(entry) {
  return `${entry.path}\u0000${entry.text}\u0000${entry.category}\u0000${entry.reason}`;
}

function fail(message, details = []) {
  console.error(`Georgian content check failed: ${message}`);
  details.slice(0, 40).forEach((detail) => console.error(`  ${detail}`));
  if (details.length > 40) console.error(`  ...and ${details.length - 40} more`);
  process.exitCode = 1;
}

if (!fs.existsSync(allowlistPath)) {
  fail("config/georgian-content-allowlist.json is missing.");
  process.exit();
}

const allowlist = JSON.parse(fs.readFileSync(allowlistPath, "utf8"));
const expected = new Set((allowlist.entries ?? []).map(entryKey));
const scan = scanGeorgianContent();
const actualEntries = [];

for (const result of scan) {
  for (const text of result.hanStrings) {
    const allowed = (allowlist.entries ?? []).find((entry) => entry.path === result.path && entry.text === text);
    if (allowed) actualEntries.push(allowed);
    else actualEntries.push({ path: result.path, text, category: "unclassified", reason: "unclassified" });
  }
}

const actual = new Set(actualEntries.filter((entry) => entry.category !== "unclassified").map(entryKey));
const unclassified = actualEntries.filter((entry) => entry.category === "unclassified");
const stale = (allowlist.entries ?? []).filter((entry) => !actual.has(entryKey(entry)));
if (unclassified.length) {
  fail("active content sources contain unclassified Han text.", unclassified.map((entry) => `${entry.path}: ${entry.text}`));
}
if (stale.length) {
  fail("the Georgian content allowlist contains stale entries.", stale.map((entry) => `${entry.path}: ${entry.text}`));
}

const invalidSemanticRequests = scan.flatMap((result) =>
  result.path.includes("/marketRadar/")
    ? []
    : result.semanticViolations.map((text) => `${result.path}: ${text}`),
);
if (invalidSemanticRequests.length) {
  fail("active content instructions still request Chinese output or Chinese-character length semantics.", invalidSemanticRequests);
}

const assets = scan.flatMap((result) => result.promptAssets.map((asset) => ({ ...asset, path: result.path })));
if (assets.length < 100) {
  fail(`only ${assets.length} PromptAssets were discovered; the metadata scan is incomplete.`);
}
const invalidLanguages = assets.filter((asset) =>
  asset.path.includes("/marketRadar/")
    ? asset.language !== "zh"
    : asset.language !== "ka",
);
if (invalidLanguages.length) {
  fail("PromptAsset language metadata violates the ka/disabled-Market-Radar policy.", invalidLanguages.map((asset) => `${asset.id}: ${asset.language} (${asset.path})`));
}

const requiredSourceChecks = [
  ["server/src/prompting/core/contentLanguagePolicy.ts", 'CONTENT_LOCALE = "ka-GE"'],
  ["server/src/services/bootstrap/SystemResourceBootstrapService.ts", 'CREATIVE_SEED_PROFILE_VERSION = "ka-GE@1"'],
  ["shared/utils/georgianTextMetrics.ts", "new Intl.Segmenter(GEORGIAN_CONTENT_LOCALE"],
  ["server/src/services/novel/chapterWritingGraph.ts", "countGeorgianWords"],
  ["server/src/services/novel/runtime/ChapterAcceptanceAssessmentService.ts", "countGeorgianWords"],
  ["server/src/modules/novel/short-story/application/ShortStoryProductionService.ts", "estimateGeorgianOutputTokens"],
];
for (const [relativePath, requiredText] of requiredSourceChecks) {
  const source = fs.readFileSync(path.join(ROOT, relativePath), "utf8");
  if (!source.includes(requiredText)) fail(`${relativePath} must contain ${requiredText}.`);
}

if (!process.exitCode) {
  console.log(`Georgian content check passed (${assets.length} PromptAssets; ${actualEntries.length} classified Han strings).`);
}

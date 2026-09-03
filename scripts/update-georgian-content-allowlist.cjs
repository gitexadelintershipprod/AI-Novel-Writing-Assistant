#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");
const { ROOT, scanGeorgianContent } = require("./georgian-content-audit.cjs");

function classify(relativePath) {
  if (relativePath.includes("/prompting/prompts/marketRadar/")) {
    return {
      category: "disabled-market-radar-source",
      reason: "Market Radar is disabled by both client and server flags; its source-specific Chinese assets are retained for future replacement.",
    };
  }
  if ([
    "server/src/prompting/prompts/novel/timelineExtractor.prompts.ts",
    "server/src/prompting/prompts/novel/chapterEditor/workspaceDiagnosis.promptSchemas.ts",
    "server/src/prompting/prompts/novel/chapterLayeredContextShared.ts",
    "server/src/prompting/prompts/novel/volume/chapterDetail.prompts.ts",
  ].includes(relativePath)) {
    return {
      category: "legacy-compatibility-alias",
      reason: "Input-only aliases preserve compatibility with legacy Chinese persisted values; generated output and active instructions remain Georgian.",
    };
  }
  throw new Error(`Refusing to auto-classify active Han text in ${relativePath}.`);
}

const entries = [];
for (const result of scanGeorgianContent()) {
  if (!result.hanStrings.length) continue;
  const classification = classify(result.path);
  for (const text of result.hanStrings) {
    entries.push({ path: result.path, text, ...classification });
  }
}

entries.sort((left, right) => left.path.localeCompare(right.path) || left.text.localeCompare(right.text));
const outputPath = path.join(ROOT, "config/georgian-content-allowlist.json");
const payload = {
  policy: "Every Han-containing active content literal requires an exact path, text, category, and reason entry.",
  entries,
};
fs.writeFileSync(outputPath, `${JSON.stringify(payload, null, 2)}\n`);
console.log(`Wrote ${entries.length} narrowly classified entries to config/georgian-content-allowlist.json.`);

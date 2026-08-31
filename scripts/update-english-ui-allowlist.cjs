#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");
const { ROOT, scanHanLines } = require("./english-ui-audit.cjs");

const outputPath = path.join(ROOT, "config/english-ui-allowlist.json");
const payload = {
  generatedFrom: "2b9c429830ce07ce76aadd92d7534caafec2b48e",
  policy: "Every retained Han-containing source line requires an exact path, text, and reason entry.",
  entries: scanHanLines(),
};

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, `${JSON.stringify(payload, null, 2)}\n`);
console.log(`Wrote ${payload.entries.length} classified entries to ${path.relative(ROOT, outputPath)}.`);

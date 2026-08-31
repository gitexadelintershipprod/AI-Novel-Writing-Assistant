#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");
const { HAN_PATTERN, ROOT, scanHanLines } = require("./english-ui-audit.cjs");

const allowlistPath = path.join(ROOT, "config/english-ui-allowlist.json");
const catalogPath = path.join(ROOT, "client/src/locales/en/legacy-ui.json");
const i18nPath = path.join(ROOT, "client/src/i18n.ts");

function key(entry) {
  return `${entry.path}\u0000${entry.text}\u0000${entry.reason}`;
}

function fail(message, details = []) {
  console.error(`English UI check failed: ${message}`);
  details.slice(0, 30).forEach((detail) => console.error(`  ${detail}`));
  if (details.length > 30) console.error(`  ...and ${details.length - 30} more`);
  process.exitCode = 1;
}

if (!fs.existsSync(allowlistPath)) {
  fail("config/english-ui-allowlist.json is missing.");
} else {
  const allowlist = JSON.parse(fs.readFileSync(allowlistPath, "utf8"));
  const expected = new Set(allowlist.entries.map(key));
  const actualEntries = scanHanLines();
  const actual = new Set(actualEntries.map(key));
  const unclassified = actualEntries.filter((entry) => !expected.has(key(entry)));
  const stale = allowlist.entries.filter((entry) => !actual.has(key(entry)));
  if (unclassified.length) {
    fail("new or changed Han-containing source lines are not classified.", unclassified.map((entry) => `${entry.path}: ${entry.text}`));
  }
  if (stale.length) {
    fail("the English UI allowlist contains stale entries.", stale.map((entry) => `${entry.path}: ${entry.text}`));
  }
}

const catalog = JSON.parse(fs.readFileSync(catalogPath, "utf8"));
const untranslatedValues = Object.entries(catalog).filter(([, value]) => HAN_PATTERN.test(value));
if (untranslatedValues.length) {
  fail("the English presentation catalog contains Han characters in translated values.", untranslatedValues.map(([source, value]) => `${source} => ${value}`));
}

const i18nSource = fs.readFileSync(i18nPath, "utf8");
for (const required of ['lng: "en"', 'fallbackLng: "en"', 'supportedLngs: ["en"]']) {
  if (!i18nSource.includes(required)) fail(`client/src/i18n.ts must contain ${required}.`);
}

if (!process.exitCode) {
  console.log(`English UI check passed (${Object.keys(catalog).length} presentation translations).`);
}

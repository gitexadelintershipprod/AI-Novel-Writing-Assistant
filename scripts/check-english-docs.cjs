#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "..");
const HAN_PATTERN = /[\p{Script=Han}]/u;
const HAN_RUN_PATTERN = /[\p{Script=Han}]+/gu;
const allowlistPath = path.join(ROOT, "config/english-docs-allowlist.json");

const SCAN_TARGETS = [
  "docs/wiki",
  "docs/plans",
  "docs/design",
  "docs/archive",
  "docs/checkpoints",
  "docs/architecture",
  "docs/README.md",
  "docs/issue-fix-record.md",
  "docs/releases/release-notes.md",
  "TASK.md",
  "site/README.md",
];

const README_ROOTS = ["server/src", "client/src", "shared"];

function fail(message, details = []) {
  console.error(`English docs check failed: ${message}`);
  details.slice(0, 40).forEach((detail) => console.error(`  ${detail}`));
  if (details.length > 40) console.error(`  ...and ${details.length - 40} more`);
  process.exitCode = 1;
}

function collectMarkdown(target, output = []) {
  const absolutePath = path.join(ROOT, target);
  if (!fs.existsSync(absolutePath)) return output;
  const stat = fs.statSync(absolutePath);
  if (stat.isFile()) {
    if (target.endsWith(".md")) output.push(target);
    return output;
  }
  for (const entry of fs.readdirSync(absolutePath, { withFileTypes: true })) {
    const relativePath = path.posix.join(target, entry.name);
    if (entry.isDirectory()) collectMarkdown(relativePath, output);
    else if (entry.name.endsWith(".md")) output.push(relativePath);
  }
  return output;
}

function collectReadmes(target, output = []) {
  const absolutePath = path.join(ROOT, target);
  if (!fs.existsSync(absolutePath)) return output;
  for (const entry of fs.readdirSync(absolutePath, { withFileTypes: true })) {
    const relativePath = path.posix.join(target, entry.name);
    if (entry.isDirectory()) collectReadmes(relativePath, output);
    else if (entry.name === "README.md") output.push(relativePath);
  }
  return output;
}

function extractHanRuns(line) {
  return [...new Set((line.match(HAN_RUN_PATTERN) ?? []).filter(Boolean))];
}

function loadAllowlist() {
  if (!fs.existsSync(allowlistPath)) {
    fail("config/english-docs-allowlist.json is missing.");
    return new Map();
  }
  const parsed = JSON.parse(fs.readFileSync(allowlistPath, "utf8"));
  const byPath = new Map();
  for (const entry of parsed.entries ?? []) {
    if (!entry?.path || !entry?.text) continue;
    const texts = byPath.get(entry.path) ?? new Set();
    texts.add(entry.text);
    byPath.set(entry.path, texts);
  }
  return byPath;
}

const files = [
  ...SCAN_TARGETS.flatMap((target) => collectMarkdown(target)),
  ...README_ROOTS.flatMap((target) => collectReadmes(target)),
].filter((relativePath) => relativePath !== "docs/public/georgian-user-guide.md");

const allowlist = loadAllowlist();
const violations = [];
const used = new Set();

for (const relativePath of files) {
  const source = fs.readFileSync(path.join(ROOT, relativePath), "utf8");
  const allowed = allowlist.get(relativePath) ?? new Set();
  source.split(/\r?\n/).forEach((line, index) => {
    if (!HAN_PATTERN.test(line)) return;
    const runs = extractHanRuns(line);
    const leftover = runs.filter((run) => {
      if (allowed.has(run)) {
        used.add(`${relativePath}\u0000${run}`);
        return false;
      }
      return true;
    });
    if (leftover.length) {
      violations.push(`${relativePath}:${index + 1}: ${leftover.join(", ")}`);
    }
  });
}

const stale = [];
for (const [relativePath, texts] of allowlist) {
  for (const text of texts) {
    if (!used.has(`${relativePath}\u0000${text}`)) {
      stale.push(`${relativePath}: ${text}`);
    }
  }
}

if (violations.length) {
  fail("developer docs still contain unclassified Han text.", violations);
}
if (stale.length) {
  fail("the English docs allowlist contains stale entries.", stale);
}

if (!process.exitCode) {
  console.log(`English docs check passed (${files.length} markdown files).`);
}

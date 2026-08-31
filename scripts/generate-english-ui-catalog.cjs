#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");

const ROOT = path.resolve(__dirname, "..");
const OUTPUT = path.join(ROOT, "client/src/locales/en/legacy-ui.json");
const SOURCE_DIRS = [path.join(ROOT, "client/src"), path.join(ROOT, "desktop/src")];
const HAN = /[\p{Script=Han}]/u;
const SPLIT_MARKER = "<<<AI_NOVEL_UI_SPLIT>>>";
const MAX_BATCH_CHARS = 2800;
const MAX_BATCH_ITEMS = 24;
const CONCURRENCY = 6;

const MANUAL_OVERRIDES = {
  "主角": "Protagonist",
  "反派": "Antagonist",
  "配角": "Supporting Character",
  "暂无": "None yet",
  "未开始": "Not Started",
  "进行中": "In Progress",
  "已完成": "Completed",
  "已发布": "Published",
  "草稿": "Draft",
  "折叠": "Collapse",
  "展开": "Expand",
  "确认": "Confirm",
  "取消": "Cancel",
  "保存": "Save",
  "删除": "Delete",
  "编辑": "Edit",
  "重试": "Retry",
  "加载中...": "Loading...",
  "小说": "Novel",
  "章节": "Chapter",
  "角色": "Character",
  "世界观": "World",
  "知识库": "Knowledge Base",
  "系统设置": "Settings",
};

function collectFiles(directory, output = []) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const absolutePath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      collectFiles(absolutePath, output);
    } else if (/\.(?:ts|tsx)$/.test(entry.name)) {
      output.push(absolutePath);
    }
  }
  return output;
}

function isCatalogCandidate(value) {
  const normalized = value.trim();
  if (!normalized || !HAN.test(normalized)) return false;
  if (normalized.length > 500) return false;
  if ((normalized.match(/\n/g) ?? []).length > 3) return false;
  return true;
}

function collectSourceStrings() {
  const strings = new Set();
  const visit = (node) => {
    if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node) || ts.isJsxText(node)) {
      const value = node.text.trim();
      if (isCatalogCandidate(value)) strings.add(value);
    }
    ts.forEachChild(node, visit);
  };

  for (const directory of SOURCE_DIRS) {
    for (const filePath of collectFiles(directory)) {
      const source = fs.readFileSync(filePath, "utf8");
      const scriptKind = filePath.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS;
      visit(ts.createSourceFile(filePath, source, ts.ScriptTarget.Latest, true, scriptKind));
    }
  }
  return [...strings].sort((a, b) => a.localeCompare(b, "zh-CN"));
}

function createBatches(strings) {
  const batches = [];
  let batch = [];
  let characters = 0;
  for (const value of strings) {
    const nextSize = characters + value.length + SPLIT_MARKER.length + 2;
    if (batch.length && (batch.length >= MAX_BATCH_ITEMS || nextSize > MAX_BATCH_CHARS)) {
      batches.push(batch);
      batch = [];
      characters = 0;
    }
    batch.push(value);
    characters += value.length + SPLIT_MARKER.length + 2;
  }
  if (batch.length) batches.push(batch);
  return batches;
}

async function translateBatch(batch, attempt = 1) {
  const query = batch.join(`\n${SPLIT_MARKER}\n`);
  const url = new URL("https://translate.googleapis.com/translate_a/single");
  url.searchParams.set("client", "gtx");
  url.searchParams.set("sl", "zh-CN");
  url.searchParams.set("tl", "en");
  url.searchParams.set("dt", "t");
  url.searchParams.set("q", query);

  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(30_000) });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const payload = await response.json();
    const translated = payload[0].map((segment) => segment[0]).join("");
    const values = translated.split(SPLIT_MARKER).map((value) => value.trim());
    if (values.length !== batch.length || values.some((value) => !value)) {
      throw new Error(`expected ${batch.length} translated values, received ${values.length}`);
    }
    return values;
  } catch (error) {
    if (attempt < 4) {
      await new Promise((resolve) => setTimeout(resolve, attempt * 1000));
      return translateBatch(batch, attempt + 1);
    }
    if (batch.length > 1) {
      const middle = Math.ceil(batch.length / 2);
      return [
        ...(await translateBatch(batch.slice(0, middle))),
        ...(await translateBatch(batch.slice(middle))),
      ];
    }
    throw new Error(`Could not translate ${JSON.stringify(batch[0])}: ${error.message}`);
  }
}

async function main() {
  const sourceStrings = collectSourceStrings();
  let existing = {};
  if (fs.existsSync(OUTPUT)) existing = JSON.parse(fs.readFileSync(OUTPUT, "utf8"));
  const pending = sourceStrings.filter((value) => !existing[value] && !MANUAL_OVERRIDES[value]);
  const batches = createBatches(pending);
  let completed = 0;

  async function worker() {
    while (batches.length) {
      const batch = batches.shift();
      const translations = await translateBatch(batch);
      batch.forEach((source, index) => {
        existing[source] = translations[index];
      });
      completed += batch.length;
      if (completed % 100 < batch.length) {
        process.stdout.write(`Translated ${completed}/${pending.length}\n`);
      }
    }
  }

  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, batches.length || 1) }, worker));
  const catalog = Object.fromEntries(
    sourceStrings
      .map((source) => [source, MANUAL_OVERRIDES[source] ?? existing[source]])
      .filter(([, translation]) => typeof translation === "string" && translation && !HAN.test(translation))
      .sort(([left], [right]) => left.localeCompare(right, "zh-CN")),
  );
  fs.mkdirSync(path.dirname(OUTPUT), { recursive: true });
  fs.writeFileSync(OUTPUT, `${JSON.stringify(catalog, null, 2)}\n`);
  console.log(`Wrote ${Object.keys(catalog).length} English UI translations to ${path.relative(ROOT, OUTPUT)}.`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

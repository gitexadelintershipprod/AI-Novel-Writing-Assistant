#!/usr/bin/env node
/**
 * Replace Han product-copy string literals / JSX text with English.
 * Catalog keys plus explicit overrides. Skips comments, regex literals,
 * dual-read protocol files, wiki, and the Georgian user guide.
 */
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "..");
const HAN = /[\p{Script=Han}]/u;
const CATALOG_PATH = path.join(ROOT, "client/src/locales/en/legacy-ui.json");
const OVERRIDES_PATH = path.join(ROOT, "scripts/product-copy-overrides.json");

const SKIP_DIR_PARTS = new Set([
  "node_modules",
  "dist",
  "docs/wiki",
  "docs/plans",
  "docs/archive",
  "docs/design",
  "migration",
  "locales",
  "tests",
]);

const SKIP_FILES = new Set([
  "shared/types/legacyProtocolValues.ts",
  "shared/types/volumeBeatSlots.ts",
  "server/src/i18n/legacyValueMap.ts",
  "server/src/i18n/protocolValueMigration.ts",
  "server/src/services/world/worldPropertyOptions.ts",
  "server/src/services/world/worldServiceShared.ts",
  "server/src/services/world/worldStructure.ts",
  "server/src/services/world/worldVisualization.ts",
  "server/src/services/novel/volume/chapterDetail/chapterDetailSchemas.ts",
  "server/src/services/novel/volume/volumeGenerationSchemas.ts",
  "server/src/services/styleEngine/styleGenerationSanitizer.ts",
  "client/src/locales/en/legacy-ui.json",
  "docs/public/georgian-user-guide.md",
  "TASK.md",
  "AGENTS.md",
  "scripts/rewrite-product-copy.cjs",
  "scripts/english-ui-audit.cjs",
  "scripts/check-english-ui.cjs",
  "scripts/update-english-ui-allowlist.cjs",
  "scripts/georgian-content-audit.cjs",
  "scripts/check-georgian-content.cjs",
  "config/english-ui-allowlist.json",
  "config/georgian-content-allowlist.json",
]);

const SOURCE_EXTENSIONS = new Set([".ts", ".tsx", ".js", ".mjs", ".cjs", ".jsx", ".md"]);

const DEFAULT_ROOTS = [
  "shared",
  "server/src",
  "client/src",
  "desktop/src",
];

function loadMap() {
  const catalog = JSON.parse(fs.readFileSync(CATALOG_PATH, "utf8"));
  const overrides = fs.existsSync(OVERRIDES_PATH)
    ? JSON.parse(fs.readFileSync(OVERRIDES_PATH, "utf8"))
    : {};
  const map = new Map();
  for (const [from, to] of Object.entries(catalog)) {
    if (typeof from === "string" && typeof to === "string" && HAN.test(from) && to.trim() && !HAN.test(to)) {
      map.set(from, to);
    }
  }
  for (const [from, to] of Object.entries(overrides)) {
    if (typeof from === "string" && typeof to === "string" && to.trim()) {
      map.set(from, to);
    }
  }
  return map;
}

function shouldSkip(relativePath) {
  const posix = relativePath.split(path.sep).join("/");
  if (SKIP_FILES.has(posix)) return true;
  if (posix.endsWith("/README.md") && posix.startsWith("server/src/")) return true;
  if (/\.(?:test|spec)\./.test(posix)) return true;
  if (posix.includes("/tests/") || posix.includes("/__tests__/")) return true;
  if (posix === "client/src/i18n/dynamicUiPatterns.ts") return true;
  for (const part of SKIP_DIR_PARTS) {
    if (posix === part || posix.startsWith(`${part}/`)) return true;
  }
  return false;
}

function rewriteNumericUnits(value) {
  return value
    .replace(/第\s*(\$\{[^}]+\})\s*[–\-至到]\s*第?\s*(\$\{[^}]+\})\s*章/g, "Chapters $1–$2")
    .replace(/第\s*(\{[^}]+\})\s*[–\-至到]\s*第?\s*(\{[^}]+\})\s*章/g, "Chapters $1–$2")
    .replace(/【第(\$\{[^}]+\})卷】/g, "[Volume $1]")
    .replace(/第\s*(\$\{[^}]+\})\s*章/g, "Chapter $1")
    .replace(/第\s*(\{[^}]+\})\s*章/g, "Chapter $1")
    .replace(/第(\$\{[^}]+\})(?=[A-Za-z])/g, "Chapter $1 ")
    .replace(/第(\{[^}]+\})(?=[A-Za-z])/g, "Chapter $1 ")
    .replace(/第\s*(\$\{[^}]+\})\s*卷/g, "Volume $1")
    .replace(/第(\$\{[^}]+\})卷/g, "Volume $1")
    .replace(/第\s*(\{[^}]+\})\s*卷/g, "Volume $1")
    .replace(/第(\{[^}]+\})卷/g, "Volume $1")
    .replace(/第\s*(\$\{[^}]+\})\s*集/g, "Episode $1")
    .replace(/第\s*(\{[^}]+\})\s*集/g, "Episode $1")
    .replace(/第\s*(\$\{[^}]+\})\s*话/g, "Episode $1")
    .replace(/第\s*(\{[^}]+\})\s*话/g, "Episode $1")
    .replace(/第\s*(\$\{[^}]+\})\s*格/g, "Panel $1")
    .replace(/第\s*(\{[^}]+\})\s*格/g, "Panel $1")
    .replace(/第\s*(\$\{[^}]+\})\s*天/g, "Day $1")
    .replace(/第\s*(\{[^}]+\})\s*天/g, "Day $1")
    .replace(/第\s*(\$\{[^}]+\})\s*轮/g, "Round $1")
    .replace(/第\s*(\{[^}]+\})\s*轮/g, "Round $1")
    .replace(/阶段\s*(\$\{[^}]+\})/g, "Stage $1")
    .replace(/共\s*(\$\{[^}]+\})\s*章/g, "$1 chapters")
    .replace(/(\$\{[^}]+\})\s*章(?![a-zA-Z])/g, "$1 chapters")
    .replace(/(\{[^}]+\})\s*章(?![a-zA-Z])/g, "$1 chapters")
    .replace(/(\$\{[^}]+\})\s*字/g, "$1 characters")
    .replace(/(\{[^}]+\})\s*字/g, "$1 characters")
    .replace(/(\$\{[^}]+\})\s*条/g, "$1 items")
    .replace(/(\{[^}]+\})\s*条/g, "$1 items")
    .replace(/(\$\{[^}]+\})\s*项/g, "$1 items")
    .replace(/(\{[^}]+\})\s*项/g, "$1 items")
    .replace(/(\$\{[^}]+\})\s*个版本/g, "$1 versions")
    .replace(/(\{[^}]+\})\s*个版本/g, "$1 versions")
    .replace(/(\$\{[^}]+\})\s*个模型/g, "$1 models")
    .replace(/(\{[^}]+\})\s*个模型/g, "$1 models")
    .replace(/(\$\{[^}]+\})\s*个镜头/g, "$1 shots")
    .replace(/(\{[^}]+\})\s*个镜头/g, "$1 shots")
    .replace(/(\$\{[^}]+\})\s*位(?![a-zA-Z])/g, "$1 people")
    .replace(/(\$\{[^}]+\})\s*分\s*(\$\{[^}]+\})\s*秒/g, "$1 min $2s")
    .replace(/(\$\{[^}]+\})\s*秒/g, "$1s")
    .replace(/(\$\{[^}]+\})\s*次调用/g, "$1 calls")
    .replace(/(\$\{[^}]+\})\s*次(?![a-zA-Z])/g, "$1 times");
}

function replaceChinesePunctuationIfLatin(value) {
  const withoutPunct = value.replace(/[。，：；、「」『』【】《》（）]/g, "");
  if (HAN.test(withoutPunct)) return value;
  return value
    .replace(/。/g, ".")
    .replace(/，/g, ", ")
    .replace(/：/g, ": ")
    .replace(/；/g, "; ")
    .replace(/、/g, ", ")
    .replace(/「/g, "\"")
    .replace(/」/g, "\"")
    .replace(/『/g, "\"")
    .replace(/』/g, "\"")
    .replace(/【/g, "[")
    .replace(/】/g, "]")
    .replace(/《/g, "\"")
    .replace(/》/g, "\"")
    .replace(/（/g, " (")
    .replace(/）/g, ")");
}

function rewriteHanCopy(value, map, keys) {
  const exact = translateExact(value, map);
  if (exact != null) return exact;
  let result = rewriteNumericUnits(value);
  result = rewriteByLongestKeys(result, keys);
  result = replaceChinesePunctuationIfLatin(result);
  return result;
}

function collectFiles(target, output = []) {
  const absolutePath = path.join(ROOT, target);
  if (!fs.existsSync(absolutePath)) return output;
  const stat = fs.statSync(absolutePath);
  if (stat.isFile()) {
    if (SOURCE_EXTENSIONS.has(path.extname(absolutePath)) && !shouldSkip(target)) output.push(target);
    return output;
  }
  for (const entry of fs.readdirSync(absolutePath, { withFileTypes: true })) {
    const relativePath = path.posix.join(target, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "node_modules" || entry.name === "dist") continue;
      collectFiles(relativePath, output);
    } else if (SOURCE_EXTENSIONS.has(path.extname(entry.name)) && !shouldSkip(relativePath)) {
      output.push(relativePath);
    }
  }
  return output;
}

function translateExact(value, map) {
  if (!HAN.test(value)) return null;
  return map.get(value) ?? null;
}

function rewriteByLongestKeys(value, keys) {
  let result = value;
  for (const [from, to] of keys) {
    if (from.length < 4) continue;
    if (result.includes(from)) {
      result = result.split(from).join(to);
    }
  }
  return result;
}

function rewriteSource(source, map, unmatched, keys) {
  let output = "";
  let i = 0;
  const n = source.length;
  let replaced = 0;

  const pushUnmatched = (value) => {
    if (HAN.test(value)) unmatched.set(value, (unmatched.get(value) || 0) + 1);
  };

  while (i < n) {
    const ch = source[i];
    const next = source[i + 1];

    if (ch === "/" && next === "/") {
      const end = source.indexOf("\n", i);
      const chunk = end === -1 ? source.slice(i) : source.slice(i, end);
      output += chunk;
      i += chunk.length;
      continue;
    }
    if (ch === "/" && next === "*") {
      const end = source.indexOf("*/", i + 2);
      const chunk = end === -1 ? source.slice(i) : source.slice(i, end + 2);
      output += chunk;
      i += chunk.length;
      continue;
    }
    if (ch === "/" && !isIdentifierChar(source[i - 1]) && lookLikeRegex(source, i)) {
      const consumed = readRegex(source, i);
      output += consumed.text;
      i += consumed.text.length;
      continue;
    }
    if (ch === "'" || ch === '"' || ch === "`") {
      const consumed = readQuoted(source, i);
      const inner = consumed.inner;
      const rewrittenInner = rewriteHanCopy(inner, map, keys);
      if (rewrittenInner !== inner && HAN.test(inner)) {
        output += consumed.quote + (consumed.quote === "`" ? rewrittenInner : escapeForQuote(rewrittenInner, consumed.quote)) + consumed.quote;
        replaced += 1;
        i += consumed.text.length;
        continue;
      }
      if (HAN.test(rewrittenInner)) pushUnmatched(rewrittenInner);
      output += consumed.text;
      i += consumed.text.length;
      continue;
    }
    output += ch;
    i += 1;
  }

  const jsxRewritten = rewriteJsxText(output, map, unmatched, keys);
  return { text: jsxRewritten.text, replaced: replaced + jsxRewritten.replaced };
}

function isIdentifierChar(ch) {
  return ch != null && /[A-Za-z0-9_$]/.test(ch);
}

function lookLikeRegex(source, i) {
  let j = i - 1;
  while (j >= 0 && /[ \t]/.test(source[j])) j -= 1;
  const prev = source[j];
  return prev == null || /[=(:,;!?[{*&|~^%<>]/.test(prev) || source.slice(Math.max(0, j - 7), j + 1).trim().endsWith("return");
}

function readRegex(source, start) {
  let i = start + 1;
  let escaped = false;
  let inClass = false;
  while (i < source.length) {
    const ch = source[i];
    if (escaped) {
      escaped = false;
      i += 1;
      continue;
    }
    if (ch === "\\") {
      escaped = true;
      i += 1;
      continue;
    }
    if (ch === "[") inClass = true;
    else if (ch === "]" && inClass) inClass = false;
    else if (ch === "/" && !inClass) {
      i += 1;
      while (i < source.length && /[a-z]/i.test(source[i])) i += 1;
      return { text: source.slice(start, i) };
    }
    if (ch === "\n") break;
    i += 1;
  }
  return { text: source.slice(start, start + 1) };
}

function readQuoted(source, start) {
  const quote = source[start];
  let i = start + 1;
  let escaped = false;
  let hasInterpolation = false;
  while (i < source.length) {
    const ch = source[i];
    if (escaped) {
      escaped = false;
      i += 1;
      continue;
    }
    if (ch === "\\") {
      escaped = true;
      i += 1;
      continue;
    }
    if (quote === "`" && ch === "$" && source[i + 1] === "{") {
      hasInterpolation = true;
      i += 2;
      continue;
    }
    if (ch === quote) {
      const raw = source.slice(start, i + 1);
      return {
        text: raw,
        quote,
        inner: unescapeQuoted(source.slice(start + 1, i), quote),
        hasInterpolation,
      };
    }
    if (quote !== "`" && ch === "\n") break;
    i += 1;
  }
  return { text: source.slice(start, start + 1), quote, inner: "", hasInterpolation: false };
}

function unescapeQuoted(value, quote) {
  if (quote === "`") return value;
  return value.replace(/\\([\\'"nrt])/g, (_, ch) => {
    if (ch === "n") return "\n";
    if (ch === "r") return "\r";
    if (ch === "t") return "\t";
    return ch;
  });
}

function escapeForQuote(value, quote) {
  if (quote === "`") return value.replace(/`/g, "\\`").replace(/\$\{/g, "\\${");
  return value
    .replace(/\\/g, "\\\\")
    .replace(new RegExp(quote, "g"), `\\${quote}`)
    .replace(/\n/g, "\\n")
    .replace(/\r/g, "\\r");
}

function rewriteJsxText(source, map, unmatched, keys) {
  let replaced = 0;
  const rewritePlain = (plain) => {
    const next = rewriteHanCopy(plain, map, keys);
    if (next !== plain) replaced += 1;
    else if (HAN.test(plain)) unmatched.set(plain.trim() || plain, (unmatched.get(plain.trim() || plain) || 0) + 1);
    return next;
  };
  let text = source.replace(/(>)([^<>{}]+)(<)/g, (full, open, inner, close) => {
    if (!HAN.test(inner)) return full;
    return open + rewritePlain(inner) + close;
  });
  text = text.replace(/(>)([^<>{}]*[\u4e00-\u9fff][^<>{}]*)(\{)/g, (full, open, inner, close) => (
    open + rewritePlain(inner) + close
  ));
  text = text.replace(/(\})([^<>{}]*[\u4e00-\u9fff][^<>{}]*)(<)/g, (full, open, inner, close) => (
    open + rewritePlain(inner) + close
  ));
  text = text.replace(/(\})([^<>{}]*[\u4e00-\u9fff][^<>{}]*)(\{)/g, (full, open, inner, close) => (
    open + rewritePlain(inner) + close
  ));
  const withUnits = text
    .replace(/(>|\s)第(\s*)\{/g, "$1Chapter$2 {")
    .replace(/\}(\s*)章(?![a-zA-Z])/g, "} chapter")
    .replace(/\}(\s*)卷(?![a-zA-Z])/g, "} volume")
    .replace(/\}(\s*)集(?![a-zA-Z])/g, "} episode")
    .replace(/\}(\s*)话(?![a-zA-Z])/g, "} episode")
    .replace(/\}(\s*)格(?![a-zA-Z])/g, "} panel")
    .replace(/\}(\s*)天(?![a-zA-Z])/g, "} day")
    .replace(/\}(\s*)字(?![a-zA-Z])/g, "} characters")
    .replace(/\}(\s*)条(?![a-zA-Z])/g, "} items")
    .replace(/\}(\s*)项(?![a-zA-Z])/g, "} items")
    .replace(/\}(\s*)秒(?![a-zA-Z])/g, "}s")
    .replace(/\}(\s*)次(?![a-zA-Z])/g, "} times");
  if (withUnits !== text) replaced += 1;
  return { text: withUnits, replaced };
}

function main() {
  const apply = process.argv.includes("--apply");
  const rootsArg = process.argv.find((arg) => arg.startsWith("--roots="));
  const roots = rootsArg ? rootsArg.slice("--roots=".length).split(",") : DEFAULT_ROOTS;
  const map = loadMap();
  const keys = [...map.entries()].sort((a, b) => b[0].length - a[0].length);
  const unmatched = new Map();
  let filesChanged = 0;
  let replacements = 0;
  const changed = [];

  for (const file of roots.flatMap((root) => collectFiles(root))) {
    const absolute = path.join(ROOT, file);
    const source = fs.readFileSync(absolute, "utf8");
    if (!HAN.test(source)) continue;
    const result = rewriteSource(source, map, unmatched, keys);
    if (result.text !== source) {
      filesChanged += 1;
      replacements += result.replaced;
      changed.push(file);
      if (apply) fs.writeFileSync(absolute, result.text);
    }
  }

  const unmatchedList = [...unmatched.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  const reportPath = path.join(ROOT, "migration/backups/product-copy-unmatched.json");
  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(reportPath, `${JSON.stringify(unmatchedList.slice(0, 4000).map(([text, count]) => ({ text, count })), null, 2)}\n`);

  console.log(JSON.stringify({
    apply,
    filesChanged,
    replacements,
    unmatched: unmatchedList.length,
    sampleChanged: changed.slice(0, 30),
    sampleUnmatched: unmatchedList.slice(0, 20).map(([text, count]) => ({ text, count })),
    reportPath,
  }, null, 2));
}

main();

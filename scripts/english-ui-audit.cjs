const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "..");
const HAN_PATTERN = /[\p{Script=Han}]/u;
const SCAN_TARGETS = ["client/src", "client/index.html", "desktop/src"];
const SOURCE_EXTENSIONS = new Set([".html", ".json", ".md", ".mjs", ".ts", ".tsx"]);

function collectFiles(target, output = []) {
  const absolutePath = path.join(ROOT, target);
  const stat = fs.statSync(absolutePath);
  if (stat.isFile()) {
    output.push(target);
    return output;
  }
  for (const entry of fs.readdirSync(absolutePath, { withFileTypes: true })) {
    const relativePath = path.posix.join(target, entry.name);
    if (entry.isDirectory()) collectFiles(relativePath, output);
    else if (SOURCE_EXTENSIONS.has(path.extname(entry.name))) output.push(relativePath);
  }
  return output;
}

function classify(pathname, text) {
  if (pathname === "client/src/locales/en/legacy-ui.json") {
    return "Source phrase retained as the exact key for the English presentation catalog.";
  }
  if (/\.(?:test|spec)\.|\/tests?\//.test(pathname)) {
    return "Test fixture or contract text; it is not rendered as product UI.";
  }
  if (/\b(?:prompt|systemPrompt|userPrompt|template|instruction)\b/i.test(text)
    || /prompt|writingFormula|antiAiRules/i.test(pathname) && text.length > 180) {
    return "AI prompt or authored content; translation would change generation behavior.";
  }
  if (/\/api\/|\/store\/|\.shared\.|\.schema\.|\/lib\//.test(pathname)) {
    return "Domain, protocol, or persisted source value; the English label is applied at the presentation boundary.";
  }
  if (/^(?:\/\/|\/\*|\*|<!--)/.test(text)) {
    return "Developer comment; it is not rendered as product UI.";
  }
  return "Legacy source text translated by the English-only presentation boundary; retained for upstream compatibility.";
}

function extractHanSegments(line) {
  const segments = [];
  const quoted = /"((?:\\.|[^"\\])*)"|'((?:\\.|[^'\\])*)'|`((?:\\.|[^`\\])*)`/g;
  for (const match of line.matchAll(quoted)) {
    const value = match[1] ?? match[2] ?? match[3] ?? "";
    if (HAN_PATTERN.test(value)) segments.push(value.trim());
  }
  const jsxText = />([^<>]+)</g;
  for (const match of line.matchAll(jsxText)) {
    const value = match[1].trim();
    if (HAN_PATTERN.test(value)) segments.push(value);
  }
  if (!segments.length && HAN_PATTERN.test(line)) segments.push(line.trim());
  return [...new Set(segments.filter(Boolean))];
}

function scanHanLines() {
  const entries = [];
  for (const pathname of SCAN_TARGETS.flatMap((target) => collectFiles(target))) {
    const source = fs.readFileSync(path.join(ROOT, pathname), "utf8");
    const seen = new Set();
    source.split(/\r?\n/).forEach((line) => {
      for (const text of extractHanSegments(line)) {
        if (seen.has(text)) continue;
        seen.add(text);
        entries.push({ path: pathname, text, reason: classify(pathname, text) });
      }
    });
  }
  return entries.sort((left, right) => left.path.localeCompare(right.path) || left.text.localeCompare(right.text));
}

module.exports = { HAN_PATTERN, ROOT, scanHanLines };

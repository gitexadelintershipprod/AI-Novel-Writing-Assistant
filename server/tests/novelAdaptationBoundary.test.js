const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

// Reverse-boundary guard: the novel domain must not depend on adaptation modules (drama/comic/adaptation).
// Novel can then ship independently if the adaptation pipeline is moved out.
const NOVEL_SRC = path.join(__dirname, "..", "src", "services", "novel");

function collectTsFiles(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...collectTsFiles(full));
    } else if (entry.name.endsWith(".ts")) {
      out.push(full);
    }
  }
  return out;
}

test("services/novel does not depend on adaptation modules", () => {
  const files = collectTsFiles(NOVEL_SRC);
  assert.ok(files.length > 0, "should find novel source files");

  const importRe = /\bfrom\s+['"]([^'"]+)['"]/g;
  const adaptationDomainRe = /(^|\/)(?:drama|comic|adaptation)(\/|$)/;
  const violations = [];
  for (const file of files) {
    const src = fs.readFileSync(file, "utf8");
    let match;
    while ((match = importRe.exec(src)) !== null) {
      const spec = match[1].toLowerCase();
      if (adaptationDomainRe.test(spec)) {
        violations.push(`${path.relative(NOVEL_SRC, file)} → ${match[1]}`);
      }
    }
  }

  assert.deepEqual(
    violations,
    [],
    `novel must not import drama/comic/adaptation modules:\n${violations.join("\n")}`,
  );
});

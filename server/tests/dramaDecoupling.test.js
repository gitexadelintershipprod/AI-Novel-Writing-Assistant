const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

// Low-coupling guard: services/drama is an independent bounded context.
// It must not depend on the novel domain (services/novel, modules/novel, or relative novel paths).
// The only contact with novel is NovelSourceAdapter, which reads through prisma (infra).
// Imports must not include a "novel" module path.
const DRAMA_SRC = path.join(__dirname, "..", "src", "services", "drama");

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

test("services/drama does not depend on the novel domain", () => {
  const files = collectTsFiles(DRAMA_SRC);
  assert.ok(files.length > 0, "should find drama source files");

  const importRe = /\bfrom\s+['"]([^'"]+)['"]/g;
  // Block imports where "novel" is a full path segment (novel-domain directories).
  // Allow drama-internal filenames that contain "novel" (e.g. ./source/NovelSourceAdapter).
  const novelSegmentRe = /(^|\/)novel(\/|$)/;
  const violations = [];
  for (const file of files) {
    const src = fs.readFileSync(file, "utf8");
    let match;
    while ((match = importRe.exec(src)) !== null) {
      const spec = match[1].toLowerCase();
      if (novelSegmentRe.test(spec)) {
        violations.push(`${path.relative(DRAMA_SRC, file)} → ${match[1]}`);
      }
    }
  }

  assert.deepEqual(
    violations,
    [],
    `drama must not import the novel domain (read-only prisma access only):\n${violations.join("\n")}`,
  );
});

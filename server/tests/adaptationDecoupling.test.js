const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

// Low-coupling guard: services/adaptation is the shared adaptation layer for drama/comic.
// It must not depend on upper domains (novel/drama/comic business services).
// Allowed: prisma (infra), prompting (shared), services/image (shared).
// NovelSourceAdapter may only read novel tables through prisma; it must not import novel business services.
const ADAPTATION_SRC = path.join(__dirname, "..", "src", "services", "adaptation");

function collectTsFiles(dir) {
  if (!fs.existsSync(dir)) return [];
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

test("services/adaptation does not depend on novel-domain business services", () => {
  const files = collectTsFiles(ADAPTATION_SRC);
  if (files.length === 0) return;

  const importRe = /\bfrom\s+['"]([^'"]+)['"]/g;
  const novelSegmentRe = /(^|\/)novel(\/|$)/;
  const violations = [];
  for (const file of files) {
    const src = fs.readFileSync(file, "utf8");
    let match;
    while ((match = importRe.exec(src)) !== null) {
      const spec = match[1].toLowerCase();
      if (novelSegmentRe.test(spec)) {
        violations.push(`${path.relative(ADAPTATION_SRC, file)} → ${match[1]}`);
      }
    }
  }

  assert.deepEqual(
    violations,
    [],
    `adaptation must not import novel-domain business services (NovelSourceAdapter may only read through prisma):\n${violations.join("\n")}`,
  );
});

test("services/adaptation does not depend on drama/comic service implementations", () => {
  const files = collectTsFiles(ADAPTATION_SRC);
  if (files.length === 0) return;

  const importRe = /\bfrom\s+['"]([^'"]+)['"]/g;
  const domainRe = /(^|\/)(?:drama|comic)(\/|$)/;
  const violations = [];
  for (const file of files) {
    const src = fs.readFileSync(file, "utf8");
    let match;
    while ((match = importRe.exec(src)) !== null) {
      const spec = match[1].toLowerCase();
      if (domainRe.test(spec)) {
        violations.push(`${path.relative(ADAPTATION_SRC, file)} → ${match[1]}`);
      }
    }
  }

  assert.deepEqual(
    violations,
    [],
    `adaptation must not reverse-depend on drama/comic upper modules:\n${violations.join("\n")}`,
  );
});

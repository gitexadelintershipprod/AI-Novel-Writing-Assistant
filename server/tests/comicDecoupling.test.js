const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

// Low-coupling guard: services/comic is an independent bounded context.
// 1. Must not depend on the novel domain (services/novel, modules/novel).
// 2. Must not depend on drama service implementations (services/drama except engine/).
//    Cross-module reuse goes through services/adaptation.
// Exemption: drama/engine/ (rhythmEngine / paywallPlanPolicy) is pure domain knowledge
// with no external deps; comic may import it directly until it moves to adaptation/.
// Contact with novel stays in adaptation/source/NovelSourceAdapter.
// Comic itself must not import any "novel" module path.
const COMIC_SRC = path.join(__dirname, "..", "src", "services", "comic");

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

test("services/comic does not depend on the novel domain", () => {
  const files = collectTsFiles(COMIC_SRC);
  // Skip if the directory does not exist yet (placeholder guard).
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
        violations.push(`${path.relative(COMIC_SRC, file)} → ${match[1]}`);
      }
    }
  }

  assert.deepEqual(
    violations,
    [],
    `comic must not import the novel domain (read-only via adaptation/source/NovelSourceAdapter → prisma):\n${violations.join("\n")}`,
  );
});

test("services/comic does not depend on drama service implementations", () => {
  const files = collectTsFiles(COMIC_SRC);
  if (files.length === 0) return;

  const importRe = /\bfrom\s+['"]([^'"]+)['"]/g;
  // Block services/drama path segments; allow:
  //   - adaptation/ (shared layer)
  //   - drama/engine/ (rhythmEngine / paywallPlanPolicy; explicit exemption)
  const dramaSegmentRe = /(^|\/)drama(\/|$)/;
  const exemptRe = /(^|\/)adaptation(\/|$)|(^|\/)drama\/engine\//;
  const violations = [];
  for (const file of files) {
    const src = fs.readFileSync(file, "utf8");
    let match;
    while ((match = importRe.exec(src)) !== null) {
      const spec = match[1].toLowerCase();
      if (dramaSegmentRe.test(spec) && !exemptRe.test(spec)) {
        violations.push(`${path.relative(COMIC_SRC, file)} → ${match[1]}`);
      }
    }
  }

  assert.deepEqual(
    violations,
    [],
    `comic must not import drama service implementations (drama/engine/ exempt; shared capability belongs in services/adaptation/):\n${violations.join("\n")}`,
  );
});

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(fileURLToPath(import.meta.url));
const read = (relativePath) => readFileSync(join(root, relativePath), "utf8");

test("project surfaces stay borderless and flat by default", () => {
  const card = read("card.tsx");
  assert.match(card, /border-transparent/);
  assert.match(card, /shadow-none/);
  assert.doesNotMatch(card, /rounded-xl border bg-card text-card-foreground shadow-sm/);
});

test("active design guidance keeps UI primitives project owned", () => {
  const design = read("../../../../docs/design/product-ui-design-system.md");
  const agents = read("../../../../AGENTS.md");
  assert.match(design, /Low-border Hierarchy/);
  assert.match(design, /Do not install new shadcn\/ui components or run their generator/);
  assert.match(design, /Ordinary Surface\/Card has no visible border or shadow by default/);
  assert.match(agents, /## UI Visual Rules/);
  assert.match(agents, /Default content surfaces must not render a visible border or shadow/);
});

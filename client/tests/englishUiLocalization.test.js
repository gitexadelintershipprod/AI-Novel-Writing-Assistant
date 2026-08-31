import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const clientRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const repositoryRoot = path.resolve(clientRoot, "..");
const han = /[\p{Script=Han}]/u;

test("English-only i18n configuration ignores saved language preferences", () => {
  const source = fs.readFileSync(path.join(clientRoot, "src/i18n.ts"), "utf8");
  assert.match(source, /lng: "en"/);
  assert.match(source, /fallbackLng: "en"/);
  assert.match(source, /supportedLngs: \["en"\]/);
  assert.doesNotMatch(source, /localStorage/);
});

test("English UI catalog has English values and core domain labels", () => {
  const catalog = JSON.parse(fs.readFileSync(path.join(clientRoot, "src/locales/en/legacy-ui.json"), "utf8"));
  assert.equal(catalog["主角"], "Protagonist");
  assert.equal(catalog["已完成"], "Completed");
  assert.ok(Object.keys(catalog).length > 8_000);
  assert.deepEqual(Object.values(catalog).filter((value) => han.test(value)), []);
});

test("desktop startup, updater, and dialog sources contain no Chinese UI text", () => {
  const files = [
    "desktop/src/main.ts",
    "desktop/src/runtime/state.ts",
    "desktop/src/runtime/updater.ts",
    "desktop/src/uiMessages.ts",
  ];
  for (const relativePath of files) {
    const source = fs.readFileSync(path.join(repositoryRoot, relativePath), "utf8");
    assert.equal(han.test(source), false, `${relativePath} still contains Chinese UI text`);
  }
});

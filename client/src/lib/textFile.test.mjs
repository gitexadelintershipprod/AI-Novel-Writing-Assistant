import test from "node:test";
import assert from "node:assert/strict";

import { readTextFile } from "./textFile.ts";

test("readTextFile keeps valid UTF-8 text instead of misclassifying it as UTF-16", async () => {
  const content = [
    "---",
    'title: "Warhammer 40,000 Novel OS Dossier — Part I"',
    'language: "English"',
    "---",
    "",
    "# World and Pre-Unification Terra",
  ].join("\n");
  const file = new File([content], "warhammer.txt", { type: "text/plain" });

  assert.equal(await readTextFile(file), content);
});

test("readTextFile honors a UTF-16LE BOM", async () => {
  const content = "English lore — ქართული შენიშვნა";
  const utf16Bytes = Buffer.from(content, "utf16le");
  const file = new File([
    new Uint8Array([0xff, 0xfe]),
    utf16Bytes,
  ], "legacy.txt", { type: "text/plain" });

  assert.equal(await readTextFile(file), content);
});

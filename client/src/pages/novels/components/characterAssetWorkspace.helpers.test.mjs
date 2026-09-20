import test from "node:test";
import assert from "node:assert/strict";

import { isProtagonistCharacter } from "./characterAssetWorkspace.helpers.ts";

test("structured cast roles override ambiguous role names when identifying the protagonist", () => {
  assert.equal(isProtagonistCharacter({ role: "Female lead", castRole: "protagonist" }), true);
  assert.equal(isProtagonistCharacter({ role: "Male lead", castRole: "love_interest" }), false);
  assert.equal(isProtagonistCharacter({ role: "Former female lead", castRole: "pressure_source" }), false);
  assert.equal(isProtagonistCharacter({ role: "Maid", castRole: "ally" }), false);
});

test("characters without a cast role use an English protagonist role string", () => {
  assert.equal(isProtagonistCharacter({ role: "protagonist", castRole: null }), true);
  assert.equal(isProtagonistCharacter({ role: "Female lead", castRole: null }), false);
});

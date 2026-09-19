import assert from "node:assert/strict";
import test from "node:test";

import { resolveMarketFoundationLibraryState } from "./marketFoundationLibraryState.ts";

test("existing radar assets are shown as reusable instead of needing a new sync", () => {
  const state = resolveMarketFoundationLibraryState({
    genre: { existingId: "genre-1", name: "Western fantasy", reason: "evidence" },
    primaryStoryMode: { existingId: "mode-1", name: "Upgrade and grow", reason: "evidence" },
    secondaryStoryMode: { existingId: "mode-2", name: "Heal everyday", reason: "evidence" },
  }, null);

  assert.equal(state.genreNeedsSync, false);
  assert.equal(state.storyModesNeedSync, false);
  assert.equal(state.genreId, "genre-1");
  assert.equal(state.secondaryStoryModeId, "mode-2");
});

test("only missing radar assets require manual sync", () => {
  const state = resolveMarketFoundationLibraryState({
    genre: { existingId: null, name: "新题材", reason: "evidence" },
    primaryStoryMode: { existingId: "mode-1", name: "Upgrade and grow", reason: "evidence" },
    secondaryStoryMode: { existingId: null, name: "新推进", reason: "evidence" },
  }, null);

  assert.equal(state.genreNeedsSync, true);
  assert.equal(state.storyModesNeedSync, true);
});

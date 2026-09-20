import assert from "node:assert/strict";
import test from "node:test";
import { translateDynamicUiText } from "./dynamicUiPatterns.ts";

test("dynamic UI overlay is a no-op because source copy is English", () => {
  assert.equal(
    translateDynamicUiText("There are 11 authoring task types with no available model route."),
    "There are 11 authoring task types with no available model route.",
  );
  assert.equal(translateDynamicUiText("Step 1 of 5"), "Step 1 of 5");
  assert.equal(translateDynamicUiText("DeepSeek API Key is not configured."), "DeepSeek API Key is not configured.");
});

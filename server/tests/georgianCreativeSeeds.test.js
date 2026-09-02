const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const serverRoot = path.resolve(__dirname, "..");
const read = (relativePath) => fs.readFileSync(path.join(serverRoot, relativePath), "utf8");

test("Georgian creative seed profile is applied once and then switches to missing-only mode", () => {
  const source = read("src/services/bootstrap/SystemResourceBootstrapService.ts");

  assert.match(source, /CREATIVE_SEED_PROFILE_KEY = "system\.creative_seed_profile"/);
  assert.match(source, /CREATIVE_SEED_PROFILE_VERSION = "ka-GE@1"/);
  assert.match(source, /currentMarker\?\.value === CREATIVE_SEED_PROFILE_VERSION \? "missing_only" : "sync_existing"/);
  assert.match(source, /where: \{ key: CREATIVE_SEED_PROFILE_KEY \}/);
  assert.match(source, /update: \{ value: CREATIVE_SEED_PROFILE_VERSION \}/);
});

test("creative bootstrap targets stable built-in identifiers without deleting custom rows", () => {
  const bootstrap = read("src/services/bootstrap/SystemResourceBootstrapService.ts");
  const storyModes = read("src/db/storyModeSeeds.ts");
  const styleDefaults = read("src/services/styleEngine/defaults.ts");

  assert.match(bootstrap, /where: \{ id: node\.id \}/);
  assert.match(bootstrap, /where: \{ key: rule\.key \}/);
  assert.match(bootstrap, /where: \{ key: template\.key \}/);
  assert.match(bootstrap, /where: \{ sourceRefId \}/);
  assert.doesNotMatch(bootstrap, /novelGenre\.delete|novelStoryMode\.delete|styleProfile\.delete\(/);
  assert.match(storyModes, /id: "story_mode_power_root"/);
  assert.match(styleDefaults, /key: "starter-power-up"/);
});

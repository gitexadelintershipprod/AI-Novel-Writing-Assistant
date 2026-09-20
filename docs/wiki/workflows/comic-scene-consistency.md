# Comic scene consistency pipeline

## Background

In a long-running comic, the same location (for example "sect grand hall" or "Luyuan's ruined hut") repeats across panels and episodes. Early panel scripts buried scene information in each panel's free-text `visualPrompt`. Independent wording drifted: wall materials, furniture, landmarks, and palette were all uncontrolled. `ComicFact` can extract a first-seen place as a `revealed` text fact, but it is text only — no image, no hard constraint. Panel generate had only character sprites as references; backgrounds were free model invention.

Character consistency is already reinforced through three-views, an asset library, and sprite references. Scenes need the same strength of reinforcement, but they cannot copy the character recipe: a scene is background, not subject, and shot size / camera / lighting change every panel. If one fixed scene image is sent as a strong reference, the model paints "that camera of that image" into every panel, freezing the lens so every panel looks like the same photograph.

## Decision

Use a two-layer plan: **L0 scene bible + L1 multi-angle concept sheet**.

- **L0 scene materialization (foundation)**: storyboard becomes two steps — the LLM first identifies this episode's scene list (max 8, reuse same names across episodes), then panels, each with `sceneRef`. Each scene persists a structured scene-bible JSON: `{ palette, keyElements, materials, ambiance, layout }`. At panel generate, bible text is assembled into a scene description and injected into the prompt, removing most drift at the text layer first.
- **L1 multi-angle concept sheet (visual anchor)**: each scene generates one square cross-quad concept image — top-left establishing, top-right reverse, bottom-left core-area medium shot, bottom-right material / swatch / lighting close-up. The four quadrants are hard-constrained to the same space and consistent palette, materials, and lighting. At panel generate it is a **low-weight second reference** beside the character sprite. The prompt explicitly separates "spatial identity" from "this panel's camera" and tells the model the scene reference only locks palette / layout / materials; camera and composition must follow this panel's picture content freely and must not copy the reference camera. That prevents frozen lenses.

Same-named scenes across episodes naturally reuse the same `ComicScene` row, so continuity is free. No extra "scene continuation" mechanism is required.

## Current Rule

### Data model

`ComicScene` table (independent model, related from `ComicProject.scenes[]`):

```prisma
model ComicScene {
  id          String   @id @default(cuid())
  projectId   String
  name        String   // panel.sceneRef soft-references this name (no FK, so it stays detachable)
  sceneType   String   @default("interior")  // interior | exterior | landscape | abstract | other
  bible       String?  // JSON { palette, keyElements, materials, ambiance, layout }
  sheetData   String?  // JSON { status, url, prompt, provider, generatedAt, origin: "generated"|"uploaded" }
  sortOrder   Int      @default(0)
  ...
}
```

`ComicPanel.sceneRef String?`: this panel's scene name (soft reference to `ComicScene.name`). Match by name, not foreign key, which matches the comic module's "soft reference, detachable" coupling bound.

### Two-step storyboard

`comicPanelScriptOutputSchema` adds top-level `scenes: Scene[]` (max 8). `panelScriptSchema` adds `sceneRef?: string`. The `render` function states two-step instructions:

1. Identify this episode's scenes first, with `name / sceneType / palette / keyElements / materials? / ambiance? / layout?`
2. Continuous space counts as one scene (for example "bamboo-forest edge → bamboo-forest depths") so every panel does not become its own scene
3. When a "project existing scenes" list is supplied, a returning location in this episode must reuse the same `name`. Do not create near-synonym names
4. Each panel's `sceneRef` must be a name from that scenes list

The service upserts in a transaction: **an existing same-named scene's bible is not overwritten**; only missing new scenes get a draft. That keeps one bible across episodes, and a bible the user edited in the scene-library tab is not overwritten when the panel script is regenerated.

### Panel generate injection

`ComicPanelImageService` finds the matching `ComicScene` by `panel.sceneRef`:

1. **L0 text injection**: bible is assembled as `Scene bible [name]: palette X, landmarks Y, materials Z, ambiance W, layout V` and injected by `buildPanelPrompt`, after character description and before dialogue.
2. **L1 concept-sheet injection**: when `scene.sheetData.status === "done"`, append the scene concept-sheet path to `finalRefImagePaths`, beside the character sprite (they share the `slice(0, 4)` cap).
3. **Anti-frozen camera**: when a scene reference image is present, the prompt appends a fixed sentence: the scene reference only locks palette, layout, and material identity; camera angle, shot size, and composition must follow this panel's picture content freely and must not copy the reference camera.

Reference metadata `{ kind: "scene", label: "Scene: sect grand hall", url }` is written to `imageData.referenceImages` for frontend panel-dialog provenance.

### Scene concept-sheet layout

The four-quadrant generate prompt is hard-constrained:

```
ONE single square image divided by a cross into a 2x2 grid of four quadrants,
top-left: wide establishing shot of the whole space,
top-right: an alternate angle / reverse view of the same space,
bottom-left: medium shot of the core area with the key landmarks and furniture,
bottom-right: close-up of materials, color swatches and lighting mood,
all four quadrants depict the SAME location with IDENTICAL palette, materials, architecture and lighting,
environment concept art, NO characters or only tiny background figures
```

Generate size is `1024x1024` (square so the four cells stay even). Style comes from `comicStylePrompt.resolveComicStyleKeywords()` (webtoon_color / ink_traditional / shounen_bw, and so on). Do not hard-code webtoon.

## Examples

- An episode has the lead confront in "sect grand hall", then practice in "back-mountain bamboo forest": the LLM should output 2 scenes (not 8), and each panel writes `sceneRef` for the matching scene.
- Episode two returns to the sect grand hall: the LLM sees "sect grand hall" on the project existing-scenes list and should reuse that name, not create near-synonyms such as "sect main hall" or "great hall".
- The user manually edits the "sect grand hall" bible in the scene library (for example changing ambiance to "night, burned, still smoking"). Regenerating that episode's script must not overwrite the edit. Later panels for that scene generate from the new bible.

## Failure Modes

- **Scene fragmentation**: the LLM treats "bamboo-forest edge" and "bamboo-forest depths" as two scenes. The prompt already says "normalize continuous space", but it can still happen. Users can delete or merge in the scene library.
- **Frozen camera**: if one quadrant of the concept sheet has a very strong composition, the model may copy it. The "free camera" sentence is mitigation. If it is severe, lower reference weight (remove the scene concept sheet and keep bible text only).
- **Concept sheet vs panel conflict**: the scene is transformed (the hall is on fire) while the original concept sheet still shows it intact. The user must regenerate the concept sheet or temporarily disable that scene image.

## Related Modules

- `server/src/services/comic/ComicSceneService.ts`: scene CRUD + concept-sheet generate + upload + file serving
- `server/src/services/comic/ComicPanelScriptService.ts`: upsert scenes + write sceneRef
- `server/src/services/comic/ComicPanelImageService.ts`: bible text + concept-sheet reference injection
- `server/src/prompting/prompts/comic/comic.prompts.ts`: two-step storyboard schema + render
- `client/src/pages/comic/project/ScenesPanel.tsx`: scene-library tab

## Source Documents

- Comic workspace v0.3.20 consistency reinforcement (2026-06-18 release notes)
- `comic-character-asset-pipeline.md`: isomorphic plan on the character side; this page is the scene dual

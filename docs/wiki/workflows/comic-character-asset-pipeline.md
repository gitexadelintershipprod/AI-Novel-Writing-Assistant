# Comic character visual asset pipeline

## Background

Comic panel generation needs to stay stable on both character consistency and emotional expression. A single character sheet can lock hair, costume, and body type, but it cannot cover the happy, angry, sad, surprised, and cold expressions that appear constantly in panels. In multi-character frames, a full sheet also dilutes facial information and weakens how strongly the reference constrains the model.

## Decision

The comic character module uses a layered asset strategy:

- `visualAnchor` stores a structured visual anchor. `description` stays in short sentences and is injected into every panel prompt.
- `character-sheet` is the three-view character sheet. It serves single-character panels and baseline appearance consistency.
- `character-expression` is a six-expression horizontal sheet. It serves emotional accuracy.
- `character-face` is a derived asset cropped from the left-face region of the three-view sheet. It serves multi-character frames.

These assets remain on `ComicCharacter.sheetData`. Expression-sheet state lives in `sheetData.assets.expression`, so early asset expansion does not require a database migration.

## Current Rule

Panel-script `characterRefs` should output an object array, not character names only:

```json
[
  {
    "name": "Shen Jianxin",
    "costume": "default",
    "expression": "cold",
    "lighting": "side_lit"
  }
]
```

`expression` is decided by structured LLM panel output. Allowed values are `neutral`, `happy`, `angry`, `sad`, `surprised`, `cold`. Do not infer expression from dialogue text with fixed keywords or regex post-processing. If expression choice is inaccurate, adjust the Prompt Schema, prompt, or structured-output constraints.

## Reference Injection

Single-character panels prefer injecting the full three-view sheet. Multi-character frames prefer each character's face crop, reducing reference noise. If the matching expression sheet is already generated, also append that character's current `expression` crop.

Reference crops are a derived cache: when the source image updates, crop files refresh from modification time. Derived files do not enter database content. The character image service resolves disk paths and uploads them to the image provider as multipart.

## Character Sheet Tuning

Character sheets can be tuned on an already generated asset. Tuning prefers the previous `sheetData.prompt` as the editable prompt. If the old asset did not save a prompt, the frontend should fill a recommended prompt that includes the appearance anchor, so the user does not guess prompt structure from a blank box.

When the user edits the prompt and regenerates, appearance lock is on by default. The server appends `visualAnchor.description` / `visualAnchor.hint` as a character-identity lock segment and requires the image provider to keep the same face, hair, body type, costume colors, and signature features. If a stock character has no appearance anchor, the frontend may pass a temporary lock phrase through `appearanceOverride`. Only when the user explicitly turns off `lockAppearance` may the tuning prompt fully leave the original appearance anchor.

If the user chooses "use the current three-view as a reference image", the server passes the current local three-view as `refImagePaths[0]` to the image provider.

Successful tuning still follows version archival: the old three-view enters history and the new image becomes current. Do not add a local-upload path to replace this default. In this phase, "original character-image reference" means the currently generated three-view.

## Character Workspace UI

The character asset page uses a "left character list + right current-character detail" workspace. The left side is selection and status glance only. The right side concentrates the current character's three-view, expression sheet, appearance anchor, three-view prompt, and tuning entry.

This structure serves a character production task, not a card wall: the user only needs to judge whether one current character has a main design, expression sheet, and reusable prompt. Characters that already have a three-view should open prompt tuning in the detail pane. Characters without a three-view keep a clear generate-main entry; the expression-sheet entry should open only after the main design is available.

Before generating a panel script, the frontend should warn about characters missing a three-view. The warning is not a hard block, because the script can still generate from `visualAnchor` text, but it must tell the user that missing three-views lowers later panel appearance consistency. This warning is production-prep state. It must not replace backend character-reference and reference-injection rules.

## Character Asset Library

Besides system-derived three-views / expression sheets / face crops, a character may own user-level optional visual assets: costume variants, weapons, props, vehicles, skill visuals, other. Assets are an independent `ComicCharacterAsset` table (`assetType / name / description / imageData / sortOrder`) and may be AI-generated or uploaded.

Asset bounds:

- The name is the reference key. In the panel script, the LLM cites by name through `characterRefs[].costume="combat outfit"` or `characterRefs[].props=["Moonlight Sword"]`, matching back to `ComicCharacterAsset.name`. The `costume` schema is therefore a string rather than an enum. `props` is a new optional string array (max 4, to avoid packing the panel too densely).
- Asset images are reference images and do not affect `visualAnchor`. They describe object appearance, not the character's face. Do not stuff "wearing costume X" into visualAnchor; that pollutes every view.
- When AI generates an asset image and the character already has a three-view, that three-view is passed as a reference so asset color and style stay unified with the character.
- The panel-script prompt includes a "character available assets" list and tells the LLM to fill costume with an asset name (for example combat outfit) and props with a prop/weapon name list.

## Sprite Sheet Reference

When generating a panel, **every on-panel character** composes a horizontal sprite on the fly from this panel's `characterRefs[i]`:

```
[three-view] | [current costume] | [prop 1] | [prop 2] | ...
```

`ComicSpriteSheetService` stitches with sharp, at most 5 columns. Each column has an SVG label at the bottom (character name / asset name). A temporary PNG is sent to the image provider as `refImagePaths` and cleaned up immediately after generate.

The sprite exists to pack "how this character should look, what they wear, and what they hold" into one reference image. That is more stable than sending 3–4 independent references the model must map as body vs weapon.

The sprite itself is not persisted. Constituent asset metadata is written to `imageData.referenceImages: PanelReferenceImageMeta[]` (`{ kind, label, url }`) so the frontend panel dialog can show provenance.

## Visual Anchor Editor

`visualAnchor` is the source for every generate chain (three-view / expression sheet / asset / panel). Users can edit it on the character page:

- **Primary appearance** (`visualSpec.appearance`): full version with face shape / build / costume / signature detail, about 60–2000 characters. Generate chains prefer this over the earlier 40-character condensed `description`.
- **Face-shape hard override** (`visualSpec.faceShapeOverride`): optional independent field. When `appearance` contains persona wording that conflicts with the desired face shape (for example a villain must keep a fierce gaze while the user wants a rounder face), this field forces face shape.

In generate prompts, `faceShapeOverride` appears as `*** FINAL FACE SHAPE OVERRIDE (highest priority, ignore conflicting words in appearance above) ***`, with an explicit instruction to keep sharpness at the gaze/expression layer while following OVERRIDE for the bone structure. All three generate entries (`buildSheetPrompt` / `buildExpressionPrompt` / `buildAppearanceLockPrompt`) inject it.

`appearance` prompt position was also reordered: from after style words to before style words, plus bone-level constraints (`THIS SPECIFIC CHARACTER must have the following exact appearance ... do NOT replace facial features with generic idealized beauty template`), so "how this character looks" dominates the frame and different characters do not collapse to a generic webtoon beauty face.

## AI-Assisted Visual Anchor Rewrite

The character page provides an AI-assisted appearance-anchor optimize action, backed by `comicVisualAnchorRewritePrompt` (registered in the prompting module).

- Input: current `appearance` + current `faceShapeOverride` if any + optional `userInstruction` (for example "rounder face but keep the villain's fierce look").
- Structured output: `{ appearance, faceShapeOverride?, rationale }`. AI removes internal contradictions, keeps persona highlights, and rewrites with bone-level concrete words. When the contradiction is load-bearing for persona, it keeps gaze-layer sharpness and changes face shape / jaw / cheekbones to the user's request, and emits an extra face-shape force fragment in `faceShapeOverride`.
- **Does not persist directly.** The result returns to the frontend for review. The standard `updateCharacterVisualAnchor` write happens only after user confirm. This is intentional: AI rewrite involves creative judgment (how to reconcile "villain" with "round face") and must not be decided by AI alone.

## Failure Modes

- If a character has no three-view, panels still inject `visualAnchor` text, but consistency is weaker than an image reference.
- If a character has no expression sheet, panels can still generate, but that panel's emotion mainly depends on text prompt and model understanding.
- If three-view tuning checks a reference image but the current image is missing, generate should fall back to prompt-only mode and not block the user.
- If a character has no `visualAnchor` and the user did not fill `appearanceOverride`, three-view tuning cannot lock an appearance anchor and can only rely on the user prompt and reference image.
- If multi-character frames keep using a full three-view, the model easily confuses faces and costume detail. Use face crops.
- If `characterRefs` falls back to a string array, the system reads it compatibly as `default + neutral`, but new scripts should output the object structure.
- If `appearance` contains many persona words that conflict with the desired face shape, and the user only appends "round face" at the end of `appearance`, the model is still dominated by the earlier / more numerous sharp-face words. Use `faceShapeOverride`, or call AI-assisted rewrite to remove the contradiction.
- If `characterRefs[].props` cites a missing asset name, sprite composition skips that prop and the prompt keeps only the text "holding X". Generate is not blocked.

## Related Modules

- `server/src/prompting/prompts/comic/comic.prompts.ts`: panel schema, AI rewrite prompt
- `server/src/services/comic/ComicCharacterImageService.ts`: three-view / expression sheet, appearance-anchor extraction
- `server/src/services/comic/ComicCharacterAssetService.ts`: user-asset CRUD + generate + upload
- `server/src/services/comic/ComicSpriteSheetService.ts`: sprite composition
- `server/src/services/comic/ComicPanelImageService.ts`: panel reference assembly + material metadata
- `server/src/services/comic/ComicProjectService.ts`: `updateCharacterVisualAnchor` / `rewriteCharacterVisualAnchor`
- `server/src/services/comic/comicStylePrompt.ts`: unified style-keyword source (avoid hard-coding webtoon in multiple places)
- `server/src/modules/comic/http/comicRoutes.ts`
- `client/src/pages/comic/ComicProjectPage.tsx`, `client/src/pages/comic/project/CharactersPanel.tsx`

Prompt-governance rules after character assets enter the panel generate chain are in [Comic panel production prompt governance](./comic-panel-production-prompt-governance.md). The dual design for scene consistency is [Comic scene consistency](./comic-scene-consistency.md).

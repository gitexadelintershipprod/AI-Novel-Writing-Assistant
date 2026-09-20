# Comic panel production prompt governance

## Background

Comic panel production has two prompt classes. One is the structured PromptAsset used by the panel-script LLM, which decides panel count, camera, dialogue, character refs, and picture script. The other is the final generate prompt the image provider actually receives, assembled from style, layout, character appearance anchors, expression refs, dialogue balloons, and the per-panel picture script.

If every control is exposed as one free-text box, users can change an image in the short term, but they easily break character consistency, four-panel structure, balloon count, and downstream export contracts. Panel prompts therefore use "controlled slots + auditable final prompt".

## Decision

Panel-prompt edits have two layers:

- Pre-generate control: the user chooses information density and may fill supplemental requirements for this panel-script run. Supplemental requirements affect expression preference only. They must not override schema, character refs, style lock, cross-episode facts, or output fields.
- Post-generate tuning: the user may edit the picture script that corresponds to one panel's `visualPrompt`. The next generate uses the saved picture script, but character appearance anchors, expression refs, style, and dialogue balloons are still assembled by the backend.

The image provider's final prompt is saved to `ComicPanel.imageData.prompt` and shown in the UI as "prompt last sent to the image model". It is an audit record, not the user's primary edit entry.

## Current Rule

Panel-script generation supports three information densities:

- `relaxed`: more open frames; prefer a single action, emotional reaction, little dialogue, and whitespace.
- `balanced`: default pacing; most panels carry one action or emotional turn with moderate information.
- `compact`: denser plot propulsion, but each panel still has only one primary visual focus. Avoid packing every panel full.

Deterministic code only handles enums, length, count caps, and parameter normalization. Creative judgment of information density belongs to structured LLM output. Do not hard-judge with keywords or regex.

Four-panel projects still lock layout keywords through project form `4koma`. To avoid turning one project into a pile of "four-panel pages", four-panel mode's default target panel count is lower than strip mode. Each image's four-panel setup/turn/payoff structure is constrained by `visualPrompt` and layout keywords together.

## Persistence Contract

Panel-prompt controls persist the whole-episode generate config and per-panel structured results so later audit, regenerate, and prompt-effect diagnosis are possible.

- `ComicEpisode.scriptConfig` stores this panel-script generate config, including `densityMode`, `targetPanelCount`, `comicFormat`, `scriptPromptInstruction`, `promptAssetId`, `promptAssetVersion`, `provider`, and `generatedAt`. It records "what controls produced this script". It is not a new free-prompt entry.
- `ComicPanel.densityLevel` stores the LLM's structured judgment of one panel's information density: `low / medium / high`. `densityMode` controls whole-episode tendency; `densityLevel` records the per-panel result. Do not mix them.
- `ComicPanel.focus` stores the panel's primary visual focus, helping users audit whether the picture is focused, and giving a stable summary for later redraw and export.
- `ComicPanel.layoutData` stores structured layout. Four-panel mode may record `four_koma` and `subPanels`, so four-panel setup/turn/payoff is not carried by `visualPrompt` alone.
- `ComicPanel.visualPrompt` remains the user-editable per-panel picture script. `ComicPanel.imageData.prompt` remains the audit record of the last prompt actually sent to the image model.

## User Editable Boundary

Users may edit:

- Supplemental requirements for this panel-script run.
- Episode title, synopsis, ending hook, and paywall beat.
- Per-panel picture script.
- Clearly inaccurate entries in the cross-episode fact library.

Users may not directly edit:

- PromptAsset system rules, output schema, or contextPolicy.
- Character-ref resolution, reference-image injection, or appearance-anchor assembly rules.
- The image provider's final prompt record.
- Cross-episode facts and structured dialogue schema.

If the user edits a picture script and regenerates, the old `imageData.prompt` still represents the previous generate until the new image succeeds.

If `ComicPanel.updatedAt` is later than `imageData.generatedAt`, the picture script or panel metadata changed after the last generate. The frontend should show "pending redraw" so the user does not think the current image already used the new script.

## Cross-Episode Facts

After panel-script generation, cross-episode facts settle for later-episode continuity. Fact categories stay structured: `completed` is plot that already happened, `revealed` is first appearance or reveal, `state_changed` is character, relationship, resource, or situation change.

The fact library is a user-reviewable continuity asset, not a free outline editor. Users may delete wrong facts. Create, classify, and context injection should still belong to structured panel generation and the fact service, so handmade entries do not break later prompt trust. Frontend display should group by episode order so users can locate a fact's source quickly.

## Review Views

The panel page keeps both a grid view and a strip reading view. Grid view is for batch-checking panel status, density, focus, and redraw entries. Strip view is for checking picture continuity, dialogue coverage, and finished-image effect in reading order.

Strip view is a review entry. It does not change underlying panel order, prompt records, or generate state. Redraw still uses the same `ComicPanel.visualPrompt`, character refs, dialogue balloons, and provider-prompt assembly rules.

## Dialogue Bubble Rules

In-balloon text rendering is core to the comic experience. The hard constraint: **balloons may render spoken line text only**. Speaker names, verbs such as "says", colons, quotation marks, or any narrator prefix are script-narration layer, not balloon layer.

Three defenses keep the rule:

1. **Storyboard prompt prevention**: `comicPanelScriptOutputSchema.panels[].dialogues[]` splits into `{ speaker, text, bubbleType, anchorHint }`. Render rule 2b tells the LLM that `text` may contain spoken line text only — no speaker name, colon, quotes, narration prefix, or speaker-prefix patterns such as `XX说` / `XX道`.
2. **Generate-prompt rewrite**: `buildDialoguePrompt` turns `speaker` into tail-direction information ("balloon tail points at XX") and locks in-balloon text to "balloon text is only `{text}`", with the balloon rendering rule forced at the top of the prompt.
3. **Defensive strip**: `stripSpeakerPrefix` removes speaker prefixes already present in `text` before generate, including quoted dual-read / historical dirty patterns such as `XX说：` and `XX：`, plus wrapping quotes, to tolerate old dirty data and occasional LLM violations.

`speaker` stays in the schema because it decides balloon-tail direction (which on-panel character it points at). It must never enter rendered balloon text.

## Style Keywords (Single Source)

All comic-related image generation takes style keywords from `resolveComicStyleKeywords(stylePresetRaw)` in `server/src/services/comic/comicStylePrompt.ts`. **Do not hard-code "manga/webtoon" again in character / asset / scene services.** That was a long-lived hole: the project chose ink-traditional, but three-views / expression sheets / asset images still generated color webtoon and conflicted with the final panel style.

Distinguish `stylePreset.style` (look: webtoon_color / ink_traditional / shounen_bw, and so on) from `stylePreset.promptKeywords` (comic form: vertical strip / four-panel, and so on). **The former injects into character / asset / scene; the latter injects only into the final panel.** Character / asset / scene reference sheets are not a "comic layout" and must not carry form words such as "vertical strip".

## Reference Image Metadata

At panel generate, material actually used in `finalRefImagePaths` is collected as `PanelReferenceImageMeta[]` into `imageData.referenceImages`:

```ts
{ kind: "character_sheet" | "character_expression" | "character_face" | "asset" | "scene", label: string, url: string }
```

`url` points at an existing HTTP endpoint (for example `/api/comic/character-images/{id}/sheet`, `/api/comic/character-assets/{id}/image`, `/api/comic/scenes/{id}/image`). The frontend panel dialog shows a thumbnail grid; click opens the large image in a new tab.

This mechanism is provenance metadata only and does not change generate behavior. Sprites (temporary per-character PNGs composed on the fly) are not persisted. Metadata records **constituent assets** (which character three-view + which assets), not the sprite itself — that saves disk, and the assets are already visible on character/asset tabs, so provenance stays light.

## Failure Modes

- If the final provider prompt becomes the primary editable field, users may accidentally delete character anchors and expression refs and collapse character consistency.
- If four-panel structure is achieved only by stacking a high target panel count, cost, panel stats, and reading pace drift from intent.
- If a panel picture script is edited without regenerating, the current image is still the old prompt's result. The UI must say "last sent" to avoid misleading the user.
- If an existing panel script is regenerated, old panels are replaced. The frontend must warn about overwrite risk when panels already exist.
- If cross-episode facts lack source episode order or category, later panel prompts cannot tell plot fact from reveal from state change, and continuity is misled.
- If the LLM puts a speaker prefix into `dialogues[].text`, balloons show narration prefixes. `stripSpeakerPrefix` is a backstop. The root fix is prompt engineering, not depending on regex.
- If a new generate entry skips `comicStylePrompt`, style falls back to a webtoon template and conflicts with the project look. New generate chains must join this single source.

## Related Modules

- `server/src/prompting/prompts/comic/comic.prompts.ts`
- `server/src/services/comic/ComicPanelScriptService.ts`
- `server/src/services/comic/ComicPanelImageService.ts`
- `server/src/modules/comic/http/comicRoutes.ts`
- `client/src/pages/comic/project/EpisodeListPanel.tsx`
- `client/src/pages/comic/project/PanelsGridPanel.tsx`

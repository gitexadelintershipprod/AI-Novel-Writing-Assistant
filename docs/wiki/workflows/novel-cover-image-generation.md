# Novel cover hero-image generation chain

## Background

Novel cover generation is a typical cross-domain capability: the entry lives on the novel edit page, but task create, image generation, asset storage, failure recovery, Task Center display, and primary-image switching all belong to the image domain. If provider selection, image task state, or the cover primary-image fact source are stuffed into the `Novel` core module, later chapter illustrations, cover layout export, and batch image tasks will quickly form two-way coupling.

The primary users are writing beginners. Cover V1 cannot require them to write an image prompt from scratch, and it cannot assume the model will emit usable book-title lettering. The current-stage goal is therefore: first auto-assemble a "cover hero image" input from novel basics, then let the user keep editing after AI optimization.

## Decision

Cover capability continues to reuse the existing image task/asset infrastructure. Do not create a second "novel cover task system". The image domain adds a `novel_cover` scene. The novel module supplies read-only material and a UI entry only, and must not depend on an image provider directly.

Prompts also do not live as inline strings in a service. They enter Prompt Registry: first turn novel information into a structured cover intent, then turn that structured intent into the final image prompt. Later cover layout, landscape posters, or channel assets can then grow without stacking branches back inside the novel service.

## Current Rule

- `ImageGenerationTask` and `ImageAsset` remain the unified image fact source.
- When `sceneType=character`, `baseCharacterId` is required and `novelId` is empty.
- When `sceneType=novel_cover`, `novelId` is required and `baseCharacterId` is empty.
- V1 enforces ownership only at schema and route/service validation. Do not introduce a complex polymorphic DB check.
- The novel main table does not add a field such as `coverImageAssetId`. The current cover is read from the image domain as `sceneType=novel_cover + novelId + isPrimary`.
- Cover gallery, primary-image switching, and auto-promoting a new primary after deleting the current primary all belong to the image domain.
- The novel edit page only assembles read-only cover draft material: title, synopsis, target readers, selling points, comparable-title atmosphere, first-30-chapter promise, commercial tags, genre/propulsion mode, world mood, and writing atmosphere.
- The default beginner path is fixed as "AI assembles first, then editable": generate a source brief, allow AI optimize, then allow manual edits to the final prompt.
- V1 generates a text-free cover hero image. It does not promise usable book-title lettering.

## Prompt Chain

### 1. Local draft assembly

Frontend and backend use the same cover-material field set:

- Title and one-sentence overview
- Target readers
- Core selling points
- Reading atmosphere
- First-30-chapter promise
- Commercial tags
- Genre base
- Primary/secondary propulsion mode
- World mood or world-slice core frame
- Style, point of view, pacing, emotional density

The novel basics page prefills the cover input draft with these fields. The backend uses the same semantics as fallback in `novelCoverPromptSupport`, so the two ends do not produce two different cover inputs for the same book.

### 2. Structured cover intent

`image.novel_cover.brief@v1`

- Input: source prompt + novel read-only context
- Output: structured cover intent
- Purpose: let the model first judge visual focus, selling-point expression, composition direction, and mood, instead of emitting a long final prompt immediately

### 3. Final image prompt

`image.novel_cover.prompt_optimize@v1`

- Input: source prompt + structured cover intent + output language
- Output: the text prompt actually sent to the image model
- Purpose: turn "cover intent" into a prompt the image model can consume, while leaving room for further human edits

### 4. Image task create

- When `promptMode=novel_cover_chain`, the image service continues to add cover-hero-image constraints
- Default size is `1024x1536`
- Default count is `2`
- Default negative constraints include text, book title, watermark, low sharpness, and deformity
- The current OpenAI recommended image model default is `gpt-image-2`, but the model name remains a configurable string. Do not hard-code a whitelist in the business layer.

## Task Center And Recovery

- Task Center must render image tasks by `sceneType`.
- `character` tasks continue to return to the character library.
- `novel_cover` task titles display as `Novel cover: {title}`.
- `novel_cover` `sourceRoute` is fixed to `/novels/{novelId}/edit?stage=basic`.
- Task-detail `meta` must keep `novelId` for recovery and frontend location.

## Examples

Recommended:

- Show the current primary cover and cover gallery on the novel basics page, but perform generate, primary switch, and delete through `/images/*` APIs.
- If the novel has no primary cover yet, automatically set the first successfully generated image to `isPrimary=true`.
- If a primary cover already exists, new images only enter the gallery. Replacing the primary cover requires an explicit user decision.

Not recommended:

- Adding a hard-coded cover field on the `Novel` table while also keeping image-domain `isPrimary`, creating two fact sources.
- Calling an image provider directly from the novel service and bypassing the image task and recovery chain.
- Hard-coding the cover prompt in the frontend or as an inline service string to "keep it simple", bypassing Prompt Registry.

## Failure Modes

- The novel page's cover and the Task Center recovery entry jump to different places: first check whether `sceneType` routing is consistent, then check `ImageTaskAdapter` `sourceRoute`.
- After deleting the primary cover the book has "no current cover": the image domain's primary backfill was bypassed.
- Frontend prefilled draft and backend-optimized context clearly disagree: check whether both ends reused the same material fields, especially commercial tags, propulsion mode, and world-slice core frame.
- Cover logic starts reverse-depending on novel provider config or novel persistence: the boundary is already broken. Pull the logic back into the image-domain facade.

## Related Modules

- `shared/types/image.ts`
- `shared/imagePrompt.ts`
- `server/src/routes/images.ts`
- `server/src/services/image/ImageGenerationService.ts`
- `server/src/services/image/ImagePromptOptimizationService.ts`
- `server/src/services/image/novelCover/novelCoverPromptSupport.ts`
- `server/src/services/task/adapters/ImageTaskAdapter.ts`
- `client/src/api/images.ts`
- `client/src/pages/novels/components/cover/`

## Source Documents

- `AGENTS.md`
- `docs/wiki/architecture/module-boundaries.md`
- `docs/wiki/architecture/image-generation-providers.md`

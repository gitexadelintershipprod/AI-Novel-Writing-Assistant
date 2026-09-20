# Image generation confirmation and unified runtime

## Background

Image generation usually spends real model quota, and the input is more than a prompt: character sheets, expression sheets, asset images, scene concept art, and keyframes also carry reference images, size, provider, negative prompts, and business-state write-back rules. Early entries called the generate API directly on button click. Users could not confirm what the model would actually receive before being charged, and developers duplicated state machines, disk writes, history archival, and error write-back across services.

When generation fails or a character drifts, beginners most need to see what this request actually sent. Every user-triggered single image generation must therefore show a confirmation dialog first, so the user can see prompt, reference material, and parameters before generate, and make one-time adjustments.

## Decision

User-triggered single image generation uses a unified `prepare -> ImageGenerationConfirmDialog -> generate(overrides)` flow. Backend entries must first build a generation context. `prepare` returns a displayable snapshot of that context. `generate` uses the same class of context and passes one-time override parameters from the dialog into the unified image runtime.

Image generation services should prefer `runImageGeneration` in `server/src/services/image/runtime/` rather than scattering provider checks, model resolution, generating state, image download/persist, extension cleanup, success/failure state, and history archival inside business services.

## Current Rule

- Before the user clicks a single-image action such as Generate image / Regenerate / Redraw / Generate keyframe / Generate character design, the UI must open `ImageGenerationConfirmDialog`.
- The dialog's `prompt`, `negativePrompt`, `referenceImages`, `provider`, and `size` must come from the backend `prepare` API. The frontend must not assemble the final image prompt itself.
- After confirm, only this attempt's temporary edits go to `generate` as `ImageGenerationOverrides`. Do not rewrite long-lived character, scene, project, or shot configuration.
- The user may temporarily remove reference material in the dialog. Removal affects only `refImagePaths/refImages` actually sent to the image model this time and the `referenceImages` recorded on success. It does not delete original images or change character/scene/shot asset state.
- Prompt explanation and prompt optimization in the dialog must run through backend LLM capability and a PromptAsset registered under `server/src/prompting/`. The frontend only displays the result or fills the current textarea. Do not explain prompts with fixed frontend rules.
- Prompt optimization only fills the positive prompt draft inside this confirmation dialog. The user still must click confirm generate to start the image task. Optimization results must not auto-write back to character, scene, shot, project config, or other long-lived state.
- The optimize entry should let the user type a natural-language request, such as style, mood, camera, or items to keep. The backend PromptAsset should prefer those requests, but must not override character identity, reference-image purpose, gender lock, or no-text / no-watermark constraints.
- Backend services should assemble prompt, reference paths, reference display metadata, size, negative prompt, and adapter in one generation context, so `prepare` and `generate` do not drift.
- `runImageGeneration` is the default execution entry for business-table JSON state-machine image generation. The business service only supplies `ImageTargetAdapter`, prompt, reference images, and extra done state.
- Entries that use the two-table `ImageGenerationTask` model should keep `ImageGenerationService` as the facade for task create, query, asset management, and queue dispatch. Real execution, cancel checks, provider calls, asset persist, task retry, and pending-snapshot image backfill belong to `ImageGenerationTaskExecutor`, so execution details do not pile back into the facade.
- After a successful generate, if traceable reference material was actually used, write `referenceImages` into the business state field so the frontend can show "reference material used for this generate".
- Two-table-model reference material should persist as same-owner `ImageAsset` ids. At task execution, resolve them to local file paths or usable URLs for the provider, and record the actual reference asset ids in generated-asset metadata.
- For grid images that temporarily compose a sprite sheet, persist the sprite's constituent assets in state, not the temporary sprite itself. The provider request may still use a temporary local file, cleaned up after the request.
- Grid-image prompts must prevent named-character reference faces from spreading onto crowd figures. If the frame has a crowd, passers-by, onlookers, disciple groups, soldier groups, or other background people, require variation in age, face shape, hairstyle, clothing color, body type, and pose, and forbid repeated identical faces / cloned faces.
- Automatic batch jobs may keep calling the backend unified runtime directly without a frontend confirm per item. Batch confirmation belongs at batch-job create / cost estimate / target-range confirmation, not blocking every image.

## Examples

- Comic character sheets, expression sheets, character assets, scene concept art, and single panels should each have a matching `prepare*` API. The frontend opens the shared dialog through `useImageGenerationFlow`.
- Short-drama character designs and shot keyframes are also image-generation entries and must show the image parameters about to be sent. If a shot keyframe enables character reference images, list those character designs in the dialog.
- Novel-cover and other task-table image entries should add a prepare snapshot if they later move onto the unified business-table state machine. Until then, do not add a new manual generate entry that skips confirmation.
- If the user cannot read the current prompt, they can trigger explain in the confirm dialog. If they want a lower drift risk, they can trigger optimize. Both are pre-generate decision aids, not a substitute for final confirm.
- If the user has their own optimization direction, pass the natural-language request to the optimize action instead of concatenating fixed fragments on the frontend. The LLM is responsible for folding the request into an executable prompt.
- If the user wants to test whether one reference image caused drift, they can temporarily remove it in the dialog and generate again. The backend must filter both the local files/URLs actually sent and the reference metadata written back to state.
- If crowd faces in a grid image look too alike, first check whether the prompt limited named-character references to the matching characters, and whether crowd figures already have variation constraints. Only if that remains unstable, promote the crowd into structured extras.

## Failure Modes

- Showing a "recommended prompt" on the frontend while the backend concatenates a different prompt at generate time makes confirmed information diverge from what is sent.
- If `prepare` uses database state to decide that a reference image exists, while `generate` uses disk files, the dialog can show an image that is never sent. Critical entries should confirm material availability in prepare with the same resolution path generate uses.
- If success does not write `referenceImages`, the frontend only sees the image and prompt and cannot trace character, asset, or scene references.
- Hiding a reference on the frontend while the backend still sends the original image makes the confirm dialog untrustworthy. Temporary removal must reach the backend as overrides and be filtered before the unified runtime call.
- Explaining prompts with fixed frontend copy or keyword rules makes users think the system understood image constraints. Explain and optimize must go through an LLM PromptAsset and structured-output validation.
- If prompt optimization auto-saves into character or scene config, a one-off experiment becomes long-lived setting. Unless there is a separate explicit save entry, the confirm dialog may only change this generate's parameters.
- If a grid image only appearance-anchors named characters, the image model may copy the lead's reference face onto crowd figures. Crowd variation constraints are baseline protection in the grid prompt and should not be handwritten by the user each time.
- Calling `generateImagesByProvider` directly from a business service easily misses generating/error state, history archival, old-extension cleanup, or provider support checks.
- Piling task-execution logic into the `ImageGenerationService` facade mixes create, queue dispatch, cancel/resume, provider calls, and asset writes in one file. New execution rules should go into `ImageGenerationTaskExecutor` first.
- If a batch job waits for a frontend dialog per image, the automated production chain breaks. Batch confirmation and single confirmation are different layers and must not be mixed.

## Related Modules

- `client/src/components/image/ImageGenerationConfirmDialog.tsx`
- `client/src/components/image/useImageGenerationFlow.ts`
- `server/src/services/image/runtime/`
- `server/src/services/image/ImageGenerationService.ts`
- `server/src/services/image/ImageGenerationTaskExecutor.ts`
- `server/src/services/comic/ComicCharacterImageService.ts`
- `server/src/services/comic/ComicCharacterAssetService.ts`
- `server/src/services/comic/ComicPanelImageService.ts`
- `server/src/services/comic/ComicSceneService.ts`
- `server/src/services/drama/DramaCharacterImageService.ts`
- `server/src/services/drama/visual/DramaShotKeyframeService.ts`

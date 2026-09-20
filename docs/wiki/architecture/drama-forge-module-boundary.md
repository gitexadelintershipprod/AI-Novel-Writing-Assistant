# Drama Forge module boundary

Updated: 2026-06-09

## Background

The short-drama creation module is not a downstream adaptation button on the novel detail page. It is an independent vertical-screen paid short-drama production chain. A novel is only one content source. Original inspiration and external text must also be able to enter the same short-drama production line.

If short-drama capabilities call novel business services directly, three problems follow:

- Original work and text import are forced to masquerade as novels.
- Characters, facts, quality gates, and video prompts inherit novel-production-chain constraints that do not serve short-drama pacing.
- Splitting into an independent short-drama product later would require rewriting the core engine.

## Current Rule

`server/src/services/drama` is an independent bounded context. It may depend on platform infrastructure such as Prisma, LLM, Prompt Runner, task queues, file export, and image/video, but it must not depend on business implementations in `services/novel` or `modules/novel`.

The only content contact point between the short-drama module and the novel module is `NovelSourceAdapter`. That adapter may only read novels, chapters, characters, and facts through Prisma in a read-only way, then convert them into a `SourceBundle`. Short-drama core services may consume only their own models, such as `SourceBundle`, `DramaCharacter`, `DramaFact`, and `DramaEpisode`.

## SourceBundle Anti-Corruption Layer

Every content source must first become a `SourceBundle`:

- `novel_import`: read a novel snapshot from this system.
- `original`: use AI to generate a standard content package from inspiration and genre.
- `text_import`: use AI to parse a standard content package from imported text.

Strategy, episode outlines, scripts, quality gates, storyboards, and video prompts must not branch on a specific source. Source differences are allowed only in adapters and in the content-package quality-check stage.

## Prompt Rules

Short-drama product-level prompts must live in `server/src/prompting/prompts/drama/` and be registered in `server/src/prompting/registry.ts`. The service layer may call structured output through a PromptAsset. It must not add unregistered prompt strings inside a service.

When structured output fails, fix the schema, prompt, context assembly, or JSON repair. Do not use keyword matching as a product-behavior fallback.

## Video generation boundary

Video generation is connected through `VideoProviderPort`. Short-drama core only generates and saves a `DramaVideoPrompt`, then hands the job to a provider adapter.

Replacing a provider must not affect:

- SourceBundle.
- Strategy and episodes.
- Scripts and quality gates.
- The storyboard model.
- Character visual anchors.

The current default provider is `mock`, used to verify the job abstraction and state flow. When a real provider is added, add an adapter. Do not write vendor fields into core strategy or storyboard rules.

## Failure Modes

- If `services/drama` imports a novel business path directly, the low-coupling guard test should fail.
- If a new short-drama prompt is not registered, Prompt Runner will refuse to run it.
- If `original` or `text_import` bypass AI structured parsing, the short-drama module falls back to fixed-rule generation and violates the AI-first rule.
- If video-provider logic enters script or storyboard services, a later vendor change will pollute the core production line.

## Related Modules

- `server/src/services/drama/source/SourceContentPort.ts`
- `server/src/services/drama/source/NovelSourceAdapter.ts`
- `server/src/services/drama/source/OriginalSourceAdapter.ts`
- `server/src/services/drama/source/TextImportSourceAdapter.ts`
- `server/src/services/drama/DramaScriptService.ts`
- `server/src/services/drama/DramaQualityGate.ts`
- `server/src/services/drama/DramaStoryboardService.ts`
- `server/src/services/drama/DramaVideoPromptService.ts`
- `server/src/services/drama/video/VideoProviderPort.ts`
- `server/src/prompting/prompts/drama/drama.prompts.ts`

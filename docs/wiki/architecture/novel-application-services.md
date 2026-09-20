# Novel application capability-layer boundary

## Background

`NovelService` once exposed project basics, chapters, planning, review, pipeline, characters, volume planning, storylines, world slices, and chapter editing through layered inheritance. After callers received the full God Object, it was hard to see which capabilities they actually depended on, and routes, Task Center, export, Auto-Director, and similar entrypoints kept expanding the same facade.

After Phase 4, novel business entrypoints use composed application capabilities. `NovelService` remains only as a compatibility facade and is no longer the default dependency for new code.

## Current Rule

- Production code should get the process-level capability set through `getSharedNovelServices()`, then inject the methods it needs with `Pick<NovelApplicationServices, ...>` or an explicit port. Do not call `createNovelApplicationServices()` directly from routes, Task Center, export, Agent tools, Auto-Director, or event handlers.
- `createNovelApplicationServices()` remains a low-level factory for test isolation, the deprecated `NovelService` compatibility facade, and explicitly marked legacy compatibility layers. New business entrypoints must depend on shared application services or an explicitly injected capability port.
- `routes/` may depend only on the minimum capabilities the current HTTP mapping needs. They must not import or `new` `NovelService`.
- Background tasks, export, Agent tools, Auto-Director, and event handlers should also depend on capability ports and must not hold a full `NovelService`.
- `NovelService`, `NovelPipelineService`, `NovelReviewService`, `NovelGenerationService`, and `NovelArtifactService` are compatibility layers. Methods may be kept for old tests or old external callers, but they must not inherit from each other to form a capability chain.
- Chapter generation, chapter repair, chapter planning, and replanning must still enter the unified production orchestrator / stage runner. The capability layer only composes and delegates. It does not copy execution implementations.
- Chapter-text writing may enter the production orchestrator only through `NovelApplicationServices.createChapterStream()` or a workflow step runner. The old chapter-generation entrypoints on `novelCoreGenerationService` and `NovelCoreService` may only be compatibility delegates. They must not hold `ChapterRuntimeCoordinator` directly.

## Failure Modes

- When a route test needs to mock business capabilities, patch `DefaultNovelApplicationServices.prototype`. Do not patch `NovelService.prototype`.
- If a new route injects the full capability set for convenience, it will degrade back into a God Object. When adding a route, list the methods it actually calls, then declare the minimum `Pick<>`.
- If an internal service does `new NovelService()` again, it has not defined its own port boundary. Inject the specific capability instead.
- If the Core layer reconnects directly to `ChapterRuntimeCoordinator`, manual generation, Auto-Director, and pipeline will fork different execution strategies again, so preparation, quality repair, and recovery judgment will disagree.

## Related Modules

- `server/src/services/novel/application/`
- `server/src/services/novel/NovelService.ts`
- `server/src/routes/novel*.ts`
- `server/src/services/novel/director/`
- `server/src/services/task/`
- `server/src/modules/export/`

# Chapter runtime boundaries

## Background

The chapter-text generation chain simultaneously owns streaming generation, empty-draft retry, chapter-text acceptance gates, timeline detection, final-draft finalization, asset sync, and pipeline batch adaptation. When `ChapterRuntimeCoordinator` carried those responsibilities as a single file, any entrypoint could bypass the unified chain, so manual generation, Auto-Director, and pipeline behavior forked.

After Phase 5, `ChapterRuntimeCoordinator` keeps only the stable facade and three public entrypoints. Concrete execution is owned by runtime internal submodules. External callers should not see that internal split.

## Current Rule

- External entrypoints may depend only on `ChapterRuntimeCoordinator`'s `createChapterStream`, `createRepairStream`, and `runPipelineChapter`.
- `ChapterStreamGenerationOrchestrator` owns the manual generation stream, empty-draft retry, SSE status, and pre-run fact gates.
- `ChapterQualityGateService` owns the dual acceptance and timeline gates, cache keys, and gate traces.
- `ChapterContentFinalizationService` owns final-draft finalization, runtime-package assembly, chapter-state advancement, timeline finalization, and deferred asset sync.
- `ChapterContentFinalizationService` must finish timeline finalization for the current chapter-text version before advancing chapter state or emitting `chapter:finalized`. Submit `stable` when the text passes the acceptance gate. Submit `degraded` when the text is usable but still has local quality debt; a later repair draft upgrades to `stable` with a new content hash.
- Timeline extraction does not participate in chapter-text acceptance. `acceptance` first produces the chapter-text quality conclusion; timeline finalization then commits the final text idempotently. Extraction or stable-commit failures degrade inside the Timeline service. Only data-integrity problems such as the checkpoint itself failing to persist may stop chapter-state advancement.
- `runtime/lifecycle/ChapterLifecycleService` is the only persistence write entrypoint for `content`, `generationState`, and `chapterStatus` on the chapter production chain. Generation, review, repair, and asset services decide business state and delegate persistence to it. They must not each update Chapter lifecycle fields directly.
- `ChapterPipelineRuntimeAdapter` only adapts pipeline hooks onto the unified chapter runtime. It does not copy writer, gate, or finalization logic.
- `chapterRuntimePackageBuilders.ts` holds IO-free builder functions only. It must not import Prisma, routes, director, or service singletons.
- `shared/types/chapterRuntime.ts` is the stable facade for the shared runtime contract. Style, dynamic character, Payoff, and quality-result schemas each live in domain files under `shared/types/chapterRuntime/`. External callers still import from the original facade path.
- Shared schema submodules may contain only Zod contracts and inferred types. The cross-domain `chapterRuntimePackageSchema` stays on the facade so it can assemble those pieces. Submodules must not depend back on the facade, which would create an initialization cycle.
- `ChapterRepairStreamRuntime` remains the repair-stream implementation boundary and was not split in Phase 5. The facade continues to delegate to it.

## Failure Modes

- A route, director, or old service imports `ChapterQualityGateService` / `ChapterContentFinalizationService` directly: the outside has started deep-linking into runtime internals.
- A runtime package builder imports a database or service singleton: the pure-function builder layer has mixed IO back in.
- The pipeline adapter copies generation or finalization logic: the batch-execution path has forked again.
- Chapter state has already entered `pending_review` or `needs_repair`, or a completion event has already been emitted, but the current content hash has no successful `timeline_finalization/stable|degraded` checkpoint: the terminal-state boundary was bypassed.
- Runtime code other than `ChapterLifecycleService` performs `prisma.chapter.update` lifecycle writes again: lifecycle-state ownership has forked.
- The coordinator grows past 700 lines again: the facade has re-absorbed internal responsibilities.
- Server or client code starts deep-importing `shared/types/chapterRuntime/*`: the compatibility facade was bypassed, so a future schema reshuffle will spread into business modules.

## Related Modules

- `server/src/services/novel/runtime/ChapterRuntimeCoordinator.ts`
- `server/src/services/novel/runtime/ChapterStreamGenerationOrchestrator.ts`
- `server/src/services/novel/runtime/ChapterQualityGateService.ts`
- `server/src/services/novel/runtime/ChapterContentFinalizationService.ts`
- `server/src/services/novel/runtime/ChapterPipelineRuntimeAdapter.ts`
- `server/src/services/novel/runtime/lifecycle/ChapterLifecycleService.ts`
- `server/src/services/novel/runtime/lifecycle/README.md`
- `server/src/services/novel/runtime/chapterRuntimePackageBuilders.ts`
- `shared/types/chapterRuntime.ts`
- `shared/types/chapterRuntime/README.md`

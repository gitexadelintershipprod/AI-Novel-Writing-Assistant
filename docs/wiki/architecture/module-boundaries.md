# Module boundaries and documentation governance

## Background

The project has grown from a single writing assistant into a monorepo that includes a Web frontend, an Express/Prisma backend, a desktop host, shared types, Prompt Registry, Auto-Director, RAG, Task Center, and the chapter production chain. After that accumulation, the recurring problem is usually not missing code. It is unclear module boundaries, unclear sources of truth, and unclear documentation ownership.

If the rules stay only in plan documents or phase checkpoints, future developers and AI agents will keep re-deciding the same questions: which module owns a capability, whether an old service may be called directly, whether a change belongs in release notes or the wiki, and whether a long file must be split.

## Decision

The wiki records stable rules. Plans and checkpoints keep historical context. Module governance is organized around the novel-production main chain: business modules such as setup, planning, production, director, characters, state, and export should gradually own clear entrypoints. Cross-cutting infrastructure should converge into platform capabilities such as prompting, RAG, LLM, db, runtime, and events.

Long-file splits are not about line count for its own sake. They exist to separate business rules, application orchestration, external adapters, and HTTP/API mapping. When a directory becomes dense, add a lower-level module with a real responsibility boundary instead of stacking more peer files.

## Current Rule

- The repository root keeps only entry explanations, collaboration rules, the roadmap, and toolchain configuration. Durable knowledge lives in `docs/wiki/`.
- `docs/plans/` keeps execution plans, `docs/checkpoints/` keeps phase records, `docs/design/` keeps module designs, and `docs/releases/` keeps user-visible changes.
- Evaluate a source file's responsibilities when it approaches 1,200 lines. 1,000 to 1,300 lines is acceptable while cohesion stays clear. Past 1,300 lines, split before expanding the feature.
- Before adding capability to a high-density directory, decide whether a lower-level ownership directory is required.
- Highest-priority hard constraint: control entrypoints may differ, but the business execution chain for chapter-text generation and chapter-text repair must be unique. Batch execution, Auto-Director, manual single-chapter generation, and manual single-chapter repair must not each maintain a separate implementation.
- Any new entrypoint that "will rewrite chapter text" must join `novelProductionOrchestrator + stage runner + ChapterRuntimeCoordinator`. Different transports, routes, jobs, or frontend streaming shapes are allowed. Bypassing the unified runtime to own writer, patch repair, heavy repair, chapter-text persistence, asset sync, or review-state advancement logic is not.
- A `route`, `director`, Creative Hub, old `NovelCoreReviewService`, or other legacy service must not hold chapter-text generation or repair implementations. They may only be control entrypoints or thin facades that delegate execution to the unified chapter main chain.
- Every entrypoint that changes chapter text must trigger final timeline finalization. The module-boundary order is fixed: the chapter-text runtime produces the final text, `ChapterTimelineFinalizationService` writes the timeline checkpoint from that final text, and only then may the next chapter, a background batch, or an Auto-Director continuation step proceed.
- `ChapterTimelineFinalizationService` is the application-service boundary for timeline commits. `routes`, `director`, Creative Hub, old review services, repair helpers, and frontend projections must not assemble `ChapterTimeAnchor`, `StoryTimelineEvent`, `TimelineHook`, or `ChapterArtifactSyncCheckpoint` write rules themselves.
- The timeline module owns events, hooks, time anchors, constraints, detection, and the commit repository. Chapter runtime collaborates with the timeline module only through the timeline facade and the finalization service. Writer prompts may consume timeline context, but they must not close hooks or write timeline tables themselves.
- Repair paths and skip paths must not bypass finalization. After a successful repair, the repair runtime calls finalization. When the maximum repair count is exhausted but continuation is allowed, the batch / Auto-Director path submits degraded finalization. `replan_required` remains blocking; a degraded skip must not swallow it.
- `server/src/services/novel/workflow/` should expose only workflow facades. Internals continue to converge into `store`, `healing`, `projection`, and `application`. Outside modules must not deep-link into internal implementations.
- Checkpoint recovery data should be assembled through shared helpers so `healing` and `application` do not each copy recovery logic.
- `server/src/services/novel/director` should continue to converge into ownership boundaries such as `commands`, `runtime`, `state`, `automation`, `projections`, `recovery`, and `phases`.
- The `server/src/services/novel/director/` root keeps only stable facades and compatibility bridges. Command execution goes in `commands/`, task state in `state/`, fact summaries / run projections / display snapshots in `projections/`, recovery and backfill in `recovery/`, phase nodes and phase policy in `phases/`, takeover / confirmation / candidates / run orchestration in `runtime/`, and HTTP mapping in `http/`.
- `server/src/routes/` keeps only traditional HTTP entrypoints that have not yet been migrated. HTTP mapping for the novel main chain, Auto-Director, novel export, and world setup must live in the matching business module's `http/` directory and be mounted directly from `app.ts`. Do not keep re-export shims in the `routes/` root.
- Novel business application entrypoints should be composed through the capability layer in `server/src/services/novel/application/`. `NovelService` is only a compatibility facade. Routes and background services must not re-depend on the full God Object.
- `ChapterRuntimeCoordinator` is the stable external facade for chapter runtime. Stream orchestration, quality gates, final-draft finalization, pipeline adapters, and runtime package construction may collaborate only inside `server/src/services/novel/runtime/`. Outside modules must not deep-link those internal services.
- New business capabilities should be exposed through a module facade or `index.ts`. Do not deep-link into another module's internal files from outside.
- Boundary changes that touch Auto-Director, chapter execution, Prompt, RAG, task state, or frontend projection should update the wiki or the module README in the same change.
- Creative Hub is a query, diagnosis, execution-record, and navigation boundary, not a novel producer. The server uses an explicit read-only tool allowlist and blocks out-of-bound calls for the whole action. Tools that can create execution-side effects, including `preview_pipeline_run` and `diff_chapter_patch`, must not be allowed. Diagnostic analysis uses an empty `workflowTaskId` and must not write queries into Auto-Director task analysis records. Novel creation, asset generation, chapter-text writes, patches, full-book pipelines, recovery, retry, cancel, and Auto-Director commands must enter through official workflows.
- The full agent-driven novel application stays in a separate repository: `https://github.com/ExplosiveCoderflome/ani-book-agent`. It owns its own Agent Runtime, Markdown/YAML creative artifacts, and run records, and it does not share runtime authority with this project. The Creative Hub page only provides clone and launch hints that work across devices; it must not display developer-machine paths.
- Any data backfill, sync, extraction, or index refresh must consume only stable chapter snapshots. While a chapter may still be repaired, rewritten, or rolled back, those actions must not hang off the hot path.
- Task snapshots, fact checks, and recovery-suggestion generation must stay read-only. `recover` may return a recoverable position, but polling, preview, or projection reads must not write `run_resumed`, recovery hints, or other state events. When a recovery action needs to be recorded, an explicit execute / recover flow must write it. The read path must not write it as a side effect.
- `novelEventBus` may carry only lightweight domain notifications. Heavy side effects such as character-dynamics sync, pipeline snapshots, RAG reindexing, and state recomputation must enter a durable queue or an existing dedicated queue. Event handlers must not run those services directly.
- Novel export is an independent business module. `server/src/modules/export/` only reads existing novel-production data, converts export DTOs, and generates TXT/Markdown/JSON content and export filenames. It does not own the source of truth for novels, chapters, characters, timeline, or quality repair, and it does not write production state back during export.
- The timeline constraint layer is an independent business module. `server/src/modules/timeline/` only manages timeline events, chapter time anchors, hooks, constraints, and detection reports. It does not replace `StoryStateSnapshot`, `ConsistencyFact`, or `CharacterTimeline`, and it does not call the chapter writer to rewrite chapter text.
- Chapter generation, Prompt Registry, and Task Center may obtain timeline context or detection reports only through the timeline module facade. Writer, route, or UI code should not assemble timeline-table query rules directly.

## Examples

Recommended:

- When Auto-Director adds an executable command, decide first whether it belongs to command, runtime, automation, recovery, or projection, then place it in that module.
- When the chapter production chain adds a quality check, decide first whether it is a hot-path acceptance gate, a local repair, or asynchronous asset backfill.
- When chapter production adds a timeline rule, put it in the timeline module's policy, context, checker, or extractor first. Do not scatter it into writer prompts or chapter-service branches.
- When chapter production adds a chapter-text write or repair entrypoint, connect it to `ChapterRuntimeCoordinator` first, then reuse `ChapterTimelineFinalizationService`. Do not write chapter text and then let the caller decide whether to backfill timeline.
- If a new document explains a long-lived rule, put it in `docs/wiki/`. If it is only a phase implementation checklist, put it in `docs/plans/` or `docs/checkpoints/`.

Forbidden or discouraged:

- Keep adding peer `novelDirector*` files in the `services/novel/director` root to host new subsystems.
- Put business policy in generically named `helper`, `utils`, or `shared` files.
- Copy release notes into the wiki, or write the wiki as a per-commit change list.
- Duplicate a chapter writer / repair pipeline in `routes/`, `director/`, Creative Hub, or an old service so different entrypoints can maintain their own copies.
- Directly `upsert ChapterTimeAnchor`, `create StoryTimelineEvent`, or `update TimelineHook` inside director, route, or repair helpers, bypassing the finalization service.

## Failure Modes

- The same state is inferred separately in task, runtime, seed payload, and frontend cache, so the UI and the actual run disagree.
- One old service handles HTTP semantics, workflow orchestration, database writes, and prompt-input assembly at once, so later fixes can only add more branches.
- Documentation stays in a phase plan, so stable rules are hard for later tasks to reuse.
- The next chapter's required timeline, hook, previous-chapter tail, or task sheet is missing: first check whether a module boundary was bypassed, especially whether chapter-text writes never entered `ChapterTimelineFinalizationService`.

When diagnosing, find the source of truth and the module entrypoint first, then decide whether a missing boundary caused a duplicated implementation.

## Related Modules

- `server/src/services/novel/director/`
- `server/src/services/novel/workflow/`
- `server/src/services/novel/runtime/`
- `server/src/services/novel/runtime/ChapterTimelineFinalizationService.ts`
- `server/src/modules/export/`
- `server/src/modules/timeline/`
- `server/src/services/novel/application/`
- `server/src/events/sideEffects/`
- `server/src/prompting/`
- `client/src/pages/`
- `shared/`
- `docs/`

## Source Documents

- [Docs management conventions](../../README.md)
- [Auto-Director execution-plane isolation and API keep-alive plan](../../plans/auto-director-execution-plane-isolation-plan.md)
- [Director-mode modularization and state-governance refactor checklist](../../plans/director-mode-module-state-refactor-checklist.md)
- [Novel Director subsystem](../../../server/src/services/novel/director/README.md)
- [Novel application capability-layer boundary](./novel-application-services.md)
- [Chapter runtime boundaries](./chapter-runtime-boundaries.md)
- [Event side-effect boundaries](./event-side-effect-boundaries.md)

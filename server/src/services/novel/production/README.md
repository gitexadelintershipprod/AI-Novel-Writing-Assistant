# Novel Prose Production Execution Boundary

`NovelCorePipelineService` is the facade for chapter pipeline tasks. It creates, reuses, resumes, and cancels tasks, and maintains the task lifecycle.

`NovelPipelineExecutor` owns the chapter execution loop for one already-claimed pipeline, including prose generation, quality closure, rolling-route fill, next-chapter JIT prefetch, and chapter-boundary handoff. It does not create a second set of prose capabilities; concrete chapter writing, review, repair, and fact commit still delegate to the unified `ChapterRuntimeCoordinator`.

Inside the executor, three explicit sub-boundaries are used by responsibility: `qualityClosure/` owns chapter review, quality debt, and explicit replan results; `issueGovernance/` converts task policy into continue, pause, or fail control flow; `handoff/` handles production-experience handoff only at the chapter safe-persist boundary.

Maintenance rules:

- Auto-director, manual batch, and resume entrypoints all enter the same executor through the pipeline facade.
- The route window only guarantees that future direction is available; a full execution contract is generated just-in-time for the next chapter.
- Ordinary quality debt must not stop whole-book production. Only an explicit replan or a runtime safety problem may stop it.
- An issue event may be recorded as executed only after pipeline state or control flow actually adopts the corresponding action.
- Handoff from simple auto-creation to the professional workbench may take effect only at the chapter persist boundary.
- Deferred character, world, and planning enhancements have lower priority than prose, review, repair, and next-chapter JIT.

# Director Mode Modularization and State Governance Refactor Checklist

Updated: 2026-05-05

This document is based on the current `beta` branch code, the latest round of director-mode Worker / Command / Projection work, and the existing auto-director refactor plans. It is not a new vision document. It is the next-round development closure checklist: converge "auto-director, continue execution, recovery, takeover" onto the same Pipeline Engine, so step modules truly own input, output, progress inspection, and recovery contracts.

## 1. Current Conclusion

Root-cause class: **Incomplete closure**.

Recent versions already completed a first layer of infrastructure: `DirectorRunCommand`, an independent Director Worker, runtime projection, some `DirectorRun / DirectorStepRun / DirectorEvent / DirectorArtifact` records, `WorkflowStepModule` descriptors, and NodeRunner / PolicyEngine integration. These changes solved some of "Web API dragged down by long tasks" and "fake-running tasks".

But director mode's core loop is still incomplete:

- Auto-director, continue execution, recovery, and takeover still carry their own flow semantics instead of a unified command entrypoint.
- `WorkflowStepModule` currently looks more like a step catalog and contract description; many steps do not have their own `buildInput / inspectProgress / execute / validateOutput / commit / recover`.
- Step status, task status, runtime command status, chapter status, and UI projection still coexist from multiple sources.
- Chapter execution progress still leans on runtime reporting and fixed percentages, not recomputable progress based on chapter artifacts, review results, repair tickets, and state commits.
- Files such as `DirectorRuntimeStore`, `NovelDirectorService`, `DirectorWorkspaceAnalyzer`, and `novelDirectorAutoExecutionRuntime` are still too long or mixed in responsibility, at or near the project's architecture thresholds.

In one sentence: **execution-plane isolation has a first version, step modularization is only half a set, and state governance is not yet closed.**

## 2. Target Architecture

The goal is not to add another "continue-execution chain" or "recovery chain", but to unify as:

```text
User Command
  -> DirectorCommandInterpreter
  -> DirectorPipelineEngine
  -> DirectorStateReader
  -> StepModuleRegistry
  -> StepInputAssembler
  -> StepModule.execute(input)
  -> StepOutputValidator
  -> DirectorStateCommitter
  -> DirectorProjection
```

Principles:

- **Command is only intent**: `start / continue / resume / recover / takeover / approve / pause / cancel` are all just commands.
- **Pipeline only orchestrates**: choose the next module, assemble input, execute, commit, advance; it does not write concrete business logic.
- **StepModule is the capability**: each step declares input, output, artifacts, progress inspection, and recovery strategy.
- **State Machine is the fact**: `DirectorRun + DirectorStepRun + DirectorArtifact + DirectorEvent` is the source of truth.
- **Projection is only display**: task center, novel page, and Creative Hub only read projections; they do not assemble state themselves.

## 3. P0 Refactor Checklist

### P0 this-round implementation record (2026-05-05)

This round completed the P0 first-stage closure commit on branch `codex/director-p0-pipeline-state-closure`:

```text
48d23b6 Refactor director P0 pipeline state foundation
```

Completed or landed as a skeleton:

- [x] Created feature branch `codex/director-p0-pipeline-state-closure` from `beta`.
- [x] Added `DirectorCommandInterpreter`, unifying interpretation of command intents such as `continue / resume_from_checkpoint / retry / takeover / cancel / confirm_candidate / repair_chapter_titles`.
- [x] Added `DirectorPipelineEngine.dispatch()`; `DirectorExecutionService` is now a thin adapter layer; Worker commands uniformly enter the Pipeline.
- [x] Added `DirectorStateReader`, aggregating task, runtime, run, active step, latest command, and chapter execution matrix for the Pipeline to read canonical state.
- [x] Added `DirectorStateCommitter`, first taking pipeline dispatch event writes, as the later unified commit point for start / complete / fail / block / cancel.
- [x] Extended the `WorkflowStepModule` contract with `inspect / buildInput / validateOutput / commit / inspectProgress / recover / completeCriteria`.
- [x] Fixed `chapter_repair` and `quality_repair` reusing the same step id; runtime ids are now split into `chapter.draft.repair` and `chapter.quality.repair`.
- [x] Added `ChapterExecutionProgressInspector`; chapter execution progress is derived from the chapter artifact matrix; `needs_repair` is a local recoverable state and does not directly mark the whole book as failed.
- [x] Runtime projection added a `chapterExecutionProgress` summary, including current chapter, current sub-stage, chapters pending repair, recoverable range, and stage evidence.
- [x] Added `ArtifactReader / ArtifactWriter` gateway skeleton, first reusing the existing `DirectorArtifact` table, with no destructive migration.
- [x] Closed `runtimeStatusForTaskStatus`: no longer treat old task status as a direct fact of runtime completion.
- [x] Closed `ensureRuntimeInstance`: prefer an explicit `runId`, then task; no longer silently rebind another task's runtime by `novelId` alone.

This round is still P0 foundation. Parts not yet fully closed:

- [ ] The Pipeline interior still has old service-adapter transitional calls; the four core steps have not all been changed to closed-loop execution only through `buildInput -> execute -> validateOutput -> commit`.
- [ ] `DirectorStateCommitter` does not yet cover all step-lifecycle writes; only the pipeline dispatch event entry and source-of-truth interface skeleton are done.
- [ ] Artifact Ledger has a read/write gateway, but stale / protected / dependency impact analysis is not yet wired into Workspace Analyzer.
- [ ] Progress already has a StepModule contract and chapter matrix, but old `DIRECTOR_PROGRESS` fixed percentages still need to be further demoted to a pure fallback.
- [ ] Worker persistence delta writes, projection response-body size constraints, and long-task blocking performance tests still need to be filled in the next stage.

This-round verification:

- `pnpm --filter @ai-novel/shared build`
- `pnpm --filter @ai-novel/server build`
- `pnpm --filter @ai-novel/client typecheck`
- `node --test server/tests/directorWorkflowStepModules.test.js server/tests/directorExecutionService.test.js server/tests/directorRuntimeExecutionService.test.js server/tests/directorChapterExecutionProgress.test.js`

### P0-1 Unify entrypoint semantics

Goal: auto-director, continue, recovery, takeover, retry, and confirmation gates all become commands, no longer each owning a business flow.

Tasks:

- [x] Establish `DirectorPipelineEngine.dispatch(command)` as the sole execution entrypoint.
- [x] Converge `continue / resume_from_checkpoint / retry / takeover / approve_gate` into the same command-interpretation semantics.
- [x] Forbid new entrypoints from directly calling old phase services, the chapter pipeline, takeover runtime, or `scheduleBackgroundRun`.
- [x] Old entrypoints such as candidate confirmation, candidate generate/rewrite/patch/title polish, and title repair also enter serializable commands, avoiding leftover synchronous preparation and old-style background scheduling.
- [x] API routes may only write commands or read projections; they do not execute LLM, chapter generation, chapter splitting, repair, or takeover analysis.

Completion criteria:

- [x] All heavy director actions execute after a Worker lease.
- [x] Repeated clicks of continue, resume, approval-continue, or candidate generation produce only one active command.
- [x] `continue` no longer no-op succeeds based on old task status.

Implementation record:

- Command types already covered: `generate_candidates`, `refine_candidates`, `patch_candidate`, `refine_titles`, `confirm_candidate`, `continue`, `resume_from_checkpoint`, `retry`, `takeover`, `approve_gate`, `repair_chapter_titles`, `policy_update`, `workspace_analysis`, `manual_edit_impact`, `cancel`.
- Write routes have been closed to `DirectorCommandService.enqueue*Command()`; the candidate dialog submits a command then reads the command result projection.
- `DirectorRuntimeExecutionService` keeps old API compatibility, but the Worker execution path enters `DirectorPipelineEngine.dispatch()`; inside the Pipeline, adapters wrap old heavy services; the route layer no longer calls them directly.
- Verification commands: `pnpm --filter @ai-novel/shared build`, `pnpm --filter @ai-novel/server build`, `pnpm --filter @ai-novel/client typecheck`, `node --test server/tests/directorControlPlaneBoundary.test.js server/tests/directorRunCommandService.test.js server/tests/directorExecutionService.test.js server/tests/directorWorker.test.js`.

### P0-2 Make the StepModule contract real

Goal: a step is not just a descriptor; it owns complete input, inspection, execution, and recovery boundaries.

Suggested standard interface:

```ts
interface DirectorStepModule<Input, Output> {
  id: string;
  inspect(context): Promise<StepInspection>;
  buildInput(context): Promise<Input>;
  execute(input, runtime): Promise<Output>;
  validateOutput(output, context): Promise<StepValidation>;
  commit(output, context): Promise<StepCommitResult>;
  inspectProgress(context): Promise<StepProgress>;
  recover(context): Promise<StepRecoveryPlan>;
}
```

Tasks:

- [ ] Upgrade current `WorkflowStepModule` from "descriptor" to "executable module contract".
- [ ] Fill `buildInput` for every step; forbid different entrypoints from each assembling prompt input.
- [ ] Fill `inspectProgress` for every step, allowing progress to be recomputed from artifacts after a service restart.
- [ ] Fill `completeCriteria` for every step; must not rely only on `recordStepCompleted`.
- [ ] Fix the design where `chapter_repair` and `quality_repair` reuse the same step id and cannot be expressed independently.
- [ ] New modules must first register StepModule, PromptAsset, Artifact type, and Context Resolver, then join the pipeline.

Completion criteria:

- `story.macro.plan`, `book.contract.create`, `chapter.task_sheet.plan`, and `chapter.draft.write` each have at least a real module implementation.
- The Pipeline only calls the module contract; it does not know concrete business tables or prompt details.
- After any step fails, `inspectProgress` can tell whether it is not started, partially complete, complete, recoverable, or needs human confirmation.

### P0-3 Establish a single state source of truth

Goal: end the state confusion of `NovelWorkflowTask`, `DirectorRunCommand`, runtime instance, step run, and chapter state guessing at each other from multiple sources.

Tasks:

- [ ] Make `DirectorRun` the sole root state of a book-level director run.
- [ ] Make `DirectorStepRun` the step execution record; it does not carry book-level completion semantics.
- [ ] `DirectorRunCommand` only expresses control-plane commands and leases, not business completion.
- [ ] Demote `NovelWorkflowTask` to an outer projection compatible with the task center; it no longer carries real business state.
- [ ] Chapter state expresses only the chapter itself and does not reverse-decide whether the whole director run is complete.
- [ ] Remove or close logic such as `runtimeStatusForTaskStatus` that maps task status directly to runtime status.
- [ ] `ensureRuntimeInstance` must not rebind different tasks' run instances by `novelId` alone; there must be an explicit run identity.

Completion criteria:

- Any UI state can be traced to `DirectorRun / StepRun / Event / Artifact`.
- It is no longer necessary to guess "is it running, waiting approval, failed, or complete" via multiple projection priorities.
- After service restart, Worker stale, and task-center retry, fake running does not appear.

### P0-4 Chapter execution progress matrix

Goal: chapter execution is no longer only coarse stages `generating_chapters / reviewing / repairing`, but an inspectable, recoverable, explainable chapter × sub-stage matrix.

Suggested matrix:

```text
chapter.execution
  execution_contract_ready
  context_package_ready
  draft_started
  draft_saved
  audit_completed
  repair_completed_or_not_needed
  runtime_package_saved
  chapter_artifacts_synced
  chapter_state_committed
  reviewable_or_approved
```

Tasks:

- [ ] Build a `ChapterExecutionProgress` projection per chapter; do not directly trust a single progress field.
- [ ] Derive sub-stages from chapter content, generationState, chapterStatus, audit report, repair ticket, artifact sync, and state commit.
- [ ] Treat `needs_repair` as an explainable local state, not equivalent to whole-book failure.
- [ ] Derive overall chapter-batch execution progress by weighting the chapter matrix, not from a fixed percentage.
- [ ] UI shows current chapter, current sub-stage, completed chapter count, chapters pending repair, and continuable range.

Completion criteria:

- When chapter 5 review fails, the system shows that chapter 5 needs repair and does not freeze the whole book.
- When chapter 6 continues execution, it does not recreate chapter 5's pipeline job.
- After a service restart, it can resume from the last successful chapter and sub-stage without overwriting body text again.

### P0-5 Artifact Ledger truth-layer closure

Goal: artifacts become the facts of communication between modules, not a scatter of seed payload, checkpoint, and business-table stitching.

Tasks:

- [ ] Establish unified artifact types for book contract, macro plan, character governance, volume strategy, chapter task sheet, chapter body, review report, repair ticket, and state commit.
- [ ] Each artifact records source step, content hash, version, dependsOn, protectedUserContent, and stale state.
- [ ] StepModule reads upstream artifacts only through `ArtifactReader` and writes new artifacts through `ArtifactWriter`.
- [ ] When the user manually edits body text or core settings, the corresponding artifact is marked protected or a new user version.
- [ ] Workspace Analyzer judges missing / stale / protected / recoverable based on the ledger.

Completion criteria:

- After a manual change to the protagonist's motivation, the system can point out that character governance, volume goals, and later chapter task sheets need review.
- After a manual polish of body text, the system does not redo the macro plan; it only suggests review or continuity sync.
- After a key foreshadowing is deleted, the system can point out affected payoffs and chapter tasks.

### P0-6 Progress from reporting to self-inspection

Goal: progress is not a percentage written by a runtime heartbeat; it is the result of a step module inspecting itself from evidence.

Tasks:

- [ ] Keep heartbeat as a UI waiting hint, but it must not be factual progress.
- [ ] Every StepModule provides `inspectProgress(context): StepProgress`.
- [ ] `StepProgress` returns `status / current / total / ratio / label / evidence / nextAction`.
- [ ] `DIRECTOR_PROGRESS` fixed percentages are only old-UI compatibility, no longer the core progress source.
- [ ] Projection consumes `inspectProgress` results first.

Completion criteria:

- During a long prompt, the UI can show a waiting explanation; after a service restart, progress can be recomputed from artifacts.
- Problems such as `book_contract` fixed percentages going backward or not moving no longer affect real progress judgment.

### P0-7 Worker and persistence second closure

Goal: finish the second half of execution-plane isolation so Worker write locks and full runtime rewrite no longer drag down the control plane.

Tasks:

- [ ] Confirm SQLite enables `WAL + synchronous=NORMAL + busy_timeout` by default.
- [ ] Change runtime persistence to delta writes; do not fully rebuild steps/events/artifacts on every mutation.
- [ ] Stop stuffing a full runtime snapshot back into `NovelWorkflowTask.seedPayloadJson`.
- [ ] Keep projection queries lightweight; do not read large workspaces, chapter body text, or prompt context.
- [ ] Real Prisma sampling covers old-project takeover, restart recovery, chapter-batch recovery, and retry after cancel.

Completion criteria:

- While the Worker runs a long task, `/api/tasks/overview` and runtime projection can still respond.
- Frontend running state no longer high-frequency refreshes full volumes/workspace.
- After a Worker crash, the API can still open the task center and recovery panel.

## 4. P1 Refactor Checklist

### P1-1 Workspace Analyzer AI-first closure

- [ ] Deterministic inventory only lists facts; it does not make product-level next-step judgments.
- [ ] Next-step recommendation, manual-edit impact, takeover strategy, and recovery strategy must come from AI structured output.
- [ ] Deterministic code only does safety filtering, scope constraints, and post-processing of structured results.
- [ ] Establish a schema for `manualEditImpact / affectedArtifacts / minimalRepairPath / safeToContinue / requiresApproval`.

### P1-2 PolicyEngine hard gates

- [ ] High-cost LLM batch calls, large-scope chapter execution, overwriting user content, and downstream recomputation must all pass PolicyEngine.
- [ ] `resume` releases only the currently matching gate once; it does not persist a switch of the entire run policy.
- [ ] `waiting_approval` is not running; after the UI reaches a gate, running-state polling stops.

### P1-3 Quality-loop modularization

- [ ] Reader Promise, Chapter Retention, Rolling Window Review, Character Governance, and World Rule use unified artifacts and step contracts.
- [ ] Review failure outputs affected scope, repair ticket, and suggested action; it does not freeze the whole book directly.
- [ ] Auto-repair defaults to at most once; after failure, enter human repair or continue-with-risk.

### P1-4 Creative Hub only calls Runtime APIs

- [ ] Creative Hub tools only call public APIs such as `analyze_director_workspace / get_director_run_status / run_director_next_step / run_director_until_gate / evaluate_manual_edit_impact`.
- [ ] Forbid Creative Hub from calling old phase services directly.
- [ ] High-risk actions enter the unified approval gate.

### P1-5 Split large files and slim responsibilities

Current over-threshold or near-threshold focus files include:

- `server/src/services/novel/director/novelDirectorTakeover.ts`
- `server/src/services/novel/director/novelDirectorAutoExecutionRuntime.ts`
- `server/src/services/novel/director/runtime/DirectorWorkspaceAnalyzer.ts`
- `server/src/services/novel/director/DirectorRuntimeExecutionService.ts`
- `server/src/services/novel/director/NovelDirectorService.ts`
- `server/src/services/novel/director/runtime/DirectorRuntimeStore.ts`
- `server/src/services/novel/director/DirectorCommandService.ts`
- `server/src/services/novel/director/runtime/DirectorEventProjectionService.ts`

Tasks:

- [ ] Shrink `NovelDirectorService` to an API facade; it no longer carries execution details.
- [ ] Split `DirectorRuntimeStore` into step store, event store, artifact store, and run store.
- [ ] Split `DirectorWorkspaceAnalyzer` into inventory, AI interpretation, impact analysis, and recommendation.
- [ ] Split `AutoExecutionRuntime` into range resolver, chapter matrix runner, quality/repair bridge, and projection bridge.
- [ ] Split `Takeover` into workspace analysis, attach run, downstream reset, and resume plan.

## 5. P2 Refactor Checklist

- [ ] LangGraph is only a low-risk orchestration-shell pilot; it does not carry business truth.
- [ ] Model routing upgrades from coarse `planner / writer / review / repair` to step-level routing.
- [ ] Beginner entry converges to "recommended next step + advanced manual entry", reducing exposure of flow parameters.
- [ ] The volume-level workbench consumes Reader Promise, Payoff Ledger, Rolling Review, and Replan results.
- [ ] Prompt Workbench remains a read-only catalog / preview; formal override is a separate governance plan.

## 6. Recommended Implementation Order

1. **Unify command -> pipeline engine first**: do not add more entrypoint branches.
2. **Then make 3-4 core StepModules real**: book contract, macro plan, chapter task sheet, chapter body execution.
3. **Build the chapter progress matrix in parallel**: this is the cut that most improves user perception and recovery semantics.
4. **Close the state source of truth**: demote `NovelWorkflowTask` to a projection.
5. **Land the Artifact Ledger truth layer**: support manual-edit impact and recovery.
6. **Split large files**: avoid continuing to pile features onto old services.
7. **Add real Prisma regressions**: use data chains to prove recovery, continue, takeover, and chapter execution do not pollute each other.

## 7. Acceptance Scenarios

Must cover:

- [ ] Create a novel from a one-sentence inspiration and stop at candidate confirmation.
- [ ] After confirming a candidate, enter the same `DirectorRun` and generate book contract, macro plan, characters, volumes, and chapter task sheets.
- [ ] After taking over an existing novel, first analyze existing artifacts, then recommend the minimal next step.
- [ ] After the user changes the protagonist's motivation, the system gives affected artifacts and a minimal repair path.
- [ ] After the user polishes chapter 3 body text, the system does not redo the macro plan; it only suggests review or continuity sync.
- [ ] After chapter 5 review fails, generate a repair ticket and do not freeze the whole book.
- [ ] After auto-repair fails once, enter human repair or continue-with-risk.
- [ ] After a service restart, first show a recoverable state; after user confirmation, continue from the last stable artifact.
- [ ] Continuing chapter 6 does not recreate chapter 5's pipeline job.
- [ ] While the Worker runs a long task, task-center and novel-page projections still respond.
- [ ] When Creative Hub is asked "what should I do now", it answers from the runtime snapshot and workspace analysis.

## 8. Non-goals

- Do not do database reset, truncate, drop, or destructive migration.
- Do not replace AI structured judgment with keywords, regex, or hard-coded branches.
- Do not treat LangGraph as a one-shot main-chain rewrite.
- Do not let the UI read internal runtime large objects directly.
- Do not, for the sake of speed, keep wiring new features into old `scheduleBackgroundRun` or old phase services.

## 9. One-sentence closure standard

When the next round of director-mode refactor is complete, the system should become:

```text
One unified state machine, driving a set of inspectable, recoverable, extensible AI Step Modules.
```

And no longer:

```text
Multiple entrypoint flows, each writing state, then projections guessing current progress after the fact.
```

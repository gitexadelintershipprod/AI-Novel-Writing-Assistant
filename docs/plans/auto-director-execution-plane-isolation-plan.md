# Auto-Director Execution Plane Isolation and API Keep-Alive Plan

Updated: 2026-04-29

Related documents:

- [Auto-Director Runtime and Recovery Boundaries](../wiki/workflows/auto-director-runtime.md)
- [Director Mode Modularization and State Governance Refactor Checklist](./director-mode-module-state-refactor-checklist.md)
- [Prompt Workbench, Context Assembly, and Unified Step Runtime Plan](./prompt-workbench-context-and-step-runtime-plan.md)

## 1. Background and Incident Conclusion

On 2026-04-29, while testing the auto-director resume / continue chain for `Head-Pat Domestication: Company-Wide Beastification Crisis`, the following symptoms appeared:

- After clicking "Continue Director", `POST /api/novel-workflows/:id/continue` hung for a long time.
- At the same time, ordinary query APIs such as `/api/tasks/overview`, `/api/novel-workflows/novels/:novelId/auto-director`, and `/api/novels/:novelId/volumes` also started hanging.
- Backend logs showed the task entering `runDirectorStructuredOutlinePhase -> chapter_list -> generateVolumes`, accompanied by high memory reservation lock contention and large-volume workspace reads and writes.
- Changing the continue route to `202 Accepted` and deferring background startup still did not fix the root cause, because heavy auto-director execution was still running in the Web API main process.

Final judgment:

> This is not a single slow endpoint, nor merely excessive frontend polling. The auto-director execution plane and the Web API control plane were not isolated. The heavy novel production chain ran in the same Node process, so the event loop, SQLite/Prisma write locks, and large-object handling together stalled all APIs.

## 2. Architecture Shapes That Must Not Be Reintroduced

From the moment this document takes effect, the following practices are forbidden from being reintroduced:

1. An API route directly `await`ing an auto-director long task, chapter generation, volume chapter splitting, quality repair, batch execution, or any LLM production chain.
2. The Web API main process directly carrying high-cost `structured_outline / chapter_list / chapter_detail_bundle / chapter_execution / quality_repair` execution.
3. Using `setImmediate`, `void Promise`, or `fire-and-forget` inside the same Web API process to fake background work as a long-term solution.
4. The frontend repeatedly polling large novel-asset APIs while auto-director is running, for example frequently fetching `volumes` as a progress source.
5. Active-task status APIs returning a full `seedPayload`, a full `directorSession`, candidate batches, runtime snapshots, or large chapter objects.
6. Using UI disabled buttons, reduced polling, delayed toasts, and similar tactics to hide backend execution-plane blocking.
7. Letting task status, runtime projections, and artifact truth continue to scatter across routes, services, seed payloads, and frontend caches.

Short-term stopgaps are allowed only to protect user data or stop an incident from spreading; they are not completion criteria.

## 3. Target Architecture

Auto-director must be split into two planes:

```text
Web API control plane
  - Receive commands
  - Return lightweight task projections
  - Serve task-center / novel-page status queries
  - Manage user confirmation, policy configuration, and cancel requests
  - Do not execute the heavy production chain

Execution-plane Worker
  - Claim a task lease
  - Execute Step Module / NodeRunner
  - Call the LLM
  - Handle large prompts, large JSON, and structured parsing
  - Write Artifact Ledger / DirectorEvent / WorkflowTask status
  - Recover idempotently from checkpoints
```

Unified data flow:

```text
Frontend continue / resume / takeover command
  -> Web API command route
  -> DirectorRunCommand / WorkflowTask queued
  -> Worker lease
  -> DirectorRuntime Orchestrator
  -> Step Module
  -> PolicyEngine
  -> Artifact Ledger
  -> DirectorEvent
  -> Runtime Projection
  -> Frontend lightweight polling
```

## 4. Module Boundaries

| Module | Responsibility | Forbidden |
| --- | --- | --- |
| Web API routes | Validate input, create commands, return `202` or lightweight query results | Do not call the LLM, do not generate volumes/chapters, do not run auto-director stages directly |
| Director Command Service | Turn user actions into idempotent commands bound to a task/run/lease key | Do not execute concrete production steps |
| Director Worker | Claim commands, renew leases, execute, persist failure state, release leases | Do not serve user query APIs |
| DirectorRuntimeService | Runtime facade, state snapshots, events, policy, node scheduling | Do not bypass the Worker by being invoked from a route for long tasks |
| NodeRunner / Step Module | Standard execution unit, read/write declarations, policy judgment, artifact writes | Do not mutate UI state directly |
| PolicyEngine | Overwrite protection, cost gates, scope gates, approval gates | Must not be bypassed by the frontend |
| Artifact Ledger | Artifact truth, versions, dependencies, stale, protection state | Must not exist only as a seed payload wrapper |
| Runtime Projection | Lightweight UI-facing state | Do not return full large novel assets |

## 5. Data Model and Persistence Plan

### 5.1 DirectorRunCommand

Used to record every executable command:

- `id`
- `taskId`
- `novelId`
- `commandType`: `continue | resume_from_checkpoint | retry | takeover | cancel | policy_update`
- `idempotencyKey`
- `status`: `queued | leased | running | succeeded | failed | cancelled | stale`
- `leaseOwner`
- `leaseExpiresAt`
- `attempt`
- `payloadJson`
- `errorMessage`
- `createdAt / updatedAt`

Requirements:

- The same `taskId + commandType + idempotencyKey` must be idempotent.
- Repeated clicks of continue may only reuse or return an existing run command; they must not start a second execution chain.
- A cancel command must not kill the process directly. Write a cancel intent first; the Worker responds at a safe checkpoint.

### 5.2 DirectorRun / StepRun / Event / Artifact

Continue advancing the additive schema already landed:

- `DirectorRun` represents one recoverable director run.
- `DirectorStepRun` represents a standard node execution.
- `DirectorEvent` represents projectable progress.
- `DirectorArtifact` / `DirectorArtifactDependency` represent artifact truth and dependencies.

Completion requirements:

- Web API queries read projections only; they do not scan the large ledger.
- Worker event writes must be append-only; state updates must be projectable.
- Artifact Ledger must support missing detection, stale detection, user-content protection, and partial recovery.

### 5.3 WorkerLease

If a separate table is not created, it may first be merged into `DirectorRunCommand`; the semantics must still exist:

- A lease must have an expiration time.
- On Worker startup, expired leases are reclaimed first.
- After a service restart, do not silently continue running automatically. First enter a pending-manual-recovery or continuable queue, and follow the current product policy.

## 6. Backend Implementation Plan

### Phase 1: Command-style entrypoints

Goal: every continue / resume / retry entrypoint first becomes a command write.

Tasks:

- Add `DirectorCommandService`.
- `POST /api/novel-workflows/:id/continue` only creates a command and returns `202`.
- `POST /api/tasks/recovery-candidates/:kind/:id/resume` only creates a resume command and returns `202`.
- `retryTask(..., resume: true)` for auto-director tasks becomes a retry/resume command.
- The API response body contains only command id, task id, and current lightweight status; it no longer returns full task details.

Completion criteria:

- The route layer has no `await runDirectorPipeline / continueTask / generateVolumes / repair / chapterExecution`.
- Under local load, the continue API has `P95 < 500ms`.
- Repeated clicks of continue produce only one active command.

### Phase 2: Worker execution plane

Goal: move heavy auto-director execution out of the Web API main process.

Tasks:

- Add `server/src/workers/directorWorker.ts`.
- Add a Worker polling loop: claim queued commands, write a lease, execute, renew the lease, and persist success or failure.
- Root dev scripts distinguish `server api` from `director worker`. They may start in parallel in development, but they must be separate processes.
- The desktop host must later also manage API and Worker lifecycles separately.
- Inside the Worker, call existing execution methods on `NovelDirectorService / DirectorRuntimeOrchestrator`, but routes no longer call those execution methods directly.

Completion criteria:

- Busy-ness of the `3000` API process does not rise significantly with structured chapter-list generation.
- Worker process CPU / memory consumption can be observed independently.
- A Worker crash does not stop the API process from responding.

### Phase 3: Slim execution methods and a dedicated Worker API

Goal: prevent the Worker from still looping back into API semantics through the giant `NovelDirectorService` facade.

Tasks:

- Extract `DirectorExecutionService`, callable only by the Worker.
- Converge `NovelDirectorService` into an API facade and compatibility entrypoint.
- Split `continueTask` into:
  - `createContinueCommand`
  - `prepareResumeContext`
  - `executeContinueCommand`
- Split `structured_outline` into independent steps: `beat_sheet`, `chapter_list`, `chapter_detail_bundle`, `chapter_sync`.

Completion criteria:

- `NovelDirectorService` no longer mixes worker-loop, command, route, and execution-detail responsibilities.
- New auto-director capabilities must register a Step Module; they may not be added directly as branches on the main service.

### Phase 4: Lightweight projections and frontend load reduction

Goal: while running, the frontend only reads lightweight state and does not frequently pull large assets.

Tasks:

- Add or strengthen `GET /api/novels/director/runtime/:taskId/projection`.
- The novel page while running polls the projection by default, with a period of no less than `4000ms`.
- `GET /api/novel-workflows/novels/:novelId/auto-director` may only return lightweight details of the active task; it must not use a full `seedPayload` / `directorSession` as a polling response.
- `volumes` is refreshed only when the event version changes, the user switches to the volume workspace, or generation completes.
- The auto-director progress bar, task center, and sidebar all read status from the projection.
- Remove the in-run fixed 2-second invalidate of `volumes`.

Completion criteria:

- During background execution, the browser no longer piles up hung `volumes` requests.
- Projection response bodies stay under `20KB`, with P95 under `300ms`.
- Active auto-director task responses must not carry execution-plane large objects such as candidate batches, chapter body text, prompt context, or large runtime snapshots.

### Phase 5: SQLite / Prisma write isolation

Goal: reduce the impact of Worker write locks on the API query plane.

Tasks:

- Worker writes use short transactions; do not call the LLM or perform large JSON computation inside a transaction.
- Large workspace documents are finished in memory before write; the transaction only performs the final persist.
- Provide lightweight selects for `volumes` / runtime projection queries so unnecessary large fields are not read.
- During long write phases, write progress via events first so the UI does not wait for a complete workspace.

Completion criteria:

- During background chapter splitting, `/api/tasks/overview`, runtime projection, and task details are not blocked for long by SQLite write locks.
- Prisma query logs no longer show a pattern of ordinary queries being continuously blocked inside the same long task.

### Phase 6: Resume, cancel, and failure semantics

Goal: after Workerization, the recovery chain remains idempotent, explainable, and open to manual takeover.

Tasks:

- On Worker startup, scan stale leases, mark commands as `stale`, and put the task into pending manual recovery.
- When the user clicks resume, create a new command; do not reuse an already-stale execution scene.
- Cancel writes a cancel command and abort intent; the Worker stops at a step boundary.
- Failure persistence must include:
  - `lastHealthyStage`
  - `blockingReason`
  - `resumeAction`
  - `recoverableArtifactRefs`

Completion criteria:

- After a service restart there is no fake running.
- Cancel, resume, and retry do not start concurrent dual chains.
- The user can see where to resume from, why it stopped, and what the next step is.

## 7. Frontend Implementation Plan

Must complete:

1. While auto-director is running, the page only polls the runtime projection.
2. After `continue` succeeds, the button immediately leaves pending and shows "Continue request submitted / queued / running" status.
3. While running, no longer force-invalidate `volumeWorkspace` every 2 seconds.
4. The task center only reads task summary + projection; it does not read large workspaces.
5. "Open current task location" is what pulls the corresponding business assets.
6. On Worker stale / failed, show pending-recovery actions, not running.

UX goals:

- What a beginner sees is "the system is advancing which step", not a frozen browser.
- The page remains clickable for the task center, project navigation, and current progress.
- A long task does not make the entire workbench unusable.

## 8. Observability and Regression Tests

The following regressions must be added:

1. `continue route returns quickly`
   - Simulate the execution service blocking for 10 seconds.
   - Assert the route returns `202` within `500ms`.

2. `api remains responsive while director worker is running`
   - Start the Worker executing a long structured outline mock.
   - Concurrently request `/api/tasks/overview`.
   - Assert ordinary APIs still return within `500ms`.

3. `duplicate continue is idempotent`
   - Repeatedly click continue on the same task.
   - Assert there is only one active command / lease.

4. `worker stale lease becomes manual recovery`
   - Simulate a Worker interruption.
   - Assert the task does not show running and shows pending manual recovery.

5. `running page does not poll heavy volumes repeatedly`
   - Frontend tests or browser automation inspect running-state requests.
   - Assert high-frequency polling only hits the projection and does not pile up `volumes`.

6. `sqlite write lock does not freeze task overview`
   - Simulate Worker short-transaction writes.
   - Assert overview queries can return.

Acceptance must include real Prisma sampling:

- Takeover of an old project.
- Manual recovery after a service restart.
- `structured_outline` recovering from beat sheet to chapter list.
- Recovery after chapter batch-execution failure.
- User manual edits affecting analysis and partial recovery.

## 9. Performance Gates

Hard gates:

- `POST /continue`: P95 `< 500ms`.
- `/api/tasks/overview`: P95 `< 500ms` during background execution.
- runtime projection: P95 `< 300ms` during background execution.
- While auto-director is running, the frontend must not continuously pile up pending XHR.
- After a Worker crash, the API can still open the task center and the recovery dialog.

Any submission that fails the gates above must not be treated as completing the auto-director recovery chain.

## 10. Anti-Rollback Rules

Later development must obey:

- When adding auto-director execution capability, first ask "is this control plane or execution plane".
- The control plane may only write commands or read projections.
- The execution plane may only run in the Worker.
- If the route layer contains any of the following calls, it must be sent back for refactor:
  - LLM invoke
  - `generateVolumes`
  - `runDirectorPipeline`
  - `runDirectorStructuredOutlinePhase`
  - `runChapterExecutionNode`
  - large-scope repair / review
- When adding polling in a frontend running state, it must be proven that it reads a lightweight projection, not a full business asset.
- If the Worker is temporarily bypassed to meet a deadline, the same PR must mark the temporary scope, rollback plan, and the reason acceptance is blocked; by default it must not be merged as complete.

## 11. Recommended Execution Order

Current priority is adjusted to:

1. `P0-E0` Auto-director execution-plane isolation: command-style entrypoints, independent Worker, lightweight projections, API keep-alive regressions.
2. `P0-E1` Recovery chain: complete idempotent recovery, stale lease, cancel, and manual recovery under Worker semantics.
3. `P0-E1` Artifact Ledger truth layer: provide queryable artifact truth for Worker recovery and partial replay.
4. `P0-E1` PolicyEngine hard gates: all Worker write actions remain policy-protected.
5. `P0-A` Real Prisma sampling regressions: verify old-project takeover, restart recovery, batch execution, and local repair after edits.

Until execution-plane isolation is complete, auto-director entrypoints should not be expanded further, and heavier default generation chains should not be added.

## 12. 2026-04-29 Landing Record

This round completed the first version of execution-plane isolation:

- Added a persisted `DirectorRunCommand` command table to carry auto-director control-plane commands such as `continue / resume_from_checkpoint / retry / takeover / cancel`.
- Continue, recovery, task-center retry, and follow-up continue actions now write a command queue instead of calling the heavy auto-director continue chain directly from a Web API route.
- When the Worker executes `continue / resume_from_checkpoint / retry` commands it must force real recovery execution; it must not no-op succeed because the task table still has a leftover `running` status.
- Worker stale-lease reclaim must also clear leftover `DirectorStepRun.running` for the same task, so runtime projection and task details do not keep showing fake running.
- Auto-director `continue` must no longer run full workspace / Artifact Ledger impact analysis by default; impact analysis may only be triggered through an explicit inspection entrypoint, so a SQLite single-writer lock does not stall control-plane queries.
- The old-project takeover entrypoint now first creates a lightweight takeover task and writes a `takeover` command; actual takeover validation, workspace analysis, and subsequent execution are performed by the Director Worker.
- Added an independent `Director Worker` entrypoint. The Worker claims commands, renews leases, executes, and persists success/failure/stale status.
- Frontend running-state refresh is split into lightweight projection polling and artifact-boundary refresh. The every-2-seconds force-refresh of `volumes` while auto-director is running is removed.
- In active auto-director task details, `pendingManualRecovery` must take display priority over `queued/running`; a pending-recovery task must not show as "running" in the top takeover bar, task panel, or step list.
- Added boundary regression tests forbidding auto-director control-plane routes from calling `continueTask` directly again, and verifying that dev/desktop dev start an independent Worker.

A second investigation in this round confirmed: converting `continue` into a Worker command is not enough to complete execution-plane isolation. After clicking continue, batches of pending XHR still appeared because three layers of pressure stacked:

- While SQLite is still in the default `DELETE` journal mode, Director Worker write transactions block Web API read requests; even after API and Worker processes are separated, a single-writer database lock still stalls the control plane.
- On every running-state change, `DirectorRuntimeStore` replays and writes complete steps/events/artifacts, and also writes the full `directorRuntime` back into `NovelWorkflowTask.seedPayloadJson`, widening the write-lock window.
- The novel editor page and workbench sidebar still load or batch-refresh large objects such as the full workspace, volume workspace, quality reports, character assets, and payoff ledger while auto-director is running; during Worker write locks these requests queue and form a browser-side pending pile-up.

Additional closure requirements:

- On SQLite startup, `WAL + synchronous=NORMAL + busy_timeout` must be configured unless `SQLITE_ENABLE_WAL=false` is explicitly set for diagnosis; desktop and development must not default back to `DELETE` journal.
- Running-state persistence must write by delta, handling only changed step/event/artifact/dependency rows; it must not fully delete and rebuild running state on every mutation, and must not keep stuffing the full runtime back into the task seed payload.
- While auto-director is running, the frontend may only poll the lightweight projection; full business assets may only refresh for the currently visible tab after the user enters the corresponding workspace, after an event-version change in a non-running state, or when the task completes or waits for confirmation.
- `waiting_approval` is a hard gate / human-confirmation state, not a running state that needs continuous polling; after reaching the gate, running-state polling should stop and wait for an explicit user continue.
- "Continue" for `waiting_approval` must submit explicit `resume` confirmation semantics; an empty `continue` command may only queue execution and must not be interpreted as the user having agreed to the current gate.
- `resume` may release only the currently matching `waiting_approval` node once; it must not persist a switch of the entire runtime policy, and must not bypass later new high-risk gates.
- Boundary tests must cover: SQLite WAL configuration exists, running-state persistence no longer fully rewrites, and frontend running state no longer batch-invalidates all workspace resources.

Still needs further closure:

- Candidate confirmation, title repair, and similar entrypoints still include some synchronous preparation or old-style background scheduling; they must later be moved onto serializable commands.
- `NovelDirectorService.scheduleBackgroundRun` is still kept for compatibility with old entrypoints and must not be used as the integration path for new capabilities.
- After Workerization, real Prisma sampling still needs to cover old-project takeover, restart recovery, chapter-batch recovery, and retry after cancel.

## 13. 2026-04-30 Phase Summary

Execution-plane isolation has now moved from "plan confirmed" to "first runnable skeleton":

- `DirectorRunCommand` already carries control-plane commands such as `continue / resume_from_checkpoint / retry / takeover`.
- An independent Director Worker already claims commands, renews leases, executes, and persists success/failure/stale.
- Safe `continue / resume_from_checkpoint` commands are automatically requeued on the first lease expiry, so a brief Worker pause does not immediately become a manual failure; repeated expiry of the same command still moves to manual recovery, avoiding frequent repeated LLM calls.
- Worker stale reclaim also clears leftover `DirectorStepRun.running`, reducing fake running in runtime projection.
- Frontend running state has moved from batch-refreshing full workspace assets to lightweight projection polling.
- After chapter execution starts, prior chapter-split confirmation checkpoints are cleared, and the workbench sidebar can follow the real chapter-execution stage.

Current progress figures:

- Execution-plane isolation first version: about `75%`.
- Auto-director Runtime MVP: about `85%`.
- Full unified runtime: about `70%`.

Next-round closure priorities:

- Confirm SQLite enables `WAL + synchronous=NORMAL + busy_timeout` by default in development and desktop, and keep an explicit diagnostic switch.
- Confirm running-state persistence writes by delta, no longer fully deleting and rebuilding steps/events/artifacts on every mutation, and no longer stuffing the full runtime back into the task seed payload.
- Confirm that while auto-director is running the frontend only polls the lightweight projection; full business assets refresh only on the user-visible workspace, task completion, or waiting-for-confirmation, by boundary.
- Move candidate confirmation, title repair, and similar old entrypoints onto serializable commands so old-style background scheduling does not bypass the Worker.
- Use real Prisma data sampling to verify old-project takeover, restart recovery, chapter-batch recovery, retry after cancel, and main-flow state isolation after title-repair failure.

# Novel Director Subsystem

## Architecture Overview

Backend execution for long-novel auto-director is split into three layers:

### 1. Task Dispatch Layer (`TaskDispatcher` + `DirectorTaskQueue`)

- **`TaskDispatcher`** — in-process event bus. When a new command is enqueued it emits a signal so the worker wakes immediately.
  It replaces the old architecture's 1.5-second fixed polling, while still keeping polling as a cross-process and crash-recovery fallback (5-second interval).
- **`DirectorTaskQueue`** — single active-queue abstraction. Currently it only lease / renew / complete / fail `DirectorRunCommand`,
  and exposes `leaseNext` / `completeTask` / `failTask` semantics. Resource throttling (`ResourceGate`) is also managed at this layer.

### 2. Worker Consumption Layer (`DirectorWorker`)

The worker is a pure consumer. Core loop:
```
waitForWork() → leaseNext() → acquireResourceGate() → markRunning() → executeCommand() → completeTask()
```
It does not operate any database model directly. `DirectorTaskQueue` and `DirectorCommandExecutor` are injected through the constructor so tests can replace them with mocks.

### 3. Persistence and Scheduling Layer (Services)

- **`DirectorCommandService`** — HTTP entrypoint: creates `DirectorRunCommand` and emits `taskDispatcher.notify()` to wake the worker.
- **`DirectorCommandExecutor`** — interprets a command as auto-director pipeline actions and calls `NovelDirectorService` to advance candidate, takeover, recovery, approval, and repair flows.
- **`DirectorRuntimeStore` / `DirectorRuntimeService`** — maintain auto-director steps, events, artifacts, and policy snapshots; they do not participate in background command lease.

## Facade Entry

```typescript
import {
  DirectorCommandService,
  DirectorCommandExecutor,
  DirectorTaskQueue,
  taskDispatcher,
} from "./runtime/directorSubsystem";
```

## Directory Boundaries

The `director/` root keeps only stable facades and compatibility bridges. New auto-director capabilities must enter an explicit-responsibility directory:

- `commands/`: background command creation, interpretation, and execution.
- `commands/leases/`: command-lease claim, renew, terminal-state closeout, and worker-disconnect governance; external callers still go through the `DirectorCommandService` facade.
- `state/`: director-task state read, write, and commit.
- `projections/`: runtime projections, task snapshots, progress, and display state.
- `recovery/`: recovery, backfill, downstream reset, and structured-outline recovery cursors.
- `phases/`: auto-director phases, phase-node adapters, and phase-level quality policy.
- `runtime/`: takeover, confirmation, candidates, continue-execution, runtime orchestration, and memory/validation policy.
- `issues/`: issue catalog, policy fact sources, task-policy snapshot reads, and detected / decided / applied event contracts.
- `http/`: Express route mapping.

External modules should prefer these directories' facades or stable entrypoints and should not keep adding same-prefix business files to the `director/` root.

## Data Models

The system currently has one active background command queue:

| Layer | Model | Purpose |
|------|------|------|
| Active Queue | `DirectorRunCommand` | The only active command queue; associated directly with `NovelWorkflowTask` |
| Runtime Snapshot | `DirectorRun` → `DirectorStepRun` / `DirectorEvent` / `DirectorArtifact` | Auto-director step, event, and artifact history |
| Legacy Runtime Queue | `DirectorRuntimeInstance` → `DirectorRuntimeCommand` → `DirectorRuntimeExecution` | Kept only for historical projection compatibility; no longer written as a new background command queue |

New code must not add write paths for `DirectorRuntimeCommand` / `DirectorRuntimeExecution`. When showing old task history, those historical rows can be read through a runtime projection; when queuing execution, a `DirectorRunCommand` must be created through `DirectorCommandService`.

Issue-governance actions may be recorded as `issue_action_applied` only after a real execution boundary confirms them. Command-lease recovery owns re-queue, human recovery, or failure terminal state; the pipeline and circuit breaker each own their own control flow. These modules must not merely record a policy decision and then keep using the old branch.

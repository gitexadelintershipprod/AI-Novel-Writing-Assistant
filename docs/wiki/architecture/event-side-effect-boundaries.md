# Event side-effect boundaries

## Background

The novel-production chain emits domain events at nodes such as chapter finalization, volume-plan updates, and pipeline completion. Those events notify other modules that a fact happened. The event itself is not a reliable task system. If an event handler directly runs expensive side effects such as character-dynamics recalculation, snapshot creation, or RAG reindexing, the main flow is blocked in a hidden way, and unfinished work cannot be recovered after a process restart.

## Decision

`novelEventBus` only carries in-process lightweight notifications. Any side effect that may be slow, needs retry, needs recovery, or may touch multiple tables must be written to a durable queue and executed by a background worker.

Current queue split:

- `RagIndexJob` is the RAG-index dedicated queue. It only handles knowledge chunking, vector writes, deletes, and rebuilds.
- `NovelSideEffectJob` is the novel-domain side-effect queue. It handles non-RAG work such as character-dynamics sync, character-dynamics rebuilds triggered by volume planning, and pipeline-completion snapshots.
- `EventBus` handlers may only do fast fact checks, idempotency-key computation, and enqueueing. They must not call heavy side-effect services directly.

## Current Rule

`NovelSideEffectJob` uses a tight state machine:

- `pending -> running -> succeeded`
- `pending -> running -> failed`
- `failed -> running -> succeeded`
- `failed -> running -> failed`
- `running -> dead`

`failed` is a retryable waiting state and must carry `runAfter`. `dead` is the terminal failure after max attempts or an incompatible payload. State updates must be conditioned on the current state. Workers must claim jobs with atomic conditional updates so concurrent workers do not run the same job.

Retry policy must use exponential backoff, jitter, and a cap, so one fault recovery does not create a retry avalanche.

## Idempotency Windows

An idempotency key must name "the same semantic job." Do not concatenate the current time just to bypass deduplication.

- Chapter-draft character sync: the same `chapterId`, chapter `updatedAt`, and chapter-text hash are the same sync job. A change to the text or chapter update time must create a new job.
- Volume-plan character rebuild: the idempotency key comes from a fingerprint of fields that affect character volume duties and chapter-planning semantics, including volume order, volume summary, main promise, key chapter plans, and character volume assignments. An unrelated update time must not create a new job by itself.
- Pipeline-completion snapshot: the same pipeline `jobId` may create an automatic milestone snapshot only once.

## Failure Modes

- Event-handler enqueue fails: `EventBus` records the error. The main flow must not run the heavy side effect inside the handler as a fallback.
- Worker execution fails: the job enters `failed` and retries on backoff. After `maxAttempts` it enters `dead`.
- Service restart: expired `running` jobs are restored to retryable `failed` at startup, then workers continue them.
- Incompatible payload version: the job enters `dead`. A developer must write migration or compensation logic for that `payloadVersion`.

## Related Modules

- `server/src/events/EventBus.ts`
- `server/src/events/handlers/registerNovelEventHandlers.ts`
- `server/src/events/sideEffects/`
- `server/src/services/rag/RagIndexService.ts`
- `server/src/services/rag/RagWorker.ts`

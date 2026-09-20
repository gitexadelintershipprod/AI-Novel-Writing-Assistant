# Lazy planning (JIT task sheet) refactor (Phase 1)

## Background

### Problem

The old flow required every one of N chapters to pre-generate a task sheet (`chapter_detail_bundle`) and fully sync them into the execution zone (`chapter_sync`) before any chapter could execute. That introduced two systemic defects:

| Defect | Description |
|------|------|
| **Defect 1: Full chapter-split gate** | A 100-chapter novel had to wait until every task sheet was generated before execution could start. Latency was huge. |
| **Defect 2: Task sheet drifted from prose** | Task sheets were generated in the “planning period” and did not know which chapter facts had already been written, so obligations could contradict actual prior prose. |

### Solution

**Lazy planning (JIT)**: move task sheets from “full pre-generation in the planning stage” to “just-in-time generation before execution”, and inject occurred facts (Fact Ledger) into generation context. That is the direct fix for unreachable obligations (root cause D).

Fast start extends lazy planning into “rolling route window + next-chapter execution contract”: the system always keeps at least 3, target 5, brief future-chapter routes, but prepares a full task sheet, scene cards, word count, and pitfall constraints only for the next chapter. The route answers “where we go next”. The execution contract answers “how the next chapter is actually written”. The two must not be mixed into full-volume refinement.

---

## Architecture Change

### Old flow

```
structured_outline stage (serial, full)
  beat_sheet → chapter_list → chapter_detail_bundle (one by one for N chapters) → chapter_sync (full)
        ↓ gate: syncedChapterCount >= plannedChapterCount (N/N all task sheets)
chapter_execution stage
  Chapter 1: GenerationContextAssembler.assemble → plannerService.ensureChapterPlan → write chapter
  Chapter 2: ...
```

### New flow (`full_book_autopilot` mode)

```
structured_outline stage (skip chapter_detail_bundle)
  beat_sheet → chapter_list → ✗chapter_detail_bundle (skipped) → chapter_sync (chapter titles only)
        ↓ gate: syncedChapterCount >= plannedChapterCount (passes once chapter rows exist in DB)
chapter_execution stage
  Chapter 1: JIT-generate task sheet (factLedger empty, generate a base task sheet)
           → plannerService.ensureChapterPlan → write chapter → persist
           → ChapterContentFinalizationService writes factLedger (chapter 1 facts)
  Chapter 2: JIT-generate task sheet (factLedger includes chapter 1 facts)
           → plannerService.ensureChapterPlan → write chapter → ...
```

---

## Key Components

### ChapterPlanJITService

**File**: `server/src/services/novel/planning/ChapterPlanJITService.ts`

In automatic book-completion mode, `ChapterPlanJITService` first calls `ChapterRouteWindowService` to check the route window, then refines the current chapter. If fewer than 3 unwritten route chapters remain, it fills to the target of 5. Fill is incremental by beat block and reuses existing volume documents and chapter sync. It does not rebuild completed routes, and does not trigger no-op Payoff Ledger sync.

Core method: `ensureExecutionReady(novelId, chapterId)`

| Scenario | Behavior |
|------|------|
| Task sheet exists + factLedger < 3 entries | Skip (old novel / first chapter; keep the existing task sheet) |
| Task sheet exists + factLedger ≥ 3 entries | Regenerate, injecting facts as `guidance` |
| Task sheet missing | Generate (with factLedger `guidance` when present) |

**Dependency injection** (through `ChapterPlanJITDeps`):
- `ensureChapterExecutionContract`: delegates to `NovelVolumeService.ensureChapterExecutionContract`

**Fact Ledger injection format** (`guidance` field):
```
[Occurred facts / Fact Ledger — include the following facts in the task sheet design; avoid repetition or contradiction]
Completed goals:
  - [Chapter N] ...
Revealed information:
  - [Chapter N] ...
Recent state changes:
  - [Chapter N] ...
```

### Structured-outline stage change

**File**: `server/src/services/novel/director/phases/novelDirectorStructuredOutlinePhase.ts`

Changes:
1. `chapter_detail_bundle` step: when `isFullBookAutopilotRunMode(request.runMode)`, `break` immediately and skip full task-sheet pre-generation.
2. `missingExecutionContextOrders` check: in JIT mode, a chapter without a task sheet is expected state, so the check is conditionally skipped.

### Execution-entry wiring

**File**: `server/src/services/novel/runtime/GenerationContextAssembler.ts`

Insert before `plannerService.ensureChapterPlan`:
```typescript
if (request.controlPolicy?.advanceMode === "full_book_autopilot") {
  await this.chapterPlanJITService.ensureExecutionReady(novelId, chapterId);
}
```

After `ensureChapterPlan` detects a task-sheet change through `buildChapterExecutionContractHash`, it naturally recomputes the execution plan.

---

## Compatibility

| Scenario | Behavior |
|------|------|
| Old novel (task sheet exists, factLedger empty) | factLedger < 3 entries → skip JIT, keep existing task sheet |
| Old novel (task sheet exists, factLedger has data) | Regenerate, incorporating occurred facts |
| Manual single-chapter mode (`manual` / `co_pilot`) | `advanceMode ≠ full_book_autopilot` → JIT does not run |
| Full-book autopilot, chapter missing a task sheet | JIT generates immediately |

---

## Gate Logic

The completion condition on the gate (`createChapterExecutionContractSyncModule`), `syncedChapterCount >= plannedChapterCount`, **does not need to change**.

Reason: the `chapter_sync` step (end of structured outline) writes every chapter into the execution-zone DB through `syncVolumeChaptersWithOptions` even without a task sheet, so `syncedChapterCount` immediately equals `plannedChapterCount` and the gate passes.

The sync boundary must allow `full_book_autopilot` to write chapters that only have titles, summaries, or partial execution fields into the formal chapter zone first. A partial `taskSheet` or `sceneCards` must not be mistaken for “full contract already generated” and block the task at sync. Before the current chapter enters prose execution, `ChapterPlanJITService` calls the unified execution-contract generator to fill fields, pass quality checks, and save. Non-JIT manual sync and ordinary execution paths still keep the full-contract gate.

---

## Auto-execution scope precheck

`full_book_autopilot` `chapter_batch_ready` means the chapter list is synced into the execution zone and each chapter has at least an execution seed JIT can use (for example `Chapter.expectation`). It does not mean every chapter already has a full task sheet / scene cards.

Therefore auto-execution start, polling, and takeover/recovery scope prechecks must distinguish two paths:

| Path | Precheck requirement |
|------|----------|
| `full_book_autopilot` | Chapters in the target range must exist and have an execution seed that can trigger JIT. Missing a full task sheet is expected. `GenerationContextAssembler` fills it just in time before writing. |
| Ordinary `auto_to_execution`, manual chapter range, non-JIT paths | Chapters in the target range must already have a full execution contract. Missing task sheet / scene cards / word-count and conflict-reveal refinement fields should return to beat / chapter-split fill. |

Failure mode: if auto-execution scope precheck still requires a full task sheet on the ordinary path, `full_book_autopilot` is intercepted by `runFromReady` before JIT runs, producing “missing full chapter refinement”. That is not lost chapter data; it is a precheck layer that disagrees with the JIT contract.

Related Modules:
- `server/src/services/novel/director/automation/novelDirectorAutoExecutionScopeRuntime.ts`
- `server/src/services/novel/director/automation/novelDirectorAutoExecutionRuntimePreparation.ts`
- `server/src/services/novel/director/runtime/novelDirectorTakeoverRuntime.ts`

---

## Quality-repair closed-loop sub-items (1.D)

### Root cause A — repairer receives structured obligation information

**File**: `server/src/services/novel/runtime/repair/chapterRepairRuntime.ts`

Added `buildRepairIssuesPayload(issues, runtimePackage)`:
- Besides `ReviewIssue[]`, append `missingObligations` (kind/summary/evidence) and `blockingIssueCodes`
- Both rewrite paths (patch-failure escalate + forced rewrite) use structured JSON so the repairer can patch obligations directionally

### Root cause B — patchRepair budget raised + loose-anchor retry

**File**: `DirectorQualityLoopBudgetLedgerService.ts`
- `DIRECTOR_QUALITY_LOOP_BUDGET_LIMITS.patchRepair`: 1 → 2

**File**: `chapterRepairRuntime.ts` (patch-failure catch block)
- First `ChapterPatchRepairFailedError` → retry once in `continuity_only` mode (loose anchor)
- Loose retry succeeds → return the patch result
- Loose retry still fails → escalate `heavy_repair`

### Root cause E — `issueSignature` splits length/content budget

**File**: `DirectorQualityLoopBudgetLedgerService.ts`
- Added `classifyIssueNoticeCode(noticeCode)` → returns `"length"` or `"content"`
- `buildDirectorQualityLoopIssueSignature` prefixes the signature with the class
- Length issues (`LENGTH_*`) and content issues get independent budget counters, so a length patch does not make a later content issue look like a duplicate

---

## Layered context cache (Phase 2)

### BatchContextCache

**File**: `server/src/services/novel/runtime/BatchContextCache.ts` (new)

- In-process singleton. Caches the full novel Prisma query result (including world/characters/storyMacroPlan/volumePlans) by `novelId`
- TTL = 30 minutes, at most 8 novelIds
- Invalidation: subscribe to `character:changed` / `volume:updated` / `outline:revised` / `pipeline:completed` and invalidate automatically

### GenerationContextAssembler refactor

**File**: `server/src/services/novel/runtime/GenerationContextAssembler.ts`

1. **Stable-layer cache**: replace the large novel query with `batchContextCache.getNovelRow(novelId)`, saving 10+ parallel subqueries per chapter
2. **Remove `timelineContext`** (defect 5): delete the `timelineContextService.buildForChapter` call, `timelineContext: null`; `ChapterQualityGateService` already defends against null
3. **Merge dual `contextPackage`** (defect 6): assemble shared fields once in a `sharedFields` object, then `contextPackage = { ...sharedFields, ragContext, chapterMission, chapterWriteContext, chapterReviewContext, chapterRepairContext }`; remove ~30 fields copied twice by hand

---

## N+1 chapter execution prefetch (Phase 3)

**File**: `server/src/services/novel/novelCorePipelineService.ts`

- After each chapter’s `runPipelineChapter` completes (factLedger already written), **non-blocking** trigger JIT task-sheet prefetch for the next chapter (N+1)
- Prefetch failure must not block current production. Formal execution of the next chapter will again guarantee the route window and execution contract. Enter recoverable failure only on explicit replan or when no usable chapter route exists.
- The pipeline execution queue may append rolling newly generated chapters at chapter boundaries. The chapter array queried at task start must not be treated as a fixed whole-book range.
- Enabled only when `advanceMode === "full_book_autopilot"`
- Prefetch failure does not affect the pipeline; the next chapter’s formal assemble retries automatically
- Combined with `BatchContextCache`: the novel stable layer is already cached, so prefetch only needs to generate a task sheet and assemble is nearly instant

---

## Related Modules

- `server/src/services/novel/planning/ChapterPlanJITService.ts` (new)
- `server/src/services/novel/runtime/BatchContextCache.ts` (new)
- `server/src/services/novel/director/phases/novelDirectorStructuredOutlinePhase.ts` (changed)
- `server/src/services/novel/runtime/GenerationContextAssembler.ts` (JIT wiring + cache + merge)
- `server/src/services/novel/runtime/repair/chapterRepairRuntime.ts` (structured obligations + loose-anchor retry)
- `server/src/services/novel/director/runtime/DirectorQualityLoopBudgetLedgerService.ts` (budget raise + signature split)
- `server/src/services/novel/novelCorePipelineService.ts` (N+1 prefetch)
- `server/src/services/novel/fact/NovelFactService.ts` (factLedger data source; PR-A already ready)

## Relationship to the four-phase optimization plan

This change implements phase one (lazy-planning refactor), phase two (layered context cache), phase three (N+1 prefetch), and the 1.D quality-repair closed-loop sub-items (root causes A/B/E) from `.claude/plan/novel-generation-pipeline-optimization.md`.

## Rolling window for compact books

A compact book’s route window is still filled just in time by the JIT service from current facts, but it carries a completion budget: with 8 or fewer chapters remaining, enter wrap-up planning; with 3 or fewer remaining, use finale-countdown context. Wrap-up planning may only read the existing ending contract, fact ledger, and unpaid payoffs. It must not expand a new far-future main line. Prefetch failure does not block current prose.

# Novel fact ledger

## Background

The current timeline module has limited effect on chapter writing (see [timeline diagnosis](../prompts/novel-generation-quality-guards.md)), and its duty overlaps heavily with PayoffLedger, ChapterMission, and ObligationContract.

The fact ledger is the replacement for timeline’s intervention in chapter writing: a minimal “already-happened irreversible facts” list that stops the LLM from rewriting events that already occurred in later chapters. The fact ledger only records facts confirmed by acceptance or prose observation. It must not treat a pre-write plan, chapter obligation, or payoff instruction itself as a fact that already happened.

## Core principle

> Facts are written after acceptance coverage or prose observation confirms them. They are not inferred directly from pre-write instructions.

- `mustHitNow` is written as `completed` only after the chapter-acceptance gate confirms coverage.
- When the acceptance gate is unavailable, do not write obligation facts, because the system has not verified that the prose paid them.
- `payoffDirectives` are pre-write instructions for the author, not a “revealed” observation. Do not write them as `revealed` directly.
- Improvised hard facts in the prose may be written from chapter-summary `concreteFacts[]` observations.
- Writes are idempotent and do not create duplicate entries.

## Data model

```prisma
model NovelFactEntry {
  id           String   @id @default(cuid())
  novelId      String
  chapterOrder Int      // which chapter the fact happened in
  text         String   // one or two sentences, e.g. "Chapter 7 completed: Chen Jianguo obtained a sole-proprietor license"
  category     String   // completed | revealed | state_changed
  source       String   // auto | manual
  novel        Novel    @relation(...)
  createdAt    DateTime @default(now())
}
```

Category:

- `completed`: a process goal is done (papers, contract, mission)
- `revealed`: information is revealed (identity, secret, truth)
- `state_changed`: an irreversible state change (a death, a broken relationship)

## Upgrade compatibility

The fact ledger sits on the required read path for chapter generation. Shipping this capability requires Prisma migrations for `NovelFactEntry` on both PostgreSQL and desktop SQLite. The desktop app runs SQLite migrations before the local server starts, and existing libraries must be able to create the table and indexes. Do not only update the Prisma schema, or an upgraded old database will abort chapter generation because the table is missing.

## Write path

**Trigger:** after chapter acceptance passes (`ChapterContentFinalizationService.finalizeChapterContent`).
Obligation-fact writes run before the chapter summary and are `await`ed, so the ledger is ready before the next chapter’s JIT assembly.
Write failure only logs a warning and does not block chapter finalization.

**Sources:**

| Source | category | Example |
|------|----------|------|
| `obligationContract.mustHitNow` items that `obligationCoverage` confirmed as covered | `completed` | "Chapter 7 completed: obtained a sole-proprietor license" |
| Hard facts extracted by chapter summary / prose observation `concreteFacts[]` | `completed` / `revealed` / `state_changed` | "The protagonist promised to deliver the first samples within three days" |

### Acceptance-coverage filter

- `obligationCoverage.status === "satisfied"`: admit every non-empty `mustHitNow`.
- `obligationCoverage.status === "partial"`: drop only obligations that `missing.kind === "must_hit_now"` can match. Matching uses bidirectional containment after stripping whitespace/punctuation, plus character n-gram similarity.
- When `missing.kind === "must_hit_now"` cannot match back to the original text, conservatively drop the highest-similarity item and write a structured warning.
- `obligationCoverage.status === "unmet"`: skip every `mustHitNow` write.
- `riskTags` contains `acceptance_gate_unavailable`: skip every `mustHitNow` write.

Dropped obligations are not written again into the fact ledger. They already entered the review-issue / quality-debt flow through the acceptance gate’s missing obligation.
Finalization records structured logs for dropped items and makes them visible in Task Center through a `continue_with_risk` director event.

Manual write: `NovelFactService.addManualFact()` (for a future agent tool).

## Read path

**Trigger:** when `GenerationContextAssembler.buildForChapter` assembles chapter-writing context.

**Query:**

- `completed` + `revealed`: return all (no chapter-distance cap; these are milestone facts)
- `state_changed`: only entries from the last 15 chapters

**Injection:** `ChapterWriteContext.completedMilestones: string[]`

Render in the `chapter_mission` block:

```
Already completed — do NOT re-pursue or re-trigger
- Chapter 7 completed: obtained a sole-proprietor license
- Chapter 12 fully revealed: the identity of the hidden mastermind
```

## Boundary with timeline

The fact ledger **does not replace** the frontend timeline (`StoryTimelineEvent` stays).
It only replaces timeline’s intervention in writing context (`timeline_context` was removed from requiredGroups in PR-B).

The fact ledger does not own this chapter’s reader payoff, protagonist desire, scene turn, or hook continuation. Those pre-write execution goals belong to `ReaderExperienceContract`. The fact ledger only records irreversible facts after prose acceptance or observation confirms them.

## Related Modules

- `server/src/services/novel/fact/NovelFactService.ts` (read/write)
- `server/src/services/novel/fact/factLedgerFilter.ts` (acceptance-coverage filter)
- `server/src/services/novel/runtime/ChapterContentFinalizationService.ts` (write trigger)
- `server/src/services/novel/runtime/GenerationContextAssembler.ts` (read injection)
- `server/src/prisma/schema.prisma` (`NovelFactEntry` model)
- `server/src/prisma/migrations/` and `server/src/prisma/migrations.sqlite/` (fact-ledger upgrade migrations)
- `shared/types/chapterRuntime.ts` (`completedMilestones` field, already present)

## Later boundary

`revealed` facts should come from payoff-ledger status migration, a timeline-gate resolved hook, or prose-observation extraction.
If a later acceptance-gate schema adds `missingObligations[].sourceText`, `factLedgerFilter` should prefer exact source-text matching and demote similarity matching to a fallback for old caches.

## PR-B change record (done)

PR-B goal: remove timeline intervention from the writing path entirely. Writing context no longer has a `timeline_context` block.

Files changed:

| File | Change |
|------|---------|
| `chapterWriter.prompts.ts` | Removed `timeline_context` from `requiredGroups` / `preferredGroups` / `contextRequirements` |
| `ChapterContentFinalizationService.ts` | Removed `timelineFinalizer` dependency and finalize call |
| `ChapterStreamGenerationOrchestrator.ts` | Removed `timelineFinalizer` dependency and `ensurePreviousChapterTimelineFinalized` |
| `ChapterPipelineRuntimeAdapter.ts` | Removed `timelineFinalizer` dependency and `finalizeChapterTimeline` callback |
| `ChapterRuntimeCoordinator.ts` | Removed optional `timelineFinalizer` and injection into child services |
| `ChapterRepairStreamRuntime.ts` | Removed optional `timelineFinalizer` and the finalize call after a successful repair |
| `chapterRuntimePipeline.ts` | Removed `finalizeChapterTimeline?` from the interface and two call sites, and `shouldFinalizeDegradedForDeferredQualityDebt` |

> `ChapterTimelineFinalizationService` itself and the `StoryTimelineEvent` table stay. Frontend timeline display is unaffected.

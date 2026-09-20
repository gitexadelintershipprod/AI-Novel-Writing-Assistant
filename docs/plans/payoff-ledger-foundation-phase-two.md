# Payoff Ledger Foundation Hardening: Phase Two Implementation Plan

## Background

Phase one already sank Book Contract long-term promises into chapter-writing context, and made chapter detailing, body text, acceptance, and repair share `ReaderExperienceContract`. But Book Contract chapter-3, chapter-10, and chapter-30 stage payoffs had not yet entered Payoff Ledger’s sync sources, so “writing a chapter can see the promise, while the cross-chapter ledger does not necessarily know the promise”.

This is not a missing new feature; it is that the existing contract has no closed loop: updating Book Contract only refreshes the chapter context cache; an existing Payoff Ledger will not re-reconcile because of that.

## Phase principles

This phase only hardens the existing foundation; it does not expand surface product capability:

- Do not add pages, buttons, settings, or new user action paths.
- Do not add independent reader scores, a quality panel, or a new global replan branch.
- Do not add database tables or fields; do not run data migrations.
- Do not replace AI semantic merge and state judgment with keywords, regex, or hard-coded branches.
- Only complete source contracts, persistent side effects, idempotent identity, historical compatibility, and regression verification.

## Cause classification

Primary cause: `incomplete closure`.

Evidence:

- `PayoffLedgerSyncService` reads Story Macro, volume open payoffs, chapter payoff refs, state snapshots, conflicts, and review issues, but does not read Book Contract.
- After `BookContractService` updates, it only emits a cache-invalidation event; it does not trigger Payoff Ledger re-sync.
- `getPayoffLedger()` auto-syncs only when the ledger is completely empty; an existing ledger will not auto-refresh because of a Book Contract change.
- The current normal product path of saving Book Contract can continuously reproduce this breakpoint.

## Phase two goals

1. Send Book Contract chapter-3, chapter-10, and chapter-30 payoffs into the existing Payoff Ledger AI sync as a stable, traceable book-level promise source.
2. Use fixed source references and explicit target windows so repeated sync can semantically merge instead of producing duplicate ledger items.
3. When Book Contract stage payoffs change, trigger ledger sync through the existing persistent side-effect queue; ordinary field changes must not produce pointless sync.
4. AI sync results must cover every non-empty Book Contract stage promise; missing sources enter the existing semantic retry; do not silently fabricate ledger items as a fallback.
5. Keep compatibility with old ledgers and old source enums; do not introduce a database migration.

## Stable source contract

Book Contract stage payoffs map to three structured sources:

| Source reference | Target window | Meaning |
| --- | --- | --- |
| `book_contract.chapter3Payoff` | Chapters 1–3 | The first explicit payoff of the opening promise |
| `book_contract.chapter10Payoff` | Chapters 4–10 | The first stretch of stable keep-reading payoff |
| `book_contract.chapter30Payoff` | Chapters 11–30 | The core delivery of the long-opening stage |

These windows come from the determinate semantics of Book Contract’s existing fields; they are a deterministic projection of structured input. Whether an item merges with other promises, what state it is in, and whether there is already delivery evidence is still judged by AI from the full context.

Sources uniformly use the existing `major_payoff` type, and distinguish Book Contract sources via a fixed `refId`, to avoid extending the database and public enums.

## Sync and idempotency rules

- Before saving Book Contract, compare the normalized values of the three stage payoffs; schedule Payoff Ledger sync only when they actually change.
- Sync runs through the existing `NovelSideEffectJob` persistent queue; do not wait on the LLM inside the HTTP save request.
- The side-effect job idempotency key is composed of novel and contract update time; one save event produces only one job.
- Worker retries reuse existing lease, exponential backoff, and dead-state rules.
- AI output proves coverage of every non-empty stage promise via the fixed `refId`; omission triggers the existing semantic retry.
- On sync failure, an already-existing ledger is kept, and the existing stale risk mark is reused; must not delete user data that already exists.

## Data flow

```text
Book Contract save
  -> compare whether chapter 3/10/30 payoffs changed
  -> book-contract:updated
  -> persistent side-effect job payoff.bookContractSync
  -> PayoffLedgerSyncService reads the latest Book Contract
  -> registered AI Prompt semantically merges all sources
  -> postValidate checks fixed-source coverage and windows
  -> existing PayoffLedgerItem idempotent upsert
```

## Non-goals

- An independent detector for many consecutive chapters of setup with no payoff.
- A new reader-experience total score or ranking.
- New quality-debt UI, admin pages, or a human editor.
- Automatically changing Book Contract content.
- Ordinary overdue promises automatically escalating to global replan.

These capabilities belong in later phases only after foundation sources, state, and sync are stable.

## Acceptance criteria

- The Payoff Ledger sync Prompt can see all non-empty chapter 3/10/30 payoffs plus fixed source references and target windows.
- If AI output omits any Book Contract source reference, it fails and enters semantic retry.
- A Book Contract stage-payoff change enqueues one persistent sync job; other fields changing alone do not enqueue.
- The side-effect worker can execute that job and call the existing Payoff Ledger sync service.
- Duplicate events converge on the idempotency key and do not create duplicate jobs.
- Old ledgers, old Prompt output, and old source types can still be read.
- shared build, server typecheck/build, and Payoff Ledger / event side-effect focused tests pass.

## Implementation status

- [x] Cause classification and phase-boundary confirmation
- [x] 2A Book Contract source contract
- [x] 2B Persistent sync trigger
- [x] 2C AI output coverage validation
- [x] 2D Regression tests and Wiki
- [x] Targeted verification

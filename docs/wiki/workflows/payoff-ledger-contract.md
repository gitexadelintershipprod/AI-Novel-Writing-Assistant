# Payoff Ledger sources and sync contract

## Background

The Payoff Ledger owns cross-chapter promises, foreshadowing, progress windows, and delivery state. It is not a new story planner, and it does not record every fact that has already happened. It converges existing sources — Book Contract, Story Macro, volume open payoffs, chapter payoff references, and prose observation — into one ledger.

If book-level promises enter chapter-writing context but not the Payoff Ledger, the system grows two fact sets: the writer knows what chapters 3/10/30 should deliver, but later planning, audit, and continuity reads cannot track those promises stably.

## Decision

Book Contract `chapter3Payoff / chapter10Payoff / chapter30Payoff` are stable book-level sources for the Payoff Ledger. They enter the existing AI sync Prompt through fixed `refId` values and target windows:

| refId | Target window |
| --- | --- |
| `book_contract.chapter3Payoff` | Chapters 1–3 |
| `book_contract.chapter10Payoff` | Chapters 4–10 |
| `book_contract.chapter30Payoff` | Chapters 11–30 |

Fixed windows are a deterministic projection of Book Contract structured fields. Semantic dedup, item merge, current state, and delivery-evidence judgment still belong to the registered Prompt’s structured AI output.

## Current Rule

- Every non-empty Book Contract stage payoff must keep a fixed source reference on some ledger item in the AI output.
- Book Contract sources use the existing `major_payoff` type. `refId` distinguishes the source. Do not add a database enum or migration.
- Merged items must keep `book` scope, and the end chapter must not be later than the Book Contract’s promised chapter.
- If AI output omits a fixed source or widens the end window, `postValidate` must fail and enter semantic retry. Code must not silently forge ledger items.
- Saving a Book Contract compares only the three stage payoffs. Whitespace-only formatting changes do not trigger sync. Semantic text changes trigger sync through the persisted side-effect queue.
- Sync tasks use the existing `NovelSideEffectJob` idempotency, lease, retry, and dead states. The save request does not wait for the LLM.
- On sync failure, keep the last successful ledger and a stale risk signal. Do not delete existing content.
- After AI reconciliation, Book Contract fixed-source lifecycle close-out must run. Old items that are not yet terminal, were not reused by this round’s output, and whose sources all belong to `book_contract.*` leave current prose duty when the source is removed or taken over by a new item.
- Old items leaving duty reuse the `failed` status — English `failed` is canonical on write; Chinese `已失效` is a dual-read alias for old rows only — and record `source_superseded` as the risk reason. Original title, source references, and delivery evidence must be kept. `paid_off` never retires. Items mixed with other valid sources are kept conservatively.
- `source_superseded` items skip the `sync_stale` mark, and later repeated sync must not keep changing their terminal state. They do not enter pending, urgent, or overdue classification, and they do not generate open Payoff conflicts.

## Replan Gate

- Payoff overdue is a chapter-level warning or quality debt, not deterministic evidence that the whole-book plan is mismatched. Overdue distance, current-chapter window hit, and current-chapter explicit citation must not alone escalate to `stop_for_replan`.
- `nextAction=replan`, human force, or chapter acceptance confirming `plan_misalignment` may output `stop_for_replan`. High-priority chapter audit may only output `local_patch_plan`.
- Every global caller must use `action === "stop_for_replan"` as the final gate. `recommended` may express a local handling suggestion, but it must not alone pause a chapter batch, write `PIPELINE_REPLAN_REQUIRED`, or create a `replan_required` failure classification.

## Ownership Boundaries

- Book Contract: defines what the whole book delivers to the reader at key early nodes.
- Payoff Ledger: tracks sources, windows, progress, and delivery state for those promises and other foreshadowing.
- Reader Experience Contract: turns the payoff this chapter should carry into prose-visible desire, resistance, turn, net change, and hook responsibility.
- Novel Fact Ledger: records only irreversible facts that have already occurred after prose acceptance or observation confirmation.
- Replan: entered only when a structured AI/runtime decision explicitly requires rearranging neighboring chapters. Ordinary unpaid or locally overdue items are handled first as chapter obligations or quality debt.

## Compatibility

This rule does not add database columns. Old ledgers without Book Contract source references remain readable, and AI will re-merge them on the next related sync. Old Prompt calls missing `bookContractPayoffs` input are treated as empty sources, so historical preview or recovery paths do not crash.

## Failure Modes

- **Book Contract changed but the ledger did not**: check whether `book-contract:updated` carried `payoffChanged=true`, and the `payoff.bookContractSync` side-effect job status.
- **The same promise appears as multiple ledger items**: check whether the fixed `refId` was kept as-is, and whether ledger identity merge reused an unfinished same-name item.
- **Old promises still enter prose after Book Contract rewrite**: check whether the old item had only `book_contract.*` sources, whether the new AI output took over the fixed `refId`, and whether the old item converged to `failed` with `source_superseded`.
- **AI omitted a stage promise**: check Prompt version, Registry version, and `postValidate` fixed-source coverage.
- **Saving Book Contract is slow**: sync should not call the LLM directly in the save request; check whether the persisted side-effect queue was bypassed.
- **Ordinary overdue blocks whole-book writing**: check whether local payoff risk was wrongly escalated to global replan.
- **Local audit triggers a global stop**: check whether the caller only judged `recommended` without also requiring `action === "stop_for_replan"`.

## Related Modules

- `server/src/services/payoff/sources/bookContractPayoffSources.ts`
- `server/src/services/payoff/PayoffLedgerSyncService.ts`
- `server/src/services/payoff/domain/payoffLedgerSourceLifecycle.ts`
- `server/src/prompting/prompts/payoff/payoffLedgerSync.prompts.ts`
- `server/src/events/handlers/registerNovelEventHandlers.ts`
- `server/src/events/sideEffects/NovelSideEffectJobHandlers.ts`
- `server/src/services/novel/BookContractService.ts`

## Source Documents

- `docs/plans/payoff-ledger-foundation-phase-two.md`
- `docs/plans/payoff-ledger-safety-phase-three.md`
- `docs/wiki/workflows/reader-experience-contract.md`
- `docs/wiki/workflows/novel-fact-ledger.md`

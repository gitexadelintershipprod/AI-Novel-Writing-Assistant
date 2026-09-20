# P0 safety closure: ghost promises and the replan gate

## Background

Book Contract stage payoffs already enter the Payoff Ledger, but after contract content is edited or removed, old ledger items can still remain as chapter obligations. Replan decisions also used to treat payoff-overdue distance or a current-chapter citation as a reason to stop the whole book. Both gaps are incomplete closure of an existing contract, not a request for new features.

## Cause class

Primary cause: `incomplete closure`.

- AI reconciliation identifies the semantic relationship between old and new promises, but persistence did not close the lifecycle of a replaced fixed source.
- `ReplanRecommendation` already has an action layer, but some deterministic checks and callers could still escalate local quality debt into a global replan.
- The normal product paths for editing a Book Contract and advancing overdue payoffs can reproduce this, so it is not one-off dirty historical data.

## Phase boundary

- Do not add UI, database fields, status enums, or product flow.
- Do not delete the ledger, chapter text, source citations, evidence, or already-paid records.
- Do not run migration, backfill, data reset, or other data operations.
- AI still owns semantic merge. Domain code only applies deterministic lifecycle and safety gates to structured AI output.

## Book Contract source lifecycle

After AI reconciliation, close old ledger items as follows:

1. Only inspect items that are not finished, were not reused by this round’s output, and whose sources all belong to `book_contract.*`.
2. When the fixed source has been removed from the Book Contract, or the same fixed source is now owned by a new ledger key, mark the old item with the existing `failed` / superseded status.
3. Keep the old title, sources, and evidence; clear `sync_stale`; write the `source_superseded` risk reason.
4. Do not process `paid_off` items or items that are already `failed`. Conservatively keep items that mix other sources.
5. Retired items skip ordinary stale marking. Repeat sync stays idempotent.

## Global replan gate

Decision priority is fixed:

1. Human force or `nextAction=replan`: `stop_for_replan`.
2. High-priority chapter audit: `local_patch_plan`.
3. Overdue payoff: `continue_with_warning`.
4. None of the above: continue.

Overdue distance, a hit in the current-chapter window, or a current-chapter citation is not evidence of global plan mismatch. When chapter acceptance confirms `plan_misalignment`, enter `stop_for_replan` through the existing force parameter. Every global caller must treat `action === "stop_for_replan"` as the final condition.

## Compatibility

- `PayoffLedgerStatus`, the database model, the API response shape, and the `ReplanRecommendation` shape stay unchanged.
- Item retirement reuses `failed` / superseded. `source_superseded` is only a risk-code string; do not add a public enum.
- Old data converges on the next normal Book Contract reconciliation. No one-shot backfill.

## Acceptance

- Source replacement or source removal retires old items. Same-key reuse, already-paid items, already-failed items, and mixed-source items are not retired by mistake.
- Retired items do not enter pending, urgent, or overdue, and do not create open payoff conflicts.
- Current-chapter overdue promises and severe overdue only record a warning. Explicit `nextAction=replan`, human force, and `plan_misalignment` still stop.
- High-priority audits only produce a local repair plan and do not trigger an automatic global replan.
- Shared build, server typecheck/build, Payoff Ledger, replan-decision, chapter runtime, and pipeline focused tests pass. `git diff --check` is clean.

## Implementation status

- [x] Fixed-source lifecycle policy and sync integration
- [x] Tighter replan-action priority
- [x] Global caller action gate
- [x] Lifecycle, decision, and runtime regression tests
- [x] Focused verification completed
- [x] Independent phase commit created

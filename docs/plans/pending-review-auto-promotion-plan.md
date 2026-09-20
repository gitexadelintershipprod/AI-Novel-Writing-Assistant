# Pending-Review Proposal Auto-Promotion Plan

## Background

In `StateCommitService`, the two proposal types `relation_state_update` (character relationships) and `information_disclosure` (information-cognition state) belong to `ALWAYS_REVIEW_TYPES`. By design they never go through auto-commit; they must be human-confirmed before they take effect as canon.

In 2026-07 a read-only check was run against the production database (`server/dev.db`, the default SQLite in web mode). Results:

- `pending_review` total: 2390 rows
- By type: `information_disclosure` 1818, `relation_state_update` 410, `character_resource_update` 162, `character_state_update` 0
- By backlog age: ≥30 days 2044, 14-30 days 346, <14 days 0; oldest about 76 days, and even the newest is already 14.11 days
- By source (`sourceQuality`, see related plan below): debt 0 rows, meaning this backlog is unrelated to quality-debt routing; it is a long-standing stock problem

Conclusion: this "always human review" mechanism has never actually been cleared. `relation_state_update` + `information_disclosure` account for 93% of the backlog. Character-relationship score changes and information-cognition state changes have long not truly taken effect as canon. This is likely a neglected root cause of chapter-continuity problems (especially the sense of relationship progress, and characters reacting to information inconsistently before vs after), an order of magnitude larger than the character-resource-ledger backlog.

## Related plan

This plan reuses the `StateChangeProposal` proposal system already landed in [quality-debt-provenance-routing](../../server/src/services/novel/state/stateProposalSourceQuality.ts) (`sourceQuality`, `pending_review` status, `commitExistingProposals` commit path). It does not create a parallel proposal system.

## Goals

Give `relation_state_update` / `information_disclosure` a bounded auto-promotion policy, turning "an always-piling human-review black hole" into "proposals with long-running no-conflict signals are auto-promoted; proposals with risk signals still stop for humans".

**Out of scope**:

- Do not process the existing 2390 historical backlog rows. Historical backlog is a separate problem that needs its own explicitly manually triggered one-shot tool. It is not in this plan's scope, and this plan's auto logic must never touch it.
- Do not change any control flow of chapter generation, review, or repair. This is a background maintenance action outside the chapter-generation main chain.
- Do not add a separate proposal status value; reuse existing `pending_review` / `committed` / `rejected`.

## Non-negotiable safety floor

This feature involves batch, automatic commit of state changes previously judged as "needs human confirmation" into canon facts, and it affects other people's databases (this repo is an open-source multi-person collaboration project). The following four items are design constraints, not options:

1. **Off by default**. After merge to trunk, anyone who `pull`s and runs directly has the feature off. Behavior is identical to the feature not existing in the code.
2. **Only process proposals created after the enable time**. When the switch is first turned on, record a baseline timestamp; auto-promotion logic only considers proposals whose `createdAt` is later than that timestamp. Enabling the feature itself must not cause any historical backlog row to be processed automatically.
3. **Forced informed confirmation before enable**, not an ordinary toggle that can be lit accidentally.
4. **Every automatic action leaves a trail and is traceable**, not a quiet change of one status field.

## Step-by-step execution plan

### Part A: Settings switch and effective baseline time

- `server/src/services/settings/qualityDebtSettingKeys.ts` (new file, follow `ragSettingKeys.ts` style)
  Define `QUALITY_DEBT_AUTO_PROMOTION_ENABLED_KEY`, `QUALITY_DEBT_AUTO_PROMOTION_BASELINE_AT_KEY`.

- `server/src/services/settings/QualityDebtSettingsService.ts` (new file, follow `RagRuntimeSettingsService.ts` DB storage + default-fallback pattern)
  - Defaults: `enabled = false`, `baselineAt = null`.
  - The enable method does not accept a simple `setEnabled(true)`. The caller must explicitly pass an informed-confirmation credential (for example the request body carries `acknowledgedRisks: true` plus a fixed confirmation string echoed back). If server validation fails, refuse the write.
  - `baselineAt` is written as the current time only on first enable; repeated enable calls do not overwrite an existing baseline time.
  - When service init reads `enabled = true`, emit a **warning-level** startup log (not info), so UI-less scenarios / log inspection can immediately see that this feature is on.

- Settings panel (add a block following existing `/settings` sections)
  - The switch cannot be lit directly by default; clicking first opens an explanation dialog whose content at least includes: what the feature does, an explicit statement that "existing historical backlog is not processed; only proposals created after enable are affected", and an explicit statement that "promoted proposals are committed as canon and will not be auto-reverted".
  - The dialog requires the user to actively check "I understand the risks above" or type confirmation text before the switch can actually be lit.
  - While the switch is on, use a prominent style (not ordinary helper text) to persistently show that it is currently enabled; there must not be no ongoing hint after it is turned on.

### Part B: Grouping and policy constants

- `server/src/services/novel/state/pendingReviewAutoPromotionPolicy.ts` (new file)
  Policy constants: how many days of backlog qualify for auto-promotion (suggest 14 days, aligned with this check's observation that "not a single row within 14 days"), and a max rows-per-run cap (prevent processing too many at once in a historical-batch scenario).

- `server/src/services/novel/state/stateProposalSubjectKey.ts` (new file)
  Pure function: compute a "same thing" grouping key from the payload — `relation_state_update` uses `sourceCharacterId + targetCharacterId`, `information_disclosure` uses `holderType + holderRefId + fact`. Used to recognize "a newer proposal covering an older one".

### Part C: Preview and apply service

- `server/src/services/novel/state/PendingReviewAutoPromotionService.ts` (new file, independent of `StateCommitService`, easier to unit-test and call separately)
  - `preview(novelId, { since })`: read-only. After grouping by grouping key, return three kinds of result — candidates that would be promoted, candidates that would be marked covered (earlier in the same group, replaced by a newer proposal), and candidates skipped because they hit an unresolved `OpenConflict` record. Perform no writes.
  - `apply(novelId, { since, dryRun })`: actually execute. When `dryRun = true`, behavior equals `preview` and produces no database writes. When not dry-run:
    - Earlier proposals in the same group are marked `rejected`, with reason "covered by a newer proposal".
    - The latest candidate that passes conflict detection is committed by reusing existing `StateCommitService.commitExistingProposals`; do not reinvent commit logic.
    - Candidates that hit unresolved conflicts stay `pending_review` untouched.
  - Every non-dry-run execution writes a trail event (see Part D) and a **warning-level** log containing concrete counts.

### Part D: Trail and traceability

- Reuse existing `DirectorAutomationLedgerEventService` (already used for quality-loop event recording in `ChapterQualityLoopService`)
  Add event type `pending_review_auto_promotion`, recording `novelId`, lists of promoted/covered proposal ids, judgment basis (hit/missed conflict records, grouping keys), and execution time. Months later, when rechecking why a relationship/cognition state is what it is, the automated judgment process can be found, rather than an unexplainable black-box change.

### Part E: Wire into auto-director (must wait until A/B/C/D are all verified)

- `server/src/services/novel/director/automation/novelDirectorAutoExecutionRuntimePorts.ts` + `novelDirectorAutoExecutionRuntime.ts`
  Only when `QualityDebtSettingsService.isEnabled()` is true, append a fire-and-forget call to `PendingReviewAutoPromotionService.apply` beside the existing `autoConfirmPendingCandidates` call (same `.catch(() => null)`, does not affect current-batch success/failure). When the switch is off, that line of code is equivalent to not existing.

### Part F: Release notes

- `docs/releases/release-notes.md` / `README.md`
  Present this update in a standalone existing-project `warn` callout block, not mixed into an ordinary feature-update bullet list. Explicitly mark "off by default, involves auto-committing state changes that previously required human confirmation, read the explanation before enabling".

## Explicitly excluded scope

- Processing the existing 2390 historical backlog rows — a separate item, needing a one-shot tool that can only be called manually and must force `preview` before `apply`, not hung on any automatic or scheduled trigger.
- `character_resource_update` / `character_state_update` proposals — they already have their own risk/confidence judgment paths (low-confidence judgment in `CharacterResourceValidationService`, `sourceQuality=debt` forced review). They are not in this plan's adjustment scope.

## Test scope

- `QualityDebtSettingsService`: default `enabled = false`; enable requests without the informed-confirmation credential are rejected and state is unchanged; `baselineAt` is written only on first enable and is not overwritten on repeated enable.
- `PendingReviewAutoPromotionService.preview`: only counts proposals whose `createdAt` is later than `since`; anything created before the baseline never appears in results, even if content would otherwise qualify.
- `PendingReviewAutoPromotionService.apply`: `dryRun = true` produces no database writes (verify zero calls with a mock prisma that errors on write); when not dry-run, only the latest in a group is promoted and the rest are marked covered; candidates that hit unresolved conflicts are not promoted.
- Trail: every non-dry-run execution produces the corresponding ledger event and warning log, with enough content to reconstruct the judgment basis.
- Auto-director integration point: when the switch is off, `PendingReviewAutoPromotionService` is never called (assert call count is 0).

## Risks and responses

| Risk | Level | Response |
|---|---|---|
| Someone pulls the code and triggers it unintentionally | Low | Off by default + forced informed confirmation; merging the code itself produces no behavior change |
| After enable, historical stock data is harmed | Low | The baseline mechanism guarantees only new proposals after the enable moment are processed |
| Conflict detection has blind spots and promotes an actually-problematic proposal | Medium | This is a post-tradeoff improvement direction, not zero risk — the status quo is "wrong information never takes effect"; after the change it is "wrong information has some chance of being auto-promoted"; recommend observing Part D trail data for a period before deciding whether to widen scope |
| After enable, wanting to undo: already-promoted proposals cannot be auto-restored | Medium | This plan does not include an auto-rollback tool; Part D trail logs can be used for human checking and manual status revert; if later judged necessary, a helper script of "reverse operations from trail logs" can be a separate item |
| The proposal's chapter is too far from the novel's current progress, so promotion is low-value or misaligned | TBD | This version does not include a threshold on "distance between proposal chapter and current latest chapter"; if later observation shows this is a real problem, it can be added in Part B policy |

## Acceptance criteria

- After Parts A-D are complete and tests pass, the feature should remain completely unnoticed (off) in anyone's local environment.
- After manual enable, a human sample of `preview` candidate lists should look reasonable (relationship changes really are the latest, and really have no associated unresolved conflicts).
- After manual enable and running `apply` for at least one observation cycle, Part D trail data should fully reconstruct the basis of every automatic decision.
- The stock backlog (2390 rows) should stay unchanged throughout acceptance and be unaffected by any part of this plan.

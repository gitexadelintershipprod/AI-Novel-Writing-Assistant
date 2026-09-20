# Character resource ledger

## Background

The character resource ledger serves the chapter production chain. It records key resources that change later action bounds, payoff fulfillment, ownership, or information visibility. It is not an ordinary inventory list and not a to-do list. Only resource changes that reuse across chapters, affect conflict, bind a payoff, or change what a character can do should enter the ledger.

## Current Rule

- Writing context must distinguish two information sets: `highRiskCommittedItems` are already committed resources that carry a high-risk signal; `pendingProposalItems` are unconfirmed `StateChangeProposal` records.
- Committed high-risk resources may be cited by the writing model, but only as cautious factual constraints. The model must not use them to add irreversible hold, visibility, or consumption changes.
- Unconfirmed proposals must not be injected into prose as events that already happened. After the user or Auto-Director confirms, they must enter the ledger, version snapshot, and event history through the unified proposal commit path.
- Resource context before chapter writing must be clipped to this chapter's participating characters. Only resources held or owned by participants, or non-participant resources already inside the current chapter's use window, should enter the prompt.
- Available, hidden, or borrowed resources that have not been touched for a long time, or that have passed their expected use window, should be marked `stale`, with a `stale_marked` event and a `resource_stale` risk signal. That state is chapter-level quality debt and must not automatically stop full-book Auto-Director.

## Failure Modes

- Do not label committed high-risk resources as "pending confirmation". Otherwise the frontend's confirmable proposals and the writing prompt's pending resources become two different sets.
- Do not call ledger upsert directly from a manual confirmation route. That bypasses the canonical snapshot, `committedVersionId`, and projections that depend on commit history.
- Do not judge resource conflict from the model's self-reported riskLevel alone. Before commit, compare the existing holder, owner, irreversible state, and visibility for the same `resourceKey`. Escalate to human confirmation on conflict.
- Do not implement stale detection as one-off prompt copy. Stale is part of ledger state and event history; later chapters, the frontend, and recovery all need to see the same fact.

## Related Modules

- `CharacterResourceLedgerService`: ledger reads, writing-context assembly, and post-commit ledger/event writes.
- `StateCommitService`: proposal validation, conflict cross-check, unified commit, version snapshot.
- `GenerationContextAssembler`: clips resource context using the chapter plan's participating characters.
- `ChapterArtifactDeltaService`: post-chapter asset backfill and the stale-scan trigger.

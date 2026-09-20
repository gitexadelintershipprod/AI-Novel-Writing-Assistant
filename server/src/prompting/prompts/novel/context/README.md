# Chapter Prompt Context Module Boundary

## Background

Chapter planning, prose generation, acceptance, and repair need to share one runtime contract, but contract construction, historical compatibility, and Prompt text rendering are different responsibilities. Stacking them in a single file widens the blast radius of changes and makes old runtime-package compatibility mix with specific Prompt wording.

## Decision

- `chapterLayeredContext.ts` is the stable facade: it builds book-level, volume-level, and chapter-level contracts, and keeps external compatibility exports.
- `chapterContextPolicies.ts` owns old runtime-package normalization, default-value projection, and filtering of character hard facts needed for writing.
- `chapterContextBlocks.ts` only renders the structured chapter contract into context blocks that writer, review, and repair can consume.

## Current Rule

1. New reader-experience, chapter-obligation, or continuity capabilities enter the shared structured contract first, then the context-block rendering layer consumes them.
2. Historical compatibility lives only in the policy layer; do not add the same branches in each Prompt render function.
3. External modules import from the `chapterLayeredContext.ts` facade and must not deep-depend on files inside `context/`.
4. Ordinary chapter reading-experience issues may only become this-chapter repair guidance or quality debt; they may affect the global execution chain only when a structured decision explicitly requires replan.

## Failure Modes

- Writer, review, and repair assemble different versions of chapter goals, so acceptance and repair drift away from the prose task.
- The render layer guesses missing fields ad hoc, so historical compatibility rules cannot be tested uniformly.
- Timeline, Fact Ledger, Payoff Ledger, and the reader-experience contract are mixed into one responsibility, causing duplicated context and false quality alerts.

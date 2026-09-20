# Reader-Experience Contract Closed Loop: Phase One Implementation Plan

## Background

The current novel production chain already has Book Contract, story macro planning, volume strategy, rhythm board, chapter task sheets, scene cards, fact ledger, foreshadow ledger, chapter acceptance, and quality repair. The main problem is not missing planning layers; it is that when these assets enter body generation they do not uniformly answer:

- What does this chapter make the reader keep asking?
- What payoff does this chapter promise to give?
- What is the protagonist actively fighting for right now, and what is blocking them?
- Where does an effective turn happen in the scene?
- What net change does chapter-end produce relative to chapter-start?
- How does this chapter take on the keep-reading responsibility left by the previous chapter?

So the system may generate chapters that are “task-complete but flat to read”, or it may define reading promises, protagonist fantasy, and stage delivery in book-level planning, then leave only generalized selling points when writing chapter by chapter.

## Phase one goals

Phase one establishes a structured, compatible `ReaderExperienceContract` that can run through the existing chain, and completes this closed loop:

1. At chapter detailing, AI generates the reader-experience contract; it does not depend on keywords or fixed routing.
2. The contract persists with the existing chapter execution contract; no new database migration.
3. Body writing, chapter acceptance, and chapter repair consume the same contract.
4. The full Book Contract’s reading promise, protagonist fantasy, relationship mainline, escalation ladder, and chapter 3/10/30 stage deliveries enter writing context.
5. Volume-level reader-reward ladder and the current volume’s core reward enter chapter runtime, instead of staying only in the volume-strategy document.
6. Writing continuity context has explicit duties; remove Timeline context that is already disabled but still declared as required.

## Non-goals

The following is not completed all at once in phase one:

- Do not add reader personas, a commercial-genre classifier, or a new parallel planner.
- Do not change auto-director global stop rules; ordinary reader-experience issues still belong to local repair or quality debt.
- Do not redo the full quality-scoring system in this phase; first let existing acceptance and repair read a unified contract; an independent reader-experience scoring dimension goes to a later phase.
- Do not in this phase automatically write chapter 3/10/30 promises as Payoff Ledger persistent items; phase one first guarantees they are visible when writing chapters; ledgerization is implemented in phase two.
- Do not run database resets, cleanup, or destructive migrations.

## Core domain contract

### ReaderExperienceContract

Each chapter maintains only one reader-experience contract:

```ts
interface ReaderExperienceContract {
  readerQuestion: string;
  promisedReward: string;
  rewardLevel: "setup" | "partial" | "major";
  protagonistWant: string;
  primaryResistance: string;
  keyTurn: string;
  emotionalShift: string;
  informationReveal: string;
  netChange: string;
  inheritedHookResponsibilities: string[];
  endingHook: string;
}
```

Field semantics:

- `readerQuestion`: the core question the reader most wants to know when entering this chapter.
- `promisedReward`: the progress, reveal, payoff, relationship change, or emotional return this chapter must actually give the reader.
- `rewardLevel`: whether this chapter is setup of a payoff, partial delivery, or a major delivery; judged by AI from volume rhythm and chapter duty.
- `protagonistWant`: the immediate goal the protagonist actively fights for in this chapter.
- `primaryResistance`: the specific person, situation, rule, or cost that directly stops the protagonist.
- `keyTurn`: the direction change that must happen in mid- or late-chapter.
- `emotionalShift`: from which emotional state the reader and core characters turn to which state.
- `informationReveal`: key information this chapter is allowed to deliver; not equivalent to a forced big twist.
- `netChange`: a situation change at chapter-end versus chapter-start that cannot be ignored.
- `inheritedHookResponsibilities`: responsibilities from the previous chapter or a short-arc hook that this chapter must answer, reach, or partially deliver.
- `endingHook`: the next point of attention this chapter pushes the reader toward at the end; must not only create new questions without paying old ones.

### Scene Experience Fields

Scene cards add, on top of existing `purpose / entryState / exitState / mustAdvance`:

```ts
interface ChapterSceneExperience {
  resistance: string;
  turn: string;
  emotionalShift: string;
  readerValue: string;
}
```

These fields respectively explain scene resistance, turn, emotional displacement, and effective content the reader gets, so a scene does not only carry information or serve as a transition.

## Data flow

```text
Book Contract + volume strategy + rhythm beat + neighboring chapters
  -> AI chapter execution contract
  -> ReaderExperienceContract + Scene Cards
  -> persist via existing sceneCards JSON
  -> GenerationContextAssembler
  -> chapterWriteContext.readerExperience
  -> writer / acceptance / repair share the reader_experience context block
```

### Persistence decision

Phase one does not add a database column. `ReaderExperienceContract` is a top-level field of `ChapterScenePlan`, serialized into existing `sceneCards` JSON together with scene cards.

Reasons:

- It shares lifecycle, generation entry, and version updates with the chapter execution contract.
- No dual write, and no data migration.
- Old chapters can still be read by the existing parser.
- Later, if the reader-experience contract needs independent versions and human editing, upgrade to an independent persistence model based on real use.

## Book Contract sink rules

Writing context is supplemented with these complete fields:

- `readingPromise`
- `protagonistFantasy`
- `coreSellingPoint`
- `chapter3Payoff`
- `chapter10Payoff`
- `chapter30Payoff`
- `escalationLadder`
- `relationshipMainline`
- `activeMilestonePayoffs`

`activeMilestonePayoffs` is a deterministic projection of the explicit chapter 3/10/30 contracts: chapters 1–3 attend to chapter-3 delivery, chapters 4–10 to chapter-10 delivery, chapters 11–30 to chapter-30 delivery. It is not keyword judgment, and it does not replace AI planning.

## Volume-level reward sink rules

`VolumeWindowContext` adds:

- `readerRewardLadder`: book-wide volume-level reward ladder.
- `coreReward`: the core reader reward the current volume must deliver.

The chapter-detailing Prompt already reads volume strategy; at runtime, continue to restore these two fields from the versioned document belonging to the current volume, so body writing and repair still see them.

## Continuity duty boundaries

Phase one adopts these stable boundaries:

- Novel Fact Ledger: facts that have happened, are irreversible, and have been accepted; responsible for preventing repeated pursuit and fact rollback.
- Payoff Ledger: long-term promises, foreshadows, due delivery windows, and delivery state.
- Reader Experience Contract: this chapter’s reader question, payoff, protagonist drive, turn, net change, and hook-carry responsibilities.
- Timeline: keep frontend event display, async extraction, and diagnostic value; no longer a required context of the body Prompt.

Body generation only reads the unified facts, foreshadows, chapter obligations, and reader-experience contract; it no longer requires a actually-empty `timeline_context` or `previous_chapter_hook` placeholder block.

## Compatibility strategy

### Old chapters

When old `sceneCards` do not contain a reader-experience contract or scene-experience fields:

- The parser uses an empty contract to stay readable; do not crash the recovery chain or old runtime packs.
- Runtime generates a compatibility projection from existing chapter mission, chapter expectation, boundary contract, foreshadow instructions, and hookTarget.
- The compatibility projection is only for old assets; it does not replace new chapters’ AI-generated structured contract.

### Old runtime packs and caches

New fields use defaults; old cache deserialization still passes. Prompt Context renders only when the contract has content; newly generated chapters must return a complete contract via the structured-output schema.

## Prompt and AI-first rules

- New capability is implemented by extending the output schema of existing registered Prompt Assets.
- Do not add keyword matching, regex intent routing, or hard-coded genre branches.
- AI is responsible for understanding the reader payoff, turn, emotional displacement, and hook duties this chapter should give.
- Deterministic code only does schema validation, old-asset compatibility, explicit chapter-window projection, and context assembly.

## Implementation split

### 1A: Shared contract and chapter detailing

- Add the reader-experience domain schema.
- Extend ChapterScenePlan and newly generated scene-card schema.
- Extend the chapter execution-contract Prompt and serialization chain.

### 1B: Runtime context sink

- Extend BookContractContext.
- Restore complete fields of the persisted Book Contract.
- Restore volume-strategy reader-reward fields.
- Build the `reader_experience` context block.

### 1C: Writing, acceptance, and repair consumption

- writer sets `reader_experience` as required.
- acceptance checks whether the contract forms a visible payoff, agency, turn, and net change.
- repair / patch repair keep already-delivered reader value, and targeted-repair contract gaps.

### 1D: Continuity convergence

- Remove disabled timeline blocks from the body Prompt required contract.
- Update the Wiki to make ownership of facts, foreshadows, reader experience, and Timeline explicit.

## Acceptance criteria

### Contract completeness

- Newly generated chapter execution contracts must contain a complete `ReaderExperienceContract`.
- Newly generated scene cards must contain resistance, turn, emotional displacement, and reader value.
- Old chapter execution contracts can still parse and enter the writing chain.

### Context completeness

- writer can see the complete Book Contract, current-stage delivery, and volume-level core reward.
- writer, acceptance, and repair read the same `reader_experience` block.
- The body Prompt no longer declares timeline required blocks that are not actually built.

### Behavior boundaries

- Ordinary reader-experience gaps must not auto-escalate to global `replan_required`.
- Phase one produces no destructive database operations.
- Do not add a parallel Prompt entry or unregistered business Prompt.

### Verification

- shared build / typecheck.
- server targeted typecheck.
- Tests related to chapter layered context, structured-output normalization, and generation-context assembly.
- Docs and Git diff check.

## Later phases

Phase two will handle auto-posting Book Contract chapter 3/10/30 promises onto Payoff Ledger, hook delivery windows, and detecting consecutive setup with no payoff.

Phase three will add independent reader-experience scoring, evidenced Rewrite Directives, and quality debt ordered by reader impact.

Phase four will establish AI-driven whole-book wrap-up state and completion checks.

## Implementation status

- [x] Phase-one boundary and domain-contract confirmation
- [x] 1A Shared contract and chapter detailing
- [x] 1B Runtime context sink
- [x] 1C Writing, acceptance, and repair consumption
- [x] 1D Continuity convergence
- [x] Targeted verification

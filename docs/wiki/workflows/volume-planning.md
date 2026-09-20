# Volume-planning workflow

## Background

Volume planning sits between story-macro planning and chapter execution. It splits the whole book’s promises into volume-level stages. It cannot only answer “how many volumes”. It must also answer why each volume deserves to exist on its own, what stage payoff it carries, how it protects early progression order, and how much schedulable room later volumes keep.

Most target users are writing beginners. If volume strategy drifts from volume skeleton, beat sheet, and chapter tasks, users easily treat an old skeleton as already in sync, or keep splitting chapters under a high-risk strategy, until later chapters keep losing focus. Volume planning therefore has to maintain count decisions, author control, quality gates, and downstream-asset consistency together.

## Decision

Current volume planning uses a two-stage workflow of **dynamic structure range + AI strategy judgment + skeleton generation**:

```text
Story macro planning / book-level contract
-> Volume count and hard/soft guidance
-> Volume strategy
-> Volume strategy critique
-> Volume skeleton
-> Beat sheet / chapter split / chapter execution
```

Volume-count decisions are no longer centered on dividing by a fixed chapters-per-volume number. Chapter budget only supplies a structure range. Final volume count is decided by the model from stage promises, selling-point switches, situation upgrades, stage payoffs, and end-of-volume pull.

## Current Rule

Dynamic volume-count ranges come from `VolumeCountGuidance`:

- `< 60 chapters`: allow `1-2` volumes, suitable for short structure.
- `60-119 chapters`: recommend `3-4` volumes, protecting three-part or four-part structure.
- `120-249 chapters`: recommend `4-6` volumes.
- `250-499 chapters`: recommend `6-9` volumes.
- `500-899 chapters`: recommend `9-14` volumes.
- `900-1499 chapters`: recommend `14-20` volumes.
- `1500+ chapters`: recommend `18-24` volumes.

`allowedVolumeCountRange` is the technical and manual hard range; the current upper bound is `24`. `decisionVolumeCountRange` is the structure-decision range AI auto-splitting should obey. The static Prompt Registry, Prompt Workbench, and the real runtime path must share the same upper bound. One path must not still sit on the old `16`-volume cap.

## Author Control

Existing volume drafts and a user-fixed volume count are both author control:

- `userPreferredVolumeCount` has the highest priority. Schema must hard-lock `recommendedVolumeCount`.
- When the user chooses to keep the draft, `respectedExistingVolumeCount` must also enter the fixed count, not only as a soft context hint.
- Only when the user explicitly restores system suggestion does the path return to automatic judgment inside `decisionVolumeCountRange`.

This rule protects old projects and user-manual structure. AI may explain risk, but it must not change volume count on the “keep the draft” path.

## Strategy And Skeleton Consistency

`strategy` and `skeleton` are different asset layers:

- Strategy owns volume count, hard/soft range, volume-level duties, and uncertainty.
- Skeleton owns concrete volume-skeleton fields, chapter ranges, and the editable volume workspace.

After strategy is rerun, the old skeleton is no longer trustworthy. The system must clear old `volumes`, beat sheets, and adjacent-volume rebalance results, and make the user explicitly regenerate the volume skeleton. “New strategy + old skeleton” must not briefly coexist, or beginners will think the skeleton already synced to the new strategy.

## Critique Boundary

Volume-strategy critique is not display-only information. Its boundary is:

- `low` / `medium` risk: skeleton generation may continue, but the UI should show the risk and suggestions.
- `high` risk: block skeleton generation and require the user to regenerate or revise strategy.
- The Auto-Director path runs critique after strategy, then enters skeleton. If critique returns high risk, server readiness and scope checks block further progress.

The first version does not introduce a new prompt that auto-revises strategy. If auto-revise is added later, keep this order:

```text
strategy -> critique(high) -> revise strategy -> critique -> skeleton
```

Do not leave critique as a “visible but unused” half-product, and do not let a high-risk strategy enter the volume skeleton directly.

## Story Macro Dependency

The upstream volume strategy should consume most is story-macro planning: main selling points, long-term opposition, progression loop, growth path, key payoff points, and unbreakable constraints.

In the current Prompt Context Policy, `macro_constraints` is still a preferred block because historical projects may lack story-macro planning. The rule is:

- When Story Macro exists, each volume `roleLabel` must map to a main selling point, conflict escalation, growth path, or ending flavor.
- When Story Macro is missing, strategy must degrade to a more conservative structure and explain in `uncertainties` the risk of lacking a main-line skeleton.
- Do not invent fine-grained main-line stages when Story Macro is missing.

If the product flow later forces every new project to generate Story Macro first, `macro_constraints` can be upgraded to required.

## Hard / Soft Planning

Hard and soft are volume-level planning depth, not quality high vs low:

- `<= 3 volumes`: all hard, to keep short/mid-length structure complete.
- `4-6 volumes`: the first `3-4` volumes are hard.
- `7+ volumes`: the first `3-6` volumes are hard, later ones soft.

Hard volumes lock early promises, selling points, progression order, and pacing stability. Soft volumes keep later volumes’ direction and stage duty without freezing every detail early.

## Beat Sheet Slot Contract

The beat sheet uses **fixed duty slots + this-volume dynamic short titles**:

- `key` must use system slots: `open_hook`, `first_escalation`, `midpoint_turn`, `pressure_lock`, `climax`, `end_hook`; optional extras are `early_complication`, `late_complication`.
- `label` is the stable duty name, for example `Opening hook` / `First escalation`, used for validation, recovery, and UI grouping. Free invention is not allowed. English is the only stored value.
- `title` is this volume’s custom short title, for example “Seizing the seal at the night market”, generated dynamically by AI from the volume skeleton.
- UI display prefers `duty · short title`. Old data without `title` falls back to the duty name.
- Beat segmentation itself remains in-volume AI dynamic planning. Hard/soft only decide volume-level planning depth; they do not directly decide beat cuts.

This rule avoids two failures: fully frozen duty names that feel like genre templates, and fully free duty names that make later beat regenerate, validation, and navigation unstable.

## Incremental Chapter List By Beat

The beat sheet is still generated for the whole volume. Chapter split defaults to incremental generation by a single beat. Execution contracts still fill per chapter through JIT. Beginners can therefore get writable chapters for the current beat and start refining or writing without waiting for every volume chapter title at once.

The manual workbench main path is: if the currently focused beat has not fully generated chapters, generate that beat; otherwise generate the first incomplete beat. `full_volume` remains an advanced / batch operation for filling all chapter titles in this volume at once.

After a successful `single_beat` generation, only validate local coverage of the target beat, merge that beat into `VolumePlanDocument`, and keep other already generated beats. Ungenerated beats may stay empty. Volume status uses `chapter_list_partial:*` to mean this volume’s chapter split is not fully complete. That is not an execution block; already synced chapters may still be refined and written.

### Cross-Beat Title Integrity

Chapter-title uniqueness is a whole-volume deterministic data-integrity rule, not a quality suggestion shown only inside the current beat. Every `single_beat` generation must obey:

- Titles of completed beats may appear only as a one-time handoff summary. They must not enter both “prior summary” and “locked summary”. Locked summary keeps only chapters that already exist after the target beat, so prior titles are not injected into model context twice.
- At chapter-split time the conflict-intensity curve only provides chapter index, intensity, and change direction. It does not carry existing titles, so the model cannot treat the curve as a recitable title template.
- The current PromptAsset treats other beats’ titles as a structured reserved set. If model output conflicts with that set, semantic retry is required. After retries are exhausted, fail directly. Do not degrade-save the raw output.
- Every intermediate merge result and the final merge result must run whole-volume title validation. A failed check must not trigger intermediate workspace persistence, chapter sync, or prose production.

If a historical volume already has duplicate titles, title repair must regenerate beat by beat so each generation can see the reserved titles of other beats. On save, sync titles and planning fields through `syncToChapterExecution`, keeping `preserveContent: true` and `applyDeletes: false`. Existing prose is a protected asset. Title repair must not rewrite prose.

Title repair is executed serially by the director command queue. After a command is leased the task enters running; that is this repair command’s own lifecycle mark. Runtime must not mistake that state for another concurrent task. Real concurrency protection belongs only to the queue’s active-command constraint.

Single-beat generation does not trigger adjacent-volume rebalance by default. Adjacent-volume rebalance runs only after this volume completes through `full_volume`, or when the user / director explicitly asks to calibrate adjacent volumes, so every beat split does not disturb later volume planning.

Chapter sync must keep protecting existing prose: autosave uses the existing `syncToChapterExecution` path with `preserveContent: true` and `applyDeletes: false`. When regenerating a beat, chapters that already have prose are locked by default. The system may update planning fields only on chapters without prose.

### Auto-Director Readiness Projection

Auto-Director uses two projection semantics and does not mix them into one old `chapterListReady` judgment:

- `beatChapterListReady`: the beat needed by the current execution window is generated and can be synced / refined / written.
- `volumeChapterListComplete`: every beat in this volume is generated.

Whole-book or volume-level auto-advance may enter the current beat’s chapter refinement and execution when `beatChapterListReady = true` and `volumeChapterListComplete = false`. After the current window completes, the recovery point should return to structured outline and continue generating the next unfinished beat. A long volume therefore does not block first-beat prose because later-volume titles are not generated yet.

`resolveStructuredOutlineRecoveryCursor` needs to recognize the first unfinished beat, and on auto-execution paths that allow partial ready it should select only chapters covered by completed beats. Checkpoint repair and continue-run logic must keep the fact that `volumeChapterListComplete = false`, so finishing the current beat is not mistaken for whole-volume / whole-book `workflow completed`.

### Change Impact Scope

Character injection, local revision, and selling-point adjustment obey “minimum disturbance of unwritten range”:

- Beats covered by existing prose are marked `locked_with_draft`. By default they are not re-split and prose is not rewritten.
- Later beats that already have generated chapters but no prose are marked `stale`, suitable for reassigning participants, attaching new characters, or refreshing planning fields.
- Later beats that have not generated chapters are marked `pending`. The default action is to attach the change to later unwritten segments.

UI and director fact summaries may show `affectedBeats`, `staleBeatCount`, `lockedBeatCount`, `defaultImpactAction`, and `advancedImpactActions`, but those are projection / decision summaries and do not need a database migration. Only when a structure-level character or global selling-point change clearly affects whole-volume strategy should advanced actions be suggested, such as rerunning the beat sheet or volume strategy.

## Downstream Gap

Volume planning’s value has to reach chapter execution. `VolumeWindowContext.keyMilestoneGuards` already exists as a field, but the volume-planning service does not yet fill it completely. That gap can still let chapter generation pay off later milestones early or repeat a volume-level climax.

A later fix should let skeleton or beat-sheet generation produce key milestone guards, and inject target chapter range, events, forbidden-early payoff points, and pacing notes into `volume_window` context.

## Related Modules

- `shared/types/volumePlanning.ts`: dynamic volume-count ranges, hard/soft ranges, and author-control calculation.
- `shared/types/volumeBeatSlots.ts`: beat-sheet fixed duty slots, alias normalization, and display copy.
- `server/src/services/novel/volume/volumeGenerationOrchestrator.ts`: strategy, critique, skeleton run order, and fixed-count pass-through.
- `server/src/services/novel/volume/volumeGenerationHelpers.ts`: scope readiness and strategy/skeleton merge rules.
- `server/src/services/novel/volume/volumeWorkspaceDocument.ts`: workspace readiness.
- `server/src/services/novel/director/recovery/novelDirectorStructuredOutlineRecovery.ts`: Auto-Director structured-outline recovery point and partial beat-ready projection.
- `server/src/services/novel/volume/volumePlanChangeDetection.ts`: volume-level change and later-beat impact-scope projection.
- `server/src/services/novel/dynamics/CharacterDynamicsMutationService.ts`: later unwritten-beat impact records after character-dynamics changes.
- `server/src/prompting/prompts/novel/volume/strategy.prompts.ts`: volume-strategy PromptAsset.
- `server/src/prompting/prompts/novel/volume/skeleton.prompts.ts`: volume-skeleton PromptAsset.
- `server/src/prompting/prompts/novel/volume/beatSheet.prompts.ts`: beat-sheet PromptAsset (fixed slots + dynamic short titles).
- `docs/wiki/prompts/novel-generation-quality-guards.md`: volume-level key-node guard gap.

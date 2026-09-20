# Current-phase tasks: chapter production and issue-governance consolidation

Updated: 2026-08-26
Snapshot integration branch: `beta`
Snapshot integration target: `beta`
Synced baseline: `origin/beta@f8beac96`
Phase status at snapshot: P0 engineering consolidation was complete; next work was governance compatibility and unreachable-legacy cleanup.

This file is a historical phase checklist from 2026-08-26. Current integration is single-branch `main`. Do not treat the `beta` merge steps below as the live branch workflow.

## Phase goal

Consolidate “draft generation → review → issue identification → repair → save → continue” into one low-coupling, recoverable, explainable production chain. Issue management only emits governance actions. Generation and runtime modules only execute those actions. Call sites must not repeat judgment, retry, or task-state mutation.

The two product paths are issue-management presets, not hardcoded execution forks:

1. **Completion-first:** allow review plus one repair attempt; local problems become quality debt and the chain continues. Pause only for an explicit replan, no usable chapter text, or a runtime safety / data-integrity failure.
2. **Quality-first:** human staged writing stops at a recoverable checkpoint when judgment is required; full-book auto-creation still continues with quality debt.

Shared hard boundaries:

- Automatic repair retries per chapter are less than 2, meaning at most 1 attempt.
- Local quality problems must not automatically escalate into whole-book failure or replan.
- When full-book auto-creation already has usable chapter text, local quality problems must not pause the global chain because of a preset or a book-level override action.
- Only a structured governance decision may require pause, failure, or replan.
- Chapter save, chapter status, timeline, and task status must commit inside one lifecycle boundary.
- Do not add a new execution path, introduce a new dependency, or restore “chapter contract / multi-scene multi-round draft generation”.

## Completed work

### A. Branch-front product tasks

- [x] Market Radar can select analysis charts and check individual titles.
- [x] Charts use a fixed-height list with select-all / clear-all; the page keeps a compact title and drops redundant frames.
- [x] The low-border visual rule is in the global development rules; existing compatibility UI primitives stay, but new shadcn components are not added.
- [x] Auto-Director expected chapter count can be cleared and typed again.
- [x] Simple-mode and professional-mode Auto-Director entries are easier to find.
- [x] Professional export supports TXT.

Local commits: `3210a5ff`, `fab0c354`, `ca010796`, `a89c6d0f`, `f2f31e33`, `c5ff1808`, `ec07fa05`, `36be4da4`, `fcd56814`, `04ed970d`, `e0ab3451`.

### B. Issue-governance presets and runtime boundary

- [x] Implement “completion-first / quality-first” as issue-management presets instead of two hardcoded execution flows.
- [x] Human recovery actions follow the current novel’s issue-governance policy.
- [x] Remove the duplicate pre-run issue evaluation so the same problem is not judged twice.
- [x] Chapter run and quality repair share one retry budget; automatic repair is at most 1 attempt.
- [x] Runtime trusts the already-produced governance action and does not wrap another risk judgment.
- [x] Shrink Auto-Director pre-run checks to runtime safety and data integrity; they do not own quality-retry policy.
- [x] Issue discovery is read-only and does not mutate task, chapter, or issue state during identification.

Local commits: `d7d8f281`, `9a929f4a`, `b2faf530`, `0a5185f2`, `8950981f`, `232068e3`, `1724c6df`.

### C. Repair, finalization, and lifecycle consolidation

- [x] Manual repair and automatic repair share the chapter-finalization service so a successful repair does not skip status, summary, or follow-up sync.
- [x] Finalize the timeline before releasing chapter text: normal text writes the stable timeline; usable text with quality debt writes the degraded timeline.
- [x] Later state is released only after the timeline checkpoint writes, so a finished chapter cannot outrun an uncommitted timeline.
- [x] Delete the hidden “loose-anchor patch calls the LLM again” action; repair stays one patch attempt, then at most one whole-chapter repair if needed.
- [x] Add a chapter lifecycle service that owns `Chapter.content`, generation state, and chapter-status writes.
- [x] Runtime, repair flows, and chapter finalization no longer scatter-write lifecycle fields.
- [x] Document chapter-run boundaries, the chapter production chain, and the lifecycle module.

Local commits: `cc5d69a6`, `948dd3a5`, `ee979e82`, `1873a958`.

### D. Human review and recovery-boundary consolidation

- [x] Human chapter review no longer silently calls the planner; the result is a structured quality assessment and replan advice only.
- [x] Explicit `stop_for_replan + global_book` is recorded as a chapter-level recoverable checkpoint, keeps the text, and waits for an explicit user replan.
- [x] Quality marks, repair history, `generationState`, and `chapterStatus` commit once through the chapter lifecycle service; the quality loop no longer writes the chapter table directly.
- [x] Stop automatic retry when chapter save cannot be confirmed, so the same chapter is not regenerated because save outcome is uncertain.
- [x] Automatic recovery that fails after a service restart or lease expiry enters human recovery instead of terminating as unrecoverable failure.

### E. Market Radar creation-foundation consolidation

- [x] AI market analysis emits a structured genre base, a primary progression mode, and optional auxiliary progression modes.
- [x] After user confirm, Radar recommendations reuse the shared genre-base library and progression-mode library; missing assets are filled by structured AI candidates instead of Radar-only categories.
- [x] Market briefs persist unified resource references and still read the older signal-array-only shape.
- [x] Entering Auto-Director from Radar shows and fills the recommended creation foundation without overwriting a manual user selection.
- [x] Radar reports offer “add to genre-base library” and “add to progression-mode library”; the view entry appears and jumps to the real node only after the server succeeds.
- [x] Existing resources show “already in library” instead of a create-success state; a true create refreshes the matching library cache.

## Completed verification

- [x] Shared contracts and server build passed; client typecheck passed.
- [x] Targeted regressions for chapter run, issue governance, Auto-Director, state projection, and service boundaries: 149 of 155 passed, 6 skipped by condition, 0 failed; all 37 integration-guard regressions passed.
- [x] Docs-manifest check passed: 33 documents, 17 keys.
- [x] Extra targeted regressions for human review, quality closure, recovery boundaries, and state projection.
- [x] Browser, screenshot, and visual acceptance were not run; project rules leave those to the user.

## Remaining development tasks

### P0: engineering consolidation

- [x] **Close the human-review → replan entry:** human review must not rewrite itself into replan or failure. First produce a structured issue and governance action; write a recoverable checkpoint and pause only when the action is explicitly `replan` / `stop_for_replan`.
- [x] **Audit remaining bypasses:** check draft generation, review, repair, save, and recovery entries for direct state writes, direct failure, extra LLM retries, or direct replans that skip issue governance.
- [x] **Add end-to-end regressions for both presets:**
  - Completion-first: local review failure, one repair failure, then continue to the next chapter after degraded usable text.
  - Quality-first (human staged writing): the same class of problem pauses, notifies a human, and continues from the checkpoint after handling.
  - Both paths must prove automatic repair happens at most once.
- [x] **Complete the recovery matrix:** worker restart, lease expiry, temporarily unavailable model, chapter-save failure, explicit replan, local quality debt on usable text; confirm recovery does not regenerate finished chapters.
- [x] **Unify state-projection acceptance:** Task Center, AI cockpit, simple mode, and professional mode must show the same governance action, quality debt, pause reason, and recovery entry. Never substitute `workspaceTaskId` for the Auto-Director task id.

### P1: governance compatibility and cleanup

- [ ] Evaluate and fill compatibility reads for old task-governance snapshots; add migration logic only when real old rows need it.
- [ ] Clean unreachable issue-catalog items, old risk-threshold wiring, and unused compatibility code; prove unreachability with call relationships and regression tests before deleting.
- [ ] Audit each `reportIssue` call site so a governance action is marked handled only after it succeeds, avoiding “recorded success, action failed”.
- [ ] Give degraded-finished chapters a queryable quality-debt source, repair-attempt count, and later human-handling entry.

### P2: integration and live-chain acceptance

- [ ] Merge the feature branch into `beta`, then run the server build, related targeted tests, and combined regressions.
- [ ] Run at least 10 consecutive chapters on a sanitized real novel and prove local quality debt does not stop full-book production, recovery does not rewrite chapters, and explicit replan plus data-safety problems still pause.
- [ ] After `beta` is stable, decide whether to enter `main`; this machine must not push. Public release and desktop packaging are outside this phase.

## Next execution order

1. Decide whether old tasks have a real compatibility need for missing governance snapshots.
2. After call relationships prove unreachability, clean old issue-catalog items, risk-threshold wiring, and unused compatibility code.
3. Audit when governance actions are recorded, and add queryable quality-debt sources plus a human-handling entry.
4. After P1, run `beta` integration verification.

## Workspace notes from the snapshot

- The snapshot’s `client/src/pages/novels/autoDirector/directorCreateStages.ts` matches the target baseline and adds no extra diff.
- The snapshot did not include the database or `server/.backups/`; that merge did not change data files.
- Snapshot changes that tried to alter the full-book auto-creation quality gate, and their tests, were not merged. The global auto chain still pauses only for an explicit replan, no usable chapter text, or a runtime safety / data-integrity failure.

## Explicitly out of scope

- Do not add a third issue-governance path.
- Do not copy the two presets into two executors.
- Do not raise repair retry counts or hide extra LLM calls.
- Do not pre-build a migration framework for old-data problems that have not appeared.
- Do not expand new UI, creative capabilities, or third-party dependencies in this phase.

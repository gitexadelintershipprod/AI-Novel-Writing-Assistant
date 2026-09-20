# Auto-Director Stage Knowledge Hardening Plan (P0 Hardening Items)

## Background

A 2026-07 architecture review confirmed: the novel-generation main-chain step-module system (WorkflowStepModule + Registry + Catalog) has a sound contract, but "stage identity" knowledge is scattered across at least four independent holders:

- The hard-coded planning sequence `DIRECTOR_PLANNING_SEQUENCE` in `server/src/services/novel/director/workflowStepRuntime/directorWorkflowPlans.ts`.
- The `NovelWorkflowStage` union type in `shared/types/novelWorkflow.ts`.
- The handwritten stage-fallback if-chain in `resolveSafeDirectorPipelineStartPhase` in `server/src/services/novel/director/recovery/novelDirectorRecovery.ts` (about 45 lines of non-exhaustive conditionals).
- Handwritten mappings such as `phaseToEntryStep` / `entryStepToLegacyStartPhase` / `entryStepToWorkflowStage` / `buildSkipSteps` in `server/src/services/novel/director/runtime/novelDirectorTakeover.ts` (1047 lines), plus about 15 entry judgments hard-coded by stage name.

Stage literals such as `"story_macro"` are scattered across 62 files in server + client + shared. **Core risk: when a new stage is added, the recovery / takeover if-chains and handwritten mappings will not produce a compile error; they will only silently jump to the wrong stage on resume or takeover.**

This plan is two pure hardening actions, clearing the most dangerous hidden pit before any later "add a prerequisite module" need (for example reader-expectation planning that may follow the tension curve).

## Goals

1. **Part 1: Exhaustiveness protection + new-stage checklist** — turn "added a stage but missed recovery / takeover" from a silent error into a compile error or test failure, and deposit a human checklist as a backstop.
2. **Part 2: Add orchestration metadata to the step catalog** — deposit stage order and prerequisite dependencies as data in the existing catalog, pin consistency with the current hard-coded sequences via tests, and pave the way for a later orchestration refactor.

## Out of scope

- Do not change any existing recovery / takeover judgment behavior — all changes in this plan are behaviorally identical.
- Do not make recovery / takeover / planning sequences derive from the catalog (that is the next-stage orchestration refactor and needs this plan's test baseline first).
- Do not split the large `novelDirectorTakeover.ts` file (a separate item, to avoid interfering with this plan's behavioral-identity verification).
- Do not touch frontend stage navigation.

## Part 1: Exhaustiveness protection + checklist

### 1a. Characterization tests first (behavioral baseline)

- `server/tests/novelDirectorRecovery.test.js`: add table-driven truth-table cases for `resolveSafeDirectorPipelineStartPhase` — representative combinations of 6 stages × asset existence (hasStoryMacroPlan / hasBookContract / hasWorldSetupPrepared / hasCharacters / hasVolumeWorkspace+Plan) fully covered, pinning the current if-chain's actual behavior as a baseline. Keep the existing 16 tests.
- `server/tests/novelDirectorTakeover.test.js`: add full mapping assertions for `phaseToEntryStep` / `entryStepToWorkflowStage` / `buildSkipSteps` (every input enum value has an expected output), pinning existing behavior. Keep the existing 13 tests.

### 1b. Compile-time exhaustiveness protection (behavior-identical rewrite)

- `server/src/services/novel/director/recovery/novelDirectorRecovery.ts`:
  - Beside the `DirectorPipelinePhase` union type, add an exhaustive ordered constant (shaped like `DIRECTOR_PIPELINE_PHASE_ORDER`), constrained with `satisfies` so "array elements exactly cover every union member"; adding a stage without joining it becomes a compile error.
  - Do not change the if-chain's logic; only at the end of the function, unclassifiable stages take an assertNever-style fallback (currently unreachable; when a new stage is missed it blows up immediately during tests).
- `server/src/services/novel/director/runtime/novelDirectorTakeover.ts`:
  - Rewrite the three handwritten if-mapping functions `phaseToEntryStep` / `entryStepToLegacyStartPhase` / `entryStepToWorkflowStage` as `Record<complete enum, value>` table lookups — `Record` key exhaustiveness is enforced by the type system; missing a new stage/entry step is a compile error. Behavioral identity is guaranteed by 1a's full mapping assertions.
  - Change `buildSkipSteps` to derive ranges from the ordered constant array, replacing handwritten order judgments.
- If the project has no unified assertNever helper yet, place it in `server/src/utils/` (check for duplicates first; reuse if one already exists).

### 1c. New-stage checklist (wiki)

- Add an "Auto-Director New-Stage Checklist" page under `docs/wiki/`, structured as Background / Current Rule / Touchpoint List / Failure Modes, enumerating every location that must be touched when adding a planning stage:
  1. `shared/types/novelWorkflow.ts` stage union type
  2. `shared/types/directorWorkflowStepCatalogData.ts` catalog entries (including Part 2 orchestration metadata)
  3. `directorWorkflowPlans.ts` planning sequence
  4. `novelDirectorStageNodeAdapters.ts` stage node adapters
  5. `directorPlanningStepModules.ts` step modules
  6. `novelDirectorRecovery.ts` fallback chain and ordered constants
  7. `novelDirectorTakeover.ts` entry mappings
  8. Projection layer (`projections/novelDirectorProgress.ts` and others)
  9. Frontend workbench navigation (`client/src/components/layout/NovelWorkspaceRail.tsx` and others)
  10. Related prompt material groups (`server/src/prompting/materials/materialGroups.ts` and others)
- The checklist also notes which touchpoints have compile-time/test protection after this plan, and which still rely on humans (frontend, projections, prompt materials).

## Part 2: Add orchestration metadata to the step catalog

### 2a. Catalog data extension (pure additive fields)

- `shared/types/directorWorkflowStepCatalogData.ts`: add orchestration metadata fields to `WorkflowStepCatalogEntry` — within-stage execution ordinal and a list of prerequisite step ids (optional fields, backward compatible). Fill values for all existing entries: candidate 4 steps, planning 6 steps, structuredOutline 3 steps, execution 7 steps + contractSync's current real order.
- `shared/types/directorWorkflowStepCatalog.ts`: add query helpers to get an ordered step sequence by stage and prerequisite dependencies by step.

### 2b. Consistency-guard tests (prevent dual-source drift)

- `server/tests/directorWorkflowStepCatalog.test.js`: add assertions — the planning sequence derived from catalog orchestration metadata matches the actual assembled result of `DIRECTOR_PLANNING_SEQUENCE` in `directorWorkflowPlans.ts`; the execution-chain sequence matches the actual module order of each flow from `getDirectorExecutionStepModuleSequence`. Changing either side alone fails the test, forcing both to stay in sync until a future orchestration refactor converges on a single source.
- This test also serves as automated backstop for items 2 and 3 of the "new-stage checklist".

## Execution order and verification

1. 1a characterization tests → run fully green (baseline established).
2. 1b exhaustiveness-protection rewrite → 1a tests must not change any assertion (proof of behavioral identity).
3. 2a catalog metadata + 2b guard tests.
4. 1c wiki checklist (citing protection points already landed in 1b/2b).
5. Verification: `server` typecheck + `node --test` on related test files (novelDirectorRecovery / novelDirectorTakeover / directorWorkflowStepCatalog / directorWorkflowStepModules).

## Acceptance dimensions

- **Fit**: all changes are behavior-identical (1a baseline tests unchanged before vs after); catalog fields are purely additive with no breakage.
- **Completeness**: Part 1 (1a/1b/1c) + Part 2 (2a/2b) all land as complete; 1c may be filled last.
- **Risk**: key confirmations are that after table-izing takeover's three mapping functions, full input/output matches the original if implementations; whether the recovery truth table covers representative combinations exhaustively; and whether the catalog consistency test truly fails when only one side changes.

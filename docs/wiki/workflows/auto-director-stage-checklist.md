# Auto-Director new-stage checklist

## Background

An Auto-Director stage identity affects the planning chain, recovery starting point, takeover entry, task projection, frontend navigation, and prompt-material assembly at the same time. When adding a planning stage, changing only the step module or only the workflow sequence can send recovery or takeover to the wrong stage, or make frontend and backend status disagree.

This checklist constrains the maintenance surface for future Auto-Director stages. It is not a release record. It is a boundary note for stage knowledge: a new stage must update types, catalog, runtime entries, projection, and visible navigation together, and existing guard tests must prove old behavior did not drift.

## Current Rule

When adding an Auto-Director stage, first update the shared stage type and step catalog, then fill runtime sequence, node adapters, recovery fallback, and takeover mapping. Backend runtime touchpoints must have compile-time exhaustiveness protection or test protection. Frontend navigation, projection copy, and prompt materials still need a human check.

Even if the new stage is only an internal transition step, still decide whether it enters `NovelWorkflowStage`, whether it needs a recoverable starting point, whether users may start it from takeover, and whether it should be visible in Task Center or the AI cockpit.

## Touchpoint checklist

1. `shared/types/novelWorkflow.ts`
   - Update shared stage unions such as `NovelWorkflowStage`.
   - Protection: TypeScript unions force dependents to recompile, but they do not automatically explain business order.

2. `shared/types/directorWorkflowStepCatalogData.ts`
   - Add or adjust catalog entries, and fill `orchestrationOrder` and `prerequisiteStepIds`.
   - Protection: catalog-metadata tests validate that depended step ids exist and stay consistent with the runtime plan order.

3. `server/src/services/novel/director/workflowStepRuntime/directorWorkflowPlans.ts`
   - Sync stage order in the planning chain or execution chain.
   - Protection: consistency-guard tests between catalog orchestration metadata and actual plan assembly fail if only one side changes.

4. `server/src/services/novel/director/phases/novelDirectorStageNodeAdapters.ts`
   - Add a node adapter for the new stage, with explicit input, output, stage-completion conditions, and run context.
   - Protection: step-module and node-adapter runtime tests need to be filled when a stage is added.

5. `server/src/services/novel/director/workflowStepRuntime/directorPlanningStepModules.ts`
   - Register the matching `WorkflowStepModule` for a planning stage, and confirm module id, stage name, and context write location agree.
   - Protection: step-module sequence tests expose missing modules or order drift.

6. `server/src/services/novel/director/recovery/novelDirectorRecovery.ts`
   - Update the recovery fallback chain and `DIRECTOR_PIPELINE_PHASE_ORDER`.
   - Protection: ordered-stage constants have compile-time exhaustiveness constraints; recovery truth-table tests pin a safe starting point under asset combinations.

7. `server/src/services/novel/director/runtime/novelDirectorTakeover.ts`
   - Update mappings from takeover stage to entry step, entry step to old starting point, and entry step to workflow stage.
   - Protection: mappings use a complete `Record` lookup, so a missing new enum fails compile; full input/output tests prevent behavior drift.

8. Projection layer such as `server/src/services/novel/director/projections/novelDirectorProgress.ts`
   - Decide whether Task Center, AI cockpit, recovery entry, and progress summary need to show the new stage.
   - Protection: currently mainly a human check. Adding a visible stage must add projection tests or a minimal state sample.

9. Frontend workbench navigation such as `client/src/components/layout/NovelWorkspaceRail.tsx`
   - Decide whether the new stage needs a navigation entry, active state, progress hint, or recovery entry.
   - Protection: currently mainly a human check. Frontend-visible stages must also obey low cognitive load and not force beginners to understand internal stage names.

10. Prompt material groups such as `server/src/prompting/materials/materialGroups.ts`
    - Decide whether the new stage needs a new material group, context-assembly rule, structured-output schema, or prompt-registry entry.
    - Protection: currently mainly a human check. New product-facing prompts must go through the `server/src/prompting/` registration system.

## Failure Modes

- Updating only the plan sequence, not catalog metadata: consistency tests fail, meaning stage order drifted across two sources.
- Updating only the shared stage type, not recovery: compile-time exhaustiveness checks or recovery truth-table tests fail.
- Updating only takeover-entry constants, not takeover mappings: `Record` exhaustiveness constraints expose the missing mapping at compile time.
- The new stage affects user-visible progress, but projection or frontend navigation was not updated: backend tests may pass, but users see a missing stage, stalled progress, or an unclear recovery entry. Those problems must be caught by human checks on touchpoints 8 and 9.
- The new stage needs new context materials, but prompt material groups were not updated: the generation chain may lack required context, showing as structurally correct AI output with weaker content. Those problems must be caught by touchpoint 10 and stage-level prompt tests.

## Related Modules

- `shared/types/novelWorkflow.ts`
- `shared/types/directorWorkflowStepCatalogData.ts`
- `shared/types/directorWorkflowStepCatalog.ts`
- `server/src/services/novel/director/workflowStepRuntime/directorWorkflowPlans.ts`
- `server/src/services/novel/director/workflowStepRuntime/directorPlanningStepModules.ts`
- `server/src/services/novel/director/recovery/novelDirectorRecovery.ts`
- `server/src/services/novel/director/runtime/novelDirectorTakeover.ts`
- `server/src/services/novel/director/projections/novelDirectorProgress.ts`
- `client/src/components/layout/NovelWorkspaceRail.tsx`
- `server/src/prompting/materials/materialGroups.ts`

## Source Documents

- `docs/plans/director-stage-hardening-plan.md`

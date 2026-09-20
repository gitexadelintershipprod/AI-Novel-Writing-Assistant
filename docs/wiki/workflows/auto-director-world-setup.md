# Auto-Director book-world setup

## Background

Auto-Director’s main goal is to help a beginner move from a book-level direction into a state that can start writing. A world is not required for every genre, but in high-setting projects such as xianxia, science fiction, mystery, and cosmic horror, characters, factions, locations, and conflict need to generate under one world constraint. If character prep runs before world prep, characters lack camp, stage, and rule boundaries, and later chapters that add a world tend to drift.

## Decision

The Auto-Director planning chain is fixed:

`Story Macro -> Book Contract -> book-world setup -> character prep -> volume strategy -> chapter task sheet`

Book-world setup sits after Book Contract because the world should obey the whole-book commercial promise, reader expectation, and inviolable constraints. It sits before character prep because the cast needs to read factions, locations, hard rules, and forbidden combinations from the world facade first.

## Current Rule

- When the user picks a reference world sample, Auto-Director keeps that `worldId` and uses `WorldContextGateway` so the book-world instance and the character-use `StoryWorldSlice` are available.
- When the user does not pick a reference world sample, default to generating this book’s `NovelWorld` from the macro plan and book contract. Do not save it to the external world library.
- When the user chooses “do not use a world for now”, `world_setup` completes as a no-op. Later Gateway calls may still return `null`.
- `worldSetupMode=skip` must apply both to recovery-start judgment and sequential Pipeline execution. Even when a task resumes from `story_macro` or `book_contract` and continues forward, it must not run `book.world.prepare` again; that would turn an explicit skip back into forced world prep.
- When recovering from character prep or a later stage, if world prep is incomplete and skip was not chosen, the safe start falls back to `world_setup`.
- Auto-Director depends only on `WorldContextGateway`. It does not call the old novel-world generation entry, and it does not push auto-generated results into the external world library.
- `world_setup` is an independent formal workflow stage. The page recovery target is `world`. Flow navigation is fixed between “story macro planning” and “character prep”. World generation, AI check, refine, regenerate, and save-confirm only read and write this stage’s book-world asset.
- Step-review mode writes `step_review_required` after `book.world.prepare` completes. Current stage, current item, and recovery tab must all be `world_setup/world`. Review context reads the world asset and its source data. It must not borrow character-prep context.
- Auto-continue mode does not extra-pause on the world step; after world prep it goes straight into character prep. Choosing “do not use a world for now” shows this stage as a completed empty step, and character prep keeps the light-setting path.
- Historical tasks are not migrated. Projection and takeover infer in this order: explicit `world_setup` stage or world-step id first; a bound book world counts as complete; unbound and character stage not yet complete returns to world prep.

## Failure Modes

- If recovery only checks story macro, Book Contract, and character count, it can skip world prep from `character_setup`, so character generation on a high-setting project lacks world constraints.
- If auto-generated worlds default into the world library, one-off in-book settings pollute generic world samples and add unnecessary sync semantics.
- If character prep reads old flat fields directly, it bypasses the book-world slice, so import-world, generate-world, and skip-world paths behave inconsistently.

## Related Modules

- `server/src/services/novel/director/novelDirectorPipelineRuntime.ts`
- `server/src/services/novel/director/workflowStepRuntime/directorPlanningStepModules.ts`
- `server/src/services/novel/director/recovery/novelDirectorRecovery.ts`
- `server/src/services/novel/worldContext/WorldContextGateway.ts`
- `client/src/pages/novels/components/NovelAutoDirectorSetupPanel.tsx`

# Server Architecture Migration Plan

## Background

`server/src` currently has several organization styles at once: `routes/`, `services/novel/`, `services/novel/director/`, `modules/`, `creativeHub/`, `graphs/`, and `prompting/`. After long accumulation, the first thing that breaks is not the directory names. Sources of truth, orchestration, HTTP, and platform layers start carrying each other's responsibilities.

## Target Shape

- `app/`: Express assembly, startup, background workers, watchdog, service registration.
- `platform/`: infrastructure such as `db`, `llm`, `events`, `runtime`, `config`, and `prompting`.
- `modules/`: converge by business domain, preferring `setup`, `planning`, `production`, `director`, `characters`, `state`, and `export`.

## Migration Rules

- New capabilities must not keep stacking into old root directories.
- `routes` only do HTTP mapping. They do not own core orchestration.
- `prompting` is the only entrypoint for product-level prompts.
- Migration prefers unchanged APIs, data semantics, and external behavior.
- The first round does not change the database schema.

## Phased Plan

1. Freeze old entrypoints. Stop expanding the `services/novel` and `services/novel/director` roots.
2. Split `NovelWorkflowService`, starting with `store`, `healing`, and `application`. Related `projection` read models are carried by the `store` facade first. Recovery logic is deduplicated through shared helpers.
3. Turn the `NovelService` inheritance chain into an explicit composition facade.
4. Move `novel.ts`, `world.ts`, `settings.ts`, and `novelProductionRoutes.ts` down into module-owned `http/` entrypoints.
5. Split `app.ts` so route assembly, background-service startup, and worker/watchdog initialization are separate.
6. Clean product paths such as `worldDraftGeneration.ts` that call `getLLM()` directly, and unify them onto Prompt Registry.

## Execution Checklist

- [ ] Stop adding large peer files in old roots.
- [ ] Move `NovelWorkflowService` read/store, healing, and application ownership out, and keep recovery logic from being duplicated across services.
- [ ] Change `NovelService` from inheritance to composition.
- [ ] Keep `routes` limited to HTTP mapping and request validation.
- [ ] Split a startup-assembly layer out of `app.ts`.
- [ ] Move old `getLLM()` product paths into the prompt-governance entrypoint.
- [ ] After each phase, run a typecheck and smoke the critical chains.

## Acceptance Criteria

- Directory density drops, and single-file length returns to a maintainable range.
- External dependencies see only module facades and do not deep-link internal files.
- Workflow, director, and prompting boundaries match between the wiki and the code.
- Existing APIs and user behavior stay compatible.

## Risks

- Workflow and director have many historical compatibility paths, so splits must keep facade exports.
- Route and service migrations must not break current frontend calls at the same time.
- Prompt migration should fix the governance entrypoint first. Do not patch holes with string branches.

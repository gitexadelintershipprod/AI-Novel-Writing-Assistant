# Imitation Writing Capability and Generation-Chain Hardening Plan

## Background

User goal: add an "imitation writing" capability on the existing system — write following a reference work, imitating both prose feel and structural patterns.

Prerequisite research conclusions (2026-07, verified point-by-point against code):

1. **Prose-feel imitation already exists**: the writing-style engine's "generate writing style from book analysis" (`POST /style-profiles/from-book-analysis`) is a live path. Generated writing-style assets go through the normal bind / compile / inject chain. The `style_contract` block truly takes effect in writing prompts (priority 74, required in full mode).
2. **Structural imitation's backend pipeline is already half there**: `NovelReferenceService.buildReferenceForStage` injects every book analysis bound to the novel knowledge base into planning-period prompts by stage (outline / structured_outline / bible / beats / character), not limited to continuation mode. What is missing: a product entrypoint, a primary-reference weight mechanism, and a structural-similarity guardrail.
3. **Main-chain infrastructure is mature**: the writing context-block system (35 blocks, independent priority/required config, token-budget trimming, exclusion groups) is enough to support new injection; `style_contract` is a live precedent; there is already a test pattern that can assert "whether a given block appears in the final prompt".
4. **The systemic risk is "last-mile" integration discipline, not architecture**: this research round confirmed four same-pattern cases — timeline (a hard-coded placeholder sentence in the prompt), continuation (`humanBlock` truncated to only the first 3 title lines), book-analysis chapter stage (`STAGE_SECTION_MAP` defined but never called), character resource ledger (multi-layer truncation + non-required block, silently disappears when budget is tight). Common point: the data pipeline is solid, the last step of rendering into the prompt fails, and there is no test guard.
5. **Two call-site / governance hazards**: all four `buildReferenceForStage` calls in `novelCoreGenerationService.ts` have no exception fallback (inside `Promise.all`, a throw from new logic would blow up the entire book-opening flow); `ChapterArtifactDeltaService` (926 lines) and `NovelVolumeService` (803 lines) already exceed the AGENTS.md 700-line mandatory split line.

## Design boundaries (non-negotiable)

1. **Zero-impact principle**: a novel with no reference bound behaves exactly as now. All new logic null-degrades to empty string / empty array; exceptions are caught inside the service and must not bubble to planning/writing callers.
2. **Responsibility boundary follows `docs/design/style-engine-boundary-prd-v2.md`**: prose feel belongs to the writing-style engine; structural patterns belong to the reference/planning layer and must not enter the writing-style engine as writing-style fields.
3. **Guardrails do not block the main chain** (follow AGENTS.md Auto-Director Quality Gate rules): structural-similarity detection is a post-generation side-channel hint, not a hard intercept at generation time, and does not stop auto-director.
4. **AI-first**: structural-similarity judgment is implemented with AI structured output (n-gram literal similarity is ineffective for structural problems); prompts go through `server/src/prompting/` + registry, not inlined in the service.

## Phase 0: Foundation hardening (prerequisite for the new chain)

### PR0-A Context-block existence contract tests

- `server/tests/chapterLayeredContext.test.js`: extend the existing test pattern and build an assertion matrix of "when enable conditions are met, the block must appear in the final blocks and its content is non-empty" for key blocks. At least cover: `style_contract`, `continuation_constraints`, `character_hard_facts`, `character_resource_context` (when there is resource pressure), and blocks added later by this plan.
- Purpose: turn "last mile" from oral discipline into a regression test. If anyone changes the render layer so a block silently disappears, CI fails immediately.

### PR0-B `buildReferenceForStage` call-site hardening

- `server/src/services/novel/NovelReferenceService.ts`: overall fallback inside `buildReferenceForStage` — any query/parse exception is warning-logged then returns empty string; do not throw to the caller. The four planning-stage call sites are not changed.

### PR0-C (parallel track, does not block later Phases) oversized-file split

- Split `ChapterArtifactDeltaService.ts` (926 lines) and `NovelVolumeService.ts` (803 lines) by AGENTS.md responsibility-directory rules.
- This plan's imitation-writing logic does not touch these two files, so the split can run in parallel with Phase 1/2; but until the split is complete, no new feature may continue to add weight to these two files.

## Phase 1: Continuation render fix (shared path with imitation writing; fix first, then reuse)

### PR1-A Continuation-constraint render enhancement

- `server/src/prompting/prompts/novel/chapterLayeredContextShared.ts`: change `summarizeContinuationConstraints` from "first 3 lines of humanBlock, 4 items total" to sectioned extraction by continuation-pack structure (source title, character current state, prior-work ending summary, key facts, unfinished threads, each taking a limited count), with output total aligned to the token budget.
- `server/src/prompting/prompts/novel/chapterLayeredContext.ts`: evaluate whether the `continuation_constraints` block is promoted to required in continuation mode (same level as `style_contract`), to avoid silent discard when budget is tight.

### PR1-B Continuation-bound book analysis actually takes effect

- `server/src/services/novel/NovelContinuationService.ts`: `buildChapterContextPack` adds consumption of `continuationBookAnalysisId` — when a book analysis is bound, prefer its structured sections (timeline / character_system and so on) over coarse line-slicing of source text; when unbound, keep current behavior.
- Incidentally dispose of dead code: the `STAGE_SECTION_MAP.chapter` entry in `NovelReferenceService` is, in this PR, either truly called by this path or deleted with the reason documented in comments/wiki; it must not remain uncalled.

### PR1-C Contract-test coverage

- `server/tests/chapterLayeredContext.test.js` + `server/tests/` (new continuation-related test files): assert that enhanced constraint content truly appears in writer blocks in continuation mode; assert that when a book analysis is bound, pack content comes from structured sections.

## Phase 2: Structural imitation proper

### PR2-A Primary-reference binding data model

- `server/src/prisma/schema.prisma` + `schema.sqlite.prisma` (keep both in sync): `Novel` adds structural primary-reference fields (align with the precedent shape of `continuationBookAnalysisId`: analysis ID + optional section selection); needs one additive-field migration.
- `shared/types/` corresponding types and zod schema extensions.
- `server/src/modules/novel/setup/http/novelBaseRoutes.ts`: create/update input validation extended, validation logic aligned with `NovelContinuationService.validateWritingModeConfig` (the analysis must be succeeded and the source reachable).

### PR2-B Primary-reference weight injection

- `server/src/services/novel/NovelReferenceService.ts`: reuse the existing continuation-preferred code pattern (`resolveContinuationAnalysisConfig` → preferred injected first + remaining references down-weighted) to build an isomorphic resolve-and-inject path for structural primary reference; when primary reference and continuation preferred both exist, make priority explicit (suggest continuation first, because its semantics are stronger).
- Injected content consumes structural sections such as `plot_structure / character_system / timeline` by stage, with labels distinct from ordinary references (for example `structure.reference.primary`).

### PR2-C Product entrypoint

- Create page and project-settings page (corresponding modules under `client/src/pages/`): add a "choose reference-work structure" entrypoint — choose one completed book-analysis as the primary reference, show current binding status and an unbind action.
- UI copy follows AGENTS.md UI Copy rules (user-task facing, not implementation narration).

### PR2-D Structural-similarity guardrail (side-channel hint, non-blocking)

- New prompt: under `server/src/prompting/prompts/novel/` create a structural-comparison PromptAsset and register it in `registry.ts`. Input is the generated structured-outline summary + the primary reference's structural-section summaries; output is a structured list of similar points and risk grades.
- New service: a structural-similarity detection service under `server/src/services/novel/reference/` (or existing directory ownership), hung on the confirmation step after structured outline / volume skeleton generation. Results are shown as hints (aligned with the `openAuditIssues` display pattern); the user may ignore and continue.
- Detection failure degrades silently (log, no hint, no block), following the zero-impact principle.

### PR2-E Auto-director pass-through

- Related runtime under `server/src/services/novel/director/` (align with existing `continuationBookAnalysisId` pass-through points: candidateRuntime / confirmRuntime / helpers / takeover): primary-reference fields pass through the director create chain so the primary reference also takes effect when auto-director opens a book.

## Phase 3: Product integration and documentation

- Merge "generate writing style from book analysis" (already exists) and "structural primary reference" (Phase 2) in product narrative into a complete "write following this book" experience; unify entry copy and guidance.
- `docs/public/modules/book-analysis.md` and writing-style-engine public docs: add imitation-writing path notes.
- `docs/wiki/workflows/`: add a structural-imitation workflow wiki (Background / Decision / Current Rule / Failure Modes format), explaining the responsibility split with the writing-style engine and the "last-mile" contract-test requirement.
- README latest updates and release notes follow the readme-release-updater flow.

## Explicitly not doing

- Do not inject full structural-reference text at the chapter-writing stage (token budget does not allow it; planning-period injection already covers structural influence).
- Do not stuff structural fields into the writing-style engine schema.
- Do not do a generation-time hard-intercept similarity gate.
- Do not, inside this plan, handle known historical problems such as timeline recovery or resource-ledger budget adjustment (separate items).

## Test scope

- Phase 0: the contract-test matrix itself; under `buildReferenceForStage` exception injection, all four planning stages still return normally.
- Phase 1: correctness of continuation-constraint sectioned extraction; required semantics; selection logic of book-analysis sections replacing coarse slices; unchanged behavior when unbound.
- Phase 2: primary-reference validation (reject missing / not succeeded / cross-source); weight-injection order; priority when coexisting with continuation preferred; structured-output parse and degrade path of similarity detection; when no primary reference is bound, full-chain behavior is byte-for-byte identical to now (key regression).
- Throughout: existing test suite does not regress.

## Risks

| Risk | Level | Response |
| --- | --- | --- |
| New-logic exceptions affect the normal book-opening flow | High (without fallback) | PR0-B forces internal degrade; all new Phase 2 queries likewise fall back internally |
| New blocks are silently discarded by the token budget, replaying the last-mile problem | Medium | PR0-A contract tests + explicit required/priority decisions, not relying on defaults |
| Structural imitation generates content too close to the reference work | Medium | PR2-D side-channel detection hints; detection itself is AI-based, iterate the prompt with samples |
| Semantic conflict between primary reference and continuation preferred | Low | PR2-B makes the priority rule explicit and writes it into the wiki |
| Prisma migration (add fields) | Low | Pure additive fields, both schemas in sync, no data backfill |

## Implementation order and branches

- Order: Phase 0 (PR0-A/B) → Phase 1 → Phase 2 → Phase 3; PR0-C in parallel.
- Branches: feature branch → beta → main. This affects the generation main chain and must not jump straight to main.
- Each PR is independently verifiable and independently rollbackable; after Phase 1 completes there is already user-visible value (continuation actually takes effect), so it need not wait for everything to finish before merge.

## Acceptance criteria

- Novels with no reference bound / continuation not enabled: generation-chain behavior and prompt content match pre-change (contract tests and sampled diffs).
- Continuation mode: writer prompt shows structured constraints of prior-work character state / ending summary / unfinished threads, with test guards.
- Structural imitation: after binding a primary reference, planning-period artifacts show reference-structure influence; the structured-outline confirmation step shows a similarity hint (when similar points exist); after unbind, ordinary behavior returns.
- All new prompts are registered in the registry; wiki and release notes are updated per rules.

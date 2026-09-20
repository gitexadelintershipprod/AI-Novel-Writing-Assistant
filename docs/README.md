# Docs layout

`docs/` holds design documents, phase checkpoints, module plans, and historical archives that do not belong in the repository root.

## Root-file rule

Keep only these kinds of files at the repository root:

- Public project entry: `README.md`
- Current execution checklist: `TASK.md`
- Collaboration and engineering constraints: `AGENTS.md`
- Monorepo and toolchain config: `package.json`, `pnpm-workspace.yaml`, `tsconfig.base.json`, `.env.example`

Put remaining design notes, phase summaries, module plans, and historical specs into the matching `docs/` subdirectory.

Developer-facing docs in this tree are English. The Georgian user guide stays Georgian. Quoted Chinese protocol aliases are allowed only when documenting dual-read of old stored values. English is canonical on write.

## Directories

### `docs/checkpoints`

Phase checkpoints, architecture-migration milestones, progress audits, and comparison notes.

- [Chapter Editor V2 Progress](./checkpoints/chapter-editor-v2-progress.md)
- [Prompt Governance Audit 2026-05-08](./checkpoints/prompt-governance-audit-2026-05-08.md)
- [LLM Schema Refactor Checkpoint](./checkpoints/llm-schema-refactor-checkpoint.md)
- [Windows Desktop Installer Manual Checklist](./checkpoints/windows-desktop-installer-manual-checklist.md)

### `docs/plans`

Module plans, work breakdowns, and product-advance proposals that still have execution value.

- [Assistant UI Plan](./plans/assistant-ui-plan.md)
- [Chapter Editor V2 Plan](./plans/chapter-editor-v2-plan.md)
- [Character Resource Ledger Plan](./plans/character-resource-ledger-plan.md)
- [Prompt Workbench, Context and Step Runtime Plan](./plans/prompt-workbench-context-and-step-runtime-plan.md)
- [Auto Director Execution Plane Isolation Plan](./plans/auto-director-execution-plane-isolation-plan.md)
- [Director Mode Module and State Refactor Checklist](./plans/director-mode-module-state-refactor-checklist.md)
- [Reader experience contract, phase one](./plans/reader-experience-contract-phase-one.md)
- [Payoff ledger foundation, phase two](./plans/payoff-ledger-foundation-phase-two.md)
- [P0 payoff safety: ghost promises and the replan gate](./plans/payoff-ledger-safety-phase-three.md)

### `docs/design`

System design, module interfaces, product mechanics, and domain models.

- [Product UI design system](./design/product-ui-design-system.md)
- [Style Engine v1](./design/style-engine-v1.md)
- [Style Engine Prompt Compiler v1](./design/style-engine-prompt-compiler-v1.md)
- [Style Engine Boundary and PRD v2](./design/style-engine-boundary-prd-v2.md)
- [World Management v2](./design/world-management-v2.md)
- [World Story Interface v1](./design/world-story-interface-v1.md)

### `docs/architecture`

Cross-cutting architecture notes and engineering conventions (without replacing the public root README).

- [Backend testing](./architecture/testing.md): how to run backend `node:test` scripts and which directories they use.

### `docs/wiki`

Durable project knowledge: architecture decisions, workflow boundaries, runtime contracts, debugging lessons, and product design rationale.

The wiki does not replace plans, checkpoints, or release notes:

- `docs/wiki` records stable rules and reasons.
- `docs/plans` records plans and work breakdowns that still have execution value.
- `docs/checkpoints` records phase state, migration milestones, and audits.
- `docs/design` records module design, domain models, and product mechanics.
- `docs/releases` records user-visible changes.

- [Wiki Index](./wiki/README.md)
- [Wiki Entry Template](./wiki/entry-template.md)
- [Module Boundaries](./wiki/architecture/module-boundaries.md)
- [Auto Director Runtime](./wiki/workflows/auto-director-runtime.md)
- [Chapter Production Chain](./wiki/workflows/chapter-production-chain.md)
- [Prompt Registry and Structured Output](./wiki/prompts/prompt-registry-and-structured-output.md)

### `docs/releases`

The full user-visible update history. Root `README.md` keeps only the latest date block.

- [Release Notes](./releases/release-notes.md)

### `docs/public`

User-facing introduction, install, usage, and troubleshooting docs. Most public pages are English. The Georgian usage guide stays Georgian.

- [Georgian user guide](./public/georgian-user-guide.md)

### `docs/archive`

Historical init specs and material that is no longer a current implementation source but must be kept.

- [Project Init Spec](./archive/project-init-spec.md)
- [Outdated Docs Index](./archive/outdated/README.md)

## Naming

- Use lowercase English filenames with `-` between words.
- Put execution plans in `docs/plans/`.
- Put architecture changes, progress checks, and migration checkpoints in `docs/checkpoints/`.
- Put module design, data models, and interaction mechanics in `docs/design/`.
- Put long-lived architecture rules, workflow boundaries, debugging lessons, and product rationale in `docs/wiki/`.
- Put user-visible update history in `docs/releases/`.
- Put abandoned, garbled, or superseded plans that still need an archive in `docs/archive/outdated/`.

## Maintenance

- When adding a document, first decide whether it truly belongs at the repository root. The default answer is no.
- When changing a core workflow, Prompt, RAG, task state, Auto-Director, chapter production, or an important debugging conclusion, decide whether it produced stable wiki value.
- Wiki pages should explain long-lived rules and reasons. Do not write them as file-change lists, temporary TODOs, or copied release notes.
- After moving a document, update paths in root `README.md` and other entry pages.
- `TASK.md` owns the current main path and priorities. It does not replace design docs; design detail belongs under `docs/`.
- Root `README.md` latest-updates keeps only the newest date block. Full history lives in `docs/releases/release-notes.md`.
- `pnpm check:english-docs` fails when these developer docs gain unclassified Han text.

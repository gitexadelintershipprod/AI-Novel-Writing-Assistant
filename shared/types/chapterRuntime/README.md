# Chapter Runtime Schema Boundary

`chapterRuntime.ts` is the external compatibility facade and the cross-domain runtime-package assembly contract. This directory splits independently maintainable schemas by stable domain:

- `styleSchemas.ts`: writing-style contract and runtime style context.
- `dynamicCharacterSchemas.ts`: dynamic characters, relationship stages, faction trajectories, and appearance risk.
- `payoffSchemas.ts`: Payoff Ledger runtime projection.
- `qualitySchemas.ts`: audit, acceptance, style-review, and length-control results.

External modules should continue to import from `@ai-novel/shared/types/chapterRuntime` and must not depend on files inside this directory. Submodules may hold only pure Zod schemas and inferred types; they must not introduce a database, a service singleton, or run orchestration.

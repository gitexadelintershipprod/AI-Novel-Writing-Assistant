# Recurring failure modes and diagnosis paths

## Background

Failures that keep showing up in this project are often not single-point bugs. They are bypassed boundaries: heavy work running in the API process, state inferred from multiple sources, prompts bypassing the registry, a chapter hot path that is too long, or inconsistent RAG retrieval scope. Keeping these diagnosis conclusions avoids relocating the same class of problem every time.

## Decision

When debugging, first confirm the fact source, execution plane, projection, and governance entry, then look at the specific code. Do not first hide a systemic issue with a UI patch, a keyword fallback, or a local try/catch.

## Current Rule

- If the API is stuck, first check whether a long task is still executing in the Web API process.
- If state is inconsistent, first check `DirectorRun / StepRun / Event / Artifact` and projection, not the frontend display.
- If prompt output is wrong, first check PromptAsset, schema, repair, semantic retry, and provider capability.
- If chapter output is slow, first check whether the hot path re-serializes multiple LLM post-processing steps.
- If RAG misses, first check explicit documents, bound documents, globally enabled documents, and the context resolver.
- Operations with data-destruction risk must back up first, validate the backup, then get explicit approval.

## Examples

Common diagnosis paths:

- After continuing the director, every API becomes slow: check whether the route directly awaits a long task, whether the Worker leases independently, and whether SQLite/Prisma write locks are held by a long chain.
- Task Center shows failed but the novel page shows running: check whether projection mixed old task status, runtime command, and artifact facts.
- Chapter prose is empty and the chain still advances: check the writer empty-return guard, per-chapter automatic retry, and failure persistence.
- Chapter review keeps entering a repair loop: check whether the post-quality loop is already capped at one repair, whether the final result has converged to “did not pass but continue production”, and whether the workspace still counts a terminal chapter as a repair ticket.
- A long-arc setup is treated as a current-chapter block: check whether the timeline hook’s `resolveMode` and `blocking` were mislabeled as `immediate + blocking`, and whether the detector promoted `short_arc` / `long_arc` into a hard failure.
- Regenerating candidates does not enter a new round: check batch reuse, command idempotency, and candidate-stage runtime state.
- Generation did not use knowledge-base materials: check `knowledgeDocumentIds`, novel/world bindings, enabled state, and the prompt context requirement.

## Failure Modes

Do not use these as substitutes for a root-cause fix:

- Lowering frontend poll frequency to hide API execution-plane blocking.
- Disabling a UI button to avoid duplicate execution without handling command idempotency.
- Adding a keyword fallback to intent recognition to hide an AI schema or context problem.
- Adding a local JSON-parse branch in a business service to bypass the Prompt Registry.
- Displaying a background asset-feedback failure as a prose-generation failure.

## Related Modules

- `server/src/routes/`
- `server/src/workers/`
- `server/src/services/novel/director/`
- `server/src/services/novel/runtime/`
- `server/src/services/rag/`
- `server/src/prompting/`
- `client/src/pages/tasks/`
- `client/src/pages/novels/`

## Source Documents

- [Auto-Director execution-plane isolation and API keep-alive plan](../../plans/auto-director-execution-plane-isolation-plan.md)
- [Director-mode modularization and state-governance checklist](../../plans/director-mode-module-state-refactor-checklist.md)
- [Chapter-output pipeline slimming and asset-feedback plan](../../plans/chapter-output-pipeline-optimization-plan.md)
- [Prompt Governance Audit 2026-05-08](../../checkpoints/prompt-governance-audit-2026-05-08.md)
- [README latest updates](../../../README.md)

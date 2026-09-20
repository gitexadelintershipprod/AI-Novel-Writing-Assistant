# Outdated Document Archive Index

This directory keeps documents that are no longer suitable as current development authority but still have historical reference value. Typical archive reasons:

- The document describes an early plan that has been replaced by later release notes, wiki, or a new execution plan.
- The document still has historical reference value, but leaving it in `docs/plans` or `docs/checkpoints` would mislead future developers and AI agents.
- The document is still readable, but currently only suitable as historical migration background.

Archived documents must not be used as current implementation authority. For current rules, prefer `docs/wiki/`, `docs/releases/release-notes.md`, active plans still in `docs/plans/`, and module READMEs.

## Auto-Director Related

- [Auto Director MVP Migration Plan 2026-04-28](./auto-director-mvp-migration-plan-2026-04-28.md): early MVP slice, replaced by May facts around background commands, recovery, projection, and chapter execution; kept only as historical migration background.

Three garbled auto-director history documents were deleted outright and no body copies are retained. Current auto-director rules follow the 2026-05-08 to 2026-05-14 release notes, [Auto-Director Runtime and Recovery Boundary](../../wiki/workflows/auto-director-runtime.md), [Auto-Director Execution-Plane Isolation and API Keep-Alive Plan](../../plans/auto-director-execution-plane-isolation-plan.md), and [Director-Mode Modularization and State-Governance Checklist](../../plans/director-mode-module-state-refactor-checklist.md).

## Early Plans Replaced by Current Implementation

- [Desktop Plan 2026-04-17](./desktop-plan-2026-04-17.md): the document is still at the “not yet in distributable packaging” stage; current desktop release has advanced to the Windows client package in the 2026-05-14 release notes.
- [Knowledge Module Plan](./knowledge-module-plan-implemented-reference.md): knowledge-document, binding, indexing, and retrieval capabilities are already in the current product; long-term rules have settled in [Knowledge Base and Context Assembly](../../wiki/rag/knowledge-and-context-assembly.md).
- [Progress Audit](./progress-audit-superseded.md): early TASK comparison audit; many of its “not implemented” judgments have been replaced by later implementation and release notes.

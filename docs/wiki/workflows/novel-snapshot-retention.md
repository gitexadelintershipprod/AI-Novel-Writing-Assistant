# Novel snapshot retention

## Background

Novel version snapshots restore outline, chapter split, prose, and volume-workspace state. Auto-Director and batch chapter production write snapshots at key nodes to keep the generation chain recoverable. If every automatic node stores a full-book snapshot, local SQLite grows quickly and slows the version-history list, backups, and pre-dev data sync.

## Decision

Automatic snapshots are a runtime safety net, not a long-term version library. The system keeps only a recent automatic-snapshot window per novel. User-created manual snapshots are kept long-term. List APIs return snapshot metadata only. Restore APIs read full snapshot content.

## Current Rule

- Automatic snapshots include `before_pipeline` and `auto_milestone`. The two types count together.
- Each novel keeps the newest 10 automatic snapshots by default, adjustable through `NOVEL_SNAPSHOT_RETENTION_COUNT`.
- `manual` snapshots do not participate in automatic pruning. Manual backups created automatically before restore must also be kept.
- After creating an automatic snapshot, immediately try to prune old automatic snapshots. Prune failure records a warning only and must not stop the chapter production chain.
- `GET /novels/:id/snapshots` returns only `id`, `novelId`, `label`, `triggerType`, and `createdAt`. It must not return `snapshotData`.
- One-shot stock cleanup uses `server/scripts/prune-snapshots.cjs` and defaults to dry-run. Before executing deletes, create a validated SQLite backup. After delete, run `VACUUM` to reclaim disk.

## Failure Modes

- If the version-history list slows again, first check whether the list API or frontend started reading `snapshotData` again.
- If `NovelSnapshot` remains the largest database table, first check whether automatic pruning was skipped, whether the env var is set too high, or whether a new triggerType was left out of the automatic-snapshot set.
- If the cleanup script fails, confirm the dev service is stopped, the backup directory is writable, the target database is a SQLite `file:` URL, and `PRAGMA quick_check` passes.

## Related Modules

- `server/src/services/novel/novelCoreSnapshotService.ts`
- `server/src/services/novel/application/NovelApplicationServices.ts`
- `server/scripts/prune-snapshots.cjs`
- `client/src/pages/novels/components/VersionHistoryTab.tsx`

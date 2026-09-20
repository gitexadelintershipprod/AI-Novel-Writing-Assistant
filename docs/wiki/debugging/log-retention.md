# Log retention and rotation

## Background

The project has desktop main-process logs, server development session logs, LLM debug JSONL, and structured-repair JSONL at the same time. They are for local troubleshooting and development diagnosis. They should not grow without bound, and they should not be mixed with Auto-Director events or task-recovery evidence in the database.

## Current Rule

File-log cleanup only handles known suffixes in log directories:

- `.log`
- `.meta.json`
- `.llm.jsonl`
- `.llm-repair.jsonl`

Default retention:

- Ordinary logs and session metadata: 30 days.
- LLM debug logs: 14 days.
- LLM repair logs: 30 days.
- Files modified in the last 24 hours are not deleted automatically.
- When an active log exceeds 50MB, it rotates to a timestamped history file, and new content keeps writing to the original active path.

## Boundary

Log cleanup must not delete database event tables, novel data, generated images, backup directories, or unknown-suffix files. Auto-Director database records such as `DirectorEvent`, `DirectorRuntimeEvent`, and `DirectorLlmUsageRecord` are runtime ledgers and recovery evidence. They do not participate in file-log cleanup.

If database events need cleanup in the future, design archive, export, and restore-validation separately. Do not reuse file-log TTL rules.

## Configuration

Default policy can be adjusted with environment variables:

- `AI_NOVEL_LOG_CLEANUP_ENABLED`
- `AI_NOVEL_LOG_RETENTION_DAYS`
- `AI_NOVEL_LLM_LOG_RETENTION_DAYS`
- `AI_NOVEL_LOG_MAX_FILE_MB`
- `AI_NOVEL_LOG_MIN_AGE_HOURS`

`scripts/run-with-log.cjs` also supports `--retention-days`, `--llm-retention-days`, `--max-file-mb`, and `--no-cleanup` for temporarily overriding development-session cleanup.

## Failure Modes

- Cleanup failure must only log a warning. It cannot block server start or desktop start.
- A missing directory is treated as nothing to clean.
- Unknown files must be kept, so diagnostic material a user placed in the log directory is not deleted by mistake.
- When troubleshooting needs a complete context kept, set `AI_NOVEL_LOG_CLEANUP_ENABLED=false` or use `--no-cleanup` in the development script.

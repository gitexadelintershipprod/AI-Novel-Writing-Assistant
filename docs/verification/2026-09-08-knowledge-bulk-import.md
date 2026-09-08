# Knowledge Bulk Import acceptance — 2026-09-08

Implementation branch: feature/knowledge-bulk-import. Feature commit: 9c4f6c75. Upstream main was not changed. No remote push or public release was performed.

## Passed

- pnpm typecheck: shared, server, client, and desktop TypeScript checks.
- pnpm lint.
- pnpm check:english-ui and pnpm check:georgian-content.
- Client test runner: 20 test-file results passed, including the new import tests and existing text decoding/preview contracts.
- New server integration suite: 17 tests passed using disposable SQLite files, a loopback HTTP server, and a controlled embedding provider.
- Existing knowledge/RAG regression selection: 6 test-file results passed.
- Full server fast suite: 1,258 reported checks passed using a newly initialized disposable SQLite database.
- Client production build and Docker API/web builds passed.
- PostgreSQL schema-only scratch verification passed: exact additive migration, ten stored files without automatic jobs, concurrent repeated enqueue creating only three jobs, and a confirmed pause blocking later claims. The generated test database was removed.

The import tests cover UTF-8 Georgian, nested paths, invalid files and size/hash validation, storage without model calls, content/title duplicates, idempotent concurrent uploads/queue requests, pause isolation, interrupted-job recovery, pagination, failed-only retry, stale/archive checks, real worker execution through a test provider, startup ordering, HTTP validation, and SQLite additive migration integrity.

## Deployment and preservation

Applied only 20260908000000_knowledge_bulk_import to the local PostgreSQL database in one transaction, recording the migration SHA-256 checksum:

28486749a1dad04c676d2abcea1bc8845013e13fce2383c57905f66c208090e5

Existing data counts and text-byte totals were asserted unchanged inside the transaction:

| Existing data | Before and after |
| --- | ---: |
| Knowledge documents | 44 |
| Document versions | 45 |
| Knowledge chunks | 169,265 |
| Novels | 0 |
| Stored document UTF-8 bytes | 26,350,961 |

The pre-existing incomplete historical migration record was deliberately left untouched; no historical migration replay, reset, or data-loss flag was used.

Only API and web containers were recreated. Database, Qdrant, volumes, and unrelated services were retained. Compose startup now only launches the application and does not alter the database schema.

Live read-only checks passed:

- API health and import history returned HTTP 200; invalid pause input returned a normal HTTP 400 ApiResponse.
- http://127.0.0.1:8045/knowledge/imports returned the application, and its actually served lazy-loaded bundle contained the new controls.
- Running compiled import service and worker SHA-256 matched the locally tested compiled files.
- Published ports remained web 127.0.0.1:8045 and API 127.0.0.1:3165, with no host 3000/8080 binding for this project.
- No live document upload, queue submission, or paid embedding call was performed during deployment checks.

## Verification boundaries

The initial broad test run failed because the default test database lacked tables; the sandbox also denied temporary HTTP listeners. Retrying with a fully initialized disposable database and loopback permission passed the full fast suite.

The entire legacy integration suite and desktop packaging were not part of this feature's acceptance run. Browser/manual visual acceptance is left to the user per repository policy. Real paid embedding smoke testing still requires separately approved material.

## Usage

Open Knowledge Base → Bulk Import → Choose files/folder → Import selected. Then select saved rows separately and use Add selected to queue. Saving alone is free of embedding calls.

See [the Georgian user guide](../public/georgian-user-guide.md) and [the workflow contract](../wiki/rag/knowledge-bulk-import.md).

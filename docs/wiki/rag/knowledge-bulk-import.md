# Knowledge Bulk Import: storage before indexing

## Context and decision

Large imports must not silently incur embedding costs. Bulk Import is a separate, deterministic storage path; it does not call the legacy title-merging createDocument path. Existing single-file behavior is unchanged.

## Current contract

- English UI at /knowledge/imports. TXT only, 1000 metadata items per batch, 10 MiB raw/decoded file limit, and the existing 20 MiB JSON request limit.
- Preview reads and hashes files sequentially, persists metadata only, and never retains all decoded contents. Upload sends one file at a time. No model call is permitted in prepare or upload.
- Normalization is the existing knowledge normalization: CRLF/CR to LF, remove NUL, trim. SHA-256 is recomputed by the server. Content is not translated.
- Batch/key identifies an idempotent upload. Reusing a key with different metadata fails. Matching content across all document versions, including archived documents, is skipped; matching titles with different content get a new document with a suffix.
- KnowledgeImportBatch and KnowledgeImportItem retain metadata, upload outcomes, references, and processing pause state. Text has one copy in KnowledgeDocumentVersion, not in import history.
- Preview metadata can remain pending even if a user removes a local row. This is not a saved document. Reload/reopen requires reselecting the same local files; File objects are never persisted.
- Processing checkboxes start empty. Explicit selected IDs are the only initial enqueue input; failed-only retries require an earlier failed/cancelled job. Selection across pages is labelled explicitly.
- Queue jobs use the existing RagIndexJob/RagWorker. A short transaction mutex row in AppSetting serializes bulk deduplication, pause, and queued-to-running claim. No network/model work runs inside that lock.
- Pause affects only unclaimed jobs in that batch. A claimed file can finish. Worker startup finishes interrupted-job recovery before claiming work; requeued jobs still obey the persisted pause.
- Imported jobs pin importVersionId. Missing, archived, or replaced active versions are rejected before enqueue and checked again during indexing. They cannot silently process a different version or project stale status onto a replacement version.
- Job progress uses the existing 0–1 fraction; UI displays percent separately from upload-transfer percent.
- The global mutex assumes the existing single API/worker deployment. Horizontal multi-worker startup recovery requires a lease/heartbeat protocol before scaling.

## Example and failure modes

Save ten files, select three stored IDs, and enqueue them: exactly three indexing jobs should exist. Repeating the request must not create more jobs.

A file marked Not indexed is stored, not searchable. Check explicit queue selection before investigating the embedding provider. For an archived duplicate, inspect the referenced document; do not automatically restore it. For a changed-version error, do not repoint an old job: use the document's explicit indexing controls for its current version.

The public site is plain HTTP. Browsers omit `crypto.randomUUID` and `crypto.subtle` outside a secure context, so choosing files must not call them. Local row ids use `crypto.getRandomValues`. Content hashes use SubtleCrypto when the page has it, and the same SHA-256 otherwise, so the preview hash still matches the server.

## Deployment

The additive migration is 20260908000000_knowledge_bulk_import in both PostgreSQL and SQLite migration directories. It creates two tables and adds two nullable RagIndexJob columns, without deleting data.

For databases managed by migration history, use the project's normal prisma:deploy command. For an existing db-push deployment with divergent historical migrations, inspect the history first, apply this exact migration in a transaction, and record its checksum in the migration history; do not blindly apply old pending migrations or use --accept-data-loss. Validate schema shape and document/version counts before and after.

The public web proxy must allow a 20 MiB JSON body. Its default 1 MiB limit returns HTTP 413 for an import upload whose encoded text exceeds 1 MiB, even when the TXT file is still inside the 10 MiB product limit. The API JSON limit stays 20mb.

compose.local.yml no longer mutates schemas at startup. A verified empty fresh database can be initialized with prisma:push without data-loss flags; an existing database needs a reviewed migration before starting the new API. Do not assume historical migrations are a complete fresh-install baseline. Deployment ports remain web 8045 and API 3165; no new queue service is required. Rollback application code if needed, retaining additive tables and import history rather than dropping user data.

## Modules and verification

- server/src/services/knowledge/imports/: API and deterministic storage/enqueue service.
- server/src/services/rag/importQueue.ts: atomic claim/pause boundary.
- client/src/pages/knowledge/imports/: sequential preflight/upload and checkbox queue UI.
- server/tests/knowledgeBulkImport.test.js: isolated SQLite integration tests.
- client/tests/knowledgeBulkImport.test.js: file/hash/selection/sequencing contracts.

Real paid embedding smoke tests require separately approved materials. UI acceptance is performed by the user.

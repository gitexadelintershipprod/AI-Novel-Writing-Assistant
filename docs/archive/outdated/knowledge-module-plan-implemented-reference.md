# Knowledge Base and Vectorization Management Module Redesign

> Archive note: This file keeps the first-version knowledge-base design background and is no longer a current development plan. Current long-term rules follow `docs/wiki/rag/knowledge-and-context-assembly.md` and the release notes.

## Summary
- Add a left-nav first-level item `Knowledge Base` as the only management entry for vectorized material, covering document upload, version management, index jobs, health status, and Embedding/RAG configuration.
- Upgrade “upload a novel and vectorize it” from a one-shot temporary input into an “independent knowledge-document asset”: after upload it is kept long-term, reusable, and bindable to a novel/world, so modules do not re-convert the same material.
- First version supports only `txt`. The frontend reads the text and submits JSON. There is no multipart or binary file parsing.
- Existing direct-upload entrypoints such as the worldbuilding wizard are kept, but add the ability to “choose a document from the knowledge base.” New material is globally searchable by default; if a novel/world has bound documents, bound documents take priority.

## Key Changes
### Frontend and Navigation
- Left navigation adds a `Knowledge Base` page; the route is `/knowledge`.
- The first version of the `Knowledge Base` page has 3 regions or tabs:
  - Document library: upload txt, list, search, enable/disable, view current active version, rebuild index, delete/archive.
  - Jobs and health: show index-job list, recent failed jobs, Embedding/Qdrant health, basic stats.
  - Vector settings: move Embedding/RAG configuration currently in `System Settings` here; the settings page removes that block and shows a jump hint instead.
- `ChatPage` adds a knowledge-document filter. By default it searches all enabled documents; the user can manually narrow to selected documents.
- `WorldGenerator` step one keeps the existing txt direct upload and also adds a knowledge-document selector. Selected documents are written into world bindings automatically when a world draft is created.
- `WorldWorkspace` adds a “reference knowledge” binding-management area for knowledge documents bound to the current world.
- `NovelEdit` basic-information area adds a “reference knowledge” binding-management area for knowledge documents bound to the current novel.

### Data Model and Backend Boundary
- Add independent knowledge-base models:
  - `KnowledgeDocument`: document metadata, title, original file name, status, current active version number, latest index status, timestamps.
  - `KnowledgeDocumentVersion`: owning document, version number, original plain text, text hash, character count, created time.
  - `KnowledgeBinding`: `targetType = novel | world`, `targetId`, `documentId`, used for persistent binding.
- Extend `RagOwnerType` with `knowledge_document`.
- RAG chunks continue to reuse `KnowledgeChunk`; `ownerType=knowledge_document`, `ownerId=documentId`. Always index only the document’s “current active version.” Historical versions keep original text only and do not keep online chunks.
- Uploading material with the same name uses “new version replaces active”:
  - Create a new `KnowledgeDocumentVersion`
  - Update the document’s current active version
  - Trigger a `knowledge_document` rebuild
  - Replace chunks of the old active version
- Keep existing `/api/rag/health` and `/api/rag/jobs` as underlying ops APIs; the new module consumes them directly. New knowledge-base business APIs live in the `/api/knowledge` namespace.

### API / Type Changes
- Add shared types:
  - `KnowledgeDocument`
  - `KnowledgeDocumentVersion`
  - `KnowledgeBinding`
  - `KnowledgeHealthStatus` or an equivalent page-aggregation response
- Add REST endpoints:
  - `GET /api/knowledge/documents`
  - `POST /api/knowledge/documents`, body `{ title?, fileName, content }`
  - `GET /api/knowledge/documents/:id`
  - `POST /api/knowledge/documents/:id/versions`, upload a new version
  - `POST /api/knowledge/documents/:id/activate-version`
  - `POST /api/knowledge/documents/:id/reindex`
  - `PATCH /api/knowledge/documents/:id`, enable/disable/archive
  - `GET /api/novels/:id/knowledge-documents` and `PUT /api/novels/:id/knowledge-documents`
  - `GET /api/worlds/:id/knowledge-documents` and `PUT /api/worlds/:id/knowledge-documents`
- Extend existing requests:
  - `/api/chat` adds `knowledgeDocumentIds?: string[]`
  - `/api/worlds/inspiration/analyze` adds `knowledgeDocumentIds?: string[]`
  - The world-draft creation flow receives and writes world bindings on the backend
- Retrieval rules are fixed as:
  - Globally, default to searching all enabled knowledge documents.
  - If the current context is a novel/world and bound documents exist, default to searching only bound documents.
  - If `knowledgeDocumentIds` is passed explicitly, search only those documents.
  - RAG content belonging to the business entity itself is still kept and participates in fused ranking together with knowledge-base results.

### Retrieval and Service Changes
- Add `knowledgeDocumentIds` filter capability in `HybridRetrievalService` / RAG filter.
- Add a `knowledge_document` branch in `RagIndexService.loadSourceDocuments` that reads the current active-version text for chunking and embedding.
- Add a unified helper for novel/world related generation chains that “resolves bound knowledge documents,” so each service does not assemble the rule itself.
- Chat, worldbuilding generation, and novel generation all use the same retrieval flow: “internal entity context + bound knowledge documents / explicit knowledge documents + global knowledge-base fallback.”

## Test Plan
- After uploading a txt document, generate `KnowledgeDocument + Version`, auto-enqueue, finish indexing successfully, and show status updates on the document page.
- After uploading a new version of the same document, only the latest active version stays in online retrieval; old versions remain viewable but do not participate in search.
- Manually switching the active version triggers rebuild, and retrieval results switch to the new active-version content.
- After a novel binds a document, novel generation / chapter generation no longer depends on re-uploading the original text and defaults to hitting the bound material.
- The worldbuilding wizard can generate concept cards on both the “direct-upload txt” and “choose knowledge-base document” paths. When a knowledge-base document is chosen, the created world automatically carries the binding.
- Chat can search all enabled documents by default; after selecting specific documents, answers use only the selected document content.
- The `Knowledge Base` page correctly shows health status, job list, and configuration changes. After Embedding settings are moved, the original settings still take effect.
- Regression for existing novel/world internal RAG: when no knowledge document is bound, original world/novel entity retrieval behavior does not regress.

## Assumptions
- The new navigation name is fixed as `Knowledge Base`; do not introduce a dual naming of “vector library / vector management.”
- First version supports only txt. The frontend locally decodes and submits plain-text JSON. pdf/docx/epub are not supported.
- Binding relationships in the first version support only `novel` and `world`. The chat page does only temporary filtering, not database-persistent binding.
- Historical versions keep original text and metadata only, not historical vectors. Online retrieval always targets the current active version.
- Existing Embedding/RAG configuration in `System Settings` moves into `Knowledge Base`. The settings page keeps only other system configuration.
- Default on-disk file name is `KNOWLEDGE_MODULE_PLAN.md` at the project root.

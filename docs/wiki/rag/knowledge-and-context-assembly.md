# Knowledge base and context assembly

## Background

Long-novel production needs long-term memory: world view, characters, book-analysis results, knowledge documents, writing assets, chapter history, and continuity state can all affect later planning and prose. If every module uploads, indexes, retrieves, or concatenates context on its own, vectorization is duplicated, retrieval scope diverges, and prompt input cannot be audited.

The knowledge base and Context Broker exist so materials become reusable assets, and so every AI call knows which context it used, which context it dropped, and why.

## Decision

Knowledge documents are long-lived material assets, not one-shot upload input. RAG retrieval, bound materials, and context assembly go through unified services and Context Resolvers. Prompt templates do not query the database directly.

Default retrieval follows “explicit selection first, bound materials second, globally enabled documents as fallback”, while keeping each business entity’s own internal context. If a business call explicitly limits `ownerTypes`, retrieval must respect that scope. When `knowledge_document` is not included, knowledge documents must not be mixed in automatically.

## Current Rule

- Knowledge base is the independent management entry for vectorized materials. It owns documents, versions, index jobs, health, and Embedding/RAG configuration.
- Text-file decoding must trust BOM first. With no BOM, if the byte sequence is valid UTF-8, it must be read as UTF-8. Only after UTF-8 validation fails may older encodings such as GB18030, GBK, Big5, or UTF-16 be scored. Pseudo-CJK character counts produced by UTF-16 must not override a valid UTF-8 judgment.
- The local Docker stack must start a persistent Qdrant service. The API container reaches it through the Compose service name `http://qdrant:6333`. `127.0.0.1` inside the container points only at the API container itself and cannot be used as a cross-container Qdrant address.
- Uploaded materials should become a `KnowledgeDocument` and a version concept. Online retrieval uses only the currently active version.
- An archived knowledge document is a recoverable state. It does not delete `KnowledgeDocumentVersion` source text. Archive removes it from default retrieval, material selection, and the book-analysis entry, and queues cleanup of existing chunks when RAG is enabled.
- Document upload, version switch, archive restore, and manual rebuild may be marked `queued` and create an index job only when RAG is enabled. When RAG is off, keep `idle`. Do not create a permanent queued state with no consumer. After RAG is enabled, the user may start a rebuild.
- When a novel or world view has bound knowledge documents, related generation chains prefer those bound documents.
- When the user explicitly passes `knowledgeDocumentIds`, retrieve only those documents.
- With no explicit selection and no binding, all enabled knowledge documents may be searched.
- When a business call explicitly passes `ownerTypes`, `ownerTypes` is a hard scope. Knowledge documents join retrieval only when `ownerTypes` is omitted, explicitly includes `knowledge_document`, or `knowledgeDocumentIds` is passed explicitly.
- Novel/world RAG content is still kept and fused-ranked with knowledge-base retrieval results.
- Book-analysis published documents may carry structured `preChunks`. Those chunks must turn genre, selling points, target readers, strengths, weaknesses, character function, and chapter anchors in `structuredData` into unified facets. Field names may only be `genreTags / sellingPointTags / targetReaders / strengths / weaknesses / characterRole / chapterAnchor`.
- `KnowledgeChunk.metadataJson` records the original facet and anchor structure; `KnowledgeChunk.facetKeys` records filterable `|key=value|` text; `KnowledgeChunk.chapterAnchor` records the chapter-order string. Qdrant payload and local chunk metadata must use the same facet field names, so vector filters and keyword filters do not diverge.
- When downstream needs exact recall by a book-analysis dimension, prefer `HybridRetrievalService.retrieveByFacet({ query, facets, ...scope })` instead of handwriting `facetKeys` filters in each business service. When facet hits are empty, retrieval keeps a no-facet fallback so historical chunks without facets are not completely unrecallable.
- `HybridRetrievalService.retrieve({ facets })` should pass facet filters to both vector retrieval and keyword retrieval. Old chunks without facets may yield empty facet retrieval; then it must fall back to recall without facet filters so old materials are not fully blocked.
- RAG recall should write `RagRetrievalTrace` at a sample rate for later recall-quality diagnosis. A trace only stores query digest, a config-truncated query preview, retrieval scope, candidate count, a final-hits summary, per-stage timings, and fallback / reranker marks. Hits may only store chunkId, rank, score, and owner, not chunk body.
- Query persistence on recall traces is controlled by `RAG_RETRIEVAL_TRACE_QUERY_PERSIST_MODE`. Production may switch to `digest_only` to lower source-text leak risk. Sample rate is `RAG_RETRIEVAL_TRACE_SAMPLE_RATE`. Retention is `RAG_RETRIEVAL_TRACE_RETENTION_DAYS`. Expired data is cleaned by `RagRetrievalTraceRetention`.
- RAG retrieval order is: vector recall and keyword recall in parallel, RRF fusion, optional reranker, optional narrative-distance decay, then clip to finalTopK. Reranker can only be an enhancement stage. It cannot become a hard dependency of base recall. External endpoint timeout or failure must fail-open and keep using the fused result.
- Reranker is off by default. Enablement is controlled by `RAG_RERANKER_ENABLED`, `RAG_RERANKER_ENDPOINT`, `RAG_RERANKER_MODEL`, `RAG_RERANKER_TIMEOUT_MS`, and candidate-count configuration. Default candidate count is `min(max(finalTopK * 5, 30), 80)`, so not every candidate is sent to a cross-encoder.
- Reranker traces must record `rerankerUsed`, `rerankerMs`, input candidate count, output candidate count, and a failure summary. `rerankerUsed=false` only means this call did not use it or fail-opened. It cannot be read directly as a base-retrieval failure.
- Contextualized retrieval is off by default. When on, indexing generates a `contextPrefix` for each chunk and builds `searchText = contextPrefix + chunkText` for embedding. Original `chunkText` remains the returned body and user-readable evidence.
- `contextPrefix` must be generated by a structured prompt in the Prompt Registry. The RAG service must not inline a business prompt. The prefix only supplies retrieval-location information such as novel, world, chapter, character, knowledge-document title, and fact type. It must not add new plot facts that are not in the input material.
- Version-one contextual information does not change the database table shape: `contextPrefix / contextVersion / contextSourceHash / searchText` go into the Qdrant payload and are also placed in `KnowledgeChunk.metadataJson`. Keyword retrieval may look up query terms in `chunkText` and `metadataJson`. After contextualization is enabled, a rebuild is required before it takes effect.
- RAG quality changes must have a fixed evaluation set for before/after comparison. Evaluation should cover at least character facts, world rules, chapter continuity, style settings, and knowledge documents, and output Hit@K, MRR, Context Precision, Context Recall, and average reranker latency.
- Prompt templates only declare which context they need. Context Broker / Resolver owns read, budget, filter, summarize, and assemble.
- RAG and context-assembly failures must be explainable in preview or trace. Required context must not be dropped silently.

## Product expression of the knowledge-base entry

To authors, the knowledge base should read as a reusable bookshelf of creation materials, not an index console they must keep operating. The first screen should help them recognize what the material is, whether it is currently usable, and how to keep using it in creation. When health is normal, use a light summary. Do not repeat operational advice.

Index progress, failure reasons, and exceptions that need user handling must be visible nearby. Maintenance such as recall test, rebuild index, start/stop, and archive should stay complete, but expand on demand in the normal state. Embedding, RAG configuration, and job diagnosis stay on separate tabs and must not overpower material browsing and the creation entry.

## Examples

Recommended:

- The world-view wizard allows a direct txt upload and also allows choosing an existing knowledge document; after create, write the choice into the world binding.
- Novel generation reads bound knowledge documents, internal world view, and chapter history, then assembles context blocks to budget.
- Prompt Preview shows selected blocks, dropped blocks, missing required groups, and resolver errors.

Forbidden:

- Each generation service assembling its own “search documents if present, otherwise search global” rule.
- Querying the database directly inside a PromptAsset `render()`.
- After uploading the same material, letting several modules each save an untraceable copy of the text.

## Failure Modes

- Retrieval does not match the current novel: check whether explicit document filters or novel/world bindings overrode the global default.
- `.txt` preview shows a large amount of meaningless CJK and the character count is close to half of the source file: compare source-file and active-version character counts, and check whether the client misread valid UTF-8 as UTF-16.
- Index jobs report `fetch failed` while Embedding is healthy: separately check Qdrant health, whether the container is running, and whether the `qdrantUrl` the API sees uses a reachable service name rather than in-container loopback.
- World-view layered generation mixes in unrelated novel documents: check whether the caller only needed `world` / `world_library_item`, and whether the RAG service wrongly ignored an explicit `ownerTypes` scope.
- Prompt input is too large: check Context Broker budget, summaries, and dropped-block records.
- Knowledge-base health is normal but generation did not cite materials: check whether the resolver is wired into the current workflow, and whether the prompt declared a context requirement.
- Old-version content is still retrieved: check whether the active version and chunk rebuild are aligned.
- An archived document cannot be recalled after restore: check whether restore set index status to `queued`, and whether the matching rebuild job completed.
- Facet retrieval is completely empty: first check whether published `preChunks` entered the RAG job payload, then check whether `KnowledgeChunk.facetKeys` and the Qdrant payload both wrote the same facet fields. If historical chunks have no facets, confirm retrieval triggered the no-facet fallback.
- Structured conclusions recall poorly after book-analysis publish: check whether `bookAnalysis.publish.facets` mapped structured fields onto the correct facets. Do not invent new facet names at the consumer.
- Recall quality is hard to reconstruct: check whether `RAG_RETRIEVAL_TRACE_SAMPLE_RATE` is 0, whether `RagRetrievalTrace` has recent records, whether `timingsJson` includes the six items vector / keyword / fusion / reranker / decay / total, and whether `fallbackTriggered` is true when facet hits are empty.
- Trace `rerankerMs` is always 0 and `rerankerUsed` is always false: check whether reranker is enabled, whether the endpoint is empty, and whether candidates are empty. If `scopeJson.rerankerError` has a value, this call already used the fused result by fail-open.
- Recall does not change after contextualization is turned on: check whether the index was rebuilt, whether the Qdrant payload contains `contextPrefix/searchText`, whether `KnowledgeChunk.metadataJson` contains the same fields, and whether `contextVersion` matches the current configuration.
- Context prefixes introduce wrong facts: check the prompt output and input metadata of `rag.contextual_chunk.prefix@v1`. Prefixes may only summarize location, not add setting. Raise coverage of the matching queries in the evaluation set if needed.
- Reranker gains are unstable: first compare Hit@K / MRR on a fixed evaluation set with reranker on and off, then check whether candidate count is too small or the correct chunk is already missing from candidates. Do not use reranker to hide a wrong base-recall scope.
- Historical trace data grows without bound: check whether `ragRetrievalTraceRetention.start()` runs at service start, and whether `RAG_RETRIEVAL_TRACE_RETENTION_DAYS` is a reasonable value.

## Related Modules

- `server/src/services/rag/`
- `server/src/services/knowledge/`
- `server/src/services/bookAnalysis/bookAnalysis.publish.facets.ts`
- `server/src/services/novel/runtime/GenerationContextAssembler.ts`
- `server/src/prompting/`
- `client/src/pages/knowledge/`
- `client/src/pages/worlds/`
- `client/src/pages/novels/`

## Source Documents

- [Knowledge-base and vectorization module historical plan](../../archive/outdated/knowledge-module-plan-implemented-reference.md)
- [Prompt workbench, context assembly, and unified step-runtime plan](../../plans/prompt-workbench-context-and-step-runtime-plan.md)
- [README current capabilities](../../../README.md)

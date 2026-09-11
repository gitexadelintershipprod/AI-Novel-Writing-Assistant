-- Derived text-only search data. No source, version, chunk or vector is changed.
-- This expression exactly matches the retrieval query and updates automatically.
CREATE INDEX "KnowledgeChunk_knowledge_text_fts_idx"
ON "KnowledgeChunk" USING GIN (to_tsvector('simple', "chunkText"))
WHERE "ownerType" = 'knowledge_document';

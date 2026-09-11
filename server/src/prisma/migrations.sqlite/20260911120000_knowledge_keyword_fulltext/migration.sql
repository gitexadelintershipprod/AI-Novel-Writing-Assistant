-- Derived text-only index. Content remains in KnowledgeChunk, not copied here.
CREATE VIRTUAL TABLE "KnowledgeChunkFts" USING fts5(
  "chunkText", content='KnowledgeChunk', content_rowid='rowid',
  tokenize='unicode61 remove_diacritics 0'
);

INSERT INTO "KnowledgeChunkFts"(rowid, "chunkText")
SELECT rowid, "chunkText" FROM "KnowledgeChunk" WHERE "ownerType" = 'knowledge_document';

CREATE TRIGGER "KnowledgeChunk_fts_insert" AFTER INSERT ON "KnowledgeChunk"
WHEN new."ownerType" = 'knowledge_document' BEGIN
  INSERT INTO "KnowledgeChunkFts"(rowid, "chunkText") VALUES (new.rowid, new."chunkText");
END;

CREATE TRIGGER "KnowledgeChunk_fts_delete" AFTER DELETE ON "KnowledgeChunk"
WHEN old."ownerType" = 'knowledge_document' BEGIN
  INSERT INTO "KnowledgeChunkFts"("KnowledgeChunkFts", rowid, "chunkText")
  VALUES ('delete', old.rowid, old."chunkText");
END;

CREATE TRIGGER "KnowledgeChunk_fts_update_old" AFTER UPDATE ON "KnowledgeChunk"
WHEN old."ownerType" = 'knowledge_document' BEGIN
  INSERT INTO "KnowledgeChunkFts"("KnowledgeChunkFts", rowid, "chunkText")
  VALUES ('delete', old.rowid, old."chunkText");
END;

CREATE TRIGGER "KnowledgeChunk_fts_update_new" AFTER UPDATE ON "KnowledgeChunk"
WHEN new."ownerType" = 'knowledge_document' BEGIN
  INSERT INTO "KnowledgeChunkFts"(rowid, "chunkText") VALUES (new.rowid, new."chunkText");
END;

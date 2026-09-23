ALTER TABLE "KnowledgeDocument" ADD COLUMN "latestGraphStatus" TEXT NOT NULL DEFAULT 'idle';
ALTER TABLE "KnowledgeDocument" ADD COLUMN "lastGraphSyncedAt" DATETIME;

UPDATE "KnowledgeDocument"
SET
  "latestGraphStatus" = (
    SELECT CASE status
      WHEN 'queued' THEN 'queued'
      WHEN 'running' THEN 'running'
      WHEN 'succeeded' THEN 'succeeded'
      WHEN 'failed' THEN 'failed'
      ELSE 'idle'
    END
    FROM "RagIndexJob"
    WHERE "ownerType" = 'knowledge_document'
      AND "jobType" = 'graph_sync'
      AND "ownerId" = "KnowledgeDocument"."id"
    ORDER BY "updatedAt" DESC, "id" DESC
    LIMIT 1
  ),
  "lastGraphSyncedAt" = (
    SELECT CASE WHEN status = 'succeeded' THEN "updatedAt" ELSE NULL END
    FROM "RagIndexJob"
    WHERE "ownerType" = 'knowledge_document'
      AND "jobType" = 'graph_sync'
      AND "ownerId" = "KnowledgeDocument"."id"
    ORDER BY "updatedAt" DESC, "id" DESC
    LIMIT 1
  )
WHERE EXISTS (
  SELECT 1 FROM "RagIndexJob"
  WHERE "ownerType" = 'knowledge_document'
    AND "jobType" = 'graph_sync'
    AND "ownerId" = "KnowledgeDocument"."id"
);

ALTER TABLE "KnowledgeDocument" ADD COLUMN "latestGraphStatus" "KnowledgeIndexStatus" NOT NULL DEFAULT 'idle';
ALTER TABLE "KnowledgeDocument" ADD COLUMN "lastGraphSyncedAt" TIMESTAMP(3);

UPDATE "KnowledgeDocument" AS d
SET
  "latestGraphStatus" = CASE latest.status
    WHEN 'queued' THEN 'queued'::"KnowledgeIndexStatus"
    WHEN 'running' THEN 'running'::"KnowledgeIndexStatus"
    WHEN 'succeeded' THEN 'succeeded'::"KnowledgeIndexStatus"
    WHEN 'failed' THEN 'failed'::"KnowledgeIndexStatus"
    ELSE 'idle'::"KnowledgeIndexStatus"
  END,
  "lastGraphSyncedAt" = CASE WHEN latest.status = 'succeeded' THEN latest."updatedAt" ELSE NULL END
FROM (
  SELECT DISTINCT ON ("ownerId") "ownerId", status::text AS status, "updatedAt"
  FROM "RagIndexJob"
  WHERE "ownerType" = 'knowledge_document' AND "jobType" = 'graph_sync'
  ORDER BY "ownerId", "updatedAt" DESC, "id" DESC
) AS latest
WHERE d.id = latest."ownerId";

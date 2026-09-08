CREATE TABLE "KnowledgeImportBatch" (
 "id" TEXT NOT NULL PRIMARY KEY,
 "name" TEXT NOT NULL,
 "processingPaused" BOOLEAN NOT NULL DEFAULT false,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "updatedAt" TIMESTAMP(3) NOT NULL
);
CREATE TABLE "KnowledgeImportItem" (
 "id" TEXT NOT NULL PRIMARY KEY,
 "batchId" TEXT NOT NULL REFERENCES "KnowledgeImportBatch"("id") ON DELETE CASCADE ON UPDATE CASCADE,
 "key" TEXT NOT NULL,
 "fileName" TEXT NOT NULL,
 "relativePath" TEXT NOT NULL,
 "byteSize" INTEGER NOT NULL,
 "contentHash" TEXT NOT NULL,
 "uploadStatus" TEXT NOT NULL DEFAULT 'pending',
 "error" TEXT,
 "documentId" TEXT,
 "documentVersionId" TEXT,
 "jobId" TEXT,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "updatedAt" TIMESTAMP(3) NOT NULL
);
CREATE UNIQUE INDEX "KnowledgeImportItem_batchId_key_key" ON "KnowledgeImportItem"("batchId","key");
CREATE INDEX "KnowledgeImportItem_batchId_createdAt_idx" ON "KnowledgeImportItem"("batchId","createdAt");
CREATE INDEX "KnowledgeImportItem_contentHash_idx" ON "KnowledgeImportItem"("contentHash");
ALTER TABLE "RagIndexJob" ADD COLUMN "importBatchId" TEXT REFERENCES "KnowledgeImportBatch"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "RagIndexJob" ADD COLUMN "importVersionId" TEXT;

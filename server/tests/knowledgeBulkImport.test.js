const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { execFileSync } = require("node:child_process");
const { PrismaBetterSqlite3 } = require("@prisma/adapter-better-sqlite3");
const { PrismaClient } = require("@prisma/client");

// Never resolve the application's default/live database, even while importing modules.
const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "knowledge-bulk-import-test-"));
const templatePath = path.join(tempDir, "empty.db");
process.env.DATABASE_URL = `file:${path.join(tempDir, "module-singleton.db")}`;
process.env.NODE_ENV = "test";
process.env.RAG_ENABLED = "true";
let KnowledgeImportService;
let claimRagJob;
let normalizeKnowledgeContent;
let buildKnowledgeContentHash;
let fixtureCount = 0;
const originalFetch = global.fetch;

test.before(() => {
  // Prisma's SQLite schema engine requires the target file to exist on this runtime.
  new (require("better-sqlite3"))(templatePath).close();
  execFileSync(process.platform === "win32" ? "pnpm.cmd" : "pnpm", ["prisma:push"], {
    cwd: path.resolve(__dirname, ".."),
    env: { ...process.env, DATABASE_URL: `file:${templatePath}` },
    stdio: "inherit",
  });
  ({ KnowledgeImportService } = require("../dist/services/knowledge/imports/KnowledgeImportService.js"));
  ({ claimRagJob } = require("../dist/services/rag/importQueue.js"));
  ({ normalizeKnowledgeContent, buildKnowledgeContentHash } = require("../dist/services/knowledge/common.js"));
  global.fetch = async () => { throw new Error("Bulk import integration tests must not access external services."); };
});

test.after(async () => {
  global.fetch = originalFetch;
  await require("../dist/db/prisma.js").prisma.$disconnect();
  // These files are newly created disposable fixtures, never user data.
  fs.rmSync(tempDir, { recursive: true });
});

function connect(databasePath) {
  return new PrismaClient({ adapter: new PrismaBetterSqlite3({ url: `file:${databasePath}` }) });
}

async function fixture(t) {
  const databasePath = path.join(tempDir, `case-${++fixtureCount}.db`);
  fs.copyFileSync(templatePath, databasePath);
  const db = connect(databasePath);
  t.after(() => db.$disconnect());
  const service = new KnowledgeImportService(db);
  const batch = await service.createBatch("Test import");
  return { db, service, batch, databasePath };
}

function metadata(content, overrides = {}) {
  return {
    key: `file-${fixtureCount}-${Math.random()}`,
    fileName: "sample.txt",
    relativePath: "books/subfolder/sample.txt",
    byteSize: Buffer.byteLength(content, "utf8"),
    contentHash: buildKnowledgeContentHash(content),
    ...overrides,
  };
}

async function store(service, batch, content, overrides) {
  const [prepared] = await service.prepare(batch.id, [metadata(content, overrides)]);
  if (prepared.uploadStatus === "duplicate") return prepared;
  return service.upload(batch.id, prepared.id, content);
}

async function expectUploadFailure(service, batchId, itemId, content) {
  await assert.rejects(service.upload(batchId, itemId, content));
  const detail = await service.detail(batchId, 1, 100);
  const item = detail.items.find((row) => row.id === itemId);
  assert.equal(item.uploadStatus, "failed");
  assert.ok(item.error);
}

test("TXT storage preserves Georgian text and nested paths without starting indexing", async (t) => {
  const { db, service, batch } = await fixture(t);
  const content = "\uFEFFპირველი თავი\r\n\r\nმთის ფერდობზე სახლი იდგა.\r\n";
  const item = await store(service, batch, content);
  assert.equal(item.uploadStatus, "stored");
  assert.equal(item.relativePath, "books/subfolder/sample.txt");
  const document = await db.knowledgeDocument.findUnique({ where: { id: item.documentId }, include: { activeVersion: true } });
  assert.equal(document.latestIndexStatus, "idle");
  assert.equal(document.activeVersion.content, normalizeKnowledgeContent(content));
  assert.equal(document.activeVersion.contentHash, buildKnowledgeContentHash(content));
  assert.equal(await db.knowledgeDocumentVersion.count(), 1);
  assert.equal(await db.ragIndexJob.count(), 0);
  const detail = await service.detail(batch.id, 1, 50);
  assert.deepEqual(detail.eligibleIds, [item.id]);
});

test("ten stored files create jobs only for three selected files and repeated queue calls are safe", async (t) => {
  const { db, service, batch } = await fixture(t);
  const items = [];
  for (let i = 0; i < 10; i += 1) items.push(await store(service, batch, `Document ${i}: unique text.`, { fileName: `book-${i}.txt` }));
  assert.equal(await db.ragIndexJob.count(), 0);
  const selected = [items[1], items[4], items[8]];
  await service.enqueue(batch.id, selected.map((item) => item.id));
  await service.enqueue(batch.id, [...selected.map((item) => item.id), selected[0].id]);
  const jobs = await db.ragIndexJob.findMany();
  assert.equal(jobs.length, 3);
  assert.deepEqual(jobs.map((job) => job.ownerId).sort(), selected.map((item) => item.documentId).sort());
  for (const job of jobs) {
    assert.equal(job.importBatchId, batch.id);
    assert.equal(job.importVersionId, selected.find((item) => item.documentId === job.ownerId).documentVersionId);
  }
  assert.equal((await service.detail(batch.id, 1, 50)).eligibleIds.length, 7);
});

test("upload idempotency survives a lost response and service re-creation", async (t) => {
  const { db, service, batch } = await fixture(t);
  const content = "One upload must create exactly one document.";
  const file = metadata(content, { key: "stable-request-key" });
  const [prepared] = await service.prepare(batch.id, [file]);
  const first = await service.upload(batch.id, prepared.id, content);
  const resumed = new KnowledgeImportService(db);
  const [same] = await resumed.prepare(batch.id, [file]);
  const retried = await resumed.upload(batch.id, same.id, content);
  assert.equal(same.id, prepared.id);
  assert.equal(retried.documentId, first.documentId);
  assert.equal(await db.knowledgeImportItem.count(), 1);
  assert.equal(await db.knowledgeDocument.count(), 1);
  assert.equal(await db.knowledgeDocumentVersion.count(), 1);
});

test("normalized duplicates in a batch or an archived document are skipped without restoring data", async (t) => {
  const { db, service, batch } = await fixture(t);
  const original = await store(service, batch, "Repeated\r\ntext.");
  const duplicate = await store(service, batch, "Repeated\ntext.", { fileName: "different-name.txt" });
  assert.equal(duplicate.uploadStatus, "duplicate");
  await db.knowledgeDocument.update({ where: { id: original.documentId }, data: { status: "archived" } });
  const secondBatch = await service.createBatch("Archived duplicate");
  const archivedDuplicate = await store(service, secondBatch, "Repeated\ntext.");
  assert.equal(archivedDuplicate.uploadStatus, "duplicate");
  assert.match(archivedDuplicate.error ?? "", /archiv/i);
  assert.equal((await db.knowledgeDocument.findUnique({ where: { id: original.documentId } })).status, "archived");
  assert.equal(await db.knowledgeDocument.count(), 1);
  assert.equal(await db.ragIndexJob.count(), 0);
});

test("same title with different contents creates independent uniquely titled documents", async (t) => {
  const { db, service, batch } = await fixture(t);
  const a = await store(service, batch, "First separate novel.");
  const b = await store(service, batch, "Second separate novel.");
  assert.notEqual(a.documentId, b.documentId);
  const documents = await db.knowledgeDocument.findMany({ include: { versions: true } });
  assert.equal(new Set(documents.map((document) => document.title)).size, 2);
  assert.ok(documents.every((document) => document.versions.length === 1));
  assert.equal(documents.flatMap((document) => document.versions).find((version) => version.documentId === a.documentId).content, "First separate novel.");
});

test("overlapping uploads and enqueue requests are serialized without duplicate data or jobs", async (t) => {
  const { db, service, batch } = await fixture(t);
  const content = "The same bytes arrive in overlapping requests.";
  const items = await service.prepare(batch.id, [metadata(content), metadata(content)]);
  const uploaded = await Promise.all(items.map((item) => service.upload(batch.id, item.id, content)));
  assert.deepEqual(uploaded.map((item) => item.uploadStatus).sort(), ["duplicate", "stored"]);
  const stored = uploaded.find((item) => item.uploadStatus === "stored");
  await Promise.all([
    service.enqueue(batch.id, [stored.id]),
    service.enqueue(batch.id, [stored.id]),
  ]);
  assert.equal(await db.knowledgeDocument.count(), 1);
  assert.equal(await db.knowledgeDocumentVersion.count(), 1);
  assert.equal(await db.ragIndexJob.count(), 1);
});

test("a confirmed pause prevents all later claims even when a claim overlaps the pause", async (t) => {
  const { db, service, batch } = await fixture(t);
  const a = await store(service, batch, "Pause race A.");
  const b = await store(service, batch, "Pause race B.");
  await service.enqueue(batch.id, [a.id, b.id]);
  await Promise.all([claimRagJob(db), service.setPaused(batch.id, true)]);
  assert.equal(await claimRagJob(db), null);
  assert.equal((await service.detail(batch.id)).batch.processingPaused, true);
  const jobs = await db.ragIndexJob.findMany();
  assert.ok(jobs.filter((job) => job.status === "running").length <= 1);
  assert.ok(jobs.some((job) => job.status === "queued"));
});

test("server rejects invalid metadata, empty content, forged hashes, and oversized payloads", async (t) => {
  const { db, service, batch } = await fixture(t);
  for (const invalid of [
    metadata("valid", { fileName: "bad.pdf" }),
    metadata("valid", { byteSize: 10 * 1024 * 1024 + 1 }),
    metadata("valid", { byteSize: -1 }),
    metadata("valid", { contentHash: "not-a-hash" }),
  ]) await assert.rejects(service.prepare(batch.id, [invalid]));
  await assert.rejects(service.prepare(batch.id, Array.from({ length: 1001 }, (_, index) => metadata("valid", { key: `limit-${index}` }))));
  const [empty] = await service.prepare(batch.id, [metadata("nonempty preview")]);
  await expectUploadFailure(service, batch.id, empty.id, "   \n");
  const [forged] = await service.prepare(batch.id, [metadata("expected content")]);
  await expectUploadFailure(service, batch.id, forged.id, "unexpected content");
  const [large] = await service.prepare(batch.id, [metadata("small declared file")]);
  await expectUploadFailure(service, batch.id, large.id, "a".repeat(10 * 1024 * 1024 + 1));
  assert.equal(await db.knowledgeDocument.count(), 0);
  assert.equal(await db.ragIndexJob.count(), 0);
});

test("pause lets a claimed file finish, blocks later files, and does not block other owners or batches", async (t) => {
  const { db, service, batch } = await fixture(t);
  const first = await store(service, batch, "First file to claim.");
  const second = await store(service, batch, "Second file waits.");
  await service.enqueue(batch.id, [first.id, second.id]);
  const claimed = await claimRagJob(db);
  assert.equal(claimed.importBatchId, batch.id);
  assert.equal((await db.ragIndexJob.findUnique({ where: { id: claimed.id } })).status, "running");
  await service.setPaused(batch.id, true);
  assert.equal((await db.ragIndexJob.findUnique({ where: { id: claimed.id } })).status, "running");
  assert.equal(await claimRagJob(db), null);
  await db.ragIndexJob.update({ where: { id: claimed.id }, data: { status: "succeeded" } });
  const anotherBatch = await service.createBatch("Other batch");
  const other = await store(service, anotherBatch, "Unpaused batch.");
  await service.enqueue(anotherBatch.id, [other.id]);
  assert.equal((await claimRagJob(db)).importBatchId, anotherBatch.id);
  const ordinary = await db.ragIndexJob.create({ data: { ownerType: "knowledge_document", ownerId: "ordinary-owner", jobType: "delete" } });
  assert.equal((await claimRagJob(db)).id, ordinary.id);
  assert.equal(await claimRagJob(db), null);
  await service.setPaused(batch.id, false);
  assert.equal((await claimRagJob(db)).importBatchId, batch.id);
});

test("pause and pending upload history survive reconnect and a requeued interrupted job obeys pause", async (t) => {
  const { db, service, batch, databasePath } = await fixture(t);
  const item = await store(service, batch, "Resume this stored file.");
  await service.prepare(batch.id, [metadata("Not uploaded yet.", { key: "pending-after-refresh" })]);
  await service.enqueue(batch.id, [item.id]);
  const job = await claimRagJob(db);
  await service.setPaused(batch.id, true);
  // Exercise the actual restart recovery routine with an isolated DB-backed adapter.
  // Do not start the worker's timer or any external embedding provider.
  const { RagWorker } = require("../dist/services/rag/RagWorker.js");
  const worker = new RagWorker({
    listJobs: (limit, status) => db.ragIndexJob.findMany({ where: { status }, take: limit }),
    updateJobStatus: (id, data) => db.ragIndexJob.update({ where: { id }, data }),
  });
  await worker.requeueInterruptedJobs();
  assert.equal((await db.ragIndexJob.findUnique({ where: { id: job.id } })).status, "queued");
  await db.$disconnect();
  const reconnected = connect(databasePath);
  t.after(() => reconnected.$disconnect());
  const resumed = new KnowledgeImportService(reconnected);
  const detail = await resumed.detail(batch.id, 1, 50);
  assert.equal(detail.batch.processingPaused, true);
  assert.equal(detail.counts.stored, 1);
  assert.equal(detail.counts.pending, 1);
  assert.equal(await claimRagJob(reconnected), null);
  await resumed.setPaused(batch.id, false);
  assert.equal((await claimRagJob(reconnected)).id, job.id);
});

test("retry failed queues only failed indexing and never reuploads completed documents", async (t) => {
  const { db, service, batch } = await fixture(t);
  const items = [];
  for (const word of ["failed", "completed", "waiting"]) items.push(await store(service, batch, `Retry example: ${word}.`));
  await service.enqueue(batch.id, items.map((item) => item.id));
  const jobs = await db.ragIndexJob.findMany();
  await db.ragIndexJob.update({ where: { id: jobs.find((job) => job.ownerId === items[0].documentId).id }, data: { status: "failed", lastError: "Temporary provider failure." } });
  await db.ragIndexJob.update({ where: { id: jobs.find((job) => job.ownerId === items[1].documentId).id }, data: { status: "succeeded" } });
  await service.enqueue(batch.id, items.map((item) => item.id), true);
  const active = await db.ragIndexJob.findMany({ where: { status: { in: ["queued", "running"] } } });
  assert.deepEqual(active.map((job) => job.ownerId).sort(), [items[0].documentId, items[2].documentId].sort());
  assert.equal(await db.knowledgeDocument.count(), 3);
  assert.equal(await db.knowledgeDocumentVersion.count(), 3);
});

test("wrong-batch IDs, archived documents, and replaced active versions cannot be queued", async (t) => {
  const { db, service, batch } = await fixture(t);
  const archived = await store(service, batch, "Archive before queue.");
  const changed = await store(service, batch, "Old active version.");
  const foreignBatch = await service.createBatch("Different import");
  const foreign = await store(service, foreignBatch, "Foreign batch document.");
  await db.knowledgeDocument.update({ where: { id: archived.documentId }, data: { status: "archived" } });
  const newVersion = await db.knowledgeDocumentVersion.create({ data: { documentId: changed.documentId, versionNumber: 2, content: "New active version.", contentHash: buildKnowledgeContentHash("New active version."), charCount: 19 } });
  await db.knowledgeDocument.update({ where: { id: changed.documentId }, data: { activeVersionId: newVersion.id, activeVersionNumber: 2 } });
  try { await service.enqueue(batch.id, [archived.id, changed.id, foreign.id, "missing-item"]); } catch (error) { assert.ok(error.message); }
  assert.equal(await db.ragIndexJob.count(), 0);
  await assert.rejects(service.upload(batch.id, foreign.id, "Foreign batch document."));
});

test("import histories are paginated and all eligible selection includes unrendered pages", async (t) => {
  const { service, batch } = await fixture(t);
  for (let i = 0; i < 4; i += 1) await store(service, batch, `Pagination file ${i}.`);
  const first = await service.detail(batch.id, 1, 2);
  const second = await service.detail(batch.id, 2, 2);
  assert.equal(first.total, 4);
  assert.equal(first.items.length, 2);
  assert.equal(second.items.length, 2);
  assert.equal(new Set([...first.items, ...second.items].map((item) => item.id)).size, 4);
  assert.equal(first.eligibleIds.length, 4);
  assert.equal((await service.listBatches(1, 2)).total, 1);
});

test("the real worker indexes only queued data through a controlled embedding provider", async (t) => {
  const { db, service, batch } = await fixture(t);
  const prismaModule = require("../dist/db/prisma.js");
  const settings = require("../dist/services/settings/RagSettingsService.js");
  const originalDb = prismaModule.prisma;
  const originalSettings = settings.getRagEmbeddingSettings;
  prismaModule.prisma = db;
  settings.getRagEmbeddingSettings = async () => ({ embeddingProvider: "openai", embeddingModel: "text-embedding-3-small" });
  t.after(() => { prismaModule.prisma = originalDb; settings.getRagEmbeddingSettings = originalSettings; });
  const { RagIndexService } = require("../dist/services/rag/RagIndexService.js");
  const { RagWorker } = require("../dist/services/rag/RagWorker.js");
  const embedded = [];
  const points = [];
  const indexer = new RagIndexService({
    embedTexts: async (texts) => {
      embedded.push(...texts);
      return { vectors: texts.map(() => [1, 0, 0]), provider: "openai", model: "text-embedding-3-small" };
    },
  }, {
    ensureCollection: async () => {},
    upsertPoints: async (rows) => { points.push(...rows); },
    deletePoints: async () => {},
  }, { applyToCandidates: async () => {} });
  const first = await store(service, batch, "ქართული საცდელი ტექსტი. მთებში პატარა სოფელი იყო.");
  const second = await store(service, batch, "This file was saved, but not selected.");
  assert.equal(embedded.length, 0);
  await service.enqueue(batch.id, [first.id]);
  await new RagWorker(indexer).tick();
  assert.ok(embedded.length > 0);
  assert.ok(embedded.every((text) => !text.includes("not selected")));
  assert.ok(points.length > 0);
  assert.equal((await db.knowledgeDocument.findUnique({ where: { id: first.documentId } })).latestIndexStatus, "succeeded");
  assert.equal((await db.knowledgeDocument.findUnique({ where: { id: second.documentId } })).latestIndexStatus, "idle");
  assert.equal((await service.detail(batch.id)).items.find((i) => i.id === first.id).progress.percent, 1);

  await service.enqueue(batch.id, [second.id]);
  await db.knowledgeDocument.update({ where: { id: second.documentId }, data: { status: "archived" } });
  const before = embedded.length;
  const staleJob = await db.ragIndexJob.findFirst({ where: { ownerId: second.documentId } });
  await assert.rejects(indexer.processJob(staleJob), /archived/);
  assert.equal(embedded.length, before);
  await indexer.updateJobStatus(staleJob.id, { status: "failed", lastError: "Archived after enqueue" });
  assert.equal((await db.knowledgeDocument.findUnique({ where: { id: second.documentId } })).latestIndexStatus, "queued");
});

test("worker startup waits for recovery before claiming work and stop cancels pending start", async () => {
  const { RagWorker } = require("../dist/services/rag/RagWorker.js");
  let release;
  let claims = 0;
  const worker = new RagWorker({
    listJobs: () => new Promise((resolve) => { release = () => resolve([]); }),
    getNextRunnableJob: async () => { claims++; return null; },
  });
  worker.start();
  assert.equal(claims, 0);
  release();
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(claims, 1);
  worker.stop();
  worker.start();
  worker.stop();
  release();
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(claims, 1);
});

test("SQLite additive migration preserves existing rows and establishes the pause relationship", () => {
  const sqlite = new (require("better-sqlite3"))(path.join(tempDir, "migration-only.db"));
  try {
    sqlite.exec('PRAGMA foreign_keys=ON; CREATE TABLE "RagIndexJob" ("id" TEXT PRIMARY KEY); INSERT INTO "RagIndexJob" VALUES (\'existing-job\');');
    const sql = fs.readFileSync(path.join(__dirname, "../src/prisma/migrations.sqlite/20260908000000_knowledge_bulk_import/migration.sql"), "utf8");
    sqlite.transaction(() => sqlite.exec(sql))();
    assert.deepEqual(sqlite.prepare('SELECT * FROM "RagIndexJob"').get(), { id: "existing-job", importBatchId: null, importVersionId: null });
    assert.deepEqual(sqlite.prepare("PRAGMA foreign_key_check").all(), []);
    assert.equal(sqlite.prepare("PRAGMA integrity_check").get().integrity_check, "ok");
  } finally { sqlite.close(); }
});

test("HTTP import endpoints validate requests and keep storage separate from queue selection", async (t) => {
  const { db, batch } = await fixture(t);
  const prismaModule = require("../dist/db/prisma.js");
  const originalDb = prismaModule.prisma;
  prismaModule.prisma = db;
  t.after(() => { prismaModule.prisma = originalDb; });
  const express = require("express");
  const app = express();
  app.use(express.json({ limit: "20mb" }));
  const routerPath = require.resolve("../dist/services/knowledge/imports/router.js");
  delete require.cache[routerPath];
  app.use("/api/knowledge/imports", require(routerPath).default);
  app.use(require("../dist/middleware/errorHandler.js").errorHandler);
  const http = require("node:http");
  const server = http.createServer(app);
  await new Promise((resolve, reject) => { server.once("error", reject); server.listen(0, "127.0.0.1", resolve); });
  t.after(() => new Promise((resolve) => { server.closeAllConnections(); server.close(resolve); }));
  const base = `http://127.0.0.1:${server.address().port}/api/knowledge/imports`;
  const request = async (path, body) => {
    const response = await originalFetch(base + path, body === undefined ? {} : { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    return { status: response.status, body: await response.json() };
  };
  const content = "ქართული HTTP საცდელი ტექსტი.";
  const prepared = await request(`/${batch.id}/prepare`, { files: [metadata(content)] });
  assert.equal(prepared.body.success, true);
  const item = prepared.body.data[0];
  assert.equal((await request(`/${batch.id}/items/${item.id}/upload`, { content })).body.data.uploadStatus, "stored");
  assert.equal(await db.ragIndexJob.count(), 0);
  assert.equal((await request(`/${batch.id}/pause`, { paused: "yes" })).status, 400);
  assert.equal((await request(`/${batch.id}/queue`, { itemIds: [item.id] })).body.data[0].status, "queued");
  assert.equal((await request(`/${batch.id}/pause`, { paused: true })).body.data.processingPaused, true);
  assert.equal((await request(`/${batch.id}`)).body.data.counts.queued, 1);
  assert.equal((await request("/missing-batch")).status, 404);
});

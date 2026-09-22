const test = require("node:test");
const assert = require("node:assert/strict");

test("a graph follow-up failure leaves the completed rebuild succeeded", async () => {
  const { RagWorker } = require("../dist/services/rag/RagWorker.js");
  const { ragConfig } = require("../dist/config/rag.js");
  const previous = ragConfig.graphEnabled;
  ragConfig.graphEnabled = true;
  const updates = [];
  let processed = 0;
  const job = {
    id: "job-1",
    attempts: 0,
    maxAttempts: 5,
    jobType: "rebuild",
    ownerType: "knowledge_document",
    ownerId: "doc-1",
    tenantId: "default",
  };
  const worker = new RagWorker({
    getNextRunnableJob: async () => job,
    processJob: async () => { processed += 1; return { chunks: 3 }; },
    updateJobStatus: async (_id, data) => { updates.push(data); return { ...job, ...data }; },
    enqueueOwnerJob: async () => { throw new Error("invalid input value for enum RagJobType: graph_sync"); },
  }, {});
  try {
    await worker.tick();
  } finally {
    ragConfig.graphEnabled = previous;
  }
  assert.equal(processed, 1);
  assert.deepEqual(updates.map((update) => update.status), ["running", "succeeded"]);
});

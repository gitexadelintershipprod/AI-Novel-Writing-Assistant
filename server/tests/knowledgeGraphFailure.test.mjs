import assert from "node:assert/strict";
import test from "node:test";
import { ragConfig } from "../src/config/rag.ts";
import { writeThenPruneOwnerGraph } from "../src/services/rag/graph/graphOwnerReplace.ts";
import { syncKnowledgeGraph } from "../src/services/rag/graph/graphSyncJob.ts";

const job = {
  tenantId: "default",
  ownerType: "knowledge_document",
  ownerId: "book-1",
};

const chunks = [
  { id: "chunk-1", title: "One", chunkText: "Felix entered Altdorf.", chunkOrder: 0 },
  { id: "chunk-2", title: "Two", chunkText: "Gotrek waited by the gate.", chunkOrder: 1 },
];

function withGraphEnabled(run) {
  const previous = ragConfig.graphEnabled;
  ragConfig.graphEnabled = true;
  return Promise.resolve()
    .then(run)
    .finally(() => {
      ragConfig.graphEnabled = previous;
    });
}

function fakeStore() {
  const calls = [];
  return {
    calls,
    deleteOwner: async () => {
      calls.push("delete");
    },
    replaceOwnerChunks: async (input) => {
      calls.push({ op: "replace", chunks: input.chunks });
      return input.chunks.length;
    },
  };
}

test("a refused section does not delete or replace the graph", () => withGraphEnabled(async () => {
  const store = fakeStore();
  await assert.rejects(
    () => syncKnowledgeGraph({
      job,
      store,
      loadChunks: async () => chunks,
      promptRunner: async (input) => {
        if (input.promptInput.chunkOrder === 1) {
          throw new Error("provider refused");
        }
        return { output: { entities: [{ name: "Felix", type: "person" }], relations: [] } };
      },
    }),
    /provider refused/,
  );
  assert.deepEqual(store.calls, []);
}));

test("a real empty answer is saved without treating it as a refusal", () => withGraphEnabled(async () => {
  const store = fakeStore();
  const result = await syncKnowledgeGraph({
    job,
    store,
    loadChunks: async () => chunks,
    promptRunner: async () => ({ output: { entities: [], relations: [] } }),
  });
  assert.equal(result.chunks, 0);
  assert.equal(store.calls.some((call) => call === "delete"), false);
  assert.equal(store.calls.length, 1);
  assert.deepEqual(store.calls[0].chunks, []);
}));

test("a save writes the new graph before it removes stale nodes", async () => {
  const statements = [];
  const session = {
    executeWrite: async (work) => work({
      run: async (cypher) => {
        statements.push(cypher.replace(/\s+/g, " ").trim());
      },
    }),
  };
  await writeThenPruneOwnerGraph(session, {
    tenantId: "default",
    ownerType: "knowledge_document",
    ownerId: "book-1",
    chunks: [{
      chunkId: "chunk-1",
      entities: [{ name: "Felix", type: "person" }],
      relations: [{ from: "Felix", to: "Altdorf", type: "enters" }],
    }, {
      chunkId: "chunk-2",
      entities: [{ name: "Altdorf", type: "place" }],
      relations: [],
    }],
  });
  const firstWrite = statements.findIndex((statement) => statement.includes("MERGE"));
  const firstDelete = statements.findIndex((statement) => /\bDELETE\b/.test(statement));
  assert.ok(firstWrite >= 0);
  assert.ok(firstDelete > firstWrite);
  assert.equal(statements.slice(0, firstDelete).some((statement) => /\bDELETE\b/.test(statement)), false);
  assert.equal(statements.at(-1).includes("DETACH DELETE c"), true);
});

test("a save that fails while writing does not remove the existing graph", async () => {
  const statements = [];
  const session = {
    executeWrite: async (work) => work({
      run: async (cypher) => {
        const statement = cypher.replace(/\s+/g, " ").trim();
        if (statement.includes("MERGE (e:KnowledgeEntity")) {
          throw new Error("neo4j unavailable");
        }
        statements.push(statement);
      },
    }),
  };
  await assert.rejects(
    () => writeThenPruneOwnerGraph(session, {
      tenantId: "default",
      ownerType: "knowledge_document",
      ownerId: "book-1",
      chunks: [{
        chunkId: "chunk-1",
        entities: [{ name: "Felix", type: "person" }],
        relations: [],
      }],
    }),
    /neo4j unavailable/,
  );
  assert.equal(statements.some((statement) => /\bDELETE\b/.test(statement)), false);
});

test("a clean empty read clears the book only through the save", async () => {
  const statements = [];
  const session = {
    executeWrite: async (work) => work({
      run: async (cypher) => {
        statements.push(cypher.replace(/\s+/g, " ").trim());
      },
    }),
  };
  const saved = await writeThenPruneOwnerGraph(session, {
    tenantId: "default",
    ownerType: "knowledge_document",
    ownerId: "book-1",
    chunks: [],
  });
  assert.equal(saved, 0);
  assert.equal(statements.some((statement) => statement.includes("MERGE")), false);
  assert.equal(statements.some((statement) => statement.includes("DETACH DELETE e")), true);
  assert.equal(statements.some((statement) => statement.includes("DETACH DELETE c")), true);
});

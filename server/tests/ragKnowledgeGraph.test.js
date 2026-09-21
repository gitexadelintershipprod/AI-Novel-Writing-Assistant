const test = require("node:test");
const assert = require("node:assert/strict");

const { ragConfig } = require("../dist/config/rag.js");
const { prisma } = require("../dist/db/prisma.js");
const { KnowledgeQueryRewriteService } = require("../dist/services/rag/knowledge-retrieval/queryRewrite.js");
const { KnowledgeGraphService } = require("../dist/services/rag/graph/KnowledgeGraphService.js");
const { HybridRetrievalService } = require("../dist/services/rag/HybridRetrievalService.js");

prisma.knowledgeChunk.findMany = async () => [];
prisma.knowledgeDocument.findMany = async (args) => {
  const ids = args?.where?.id?.in;
  if (!Array.isArray(ids)) {
    return [];
  }
  return ids.map((id) => ({ id }));
};
prisma.$queryRawUnsafe = async () => [];

function withRagConfig(patch, run) {
  const previous = {};
  for (const key of Object.keys(patch)) {
    previous[key] = ragConfig[key];
    ragConfig[key] = patch[key];
  }
  return Promise.resolve()
    .then(run)
    .finally(() => {
      for (const key of Object.keys(previous)) {
        ragConfig[key] = previous[key];
      }
    });
}

function vectorHit(id, ownerType, ownerId, chunkText) {
  return {
    id,
    score: 0.9,
    payload: {
      ownerType,
      ownerId,
      title: ownerType,
      chunkText,
      chunkOrder: 1,
    },
  };
}

test("KnowledgeQueryRewriteService leaves English queries unchanged", async () => {
  const service = new KnowledgeQueryRewriteService(async () => {
    throw new Error("prompt should not run for English queries");
  });
  const result = await service.rewrite("forbidden palace intrigue");
  assert.equal(result.rewritten, false);
  assert.equal(result.searchText, "forbidden palace intrigue");
});

test("KnowledgeQueryRewriteService rewrites Georgian queries into English phrases", async () => {
  const service = new KnowledgeQueryRewriteService(async () => ({
    output: { queries: ["palace intrigue", "empress household"] },
  }));
  const result = await service.rewrite("აკრძალულ სასახლეში ინტრიგა იწყება");
  assert.equal(result.rewritten, true);
  assert.equal(result.searchText, "palace intrigue empress household");
  assert.deepEqual(result.phrases, ["palace intrigue", "empress household"]);
});

test("KnowledgeQueryRewriteService keeps the original query when rewrite fails", async () => {
  const service = new KnowledgeQueryRewriteService(async () => {
    throw new Error("model unavailable");
  });
  const result = await service.rewrite("აკრძალულ სასახლეში ინტრიგა იწყება");
  assert.equal(result.rewritten, false);
  assert.match(result.searchText, /აკრძალულ/);
});

test("KnowledgeGraphService search fail-opens when Neo4j is unavailable", () => withRagConfig({
  graphEnabled: true,
}, async () => {
  const service = new KnowledgeGraphService({
    searchChunkIds: async () => {
      throw new Error("Neo4j is down");
    },
  });
  const rows = await service.searchChunks({
    tenantId: "default",
    phrases: ["palace intrigue"],
    limit: 8,
  });
  assert.deepEqual(rows, []);
}));

test("HybridRetrievalService still returns vector hits when graph search throws", () => withRagConfig({
  enabled: true,
  graphEnabled: true,
  rerankerEnabled: false,
  retrievalTraceSampleRate: 0,
}, async () => {
  const embeddingService = {
    embedTexts: async () => ({ vectors: [[1, 2, 3]], provider: "test", model: "test-embed" }),
  };
  const vectorStoreService = {
    ensureCollection: async () => {},
    search: async () => [
      {
        id: "novel-hit",
        score: 0.9,
        payload: {
          ownerType: "novel",
          ownerId: "novel-1",
          title: "Test novel",
          chunkText: "Georgian chapter memory",
          chunkOrder: 1,
        },
      },
    ],
  };
  const graphService = {
    searchChunks: async () => {
      throw new Error("graph exploded");
    },
  };
  const service = new HybridRetrievalService(embeddingService, vectorStoreService, undefined, graphService);
  const rows = await service.retrieve("თავი უნდა დაიწეროს", {
    ownerTypes: ["novel"],
    finalTopK: 4,
  });
  assert.equal(rows.some((item) => item.id === "novel-hit"), true);
}));

test("HybridRetrievalService rewrites only the knowledge branch and keeps the novel query Georgian", () => withRagConfig({
  enabled: true,
  graphEnabled: true,
  rerankerEnabled: false,
  retrievalTraceSampleRate: 0,
}, async () => {
  const seenQueries = [];
  const embeddingService = {
    embedTexts: async (texts) => {
      seenQueries.push(texts[0]);
      return { vectors: [[1, 2, 3]], provider: "test", model: "test-embed" };
    },
  };
  const vectorStoreService = {
    ensureCollection: async () => {},
    search: async (_vector, _limit, filter) => {
      const ownerTypes = filter.ownerTypes ?? [];
      if (ownerTypes.includes("knowledge_document")) {
        return [vectorHit("book-hit", "knowledge_document", "book-1", "English craft note")];
      }
      return [vectorHit("novel-hit", "novel", "novel-1", "ქართული მეხსიერება")];
    },
  };
  const graphQueries = [];
  const graphService = {
    searchChunks: async (input) => {
      graphQueries.push(input.phrases);
      throw new Error("graph exploded");
    },
  };
  const queryRewriter = {
    rewrite: async (query) => ({
      searchText: "palace intrigue",
      phrases: ["palace intrigue"],
      rewritten: true,
      original: query,
    }),
  };
  const service = new HybridRetrievalService(
    embeddingService,
    vectorStoreService,
    undefined,
    graphService,
    queryRewriter,
  );
  const rows = await service.retrieve("აკრძალულ სასახლეში ინტრიგა იწყება", {
    ownerTypes: ["novel", "knowledge_document"],
    knowledgeDocumentIds: ["book-1"],
    finalTopK: 8,
  });
  assert.equal(seenQueries.some((item) => item.includes("აკრძალულ")), true);
  assert.equal(seenQueries.includes("palace intrigue"), true);
  assert.deepEqual(graphQueries[0], ["palace intrigue"]);
  assert.equal(rows.some((item) => item.id === "novel-hit"), true);
  assert.equal(rows.some((item) => item.id === "book-hit"), true);
}));

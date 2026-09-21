import { EmbeddingService } from "./EmbeddingService";
import { VectorStoreService } from "./VectorStoreService";
import { HybridRetrievalService } from "./HybridRetrievalService";
import { RagIndexService } from "./RagIndexService";
import { RagContextualChunkService } from "./RagContextualChunkService";
import { RagRerankerService } from "./RagRerankerService";
import { RagJobCleanupService } from "./RagJobCleanupService";
import { RagRetrievalTraceRetention } from "./RagRetrievalTraceRetention";
import { RagWorker } from "./RagWorker";
import { KnowledgeGraphService } from "./graph";

const embeddingService = new EmbeddingService();
const vectorStoreService = new VectorStoreService();
const ragContextualChunkService = new RagContextualChunkService();
const ragRerankerService = new RagRerankerService();
const knowledgeGraphService = new KnowledgeGraphService();
const ragIndexService = new RagIndexService(embeddingService, vectorStoreService, ragContextualChunkService);
const ragJobCleanupService = new RagJobCleanupService();
const ragRetrievalTraceRetention = new RagRetrievalTraceRetention();
const hybridRetrievalService = new HybridRetrievalService(
  embeddingService,
  vectorStoreService,
  ragRerankerService,
  knowledgeGraphService,
);
const ragWorker = new RagWorker(ragIndexService, knowledgeGraphService);

export const ragServices = {
  embeddingService,
  vectorStoreService,
  ragContextualChunkService,
  ragRerankerService,
  knowledgeGraphService,
  ragIndexService,
  ragJobCleanupService,
  ragRetrievalTraceRetention,
  hybridRetrievalService,
  ragWorker,
};

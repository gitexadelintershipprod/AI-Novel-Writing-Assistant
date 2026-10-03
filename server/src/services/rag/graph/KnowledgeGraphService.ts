import type { RagIndexJob } from "@prisma/client";
import { ragConfig } from "../../../config/rag";
import type { RagOwnerType, RetrievedChunk } from "../types";
import { Neo4jGraphStore } from "./Neo4jGraphStore";
import {
  syncKnowledgeGraph,
  type GraphChunkLoader,
  type GraphChunkRow,
  type GraphSyncProgress,
} from "./graphSyncJob";

export type { GraphSyncProgress };

type StructuredPromptRunner = typeof import("../../../prompting/core/promptRunner")["runStructuredPrompt"];

const runExtractPrompt: StructuredPromptRunner = async (input) => {
  const { runStructuredPrompt } = await import("../../../prompting/core/promptRunner");
  return runStructuredPrompt(input);
};

async function loadKnowledgeChunks(
  job: Pick<RagIndexJob, "tenantId" | "ownerType" | "ownerId">,
): Promise<GraphChunkRow[]> {
  const { prisma } = await import("../../../db/prisma");
  return prisma.knowledgeChunk.findMany({
    where: {
      tenantId: job.tenantId,
      ownerType: job.ownerType,
      ownerId: job.ownerId,
    },
    orderBy: { chunkOrder: "asc" },
    select: {
      id: true,
      title: true,
      chunkText: true,
      chunkOrder: true,
    },
  });
}

export class KnowledgeGraphService {
  constructor(
    private readonly store: Neo4jGraphStore = new Neo4jGraphStore(),
    private readonly promptRunner: StructuredPromptRunner = runExtractPrompt,
    private readonly loadChunks: GraphChunkLoader = loadKnowledgeChunks,
  ) {}

  async healthCheck(): Promise<{ ok: boolean; detail?: string }> {
    return this.store.healthCheck();
  }

  async processSyncJob(
    job: RagIndexJob,
    onProgress?: (progress: GraphSyncProgress) => Promise<void>,
  ): Promise<{ chunks: number }> {
    return syncKnowledgeGraph({
      job,
      store: this.store,
      promptRunner: this.promptRunner,
      loadChunks: this.loadChunks,
      onProgress,
    });
  }

  async deleteOwner(ownerType: string, ownerId: string, tenantId: string): Promise<void> {
    if (!ragConfig.graphEnabled) {
      return;
    }
    await this.store.deleteOwner(tenantId, ownerType, ownerId);
  }

  async searchChunks(input: {
    tenantId: string;
    ownerIds?: string[];
    phrases: string[];
    limit?: number;
  }): Promise<RetrievedChunk[]> {
    if (!ragConfig.graphEnabled) {
      return [];
    }
    try {
      const chunkIds = await this.store.searchChunkIds({
        tenantId: input.tenantId,
        ownerIds: input.ownerIds,
        phrases: input.phrases,
        limit: input.limit ?? ragConfig.keywordCandidates,
      });
      if (chunkIds.length === 0) {
        return [];
      }
      const { prisma } = await import("../../../db/prisma");
      const rows = await prisma.knowledgeChunk.findMany({
        where: { id: { in: chunkIds } },
      });
      const byId = new Map(rows.map((row) => [row.id, row]));
      return chunkIds.flatMap((id, index) => {
        const row = byId.get(id);
        if (!row) {
          return [];
        }
        return [{
          id: row.id,
          ownerType: row.ownerType as RagOwnerType,
          ownerId: row.ownerId,
          score: 1 / (index + 1),
          title: row.title ?? undefined,
          chunkText: row.chunkText,
          chunkOrder: row.chunkOrder,
          novelId: row.novelId ?? undefined,
          worldId: row.worldId ?? undefined,
          metadataJson: row.metadataJson ?? undefined,
          source: "graph" as const,
          retrievalSource: "graph" as const,
        }];
      });
    } catch {
      return [];
    }
  }

}

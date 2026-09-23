import type { RagIndexJob } from "@prisma/client";
import { prisma } from "../../../db/prisma";
import { ragConfig } from "../../../config/rag";
import { ragKnowledgeGraphExtractPrompt } from "../../../prompting/prompts/rag/knowledgeGraphExtract.prompts";
import { isEnglishKnowledgeText } from "../chunking";
import { runWithConcurrency } from "../utils";
import type { RagOwnerType, RetrievedChunk } from "../types";
import { Neo4jGraphStore, type GraphChunkWrite } from "./Neo4jGraphStore";

type StructuredPromptRunner = typeof import("../../../prompting/core/promptRunner")["runStructuredPrompt"];

const runExtractPrompt: StructuredPromptRunner = async (input) => {
  const { runStructuredPrompt } = await import("../../../prompting/core/promptRunner");
  return runStructuredPrompt(input);
};

export class KnowledgeGraphService {
  constructor(
    private readonly store: Neo4jGraphStore = new Neo4jGraphStore(),
    private readonly promptRunner: StructuredPromptRunner = runExtractPrompt,
  ) {}

  async healthCheck(): Promise<{ ok: boolean; detail?: string }> {
    return this.store.healthCheck();
  }

  async processSyncJob(
    job: RagIndexJob,
    onProgress?: (current: number, total: number) => Promise<void>,
  ): Promise<{ chunks: number }> {
    const ownerType = job.ownerType as RagOwnerType;
    if (!ragConfig.graphEnabled || ownerType !== "knowledge_document") {
      return { chunks: 0 };
    }
    try {
      const chunks = await prisma.knowledgeChunk.findMany({
        where: {
          tenantId: job.tenantId,
          ownerType,
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
      const sourceText = chunks.map((item) => item.chunkText).join("\n");
      if (chunks.length === 0 || !isEnglishKnowledgeText(sourceText)) {
        await this.store.deleteOwner(job.tenantId, ownerType, job.ownerId).catch(() => {});
        return { chunks: 0 };
      }
      const writes: GraphChunkWrite[] = [];
      let finished = 0;
      await onProgress?.(0, chunks.length);
      await runWithConcurrency(chunks, Math.min(2, ragConfig.contextualRetrievalConcurrency), async (chunk) => {
        const extracted = await this.extractChunk(chunk.title ?? "", chunk.chunkOrder, chunk.chunkText);
        finished += 1;
        const current = finished;
        await onProgress?.(current, chunks.length);
        if (extracted.entities.length === 0 && extracted.relations.length === 0) {
          return;
        }
        writes.push({
          chunkId: chunk.id,
          entities: extracted.entities,
          relations: extracted.relations,
        });
      });
      await this.store.replaceOwnerChunks({
        tenantId: job.tenantId,
        ownerType,
        ownerId: job.ownerId,
        chunks: writes,
      });
      return { chunks: writes.length };
    } catch {
      return { chunks: 0 };
    }
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

  private async extractChunk(title: string, chunkOrder: number, chunkText: string) {
    try {
      const result = await this.promptRunner({
        asset: ragKnowledgeGraphExtractPrompt,
        promptInput: { title, chunkOrder, chunkText },
        options: {
          timeoutMs: ragConfig.neo4jTimeoutMs,
          maxTokens: 700,
          temperature: 0.1,
          entrypoint: "rag_knowledge_graph_extract",
          triggerReason: "graph_sync",
        },
      });
      return result.output;
    } catch {
      return { entities: [], relations: [] };
    }
  }
}

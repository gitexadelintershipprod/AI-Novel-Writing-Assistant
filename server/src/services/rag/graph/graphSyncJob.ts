import type { RagIndexJob } from "@prisma/client";
import { ragConfig } from "../../../config/rag";
import { ragKnowledgeGraphExtractPrompt } from "../../../prompting/prompts/rag/knowledgeGraphExtract.prompts";
import { isEnglishKnowledgeText } from "../chunking";
import { runWithConcurrency } from "../utils";
import type { RagOwnerType } from "../types";
import type { GraphChunkWrite } from "./Neo4jGraphStore";
import { GRAPH_SECTION_CONCURRENCY } from "./graphSyncPace";

export type GraphSyncProgress = {
  phase: "reading" | "saving";
  current: number;
  total: number;
};

type StructuredPromptRunner = typeof import("../../../prompting/core/promptRunner")["runStructuredPrompt"];

export type GraphChunkRow = {
  id: string;
  title: string | null;
  chunkText: string;
  chunkOrder: number;
};

export type GraphChunkLoader = (
  job: Pick<RagIndexJob, "tenantId" | "ownerType" | "ownerId">,
) => Promise<GraphChunkRow[]>;

type GraphSyncStore = {
  deleteOwner: (tenantId: string, ownerType: string, ownerId: string) => Promise<void>;
  replaceOwnerChunks: (input: {
    tenantId: string;
    ownerType: string;
    ownerId: string;
    chunks: GraphChunkWrite[];
    onBatch?: (saved: number, total: number) => Promise<void>;
  }) => Promise<number>;
};

async function extractChunk(
  promptRunner: StructuredPromptRunner,
  title: string,
  chunkOrder: number,
  chunkText: string,
) {
  const result = await promptRunner({
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
}

export async function syncKnowledgeGraph(input: {
  job: Pick<RagIndexJob, "tenantId" | "ownerType" | "ownerId">;
  store: GraphSyncStore;
  promptRunner: StructuredPromptRunner;
  loadChunks: GraphChunkLoader;
  onProgress?: (progress: GraphSyncProgress) => Promise<void>;
}): Promise<{ chunks: number }> {
  const ownerType = input.job.ownerType as RagOwnerType;
  if (!ragConfig.graphEnabled || ownerType !== "knowledge_document") {
    return { chunks: 0 };
  }
  const chunks = await input.loadChunks(input.job);
  const sourceText = chunks.map((item) => item.chunkText).join("\n");
  if (chunks.length === 0 || !isEnglishKnowledgeText(sourceText)) {
    await input.store.deleteOwner(input.job.tenantId, ownerType, input.job.ownerId).catch(() => {});
    return { chunks: 0 };
  }
  const writes: GraphChunkWrite[] = [];
  let finished = 0;
  await input.onProgress?.({ phase: "reading", current: 0, total: chunks.length });
  await runWithConcurrency(chunks, GRAPH_SECTION_CONCURRENCY, async (chunk) => {
    const extracted = await extractChunk(
      input.promptRunner,
      chunk.title ?? "",
      chunk.chunkOrder,
      chunk.chunkText,
    );
    finished += 1;
    const current = finished;
    await input.onProgress?.({ phase: "reading", current, total: chunks.length });
    if (extracted.entities.length === 0 && extracted.relations.length === 0) {
      return;
    }
    writes.push({
      chunkId: chunk.id,
      entities: extracted.entities,
      relations: extracted.relations,
    });
  });
  await input.store.replaceOwnerChunks({
    tenantId: input.job.tenantId,
    ownerType,
    ownerId: input.job.ownerId,
    chunks: writes,
    onBatch: async (saved, total) => {
      await input.onProgress?.({ phase: "saving", current: saved, total });
    },
  });
  return { chunks: writes.length };
}

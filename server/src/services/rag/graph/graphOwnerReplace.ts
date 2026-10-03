import type { ManagedTransaction, Session } from "neo4j-driver";
import { GRAPH_WRITE_BATCH_SIZE, graphWriteBatches } from "./graphSyncPace";
import type { GraphChunkWrite } from "./Neo4jGraphStore";

type GraphQueryRunner = Pick<ManagedTransaction, "run">;

interface PreparedEntity {
  key: string;
  name: string;
  type: string;
}

interface PreparedRelation {
  fromKey: string;
  toKey: string;
  type: string;
}

interface PreparedChunk {
  chunkId: string;
  entities: PreparedEntity[];
  relations: PreparedRelation[];
}

export interface GraphOwnerReplaceInput {
  tenantId: string;
  ownerType: string;
  ownerId: string;
  chunks: GraphChunkWrite[];
  onBatch?: (saved: number, total: number) => Promise<void>;
}

function entityKey(tenantId: string, ownerId: string, name: string): string {
  return `${tenantId}|${ownerId}|${name.trim().toLowerCase()}`;
}

function prepareChunk(tenantId: string, ownerId: string, chunk: GraphChunkWrite): PreparedChunk {
  return {
    chunkId: chunk.chunkId,
    entities: chunk.entities
      .map((item) => ({
        key: entityKey(tenantId, ownerId, item.name),
        name: item.name.trim(),
        type: item.type,
      }))
      .filter((item) => item.name),
    relations: chunk.relations
      .map((item) => ({
        fromKey: entityKey(tenantId, ownerId, item.from),
        toKey: entityKey(tenantId, ownerId, item.to),
        type: item.type.trim(),
      }))
      .filter((item) => item.fromKey && item.toKey && item.type),
  };
}

async function writeChunkBatch(
  tx: GraphQueryRunner,
  input: GraphOwnerReplaceInput,
  batch: PreparedChunk[],
): Promise<void> {
  await tx.run(
    `
    UNWIND $chunks AS chunk
    MERGE (c:KnowledgeChunk {id: chunk.chunkId})
    SET c.tenantId = $tenantId, c.ownerType = $ownerType, c.ownerId = $ownerId
    `,
    {
      chunks: batch.map((chunk) => ({ chunkId: chunk.chunkId })),
      tenantId: input.tenantId,
      ownerType: input.ownerType,
      ownerId: input.ownerId,
    },
  );
  const entities = batch.flatMap((chunk) => chunk.entities.map((entity) => ({
    chunkId: chunk.chunkId,
    ...entity,
  })));
  if (entities.length > 0) {
    await tx.run(
      `
      UNWIND $entities AS entity
      MATCH (c:KnowledgeChunk {id: entity.chunkId})
      MERGE (e:KnowledgeEntity {key: entity.key})
      SET e.name = entity.name,
          e.nameLower = toLower(entity.name),
          e.type = entity.type,
          e.tenantId = $tenantId,
          e.ownerType = $ownerType,
          e.ownerId = $ownerId
      MERGE (e)-[:MENTIONED_IN]->(c)
      `,
      {
        entities,
        tenantId: input.tenantId,
        ownerType: input.ownerType,
        ownerId: input.ownerId,
      },
    );
  }
  const relations = batch.flatMap((chunk) => chunk.relations);
  if (relations.length > 0) {
    await tx.run(
      `
      UNWIND $relations AS rel
      MATCH (from:KnowledgeEntity {key: rel.fromKey})
      MATCH (to:KnowledgeEntity {key: rel.toKey})
      MERGE (from)-[link:RELATES_TO {type: rel.type}]->(to)
      SET link.ownerId = $ownerId, link.tenantId = $tenantId
      `,
      {
        relations,
        ownerId: input.ownerId,
        tenantId: input.tenantId,
      },
    );
  }
}

async function pruneStaleOwnerGraph(
  tx: GraphQueryRunner,
  input: GraphOwnerReplaceInput,
  prepared: PreparedChunk[],
): Promise<void> {
  const scope = {
    tenantId: input.tenantId,
    ownerType: input.ownerType,
    ownerId: input.ownerId,
  };
  const mentions = prepared.flatMap((chunk) => chunk.entities.map((entity) => ({
    chunkId: chunk.chunkId,
    entityKey: entity.key,
  })));
  const relations = prepared.flatMap((chunk) => chunk.relations);
  await tx.run(
    `
    MATCH (e:KnowledgeEntity {tenantId: $tenantId, ownerType: $ownerType, ownerId: $ownerId})
      -[mention:MENTIONED_IN]->
      (c:KnowledgeChunk {tenantId: $tenantId, ownerId: $ownerId})
    WHERE NONE(item IN $mentions WHERE item.entityKey = e.key AND item.chunkId = c.id)
    DELETE mention
    `,
    { ...scope, mentions },
  );
  await tx.run(
    `
    MATCH (from:KnowledgeEntity {tenantId: $tenantId, ownerType: $ownerType, ownerId: $ownerId})
      -[link:RELATES_TO]->
      (to:KnowledgeEntity {tenantId: $tenantId, ownerId: $ownerId})
    WHERE NONE(rel IN $relations WHERE rel.fromKey = from.key AND rel.toKey = to.key AND rel.type = link.type)
    DELETE link
    `,
    { ...scope, relations },
  );
  await tx.run(
    `
    MATCH (e:KnowledgeEntity {tenantId: $tenantId, ownerType: $ownerType, ownerId: $ownerId})
    WHERE NOT e.key IN $entityKeys
    DETACH DELETE e
    `,
    {
      ...scope,
      entityKeys: [...new Set(prepared.flatMap((chunk) => chunk.entities.map((entity) => entity.key)))],
    },
  );
  await tx.run(
    `
    MATCH (c:KnowledgeChunk {tenantId: $tenantId, ownerType: $ownerType, ownerId: $ownerId})
    WHERE NOT c.id IN $chunkIds
    DETACH DELETE c
    `,
    {
      ...scope,
      chunkIds: prepared.map((chunk) => chunk.chunkId),
    },
  );
}

export async function writeThenPruneOwnerGraph(
  session: Pick<Session, "executeWrite">,
  input: GraphOwnerReplaceInput,
): Promise<number> {
  const prepared = input.chunks.map((chunk) => prepareChunk(input.tenantId, input.ownerId, chunk));
  const batches = graphWriteBatches(prepared, GRAPH_WRITE_BATCH_SIZE);
  await session.executeWrite(async (tx) => {
    let saved = 0;
    await input.onBatch?.(saved, prepared.length).catch(() => {});
    for (const batch of batches) {
      await writeChunkBatch(tx, input, batch);
      saved += batch.length;
      await input.onBatch?.(saved, prepared.length).catch(() => {});
    }
    await pruneStaleOwnerGraph(tx, input, prepared);
  });
  return prepared.length;
}

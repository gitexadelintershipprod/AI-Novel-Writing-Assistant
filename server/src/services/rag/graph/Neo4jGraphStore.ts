import neo4j, { type Driver, type Session } from "neo4j-driver";
import { ragConfig } from "../../../config/rag";

export interface GraphEntityRecord {
  name: string;
  type: "person" | "place" | "theme" | "technique";
}

export interface GraphRelationRecord {
  from: string;
  to: string;
  type: string;
}

export interface GraphChunkWrite {
  chunkId: string;
  entities: GraphEntityRecord[];
  relations: GraphRelationRecord[];
}

function entityKey(tenantId: string, ownerId: string, name: string): string {
  return `${tenantId}|${ownerId}|${name.trim().toLowerCase()}`;
}

export class Neo4jGraphStore {
  private driver: Driver | null = null;
  private driverKey = "";

  private currentKey(): string {
    return [
      ragConfig.neo4jUri,
      ragConfig.neo4jUser,
      ragConfig.neo4jPassword,
      String(ragConfig.neo4jTimeoutMs),
    ].join("|");
  }

  private async getDriver(): Promise<Driver> {
    const key = this.currentKey();
    if (this.driver && this.driverKey === key) {
      return this.driver;
    }
    if (this.driver) {
      await this.driver.close().catch(() => {});
      this.driver = null;
    }
    this.driver = neo4j.driver(
      ragConfig.neo4jUri,
      neo4j.auth.basic(ragConfig.neo4jUser || "neo4j", ragConfig.neo4jPassword),
      {
        connectionTimeout: ragConfig.neo4jTimeoutMs,
        maxConnectionLifetime: 60 * 60 * 1000,
        maxConnectionPoolSize: 8,
      },
    );
    this.driverKey = key;
    return this.driver;
  }

  async withSession<T>(work: (session: Session) => Promise<T>): Promise<T> {
    const driver = await this.getDriver();
    const session = driver.session();
    try {
      return await work(session);
    } finally {
      await session.close();
    }
  }

  async healthCheck(): Promise<{ ok: boolean; detail?: string }> {
    if (!ragConfig.graphEnabled) {
      return { ok: true, detail: "Graph search is turned off." };
    }
    try {
      await this.withSession(async (session) => {
        await session.run("RETURN 1 AS ok");
      });
      return { ok: true };
    } catch (error) {
      return {
        ok: false,
        detail: error instanceof Error ? error.message : "Neo4j health check failed.",
      };
    }
  }

  async replaceOwnerChunks(input: {
    tenantId: string;
    ownerType: string;
    ownerId: string;
    chunks: GraphChunkWrite[];
  }): Promise<number> {
    await this.deleteOwner(input.tenantId, input.ownerType, input.ownerId);
    if (input.chunks.length === 0) {
      return 0;
    }
    await this.withSession(async (session) => {
      for (const chunk of input.chunks) {
        const entities = chunk.entities
          .map((item) => ({
            key: entityKey(input.tenantId, input.ownerId, item.name),
            name: item.name.trim(),
            type: item.type,
          }))
          .filter((item) => item.name);
        const relations = chunk.relations
          .map((item) => ({
            fromKey: entityKey(input.tenantId, input.ownerId, item.from),
            toKey: entityKey(input.tenantId, input.ownerId, item.to),
            type: item.type.trim(),
          }))
          .filter((item) => item.fromKey && item.toKey && item.type);
        await session.run(
          `
          MERGE (c:KnowledgeChunk {id: $chunkId})
          SET c.tenantId = $tenantId, c.ownerType = $ownerType, c.ownerId = $ownerId
          WITH c
          UNWIND $entities AS entity
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
            chunkId: chunk.chunkId,
            tenantId: input.tenantId,
            ownerType: input.ownerType,
            ownerId: input.ownerId,
            entities,
          },
        );
        if (relations.length > 0) {
          await session.run(
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
    });
    return input.chunks.length;
  }

  async deleteOwner(tenantId: string, ownerType: string, ownerId: string): Promise<void> {
    await this.withSession(async (session) => {
      await session.run(
        `
        MATCH (e:KnowledgeEntity {tenantId: $tenantId, ownerType: $ownerType, ownerId: $ownerId})
        DETACH DELETE e
        `,
        { tenantId, ownerType, ownerId },
      );
      await session.run(
        `
        MATCH (c:KnowledgeChunk {tenantId: $tenantId, ownerType: $ownerType, ownerId: $ownerId})
        DETACH DELETE c
        `,
        { tenantId, ownerType, ownerId },
      );
    });
  }

  async searchChunkIds(input: {
    tenantId: string;
    ownerIds?: string[];
    phrases: string[];
    limit: number;
  }): Promise<string[]> {
    const phrases = input.phrases
      .map((item) => item.replace(/\s+/g, " ").trim().toLowerCase())
      .filter((item) => item.length >= 2)
      .slice(0, 8);
    if (phrases.length === 0) {
      return [];
    }
    const result = await this.withSession(async (session) => {
      const queryResult = await session.run(
        `
        UNWIND $phrases AS phrase
        MATCH (e:KnowledgeEntity)
        WHERE e.tenantId = $tenantId
          AND e.ownerType = 'knowledge_document'
          AND ($ownerIds IS NULL OR e.ownerId IN $ownerIds)
          AND (e.nameLower CONTAINS phrase OR phrase CONTAINS e.nameLower)
        OPTIONAL MATCH (e)-[:RELATES_TO]-(related:KnowledgeEntity)
        WITH collect(DISTINCT e) + collect(DISTINCT related) AS nodes
        UNWIND nodes AS node
        MATCH (node)-[:MENTIONED_IN]->(c:KnowledgeChunk)
        RETURN DISTINCT c.id AS chunkId
        LIMIT $limit
        `,
        {
          phrases,
          tenantId: input.tenantId,
          ownerIds: input.ownerIds && input.ownerIds.length > 0 ? input.ownerIds : null,
          limit: neo4j.int(Math.max(1, input.limit)),
        },
      );
      return queryResult.records
        .map((record) => record.get("chunkId"))
        .filter((value): value is string => typeof value === "string" && value.length > 0);
    });
    return result;
  }
}

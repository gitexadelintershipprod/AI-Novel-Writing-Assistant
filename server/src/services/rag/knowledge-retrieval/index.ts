import type { KnowledgeChunk } from "@prisma/client";
import type { DatabaseProvider } from "../../../config/database";
import type { RagChunkFacets } from "../chunkFacets";

// Lexical retrieval is evidence matching, not intent classification. Semantic
// understanding remains the responsibility of vector retrieval and the LLM.
const STOP_WORDS = new Set([
  "a", "an", "the", "and", "or", "of", "to", "in", "on", "at", "for", "from",
  "with", "by", "is", "are", "was", "were", "be", "been", "being", "do", "does",
  "did", "who", "what", "when", "where", "why", "how", "which", "this", "that",
  "these", "those", "it", "its", "as", "about", "can", "could", "would", "should",
  "და", "ან", "თუ", "არის", "იყო", "იყვნენ", "ვინ", "რა", "რას", "რის",
  "სად", "როდის", "რატომ", "როგორ", "რომელი", "რომ", "ეს", "ის", "ამ", "იმ",
]);

export function knowledgeKeywordTerms(query: string): string[] {
  const words = query.normalize("NFC").toLocaleLowerCase("ka-GE").match(/[\p{L}\p{N}][\p{L}\p{M}\p{N}]*/gu) ?? [];
  return words.filter((word) => !STOP_WORDS.has(word)).slice(0, 32);
}

export interface KnowledgeKeywordScope {
  tenantId: string;
  ownerIds?: string[];
  novelId?: string;
  worldId?: string;
  facets?: RagChunkFacets;
  limit: number;
}

export interface KnowledgeKeywordQuery {
  sql: string;
  parameters: Array<string | number>;
}

/** All external values are bind parameters; only owned SQL is interpolated. */
export function buildKnowledgeKeywordQuery(
  provider: DatabaseProvider,
  query: string,
  scope: KnowledgeKeywordScope,
): KnowledgeKeywordQuery | null {
  const terms = knowledgeKeywordTerms(query);
  if (!terms.length || scope.ownerIds?.length === 0) return null;
  const parameters: Array<string | number> = [];
  const bind = (value: string | number) => {
    parameters.push(value);
    return provider === "postgresql" ? `$${parameters.length}` : `?${parameters.length}`;
  };
  const where = [
    `c."ownerType" = 'knowledge_document'`,
    `c."tenantId" = ${bind(scope.tenantId)}`,
  ];
  if (scope.ownerIds) where.push(`c."ownerId" IN (${scope.ownerIds.map(bind).join(", ")})`);
  if (scope.novelId) where.push(`c."novelId" = ${bind(scope.novelId)}`);
  if (scope.worldId) where.push(`c."worldId" = ${bind(scope.worldId)}`);
  for (const [key, values] of Object.entries(scope.facets ?? {})) {
    const normalized = [...new Set((values ?? []).map((value) => value.trim()).filter(Boolean))];
    if (!normalized.length) continue;
    const fn = provider === "postgresql" ? "strpos" : "instr";
    where.push(`(${normalized.map((value) => `${fn}(c."facetKeys", ${bind(`|${key}=${value}|`)}) > 0`).join(" OR ")})`);
  }
  const limit = Math.max(1, Math.min(1000, Math.floor(scope.limit) || 1));
  if (provider === "postgresql") {
    const match = bind([...new Set(terms)].join(" | "));
    const phrase = bind(terms.join(" "));
    const vector = `to_tsvector('simple', c."chunkText")`;
    return {
      sql: `SELECT c.* FROM "KnowledgeChunk" c
        WHERE ${where.join(" AND ")} AND ${vector} @@ to_tsquery('simple', ${match})
        ORDER BY (${vector} @@ phraseto_tsquery('simple', ${phrase})) DESC,
          ts_rank_cd(${vector}, to_tsquery('simple', ${match})) DESC,
          c."chunkOrder" ASC, c."id" ASC LIMIT ${bind(limit)}`,
      parameters,
    };
  }
  const match = bind([...new Set(terms)].map((term) => `"${term}"`).join(" OR "));
  const phrase = bind(`"${terms.join(" ")}"`);
  return {
    sql: `SELECT c.* FROM "KnowledgeChunkFts"
      JOIN "KnowledgeChunk" c ON c.rowid = "KnowledgeChunkFts".rowid
      WHERE ${where.join(" AND ")} AND "KnowledgeChunkFts" MATCH ${match}
      ORDER BY (c.rowid IN (SELECT rowid FROM "KnowledgeChunkFts" WHERE "KnowledgeChunkFts" MATCH ${phrase})) DESC,
        bm25("KnowledgeChunkFts") ASC, c."chunkOrder" ASC, c."id" ASC LIMIT ${bind(limit)}`,
    parameters,
  };
}

export async function searchKnowledgeKeywords(
  db: { $queryRawUnsafe<T>(sql: string, ...parameters: unknown[]): Promise<T> },
  provider: DatabaseProvider,
  query: string,
  scope: KnowledgeKeywordScope,
): Promise<KnowledgeChunk[]> {
  const statement = buildKnowledgeKeywordQuery(provider, query, scope);
  if (!statement) return [];
  // A missing migration is a deployment error. Never conceal it with the old
  // metadata/contains fallback or silently fabricate an empty successful search.
  return db.$queryRawUnsafe<KnowledgeChunk[]>(statement.sql, ...statement.parameters);
}

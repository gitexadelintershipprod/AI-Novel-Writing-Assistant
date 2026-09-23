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

/**
 * Capitalized names in a question are lexical evidence, not an intent guess.
 * Keyword order changes only when one of these names is much rarer in the
 * searched text than the next name, so a frequent title does not hide it.
 */
export function knowledgeQueryAnchors(query: string): string[] {
  const anchors: string[] = [];
  for (const match of query.normalize("NFC").matchAll(/\p{L}[\p{L}\p{M}\p{N}]*/gu)) {
    const raw = match[0];
    const lower = raw.toLocaleLowerCase("ka-GE");
    if (STOP_WORDS.has(lower) || !/^\p{Lu}\p{Ll}/u.test(raw)) continue;
    anchors.push(lower);
  }
  return [...new Set(anchors)].slice(0, 8);
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
  const anchors = knowledgeQueryAnchors(query);
  if (provider === "postgresql") {
    const match = bind([...new Set(terms)].join(" | "));
    const phrase = bind(terms.join(" "));
    const vector = `to_tsvector('simple', c."chunkText")`;
    const rank = [
      `(${vector} @@ phraseto_tsquery('simple', ${phrase})) DESC`,
      `ts_rank_cd(${vector}, to_tsquery('simple', ${match})) DESC`,
      `c."chunkOrder" ASC`,
      `c."id" ASC`,
    ];
    if (anchors.length < 2) {
      return {
        sql: `SELECT c.* FROM "KnowledgeChunk" c
          WHERE ${where.join(" AND ")} AND ${vector} @@ to_tsquery('simple', ${match})
          ORDER BY ${rank.join(", ")} LIMIT ${bind(limit)}`,
        parameters,
      };
    }
    const values = anchors.map((anchor) => `(${bind(anchor)})`).join(", ");
    const hitVector = `to_tsvector('simple', h."chunkText")`;
    return {
      sql: `WITH hits AS (
          SELECT c.* FROM "KnowledgeChunk" c
          WHERE ${where.join(" AND ")} AND ${vector} @@ to_tsquery('simple', ${match})
        ), anchor_df AS (
          SELECT v.term,
            COUNT(*) FILTER (WHERE to_tsvector('simple', h."chunkText") @@ plainto_tsquery('simple', v.term)) AS n
          FROM (VALUES ${values}) AS v(term)
          LEFT JOIN hits h ON true
          GROUP BY v.term
        ), rare AS (
          SELECT term FROM (
            SELECT term, n, lead(n) OVER (ORDER BY n ASC, term ASC) AS next_n
            FROM anchor_df
            WHERE n > 0
          ) ranked
          WHERE next_n IS NOT NULL AND n * 3 < next_n
          ORDER BY n ASC, term ASC
          LIMIT 1
        )
        SELECT h.* FROM hits h
        ORDER BY (CASE
          WHEN EXISTS (SELECT 1 FROM rare)
            AND ${hitVector} @@ plainto_tsquery('simple', (SELECT term FROM rare))
          THEN 1 ELSE 0 END) DESC,
          (${hitVector} @@ phraseto_tsquery('simple', ${phrase})) DESC,
          ts_rank_cd(${hitVector}, to_tsquery('simple', ${match})) DESC,
          h."chunkOrder" ASC, h."id" ASC
        LIMIT ${bind(limit)}`,
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

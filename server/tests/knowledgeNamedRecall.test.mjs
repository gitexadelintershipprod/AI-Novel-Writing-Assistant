import assert from "node:assert/strict";
import test from "node:test";
import {
  buildKnowledgeKeywordQuery,
  knowledgeQueryAnchors,
} from "../src/services/rag/knowledge-retrieval/index.ts";

const scope = { tenantId: "tenant", ownerIds: ["doc"], limit: 10 };

test("capitalized names are kept as lexical anchors", () => {
  assert.deepEqual(
    knowledgeQueryAnchors("Who is Gunner Jurgen to Commissar Ciaphas Cain?"),
    ["gunner", "jurgen", "commissar", "ciaphas", "cain"],
  );
  assert.deepEqual(knowledgeQueryAnchors("How do genestealers board a space hulk?"), []);
  assert.deepEqual(knowledgeQueryAnchors("იურგენი ვინ არის კეინისთვის?"), []);
});

test("keyword search prefers a name that is much rarer than the other names", () => {
  const named = buildKnowledgeKeywordQuery("postgresql", "Who is Gunner Jurgen to Commissar Ciaphas Cain?", scope);
  assert.ok(named);
  assert.match(named.sql, /n \* 3 < next_n/);
  assert.match(named.sql, /plainto_tsquery\('simple', \(SELECT term FROM rare\)\)/);
  for (const anchor of ["gunner", "jurgen", "commissar", "ciaphas", "cain"]) {
    assert.ok(named.parameters.includes(anchor));
  }
  const highest = Math.max(...[...named.sql.matchAll(/\$(\d+)/g)].map((match) => Number(match[1])));
  assert.equal(highest, named.parameters.length);

  const topical = buildKnowledgeKeywordQuery("postgresql", "How do genestealers board a space hulk?", scope);
  assert.ok(topical);
  assert.equal(topical.sql.includes("anchor_df"), false);
  assert.equal(topical.sql.includes("WITH hits"), false);
});

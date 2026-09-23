import assert from "node:assert/strict";
import test from "node:test";
import {
  buildKnowledgeKeywordQuery,
  knowledgeQueryAnchors,
  promoteNamedKeywordHit,
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

test("keyword search ranks passages that contain more of the asked names first", () => {
  const named = buildKnowledgeKeywordQuery("postgresql", "Who is Gunner Jurgen to Commissar Ciaphas Cain?", scope);
  assert.ok(named);
  assert.match(named.sql, /ORDER BY \(.*plainto_tsquery\('simple', \$\d+\).*\) DESC, /s);
  assert.ok(named.sql.indexOf("plainto_tsquery") < named.sql.indexOf("ts_rank_cd"));
  for (const anchor of ["gunner", "jurgen", "commissar", "ciaphas", "cain"]) {
    assert.ok(named.parameters.includes(anchor));
  }
  const highest = Math.max(...[...named.sql.matchAll(/\$(\d+)/g)].map((match) => Number(match[1])));
  assert.equal(highest, named.parameters.length);

  const topical = buildKnowledgeKeywordQuery("postgresql", "How do genestealers board a space hulk?", scope);
  assert.ok(topical);
  assert.equal(topical.sql.includes("plainto_tsquery"), false);
});

test("a name-bearing keyword passage moves ahead of a related passage that dropped a name", () => {
  const query = "Who is Gunner Jurgen to Commissar Ciaphas Cain?";
  const fused = [
    { id: "archive", chunkText: "The Cain Archive is an editorial note about Commissar Ciaphas Cain.", score: 0.032 },
    { id: "tau", chunkText: "What do you know of the greater good?", score: 0.031 },
  ];
  const keyword = [
    { id: "aide", chunkText: "My aide, Gunner First Class Ferik Jurgen, stood with Commissar Cain.", score: 0 },
  ];
  const promoted = promoteNamedKeywordHit(query, keyword, fused);
  assert.equal(promoted[0].id, "aide");
  assert.ok(promoted[0].score > fused[0].score);
  assert.deepEqual(promoted.map((item) => item.id), ["aide", "archive", "tau"]);

  const narrower = [{ id: "shout", chunkText: "Jurgen! Help the women, commissar.", score: 0 }];
  assert.equal(promoteNamedKeywordHit(query, narrower, fused)[0].id, "archive");
  assert.equal(promoteNamedKeywordHit("How do genestealers board a space hulk?", keyword, fused)[0].id, "archive");
  assert.equal(promoteNamedKeywordHit(query, [{ id: "aide", chunkText: "Gunner Jurgen, my aide.", score: 0.04 }], [{ id: "aide", chunkText: "Gunner Jurgen, my aide.", score: 0.04 }])[0].id, "aide");
});

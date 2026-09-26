import assert from "node:assert/strict";
import test from "node:test";
import {
  GRAPH_SECTION_CONCURRENCY,
  GRAPH_WRITE_BATCH_SIZE,
  graphWriteBatches,
} from "../src/services/rag/graph/graphSyncPace.ts";

test("relationship reading uses six sections and saves them in batches of forty", () => {
  assert.equal(GRAPH_SECTION_CONCURRENCY, 6);
  assert.equal(GRAPH_WRITE_BATCH_SIZE, 40);
  const batches = graphWriteBatches(Array.from({ length: 85 }, (_, index) => index));
  assert.deepEqual(batches.map((batch) => batch.length), [40, 40, 5]);
  assert.equal(graphWriteBatches([]).length, 0);
});

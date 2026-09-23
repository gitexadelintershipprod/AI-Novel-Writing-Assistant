import assert from "node:assert/strict";
import test from "node:test";
import {
  knowledgeDocumentJobPatch,
  knowledgeTaskTitle,
  selectVisibleJobs,
} from "../src/services/rag/jobs/knowledgeJobListing.ts";

test("a relationship job is titled with the book and stays ahead of finished work", () => {
  const running = [{
    id: "running",
    status: "running",
    title: knowledgeTaskTitle("graph_sync", "WarHammer 40K [codex] Tau"),
  }];
  const queued = [
    { id: "older", status: "queued", title: knowledgeTaskTitle("graph_sync", "Crossfire") },
    { id: "later", status: "queued", title: knowledgeTaskTitle("graph_sync", "Grimblades") },
  ];
  const finished = [{ id: "done", status: "succeeded", title: knowledgeTaskTitle("rebuild", "Cain") }];
  const visible = selectVisibleJobs(running, queued, finished, 2);

  assert.equal(visible[0].title, "Update book relationships: WarHammer 40K [codex] Tau");
  assert.equal(visible[1].id, "older");
  assert.equal(visible.some((job) => job.status === "succeeded"), false);
  assert.equal(knowledgeTaskTitle("rebuild", "Cain"), "Rebuild knowledge base index: Cain");
});

test("a finished relationship job marks relationships without changing the search index", () => {
  const graph = knowledgeDocumentJobPatch("graph_sync", "succeeded");
  assert.equal(graph.latestGraphStatus, "succeeded");
  assert.equal(graph.latestIndexStatus, undefined);
  assert.equal(graph.touchGraphTime, true);
  assert.equal(graph.touchIndexTime, false);

  const index = knowledgeDocumentJobPatch("rebuild", "succeeded");
  assert.equal(index.latestIndexStatus, "succeeded");
  assert.equal(index.latestGraphStatus, undefined);
  assert.equal(index.touchIndexTime, true);
  assert.equal(index.touchGraphTime, false);
});

import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";
import { createHash } from "node:crypto";
import {
  formatImportBytes, hashImportText, importFileKey, indexProgressPercent, MAX_IMPORT_FILES, MAX_IMPORT_FILE_BYTES,
  normalizeImportText, runImportSequence, toggleSelection, validateImportContent, validateImportFile,
} from "../src/pages/knowledge/imports/importFiles.ts";

test("bulk TXT validation rejects unsupported, empty and oversized files", () => {
  assert.equal(indexProgressPercent(0.15), 15);
  assert.equal(indexProgressPercent(1), 100);
  assert.equal(indexProgressPercent(NaN), 0);
  assert.equal(MAX_IMPORT_FILES, 1000);
  assert.equal(validateImportFile({ name: "book.TXT", size: MAX_IMPORT_FILE_BYTES }), null);
  for (const file of [{ name: "book.pdf", size: 100 }, { name: "empty.txt", size: 0 }, { name: "large.txt", size: MAX_IMPORT_FILE_BYTES + 1 }]) {
    assert.ok(validateImportFile(file));
  }
  assert.ok(validateImportContent(" \r\n\0 "));
  assert.ok(validateImportContent("ა".repeat(4 * 1024 * 1024)), "UTF-8 decoded byte size is checked before upload");
  assert.ok(validateImportContent("\u0001".repeat(4 * 1024 * 1024)), "JSON escaping can exceed the request limit even below the file size limit");
  assert.equal(validateImportContent("თავი პირველი\nქართული ტექსტი"), null);
  assert.equal(formatImportBytes(1024 * 1024), "1.0 MiB");
});

test("hashes match normalized server SHA-256 while idempotency includes the relative path", async () => {
  const content = "  თავი პირველი\r\nქართული\0 ტექსტი\rმეორე ხაზი  ";
  const normalized = "თავი პირველი\nქართული ტექსტი\nმეორე ხაზი";
  assert.equal(normalizeImportText(content), normalized);
  assert.equal(await hashImportText(content), createHash("sha256").update(normalized).digest("hex"));
  assert.equal(await hashImportText(content), await hashImportText(normalized));
  const hash = await hashImportText(content);
  assert.equal(await importFileKey("folder/sub/book.txt", hash), await importFileKey("folder/sub/book.txt", hash));
  assert.notEqual(await importFileKey("folder/sub/book.txt", hash), await importFileKey("other/book.txt", hash));
});

test("checkbox selections are immutable and explicitly control processing candidates", () => {
  const original = new Set();
  const one = toggleSelection(original, "1");
  const selected = toggleSelection(toggleSelection(one, "5"), "8");
  const ten = Array.from({ length: 10 }, (_, index) => String(index));
  assert.deepEqual(ten.filter((id) => selected.has(id)), ["1", "5", "8"]);
  assert.equal(original.size, 0);
  assert.deepEqual([...toggleSelection(selected, "5")], ["1", "8"]);
});

test("uploads execute sequentially and a pause lets the current file finish", async () => {
  let paused = false;
  let active = 0;
  let maxActive = 0;
  const completed = [];
  const remaining = await runImportSequence([1, 2, 3], () => paused, async (item) => {
    active += 1; maxActive = Math.max(active, maxActive);
    await Promise.resolve();
    paused = true;
    completed.push(item); active -= 1;
  });
  assert.equal(maxActive, 1);
  assert.deepEqual(completed, [1]);
  assert.deepEqual(remaining, [2, 3]);
  paused = false;
  assert.deepEqual(await runImportSequence(remaining, () => paused, async (item) => { completed.push(item); }), []);
  assert.deepEqual(completed, [1, 2, 3]);
});

test("one failed file does not repeat completed work in a failed-only retry", async () => {
  const files = [{ id: 1, status: "ready" }, { id: 2, status: "ready" }, { id: 3, status: "ready" }];
  const calls = [];
  await runImportSequence(files, () => false, async (file) => {
    calls.push(file.id);
    try { if (file.id === 2) throw new Error("network"); file.status = "stored"; }
    catch { file.status = "failed"; }
  });
  await runImportSequence(files.filter((file) => file.status === "failed"), () => false, async (file) => { calls.push(file.id); file.status = "stored"; });
  assert.deepEqual(calls, [1, 2, 3, 2]);
});

test("workspace exposes two separate steps, persists batch navigation and never queues during upload", () => {
  const source = fs.readFileSync(new URL("../src/pages/knowledge/imports/KnowledgeImportPage.tsx", import.meta.url), "utf8");
  const router = fs.readFileSync(new URL("../src/router/index.tsx", import.meta.url), "utf8");
  const entry = fs.readFileSync(new URL("../src/pages/knowledge/KnowledgePage.tsx", import.meta.url), "utf8");
  assert.match(router, /path: "knowledge\/imports"/);
  assert.match(entry, /to="\/knowledge\/imports">Bulk Import/);
  assert.match(source, /const \[selectedItems, setSelectedItems\] = useState\(new Set<string>\(\)\)/);
  assert.match(source, /params.get\("batch"\)/);
  assert.match(source, /Select all eligible \(all pages\)/);
  assert.match(source, /Pause uploads/);
  assert.match(source, /Pause processing/);
  assert.match(source, /Retry failed uploads/);
  assert.match(source, /Retry failed processing/);
  const upload = source.slice(source.indexOf("async function uploadSelection"), source.indexOf("async function action"));
  assert.match(upload, /uploadImportFile/);
  assert.doesNotMatch(upload, /queueImportItems|retryImportItems/);
  assert.doesNotMatch(source, /[\p{Script=Han}]/u);
});

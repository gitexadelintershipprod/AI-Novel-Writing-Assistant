import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const clientRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const repositoryRoot = path.resolve(clientRoot, "..");
const han = /[\p{Script=Han}]/u;

test("English-only i18n configuration ignores saved language preferences", () => {
  const source = fs.readFileSync(path.join(clientRoot, "src/i18n.ts"), "utf8");
  assert.match(source, /lng: "en"/);
  assert.match(source, /fallbackLng: "en"/);
  assert.match(source, /supportedLngs: \["en"\]/);
  assert.doesNotMatch(source, /localStorage/);
});

test("English UI catalog has English values and core domain labels", () => {
  const catalog = JSON.parse(fs.readFileSync(path.join(clientRoot, "src/locales/en/legacy-ui.json"), "utf8"));
  assert.equal(catalog["主角"], "Protagonist");
  assert.equal(catalog["已完成"], "Completed");
  assert.ok(Object.keys(catalog).length > 8_000);
  assert.deepEqual(Object.values(catalog).filter((value) => han.test(value)), []);
});

test("desktop startup, updater, and dialog sources contain no Chinese UI text", () => {
  const files = [
    "desktop/src/main.ts",
    "desktop/src/runtime/state.ts",
    "desktop/src/runtime/updater.ts",
    "desktop/src/uiMessages.ts",
  ];
  for (const relativePath of files) {
    const source = fs.readFileSync(path.join(repositoryRoot, relativePath), "utf8");
    assert.equal(han.test(source), false, `${relativePath} still contains Chinese UI text`);
  }
});

test("book positioning fields and knowledge task summaries use English source copy", () => {
  const englishOnlyFiles = [
    "client/src/pages/knowledge/components/KnowledgeLibraryOverview.tsx",
    "client/src/pages/knowledge/components/KnowledgeDocumentDetailDialog.tsx",
    "client/src/pages/knowledge/components/knowledgeRagUi.ts",
    "client/src/pages/novels/components/basicInfoForm/BookPositioningStudio.tsx",
    "client/src/pages/novels/components/basicInfoForm/BookFramingSection.tsx",
    "server/src/services/task/adapters/KnowledgeTaskAdapter.ts",
    "server/src/services/knowledge/KnowledgeService.ts",
    "server/src/services/rag/RagWorker.ts",
  ];
  for (const relativePath of englishOnlyFiles) {
    const source = fs.readFileSync(path.join(repositoryRoot, relativePath), "utf8");
    assert.equal(han.test(source), false, `${relativePath} still contains Chinese UI text`);
  }

  const ragIndexSource = fs.readFileSync(
    path.join(repositoryRoot, "server/src/services/rag/RagIndexService.ts"),
    "utf8",
  );
  for (const legacyLabel of ["读取文档", "切分分块", "生成向量", "校验集合", "清理旧索引", "写入向量库", "索引完成"]) {
    assert.equal(ragIndexSource.includes(`label: "${legacyLabel}"`), false, `RAG progress label remains Chinese: ${legacyLabel}`);
  }
});

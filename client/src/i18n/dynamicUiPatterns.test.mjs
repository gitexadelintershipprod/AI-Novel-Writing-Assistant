import assert from "node:assert/strict";
import test from "node:test";
import { translateDynamicUiText } from "./dynamicUiPatterns.ts";

test("translates dynamic onboarding and settings UI without changing domain values", () => {
  assert.equal(
    translateDynamicUiText("还有 11 类创作任务没有可用模型路由。"),
    "There are 11 authoring task types with no available model route.",
  );
  assert.equal(translateDynamicUiText("第 1 步 / 共 5 步"), "Step 1 of 5");
  assert.equal(translateDynamicUiText("未配置 DeepSeek 的 API Key。"), "DeepSeek API Key is not configured.");
  assert.equal(
    translateDynamicUiText("Ollama · llama3.2 · 0 条任务路由"),
    "Ollama · llama3.2 · 0 task routes",
  );
  assert.equal(
    translateDynamicUiText("当前触发时仍会暂停等待处理。"),
    "The task will still pause for review when triggered.",
  );
});

test("translates dynamic market and prompt counters", () => {
  assert.equal(
    translateDynamicUiText("已选择 45 本作品，可在各榜单右上角全选或逐本调整。"),
    "45 works selected. Use each ranking's top-right control to select all or adjust individually.",
  );
  assert.equal(translateDynamicUiText("开始 AI 分析（45 本）"), "Start AI analysis (45 works)");
  assert.equal(translateDynamicUiText("162 个提示词"), "162 prompts");
  assert.equal(translateDynamicUiText("7 个槽位"), "7 slots");
});

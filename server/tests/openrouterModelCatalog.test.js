const test = require("node:test");
const assert = require("node:assert/strict");
const { PROVIDERS } = require("../dist/llm/providers.js");
const { getProviderModels, refreshProviderModels } = require("../dist/llm/modelCatalog.js");
const { resolveLLMClientOptions, setProviderSecretCache } = require("../dist/llm/factory.js");
const { secretStore } = require("../dist/services/settings/secretStore/index.js");
const { prisma } = require("../dist/db/prisma.js");
const {
  LEGACY_CHAT_PROVIDER_RETIREMENT_KEY,
  retireLegacyDirectChatProviders,
} = require("../dist/services/settings/LegacyChatProviderRetirementService.js");

const OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1";

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

test("openrouter has no static model list", () => {
  assert.equal(PROVIDERS.openrouter.name, "OpenRouter");
  assert.equal(PROVIDERS.openrouter.baseURL, OPENROUTER_BASE_URL);
  assert.equal(PROVIDERS.openrouter.defaultModel, "");
  assert.deepEqual(PROVIDERS.openrouter.models, []);
});

test("openrouter model lists follow the API key and do not replace a rejected key", async () => {
  const originalFetch = global.fetch;
  const calls = [];

  global.fetch = async (url, init) => {
    const target = String(url);
    calls.push(target);
    const authorization = init?.headers?.Authorization ?? "";
    if (authorization.endsWith("bad-key")) {
      return new Response("unauthorized", { status: 401 });
    }
    if (target.includes("/models/user") && authorization.endsWith("limited-key")) {
      return new Response("forbidden", { status: 403 });
    }
    if (target.includes("/models/user")) {
      const id = authorization.endsWith("key-one") ? "alpha/model" : "beta/model";
      return jsonResponse({ data: [{ id }] });
    }
    return jsonResponse({ data: [{ id: "public/model" }] });
  };

  try {
    const first = await getProviderModels("openrouter", {
      apiKey: "key-one",
      baseURL: OPENROUTER_BASE_URL,
      includeBuiltInFallback: false,
    });
    const second = await getProviderModels("openrouter", {
      apiKey: "key-two",
      baseURL: OPENROUTER_BASE_URL,
      includeBuiltInFallback: false,
    });
    const firstAgain = await getProviderModels("openrouter", {
      apiKey: "key-one",
      baseURL: OPENROUTER_BASE_URL,
      includeBuiltInFallback: false,
    });
    assert.deepEqual(first, ["alpha/model"]);
    assert.deepEqual(second, ["beta/model"]);
    assert.deepEqual(firstAgain, ["alpha/model"]);
    assert.equal(calls.length, 2);
    assert.ok(calls.every((url) => url.includes("/models/user")));

    const limited = await refreshProviderModels("openrouter", "limited-key", OPENROUTER_BASE_URL);
    assert.deepEqual(limited, ["public/model"]);
    assert.ok(calls.some((url) => url.includes("/models?") && !url.includes("/models/user")));

    const rejectedCalls = calls.length;
    await assert.rejects(
      () => refreshProviderModels("openrouter", "bad-key", OPENROUTER_BASE_URL),
      /API key was rejected/,
    );
    assert.equal(calls.length, rejectedCalls + 1);
    assert.match(calls.at(-1), /\/models\/user/);
  } finally {
    global.fetch = originalFetch;
  }
});

test("unconfigured DeepSeek calls use the saved OpenRouter model", async () => {
  const originalGetProvider = secretStore.getProvider;
  secretStore.getProvider = async (provider) => {
    if (provider !== "openrouter") {
      return null;
    }
    return {
      provider,
      key: "or-key",
      model: "openai/gpt-test",
      baseURL: OPENROUTER_BASE_URL,
      isActive: true,
      displayName: "OpenRouter",
      reasoningEnabled: true,
      concurrencyLimit: 0,
      requestIntervalMs: 0,
    };
  };
  setProviderSecretCache("deepseek", null);
  setProviderSecretCache("openrouter", null);

  try {
    const resolved = await resolveLLMClientOptions("deepseek", {
      model: "deepseek-v4-flash",
      apiKey: "deepseek-key",
      baseURL: "https://api.deepseek.com/v1",
      executionMode: "structured",
      structuredStrategy: "json_object",
    });
    assert.equal(resolved.provider, "openrouter");
    assert.equal(resolved.model, "openai/gpt-test");
    assert.equal(resolved.apiKey, "or-key");
    assert.equal(resolved.baseURL, OPENROUTER_BASE_URL);
    assert.equal(resolved.modelKwargs?.reasoning?.enabled, false);
    assert.equal(resolved.modelKwargs?.thinking, undefined);
  } finally {
    secretStore.getProvider = originalGetProvider;
    setProviderSecretCache("deepseek", null);
    setProviderSecretCache("openrouter", null);
  }
});

test("a configured DeepSeek connection keeps its own model", async () => {
  setProviderSecretCache("deepseek", {
    key: "ds-key",
    model: "deepseek-v4-flash",
    baseURL: "https://api.deepseek.com/v1",
    reasoningEnabled: true,
  });

  try {
    const resolved = await resolveLLMClientOptions("deepseek", {
      model: "deepseek-v4-flash",
      executionMode: "structured",
      structuredStrategy: "json_object",
    });
    assert.equal(resolved.provider, "deepseek");
    assert.equal(resolved.model, "deepseek-v4-flash");
    assert.deepEqual(resolved.modelKwargs?.thinking, { type: "disabled" });
  } finally {
    setProviderSecretCache("deepseek", null);
  }
});

test("unconfigured DeepSeek fails clearly until OpenRouter has a saved model", async () => {
  const originalGetProvider = secretStore.getProvider;
  secretStore.getProvider = async () => null;
  setProviderSecretCache("deepseek", null);
  setProviderSecretCache("openrouter", null);

  try {
    await assert.rejects(
      () => resolveLLMClientOptions("deepseek", {
        model: "deepseek-v4-flash",
        apiKey: "deepseek-key",
      }),
      /no longer connected/,
    );
  } finally {
    secretStore.getProvider = originalGetProvider;
  }
});

test("legacy chat retirement removes DeepSeek and Ollama once and leaves embeddings", async () => {
  const originalFindUnique = prisma.appSetting.findUnique;
  const originalDelete = prisma.appSetting.delete;
  const originalDeleteMany = prisma.appSetting.deleteMany;
  const originalUpsert = prisma.appSetting.upsert;
  const originalApiDeleteMany = prisma.aPIKey.deleteMany;
  const originalRouteDeleteMany = prisma.modelRouteConfig.deleteMany;
  const originalTransaction = prisma.$transaction;
  const removedProviders = [];
  const settings = new Map([
    ["llm.currentSelection", JSON.stringify({ provider: "deepseek", model: "deepseek-v4-flash", temperature: 0.7 })],
    ["structuredFallback.provider", "deepseek"],
    ["structuredFallback.model", "deepseek-chat"],
    ["rag.embeddingProvider", "openai"],
    ["rag.embeddingModel", "text-embedding-3-small"],
  ]);
  let flag = null;

  prisma.$transaction = async (callback) => callback(prisma);
  prisma.appSetting.findUnique = async ({ where }) => {
    if (where.key === LEGACY_CHAT_PROVIDER_RETIREMENT_KEY) {
      return flag ? { key: where.key, value: flag } : null;
    }
    const value = settings.get(where.key);
    return value == null ? null : { key: where.key, value };
  };
  prisma.appSetting.delete = async ({ where }) => {
    settings.delete(where.key);
    return { key: where.key, value: "" };
  };
  prisma.appSetting.deleteMany = async ({ where }) => {
    for (const key of where.key.in) {
      settings.delete(key);
    }
    return { count: where.key.in.length };
  };
  prisma.appSetting.upsert = async ({ where, create }) => {
    flag = create.value;
    return { key: where.key, value: create.value };
  };
  prisma.aPIKey.deleteMany = async ({ where }) => {
    removedProviders.push(...where.provider.in);
    return { count: where.provider.in.length };
  };
  prisma.modelRouteConfig.deleteMany = async ({ where }) => {
    removedProviders.push(`routes:${where.provider.in.join(",")}`);
    return { count: 1 };
  };

  try {
    const first = await retireLegacyDirectChatProviders();
    assert.equal(first.retiredProviders, true);
    assert.deepEqual(removedProviders.slice(0, 2), ["deepseek", "ollama"]);
    assert.equal(settings.has("llm.currentSelection"), false);
    assert.equal(settings.has("structuredFallback.provider"), false);
    assert.equal(settings.has("structuredFallback.model"), false);
    assert.equal(settings.get("rag.embeddingProvider"), "openai");
    assert.equal(settings.get("rag.embeddingModel"), "text-embedding-3-small");

    const removedCount = removedProviders.length;
    const second = await retireLegacyDirectChatProviders();
    assert.equal(second.retiredProviders, false);
    assert.equal(removedProviders.length, removedCount);
  } finally {
    prisma.$transaction = originalTransaction;
    prisma.appSetting.findUnique = originalFindUnique;
    prisma.appSetting.delete = originalDelete;
    prisma.appSetting.deleteMany = originalDeleteMany;
    prisma.appSetting.upsert = originalUpsert;
    prisma.aPIKey.deleteMany = originalApiDeleteMany;
    prisma.modelRouteConfig.deleteMany = originalRouteDeleteMany;
  }
});

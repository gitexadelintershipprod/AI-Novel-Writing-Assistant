import { createHash } from "node:crypto";
import type { LLMProvider } from "@ai-novel/shared/types/llm";
import {
  isBuiltInProvider,
  isOpenRouterBaseUrl,
  providerRequiresApiKey,
  PROVIDERS,
  resolveProviderBaseUrl,
} from "./providers";

interface ModelCacheItem {
  models: string[];
  cachedAt: number;
}

interface GetProviderModelsOptions {
  apiKey?: string;
  baseURL?: string;
  forceRefresh?: boolean;
  allowAnonymous?: boolean;
  fallbackModel?: string;
  fallbackModels?: string[];
  includeBuiltInFallback?: boolean;
}

const MODEL_CACHE_TTL_MS = 30 * 60 * 1000;
const DEFAULT_FETCH_TIMEOUT_MS = 10_000;
const OPENROUTER_FETCH_TIMEOUT_MS = 20_000;
const modelCache = new Map<string, ModelCacheItem>();

class ModelCatalogRequestError extends Error {
  readonly statusCode: number;

  constructor(statusCode: number, message: string) {
    super(message);
    this.name = "ModelCatalogRequestError";
    this.statusCode = statusCode;
  }
}

function uniqueModels(models: string[]): string[] {
  return Array.from(new Set(models.map((item) => item.trim()).filter(Boolean)));
}

function getFallbackModels(provider: LLMProvider, options: GetProviderModelsOptions = {}): string[] {
  const builtInModels = options.includeBuiltInFallback === false
    ? []
    : isBuiltInProvider(provider) ? PROVIDERS[provider].models : [];
  return uniqueModels([
    ...builtInModels,
    ...(options.fallbackModels ?? []),
    options.fallbackModel ?? "",
  ]);
}

function fingerprintApiKey(apiKey?: string): string {
  const trimmed = apiKey?.trim();
  if (!trimmed) {
    return "anonymous";
  }
  return createHash("sha256").update(trimmed).digest("hex").slice(0, 16);
}

function getCacheKey(provider: LLMProvider, baseURL?: string, apiKey?: string): string {
  const resolvedBaseURL = resolveProviderBaseUrl(provider, baseURL, baseURL) ?? "";
  return `${provider}::${resolvedBaseURL}::${fingerprintApiKey(apiKey)}`;
}

function getCachedModels(provider: LLMProvider, baseURL?: string, apiKey?: string): string[] | undefined {
  const cacheKey = getCacheKey(provider, baseURL, apiKey);
  const item = modelCache.get(cacheKey);
  if (!item) {
    return undefined;
  }
  const expired = Date.now() - item.cachedAt > MODEL_CACHE_TTL_MS;
  if (expired) {
    modelCache.delete(cacheKey);
    return undefined;
  }
  return item.models;
}

function setCachedModels(provider: LLMProvider, models: string[], baseURL?: string, apiKey?: string): string[] {
  const normalized = uniqueModels(models);
  modelCache.set(getCacheKey(provider, baseURL, apiKey), {
    models: normalized,
    cachedAt: Date.now(),
  });
  return normalized;
}

function parseModelIds(payload: unknown): string[] {
  if (!payload || typeof payload !== "object") {
    return [];
  }
  const data = (payload as { data?: unknown; models?: unknown }).data ?? (payload as { models?: unknown }).models;
  if (!Array.isArray(data)) {
    return [];
  }
  return data
    .map((item) => {
      if (!item || typeof item !== "object") {
        return "";
      }
      const candidate = (item as { id?: unknown; model?: unknown; name?: unknown }).id
        ?? (item as { model?: unknown }).model
        ?? (item as { name?: unknown }).name;
      return typeof candidate === "string" ? candidate : "";
    })
    .filter(Boolean);
}

async function fetchJson(url: string, init: RequestInit, timeoutMs = DEFAULT_FETCH_TIMEOUT_MS): Promise<unknown> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...init,
      signal: controller.signal,
    });

    if (!response.ok) {
      const detail = await response.text();
      throw new ModelCatalogRequestError(
        response.status,
        `Failed to fetch the model list (${response.status}): ${detail || "unknown error"}`,
      );
    }

    return response.json();
  } finally {
    clearTimeout(timer);
  }
}

function isOpenRouterRequest(provider: LLMProvider, baseURL: string): boolean {
  return provider === "openrouter" || isOpenRouterBaseUrl(baseURL);
}

async function readOpenRouterModelIds(url: string, apiKey: string): Promise<string[]> {
  const payload = await fetchJson(url, {
    method: "GET",
    headers: buildHeaders("openrouter", apiKey),
  }, OPENROUTER_FETCH_TIMEOUT_MS);
  return parseModelIds(payload);
}

async function fetchOpenRouterModels(baseURL: string, apiKey: string): Promise<string[]> {
  const normalizedKey = apiKey.trim();
  if (!normalizedKey) {
    throw new Error("Failed to fetch the OpenRouter model list: an API key is required.");
  }

  const root = baseURL.replace(/\/+$/, "");
  try {
    const models = await readOpenRouterModelIds(
      `${root}/models/user?output_modalities=text`,
      normalizedKey,
    );
    if (models.length === 0) {
      throw new Error("The model list is empty.");
    }
    return models;
  } catch (error) {
    if (error instanceof ModelCatalogRequestError && error.statusCode === 401) {
      throw new Error("Failed to fetch the OpenRouter model list: the API key was rejected.");
    }
    if (!(error instanceof ModelCatalogRequestError) || error.statusCode !== 403) {
      throw error;
    }
  }

  let models: string[];
  try {
    models = await readOpenRouterModelIds(
      `${root}/models?output_modalities=text`,
      normalizedKey,
    );
  } catch (error) {
    if (error instanceof ModelCatalogRequestError && error.statusCode === 401) {
      throw new Error("Failed to fetch the OpenRouter model list: the API key was rejected.");
    }
    throw error;
  }
  if (models.length === 0) {
    throw new Error("The model list is empty.");
  }
  return models;
}

function buildHeaders(provider: LLMProvider, apiKey?: string): Record<string, string> {
  const headers: Record<string, string> = {
    Accept: "application/json",
  };

  if (!apiKey) {
    return headers;
  }

  if (provider === "anthropic") {
    headers["x-api-key"] = apiKey;
    headers["anthropic-version"] = process.env.ANTHROPIC_VERSION ?? "2023-06-01";
    return headers;
  }

  headers.Authorization = `Bearer ${apiKey}`;
  return headers;
}

async function fetchOllamaModels(baseURL: string): Promise<string[]> {
  const nativeBaseURL = baseURL.endsWith("/v1") ? baseURL.slice(0, -3) : baseURL;

  try {
    const payload = await fetchJson(`${nativeBaseURL}/api/tags`, {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
    });
    const models = parseModelIds(payload);
    if (models.length > 0) {
      return models;
    }
  } catch {
    // Fall back to the OpenAI-compatible models endpoint.
  }

  const payload = await fetchJson(`${baseURL}/models`, {
    method: "GET",
    headers: {
      Accept: "application/json",
    },
  });
  const models = parseModelIds(payload);
  if (models.length === 0) {
    throw new Error("The model list is empty.");
  }
  return models;
}

async function fetchProviderModels(
  provider: LLMProvider,
  apiKey?: string,
  customBaseURL?: string,
): Promise<string[]> {
  const baseURL = resolveProviderBaseUrl(provider, customBaseURL, customBaseURL);
  if (!baseURL) {
    throw new Error("No usable API URL is configured.");
  }
  if (provider === "ollama") {
    return fetchOllamaModels(baseURL);
  }
  if (isOpenRouterRequest(provider, baseURL)) {
    return fetchOpenRouterModels(baseURL, apiKey ?? "");
  }

  const payload = await fetchJson(`${baseURL}/models`, {
    method: "GET",
    headers: buildHeaders(provider, apiKey),
  });

  const models = parseModelIds(payload);
  if (models.length === 0) {
    throw new Error("The model list is empty.");
  }
  return models;
}

export async function getProviderModels(
  provider: LLMProvider,
  options: GetProviderModelsOptions = {},
): Promise<string[]> {
  const fallback = getFallbackModels(provider, options);
  if (!options.forceRefresh) {
    const cached = getCachedModels(provider, options.baseURL, options.apiKey);
    if (cached && cached.length > 0) {
      return cached;
    }
  }

  const normalizedApiKey = options.apiKey?.trim();
  const allowAnonymous = options.allowAnonymous ?? !providerRequiresApiKey(provider);
  const canFetchRemotely = normalizedApiKey || allowAnonymous;
  if (!canFetchRemotely) {
    return fallback;
  }

  try {
    const models = await fetchProviderModels(provider, normalizedApiKey, options.baseURL);
    return models.length > 0 ? setCachedModels(provider, models, options.baseURL, normalizedApiKey) : fallback;
  } catch {
    const cached = getCachedModels(provider, options.baseURL, options.apiKey);
    if (cached && cached.length > 0) {
      return cached;
    }
    return fallback;
  }
}

export async function refreshProviderModels(
  provider: LLMProvider,
  apiKey?: string,
  baseURL?: string,
): Promise<string[]> {
  const models = await fetchProviderModels(provider, apiKey?.trim(), baseURL);
  return setCachedModels(provider, models, baseURL, apiKey);
}

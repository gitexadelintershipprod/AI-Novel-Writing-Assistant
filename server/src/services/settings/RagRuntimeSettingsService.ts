import { ragConfig } from "../../config/rag";
import { prisma } from "../../db/prisma";
import { isMissingTableError, normalizeOptionalText } from "./ragLegacyCompatibility";
import {
  CHUNK_OVERLAP_WORDS_KEY,
  CHUNK_WORD_SIZE_KEY,
  FINAL_TOP_K_KEY,
  GRAPH_ENABLED_KEY,
  HTTP_TIMEOUT_MS_KEY,
  KEYWORD_CANDIDATES_KEY,
  NEO4J_PASSWORD_KEY,
  NEO4J_TIMEOUT_MS_KEY,
  NEO4J_URI_KEY,
  NEO4J_USER_KEY,
  QDRANT_API_KEY_KEY,
  QDRANT_TIMEOUT_MS_KEY,
  QDRANT_UPSERT_CONCURRENCY_KEY,
  QDRANT_UPSERT_MAX_BYTES_KEY,
  QDRANT_URL_KEY,
  RAG_ENABLED_KEY,
  RAG_RUNTIME_SETTING_KEYS,
  VECTOR_CANDIDATES_KEY,
  WORKER_MAX_ATTEMPTS_KEY,
  WORKER_POLL_MS_KEY,
  WORKER_RETRY_BASE_MS_KEY,
} from "./ragSettingKeys";

const INITIAL_RAG_RUNTIME_DEFAULTS = {
  enabled: ragConfig.enabled,
  qdrantUrl: ragConfig.qdrantUrl,
  qdrantApiKey: ragConfig.qdrantApiKey,
  qdrantTimeoutMs: ragConfig.qdrantTimeoutMs,
  qdrantUpsertMaxBytes: ragConfig.qdrantUpsertMaxBytes,
  qdrantUpsertConcurrency: ragConfig.qdrantUpsertConcurrency,
  chunkWordSize: ragConfig.chunkWordSize,
  chunkOverlapWords: ragConfig.chunkOverlapWords,
  graphEnabled: ragConfig.graphEnabled,
  neo4jUri: ragConfig.neo4jUri,
  neo4jUser: ragConfig.neo4jUser,
  neo4jPassword: ragConfig.neo4jPassword,
  neo4jTimeoutMs: ragConfig.neo4jTimeoutMs,
  vectorCandidates: ragConfig.vectorCandidates,
  keywordCandidates: ragConfig.keywordCandidates,
  finalTopK: ragConfig.finalTopK,
  workerPollMs: ragConfig.workerPollMs,
  workerMaxAttempts: ragConfig.workerMaxAttempts,
  workerRetryBaseMs: ragConfig.workerRetryBaseMs,
  httpTimeoutMs: ragConfig.httpTimeoutMs,
} as const;

export interface RagRuntimeSettings {
  enabled: boolean;
  qdrantUrl: string;
  qdrantApiKeyConfigured: boolean;
  qdrantTimeoutMs: number;
  qdrantUpsertMaxBytes: number;
  qdrantUpsertConcurrency: number;
  chunkWordSize: number;
  chunkOverlapWords: number;
  graphEnabled: boolean;
  neo4jUri: string;
  neo4jUser: string;
  neo4jPasswordConfigured: boolean;
  neo4jTimeoutMs: number;
  vectorCandidates: number;
  keywordCandidates: number;
  finalTopK: number;
  workerPollMs: number;
  workerMaxAttempts: number;
  workerRetryBaseMs: number;
  httpTimeoutMs: number;
}

export interface RagRuntimeSettingsInput {
  enabled: boolean;
  qdrantUrl: string;
  qdrantApiKey?: string;
  clearQdrantApiKey?: boolean;
  qdrantTimeoutMs: number;
  qdrantUpsertMaxBytes: number;
  qdrantUpsertConcurrency: number;
  chunkWordSize: number;
  chunkOverlapWords: number;
  graphEnabled: boolean;
  neo4jUri: string;
  neo4jUser?: string;
  neo4jPassword?: string;
  clearNeo4jPassword?: boolean;
  neo4jTimeoutMs: number;
  vectorCandidates: number;
  keywordCandidates: number;
  finalTopK: number;
  workerPollMs: number;
  workerMaxAttempts: number;
  workerRetryBaseMs: number;
  httpTimeoutMs: number;
}

export interface SaveRagRuntimeSettingsResult {
  settings: RagRuntimeSettings;
  connectionChanged: boolean;
  chunkingChanged: boolean;
  shouldReindex: boolean;
}

function normalizeUrl(value: string | undefined, fallback: string): string {
  const normalized = normalizeOptionalText(value) ?? normalizeOptionalText(fallback) ?? INITIAL_RAG_RUNTIME_DEFAULTS.qdrantUrl;
  return normalized.replace(/\/+$/, "");
}

function toBoolean(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined) {
    return fallback;
  }
  const normalized = value.trim().toLowerCase();
  return !["0", "false", "off", "no"].includes(normalized);
}

function clampInt(value: number, fallback: number, min: number, max: number): number {
  if (!Number.isFinite(value)) {
    return fallback;
  }
  return Math.max(min, Math.min(max, Math.floor(value)));
}

function applyRagRuntimeSettings(
  settings: Omit<RagRuntimeSettings, "qdrantApiKeyConfigured" | "neo4jPasswordConfigured">,
  secrets: { qdrantApiKey: string; neo4jPassword: string },
): RagRuntimeSettings {
  ragConfig.enabled = settings.enabled;
  ragConfig.qdrantUrl = settings.qdrantUrl;
  ragConfig.qdrantApiKey = secrets.qdrantApiKey;
  ragConfig.qdrantTimeoutMs = settings.qdrantTimeoutMs;
  ragConfig.qdrantUpsertMaxBytes = settings.qdrantUpsertMaxBytes;
  ragConfig.qdrantUpsertConcurrency = settings.qdrantUpsertConcurrency;
  ragConfig.chunkWordSize = settings.chunkWordSize;
  ragConfig.chunkOverlapWords = settings.chunkOverlapWords;
  ragConfig.graphEnabled = settings.graphEnabled;
  ragConfig.neo4jUri = settings.neo4jUri;
  ragConfig.neo4jUser = settings.neo4jUser;
  ragConfig.neo4jPassword = secrets.neo4jPassword;
  ragConfig.neo4jTimeoutMs = settings.neo4jTimeoutMs;
  ragConfig.vectorCandidates = settings.vectorCandidates;
  ragConfig.keywordCandidates = settings.keywordCandidates;
  ragConfig.finalTopK = settings.finalTopK;
  ragConfig.workerPollMs = settings.workerPollMs;
  ragConfig.workerMaxAttempts = settings.workerMaxAttempts;
  ragConfig.workerRetryBaseMs = settings.workerRetryBaseMs;
  ragConfig.httpTimeoutMs = settings.httpTimeoutMs;

  return {
    ...settings,
    qdrantApiKeyConfigured: Boolean(secrets.qdrantApiKey),
    neo4jPasswordConfigured: Boolean(secrets.neo4jPassword),
  };
}

function getDefaultSettings(): Omit<RagRuntimeSettings, "qdrantApiKeyConfigured" | "neo4jPasswordConfigured"> {
  return {
    enabled: INITIAL_RAG_RUNTIME_DEFAULTS.enabled,
    qdrantUrl: normalizeUrl(INITIAL_RAG_RUNTIME_DEFAULTS.qdrantUrl, INITIAL_RAG_RUNTIME_DEFAULTS.qdrantUrl),
    qdrantTimeoutMs: clampInt(INITIAL_RAG_RUNTIME_DEFAULTS.qdrantTimeoutMs, 30000, 1000, 300000),
    qdrantUpsertMaxBytes: clampInt(INITIAL_RAG_RUNTIME_DEFAULTS.qdrantUpsertMaxBytes, 24 * 1024 * 1024, 1024 * 1024, 64 * 1024 * 1024),
    qdrantUpsertConcurrency: clampInt(INITIAL_RAG_RUNTIME_DEFAULTS.qdrantUpsertConcurrency, 3, 1, 16),
    chunkWordSize: clampInt(INITIAL_RAG_RUNTIME_DEFAULTS.chunkWordSize, 320, 80, 800),
    chunkOverlapWords: clampInt(INITIAL_RAG_RUNTIME_DEFAULTS.chunkOverlapWords, 40, 0, 200),
    graphEnabled: INITIAL_RAG_RUNTIME_DEFAULTS.graphEnabled,
    neo4jUri: normalizeOptionalText(INITIAL_RAG_RUNTIME_DEFAULTS.neo4jUri) ?? "bolt://neo4j:7687",
    neo4jUser: normalizeOptionalText(INITIAL_RAG_RUNTIME_DEFAULTS.neo4jUser) ?? "neo4j",
    neo4jTimeoutMs: clampInt(INITIAL_RAG_RUNTIME_DEFAULTS.neo4jTimeoutMs, 15000, 1000, 120000),
    vectorCandidates: clampInt(INITIAL_RAG_RUNTIME_DEFAULTS.vectorCandidates, 40, 1, 200),
    keywordCandidates: clampInt(INITIAL_RAG_RUNTIME_DEFAULTS.keywordCandidates, 40, 1, 200),
    finalTopK: clampInt(INITIAL_RAG_RUNTIME_DEFAULTS.finalTopK, 8, 1, 50),
    workerPollMs: clampInt(INITIAL_RAG_RUNTIME_DEFAULTS.workerPollMs, 2500, 200, 60000),
    workerMaxAttempts: clampInt(INITIAL_RAG_RUNTIME_DEFAULTS.workerMaxAttempts, 5, 1, 20),
    workerRetryBaseMs: clampInt(INITIAL_RAG_RUNTIME_DEFAULTS.workerRetryBaseMs, 5000, 1000, 300000),
    httpTimeoutMs: clampInt(INITIAL_RAG_RUNTIME_DEFAULTS.httpTimeoutMs, 30000, 1000, 300000),
  };
}

async function getValueMap(): Promise<Map<string, string>> {
  const records = await prisma.appSetting.findMany({
    where: {
      key: {
        in: [...RAG_RUNTIME_SETTING_KEYS],
      },
    },
  });
  return new Map(records.map((item) => [item.key, item.value]));
}

function defaultSecrets() {
  return {
    qdrantApiKey: normalizeOptionalText(INITIAL_RAG_RUNTIME_DEFAULTS.qdrantApiKey) ?? "",
    neo4jPassword: normalizeOptionalText(INITIAL_RAG_RUNTIME_DEFAULTS.neo4jPassword) ?? "",
  };
}

export async function getRagRuntimeSettings(): Promise<RagRuntimeSettings> {
  const defaults = getDefaultSettings();
  try {
    const valueMap = await getValueMap();
    const qdrantApiKey = normalizeOptionalText(valueMap.get(QDRANT_API_KEY_KEY))
      ?? defaultSecrets().qdrantApiKey;
    const neo4jPassword = normalizeOptionalText(valueMap.get(NEO4J_PASSWORD_KEY))
      ?? defaultSecrets().neo4jPassword;

    return applyRagRuntimeSettings({
      enabled: toBoolean(valueMap.get(RAG_ENABLED_KEY), defaults.enabled),
      qdrantUrl: normalizeUrl(valueMap.get(QDRANT_URL_KEY), defaults.qdrantUrl),
      qdrantTimeoutMs: clampInt(
        Number(valueMap.get(QDRANT_TIMEOUT_MS_KEY)),
        defaults.qdrantTimeoutMs,
        1000,
        300000,
      ),
      qdrantUpsertMaxBytes: clampInt(
        Number(valueMap.get(QDRANT_UPSERT_MAX_BYTES_KEY)),
        defaults.qdrantUpsertMaxBytes,
        1024 * 1024,
        64 * 1024 * 1024,
      ),
      qdrantUpsertConcurrency: clampInt(
        Number(valueMap.get(QDRANT_UPSERT_CONCURRENCY_KEY)),
        defaults.qdrantUpsertConcurrency,
        1,
        16,
      ),
      chunkWordSize: clampInt(Number(valueMap.get(CHUNK_WORD_SIZE_KEY)), defaults.chunkWordSize, 80, 800),
      chunkOverlapWords: clampInt(Number(valueMap.get(CHUNK_OVERLAP_WORDS_KEY)), defaults.chunkOverlapWords, 0, 200),
      graphEnabled: toBoolean(valueMap.get(GRAPH_ENABLED_KEY), defaults.graphEnabled),
      neo4jUri: normalizeOptionalText(valueMap.get(NEO4J_URI_KEY)) ?? defaults.neo4jUri,
      neo4jUser: normalizeOptionalText(valueMap.get(NEO4J_USER_KEY)) ?? defaults.neo4jUser,
      neo4jTimeoutMs: clampInt(Number(valueMap.get(NEO4J_TIMEOUT_MS_KEY)), defaults.neo4jTimeoutMs, 1000, 120000),
      vectorCandidates: clampInt(Number(valueMap.get(VECTOR_CANDIDATES_KEY)), defaults.vectorCandidates, 1, 200),
      keywordCandidates: clampInt(Number(valueMap.get(KEYWORD_CANDIDATES_KEY)), defaults.keywordCandidates, 1, 200),
      finalTopK: clampInt(Number(valueMap.get(FINAL_TOP_K_KEY)), defaults.finalTopK, 1, 50),
      workerPollMs: clampInt(Number(valueMap.get(WORKER_POLL_MS_KEY)), defaults.workerPollMs, 200, 60000),
      workerMaxAttempts: clampInt(Number(valueMap.get(WORKER_MAX_ATTEMPTS_KEY)), defaults.workerMaxAttempts, 1, 20),
      workerRetryBaseMs: clampInt(
        Number(valueMap.get(WORKER_RETRY_BASE_MS_KEY)),
        defaults.workerRetryBaseMs,
        1000,
        300000,
      ),
      httpTimeoutMs: clampInt(Number(valueMap.get(HTTP_TIMEOUT_MS_KEY)), defaults.httpTimeoutMs, 1000, 300000),
    }, { qdrantApiKey, neo4jPassword });
  } catch (error) {
    if (isMissingTableError(error)) {
      return applyRagRuntimeSettings(defaults, defaultSecrets());
    }
    throw error;
  }
}

export async function saveRagRuntimeSettings(
  input: RagRuntimeSettingsInput,
): Promise<SaveRagRuntimeSettingsResult> {
  const previous = await getRagRuntimeSettings();
  let existingQdrantApiKey = defaultSecrets().qdrantApiKey;
  let existingNeo4jPassword = defaultSecrets().neo4jPassword;

  try {
    const valueMap = await getValueMap();
    existingQdrantApiKey = normalizeOptionalText(valueMap.get(QDRANT_API_KEY_KEY)) ?? existingQdrantApiKey;
    existingNeo4jPassword = normalizeOptionalText(valueMap.get(NEO4J_PASSWORD_KEY)) ?? existingNeo4jPassword;
  } catch (error) {
    if (!isMissingTableError(error)) {
      throw error;
    }
  }

  const qdrantApiKey = input.clearQdrantApiKey
    ? ""
    : normalizeOptionalText(input.qdrantApiKey) ?? existingQdrantApiKey;
  const neo4jPassword = input.clearNeo4jPassword
    ? ""
    : normalizeOptionalText(input.neo4jPassword) ?? existingNeo4jPassword;

  const settings = applyRagRuntimeSettings({
    enabled: Boolean(input.enabled),
    qdrantUrl: normalizeUrl(input.qdrantUrl, previous.qdrantUrl),
    qdrantTimeoutMs: clampInt(input.qdrantTimeoutMs, previous.qdrantTimeoutMs, 1000, 300000),
    qdrantUpsertMaxBytes: clampInt(
      input.qdrantUpsertMaxBytes,
      previous.qdrantUpsertMaxBytes,
      1024 * 1024,
      64 * 1024 * 1024,
    ),
    qdrantUpsertConcurrency: clampInt(input.qdrantUpsertConcurrency, previous.qdrantUpsertConcurrency, 1, 16),
    chunkWordSize: clampInt(input.chunkWordSize, previous.chunkWordSize, 80, 800),
    chunkOverlapWords: clampInt(input.chunkOverlapWords, previous.chunkOverlapWords, 0, 200),
    graphEnabled: Boolean(input.graphEnabled),
    neo4jUri: normalizeOptionalText(input.neo4jUri) ?? previous.neo4jUri,
    neo4jUser: normalizeOptionalText(input.neo4jUser) ?? previous.neo4jUser,
    neo4jTimeoutMs: clampInt(input.neo4jTimeoutMs, previous.neo4jTimeoutMs, 1000, 120000),
    vectorCandidates: clampInt(input.vectorCandidates, previous.vectorCandidates, 1, 200),
    keywordCandidates: clampInt(input.keywordCandidates, previous.keywordCandidates, 1, 200),
    finalTopK: clampInt(input.finalTopK, previous.finalTopK, 1, 50),
    workerPollMs: clampInt(input.workerPollMs, previous.workerPollMs, 200, 60000),
    workerMaxAttempts: clampInt(input.workerMaxAttempts, previous.workerMaxAttempts, 1, 20),
    workerRetryBaseMs: clampInt(input.workerRetryBaseMs, previous.workerRetryBaseMs, 1000, 300000),
    httpTimeoutMs: clampInt(input.httpTimeoutMs, previous.httpTimeoutMs, 1000, 300000),
  }, { qdrantApiKey, neo4jPassword });

  const connectionChanged = previous.qdrantUrl !== settings.qdrantUrl;
  const chunkingChanged = previous.chunkWordSize !== settings.chunkWordSize
    || previous.chunkOverlapWords !== settings.chunkOverlapWords;

  const writeOperations = [
    prisma.appSetting.upsert({
      where: { key: RAG_ENABLED_KEY },
      update: { value: String(settings.enabled) },
      create: { key: RAG_ENABLED_KEY, value: String(settings.enabled) },
    }),
    prisma.appSetting.upsert({
      where: { key: QDRANT_URL_KEY },
      update: { value: settings.qdrantUrl },
      create: { key: QDRANT_URL_KEY, value: settings.qdrantUrl },
    }),
    prisma.appSetting.upsert({
      where: { key: QDRANT_TIMEOUT_MS_KEY },
      update: { value: String(settings.qdrantTimeoutMs) },
      create: { key: QDRANT_TIMEOUT_MS_KEY, value: String(settings.qdrantTimeoutMs) },
    }),
    prisma.appSetting.upsert({
      where: { key: QDRANT_UPSERT_MAX_BYTES_KEY },
      update: { value: String(settings.qdrantUpsertMaxBytes) },
      create: { key: QDRANT_UPSERT_MAX_BYTES_KEY, value: String(settings.qdrantUpsertMaxBytes) },
    }),
    prisma.appSetting.upsert({
      where: { key: QDRANT_UPSERT_CONCURRENCY_KEY },
      update: { value: String(settings.qdrantUpsertConcurrency) },
      create: { key: QDRANT_UPSERT_CONCURRENCY_KEY, value: String(settings.qdrantUpsertConcurrency) },
    }),
    prisma.appSetting.upsert({
      where: { key: CHUNK_WORD_SIZE_KEY },
      update: { value: String(settings.chunkWordSize) },
      create: { key: CHUNK_WORD_SIZE_KEY, value: String(settings.chunkWordSize) },
    }),
    prisma.appSetting.upsert({
      where: { key: CHUNK_OVERLAP_WORDS_KEY },
      update: { value: String(settings.chunkOverlapWords) },
      create: { key: CHUNK_OVERLAP_WORDS_KEY, value: String(settings.chunkOverlapWords) },
    }),
    prisma.appSetting.upsert({
      where: { key: GRAPH_ENABLED_KEY },
      update: { value: String(settings.graphEnabled) },
      create: { key: GRAPH_ENABLED_KEY, value: String(settings.graphEnabled) },
    }),
    prisma.appSetting.upsert({
      where: { key: NEO4J_URI_KEY },
      update: { value: settings.neo4jUri },
      create: { key: NEO4J_URI_KEY, value: settings.neo4jUri },
    }),
    prisma.appSetting.upsert({
      where: { key: NEO4J_USER_KEY },
      update: { value: settings.neo4jUser },
      create: { key: NEO4J_USER_KEY, value: settings.neo4jUser },
    }),
    prisma.appSetting.upsert({
      where: { key: NEO4J_TIMEOUT_MS_KEY },
      update: { value: String(settings.neo4jTimeoutMs) },
      create: { key: NEO4J_TIMEOUT_MS_KEY, value: String(settings.neo4jTimeoutMs) },
    }),
    prisma.appSetting.upsert({
      where: { key: VECTOR_CANDIDATES_KEY },
      update: { value: String(settings.vectorCandidates) },
      create: { key: VECTOR_CANDIDATES_KEY, value: String(settings.vectorCandidates) },
    }),
    prisma.appSetting.upsert({
      where: { key: KEYWORD_CANDIDATES_KEY },
      update: { value: String(settings.keywordCandidates) },
      create: { key: KEYWORD_CANDIDATES_KEY, value: String(settings.keywordCandidates) },
    }),
    prisma.appSetting.upsert({
      where: { key: FINAL_TOP_K_KEY },
      update: { value: String(settings.finalTopK) },
      create: { key: FINAL_TOP_K_KEY, value: String(settings.finalTopK) },
    }),
    prisma.appSetting.upsert({
      where: { key: WORKER_POLL_MS_KEY },
      update: { value: String(settings.workerPollMs) },
      create: { key: WORKER_POLL_MS_KEY, value: String(settings.workerPollMs) },
    }),
    prisma.appSetting.upsert({
      where: { key: WORKER_MAX_ATTEMPTS_KEY },
      update: { value: String(settings.workerMaxAttempts) },
      create: { key: WORKER_MAX_ATTEMPTS_KEY, value: String(settings.workerMaxAttempts) },
    }),
    prisma.appSetting.upsert({
      where: { key: WORKER_RETRY_BASE_MS_KEY },
      update: { value: String(settings.workerRetryBaseMs) },
      create: { key: WORKER_RETRY_BASE_MS_KEY, value: String(settings.workerRetryBaseMs) },
    }),
    prisma.appSetting.upsert({
      where: { key: HTTP_TIMEOUT_MS_KEY },
      update: { value: String(settings.httpTimeoutMs) },
      create: { key: HTTP_TIMEOUT_MS_KEY, value: String(settings.httpTimeoutMs) },
    }),
  ];

  try {
    await prisma.$transaction([
      ...writeOperations,
      ...(qdrantApiKey
        ? [prisma.appSetting.upsert({
          where: { key: QDRANT_API_KEY_KEY },
          update: { value: qdrantApiKey },
          create: { key: QDRANT_API_KEY_KEY, value: qdrantApiKey },
        })]
        : [prisma.appSetting.deleteMany({
          where: { key: QDRANT_API_KEY_KEY },
        })]),
      ...(neo4jPassword
        ? [prisma.appSetting.upsert({
          where: { key: NEO4J_PASSWORD_KEY },
          update: { value: neo4jPassword },
          create: { key: NEO4J_PASSWORD_KEY, value: neo4jPassword },
        })]
        : [prisma.appSetting.deleteMany({
          where: { key: NEO4J_PASSWORD_KEY },
        })]),
    ]);
  } catch (error) {
    if (!isMissingTableError(error)) {
      throw error;
    }
  }

  return {
    settings,
    connectionChanged,
    chunkingChanged,
    shouldReindex: connectionChanged || chunkingChanged,
  };
}

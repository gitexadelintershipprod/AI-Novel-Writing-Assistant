export interface TTSGenerationRequest {
  text: string;
  voiceId?: string | null;
  speed?: number | null;
  emotion?: string | null;
}

export interface TTSGenerationResult {
  audioUrl: string;
  durationSec?: number;
  raw?: unknown;
}

export interface TTSProviderPort {
  readonly provider: string;
  readonly label?: string;
  readonly description?: string;
  readonly costPerSecond?: number;
  readonly currency?: string;
  synthesize(input: TTSGenerationRequest): Promise<TTSGenerationResult>;
}

const SILENT_WAV_DATA_URL = "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=";

export class MockTTSProvider implements TTSProviderPort {
  readonly provider = "mock";
  readonly label = "Analog dubbing channel";
  readonly description = "A local mock provider for testing the drama voice pipeline. It does not generate real audio.";
  readonly costPerSecond = normalizeCostValue(process.env.DRAMA_TTS_MOCK_COST_PER_SECOND);
  readonly currency = readCostCurrency();

  async synthesize(input: TTSGenerationRequest): Promise<TTSGenerationResult> {
    return {
      audioUrl: SILENT_WAV_DATA_URL,
      durationSec: Math.max(1, Math.ceil(input.text.length / 5)),
      raw: input,
    };
  }
}

function normalizeTimeoutMs(value: unknown): number {
  const numeric = Number(value);
  return Number.isFinite(numeric) && numeric > 0 ? numeric : 120000;
}

function normalizeCostValue(value: unknown): number {
  const numeric = Number(value);
  return Number.isFinite(numeric) && numeric >= 0 ? numeric : 0;
}

function readCostCurrency(): string {
  return process.env.DRAMA_COST_CURRENCY?.trim() || "CNY";
}

function readStringField(record: Record<string, unknown>, keys: string[]): string | undefined {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }
  return undefined;
}

function readNumberField(record: Record<string, unknown>, keys: string[]): number | undefined {
  for (const key of keys) {
    const value = Number(record[key]);
    if (Number.isFinite(value) && value > 0) {
      return value;
    }
  }
  return undefined;
}

async function readJsonResponse(response: Response): Promise<Record<string, unknown>> {
  const text = await response.text();
  if (!text.trim()) {
    return {};
  }
  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    return { rawText: text };
  }
}

export class HttpTTSProvider implements TTSProviderPort {
  readonly provider: string;
  readonly label: string;
  readonly description?: string;
  readonly costPerSecond: number;
  readonly currency: string;

  constructor(private readonly config: {
    provider: string;
    label?: string;
    description?: string;
    synthesizeUrl: string;
    apiKey?: string;
    timeoutMs?: number;
    costPerSecond?: number;
    currency?: string;
  }) {
    this.provider = config.provider;
    this.label = config.label ?? config.provider;
    this.description = config.description;
    this.costPerSecond = normalizeCostValue(config.costPerSecond);
    this.currency = config.currency?.trim() || readCostCurrency();
  }

  async synthesize(input: TTSGenerationRequest): Promise<TTSGenerationResult> {
    const response = await fetch(this.config.synthesizeUrl, {
      method: "POST",
      headers: this.buildHeaders(),
      body: JSON.stringify(input),
      signal: AbortSignal.timeout(normalizeTimeoutMs(this.config.timeoutMs)),
    });
    const payload = await readJsonResponse(response);
    if (!response.ok) {
      throw new Error(`Dubbing channel synthesis failed: ${response.status} ${response.statusText}`);
    }
    const audioUrl = readStringField(payload, ["audioUrl", "url", "resultUrl"]);
    if (!audioUrl) {
      throw new Error("The voice channel did not return an audio URL.");
    }
    return {
      audioUrl,
      durationSec: readNumberField(payload, ["durationSec", "duration", "seconds"]),
      raw: payload,
    };
  }

  private buildHeaders(): Record<string, string> {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (this.config.apiKey) {
      headers.Authorization = `Bearer ${this.config.apiKey}`;
    }
    return headers;
  }
}

class TTSProviderRegistry {
  private readonly providers = new Map<string, TTSProviderPort>();

  register(provider: TTSProviderPort): void {
    this.providers.set(provider.provider, provider);
  }

  resolve(provider: string): TTSProviderPort {
    const resolved = this.providers.get(provider);
    if (!resolved) {
      throw new Error(`Unregistered dubbing provider: ${provider}`);
    }
    return resolved;
  }

  listProviders(): Array<{ provider: string; label: string; description?: string; costPerSecond: number; currency: string }> {
    return [...this.providers.values()].map((provider) => ({
      provider: provider.provider,
      label: provider.label ?? provider.provider,
      description: provider.description,
      costPerSecond: provider.costPerSecond ?? 0,
      currency: provider.currency ?? readCostCurrency(),
    }));
  }
}

export const ttsProviderRegistry = new TTSProviderRegistry();
ttsProviderRegistry.register(new MockTTSProvider());

const httpSynthesizeUrl = process.env.DRAMA_TTS_HTTP_SYNTHESIZE_URL?.trim();
if (httpSynthesizeUrl) {
  ttsProviderRegistry.register(new HttpTTSProvider({
    provider: process.env.DRAMA_TTS_HTTP_PROVIDER_ID?.trim() || "http",
    label: process.env.DRAMA_TTS_HTTP_PROVIDER_LABEL?.trim() || "HTTP dubbing channel",
      description: process.env.DRAMA_TTS_HTTP_PROVIDER_DESCRIPTION?.trim() || "An external TTS service configured through environment variables.",
    synthesizeUrl: httpSynthesizeUrl,
    apiKey: process.env.DRAMA_TTS_HTTP_API_KEY?.trim() || undefined,
    timeoutMs: normalizeTimeoutMs(process.env.DRAMA_TTS_HTTP_TIMEOUT_MS),
    costPerSecond: normalizeCostValue(process.env.DRAMA_TTS_HTTP_COST_PER_SECOND),
    currency: process.env.DRAMA_TTS_HTTP_COST_CURRENCY?.trim() || readCostCurrency(),
  }));
}

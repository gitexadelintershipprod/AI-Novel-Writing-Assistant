import { prisma } from "../../db/prisma";
import { setProviderSecretCache } from "../../llm/factory";
import { invalidateStructuredFallbackSettingsCache } from "../../llm/structuredFallbackSettings";

export const LEGACY_CHAT_PROVIDER_RETIREMENT_KEY = "llm.providerRetirement.deepseek-ollama";

const RETIRED_PROVIDERS = ["deepseek", "ollama"] as const;
const LLM_SELECTION_SETTING_KEY = "llm.currentSelection";
const STRUCTURED_FALLBACK_PROVIDER_KEY = "structuredFallback.provider";
const STRUCTURED_FALLBACK_KEYS = [
  "structuredFallback.enabled",
  STRUCTURED_FALLBACK_PROVIDER_KEY,
  "structuredFallback.model",
  "structuredFallback.temperature",
  "structuredFallback.maxTokens",
];

function isRetiredProvider(value: string | undefined | null): boolean {
  const normalized = value?.trim();
  return normalized === "deepseek" || normalized === "ollama";
}

export async function retireLegacyDirectChatProviders(): Promise<{ retiredProviders: boolean }> {
  const existing = await prisma.appSetting.findUnique({
    where: { key: LEGACY_CHAT_PROVIDER_RETIREMENT_KEY },
  });
  if (existing) {
    return { retiredProviders: false };
  }

  await prisma.$transaction(async (tx) => {
    await tx.aPIKey.deleteMany({
      where: { provider: { in: [...RETIRED_PROVIDERS] } },
    });
    await tx.modelRouteConfig.deleteMany({
      where: { provider: { in: [...RETIRED_PROVIDERS] } },
    });

    const selection = await tx.appSetting.findUnique({
      where: { key: LLM_SELECTION_SETTING_KEY },
    });
    if (selection) {
      try {
        const parsed = JSON.parse(selection.value) as { provider?: unknown };
        if (typeof parsed.provider === "string" && isRetiredProvider(parsed.provider)) {
          await tx.appSetting.delete({ where: { key: LLM_SELECTION_SETTING_KEY } });
        }
      } catch {
        // Leave an unreadable selection in place. The completion flag still prevents a second pass.
      }
    }

    const fallbackProvider = await tx.appSetting.findUnique({
      where: { key: STRUCTURED_FALLBACK_PROVIDER_KEY },
    });
    if (isRetiredProvider(fallbackProvider?.value)) {
      await tx.appSetting.deleteMany({
        where: { key: { in: STRUCTURED_FALLBACK_KEYS } },
      });
    }

    await tx.appSetting.upsert({
      where: { key: LEGACY_CHAT_PROVIDER_RETIREMENT_KEY },
      create: { key: LEGACY_CHAT_PROVIDER_RETIREMENT_KEY, value: "done" },
      update: { value: "done" },
    });
  });

  setProviderSecretCache("deepseek", null);
  setProviderSecretCache("ollama", null);
  invalidateStructuredFallbackSettingsCache();
  return { retiredProviders: true };
}

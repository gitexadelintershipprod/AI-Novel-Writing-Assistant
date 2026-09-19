import { useMemo, useState } from "react";
import { Plus, PlugZap, ServerCog, Sparkles } from "lucide-react";
import type { LLMProvider } from "@ai-novel/shared/types/llm";
import type { APIKeyStatus, ProviderBalanceStatus } from "@/api/settings";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AppDialogContent, Dialog } from "@/components/ui/dialog";
import { AUTO_DIRECTOR_MOBILE_CLASSES } from "@/mobile/autoDirector";
import ProviderStatusCard, { type ProviderCardViewModel } from "./ProviderStatusCard";

export default function ProviderSettingsSection(props: {
  providers: APIKeyStatus[];
  balances: ProviderBalanceStatus[];
  isBalanceLoading: boolean;
  testingProvider?: string;
  providerTestResults: Record<string, string>;
  refreshingModelProvider?: string;
  refreshingBalanceProvider?: string;
  reasoningProvider?: string;
  onCreateCustomProvider: () => void;
  onRemoveProvider: (provider: APIKeyStatus) => void;
  onOpenConfig: (provider: LLMProvider) => void;
  onTest: (provider: APIKeyStatus) => void;
  onRefreshModels: (provider: LLMProvider) => void;
  onRefreshBalance: (provider: LLMProvider) => void;
  onToggleReasoning: (provider: LLMProvider, reasoningEnabled: boolean) => void;
  removingProvider?: string;
}) {
  const {
    providers,
    balances,
    isBalanceLoading,
    testingProvider,
    providerTestResults,
    refreshingModelProvider,
    refreshingBalanceProvider,
    reasoningProvider,
    onCreateCustomProvider,
    onRemoveProvider,
    onOpenConfig,
    onTest,
    onRefreshModels,
    onRefreshBalance,
    onToggleReasoning,
    removingProvider,
  } = props;
  const [isAddProviderOpen, setIsAddProviderOpen] = useState(false);
  const balanceMap = new Map(balances.map((item) => [item.provider, item]));
  const viewModels: ProviderCardViewModel[] = providers.map((provider) => {
    const balance = balanceMap.get(provider.provider);
    const canRefreshBalance = Boolean(
      provider.kind === "builtin"
      && provider.isConfigured
      && (balance?.canRefresh ?? (provider.provider === "deepseek" || provider.provider === "siliconflow" || provider.provider === "kimi")),
    );
    return {
      provider,
      balance,
      isBalanceLoading: isBalanceLoading && !balance,
      isBalanceRefreshing: refreshingBalanceProvider === provider.provider,
      canRefreshBalance,
      isReasoningUpdating: reasoningProvider === provider.provider,
      isTesting: testingProvider === provider.provider,
      testResult: providerTestResults[provider.provider],
    };
  });
  const visibleViewModels = useMemo(
    () => viewModels.filter(({ provider }) => provider.isConfigured && provider.isActive),
    [viewModels],
  );
  const addableBuiltIns = providers.filter((provider) => provider.kind === "builtin" && (!provider.isConfigured || !provider.isActive));

  return (
    <Card id="settings-provider-section" className="min-w-0 scroll-mt-20 overflow-hidden border-primary/10 bg-gradient-to-b from-primary/[0.035] to-background shadow-sm">
      <CardHeader className="flex flex-col gap-4 border-b bg-background/60 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
            <Sparkles className="h-5 w-5" />
          </div>
          <div className="min-w-0 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <CardTitle>model manufacturer</CardTitle>
              <Badge variant={visibleViewModels.length ? "default" : "outline"}>{visibleViewModels.length} available connections</Badge>
            </div>
          <CardDescription className={AUTO_DIRECTOR_MOBILE_CLASSES.wrapText}>
              Just add a working text model and start creating; routing and advanced parameters can be set as needed.
          </CardDescription>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button className={AUTO_DIRECTOR_MOBILE_CLASSES.fullWidthAction} onClick={() => setIsAddProviderOpen(true)}>
            <Plus className="h-4 w-4" /> Add vendor
          </Button>
        </div>
      </CardHeader>
      <CardContent className="grid min-w-0 gap-4 pt-5 md:grid-cols-2">
        {visibleViewModels.map((item) => (
          <ProviderStatusCard
            key={item.provider.provider}
            item={item}
            onOpenConfig={onOpenConfig}
            onTest={onTest}
            onRefreshModels={onRefreshModels}
            onRefreshBalance={onRefreshBalance}
            onToggleReasoning={onToggleReasoning}
            onRemove={() => onRemoveProvider(item.provider)}
            isRemoving={removingProvider === item.provider.provider}
            isRefreshingModels={refreshingModelProvider === item.provider.provider}
          />
        ))}
        {!visibleViewModels.length ? (
          <div className="rounded-xl border border-dashed bg-background/70 p-6 text-center text-sm text-muted-foreground md:col-span-2">
            <PlugZap className="mx-auto mb-3 h-6 w-6 text-primary" />
            <div className="font-medium text-foreground">No model connections available yet</div>
            <div className="mt-1">After adding a built-in vendor or custom service, you can configure your first text model.</div>
          </div>
        ) : null}
      </CardContent>
      <Dialog open={isAddProviderOpen} onOpenChange={setIsAddProviderOpen}>
        <AppDialogContent
          title="Add model vendor"
          description="Choose from one of the built-in vendor templates, or add your own OpenAI-compatible services."
          className="max-w-2xl"
        >
          <div className="grid gap-3 sm:grid-cols-2">
            {addableBuiltIns.map((provider) => (
              <button
                key={provider.provider}
                type="button"
                className="rounded-xl border bg-background p-4 text-left transition-all hover:-translate-y-0.5 hover:border-primary hover:bg-primary/5 hover:shadow-sm"
                onClick={() => {
                  setIsAddProviderOpen(false);
                  onOpenConfig(provider.provider);
                }}
              >
                <div className="flex items-center gap-2 font-medium"><PlugZap className="h-4 w-4 text-primary" /> {provider.name}</div>
                <div className="mt-2 text-xs text-muted-foreground">Recommended model:{provider.defaultModel}</div>
              </button>
            ))}
            <button
              type="button"
              className="rounded-xl border border-dashed bg-background p-4 text-left transition-all hover:-translate-y-0.5 hover:border-primary hover:bg-primary/5 hover:shadow-sm"
              onClick={() => {
                setIsAddProviderOpen(false);
                onCreateCustomProvider();
              }}
            >
              <div className="flex items-center gap-2 font-medium"><ServerCog className="h-4 w-4 text-primary" /> Custom manufacturer</div>
              <div className="mt-2 text-xs text-muted-foreground">Connect to any OpenAI compatible service.</div>
            </button>
          </div>
          {!addableBuiltIns.length ? (
            <div className="mt-3 text-sm text-muted-foreground">All built-in vendors have been added; you can still add custom vendors.</div>
          ) : null}
        </AppDialogContent>
      </Dialog>
    </Card>
  );
}

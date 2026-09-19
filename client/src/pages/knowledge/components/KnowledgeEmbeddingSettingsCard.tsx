import { useMemo } from "react";
import type { Dispatch, SetStateAction } from "react";
import { ChevronDown, Database, Search } from "lucide-react";
import type { EmbeddingProvider, RagEmbeddingModelStatus, RagProviderStatus } from "@/api/settings";
import SearchableSelect from "@/components/common/SearchableSelect";
import SelectField from "@/components/common/SelectField";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export interface KnowledgeEmbeddingSettingsFormState {
  embeddingProvider: EmbeddingProvider;
  embeddingModel: string;
  embeddingApiKey: string;
  embeddingBaseURL: string;
  collectionVersion: number;
  collectionMode: "auto" | "manual";
  collectionName: string;
  collectionTag: string;
  autoReindexOnChange: boolean;
  embeddingBatchSize: number;
  embeddingTimeoutMs: number;
  embeddingMaxRetries: number;
  embeddingRetryBaseMs: number;
  embeddingConcurrency: number;
  enabled: boolean;
  qdrantUrl: string;
  qdrantApiKey: string;
  qdrantApiKeyConfigured: boolean;
  clearQdrantApiKey: boolean;
  qdrantTimeoutMs: number;
  qdrantUpsertMaxBytes: number;
  qdrantUpsertConcurrency: number;
  chunkSize: number;
  chunkOverlap: number;
  vectorCandidates: number;
  keywordCandidates: number;
  finalTopK: number;
  workerPollMs: number;
  workerMaxAttempts: number;
  workerRetryBaseMs: number;
  httpTimeoutMs: number;
}

interface KnowledgeEmbeddingSettingsCardProps {
  form: KnowledgeEmbeddingSettingsFormState;
  setForm: Dispatch<SetStateAction<KnowledgeEmbeddingSettingsFormState>>;
  providers: RagProviderStatus[];
  modelOptions: string[];
  modelQuery: {
    isLoading: boolean;
    data?: RagEmbeddingModelStatus;
  };
  isSaving: boolean;
  onSave: () => void;
}

function slugifySegment(value: string, fallback: string): string {
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
  return normalized || fallback;
}

function buildSuggestedCollectionName(form: KnowledgeEmbeddingSettingsFormState): string {
  const parts = [
    "ai",
    "novel",
    "rag",
    form.embeddingProvider,
    slugifySegment(form.embeddingModel, "embedding"),
    slugifySegment(form.collectionTag, "kb"),
    `v${form.collectionVersion}`,
  ];
  return parts.join("_").slice(0, 120);
}

function parseNumberInput(value: string, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export default function KnowledgeEmbeddingSettingsCard({
  form,
  setForm,
  providers,
  modelOptions,
  modelQuery,
  isSaving,
  onSave,
}: KnowledgeEmbeddingSettingsCardProps) {
  const suggestedCollectionName = useMemo(() => buildSuggestedCollectionName(form), [form]);
  const currentProvider = providers.find((item) => item.provider === form.embeddingProvider);
  const collectionNameToDisplay = form.collectionMode === "auto"
    ? suggestedCollectionName
    : form.collectionName.trim();

  return (
    <section className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary/[0.07] text-primary">
            <Search className="h-5 w-5" aria-hidden="true" />
          </div>
          <div>
            <h2 className="text-xl font-semibold tracking-tight">Let data participate in creation</h2>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">
              Select a vector model and connect to the database, and the indexed data will be available for book splitting, planning, and text creation.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:justify-end">
          {currentProvider ? (
            <Badge variant="secondary" className="border-0 bg-muted/60 font-normal">{currentProvider.name}</Badge>
          ) : null}
          <Badge variant="secondary" className={`border-0 font-normal ${form.enabled ? "bg-success/10 text-success" : "bg-muted/60"}`}>
            {form.enabled ? "Data retrieval is enabled" : "Data retrieval is paused"}
          </Badge>
        </div>
      </header>

      <div className="space-y-5">
        <section className="space-y-5 rounded-3xl bg-muted/20 p-5 sm:p-6">
          <div className="flex items-start gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-background text-muted-foreground shadow-sm">
              <Search className="h-4 w-4" aria-hidden="true" />
            </div>
            <div>
              <div className="font-medium">Choose how to understand the data</div>
              <div className="mt-1 text-xs leading-5 text-muted-foreground">
                It is recommended to use a configured and available service provider; the model is used to understand the meaning of the data and will not change the original text.
              </div>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <SelectField
                label="Embedding service provider"
                value={form.embeddingProvider}
                onValueChange={(value) =>
                  setForm((prev) => ({
                    ...prev,
                    embeddingProvider: value as EmbeddingProvider,
                    embeddingModel: "",
                  }))}
                options={providers.map((item) => ({
                  value: item.provider,
                  label: item.name,
                }))}
              />
              {currentProvider ? (
                <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                  <Badge variant="secondary" className={`border-0 font-normal ${currentProvider.isConfigured ? "bg-success/10 text-success" : "bg-warning/10 text-warning"}`}>
                    {currentProvider.isConfigured ? "Connection configured" : "Connection to be configured"}
                  </Badge>
                  <Badge variant="secondary" className={`border-0 font-normal ${currentProvider.isActive ? "bg-success/10 text-success" : "bg-muted/60"}`}>
                    {currentProvider.isActive ? "Available" : "Not enabled"}
                  </Badge>
                </div>
              ) : null}
            </div>

            <div className="space-y-2">
              <div className="text-sm font-medium">Embedding model</div>
              {modelQuery.isLoading ? (
                <div className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">
                  Loading available Embedding models...
                </div>
              ) : modelOptions.length > 0 ? (
                <SearchableSelect
                  value={form.embeddingModel}
                  onValueChange={(value) => setForm((prev) => ({ ...prev, embeddingModel: value }))}
                  options={modelOptions.map((model) => ({ value: model }))}
                  placeholder="Select Embedding model"
                  searchPlaceholder="Search Embedding models"
                  emptyText="No matching Embedding model"
                />
              ) : null}
              <Input
                className={modelQuery.isLoading || modelOptions.length > 0 ? "hidden" : undefined}
                value={form.embeddingModel}
                onChange={(event) => setForm((prev) => ({ ...prev, embeddingModel: event.target.value }))}
                placeholder="For example: text-embedding-3-small"
              />
              {modelQuery.data ? (
                <div className="text-xs text-muted-foreground">
                  {modelQuery.data.source === "remote"
                    ? `Available models for this provider: ${modelQuery.data.models.length}.`
                    : "You can use the recommended model first; when the connection configuration is available, the list will display the service provider model."}
                </div>
              ) : null}
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <div className="text-sm font-medium">Vector Service API Key</div>
              <Input
                type="password"
                value={form.embeddingApiKey}
                onChange={(event) => setForm((prev) => ({ ...prev, embeddingApiKey: event.target.value }))}
                placeholder={currentProvider?.isConfigured ? "Leave blank to retain the saved Key" : "Please enter the vector service API Key"}
              />
            </div>
            <div className="space-y-2">
              <div className="text-sm font-medium">Vector service API address</div>
              <Input
                value={form.embeddingBaseURL}
                onChange={(event) => setForm((prev) => ({ ...prev, embeddingBaseURL: event.target.value }))}
                placeholder="Leave blank to use the service provider's default address."
              />
            </div>
          </div>
          <div className="text-xs leading-5 text-muted-foreground">
            The connection here is only for data understanding and will not change the authoring model, default model or task routing.
          </div>

        </section>

        <section className="space-y-5 rounded-3xl border border-border/35 bg-card/70 p-5 sm:p-6">
          <div className="flex items-start gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-primary/[0.07] text-primary">
              <Database className="h-4 w-4" aria-hidden="true" />
            </div>
            <div>
              <div className="font-medium">Connect to database</div>
              <div className="mt-1 text-xs leading-5 text-muted-foreground">
                Supports Qdrant Cloud, self-hosted Qdrant or native repositories.
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <div className="text-sm font-medium">Vector library URL</div>
            <Input
              value={form.qdrantUrl}
              onChange={(event) => setForm((prev) => ({ ...prev, qdrantUrl: event.target.value }))}
              placeholder="http://127.0.0.1:6333"
            />
            <div className="text-xs text-muted-foreground">
              The default local address is usually http://127.0.0.1:6333; for a cloud instance, paste the full URL directly.
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <div className="text-sm font-medium">Vector library API Key</div>
                <Badge variant="secondary" className={`border-0 font-normal ${form.qdrantApiKeyConfigured ? "bg-success/10 text-success" : "bg-muted/60"}`}>
                  {form.qdrantApiKeyConfigured ? "Key available" : "not set"}
                </Badge>
              </div>
              <Input
                type="password"
                value={form.qdrantApiKey}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    qdrantApiKey: event.target.value,
                    clearQdrantApiKey: false,
                  }))}
                placeholder={form.qdrantApiKeyConfigured ? "Leave blank to retain the saved Key" : "Please enter the vector library API Key"}
              />
            </div>

            <label className="flex items-center gap-2 rounded-2xl bg-muted/25 px-4 py-3 text-sm">
              <input
                type="checkbox"
                checked={form.clearQdrantApiKey}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    clearQdrantApiKey: event.target.checked,
                    qdrantApiKey: event.target.checked ? "" : prev.qdrantApiKey,
                  }))}
              />
              Clear saved vector library API Key when saving
            </label>
          </div>
        </section>

        <details className="group rounded-3xl bg-muted/20 p-5 sm:p-6">
          <summary className="flex cursor-pointer list-none flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div className="space-y-1">
              <div className="font-medium">Advanced configuration</div>
              <div className="text-xs text-muted-foreground">
                Collection version v{form.collectionVersion} · Collection naming, index rebuilding, search quality and background task parameters
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2 text-xs text-muted-foreground">
              <span className="group-open:hidden">Expand</span>
              <span className="hidden group-open:inline">close</span>
              <ChevronDown className="h-4 w-4 transition-transform duration-200 group-open:rotate-180" />
            </div>
          </summary>

          <div className="mt-5 space-y-6">
            <section className="space-y-4">
              <div className="space-y-1">
                <div className="text-sm font-medium">Collections and Indexes</div>
                <div className="text-xs text-muted-foreground">
                  Automatic naming distinguishes collections by service provider, model, label, and version, reducing the risk of vector dimension conflicts.
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <SelectField
                  label="Collection naming method"
                  value={form.collectionMode}
                  onValueChange={(value) =>
                    setForm((prev) => ({
                      ...prev,
                      collectionMode: value as "auto" | "manual",
                    }))}
                  options={[
                    { value: "auto", label: "Automatically generated" },
                    { value: "manual", label: "Manually specify" },
                  ]}
                />

                <div className="space-y-2">
                  <div className="text-sm font-medium">collection tags</div>
                  <Input
                    value={form.collectionTag}
                    onChange={(event) => setForm((prev) => ({ ...prev, collectionTag: event.target.value }))}
                    placeholder="For example: kb/prod/novel"
                  />
                  <div className="text-xs text-muted-foreground">
                    Use a short label to distinguish environments or different data groupings.
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <div className="text-sm font-medium">
                  {form.collectionMode === "auto" ? "Automatically generate collection names" : "Vector library collection name"}
                </div>
                {form.collectionMode === "auto" ? (
                  <div className="rounded-md border border-dashed bg-muted/20 p-3 font-mono text-xs break-all">
                    {collectionNameToDisplay}
                  </div>
                ) : (
                  <Input
                    value={form.collectionName}
                    onChange={(event) => setForm((prev) => ({ ...prev, collectionName: event.target.value }))}
                    placeholder="For example: ai_novel_rag_openai_text_embedding_3_small_kb_v1"
                  />
                )}
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <SelectField
                  label="Automatically rebuild the index after Embedding changes"
                  value={form.autoReindexOnChange ? "true" : "false"}
                  onValueChange={(value) =>
                    setForm((prev) => ({
                      ...prev,
                      autoReindexOnChange: value === "true",
                    }))}
                  options={[
                    { value: "true", label: "turn on" },
                    { value: "false", label: "Close" },
                  ]}
                />

                <div className="rounded-md border bg-background p-3">
                  <div className="text-sm font-medium">target set</div>
                  <div className="mt-2 font-mono text-xs break-all">{collectionNameToDisplay}</div>
                </div>
              </div>
            </section>

            <section className="space-y-4">
              <div className="space-y-1">
                <div className="text-sm font-medium">Connection and writing parameters</div>
                <div className="text-xs text-muted-foreground">
                  The default value is suitable for most knowledge bases; adjust only if the connection is slow, batch writes fail, or retrieval needs to be paused.
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <SelectField
                  label="RAG status"
                  value={form.enabled ? "true" : "false"}
                  onValueChange={(value) =>
                    setForm((prev) => ({
                      ...prev,
                      enabled: value === "true",
                    }))}
                  options={[
                    { value: "true", label: "enable" },
                    { value: "false", label: "pause" },
                  ]}
                />

                <div className="space-y-2">
                  <div className="text-sm font-medium">Vector library timeout (milliseconds)</div>
                  <Input
                    type="number"
                    min={1000}
                    max={300000}
                    value={form.qdrantTimeoutMs}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        qdrantTimeoutMs: parseNumberInput(event.target.value, prev.qdrantTimeoutMs),
                      }))}
                  />
                </div>

                <div className="space-y-2">
                  <div className="text-sm font-medium">Maximum number of bytes written at a time</div>
                  <Input
                    type="number"
                    min={1024 * 1024}
                    max={64 * 1024 * 1024}
                    value={form.qdrantUpsertMaxBytes}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        qdrantUpsertMaxBytes: parseNumberInput(event.target.value, prev.qdrantUpsertMaxBytes),
                      }))}
                  />
                </div>

                <div className="space-y-2">
                  <div className="text-sm font-medium">Number of concurrent writes to the vector library</div>
                  <Input
                    type="number"
                    min={1}
                    max={16}
                    value={form.qdrantUpsertConcurrency}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        qdrantUpsertConcurrency: parseNumberInput(event.target.value, prev.qdrantUpsertConcurrency),
                      }))}
                  />
                  <div className="text-xs text-muted-foreground">
                    The maximum number of concurrent submissions of chunked batches to Qdrant. Default is 3, large documents can be adjusted to 4-6 to speed up.
                  </div>
                </div>
              </div>
            </section>

            <section className="space-y-4">
              <div className="space-y-1">
                <div className="text-sm font-medium">Retrieval tuning</div>
                <div className="text-xs text-muted-foreground">
                  When the recalled content is not accurate enough, or the retrieval delay needs to be controlled, the number of blocks and candidates can be adjusted.
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <div className="text-sm font-medium">Cut size</div>
                  <Input
                    type="number"
                    min={200}
                    max={4000}
                    value={form.chunkSize}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        chunkSize: parseNumberInput(event.target.value, prev.chunkSize),
                      }))}
                  />
                </div>

                <div className="space-y-2">
                  <div className="text-sm font-medium">Overlapping slices</div>
                  <Input
                    type="number"
                    min={0}
                    max={1000}
                    value={form.chunkOverlap}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        chunkOverlap: parseNumberInput(event.target.value, prev.chunkOverlap),
                      }))}
                  />
                </div>

                <div className="space-y-2">
                  <div className="text-sm font-medium">Final Top K</div>
                  <Input
                    type="number"
                    min={1}
                    max={50}
                    value={form.finalTopK}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        finalTopK: parseNumberInput(event.target.value, prev.finalTopK),
                      }))}
                  />
                </div>

                <div className="space-y-2">
                  <div className="text-sm font-medium">Number of vector candidates</div>
                  <Input
                    type="number"
                    min={1}
                    max={200}
                    value={form.vectorCandidates}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        vectorCandidates: parseNumberInput(event.target.value, prev.vectorCandidates),
                      }))}
                  />
                </div>

                <div className="space-y-2">
                  <div className="text-sm font-medium">Number of keyword candidates</div>
                  <Input
                    type="number"
                    min={1}
                    max={200}
                    value={form.keywordCandidates}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        keywordCandidates: parseNumberInput(event.target.value, prev.keywordCandidates),
                      }))}
                  />
                </div>
              </div>
            </section>

            <section className="space-y-4">
              <div className="space-y-1">
                <div className="text-sm font-medium">Embedding request behavior</div>
                <div className="text-xs text-muted-foreground">
                  Batch size, timeout, retry, and polling parameters can be adjusted when importing in large batches or when the service is slow to respond.
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <div className="space-y-2">
                  <div className="text-sm font-medium">Embedding batch size</div>
                  <Input
                    type="number"
                    min={1}
                    max={256}
                    value={form.embeddingBatchSize}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        embeddingBatchSize: parseNumberInput(event.target.value, prev.embeddingBatchSize),
                      }))}
                  />
                </div>

                <div className="space-y-2">
                  <div className="text-sm font-medium">Embedding concurrency number</div>
                  <Input
                    type="number"
                    min={1}
                    max={16}
                    value={form.embeddingConcurrency}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        embeddingConcurrency: parseNumberInput(event.target.value, prev.embeddingConcurrency),
                      }))}
                  />
                  <div className="text-xs text-muted-foreground">
                    The number of embedding API requests initiated simultaneously. The default is 4; increasing it can significantly shorten the indexing time for large documents, but it depends on the service provider's quota.
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="text-sm font-medium">Embedding timeout (milliseconds)</div>
                  <Input
                    type="number"
                    min={5000}
                    max={300000}
                    value={form.embeddingTimeoutMs}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        embeddingTimeoutMs: parseNumberInput(event.target.value, prev.embeddingTimeoutMs),
                      }))}
                  />
                </div>

                <div className="space-y-2">
                  <div className="text-sm font-medium">Embedding maximum retries</div>
                  <Input
                    type="number"
                    min={0}
                    max={8}
                    value={form.embeddingMaxRetries}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        embeddingMaxRetries: parseNumberInput(event.target.value, prev.embeddingMaxRetries),
                      }))}
                  />
                </div>

                <div className="space-y-2">
                  <div className="text-sm font-medium">Embedding retry base interval (milliseconds)</div>
                  <Input
                    type="number"
                    min={100}
                    max={10000}
                    value={form.embeddingRetryBaseMs}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        embeddingRetryBaseMs: parseNumberInput(event.target.value, prev.embeddingRetryBaseMs),
                      }))}
                  />
                </div>

                <div className="space-y-2">
                  <div className="text-sm font-medium">Worker polling interval (milliseconds)</div>
                  <Input
                    type="number"
                    min={200}
                    max={60000}
                    value={form.workerPollMs}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        workerPollMs: parseNumberInput(event.target.value, prev.workerPollMs),
                      }))}
                  />
                </div>

                <div className="space-y-2">
                  <div className="text-sm font-medium">Worker maximum number of attempts</div>
                  <Input
                    type="number"
                    min={1}
                    max={20}
                    value={form.workerMaxAttempts}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        workerMaxAttempts: parseNumberInput(event.target.value, prev.workerMaxAttempts),
                      }))}
                  />
                </div>

                <div className="space-y-2">
                  <div className="text-sm font-medium">Worker retry base interval (milliseconds)</div>
                  <Input
                    type="number"
                    min={1000}
                    max={300000}
                    value={form.workerRetryBaseMs}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        workerRetryBaseMs: parseNumberInput(event.target.value, prev.workerRetryBaseMs),
                      }))}
                  />
                </div>

                <div className="space-y-2">
                  <div className="text-sm font-medium">RAG HTTP timeout (milliseconds)</div>
                  <Input
                    type="number"
                    min={1000}
                    max={300000}
                    value={form.httpTimeoutMs}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        httpTimeoutMs: parseNumberInput(event.target.value, prev.httpTimeoutMs),
                      }))}
                  />
                </div>
              </div>
            </section>
          </div>
        </details>

        <div className="flex flex-col gap-3 border-t border-border/30 pt-5 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs leading-5 text-muted-foreground">After saving, newly or re-indexed data will use this set of search settings.</p>
          <Button
            className="w-full rounded-full sm:w-auto"
            onClick={onSave}
            disabled={
              isSaving
              || modelQuery.isLoading
              || !form.embeddingModel.trim()
              || !collectionNameToDisplay.trim()
              || !form.qdrantUrl.trim()
            }
          >
            {isSaving ? "Saving..." : "Save search settings"}
          </Button>
        </div>
      </div>
    </section>
  );
}

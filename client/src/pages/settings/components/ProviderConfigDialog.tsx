import type { Dispatch, SetStateAction } from "react";
import { Bot, Image, KeyRound, Link2, SlidersHorizontal } from "lucide-react";
import type { APIKeyStatus } from "@/api/settings";
import SearchableSelect from "@/components/common/SearchableSelect";
import { Button } from "@/components/ui/button";
import { AppDialogContent, Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import ProviderRequestLimitFields from "./ProviderRequestLimitFields";

export interface ProviderFormState {
  displayName: string;
  key: string;
  model: string;
  imageModel: string;
  baseURL: string;
  concurrencyLimit: string;
  requestIntervalMs: string;
}

interface ProviderConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isCreatingCustomProvider: boolean;
  isCustomDialog: boolean;
  editingConfig?: APIKeyStatus;
  form: ProviderFormState;
  setForm: Dispatch<SetStateAction<ProviderFormState>>;
  selectableModels: string[];
  previewModelsResult: string;
  isPreviewingModels: boolean;
  onClearPreviewModels: () => void;
  onPreviewModels: () => void;
  onSubmit: () => void;
  submitDisabled: boolean;
  submitLabel: string;
  onTest: () => void;
  testDisabled: boolean;
  testResult: string;
  onDeleteCustomProvider: () => void;
  deleteDisabled: boolean;
  deleteLabel: string;
}

export default function ProviderConfigDialog({
  open,
  onOpenChange,
  isCreatingCustomProvider,
  isCustomDialog,
  editingConfig,
  form,
  setForm,
  selectableModels,
  previewModelsResult,
  isPreviewingModels,
  onClearPreviewModels,
  onPreviewModels,
  onSubmit,
  submitDisabled,
  submitLabel,
  onTest,
  testDisabled,
  testResult,
  onDeleteCustomProvider,
  deleteDisabled,
  deleteLabel,
}: ProviderConfigDialogProps) {
  const primaryModelLabel = isCreatingCustomProvider ? "Default model (optional)" : isCustomDialog ? "Default model" : "Model name";
  const canSelectListedModels = selectableModels.length > 0;
  const imageModelOptions = editingConfig?.imageModels ?? [];
  const canSelectImageModels = imageModelOptions.length > 0;
  const isOpenRouter = editingConfig?.provider === "openrouter";
  const canPreviewModels = isCreatingCustomProvider || isOpenRouter;
  const modelGuidance = isOpenRouter
    ? "Enter the OpenRouter API key, load the models this key can use, then choose one. The list does not pick a model for you."
    : editingConfig?.provider === "deepseek"
    ? "It is recommended to use DeepSeek V4 Flash, which takes into account the quality and response speed of Chinese long articles; you can also choose other available models."
    : isCreatingCustomProvider
      ? "After obtaining the model list, the first available model will be automatically filled in; when the interface does not return the list, it can be filled in manually."
      : editingConfig?.kind === "custom" && !canSelectListedModels
        ? "You can click \"Refresh Model\" on the manufacturer card to get the list, or you can manually fill in the default model."
        : "If there is no target model in the list, you can enter it manually.";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <AppDialogContent
        className="max-w-lg"
        title={isCreatingCustomProvider ? "Add custom manufacturer" : isCustomDialog ? "Edit custom manufacturer" : "Configuration model vendor"}
        footer={(
          <>
            <Button className="w-full sm:w-auto" onClick={onSubmit} disabled={submitDisabled}>
              {submitLabel}
            </Button>

            <Button
              variant="secondary"
              className="w-full sm:w-auto"
              onClick={onTest}
              disabled={testDisabled}
            >
              test connection
            </Button>

            {editingConfig?.kind === "custom" ? (
              <Button
                variant="destructive"
                className="w-full sm:w-auto"
                onClick={onDeleteCustomProvider}
                disabled={deleteDisabled}
              >
                {deleteLabel}
              </Button>
            ) : null}
          </>
        )}
        footerClassName="gap-2"
      >
        <div className="space-y-5">
          {isCustomDialog ? (
            <div className="space-y-1">
              <div className="text-xs text-muted-foreground">Manufacturer name</div>
              <Input
                value={form.displayName}
                placeholder="For example: my model gateway"
                onChange={(event) => setForm((prev) => ({ ...prev, displayName: event.target.value }))}
              />
            </div>
          ) : null}

          {(isCustomDialog || editingConfig?.requiresApiKey === false) ? (
            <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
              API Key can be left blank; after filling in the API address, you can get the model list, and the system will select a default model.
            </div>
          ) : null}

          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground"><KeyRound className="h-3.5 w-3.5" /> API Key</div>
            <Input
              type="password"
              value={form.key}
              placeholder={editingConfig?.isConfigured ? "Leave blank to use the saved API Key" : "Enter API Key"}
              onChange={(event) => {
                setForm((prev) => ({ ...prev, key: event.target.value }));
                if (canPreviewModels) {
                  onClearPreviewModels();
                }
              }}
            />
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground"><Link2 className="h-3.5 w-3.5" /> API address</div>
            <Input
              value={form.baseURL}
              placeholder={editingConfig?.defaultBaseURL ?? "https://api.example.com/v1"}
              onChange={(event) => {
                setForm((prev) => ({
                  ...prev,
                  baseURL: event.target.value,
                  model: isCreatingCustomProvider ? "" : prev.model,
                }));
                if (canPreviewModels) {
                  onClearPreviewModels();
                }
              }}
            />
            <div className="text-xs text-muted-foreground">
              {isOpenRouter
                ? "Leave blank to use https://openrouter.ai/api/v1."
                : isCreatingCustomProvider
                ? "Fill in the OpenAI compatible API address, usually ending with /v1; a common local Ollama address is http://127.0.0.1:11434/v1."
                : "Leave blank to use the default address; a common local Ollama address is http://127.0.0.1:11434/v1."}
            </div>
          </div>

          {canPreviewModels ? (
            <div className="space-y-2">
              <Button
                type="button"
                variant="secondary"
                className="w-full sm:w-auto"
                onClick={onPreviewModels}
                disabled={isPreviewingModels || !form.baseURL.trim() || (isOpenRouter && !form.key.trim())}
              >
                {isPreviewingModels ? "Getting..." : "Get model list"}
              </Button>
              {previewModelsResult ? (
                <div className="break-words text-xs text-muted-foreground [overflow-wrap:anywhere]">
                  {previewModelsResult}
                </div>
              ) : null}
            </div>
          ) : null}

          {canSelectListedModels ? (
            <div className="space-y-1">
              <div className="text-xs text-muted-foreground">Available models</div>
              <SearchableSelect
                value={form.model}
                onValueChange={(value) => setForm((prev) => ({ ...prev, model: value }))}
                options={selectableModels.map((model) => ({ value: model }))}
                placeholder="Select model"
                searchPlaceholder="Search model"
                emptyText="No model available"
              />
            </div>
          ) : null}

          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground"><Bot className="h-3.5 w-3.5" /> {primaryModelLabel}</div>
            <div className="text-xs text-muted-foreground">{modelGuidance}</div>
          </div>
          <Input
            value={form.model}
            placeholder="You can also directly enter the model name manually"
            onChange={(event) => setForm((prev) => ({ ...prev, model: event.target.value }))}
          />

          <div className="space-y-3 rounded-xl border bg-muted/20 p-4">
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground"><Image className="h-3.5 w-3.5" /> Image model (optional)</div>
              <div className="text-xs text-muted-foreground">
                After filling in, this manufacturer can be selected for character image generation; leaving it blank will only be used for text models.
              </div>
            </div>
            {canSelectImageModels ? (
              <div className="space-y-1">
                <SearchableSelect
                  value={form.imageModel}
                  onValueChange={(value) => setForm((prev) => ({ ...prev, imageModel: value }))}
                  options={imageModelOptions.map((model) => ({ value: model }))}
                  placeholder="Select image model"
                  searchPlaceholder="Search image model"
                  emptyText="No image model available"
                />
              </div>
            ) : null}
            <Input
              value={form.imageModel}
              placeholder={editingConfig?.defaultImageModel ?? "Enter the image model name"}
              onChange={(event) => setForm((prev) => ({ ...prev, imageModel: event.target.value }))}
            />
            <div className="text-xs text-muted-foreground">
              Image generation will call this vendor's OpenAI compatible image interface.
            </div>
          </div>

          <div className="rounded-xl border border-dashed bg-muted/10 p-4">
            <div className="mb-3 flex items-center gap-1.5 text-xs font-medium text-muted-foreground"><SlidersHorizontal className="h-3.5 w-3.5" /> Request limits</div>
            <ProviderRequestLimitFields
              concurrencyLimit={form.concurrencyLimit}
              requestIntervalMs={form.requestIntervalMs}
              onChange={(value) => setForm((prev) => ({ ...prev, ...value }))}
            />
          </div>

          {testResult ? <div className="break-words text-sm text-muted-foreground [overflow-wrap:anywhere]">{testResult}</div> : null}
        </div>
      </AppDialogContent>
    </Dialog>
  );
}

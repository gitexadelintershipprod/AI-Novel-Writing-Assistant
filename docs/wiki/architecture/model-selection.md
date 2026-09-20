# Current model selection and vendor default-model boundary

## Background

The top model selector affects many AI call entrypoints: Creative Hub, Auto-Director, chapter production, the writing-formula engine, worldbuilding, and character generation. If the current selection lived only in browser local storage, a project restart, a desktop `userData` change, a browser-origin change, or a cleared local cache would send the UI back to a frontend built-in default. That built-in default could land on a vendor's old model name, so a beginner who does not understand model-configuration details would hit an unusable model immediately.

Vendor configuration and current model selection must be separate sources of truth. Vendor configuration answers "how this vendor connects, what its default model is, and whether it can run." Current model selection answers "which vendor and model the top workspace should use now."

## Decision

The current top model selection uses server-side `AppSetting` as the primary source of truth. Frontend state is only a projection for this page session. Browser localStorage no longer decides the long-term default model.

When there is no saved current selection, or the saved vendor cannot run, the system resolves a runnable choice from vendors that are configured, enabled, and have a model list. Resolution prefers the user's saved vendor and model. Only when the saved values are missing or invalid does it use the first candidate in the runnable-vendor list.

A built-in vendor's static model list may only be a settings-page candidate hint or a fallback for already-saved configuration. It must not become the top current model when no model has been saved. When no model is saved, prefer the model catalog the server can fetch. If the catalog cannot be fetched, keep the vendor non-runnable and guide the user to choose or enter a model explicitly on the settings page.

## Current Rule

- The top current model selection is saved to `AppSetting` as `llm.currentSelection`, including provider, model, temperature, and optional maxTokens.
- Frontend `useLLMStore` holds a runtime projection. After the page starts, the settings API and the current-selection API hydrate it together.
- `LLMSelector` only shows vendors that are configured, enabled, and have available models.
- After the user switches vendor or model at the top of the workspace, the frontend should persist that choice to the server current selection.
- A built-in vendor with no saved model must not be treated as runnable just because `PROVIDERS.*.defaultModel` exists. It needs a saved model, an environment model, or a fetchable model catalog.
- Model routing, structured fallback, and per-task explicit model overrides remain independent configuration. They are not the same as the top current model.
- DeepSeek's recommended new-configuration value is `deepseek-v4-flash`. That recommendation only affects configuration guidance and built-in candidate order when no model has been saved. It does not override an existing vendor configuration, the top current selection, or task-level routing.

## Examples

Recommended:

- After the user switches from DeepSeek to Qwen at the top of the workspace, a project restart still reads Qwen and the matching model from the server.
- If a vendor has an API key but no saved model, the server first tries to read that vendor's model catalog and uses the catalog's first item as the currently available model.
- If the model catalog cannot be read, the settings page still allows the user to enter a model manually, but the top selector does not automatically pick a built-in old model name.

Forbidden or discouraged:

- Hard-code `deepseek/deepseek-chat` during frontend state initialization.
- Treat an unfinished vendor as runnable because its static `defaultModel` exists.
- Hide a mismatch between the model catalog and the current-selection source of truth with keywords, vendor-specific branches, or a one-off migration script.

## Failure Modes

- After restart, the top model jumps back to an old default: first check whether `AppSetting.llm.currentSelection` exists, then whether the frontend finished hydration, then whether the current vendor is still in the runnable list from `/api/settings/api-keys`.
- The top selector shows an unusable model: check whether the vendor has only a static default model, whether no model was saved, and whether the model-catalog fetch failed.
- The settings page shows a vendor but the top selector does not: confirm that `isConfigured`, `isActive`, and the model list are all satisfied. A vendor with no configured model must not enter the top candidates.

## Related Modules

- `server/src/services/settings/LLMSelectionSettingsService.ts`
- `server/src/routes/settings/llmSelectionRoutes.ts`
- `server/src/routes/settings.ts`
- `server/src/llm/modelCatalog.ts`
- `client/src/components/layout/LLMSelectionBootstrap.tsx`
- `client/src/components/common/LLMSelector.tsx`
- `client/src/store/llmStore.ts`

## Source Documents

- [Module boundaries and documentation governance](./module-boundaries.md)
- [Project collaboration rules](../../../AGENTS.md)

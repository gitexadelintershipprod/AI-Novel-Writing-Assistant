# Configuration ownership and visibility

## Background

Runtime configuration lives on three layers:

- **`.env` / `process.env`**: read once at process start and immutable while the process runs. Ordinary users cannot see or change it.
- **`AppSetting` database table**: exposed through the settings panel, hot-updated into in-memory objects such as `ragConfig`, and visible and editable for all users.
- **Hard-coded constants in code**: fallback defaults, not exposed through any external interface.

A recurring pattern was "the new feature needs a setting, so put it in `.env`." That caused:

- Users never noticing the change. A developer changed default behavior, operations did not know, users did not know, and diagnosis bounced back and forth.
- Process isolation. A user set a temporary `$env:X=1` in PowerShell, started the dev server, then closed PowerShell while `process.env` still held the old value. Only a service restart applied the intended value.
- Multi-instance drift. The same code on different machines had different env values, so behavior split.
- Wiki and docs lagging behind. Env documentation lived only in `.env.example`, so frontend users never saw it.

A typical incident: `EMBEDDING_CONCURRENCY` was set once when PowerShell started the dev server. Clearing it later did not change the still-running process, so users saw code that claimed "4-way concurrency is enabled" while the process actually ran with concurrency 1.

## Decision

**New runtime-tunable parameters must not be exposed only through `.env`.** They must go through `AppSetting` plus the settings-panel UI so users can see, change, and persist them inside the product.

`.env` may only carry these three kinds of configuration:

1. **Deploy/connection parameters that are immutable at startup**: database URL, listen port, `NODE_ENV`, `PORT`, and similar.
2. **Credentials/secrets**: API keys, tokens, encryption seeds, and other sensitive values users should not see in plaintext in the UI.
3. **Legacy env values**: kept readable during the transition before a settings-panel migration, but the settings panel must also be able to override them.

Business-tuning parameters (concurrency, timeouts, batch size, sampling rate, retrieval thresholds, degradation switches, and similar) **must** enter the settings panel.

## Current Rule

### Four required steps for a new setting

1. **Define a backend key constant**: declare a string constant in `server/src/services/settings/ragSettingKeys.ts` (or the matching module's settingKeys file) and add it to that module's `*_SETTING_KEYS` array.
2. **Load and save on the backend**: add the field in all five places in the matching `*SettingsService.ts` (for example `RagSettingsService` / `RagRuntimeSettingsService`): the type, `applyRuntimeSettings`, `getDefaultSettings`, `get*Settings`, `save*Settings`, and the `upsert` list.
3. **Backend route schema**: add the field to the zod schema in `server/src/routes/settings.ts`, and pass it through the PUT handler to the service.
4. **Frontend UI**:
   - `client/src/api/settings.ts`: add the field in the `*Status` type, the `save*Settings` payload type, and the `Pick<>` return type.
   - `client/src/pages/*/Page.tsx` or the matching Page file: add the field in `useState` initial value, the load `useEffect`, the save `onSuccess`, and the mutate handler.
   - The matching `*SettingsCard.tsx`: add an `<Input>` in the right section, with copy that states the default, tuning guidance, and where the upper bound comes from.

In-memory config objects such as `ragConfig` still keep these fields, but only as defaults. **They must not read `process.env` directly.**

### When env is still allowed

- Startup-fixed deploy parameters such as `DATABASE_URL`, `PORT`, `HOST`, `NODE_ENV`, and `SHADOW_DATABASE_URL`.
- API keys such as `OPENAI_API_KEY`. `AppSetting` may override them, but env is the first-start fallback.
- Parameters such as `*_TIMEOUT_MS` that are **needed only at startup** and have no runtime-tuning need (rare; put them on the panel whenever they can live there).
- Debug switches: `*_VERBOSE_LOG`, `DEBUG=*`.

### When env is forbidden

- All business-tuning parameters: concurrency, batch size, sampling rate, thresholds, retry count, backoff time, and similar.
- Any parameter a user might want to change when asking "why is this slow / expensive / not recalling."
- Any parameter that directly affects cost, rate, or quality.

## Examples

### Recommended: add an `embeddingConcurrency` parameter

```ts
// 1. ragSettingKeys.ts
export const RAG_EMBEDDING_CONCURRENCY_KEY = "rag.embeddingConcurrency";
// add it to RAG_EMBEDDING_SETTING_KEYS

// 2. config/rag.ts
// default only; do not read process.env
embeddingConcurrency: 4,

// 3. RagSettingsService.ts
// add the field in type / apply / default / get / save / upsert
embeddingConcurrency: clampInt(input.embeddingConcurrency, previous.embeddingConcurrency, 1, 16),

// 4. routes/settings.ts schema
embeddingConcurrency: z.coerce.number().int().min(1).max(16),

// 5. frontend
// add the field in api/settings.ts types; KnowledgePage form state; KnowledgeEmbeddingSettingsCard Input
```

After this ships, users can open "Knowledge retrieval settings → Advanced configuration → Embedding request behavior", change the value, and save. It takes effect without a restart.

### Forbidden: write env directly

```ts
// config/rag.ts — incorrect example
embeddingConcurrency: asInt(process.env.EMBEDDING_CONCURRENCY, 4, 1, 16),
```

This hides the parameter from users and recreates the "PowerShell temporary variable + long-running process" stale-value problem.

## Failure Modes

- **Symptom**: a developer changed a default (for example `batchSize` from 16 to 64) only in `.env.example`, while production `.env` still has the old value; or the env value fights the code default.
  - **Diagnosis**: grep every read site for that field and confirm whether any still reads `process.env` directly; inspect the actual value in the `AppSetting` table.
  - **Short-term workaround that must not be used**: tell the user to edit `.env` and restart. That keeps accumulating the "users cannot see the setting" problem.

- **Symptom**: a user says "I already set this to X; why did it not take effect."
  - **Diagnosis**: confirm the setting goes through `AppSetting` (if the frontend shows it, it is using the panel); if it does, check whether backend `apply*RuntimeSettings` actually wrote the in-memory object; check for a third cache, such as a module-level constant that was not refreshed.

- **Symptom**: a long-running dev server disagrees with `.env`.
  - **Common cause**: the env of the shell that started the process is not the env that exists now. The fix is to forbid business parameters from going through env, so changing the panel is what takes effect.

## Related Modules

- `server/src/config/rag.ts`
- `server/src/services/settings/ragSettingKeys.ts`
- `server/src/services/settings/RagSettingsService.ts`
- `server/src/services/settings/RagRuntimeSettingsService.ts`
- `server/src/routes/settings.ts`
- `client/src/api/settings.ts`
- `client/src/pages/knowledge/KnowledgePage.tsx`
- `client/src/pages/knowledge/components/KnowledgeEmbeddingSettingsCard.tsx`

## Source Documents

- Session that produced this convention: knowledge-index concurrency parameters (`EMBEDDING_CONCURRENCY` / `QDRANT_UPSERT_CONCURRENCY`) first landed in env, were recognized as an anti-pattern, and were fully migrated to `AppSetting` plus the settings panel.

# LLM request-limiter memory leak and eviction

## Background

`server/src/llm/requestLimiter.ts` keeps a global `sharedLimiters: Map<string, ProviderModelRequestLimiter>`. The Map key is the composite string `provider:model:concurrencyLimit:requestIntervalMs`.

Every time a user changes a provider’s concurrency or request interval on Settings, `concurrencyLimit` / `requestIntervalMs` change, `getLimiterKey` produces a new key, and the old key’s entry stays in the Map forever. Over a long run the Map keeps growing and leaks memory.

## Decision

Add an exported `evictSharedLimiters(provider: string)`: walk the Map and delete every key that starts with `provider:`.

LLM clients that still hold a reference to the old instance can finish in-flight requests (the reference is not released). New requests use the instance created with the new configuration. There is no request-interruption risk.

The eviction call site lives at the **routes layer**, triggered together with `setProviderSecretCache`:

| Call site | Trigger |
|----------|---------|
| `server/src/routes/settings.ts` | Built-in provider upsert (including enable/disable) |
| `server/src/routes/settings/customProviderRoutes.ts` | Custom provider delete |

## Current Rule

- `evictSharedLimiters` lives only at the routes layer, not in SecretStore (SecretStore is a data-access layer and should not know LLM-subsystem internals).
- Any route that changes provider configuration must call `evictSharedLimiters` after `setProviderSecretCache`.
- If a provider-configuration change path is added outside the routes layer later, eviction must be called there too.

## Failure Modes

- **Eviction later than a request**: very low probability — there is a race between the configuration change and an old-limiter call, but the old limiter instance does not become invalid because of eviction, and in-flight requests still complete.
- **Missed call site**: if a new provider-configuration route forgets `evictSharedLimiters`, old entries still accumulate. Suggested check: when grepping `setProviderSecretCache` call sites, also check for a paired `evictSharedLimiters`.

## Related Modules

- `server/src/llm/requestLimiter.ts` — `sharedLimiters` Map, `evictSharedLimiters`
- `server/src/routes/settings.ts` — built-in provider configuration changes
- `server/src/routes/settings/customProviderRoutes.ts` — custom provider delete

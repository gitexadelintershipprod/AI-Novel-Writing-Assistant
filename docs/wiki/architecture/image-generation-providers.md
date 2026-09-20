# Image generation provider boundary

## Background

Character-portrait generation is aimed at writing beginners, so the configuration entrypoint must stay low-burden. Users should only need to understand "which vendor owns the text model and which model owns image generation." They should not have to judge a built-in vendor allowlist or manually repair frontend/backend vendor enums.

Image generation in this project defaults to the OpenAI-compatible `/images/generations` API. Some built-in vendors have recommended image models, but custom gateways, local forwarding services, and aggregator APIs may expose the same image API.

## Decision

Image-model settings are no longer bound to a fixed built-in vendor. Any saved model vendor may configure a separate image model. Only vendors that are already enabled, have complete connection information, and have an image model appear in the character-portrait generation vendor list.

## Current Rule

- The default text model and the image model are two independent settings.
- The image model is saved under the `provider.imageModel.<provider>` setting key. The provider does not have to be a built-in vendor.
- Built-in vendors may offer recommended image-model options. Custom vendors do not preset options by default, but manual entry is allowed.
- Image generation reads the provider and model on the task, then calls `/images/generations` with that provider's saved API address and API key.
- Custom or local OpenAI-compatible services may omit an API key; the request then omits the Authorization header.
- The frontend selection list for character portraits must come from current settings data. It must not be hard-coded as a fixed list such as `openai`, `siliconflow`, or `grok`.

## Failure Modes

- If the settings page allows an image model to be entered, but the character-image generation page still hard-codes vendors, users will think the custom vendor failed to save.
- If the backend only allows fixed vendors into image generation, the frontend dynamic list will offer options that fail after the task is submitted.
- If deleting a custom vendor leaves the old image-model setting behind, recreating a vendor with the same name may inherit a stale image model and create hard-to-explain configuration pollution.

## Related Modules

- `server/src/services/settings/ProviderImageSettingsService.ts`
- `server/src/services/image/provider.ts`
- `server/src/routes/settings.ts`
- `server/src/routes/settings/customProviderRoutes.ts`
- `client/src/pages/settings/components/ProviderConfigDialog.tsx`
- `client/src/pages/characters/components/CharacterImageDialog.tsx`

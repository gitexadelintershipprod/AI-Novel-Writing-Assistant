# Prompting Registry

`server/src/prompting/` is the only allowed entrypoint for adding new product-level prompts in this project.

## Hard Rules

- New product-level prompts must be defined as a `PromptAsset`.
- New product-level prompts must live under `server/src/prompting/prompts/<family>/`.
- New product-level prompts must be registered in `server/src/prompting/registry.ts`.
- New product-level prompts must enter the prompt management catalog and support catalog search, version viewing, context preview, and controlled testing; registering a runtime asset alone does not count as completed governance.
- New business capabilities must not assemble `systemPrompt/userPrompt` inside a service and then call `invokeStructuredLlm`.
- New business capabilities must not use a bare `getLLM()` from service code to make product-level prompt calls.
- When touching an existing unregistered prompt business path, default to migrating it into the registry instead of continuing to expand the old file.

## Allowed Exceptions

- The internal JSON repair prompt in `server/src/llm/structuredInvoke.ts`.
- Connectivity / probe prompts such as `server/src/llm/connectivity.ts`.
- Phase-two flow adapters in `graphs/*`, `routes/chat.ts`, `services/novel/runtime/*`, and other stream bridge code.

## Asset Checklist

When adding a new prompt, you must also provide:

- `id`
- `version`
- `taskType`
- `mode`
- `language`
- `contextPolicy`
- `outputSchema`, or `postValidate` for text mode
- `render()`

Optional but recommended to evaluate at the same time:

- `repairPolicy`: controls how many structured JSON/schema repair attempts are allowed
- `semanticRetryPolicy`: controls how many unified semantic retries run after `postValidate` fails

Prose-generation prompts must also provide:

- Safe basic editing slots for tone, pacing, paragraphs, dialogue, description, hooks, and forbidden tendencies;
- Advanced System / Human template editing, supporting work scope, context tokens, preview, test, version, rollback, and restore of the official template;
- Required-context protection so character hard facts, tasks, continuity, world rules, platform writing, and style contracts cannot be silently removed by a template;
- PromptAsset / catalog capability declarations; the frontend must not decide advanced-edit support from a hardcoded Prompt ID.

`PromptAsset.management` is the trusted declaration of prompt-management capability:

- `productPrompt` means the asset must enter the catalog, preview, and controlled testing;
- `proseGeneration` means it belongs to the novel-prose governance gate;
- `editModes` declares `readonly`, `slots`, and `advanced_template`; the frontend may render only according to that capability;
- `advancedTemplate.requiredContextGroups` defines official context that an advanced template cannot silently remove.

When a structured prose prompt uses an advanced template, the custom template is compiled first, structured-output instructions are then appended by the runtime, and the final output must still pass the registered asset Schema. User templates cannot override or delete Schema, repair, postValidate, or the output-field contract.

## Naming

- Use a `family.capability` style `id`
- Use `v1`, `v2` for `version`
- Examples:
  - `audit.chapter.full@v2`
  - `world.structure.generate@v1`
  - `style.recommendation@v1`

## Runner Usage

- Structured output uses `runStructuredPrompt`
- Plain-text output uses `runTextPrompt`
- Streaming text output uses `streamTextPrompt`
- Streaming structured output uses `streamStructuredPrompt`
- Callers keep the original service public method, database writes, and return shape

Notes:

- `repairPolicy` handles repair after JSON parse / schema validation failure
- `semanticRetryPolicy` handles regeneration when JSON is already valid but `postValidate` did not pass

## Migration Default

- If a prompt is not yet assetized, do not keep adding branches in the original service.
- Create the asset first, then switch the service to registry + runner.

# Prompt Governance Audit 2026-05-08

## Scope

This checkpoint records the governance state of prompt-management system phase one. The current phase only completes metadata needed for management, preview, audit, and later safe editing. Strengthening the chapter-quality Prompt Contract is not a goal of this phase.

## Governance Fields

Prompt Catalog and governance tests use these fields as the minimum audit surface:

| Field | Purpose | Current Handling |
| --- | --- | --- |
| `id` / `version` | Stable location of a prompt asset | Required on every registered asset |
| `taskType` / `mode` | Explicit model routing and output shape | Required on every registered asset |
| `outputSchema` | Structured-output boundary | Catalog marks the capability for structured prompts |
| `postValidate` | Business semantic validation | Catalog marks the capability; slot override is forbidden |
| `repairPolicy` | JSON repair policy | Catalog marks the capability; slot override is forbidden |
| `semanticRetryPolicy` | Semantic retry policy | Catalog marks the capability; slot override is forbidden |
| `contextRequirements` | Context contract for preview and tracing | Fill core chains first |
| `editableSlots` | Later low-risk expression-edit boundary | Declare and display only; do not wire runtime override |
| `lockedFields` | Forbidden-edit boundary | Catalog always displays schema, validation, routing, context, and related fields |

## Domain Status

| Capability Domain | Representative Prompt | Status | Notes |
| --- | --- | --- | --- |
| Creative Hub | `planner.intent.parse@v1` | Registered; management metadata still being filled | Already declares creative-hub resource binding, recent messages, novel basic information, and production-status context requirements. |
| Auto-director | `novel.director.workspace_analysis@v1`, `novel.director.manual_edit_impact@v1` | Fully governed | Already enters preview through workspace / manual-edit inventory context blocks. |
| Chapter writing | `novel.chapter.writer@v5` | Fully governed | Already declares chapter-writing context requirements, and added slot metadata for tone, anti-AI flavor, and ending-hook preference. |
| Chapter editor | `novel.chapter_editor.workspace_diagnosis@v1`, `novel.chapter_editor.user_intent@v1`, `novel.chapter_editor.rewrite_candidates@v2` | Registered; management metadata still being filled | Core context requirements filled; candidate rewrite style opened as a low-risk slot. |
| Chapter review and repair | `audit.chapter.full@v2`, `audit.chapter.light@v1`, `novel.review.*` | Partially fully governed | audit full/light already have context requirements and report-expression slots; review repair/patch still need later management metadata. |
| Volume and chapter split | `novel.volume.*` | Registered but missing management metadata | Most already have schema, postValidate, or retry; next phase fills Context Requirements. |
| Character | `novel.character.*`, `novel.character_resource.*` | Registered but missing management metadata | Already in the registry; later fill context contracts separately for character generation, character resources, and relationship inference. |
| Worldbuilding | `world.*`, `storyWorldSlice.generate@v1` | Registered but missing management metadata | Already in the registry; later fill world-asset, reference-material, and local-slice context declarations. |
| Style | `style.*`, `writingFormula.*` | Registered but missing management metadata | Current focus is auditable registration; expression-layer slots wait until the management UI is stable. |
| Book analysis / supporting capabilities | `bookAnalysis.*`, `title.generation@v1`, `image.character.prompt_optimize@v1` | Registered but missing management metadata | Low-risk later-fill queue. |

## Registry Outside Migration List

Calls still outside the registry are split into two kinds:

| Path | Status | Handling |
| --- | --- | --- |
| `server/src/llm/structuredInvoke.ts` | Approved exception | Internal JSON repair capability; not a product-level prompt migration. |
| `server/src/llm/connectivity.ts` | Approved exception | Connectivity probe; not a product-level prompt migration. |
| `server/src/routes/chat.ts` | Phase exception | Still owns stream-bridge duty; split later when runtime is unified. |
| `server/src/graphs/*` | Phase exception | Auto-director / phase-two bridges are kept; do not keep expanding business prompts here. |
| `server/src/services/title/titlePromptBuilder.ts` | Pending migration | Old title prompt builder; migrate into the registry when the title chain is next touched. |
| `server/src/services/novel/novelCoreGenerationService.ts` | Pending migration | Old core generation chain; migrate as a product prompt later. |
| `server/src/services/world/worldDraftGeneration.ts` | Pending migration | Direct `getLLM` use is kept only on the existing allow list; new capabilities must not follow this path. |
| `server/src/agents/planner/intentPromptSupport.ts` | Support file | Provides enum and render support for the already registered `planner.intent.parse`; not a new business-prompt entrypoint. |

## Preview Contract

Prompt Preview stays read-only:

- Does not call a model.
- Does not save an override.
- Returns final `messages`, selected context blocks, dropped context blocks, missing required groups, resolver errors, and trace preview.
- On failure or insufficient context, expose the reason to administrators, for example missing `novelId`, missing `chapterId`, or a resolver that did not return a required group.

## Editable Slots V1

This phase only displays declarations and does not wire runtime override.

Opened low-risk slots:

- `writer.tonePreference`
- `writer.antiAiRules`
- `writer.endingHookPreference`
- `audit.reportStyle`
- `chapterEditor.candidateStyle`

Forbidden edit fields:

- `outputSchema`
- `postValidate`
- `postValidateFailureRecovery`
- `semanticRetryPolicy`
- `taskType`
- `mode`
- `contextPolicy`
- `toolCatalog`
- `approvalBoundary`
- required context

## Override And Trace Design

`PromptOverrideDraft` enters the code only as a type design. Lifecycle is `draft`, `published`, `rolled_back`. This phase does not add a publish API and does not let Prompt Runner load an active override.

Minimum fields of `PromptRunTrace` include:

- prompt id / version / taskType
- context block ids, dropped ids, summarized ids
- provider, model, latency
- repair / retry counts
- entrypoint, novelId, chapterId, taskId
- reserved fields for compiled hash and context snapshot hash

Prompt Workbench Preview returns `tracePreview`, providing a structural base for a later investigation view of “why this generation was bad.”

## Technical Debt Closed

`server/src/prompting/workflows/workflowRegistry.ts` has been split into per-domain registration files:

- `generalWorkflowDefinitions.ts`
- `productionWorkflowDefinitions.ts`
- `directorWorkflowDefinitions.ts`
- `chapterWorkflowDefinitions.ts`
- `workflowTypes.ts`

The main registry only aggregates, judges collaboration hold, and resolves workflows.

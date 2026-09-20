# Prompt Workbench, Context Assembly, and Unified Step Runtime Plan

Updated: 2026-04-28

Related documents:

- `docs/wiki/workflows/auto-director-runtime.md`
- `docs/plans/auto-director-execution-plane-isolation-plan.md`
- `docs/plans/director-mode-module-state-refactor-checklist.md`

## 1. Document Purpose

This document records the long-term plan for visual prompt editing, data retrieval during prompt assembly, Creative Hub compatibility, and a unified runtime for Auto-Director and the chapter pipeline.

Core conclusions:

- The prompt workbench should not be only a large text box. It should be a unified observation and debug entry for Prompt, Context, and Step Runtime.
- Prompt templates do not query the database directly. Data retrieval is owned by a unified Context Broker / Resolver.
- Auto-Director mode and the chapter pipeline should not remain two long-lived separate chains. They should call the same set of Step Modules.
- Creative Hub, Auto-Director, the chapter pipeline, and manual buttons should all enter a unified Workflow Plan, then be executed by Step Module Runtime.

TypeScript structures in this document are conceptual contracts. Landing them should migrate gradually against the existing `server/src/prompting/`, `server/src/creativeHub/`, `server/src/services/novel/director/`, `server/src/services/novel/runtime/`, and workflow-task systems.

## 2. Current Foundation and Constraints

The project already has a solid prompt base:

- `server/src/prompting/core/promptTypes.ts` defines `PromptAsset`, `PromptContextBlock`, `ContextPolicy`, `PromptInvocationMeta`.
- `server/src/prompting/core/promptRunner.ts` uniformly handles registration checks, context filtering, structured output, repair, semantic retry, and logging.
- `server/src/prompting/registry.ts` uniformly registers product-level prompts.
- `server/src/prompting/prompts/novel/chapterLayeredContext.ts` already splits chapter-writing context into multiple `PromptContextBlock`s.
- `server/src/services/novel/runtime/GenerationContextAssembler.ts` already has a prototype of chapter runtime context assembly.
- `server/src/creativeHub/CreativeHubLangGraph.ts` already has a Creative Hub graph execution entry, resource binding, checkpoint, interrupt, and AgentRun records.

Therefore this plan does not recommend turning prompts into pure database strings, and does not recommend letting the visual editor replace `PromptAsset` outright. The more reasonable direction is to keep the code-level safety base and add a visual, auditable, rollback-capable overlay on top.

Project constraints that must be kept:

- Product-level prompts still use `server/src/prompting/` as the governance entry.
- Decision paths such as intent recognition, task classification, planning, routing, and tool selection must stay AI-first.
- Do not hide AI understanding failures with keyword matching, hard-coded regex, or non-AI fallbacks.
- For beginner users, prefer lower cognitive load and let the system provide clear defaults and automatic recommendations.
- Extensions to Auto-Director, chapter production, and Creative Hub should go through unified contracts, not keep stacking large service branches.

## 3. Overall Architecture

The long-term goal is to split the system into three layers:

```text
Prompt = template expression and output contract
Context = data, memory, retrieval, state, and budget selection
Orchestration = Creative Hub / Auto-Director / chapter pipeline / manual entry
```

Unified call chain:

```text
Creative Hub / Auto-Director / manual button / preset chapter pipeline
  ↓
Workflow Planner
  ↓
Workflow Plan
  ↓
Step Module Runtime
  ↓
Context Broker
  ↓
Prompt Runner
  ↓
Artifact / State / Event / Trace
```

Key judgments:

- Auto-Director is not an upper wrapper around the chapter pipeline.
- The chapter pipeline is not an independent large black box.
- Both should call the same set of creation step modules.
- The only differences are who generates the `WorkflowPlan` and which execution policy is used.

## 4. Prompt Workbench Design

### 4.1 Three-layer Prompt model

Layer 1: Base PromptAsset.

- Maintained in code.
- Owns stable default behavior.
- Includes `id`, `version`, `taskType`, `mode`, `contextPolicy`, `outputSchema`, `render()`, `postValidate()`.
- Is the safety baseline for tests, release, rollback, and fault diagnosis.

Layer 2: Prompt Override.

- Stored in the database.
- Only overrides fragments declared as editable.
- Does not replace the entire PromptAsset.
- Supports draft, publish, rollback, canary, and experiment.

Layer 3: Prompt Experiment.

- Used for A/B, canary, fixture-set testing, and failure-rate comparison.
- Records hit conditions, target entrypoints, enablement scope, validation results, and rollback state.

### 4.2 Editable and non-editable boundaries

Ordinary editing may change:

- expression style;
- review standards;
- chapter-generation tone and pacing preferences;
- writing requirements for titles, summaries, openings, and ending hooks;
- how follow-up questions and options are organized for the user.

Advanced configuration may adjust:

- optional context-group priority;
- budget configuration;
- whether a given context class may be refreshed;
- whether some non-critical context groups are enabled.

Not open for free editing by default:

- `outputSchema`;
- `postValidate`;
- `semanticRetryPolicy`;
- intent enums;
- tool catalog;
- permission summary;
- critical required context groups;
- approval policy and destructive-action boundaries.

### 4.3 Override data shape

Do not save one free-text blob that overlays the entire prompt. Save structured slots:

```ts
type PromptOverrideDraft = {
  promptId: string;
  baseVersion: string;
  scope: "global" | "project" | "novel" | "experiment";
  slots: Record<string, string>;
  notes?: string;
};
```

Example:

```json
{
  "promptId": "novel.chapter.writer",
  "baseVersion": "v5",
  "scope": "global",
  "slots": {
    "system.role": "You are a writing assistant for long-form Chinese web novels.",
    "system.structureRules": "Enter the current situation quickly at the opening, the middle must advance, and the ending must leave pressure for the next chapter.",
    "system.antiAiRules": "Avoid empty psychological monologue, repeated recap, and descriptions with no information."
  }
}
```

The Base PromptAsset declares which slots are editable:

```ts
type PromptEditableSlot = {
  key: string;
  label: string;
  description: string;
  riskLevel: "low" | "medium" | "high";
  maxLength?: number;
  defaultValue: string;
};
```

### 4.4 Workbench UI capabilities

The prompt workbench should include:

- Prompt Catalog: browse registered prompts by capability, workflow, and task type.
- Slot Editor: fragment editing, instead of dropping the user into a whole system prompt.
- Context Preview: see which context blocks this call will use.
- Final Messages Preview: preview final system / human messages.
- Diff View: compare Base, Override, and Compiled Prompt.
- Test Case Runner: dry-run against a novel, chapter, Creative Hub thread, or fixture input.
- Validation Report: show schema, postValidate, token budget, required blocks, and risk checks.
- Publish / Rollback: publish, withdraw, and roll back to a historical revision.
- Trace Explorer: from a failed task, look back at prompt version, context blocks, model, output, and error.

For ordinary writers, the product surface should not expose “prompt engineering.” Wrap it as writing strategy:

- faster pacing;
- denser pleasure points;
- more colloquial voice;
- stronger chapter endings;
- less AI flavor;
- heavier character pull.

The system then turns those strategies into controlled overrides.

## 5. Data Retrieval During Prompt Assembly

### 5.1 Basic principle

Prompt templates do not query the database directly.

`PromptAsset.render()` only consumes:

- `promptInput`
- `PromptRenderContext`
- already filtered `PromptContextBlock[]`

Data retrieval is completed by a unified Context Broker / Resolver. That guarantees:

- data sources are traceable;
- budget filtering is unified;
- prompt visual preview is consistent;
- Creative Hub, Auto-Director, and the chapter pipeline can reuse the same context capability;
- failure recovery and replay can choose snapshot or refreshed data.

### 5.2 Context Requirement

Each PromptAsset or Step Module declares the context it needs:

```ts
type ContextRequirement = {
  group: string;
  required?: boolean;
  priority: number;
  maxTokens?: number;
  freshness?: "snapshot" | "fresh" | "hybrid";
  sourceHint?: string;
};
```

Example:

```ts
const chapterWriteRequirements: ContextRequirement[] = [
  { group: "book_contract", required: true, priority: 100 },
  { group: "chapter_mission", required: true, priority: 100 },
  { group: "volume_window", priority: 96 },
  { group: "participant_subset", required: true, priority: 92 },
  { group: "local_state", required: true, priority: 89 },
  { group: "style_contract", required: true, priority: 74 },
  { group: "recent_chapters", priority: 86 },
  { group: "open_conflicts", priority: 88 }
];
```

### 5.3 Context Broker

The Context Broker turns run entrypoint, resource bindings, and prompt/step requirements into context blocks.

```ts
interface PromptExecutionContext {
  entrypoint: "creative_hub" | "auto_director" | "chapter_pipeline" | "manual_test";
  graphNode?: string;
  workflowRunId?: string;
  stepRunId?: string;
  runId?: string;
  threadId?: string;
  checkpointId?: string;
  novelId?: string;
  chapterId?: string;
  worldId?: string;
  taskId?: string;
  styleProfileId?: string;
  userGoal?: string;
  resourceBindings?: Record<string, unknown>;
}

interface ContextBroker {
  resolve(input: {
    executionContext: PromptExecutionContext;
    requirements: ContextRequirement[];
    mode: "snapshot" | "fresh" | "hybrid";
  }): Promise<PromptContextBlock[]>;
}
```

### 5.4 Context Resolver Registry

Each data class is owned by an independent resolver:

```ts
interface ContextResolver {
  group: string;
  resolve(input: PromptExecutionContext): Promise<PromptContextBlock | PromptContextBlock[]>;
}
```

Prefer abstracting these resolvers first:

| Context group | Primary source | Purpose |
| --- | --- | --- |
| `creative_hub.bindings` | CreativeHubResourceBinding | Hub understanding of currently bound resources |
| `creative_hub.recent_messages` | CreativeHubCheckpoint messages | Hub conversation continuity |
| `creative_hub.latest_turn_summary` | checkpoint metadata | Hub next-turn handoff |
| `creative_hub.novel_setup_status` | NovelSetupStatusService | Beginner book-opening guidance |
| `creative_hub.production_status` | NovelProductionStatusService | Whole-book production status |
| `book_contract` | Novel / BookContract / CanonicalState | Book-level promises and hard constraints |
| `story_macro` | StoryMacroPlan | Macro conflict, selling points, growth lines |
| `chapter_mission` | Chapter / StoryPlan / CanonicalState | State changes this chapter must complete |
| `volume_window` | VolumePlan / VolumeChapterPlan | Current-volume tasks and adjacent-volume boundaries |
| `participant_subset` | Character / CharacterDynamics | Characters relevant to this chapter |
| `local_state` | CanonicalStateService | Current situation, secrets, relations, conflicts |
| `payoff_ledger` | PayoffLedgerSyncService | Planted-setup fulfillment pressure |
| `character_resource` | CharacterResourceLedgerService | Items, resources, hold state |
| `style_contract` | StyleBindingService | Writing-engine compile result |
| `world_slice` | NovelWorldSliceService | Executable world rules for the current novel |
| `rag_context` | HybridRetrievalService | Knowledge-base retrieval supplement |
| `recent_chapters` | ChapterSummary / Chapter content | Local continuity and anti-repetition |

### 5.5 Context Plan

Generate a Context Plan before the run:

```ts
type ContextPlan = {
  promptKey?: string;
  stepId?: string;
  scope: PromptExecutionContext;
  requiredGroups: string[];
  optionalGroups: string[];
  maxTokensBudget: number;
  mode: "snapshot" | "fresh" | "hybrid";
};
```

The Context Plan exists so that:

- the workbench can preview which data this call will fetch;
- Auto-Director can understand why a step is missing data;
- failure recovery knows which data must stay frozen and which may refresh;
- a test set can stably reproduce one prompt call.

### 5.6 Snapshot, fresh, and hybrid modes

Both Creative Hub and Auto-Director need replay, so context must support three modes:

- `snapshot`: use the context snapshot saved at that time, guaranteeing reproduction.
- `fresh`: re-query latest data, suitable for continuing creation.
- `hybrid`: use snapshot for key facts, refresh state-class data.

Suggested defaults:

- approval recovery: `snapshot` or `hybrid`.
- failure replay: `snapshot`.
- user continues creating: `fresh`.
- Auto-Director takeover: `fresh`.
- chapter repair: `hybrid`.

## 6. Creative Hub Compatibility Design

Creative Hub should not merely flatten bound resources into one system message. It should generate standard context blocks through the Context Broker.

Current `CreativeHubResourceBinding` can serve as the unified scope:

```ts
type CreativeHubResourceBinding = {
  novelId?: string | null;
  chapterId?: string | null;
  worldId?: string | null;
  taskId?: string | null;
  bookAnalysisId?: string | null;
  formulaId?: string | null;
  styleProfileId?: string | null;
  baseCharacterId?: string | null;
  knowledgeDocumentIds?: string[];
};
```

Each Creative Hub graph node can declare prompt and context:

```ts
const creativeHubNodePromptPlan = {
  coordinator_plan: {
    prompt: "planner.intent.parse@v1",
    context: [
      "creative_hub.bindings",
      "creative_hub.recent_messages",
      "creative_hub.novel_setup_status",
      "creative_hub.production_status",
      "tool_catalog",
      "permission_summary"
    ]
  },
  answer_finalize: {
    prompt: "agent.runtime.fallback_answer@v1",
    context: [
      "tool_results",
      "creative_hub.latest_turn_summary",
      "creative_hub.novel_setup_status",
      "creative_hub.production_status"
    ]
  }
};
```

Each hub prompt call records:

```ts
type PromptRunTrace = {
  promptId: string;
  baseVersion: string;
  overrideRevisionId?: string | null;
  compiledHash: string;
  contextSnapshotId?: string | null;
  contextBlockIds: string[];
  droppedContextBlockIds: string[];
  entrypoint: "creative_hub" | "auto_director" | "chapter_pipeline" | "manual_test";
  runId?: string | null;
  threadId?: string | null;
  checkpointId?: string | null;
  stepRunId?: string | null;
};
```

Then Creative Hub can show in the UI:

- what intent this turn recognized;
- which resource bindings were used;
- which context participated in the judgment;
- which steps were finally called;
- which step failed or is waiting for approval;
- how the user can continue from the current checkpoint.

## 7. Unified Step Module Runtime

### 7.1 Core positioning

Auto-Director, the chapter pipeline, and Creative Hub should not each own an independent creation chain. They should uniformly call Step Module Runtime.

Positioning:

```text
Auto-Director = decision / orchestration layer
Chapter pipeline = one preset orchestration scheme
Creative Hub = human-computer interaction entry
Unified underlying execution = Step Module Runtime
```

### 7.2 Step Module contract

```ts
interface WorkflowStepModule<I, O> {
  id: string;
  label: string;
  stage: string;

  inputSchema: unknown;
  outputSchema: unknown;

  contextRequirements: ContextRequirement[];
  promptAssets?: Array<{ id: string; version: string }>;

  validatePreconditions(input: I, ctx: StepExecutionContext): Promise<StepGateResult>;
  execute(input: I, ctx: StepExecutionContext): Promise<O>;

  summarizeResult(output: O): StepSummary;
  getApprovalPolicy?(input: I, output?: O): ApprovalPolicy;
}
```

A Step Module should not own cross-chain orchestration. It only owns one clear creation action.

### 7.3 Suggested step modules

The first batch can wrap and migrate existing capabilities:

| Step id | Duty |
| --- | --- |
| `workspace.analyze` | Scan current novel assets, tasks, risks, and next-step suggestions |
| `book.candidate.generate` | Generate book-level candidate directions |
| `book.contract.generate` | Generate Book Contract |
| `story.macro.plan` | Generate story macro plan |
| `world.skeleton.ensure` | Generate or complete the world skeleton for the project |
| `character.cast.prepare` | Generate or complete the character cast |
| `volume.strategy.plan` | Generate volume strategy |
| `volume.skeleton.plan` | Generate volume skeleton |
| `volume.beat_sheet.plan` | Generate volume beat segments |
| `chapter.list.plan` | Generate chapter list |
| `chapter.task_sheet.plan` | Generate chapter task sheet |
| `chapter.context.prepare` | Assemble chapter writing context |
| `chapter.draft.write` | Generate chapter prose |
| `chapter.quality.review` | Review chapter quality |
| `chapter.draft.repair` | Repair chapter draft |
| `chapter.state.commit` | Commit canonical state after the chapter |
| `payoff.ledger.sync` | Sync payoff ledger |
| `character.resource.sync` | Sync character resource ledger |
| `workflow.summarize` | Generate this-run execution summary |

### 7.4 Chapter pipeline becomes a Workflow Template

The chapter pipeline is no longer an independent large service. It is a preset template:

```ts
const fastChapterPipeline = {
  id: "pipeline.fast_chapter_generation",
  steps: [
    "chapter.context.prepare",
    "chapter.draft.write",
    "chapter.quality.review",
    "chapter.draft.repair",
    "chapter.state.commit",
    "payoff.ledger.sync",
    "character.resource.sync"
  ]
};
```

Different modes are only different templates:

- Fast writing: light review, low cost.
- Standard writing: full context, light review, necessary repair.
- Polished writing: full review, repair, state sync, ledger sync.
- Continue-writing mode: add prior-text continuation and anti-repetition constraints.
- Rewrite mode: add keep-boundaries and difference checks.

### 7.5 Auto-Director becomes a Workflow Planner

Auto-Director does not execute the chapter chain directly. It generates or adjusts a Workflow Plan:

```ts
type WorkflowPlan = {
  goal: string;
  policy: RuntimePolicy;
  steps: Array<{
    stepId: string;
    input: Record<string, unknown>;
    dependsOn?: string[];
    approval?: "never" | "risky" | "always";
  }>;
};
```

Example:

```text
User: continue writing this book through chapter 10

Auto-Director plan:
1. workspace.analyze
2. world.skeleton.ensure
3. character.cast.prepare
4. volume.strategy.plan
5. chapter.task_sheet.plan(1-10)
6. pipeline.fast_chapter_generation(1-10)
```

Failure-recovery example:

```text
Chapter 7 failed

Auto-Director plan:
1. workspace.analyze
2. chapter.quality.review(chapter=7)
3. character.resource.sync
4. chapter.draft.repair(chapter=7)
5. chapter.state.commit(chapter=7)
```

## 8. Unified Run Records

Long term, unify these concepts:

```text
WorkflowRun
WorkflowStepRun
PromptRunTrace
ContextSnapshot
StepArtifact
ApprovalRecord
DirectorEvent
```

Each step should at least record:

```ts
type WorkflowStepRun = {
  id: string;
  workflowRunId: string;
  stepId: string;
  status: "queued" | "running" | "waiting_approval" | "succeeded" | "failed" | "cancelled";
  inputJson: string;
  outputJson?: string | null;
  contextSnapshotId?: string | null;
  promptTraceIds: string[];
  approvalState?: string | null;
  retryCount: number;
  error?: string | null;
};
```

Short-term landing does not have to add every table immediately. Reuse or extend first:

- `NovelWorkflowTask`
- `AgentRun`
- `AgentStep`
- workflow milestone
- task center detail step
- auto director follow-up action log

Conceptually, converge toward unified StepRun so later work does not keep producing multiple task-state systems.

## 9. Relationship to the Artifact Ledger

Step Module output should write into the artifact ledger or the corresponding business table, with version, source, and dependency links.

Phase one can start with an index-style Artifact Ledger:

```ts
type ArtifactRecord = {
  id: string;
  type:
    | "book_contract"
    | "story_macro"
    | "character_cast"
    | "volume_strategy"
    | "chapter_task_sheet"
    | "chapter_draft"
    | "audit_report"
    | "repair_ticket";
  ownerType: "novel" | "chapter" | "volume" | "workflow";
  ownerId: string;
  version: number;
  sourceStepRunId?: string | null;
  sourcePromptTraceIds?: string[];
  dependencyArtifactIds?: string[];
  status: "draft" | "active" | "stale" | "rejected";
};
```

Then both user manual edits and AI generation can enter the same artifact system.

## 10. Policy and Approval

The unified runtime must turn control into policy, not process forks.

```ts
type RuntimePolicy = {
  mode: "manual" | "co_pilot" | "auto_until_checkpoint" | "full_auto";
  overwriteUserContent: "never" | "ask" | "allowed";
  destructiveAction: "never_without_approval";
  approvalLevel: "low" | "medium" | "high";
  maxAutoRepairAttempts: number;
};
```

Policy examples:

- Beginner book opening: allow AI to auto-complete planning, but key candidate directions need confirmation.
- Chapter generation: can auto-write drafts and light-review, but overwriting existing prose needs approval.
- Repairing a failed chapter: may auto local-repair once; if it still fails, pause and explain.
- Taking over an existing project: analyze first; do not overwrite downstream artifacts directly.

## 11. Visualization and Debug Capability

This plan should eventually support these UIs:

- Workflow Plan view: see which Step Modules Auto-Director plans to call.
- Step Run view: see each step’s input, output, status, approval, and error.
- Prompt Trace view: see each prompt’s version, override, context, and final messages.
- Context View: see where data came from, token estimates, and whether it was dropped.
- Artifact View: see artifact version, source step, dependencies, and staleness.
- Replay View: replay from a step in snapshot/fresh/hybrid mode.

That makes prompt visualization more than a prompt editor. It becomes the debug control console of the AI creation system.

## 12. Landing Roadmap

### 12.1 Phase 1: Read-only visualization and contract completion

- Add a Prompt Catalog API listing prompt, version, taskType, mode, contextPolicy.
- Add a Prompt Preview API that renders final messages for a sample scope.
- Add conceptual definitions of `editableSlots` and `contextRequirements` for core prompts.
- Wrap Creative Hub binding, recent messages, and novel setup status as standard context blocks.

### 12.2 Phase 2: Context Broker

- Extract `ContextBroker` and `ContextResolverRegistry`.
- Cover chapter writing, chapter review, Creative Hub planning, and Creative Hub final answer first.
- Record context block ids, dropped ids, and snapshot hash at runtime.
- Support snapshot/fresh/hybrid context modes.

### 12.3 Phase 3: Prompt Override

- Add Prompt Override draft, publish, and rollback.
- Open only low-risk slots.
- Record compiled hash after compile.
- Prompt Runner loads the active override on call.
- Workbench supports diff, preview, dry-run, and validation report.

### 12.4 Phase 4: Step Module wrap-and-migrate

- First wrap existing chapter-execution capabilities as step modules.
- Wrap existing Auto-Director stages as step modules.
- Turn the chapter pipeline into a workflow template.
- Turn Auto-Director into a workflow planner that outputs a workflow plan.
- Creative Hub tool calls also enter the same Step Runtime.

### 12.5 Phase 5: Unified tracing and replay

- Unify WorkflowRun / StepRun / PromptTrace / ContextSnapshot concepts.
- Connect Creative Hub checkpoints.
- Support replaying from a given step after failure.
- Support Auto-Director dynamically adjusting the next step from step result and artifact health.

## 13. Risks and Boundaries

Main risks:

- Opening free editing of the entire prompt too early will break structured output and business validation.
- If each prompt fetches its own data, later unified preview, tracing, and replay become impossible.
- If Auto-Director keeps evolving separately from the chapter pipeline, later work will produce two state systems, two error-recovery paths, and two context logics.
- If Step Module granularity is too fine, the system becomes scheduling noise; if too coarse, it remains a black box.
- Without artifact dependency, after a user edits by hand the system still does not know which downstream artifacts are stale.

Boundary principles:

- Prompt owns expression, not data retrieval.
- Context owns fetch, compression, budget, and snapshot, not business execution.
- Step Module owns one creation action, not cross-chain total orchestration.
- Workflow Planner owns step selection, and does not write prose or change the database directly.
- Runtime Policy owns control; process forks must not replace policy.

## 14. End Goal

The final system should provide:

- Beginner users only express a goal; Creative Hub understands, follows up, recommends, or executes.
- Auto-Director generates the next-step plan from workspace state.
- The chapter pipeline is only a reusable template, no longer an independent black box.
- Every step can show input, context, prompt, output, artifact, and event.
- The prompt workbench can safely edit expression fragments while protecting schema, validation, and context contracts.
- After failure, the system can explain, recover, replay, or locally repair.
- New capability attaches through Step Module, Context Resolver, PromptAsset, and Artifact types, instead of continuing to modify the main service branch.

In one sentence: visual prompt editing must sit on a unified AI creation runtime; Auto-Director, the chapter pipeline, and Creative Hub should all become different entries and orchestration policies of the same modular creation system.

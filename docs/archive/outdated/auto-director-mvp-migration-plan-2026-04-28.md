# Auto-Director Unified Runtime MVP Implementation Slice Plan

> Archive note: This file records the 2026-04-28 auto-director MVP migration slice and is no longer current development authority. Current auto-director facts follow `docs/wiki/workflows/auto-director-runtime.md`, `docs/plans/auto-director-execution-plane-isolation-plan.md`, `docs/plans/director-mode-module-state-refactor-checklist.md`, and the release notes.

Updated: 2026-04-28

Related master plan: `docs/plans/auto-director-unified-runtime-refactor-plan.md`

## 1. Document Positioning

`auto-director-unified-runtime-refactor-plan.md` is the auto-director refactor master plan. It answers what the system should look like when finished.

This document is the MVP engineering slice. It answers how Phase 1 should start, and how to avoid rewriting everything at once into another giant system.

Core judgments:

- Keep the master-plan direction: auto-director creation, AI takeover, continue-after-manual-edit, and failure recovery should all enter the same Director Runtime.
- The MVP does not try to finish every future module in one pass. It first builds a minimum migratable runtime.
- New modules stay graph-compatible, event-compatible, policy-compatible, and artifact-ledger-compatible from day one.
- LangGraph can be a later orchestration shell, but it must not be the main Phase 1 goal.

TypeScript structures in this document are conceptual contract sketches. They do not mean database or API fields should be changed immediately in the current phase.

## 2. Current Project Progress Reconciliation

This section is based on a 2026-04-28 quick code reconciliation on the `beta` branch, so the MVP is not mistaken for empty architecture detached from current implementation.

Capabilities already in place:

- Auto-director already has dedicated routes: `server/src/routes/novelDirector.ts`, including candidate generation, candidate revision, candidate confirmation, takeover readiness, takeover start, and similar entry points.
- The main auto-director implementation is concentrated in `server/src/services/novel/director/`. `NovelDirectorService.ts` is about 1544 lines and is still the main orchestration center.
- The takeover chain has already been split into multiple files, for example `novelDirectorTakeover.ts`, `novelDirectorTakeoverRuntime.ts`, `novelDirectorTakeoverExecution.ts`, `novelDirectorTakeoverContinue.ts`, `novelDirectorTakeoverReset.ts`.
- Auto execution already has sub-runtimes, for example `novelDirectorAutoExecutionRuntime.ts`, `novelDirectorAutoExecutionCheckpointRuntime.ts`, `novelDirectorAutoExecutionScopeRuntime.ts`.
- The current auto-director main chain does not use LangGraph directly. LangGraph is mainly in `server/src/creativeHub/CreativeHubLangGraph.ts`, `server/src/creativeHub/CreativeHubInterruptLangGraph.ts`, and `server/src/graphs/*`.
- Current workflow tasks already have stage, checkpoint, resume target, seed payload, follow-up notification, and similar capabilities. These cannot simply be ignored or rebuilt.
- The project already has AgentRuntime's `idempotencyKey` idea, auto-director follow-up action log deduplication, pipeline job selection/dedup helpers, and task-center and notification projection capabilities.
- `NovelArtifactService` already exists, but it currently looks more like a thin wrapper around storyline versioning. It is not the Director Artifact Ledger described in this plan.
- `shared/types/novelDirector.ts` already has run mode, auto execution plan/state, quality repair risk, takeover start phase, lock scope, candidate batch, task seed snapshot, and similar types.
- `shared/types/novelWorkflow.ts` already has workflow stage, checkpoint, resume target, Book Contract, and other key types.

Therefore the MVP implementation strategy should be to align with and consolidate existing capabilities, not to stand up a parallel system from scratch:

- The StepRun concept should first be evaluated for reuse or extension of existing `NovelWorkflowTask`, workflow milestone, AgentStep, or task detail step, rather than immediately adding an isolated table set.
- The DirectorEvent concept should first align with the existing auto-director follow-up event builder, notification log, and task-center projection, then fill in missing fact events.
- Artifact Ledger MVP should first be a wrapper/index that associates old business tables and existing artifacts, not a replacement for those tables.
- Idempotency should first reuse the project's existing `idempotencyKey` experience and action-log dedup pattern.
- Concurrency locks should be designed against current workflow task active status, pipeline job status, and auto execution state.

Conclusion: this MVP is not a rejection of current progress. It is a way to gather already-grown capabilities—candidate, takeover, auto execution, workflow, follow-up, pipeline, prompt asset—into a unified runtime boundary.

## 3. MVP Overall Goal

The MVP goal is not "rewrite auto-director." It is to gradually route existing chains into one observable, recoverable, extensible runtime boundary.

After the MVP:

- Every entry first goes through the Director Runtime facade.
- Taking over an existing novel first goes through Workspace Analyzer, instead of a separate takeover chain.
- Key stages can at least write StepRun and DirectorEvent.
- Key artifacts can be indexed by Artifact Ledger.
- Automatic, manual, and semi-automatic modes are controlled by Policy Engine, not scattered across stage branches.
- Old stages can be wrapped as standard nodes by Node Runner.
- A single audit or repair failure does not freeze the whole chain.
- Later low-risk LangGraph pilots only replace the orchestration shell; they do not rewrite node capabilities.

## 4. What the MVP Explicitly Will Not Do

Phase 1 will not:

- Put every artifact into Artifact Ledger at once.
- Fully split `NovelDirectorService` at once.
- Fully LangGraph-ize chapter execution, repair, and pipeline jobs from the start.
- Build a complete Capability Registry from the start.
- Put world-setting governance, character governance, and knowledge-base orchestration fully onto the main chain from the start.
- Let Director Runtime itself assemble prompts, generate body text, or judge complex creative quality.
- Do large-scale automatic recomputation before stable events and idempotency exist.

## 5. Minimum Module Boundaries

### 5.1 DirectorRuntime

Only owns the run lifecycle:

- Create run.
- Resume run.
- Pause run.
- Continue run.
- Switch policy.
- Call Workspace Analyzer.
- Call Node Runner.
- Handle events and state sync.

DirectorRuntime should not:

- Directly generate novel content.
- Directly assemble prompts.
- Directly write character, volume, or chapter body.
- Directly judge complex creative quality.
- Directly assemble UI copy.
- Directly bypass the policy layer to overwrite user content.

Once DirectorRuntime starts carrying prompts, chapter context, body writes, and UI explanation, it becomes a second `NovelDirectorService`.

### 5.2 WorkspaceAnalyzer

Split into two layers:

- Workspace Inventory: deterministic scan for asset existence, versions, tasks, run state, and user-edit records.
- Workspace Interpretation: AI structured analysis for production stage, risk, recommended action, change impact, and the minimum repair path.

Deterministic scan is suited for:

- Which assets exist.
- Which chapters already have body text.
- Which artifact version is latest.
- Whether upstream versions that an artifact depends on have changed.
- Whether the user has edited a chapter.
- Whether there is an active run.
- Whether overwriting user-written content is allowed.

AI structured analysis is suited for:

- Whether a change in the protagonist's motivation affects later volume goals.
- Whether the user's rewrite of chapter 3 breaks promises made in the first 30 chapters.
- Whether world-setting is enough to support the current conflict.
- Whether the last 5 chapters repeat the same pacing.
- Whether a character has become a mere plot device.
- What the novel most naturally needs to fill in next.

Conceptual contract:

```ts
type WorkspaceAnalysis = {
  inventory: DeterministicInventory;
  interpretation: AiWorkspaceInterpretation;
  recommendation: DirectorNextAction;
  confidence: number;
  evidenceRefs: string[];
};
```

### 5.3 ArtifactLedger MVP

The first version only does index, version, dependency, source, and health status. It does not replace all business tables.

MVP should prefer to include:

- `book_contract`
- `story_macro`
- `character_cast`
- `volume_strategy`
- `chapter_task_sheet`
- `chapter_draft`
- `audit_report`
- `repair_ticket`

Defer but reserve for later:

- `reader_promise`
- `character_governance_state`
- `world_skeleton`
- `source_knowledge_pack`
- `chapter_retention_contract`
- `continuity_state`
- `rolling_window_review`

The first version should at least answer four questions:

1. What type is this artifact?
2. Which version is currently trusted?
3. Which upstream artifacts does it depend on?
4. Who generated or modified it?

Conceptual contract:

```ts
type DirectorArtifact = {
  id: string;
  novelId: string;
  runId?: string;

  artifactType: DirectorArtifactType;
  targetType: "novel" | "volume" | "chapter" | "global";
  targetId?: string;

  version: number;
  status: "draft" | "active" | "superseded" | "stale" | "rejected";
  source: "ai_generated" | "user_edited" | "auto_repaired" | "imported" | "backfilled";

  dependsOn: Array<{
    artifactId: string;
    version: number;
  }>;

  contentRef: {
    table: string;
    id: string;
  };

  contentHash?: string;
  schemaVersion: string;
  promptAssetKey?: string;
  promptVersion?: string;
  modelRoute?: string;
};
```

Key principle: do not stuff all artifact body content into the Ledger. `contentRef` points at the old business table or a dedicated content table. The Ledger owns index and dependency.

### 5.4 PolicyEngine V1

The first version keeps only four control policies:

```ts
type DirectorPolicyMode =
  | "suggest_only"
  | "run_next_step"
  | "run_until_gate"
  | "auto_safe_scope";
```

Policy decisions focus on:

```ts
type PolicyDecision = {
  canRun: boolean;
  requiresApproval: boolean;
  reason: string;

  mayOverwriteUserContent: boolean;
  affectedArtifacts: string[];

  autoRetryBudget: number;
  onQualityFailure:
    | "repair_once"
    | "pause_for_manual"
    | "continue_with_risk"
    | "block_scope";
};
```

Hard rules:

- Overwriting user-written content must go through Policy Engine.
- Auto-repair defaults to at most once.
- Quality failure must carry `affectedScope`.
- Non-destructive quality issues default to not blocking globally.
- High-risk issues only block the affected scope.

### 5.5 NodeRunner

NodeRunner executes a node, but does not embed each node's business logic inside itself.

Node contracts should be graph-compatible from Phase 2:

```ts
type DirectorNodeContract = {
  nodeKey: string;
  label: string;

  reads: DirectorArtifactType[];
  writes: DirectorArtifactType[];

  mayModifyUserContent: boolean;
  requiresApprovalByDefault: boolean;
  supportsAutoRetry: boolean;

  run(input: DirectorNodeInput): Promise<DirectorNodeResult>;
};
```

Node result:

```ts
type DirectorNodeResult = {
  status:
    | "completed"
    | "needs_approval"
    | "repairable"
    | "blocked_scope"
    | "failed";

  producedArtifacts: DirectorArtifactRef[];
  events: DirectorEvent[];
  suggestedNextAction?: DirectorNextAction;
};
```

This way, even if Phase 1 does not use LangGraph, later graph-ization only replaces the orchestration shell instead of rewriting nodes.

## 6. Runtime Reliability Constraints

### 6.1 Idempotency

Any node that writes to the database must have an `idempotencyKey`.

Recommended rule:

```ts
const idempotencyKey = `${runId}:${nodeKey}:${targetType}:${targetId ?? "global"}`;
```

Before execution, first look up StepRun, Artifact Ledger, or operation log:

- If the same key already completed successfully, reuse the result.
- If the same key is currently executing, do not start another run.
- If the same key failed, decide whether to retry from retry budget and PolicyDecision.

This avoids duplicate creation of characters, volumes, chapters, or pipeline jobs caused by service restart, the user clicking continue again, background recovery, or LangGraph resume.

### 6.2 Concurrency Locks

MVP needs at least these lock semantics:

- novel-level active run lock.
- artifact-level write lock.
- chapter pipeline lock.
- pause / resume / cancel state lock.

The goal is to prevent the same novel from having multiple entry points write the same assets at once—for example Creative Hub, task center, and background recovery all triggering continue.

### 6.3 Cost Budget

AI-first does not mean unlimited model calls at every step.

Recommend adding BudgetPolicy:

```ts
type DirectorBudgetPolicy = {
  maxModelCallsPerRun?: number;
  maxTokensPerStep?: number;
  maxAutoRepairAttempts: 1;
  allowExpensiveReview: boolean;
  modelTier: "cheap_fast" | "balanced" | "high_quality";
};
```

MVP defaults:

- Workspace Analyzer may call AI, but should first use deterministic Inventory to shrink context.
- Auto-repair at most once.
- Rolling Window Review does not enter the base runtime yet; later it can be a capability-module pilot.
- High-cost review needs policy or user authorization.

### 6.4 Events and Projection

DirectorEvent is a fact record. It is not UI copy, WorkflowTask state, or Artifact Ledger.

Example events:

```ts
type DirectorEvent =
  | { type: "run_started"; runId: string }
  | { type: "node_started"; runId: string; nodeKey: string }
  | { type: "artifact_produced"; artifactId: string; artifactType: string }
  | { type: "approval_required"; approvalType: string; affectedScope: string }
  | { type: "quality_issue_found"; issueId: string; severity: string; affectedScope: string };
```

The projection layer converts events for different surfaces:

- DirectorEvent -> TaskCenterProjection.
- DirectorEvent -> FrontendProgressProjection.
- DirectorEvent -> CreativeHubMessageProjection.

Nodes do not assemble user-visible copy themselves. That keeps backend flow, task center, and frontend explanation from staying tangled together.

## 7. MVP Migration Path

### Phase 0: Runtime visibility, no main-chain change

Goal: make the current system observable first, so later comparison of old-chain and new-chain behavior is possible.

Deliverables:

- StepRun ledger draft.
- DirectorEvent record draft.
- Auto-director long-stage heartbeat.
- Candidate stage connected to tracked step.
- Frontend task center prefers reading the event-projection draft instead of continuing to guess state.

Acceptance:

- Auto-director progress does not sit for a long time in an unexplained state.
- The server can see each major step start, complete, fail, and recover.
- Current main-chain business results do not change.

### Phase 1: Director Runtime facade

Goal: every entry first goes through a unified facade, then delegates to the old implementation.

Entries include:

- Create a new novel.
- Take over an existing novel.
- Continue a task.
- Failure recovery.
- Continue after a manual edit.

Deliverables:

- DirectorRuntime facade.
- Run lifecycle state.
- Old API compatibility.
- Runtime state snapshot.

Acceptance:

- Old features still run.
- New and old entries can both be archived onto a run.
- `NovelDirectorService` starts shrinking into a facade that keeps old APIs compatible, instead of continuing to grow.

### Phase 2: Workspace Analyzer V1

Goal: takeover, manual continue, and failure recovery first enter workspace analysis.

Deliverables:

- Deterministic Inventory.
- AI Workspace Interpretation.
- Recommended Next Action.
- Takeover entry calls Analyzer, then maps onto the old chain's continue actions.

Acceptance:

- When AI takeover is enabled for an existing novel, the system first outputs current state and recommended next step.
- After a user manual edit, the system can judge whether to continue directly, re-check, recompute locally, or wait for human confirmation.
- The takeover chain no longer guesses main-chain state on its own.

### Phase 3: Artifact Ledger MVP

Goal: build a ledger wrapper first; do not migrate old tables in one pass.

Integration path:

```text
Old service produces artifact
  ↓
Write old business table as before
  ↓
Additionally write a DirectorArtifact record
```

Prefer to integrate first:

- `book_contract`
- `story_macro`
- `character_cast`
- `volume_strategy`
- `chapter_task_sheet`
- `chapter_draft`
- `audit_report`
- `repair_ticket`

Deliverables:

- DirectorArtifact wrapper.
- imported / backfilled artifact records.
- Minimal trustLevel or status marking.
- Minimal dependsOn records.

Acceptance:

- Newly produced artifacts can be written to both the old business table and the Ledger.
- Existing novels can backfill a basic artifact index.
- Workspace Analyzer can read the Ledger to judge trusted artifacts and missing artifacts.

### Phase 4: Policy Engine V1

Goal: pull automatic, manual, semi-automatic, repair, and overwrite-protection out of per-stage branches.

Deliverables:

- `suggest_only`
- `run_next_step`
- `run_until_gate`
- `auto_safe_scope`
- PolicyDecision.
- QualityGateResult.
- Overwrite protection.
- One-shot auto-repair policy.

Acceptance:

- Overwriting user content must go through Policy Engine.
- A single chapter audit failure only produces a repair_ticket or blocked_scope; it does not freeze the whole chain.
- After auto-repair fails, enter manual repair or continue-with-risk.

### Phase 5: Node Runner wraps old stages

Goal: reduce `NovelDirectorService`'s main-orchestration burden.

Wrap old stages first; do not rush a fine-grained split:

- `candidate_generation_node`
- `book_contract_node`
- `story_macro_node`
- `character_setup_node`
- `volume_strategy_node`
- `structured_outline_node`
- `chapter_execution_node`
- `quality_repair_node`

Each node uniformly declares:

- Which artifacts it reads.
- Which artifacts it writes.
- Whether approval is required.
- Whether it may overwrite user content.
- How it records events.
- How it records StepRun.
- How it recovers from failure.

Acceptance:

- Old stages can execute through Node Runner.
- New and old entries can reuse the same node wrappers.
- Node execution results can write StepRun, DirectorEvent, and Artifact Ledger.

### Phase 6: Low-risk LangGraph pilot

Goal: verify graph orchestration, not migrate the main chain wholesale.

Recommended pilot:

```text
Workspace Analyzer -> recommend next step -> run_next_step -> gate
```

Or:

```text
Candidate direction generation -> title pack -> candidate_selection_required interrupt
```

The candidate stage is a good pilot because:

- It writes little.
- The human confirmation point is clear.
- Failure impact is small.
- It can verify interrupt / resume.
- It can verify stream updates.
- It can verify event projection.

Acceptance:

- LangGraph only owns orchestration, pause, resume, and tracing.
- Business state still comes from DirectorRuntime, ArtifactLedger, and PolicyEngine.
- Do not move chapter execution and pipeline jobs into the graph in one pass.

### Phase 7: Creative-quality modules gradually onto the main chain

Goal: strengthen web-fiction creative quality only after the unified runtime is stable.

Suggested order:

1. Source and Knowledge Pack.
2. World Skeleton / World Rules.
3. Character Governance State.
4. Chapter Retention Contract.
5. Rolling Window Review.

Chapter Retention Contract has the highest priority because it directly improves chapter retention.

## 8. Three Migration Tables

### 8.1 Artifact Type Table

| Artifact Type | Role | Upstream dependencies | Downstream impact | Auto-overwrite policy |
| --- | --- | --- | --- | --- |
| `book_contract` | Freeze book-level direction, reader promises, and genre boundaries | candidate / user seed | story macro, characters, volume planning, chapter tasks | High risk; requires confirmation |
| `story_macro` | Freeze main plot, conflict engine, and long-arc progression | book contract | characters, volume split, chapter plan | High risk; requires confirmation |
| `character_cast` | Core character roster | book contract / story macro | character governance, volume planning, chapter tasks | Medium-high risk |
| `volume_strategy` | Volume goals and upgrade path | book contract / story macro / characters | chapter plan | Medium risk |
| `chapter_task_sheet` | Chapter execution contract | volume strategy / characters / world rules | chapter draft | Medium risk |
| `chapter_draft` | Body-text draft | task sheet / context | audit / continuity | High protection after user edit |
| `audit_report` | Quality-audit result | chapter draft / recent context | repair ticket | Can be auto-generated |
| `repair_ticket` | Repair task | audit report | repair action | Can be auto-generated |

### 8.2 Node Contract Table

| Node | Reads | Writes | Gate | Retryable | May overwrite user content |
| --- | --- | --- | --- | --- | --- |
| `workspace_analyze` | novel assets | analysis snapshot | no | yes | no |
| `candidate_generation` | user seed / source pack | candidate batch | yes | yes | no |
| `book_contract_generate` | seed / candidate | book_contract | yes | yes | no |
| `story_macro_generate` | book_contract | story_macro | optional | yes | maybe |
| `character_setup` | book_contract / story_macro | character_cast | optional | yes | maybe |
| `volume_strategy_generate` | book_contract / story_macro / characters | volume_strategy | optional | yes | maybe |
| `chapter_task_sheet_generate` | volume_strategy / characters | chapter_task_sheet | optional | yes | maybe |
| `chapter_execution` | chapter_task_sheet / context | chapter_draft | optional | limited | yes |
| `quality_repair` | chapter_draft / audit_report | repair_ticket / revised draft | optional | once | yes |
| `rolling_window_review` | recent drafts | audit_report / repair_ticket | no | yes | no |

### 8.3 Old Module Migration Table

| Old module | New location | Migration method |
| --- | --- | --- |
| `NovelDirectorService` | facade + DirectorRuntime caller | Shrink gradually |
| Candidate Stage | Candidate nodes | Wrap, then migrate |
| Story Macro Phase | Planning nodes | Wrap old functions first |
| Pipeline Phases | Character / Volume nodes | Split in stages |
| Structured Outline Phase | Outline subgraph / chapter planning nodes | Priority: split into nodes |
| Auto Execution Runtime | ChapterExecution adapter | Keep as a sub-executor |
| Takeover Runtime | WorkspaceAnalyzer + RecoveryPolicy | Fold into the unified entry |
| Workflow Service | Task projection + legacy compatibility | No longer the source of business truth |

## 9. Web-Fiction Quality Module Convergence Priority

The master plan's creative-quality enhancements are the right direction, but after the MVP the first batch should only do three.

### 9.1 Reader Promise Ledger

Turn reader promises into trackable artifacts:

```text
Book-level promises
  ↓
Volume-level promises
  ↓
Pacing-segment promises
  ↓
Chapter promises
  ↓
Audit of promise fulfillment
```

This improves long-form consistency and also lets auto-director know why each chapter is worth writing.

### 9.2 Chapter Retention Contract

The chapter task sheet should upgrade to a retention contract.

Conceptual contract:

```ts
type ChapterRetentionContract = {
  chapterId: string;

  chapterGoal: string;
  readerPromiseRefs: string[];

  newInformation: string[];
  visibleChange: string;
  smallPayoff: string;
  unresolvedPressure: string;

  hookType:
    | "threat"
    | "reveal"
    | "choice"
    | "misunderstanding"
    | "reward_delayed"
    | "relationship_shift"
    | "new_goal";

  endingHook: string;

  characterDrivers: Array<{
    characterId: string;
    desire: string;
    pressure: string;
    choiceOrAction: string;
    stateChange: string;
  }>;

  worldRuleUsed?: {
    ruleId: string;
    dramaticFunction: string;
  };
};
```

It is a better fit for web-fiction production than a plain "chapter outline," because it directly constrains reader payoff, change, pressure, and the reason to keep reading at chapter end.

### 9.3 Rolling Window Review

First version only covers the last 5 chapters:

- Whether the last 5 chapters are homogeneous.
- Whether the protagonist's goal has advanced.
- Whether reader promises have been fulfilled or raised.
- Whether ending hooks repeat.
- Whether character relationships have stalled.
- Whether world rules participate in conflict.

This module is a good first new review module for Capability Registry.

## 10. Creative Hub Integration Boundary

Creative Hub should call Director Runtime public actions:

- `analyze_director_workspace`
- `get_director_run_status`
- `explain_director_next_action`
- `run_director_next_step`
- `run_director_until_gate`
- `switch_director_policy`
- `evaluate_manual_edit_impact`

Should not call directly:

- `generateVolumeStrategy()`
- `runStructuredOutlinePhase()`
- `continueTakeoverExecution()`
- `repairChapterTitle()`

Boundary:

```text
Creative Hub = user conversation entry + approval display + tool-call coordination
Auto-director = long-running novel production system
```

Both systems may use LangGraph, but they should not be mashed into one super-graph.

## 11. MVP Acceptance Scenarios

First batch should at least cover:

1. Create a novel from a one-sentence idea, generate candidates, and stop at candidate confirmation.
2. After confirming a candidate, generate Book Contract, characters, volume plans, and the first 10 chapter task sheets.
3. An existing novel has characters and the first 8 chapters of body text; after takeover, recommend filling chapter 9-20 task sheets.
4. The user changes the protagonist's motivation; the system judges that character governance and later chapter outlines need re-check.
5. The user only polishes chapter 3 body text; the system only updates continuity memory and does not redo macro planning.
6. Chapter 5 audit fails; generate a repair_ticket without freezing the whole book.
7. After one auto-repair failure, enter a choice of manual repair or continue-with-risk.
8. After a service restart, first mark as manually recoverable; after the user confirms recovery, continue from the last successful artifact / step without duplicating chapter creation.

## 12. First-Round Start Recommendation

The first round should do only four things:

1. Build minimum visibility for StepRun / DirectorEvent.
2. Build the DirectorRuntime facade so every entry first routes through it.
3. Build Workspace Analyzer V1 so takeover and manual continue first unify as workspace analysis.
4. Build the Artifact Ledger wrapper; add index only for 6-8 core artifacts, without migrating old business tables.

After these four, the system is not fully refactored, but it has moved from "multiple chains evolving separately" to "one runtime gradually taking over old capabilities." Doing Policy Engine, Node Runner, and a low-risk LangGraph pilot after that is much lower risk.

## 13. 2026-04-28 MVP Implementation Progress

This round has plugged the MVP foundation into the existing chain, still using old stages as the execution body, to avoid rewriting auto-director in one pass:

- Added shared runtime contracts: `DirectorRuntimeSnapshot`, `DirectorStepRun`, `DirectorEvent`, `DirectorArtifactRef`, `DirectorWorkspaceAnalysis`, `DirectorPolicyDecision`.
- Added `DirectorRuntimeService` facade wrapping run init, state snapshot, workspace analysis, policy switch, node recording, and NodeRunner.
- Added `DirectorWorkspaceAnalyzer`: deterministic Inventory first, then AI structured interpretation via a registered PromptAsset.
- Added Artifact Ledger wrapper: staged in the workflow task's `directorRuntime.artifacts`, pointing at old business tables via `contentRef`, without migrating data tables.
- Added Policy Engine V1: supports `suggest_only`, `run_next_step`, `run_until_gate`, `auto_safe_scope`, and fixes auto-repair budget at one attempt.
- Auto-director candidate, confirm, takeover, continue, and main pipeline stages have started writing runtime step / event / workspace analysis.
- Added backend routes and frontend APIs: workspace analysis, runtime snapshot, policy switch, runtime continue.
- Added runtime projection display in task center, book-opening progress panel, and novel workbench sidebar so users can see the current node, recent events, whether action is needed, and how to advance.
- Added manual-edit impact analysis: first find changes via deterministic artifact / hash inventory, then hand them to a registered PromptAsset for AI structured judgment.
- Added Context Broker and Prompt Workbench read-only catalog / preview foundation; chapter writing, chapter review, and auto-director workspace analysis have started sharing context-block organization.
- Added Step Module / Workflow Plan foundation; chapter execution, quality check, repair, state commit, foreshadowing sync, and character-resource sync have started standard node projection.
- Added `DirectorLangGraphPilot` as a low-risk pilot to verify interrupt / resume / trace for workspace analyze -> recommend next action -> run next step -> approval interrupt, but it is not wired to the main chain.
- Startup recovery policy is now: after service restart, first mark as waiting for manual recovery; continue only after user confirmation; do not silently auto-continue in the background.
- Added targeted tests for policy and runtime covering suggest-only mode, user-content protection, one-shot auto-repair budget, NodeRunner, Artifact Ledger, Event Projection, LangGraph Pilot, Prompt Workbench, Context Broker, director runtime tools, and startup-recovery initialization.

Current completeness judgment:

- Measured against this MVP foundation, currently about `80%` complete.
- Measured against the full auto-director unified-runtime shape, currently about `60%-65%` complete.
- The most important remaining work is not "directly turn the main chain into LangGraph." It is first making Step Module / NodeRunner / PolicyEngine the unified execution contract for every write action.

Not completed directly in this round:

- No independent database tables were added; Artifact Ledger is first a wrapper index on the old workflow seed payload.
- Not all old auto-director stages were fully converted to standard Step Module / NodeRunner execution; some paths are still a mix of old stages plus runtime recording.
- Chapter execution, quality repair, and pipeline jobs were not all made into a composable, replayable, auditable unified Step Runtime.
- LangGraph was not wired to the auto-director main chain; the current line remains "unify the runtime first, replace the shell with graph orchestration later."
- `reader_promise`, `chapter_retention_contract`, `continuity_state`, `rolling_window_review`, `character_governance_state` were not made into a complete evaluate -> repair -> re-evaluate loop.
- World-setting generation, character governance, and book-analysis knowledge-base orchestration were not brought onto main-chain execution; Workspace Inventory only keeps the bound-or-not judgment basis.
- Systematic regression against real Prisma data was not completed, especially old-project takeover, manual recovery after service restart, batch chapter execution, local repair after rewrite, and multi-volume long-horizon progression.
- The modularization debt of `server/src/prompting/workflows/workflowRegistry.ts` exceeding 700 lines was not handled; later intent expansion should first split workflow definitions by domain.

Better next-round work:

1. **Close the execution contract**: route candidate, confirm, takeover, planning, chapter breakdown, chapter execution, review, repair, and state commit through Step Module / NodeRunner / PolicyEngine.
2. **Real recovery regression**: sample real Prisma data around manual recovery after service restart, failure retry, old-project takeover, and batch chapter execution.
3. **Deepen the artifact ledger**: upgrade reader promise, chapter retention, continuity, rolling review, and character governance into a trackable, invalidatable, repairable artifact system.
4. **Creative Hub closed loop**: hub tool calls should not only read runtime; they should stably walk approval gate, runtime continue, projection feedback, and user confirmation.
5. **Low-risk LangGraph wiring**: first attach `DirectorLangGraphPilot` to low-risk entries such as workspace analyze -> run next step, doing only orchestration, interrupt, resume, and trace.
6. **Modularization debt cleanup**: split `workflowRegistry.ts` so director intent does not keep piling into one centralized large table.

## 14. One-Sentence Conclusion

The master plan is the direction; the MVP is the slice. First do visibility, unified entry, workspace analysis, artifact index, and policy boundary; then wrap old nodes; finally verify orchestration with a low-risk LangGraph pilot. Do not ship every creative-quality module and full graph orchestration at the start.

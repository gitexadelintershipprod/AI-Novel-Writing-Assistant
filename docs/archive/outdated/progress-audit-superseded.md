# TASK.md Comparison Checklist and This-Round Implementation Scope

> Archive note: This file records an early TASK comparison audit. Many “not implemented” judgments have been replaced by later implementation and release notes, and it is no longer current development authority.

This document compares against [TASK.md](../../../TASK.md) and marks each planned item’s current status, evidence, and whether this round includes implementation.

## Phase 1: Creative Decision Memory System

| Planned Item | Current Status | Evidence | Included This Round |
|--------|----------|------|----------|
| 1.1 CreativeDecision / WritingSession data model | Not implemented | schema.prisma has no matching model | Yes (phase 5) |
| 1.2 Creative-decision capture (explicit/implicit/pipeline) | Not implemented | No creativeDecision or writing-notes related code | Yes (phase 5, start with minimal model + injection) |
| 1.3 Context-injection enhancement (buildContextText injects decisions) | Not implemented | NovelCoreService.buildContextText has no decisions | Yes (phase 5) |
| 1.4 CreativeDecisionPanel frontend | Not implemented | No CreativeDecisionPanel or writing notes | Deferred (phase 5 does backend first) |

## Phase 2: Event-Driven Hook System

| Planned Item | Current Status | Evidence | Included This Round |
|--------|----------|------|----------|
| 2.1 EventBus infrastructure | Not implemented | server/src/events directory does not exist | Yes (phase 4) |
| 2.2 Event type definitions | Not implemented | No types such as chapter:drafted | Yes (phase 4) |
| 2.3 Split syncChapterArtifacts into event handlers | Not implemented | NovelCoreService still inlines summary/fact/RAG | Yes (phase 4) |
| 2.4 Hook registration mechanism | Not implemented | No eventBus.on registration | Yes (phase 4) |

## Phase 3: Expert Agent Team

| Planned Item | Current Status | Evidence | Included This Round |
|--------|----------|------|----------|
| 3.1 Classes such as BaseAgent / PlannerAgent / WriterAgent | Partially implemented | agents has orchestrator, runtime, toolRegistry, no independent Agent classes | No (do not redo existing agents) |
| 3.2 Agent definition (independent model/temperature per Agent) | Partially implemented | types/approvalPolicy has roles and tool permissions | No |
| 3.3 Orchestrator and pipeline integration (executePipeline→AgentOrchestrator) | Partially implemented | Pipeline still goes through NovelCoreService/chapterWritingGraph | No |
| 3.4 Activate chapterWritingGraph | Partially implemented | chapterWritingGraph is already wired into createChapterStream/runPipelineChapter | No |
| 3.5 User-configurable agent parameters (select model by role) | Partially implemented | RuntimeSidebar has global provider/model, no per-role config | No (phase 3 does model routing, can be extended) |

## Phase 4: Intelligent Model Routing

| Planned Item | Current Status | Evidence | Included This Round |
|--------|----------|------|----------|
| 4.1 modelRouter.ts | Not implemented | server/src/llm has no modelRouter.ts | Yes (phase 3) |
| 4.2 TaskType / resolveModel routing policy | Not implemented | factory is only provider+options | Yes (phase 3) |
| 4.3 ModelRouteConfig table | Not implemented | schema has no ModelRouteConfig | Yes (phase 3) |
| 4.4 Settings page “Model routing” tab | Not implemented | SettingsPage has no such tab | Yes (phase 3) |
| 4.5 getLLM(provider, options, taskType?) | Not implemented | getLLM has no taskType | Yes (phase 3) |

## Phase 6: Narrative-Distance-Aware Retrieval

| Planned Item | Current Status | Evidence | Included This Round |
|--------|----------|------|----------|
| 6.1 HybridRetrievalService distance decay | Not implemented | No applyNarrativeDecay or currentChapterOrder | Yes (phase 2) |
| 6.2 RagIndexService chapterOrder/importance metadata | Partially implemented | Some owners already write order; needs unification | Yes (phase 2) |
| 6.3 Key-content anchors do not decay | Not implemented | No importance mark | Deferred (phase 2 does distance decay first) |

## Phase 7: AI Reasoning Process Visualization

| Planned Item | Current Status | Evidence | Included This Round |
|--------|----------|------|----------|
| 7.1 GenerationTrace model | Partially implemented | Has AgentRun/AgentStep, no chapter-level GenerationTrace | Yes (phase 3: reuse AgentRun/Step and attach to chapters) |
| 7.2 LangGraph node instrumentation | Not implemented | chapterWritingGraph has no traced wrapper | Yes (phase 3: wire existing trace) |
| 7.3 NovelChapterEdit generation-trace panel | Not implemented | Chapter edit page has no trace entry | Yes (phase 3) |

## Phase 8: Creation Snapshot and Version Rollback

| Planned Item | Current Status | Evidence | Included This Round |
|--------|----------|------|----------|
| 8.1 NovelSnapshot model | Not implemented | schema has no NovelSnapshot | Yes (phase 5) |
| 8.2 Automatic snapshot timing | Not implemented | No snapshot before pipeline/outline | Yes (phase 5) |
| 8.3 restoreFromSnapshot | Not implemented | Method does not exist | Yes (phase 5) |
| 8.4 NovelEdit version-history tab | Not implemented | No snapshot list / restore UI | Yes (phase 5) |

## This-Round Scope Convergence

- **Immediate fix**: the intelligent agent “what did the first two chapters write” / “write chapter three” did not hit the correct tool (phase 1).
- **MVP fill**: narrative-distance decay (phase 2), model routing + chapter trace (phase 3), event bus (phase 4), creative-decision memory + novel snapshot (phase 5).
- **Deferred**: CreativeDecisionPanel frontend, configure agents by role, rerun from a given stage, importance anchors.

# Finalized `ASSISTANT_UI_PLAN.md`: Deep assistant-ui Integration and LangGraph Creative Hub Redesign Plan

## Summary
This redesign takes "refactor directly against LangGraph, but use a parallel migration" as the fixed strategy, upgrading the current custom `/chat + SSE + IndexedDB sessions` chat workbench into a Creative Hub based on `assistant-ui + useLangGraphRuntime`.

Target results:
- `/creative-hub` becomes the new default LangGraph Creative Hub entrypoint.
- Runtime information is shown primarily inline in the message stream; the right panel converges to resource binding, global status, model routing, and shortcut controls.
- Sessions, branches, edits, approval, replay, and failure diagnosis all close onto LangGraph thread and checkpoint semantics.
- Existing `/chat` is temporarily kept as `/chat-legacy` and taken down after it is stable.
- This plan document is saved separately as `ASSISTANT_UI_PLAN.md` and is not merged into `TASK.md`.

## Key changes

### 1. Runtime and backend close onto LangGraph
- Add a `creative-hub` LangGraph module on the server, independent of existing `routes/chat.ts`. Do not keep stacking logic onto the old chat routes.
- Graph state is fixed to include:
  - `messages`
  - `threadId`
  - `runId`
  - `resourceBindings` (`novelId/chapterId/worldId/knowledgeDocumentIds/taskId`)
  - `approvalState`
  - `diagnostics`
  - `taskRefs`
  - `uiState`
- Graph nodes are fixed as:
  - `bind_context`
  - `coordinator_plan`
  - `tool_execute`
  - `approval_gate`
  - `answer_finalize`
  - `task_sync`
- High-risk write operations must trigger interrupt through `approval_gate`; do not rely on the frontend stitching an approval flow.
- Existing `AgentRuntime` is not deleted immediately; first call it as a LangGraph tool layer / adapter layer; after the new graph is stable, gradually sink or replace it.
- Do not integrate LangGraph Cloud; do not integrate assistant-cloud; use in-project self-hosted thread and checkpoint persistence.
- Add thread and graph-run APIs on the backend for frontend `useLangGraphRuntime` and a custom thread list:
  - `POST /api/creative-hub/threads`
  - `GET /api/creative-hub/threads`
  - `PATCH /api/creative-hub/threads/:id`
  - `DELETE /api/creative-hub/threads/:id`
  - `GET /api/creative-hub/threads/:id/state`
  - `GET /api/creative-hub/threads/:id/history`
  - `POST /api/creative-hub/threads/:id/runs/stream`
  - `POST /api/creative-hub/threads/:id/interrupts/:interruptId`
- Keep and extend `agent-catalog` on the server as the data source for frontend tool UI, capability panel, suggested actions, and resource-binding hints.
- Threads and checkpoints enter database persistence; `chatStore` is no longer the session source of truth and may only keep a local draft cache.

### 2. Frontend switches to `assistant-ui` deep-integration mode
- Install and align:
  - `@assistant-ui/react`
  - `@assistant-ui/react-ui`
  - `@assistant-ui/react-langgraph`
  - `@langchain/langgraph-sdk`
  - In development, additionally integrate `@assistant-ui/react-devtools`
- Current [ChatPage.tsx](/D:/code/AI-Novel-Writing-Assistant-v2/client/src/pages/chat/ChatPage.tsx), which exceeds 500 lines, must be split first before taking new features.
- The new Creative Hub page becomes a modular structure:
  - Thread list area
  - Main message-stream area
  - Right resource/status area
  - Tool UI registration area
  - LangGraph runtime adapter area
- Creative Hub must support two working states at once:
  - `Global mode`: when no novel is bound, used to list novels, create novels, choose a workspace, and view system-level status
  - `Novel workspace mode`: after binding `novelId`, continue executing chapters, worldbuilding, knowledge documents, and task diagnosis around a single novel
- `/creative-hub` uses `useLangGraphRuntime`; `/chat` redirects to `/creative-hub`; the old implementation moves to `/chat-legacy`.
- The thread list uses assistant-ui custom thread-list semantics; thread title, archive, delete, and recent resource bindings all go through server APIs.
- Message-stream inline rendering first integrates:
  - `Chain of Thought`
  - `ToolFallback` + custom Tool UI
  - Message editing
  - Message branching
  - regenerate
- The right panel keeps only:
  - Current resource bindings
  - Current run / interrupt overview
  - Model-routing summary
  - Recent task status
  - Shortcut jumps to module pages
- The right resource area must provide explicit novel-workspace switching:
  - Novel dropdown selector
  - Clear the current novel binding and return to global mode
  - When no novel is bound, show a "Create new novel" shortcut action
- Creative Hub empty state and suggested actions must cover:
  - List current novels
  - Create a new novel
  - Select a novel as the current workspace
- All approval, failure diagnosis, task status, worldbuilding conflicts, and knowledge-base index status are shown first as Tool UI cards in the message stream, not stacked as more sidebar text.
- Module pages uniformly add a "Send to Creative Hub" deep link, covering at least novels, book analysis, knowledge base, worldbuilding, writing formulas, base character library, and task center.

### 3. Tool UI and system-capability mapping
- Business tools continue to execute on the backend; the frontend only registers same-named Tool UI and does not run core writing logic in the browser.
- First batch of tools that must land dedicated cards:
  - `list_novels`
  - `create_novel`
  - `select_novel_workspace`
  - `get_task_failure_reason`
  - `get_run_failure_reason`
  - `explain_generation_blocker`
  - `explain_world_conflict`
  - `list_tasks`
  - `list_knowledge_documents`
  - `list_book_analyses`
  - `list_writing_formulas`
  - `list_base_characters`
  - Novel chapter read and range-summary tools
- Approval becomes an interrupt card:
  - The card directly shows the target resource, diff summary, impact scope, and an approval-notes input
  - Action buttons call the interrupt/resume APIs directly
- Failure diagnosis becomes a diagnosis card:
  - Show failure summary
  - Recovery suggestions
  - Related run / task jumps
  - Continuable actions
- Novel workspace becomes an explicit card and action loop:
  - `list_novels` returns a novel-list card
  - `create_novel` returns a create-result card
  - After successful create, automatically write the new novel back into the current thread `resourceBindings.novelId`
  - `select_novel_workspace` is responsible for binding the specified novel as the current thread workspace
- Tool UI must support a "continue asking" action that fills structured suggestions back as the next prompt.
- Use the assistant-ui Context API to manage:
  - Current thread bound resources
  - Current run status
  - Current interrupt
  - Current tool-panel state
  - Context injection when jumping into Creative Hub from a module page

### 4. Threads, branches, and compatibility migration
- Migrate the existing local `chatStore` session model to a server-side thread model:
  - Thread title
  - Archive status
  - Recent run
  - Recently bound resources
  - Last updated time
- The frontend no longer depends on the empty `/chat/history` API; history is read uniformly from thread state and thread history.
- Branches and edits follow LangGraph checkpoint semantics:
  - `load(thread)` returns messages and interrupts
  - `getCheckpointId(threadId, parentMessages)` is parsed from server thread history
  - When a checkpoint cannot be matched exactly, forbid editing a branch and return an explicit error
- Old `useSSE`, handwritten message assembly, and run-event stitching logic are kept only for `/chat-legacy` and are no longer extended.
- Logic in the old `RuntimeSidebar` that is tightly bound to trace/approval is gradually taken down, avoiding long-term coexistence of old and new dual state.

## Interface and type changes
- The frontend adds a `creative hub` dedicated API layer, replacing the current scattered `chat.ts + agentRuns.ts + chatStore` combination.
- `shared/types/agent` is extended or added:
  - `CreativeHubThread`
  - `CreativeHubThreadState`
  - `CreativeHubInterrupt`
  - `CreativeHubResourceBinding`
  - `CreativeHubCheckpointRef`
- `shared/types/api` adds LangGraph-style streaming events and thread response types, no longer only around the old SSEFrame.
- Keep existing `agent-catalog`, but fill for each tool:
  - `uiKind`
  - `resourceScopes`
  - `approvalRequired`
  - `followupActions`
- Creative Hub APIs and the planner must explicitly support global novel-management capability:
  - Without `novelId`, `list_novels` / `create_novel` are allowed
  - After `create_novel` succeeds, thread bindings must be written back and the right-side workspace status refreshed
  - `select_novel_workspace` is an explicit workspace-switch action and does not depend on the user hand-writing URL parameters
- Module-page deep-link convention:
  - `/creative-hub?novelId=...`
  - `/creative-hub?worldId=...`
  - `/creative-hub?taskId=...`
  - Combined bindings are supported, but each resource kind allows only one primary binding at a time.

## Testing and acceptance
- Server tests:
  - Thread create, rename, archive, delete
  - `state/history` reads
  - run stream ending normally
  - interrupt approval resume
  - checkpoint matching and branch editing
  - Failure-diagnosis questions no longer mistakenly trigger writing tasks
- Frontend tests:
  - Creative Hub thread switching
  - Tool-card rendering
  - Interrupt-card approval
  - Generating a branch after editing a message
  - Resource bindings brought in from a module page
  - In global mode, selecting a novel and switching to novel workspace
  - In global mode, creating a new novel and automatically binding it to the current thread
  - `/chat-legacy` and `/creative-hub` running in parallel without conflict
- Development acceptance scenarios are fixed to cover:
  - "List the current novels"
  - "Create a novel titled Anti-Japanese Marvels"
  - "Set Anti-Japanese Marvels as the current workspace"
  - "Which chapter has this book reached"
  - "Why did chapter three fail"
  - "List knowledge-base status associated with the current novel"
  - "Check whether the current worldbuilding conflicts with the first two chapters"
  - "Add a base character template to this book"
  - "Rewrite chapter three and enter approval"
  - "Edit the previous instruction and generate a new branch"
- Quality gates:
  - `typecheck` all green
  - Existing server tests all green
  - New creative hub route/runtime tests
  - Do not keep stacking logic into single files over 500 lines

## Assumptions and defaults
- This plan is the final content of `ASSISTANT_UI_PLAN.md`.
- The path is fixed as "design directly against LangGraph, but use a parallel migration; do not replace the entire old implementation in one shot".
- UI expression is fixed as "message-stream inline first, right resource panel second".
- Do not use assistant-cloud; do not depend on LangGraph Cloud; all use the project's self-hosted backend.
- Old `/chat` and local `chatStore` are only a transitional compatibility layer and no longer receive new capabilities.
- Existing `AgentRuntime`, task center, and capability catalog continue to be reused, but all take the LangGraph Creative Hub as the new primary run semantics.

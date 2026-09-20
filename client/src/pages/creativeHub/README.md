# Creative Hub frontend module boundary

## Module duty

Creative Hub is a workspace for querying novel state, diagnosing problems, and guiding the next step. It shows the current novel, creative threads, AI execution records, pending confirmations, and the recommended next action, and it sends query actions to the existing Creative Hub runtime and controlled tools.

This module is not the novel-production source of truth, and it is not a second novel producer. Auto-Director, chapter production, task projection, and resource services keep their own facts. Creative Hub only reads those structured states, explains the impact, and navigates into the formal workflow. Full agent-driven creation lives in a separate project: `https://github.com/ExplosiveCoderflome/ani-book-agent`. Users clone it from GitHub and install and run it independently.

## Directory ownership

- `CreativeHubPage.tsx`: page-level queries, mutations, URL sync, and three-column workspace orchestration. Do not keep stacking business display decisions in page JSX.
- `routing/`: pure conversion of Creative Hub deep links and resource-binding params. It only handles URL and structured binding.
- `presentation/`: project existing threads, initialization, production, diagnosis, and turn summaries into the current object, stage, and single recommended action. Do not recognize user intent with keywords here.
- `hooks/useCreativeHubRuntime.ts`: assistant-ui/LangGraph adaptation, thread message load, streaming run, checkpoint, branch, and run-artifact projection.
- `components/CreativeHubConversation.tsx` and message components: production record, free input, message edit, branch, regenerate, Tool UI, and approval.
- `components/CreativeHubSidebar.tsx`: current novel and resource binding, formal-workflow navigation, blocker summary, and collapsed run detail.
- `components/CreativeHubThreadList.tsx`: thread select, create, archive, and delete. It does not call the API.
- `components/CreativeHubToolResultCard.tsx`: deterministic UI mapping of structured tool names and tool output. Tool-name mapping is structured result display, not intent routing.
- `lib/creativeHubSyntheticMessages.ts`: project turn summaries, diagnoses, and debug events into inline message-stream artifacts.

Stateless headers, recommended actions, and status feedback reused across workspaces belong in `client/src/components/workspace/`. Components that carry Creative Hub types, runtime, or resource-binding semantics must stay in this module. Do not sink them into a generic helper.

## Status priority

The page shows one primary recommended action and consumes existing structured state in this order:

1. Query, thread load, or thread create failed: offer the matching retry entry.
2. Explicit interrupt, or the thread / latest turn is `interrupted`: guide the pending confirmation.
3. Runtime or thread is executing: show execution status; do not send again or switch key resources.
4. Thread, latest turn, diagnosis, or production is in structured failure: use the existing recovery advice.
5. New-book setup is incomplete: use `novelSetup.recommendedAction`.
6. Latest turn has a next step: use `latestTurnSummary.nextSuggestion`.
7. No novel is bound: guide novel selection or the formal create entry.
8. Everything else: enter the existing formal novel workspace or Auto-Director.

This priority only displays structured conclusions already produced by AI/runtime. Do not add keyword, regex, or free-text routing.

## Interaction rules

- When switching threads, clear the previous thread’s messages first. A load failure must keep the error and retry entry; do not keep showing old messages.
- URL `threadId` is the frontend source of truth for the current thread. Browser forward, back, and deep links must drive the workspace. Load, stream, approval, or resource-binding responses from an old thread must not overwrite the new thread.
- When a deep link carries resource binding but no `threadId`, reuse only a thread whose binding matches exactly. If none matches, create a new bound thread. Do not fall back to an unrelated recent thread and overwrite the entry context.
- Loading, error, and empty states for thread, novel detail, and novel list must be distinct. Do not render failure as empty data.
- During runtime execution, resource binding, approval, or production submit, conflicting actions must look truly disabled/pending. Do not keep a clickable look and silently return in the handler.
- If the current thread content or status fails to load, keep the main creation area disabled, but thread selection and new-thread must stay available so the user can leave the broken scene.
- Switching novels must clear the previous novel’s chapter and world bindings so mixed cross-novel context cannot form. Independent bindings such as tasks, formulas, and knowledge materials keep the user’s current selection.
- Do not submit production settings when novel detail has not loaded successfully, so empty fields cannot overwrite the current novel.
- Tool results, turn summaries, and approvals stay in the message stream first. The sidebar only shows the summary needed for the next step; resource IDs and model details stay collapsed by default.
- Technical identifiers such as Run, Checkpoint, and Provider may appear only in the expanded run/debug area. Collapsed titles name the information class and record count.
- On mobile, show the recommended action and production progress first, then novel context and thread management. Input font size is at least 16px.
- Styling uses global semantic tokens. Do not scatter palette colors, decorative gradients, heavy shadows, or oversized radii in the module.

## Verification boundary

- Routing binding and workspace recommendation priority use pure-function tests.
- Page composition and semantic styles use client design-contract tests.
- Runtime or form-state changes at least run client typecheck and focused client tests.
- UI interaction and visual acceptance belong to the user. Do not run browser or screenshot tests by default.

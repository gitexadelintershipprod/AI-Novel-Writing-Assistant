# Creative Hub boundary

## Background

Creative Hub is a read-only status entry for beginners. It hosts question answering, run diagnosis, execution-record explanation, and navigation into the formal workbench. It helps the user know what happened to the current novel, why it stopped here, and where to go next. It does not produce novel artifacts.

If Creative Hub bypasses Auto-Director, Prompt Registry, Runtime API, or task-status projection and calls old services directly, it recreates multiple entries, multiple states, and multiple recovery semantics.

## Decision

Creative Hub is a query and navigation entry, not a novel-production fact source. It explains Auto-Director or the chapter chain through governed read-only tools, runtime APIs, and projections. Every action that would create, write, or change run state is taken by the formal workbench.

AI judgment remains the primary implementation for intent recognition, planning, routing, and next-step recommendation. Deterministic code only does input validation, safety boundaries, permission, idempotency, and post-processing of already-structured output.

## Current Rule

- Creative Hub may understand user intent, explain current novel progress, diagnose problems, summarize execution records, and recommend a formal entry.
- Creative Hub does not create a novel, generate world / characters / outline, write or save prose, start a whole-book pipeline, or perform director continue, policy switch, recovery, retry, cancel, or approval writes.
- Creative Hub does not directly take on Auto-Director long tasks, chapter production, quality repair, or heavy RAG indexing.
- Creative Hub may hand a vague idea to Creation Studio for interpretation and recommendation, but it must not execute short-story planning, segmented generation, full-piece audit, repair, or prose rewrite inside the chat request.
- Short-story creation and revision must run through the `creation_studio` workflow, Prompt Registry, and task projection, so refresh recovery, idempotency, and human-prose protection use the same fact state.
- When the user’s goal is opening a book, takeover, continue, recovery, chapter execution, or batch production, navigate explicitly to the novel workbench, Auto-Director, or Task Center.
- Tool calls should bind to explicit resources and auditable records. Do not replace AI-first structured understanding with free-text branches.
- For beginners, Creative Hub should give one recommended next step, a reason, and an impact scope. Do not require the user to judge complex engineering or novel-structure state themselves.
- Do not add product-level intent routing based on keywords, regex, or hard-coded branches.

## Frontend workbench contract

The Creative Hub frontend is organized around “creation thread + current novel + execution activity”, not around a general chat product:

- The page header must show the current novel, current stage, thread status, and one primary recommended action. Technical information such as resource IDs, Run, Checkpoint, and Provider belongs only in collapsed details.
- The central creation-progress region is the visual center. It hosts the user request, AI judgment, tool-execution results, approval, and turn summaries. Free input remains, but a chat hero or a pile of generic questions must not replace current-task guidance.
- The novel-resource region only shows current-novel context and formal-entry navigation. Opening prep and whole-book production happen in the novel workbench or Auto-Director.
- The thread region saves different creation scenes. On mobile, show the recommended action and creation progress first; thread management comes after the main task.
- Query failure, thread-load failure, and real empty data must use different states. Switching threads must not keep showing the previous thread’s messages.
- While Runtime is executing, a resource is binding, approval is submitting, or production is starting, conflicting actions must actually disable and show an in-progress state.
- When the current thread fails to load or status fails to read, creation input, resource edits, and approval stay locked. Thread switching and creating a new thread are recovery channels and must not be closed by the same disable condition.
- URL `threadId` is the frontend’s fact identity for the current thread. Thread load, stream events, branch checkpoints, resource binding, and approval responses must all validate the originating thread. After the user switches through history or a deep link, old responses may only update the original thread’s cache. They must not rewrite the current URL or the new thread’s messages.
- A deep link with no `threadId` and only resource bindings may reuse only a thread whose bindings match completely. If there is no match, create a new thread to take those resources. Do not fall back to an unrelated thread and drop the entry context.
- When the novel binding changes, chapter and world bindings must clear together, then reassemble from the new novel’s real state. Do not carry the previous novel’s child resources into the new context.

Frontend recommended actions consume existing structured state in this priority: query/load/thread-create failure, running, structured thread/turn/diagnosis failure, view execution records, view next-step suggestions, open novel workbench / Auto-Director / Task Center. `thread.status`, `thread.latestError`, and `latestTurnSummary.status` are all formal state inputs. That order is a display policy after structured output. It must not evolve into free-text intent routing.

Cross-workbench reused header, recommended action, and status feedback live in `client/src/components/workspace/` and must not read the API or depend on Creative Hub types. Messages, threads, resource bindings, Tool UI, Runtime, and state projection stay in `client/src/pages/creativeHub/`.

## Examples

Recommended:

- The user asks “Where is this book now?” Creative Hub reads real artifact progress and the runtime projection, answers produced facts first, then adds background-task status.
- The user asks to continue automatic generation. Creative Hub explains current state and guides to the Auto-Director continue entry.
- After the user edits a chapter by hand, Creative Hub does a read-only impact analysis. Formal repair or continue still happens in the novel workbench.

Forbidden:

- Assembling a prompt in the chat route, calling an LLM to decide, and executing heavy novel production.
- Using keywords to judge “continue”, “resume”, or “retry” and bypassing command, policy, and projection.
- Expanding Creative Hub into general chat when the new capability does not serve whole-novel completion.

## Failure Modes

- The conversation shows a write or execution result: check whether the Creative Hub profile bypassed the read-only allowlist, or wrongly allowed a preview-class tool.
- The conversation says continue is possible, but the Auto-Director panel is out of sync: check whether runtime projection was bypassed.
- Keyword fallback was added after intent recognition failed: fix the Prompt schema, context, or tool contract. Do not hide an AI-capability problem.
- After switching threads, the previous thread’s content is still visible: check whether Runtime cleared messages before loading the new thread, and whether load errors are exposed to the page.
- Novel-list or novel-detail request failed but the page shows empty: check whether the page mixed Error and Empty into the same branch.
- A button looks actionable but clicking does nothing: check whether Runtime, resource-binding, approval, and production-submit pending states reach the actual control.
- Browser back/forward jumps back to the old thread: check whether the current thread still has two fact sources (URL and local state), and whether old async responses lack thread-identity validation.
- After switching novels, the previous novel’s chapters or world still appear: check whether the resource binding patch clears child bindings when novel identity changes.
- After a thread-load failure the user cannot leave the current scene: check whether the main-workspace disable condition was reused for thread navigation. The thread list should use an independent recovery-style disable policy.
- Bound resources disappear after entering from book analysis, characters, or tasks: check whether a no-`threadId` deep link wrongly fell back to the first history thread instead of matching or creating the corresponding resource thread.

## Related Modules

- `server/src/creativeHub/`
- `server/src/agents/`
- `server/src/graphs/`
- `server/src/services/novel/director/`
- `server/src/services/novel/runtime/`
- `server/src/modules/novel/creation-studio/`
- `server/src/modules/novel/short-story/`
- `client/src/pages/creativeHub/`
- `client/src/components/workspace/`
- `client/src/pages/tasks/TaskCenterPage.tsx`

## Source Documents

- [Prompt Workbench, context assembly, and unified step-runtime plan](../../plans/prompt-workbench-context-and-step-runtime-plan.md)
- [Auto-Director execution-plane isolation and API keep-alive plan](../../plans/auto-director-execution-plane-isolation-plan.md)
- [README project positioning](../../../README.md)

# LLM live execution and task visibility

## Background

Novel planning, chapter generation, and repair often change the page only after the model has fully returned. During a long output, the user cannot tell whether the task is still generating, currently validating, or already unresponsive.

## Decision

LLM calls use a dual track of “server consumes the stream + global creation live subscription”: the server keeps reading the model stream and accumulating the complete result; the frontend subscribes to temporary events from the top “AI Live” surface, which can be opened from every page. After the stream ends, the caller continues the existing structured parse, semantic validation, repair, business apply, and persistence flow.

## Current Rule

1. Registered Prompt text and structured calls must prefer the model `stream`. Do not fall back to one-shot `invoke` because no page is subscribed.
2. The server is the stream’s only consumer. The browser only subscribes to events. Closing the page, switching tasks, or an SSE disconnect must not interrupt the background task.
3. Live events only express process: `requesting`, `streaming`, `validating`, `repairing`, `completed`, `failed`, and similar. They do not replace unified task status.
4. `output_delta` is an unverified preview. Only results that have finished the original validation, repair, and save chain may enter novel assets, chapter prose, or task-success state.
5. When structured output enters JSON repair, keep the same session and show `repairing`. Do not recreate an unrelated frontend stream during repair.
6. Top “AI Live” by default subscribes to generation sessions in the current service, and may also filter by `taskId` or interaction ID. After completion it is kept briefly so a panel reconnect can restore a snapshot. It is not long-term log or content storage.
7. Task Center is the run-record and recovery-query entry, not the live-progress entry during ordinary creation. Do not require the user to leave the current page just to confirm that AI is still generating.
8. The live window is a terminal-style floating log with no background overlay, and it is draggable. When opened it must locate to the latest output after layout completes. Auto-follow new content only while the user stays at the log bottom. After the user reads upward, keep the current reading position and offer “Back to latest output”.
9. The live window groups display by one LLM call. When a new call starts, expand and focus the latest call. Previously completed, failed, or cancelled calls should auto-collapse; the user may still expand them to view the preview.
10. “Clear foreground” only clears call sessions already shown in the current browser window. It must not delete server temporary sessions, business tasks, saved results, or Task Center run records. After clear, only newly started calls are shown.
11. Long-running main surfaces such as Auto-Director and the simple chapter shelf should provide an in-place live entry subscribed by `taskId`. Detecting a new model session for the current task may auto-open once. After the user closes that same session, later fragments must not pop it open again.
12. When Auto-Director planning stages call Prompts, they must pass the same director task ID down the call chain, plus novel, stage, and step context. Candidates, story macro, characters, volume planning, and chapter production must not lose live ownership because of cross-service calls.

## Failure Modes

- SSE disconnect: only visualization subscription is affected. The server keeps consuming the model stream and running later logic.
- Model stream fails: the session emits a failure event. The original call still follows existing error handling and task-recovery rules.
- A structured preview looks complete but validation fails: the UI must show “checking / repairing”. Do not mark the preview as saved prose.
- Internal calls with no task context: streaming execution may still be used. The global live panel may show that session, but it must not be disguised as a recoverable business task.
- The current task is calling a model but in-place live is empty: first check whether `taskId` in Prompt-call metadata was passed completely among candidate, planning, and chapter services, then whether the page subscribed to another task by mistake. Do not use a global session to impersonate the current task’s output.

## Related Modules

- `server/src/platform/llm/live/`: session proxy, event contract, and SSE.
- `server/src/llm/structuredInvoke.ts`: structured stream, validation, and repair join.
- `server/src/prompting/core/promptRunner.ts`: text/structured execution entry for registered Prompts.
- `client/src/hooks/useLlmLiveFeed.ts`: SSE consumption and batched state updates.
- `client/src/components/liveExecution/LiveExecutionDialog.tsx`: user-visible live entry openable from every page.

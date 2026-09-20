# LLM Live Execution Boundary

This module provides temporary visualization events for the LLM generation process. It does not own business results, task state, or database writes.

- `LlmLiveBroker` maintains short-lived sessions, the latest preview, and subscriptions. Completed or failed sessions are kept for 10 minutes so the page can reconnect.
- `llmLiveSession` maps Prompt call metadata into subscribable task, novel, and chapter context.
- `http/llmLiveRoutes` only emit global or task-filtered snapshots and incremental events over SSE. Closing the browser connection only cancels the subscription; it cannot cancel server-side generation.

Callers must consume the model stream on the server and continue the original parse, validate, repair, and save logic. Live content is an unvalidated preview and must not be treated as official novel content or as evidence that a task is complete.

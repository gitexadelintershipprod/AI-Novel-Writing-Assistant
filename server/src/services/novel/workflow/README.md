# Novel Workflow Service Boundary

`NovelWorkflowService` is the external facade. Internal responsibility is split into three parts:

- `store / projection`: low-level reads and writes needed for task visibility, read models, persistence updates, and notification projection.
- `healing`: recovery, correction, historical failed-state repair, and auto-director state alignment.
- `application`: bootstrap, state migration, checkpoint, retry, and recovery commands.

External modules should depend only on the facade and must not deep-link into specific implementation files.

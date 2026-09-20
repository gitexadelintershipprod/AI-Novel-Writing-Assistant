# Task Queue Display Boundary

This directory provides task-queue summary, list items, status labels, content sections, and action-consequence rows.

- Components only consume a `WorkspaceTone` the page has already decided. They must not guess business state from keywords or error copy.
- `danger` is for structured blocking/failure, `warning` for quality reminders, `info` for pending action or in progress, and `success` for completion.
- `TaskQueueSeverityBadge`, `TaskQueueImpactNotice`, and `TaskQueueEmptyState` share the `blocking | quality | normal` display contract. Running, pending-action, and other runtime states use a separate status label.
- Identity resolution remains owned by the page and API contract. This directory must not treat `workspaceTaskId` as `directorTaskId`.

# Replan Orchestration Boundary

This directory parses an explicit replan request into a chapter window, calls plan generation chapter by chapter, and records the replan run. Deterministic judgment of whether to stop the whole book remains owned by `replanDecision.ts`. This orchestration layer must not escalate payoff overdue or local quality debt into a global stop on its own.

`PlannerService` keeps the public facade and supplies plan read and generation capability to this module through a minimal adapter interface. Callers must not bypass the facade and assemble the replan persistence flow themselves.

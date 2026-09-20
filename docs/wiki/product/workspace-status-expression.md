# Workspace status expression and next-step contract

## Background

Task Center, director follow-up, book analysis, and Creative Hub all present runtime progress, human confirmation, local quality debt, and true interruption. For a writing beginner, showing only internal enums or using the same red warning for everything makes “tap once to continue”, “this chapter can be fixed later”, and “whole-book planning must stop” look like the same failure.

Page status expression is not a translation of technical states. It answers four questions: what object is being handled, which stage it is in, whether it affects continuing creation, and the single action the user should take.

## Decision

The workspace first builds a page display model from structured backend state, then hands the result to presentational components that have no business state. Those components own semantic color, hierarchy, and accessibility. They must not guess business impact from error copy, keywords, or resource IDs.

A global stop must come from an explicit replan, human recovery, unusable content, runtime safety, or data-integrity signal. Chapter-level quality debt, local repair guidance, and ordinary pending-confirm nodes must not be promoted to whole-book blocking just because they look like “failed” or “alert”.

## Current Rule

- `replan_required`, human recovery, and a real task failure must be handled. Only an explicit replan signal may be described as whole-book production needing to stop. Other failures describe impact on that task or source flow only.
- `PIPELINE_QUALITY_REVIEW`, local title reminders, and structured quality debt are quality reminders. They may enter a later repair list. They must not be written as whole-book failure.
- Candidate confirm, waiting for approval, and a chapter batch waiting to continue are pending actions. They need a user action. They are not system faults.
- Queued, running, completed, superseded, and canceled are ordinary progress or history. A canceled record is promoted only when there is an explicit recovery requirement.
- Page recommended actions collapse to one primary action in this order: read failures and must-handle → pending action → continuable quality reminder → in progress → ordinary completion. Secondary actions must state the effect of executing them.
- Loading, Error, Empty, and Retry must be expressed separately. A query failure must not masquerade as an empty list. Old detail must not keep showing when a new object fails to load.
- The workspace header shows a user-recognizable object name, stage, and status. Raw resource IDs, run, checkpoint, and model routing stay in collapsed runtime information by default.
- Semantic color is only an auxiliary layer. Status labels must also provide text. Pending action and quality reminder must not be distinguished by color alone.
- Historical copy compatibility may help open an existing repair entry. It must not decide task severity. Blocking, quality reminder, and pending action must come from structured state or code.
- Creative Hub’s recommendation order is: read/create failure, pending confirm, running, structured-failure recovery, opening-info completion, AI-turn suggestion, select novel, production entry. If there is no thread, or the current thread did not load successfully, the main creation action must be disabled. Thread create, retry, and switch stay as recovery channels.
- Tool names, error codes, resource IDs, and run identifiers are diagnostic. They must not replace user-facing action titles or impact copy. Keep them in expandable detail when they are needed.

## Examples

- “Chapter 12 has a local duplicate title” displays as “quality reminder; later chapters can continue”. The primary action enters local repair.
- “Waiting to confirm the book-level direction” displays as “pending action”. The primary action enters candidate confirm. Do not show “task failed”.
- “The neighboring chapter plan explicitly requires replan” displays as “replan required”, and says later chapters stop until confirm.
- When the task overview fails to load, show reload. An empty list is only for a successful query that truly has no records.
- When switching Creative Hub threads, clear old messages first. If the new thread fails to load, show reload and thread-switch entries. Do not keep showing the previous thread.

## Failure Modes

- Every `failed` appearance is written as “whole-book blocked”: check whether structured quality-debt codes or existing local-reminder contracts were ignored.
- Waiting for approval uses a danger color: check whether the page display model merged “needs action” with “fault occurred”.
- The task list looks empty but the request failed: check whether the query error was swallowed by a default empty array.
- After clicking an action, the user does not know what will happen: add write scope, whether task status changes, and whether saved content is kept.
- A presentational component starts reading task enums or matching error strings: move the judgment back to the page or business view model, and keep the component free of business state.

## Related Modules

- `client/src/components/workspace/`
- `client/src/components/taskQueue/`
- `client/src/pages/tasks/`
- `client/src/pages/autoDirectorFollowUps/`
- `client/src/pages/bookAnalysis/`
- `client/src/pages/creativeHub/`
- `shared/types/task.ts`
- `shared/types/autoDirectorFollowUp.ts`

## Source Documents

- [Beginner-first full-novel completion](./beginner-first-novel-completion.md)
- [Auto-Director runtime and recovery](../workflows/auto-director-runtime.md)
- [Product page DESIGN rollout plan](../../plans/product-ui-design-rollout-plan.md)

# Runtime records and the AI live-creation boundary

## Background

When beginners wait for long-form generation on a writing page, they need to know immediately whether AI is still working, what it is generating, and whether it has entered check or repair. Sending them to Task Center just to confirm progress breaks the current creation context and makes ordinary waiting look like a background failure.

## Decision

Live process belongs on the main creation surface: every page’s top bar exposes an AI Live entry that opens the same global generation panel. The former Task Center is named Runtime records in the product. It owns history, exception lookup, recovery location, and archive management.

## Current Rule

1. During ordinary generation, planning, prose writing, and repair, the user does not need Runtime records. The top AI Live entry should show returning fragments and the generation stage directly.
2. AI Live shows only temporary, unverified process content. It cannot replace final novel content, task results, or recovery decisions.
3. Runtime records keep unified-task source, steps, exceptions, cancel, archive, and recovery information for on-demand lookup when something is wrong or history is needed.
4. Beginner guidance, ordinary buttons, and page copy should keep the user in the current creation scene. Do not make “open Runtime records” the normal next step except for exceptions, recovery, or history lookup.
5. The main entries for Auto-Director and chapter quality debt still belong to the novel workspace and director follow-up. Runtime records only provide factual lookup and source jumps. They do not re-adjudicate the main creation status.
6. Runtime records default to a task-inbox mental model: show tasks that need handling, are waiting for action, or are in progress first, then the current action and executable entries. Model, token, heartbeat, full timestamps, checkpoints, and fine-grained steps are diagnostic. Expand them after a task is selected. Do not keep them laid out in the list so beginners have to read internal runtime fields.

## Failure Modes

- Using Runtime records polling as a substitute for in-page creation feedback: the user leaves the current creation step and thinks ordinary generation needs manual handling.
- Treating the live preview as saved prose: keep showing check and save stages, and keep the original business page’s asset state as the final result.
- Hiding failure and recovery to simplify the entry: Runtime records must stay reachable, with stable source and recovery paths.

## Related Modules

- `client/src/components/liveExecution/LiveExecutionDialog.tsx`
- `client/src/components/layout/Navbar.tsx`
- `client/src/pages/tasks/TaskCenterPage.tsx`
- `docs/wiki/workflows/llm-live-execution.md`

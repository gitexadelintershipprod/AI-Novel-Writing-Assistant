# Director follow-up

Director follow-up shows Auto-Director progress, pause reasons, recovery entries, and next-step advice. It helps you see where a book’s main chain stopped.

## When to open it

- Auto-Director is waiting for confirmation.
- Book opening stopped and you want to continue.
- Chapter preparation or execution has no continue entry.
- The Task Center shows a director-related task failed or waiting to recover.
- You want to know what the system recommends next.

If you only want to know whether a background task finished, start in the Task Center. If you want to know why Auto-Director stopped, open Director follow-up.

## Common pause reasons

An Auto-Director pause is usually not a failure. It is waiting for a clear action:

- direction candidates waiting for a choice;
- world, characters, or volume planning need confirmation;
- the chapter plan is missing necessary information;
- a background task failed and needs a retry;
- quality review created local debt, and you need to repair or continue;
- the system decided a replan is required.

When you read a pause reason, separate “local quality problem” from “the main chain must stop.” Repairable chapter issues should usually be recorded as quality debt or local repair guidance, not used to block the whole book.

## How to read recovery entries

Director follow-up tries to land recovery on a concrete entry:

- return to direction choice;
- fill in novel basics;
- continue character or world preparation;
- enter chapter tasks;
- retry a failed task;
- accept a warning and continue later chapters.

If there are several entries, prefer the one marked as recommended. Do not trigger the same-stage task from several pages at once.

## How it relates to the Task Center

The Task Center answers “what happened to the background task.” Director follow-up answers “what this book should do next.”

A common pairing:

1. See a pause in Director follow-up.
2. Check the latest task status and error in the Task Center.
3. Return to Director follow-up and choose the recovery action.
4. Continue Auto-Director or chapter execution.

If the Task Center shows running, Director follow-up may not offer a new confirmation yet.

## Recommended handling

When it pauses, judge in this order:

1. Is it only waiting for you to choose a candidate?
2. Is there a background task that can retry?
3. Is there already usable chapter content?
4. Is a local repair needed?
5. Is a replan explicitly required?

Stop the global chain only for an explicit replan, an unrecoverable generation failure, a data-integrity risk, or a runtime safety issue.

## For beginners

If you do not understand the pause copy, do not clean data by hand. Do two things first:

- check the latest Task Center status;
- return to the novel page and confirm basics and candidates.

Most pauses recover through confirm, retry, or continue.

## Checkpoint list

Director follow-up’s most important job is turning the current Auto-Director checkpoint into an action you can take.

| Checkpoint | What the page means | Common stages | Your action | Auto-approval points |
|---|---|---|---|---|
| `candidate_selection_required` | Waiting to confirm a book-level direction | direction candidates, title pack | choose a direction, revise a candidate, redo titles | `candidate_direction_confirmed` |
| `book_contract_ready` | Book-level planning is ready | book contract | review book-level promises, continue later asset preparation | none |
| `character_setup_required` | Character preparation needs confirmation | character setup, apply character cast | confirm, merge, redo, or add characters | `character_setup_ready` |
| `volume_strategy_ready` | Volume strategy is ready | volume strategy, volume skeleton | confirm, then enter beat/chapter split | `volume_strategy_ready` |
| `chapter_batch_ready` | A chapter batch can run | beat sheet, chapter list, chapter detail | enter chapter execution or authorize automatic writing | `structured_outline_ready` |
| `replan_required` | Quality repair or replan needs handling | review repair, quality loop | read the reason, then repair, continue, or replan | `replan_continue` / `low_risk_quality_repair_continue` |
| `workflow_completed` | The director main flow finished | global or batch end | review results and later advice | none |
| `rewrite_snapshot_created` | A pre-rewrite backup exists | rewrite / regenerate | confirm cleanup, then continue | `rewrite_cleanup_confirmed` |

:::checkpoint A checkpoint is not a failure
When status is waiting approval, the system is usually waiting for you to confirm a direction, cast, volume plan, chapter execution, or repair strategy. Open Director follow-up first. Do not delete or recreate the project.
:::

## From pause reason to recovery entry

| Pause reason | Meaning | Recommended entry |
|---|---|---|
| Candidate direction waiting | `candidate_direction_batch` or `candidate_title_pack` finished | direction choice page |
| Character preparation waiting | the cast may need a human confirmation | character candidate page, Director follow-up |
| Volume strategy waiting | volume route and skeleton finished | volume planning entry |
| Chapter batch ready | beat sheet, list, and detail finished | Director follow-up, chapter execution entry |
| Low-risk quality repair | the chapter can be repaired and needs authorization to continue | chapter page, Director follow-up |
| Replan required | later plans may need to change | Director follow-up, Recovery by phase |
| Worker interrupted | a background lease expired or the service restarted | Task Center recover |
| High-memory task conflict | the same book and range already has a beat sheet / chapter-split task | Task Center, look at the running task |

## How to read auto-approval

Auto-approval lets the system continue at specified low-risk confirmation points. Common points include:

| Auto-approval point | Matching action | Risk |
|---|---|---|
| `candidate_direction_confirmed` | After confirming a candidate direction, continue creating the book | low |
| `character_setup_ready` | After the cast passes, continue to volume strategy | low |
| `volume_strategy_ready` | After volume strategy passes, continue to beat/chapter split | low |
| `structured_outline_ready` | After chapter tasks are ready, continue writing | low |
| `chapter_execution_continue` | After one chapter batch finishes, continue remaining chapters | medium |
| `low_risk_quality_repair_continue` | After low-risk quality repair, continue | medium |
| `replan_continue` | After replan handling, continue | high |
| `rewrite_cleanup_confirmed` | After rewrite cleanup is confirmed, continue | high |

Low-risk planning points are a better default for automatic continue. Keep a human confirmation for replan, rewrite cleanup, or a large prose change.

## How follow-up notices relate

Director follow-up and follow-up notices are different entries into the same main chain:

- Notices remind you: a task paused, is waiting for confirmation, can recover, or has a quality issue to handle.
- Director follow-up explains: why it paused, which checkpoint it stopped at, and what the next entry is.
- The Task Center gives facts: whether a background command is queued, running, failed, stale, or completed.

When a notice says “needs handling,” open Director follow-up first. When a notice says “task failed” or “recover,” open the Task Center first.

## How it relates to the stage-depth docs

If you see a stage name you do not understand, for example `beat_sheet`, `volume_skeleton`, or `chapter_detail_bundle`, start with the [Auto-Director stage map](#/docs/auto-director-pipeline). If the pause happened after chapter writing, review, or repair, read the [Chapter execution chain](#/docs/chapter-execution) and [Recovery by phase](#/docs/recovery-by-phase).

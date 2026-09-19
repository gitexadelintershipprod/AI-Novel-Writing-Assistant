# Task Center

The Task Center shows queued, running, failed, completed, and recoverable background tasks. A long AI task may not finish on the current page. The Task Center helps you confirm real progress.

## When to open it

- Generation, book analysis, knowledge-library indexing, or Auto-Director is taking a long time.
- The page says a task failed, is waiting to recover, or is not responding.
- You want to know whether a task is still running in the background.
- You need to cancel, retry, or return to the related entry.

If it “looks like nothing happened,” check the Task Center first. Many long tasks keep running and are not failures.

## How to read task status

Common statuses mean:

- Queued: the task is created and waiting for an execution slot.
- Running: the background is calling a model, processing notes, or writing results.
- Completed: the result is saved. You can return to the related module.
- Failed: an error happened during execution. Read the failure reason.
- Waiting to recover: the chain needs you to confirm the next step or continue from a recovery entry.
- Cancelled: the user or the system stopped the task.

If status looks stale, refresh the page, then check the related module.

## Failure diagnosis

After a failure, look at three things:

1. Task type: book opening, chapter, book analysis, knowledge library, or image generation.
2. Error source: model, network, data, structured output, or runtime exception.
3. Usable result: whether there is already prose, analysis, or a partial asset.

Suggested handling:

- Temporary model or network error: retry.
- Structured output failed: switch to a more stable model or adjust model routing.
- Missing basics: go back to the novel page and fill them in.
- Usable prose exists, but review is imperfect: record quality debt and continue later chapters.
- An explicit replan is required: handle it in Director follow-up.

## Retry strategy

Before retrying, confirm the task is not still running. Triggering the same stage many times can make status hard to read.

Recommended strategy:

- Temporary provider error: retry directly.
- Repeated format errors: switch models, then retry.
- Chapter quality issues: see whether a local repair is enough.
- Knowledge-library index failed: confirm Qdrant and file status, then retry.
- Auto-Director stopped: open Director follow-up first. Do not only retry in the Task Center.

## How it relates to the main writing chain

The Task Center does not decide what a book should write next. It presents factual status. The next writing action usually happens on the novel page, in Creative Hub, or in Director follow-up.

Diagnose in this order:

1. Confirm task status in the Task Center.
2. Understand chain position in Director follow-up.
3. Continue from the novel page or Auto-Director formal entry. Creative Hub only explains status and navigates to entries.

## Usage habits

Build two habits:

- After you start a long task, check the Task Center if you are waiting.
- After a failure, read the error first, then decide retry, recover, or replan.

The Task Center reduces repeated clicks and blind reruns. It is the first entry for long-chain problems.

## DirectorRunCommand queue model

Auto-Director background actions are written to the `DirectorRunCommand` queue, then executed by `DirectorWorker`.

| Status | Meaning | What you see |
|---|---|---|
| `queued` | The command is queued and waiting for a worker lease | Task queued or waiting to run. |
| `leased` | A worker took the command but has not started running | A brief status that usually becomes running quickly. |
| `running` | The worker is executing the command and renewing the lease | Task running. |
| `succeeded` | The command finished | The result can be viewed. |
| `failed` | The command failed | The Task Center shows the error. |
| `stale` | The worker lease expired and recovery is needed | Waiting for automatic or manual recovery. |
| `cancelled` | The command was cancelled | User or system cancelled it. |

Common command types include `generate_candidates`, `confirm_candidate`, `continue`, `resume_from_checkpoint`, `retry`, `takeover`, `approve_gate`, and `repair_chapter_titles`.

## How DirectorWorker runs

`DirectorWorker` will:

1. take the earliest runnable command from the queue;
2. write a lease and worker owner onto the command;
3. acquire a ResourceGate;
4. mark it running;
5. execute the matching command;
6. succeed, fail, cancel, or release resources;
7. renew the lease regularly so a long task is not mistaken for stale.

You can leave the current page and the background will keep running. Repeated clicks on the same entry can also enqueue several commands.

## ResourceGate concurrency limits

ResourceGate limits concurrency by “novel + resource type.” Default resource types include:

| Resource class | Default slots | Typical tasks |
|---|---|---|
| planner | 2 | candidates, planning, volume strategy, chapter split |
| writer | 2 | chapter writing |
| repair | 2 | chapter repair, quality repair |
| state_resolution | 2 | state commit, character resource sync |

Beat sheet, chapter list, chapter detail, and chapter sync are high-memory Auto-Director stages. The same book and same range usually allow only one high-memory task, so batch chapter splits do not overwrite each other.

:::warn Do not start the same-range task twice
If you see that an Auto-Director task is already handling the same range, open the Task Center and check progress first. Starting it again can make it hard to tell which task wrote the final result.
:::

## Recovering stale tasks

Stale means the worker lease expired. Common causes:

- the app or service restarted;
- the background process exited;
- a long task ran past the lease and lease renewal failed;
- the machine slept or the network dropped.

The system distinguishes automatic recovery from manual recovery:

| Situation | Behavior |
|---|---|
| Full-book autopilot, `continue`, or `resume_from_checkpoint`, and attempts are still under the limit | Automatically return to queued and keep running. |
| Attempts exceeded the limit, or the command is not suited to automatic recovery | Mark stale; the task waits for recovery. |
| You click recover | Continue from the latest checkpoint or command payload. |

## Retry, recover, and restart

| Action | Best for | Does it change artifacts? |
|---|---|---|
| Retry | The same command failed temporarily | Usually reruns only the failed command. |
| Recover | stale, waiting for confirmation, checkpoint | Continues from saved progress. |
| Regenerate | The current stage result is not acceptable | May overwrite that stage’s artifacts. |
| Replan | An upstream goal changed, or quality explicitly requires it | Affects later stages. |

Retry in the Task Center is for a failed background command. Continue / recover in Director follow-up is for which checkpoint the main chain stopped at.

## Working with Director follow-up

Recommended diagnosis order:

1. Confirm in the Task Center whether the command is still running.
2. If it is waiting approval, handle the checkpoint in Director follow-up.
3. If it failed, read the error first, then decide retry or return to an earlier stage.
4. If it is stale, use the recovery entry first.
5. If the chapter already has prose but state sync failed, retry sync first. Do not rewrite the prose immediately.

The Task Center gives facts. Director follow-up gives the next step.

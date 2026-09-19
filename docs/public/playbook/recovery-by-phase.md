# Recovery by phase

This guide lists common Auto-Director stalls by stage: where to look first, the recommended recovery entry, and when a replan is needed.

## First decide whether it is a failure

Many “stops” are checkpoints:

- Waiting for direction selection: waiting for you to choose a direction.
- Waiting for character confirmation: waiting for you to confirm characters.
- Volume strategy ready: waiting for you to confirm volume planning.
- Chapter batch ready: waiting to enter chapter execution.
- Replan required: waiting for quality repair or replan handling.

If task status is waiting approval, do not delete or recreate the project. Open Director follow-up first.

## Recovery matrix

| Stage | What it looks like | Look here first | Recommended recovery entry | When to replan |
|---|---|---|---|---|
| Candidate seed alignment | Inspiration cannot generate candidates | Creative Hub, Task Center | Edit the inspiration, switch models, regenerate candidates | Not needed. The project is not created yet. |
| Direction batch | None of the candidates fit | Direction choice page | Generate the next batch, revise a candidate, targeted patch | Not needed. Stay in the candidate stage. |
| Title pack | The title is a poor fit | Direction choice page | Redo titles only | Not needed. |
| Create novel | After confirm, the project does not appear | Task Center | Retry Confirm candidate | Only if a duplicate-data conflict cannot be repaired. |
| Story macro | The story direction drifted | Novel story-macro page, Director follow-up | Adjust the story macro or return to candidates and redo the direction | If the core selling point is wrong, return to candidates. |
| Book contract | Promise / audience is off | Book-level information, story macro | Edit the book contract, then continue | If it would change all volume planning, rerun later planning. |
| World setup | World rules do not fit | World module | Edit the world or prepare the world again | If world rules change the main conflict, rerun characters and volume planning. |
| Character setup | Characters feel like job titles and lack identity anchors | Character candidate page, Director follow-up | Merge, confirm, add, or redo the cast | If character goals affect the main line, rerun volume planning. |
| Apply character cast | Characters cannot be saved | Task Center, character page | Retry apply, or confirm characters by hand | If a data conflict cannot be repaired, handle it manually. |
| Volume strategy | Volume goals are unclear | Volume planning entry | Redo volume strategy or adjust the book contract | If volume 1’s promise is misplaced, rerun chapter split. |
| Volume skeleton | Volume count / span is unreasonable | Volume planning entry | Adjust the volume skeleton | If it affects chapter span, rerun the beat sheet. |
| Beat sheet | Pacing beats do not cover enough | Task Center, volume planning | Regenerate Beat sheet | If pacing goals fight volume strategy, return to volume strategy. |
| Chapter list | Chapter count is wrong or titles are scrambled | Chapter list | Regenerate Chapter list | If the beat sheet itself is wrong, return to the beat sheet first. |
| Chapter sync | Chapter tasks were not written into chapters | Task Center | Retry Chapter sync, or continue structured chapter split | Replan is rarely needed. |
| Chapter detail bundle | Some chapters have no task sheet | Task Center, Director follow-up | Continue Chapter detail bundle from the latest progress | If the chapter list is wrong, return to the chapter list. |
| Chapter execution | Prose generation failed or is empty | Task Center, chapter page | Retry, switch models, check context | If the chapter task fights the outline, replan locally. |
| Review repair | Repair failed or quality debt appeared | Chapter page, Director follow-up | Light repair, record debt, continue | When Replan required is explicit and later chapters are affected. |

## Recovering stale tasks

DirectorWorker executes commands with a lease. If the service restarts, the process exits, or there is no heartbeat for a long time, a command can become stale.

What to do:

1. Open the Task Center.
2. See whether anything says “background execution interrupted” or “waiting to recover.”
3. If the system recovers automatically, wait for the task to re-enter the queue.
4. If you need manual recovery, click the recovery entry.
5. Do not start same-range tasks at the same time.

Full-book automatic execution and Continue / Resume from checkpoint have automatic recovery attempts. After the limit, they become manual recovery.

## When a replan is the right move

A replan is a good fit when:

- the book contract, target readers, or core selling point has changed;
- world rules changed the main conflict;
- the recast affects volume goals;
- the beat sheet cannot cover the target chapter range;
- review explicitly requires Replan required.

A replan is a poor fit when:

- one chapter has local wording issues;
- a mild pacing issue can be repaired;
- the review service is temporarily unavailable;
- state sync failed but the prose is usable;
- only one character resource is waiting for confirmation.

## Retry, recover, and restart

| Action | Best for | Risk |
|---|---|---|
| Retry | The same command failed temporarily | Low. Existing artifacts are usually kept. |
| Recover | Continue after stale or a checkpoint | Medium. Confirm which progress you continue from. |
| Restart the stage | The current stage’s artifacts are not trustworthy | Medium-high. May overwrite that stage’s artifacts. |
| Replan | An upstream goal changed, or quality explicitly requires it | High. Affects the later chain. |

## Keep evidence

When you report a problem, keep:

- the current taskId;
- the current stage key;
- checkpointType;
- Task Center error text;
- the related novel and chapter;
- whether auto-approval is enabled;
- whether the app was recently restarted.

That information maps directly to the command queue, worker leases, and Auto-Director runtime.

# End-to-end production chain

This page explains the layers, tasks, and recoverable states a novel travels through from one sentence of inspiration to a ready chapter batch and then chapter execution. Read it before you try to understand Auto-Director in detail.

:::tip Recommended reading order
Start here for a map, then read [Auto-Director stage map](#/docs/auto-director-pipeline), [Chapter execution chain](#/docs/chapter-execution), and [Knowledge and RAG recall](#/docs/knowledge-and-rag). If you only want steps to follow, start with [First novel walkthrough](#/docs/first-novel-walkthrough).
:::

## Three production layers

The whole chain can be split into three layers:

| Layer | Goal | Input | Main artifacts | Common places to look |
|---|---|---|---|---|
| Inspiration layer | Turn a fuzzy idea into book-level directions you can choose | one-sentence inspiration, genre preference, reader feeling, model settings | candidate directions, title options, book-opening position | First-run guide, Creative Hub, Auto-Director direction choice |
| Auto-Director layer | Turn a book-level direction into executable novel assets | confirmed candidate, run mode, auto-approval config | novel project, book contract, story macro, world, character cast, volume strategy, beat sheet, chapter list, chapter task sheets | Director follow-up, novel page, Task Center |
| Chapter execution layer | Generate prose from chapter tasks and write state back | chapter tasks, context pack, knowledge-library recall, style assets, character state | draft, review report, repair result, quality debt, character / fact / foreshadowing write-back | chapter page, Task Center, Director follow-up |

## Layer boundaries

Keep the boundaries clear:

| Boundary | What it can do | What it should not do |
|---|---|---|
| Inspiration layer to Auto-Director layer | Create a novel project through candidate confirmation | Treat “I like this” in chat as a saved novel asset. |
| Auto-Director layer to chapter execution layer | Hand over chapter tasks at Chapter batch ready | Ask a model to write prose with no chapter task sheet. |
| Chapter execution layer to later planning | Affect the next chapter through state write-back, and replan when needed | Make you retell the previous chapter’s facts by hand every time. |

If a piece of information needs to affect later chapters, it must cross a boundary into an asset or a task record. Content that lives only in conversation context is not guaranteed for later Auto-Director and chapter execution.

## Production modes

The core Auto-Director choice is how far the system runs after you confirm a plan:

| Mode | Best for | What it produces |
|---|---|---|
| Complete director preparation first (recommended) | First book, you want to see the plan | Automatically finishes novel creation, book contract, characters, volume planning, beat sheet, and chapter task sheets. |
| Full-book autopilot | You want chapter text right after confirming a plan | Automatically finishes planning, chapter prose, review, repair, and state write-back until the target range ends or a high-risk stop is hit. |
| Run a selected range | You want to check one stretch first | Automatically runs a chosen range, for example the first N chapters or volume 1. |
| After prose: AI check and repair | You want prose to pass a quality loop | After each chapter’s prose, enter detection, review, and repairable-issue handling. |

If you are unsure, choose Complete director preparation first. If the goal is chapter text right after confirming a plan, choose Full-book autopilot and keep the model, quota, and network stable.

## Unattended path after you confirm a plan

From a user’s view, the shortest unattended path is:

1. Enter a starting idea; if you have none, choose an inspiration card.
2. Keep the default settings and choose Full-book autopilot or Complete director preparation first.
3. Click Generate the first batch of plans.
4. On Confirm book-level plan, choose one plan. If the title is weak, redo only the title group.
5. Confirm / use the plan.
6. The system creates the novel and enters the AI cockpit.
7. The AI cockpit automatically runs planning, characters, volume strategy, beat/chapter split, chapter execution, quality repair, and state write-back.

After you confirm a plan, your main job is to watch and handle exceptions. You do not need to generate story macro, characters, volume strategy, beat sheet, and chapter text one by one.

## Shortest main chain

The simplified path you see is:

1. Enter inspiration.
2. Choose a direction.
3. Prepare world and characters.
4. Split into volumes, beat sheet, and chapter tasks.
5. Execute chapters.

The real chain in code is finer. Auto-Director progress covers at least these stages:

| Stage key | Meaning | Layer | Main job |
|---|---|---|---|
| Idea alignment | Candidate seed alignment | Inspiration | Turn user inspiration, genre preference, and defaults into candidate-generation input. |
| Project framing | Project framing | Inspiration | Generate book-level framing: position, selling points, target readers, and promises. |
| Direction batch | Direction batch | Inspiration | Generate or revise several book-opening directions. |
| Title pack | Title pack | Inspiration | Generate or revise a title group for the chosen direction. |
| Create novel | Create novel | Auto-Director | After confirming a direction, create the novel project and director run state. |
| Story macro | Story macro | Auto-Director | Generate whole-book story input, conflict, structure, and long-term progression. |
| Book contract | Book contract | Auto-Director | Lock target readers, selling points, first-30-chapter promise, and writing boundaries. |
| Writing constraints | Constraint engine | Auto-Director | Write macro constraints, must-not-break rules, and progression boundaries into context. |
| World setup | World setup | Auto-Director | Create or choose this book’s world rules, stage, and faction boundaries. |
| Character setup | Character setup | Auto-Director | Generate core characters and a candidate cast. |
| Apply character cast | Apply character cast | Auto-Director | Write the passing cast into novel assets. |
| Volume strategy | Volume strategy | Auto-Director | Plan volume-level goals, progression route, and reader promises. |
| Volume skeleton | Volume skeleton | Auto-Director | Generate volume structure and what each volume roughly carries. |
| Beat sheet | Beat sheet | Auto-Director | Generate pacing beats and chapter span for the target volume. |
| Chapter list | Chapter list | Auto-Director | Split the beat sheet into a chapter list. |
| Chapter sync | Chapter sync | Auto-Director | Sync chapter execution contracts into chapter data. |
| Chapter detail bundle | Chapter detail bundle | Auto-Director | Generate chapter task sheets, scene cards, goals, and execution resources. |

Chapter batch ready is not a `DirectorProgressItemKey`. It is a checkpoint: the target chapter range is prepared and can enter prose execution.

## Where state is saved

Auto-Director is not only a chain of in-memory calls. Key state is saved to the database and task records:

| State | What is saved | Why it matters |
|---|---|---|
| `directorRunCommand` | command type, task, lease, status, payload, error | Supports queuing, worker execution, retry, and stale recovery. |
| `novelWorkflowTask` | current stage, current item, checkpoint, progress, error | Lets the Task Center and Director follow-up show the same factual status. |
| Director runtime snapshot | finished steps, artifacts, policy, events | Supports recover, takeover, runtime projection, and follow-up. |
| Novel asset tables | book contract, story macro, world, characters, volumes, chapter tasks | Later chapters and the UI can read, edit, and continue. |
| Chapter runtime package | writing context, review result, repair basis, quality information | Supports chapter repair, quality debt, and state write-back. |

## Persistence and recovery

| Recovery question | Persistence it depends on | Note |
|---|---|---|
| Progress still visible after a page refresh | `novelWorkflowTask`, runtime snapshot | The frontend is not the source of progress facts. It reads background status. |
| A task can continue after a service restart | `DirectorRunCommand` lease and stale recovery | After a lease expires, recovery logic decides automatic requeue or wait for manual recovery. |
| Continue after a character-review pause | checkpoint payload, character candidate artifacts | After you confirm, later stages continue from the checkpoint. |
| Chapter prose exists but sync failed | chapter runtime package, prose record | Retry sync first, so a rewrite does not drift facts. |
| Small issues remain after quality repair | quality-debt records | Later chapters can continue, but the issues stay visible and trackable. |

:::tip Frontend state is not the final fact
If the page disagrees with the Task Center, trust the background task status in the Task Center and Director follow-up. A page refresh, missing route parameter, or delayed notice does not mean the background task has stopped.
:::

## Cross-layer handoff

Cross-layer handoff is not one button. Artifacts and checkpoints connect the layers:

1. After a candidate direction is confirmed, the Confirm candidate command creates the novel.
2. After the novel is created, Auto-Director enters the planning chain.
3. The planning chain saves book contract, world, characters, volume strategy, and chapter tasks step by step.
4. The Chapter batch ready checkpoint means chapter tasks can run.
5. After you confirm or auto-approval authorizes it, the chapter execution chain starts writing.
6. After prose execution, chapter state, character resources, foreshadowing, and quality debt are written back into later context.

:::checkpoint What a checkpoint is for
A checkpoint is a pause boundary where you can confirm. It is not a failure. It lets you continue, adjust, retry, or replan before direction, characters, volume strategy, a chapter batch, or quality repair.
:::

## How tasks queue and run

The Auto-Director entry does not run the whole chain inside a page request. The request writes a `DirectorRunCommand`, and `DirectorWorker` executes it under a lease:

| Mechanism | What you feel | Code source |
|---|---|---|
| Command queue | After you start, the task enters a queue and you can leave the page | `DirectorCommandService` |
| Worker lease | A background worker takes the command and renews the lease | `DirectorTaskQueue` / `directorWorker` |
| ResourceGate | The same book’s same resource type has a concurrency limit, so runs do not overwrite each other | `DirectorTaskQueue` |
| High-memory reservation | Heavy tasks such as beat sheet, chapter list, and chapter detail block same-range repeats | `autoDirectorMemorySafety.ts` |
| Stale recovery | After a worker interrupt, some commands return to the queue automatically; some wait for manual recovery | `recoverStaleLeases` |

## What you can edit

| Production point | What you can usefully edit | Where to continue after the edit |
|---|---|---|
| Before candidate directions | inspiration, genre, target readers, preferences | Regenerate candidate directions. |
| After candidate directions | direction choice, title, feedback | Confirm a candidate or revise a candidate. |
| After book contract | reader promises, book-level default style, hard constraints | Continue later asset preparation from Director follow-up. |
| After character preparation | names, identity anchors, relationships, cast choices | Confirm the cast, then continue volume planning. |
| After volume strategy | volume goals, volume count, progression route | Regenerate the volume skeleton, or continue chapter split. |
| After chapter list | chapter titles, chapter count, task goals | Sync / refine chapter tasks. |
| After prose generation | local text, quality debt, repair strategy | Retry repair, record debt, or continue to the next chapter. |

Editing an upstream artifact affects the downstream. Changing the book contract may need volume planning rerun. Changing the cast may need the beat sheet rerun. Editing chapter prose usually does not need candidate directions rerun.

## Key observation points

From an empty project to a finished chapter batch, watch these nodes:

| Observation point | What it means | If it looks wrong |
|---|---|---|
| Candidate directions appear | Inspiration has become optional book-level plans | Return to the direction choice page, revise, or generate the next batch. |
| The novel appears in the list | Create novel finished | If nothing happens next, check whether the Task Center is still running. |
| Book contract can be viewed | Book-level goals are saved | If you dislike it, edit the book contract, then continue later stages. |
| Character candidates pause | The system thinks characters need confirmation | Do not skip. Confirm identity anchors and cast quality first. |
| Volume strategy ready | The whole-book progression route exists | If volume goals are off, edit volume strategy first. |
| A chapter list appears | The beat sheet became a chapter list | If count or order is wrong, return to the beat sheet. |
| Chapter task sheets finished | Chapter execution has input | You can enter prose generation. |
| Prose and write-back finished | The chapter loop ended | The next chapter can read new facts and character state. |

These observation points matter more than a progress percentage. A long chain is not about reaching 100%. It is about whether each handoff actually saved a usable artifact.

## Asset loop

The end-to-end chain is not “generate one chapter once.” Each chapter’s result should keep serving later production.

| Written-back asset | Source | Later use |
|---|---|---|
| New facts | chapter prose, state commit | Stop later chapters from contradicting events that already happened. |
| Character change | prose, character resource sync | Constrain character location, ability, relationships, and available resources. |
| World change | prose, world-state sync | Affect places, factions, and rules. |
| Foreshadowing state | review, payoff ledger | Manage setup, payoff, delay, and risk. |
| Quality debt | review, repair | Give later revision and replan a basis. |

The asset loop is also the base for RAG and style assets. The knowledge library supplies external notes. Chapter execution produces this book’s internal facts. Both enter the next chapter’s context.

## Who owns what

| Component | Owns | Does not own |
|---|---|---|
| First-run guide | Help you go from blank into book opening | Explain every internal runtime detail. |
| Creative Hub | Start, explain, and connect tasks in natural language | Replace official asset saving. |
| Auto-Director | Prepare book-level, world, character, volume, and chapter tasks | Directly edit generated prose. |
| Task Center | Show background command status and errors | Judge whether a creative plan is good. |
| Director follow-up | Explain checkpoints and recovery entries | Show every low-level log. |
| Chapter execution | Write, review, repair, and write state back | Re-decide the whole-book direction. |
| Knowledge library / RAG | Provide note recall and context extras | Override facts that already happened in this book. |

Understanding ownership reduces wrong clicks: background failure → Task Center; waiting for confirmation → Director follow-up; assets wrong → matching module; prose problem → chapter execution.

## Typical handoff examples

| Current situation | Artifacts you already have | Next step |
|---|---|---|
| Only one sentence of inspiration | user input and model config | Generate candidate directions. |
| Direction and title chosen | candidate direction, title group | Confirm the candidate and create the novel. |
| Novel created, no characters | book contract and story macro may exist | Continue world and character preparation. |
| Characters confirmed, no chapters | cast and volume strategy may exist | Enter volume skeleton, beat sheet, and chapter list. |
| Chapter task sheets finished | chapter goals, scene cards, context resources | Enter chapter execution. |
| Prose finished with a warning | prose, review report, quality debt | Continue to the next chapter and revise later. |
| Several chapters drifted from the main line | prose, quality issues, task records | Return to volume planning or chapter planning and redo. |

A handoff succeeds when the downstream can read the upstream artifact. If chapter execution can read chapter task sheets, Auto-Director truly finished chapter preparation.

If the downstream cannot read an artifact, check sync and recovery first. Do not rerun the whole chain from the start.
That saves repeated cost and keeps book-level and character assets you already confirmed.

## Where you should look

| Problem you see | Look here first | Why |
|---|---|---|
| Auto-Director stopped | Director follow-up | It shows checkpoint, pause reason, and recovery entry. |
| Background task is not moving | Task Center | It shows command queue, task status, errors, and stale recovery. |
| Chapter quality did not pass | Chapter execution chain docs + Task Center | You need to choose repair, quality debt, replan, or continue. |
| Knowledge library did not recall | Knowledge and RAG recall | Confirm index, search query, note source, and recall stage. |
| Characters / world are wrong | novel page, character library, world assets | Auto-Director artifacts can be viewed and corrected in the matching asset module. |

## When to replan

Not every problem should replan. Use this judgment:

| Situation | Recommended action |
|---|---|
| You dislike the candidate directions | Generate the next batch or revise a candidate. |
| Character names or identities are weak | Stop at character review; merge / redo characters. |
| Volume goals do not match the book contract | Redo volume strategy or volume skeleton. |
| One chapter’s pacing is weak but the prose is usable | Record quality debt or do a light repair. |
| Several chapters in a row break the book contract | Trigger a replan, or return to volume / chapter planning. |
| Prose is empty or unusable | Retry generation or switch models. Do not replan the whole book immediately. |
| State sync failed | Retry state sync. Do not rewrite prose first. |

Replan is for structural drift. It is not a substitute for local repair.

## Related depth docs

- [Auto-Director stage map](#/docs/auto-director-pipeline): stage-by-stage inputs, artifacts, checkpoints, auto-approval, and failure recovery.
- [Chapter execution chain](#/docs/chapter-execution): draft generation, review, repair, quality debt, and state write-back.
- [Knowledge and RAG recall](#/docs/knowledge-and-rag): where the knowledge library, book analysis, style, and world samples are used.
- [Recovery by phase](#/docs/recovery-by-phase): recovery entries and judgment by failed stage.

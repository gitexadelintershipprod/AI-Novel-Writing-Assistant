# Auto-Director stage map

Matching code sources:

- `server/src/services/novel/director/projections/novelDirectorProgress.ts`
- `shared/types/directorWorkflowStepCatalogData.ts`
- `server/src/services/novel/director/novelDirectorPipelineRuntime.ts`
- `server/src/services/novel/director/commands/DirectorCommandService.ts`

<!-- DIRECTOR_PROGRESS_ITEM_KEYS: candidate_seed_alignment,candidate_project_framing,candidate_direction_batch,candidate_title_pack,novel_create,book_contract,story_macro,constraint_engine,world_setup,character_setup,character_cast_apply,volume_strategy,volume_skeleton,beat_sheet,chapter_list,chapter_sync,chapter_detail_bundle -->

Auto-Director is not a five-step wizard. It is a production pipeline you can pause, recover, and auto-approve. “Direction → world → characters → chapter split → execution” is only the overview. Terms such as Volume skeleton, Beat sheet, and Apply character cast in the Task Center and Director follow-up come from a finer stage projection.

## Run modes

When you start Auto-Director you must choose a run mode. The mode decides **how far the pipeline runs after you confirm a plan**. It does not change stage order. It changes auto-approval boundaries, chapter-execution range, and which exceptions must return to you.

| Mode | Also called | Where it stops | Best for | Risk |
|---|---|---|---|---|
| Complete director preparation first (recommended) | Auto to ready | After confirming a plan, automatically create the novel and generate book contract, characters, volume planning, beat sheet, and chapter tasks, then stop at ready-to-write | First book, you want to see whether the plan is solid | Does not write prose yet. You still confirm entering chapter execution. |
| Full-book autopilot | Full-book autopilot | After confirming a plan, keep advancing planning, writing, review, and repair until target chapters finish or a stop condition is hit | You want the system to go from plan to novel output | Needs a stable model, quota, and higher tolerance |
| Run a selected range | Range auto-execution | Only automatically run a chosen range such as the whole book, the first N chapters, or volume 1 | You want to check one stretch before running the whole book | Chapters outside the range are not written automatically |
| After prose: AI check and repair | Quality-repair switch | After chapter prose, enter AI-flavor detection, review, and repairable-issue handling | You want a more complete automatic loop | Adds time and model cost |

### Full-book autopilot stop conditions

Full-book autopilot **stops on purpose** in these cases, instead of retrying forever:

- model unavailable / service unavailable / quota exhausted
- quality review requires a replan
- the repair chain fails repeatedly
- a structural data problem or a safety-policy block is detected

After a stop, state is saved in Director follow-up. You can resume from the original checkpoint after the cause is fixed.

### How to choose

- First book, you want a steadier start: choose Complete director preparation first. Let AI finish planning, characters, volumes, and chapter tasks, then decide whether to start prose.
- First book, you want the full automatic-output experience: choose Full-book autopilot and turn on After prose: AI check and repair.
- You want a short trial: choose Run a selected range, run the first N chapters or volume 1, then expand after you like the prose quality.
- Before a long unattended run, confirm model supply, quota, network, and the Task Center are stable.

You can change mode in Director follow-up’s continue Auto-Director or takeover action. Switching does not drop finished stage artifacts.

## Full automatic chain from confirmed plan to novel output

In real use, you only need one key creative choice: **which book-level plan to confirm**. After that, the system writes later steps into a background task queue, and the AI cockpit keeps advancing.

| Order | Screen you see | What you do | What the system does | Result |
|---|---|---|---|---|
| 1 | AI Auto-Director create dialog | Enter a starting idea; if you have none, click “No idea?” and choose an inspiration card | Organize inspiration, reader preference, narrative viewpoint, pacing, emotion intensity, and target chapter count | Candidate-generation input |
| 2 | Auto-Director run style | Choose Complete director preparation first or Full-book autopilot; optionally turn on After prose: AI check and repair | Save run mode, range, model, and auto-approval boundaries | Decide whether later writing starts automatically |
| 3 | Generate the first batch of plans | Click Generate the first batch of plans | Generate book-level framing, 2 complete directions, and title groups | Enter Confirm book-level plan |
| 4 | Confirm book-level plan | Compare plans, redo a title group or revise one plan if needed, then click use / confirm | Create the novel project and write candidate direction, titles, book-level goals, and run parameters | Enter the novel workspace |
| 5 | AI cockpit | You do not confirm stage by stage; you can click Continue in background or stay and watch | Automatically generate story macro, book contract, constraints, world, characters, volume strategy, volume skeleton, beat sheet, chapter list, and chapter detail | The novel is prepared until ready to write |
| 6 | Chapter execution | If you chose Full-book autopilot or authorized a range, you do not click next chapter | Generate prose from chapter tasks, review, repair, record quality debt, and write state back | Chapter prose |
| 7 | Quality loop | Handle prompts only when a high-risk issue appears | Low-risk issues auto-repair or record debt; structural issues pause for your decision | Later chapters keep reading new facts |

### What the screens correspond to

This sequence matches the real path: create an Auto-Director task, choose an inspiration card if you have no idea, generate the first batch of plans, confirm a book-level plan, then enter the AI cockpit and automatically advance through characters, volume planning, beat/chapter split, and chapter execution.

The upper half of the create dialog sets starting inspiration, model, and run style. Choosing Complete director preparation first or Full-book autopilot here decides whether prose starts automatically after you confirm a plan.

The lower half of the create dialog sets world handling, book-level framing, target length, and the generate action. After you click Generate the first batch of plans, the system enters the candidate stages.

If you do not have a clear idea, you can start from an inspiration card. The card only seeds candidate generation. It does not ask you to write a full outline first.

While candidates generate, the page shows current task progress. In the background the system finishes Idea alignment, Project framing, Direction batch, and Title pack.

Confirm book-level plan is the last creative choice you must make. After confirmation, the system creates the novel and writes later stages into the Auto-Director task chain.

After you enter the AI cockpit, you do not click generate in each module by hand. The top status and left steps show Auto-Director’s real position.

A page parked on character preparation does not mean the system stopped. If the AI cockpit shows it is working or has entered later steps, the background continues volume strategy and chapter split.

The beat-sheet stage turns volume planning into executable chapter tasks. After you choose Full-book autopilot or authorize a range, the system continues into chapter prose, review, and repair.

:::checkpoint The last creative choice you must make
Confirm book-level plan is the point from creative choice into automatic production. After confirmation, unless the model is unavailable, quota is exhausted, there is a structural quality issue, a replan risk, or you exit director mode, the system should automatically advance to the chosen mode’s target result.
:::

### Which pages you may see after confirming a plan

After you confirm a plan, the page may park on a module such as character preparation, volume strategy, or beat/chapter split. That does not mean you need to finish that module by hand. The AI cockpit top status bar and left steps are Auto-Director’s factual status:

| What the page shows | Correct reading |
|---|---|
| The page is on character preparation, the top shows volume strategy generating | The background has already passed the character stage. The page is only the module you are looking at. |
| The top shows waiting for confirmation, with Continue Auto-Director | The current checkpoint needs authorization. After you click, it continues in the chosen mode. |
| The left AI cockpit shows “AI is working” | The background task is still running. You can leave the page. |
| The progress bar shows beat/chapter split or chapter execution | The system is turning planning into chapter tasks or prose. |
| Exit director mode appears | Click it only if you want a manual workflow. On the full automatic chain, do not exit casually. |

### Output standard

For Complete director preparation first, success looks like:

- the novel project is created;
- book contract, story macro, world, characters, and volume strategy are saved;
- the first chapter batch has a beat sheet, chapter list, and chapter task sheets;
- the AI cockpit stops at ready-to-write or Chapter batch ready.

For Full-book autopilot, success also includes:

- chapter prose in the target range is generated;
- each chapter has review, a repair record, or quality debt;
- character state, facts, foreshadowing, and world changes are written back to later chapters;
- after the whole book or target range ends, the task enters completed, exportable, or ready-for-the-next-batch.

## Stage groups

| Group | Stages | Goal |
|---|---|---|
| Candidates | Idea alignment → Title pack | Generate optional book-level directions and titles from inspiration. |
| Project creation | Create novel | Turn the confirmed direction into a novel project. |
| Asset preparation | Story macro → Apply character cast | Lock book contract, story macro, world, and characters. |
| Volume planning | Volume strategy → Volume skeleton | Generate volume-level strategy and skeleton. |
| Chapter detail | Beat sheet → Chapter detail bundle | Generate beat sheet, chapter list, chapter task sheets, and execution resources. |

## Group details

### Candidate stages

The candidate stages answer “what this book is actually about.” They do not write chapters. They turn your inspiration into several optional directions, so a beginner is not asked to hand-write world, characters, and outline first.

| Stage | What you see | Where the artifact goes |
|---|---|---|
| Idea alignment | The system understands input inspiration, genre, reader feeling, and defaults | Candidate-generation context |
| Project framing | The system forms book-level position, selling points, and target-reader judgment | Candidate framing |
| Direction batch | A batch of optional book-opening directions appears | Candidate direction list |
| Title pack | The chosen direction gets a title group and a recommended title | Candidate title pack |

The core checkpoint here is Waiting for direction selection. You can choose a direction, generate the next batch, revise the whole batch, revise one item, or redo titles only. The system enters book creation only after a candidate is confirmed.

### Project-creation stage

Create novel turns the confirmed candidate direction into a real novel project. It creates the novel record, director task state, run snapshot, and the base payload later pipeline stages need.

Failure here is usually a runtime or persistence problem, not a creative-judgment problem. Read the Task Center error first, then retry Confirm candidate or recover the current command.

### Asset-preparation stages

Asset preparation turns “what I want to write” into notes every later chapter can read.

| Stage | Problem it solves | Where to view / revise |
|---|---|---|
| Story macro | Whole-book long-term conflict, progression loop, main-line structure | Novel planning, story macro |
| Book contract | Target readers, selling points, first-30-chapter promise, hard constraints | Novel basics, book-level default style |
| Writing constraints | Turn the book contract into a constraint summary later stages can use | Director follow-up, run state |
| World setup | This book’s world rules, places, factions, stage boundaries | World assets, novel notes |
| Character setup | Generate character candidates and a draft cast | Character candidates, Director follow-up |
| Apply character cast | Write the passing cast into official assets | Character page, character relationships |

The character stage is an important quality gate. If names still look like “mentor heroine” or “villain boss,” or identity anchors are missing, the system should stop at Waiting for character confirmation instead of carrying a weak cast into volume planning.

### Volume-planning stages

Volume planning answers “how the whole book advances by volume.” It does not write chapter prose. It first sets each volume’s reader promise, main conflict, stage goal, and structural load.

| Stage | Artifact | Risk |
|---|---|---|
| Volume strategy | Volume split strategy, volume-level goals, progression route | Scattered volume goals make later chapters lose a main line. |
| Volume skeleton | Volume list, each volume’s task, key promises | A wrong volume skeleton amplifies into beat sheet and chapter list. |

If volume strategy is wrong, handle it at the volume-planning entry. Do not only edit chapter titles. Chapter titles are a downstream result and cannot fix an upstream volume mission.

### Chapter-detail stages

Chapter detail splits volume planning into executable chapter tasks. It is the handoff layer between Auto-Director and prose execution.

| Stage | Artifact | Condition for the next step |
|---|---|---|
| Beat sheet | Pacing beats, chapter span, conflict advance | Beats cover the target chapter range. |
| Chapter list | Chapter titles, order, basic goals | Chapter count matches volume goals. |
| Chapter sync | Chapter execution contracts synced into chapter records | Chapter data can be read by the chapter page. |
| Chapter detail bundle | Chapter task sheets, scene cards, goals, execution resources | Chapter batch ready checkpoint. |

This group is high-memory work. Starting the same book’s same-range chapter-split task twice makes it hard to tell which run wrote the final result. If a task is already queued or running, check the Task Center first.

## Stage table

| Stage key | Name | Input | Artifact | Checkpoint | Auto-approval | First action after failure |
|---|---|---|---|---|---|---|
| Idea alignment | Candidate seed alignment | user inspiration, genre preference, target chapter count, model config | candidate-generation input | none | not involved | Change inspiration or model, then regenerate candidates. |
| Project framing | Project framing | aligned seed, user goal | book-level framing, position, selling points, target readers | none | not involved | Add goals in Creative Hub, or regenerate directions. |
| Direction batch | Direction batch | framing, candidate-generation prompt, previous-batch feedback | candidate direction batch | Waiting for direction selection | Direction confirmed can authorize continue after confirm | Generate the next batch, revise all candidates, or patch one item. |
| Title pack | Title pack | chosen candidate, title feedback | title group, recommended title | Waiting for direction selection | Direction confirmed | Redo titles only, or confirm the candidate and enter book creation. |
| Create novel | Create novel project | confirmed candidate, run mode, auto-approval config | novel project, task seed, runtime snapshot | none | Enter after confirming a candidate | If creation fails, read the Task Center error first. Retry is usually enough. |
| Story macro | Story macro | candidate direction, novel basics | story-macro plan, conflict, long-term progression | none | Low-risk auto-continue | Retry if direction is missing or the model failed; if the result is weak, adjust it in the story-macro module. |
| Book contract | Book contract | story macro, candidate direction | target readers, selling points, first-30-chapter promise, hard constraints | Book contract ready | Currently not bound to an auto-approval point | You can view and revise book-level default style and promises. |
| Writing constraints | Constraint engine | book contract, story macro, world / character boundaries | constraint summary later chapters must obey | none | Continues with the planning chain | If constraints are too narrow, adjust the book contract or story macro first. |
| World setup | World setup | book contract, story macro, world mode | this book’s world skeleton, rules, factions, places | none | Low-risk auto-continue | Skip when world mode is skip; on failure, retry from the world module or Director follow-up. |
| Character setup | Character setup | book contract, story macro, world | character candidates, draft cast | Waiting for character confirmation | Character setup ready can authorize continue after pass | Review candidates, merge / confirm characters, regenerate the cast if needed. |
| Apply character cast | Apply character cast | passing character candidates | official characters, relationships, cast state | Waiting for character confirmation, or cleared after pass | Character setup ready | If character quality is not enough, stop at character review. Do not continue volume planning. |
| Volume strategy | Volume strategy | book contract, story macro, character cast | volume-split strategy, progression route, volume goals | Volume strategy ready | Volume strategy ready | Edit volume strategy, or regenerate volume planning. |
| Volume skeleton | Volume skeleton | volume strategy, character and world assets | volume list, each volume’s task, main promises | Volume strategy ready | Volume strategy ready | If volume count or structure is a poor fit, redo it from the volume-planning entry. |
| Beat sheet | Beat sheet | volume strategy, volume skeleton, chapter range | target-volume pacing beats, chapter span | none | Continue after structured chapter-split authorization | If span conflicts, regenerate the beat sheet. Do not jump to chapter detail. |
| Chapter list | Chapter list | beat sheet, volume strategy | chapter titles, order, basic goals | none | Continue after structured chapter-split authorization | If the list does not cover the target chapter count, fix the beat sheet, then redo the list. |
| Chapter sync | Chapter sync | chapter list, chapter-task data | chapter execution contracts synced into chapter records | Chapter batch ready | Structured outline ready | Sync failure can usually retry; if chapter data is scrambled, return to the chapter list and check. |
| Chapter detail bundle | Chapter detail bundle | chapter list, volume window, character / world assets | chapter task sheets, scene cards, goals, execution resources | Chapter batch ready | Structured outline ready | An interrupt can continue from the latest chapter; on repeated failure, check chapter range and high-memory limits. |

## Where to see stage artifacts

| Artifact | Main source stage | User entry | Note |
|---|---|---|---|
| Book-opening direction | Direction batch | Direction choice page, Creative Hub | Used to decide whether to create a book. |
| Title group | Title pack | Direction choice page | You can redo titles without redoing the whole direction batch. |
| Novel project | Create novel | Novels, novel workspace | The container for later asset preparation. |
| Book contract | Book contract | Novel basics, Director follow-up | Reader promises and boundaries later chapters should obey. |
| Story macro | Story macro | Novel planning | Defines long-term conflict, progression loop, and main structure. |
| Constraint summary | Writing constraints | Director follow-up, run state | Gives later AI calls a hard boundary. |
| World assets | World setup | World assets, this novel’s world | Affects scenes, rules, and faction relationships. |
| Character cast | Character setup / Apply character cast | Character page, character candidates | After pass, they become official character assets. |
| Volume strategy | Volume strategy | Volume planning | Decides each volume’s goal and promise. |
| Volume skeleton | Volume skeleton | Volume planning | Connects volume goals to chapter split. |
| Beat sheet | Beat sheet | Chapter planning, Director follow-up | Defines pacing beats in the target range. |
| Chapter list | Chapter list | Chapter list | Titles, order, and basic chapter goals. |
| Chapter task sheets | Chapter detail bundle | Chapter page, chapter execution entry | Direct input for chapter writing. |

:::tip Artifacts should land in modules
Auto-Director results should not live only in chat or task logs. Information that needs to last should land in novel notes, characters, world, volume planning, chapter tasks, the knowledge library, or style assets.
:::

## Checkpoint list

| Checkpoint | Meaning | Typical trigger | Your action | Auto-approval point |
|---|---|---|---|---|
| Waiting for direction selection | Waiting to confirm a book-level direction | Candidate directions or titles finished generating | Choose a direction, revise a candidate, redo titles | Direction confirmed |
| Book contract ready | Book-level planning is ready | Book contract finished generating | View / adjust book-level promises | none |
| Waiting for character confirmation | Character preparation needs confirmation | Character-candidate quality needs your confirmation | Confirm, merge, or redo the cast | Character setup ready |
| Volume strategy ready | Volume strategy is ready | Volume strategy and volume skeleton finished | Confirm, then enter beat/chapter split | Volume strategy ready |
| Chapter batch ready | Chapter execution can continue | Beat sheet, chapter list, and chapter detail finished | Enter chapter execution, or continue automatic writing | Structured outline ready |
| Replan required | Quality repair needs handling | Chapter quality repair or replan judgment | Read the repair reason, then replan or continue | Continue after replan / Continue after low-risk repair |
| Workflow completed | The director main flow finished | A batch or whole-book execution ended | Review results and later tasks | none |
| Rewrite snapshot created | A pre-rewrite backup exists | Before rewrite / regenerate | Confirm cleanup or cancel | Rewrite cleanup confirmed |

:::checkpoint Human confirmation and automatic confirmation
Auto-approval is not “skip quality no matter what.” It only takes effect at configured approval points. High-risk points such as replan and rewrite cleanup should stay carefully authorized.
:::

## Auto-approval risk layers

Auto-approval’s value is lowering repeated confirmation cost. It should not hide creative risks that need your judgment.

| Risk layer | Approval points | Good for automatic pass? | Why |
|---|---|---|---|
| Low-risk planning continue | Direction confirmed, Character setup ready, Volume strategy ready, Structured outline ready | You can turn these on | You already confirmed the main direction. The system continues to the next stage. |
| Medium-risk chapter continue | Continue chapter execution, Continue after low-risk repair | Good for small batches | Affects prose quality, but usually does not change whole-book structure. |
| High-risk structure handling | Continue after replan, Rewrite cleanup confirmed | Keep a human confirmation by default | May change later structure, overwrite prose, or clean old artifacts. |

Beginners are better served by automatically passing low-risk planning points, so the system can finish continuous preparation from book opening to a chapter batch. Keep confirmation on high-risk points, so you are not surprised by a structure redo.

## How the command queue carries stages

Your actions enter the `DirectorRunCommand` queue. Common commands include:

| commandType | Role | Typical source |
|---|---|---|
| Generate candidates | Generate the first batch of candidate directions | First-run guide, Creative Hub |
| Refine candidates | Revise a candidate batch from feedback | Direction choice page |
| Patch candidate | Targeted fix for one candidate | Direction choice page |
| Refine titles | Redo the candidate title group | Title feedback |
| Confirm candidate | Confirm a candidate and create the novel | Direction choice page |
| Continue | Continue from the current task | Director follow-up, Task Center |
| Resume from checkpoint | Recover from a checkpoint | Director follow-up |
| Retry | Retry a failed command | Task Center |
| Takeover | Take over an existing novel | Novel workspace |
| Approve gate | Approve the current gate | Director follow-up |
| Repair chapter titles | Repair chapter titles | Chapter-title repair |

`DirectorWorker` leases commands, renews leases, executes, completes, or fails. `ResourceGate` limits concurrency by novel and resource type. For example planner, writer, repair, and state_resolution default to 2 slots each. Beat sheet, chapter list, and chapter detail also use high-memory reservation. The same book and same range usually allow only one high-memory task.

## How stages relate to commands

A stage is the progress projection you understand. A command is the background execution unit. One command may advance several stages. One stage may also be reached by several commands because of retry or recovery.

| What you do | Typical command | Stages it may advance |
|---|---|---|
| Enter inspiration and generate directions | Generate candidates | Idea alignment, Project framing, Direction batch, Title pack |
| Give feedback on candidate directions | Refine candidates / Patch candidate | Direction batch, Title pack |
| Change titles only | Refine titles | Title pack |
| Confirm a candidate and create a book | Confirm candidate | Create novel, Story macro, Book contract, later planning stages |
| Continue from a pause | Resume from checkpoint | Stages after the current checkpoint |
| Continue Auto-Director | Continue | Current unfinished stage through the next checkpoint |
| Retry a failed task | Retry | The stage the failed command owns |
| Take over an existing project | Takeover | Derive a continuable stage from existing assets |
| Approve a gate | Approve gate | Stages after the gate, or chapter execution |

When diagnosing, do not look at the stage name alone. Also look at command type and error in the Task Center. A stage that says “stuck at beat_sheet” may actually come from a model, resource-limit, or persistence-sync error.

## How to read progress projection

The progress in Director follow-up is not a raw background log. It is a user view projected from run state.

| Projection | Meaning | Value to you |
|---|---|---|
| Current stage | The `DirectorProgressItemKey` that most needs attention | Know whether you are stuck at candidates, characters, volume planning, or chapter split. |
| Finished stages | Stages that already have artifacts usable as later input | Avoid rerunning finished stages. |
| Current checkpoint | Whether it is waiting for confirmation, continue, repair, or replan | Decide Director follow-up vs Task Center. |
| Follow-up | Pause reminder and next-step entry | Keep you from wondering why a task stopped. |
| Task status | queued / running / failed / stale in the Task Center | Judge whether the background is still running. |

If projection says a stage finished, but the matching module has no artifact, check the sync stage and Task Center error first. If the module already has an artifact, but projection is still on an old stage, check whether the task is stale or whether the frontend refreshed to the latest task.

## Stage events and your actions

| Stage event | Your action | Result |
|---|---|---|
| Candidate batch finished generating | Choose a direction, revise a candidate, generate the next batch | Stay in candidate stages, or enter book creation. |
| Title group finished generating | Choose a title, redo titles, confirm a candidate | Enter Create novel. |
| Book contract ready | Review reader promises and first-30-chapter goals | Continue world and character preparation. |
| Character preparation paused | Confirm, merge, or redo the cast | Write official characters, or return to character setup. |
| Volume strategy ready | Confirm volume goals and volume-split route | Enter volume skeleton and beat/chapter split. |
| Chapter batch ready | Execute chapters, or authorize automatic writing | Enter the chapter execution chain. |
| Low-risk repair can continue | Accept repair, or record quality debt | Keep the prose and continue later chapters. |
| A replan suggestion appears | Read the reason and decide whether to replan | Return to the matching upstream planning point. |

These events should make the next step clear, not only show a code stage name. Public docs and UI copy should say what you can do.

## Failure-retry principles

| Failure location | Recommended recovery | Avoid |
|---|---|---|
| Candidate generation failed | Adjust model or input, then retry the candidate command | Delete novel data. |
| Character cast rejected | Confirm / merge / redo on the character candidate page | Force volume planning. |
| Volume strategy is not acceptable | Redo volume strategy, or adjust the book contract | Edit the chapter list to bypass volume goals. |
| Beat-sheet span conflict | Regenerate the beat sheet | Only rerun chapter detail. |
| Chapter detail interrupted | Recover the stale command in the Task Center, or continue from Director follow-up | Start several same-range high-memory tasks. |
| Paused after Chapter batch ready | Confirm entering chapter execution, or turn on auto-approval | Treat the pause as a failure. |
| Replan required | Read the quality-repair reason, then decide replan or continue | Promote every local quality debt into a global replan. |

## Recovery by group

| Group | Common stall | Recommended entry | Judgment |
|---|---|---|---|
| Candidates | No satisfying direction, title is a poor fit, candidates are too scattered | Direction choice page, Creative Hub | Revise candidates or titles first. Reopen only if positioning is wrong. |
| Project creation | After confirm, no novel was created | Task Center | See whether Confirm candidate is failed / stale. |
| Asset preparation | Book contract, world, or character quality is unstable | Director follow-up, matching asset page | Fix locally when you can. Stop first if character quality does not pass. |
| Volume planning | Volume goals are unclear, volume count is a poor fit | Volume planning, Director follow-up | Return to volume strategy. Do not only edit downstream chapter titles. |
| Chapter detail | Beat-sheet conflict, list count is wrong, sync failed | Task Center, chapter planning | Recover / retry the high-memory task first, then decide whether to redo the beat sheet. |
| Chapter execution | Review did not pass, repair failed, quality debt | Chapter page, chapter execution chain | Record local issues as debt and continue. Replan only for structural issues. |

:::warn Do not promote a local issue into a global stop
Local quality debt from chapter review, a repairable obligation gap, or a low-risk repair failure should not automatically block whole-book Auto-Director. Stop the global chain only for an explicit Replan required, unusable prose, a runtime safety issue, or a data-integrity issue.
:::

## Related modules

| Module | Owns | Relation to stages |
|---|---|---|
| Creative Hub | Query status, diagnose problems, explain execution records, recommend formal entries | Does not run create, generate, write, recover, or director commands. |
| Director follow-up | Show checkpoint, pause reason, and next action | First entry for waiting approval. |
| Task Center | Show background commands, queue, errors, stale, and recovery | First entry for failed / running / queued. |
| Novel basics | View and revise book-level information and default style | Receives Book contract and project basics. |
| World assets | View this book’s world, places, factions, and rules | Receives World setup. |
| Character page | View, confirm, and revise character assets | Receives Character setup and Apply character cast. |
| Volume planning / chapter page | View volume strategy, beat sheet, chapter list, and task sheets | Receives `volume_*`, Beat sheet, `chapter_*`. |

## Documentation check when a stage is added

Adding an Auto-Director stage is not only a backend type change. Also check:

| Check | What to update |
|---|---|
| Stage key | The `DIRECTOR_PROGRESS_ITEM_KEYS` marker at the top of this page. |
| Stage table | Name, input, artifact, checkpoint, auto-approval, and failure recovery. |
| Group details | Whether it belongs to candidates, project creation, asset preparation, volume planning, or chapter detail. |
| Artifact entry | If there is a new artifact, say where you view or revise it. |
| Recovery guide | If there is a new failure mode, add it to [Recovery by phase](#/docs/recovery-by-phase). |
| UI copy | Avoid showing only a new code term. Tell the user the next action. |
| Check script | `pnpm check:docs-manifest` should still cover every stage. |

When you add a checkpoint or auto-approval point, also update [Director follow-up](#/docs/module-director-follow-up) and related Task Center notes.

Stage docs should help you recover a task, and help maintainers know which public explanations a new stage affects.
After a stage-projection change, confirm that user entries, recovery entries, and public terms still match.

## Common misunderstandings

| Misunderstanding | Correct reading |
|---|---|
| “Direction, world, characters, chapter split, execution” are all the stages | That is the simplified user view. The real projection covers at least 17 progress keys. |
| Chapter batch ready is a stage | It is a checkpoint meaning a chapter batch can enter execution. |
| `waiting approval` is a failure | Most of the time it is waiting for you to confirm a direction, cast, volume plan, chapter batch, or quality strategy. |
| Auto-approval skips every review | It only continues at configured approval points. High-risk points should still keep confirmation. |
| Task Center showing stale means the result is lost | Stale only means the worker lease expired. You may still recover from the command or checkpoint. |
| The character stage can be skipped | Character quality affects volume planning and chapter execution. Stop and confirm when quality does not pass. |
| If the beat sheet fails, rerunning chapter detail is enough | The beat sheet is upstream of chapter list and detail. Fix span conflicts on the beat sheet first. |
| Local quality debt must replan | Usable prose plus local issues should record debt and continue, unless Replan required is explicit. |

## Reading advice

| Goal | Read |
|---|---|
| You want to know what happens from inspiration to ready-to-write | [End-to-end production chain](#/docs/end-to-end-production) |
| You saw an unfamiliar stage key | This page’s stage table and UI term map |
| You do not know where to click after a pause | [Director follow-up](#/docs/module-director-follow-up) and [Recovery by phase](#/docs/recovery-by-phase) |
| A background task is failed / stale | [Task Center](#/docs/module-task-center) |
| Chapter review or repair is stuck | [Chapter execution chain](#/docs/chapter-execution) |
| The knowledge library missed | [Knowledge and RAG recall](#/docs/knowledge-and-rag) |

## UI term map

| Code term | User-facing wording |
|---|---|
| Direction batch | A batch of book-opening directions |
| Title pack | Book-title options |
| Apply character cast | Write the character cast into the project |
| Volume skeleton | Volume-level skeleton |
| Beat sheet | In-volume beat sheet |
| Chapter sync | Sync chapter execution contracts |
| Chapter detail bundle | Refine chapter task sheets |
| Chapter batch ready | This chapter batch can start writing |
| Replan required | Repair or replan needs handling |

## Maintenance rule

If code adds a `DirectorProgressItemKey`, the `DIRECTOR_PROGRESS_ITEM_KEYS` list at the top of this page must stay in sync. Site validation reads code and docs, and fails when a stage is missing.

## Technical alias map

This document uses beginner-friendly English names. The table below lists matching internal keys for logs, APIs, and source code.

| Name | Internal key |
|---|---|
| Idea alignment | `candidate_seed_alignment` |
| Project framing | `candidate_project_framing` |
| Direction batch | `candidate_direction_batch` |
| Title pack | `candidate_title_pack` |
| Waiting for direction selection | `candidate_selection_required` |
| Direction confirmed | `candidate_direction_confirmed` |
| Confirm candidate | `confirm_candidate` |
| Generate candidates | `generate_candidates` |
| Refine candidates | `refine_candidates` |
| Refine titles | `refine_titles` |
| Patch candidate | `patch_candidate` |
| Create novel | `novel_create` |
| Book contract / Book contract ready | `book_contract` / `book_contract_ready` |
| Story macro | `story_macro` |
| Writing constraints | `constraint_engine` |
| World setup | `world_setup` |
| Character setup | `character_setup` |
| Waiting for character confirmation / Character setup ready | `character_setup_required` / `character_setup_ready` |
| Apply character cast | `character_cast_apply` |
| Character resource sync | `character_resource_sync` |
| Volume strategy / Volume strategy ready | `volume_strategy` / `volume_strategy_ready` |
| Volume skeleton | `volume_skeleton` |
| Beat sheet | `beat_sheet` |
| Chapter list | `chapter_list` |
| Chapter sync | `chapter_sync` |
| Chapter detail bundle | `chapter_detail_bundle` |
| Chapter batch ready | `chapter_batch_ready` |
| Structured outline ready | `structured_outline_ready` |
| Chapter execution / Continue chapter execution | `chapter_execution` / `chapter_execution_continue` |
| Chapter quality review | `chapter_quality_review` |
| Chapter repair | `chapter_repair` |
| Chapter state write-back | `chapter_state_commit` |
| Quality repair / Continue after low-risk repair | `quality_repair` / `low_risk_quality_repair_continue` |
| Repair chapter titles | `repair_chapter_titles` |
| Rewrite snapshot created / Rewrite cleanup confirmed | `rewrite_snapshot_created` / `rewrite_cleanup_confirmed` |
| Payoff ledger sync | `payoff_ledger_sync` |
| Approve gate | `approve_gate` |
| Takeover | `takeover` |
| Resume from checkpoint | `resume_from_checkpoint` |
| Retry / Continue | `retry` / `continue` |
| Replan required / Continue after replan | `replan_required` / `replan_continue` |
| Workflow completed | `workflow_completed` |

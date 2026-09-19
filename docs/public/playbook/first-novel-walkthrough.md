# First novel walkthrough

This is a hands-on path from an empty project to a confirmed plan, then to AI-produced novel content. Each step names the matching Auto-Director stage, where the result is saved, and where to look if it pauses.

## Path overview

| Step | What you do | Matching stage | Where the result is saved | If it pauses, look here first |
|---|---|---|---|---|
| 1 | Configure a model | System setup | Settings, Model routing | Settings |
| 2 | Enter inspiration or choose an inspiration card | Idea alignment | Auto-Director task | Task Center |
| 3 | Generate and choose a full-book direction | Direction batch | Candidate direction batch | First-run guide, direction choice page |
| 4 | Confirm a plan / title | Title pack | Candidate direction, title group | Direction choice page |
| 5 | Create the novel | Create novel | Novel project | Novels |
| 6 | AI generates planning assets | Story macro / Book contract / World setup / Character setup | Story macro, book contract, world, characters | AI cockpit, Director follow-up |
| 7 | AI generates volume and chapter tasks | Volume strategy / Beat sheet / Chapter detail bundle | Volume strategy, beat sheet, chapter task sheets | AI cockpit, Task Center |
| 8 | Choose a production style and start prose | Production-style handoff / Chapter execution | Production experience, draft, review and repair results | First-run guide, chapter bookshelf or workspace |
| 9 | Review the novel output | Completed or range completed | Chapter text, quality debt, export entry | Chapter page, export |

## Step 1: Configure a model

Open Settings and configure a default model. On first use you only need one working model. DeepSeek users can choose `deepseek-v4-flash` for long-form quality and response speed.

Confirm:

- the API key is valid;
- the Base URL is correct;
- the default model can return usable text;
- the Task Center is not cluttered by old failed tasks.

If the model cannot connect, start with [FAQ](#/docs/faq) and [Troubleshooting](#/docs/troubleshooting).

## Step 1.5: Finish quick setup

If this is your first time in the product and no model is available, finish quick setup first. Choose a provider, fill in the API key / API address and a text model. The system tests ordinary text and structured output, then prepares all core writing tasks.

You do not choose a chapter-execution range when you start Auto-Director. Auto-Director always advances to “ready to write,” then lets you choose simple creation or professional creation.

## Step 2: Enter inspiration

Open the First-run guide or Creative Hub and enter one sentence of inspiration. Do not hand-write a full outline. Let Auto-Director generate directions first.

Example:

> A new writer enters an idea market looking for forgotten stories.

Matching stages: Idea alignment, Project framing.

Result: an Auto-Director task and candidate-generation input.

## Step 3: Generate a direction batch

After you click “Generate the first batch of plans,” the system enters Direction batch and generates candidate directions. You will see different positioning, selling points, protagonist paths, conflicts, and progression loops.

When choosing, look at:

- which direction is easiest to sustain for many chapters;
- whether the protagonist goal is clear;
- whether the selling point fits the target reader;
- whether the conflict can keep escalating.

If none of them fit, generate the next batch or revise a candidate.

## Step 4: Confirm direction and title

The title group belongs to Title pack. The title does not have to be final, but it should represent the current direction. This is the last creative choice you must make: **which book-level plan to use to create the novel**.

Optional actions:

- click “Use this” on a plan;
- redo only the title group;
- give feedback and let AI revise one plan;
- switch to another candidate-direction batch.

After confirmation, the system enters Create novel and continues planning, characters, and volume/chapter preparation. Chapter text does not start yet.

## Step 5: Create the novel

After you confirm a candidate, the system creates the novel project and keeps showing book-opening progress in the current Auto-Director session.

From here you do not need to generate story macro, characters, volume strategy, beat sheet, and chapter text in order by hand. The AI cockpit queues those background commands and shows the current step, task number, progress bar, and latest checkpoint at the top.

If creation fails:

1. Open the Task Center.
2. Check the Confirm candidate command error.
3. If it is a temporary error, retry.
4. If it is a data error, keep the error text and report it.

## Step 6: AI generates story macro and book contract

Auto-Director generates Story macro and Book contract.

Results include:

- whole-book story position;
- core conflict;
- progression loop;
- target readers;
- first-30-chapter promise;
- narrative boundaries and hard constraints.

Where to look: novel basics, story macro, Director follow-up.

## Step 7: AI prepares world and characters

World setup prepares this book’s world. Character setup generates character candidates.

The full automatic chain prefers a usable cast from the plan and book contract. The page may stay on character preparation, but if the top task status shows volume strategy or chapter split, the background has already continued.

Character confirmation should wait only when quality is clearly unstable and you need to decide. That is not a failure. It is asking you to confirm the cast.

What to do:

- confirm suitable characters;
- merge duplicate candidates;
- send the cast back to be redone;
- adjust character identity anchors.

Do not force volume planning if the characters are clearly not good enough.

## Step 8: AI applies the character cast

After character confirmation, Apply character cast writes characters into official assets. Later chapter execution reads those character states.

Where to look: Character library, this book’s character page, Director follow-up.

## Step 9: AI generates volume strategy and volume skeleton

Volume strategy generates the volume-level route. Volume skeleton generates the volume skeleton.

Volume strategy is a book-opening resource and does not need item-by-item confirmation. You can watch progress or let the task continue in the background. Only a runtime-safety or data risk asks you to step in.

When you look, focus on:

- whether volume 1’s goal is clear;
- whether each volume’s promise is different;
- whether the protagonist’s growth has steps;
- whether foreshadowing and reader expectation can last.

If volume planning is wrong, fix volume strategy first. Do not jump to editing the later chapter list.

## Step 10: AI generates beat sheet, chapter list, and chapter detail

Structured chapter split includes:

- Beat sheet: generate in-volume pacing beats.
- Chapter list: split out the chapter list.
- Chapter sync: sync chapter execution contracts.
- Chapter detail bundle: refine chapter task sheets and execution resources.

These stages are high-memory tasks. The same book and same range usually should not start several of them at once. If you see “an Auto-Director task is already handling the same range,” check the running task in the Task Center first.

## Step 11: Choose how chapter text is produced

Chapter batch ready means the chapter batch is prepared.

The system stops before prose starts and lets you choose:

- Simple creation: enter a read-only chapter bookshelf. AI keeps finishing the whole book.
- Professional creation: enter the full workspace and inspect or arrange chapter production yourself.

After simple creation, the system continues:

1. generate prose from chapter tasks;
2. review the prose;
3. repair issues that can be repaired;
4. record quality debt;
5. write back character state, facts, and foreshadowing;
6. continue to the next chapter until the target range finishes or a high-risk stop is hit.

After chapter 1 is generated, look at the prose, review issues, repair result, and quality debt. If the prose is usable but has local problems, you can continue later chapters and handle quality debt afterward.

## What you need to handle on the full automatic chain

| Situation | Do you need to step in? | Recommended action |
|---|---|---|
| AI cockpit shows “AI is working” | No | Stay and watch, or let it continue in the background. |
| The page is on the character page, but the top is generating volume strategy | No | Trust the top task status. Do not click generate again. |
| Model unavailable, quota exhausted, or service error | Yes | Fix the model / quota, then recover from the Task Center. |
| The system requires a replan | Yes | Read the reason in Director follow-up, then decide replan or continue. |
| Chapter text is usable but has quality debt | Usually not immediately | Let production continue, then handle quality debt later. |
| You want to switch to manual mode | Yes | Before exiting director mode, confirm the current background task has stopped or finished. |

## Common pauses

| Pause | Meaning | Next step |
|---|---|---|
| Waiting for direction selection | Waiting for you to choose a direction | Choose, revise, or redo candidates. |
| Waiting for character confirmation | Waiting for you to confirm characters | Confirm / merge / redo the cast. |
| Volume strategy ready | Volume strategy finished | Confirm, then enter chapter split. |
| Chapter batch ready | Chapters are prepared | Enter chapter execution. |
| Replan required | Quality repair may affect later chapters | Read the reason, then decide replan or continue. |

## Done when

A first walkthrough is complete when:

- a novel project exists;
- book contract and story macro exist;
- world and character assets can be viewed;
- volume strategy, beat sheet, and chapter list exist;
- at least chapter 1 has a chapter task sheet;
- chapter 1 prose was generated and entered review / repair results.

If you chose simple creation, later completion also includes:

- chapter text keeps being produced in the target range;
- each chapter has review, repair, or quality-debt records;
- after state write-back, the next chapter can read the previous chapter’s new facts;
- the Task Center shows the target range complete, or the AI cockpit enters a finished-flow state.

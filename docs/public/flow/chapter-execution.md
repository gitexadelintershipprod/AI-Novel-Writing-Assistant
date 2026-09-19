# Chapter execution chain

The chapter execution chain turns prepared chapter tasks into prose, then writes the new state from that prose into later chapters. It is not only “write one chapter.” It is a loop of draft generation, review, repair, quality debt, and state sync.

## Execution entries

Chapter execution usually starts from two entries:

| Entry | Trigger | Note |
|---|---|---|
| Auto-Director Chapter batch ready | Beat sheet, chapter list, and chapter detail finished | After you confirm or auto-approval, enter chapter execution. |
| Manual chapter execution | You start it on the chapter page or in the Task Center | Good for rerunning one chapter, testing a model, or handling a local chapter. |

Execution needs a chapter task. The task comes from Chapter detail bundle and usually includes chapter goal, continuation from the previous chapter, setup for the next chapter, scene cards, characters, conflict, and taboos.

## What a chapter task sheet is

A chapter task sheet is the contract for chapter writing, not only a title. It usually includes:

| Content | Role |
|---|---|
| Chapter goal | What this chapter must advance. |
| Continuation from the previous chapter | Keep the opening from leaving established facts. |
| Setup for the next chapter | Make this chapter’s ending serve later pacing. |
| Scene cards | Places, conflicts, character actions, and scene order. |
| Appearing characters | Limit this chapter’s people, relationships, and available resources. |
| Must deliver / set up | Manage reader promises and the foreshadowing ledger. |
| Taboos and hard constraints | Prevent breaking the book contract, world rules, and character state. |

If the task sheet is missing or too vague, chapter-writing quality is usually unstable. Return to chapter detail first. Do not only add “write it better” in the prose box.

## Execution steps

| Step | Code stage | Input | Artifact | After failure |
|---|---|---|---|---|
| Context assembly | `GenerationContextAssembler` | chapter task, book contract, characters, world, RAG, style, fact ledger | `GenerationContextPackage` | If key assets are missing, return to Director follow-up or the novel page and fill notes. |
| Draft generation | Chapter execution / writer | context pack, model routing, chapter goal | draft | Empty prose retries once; repeated failure, check the model and task input. |
| Review | Chapter quality review | draft, chapter task, context pack | audit report, open issues, acceptance status | If acceptance says unusable, you can record quality debt. |
| Repair | Chapter repair / Quality repair | draft, review issues, repair context | repaired prose, repair record | Low-risk issues can auto-repair; replan risk enters a checkpoint. |
| State commit | Chapter state write-back | final prose, review result | continuity state, character state | Commit failure needs state-sync retry. Rewriting prose is not always required. |
| Foreshadowing sync | Payoff ledger sync | prose, review, reader promises | foreshadowing, promises, payoff state | After failure, retry sync. |
| Character resource sync | Character resource sync | prose, character governance state | character resources, items, relationship changes | High-risk resources wait for confirmation. |

## What is in the context pack

Chapter-writing context gathers several sources:

- Book contract: genre, target readers, selling points, first-30-chapter promise, hard constraints.
- Story macro: core conflict, progression loop, long-term structure.
- Volume window: current volume mission, chapter position, pacing instruction.
- Character state: current goals, location, relationships, abilities, availability.
- World slice: world rules, places, and faction boundaries related to this chapter.
- Fact ledger: irreversible facts that already happened.
- Foreshadowing ledger: promises this chapter should set up, touch lightly, pressure, or not reveal.
- Style assets: bound style profile, style rules, Anti-AI rules.
- RAG recall: knowledge-library / book-analysis / note fragments related to this chapter task.

:::tip Why a chapter cannot rely on a prompt alone
Later chapters of a long novel depend on facts that already happened, character resources, reader promises, and world constraints. The chapter execution chain assembles those into a context pack, so each chapter is not only a temporary prompt.
:::

## Checks before generation

Before starting chapter execution, the system and you should watch these conditions:

| Check | Why it matters | If it is wrong |
|---|---|---|
| A chapter task exists | Without a task sheet, the prose goal is unstable | Return to Auto-Director chapter detail. |
| A book contract exists | Reader promises and hard constraints are missing | Return to book contract or novel basics. |
| Character state is readable | Character behavior needs boundaries | Confirm character assets on the character page. |
| World rules are readable | Scenes and rules need consistency | Fill key rules in world assets. |
| Model routing is available | Writing, review, and repair may bind different models | Fix it in Model routing or Settings. |
| Knowledge-library indexing finished | External notes need to be indexed first | Check index status in the knowledge library. |

These checks do not ask you to fill every note by hand. They help locate a failure. Assets Auto-Director already generated should be read by the system first.

## How batch execution advances

A chapter batch is usually not one chapter at a time in isolation. Batch execution saves state between chapters and decides whether to continue.

| Batch node | System action | What you may see |
|---|---|---|
| Batch start | Read the Chapter batch ready chapter range | Chapter tasks enter queued or running. |
| Single-chapter generation | Assemble context, generate prose, review and repair | Current chapter status changes. |
| Single-chapter close | Save prose; write back facts, characters, foreshadowing, and quality information | Chapter completes, or completes with a warning. |
| Next-chapter preparation | Read the previous chapter’s written-back state | Next chapter’s context updates. |
| Batch pause | Hits a checkpoint, failure, or needed human handling | An entry appears in Director follow-up or the Task Center. |
| Batch complete | All target chapters were processed | Continue the next batch, or review quality debt. |

If auto-approval has not authorized it, a batch may pause at some nodes and wait for confirmation. That is so you can see the risk. It is not “the background did nothing.”

## Review and repair

Review judges whether the prose meets the chapter task, continuity, character behavior, pacing, and style requirements. Repair is not an infinite loop. The current chain limits retries and records quality debt.

| Situation | Recommended handling |
|---|---|
| Mild logic or pacing issue | Allow a light repair, or record quality debt. |
| After repair it is readable but still has local issues | Record quality debt and continue later chapters. |
| Prose is unusable or empty | Retry generation; switch models if needed. |
| Chapter goal fights the outline | Return to the chapter task or beat sheet and replan. |
| Repair would change later structure | Enter Replan required and wait for your confirmation. |

## What quality debt is

Quality debt means a chapter has a visible problem, but the whole book does not necessarily need to stop. Typical examples:

- local pacing is not strong enough;
- one foreshadowing hint is too weak;
- a stretch of character tone needs later repair;
- the repairer cannot stably anchor a paragraph.

Quality debt should be recorded, shown, and followed up later. It should not default to blocking global Auto-Director. Stop the global chain only for an explicit replan, an unrecoverable generation failure, a data risk, or a safety risk.

## Quality judgment layers

| Result | Meaning | Effect on the global chain |
|---|---|---|
| accepted | The prose meets the current task | Continue to the next chapter. |
| continue_with_warning | There are issues, but the prose is usable | Record quality debt and continue later chapters. |
| local_patch_plan | A local repair is possible | Try repair; after repair, continue or record debt. |
| patchable_obligation_gap | A local promise gap can be filled | Low-risk repair or record debt. |
| draft_obligation_unmet | The chapter task was not met | Try repair first; confirm by hand if needed. |
| defer_and_continue | The issue can be handled later | Record debt clearly and continue. |
| replan_required | Later structure needs adjustment | Enter a checkpoint and wait for your confirmation. |
| stop_for_replan | Must stop and replan | Stop the global chain and return to the planning entry. |

:::checkpoint Local quality debt is not a global failure
If the chapter has usable prose, and AI/runtime did not explicitly require a replan, the system should save the prose, record debt, and let later chapters continue. That keeps one book from stalling over a single-chapter small issue.
:::

## State write-back

After chapter execution finishes, the system writes back:

| Target | Content | Effect |
|---|---|---|
| Character state | location, goals, relationships, abilities, resource changes | Later chapters’ character-behavior boundaries. |
| Fact ledger | events that happened, irreversible results | Prevent later repetition or contradiction. |
| Foreshadowing / promises | new setup, payoff, delay, risk | Help later chapters manage reader expectation. |
| World state | places, rules, faction changes | Affect scene and conflict reasonableness. |
| Review issues | open issues, quality debt | Enter later repair and task reminders. |

## How to judge write-back failure

| What you see | Likely meaning | Recommended action |
|---|---|---|
| Prose is saved, but character state did not update | Character resource sync failed | Retry character resource sync. Do not rewrite prose. |
| Foreshadowing ledger did not refresh | payoff ledger sync failed | Retry ledger sync. Keep the prose. |
| Chapter status still shows running | Background task status did not close | Check the Task Center for stale or failed. |
| Next chapter context did not carry the previous chapter’s facts | State commit did not finish | Fix state commit first, then run the next chapter. |
| Review report is missing | Review service failed or was interrupted | You can keep the prose and review later. |

Chapter prose generation and state write-back are different problems. If the prose is already usable, repair the write-back chain first.

## Failure modes

| Failure mode | What it looks like | Look here first | Recommended recovery |
|---|---|---|---|
| Context assembly failed | Error before chapter execution | Task Center error, novel assets | Fill characters / world / chapter task, then retry. |
| Empty prose | The model returned empty content | Task Center, Model routing | The system retries once; after repeated failure, switch models. |
| Review unavailable | acceptance gate unavailable | chapter page, Task Center | Keep the prose and review later. |
| Repair failed | repair ticket failed | Task Center, chapter page | Try repair again; if usable prose exists, record quality debt. |
| Replan risk | Replan required | Director follow-up | Confirm replan by hand, or accept the risk and continue. |
| State sync failed | Prose exists, but state was not written back | Task Center | Retry sync. Do not rewrite prose first. |

## Retry, rewrite, and continue

| Action | Best for | Risk |
|---|---|---|
| Retry generation | Temporary model failure, empty prose, network drop | May produce different prose and needs review again. |
| Retry review | Prose is usable but review failed | Low risk. Keep the prose. |
| Retry repair | A local issue can be repaired | Repair may change local text. |
| Retry sync | Prose is usable but state was not written back | Low risk. Prefer this. |
| Accept quality debt and continue | The issue does not block later chapters | Later tracking needs to stay visible. |
| Replan | Chapter goal fights upstream structure | Affects later chapters and planning artifacts. |
| Rewrite the chapter | Prose is unusable, or you clearly reject it | May change facts and needs write-back again. |

## How it relates to RAG

Chapter execution recalls the knowledge library, book analysis, style, and this book’s assets during context assembly. RAG notes are only part of the context. They should not override the chapter task sheet.

| Note source | Role in the chapter |
|---|---|
| Knowledge library | Fact notes, setting reference, or uploaded notes. |
| Book-analysis results | Pacing, character, selling-point, and writing experience. |
| Style engine | Language style, expression rules, and Anti-AI constraints. |
| World samples | Rules, places, factions, and atmosphere reference. |
| This book’s state | Facts, characters, and foreshadowing that must not be broken. |

If recalled notes fight this book’s state, this book’s state wins. Reference notes serve the current novel. They should not copy a reference work’s plot into the prose.

## Human intervention entries

| What you want to do | Recommended entry | Why |
|---|---|---|
| See whether prose was saved | Chapter page | Prose facts live on the chapter page. |
| See why the background stopped | Task Center | Failed, stale, queued, and running all live here. |
| Approve continue or replan | Director follow-up | The checkpoint’s next entry is here. |
| Adjust the chapter goal | Chapter task / chapter planning | Chapter writing reads the task sheet. |
| Change character state | Character page | Later chapters read official character assets. |
| Check whether notes were hit | Knowledge-library recall test | Judge whether RAG can actually hit. |
| Adjust style | Style engine | Language style should enter context from a style asset. |

Do not send every problem to a prose rewrite. Rewrite is for unusable prose. Task, asset, recall, and sync problems should return to the matching entry.

## Chapter completion states

| Status | Meaning | Next action |
|---|---|---|
| Draft generated | The model produced prose, but the review loop is not finished | Wait for review, or inspect the prose by hand. |
| Review passed | The prose meets the chapter task | Save and enter state write-back. |
| Passed after repair | The first draft had issues; after repair it is usable | Save repaired prose and the repair record. |
| Completed with quality debt | Prose is usable but later issues remain | Continue later chapters and keep the debt. |
| Waiting for replan confirmation | Review thinks later structure may be affected | Confirm in Director follow-up. |
| Sync failed | Prose may be saved, but state was not fully written back | Retry sync. Do not rewrite first. |
| Generation failed | No usable prose | Retry generation or switch models. |

Chapter status should separate “is the prose usable” from “did the chain close.” If prose is usable but sync failed, a rewrite can create a new fact fork.

## Beginner judgment

| What you see | Do this first |
|---|---|
| You do not know why this chapter was written this way | Read the chapter task sheet and context summary. |
| Character behavior is wrong | Check whether character state is stale; correct it on the character page if needed. |
| World rules are wrong | Check whether world assets are missing or in conflict. |
| The style is wrong | Check style binding and Anti-AI rules. |
| It reads like the reference work | Check RAG recall and proper-name leak review. |
| The system says a replan is needed | Read the reason first. Do not continue all remaining chapters immediately. |

The goal is to reduce blind rewrites and repair the step that actually broke.
For a beginner, locating the step is more reliable than clicking “regenerate” again and again.

## How it relates to Auto-Director

Auto-Director prepares the chapter batch. The chapter execution chain writes that batch and writes state back. After a batch finishes, auto-approval’s Continue chapter execution can let the system handle remaining chapters. Without authorization, the system waits at a checkpoint or in the Task Center for your confirmation.

# Simple creation mode

## Background

A complete novel still needs genre positioning, book-level planning, character prep, volume and chapter planning, prose generation, review, and repair. After Auto-Director finishes early prep, the real decision for a beginner is whether AI should keep producing the whole book, or whether they should enter the full workspace and control prose production themselves.

Simple creation is therefore a prose-production experience, not a novel-creation method. Manual create still uses the professional form. New-book Auto-Director and takeover of an existing project both advance to “ready to write”, then choose the production experience at the same handoff.

## Decision

- `creationExperience=simple` means the project uses the simple creation experience; `professional` means the full workspace. It is separate from `projectMode`, which still only describes the AI collaboration strategy.
- Auto-Director prep always uses `auto_to_ready`. After direction, characters, volume/chapter planning, and chapter-execution resources are ready, it writes `production_experience_required`. Prose must not start early.
- `auto_to_ready` must automatically pass ordinary character, volume, chapter-split, and system planning-recompute gates. It must not expose professional approvals before the production-experience handoff. User-protected content, data integrity, and runtime safety gates stay blocking.
- After simple creation is chosen, the original director task switches to `full_book_autopilot`, a whole-book execution range, and all auto-confirm points, then continues. Ordinary replanning, chapter quality debt, and local repair do not require beginner approval.
- After professional creation is chosen, the original director prep task completes and does not generate prose. The user enters the full workspace.
- Simple mode only changes user interaction and user write permission. It does not create a second planning, writing, review, or recovery chain.
- The simple page and the professional workspace must submit the same Auto-Director `continue` command, interpreted by the same director runtime. Simple mode must not add a dedicated production API, dedicated task type, or bypass scheduler. It only makes whole-book auto-advance the default parameters and reduces advanced information and manual operations.

### Handoff command

The production-experience command may be used only on an Auto-Director task that is already bound to a novel and stopped at `production_experience_required`. The first choice must atomically write the novel experience and the task seed. Resubmitting the same choice reuses the existing result and must not create a second task or execution chain. Submitting a different choice must be rejected.

Takeover of an existing project may choose which asset stage to start from, but it cannot skip the production handoff through the old range-execution or whole-book auto mode. Existing prose that enters simple creation stays read-only. The system still honors user prose protection.

## Current Rule

### User write permissions

On a simple project, setting, planning, characters, and chapters are read-only for the user. Server HTTP gates must reject user modify, delete, manual generate, and manual repair operations. Hiding frontend buttons is not a permission boundary.

Auto-Director, chapter runtime, review repair, and asset sync are internal system writes. They do not go through the user HTTP write gate and may keep updating the project. Read, export, and task recovery stay available.

### Display boundary

A simple project defaults to a live chapter bookshelf:

- Undrafted chapters show production status only, not intermediate prose.
- Only completed or approved chapter prose may enter the read-only reader.
- The bookshelf must provide a read-only overview of creation resources, covering at least the book contract, world summary, main characters, and volume route, so the user can see what AI prepared for later chapters. Detailed professional fields stay secondary and must not overpower chapter progress and prose reading.
- Creation resources must come from the same saved assets as the professional workspace. Simple mode must not invent a second set of summary facts or assemble guesses on the frontend.
- Quality debt goes in a secondary read-only materials area.
- Safety pauses show an understandable problem and a recommended recovery action. They must not use internal checkpoints or professional planning terms as primary copy.

### Continuation after a local batch completes

Whether a simple-mode book is finished must be judged from the novel’s target chapter count and saved prose together. It must not inherit the terminal state of the latest director task. `workflow_completed` only proves that the range authorized for that task has ended. When the task covered a local chapter range, it is not whole-book completion.

When the latest batch succeeded but empty-prose chapters remain, the chapter bookshelf must offer a continue button for the remaining range. The button submits the same director continue command as the professional workspace and explicitly requests `full_book_autopilot`. The unified runtime clears the finished local execution cursor, then derives the next unwritten chapter from real chapter artifacts. The user does not need Creative Hub or the professional workspace.

After the continue command enters queued or running, the original button location must show “Queued” or “Generating later chapters” and keep showing the current chapter action. Do not only hide the button and wait for prose to land. Otherwise a beginner cannot tell “the system is generating” from “the click did nothing”.

Continuation range must keep all existing prose. Recovery judgment reads prose, chapter status, and the execution contract first. Historical `startOrder / endOrder / remainingChapterCount` are diagnostic only. They must not treat a finished old range as still pending.

### Convert to professional creation

The user may convert to professional creation once, irreversibly. Conversion only updates the experience field and opens the full workspace. It does not clean assets, recreate the book, or cancel a running Auto-Director task. A professional project cannot switch back to simple mode, so the system never re-assumes exclusive system writes after human edits have happened.

## Failure Modes

- A simple project can still be modified through a direct API: check whether the novel HTTP write gate covers the write route. Do not only fix the frontend.
- Auto-Director generates prose early: check that both new-book confirm and takeover input converge to `auto_to_ready`, and that the final planning stage writes the production-handoff checkpoint.
- Auto-Director stops on volume or chapter-split confirm: check whether early planning steps wrongly reused `run_until_gate` planning-recompute approval. `auto_to_ready` should continue with a safe-range policy without overriding user-protected content.
- Two tasks appear after a repeated choice: check the production-experience command’s conditional update, the choice fact in the seed, and active-command reuse.
- Auto-Director cannot write a simple project: check whether an internal service is wrongly writing back through the user HTTP API.
- The bookshelf shows half-finished prose: check that the chapter reached completed / approved / published before returning prose.
- The bookshelf shows counts but not AI output: check that the read-only projection returns stable summaries of the book contract, world, characters, and volume plan. Do not require converting to professional mode just to confirm those resources.
- No continuation entry after a successful local batch: check whether the bookshelf projected the latest task `succeeded` as whole-book completion. Compare target chapters with saved prose and offer in-page continuation for the remaining range.
- The continue button vanishes with no feedback: check that `queued / running` replaces the button with a running hint and that the current action keeps polling. Do not add a simple-mode-only production API to fix a display problem.
- Tasks interrupt or assets vanish after converting to professional: the conversion API must not trigger rebuild, cleanup, takeover, or a new director task.

## Related Modules

- Auto-Director confirm, takeover, and production-handoff commands
- Novel HTTP write boundary
- Auto-Director create page and live chapter bookshelf
- Chapter production and quality-debt rules

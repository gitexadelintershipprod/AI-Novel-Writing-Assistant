# Prompt management

Prompt management is for viewing and maintaining the prompt assets used by product-level AI tasks. It is mainly for developers, people debugging, and advanced users who need to understand task behavior.

## When to open it

- You want to see how a kind of AI task organizes its input.
- One task’s output stays unstable and you need to check the prompt version.
- You need to confirm how prompts bind to model routing.
- A developer is preparing to adjust structured output or a task contract.

Ordinary writing users do not need to visit Prompt management often. The main writing chain should move through Auto-Director, Creative Hub, and the Task Center.

## Page layout

The prompt management page has three main areas:

- Left catalog: prompt assets grouped by task type. Chapter writing maps to `novel.chapter.writer`, usually under writing or chapter-production groups.
- Center editor: view system / human message templates, edit safe slots or the advanced template, generate a preview, and test the current draft when needed.
- Right context panel: see which notes were injected into this preview, for example the book contract, chapter task, character hard facts, obligation contract, timeline, current situation, and style contract.

The bottom bar is for generating a preview, testing output, saving a book override, resetting edits, or restoring the official template. Generate preview shows the final prompt and context. It does not call a model. Test output uses the current draft and the chosen model to generate one result.

## Prompt families

Prompts are usually grouped by task family, for example:

- book-opening direction;
- world and character preparation;
- volume planning and chapter planning;
- chapter writing;
- review and repair;
- book analysis;
- knowledge-library summary;
- style extraction.

Each prompt should map to a clear task. Do not pile unrelated instructions into one prompt.

## Editing the chapter-writing prompt

The chapter-writing prompt is the one people debug most. Path:

1. Open Prompt management.
2. In the left catalog, choose `novel.chapter.writer`.
3. Choose book scope, then the novel and chapter to preview.
4. In the center, switch Safe slots or Advanced template.
5. Click Generate preview and check the final messages plus the right-side context injection.
6. To verify the effect, click Test output, choose a test model in the dialog, and start the test.

Safe slots are for local rules such as tone, pacing, Anti-AI rules, or extra writing requirements. They do not change the prompt’s overall structure, so they fit most debugging.

Advanced template is for mature users who want to fully adjust the `novel.chapter.writer` system / human templates. It only affects chapter writing for the current book. It does not open free replacement of schema, context policy, post-processing checks, or other prompts.

## Visual reference tags

Advanced templates use visual reference tags by default. In the editor you see labels such as “full book contract,” “Tasks in this chapter,” “character hard facts,” “timeline,” “chapter title,” and “tone and pacing,” instead of having to remember `{{context.book_contract}}`, `{{input.chapterTitle}}`, or `{{slot.tone_and_pacing}}`.

How to use them:

- Type `@` in the editor and choose context, a run variable, or a slot from the reference menu.
- After you choose, a tag is inserted. On save and preview, the system still compiles it to the underlying template token.
- Hover a tag to see the key, original token, description, and whether it is required context.
- Delete a tag and insert again with `@` when you need to replace a wrong reference.
- If the template contains an unrecognized token, the editor keeps the original text and shows an error state, so the text is not silently dropped.

Common tag meanings:

| Type | Example labels | Use |
| --- | --- | --- |
| Context | full book contract, Tasks in this chapter, timeline, character hard facts | Inject current book and chapter notes into chapter writing |
| Run variable | chapter title, target word count, chapter number | Use parameters passed in for this run |
| Slot | tone and pacing, Anti-AI rules, custom extra rules | Reuse editable rules from safe slots |

## Source view

Advanced templates keep a source view for debugging the underlying template:

- The visual view is for everyday editing and prefers readable labels.
- The source view shows the real template text, for example `{{context.chapter_mission}}`.
- After you switch from source view back to visual view, registered references show as tags again.

If you are only adjusting writing effect, stay in the visual view and the `@` reference menu. Switch to source view when you are tracing tokens, copying a template, or confirming the compiled result.

## Context injection panel

The right context panel confirms what the model will actually see. It shows:

- context-block name and group;
- whether it is required context;
- token estimate;
- whether it is currently selected, trimmed, summarized, or missing;
- preview content, so you can check that the notes come from the current novel and chapter.

Required context is locked by system governance rules and cannot be turned off in the UI. Common required blocks for chapter writing include the book contract, chapter task, character hard facts, obligation contract, style contract, and timeline. That prevents accidentally dropping key notes, which can send a chapter off the main line or against earlier state.

## Preview, test, and save

After each edit, work in this order:

1. Click Generate preview and check the system / human messages.
2. Check the right-side context and confirm the notes come from the target novel and chapter.
3. Click Test output, choose a test model in the dialog, and see how the current draft behaves on a real model.
4. For a local adjustment, save it as a book override first.
5. If an advanced template goes wrong, roll back a history version or restore the official template.

Generate preview and Test output do different jobs:

| Action | What it does | Calls a model? |
| --- | --- | --- |
| Generate preview | Show final messages, context injection, missing notes, and diagnostics | No |
| Test output | Generate one result with the current draft and chosen model, so you can judge the edit | Yes |

Test output does not require saving the draft first. Structured prompts show parsed JSON and repair counts. Text prompts show the model’s returned prose. If the test is weak, keep editing before you save.

Saving an advanced template creates book version history. Restoring the official template does not delete history. You can still view and roll back later.

## Boundaries

Prompt management does not bypass system governance rules:

- You cannot turn off required context.
- You cannot edit `contextPolicy` on the page.
- You cannot edit the structured-output schema.
- You cannot turn off chapter-writing validation, repair, or state-sync chains.
- Advanced template first covers chapter writing `novel.chapter.writer`. Other prompts stay on safe slots and preview.
- Test output only runs registered prompts and the current draft. It is not a free system-prompt bypass.

If the problem is missing novel notes, an incomplete chapter task, a weak model, or unstable structured output, editing the prompt alone may not fix it. Return to the matching module to fill notes or check the task failure first.

## Check these before you edit a prompt

Before changing a prompt, confirm:

- whether the current problem really comes from the prompt;
- whether model routing is a fit;
- whether input data is complete;
- whether the output schema is being followed;
- whether retry or a model switch can solve it.

A prompt is not the first fix for every problem. Structured output, model capability, context notes, and task state can all affect the result.

## Versions and rollback

Prompt edits affect later AI tasks. Keep version awareness:

- record why you are changing it;
- only edit prompts related to the target task;
- verify on a test novel;
- keep a version you can roll back to;
- avoid changing model, data, and prompt at the same time, which makes the source hard to judge.

Public product prompts should go through unified registration and schema management. Avoid temporary inlined prompts in business code.

## Binding to tasks

The value of Prompt management is seeing which task uses which prompt. When diagnosing, follow this path:

1. Confirm the failed task type in the Task Center.
2. Confirm the model in Model routing.
3. Confirm the task prompt and output requirements in Prompt management.
4. Verify on a test novel.

If a task needs structured output, consider the prompt and output schema together.

## Usage advice

Ordinary users should first adjust novel notes, the knowledge library, the style engine, and model routing. Consider prompts only after the same kind of task stays abnormal and data plus model have already been checked.

When developers change prompts, put new capability into unified prompt assets and the registry, instead of scattering it through service code.

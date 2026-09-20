# Product Page DESIGN Batch Optimization Plan

## Background

The client already has a unified product design system, but page-level landing is incomplete. Of the current 30 real pages, Home, Novel list, Create novel, Auto-director create, Title workshop, and Prompt Workbench have completed the main page-level noise reduction; remaining pages still mix visual languages such as creation cockpit, traditional back-office cards, ordinary chat pages, and technical configuration pages.

This plan only optimizes existing pages’ information hierarchy, visual contract, state expression, responsiveness, and copy. It does not add new business capability, APIs, database fields, routes, or workflow branches.

Client rules are governed by `docs/design/product-ui-design-system.md`. `site/DESIGN.md` only constrains the public marketing site; it is not used for client pages.

## Goals

- On every core page, a beginner can see on the first screen the current object, current stage, main task, recommended action, and key status.
- Converge pages from “a collection of features and forms” into one primary type among Dashboard, Workspace, Editor, Asset Library, Task Queue, or Settings.
- Unify on project-owned components and CSS semantic tokens; reduce hard-coded colors, visible borders, decorative gradients, excessive shadows, and cards nested in cards.
- Let Loading, Empty, Error, Disabled, and Success all explain impact and next step, rather than only showing a status name.
- Keep existing features, data, and routes compatible; no visual change may overwrite body text, assets, or task state.

## Page design contracts

### Dashboard

Show the recommended next step first, then progress, risk, and supporting information. Must not treat statistic numbers as the page’s main task.

### Workspace

Must show the current work object, stage, the single primary action, and supporting status. Two- or three-column layouts must keep the central main-task area as the visual center.

### Editor

Body text or main content must occupy the visual center. Diagnostics, parameters, and AI suggestions go in a sidebar or secondary panel; they must not squeeze main content.

### Asset Library

Asset entries should not only show name and edit actions; they should also explain source, enabled status, impact scope, recent use, and next-step use when possible.

### Task Queue

Must distinguish blocking issues, continue-with-warning quality reminders, and ordinary tasks, and explain the impact of handling or ignoring them.

### Settings

Organize configuration by user task and availability; prioritize answering “can I start writing” and “how do I fix this”; technical parameters go into a secondary area.

## Current page baseline

### Already largely aligned

- `/`
- `/novels`
- `/novels/create`
- `/novels/auto-director`
- `/titles`
- `/prompt-workbench`
- `/knowledge`
- `/genres`
- `/base-characters`
- `/book-analysis`
- `/tasks`
- `/auto-director/follow-ups`
- `/creative-hub`

### Partially aligned

- `/novels/:id/preview`
- `/novels/:id/edit`
- `/novels/:id/chapters/:chapterId`
- `/drama`
- `/drama/projects/:id`
- `/settings`
- `/worlds`
- `/style-engine`

### Page-level optimization not yet done

- `/help`
- `/comic`
- `/comic/projects/:id`
- `/chat-legacy`
- `/story-modes`
- `/anti-ai-rules`
- `/settings/model-routes`
- `/worlds/generator`
- `/worlds/:id/workspace`

## Batch implementation

## Batch one: asset-library foundation and beginner entries

Scope:

- Shared Asset Library page header, recommended actions, sections, and empty-state contract.
- Add `success`, `warning`, `info` semantic color tokens.
- `/knowledge`
- `/genres`
- `/base-characters`

Implementation focus:

- Knowledge-base first screen explains how materials enter creation and retrieval, shows available documents, in-progress tasks, and failed tasks, and gives a next step by status.
- Genre-base library changes from a single management Card to “purpose explanation + asset overview + tree workspace”; empty state directly guides creating the first genre base.
- Base-character library makes clear it is a cross-novel reusable asset; complete Loading, Error, Empty, and recommended actions; lower the visual weight of dangerous actions such as delete.
- Do not add data the backend does not yet provide, such as “number of novels using this”; do not fabricate asset impact scope.

Acceptance:

- All three pages have object, purpose, recommended action, and status feedback.
- The page root layout is no longer carried entirely by a single large Card.
- No new hard-coded color values; no decorative gradients.
- Mobile header actions can stack vertically; lists do not produce horizontal scroll.
- client typecheck passes.

## Batch two: core creation and recovery workbenches

Scope:

- `/creative-hub`
- `/book-analysis`
- `/tasks`
- `/auto-director/follow-ups`

Implementation focus:

- Creative Hub converges from ordinary-chat visuals into a “creation thread + current novel + execution activity” workbench.
- Book-analysis page pins source, analysis stage, results, and next action on the first screen.
- Tasks and director follow-ups unify visual rank and handling-consequence copy for blocking, quality reminders, and ordinary tasks.
- Clean Creative Hub’s hard-coded slate/amber/emerald colors and nested Cards.

Phase split:

- 2A Task and recovery contract: establish shared Workspace / Task Queue display boundaries; unify blocking, quality debt, pending action, and ordinary-progress semantics for Task Center and director follow-ups.
- 2B Book-analysis results workbench: pin source, analysis stage, result entry, partial completion, and recovery actions on the workbench first screen.
- 2C Creative Hub creation workbench: converge into creation threads, progress records, and current novel context; fix thread loading and error states.

Compatibility boundary:

- Only consume existing structured state; do not add APIs, database fields, routes, Prompts, or workflow branches.
- `directorTaskId` continues as the director follow-up fact identifier; `workspaceTaskId` must not be used as a substitute.
- Book-analysis source-text read failures must not hide already-generated analysis results; Creative Hub switching threads must not keep showing the previous thread’s content.

## Batch three: world, writing-style, and model infrastructure

Scope:

- `/worlds`
- `/worlds/generator`
- `/worlds/:id/workspace`
- `/style-engine`
- `/anti-ai-rules`
- `/settings/model-routes`
- leftover cards inside `/settings`

Implementation focus:

- World assets show current status, which creation steps they can be used in, and recommended deepening actions.
- World generator becomes a clear step-by-step workspace; no longer wrap the whole flow in one large Card.
- Writing style and anti-AI rules unify as asset library + edit workspace; clean hard-coded slate colors and oversized dialogs.
- Model routes organize availability and repair actions by “book opening, planning, body text, review, material processing”.

## Batch four: short-drama and comic derivative production

Scope:

- `/drama`
- `/drama/projects/:id`
- `/comic`
- `/comic/projects/:id`

Implementation focus:

- Project libraries highlight recent projects and the next production action.
- Project pages unify source, stage, main task, quality status, and next step.
- Comic pages clean statistic mini-cards, technical tags, and hard-coded colors; avoid putting generation parameters at the first-screen center.
- Do not change existing short-drama, comic generation, and image-confirmation flows.

## Batch five: reading, help, and compatibility-page wrap-up

Scope:

- `/novels/:id/preview`
- leftover Tabs on `/novels/:id/edit`
- `/novels/:id/chapters/:chapterId`
- `/help`
- `/story-modes`
- `/chat-legacy`

Implementation focus:

- Novel preview completes current chapter, reading progress, and a recommended action into the editor.
- Novel workbench and chapter editor converge corner radius, sidebar weight, and status blocks.
- Help page changes from a marketing Hero to beginner task navigation.
- Story modes become a reusable asset library; technical fields enter edit detail.
- Old chat page is compatibility maintenance only; decide retirement separately after confirming no dependents; do not delete the route on the visual stage.

## Batch six: site-wide consistency acceptance

Scope: all client pages.

Implementation focus:

- Clean one-off hex colors and scattered slate/amber/emerald/sky status colors.
- Check corner radius, shadows, nested cards, heading hierarchy, and primary/secondary buttons.
- Gradually move `.mobile-route-*` fallbacks in `index.css` that depend on DOM structure back into page- or module-owned responsive layout.
- Check keyboard focus, accessible names on icon buttons, dialog focus management, and status text beyond color.
- Run a user-perspective copy review on all newly added copy.

## Implementation boundaries

- Do not write business logic into `components/ui/`.
- Composition components reused across asset libraries belong in `client/src/components/assetLibrary/`; page business components stay in their own modules.
- Each phase only changes one group of pages that share a page type; create an independent commit after verification passes.
- Do not run browser, screenshots, or Playwright as default acceptance; UI interaction acceptance is left to the user; code side runs typecheck and focused tests.
- Before each batch starts, check single-file length; pages over 700 lines must first be split by responsibility and must not keep stacking visual JSX.

## Phase status

- Batch one: complete (2026-07-14).
- Batch two: complete (2026-07-14; 2A / 2B / 2C all complete).
- Batch three: not started.
- Batch four: not started.
- Batch five: not started.
- Batch six: not started.

## Batch one implementation results

- Established `client/src/components/assetLibrary/` page-composition boundary.
- Completed global semantic tokens for `success`, `warning`, `info`.
- Knowledge library has a purpose header, material/index status, dynamic recommended actions, and recovery entries for loading, failure, empty library, and filter-no-results.
- Genre-base library has a purpose header, genre / related-novels / explanation-completeness summary, plus a tree workspace and delete-protection copy.
- Base-character library has a purpose header, character / type / image / material-completeness summary, plus loading, failure, empty library, and character-detail sections.
- No new APIs, routes, database fields, or business flows; data the backend does not provide was not inferred in the UI.

## Batch two 2A implementation results

- Established business-state-free Workspace page composition and Task Queue display boundaries.
- Task Center uses the existing task overview to show global execution, waiting-for-action, and recovery candidates, and completes loading, failure, empty, and retry for list and detail.
- Director follow-ups continue to use `directorTaskId` as fact identity; old `taskId` is compatibility read only; `workspaceTaskId` was not used as a substitute.
- Explicitly distinguish must-handle, pending action, continue-with-warning quality reminders, and ordinary progress; all task actions show execution consequences.

## Batch two 2B implementation results

- Book-analysis first screen pins source document, version, analysis scope, generation stage, progress, and planned-section completeness, and provides a single recommended next step.
- Success-with-results, success-with-no-results, partial completion, budget exhausted, failure, cancel, and archive are all consumed by a pure display model from existing structured state; no new business-judgment entry.
- While running, completed sections can be read; on failure or cancel, existing results are kept and remaining gaps are made explicit; archived results still support read-only view and copy.
- Frozen sections with no content are expressed as “not selected this round” and do not count as this-round gaps; frozen historical results remain readable.
- Source-text or chapter read failures only degrade the two-column compare; they do not hide already-generated results; medium/narrow screens prioritize the results area; historical analysis list is a supporting entry.

## Batch two 2C implementation results

- Creative Hub converges into three parts: thread management, creation-progress records, and current novel context; the header pins novel, stage, thread status, and a single recommended next step.
- Recommended actions only consume existing structured state such as thread, approval, diagnostics, production, book-opening prep, and turn summary; query failure, pending confirmation, running, failure recovery, initialization suggestions, and production entries keep a clear priority.
- URL `threadId` becomes the current-thread fact source; switching threads immediately clears old messages; old loading, stream events, approvals, resource bindings, or new-create responses cannot overwrite a thread the user entered later.
- When there is no thread, thread load fails, or status read fails, creation input and resource edits stay disabled, with recovery entries to create, retry, or switch threads; run, bind, approve, and production submit all show real pending/disabled.
- Deep-linked resources only reuse a thread whose bindings match completely; switching novels clears old chapter and world bindings; bound items that are not in the first-screen novel list still keep a recognizable option.
- Free input, stop, edit, branch, regenerate, tool results, and approval capability remain; run identifiers, resource IDs, and model parameters default into collapsed detail.
- Deleted unreferenced old duplicate Creative Hub pages and Activity Feed; `/chat-legacy` compatibility entry and the old chat page stay unchanged.

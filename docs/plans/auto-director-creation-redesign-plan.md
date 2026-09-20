# Auto-Director Creation Flow UI Redesign Plan (Progressive Stages + Dedicated Route Page)

## Background

Auto-director creation is currently a large dialog stacked on top of `NovelCreate.tsx` (`NovelAutoDirectorDialog.tsx`, 709 lines, 20+ useState hooks). Internally it lays out everything at once: starting idea, director starting settings (reader channel / narrative POV / pacing / emotion / chapter count), planning reference world, this book's world handling, book-level default writing style, model settings, and run mode. The direction-candidate stage then stacks another `NovelAutoDirectorCandidateDialog` — a dialog nested inside a dialog.

Confirmed problems:

1. **Same-screen information overload**: a new user immediately faces a dozen settings, while the product copy itself says "keeping the defaults is fine" — which means most items do not need to appear at first.
2. **Tight layout, no design sense, zero motion**: an early feature-stacking artifact; adding more features will only make it messier.
3. **The dialog shape cannot carry this flow**: this is a multi-stage process with long-task progress and interrupt/resume (`workflowTaskId`), crushed into a Dialog. Scrolling is cramped, stacking conflicts, and the scene cannot be restored from the URL.

Redesign principle (already confirmed by the user): **pure UI/interaction-layer redesign; all functional semantics are reused** — all form fields, defaults, mutations, candidate-batch logic, and resume logic stay unchanged. Only "how it is presented and when it is presented" changes.

## Decision: a dedicated route page, not an in-page fullscreen overlay

Recommend a **new route page** (for example `/novels/auto-director`, with `?taskId=` in resume scenarios). Reasons:

1. **Resume semantics match a URL naturally**: resume currently depends on an externally passed workflowTaskId then opening a dialog. A route page can restore the scene directly from the URL; after refresh / crash / desktop restart, returning to the same page returns to the same flow — a real gain for a long-task flow, not merely a form change.
2. **Eliminate nested dialogs**: candidate-direction selection currently opens a Dialog inside a Dialog. In page form, the candidate stage is simply a stage block on the page; stacking problems disappear.
3. **Leave room for a progressive layout**: a stage-based flow needs vertical breathing room and between-stage transition animation. A Dialog's fixed height plus inner scroll is a natural constraint.
4. **Matches existing project mental model**: the single-book workbench is already a page-style flow of "left-side steps + main-area advance". Using the same shape for creation makes the beginner's mental model continuous from create to workbench.

`NovelCreate.tsx` remains a lightweight entry page (one-sentence inspiration + an "Enter auto-director" button that navigates to the route page) and no longer hosts the dialog.

## Design core: progressive disclosure across five stages

Key tradeoff: **progressive does not mean a forced linear wizard**. Completed stages collapse into clickable summary cards that can be edited again (they do not disappear). Advanced users get a fast path of "use all defaults, generate directions immediately", without punishing skilled users.

### Stage 0 · Starting idea (the only thing visible on entry)

- Center of the page: a large input area — starting-idea textarea + "No idea?" inspiration entry (reuse existing `NovelAutoDirectorIdeaInspirationPanel` as-is).
- Two exits: "Continue refining settings" (enter Stage 1) / "Generate directions with default settings" (jump to Stage 4; the three middle stages all use existing defaults).
- This is the beginner's first screen, and the only required item in the whole flow — fully consistent with the product narrative of "one sentence of inspiration starts the whole book".

### Stage 1 · Director starting settings

- After the idea is confirmed, expand from below: reader-channel preference, narrative POV, pacing preference, emotion intensity, expected chapter count (split out and reuse the basic form block of existing `NovelAutoDirectorSetupPanel`; fields and defaults are unchanged).
- After confirm, collapse into a one-line summary card (for example "AI-judged channel · third person · balanced pacing · medium emotion · about 80 chapters"). Clicking the summary card expands it for edits.

### Stage 2 · World and writing style

- Planning reference world samples, this book's world handling, book-level default writing style (split out from the corresponding existing SetupPanel blocks).
- Likewise collapse into a summary card after confirm.

### Stage 3 · Model and run mode (final confirmation)

- Model settings + auto-director run mode (four mode cards + post-body AI-detection toggle).
- This step's confirm button is "Start generating directions" — putting the easiest-to-ignore but most consequential run mode as the last glance before launch; the position itself is the reminder.

### Stage 4 · Direction candidates and execution

- Existing `NovelAutoDirectorCandidateBatches` / `CandidateSelectionContent` / `ProgressPanel` move into the page main area (no longer a nested Dialog).
- Above, a persistent collapsed Stage 0–3 summary bar. If directions are unsatisfactory, settings can be edited and regenerated — this is a spatial expression of the existing "continue generating / directed revision" capability.

### Motion (framer-motion is already a dependency; zero new installs)

- Stage expand/collapse: height + opacity transition (`AnimatePresence` + layout animation).
- Summary-card collapse: a fold-in animation from form to summary row, so the user sees "settings were put away" rather than a sudden disappearance.
- Candidate cards: stagger in sequence when a batch arrives.
- Progress stages: breathing effect on the current-stage indicator.
- Respect `prefers-reduced-motion`.

## Functional reuse list (explicitly unchanged)

- All form fields, options, defaults, and hint copy (`NovelAutoDirectorDialog.constants.ts` unchanged).
- All mutations and state transitions (`useNovelAutoDirectorCandidateMutations.ts`, `NovelAutoDirectorDialog.shared.ts` unchanged or only import-path adjustments).
- Candidate batches, directed revision, title-group redo, resume (`workflowTaskId`), and run-mode semantics.
- Backend API, prompts, and director stage orchestration: zero change.

## Step-by-step execution plan (file level)

### Part 1: Route-page shell and stage state machine

- `client/src/pages/novels/autoDirector/AutoDirectorCreatePage.tsx` (new): route-page shell, stage state machine (current stage, each stage's completed state, fast-path flag), restore scene from URL `taskId`.
- `client/src/pages/novels/autoDirector/directorCreateStages.ts` (new): pure functions for stage definitions, completion judgment, and summary-copy generation.
- Route registration (placed according to vite-plugin-pages file-routing conventions).

### Part 2: Stage block components (split and reuse from existing panels)

- `client/src/pages/novels/autoDirector/StageIdea.tsx` (new): Stage 0, internally reuses `NovelAutoDirectorIdeaInspirationPanel`.
- `client/src/pages/novels/autoDirector/StageBasicSetup.tsx` / `StageWorldStyle.tsx` / `StageModelRun.tsx` (new): split by block from `NovelAutoDirectorSetupPanel.tsx` (490 lines). Form state structure unchanged; after the split, remove the old SetupPanel.
- `client/src/pages/novels/autoDirector/StageSummaryCard.tsx` (new): collapsed summary card for a completed stage (expand-to-edit interaction).
- `client/src/pages/novels/autoDirector/StageCandidates.tsx` (new): Stage 4, internally reuses `NovelAutoDirectorCandidateBatches` / `CandidateSelectionContent` / `ProgressPanel`; eliminate nested Dialog.

### Part 3: Entry switch and old-dialog retirement

- `client/src/pages/novels/NovelCreate.tsx`: become a lightweight entry (inspiration input goes straight to the route page, or a direct jump); remove `NovelAutoDirectorDialog` mounting.
- Other entrypoints that open this dialog (if resume entrypoints exist in director follow-up / task center) change to navigating to the route page with `taskId`.
- `NovelAutoDirectorDialog.tsx` / `NovelAutoDirectorCandidateDialog.tsx` / `NovelAutoDirectorDialogHeader.tsx` are deleted after all entrypoints have switched.

### Part 4: Motion and wrap-up

- framer-motion stage transitions, summary fold-in, candidate-card stagger, `prefers-reduced-motion` fallback.
- Verification: client typecheck + build; confirm route-page lazy loading (creation flow is already a natural independent-chunk boundary); UI interaction acceptance is left to the user per project rules.

## Execution order and gates

Part 1 → 2 → 3 → 4. **Until Part 3 is complete, the old dialog remains usable** (during coexistence, use the route page as the primary entry for verification; delete old components only after confirming the resume chain has no regressions). This is a user-visible change; update release notes and README on completion.

## Acceptance dimensions

- **Fit**: zero change in functional semantics (fields / defaults / mutations / resume chain compared item-by-item with the old dialog); Stage 0 on entry truly shows only idea input; every stage can be edited again; the fast path works; no nested-dialog leftovers.
- **Completeness**: Parts 1–4 are all first-phase must-haves; old dialog components are deleted cleanly with no dead-code leftovers.
- **Risk**: key regressions are the resume chain (entering the route page with taskId restores each stage scene), parameter passing from NovelCreate to the route page, and field-by-field equality between the fast-path request body and the old dialog's default request body.

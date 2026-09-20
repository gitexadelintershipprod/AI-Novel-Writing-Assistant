# Tension Curve “Display / Edit” Split Plan

## Background

The tension curve is currently a single “can both view and drag” component, embedded directly in the rhythm chapter-breakdown workbench. That brings two problems:

1. **High mis-hit cost**: the curve stays editable; a user who only wants a glance at the rhythm trend can accidentally drag a point and produce an unnecessary anchor.
2. **The edit site is too small and too isolated**: edit actions are squeezed into an embedded card a few hundred pixels high; when dragging a chapter’s value, the user cannot see “which rhythm beat this chapter belongs to, what this beat must deliver, and how volume strategy positions this stretch” — they are purely dealing with an isolated number, and it is easy to tune a curve that detaches from narrative intent (for example dragging the intensity of an “expose the crisis” beat as flat as the “opening hook”).

User direction: **the outside (workbench embed, volume-strategy thumbnail) is always display-only, never editable; editing is collected into a dialog, and the dialog must make “this stretch’s relationship to volume-level planning” clear, rather than only giving a pile of draggable points.**

## Design core

### 1. Two layers of components, single responsibility each

- **Display layer** (`TensionCurvePanel`, after change): read-only in every scene — does not receive `onPointChange`/`onPointRelease`, no drag, no NodeToolbar, no whole-volume/batch hand-back buttons. Keep: legend, shape health-check hints, reference-line toggle (the reference line is a read-only comparison, in the “look” category, not “edit”). Add a conspicuous “edit” entry (a button, or clicking the curve itself).
- **Edit layer** (new `TensionCurveEditDialog`): a fullscreen or large Dialog/Sheet; internally assemble the current editable canvas (drag, NodeToolbar, whole-volume/single-beat hand-back to AI, batch release) — this logic mostly moves from the existing `TensionCurvePanel`; do not reinvent it.

The two layers share the same underlying geometry (`curveCoordinates.ts`) and node rendering (`TensionCurveNodes.tsx`); the edit layer only additionally assembles interaction and a context panel.

### 2. Product design of the edit dialog: how to place volume-level links

This is the focus of the plan. The dialog is not “the current card, bigger”; it fills in around the numeric curve the narrative context of “why it looks like this”. Three information layers, coarse to fine:

**Top: volume-level positioning bar (always visible; does not change with the selected chapter)**
Volume strategy’s positioning of this volume — `VolumeStrategyVolume` already has `roleLabel` (volume role positioning), `coreReward` (core reader reward), `escalationFocus` (this volume’s escalation focus). These three stay as a one-line summary at the top of the dialog. The effect: before dragging chapter 23’s intensity, the user first glances at “this volume was supposed to be a bridge, or the whole-book climax” — avoiding dragging a “bridge volume” into a curve packed with peaks.

**Middle: rhythm-beat nav bar (click to switch the focused range, and also link detail)**
Keep the existing beat-switch buttons, but beside/under each beat button, linked-show that beat’s `summary` (one-sentence overview) and `mustDeliver` (must-deliver list) — `StructuredBeatSheetCard.tsx` already displays these two fields the same way; the dialog directly reuses the same copy source and does not invent new content. Effect: when switching to the “mid-turn: expose the crisis” beat, below the curve the user can see “this stretch must deliver: xxx, xxx”; when dragging those chapters’ intensity, they are facing a concrete delivery target, not an abstract red dot.

**Fine: selected-chapter detail sidebar (expands when a node on the curve is selected)**
Select a chapter node, and the dialog side (or a bottom drawer) expands a read-only summary of that chapter’s `title`/`summary`/`purpose`/`exclusiveEvent` and similar fields (`StructuredChapterDetailCard` already has these fields; the dialog only does read-only display and does not reimplement an edit form). Also provide a jump entry “open the full chapter-detail card” for going deeper when title/summary and other non-numeric content need editing — the curve dialog itself does not take over edit rights for those fields; the duty boundary is clear: the curve dialog only owns intensity values; remaining detail still belongs to the chapter-detail card.

**Layout sketch (desktop wide screen; dialog occupies most of the viewport)**:

```
┌─────────────────────────────────────────────────────────┐
│ Volume positioning bar: bridge volume · core reward: xxx · this volume’s escalation focus: xxx   │
├─────────────────────────────────────────────────────────┤
│ [Whole volume] [Opening hook] [First upgrade] [Mid-turn: expose the crisis*] [Climax...] │
│ Current beat must deliver: expose-crisis clues, antagonist identity emerging              │
├───────────────────────────────────────┬─────────────────┤
│                                         │ Chapter 23 detail      │
│         (editable curve canvas, main area)       │ title/summary/purpose   │
│                                         │ [Open full detail]   │
│                                         │                 │
├───────────────────────────────────────┴─────────────────┤
│ Shape health-check hints · reference-line toggle · whole-volume/current-beat hand-back to AI             │
└─────────────────────────────────────────────────────────┘
```

Mobile / narrow screen: volume positioning bar and rhythm-beat nav bar collapse into expandable summary rows; sidebar detail becomes a bottom drawer after selection.

### 3. The two consumers are handled differently (needs your confirmation)

- **Rhythm chapter-breakdown workbench** (`StructuredOutlineWorkspace.tsx`): the embed becomes read-only display + an “edit tension curve” button; click opens the dialog; after the dialog closes, the display layer still reads the same workbench draft state; no extra sync logic is needed.
- **Volume-strategy / volume-skeleton page** (`OutlineTab.tsx`): **already confirmed no in-place edit**. Keep a purely read-only thumbnail; do not wire the edit dialog; do not carry edit-assembly dependencies such as batch release or chapter-detail jumps. The thumbnail may add a “go to rhythm / chapter-breakdown to edit” jump link, guiding the user back to the rhythm chapter-breakdown workbench to finish editing.

## Out of scope

- Do not change persistence semantics or APIs for anchoring / un-anchoring (this is a pure frontend display-form adjustment).
- Do not add data sources for the “volume positioning bar” or “beat delivery list” — all reuse existing `strategyPlan`/`beatSheet` fields; no new backend fields or prompt changes.
- The dialog does not take over edit rights for chapter title/summary/purpose and similar fields; those still belong to `StructuredChapterDetailCard`.
- Do not wire the edit dialog or any in-place edit capability on the volume-strategy / volume-skeleton page (already confirmed; keep only the read-only thumbnail + jump link).

## Step-by-step execution plan (file level; for use after the plan is confirmed)

### Part 1: Slim the display layer
- `client/src/components/tensionCurve/TensionCurvePanel.tsx`: remove drag, NodeToolbar interaction, batch/single-point hand-back buttons; drop `onPointChange`/`onPointRelease`/`onPointReleaseMany` props as a whole; add `onRequestEdit?: () => void` and an “edit tension curve” entry button.

### Part 2: Split out the edit layer
- `client/src/components/tensionCurve/TensionCurveEditDialog.tsx` (new): Dialog shell + volume positioning bar + rhythm-beat nav bar (linked summary/mustDeliver) + main edit-canvas area + selected-chapter detail sidebar + bottom toolbar (shape health-check, reference line, batch hand-back). Current editable logic (drag constraints, NodeToolbar, batch release) moves from the old `TensionCurvePanel` into this canvas area.
- `client/src/components/tensionCurve/TensionCurveVolumeContextBar.tsx` (new): volume positioning bar; receives `VolumeStrategyVolume` summary fields.
- `client/src/components/tensionCurve/TensionCurveBeatContextStrip.tsx` (new): rhythm-beat nav bar + linked summary/mustDeliver display; reuses `StructuredBeatSheetCard`’s existing copy-taking approach.
- `client/src/components/tensionCurve/TensionCurveChapterDetailSidebar.tsx` (new): selected-chapter read-only summary + jump entry.

### Part 3: Consumer integration
- `client/src/pages/novels/components/StructuredOutlineWorkspace.tsx`: embed becomes read-only `TensionCurvePanel` + `TensionCurveEditDialog` (controlled open state); pass batch release, `onChapterNumberChange`, `strategyPlan`, `selectedBeatSheet`, and chapter-detail jump callbacks into the dialog.
- `client/src/pages/novels/components/OutlineTab.tsx`: keep the read-only thumbnail; do not wire the edit dialog; add a link/button that jumps to the rhythm chapter-breakdown workbench.

## Acceptance dimensions

- **Fit**: display layer is not writable in any scene; `OutlineTab.tsx` thumbnail confirmed to have no edit entry (no drag, no dialog trigger); volume/beat context copy inside the edit dialog has exactly the same field sources as `StructuredBeatSheetCard` / the volume-strategy page; no copy desync.
- **Completeness**: Parts 1–3 are phase-one must-haves, all in this round’s scope (volume-strategy page scope already confirmed as “read-only + jump”; no open items).
- **Risk**: focus on confirming that after the dialog closes, draft state matches the workbench main view (no missed save or state misalignment), and that existing safety rules such as batch hand-back (same value + explicit ai source) behave unchanged after moving into the dialog.

## This-round implementation progress

- Part 1 done: `TensionCurvePanel` only keeps read-only display, viewport switch, reference line, legend, and shape hints; it no longer receives `onPointChange` / `onPointRelease` / `onPointReleaseMany`.
- Part 2 done: editable React Flow canvas split into `TensionCurveFlowCanvas`; edit assembly entered `TensionCurveEditDialog`; the dialog completed the volume positioning bar, beat delivery strip, chapter-detail sidebar, and whole-volume/current-beat hand-back to AI.
- Part 3 done: rhythm / chapter-breakdown workbench opens the dialog via “edit tension curve”; volume-strategy / volume-skeleton page keeps the read-only thumbnail and only provides a “go to rhythm / chapter-breakdown to edit the curve” jump entry.
- Code-level verification passed: `pnpm --filter @ai-novel/client typecheck`. Per project verification rules, browser screenshots and drag feel are left for the user to confirm in the real UI.

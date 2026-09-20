# Tension-Curve React Flow + D3 Refactor Plan

## Background

Tension-curve v1 is handwritten SVG (fixed 720×240 viewBox + handwritten linear mapping + native pointer events). Four experience problems have been confirmed:

1. 60 chapters packed into a fixed width, point spacing about 11px; labels overlap, and it is very easy to mis-hit an adjacent chapter.
2. `pointerdown` writes a value and marks a user anchor at the instant of press; there is no drag buffer, so a hand tremor immediately mis-anchors.
3. Unset (null) and a true 0 both sit on the baseline; they are hard to tell apart visually.
4. Drag only, with no precise numeric-input fallback; no zoom, no pan.

The visualization stack is already decided (see [visualization-stack](../design/visualization-stack.md)); `@xyflow/react` and d3 submodules were installed in one shot with commit `cf2cd07e`. This plan migrates the curve onto a combination of a React Flow canvas + d3 math.

## Design core: model “chapter points” as constrained Flow nodes

- **One custom node per chapter**, position `x = chapterOrder × fixed step` (e.g. 56px), `y = yScale(conflictLevel)`, where `yScale` uses `d3-scale` `scaleLinear` (value domain 0–100 ↔ canvas height). 60 chapters naturally spread into a canvas about 3400px wide, browsed with React Flow **pan / zoom / MiniMap** — the density problem disappears at the root, instead of hard-packing by compressing point spacing.
- **Custom edges between adjacent chapter nodes**; edges auto-redraw as nodes drag — the polyline *is* the edges; no need to hand-maintain a polyline.
- **Drag constraints**: while dragging a node, lock X (chapter ordinal is immutable) and clamp Y within the value domain; use React Flow `nodeDragThreshold` (about 3px) to distinguish “click” from “drag”, which roots out the “jump on press” mis-hit. Only on drag end (`onNodeDragStop`) convert to a number, write the draft, and mark a user anchor — during the drag, only visuals move; state is not written.
- **Precise-input fallback**: selecting a node pops `NodeToolbar` — a 0–100 numeric input (Enter to confirm, mark user) and a “hand back to AI” button. This also replaces the current bottom row of “hand chapter N back to AI” buttons (which do not scale once there are many anchors).
- **null vs 0 separated**: unset chapters go on an independent “unset track” below the coordinate area (gray dots, not draggable; Toolbar prompts to detail that chapter first), spatially separated from a true 0.
- **Coordinate-system backdrop**: Y-axis ticks (0/25/50/75/100) and beat segment color bands render into the canvas coordinate system via React Flow `ViewportPortal`, and stay in sync with zoom/pan.
- **Reference line**: template values generate a smooth path via `d3-shape` `line` + `curveMonotoneX`, also a read-only overlay through `ViewportPortal`.
- **Viewport-switch semantics upgrade**: whole-volume / single-beat switching changes from “filter data” to “`fitView` onto that beat’s node range” — context is not lost; neighboring beats’ trend stays visible on the canvas.
- **Read-only mode** (volume-skeleton page thumbnail): `nodesDraggable=false` + hide Toolbar; same component reused.

External contract unchanged: `onPointChange` / `onPointRelease` / series props keep existing signatures; the two consumers (rhythm chapter-breakdown workbench, volume-skeleton page) need almost no integration-code change; anchoring semantics, persistence, and prompt chain are zero change — this is a pure frontend component-layer refactor.

## Out of scope

- Do not change backend semantics or APIs for anchoring / un-anchoring (Part A/B already-accepted chain stays).
- Do not do multi-series on one screen (revealLevel etc. still reserved via the series array; phase one only renders the conflictLevel series).
- Do not change `tensionCurveAnalysis.ts` shape health-check and reference-template algorithms (only change how they are consumed).
- Do not migrate `WorldVisualizationBoard` in this plan (separate item).

## Step-by-step execution plan (file level)

### Part 1: Flow canvas components

- `client/src/components/tensionCurve/TensionCurveFlow.tsx` (new)
  React Flow instance assembly: node/edge generation (data → nodes/edges as a pure function), drag constraints and threshold, `onNodeDragStop` conversion callback, fitView strategy, Controls + MiniMap, read-only mode switch. Style `@xyflow/react/dist/style.css` is imported inside this component (travels with the lazy chunk; not on the first screen).
- `client/src/components/tensionCurve/ChapterPointNode.tsx` (new)
  Custom node: dot visuals (AI blue / anchored red / unset gray), selected state, NodeToolbar (numeric input + hand back to AI), hover info (chapter ordinal, title, value, anchor status).
- `client/src/components/tensionCurve/curveCoordinates.ts` (new)
  Pure-computation module: `d3-scale` domain mapping, step constants, null-track Y, beat color-band interval calculation, reference-line path generation (`d3-shape`). Unit-test target.
- `client/src/components/tensionCurve/CurveBackdrop.tsx` (new)
  `ViewportPortal` backdrop layer: Y-axis ticks, grid lines, beat color bands, reference-curve path.
- `client/src/components/tensionCurve/TensionCurvePanel.tsx` (change)
  Keep the shell (title, anchor count, shape health-check hints, legend, reference-line toggle, viewport buttons); chart area replaces handwritten SVG with `TensionCurveFlow`; delete handwritten coordinate conversion and pointer-event code; remove the bottom “hand back to AI” button list (duty moves into NodeToolbar).

### Part 2: Consumer integration and lazy loading

- `client/src/pages/novels/components/StructuredOutlineWorkspace.tsx`, `OutlineTab.tsx` (change)
  `TensionCurvePanel` becomes `React.lazy` + `Suspense` (skeleton placeholder), ensuring `@xyflow/react` and d3 modules enter a separate chunk; prop passing is a light tweak of existing signatures (viewport-switch callback semantics from filter to focus).

### Part 3: Detail specs and tests

- Drag-value snap: default snap to multiples of 5; hold Shift to fine-tune to 1 (implemented at `TensionCurveFlow` drag conversion).
- `client/tests/` (or nearby `*.test.mjs`, per existing client test convention): `curveCoordinates` pure-function unit tests — value↔coordinate round-trip, clamp bounds, null track, beat intervals.
- Verification: client typecheck + build, confirm chunk split (visualization libraries not in the first-screen chunk); drag/zoom/Toolbar UI interaction acceptance is left to the user per project rules.

## Execution order and gates

Part 1 → 2 → 3. After Part 1, first single-point integrate and verify on the rhythm chapter-breakdown workbench, then touch the volume-skeleton page. This is a user-visible change; on completion, update release notes and the README latest-updates block.

## 2026-07 first implementation acceptance gaps and corrections

The first implementation (single-file rewrite of TensionCurvePanel.tsx) introduced React Flow + d3, but disabled pan/zoom and kept the 720×240 fixed coordinate system, so the plan core (step spread + canvas browsing) did not land; NodeToolbar, null track, beat color bands, and fitView focus were all unimplemented. Acceptance failed; corrections follow (by priority):

1. **Coordinate-system rebuild (this plan’s original Part 1 core; must do)**: `x = chapterOrder × step` (about 56px); delete the 720 fixed-width mapping; enable `panOnDrag` / `zoomOnScroll` (may restrict to horizontal only); relax `translateExtent` to actual canvas size; wire `Controls` and `MiniMap`; thin X-axis chapter labels by zoom level (whole-volume view labels every 5 chapters).
2. **Batch hand-back to AI (new; most urgent given current data pollution)**: curve toolbar adds “hand whole volume back to AI” and “hand current rhythm beat back to AI”; consumer (StructuredOutlineWorkspace) adds a batch callback that walks chapters through the existing same-value + `conflictLevelSource: "ai"` release channel; delete the bottom per-chapter button list.
3. **NodeToolbar (original plan Part 1)**: selected node shows precise numeric input + single-point hand-back to AI, replacing the button list.
4. **Independent null track (original plan Part 1)**: unset chapters go on a dedicated track below the coordinate area, no longer on the same line as 0.
5. **Legend convergence**: fold five explanation cards into a single compact legend row; explanation copy moves into hover.
6. **Beat color bands + fitView focus switching (original plan Part 1/2)**: can land with 1 or immediately after.
7. **Structure governance**: merge duplicated segment-build logic in `buildCanvasData` and `layout`; extract coordinate pure functions into `curveCoordinates.ts` and add unit tests (original plan Part 3).

### This-round correction progress

- Coordinate-system core correction done: chapter X-axis changed to fixed-step spread; React Flow enabled pan / zoom and wired Controls and MiniMap; rhythm-beat switching became view focus and no longer filters away context chapters.
- Batch hand-back to AI done: curve toolbar provides “hand whole volume back to AI” and “hand current rhythm beat back to AI”; the workbench reuses the existing same-value `conflictLevelSource: "ai"` release channel chapter by chapter.
- NodeToolbar done: after selecting a chapter node, 0–100 precise values can be typed; user-anchored points can be handed back to AI inside the node toolbar; the bottom per-chapter hand-back button list has been removed.
- Independent null track done: chapters with no intensity yet enter the “pending” track and no longer share a baseline with a true 0.
- Legend convergence done: five explanation cards became a single compact legend row; detailed explanation goes into hover.
- Structure-governance first step done: coordinate math extracted to `curveCoordinates.ts`; nodes / backdrop / legend extracted to `TensionCurveNodes.tsx`; Panel returned to an assembly layer and single-file line count fell back within the project threshold.
- Remaining: `curveCoordinates` pure-function unit tests, lazy-chunk verification, and full browser interaction acceptance still to be completed later.

## Acceptance dimensions

- **Fit**: external props contract and anchoring semantics zero change; each of the four confirmed experience problems (density, mis-hit, null/0 confusion, no precise input) has a corresponding mechanism that removes it; lazy-loading discipline matches the visualization-stack decision.
- **Completeness**: Parts 1–3 are all phase-one must-haves.
- **Risk**: focus on confirming values are written only on drag end (process does not produce anchors), read-only mode truly has no write path, beat-focus switching does not crash at 0 / 1 chapter boundaries, and introducing `@xyflow/react` styles does not pollute global CSS.

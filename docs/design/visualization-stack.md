# Frontend Visualization Stack Decision

## Background

The project already has, and will keep having, several visualization needs: tension curve (shipped; handwritten SVG still waiting for a rewrite), world map and force graph (`WorldVisualizationBoard.tsx` is currently an 836-line handwritten implementation with a custom node-crowding algorithm), knowledge graph, character relationship network, story timeline (`shared/types/timeline.ts` types are already ready), auto-director workflow step graph (the step catalog already has order/prerequisites orchestration metadata), foreshadowing-ledger dependency graph, and statistical charts for quality score / word count / RAG tracking.

Historical lesson: the first tension-curve version handwritten coordinate conversion and pointer events from scratch. At a 60-chapter scene density it lost control, was easy to mis-tap, and had no zoom. `WorldVisualizationBoard` is also reinventing graph layout. Each visualization surface is hand-rolled, so cost and defects repeat. The project also has many source-code users; every new batch of dependencies requires them to run `pnpm install` again. Dependencies must be decided in one pass and must not be introduced in multiple rounds.

## Decision

In 2026-07, introduce the following dependencies in one batch (all in `client`, lazy-loaded with feature pages, not on the first screen):

| Layer | Dependency | Responsibility |
|---|---|---|
| Canvas interaction | `@xyflow/react` (React Flow) | Interaction skeleton for every "node + edge + pan/zoom" scene: knowledge graph, world map / force graph, character relationship network, workflow step graph, foreshadowing dependency graph |
| Layout algorithm | `d3-force` | Force-directed layout (automatic arrangement of graphs and relationship networks) |
| Layout algorithm | `dagre` | Hierarchical / directed layout (workflow step graphs and foreshadowing dependency graphs that have a clear direction) |
| Chart math | `d3-scale` / `d3-shape` / `d3-array` / `d3-zoom` / `d3-selection` | Coordinate mapping, path generation, and zoom for custom interactive charts (tension curve and similar). `d3-selection` exists only as a runtime dependency of `d3-zoom` |
| Standard charts | `recharts` | Declarative statistical charts (bar / line / pie / radar): quality distribution, word-count stats, RAG tracking panels, and similar, so each stats panel is not handwritten again |

## Current Rule

1. **Rendering belongs to React**: do not use `d3-selection` to mutate the DOM directly. D3 does pure calculation only (scale/shape/force); after coordinates are computed, JSX renders them.
2. **Import D3 only by submodule**: `import { scaleLinear } from "d3-scale"`; do not install or import the whole `d3` package.
3. **Lazy-load discipline**: every visualization component enters a route-level independent chunk through `React.lazy`. First-screen bundle increment is zero.
4. **Scene placement**: node graphs → React Flow; Cartesian interactive charts → d3 math + handwritten React SVG; standard stats charts → Recharts. Do not force React Flow to do coordinate-system charts, and do not force Recharts to do custom interaction that needs drag-edit.
5. **Existing migration**: handwritten graph implementations such as `WorldVisualizationBoard` migrate to React Flow on the next substantive iteration; do not do a dedicated rewrite.

## Boundaries and Trigger Conditions (explicitly not introduced now)

- **Konva / react-konva**: re-evaluate only when map needs upgrade to "freehand polygons, pixel-level drawing tools." The current "markers + regions + edges" shape is covered by React Flow.
- **elkjs**: an upgrade when dagre layout is not enough (complex orthogonal routing, port constraints). Volume is about three times dagre; do not preinstall.
- **3D / WebGL (`three.js` and similar)**: no scene; do not preinstall.

## Failure Modes

- A new visualization need bypasses this decision and introduces another library → first map the scene against the table above; expand this document only if it is truly not covered.
- Forgetting lazy load inflates the first-screen bundle → check chunk split after build.
- Mutating the DOM with d3-selection inside a React component → it overwrites React rendering; this is an accident-style write.

## Related

- [tension-curve-plan](../plans/tension-curve-plan.md) — tension curve (the first consumer of this decision)
- `scripts/check-deps.cjs` — source-user dependency guardrail; this batch introduction is exactly the scene it is meant to cover

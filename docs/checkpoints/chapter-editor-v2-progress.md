# Chapter Editor V2 Progress

## 2026-04-10

### Delivery scope

- Finished `Chapter Editor V2` `Phase 1 + Phase 2 MVP`.
- Scope is a body-centered local AI polish editor. It does not include the issue-repair loop, cursor continuation, or semantic diff.

### Done

- Shared chapter-editor shell: added `ChapterEditorShell` with a light top bar, light left context, central body editor, and an on-demand right-hand diff panel, hosted on the standalone `NovelChapterEdit` page.
- Entry relationship corrected: `ChapterManagementTab` stays the workspace entry; standalone `NovelChapterEdit` hosts this round’s chapter polish.
- Plate body editing: the old `textarea` moved to Plate, with body editing, selection listening, save state, and word count.
- Selection AI rewrite: six operations — polish wording / expand / tighten / strengthen emotion / strengthen conflict / custom instruction.
- Candidate diff: backend always returns `2-3` candidate versions; frontend supports inline diff, candidate switching, reject, regenerate, and accept.
- Safety snapshot: create a `novel snapshot` before accepting a candidate, label `chapter-editor:{chapterOrder}:{operation}:{timestamp}`, then update chapter body.
- Prompt governance: added `novel.chapter_editor.rewrite_candidates@v1` through Prompt Registry. Do not inline a business prompt in the service.
- Backend contract: added `POST /novels/:id/chapters/:chapterId/editor/rewrite-preview`; shared types already match the request/response shape.

### Acceptance

- Passed `pnpm typecheck`.
- Passed `pnpm --filter @ai-novel/client build`.
- Passed `node --test tests/chapterEditorPreview.test.js`.
- Passed `node --test tests/prompting-governance.test.js`.
- The main loop works: `select body -> request AI rewrite -> inspect 2-3 candidate diffs -> accept or reject`, with a snapshot before accept.

### Leftover

- Issue repair is still an entry and placeholder. It is not yet a “locate -> suggest -> diff -> accept -> close” loop.
- Version entry still jumps to the existing history page. It is not yet an in-editor version drawer.
- Cursor continuation, block-level diff, semantic diff, and partial accept are out of this round.
- The frontend has no independent test runner. This round did not add interaction automation.

### Next-phase entry

- `Phase 3`: issue locate-and-repair loop, in-chapter version drawer, and issue-close linkage.
- `Phase 4`: cursor continuation, block-level / semantic diff, partial accept, finer rollback.
- Later chapter-editor rounds keep appending checkpoints to this file. Do not open a new document.

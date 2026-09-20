# Chapter Editor V2 Redesign Plan

## This-round delivery progress

### Done

- Landed a shared `ChapterEditorShell` for `Phase 1 + Phase 2 MVP`, and closed it onto the independent prose-centered editor page `NovelChapterEdit`; `ChapterManagementTab` remains the workbench entry.
- Switched the prose editing base to Plate, supporting prose editing, selection listening, save status, word count, and pending-confirmation AI sessions.
- Added the chapter-editor-specific preview API `POST /novels/:id/chapters/:chapterId/editor/rewrite-preview`; request/response contract is frozen in shared types.
- Added `novel.chapter_editor.rewrite_candidates@v1` PromptAsset and registered it in `server/src/prompting/registry.ts`.
- Opened the first selection-rewrite loop: `Polish / Expand / Compress / Strengthen emotion / Strengthen conflict / Custom instruction`, returning `2-3` candidate versions and writer-friendly inline diffs.
- Implemented `Accept all / Reject all / Regenerate / Switch candidate`, and before accept it first calls the existing novel snapshot then updates chapter prose.

### In progress

- The issue list currently remains in the header / light side area as an entry and placeholder, but has not yet entered the full repair loop of “locate -> suggest -> diff -> accept -> close.”
- The version entry is wired to jump to the existing history page, but has not yet become an independent version drawer inside the chapter editor.
- The frontend repo currently has no independent test runner; this round uses typecheck and production build as the client-side verification baseline.

### Deferred to later phases

- `Phase 3`: issue-fix preview, in-editor version drawer, issue locate-and-close loop.
- `Phase 4`: cursor continue-writing, block-level diff, semantic diff, partial accept, finer-grained rollback.
- Existing independent style-rewrite capability is not yet merged into the first-version selection main chain; it remains a later parallel item.

### This-round verification

- `pnpm typecheck`
- `pnpm --filter @ai-novel/client build`
- `node --test tests/chapterEditorPreview.test.js`
- `node --test tests/prompting-governance.test.js`

## 1. Background

The current repository already has three capabilities strongly related to chapter editing, but they have not yet converged into one product loop:

- `NovelEdit -> ChapterManagementTab` is still the chapter execution workbench, using a three-column structure of “chapter queue + prose result area + AI execution desk,” suitable for batch execution, review, and repair entry.
- The independent chapter page `NovelChapterEdit.tsx` has already been upgraded into a prose-centered local AI polish editor, carrying the real prose-editing and selection-rewrite loop.
- `AiRevisionWorkspace.tsx`, `NovelDraftOptimizeService.ts`, and `draftOptimize.prompts.ts` already provide a generic “selection preview optimize + apply preview” pattern, but currently only serve outline and structured outline, not chapter prose.

The conclusion is not “build a chapter editor from zero.” It is:

> Existing infrastructure is already enough to support V2, but chapter capability is scattered across different pages, different prompts, and different interaction paradigms, so users never enter a true “prose-centered local AI polish editor.”

## 2. Current Assessment

### 2.1 Existing frontend structure

- `NovelEdit.tsx` is the main workflow entry. The chapter execution workbench still hangs on `ChapterManagementTab.tsx`, while the prose-polish editor is independently owned by `NovelChapterEdit.tsx`.
- `ChapterManagementTab.tsx` currently splits the chapter page into three columns:
  - left `ChapterExecutionQueueCard`
  - center `ChapterExecutionResultPanel`
  - right `ChapterExecutionActionPanel`
- The independent chapter page `NovelChapterEdit.tsx` now directly owns save, style rewrite, AI rewrite candidates, and diff confirmation. Prose editing has already switched to Plate.
- Several related files are already close to a state where more logic should not be stacked:
  - `NovelChapterEdit.tsx`: 485 lines
  - `ChapterExecutionResultPanel.tsx`: 419 lines
  - `ChapterRuntimePanels.tsx`: 328 lines
  - `ChapterExecutionActionPanel.tsx`: 321 lines
  - `useChapterExecutionActions.ts`: 275 lines

That means V2 cannot keep stacking “selection toolbar, diff, candidate session, issue navigation, ghost text, version drawer” directly into existing components. It must extract a new editor shell and submodules.

### 2.2 Existing backend foundation

The backend already has the following capabilities, which can be reused as the Chapter Editor V2 base:

- Chapter generation and runtime:
  - `POST /novels/:id/chapters/:chapterId/runtime/run`
  - `POST /novels/:id/chapters/:chapterId/generate`
- Chapter review, audit, and repair:
  - `POST /novels/:id/chapters/:chapterId/review`
  - `POST /novels/:id/chapters/:chapterId/audit/:scope`
  - `GET /novels/:id/chapters/:chapterId/audit-reports`
  - `POST /novels/:id/chapters/:chapterId/repair`
- Chapter context and later planning:
  - `GET /novels/:id/chapters/:chapterId/plan`
  - `POST /novels/:id/chapters/:chapterId/plan/generate`
  - `GET /novels/:id/chapters/:chapterId/state-snapshot`
  - `POST /novels/:id/replan`
- Style check and style rewrite:
  - `POST /style-detection/check`
  - `POST /style-detection/rewrite`
- Version safety:
  - existing novel-level snapshot: `list/create/restoreNovelSnapshot`
- Prompt governance foundation:
  - existing `PromptAsset`, `registry.ts`
  - existing `novel.draft_optimize.selection/full`
  - existing `novel.chapter.writer`, `novel.review.chapter`, `novel.review.repair`

### 2.3 Current gaps

What V2 needs to add is not “a large all-in-one chapter system,” but these missing links:

- No true prose-centered layout; the chapter main view is still biased toward an “execution desk.”
- No selection-level AI toolbar.
- No candidate-version and diff-confirmation state.
- No chapter-prose-specific local rewrite prompt / route / session.
- Issue repair is not yet an in-editor loop of “locate -> suggest -> diff -> accept -> close.”
- No chapter-level snapshot semantics; only novel-level snapshot.
- Cursor continue-writing does not exist; the current approach is still whole-chapter generate / whole-chapter repair.

## 3. Product Direction

### 3.1 What the chapter editor owns

- Read and edit current chapter prose.
- Local AI rewrite of selected content.
- Local continue-writing preview at the cursor.
- Handle the current chapter’s audit issues, repair suggestions, and accept confirmation.
- Provide reliable enough snapshot and rollback to lower the user’s psychological cost of using AI.

### 3.2 What the chapter editor does not own

- The main entry for generating a whole chapter from zero.
- Overall chapter-flow status control.
- Complex chapter-queue management.
- Macro director-style flow recommendations.

Those stay in `NovelEdit` workflow and the chapter execution layer, and are not stuffed back into the editor main view.

### 3.3 Final product positioning

> The goal of Chapter Editor V2 is not “a more complex chapter workbench,” but “a prose-centered local AI polish editor.”

## 4. Recommended Landing Point

### 4.1 Main-entry choice

Recommend independent `NovelChapterEdit` as V2’s main prose-editing entry, instead of stuffing the chapter editor back into the three-column execution desk of `ChapterManagementTab`.

Reasons:

- The user’s current main workflow is already in `NovelEdit`.
- Left chapter queue, chapter selection, chapter context, and pipeline status already hang here.
- What V2 most needs to change is the center prose area and the right-side AI behavior, not a new route.

### 4.2 Role of the independent chapter page

`/novels/:id/chapters/:chapterId` remains, but should become an “immersive chapter-editing entry” that shares the same editor components with the main workflow, instead of continuing to maintain its own old-style three-column page.

Suggested strategy:

- Upgrade `NovelChapterEdit` to `ChapterEditorShell`
- `ChapterManagementTab` continues to keep the original chapter execution workbench and an “Open chapter editor” entry
- The editor body only maintains the in-chapter loop
- The editor itself only maintains the in-chapter loop

## 5. Information Architecture

### 5.1 Page structure

Recommended V2 structure:

- Top light control bar
- Left light context panel
- Center prose editor main area
- Right AI-result drawer that expands on demand
- Floating AI interaction layer at selection / cursor

### 5.2 Top light control bar

Keep:

- chapter title
- word count
- save status
- current writing-style asset
- issue count
- version entry
- back to chapter execution page
- save / revise mode / more actions

Do not keep:

- long process explanations
- large recommended flows
- stacked batch-execution entries

### 5.3 Left light context panel

Keep only content that directly helps current writing:

- this chapter’s goal
- this chapter’s summary
- adjacent-chapter summaries
- current character state
- must-hit points
- worldbuilding-constraint summary

Default to a narrow column or collapsed; do not occupy prose width long-term.

### 5.4 Center prose editing area

This is the only protagonist. It carries:

- prose reading and editing
- selection listening
- cursor listening
- issue highlight
- diff preview
- accept / reject
- ghost text

### 5.5 Right result drawer

Collapsed by default. Appears only when:

- AI is generating a preview
- showing candidate versions
- showing diff details
- showing issue-fix suggestions
- showing change notes

### 5.6 Floating AI layer

This is V2’s core new interaction.

After selecting content, show:

- Polish expression
- Expand detail
- Compress
- Strengthen emotion
- Strengthen conflict
- Rewrite style
- Reduce AI flavor
- Custom instruction

When the cursor is at paragraph end or in an empty paragraph, show:

- Continue writing the next paragraph
- Generate a transition paragraph
- Add dialogue
- Add environment description
- Add interiority
- Advance conflict

## 6. Interaction Loop

```mermaid
flowchart LR
  A["Select text / locate issue / place cursor"] --> B["Start AI operation"]
  B --> C["Generate 2-3 candidate versions"]
  C --> D["Default to inline diff"]
  D --> E["Accept / Reject / Regenerate"]
  E --> F["Auto snapshot before accept"]
  F --> G["Apply to prose and refresh issue status"]
```

### 6.1 First-version must-have loop

Phase one must open these actions:

- select content
- start AI rewrite
- return 2 to 3 candidates
- show inline diff
- accept all
- reject all
- regenerate
- auto snapshot before AI accept

### 6.2 Second-phase loop

- click issue to jump
- issue-fix preview
- cursor continue-writing ghost text
- block-level diff view
- change notes

### 6.3 Third-phase loop

- partial accept
- semantic diff
- multi-style comparison
- finer-grained rollback

## 7. Module Split

Suggested new or extracted modules:

- `ChapterEditorShell`
  - page shell, layout orchestration, mode switching, drawer open/close
- `ChapterEditorHeader`
  - title, word count, save status, issue count, version entry
- `ChapterContextSidebar`
  - this-chapter goal, context, character state, constraints
- `ChapterTextEditor`
  - Plate-based prose editor, selection and cursor listening, issue highlight, ghost text
- `SelectionAIFloatingToolbar`
  - selection intent actions
- `CursorAIFloatingToolbar`
  - cursor continue-writing actions
- `ChapterAIDiffDrawer`
  - candidates, diff, accept/reject/regenerate, notes
- `ChapterIssueNavigator`
  - issue list, locate, status
- `ChapterVersionDrawer`
  - snapshot list, rollback entry

Suggested new hooks:

- `useChapterEditorState`
- `useChapterEditorSession`
- `useChapterEditorDiff`
- `useChapterIssueNavigation`
- `useChapterEditorSnapshots`

Suggested new shared model:

- `chapterEditor.types.ts`
- `chapterEditorDiff.ts`
- `chapterEditorSession.ts`

## 8. State Design

Keep “prose state” and “AI session state” separate.

```ts
type ChapterEditorMode = "edit" | "revise";

type ChapterSelection = {
  from: number;
  to: number;
  text: string;
} | null;

type ChapterEditorState = {
  chapterId: string;
  title: string;
  content: string;
  savedContent: string;
  mode: ChapterEditorMode;
  wordCount: number;
  saveStatus: "idle" | "saving" | "saved" | "error";
  selectedRange: ChapterSelection;
  activeIssueId: string | null;
};

type ChapterEditorOperation =
  | "polish"
  | "expand"
  | "compress"
  | "emotion"
  | "conflict"
  | "styleRewrite"
  | "antiAiTone"
  | "custom"
  | "continueWriting"
  | "issueFix";

type DiffChunk = {
  id: string;
  type: "equal" | "insert" | "delete";
  text: string;
};

type AICandidate = {
  id: string;
  label: string;
  content: string;
  summary?: string;
  semanticTags?: string[];
  diffChunks: DiffChunk[];
};

type ChapterEditorSession = {
  sessionId: string;
  operation: ChapterEditorOperation;
  targetRange: {
    from: number;
    to: number;
    originalText: string;
  } | null;
  customInstruction?: string;
  status: "idle" | "loading" | "streaming" | "ready" | "error";
  candidates: AICandidate[];
  activeCandidateId: string | null;
  viewMode: "inline" | "block";
};
```

## 9. AI and Backend Boundaries

### 9.1 In-editor AI only handles three task types

- Local rewrite: input selected content and context
- Local continue-writing: input near-cursor context
- Issue fix: input the issue-related paragraph and issue description

### 9.2 Things not done in the editor

- Generate a whole chapter from zero
- Generate large execution plans
- Recommend whole-chapter flow advancement
- Queue batch processing

### 9.3 Prompt governance requirements

All new capability must go through `server/src/prompting/`:

- Do not inline `systemPrompt/userPrompt` in services
- Do not replace AI intent understanding with keyword matching
- Prompts must enter the registry as new `PromptAsset`s

Suggested new prompt family:

- `server/src/prompting/prompts/novel/chapterEditor/`

Suggested new prompt assets:

- `novel.chapter_editor.rewrite_candidates@v1`
- `novel.chapter_editor.continue_preview@v1`
- `novel.chapter_editor.issue_fix_preview@v1`
- `novel.chapter_editor.change_explain@v1`

### 9.4 Suggested new APIs

Add chapter-editor-specific preview APIs instead of continuing to reuse whole-chapter repair:

- `POST /novels/:id/chapters/:chapterId/editor/rewrite-preview`
- `POST /novels/:id/chapters/:chapterId/editor/continue-preview`
- `POST /novels/:id/chapters/:chapterId/editor/issues/:issueId/fix-preview`

Return a unified shape:

- `sessionId`
- `operation`
- `targetRange`
- `candidates`
- `activeCandidateId`

Notes:

- First-version preview results can stay fully out of the database. Chapter content is updated only on “accept.”
- First-version accept does not necessarily need an independent session persistence table. The client can patch from the current active candidate, then call `updateNovelChapter`.
- Phase two can consider persistent `ChapterEditorSession` / `ChapterEditorSnapshot`.

## 10. Diff Plan

### 10.1 First-version default: writer-friendly inline diff

Reasons:

- The most common chapter edits are local polish, compress, expand, strengthen conflict, strengthen emotion.
- Those changes fit a gentle inline revision experience better than code-style red/green blocks.

Implementation suggestion:

- Insert: light green background
- Delete: light red background + strikethrough
- Replace: delete + insert combination

### 10.2 Phase-two addition: block-level diff

Fits:

- whole-paragraph rewrite
- style rewrite
- person conversion
- large expansion

Provide a switch at the top of the drawer:

- immersive view
- comparison view

### 10.3 Phase-three enhancement: semantic diff

Show not only “what changed,” but also:

- strengthened emotional expression
- added action detail
- improved visual sense
- compressed repeated narration
- weakened templated expression

## 11. Version and Snapshot Strategy

### 11.1 Practical constraint

The repository already has novel-level snapshot and no chapter-level snapshot.

That means V2 first version should not wait for a brand-new chapter version system to finish before landing.

### 11.2 Suggested strategy

Phase 1:

- Before AI accept, first call the existing novel snapshot
- Label includes chapter information, for example `chapter-editor:{chapterOrder}:{operation}:{timestamp}`
- At least guarantee the user always has a safety net before accepting an AI rewrite

Phase 2:

- Add chapter-editor snapshot metadata
- In the UI, filter by chapter and show “manual save / before AI accept / before issue fix”

Phase 3:

- If necessary, then introduce a chapter-level snapshot table so rollback granularity is not too large

## 12. Issue-Fix Mode

Treat the issue list as “navigation,” not a “right-side report center.”

Issue handling chain:

- click issue
- prose jumps to the corresponding paragraph
- highlight the issue area
- call issue fix preview
- show diff
- user accepts or rejects
- after accept, call `resolveAuditIssue`

First-version locate strategy can start with:

- text-match `evidence` or `excerpt` from `AuditReport`/`ReviewIssue`
- on match failure, degrade to jumping to the most related paragraph and showing “approximate locate”

Do not force a complex anchor system for the first version.

## 13. Reuse Strategy

V2 should not rewrite everything from zero. Reuse:

- Reuse `ChapterManagementTab` as the chapter execution workbench entry
- Reuse the `NovelChapterEdit` route as the immersive prose-editing entry
- Reuse `AiRevisionWorkspace` selection-optimize interaction, but upgrade it into chapter-prose-editor-specific components
- Reuse `NovelDraftOptimizeService` preview thinking, but extend it into a chapter-editor-specific service
- Reuse existing `style detection/rewrite` as an aid for style check and “reduce AI flavor,” not as the main path for chapter local rewrite
- Reuse existing `chapter plan`, `state snapshot`, `audit reports`, `replan` as context and issue sources

## 14. Phased Plan

### Phase 1: Editor-shell convergence

Goals:

- Unify the chapter-editing entry
- Raise the prose main area
- Demote context and action areas to light side areas

Outputs:

- `ChapterEditorShell`
- Shared immersive chapter-editing entry
- Transition from `textarea` to an editor that can listen to selection/cursor
- Center prose area becomes the default main view

Acceptance:

- After entering the chapter page, the first visual is prose, not an operations desk
- Main workflow and independent route share the same editor shell

### Phase 2: Local AI rewrite loop

Goals:

- selection toolbar
- candidate versions
- inline diff
- accept / reject / regenerate

Outputs:

- selection-action toolbar
- rewrite preview API
- chapter editor prompt assets
- diff drawer
- auto snapshot before accept

Acceptance:

- Users can complete “select -> rewrite -> confirm accept” within 3 steps
- AI rewrite does not overwrite prose directly

### Phase 3: Issue fix and version safety

Goals:

- issue locate
- issue fix preview
- version safety

Outputs:

- `ChapterIssueNavigator`
- fix-preview loop
- chapter-level version display entry

Acceptance:

- Issues can one-click jump to prose
- After accepting a fix, issue status can close

### Phase 4: Cursor continue-writing and differentiated capability

Goals:

- local continue-writing
- block-level diff
- change notes
- partial accept

Outputs:

- cursor preview
- ghost text
- block diff
- semantic tags

Acceptance:

- Users can treat the chapter editor as the long-term writing and revision home, not a temporary patch page

## 15. Risks and Constraints

### 15.1 Largest risks

- Continuing to stack new logic into existing large files, contaminating editor and execution desk with each other.
- Directly reusing whole-chapter repair as local rewrite, making behavior too heavy and replacement range too large.
- Allowing AI to change prose directly without snapshot protection, so users quickly lose trust.

### 15.2 Explicit constraints

- Do not add macro director-style flow UI inside the chapter editor.
- Do not add keyword-fallback routing.
- Do not write unregistered prompts directly in services.
- Split modules before a single file exceeds 700 lines; the 500-to-700 range should also actively avoid further expansion.

## 16. Acceptance Checklist

- After entering the chapter editor, the prose main area occupies the absolute visual center.
- Selecting prose can pop an AI toolbar.
- At least 5 local rewrite intents are available.
- Each rewrite returns 2 to 3 candidates.
- Inline diff is shown by default.
- Users can accept, reject, and regenerate.
- A snapshot is created automatically before AI accept.
- Audit issues can be located in prose and enter fix preview.
- Independent chapter page and main-workflow chapter page share one set of editor components and no longer maintain two logics.

## 17. Final Conclusion

The most suitable redesign for the current repository is not to start a “larger chapter system,” but to gather existing chapter execution, prose editing, local AI preview, audit repair, and snapshot protection into one in-chapter loop.

The end goal can converge to one sentence:

> Chapter Editor V2 = a prose-centered local AI polish editor.

# Beginner-first full-novel completion

## Background

The project’s primary users are complete writing beginners. They usually do not know how to design structure, pacing, character arcs, setups, volume outlines, or chapter mission lists. The product must not assume users can manually repair long-form structure, and it must not throw complex professional judgment at them.

The product goal is therefore not a pile of isolated writing tools. It is to help users move from a vague idea all the way to a finished novel.

## Decision

Every product, UX, prompt, agent, and runtime decision prefers helping a beginner finish a whole novel. When expert flexibility conflicts with beginner completion rate, choose the option that lowers cognitive load, supplies strong defaults, and makes the next step explicit.

AI owns planning, judgment, scheduling, execution, tracking, and repair advice. Deterministic code owns safety, idempotency, input validation, permissions, state persistence, and post-processing of already-structured output.

## Current Rule

- Key pages should tell the user how far they have come, what the next step is, why that step is recommended, and which range a risk affects.
- The home top is a daily continue-writing entry, not a task monitor. The first screen should center the current work, a single recommended action, and the whole-book creation journey, reusing structured task stages and real progress. Global failure records drop to creation reminders and runtime records. They must not occupy home’s core metrics for long.
- First-run setup should first answer “can the system run?”, then enter creation teaching. Quick setup exposes only required items: provider, API key / API URL, and a text model. Mark the creation environment ready only after both ordinary text and structured output work.
- First-book guidance must read real model, Auto-Director, novel, and chapter state. Frontend local storage may only record whether a situational tip was dismissed. It must not save or fake milestone completion.
- The first-book main path stays fixed around “creation environment, idea and direction, opening prep, first-chapter draft”. After direction is confirmed, default to starting fast auto-creation. Production method is not a new-book opening gate. Fine control waits until the user needs the professional workspace. A readable first-chapter draft is beginner graduation. Do not keep the guide tracking whole-book completion so long that stage achievement disappears.

- Fast start does not mean omitting creation evidence. It means putting only the materials the first chapter will actually read on the sync path. Users should see prose progress first. Full world, supporting-character materials, and far-horizon planning can be completed after chapter one as needed. Background enrichment must not compete with prose for priority, and must not make the whole book look failed because enrichment failed.
- Users may browse existing content before quick setup is finished, but any AI write action should return to the setup wizard first. Returning users who already have a working configuration must not be interrupted by the first-run popup.
- Auto-Director, chapter production, and Creative Hub should stay on the whole-book completion chain. Do not add complex branches that do not help that chain.
- The theme system defaults to follow-system, light, and dark, and treats color and UI density as low-risk local preferences. Theme settings must not change novel content, task state, or the beginner main flow.
- Workspace stage, execution, and completion states should use theme semantic colors or transparent status overlays. Do not express status with a fixed light background, or dark theme will show large bright patches and break hierarchy. Status color only distinguishes semantics. Titles and body copy still inherit the theme text color.
- The unified creation entry should first catch the user’s natural language, then let AI recommend short or long form and the reason. When the recommendation is accepted, the path from idea to production keeps only two required actions: submit the idea, confirm the direction.
- Main create areas should show “Auto-Director writes a long novel” and “create a short story” side by side, so users who already know the work’s scale can enter the matching path. The short-story entry passes a structured scale preference. It does not infer intent from copy keywords.
- The creation-entry first screen should have a single visual focus: the title explains the result, the creation canvas takes input, and one primary button generates direction. Full settings, back, and other paths use low-emphasis entries and must not compete with “write the idea”.
- Work form and target length can be adjusted, but after an adjustment AI must re-adapt the creation direction. Do not ask a beginner to patch contradictions between structure and scale.
- Target platform is a reader-experience setting. AI recommends it and explains why. The user can accept or switch. Platform choice must enter planning, prose, review, and repair context. It must not stay only on the create form. Reader channels such as male-oriented / female-oriented cannot replace a concrete platform writing profile.
- Short-story studio defaults to continuous draft, revision input, direct edit, and export. Internal segments, quality debt, and runtime detail stay collapsed unless the user needs diagnosis.
- Desktop production workspaces should use the full width outside the sidebar. Do not create double empty margins with “an outer centered narrow container plus a second content max-width”. Control long-text line length with a useful revision, materials, or navigation column, not by leaving both sides of the screen empty. On a narrow screen, fold auxiliary regions under the prose.
- Product defaults should let a beginner keep moving. Advanced options must not block the basic flow.
- Reader-channel preference inside Auto-Director is an AI context hint, not a deterministic routing rule. By default AI should judge from genre, selling points, and the starting idea.
- Idea helpers that face a blank input stay loosely coupled: they may temporarily generate reference text to break a blank page, but they must not write into the project, tasks, Auto-Director seed payload, or any long-lived asset unless the user explicitly copies or pastes.
- The external world library should present reusable world samples, not raw field forms. List cards should lead with world summary, core-rule count, faction count, location count, relation count, and the rules, stages, and conflict cues a novel can extract.
- The external world workspace overview should show a world handbook. It should first answer what this world is, which rules must be obeyed, which factions drive conflict, where stories happen, and which tensions a novel can extract. Field-level editing stays on the structured setting page and must not occupy the overview entry.
- In-novel world should present as “this book’s world handbook”, helping the user see which world this book is using, where it came from, whether it can sync, and which rules enter the generation chain.
- On the novel page, “This book’s world” owns creating, importing, generating, and syncing the novel-world copy. “World boundary for this book” only confirms which rules, factions, and locations this book will actually use. Both entries must not be written as “bind a world view”, or beginners cannot tell external samples, this-book copies, and generation-chain cropping apart.
- This-book world should offer three low-load paths: import from the world library, generate from this book’s theme, or customize this book’s world. The custom path creates a minimal world handbook and does not require filling complex fields first.
- When generating from this book’s theme or creating a custom this-book world, also create a world-library sample by default and establish two-way sync with this book. Later updates need an explicit user-initiated sync, so the background never silently overwrites the world library. List display should reflect the world this book actually uses. Old bind fields or cache delay must not show it as unbound.
- The old `worldId` dropdown is only a compatibility field or a quick Auto-Director reference. The user-facing world-management entry must be “This book’s world”. Later features must not keep expanding the old dropdown into a world-management center.
- World maps, faction graphs, timelines, and power-system diagrams should appear as world assets beside the world handbook. Their job is to help beginners see the world, not to require understanding data-table fields first.
- World-asset entries may first appear as “to be generated”, but copy must say how the asset helps organize regions, faction relations, and power boundaries. Do not show only a technical Coming Soon.
- After failure, provide a recoverable path, a local impact range, and a next-step suggestion. Do not only show an error.
- UI copy explains the function and next step from the user’s point of view. It does not narrate implementation migrations, architecture changes, or “what we changed”.
- Quality judgment, next-step recommendation, and repair paths go through AI-first structured understanding.
- Visual edits that will affect later AI planning should default to a read-only understanding layer plus an explicit edit layer. For example, the tension curve on the workspace and volume-strategy pages only shows current shape, anchor state, reference lines, and shape hints. Drag, single-point / batch hand-back to AI, and chapter-detail comparison belong in an edit dialog the user opens on purpose.
- A write-capable edit layer must give enough narrative context before the user adjusts numbers. Tension-curve editing should show volume positioning, the current pacing-segment summary, must-deliver items, and the selected chapter summary, so beginners do not decide around isolated numbers.
- Auto-Director new-book create should be progressive but not forcibly linear. The first screen asks only for a starting idea, designed as a quiet opening question rather than form page one. Later screens expand director start settings, world and writing style, model and run mode, and direction candidates. Confirmed stages collapse into clickable summaries for revision. Experienced users may generate direction with defaults right after the starting idea.
- Inspiration references on the Auto-Director first screen appear only as on-demand help. The default visual center must be the starting-idea input. Inspiration samples must not steal hierarchy from the main input with large cards, dense borders, or multi-column narrow rows.
- Stage summaries in this kind of staged create flow should use a light progress track or compact summary. Do not make every stage an equal-weight card. Stage summaries exist to locate and revise, not to compete with the current stage.
- Later Auto-Director setting stages should keep a stage-confirm mind, not a form-page mind. World-and-style and model-and-run may show necessary options, but grouping should rely on titles, explanations, spacing, and light backgrounds. Only mutually exclusive decisions use choice blocks. Do not wrap every explanation in a bordered card.
- The low-border hierarchy applies to the whole client, not only Auto-Director. Ordinary content areas default to typography, spacing, alignment, light backgrounds, and separators. Only inputs, selection, focus, risk state, table edges, and floating layers need a clear border. Base Card/Surface has no visible border or shadow by default. Product pages must not build hierarchy with nested borders.
- Book-analysis character dossiers are a character-understanding surface. They should lead with role, motive, need, speech, growth, and key scenes. Identify-character, generate-depth, dimension choice, manual supplement, likeness scan, and image assets are on-demand maintenance and should fold behind a clear entry. Generation controls must not occupy the dossier first screen for long, and every text field must not become an equal-weight form card.
- Title workshop should help beginners compare naming directions, not show a generic result table. Generate-from-novel, free brief, and reference adaptation are three input paths. Primary navigation only separates generate from the title library. Candidates should lead with title, naming strategy, potential, and reason, then copy, adopt, and save-to-library as clear follow-up actions. The candidate component may stay a list in compact novel-create scenes. The independent workshop and title library use comparison cards that are easier to scan sideways.

## Examples

Recommended:

- The Auto-Director panel shows the current stage, waiting confirm points, auto-approvable items, and write scope.
- Home shows a compact first-book progress before the first chapter is done, sharing the same server projection as the creation wizard. After the first chapter, home returns to the ordinary project workspace.
- Idea input, direction choice, opening prep, production-method handoff, and the simple chapter bookshelf may show one-time situational tips. Tips only explain the current decision and next step. They do not own flow state.
- The Auto-Director create page lets the user write one sentence of inspiration, then confirm a few high-impact settings. Reader channel, narrative point of view, pacing, emotional density, world handling, writing assets, and run mode all have defaults. The user must not need a full novel-planning education first.
- The starting-idea page may offer “no idea? look at a few openings”, but inspiration should appear as a horizontal readable row list. After a choice, fill the input and keep it editable. Do not make the user read a set of heavy recommendation cards first.
- The director start-settings page should put “confirm the feel” at title level, and organize form fields with light backgrounds and spacing. Book-level framing can be a light group on the same stage. It should not become cards inside cards.
- The world-and-style page should treat “choose a reference world sample” and “confirm this book’s writing style” as low-pressure confirms: if a sample exists, show how it will enter director context; if not, offer a clear choice between “auto-organize this book’s world” and “do not use a world view yet”. The model-and-run page should emphasize this is the last confirm before launch. Run-mode choice sits closer to the main decision than model explanation.
- Chapter execution shows distinct states such as “prose readable”, “assets feeding back”, and “ledger calibrating”, so users look at prose first and then background sync.
- When Creative Hub answers novel progress, it first states real artifact progress, then background-task status and the recommended next step.
- World-library cards show “power and rules”, “faction stage”, “where stories happen”, and “extractable conflict lines”, so beginners first judge whether the world can support a novel, then enter the workspace to edit detail.
- The world-workspace overview shows “power and rules”, “main factions”, “story stage”, “key tensions”, and “prefer these when generating the novel”, so users treat the world as a story environment rather than a database-field checklist.
- The novel-page this-book-world card shows source, generation-chain, and sync status, so the user knows where the current world came from, whether it enters character / outline / chapter generation, and whether it will manually sync with the world library.
- The this-book-world card also offers “import from world library”, “customize this book’s world”, and “generate this book’s world”, so the user first establishes this-book copy, then gradually completes the handbook and boundary.
- Beside the this-book world handbook, show world-asset entries such as world map, faction graph, world timeline, and power-system tree, with a short explanation of which understanding problem each asset solves.
- Old world-selection copy in basic info and Auto-Director should say “world sample” or “reference world”, and point complete import, generate, and sync to “This book’s world”.
- On the pacing / chapter-split workspace, the tension-curve main view only explains the result. If the user wants to change intensity, they enter the edit dialog and drag or hand back to AI beside volume positioning, pacing-segment delivery, and chapter summaries.
- Genre bases and advancement modes both have hierarchy. Reuse compact tree navigation and keep node explanation in an independent detail pane. Genre detail emphasizes classification and related works. Advancement-mode detail emphasizes core drive, reader payoff, advancement unit, conflict boundary, and how payoff is delivered. Sharing a tree shell must not erase the semantic difference between the two resources.

Forbidden:

- Asking a beginner to decide whether to replan, repair a chapter, rerun characters, or change the world view.
- Showing internal refactors, migrations, or historical implementation narration as product copy.
- Expanding Creative Hub into a general chat tool that does not advance novel completion.
- Stacking long geography, culture, religion, economy, and history fields on the world-library list, forcing users to understand a world as if they were reviewing a spreadsheet.
- Repeating the structured setting page’s forms and long-text editors on the world-workspace overview, so users cannot tell “understand the world” from “maintain fields”.
- Keeping “bind a world view” as the novel-page main entry, mixing external world-library samples, this-book world copies, and `StoryWorldSlice` crop results into one concept.
- Writing “world view unbound” in generation-injection hints, which makes users think they cannot generate without the old dropdown. The correct expression is “no usable this-book world context; generation will proceed from novel basic info first”.

## The creation base must be explicit, without requiring a beginner to configure it by hand

### Background

The genre base decides which experience the work must keep delivering. The advancement mode decides how conflict, payoff, and escalation cycle. If both are only optional tags in a resource library, prose generation easily falls back to generic writing. If they become required dropdowns at opening, the user must understand professional concepts before seeing a direction.

### Decision

A new work must resolve “genre base + primary advancement mode” before formal planning and production. Secondary advancement modes stay optional. “Required” means the system contract must have a value, not that the user must choose by hand. By default AI recommends from creative intent and explains why. When the user chooses explicitly, the system keeps that choice and only fills missing items.

### Current Rule

- The unified creation entry, Auto-Director, and ordinary opening must all resolve the creation base before creating the work.
- AI recommendation must use a registered structured prompt. Genre keywords, regex, or handwritten routing fallbacks are not allowed.
- Auto-Director candidates should show a short base conclusion, without adding a blocking professional configuration step.
- The same base contract must run through direction planning, long-form chapter prose, short-story plan and prose, review, and repair. It must not only be written as novel tags.
- The genre base supplies genre promise, core contradiction, and forbidden zones. The advancement mode supplies the advancement loop, payoff structure, chapter unit, and conflict ceiling. Prose generation needs the full contract, not only the name.
- If AI cannot give a legal recommendation, show a recoverable retry or let the user choose. Do not silently create a new work that lacks a primary advancement mode.
- Do not silently backfill old novels in bulk, and do not rewrite existing prose. Fill the gap explicitly the next time the user enters a related production flow.

### Failure Modes

- The novel record has genre and mode IDs, but the chapter prompt has no matching context: the list shows a selection, and the prose is still generic.
- The candidate stage recommended a base, then the confirm API dropped the fields: the candidate page is visible, and the created novel re-recommends or becomes empty.
- Asking the user to understand every mode before opening a book: more jargon, lower beginner completion.
- Adding a keyword fallback to avoid AI failure: the same intent yields unstable, unexplainable results under different wording.

## Novel-list bookshelf and workspace boundary

### Background

When the novel list carries both browsing works and managing production tasks, users mix “find and continue a book” with “handle background tasks”. Beginner-first needs a stable work entry. Production-chain detail stays in the workspace.

### Decision

The novel list provides Bookshelf and Workspace views. Bookshelf leads with cover, title, blurb, completion, and next action. Workspace keeps showing Auto-Director, recovery, review, and production status. Both views share novel and task projections. They do not create a second set of work data.

### Current Rule

- First visit to the novel list uses Bookshelf, then remembers the last choice. A view parameter in the URL outranks local memory.
- Bookshelf covers read only the primary cover from `novel_cover` image assets. Do not redundantly write a cover URL onto `Novel`.
- With no primary cover, show a stable placeholder. Do not auto-batch generate. After the user clicks the generate entry, reuse the existing cover dialog and asset library.
- Bookshelf must not show tokens, checkpoints, internal segments, task IDs, or Auto-Director stage names.
- After cover generation completes, the primary cover switches, or the primary cover is deleted, refresh both cover assets and the novel-list projection.

## Immersive reading boundary for novel preview

### Background

When a user opens a work from the bookshelf, the goal is continuous reading and judging prose quality, not handling project settings or production tasks. Keeping global navigation, workspace actions, and persistent diagnostics turns the reading page back into an admin surface and also compresses readable prose width.

### Decision

Novel preview uses an independent reading shell and does not show the app global navigation. The left position is the chapter table of contents. Prose is the only primary visual. Edit, copy, and enter workspace are low-emphasis on-demand actions.

### Current Rule

- Desktop shows the chapter table of contents by default. After selecting a chapter, keep the contents visible for continuous jumping.
- Mobile opens the contents as an overlay and closes it after a chapter is selected, so it does not cover the prose.
- Reading prose uses a stable, comfortable line width and line height. Do not wrap it in card borders, task status, or multi-layer panels.
- The preview page must provide clear entries back to the bookshelf and into the workspace, but it must not bring workspace navigation back into the reading scene.

### Failure Modes

- No primary cover: show a placeholder and a generate entry. Do not block opening the work.
- Cover generating: show generation status. The user can still browse and open other works.
- Cover generation failed: keep the failed status and allow reopening the existing cover dialog to retry.
- Workspace task status is abnormal: Bookshelf shows a user-understandable recovery action. Detailed diagnosis still enters the workspace.

## Failure Modes

## Two-way entry between Auto-Director and the novel bookshelf

The Auto-Director task page and the simple-creation bookshelf are two views of the same book: the task page inspects AI planning, risk, and recovery; the bookshelf reads stable prose and already-prepared resources. After the novel is created, the bookshelf is the default daily entry. The task page remains the deep execution and recovery entry. Both pages must offer a clear jump that carries the same task ID, so a beginner is not lost between them or led to believe there are two works.

The workspace entry must use the novel’s persisted `creationExperience` as the only judgment. The production method on a task only describes that director run. It must not preempt page routing, or brief inconsistency between task projection and novel state will jitter between the simple bookshelf and the professional workspace.

AI Live is a global runtime-observation capability, owned by the app top-bar entry. The Auto-Director page and simple bookshelf only show the resources, chapters, and recovery state the user currently needs to understand. They do not repeat the AI Live button, and they do not use “view execution details” as a substitute for recovery actions that can be completed on the page.

## Reading-desk hierarchy on the simple bookshelf

Once the simple bookshelf is open, the first job is “read already-saved prose”, not “understand the background pipeline”. The page top keeps only work progress, recovery actions, and a few stats. World, characters, volumes, and other creation resources stay collapsed by default. Chapter contents plus the prose reading desk form a stable main workspace. On desktop the reading desk is fixed in the available viewport; contents and prose scroll separately, and the chapter title stays visible while prose scrolls. Mobile keeps natural page scrolling. As long as prose is saved, a chapter still in review may be read-only, but chapter status must say it may update later.

- The user sees many buttons and does not know the next step: check whether a single recommended action and reason are missing.
- The user thinks the task is stuck: check whether the frontend shows real artifact progress, the blocking reason, and a recovery action.
- World view participates weakly in the generation chain: check whether world-library samples, novel-world copies, `StoryWorldSlice`, and `WorldContextGateway` are clearly distinguished, and whether the generation chain bypassed the unified facade.
- Character generation needs a low-cost control point for beginners: default to generating from this book’s world, while allowing a faction lean and a world-rule compliance check, instead of requiring a handwritten full character background.
- A visualization curve is draggable as soon as the page opens: that turns “browse the shape” into “write an anchor”. Use read-only display plus an explicit edit entry, and supply narrative context at the edit scene.
- Auto-Director create is dialogs inside dialogs: direction candidates, revision, and execution progress need vertical space and must restore the same scene after refresh. Use an independent page and task parameters instead of stuffing a long flow into the create-form dialog.
- Keyword fallback after AI judgment fails: fix the AI schema, prompt, context, and evaluation. Do not let product logic fall back to hard-coding.

## Related Modules

- `client/src/pages/novels/`
- `client/src/pages/tasks/`
- `client/src/pages/chat/ChatPage.tsx`
- `client/src/pages/worlds/WorldList.tsx`
- `client/src/pages/worlds/components/workspace/WorldOverviewTab.tsx`
- `client/src/pages/novels/components/NovelWorldManagerCard.tsx`
- `server/src/services/novel/director/`
- `server/src/services/novel/production/`
- `server/src/services/novel/worldContext/WorldContextGateway.ts`
- `server/src/creativeHub/`
- `server/src/prompting/`

## Source Documents

- [README project positioning](../../../README.md)
- [Auto-Director execution-plane isolation and API keep-alive plan](../../plans/auto-director-execution-plane-isolation-plan.md)
- [Prompt workbench, context assembly, and unified step-runtime plan](../../plans/prompt-workbench-context-and-step-runtime-plan.md)
- [Tension-curve display / edit split plan](../../plans/tension-curve-display-edit-split-plan.md)

## Short length still needs a complete ending

For a beginner, 30–60 chapters is not “a short serial that only finishes the opening”. It is a complete story that must be delivered in limited length. The system automatically uses compact-book mode, treats the user promise as the whole-book core promise, advances in a three-act arrangement, and may add at most 5 ending chapters after the target chapter count. Target chapter count is only a planning budget. The ending contract and main-line payoff are the completion conditions.

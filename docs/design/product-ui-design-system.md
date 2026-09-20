# Product UI Design System

## Background

The core experience of this project is not a generic admin console and not a chatbot. It is an AI creation workbench that helps writing beginners finish a complete novel. The interface must organize complex auto-director, character, worldbuilding, chapter production, knowledge-base, and task-recovery capabilities into a clear creation path.

This spec constrains later product UI design, page generation, and frontend component construction. The public documentation site continues to follow `site/DESIGN.md`. The client product UI follows this document.

## Design North Star

After opening the product, the user should immediately know:

- Which novel they are currently creating.
- Which stage the novel is in.
- What the system recommends doing next.
- Whether character, worldbuilding, and chapter continuity are stable.
- Which problems will block further generation, and which are only later quality reminders.

Every page should serve “help a beginner keep advancing a complete novel.” Do not present capabilities as a set of unrelated tool entrypoints.

## Product Personality

The interface personality should be a “professional creation cockpit,” not a marketing page, form-admin backend, or ordinary chat page.

- Clear: information hierarchy is explicit so the user can quickly judge current state and next step.
- Restrained: reduce decorative gradients, floating cards, excessive shadows, and large visual noise.
- Continuous: character, worldbuilding, chapters, and tasks should have an obvious process relationship.
- Controllable: when AI runs automatically, the user must see the current stage, risks, and recoverable entrypoints.
- Beginner-friendly: default to recommending the next step; do not require the user to understand complex craft terms before they can act.

## Scope

This document only defines project-level UI design principles and component-construction rules. It does not prescribe one page’s concrete layout, module order, or first-screen content. Concrete page design should be written as a page-level note and cite this document as a constraint.

This document constrains:

- Product information-architecture principles.
- Page types and layout patterns.
- Visual language and design tokens.
- Frontend UI component-construction rules.
- Responsive behavior, accessibility, copy, and status expression.
- Visualization principles for core generation assets such as character, worldbuilding, and chapter continuity.

This document does not include:

- The final layout of any single page.
- Which specific cards a page must show.
- Wireframes or visual comps for a specific page.
- Temporary campaign pages, marketing pages, or public documentation-site design.

## Information Architecture

Product information architecture is organized by user tasks, not by backend modules, tables, or technical chains.

Global navigation should stay stable, and boundaries between capability areas should be clear:

- Creation progress: continue creating, stage progress, next-step recommendation.
- Novel project: one novel’s materials, stages, chapters, and history.
- Auto-director: whole-book planning, execution state, blocking, and recovery.
- Chapter production: generation, review, repair, and batch execution.
- Character and worldbuilding: long-lived generation assets, continuity, and setting facts.
- Knowledge and retrieval: knowledge documents, RAG index, and retrieval status.
- Tasks and reminders: failures, approvals, quality debt, and recovery entrypoints.
- System configuration: models, providers, notifications, and runtime environment.

Navigation hierarchy only defines how users understand the product. It is not the same as page layout. A concrete page may use single-column, two-column, three-column, step, list, editor, or workbench mode depending on task complexity.

## Experience Model

All core experience is organized around one loop:

1. The user selects or creates a creation object.
2. The system presents the current stage and a recommended action.
3. The user confirms, generates, reviews, or repairs.
4. The system syncs characters, worldbuilding, chapter facts, and task state.
5. The next step continues by reading those assets to advance creation.

Interface design should keep exposing this loop so users understand the system is not a one-shot text generator; it is maintaining the ongoing state of a long novel.

## Page Archetypes

When designing a page, first decide its type, then choose layout. A concrete page may combine several types, but it must have one primary type.

### Dashboard

Used to show status overview, recommended actions, risks, and progress. Its job is to help the user decide “what to do now,” not to host complete editing work.

### Workspace

Used to keep working around one primary object, for example a novel, a generation task, or a creation thread. It should always show the current object, current stage, primary action, and supporting status.

### Editor

Used to read, edit, and review long content. The prose or main content must be the visual center. Parameters, diagnostics, and supporting information must not crowd out the main content.

### Asset Library

Used to maintain reusable assets such as characters, worldbuilding, knowledge, templates, and rules. Asset-library pages should highlight asset status, source, impact scope, and recent use, not only list management.

### Task Queue

Used to handle approvals, failures, reminders, quality debt, and recovery actions. Task items must distinguish blocking issues, non-blocking risks, and ordinary reminders.

### Settings

Used to configure models, providers, notifications, and system capabilities. Settings pages should not block a new user from starting creation unless missing configuration would make the core flow unusable.

## Page Structure Rules

Every core page should make these explicit:

- Current object: which book, task, asset class, or piece of content the user is working on.
- Current stage: whether the system is planning, generating, reviewing, syncing, waiting for confirmation, or recovering.
- Primary task: the single most important thing on this page.
- Recommended action: what the system suggests the user do next.
- Status feedback: what is done, what is in progress, and what needs handling.
- Supporting information: shown only when it supports the primary task; avoid stacking information.

A page must not flatten every capability onto the first screen. The first screen only carries the current task, key status, and next action. Low-frequency configuration and technical detail belong in secondary areas.

## Visual System

The overall look is quiet, clear, and workbench-like.

### Color

Prefer Tailwind and project semantic CSS variables. Do not write one-off colors freely in pages.

Suggested semantic colors:

- Primary: primary actions, current stage, key selected state.
- Muted: supporting backgrounds and weak-information areas.
- Border: section boundaries and input boundaries.
- Destructive: blocking, failure, dangerous actions.
- Warning: pending confirmation, quality debt, non-blocking risk.
- Success: complete, can continue, sync succeeded.
- Info: generating, processing, system suggestion.

The client theme must provide `success`, `warning`, `info`, and matching foreground tokens. Business pages should express status through these semantic tokens and must not scatter `emerald`, `amber`, `sky`, or one-off hex colors.

Before adding a color, first decide whether it can map to a semantic variable. If a new color is truly needed, extend the global tokens first, then use it.

### Typography

- Page main titles are for object and stage, not decoration.
- Card titles should be short; do not use large hero type.
- Body, explanation, and status text should stay a clear reading experience for Chinese.
- Do not scale type directly from viewport width.
- Keep default letter-spacing; do not use negative tracking.

### Spacing

- Page-level regions use a stable spacing rhythm.
- Card padding, title spacing, and button spacing should be consistent within one page.
- Do not stack hierarchy with nested cards. When grouping is needed, prefer sections, lists, tables, or tabs.

### Low-border Hierarchy

- Ordinary content grouping has no visible border and no shadow by default. Prefer title hierarchy, whitespace, alignment, light background, and dividers to establish relationship.
- Borders are used only to communicate a necessary boundary: form controls, selected or focus state, warning and error, table or list separation, drag-and-drop targets, and floating layers such as dialogs and menus.
- One page must not stack rectangles of equal visual weight. When an outer region already exists, inner content uses borderless rows, sections, or a weak background.
- The test is not “whether a Card component was used,” but whether hierarchy and interaction remain clear after the border is removed. If they do, the border must be removed.

### Radius and Shadow

- Default radius stays restrained; cards should be around 8px.
- Do not use large rounded capsule cards to carry complex text.
- Shadows are reserved for temporary elevation such as floating layers, dialogs, and menus.
- Ordinary content areas are distinguished mainly by background, spacing, typography, and necessary dividers.

## Component Construction Rules

The current client uses project-owned UI primitives, Tailwind CSS, and CSS variables. Existing `components/ui/` files are a compatibility layer maintained directly by the project. shadcn/ui default styles or generators are no longer the design source.

### Component Ownership

- `client/src/components/ui/` holds only project-owned basic UI primitives. Business components are forbidden here.
- Business composition components go into an explicit module directory, for example `components/autoDirector/`, `components/creativeHub/`, `pages/novels/components/`.
- Cross-module asset-library page structure for knowledge, genre, character, world, and rules belongs in `components/assetLibrary/`. That directory only composes header, status, recommended action, sections, and empty state; it does not read APIs or hold business state.
- Do not put business logic into `components/ui/`.
- Do not add unowned `helpers` or `utils` style UI files to host business components.

### Composition

- Prefer composing existing primitives; do not copy similar JSX.
- If the same kind of status card, task row, or asset summary appears more than 3 times in one module, extract a module component.
- Component props use domain semantics such as `status`, `nextAction`, and `riskLevel`. Do not pass only a pile of visual classes.
- Class merging always uses the project `cn()` helper.

### Project-owned Primitive Usage

- New generic controls should first compose existing project primitives. When complex interaction behavior is truly needed, unstyled behavior primitives such as Radix may be used, but visuals must be defined by project tokens and rules.
- Do not install new shadcn/ui components or run their generator. Existing compatibility components may be refactored gradually; a no-benefit mass rename migration is not required.
- Default appearance of primitives must stay restrained. Ordinary Surface/Card has no visible border or shadow by default; semantic borders are declared explicitly by the caller.
- Do not patch third-party packages directly. Complex business regions should wrap project primitives instead of stacking unowned `div`s in the page.

### Icons

- Tool buttons and status entrypoints prefer `lucide-react` icons.
- Icon buttons must have an accessible name or tooltip.
- Do not replace common icon actions such as back, refresh, save, download, and search with text capsules.

### State Components

Every important page must cover:

- Loading: show the object and action being loaded.
- Empty: tell the user what they can do, not only “no data.”
- Error: explain impact scope and the next recovery action.
- Disabled: explain why the current action is unavailable.
- Success: appear only when completion confirmation is needed; do not create noise.

## Layout Rules

### Desktop

Prefer a workbench layout:

- Left navigation.
- Top status bar.
- Central primary-task area.
- Right suggestion or status area.

Pages such as prose editing, chapter generation, and Creative Hub may use a three-column layout, but the primary-task area must remain the visual center.

### Mobile

Mobile must not simply compress the desktop layout.

- Show the primary task first.
- Side-column content sinks into collapsed regions, tabs, or bottom actions.
- Complex tables become lists.
- Action buttons may be full width.
- Input control type size must not be below 16px, to avoid mobile zoom.

### Responsive Safety

- Fixed-format components need explicit size or responsive constraints, for example panels, toolbars, statistic blocks, and chapter cards.
- Long text must wrap; it must not overflow buttons or cards.
- Pages must not have horizontal scroll unless it is an explicit horizontal-tab or data-table region.

## Product Copy Rules

All user-visible copy must start from the user task.

Recommended wording:

- “Continue generating the next chapter”
- “Confirm character changes”
- “View worldbuilding conflicts”
- “This reminder will not block further generation”
- “Set the default writing style from novel basic information”

Wording to avoid:

- “Upgraded to the new flow”
- “Migrated to the new module”
- “Current pipeline status”
- “runtime sync failed”
- “Old logic is no longer used”

Technical diagnostics may exist, but they default to a collapsed “Details” or “Developer information” area.

## AI Workflow Visibility

AI automatic execution must be visualized as a process the user can understand.

Pages should distinguish:

- Planning.
- Generating.
- Reviewing.
- Syncing characters and worldbuilding.
- Waiting for user confirmation.
- Can continue, but with quality debt.
- Must replan.

Do not show only a loading spinner. Long tasks need stage, progress, recent events, and a recovery entrypoint.

## Character and Worldbuilding Visibility

Characters and worldbuilding must be presented in the UI as “assets that participate in generation.”

Before chapter generation, the user should see:

- Which characters this chapter involves.
- Current character state and relationships.
- Which world rules this chapter involves.
- Which facts will constrain the prose.

After chapter generation, the user should see:

- Whether the character timeline was updated.
- Whether a chapter summary was generated.
- Whether new facts were persisted.
- Whether RAG or knowledge indexing is queued or complete.

This helps the user understand why the system can maintain long-novel continuity.

## Accessibility

- Interactive elements must support keyboard access.
- Dialogs, menus, and selectors keep focus management.
- Icon buttons must have an `aria-label` or a visible tooltip.
- Color cannot be the only status expression; it must be paired with text or an icon.
- Status notices should be screen-reader friendly.

## Quality Checklist

Before adding or redoing a page, check:

- Does the first screen have a clear next step?
- Is the primary button unique and aligned with the current stage?
- Can the user see the current novel, chapter, or task object?
- Are character, worldbuilding, and continuity visible in the related flow?
- Are blocking, warning, and ordinary reminders clearly distinguished?
- Does the empty state guide the user to continue?
- Does mobile avoid horizontal overflow?
- Are existing components and tokens reused?
- Are nested cards, decorative gradients, and one-off colors avoided?
- Does the copy explain the function from the user’s point of view?

## Implementation Checklist

Before frontend implementation, confirm:

- Whether a reusable `components/ui` primitive already exists.
- Whether it should be extracted as a module component instead of written in the page.
- Whether a new global token is needed.
- Whether unified components are needed for status, empty, and error states.
- Whether it would push a single file past a maintainable size.
- Whether module docs or the wiki need an update.

After implementation, at least do:

- TypeScript check.
- Manual or screenshot check of key responsive breakpoints.
- Main state check: loading, empty, error, normal.
- User-perspective review of newly added UI copy.

## Relationship to Other Docs

- `site/DESIGN.md`: public documentation site and GitHub Pages intro-site spec.
- `docs/design/product-ui-design-system.md`: client product UI and component-construction spec.
- `docs/wiki/product/beginner-first-novel-completion.md`: product goal and long-term principles for beginners finishing a full novel.
- `docs/plans/assistant-ui-plan.md`: Creative Hub and assistant-ui migration plan.

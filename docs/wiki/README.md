# Project development wiki

This directory holds durable project knowledge. It helps future developers and AI agents understand why the system is designed this way and how it should be maintained.

The wiki is not a record of what changed in a single commit, and it does not replace release notes. It records architecture rules, workflow boundaries, runtime contracts, debugging lessons, and product design rationale that remain useful across phases.

Write wiki pages in English. Quoted Chinese protocol aliases such as `主角` are allowed only when documenting dual-read of old stored values. English is canonical on write.

## How to use it

- Start here, then open the matching topic page.
- If a page comes from a historical plan, design doc, or checkpoint, keep the source link. Do not empty the original document.
- If a change clarifies a long-lived rule, update the matching wiki page. Skip the wiki for small edits and release-note narration.
- New pages should follow [entry-template.md](./entry-template.md).

## Contents

### Architecture

- [Module boundaries and documentation governance](./architecture/module-boundaries.md)
- [Current model selection and vendor default-model boundary](./architecture/model-selection.md)
- [Configuration ownership and visibility](./architecture/configuration-conventions.md)
- [Read-path performance boundaries](./architecture/read-path-performance-boundaries.md)
- [Chapter runtime boundaries](./architecture/chapter-runtime-boundaries.md)
- [Chapter identity and planning boundary](./architecture/chapter-identity-and-planning-boundary.md)
- [Server architecture migration plan](./architecture/server-architecture-migration-plan.md)
- [Novel application services](./architecture/novel-application-services.md)
- [Event side-effect boundaries](./architecture/event-side-effect-boundaries.md)
- [World context gateway](./architecture/world-context-gateway.md)
- [World visualization assets](./architecture/world-visualization-assets.md)
- [Visual asset catalog](./architecture/visual-asset-catalog.md)
- [Image generation providers](./architecture/image-generation-providers.md)
- [Drama Forge module boundary](./architecture/drama-forge-module-boundary.md)

### Workflows

- [Auto-Director runtime and recovery](./workflows/auto-director-runtime.md)
- [Auto-Director stage checklist](./workflows/auto-director-stage-checklist.md)
- [Auto-Director world setup](./workflows/auto-director-world-setup.md)
- [Auto-Director idea constellation](./workflows/auto-director-idea-constellation.md)
- [Auto-Director candidate auto-confirm](./workflows/auto-director-candidate-auto-confirm.md)
- [Chapter production chain](./workflows/chapter-production-chain.md)
- [Lazy chapter planning](./workflows/lazy-chapter-planning.md)
- [Volume planning](./workflows/volume-planning.md)
- [Reader experience contract](./workflows/reader-experience-contract.md)
- [Payoff ledger source and sync contract](./workflows/payoff-ledger-contract.md)
- [Quality debt attribution](./workflows/quality-debt-attribution.md)
- [Novel fact ledger](./workflows/novel-fact-ledger.md)
- [Timeline constraint layer](./workflows/timeline-constraint-layer.md)
- [Character resource ledger](./workflows/character-resource-ledger.md)
- [Character intelligence layer](./workflows/character-intelligence-layer.md)
- [Character dialogue layer](./workflows/character-dialogue-layer.md)
- [Character influence proposals](./workflows/character-influence-proposals.md)
- [Universal character conversation](./workflows/universal-character-conversation.md)
- [Book analysis workflow](./workflows/book-analysis-workflow.md)
- [Creative Hub boundary](./workflows/creative-hub-boundary.md)
- [LLM live execution](./workflows/llm-live-execution.md)
- [Image generation confirmation runtime](./workflows/image-generation-confirmation-runtime.md)
- [Novel cover image generation](./workflows/novel-cover-image-generation.md)
- [Market Radar to Auto-Director](./workflows/market-radar-to-auto-director.md)
- [Creation Studio short story](./workflows/creation-studio-short-story.md)
- [Pending-review auto-promotion](./workflows/pending-review-auto-promotion.md)
- [Novel snapshot retention](./workflows/novel-snapshot-retention.md)
- [Desktop release versioning](./workflows/desktop-release-versioning.md)
- [Comic character asset pipeline](./workflows/comic-character-asset-pipeline.md)
- [Comic scene consistency](./workflows/comic-scene-consistency.md)
- [Comic panel production prompt governance](./workflows/comic-panel-production-prompt-governance.md)
- [Short-drama workspace](./workflows/short-drama-workspace.md)

### Prompts

- [Prompt Registry and structured output](./prompts/prompt-registry-and-structured-output.md)
- [Platform writing profiles and editable chapter-prompt contract](./prompts/platform-writing-profiles.md)
- [Novel generation quality guards](./prompts/novel-generation-quality-guards.md)
- [Georgian content policy](./prompts/georgian-content-policy.md)

### RAG

- [Knowledge bulk import: storage before indexing](./rag/knowledge-bulk-import.md)
- [Knowledge base and context assembly](./rag/knowledge-and-context-assembly.md)

### Debugging

- [Recurring failure modes and diagnosis paths](./debugging/recurring-failure-modes.md)
- [Log retention](./debugging/log-retention.md)
- [LLM request limiter memory leak](./debugging/llm-request-limiter-memory-leak.md)
- [Character continuity hard facts](./debugging/character-continuity-hard-facts.md)
- [English UI dynamic copy](./debugging/english-ui-dynamic-copy.md)

### Product

- [Beginner-first full-novel completion](./product/beginner-first-novel-completion.md)
- [Simple creation mode](./product/simple-creation-mode.md)
- [Workspace status and next-step contract](./product/workspace-status-expression.md)
- [Settings readiness](./product/settings-readiness.md)
- [World skeleton generation](./product/world-skeleton-generation.md)
- [Narrative engine studio](./product/narrative-engine-studio.md)
- [Task Center role](./product/task-center-role.md)
- [GitHub Pages intro site](./product/github-intro-site.md)

## Writing boundary

Wiki pages should record:

- Long-lived architecture decisions and the reasons behind them.
- Boundaries for Auto-Director, chapter production, Creative Hub, Prompt, RAG, and task state.
- Reusable debugging conclusions and diagnosis paths.
- How beginner-first, full-novel completion, and low cognitive load shape the implementation.

Wiki pages should not record:

- Per-commit file modification lists.
- Temporary TODOs.
- Copied release notes.
- Implementation details that will be discarded soon.
- Narration that only says what changed in the current task.

## Relationship to other docs directories

- `docs/wiki/`: stable knowledge and reasons.
- `docs/plans/`: plans that still have execution value.
- `docs/checkpoints/`: phase progress, migration milestones, and audits.
- `docs/design/`: system design, domain models, and product mechanics.
- `docs/releases/`: user-visible update history.
- `README.md`: public entry point and latest summary.

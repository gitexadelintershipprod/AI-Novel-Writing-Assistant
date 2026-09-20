# Short Story Module Boundary

## Responsibility

`short-story` is the official production and editing module for short works. It owns short-story planning, internal segment generation, whole-piece review, one necessary repair, continuous-prose projection, human-edit protection, natural-language revision, and derivation into a long novel.

The directory is organized by responsibility:

- `application/`: production orchestration, recovery, editing, and revision use cases.
- `http/`: client-facing short-story API mapping and input validation.
- `domain/`: later-added pure business rules and state transitions.
- `infrastructure/`: later-added module-owned external adapters.

There are currently no independent `domain/` or `infrastructure/` files because persistence is owned by Prisma and AI calls go through Prompt Registry's stable facade. Do not add unowned empty shells or generic helpers just to fill the directory.

## Dependency Direction

- HTTP may only call this module's application services or an explicit Creation Studio facade.
- Application may depend on Prisma, official Prompt Assets, and the novel workflow facade.
- Other modules should consume capability through this module's services or routes and must not rewrite `ShortStoryPlan` or `ShortStorySegment` directly.
- Product-level prompts may only live in `server/src/prompting/prompts/shortStory/` and must be registered in Prompt Registry.

## Runtime Invariants

- Internal segments are used only for generation, recovery, and edit location; user reading and export always receive continuous prose without internal titles.
- The default product form of a finished short story is a complete Chinese web novel. Plan v2 must provide hooks, immediate goals, progression beats, genre payoff, and ending pull; prose and review must not degrade into a traditional literary sketch, essay, or plot synopsis.
- Before creation, a short story must resolve genre base and primary progression mode; secondary progression mode is optional. The resolved full creation base must enter plan, segment prose, whole-piece review, repair, and post-confirmation rewrite as required context. Saving only a resource ID or injecting only a name is not enough.
- A user-explicit genre or progression mode takes priority over AI recommendation; missing items are filled by a registered PromptAsset with structured output. Keyword or regex routing is not allowed.
- Web-novel readability must serve event progression and phone reading, but that is not the same as uniform power-fantasy styling. Payoff type is determined by genre and already-confirmed direction.
- Completed segments are reused on ordinary failure retry; human-edited segments must not be silently overwritten by background generation or automatic repair.
- Human save must validate `expectedVersion`, write a snapshot before save, then increment version and mark the human-edit timestamp.
- Ordinary quality issues are written into `qualityDebtJson` and then delivered. Only explicit `replan_required`, no usable prose, or a runtime/data-safety problem may stop the whole production chain.
- Automatic repair runs at most once. Residual acceptable issues must not loop repair or mark the whole-piece task as failed.
- Failure recovery continues from the persisted segment cursor. Only a `generating` segment past lease expiry may be reclaimed as failed, to avoid concurrent processes generating the same segment twice.
- Growing a short story into a long novel must create a new work and a new creation task, and write `derivedFromNovelId`; the original short story cannot be converted in place.

## Data and Migration

The persistence sources of truth are `NovelIntentVersion`, `ShortStoryPlan`, `ShortStorySegment`, and `NovelWorkflowTask`. PostgreSQL and SQLite schemas and incremental migrations must stay in sync.

Migrations that touch these tables are data-risk operations. Before running them, complete a database backup, record the concrete backup path, and verify the backup file exists with a reasonable size. If those conditions are not met, only generate and validate migration files; do not execute the migration.

## Related Modules

- `server/src/modules/novel/creation-studio/`
- `server/src/prompting/prompts/shortStory/`
- `server/src/services/novel/workflow/`
- `server/src/modules/export/`
- `client/src/pages/shortStory/`

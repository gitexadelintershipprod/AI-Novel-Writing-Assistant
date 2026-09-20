# World context gateway and novel-world boundary

## Background

The worldbuilding module used to feed the generation chain through several sources at once: an external `World` binding, `StoryWorldSlice`, `Bible.worldRules`, `canonicalState.worldState`, and a set of legacy flat fields. Multi-source injection made the same novel see different world constraints in character generation, macro planning, chapter generation, and repair. The visible results were character identities drifting away from the world, chapters inventing rules on the fly, and low world participation.

The long-term redesign splits the world module into two layers: an external world library that stores reusable world samples, and an in-novel world that stores this book's dedicated world instance. The generation chain should not read either layer's internal tables directly. It should get the world context the current task needs through a unified facade.

## Decision

On the server, `WorldContextGateway` is the only converged entrypoint for the generation chain to read world information. `NovelWorld` carries the novel-world instance. The gateway first ensures this book's world copy exists, then uses `StoryWorldSlice` to cut that copy into context blocks for different generation purposes. Callers such as character, outline, and chapter depend only on the facade. They do not need to know whether the world came from the external world library, generation for this book, custom creation, or initialization from legacy fields during migration.

`NovelWorld` is the in-novel world instance. It is not a direct reference to an external `World`. It is this book's copy after import from the external world library, generation from the novel theme, or manual creation. The current migration period keeps `Novel.worldId` and `Novel.storyWorldSliceJson` as compatibility sources, but the new world-context gateway syncs those legacy fields into `NovelWorld`. Later generation chains should gradually read only `NovelWorld`.

## Current Rule

- When the generation chain needs world information, call `WorldContextGateway.getWorldContextBlock(novelId, { purpose })`.
- `purpose` must be explicitly `outline`, `character`, `chapter`, `bible`, or `optimize`. The gateway formats the same world slice for that purpose.
- If no usable world exists, return `null`. The generation chain degrades gracefully and does not treat a missing world as an error.
- Building `StoryWorldSlice` must prefer `NovelWorld.structuredDataJson` and `NovelWorld.bindingContractJson`. Only when the novel still has no `NovelWorld` may it fall back to the legacy `Novel.worldId -> World` path.
- Writing the `StoryWorldSlice` cache must not refresh `NovelWorld.updatedAt`. `updatedAt` means this book's world content changed. Import, generation, sync, and other content changes update it. Slice-cache write-back only updates `storySliceJson`, `storySliceBuiltAt`, and `storySliceDigest`.
- `Bible.worldRules` remains only as Bible document content. The world authority for character generation is `WorldContextGateway`.
- Chapter-runtime `supportingContextText` must first inject this book's world block from `WorldContextGateway`. Bible text must not inject `worldRules` again as a parallel world constraint.
- `canonicalState.worldState` is a chapter continuity record. It may be used as a conservative hint only when there is no `StoryWorldSlice`, and the copy must be labeled as a "continuity record." It must not override this book's world slice.
- `GenerationContextAssembler` must write the `rawSlice` returned by `WorldContextGateway.getWorldContextBlock(..., { purpose: "chapter" })` into `contextPackage.storyWorldSlice`, and put `promptBlock` into chapter `supportingContextText`. The matching boundary is covered by `generationContextAssembler.test.js`.
- Character generation prefers world context with `purpose="character"`, emphasizing active factions, character-identity boundaries, location pressure, and forbidden pairings.
- Character outward-profile completion is also part of the character-generation chain and must use this book's world context with `purpose="character"`, so clothing, identity marks, and race/occupation appearance do not leave the world handbook.
- Character-cast plans and supplemental character generation must provide a `useWorldContext` switch, defaulting to on. When the user turns it off, the generation chain skips `WorldContextGateway` and generates characters only from book-level information, story mode, existing characters, and user instructions.
- A character-cast plan may carry `worldFocusHints` to express factions the user wants to fit first, and whether identity, ability source, faction membership, location, and taboo pairings must be checked. These hints may only supplement this book's world context from the Gateway. They must not replace or override this book's world rules.
- `NovelWorld.sourceType` distinguishes `imported`, `generated`, and `manual`. Do not judge the user's current world source from `Novel.worldId` alone.
- When a world is created from inside the novel (generated from this book, or a custom blank handbook), the system must create an external `World` sample in the same transaction and bind `Novel.worldId` and `NovelWorld.sourceWorldId` to that sample. The user must not be required to run an extra "Save to world library" step. After creation, bidirectional sync entrypoints remain available by default, but later `push` / `pull` still require explicit user confirmation. The system must not automatically overwrite either side.
- In-novel world UI should prefer `GET /api/novels/:id/novel-world` to show this book's current world source and status.
- Importing from the external world library into a novel calls `POST /api/novels/:id/novel-world/import`. The backend copies the world structure into `NovelWorld` and clears the old story-slice cache, waiting for the next cut against this book's content.
- When the user has not chosen an external world-library sample, or wants the system to build the stage for this book first, call `POST /api/novels/:id/novel-world/generate`. That flow must generate a structured world through registered PromptAsset `novel.world.generate_from_theme@v2`. It must not fake a world with fixed keywords or genre branches.
- An in-novel "Generate from this book's theme" request must carry the `provider`, `model`, and `temperature` currently selected in the workspace. The server must not hard-code DeepSeek for this entrypoint. When they are not specified explicitly, generic model routing follows global configuration.
- Theme generation for this book only produces a compact world seed that is enough to start writing. It does not produce a full encyclopedia. Entity count, total text, single-output budget, and completion deadline must be constrained. If structured output is incomplete, end this request. The user can continue expanding in the world handbook rather than repeatedly repairing the same large JSON.
- If an orchestration layer needs to create this book's world during generation-chain preparation, it should prefer `WorldContextGateway.generateWorldFromNovelTheme(novelId, options)` and not depend on `NovelWorldInstanceService` internals directly. HTTP routes may keep existing interfaces through application services, but the abstract entrypoint for generation chain and workflow orchestration should be the Gateway.
- "Generate from this book's theme" creates both the in-novel `NovelWorld` and an external `World` sample, and points `NovelWorld.sourceWorldId` at that sample. `saveToLibrary` is only a compatibility field for old requests and must not change this creation rule.
- For a this-book world with no source world, the user may call `POST /api/novels/:id/novel-world/save-to-library` to save it as an external world-library sample. After save, `sourceWorldId` points at the new sample and bidirectional sync is on by default. If the request sets `syncEnabled=false`, only the source is recorded and sync differences are not prompted automatically.
- Manual sync uses `GET /api/novels/:id/novel-world/sync-diff` to inspect differences, then `POST /api/novels/:id/novel-world/sync` to run `push` or `pull`. Sync granularity is by structure partition: world overview, core rules, camps, factions, places, and relationship network.
- As long as this book's world has a linked world-library sample, the frontend may read `sync-diff` and show a difference summary. `syncEnabled=false` only means automatic sync relationships are not prompted. It must not block the user from inspecting differences manually or running `push` / `pull` again.
- Sync-difference summaries should explain, in user terms, what actually differs on each side: which rules, factions, and places this book's world has, and what the world-library sample has in the matching areas. Do not return only developer-facing phrasing such as "fields don't match."
- Users can turn off sync prompts with `direction=none`. This book's world still keeps `sourceWorldId` as a source record, but `syncEnabled=false` and `syncDirection=none`, so pending sync differences are not calculated automatically later. The user can still run `push` or `pull` manually to reopen the sync relationship.
- `sync-diff` writes the latest difference summary into `NovelWorld.syncPendingChangesJson` so the novel-world card can show pending partitions. This field only records "differences the system found that are waiting to sync." It does not mean automatic sync, and it must not be a generation-chain world source.
- Every user `push` or `pull` must write a `WorldSyncRecord`. The novel-world view reads only the latest few sync records as explanatory history, so the user can see which intentional syncs happened between this book's world and the world-library sample.

## Boundary

`WorldContextGateway` is responsible for:

- Ensuring or refreshing this book's `StoryWorldSlice`.
- Converting the world slice into a `WorldContextBlock` the generation chain can use directly.
- Providing `generateWorldFromNovelTheme` for automated orchestration, creating an in-novel world copy when this book has no world yet.
- Emitting `worldRulesText` and `worldStageText` with different emphasis based on call purpose.
- Isolating callers from legacy flat `World` fields, future `NovelWorld` entities, and each other.
- Letting callers see only "this book's world context," without knowing whether that context came from the novel-world copy, a legacy world-library binding, or a migration-period slice cache.

`WorldContextGateway` is not responsible for:

- Editing the external world library.
- Deciding whether the user syncs the novel world back to the world library.
- Generating maps, faction diagrams, or world-asset images. World assets are carried independently by `WorldAsset`. The Gateway only provides the text context the generation chain needs.
- Directly modifying characters, chapters, or Bible content.

Readiness state and flow guidance may read lightweight `NovelWorld` status to judge whether "worldbuilding foundation" and "rule boundary" are enough to continue planning. That read only serves user guidance and gap hints. It must not replace `WorldContextGateway` when assembling world context for character, outline, chapter, or repair chains.

Product entrypoints in the world module should also keep a clear boundary:

- The external world-library page is a "world sample library" for browsing, generating, organizing, and maintaining reusable world samples.
- The external world-library page must explain how samples are used: first organize a general world handbook in the sample library, then import it from the novel basics page as this book's world copy, then let the user decide sync between sample and copy by hand. Do not let users think an external sample directly drives novel content.
- The primary action on an external world-library card should enter the world workspace or world handbook. It should not send the user to another creation entrypoint.
- The "View world handbook" entry for an existing world sample in the external world library must always be available. A generation-wizard switch may only control new/generate entrypoints. It must not hide view and management entrypoints for existing worlds.
- The world-sample creation entrypoint should appear as a "Create a world sample" step wizard: first describe the world, then choose a world skeleton, then confirm core rules. Genre, inspiration, reference works, generation preferences, template skeletons, and attribute checkboxes all serve those three steps. They should not pile into a configuration form on the first screen.
- When a novel needs a world, import it as an in-novel `NovelWorld` copy from the "This book's world" card on the novel basics page.
- The "This book's world" card should show a clear next action first, then let the user choose a source path or handle sync: if there is no this-book world, guide source selection; if there is a this-book world but no usage scope, guide organizing this book's usage scope; if there is a linked sample, allow opening the source world handbook; if there are differences, guide handling sync differences. Do not mix import dropdowns, custom inputs, generate options, sync, and save actions at the same level.
- Status copy on the "This book's world" card should talk about this book's usage scope, the source copy, manual sync, and world-asset readiness. Do not write the card as an explanation of character, outline, or chapter production chains. The generation chain consumes world context through the Gateway with low coupling; that is not this UI's main story.
- The novel-basics main form must not present an external world-sample dropdown as the primary path. Compatibility `Novel.worldId` selection may live only in advanced settings, with an explicit note that the world the novel actually uses comes from the "This book's world" card.
- On the novel basics page, "World boundary for this book" should appear as the workspace immediately after this book's world. It should not be hidden inside writing formula or another collapsed region. Users need to see how this book's world is cut into organizations, places, and rules before they can understand how the world enters novel generation.
- The world workspace first screen should prefer the world handbook, core rules, main factions, story stage, and key tensions. Form-style structure editing, layered drafts, references, and import/export are secondary entrypoints.
- The world-workspace page header only owns sample identity, a back entry, and lightweight maintenance. Model selection and delete are on-demand tools and must not occupy the primary visual space of the world title and handbook content for long. The six tabs should keep one author-facing navigation and content hierarchy.
- Layered generation results for a world sample must be projected into both `World.structureJson` and `bindingSupportJson`. Legacy flat fields may remain as compatibility storage, but the world handbook, faction diagrams, maps, and novel import should all read the structured handbook. Do not allow a state where `factions/geography/conflicts` have been generated while the structured handbook still sits on wizard placeholder items.
- The world-workspace edit entrypoint should first enter "Organize the world handbook," helping the user organize the world around core rules, main factions, story stage, and key tensions. Advanced field maintenance may exist only as an advanced entry the user opens on purpose.
- After the world workspace opens, the default tab must be "Organize the world handbook." "View handbook / visualize" is a preview entrypoint and must not be the default first screen for editing, or users will think the world module is still a read-only overview or a backend field system.
- Input controls in the world-handbook editor must carry author-facing section titles and story-use hints, for example "One-sentence world impression," "Rule overview," and "Pressure this puts on the story." Do not stack bare `Input` and `textarea` groups into a field form.
- When advanced field maintenance is a secondary entrypoint, it should still unfold progressively by partition: "World overview / Rules center / Camps and factions / Places and terrain / Relationship network." Partition buttons must actually reduce on-screen form density; they must not be visual labels only.
- Complex partitions in advanced field maintenance should be split into owned section components. Camps and factions are owned by `workspace/structure/WorldFactionsSection`. Relationship network and novel-use suggestions are owned by `workspace/structure/WorldRelationsSection`. Later high-density partitions such as places and rules should reuse the same section-component boundary.
- When layered drafts are a generate-and-revise entrypoint, present them as "layer selection + current-layer editor." Keep the six-layer status overview and one-click generate, but do not expand six long text boxes at once.
- Assets, references, and version capabilities belong to the world-workspace toolbox and should appear as "tool selection + current tool panel." Map and diagram asset planning is the default entry in that toolbox. References, asset library, snapshots, export, and import must not all cover the page at once.
- Filling the handbook should appear as a question-by-question workflow titled "Fill gaps in the world handbook." The left side shows question progress; the right side answers only the current question. Do not expose internal fields such as priority, target, or status to the user.
- Handbook health check should first show check status, score, pending count, and summary, then handle items one by one as "issue list + current issue handling." Do not expand every issue report at once.
- An empty world or unstructured world should still show a world-handbook skeleton that guides the user to fill rules, factions, places, and tensions. Do not fall back to an ordinary field list as the main experience.
- The world handbook should show map and diagram asset entrypoints. World map, faction diagram, world timeline, and power-system tree may first appear as reserved entrypoints, and prompt "Ready to organize" or "Needs more input" based on how complete places, factions, rules, and tensions are. Those entrypoints only point at visualization-asset directions. They do not replace the world handbook as the generation-chain authority.

When production status and full-book production entrypoints judge "whether worldbuilding assets are complete," they should prefer recognizing the in-novel `NovelWorld`. An external `World` binding may only be a compatibility source. A this-book generated world or custom world with no `sourceWorldId` should still be treated as a usable this-book world.

Cover and visual prompts are also part of the world experience. Novel-cover prompts need to read this book's world summary, active factions, and stage places through `WorldContextGateway`, then fall back to legacy `Novel.storyWorldSliceJson`. They must not generate visual atmosphere only from an external world sample or an old slice.

`NovelWorldInstanceService` owns source conversion for the novel-world instance:

- `importFromWorldLibrary`: copy structured settings from an external `World` into this book's copy.
- `generateFromNovelTheme`: read novel title, synopsis, target reader, selling points, first-30-chapter promise, commercial tags, genre, and story mode, then call the registered prompt to generate this book's world copy.
- Both `generateFromNovelTheme` and `createManualNovelWorld` create an external world-library sample and update `Novel.worldId`. Creation and binding must commit atomically so the generation chain never reads a half-finished state of "this book's world exists but has no source sample."
- Every import or generation clears the old `StoryWorldSlice` cache. The slice service later reorganizes the settings range that enters the generation chain from the current this-book world.
- `getSyncDiff` and `syncWithLibrary` only handle explicit sync between this book's world and its source world-library sample. They do not participate in LLM generation-context assembly and do not automatically overwrite user edits.
- `pull` writes selected world-library partitions into `NovelWorld` and clears the old `StoryWorldSlice`. `push` writes selected this-book world partitions back to the external `World` and increments the world-library version.

## Read Priority

The facade's internal priority is:

1. Read the current novel's `NovelWorld`.
2. Build or reuse `StoryWorldSlice` from `NovelWorld` structured content.
3. Return `WorldContextBlock`.
4. If there is no `NovelWorld`, the migration period may initialize or fall back from legacy `Novel.worldId`.
5. If there is still no usable world, return `null`.

Sync between the external world library and the novel world should stay under explicit user confirmation. Difference comparison and field-level sync are handled by an independent `WorldSyncService` and must not enter the generation-chain facade.

## World asset reservation

`WorldAsset` is the world module's extension point for map and diagram capabilities. It may hang on an external `World` sample or an in-novel `NovelWorld` copy. The two must not implicitly overwrite each other through automatic sync. Later maps, faction diagrams, world timelines, character networks, and power-system trees should all write into `WorldAsset.renderDataJson`, not be stuffed back into `World.structureJson` or `NovelWorld.storySliceJson`.

The in-novel world view returns an `assets` summary from `GET /api/novels/:id/novel-world`. The backend merges this book's `NovelWorld` assets and source `World` sample assets, and returns standard placeholders for map, faction diagram, world timeline, character network, and power-system tree. When the same asset type has multiple rows, the summary keeps the newest by update time. The frontend should render this summary. It should not decide which asset types exist on the in-novel world page itself, or hard-code asset status into fixed copy.

The external world-sample workspace should also show map and diagram asset planning. Before a backend asset-summary API exists, it may show only fixed reserved entrypoints and organization prerequisites. That entrypoint helps authors understand "which visualization assets a world handbook can settle into." It must not replace the official `WorldAsset` list, and it must not become a generation-chain authority.

### Diagram display boundary

Frontend display of world diagrams has three layers: the view layer owns diagram type, filters, and legend; the React Flow canvas layer owns nodes, relationship edges, hit areas, zoom, and pan; the D3 layout layer owns initial positions of faction and geography nodes from world data. Outside modules use only the diagram-panel entrypoint. They should not bypass the canvas to call internal layout functions, and they should not rebuild a handwritten SVG interaction engine.

Faction diagrams use D3 force layout for relationship distance, node repulsion, and collision bounds. Geography diagrams use original relative coordinates as anchors, then weak position forces and collision forces to separate overlapping places. Layout must produce deterministic results from stable node identifiers, so the same data does not jump meaninglessly after refresh. Geographic coordinates are relative bearing hints, not precise GIS coordinates. The display layer may normalize overly narrow coordinates and separate overlapping places, but it must not write back or tamper with original coordinates saved on the backend.

Node names belong to React Flow custom HTML nodes. They are no longer computed as floating labels detached from the node. Relationship edges by default show only the short relationship from AI structured output. When a short label collides with a node or another label, hide the label but keep a widened relationship hit area. Hovering or focusing a relationship shows both names and the full relationship. Geography routes may continue to show route type, distance, and risk. The current relationship and its two endpoint nodes should be emphasized; other relationships drop visual weight.

Node cards must keep a path to read the full name: common names should wrap inside the card, and a name of any length must be readable on hover or keyboard focus. When relationship details use `EdgeLabelRenderer`, the connector path and the detail overlay are different hit layers. Leaving a relationship should keep a short close buffer so the mouse can enter the detail overlay stably, avoiding a flicker where the overlay appears, steals the hit, and toggles closed.

Node drag, zoom, pan, and relationship selection belong only to the current browsing session. They must not automatically write back world structure or asset data. Resetting the diagram restores D3 automatic layout and refits the viewport. Immersive display of faction and geography diagrams reuses the shared `FullscreenView`, keeping Esc to exit, page-scroll lock, zoom, pan, and reset. The diagram module must not reimplement fullscreen state management.

### Timeline display boundary

A world timeline must show chronological order and forward movement between events. It must not collapse into an ordinary list of stage fields and body text. Desktop uses a horizontal track, event nodes, and staggered cards above and below the track to create a sense that "the situation is evolving forward." Narrow screens use a vertical timeline in the same order, so a compressed horizontal canvas does not squash event content. Event body text is not force-truncated; complete information has priority over equal card heights.

The array order of `WorldVisualizationPayload.timeline` is the display authority. The frontend may slice by display count and respond to keyword filters, but it must not parse year strings and reorder on its own, and it must not hard-code narrative judgments such as "climax, turning point, ending" from keywords. If later work needs event type, impact scope, or causality, first extend the AI structured output and the shared data contract, then let the display layer consume them.

Current asset-type convention:

- `map`: world map, carrying regions, connections, faction control zones, story locations, and conflict heat.
- `faction_diagram`: faction diagram, carrying faction nodes, ally/enemy/vassal/rival relationships, and power contrast.
- `timeline`: world timeline, carrying historical events, current situation, and later changes.
- `character_network`: character relationship graph, carrying people, faction membership, and relationship tension.
- `power_system_tree`: power-system tree, carrying ranks, resources, costs, taboos, and breakthrough boundaries.

These assets are display and edit assets, not generation-chain authority. Chapter, character, outline, and other LLM calls still read this book's world slice through `WorldContextGateway`. If assets later participate in generation, they should first be summarized into `NovelWorld` or `StoryWorldSlice`, then emitted by the Gateway.

## Current migration-period APIs

- `GET /api/novels/:id/novel-world`: returns whether this book already has a novel-world instance, source type, source world ID, sync status, last sync time, pending sync partitions, recent sync records, and whether structured data and a Story Slice already exist.
- `GET /api/novels/:id/novel-world` also returns a lightweight `handbook` projection for the frontend "world handbook": world overview, core settings, main factions, this book's stage, and key tensions. This projection comes from `NovelWorld.structuredDataJson`. The frontend should not parse internal structure fields directly.
- `handbook.generationGuidance` is a user-facing projection that explains which character-identity boundaries, story-scope clues, scene-rule constraints, and out-of-bound check bases this book's world can provide. It only explains the existing structured world. It is not a new generation-chain context source. Text that actually enters the LLM is still emitted by `WorldContextGateway`.
- `GET /api/novels/:id/novel-world` also returns an `assets` summary for entrypoints such as world map, faction diagram, world timeline, character network, and power-system tree. When no asset has been generated, the backend returns placeholder status and the frontend only displays it.
- `POST /api/novels/:id/novel-world/import`: import a world from the external world library as this book's copy. After import, `Novel.worldId` is still updated for old-module compatibility, but the new authority copy is `NovelWorld`.
- `POST /api/novels/:id/novel-world/manual`: create a minimal structured world handbook, save it as an external world-library sample at the same time, bind it back to this book, then wait for the user to fill rules, factions, and story stage.
- `POST /api/novels/:id/novel-world/generate`: generate this book's world copy from the novel theme, and create and bind an external world-library sample at the same time. A compatibility `saveToLibrary` field on the request is accepted, but it does not turn off automatic library creation.
- `POST /api/novels/:id/novel-world/save-to-library`: save a this-book world with no source sample as an external world-library sample, and re-associate this book's world with that sample.
- `GET /api/novels/:id/novel-world/sync-diff`: compare this book's world copy with the source world-library sample and return displayable partition differences.
- `POST /api/novels/:id/novel-world/sync`: run sync after the user specifies `direction=push|pull` and an optional partition list.
- `GET /api/novels/:id/world-slice` and related refresh APIs are kept for now, to view and refresh the `StoryWorldSlice` that actually enters the generation chain.

Later UI should no longer treat "bind worldbuilding" as a single dropdown concept. It should show three entrypoints: import from the world library, generate from the novel theme, and customize this book's world. All three currently converge onto a `NovelWorld` copy, and the generation chain continues to read world context only through `WorldContextGateway`.

The novel-workspace basics page uses the "This book's world" card as the world entrypoint. It shows whether the novel-world copy exists, source type, sync status, and usable-slice status, and it provides primary actions such as "Choose a world source," "Organize this book's usage scope," "Open the source world handbook," "Sync management," and "Save as a world sample." The reference world sample in basics advanced settings is only for initialization reference and migration-period defaults. It must not be shown as the primary path for the world the novel actually uses.

Frontend component boundary:

- `NovelWorldManagerCard` only owns this book's world overview, world-handbook projection, world-asset entrypoints, sync status, and sync management.
- This-book world source selection, import from the sample library, generate from this book, and a custom blank handbook belong to `novelWorld/NovelWorldSourcePanel`, so the main card does not keep growing into a mixed multi-flow component.
- Later asset actions such as "Generate map" and "Generate faction diagram" should prefer a world-asset subcomponent or a separate asset panel. Do not keep stuffing them into the top of `NovelWorldManagerCard`.

## Related Modules

- `server/src/services/novel/worldContext/WorldContextGateway.ts`
- `server/src/services/novel/worldContext/NovelWorldInstanceService.ts`
- `server/src/services/novel/storyWorldSlice/NovelWorldSliceService.ts`
- `server/src/modules/novel/setup/http/novelWorldSliceRoutes.ts`
- `client/src/pages/novels/components/NovelWorldManagerCard.tsx`
- `client/src/pages/novels/hooks/useNovelWorldSlice.ts`
- `server/src/services/novel/characterPrep/CharacterPreparationService.ts`
- `server/src/services/novel/characterPrep/characterCastGeneration.ts`
- `server/src/services/novel/characterPrep/characterPreparationSupplemental.ts`

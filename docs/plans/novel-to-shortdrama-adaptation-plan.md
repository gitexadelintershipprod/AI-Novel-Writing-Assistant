# Short-Drama Creation Platform Detailed Implementation Plan

Updated: 2026-06-09

Related drafts:

- `.claude/plan/novel-to-shortdrama-adaptation.md`
- `.claude/plan/novel-to-shortdrama-adaptation-1.md`

## 1. Background and Goals

The short-drama module should not be only a downstream adaptation button on the novel module. It should become an independent creation platform whose core product is “vertical-screen paid short drama.” Content sources can be novels from this system, original ideas, or any imported text. The platform brings its own character assets, rhythm engine, script production line, quality gate, and later audiovisual production chain.

This plan’s goal is to land the DramaForge direction from the drafts as an executable blueprint:

- Keep `drama` as an independent bounded context; the business layer does not depend on `novel` internal services.
- Use `SourceBundle` as the content-source anti-corruption layer, unifying novel import, original, and text import.
- Prioritize running the MVP: novel import -> standard content pack -> strategy -> episode outline -> per-episode script -> quality gate -> export.
- Keep clear boundaries for later original short drama, character library, storyboard, video generation, and independent deployment.

## 2. Current Execution Status

As of 2026-06-09, this plan has advanced to the Phase 6 vertical skeleton: short-drama projects, three content sources, anti-corruption layer, strategy, episodes, scripts, quality gate, repair, export, character library, storyboard, video prompts, mock VideoProvider, and generic HTTP VideoProvider already have API and type verification. The frontend workbench already covers main-path entries, next-step guidance, quality-issue summaries, and video-task status; service-level main-chain contracts already cover “script -> quality repairable -> repair -> storyboard -> video prompt -> provider task.” Concrete vendor deep adaptation and full browser-side acceptance are still unfinished.

| Scope | Current status | Evidence and gaps |
| --- | --- | --- |
| Independent routes | Skeleton exists | `server/src/app.ts` already mounts `/api/drama`; `server/src/modules/drama/http/dramaRoutes.ts` provides project, content-pack assembly, track, hook, strategy, and episode-outline APIs. |
| Independent service directory | Skeleton exists | `server/src/services/drama/` already has `contracts/`, `source/`, `engine/`, strategy services, and episode-outline services. |
| Anti-corruption layer | Vertical skeleton exists | Already has `SourceContentPort`, `SourceBundle`, `NovelSourceAdapter`, `OriginalSourceAdapter`, and `TextImportSourceAdapter`. |
| Low-coupling guard | Tests exist | `server/tests/dramaDecoupling.test.js` checks that `services/drama` does not import novel-domain paths. |
| Prisma schema | Completed through video prompts | `schema.prisma` and `schema.sqlite.prisma` already have `DramaProject`, `DramaSourceBundle`, `DramaCharacter`, `DramaEpisode`, `DramaFact`, `DramaCharacterLibrary`, `DramaStoryboard`, `DramaShot`, `DramaVideoPrompt`, plus dual-database migrations. |
| Rhythm engine | Partially done | Already has track templates, hook library, default paywall-beat policy, and emotion-curve targets. Rules are still code constants; an editable rule library or seed-data management is not yet supported. |
| Strategy / episode outline | Prompt registration closed | Short-drama PromptAssets have been moved into `server/src/prompting/prompts/drama/` and registered. |
| Script production line | Backend skeleton exists | Added context assembly, per-episode script generation, single-episode repair, and Markdown/JSON export APIs. |
| Quality gate | Backend skeleton exists | Added short-drama quality-gate PromptAsset and `qualityFlags` writes; `repairable` and `blocked` enter `needs_repair`, so a repairable script does not go directly into storyboard and video stages. |
| Multiple content sources | Backend skeleton exists | `original` / `text_import` already connect to AI structured SourceBundle adapters. |
| Character assets | Short-drama asset workbench exists | Can import SourceBundle characters, edit project characters, save to the character library, and import from the character library; frontend has been reorganized around short-drama production into on-screen function, audience recognition, fixed look, performance voice, dialogue rules, and conflict relations. Later still needs AI auto-complete of character assets and consistency checks. |
| Frontend workbench | Main path usable, still needs browser acceptance | `/drama` and `/drama/projects/:id` already cover create wizard, novel selection, AI track recommendation, material-supplement suggestions, next-step task cards, episode scripts, quality issues, characters, storyboard video, and export entries; full browser-side acceptance is still missing. |
| Storyboard / video / screenplay fidelity | Storyboard and video chain reached generic provider adapter | Added storyboard, shots, video prompts, mock VideoProvider, generic HTTP VideoProvider, and provider selection/status summary; video tasks project `resultUrl` and `failureReason`, and service-level contract tests lock repair-before-video-production. Concrete vendor deep adaptation and the screenplay-fidelity layer are still unimplemented. |

## 3. Product Boundaries

### 3.1 User goals

The target user is still a creation beginner who lacks film/TV writing experience. The short-drama module must lower cognitive load, not require the user to understand pleasure-point curves, paywall beats, storyboard language, or video-prompt engineering.

The core experience should be:

```text
Choose a content source
  -> System organizes shootable short-drama material
  -> Choose or accept a recommended track
  -> AI gives a short-drama strategy
  -> AI plans episodes
  -> AI writes per-episode scripts
  -> System checks hooks, paywall beats, duration, and fact consistency
  -> User can edit, regenerate, export
```

Advanced capabilities such as character library, storyboard, and video generation should serve this main path. Do not expand the short-drama module into a general chat tool or a general video tool.

### 3.2 Content sources

Short-drama core only consumes a standardized `SourceBundle`. It does not directly consume novels, external text, or user ideas.

```text
novel_import
  -> NovelSourceAdapter
original
  -> OriginalSourceAdapter
text_import
  -> TextImportSourceAdapter
       |
       v
SourceBundle
       |
       v
Drama core pipeline
```

Differences among the three sources exist only in the adapter and Bundle quality gate. Strategy, episodes, scripts, quality gate, export, storyboard, and video prompts should all reuse the same core production line.

## 4. Architecture Boundaries

### 4.1 Directory-structure target

```text
server/src/modules/drama/
  http/
    dramaRoutes.ts

server/src/services/drama/
  contracts/
    sourceBundle.ts
    dramaDtos.ts
  source/
    SourceContentPort.ts
    NovelSourceAdapter.ts
    OriginalSourceAdapter.ts
    TextImportSourceAdapter.ts
  character/
    DramaCharacterService.ts
    DramaCharacterLibraryService.ts
  engine/
    rhythmEngine.ts
    rhythmRuleCatalog.ts
  pipeline/
    DramaStrategyService.ts
    DramaEpisodeOutlineService.ts
    DramaScriptService.ts
    DramaExportService.ts
    DramaContextAssembler.ts
  quality/
    DramaQualityGate.ts
    DramaRepairService.ts
  visual/
    DramaStoryboardService.ts
    DramaVideoPromptService.ts
    VideoProviderPort.ts
```

When adding files, prefer the responsibility directories above. Avoid continuing to stack same-prefix files at the `services/drama` root.

### 4.2 Dependency rules

- `server/src/services/drama/**` must not import `server/src/services/novel/**`, `server/src/modules/novel/**`, or novel business-internal types.
- `NovelSourceAdapter` is the only drama file allowed to understand novel data shape, and even then it may only Prisma-read novel tables; it does not call novel services.
- `drama` may reuse platform infrastructure: Prisma, LLM provider, `runStructuredPrompt`, task queue, ImageAsset, file-export tools.
- `drama` owns its own fact ledger, character assets, quality gate, and context assembly. It does not reuse novel-module business services.
- Frontend `/drama` is not nested inside the novel detail page; the novel page may provide a “convert to short drama” entry, but after create it enters the independent short-drama workbench.

### 4.3 Prompt Governance

Short-drama product-level prompts must obey project Prompt Governance:

- Add or migrate to `server/src/prompting/prompts/drama/`.
- Register in `server/src/prompting/registry.ts` with explicit `id`, `version`, `taskType`, `mode`, `contextPolicy`, and `outputSchema`.
- The service layer calls structured output through registered PromptAssets.
- Do not add unregistered `systemPrompt` / `userPrompt` strings inside business services.
- Structured failure should fix prompt, schema, JSON repair, or context assembly. Do not add keyword fallbacks to hide failure.

Current short-drama `strategy` and `episodeOutline` prompts are already PromptAsset-shaped, but location and registration still need closing.

## 5. Data-Model Plan

### 5.1 MVP-required models

MVP must first complete and migrate these models:

```prisma
model DramaProject
model DramaSourceBundle
model DramaCharacter
model DramaEpisode
model DramaFact
```

Requirements:

- SQLite and PostgreSQL schemas stay consistent.
- Both migrations and migrations.sqlite must have corresponding create-table SQL.
- `DramaProject.sourceRef` can only be a soft reference; do not create a foreign key to `Novel`.
- `DramaFact` initializes from `SourceBundle.hardFacts`; later script generation and quality gate also write short-drama-owned facts.
- `DramaEpisode` needs to support a `planned -> scripting -> scripted -> reviewed -> needs_repair -> approved` status flow.

### 5.2 P4-P7 extension models

Add these after the character library and audiovisual production line enter:

```prisma
model DramaCharacterLibrary
model DramaStoryboard
model DramaShot
model DramaVideoPrompt
model DramaScreenplay
model DramaScene
```

These models must not block the script production line early in MVP, but field design must keep character visual anchors and source mapping:

- `DramaShot.characterRefs` points to a `DramaCharacter` soft reference.
- `DramaVideoPrompt` reads the character `visualAnchor` and does not re-infer appearance.
- `DramaScreenplay` and `DramaScene` are an optional fidelity layer and should not become a prerequisite of the short-drama MVP.

## 6. Core Pipeline

### 6.1 Standard flow

```text
CreateProject
  -> AssembleSourceBundle
  -> ImportCharactersAndFacts
  -> GenerateStrategy
  -> GenerateEpisodeOutline
  -> GenerateEpisodeScript
  -> QualityGate
  -> RepairOrApprove
  -> Export
```

### 6.2 SourceBundle assembly

`assembleSourceBundle(projectId)` must complete:

1. Read project source.
2. Resolve the adapter through the registry.
3. Produce a `SourceBundle`.
4. Write `DramaSourceBundle`.
5. Initialize or sync `DramaCharacter`.
6. Initialize `DramaFact`.
7. Write bundle quality status.

The Bundle quality gate at least checks:

- `synopsis` is not empty.
- `beats` are enough to support the target episode count, or it is explicit that AI expansion is needed.
- `characters` include the protagonist and the main opposing character.
- `hardFacts` have no obvious conflicts.
- `text_import` raw text does not exceed the model context budget; over-long text needs summary/chunking first.

### 6.3 Strategy planning

Strategy output must include:

- `positioning`: who this short drama is sold to, and what pleasure points it sells.
- `mainPleasureLine`: the main pleasure line through the whole drama.
- `paywallPlan`: free-episode range, first paywall point, key paywall-reversal episodes.
- `emotionCurveTarget`: distribution of buildup and release.
- `trackFit`: track-fit reasons and track taboos.
- `deviationDeclaration`: allowed adaptation-deviation boundary relative to the source story.

The deterministic engine owns paywall-beat and track-rule constraints. The LLM owns turning the source story into an executable strategy.

### 6.4 Episode outline

Each episode outline must include:

- `order`
- `title`
- `hookOpening`
- `hookType`
- `conflict`
- `cliffhanger`
- `emotionNet`
- `sourceBeatRefs`
- `expectedDurationSec`
- `paywallRole`

`isPaywall` does not trust LLM output. `RhythmEngine` determines it from the project paywall policy.

### 6.5 Per-episode script

Add `DramaScriptService` to JIT-generate scripts per episode. Inputs include:

- project strategy;
- this episode’s outline;
- character assets and speaking style;
- current `DramaFact` facts;
- summaries of the previous 1-3 episodes;
- related `SourceBeat` and `sourceMap`;
- target duration, vertical-screen scene limits, and dialogue-density requirements.

Output at least includes:

```ts
{
  content: string;
  durationSec: number;
  sceneCount: number;
  opening3s: string;
  endingCliffhanger: string;
  newlyIntroducedFacts: Array<{
    text: string;
    category: "completed" | "revealed" | "state_changed";
  }>;
  episodeSummary: string;
}
```

On save, update `DramaEpisode.content`, `durationSec`, `status`, and write new facts into `DramaFact`.

### 6.6 Quality gate and repair

Add `DramaQualityGate`, executed by default after each episode script is generated. The quality gate should not automatically block the whole short-drama flow unless there is no usable script or a data-integrity risk.

Check dimensions:

| Dimension | Judgment |
| --- | --- |
| Golden 3 seconds | Whether the opening has conflict, suspense, or contrast. |
| Golden 30 seconds | Whether who, goal, and resistance are clear within 30 seconds. |
| Information density | Whether there are long environment explanations, low-value setup, or conflict-free dialogue. |
| Paywall beat | Whether an `isPaywall` episode has a strong enough reversal or unfinished question. |
| Emotion curve | Whether it stays low and frustrated with no release for too long, or dumps a large pleasure point too early. |
| Duration | Whether it falls in the configured duration range. |
| Fact consistency | Whether it conflicts with `DramaFact`. |
| Character consistency | Whether character speaking style, motivation, and relations drift. |

Output:

```ts
{
  status: "approved" | "repairable" | "continue_with_warning" | "blocked";
  score: {
    hook: number;
    density: number;
    paywall: number;
    emotion: number;
    duration: number;
    consistency: number;
    overall: number;
  };
  flags: Array<{
    severity: "low" | "medium" | "high" | "critical";
    code: string;
    evidence: string;
    suggestion: string;
  }>;
  repairPlan?: {
    mode: "patch" | "regenerate";
    instruction: string;
  };
}
```

Repair rules:

- Default at most one automatic repair.
- If still usable after repair but with issues, record `qualityFlags`; status may be `reviewed` or `needs_repair`; do not block later episodes.
- Stop only when there is no usable script, a severe fact conflict that cannot be handled automatically, or the user chooses strict mode.

## 7. Frontend Plan

### 7.1 Routes and entries

- Add an independent `/drama` workbench.
- The novel detail page only provides a “Create short-drama project” entry; after create, jump to `/drama/projects/:id`.
- Top-level nav may add a “Short drama” entry to show this is an independent module.

### 7.2 Page structure

```text
/drama
  Project list
  New project

/drama/projects/:id
  Overview
  Source and strategy
  Episodes
  Characters
  Quality issues
  Export
  Later: storyboard / video
```

### 7.3 New-project wizard

Beginner default flow:

1. Choose a content source: import novel, original short drama, paste text.
2. Enter a title or select a novel.
3. Choose a track; the system may recommend from the source.
4. Set target episode count, default 80.
5. Click “Generate short-drama strategy.”

UI copy must explain from the user’s perspective what the next step will produce. Do not write implementation-migration, module-split, or “already upgraded” descriptions.

### 7.4 Workbench capabilities

- Strategy card: positioning, main pleasure line, paywall beats, emotion curve.
- Episode list: episode number, title, hook, paywall beat, emotion net, quality status.
- Single-episode editor: script prose, regenerate, quality check, quality-issue hints.
- Source mapping: show this episode’s corresponding source beats or novel chapters.
- Character page: short-drama character asset cards, on-screen function, audience recognition, fixed-look anchors, performance and voice anchors, dialogue rules, conflict relations.
- Export: Markdown / JSON; later may extend screenplay formats.

## 8. Phased Implementation

### Phase 0: Docs, migrations, and P0 close

Goal: make the existing backend skeleton a deployable, verifiable P0.

Tasks:

- Treat this plan as the formal implementation blueprint under docs.
- Complete PostgreSQL and SQLite migrations for existing `Drama*` models.
- Confirm that after Prisma Client generation, models such as `dramaProject` and `dramaEpisode` are usable.
- Move existing short-drama prompts into `server/src/prompting/prompts/drama/` and register them.
- Keep and extend the low-coupling guard test.
- Add source-registry behavior tests: an unregistered source must return an explainable error.

Done when:

- `pnpm --filter @ai-novel/server typecheck` passes.
- `node --test server/tests/dramaDecoupling.test.js` passes.
- Migrations can create `Drama*` tables.
- Prompt Workbench can list short-drama strategy and episode-outline prompts.

### Phase 1: MVP backend main chain

Goal: run the short-drama script MVP with `novel_import`.

Tasks:

- Complete content-quality strengthening of `NovelSourceAdapter`, including world-setting and chapter-summary boundaries.
- Add `DramaContextAssembler`.
- Add `DramaScriptService` and a script PromptAsset.
- Add `DramaQualityGate` and a quality PromptAsset.
- Add `DramaRepairService`, supporting single-episode patch or regenerate.
- Add `DramaExportService`, exporting episode Markdown / JSON.
- API additions:
  - `POST /api/drama/projects/:id/episodes/:order/script`
  - `POST /api/drama/projects/:id/episodes/:order/review`
  - `POST /api/drama/projects/:id/episodes/:order/repair`
  - `GET /api/drama/projects/:id/export`

Done when:

- Selecting a novel can generate a SourceBundle.
- Strategy and a 1-12 episode outline can be generated.
- Any planned episode can generate a script and save it.
- Quality gate can write `qualityFlags`.
- A single episode can be regenerated.
- Generated episode documents can be exported.

### Phase 2: Frontend MVP workbench

Goal: users can complete the short-drama MVP main path without using APIs.

Tasks:

- Add client drama API.
- Add `/drama` project list and new-project wizard.
- Add project workbench covering strategy, episodes, single-episode edit, and export.
- Episode list shows hook, paywall beat, emotion net, and quality status.
- Single-episode page supports generate, regenerate, quality check, and edit-save.

Done when:

- Users can create a novel-import short-drama project from the UI.
- Users can complete content-pack assembly, strategy generation, episode outline, single-episode script generation, and export in the UI.
- Page copy obeys UI Copy Rules.

### Phase 3: Multiple content sources

Goal: prove the short-drama module is not a novel add-on.

Tasks:

- Add `OriginalSourceAdapter`, generating a SourceBundle from idea, genre, and track.
- Add `TextImportSourceAdapter`, parsing a SourceBundle from pasted text.
- Add a Bundle quality gate; when unqualified, give supplement questions or auto-summary repair.
- UI new-project wizard supports three sources.

Done when:

- Original input can generate a SourceBundle and enter the same short-drama production line.
- Text import can generate a SourceBundle and enter the same short-drama production line.
- The three sources reuse the same services at strategy, episode, and script stages.

### Phase 4: Character assets and character library

Goal: support short-drama character reuse and video consistency.

Tasks:

- Add `DramaCharacterLibrary` model and migrations.
- Add character CRUD, character-library import, save project characters to the library.
- Complete character fields for archetype, speechStyle, visualAnchor, voiceProfile.
- Script generation injects character speaking style; quality gate checks character drift.

Done when:

- Users can edit project characters.
- Users can reuse short-drama character setups from the character library.
- Scripts and later storyboards read the same character visual anchors.
- The character page is centered on short-drama shooting and video consistency, not on long novel-character lore text.

### Phase 5: Storyboard layer

Goal: turn scripts into shootable or video-generatable shot sequences.

Tasks:

- Add `DramaStoryboard`, `DramaShot` models and services.
- Script -> shot-sequence PromptAsset.
- Each shot includes shot size, characters, action, dialogue summary, duration, visual-anchor references.
- UI adds a storyboard view.

Done when:

- An episode with a generated script can generate a storyboard.
- Each shot can trace back to character visual anchors and script passages.

### Phase 6: Video prompts and Provider

Goal: abstract AI video-generation access without locking a single vendor.

Tasks:

- Add `DramaVideoPrompt` model.
- Add `VideoProviderPort`.
- Add the first provider adapter.
- Shot -> video-prompt PromptAsset.
- Task status connects to Task Center or drama-owned task projection.

Done when:

- A single shot can generate a video prompt.
- Provider task status can be queried.
- Replacing a provider does not affect the drama core pipeline.

### Phase 7: Screenplay-fidelity layer

Goal: support generic screenplay and more professional export, without blocking MVP.

Tasks:

- Add `DramaScreenplay`, `DramaScene`.
- Support script -> scenic screenplay conversion.
- Support screenplay Markdown / JSON / later industry-format export.

Done when:

- Users can choose episode-script export or screenplay-fidelity export.
- The screenplay layer does not break the existing short-drama episode-script chain.

## 9. Tests and Verification

### 9.1 Backend tests

Must cover:

- `services/drama` low-coupling guard.
- Service-level main-chain contract of `script -> quality gate -> repair -> storyboard -> video prompt -> provider task`, especially that a `repairable` quality result must enter the repair queue first.
- `SourceContentRegistry` register, resolve, unregistered error.
- `NovelSourceAdapter` can generate a SourceBundle from novel data.
- `RhythmEngine` beat calculation and track-hook recommendation.
- Strategy and episode-outline prompt schema validation.
- `DramaScriptService` saves scripts and writes facts.
- `DramaQualityGate` produces structured flags for no hook, weak paywall beat, over duration, and fact conflict.
- Single-episode repair only affects the target episode.
- Export includes title, episode number, script, hook, paywall beat, and quality marks.

### 9.2 Frontend tests

Must cover:

- `/drama` project list can load empty state and existing projects.
- New-project three-source form validation.
- Project workbench can show strategy, episodes, and characters.
- Single-episode generating, success, failure, and needs-repair states.
- Export button state and error hints.

### 9.3 Manual acceptance script

MVP acceptance at least once:

1. Select an existing novel.
2. Create a short-drama project.
3. Assemble SourceBundle.
4. Generate strategy.
5. Generate a 12-episode outline.
6. Generate episode 1 script.
7. Run the quality gate.
8. Regenerate or repair episode 1 once.
9. Export Markdown.
10. Confirm drama data can save without a novel foreign key.

## 10. Risks and Close-out Rules

| Risk | Close-out rule |
| --- | --- |
| Short-drama module recouples to novel business | Keep the CI guard; before adding a dependency, first judge whether it is platform infrastructure or novel business. |
| Prompts scattered in services | All short-drama PromptAssets move into the prompting registry. |
| Multiple content sources only add API fields, not adapters | Do not claim `original` / `text_import` done before Phase 3. |
| Quality gate blocks whole production | Local quality debt is recorded by default and continues; stop only for no usable content or data-integrity risk. |
| Frontend becomes an expert tool | Default recommended track, default episode count, default paywall-beat policy; advanced configuration collapsed. |
| Video provider lock-in | Access only through `VideoProviderPort`; provider fields are not written into core strategy. |
| Hard-coded rule library is hard to iterate | MVP may start as constants; after P3/P4, migrate to an editable rule library or seed data. |

## 11. MVP Acceptance Checklist

- [ ] `services/drama` does not directly import novel business modules; low-coupling guard passes.
- [ ] `Drama*` schema and migrations exist in sync under SQLite / PostgreSQL.
- [ ] Short-drama PromptAssets live in `server/src/prompting/prompts/drama/` and are registered.
- [ ] Novel import can produce a standard `SourceBundle`.
- [ ] SourceBundle initializes `DramaCharacter` and `DramaFact`.
- [ ] Rhythm engine can produce deterministic paywall beats from track and paywall policy.
- [ ] Strategy generation successfully writes `DramaProject.strategy`.
- [ ] Episode outline successfully writes `DramaEpisode`, including hook, paywall beat, emotion net, and source mapping.
- [ ] Single-episode scripts can JIT-generate, save, and regenerate.
- [ ] Quality gate can identify no hook, weak paywall beat, emotion-curve issues, duration issues, and fact conflicts.
- [ ] On repair failure, record quality debt; do not block later episodes by default.
- [ ] Short-drama scripts can export Markdown / JSON.
- [ ] `/drama` frontend workbench can complete the MVP main flow.
- [ ] UI copy faces user tasks and does not describe implementation migration.

## 12. Recommended Next Steps

Next-phase priority order:

1. Complete `Drama*` migrations so the current P0 schema is deployable.
2. Migrate and register existing short-drama prompts, eliminating Prompt Governance drift.
3. Move `DramaStrategyService` and `DramaEpisodeOutlineService` into `pipeline/`, reducing root-directory stacking.
4. Add `DramaScriptService`, script PromptAsset, and single-episode generation routes.
5. Add `DramaQualityGate` and single-episode quality flags.
6. Add a minimal frontend `/drama` workbench.

Do not claim the short-drama MVP is running before items 1-5 are done; do not claim it is user-usable before item 6 is done.

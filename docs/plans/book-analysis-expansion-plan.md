# Book Analysis Module Expansion Long-Term Plan

## 1. Positioning

The current book-analysis module assumes that “the user is a passive receiver of source data, and analysis is a one-shot fully automatic product.” All output is organized around 8 fixed sections, structured key conclusions, and Markdown prose. The goal is reusable material for later novel generation, continuation reference, and knowledge-base recall.

This plan evolves book analysis from a “fully automatic production tool” into a “user-collaborative research workbench,” covering three use cases:

- **Learning scenario** (main line): beginner authors, through close reading + user intervention + conversational questions, turn another work’s craft into cognition they can reuse;
- **Continuation scenario** (side line): keep the existing `NovelReferenceService` chain’s ability to consume book-analysis results; new dimensions must not break existing contracts;
- **Asset-library scenario** (later): settle reusable structured assets such as character archetypes and scene templates across novels; this cycle does not invest in it as a main effort, but must reserve an upgrade channel.

Directions explicitly out of this cycle:

- Automatic rerun / incremental update of book analysis (start after chapter entities land);
- Multi-book comparison matrix / cross-book clustering (do this after a large enough analysis library exists);
- Intelligent matching / scoring system (depends on all of the above).

## 2. Completed Phases

| Phase | Main change | Status |
|---|---|---|
| PR-1 evidence field binding + publish cleanup | evidence adds `fieldKey/fieldIndex`; duplicate publish keeps only the latest binding | ✅ Merged |
| PR-2 structured-array truncation warning | introduce `BOOK_ANALYSIS_STRUCTURED_ARRAY_LIMIT`, warning fields, UI hints | ✅ Merged |
| PR-3 timeline field-structure upgrade | add `timelineNodeArray` type; nodes include `label/timeHint/phase/sourceRefs` | ✅ Merged |
| PR-4 timeline shared-utils refactor | node normalization extracted to shared; `NovelReferenceService` switches to structured access | ✅ Merged |
| PR-5 overview → others two-stage | generate overview first; other sections receive `BookAnalysisOverviewContext` when concurrent | ✅ Merged |
| PR-5.1 closing small fixes | delete leftover overview-summary dead code in `runFullAnalysis` stage two; `runSingleSection` injects overview context | ✅ Merged |
| Phase 1: user intervention | global analysis focus and per-section special focus, carried on create, rebuild, single-section rerun, and Prompt | ✅ Implemented |
| Phase 2: chapters and evidence backtrace | `DocumentChapter` cache, evidence chapter locate and source highlight | ✅ Implemented |
| Phase 3: deep character dossiers | independent analysis characters, candidate recognition, on-demand dossier generation, arcs and scene performance | ✅ Implemented |
| Phase 4: character images and promotion | `book_analysis_character` image scene, primary-image management, and promotion to character library | ✅ Implemented |
| Phase 5: diagnosis mode | export Novel prose as a knowledge document and reuse the analysis chain to create a diagnostic analysis | ✅ Implemented |
| P0 budget-recovery patch | adjustable budget, expand-budget-and-continue after budget exhausted, successful and frozen sections exempt from overwrite | ✅ Implemented |
| Phase 6 L2 workbench view switching | top-level mutually exclusive “Section analysis / Character dossiers” Tab; Toolbar lifted to Page for cross-view sharing; URL `?view=` sync | ✅ Implemented |

## 3. Paradigm Shift

All later-phase expansions center on three fundamental changes:

- **Source data is accessible** — users can look up, index, and backtrace original material, not only consume output;
- **User intervention** — analysis has an intent layer, can be directed, and can be conversational;
- **Multi-dimensional breakdown** — characters and scenes become first-class entities; structured capability upgrades from “section fields” to “entity + sub-entity + cross dimensions.”

Together these three changes upgrade book analysis from “produce a fixed template” to “an on-demand deep-dive research workbench.”

## 4. Expansion Direction Matrix

### 4.1 Direction A: source-data accessibility

| Sub-direction | Content | This cycle? |
|---|---|---|
| A1 chapter entity | Split `DocumentVersion.content` into `Chapter`, with chapter summary, word count, appearing characters | This cycle |
| A2 evidence backtrace | evidence fields add `chapterIndex/offsetRange`; UI click jumps to source highlight | This cycle |
| A3 chapter annotation / notes | users highlight original text and write notes, which can be fed into the next analysis | Later |

A1 is the shared prerequisite for A2/A3 + Direction D (scene recognition) + Direction E (incremental analysis / chapter follow-read). This plan ranks A1 as highest priority.

### 4.2 Direction B: user intervention

| Sub-direction | Content | This cycle? |
|---|---|---|
| B1 global instruction layer | On analysis start, enter “this time focus on ensemble-scene rotation,” injected as a prefix into all section prompts | This cycle |
| B2 section-level focus | A separate “special focus” instruction per section, suitable for a second close analysis | This cycle |
| B3 conversational close reading | Select original text / evidence and click → ask AI | Later (depends on A2) |

### 4.3 Direction C: character depth

See section 5. This cycle’s main work.

### 4.4 Direction D: scene recognition

| Sub-direction | Content | This cycle? |
|---|---|---|
| D1 automatic scene recognition | Further split chapters into scenes that are stable in “place + time + present characters” | Later (depends on A1) |
| D2 scene type and craft | Tag each scene (action / dialogue / interiority / turn), plus craft analysis | Later |
| D3 scene template library | Abstract high-value scenes into reusable templates | Later |

This cycle only reserves an extension point for Direction D: Direction C’s `BookAnalysisCharacterScene` is designed not to require a formal “scene” entity; it first uses text description, then upgrades the link after D1 lands.

### 4.5 Direction E: non-linear directions

| Sub-direction | Content | This cycle? |
|---|---|---|
| E1 analyze one’s own draft | Run the same mechanism on the user’s own draft, positioned as “diagnosis mode” | Validation item (light investment) |
| E2 comparative analysis | Field-level cross comparison of multiple similar works | Later |
| E3 writing-goal matching scores | Recommend the N most worth-reading books in the analysis library from the user’s writing intent | Later |
| E4 incremental chapter follow-read | After a document version changes, rerun only sections related to changed chapters | Later (depends on A1) |

E1 is a side-path validation of “zero architecture change / may open a new scenario.” Treat it as an independent validation item interleaved into delivery.

## 5. Independent Character-Module Expansion (Option A: keep coexistence)

### 5.1 Selection conclusion

**Do not reuse `Character`, do not reuse `CharacterCandidate`, create an independent `BookAnalysisCharacter` entity**, for these reasons:

| Alternative | Main problem |
|---|---|
| Fully reuse `Character` | Must invent a placeholder Novel; 55+ fields are designed for “writing execution” and sit empty in analysis; 14 child tables cascade too heavily |
| Adapt `CharacterCandidate` | Its status state machine is designed around “promote to Character,” which analysis does not need; `novelId` is required, so schema must also change |
| Fully independent, zero sharing | Misses `BaseCharacter` library settlement value; field definitions diverge; user perception is inconsistent |
| **Independent + shared field schema + explicit promotion channel** ✓ | Analysis side stays clean, character library benefits, field consistency is controllable |

The short-drama module already took an “independent entity” path for `DramaCharacter`. Book analysis has no reason to invade the main creation chain more than short drama does.

### 5.2 Entity design

Add three Prisma models, all hanging under `BookAnalysis`:

| Model | Relation | Main fields | Notes |
|---|---|---|---|
| `BookAnalysisCharacter` | BookAnalysis 1—N | name, role, status, briefDescription, importance, occurringChaptersJson, generationDepth, selectedDimensionsJson, profileJson, evidence | Analysis character candidates and full dossiers share one entity; candidate stage `profileJson` may be empty; generated stage stores quick/standard/deep dossiers |
| `BookAnalysisCharacterArc` | Character 1—N | chapterRef, stageLabel, stateSnapshotJson | Character × chapter arc nodes, corresponding to idea 3 “growth tracking” |
| `BookAnalysisCharacterScene` | Character 1—N | sceneLabel, sceneType, performanceJson, evidence | Character × scene performance, corresponding to idea 4; this cycle `sceneLabel` is a string, upgraded to a relation after D1 lands |

All child tables `onDelete: Cascade`. Character does not hang on Novel. Deleting BookAnalysis cleans the whole tree.

### 5.3 Shared field schema

Create `shared/types/characterProfile.ts`, defining “common person dimensions” as the alignment contract for three sides:

- **Basic information**: name, aliases, age, gender, role
- **Appearance dimension**: appearance, physique, attireStyle, signatureDetail
- **Personality dimension**: personality, values, speakingStyle
- **Motivation dimension**: outerGoal, innerNeed, fear, wound, misbelief
- **Arc dimension**: arcStages (array), growthTrajectory
- **Relation dimension**: keyRelations (including target character, relation type)
- **Scene-performance dimension**: highlightScenes (including scene description, performance analysis)

Alignment strategy for the three character entities:

- `BaseCharacter`: fields fit the schema most closely; new fields should align first;
- `BookAnalysisCharacter`: uses a schema subset plus analysis-specific fields (authorTechnique, readerFeedback, designReferences);
- `Character`: heavy historical baggage; existing fields stay as-is; **only align the schema when adding new fields**; do not force a retrospective rewrite.

Chinese field labels, order, and length limits are defined together in `shared/types/characterProfile.ts`, avoiding divergence such as “personality vs temperament.”

### 5.4 Promotion channel

Users can actively promote a `BookAnalysisCharacter` from analysis results into a `BaseCharacter`:

- Triggered explicitly by the user (UI button “Add to character library”); **no automatic sync**;
- On promotion, copy shared-schema fields; analysis-specific fields (such as evidence, sceneRefs) stay on the original `BookAnalysisCharacter` and are not carried;
- On `BaseCharacter`, record source via `sourceType` + `sourceRefId` (reuse the existing `CharacterSyncProposal` field pattern);
- After promotion the two evolve independently with no two-way link — avoid analysis data reverse-polluting the character library.

### 5.5 Character image generation (reuse existing image module)

Analysis character dossiers should let users generate a reference likeness for each character, helping beginner authors turn “text description” into “visual impression” and deepen understanding of characterization. This cycle does not rebuild the image chain. **Fully reuse the existing image module**.

#### Existing reusable assets

| Asset | Location | Reuse value |
|---|---|---|
| `ImageGenerationTask` / `ImageAsset` models | `server/src/prisma/schema.prisma` | polymorphic design (`baseCharacterId?` / `novelId?` both optional), naturally supports adding a new optional relation field |
| `ImageSceneType` enum | same | already reserved `chapter_illustration` slot, proving the enum is an extension point |
| `ImageGenerationService` | `server/src/services/image/` | already supports character + novel_cover dual sceneType; new sceneType extends via existing switch branches |
| `ImagePromptOptimizationService` | same | prompt-optimization capability is reusable |
| `buildCharacterImagePrompt` | `shared/imagePrompt` | accepts a field object, not bound to an entity; can feed `BookAnalysisCharacter.profileJson` directly |
| `imageAssetStorage` | `server/src/services/image/` | file storage, URL building, cleanup logic |
| `ImageGenerationConfirmDialog` + `useImageGenerationFlow` | `client/src/components/image/` | generation confirm dialog and progress-tracking flow |

#### Selection conclusion: extend sceneType + add optional relation

Comparison of three candidate paths:

| Path | Implementation | Advantage | Disadvantage | Assessment |
|---|---|---|---|---|
| Extend sceneType + add optional relation field | add `book_analysis_character` to `ImageSceneType`; add `bookAnalysisCharacterId String?` to task/asset | fully reuses provider / storage / UI / prompt; light intrusion | modifies image model schema | ✅ Recommended |
| Image only after promotion | analysis characters do not get images directly; after promotion to `BaseCharacter`, use existing character image flow | zero intrusion on image model | violates the intuition of “see the image first, then decide whether to promote”; blocks the learning-scenario loop | Not recommended |
| Fully independent image entity | create `BookAnalysisCharacterImageAsset` | fully decoupled | duplicates storage, provider, UI, prompt optimization; violates reuse | Not recommended |

Recommend **path 1**, because:

- `ImageSceneType` was designed as an extension point (`chapter_illustration` already reserved);
- new `bookAnalysisCharacterId` is isomorphic with existing `baseCharacterId` / `novelId`, reusing `resolveTaskOwnerKey` / `buildAssetOwnerWhere` and similar existing patterns;
- single-point enum + field addition, blast radius controllable;
- on promotion, optionally copy already generated image assets (see below).

#### Collaboration with the promotion channel

- Images generated for a `BookAnalysisCharacter` during analysis stay on the analysis side (`sceneType = book_analysis_character`);
- When the user promotes that character to `BaseCharacter`, **by default carry the selected primary image (`isPrimary = true`)**: clone an `ImageAsset` copy; the new copy uses `baseCharacterId` as owner, `sceneType = character`;
- Original analysis-side assets remain; they cascade when BookAnalysis is deleted;
- The promotion dialog provides a checkbox “also add the primary image to the character library,” checked by default, user may uncheck;
- No two-way sync: after promotion, image assets on both sides evolve independently.

#### File-level change list (character images only)

- `server/src/prisma/schema.prisma` — add `book_analysis_character` to `ImageSceneType`; add `bookAnalysisCharacterId String?` field + reverse relation on `ImageGenerationTask` / `ImageAsset`; add `imageTasks` / `imageAssets` reverse relations on `BookAnalysisCharacter`
- `server/src/prisma/schema.sqlite.prisma` — symmetric sync
- `server/src/prisma/migrations/` — new migration, add-column and add-enum-value only
- `shared/types/image.ts` — extend `ImageSceneType` union
- `shared/imagePrompt/` — evaluate whether `buildCharacterImagePrompt` needs a BookAnalysisCharacter adapter; if profile field names already match, no new file
- `server/src/services/image/ImageGenerationService.ts` — add new value to `SupportedImageSceneType`; extend `resolveTaskOwnerKey` / `buildAssetOwnerWhere` ternary branches; share prompt building with the character branch
- `server/src/services/image/imageGenerationMappers.ts` — add `bookAnalysisCharacterId` field mapping to `toImageTask` / `toImageAsset`
- `server/src/services/image/types.ts` — evaluate whether `CharacterImageGenerationRequest` needs a split or an owner dimension
- `server/src/services/bookAnalysis/bookAnalysisCharacter/BookAnalysisCharacterImageService.ts` — add a thin wrapper that encapsulates the “generate images for a BookAnalysisCharacter” entry and internally calls `ImageGenerationService`
- `server/src/services/bookAnalysis/bookAnalysisCharacter/BookAnalysisCharacterPromoteService.ts` — promotion logic adds a “carry primary image” branch: clone an `ImageAsset` copy onto `baseCharacterId` owner
- `server/src/routes/bookAnalysis.ts` — add sub-routes:
  - `POST /:id/characters/:characterId/images/generate` — trigger generation
  - `GET /:id/characters/:characterId/images` — list
  - `PATCH /:id/characters/:characterId/images/:assetId` — set primary / sort
  - `DELETE /:id/characters/:characterId/images/:assetId` — delete
- `client/src/pages/bookAnalysis/components/BookAnalysisCharacterImagePanel.tsx` — new, character image list, generate entry, set primary, delete
- `client/src/pages/bookAnalysis/components/BookAnalysisCharacterPromoteDialog.tsx` — add “also add the primary image to the character library” checkbox
- `client/src/pages/bookAnalysis/hooks/useBookAnalysisCharacterImages.ts` — new, reuse `useImageGenerationFlow` polling
- `client/src/api/bookAnalysis.ts` — add character image APIs
- `server/tests/bookAnalysisCharacterImage.test.js` — new: generate, set primary, delete, promotion carries image

### 5.6 Coexistence with the existing `character_system` section (Option A decision)

- `character_system` remains a **fast overview layer**, outputting existing structuredData (protagonistPositioning, supportingFunctions, etc.) and Markdown; behavior stays unchanged;
- `BookAnalysisCharacter` is a **deep-dossier layer**, as an optional enablement (similar to analysis preset light / standard / full modes);
- Both datasets coexist; in the UI, a `character_system` summary can click-expand into a `BookAnalysisCharacter` detailed dossier;
- When the user enables deep dossiers, `BookAnalysisCharacter` generation can choose “based on the character list already generated by character_system” or “independently recognize from original text”; the former is cheaper, the latter covers more.

The cost is that the two datasets may diverge. Mitigation:

- When generating deep dossiers, pass `character_system` structuredData as an “already recognized character list” to reduce recognition divergence;
- If UI display finds mismatched character names on the two sides, give a “Refresh overview” button and let the user decide;
- Do not force two-way sync, to avoid exploding maintenance cost.

### 5.7 File-level change list (character-dossier body)

> Image-related changes are in section 5.5. This section focuses on character dossiers plus arc and scene sub-entities.

#### shared layer

- `shared/types/characterProfile.ts` — new; define `CharacterProfileSchema`, Chinese field labels, length limits
- `shared/types/bookAnalysisCharacter.ts` — new; define `BookAnalysisCharacter` / `BookAnalysisCharacterArc` / `BookAnalysisCharacterScene` interfaces, generation-depth enum, dimension-selection enum

#### Prisma schema

- `server/src/prisma/schema.prisma` — add three models + three relations; `BookAnalysis` adds reverse-relation fields
- `server/src/prisma/schema.sqlite.prisma` — symmetric sync
- `server/src/prisma/migrations/` — new migration, add-table only, zero data migration

#### server service layer

- `server/src/services/bookAnalysis/bookAnalysisCharacter/` — new subdirectory, including:
  - `BookAnalysisCharacterService.ts` — CRUD, list query, delete
  - `BookAnalysisCharacterGenerationService.ts` — call LLM to generate character dossiers, incrementally fill dimensions
  - `BookAnalysisCharacterPromoteService.ts` — promote to `BaseCharacter`
  - `bookAnalysisCharacter.types.ts` — internal types
  - `bookAnalysisCharacter.utils.ts` — normalization, field filtering, shared-schema validation
  - `bookAnalysisCharacterSchemas.ts` — zod schema
- `server/src/prompting/prompts/bookAnalysis/bookAnalysisCharacter.prompts.ts` — new prompt assets for character dossier, arc nodes, and scene performance
- `server/src/services/bookAnalysis/BookAnalysisService.ts` — add `getCharacters` / `generateCharacters` and similar forwarding
- `server/src/services/bookAnalysis/bookAnalysis.publish.ts` — when publishing to the knowledge base, optionally carry character dossiers into the publish payload (keep backward compatible, default off)
- `server/src/services/bookAnalysis/bookAnalysis.export.ts` — when exporting Markdown, add a character-dossier chapter
- `server/src/services/character/CharacterLibrarySyncService.ts` — add an entry for “accept analysis-source promotion” (optional; can wait for a later PR)

#### server routes

- `server/src/routes/bookAnalysis.ts` — add sub-routes:
  - `GET /:id/characters` — list
  - `POST /:id/characters/generate` — generate / incrementally fill dimensions
  - `PATCH /:id/characters/:characterId` — edit
  - `DELETE /:id/characters/:characterId` — delete
  - `POST /:id/characters/:characterId/promote` — promote to character library
  - `GET /:id/characters/:characterId/arcs` — arc list
  - `GET /:id/characters/:characterId/scenes` — scene-performance list

#### client layer

- `client/src/pages/bookAnalysis/components/BookAnalysisCharacterPanel.tsx` — new, character-dossier main panel
- `client/src/pages/bookAnalysis/components/BookAnalysisCharacterCard.tsx` — new, single character card
- `client/src/pages/bookAnalysis/components/BookAnalysisCharacterArcList.tsx` — new, arc-node list
- `client/src/pages/bookAnalysis/components/BookAnalysisCharacterSceneList.tsx` — new, scene-performance list
- `client/src/pages/bookAnalysis/components/BookAnalysisCharacterPromoteDialog.tsx` — new, promote-to-library confirm dialog
- `client/src/pages/bookAnalysis/hooks/useBookAnalysisCharacters.ts` — new, data fetch and mutation
- `client/src/pages/bookAnalysis/hooks/useBookAnalysisWorkspace.ts` — add character-dossier entry jumps and linkage with character_system overview
- `client/src/api/bookAnalysis.ts` — add character-related API calls

#### tests

- `server/tests/bookAnalysisCharacter.test.js` — new: CRUD, generation, normalization, promotion, linkage with character_system data
- `server/tests/bookAnalysis.publish.test.js` (extend if it already exists, otherwise create) — verify content when publish carries character dossiers
- `server/tests/bookAnalysis.test.js` — add linkage scenario: after character_system generation, start deep dossiers with list reuse

#### docs

- `docs/wiki/workflows/book-analysis-workflow.md` — add a “Deep character dossiers” section, citing this plan
- `docs/wiki/workflows/book-analysis-character-deep-dive.md` — new (optional), independently settle stable decisions for deep character dossiers
- `docs/releases/release-notes.md` — sync when each phase PR lands

#### Estimate

The whole character expansion is about 1500-2000 new lines (including tests). A single PR cannot carry it; split into at least 3 PRs (see section 6).

## 6. Phased Delivery Roadmap

### 6.1 Overall strategy

Switch from “fragmented PR units” to “user-value phases”: each phase delivers one user-perceptible complete capability, 1-2 PRs per phase, advanced serially by dependency, with a 1-2 week observation window after each phase before starting the next.

### 6.2 Phase overview

| Phase | User value delivered | Scope estimate | PR count | Estimated cycle |
|---|---|---|---|---|
| Phase 1 | Can tell analysis “what to focus on this time” (user intervention + last-round closing) | ~300 lines | 1 | 1 week |
| Phase 2 | Can browse original chapters and one-click from a conclusion back to the source | ~800 lines | 2 | 3 weeks |
| Phase 3 | Can deeply study each character (multi-dimension dossier + arc + scene performance) | ~1300 lines | 2 | 4 weeks |
| Phase 4 | Can generate character images and promote learned characters into one’s own character library | ~700 lines | 2 | 3 weeks |
| Phase 5 | Can diagnose one’s own draft with the same tool (side path) | ~150 lines | 1 | 1 week |
| Phase 6 | Analysis page becomes a focusable workbench; main content is visible on one screen | ~1300 lines | 3 | 4 weeks |

Total span about 4550 lines / 11 PRs / 16 weeks. Phase 1 is a prerequisite for other phases; phases 3 and 4 are strongly serial; phase 6 depends on phase 2 (chapters) and phase 3 (character dossiers) already landed; the rest can run in parallel.

### 6.3 Phase dependencies

```
Phase 1 (user intervention + closing) ─┐
                                       ├─→ Phase 2 (chapters + evidence backtrace) ─┐
                                       │                                           │
                                       ├─→ Phase 3 (character dossiers) ─→ Phase 4 (images + promotion)
                                       │                                           │
                                       ├─→ Phase 5 (analyze own draft)             │
                                       │                                           ↓
                                       └──────────────────────────→ Phase 6 (UI workbench refactor)
```

### 6.4 Phase 1: analysis guidance + last-round closing

**Delivered value**: When starting analysis, the user can tell the system “this time focus on ensemble-scene rotation,” and can also separately ask a section to “pay special attention to the protagonist’s speaking style.” Also clean up two leftover small issues from PR-5.

**Scope**:
- Closing: delete dead code that assigned overview summary in the `runFullAnalysis` stage-two loop; when `runSingleSection` reruns a non-overview section, automatically load the already generated overview section and inject context
- B1 global instruction layer: analysis-start UI adds a “this analysis focuses on” text box, stored as `BookAnalysis.userFocusInstruction`, injected as a prefix into all section prompts
- B2 section-level focus: each section card header adds a “this section special focus” input, stored as `BookAnalysisSection.focusInstruction`, injected on single-section rerun

**File level**:
- `server/src/prisma/schema.prisma` / `schema.sqlite.prisma` — `BookAnalysis` adds `userFocusInstruction String?`; `BookAnalysisSection` adds `focusInstruction String?`
- `server/src/prisma/migrations/` — add-column only
- `shared/types/bookAnalysis.ts` — interface extension
- `server/src/services/bookAnalysis/bookAnalysis.generation.ts` — runSingleSection loads overview context, dead-code cleanup
- `server/src/services/bookAnalysis/bookAnalysis.sectionWriter.ts` — `generateSection` adds instruction parameters
- `server/src/services/bookAnalysis/BookAnalysisCommandService.ts` — start / rerun receive and store instructions
- `server/src/prompting/prompts/bookAnalysis/bookAnalysis.prompts.ts` — Prompt injects user-instruction segment
- `server/src/routes/bookAnalysis.ts` — start / rerun APIs add instruction parameters
- `client/src/pages/bookAnalysis/components/BookAnalysisStartDialog.tsx` — global-instruction text box
- `client/src/pages/bookAnalysis/components/BookAnalysisSectionCard.tsx` — section-focus input
- `client/src/pages/bookAnalysis/hooks/useBookAnalysisWorkspace.ts` — instruction state management
- `server/tests/bookAnalysis.test.js` — instruction storage, injection, rerun carrying

**Acceptance**:
- Global instruction enters every section system prompt; section-focus instruction only enters that section
- runSingleSection rerunning plot_structure can obtain overview context
- Old analyses (instruction fields empty) behave unchanged

### 6.5 Phase 2: chapter entity and evidence backtrace

**Delivered value**: Users can see original text split by chapter in the analysis UI and can read a single chapter; analysis-conclusion evidence shows “from chapter N,” and click jumps to that position in the original.

**Split**: A1 chapter entity first (PR), then A2 evidence backtrace (PR).

**A1 scope**:
- Add a `Chapter` entity under `DocumentVersion` (one-to-many), with `chapterIndex / title / startOffset / endOffset / summary / wordCount`
- Chapter-split service supports three modes: rule split (title regex) / LLM split / user manual correction
- Split timing: on-demand when the user first views “original chapters” on the “analysis result” page; cache results in the `Chapter` table
- UI chapter list: left panel lists chapters; click to view that chapter’s content (read-only)

**A1 file level**:
- `server/src/prisma/schema.prisma` / sqlite — add `Chapter` model + reverse relation; migration
- `shared/types/documentChapter.ts` (new) — `Chapter` interface
- `server/src/services/bookAnalysis/documentChapter/` —
  - `DocumentChapterService.ts`: CRUD, query
  - `DocumentChapterSplitService.ts`: split (rules + LLM)
- `server/src/prompting/prompts/bookAnalysis/documentChapter.prompts.ts` — LLM split prompt
- `server/src/routes/bookAnalysis.ts` — chapter list / split / correction APIs
- `client/src/pages/bookAnalysis/components/BookAnalysisChapterList.tsx`
- `client/src/pages/bookAnalysis/components/BookAnalysisChapterReader.tsx`
- `client/src/pages/bookAnalysis/hooks/useDocumentChapters.ts`
- `server/tests/documentChapter.test.js`

**A2 scope**:
- `BookAnalysisEvidenceItem` adds optional `chapterIndex?: number` + `excerptOffsetRange?: [number, number]`
- When generating evidence, have the Prompt output chapterIndex (reverse-lookup from notes sourceLabel)
- Backend normalization fills chapterIndex (if the LLM did not give it but sourceLabel can match a chapter)
- UI: evidence cards show a “Chapter N” tag; click → jump to the chapter reader and highlight the excerpt position

**A2 file level**:
- `shared/types/bookAnalysis.ts` — extend `BookAnalysisEvidenceItem`
- `server/src/services/bookAnalysis/bookAnalysis.utils.ts` — `normalizeBookAnalysisEvidence` adds chapter-locate normalization
- `server/src/prompting/prompts/bookAnalysis/bookAnalysis.prompts.ts` — evidence rules add chapterIndex requirement
- `server/src/services/bookAnalysis/bookAnalysis.sectionWriter.ts` — pass available chapter info into normalization
- `client/src/pages/bookAnalysis/components/BookAnalysisEvidenceList.tsx` — chapter tag + jump button
- `client/src/pages/bookAnalysis/hooks/useBookAnalysisChapterJump.ts`
- `server/tests/bookAnalysis.test.js` — chapter-locate normalization tests

**Acceptance**:
- Old documents without Chapter split on demand; do not force backfill of all historical documents
- LLM split failure has a fallback to rule split
- Newly generated evidence has a valid chapterIndex at least 70% of the time; historical evidence without the field degrades gracefully in the UI
- After jump, the chapter reader auto-scrolls to the approximate excerpt position

### 6.6 Phase 3: deep character dossiers

**Delivered value**: Users can first cheaply identify character candidates in analysis results, then generate deep dossiers for characters worth studying, choosing dimensions (appearance / personality / motivation / arc / relations / scene performance) and depth (quick / standard / deep); dossiers include the character’s state changes across chapters and concrete performance in key scenes.

**Split**: C1 body first, then C2+C3 sub-entities.

**C1 scope**: add `BookAnalysisCharacter` entity, shared `CharacterProfileSchema`, candidate-recognition service, single-character dossier generation service (input is source notes + user-selected dimensions + depth + character_system already-recognized character list), batch generate-candidates entry, UI main panel (“Identify characters,” candidate cards, “Generate all,” full dossier cards), linkage with character_system (list reuse, UI jump).

**C2+C3 scope**: add `BookAnalysisCharacterArc` (character × chapter arc nodes) and `BookAnalysisCharacterScene` (character × scene performance); arc-node chapterRef depends on Phase 2 Chapter entity; this cycle sceneLabel is a string, upgraded to a relation after Direction D lands.

**File level**: see section 5.7 “character-dossier body change list,” including three Prisma models, two shared files, server service directory, prompt, routes, 5 client components, tests.

**Acceptance**:
- Users can generate dossiers with selected dimensions + depth; historical BookAnalysis does not generate by default and must be triggered actively
- Users can first identify candidate characters, then generate candidate dossiers one-by-one or in batch; already generated dossiers are not overwritten by re-identification
- Coexists with character_system; character-list reuse
- Arc nodes can reference real chapterIndex (depends on Phase 2 A1)
- Main-dossier deep mode auto-generates arcs + scenes, but users can disable
- Cost hint: show estimated tokens before generation

### 6.7 Phase 4: character image generation + promotion channel

**Delivered value**: Users can generate AI images for each deep-dossier character; they can “add to character library” a liked character as a `BaseCharacter`, and promotion can carry the already generated primary image.

**Split**: character images first, then promotion channel (depends on images).

**Character-image scope**: extend existing image module — add `book_analysis_character` to `ImageSceneType`, add `bookAnalysisCharacterId String?` to `ImageGenerationTask` / `ImageAsset`, reuse `ImageGenerationService` / `buildCharacterImagePrompt` / `useImageGenerationFlow` / `ImageGenerationConfirmDialog`, create thin wrapper `BookAnalysisCharacterImageService`, UI adds an image area on the character card.

**Promotion scope**: create `BookAnalysisCharacterPromoteService` to create a BaseCharacter copy from BookAnalysisCharacter (carry shared-schema fields only), promotion dialog (field mapping + carry-primary-image checkbox default checked), primary-image clone is a copy not a reference, BaseCharacter records source with `sourceType / sourceRefId`, both sides evolve independently with no two-way link.

**File level**: see section 5.5 “character-image change list” and section 5.4 “promotion channel.”

**Acceptance**:
- Image generation goes through the existing ImageGenerationService chain; existing character / novel_cover paths have no regression
- Set primary, delete, and sort behavior matches existing character images
- Promotion creates BaseCharacter with correct source fields; deleting the analysis does not affect the promoted BaseCharacter
- Promotion dialog shows schema field differences so the user can confirm mapping

### 6.8 Phase 5: analyze one’s own draft (side-path validation)

**Delivered value**: Users can run a half-written draft through the full analysis flow and get conclusions on pacing diagnosis / character blur / theme clarity / planted-setup recovery.

**Scope**: add no architecture capability (existing analysis already supports any DocumentVersion input). Main work is entry and copy — add a “diagnosis mode” entry (parallel with “reference someone else’s work”), slightly adjust result-display copy in diagnosis mode, add one-click export of an existing Novel’s full text as a Document.

**File level**:
- `server/src/services/novel/NovelExportService.ts` — Novel → Document conversion
- `server/src/routes/novel.ts` or `bookAnalysis.ts` — `POST /novels/:id/export-as-document`
- `client/src/pages/bookAnalysis/components/BookAnalysisStartDialog.tsx` — mode-switch Tab
- `client/src/pages/bookAnalysis/components/BookAnalysisDiagnosisTipBanner.tsx` (new) — diagnosis-mode top hint
- `client/src/pages/bookAnalysis/components/BookAnalysisStructuredSummary.tsx` — diagnosis-mode copy tweaks
- `server/tests/bookAnalysis.diagnosis.test.js` — diagnosis-mode analysis full flow

**Acceptance**:
- After one-click Novel → Document export, analysis can start immediately
- Diagnosis mode and reference mode have clear copy distinction
- Does not break the existing “reference someone else’s work” path

### 6.9 Phase 6: UI workbench refactor

**Delivered value**: The analysis page changes from “5 Cards stacked vertically in a long-scrolling page” into “a research workbench focused by view.” The user’s main reading path needs no scrolling; evidence and section content are physically integrated; common task actions (publish, archive, rerun, download) stay reachable via a top sticky toolbar; wide-screen users can enable original-and-analysis side-by-side reading.

**Current page congestion (reason to refactor)**:
- Main area stacks 5 Cards vertically: tool explanation / task details / analysis content / evidence panel / character dossiers, total height 4-5 screens
- Task management (publish, metadata, error info) occupies a whole Card by default, but is actually a low-frequency operation
- Evidence panel is physically split from section content; reading a conclusion and wanting the source requires scrolling
- Character dossiers and section content are stacked as peers, but they are different viewpoints, not same-level content
- Chapter reader is embedded in DetailPanel and has no independent place to own “side-by-side reading”
- Top tool actions scroll away with the Card; triggering them below requires scrolling back

**Key decisions**:
- **Task management goes to a top sticky toolbar**: publish, archive, rerun, download, and style extraction are integrated into an always-visible top bar; secondary actions go into a dropdown; always reachable without occupying the main area
- **Chapter reader appears only in the L3 dual-pane view**: L2 does not open a separate Tab for it; only when the user uses dual-pane side-by-side reading is the chapter reader placed in the center pane
- **L2 top-level views are only two**: 📖 Section analysis / 👥 Character dossiers, mutually exclusive single-view switching
- **Evidence is absorbed from a standalone Card into an embedded Popover**: consume PR-1 evidence fieldKey binding, hang next to structured key conclusions

**Split**: this phase splits into 3 PRs, each independently delivering value; they can be serial, or only the first one or two steps can be done.

#### 6.9.1 L1 immediate refactor (~250 lines)

**Goal**: remove obvious redundancy, compress page height from 4-5 screens to within 2 screens, and float main content onto the first screen.

**Changes**:

- Delete “Book analysis workspace” (Card 1, pure tool-explanation text)
- “Task details” (Card 2) collapsed by default; title bar shows one-line “title / status / progress” summary + expand button; publish, metadata, style extraction, and error info all go into expanded content
- Error info is separately promoted to a top Banner (same slot as the diagnosis-mode banner; strong warning occupies one exclusive row)
- Delete the independent “Evidence panel” Card: evidence chips embed next to `BookAnalysisStructuredSummary` key-conclusion values; click opens a Popover showing excerpt + sourceLabel + chapter-jump button
- Add a top sticky toolbar: copy / archive / rerun / download (with format dropdown) / publish (with novel picker) / style extraction, always visible while scrolling

**File level**:
- `client/src/pages/bookAnalysis/components/BookAnalysisDetailPanel.tsx` — delete Card 1, Card 2 becomes collapsible, delete Card 4, overall slim-down
- `client/src/pages/bookAnalysis/components/BookAnalysisTaskDetailsCollapsible.tsx` (new) — collapsible task-details card
- `client/src/pages/bookAnalysis/components/BookAnalysisWorkspaceToolbar.tsx` (new) — top sticky toolbar
- `client/src/pages/bookAnalysis/components/BookAnalysisErrorBanner.tsx` (new) — error-state top banner
- `client/src/pages/bookAnalysis/components/BookAnalysisStructuredSummary.tsx` — hang evidence chip + Popover next to key-conclusion values
- `client/src/pages/bookAnalysis/components/BookAnalysisEvidencePopover.tsx` (new) — evidence bubble opened by chip click, including jump button
- `client/src/pages/bookAnalysis/BookAnalysisPage.tsx` — main-structure adjustment to hold the sticky toolbar
- `client/src/pages/bookAnalysis/hooks/useBookAnalysisWorkspace.ts` — add task-details expand state and evidence-popover selected state

**Acceptance**:
- First screen can see section Tab content directly
- Collapsed task details do not exceed 1 row of height
- Evidence chips appear next to each structured field with fieldKey binding; click opens Popover
- Error state is pinned as a Banner, no longer hidden in Card 2
- Sticky toolbar does not disappear while scrolling

#### 6.9.2 L2 top-level view switching (~450 lines)

**Goal**: change “section content / character dossiers” into peer top-level Tab switching, showing only one at a time, fully eliminating vertical stacking in the main area.

**Changes**:

- Below the page-top sticky toolbar, add view-switch Tabs: 📖 Section analysis / 👥 Character dossiers
- Section-analysis view: current DetailPanel section-Tab content (including L1-refactored embedded evidence Popover)
- Character-dossiers view: current `BookAnalysisCharacterPanel` content
- The two views render mutually exclusively; switching views keeps the sticky toolbar always visible
- The chapter reader **does not become an independent view in this phase**; it remains nested in DetailPanel as before (extracted only at L3)
- View state writes to URL search param (`?view=sections|characters`); refresh and share links keep the view

**File level**:
- `client/src/pages/bookAnalysis/components/BookAnalysisWorkbenchViewTabs.tsx` (new) — top-level view-switch Tabs
- `client/src/pages/bookAnalysis/BookAnalysisPage.tsx` — main structure becomes sticky toolbar + view Tabs + content area
- `client/src/pages/bookAnalysis/components/BookAnalysisDetailPanel.tsx` — remove character-dossier render entry (no longer stacked with section content)
- `client/src/pages/bookAnalysis/hooks/useBookAnalysisWorkspace.ts` — add `activeView: "sections" | "characters"` state, URL sync
- `client/src/pages/bookAnalysis/hooks/useBookAnalysisActiveView.ts` (new) — independent view-state hook, including URL search-param read/write

**Acceptance**:
- View switching is mutually exclusive single-view; no vertical stacking
- URL search param syncs, is shareable, and survives refresh
- Character-dossiers view and section-analysis view share the same sticky toolbar
- Mobile narrow-screen behavior: Tabs still switch; sticky toolbar auto-collapses into a dropdown (basic responsive)

#### 6.9.3 L3 dual-pane comparison workbench (~600 lines)

**Goal**: on wide screens (≥1440px) enable a dual-pane comparison view of “left original-chapter reader / right analysis content”; clicking an evidence chip auto-locates the left pane to the source chapter and highlights the excerpt; switching chapters auto-scrolls the right pane to this-chapter related key conclusions.

**Changes**:

- Add a “mode switch” button inside the section-analysis view: single pane (current L2 form) / dual pane (new)
- Dual-pane mode enables only when viewport width ≥1440px; narrow screens auto-degrade to single pane and hide the switch button
- Dual-pane layout: left pane (flex 1) chapter reader, right pane (flex 1) section content
- Left pane uses existing `documentChapters` data, extracted into an independent `BookAnalysisChapterReader` component
- Linkage direction A: right-pane evidence-chip click → left pane scrolls to chapterIndex and highlights excerpt range
- Linkage direction B: left pane switches currently read chapter → right pane shows a “this chapter involved” badge next to each section title, and visually emphasizes structured fields that are “conclusions from this chapter”
- Dual-pane mode user preference persists (localStorage) and is reused by default next time
- Character-dossiers view stays single-pane (character dossiers vs original comparison has low value; do not force dual pane)

**File level**:
- `client/src/pages/bookAnalysis/components/BookAnalysisDualPaneLayout.tsx` (new) — dual-pane layout shell
- `client/src/pages/bookAnalysis/components/BookAnalysisChapterReader.tsx` (new) — independent chapter reader extracted from DetailPanel
- `client/src/pages/bookAnalysis/components/BookAnalysisChapterNavigator.tsx` (new) — chapter navigation (dropdown or side list)
- `client/src/pages/bookAnalysis/components/BookAnalysisDetailPanel.tsx` — remove chapter-reader logic after extraction; add “this chapter involved” badges
- `client/src/pages/bookAnalysis/components/BookAnalysisStructuredSummary.tsx` — add “from current chapter” visual emphasis
- `client/src/pages/bookAnalysis/hooks/useBookAnalysisChapterCorrelation.ts` (new) — two-way linkage hook (chip→chapter, chapter→related fields)
- `client/src/pages/bookAnalysis/hooks/useBookAnalysisDualPanePreference.ts` (new) — dual-pane preference persistence
- `client/src/pages/bookAnalysis/hooks/useViewportSize.ts` (new or reuse existing responsive hook) — viewport-width detection

**Acceptance**:
- Viewport ≥1440px shows the dual-pane switch button; <1440px hides it
- In dual-pane mode, evidence-chip click has animated feedback of left-pane scroll + highlight
- When the left pane switches chapter, the right pane visually emphasizes “this-chapter related” fields and does not scroll the right pane, avoiding interference
- Dual-pane preference persists across refresh / switching analyses
- Switching single-pane and dual-pane loses no data (section expand state, evidence selected state kept)

#### 6.9.4 Phase 6 shared prerequisites

- Phase 2 A1 (DocumentChapter entity) already landed (needed by L3 dual pane)
- Phase 2 A2 (evidence chapterIndex binding) already landed (needed by L1 evidence Popover jump)
- Phase 3 C1 (BookAnalysisCharacter) already landed (needed by L2 character-dossiers view)
- Does not depend on Phase 4 (image promotion) or Phase 5 (diagnosis mode), but must test that they are not broken

### 6.10 Phase exit conditions

After each phase merges, leave a 1-2 week observation window and watch:

- Phase 1: global-instruction fill rate (>30% treated as effective, <10% adjust the entry); human spot-check of single-section rerun quality after overview-context injection
- Phase 2: chapter-list view rate, use of second analysis by partial chapters; evidence-jump click rate
- Phase 3: deep-dossier generation completion rate, user manual-edit rate, fill density of arcs + scenes
- Phase 4: image-generation trigger rate (<15% revisit entry placement and cost hint), average image generations per character, primary-image set rate, promotion count, rate of checking “carry primary image,” reuse rate of promoted BaseCharacter in new-novel creation
- Phase 5: diagnosis-mode analysis start rate, amount of manual editing produced in diagnosis mode
- Phase 6 L1: rate of users actively expanding task details after default collapse, evidence-chip click rate (>15% treated as integration effective), error-banner appearance frequency
- Phase 6 L2: view-switch frequency, success rate of landing the correct view after URL share, mobile sticky-toolbar usability
- Phase 6 L3: dual-pane switch enablement rate on wide screens, average interaction-chain length of single-character evidence→chapter jump (shorter chain means comparison reading is truly effective), share of users whose dual-pane preference is persisted

### 6.11 Common constraints

- Before each phase starts, update this plan document’s corresponding section status
- Before each phase merges, update `docs/releases/release-notes.md`
- Content involving stable decisions (already-stable fields, flows, constraints) migrates from the plan into `docs/wiki/workflows/book-analysis-workflow.md`
- Each PR’s test suite must fully pass and must not break existing tests
- Schema changes are add-column / add-table only; changing types or deleting fields is forbidden
- Prompt changes are driven by shared constants such as `BOOK_ANALYSIS_*`; hard-coded JSON field tables are forbidden

## 7. Decision Log

### 7.1 Decided

- **Option A coexistence strategy**: keep the `character_system` section as a fast overview; `BookAnalysisCharacter` coexists as deep dossiers and does not replace it;
- **Character entity is independent**: do not reuse `Character` / `CharacterCandidate`;
- **Promotion channel is user-explicit**: no automatic sync, no two-way tracking;
- **Main-line scenario is the “learning scenario”**: expansion-direction priority is anchored on the learning scenario;
- **Direction A1 + Direction C are this cycle’s main investment**: Direction D only reserves extension points;
- **Character image generation reuses the existing image module**: extend the `ImageSceneType` enum + add an optional relation field; do not rebuild the image chain;
- **Promotion carries the primary image by default**: on promotion, default-check “also add the primary image to the character library,” user may uncheck, avoiding loss of images accepted in the learning scenario;
- **Task management goes to a top sticky toolbar**: Phase 6 publish, archive, rerun, download, and style extraction are integrated into an always-visible top bar; secondary actions go into a dropdown and do not enter view Tabs;
- **Chapter reader appears only in the L3 dual-pane view**: L2 keeps only two Tabs, section analysis and character dossiers; the chapter reader is extracted as an independent component only at L3 as the comparison-reading center pane.

### 7.2 Still to decide

- **Chapter-split strategy**: rule-based (for example title regex), LLM split, or mixed; a small POC is needed before PR-7 starts;
- **Default generation timing for deep dossiers**: run together with full analysis (adds cost), or user-triggered on the result page (default off); first version should choose the latter;
- **Which fields promotion carries**: only schema-common fields, or let the user check fields in the promotion dialog;
- **How character × scene performance “scene” is carried**: this cycle uses a string description; whether to backfill a relation after Direction D lands affects PR-9 data-model extensibility;
- **Whether existing `CharacterCandidate` participates in “recognition”**: if A1 chapter entity lands, whether to reuse CharacterCandidate’s chapter-level character recognition to help initialize `BookAnalysisCharacter`; evaluate before PR-8 starts;
- **Character-image generation entry placement**: a fixed button at the character-card header, or folded into “more actions,” affecting image-generation trigger rate;
- **Character-image generation prompt input**: only the appearance dimension of `BookAnalysisCharacter.profileJson`, or also splice personality / highlight scenes to increase visual atmosphere; needs a small A/B validation;
- **Batch strategy for carrying images on promotion**: a single promotion carries only the primary image, or allows selecting multiple; the former is simpler, the latter more flexible.

## 8. Failure Modes

- **Deep dossiers seriously inconsistent with character_system**: check whether character_system’s character list was passed as a generation baseline, and whether the UI provides a “Refresh overview” path;
- **Character library inflates after promotion**: check whether promotion is default-triggered (it should be explicit), and whether there is an “undo promotion” path;
- **Direction D reserved interface underestimated**: Direction C scene fields are carried as text; if D1 later lands without a relation field (for example optional sceneEntityId), backfill cost is high; PR-8 must leave the extension slot;
- **Analysis cost spikes**: deep-dossier generation is a new LLM call; the UI entry must hint estimated cost, consistent with existing analysis presets’ “cost visible” principle;
- **Recovery cost after budget exhaustion is too high**: budget failure must not force the user to redo the whole job. The detail page must allow adjusting budget alone, and provide an “expand budget and continue” path; continue only processes non-frozen unsuccessful sections; successful and frozen sections stay unchanged.
- **Chapter entity causes historical-data compatibility issues**: when A1 lands, old `DocumentVersion` has no chapters; need an “on-demand split, no forced backfill” strategy;
- **Character-image generation cost runs away**: multiple images per character and one-click batch generation for many characters both significantly raise image-API cost; UI must show per-call cost estimate + daily cumulative; if users click generate in rapid succession, add a minimum-interval limit;
- **Dirty data in the character library after promotion carries images**: if the original analysis image is deleted after promotion, the cloned copy on the BaseCharacter side must still remain (clone = independent asset); do not use a reference instead of a copy;
- **Image sceneType extension breaks old logic**: existing `ImageGenerationService.resolveSceneType` throw path must cover the new enum value, or it will wrongly throw 400 on historical paths.

## 9. Related Modules

- `server/src/services/bookAnalysis/`
- `server/src/services/character/`
- `server/src/services/image/`
- `server/src/prisma/schema.prisma`
- `server/src/prompting/prompts/bookAnalysis/`
- `shared/types/bookAnalysis.ts`
- `shared/types/image.ts`
- `shared/imagePrompt/`
- `shared/types/characterProfile.ts` (new)
- `shared/types/bookAnalysisCharacter.ts` (new)
- `client/src/pages/bookAnalysis/`
- `client/src/components/image/`

## 10. Source Documents

- [Book analysis workflow](../wiki/workflows/book-analysis-workflow.md)
- [Character system upgrade long-term plan](./character-system-upgrade-plan.md)
- [Prompt Registry and structured output](../wiki/prompts/prompt-registry-and-structured-output.md)
- [Beginner-first and full-novel completion principles](../wiki/product/beginner-first-novel-completion.md)

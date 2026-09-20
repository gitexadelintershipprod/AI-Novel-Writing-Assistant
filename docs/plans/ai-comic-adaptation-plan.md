# AI Comic (Webtoon + Motion Comic) Adaptation Plan

> Status: In planning (2026-06-12, including market-research corrections)
> Prerequisite: short-drama production line on the `feat/drama-module` branch (P0–P7 already landed)
> Positioning: the second output head of the shared “novel IP → visual content” production line with short drama;
> the same batch of comic keyframes produces **webtoon (static long-strip) + motion comic (animated comic video)** dual formats

---

## 0a. Market research conclusions (2026-06-12)

### Three forms and industry status

1. **Static webtoon / page comic**: ai-comic-factory (1.3k★, LLM+SDXL, text as captions under panels rather than speech bubbles),
   canvas-editor products such as Dashtoon / Anifusion; academic lines DiffSensei (CVPR 2025) / StoryDiffusion
   are all self-hosted SD-family solutions that essentially stopped updating after 2024 — **do not adopt**.
2. **Motion comic / animated comic** (the form that truly exploded in 2025–2026): comic keyframes + programmatic camera moves + TTS + BGM,
   published episode-by-episode on short-drama platforms (Douyin / Hongguo motion-comic zones); the paid-unlock model is fully isomorphic with short drama.
   Representative: deep-printfilm “AI Motion Comic Factory” (1.8k★, active), four stages Script→Asset→Keyframe→Video.
3. Interactive comics: niche; out of scope.

### Industry process paradigm (mandrama-production-pipeline seven-stage, highly consistent across products)

```
form/art-style planning → asset breakdown (character/scene/prop bible + canonical prompts) → storyboard planning
→ model adapter layer (per-provider prompt adaptation) → consistency checks → QA + assembly → regeneration routing
```

Mapped against this project’s infrastructure: five of the seven stages already exist (SourceBundle ≈ asset breakdown, Storyboard ≈ storyboard,
QualityGate ≈ QA, RepairService ≈ regeneration routing, CharacterImageService ≈ character assets).
The two stages missing from the original plan: **asset bible (scene/prop canonical prompts)** and **model adapter layer**, already folded into P1.

### Key technical conclusions

- The mainstream solution for character consistency has already changed generation: LoRA/StoryDiffusion routes are obsolete;
  the standard practice is **native multi-reference image models** (Jimeng/Seedream, Nano Banana family, gpt-image-1 class).
  The drama module already takes this route; do not touch self-hosted SD/ComfyUI.
- Nobody generates text inside the image: the industry uniformly uses “clean artwork + post lettering”, consistent with this plan’s sharp+SVG.
- Monetization path: motion comics go to short-drama platforms (the target channels you already have); static webtoons on comic platforms have a higher bar for individuals.
  **Therefore motion comic is the primary deliverable; webtoon is a same-source side product.**

---

## 0. Positioning and principles

1. **Dual-format output, motion comic as primary**: the same batch of comic keyframes →
   ① Webtoon: vertical single-column long strip (webtoon form);
   ② Motion comic: keyframes + programmatic camera (Ken Burns push/pull/pan) + reuse of drama TTS/subtitles/episode export.
   Do not do traditional page-comic complex panel layouts. Fully isomorphic with the existing vertical short-drama market, paid model, and pacing rules.
2. **Reuse before new build**: a comic panel ≈ a short-drama keyframe + bubble text. New code concentrates in
   “panel script, bubble lettering, long-strip export”; everything else reuses drama patterns already proven.
3. **Extract a shared layer first, then open the new module**: avoid comic copying drama and then drifting apart.
4. **Data governance built in** (lesson from NovelSnapshot 1GB):
   images always land on disk (existing `resolveGeneratedImagesRoot()` pattern); DB stores only paths and metadata;
   all version history has a cap; export artifacts do not enter the DB.

---

## 1. Architecture decisions

### 1.0 Boundary and extractability constraints (highest priority; reuse existing drama rules)

drama and comic are both independent bounded contexts, **kept loosely coupled from novel-generation core logic so they can later be extracted as a whole**:

1. **Import ban**: `services/comic` (and the promoted `services/adaptation`) must not import any
   novel-domain module (`services/novel`, `modules/novel`). The only contact point with novel is
   `NovelSourceAdapter`, which **read-only** accesses novel tables via prisma (infrastructure) only.
2. **CI guards**: replicate `dramaDecoupling.test.js` as `comicDecoupling.test.js` and
   `adaptationDecoupling.test.js`; on P1 day one, build the guards before writing business code;
   also add reverse assertions in novel-side boundary tests: the novel domain must not import drama/comic/adaptation.
3. **Soft data references**: all comic tables have zero foreign keys to Novel; `sourceRef String?` is a soft reference
   (reuse the existing comment convention on `DramaProject.sourceRef`: “do not create a foreign key, to keep extractability”).
4. **Extraction unit**: `adaptation (shared layer) + drama + comic` form a cluster that can be moved out as a whole
   (as an independent service or independent repo, only need to take their own tables + a remote adapter implementing `SourceContentPort`).
5. **drama ↔ comic interconnection rules**: the two modules may reference **shared-layer (adaptation) contracts and assets**
   (character design sheets, SourceBundle, rhythmEngine), but must not import each other’s service implementations;
   all cross-module reuse must sink into the adaptation layer.

### 1.1 Shared adaptation infrastructure layer (Phase 0, first)

Promote the following three blocks from the drama module into a source-agnostic shared layer (target location `server/src/services/adaptation/`):

| Existing asset | After promotion | Notes |
|------|------|------|
| `drama/contracts/sourceBundle.ts` | `adaptation/contracts/sourceBundle.ts` | The file itself already has zero novel-type dependencies; pure move + drama-side re-export |
| `drama/source/*` (SourceContentPort + 3 Adapters) | `adaptation/source/*` | NovelSourceAdapter / OriginalSourceAdapter / TextImportSourceAdapter reused directly |
| Design-sheet generation core of `DramaCharacterImageService` (face close-up + three-view composite, reference images, version history) | `adaptation/visual/CharacterSheetService` | drama and comic share the same character visual assets; `DramaCharacterLibrary` cross-project character library is promoted together |

`services/image/provider.ts` is already a generic layer; leave it.
`rhythmEngine` / `paywallPlanPolicy` are pure domain knowledge with zero dependencies; comic imports them directly and they are not moved for now (avoid too large a change surface in one step).

### 1.2 comic module structure (mirrored against drama)

```
server/src/services/comic/
  ComicProjectService.ts        # project CRUD + source binding (reuse source adapters)
  ComicEpisodePlanService.ts    # episode planning (reuse rhythmEngine + paywallPlanPolicy)
  ComicAssetBibleService.ts     # ★new★ asset bible: unified management of character/scene/prop canonical prompts
  ComicPanelScriptService.ts    # ★new★ panel script generation (counterpart of DramaStoryboardService)
  visual/PromptAdapterPort.ts   # ★new★ model adapter layer: canonical prompt → per-provider prompt
  visual/ComicPanelImageService.ts  # single-panel image generation (replicate DramaShotKeyframeService pattern)
  lettering/ComicLetteringService.ts # ★new★ bubble placement + text compositing
  export/ComicExportService.ts  # ★new★ long-strip stitching + platform slicing
  motion/ComicMotionService.ts  # ★new★(P5) motion-comic compositing: camera script + ffmpeg render, reuse drama TTS/subtitles
  ComicQualityGate.ts           # quality gate (reuse DramaQualityGate pattern)
  ComicRepairService.ts         # redraw repair (reuse DramaRepairService pattern)
  production/ComicBatchOrchestrator.ts # batch orchestration (reuse DramaBatchOrchestrator pattern)
server/src/modules/comic/http/  # route registration (mirrored against modules/drama/http)
```

---

## 2. Content sources and data design (isomorphic with drama, deepened)

### 2.1 Content sources: three existing + one new

| Source type | Status | Notes |
|------|------|------|
| `novel_import` | **Primary path**, reuse existing adapter | This project’s novel output converts directly to comic; see §2.2 |
| `original` | Reuse | Start from a one-sentence inspiration |
| `text_import` | Reuse | External text (e.g. a novel written elsewhere) to comic |
| `comic_import` | ★new★ | **Upload an existing comic**; see §2.4 |

### 2.2 Primary path: novel → comic “import is a snapshot” principle

drama’s existing pattern: `DramaSourceBundle` **snapshots SourceBundle into the DB**; runtime does not re-read novel tables.
comic reuses and strengthens this principle; it serves two goals at once:
- **Extractability**: after a split, even if the novel module is not in the same process/same DB, already-imported projects still work
- **Stability**: later novel continuation/edits will not accidentally drift already-generated comics

But the existing `NovelSourceAdapter` compresses chapters into 200-character summaries (`truncate(content, 200)`),
which is enough for short-drama strategy planning, **not enough for comic paneling** — comic dialogue needs original-text-level detail. Solution:

```
On import (one-shot): SourceBundle snapshot (synopsis/beats/characters/hard facts) → ComicSourceBundle
On episode planning (on-demand snapshot): chapter range covered by this episode (beat.sourceChapterStart/End)
  → adapter read-only load of chapter body text → snapshot into ComicEpisode.sourceText
On panel-script generation: read only ComicEpisode.sourceText; original dialogue is extracted/rewritten into bubble dialogue
```

That is, `SourceContentPort` adds an optional method (still prisma read-only only; does not break the guards):

```ts
/** Load body text by chapter range (implemented for novel_import; other source types return a rawText slice or empty) */
loadChapterText?(ref: SourceRef, start: number, end: number): Promise<string>;
```

### 2.3 Custom and upload: dual origin across the full production line

Every asset stage supports `generated | uploaded`; users can replace AI output with their own material at any stage:

| Stage | AI path | Custom path |
|------|------|------|
| Character design sheet | CharacterSheetService generation | Upload a design-sheet image (`sheetData.origin: "uploaded"`) |
| Art style | Preset style templates | Upload style reference images into `stylePreset.referenceImages` |
| Episode outline / panel script | LLM generation | Editable (reuse drama editable-scripts precedent) |
| Single-panel artwork | Image generation from references | **Upload an image to replace any panel** (`imageData.origin: "uploaded"`) |
| Bubbles | Auto lettering | Frontend drag-to-tweak anchor then re-composite |

Uploads always go through existing `imageAssetStorage` infrastructure onto disk; DB stores paths only.

### 2.4 comic_import: two semantics for uploading an existing comic

1. **As a content source (sequel / remake)**: upload a whole episode / whole-book comic images → multimodal LLM page-by-page parse
   (scene description + OCR dialogue + character recognition) → produce SourceBundle (beats/characters/synopsis)
   → run the normal production line for a sequel or remake. Parse results are also snapshot into the DB.
2. **As assets**: box-select characters from uploaded pages → extract as character reference images (into the character library);
   overall art style → extract as stylePreset style references.

MVP does semantics 2 first (asset extraction; simple and immediately useful); semantics 1 (whole-book parse) is after P4.

### 2.5 Data model (Prisma, mirrored with drama)

```prisma
model ComicProject {
  id          String   @id @default(cuid())
  title       String
  sourceType  String   // novel_import | original | text_import | comic_import
  sourceRef   String?  // novelId soft reference — no FK, to keep extractability (existing drama convention)
  trackId     String?  // track template (reuse rhythmEngine TrackId)
  stylePreset String?  // art-style lock JSON: style words / negative words / referenceImages paths / origin
  status      String   @default("draft")
  sourceBundle ComicSourceBundle?
  episodes    ComicEpisode[]
  characters  ComicCharacter[]
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}

model ComicSourceBundle {
  // Counterpart of DramaSourceBundle: SourceBundle JSON snapshot; import lands in DB; runtime does not re-read novel
  id         String   @id @default(cuid())
  projectId  String   @unique
  bundleJson String   // serialized SourceBundle
  importedAt DateTime @default(now())
  project    ComicProject @relation(fields: [projectId], references: [id], onDelete: Cascade)
}

model ComicCharacter {
  // Counterpart of DramaCharacter: name/persona/visualAnchor
  // sheetData JSON reuses CharacterSheetData (face close-up + three-view composite) + origin field
  // sourceCharacterRef String? soft reference to source character (novel characterId)
}

model ComicEpisode {
  id           String  @id @default(cuid())
  projectId    String
  order        Int     // which episode
  title        String?
  hookType     String? // opening hook (reuse HookTypeId)
  cliffhanger  String? // ending beat
  isPaywalled  Boolean @default(false) // paywall beat (reuse paywallPlanPolicy)
  outline      String? // this episode’s plot outline
  sourceText   String? // ★snapshot of body text for chapters this episode covers (§2.2; original-text basis for panel dialogue)
  status       String  @default("draft")
  panels       ComicPanel[]
  @@unique([projectId, order])
}

model ComicPanel {
  id            String  @id @default(cuid())
  episodeId     String
  order         Int
  panelType     String? // shot language: establishing/close_up/action/reaction/transition
  action        String  // artwork description
  dialogues     String? // JSON: [{ speaker, text, bubbleType, anchorHint }]
  characterRefs String? // character id list
  visualPrompt  String? // image-generation prompt
  imageData     String? // JSON: status/version/url/origin(generated|uploaded)/history (cap 5)
  letteredData  String? // JSON: finished image path after bubble compositing + bubble layout params
  motionData    String? // JSON (P5 motion comic): camera type / duration / focus region
  @@unique([episodeId, order])
}

model ComicFact {
  // Counterpart of DramaFact: cross-episode consistency fact ledger (costume changes / prop state / scene state),
  // injected when generating panel scripts, to prevent cross-episode visual drift
}

model ComicUploadAsset {
  // Upload asset registry: kind(character_ref|style_ref|panel_image|imported_page)
  // + on-disk path + metadata; uploaded content does not enter the DB
}

model ComicExportJob {
  // Counterpart of DramaBatchJob: episodeId / format(strip|video) / platform spec / artifact path list / status
}
```

Key points:
- `imageData` reuses drama `keyframeData` JSON structure (status/version/history);
  version history has a **hard cap of 5 copies**; when trimming, also delete on-disk files; versions with `origin: "uploaded"` do not participate in auto-redraw
- All images land under `generated-images/comic-panels/{panelId}/`; DB does not store base64
- All Novel references are soft, zero FKs; character library is shared with drama (CharacterLibrary promoted to the adaptation layer)

---

## 3. Implementation phases

### P0 — Prototype validation (0.5 day, zero development)

Run one episode of content directly on the existing drama production line:
1. Create a project in the drama module → generate character design sheets → generate one episode storyboard → generate keyframes shot by shot
2. Manually stitch keyframes into a vertical strip + hand-add bubbles (any image tool)
3. **Acceptance questions**: at 40+ panel scale, is character consistency at publish quality? Do multi-character same-frame shots collapse? Is art style unified?

**This is a go/no-go decision point**: if consistency fails, first tackle image-model selection (see §4.2); do not enter P1.

### P1 — Shared-layer promotion + MVP production line (5–8 days)

0. **Boundary guards first** (§1.0, 0.5 day): `comicDecoupling.test.js` + `adaptationDecoupling.test.js`
   + novel-side reverse assertions; build the guard red lines before writing business code
1. **Phase 0 shared-layer promotion** (§1.1, 1–2 days): pure move + re-export, guarded by drama regression tests
2. ComicProject / ComicCharacter / ComicEpisode / ComicPanel models + migration
3. Project creation flow (reuse source adapters; novel_import connects directly to existing novels)
4. Episode planning: reuse `rhythmEngine` hook library + `paywallPlanPolicy`; LLM produces each episode’s outline + hooks + beats
5. **Panel-script generation** (★core new prompt): each episode outline → 40–80 panel scripts
   (panelType shot language / action / dialogues with speaker + bubbleType / characterRefs / visualPrompt)
6. Single-panel image generation: replicate `DramaShotKeyframeService` (with character design-sheet reference images + stylePreset art-style lock injection)

**P1 exit**: can generate all panel images for one episode from a novel (no bubbles); frontend can view/redraw panel by panel.

### P2 — Finished-art engine (4–6 days)

1. **Bubble lettering engine** (★brand-new module):
   - LLM already outputs `anchorHint` at panel-script stage (approximate bubble position: nine-grid such as top-left/bottom-right + avoid the subject)
   - Compositing uses `sharp` + SVG overlay: bubble shape library (dialogue round / shout spike / thought cloud / narrator rectangle bar),
     Source Han Sans, auto wrap, top-to-bottom reading order by order
   - Rule fallback: when anchorHint is missing or conflicts, place by nine-grid priority order
2. **Long-strip stitching + export**: `sharp` vertical stitch → slice by platform spec
   (slice height cap configurable; preset 800×{N} generic spec); artifacts land on disk + ComicExportJob records
3. Frontend: episode-level finished-art preview (vertical-scroll long strip) + single-panel bubble tweak (drag anchor then re-composite)

**P2 exit**: one episode runs end-to-end from outline to publishable long strip.

### P3 — Consistency and quality loop (4–6 days)

1. **Style lock**: project-level stylePreset (unified style words + negative words + optional style reference images),
   injected into every panel’s visualPrompt; provide 3–5 preset art-style templates (B/W shonen / color Korean webtoon / ink Chinese style, etc.)
2. **Quality gate** (reuse DramaQualityGate pattern): multimodal LLM spot-check
   — character consistency (compare to design sheet), art-style consistency, artwork vs action match, limb-collapse detection
3. **Repair flow** (reuse DramaRepairService pattern): quality-gate mark → redraw (failure reason strengthens the prompt) → history version rollback
4. Compliance check: reuse `DramaComplianceService` pattern for rated-content checks

### P4 — Batch production and operations (3–5 days)

1. Batch orchestration: replicate `DramaBatchOrchestrator` (episode-level queue, checkpoint resume, failure retry)
2. Cost estimate: mirror drama batch production costs pattern (panels per episode × per-image cost + redraw-rate estimate)
3. Platform export-spec expansion: size/format/watermark configurable
4. (Optional) shared “IP adaptation workbench” entry with drama: same novel manages short-drama + comic production lines in parallel

### P5 — Motion-comic compositing (4–6 days, added from research; primary monetization form)

1. **Camera-script generation**: LLM produces per-panel camera motion from panel content
   (push_in/pull_out/pan/hold + duration + focus region), stored in `ComicPanel.motionData`
2. **ffmpeg programmatic render**: single-panel image + zoompan filter → clip; align TTS audio duration to dialogue length
3. **Reuse existing drama capabilities**: TTS voiceover (`TTSProviderPort`), subtitles (srt export),
   episode structure, paywall beats — a motion-comic “episode” maps directly to ComicEpisode
4. Episode-level export: vertical 9:16 MP4, specs aligned to short-drama platforms (Douyin / Hongguo motion-comic zones)

**P5 exit**: the same episode content one-click produces “webtoon long strip + motion-comic video” dual formats.

---

## 4. Key technical points

### 4.1 Bubble compositing tech choice
- `sharp` (already mature in the Node ecosystem) + handwritten SVG bubble templates; **do not introduce** a headless browser
- Fonts are vendored in the repo (Source Han Sans, OFL license) to avoid cross-machine render differences
- When text exceeds bubble capacity: LLM stage constrains a single bubble to ≤30 characters; over-long auto-splits into two bubbles

### 4.2 Image models and consistency strategy
- Existing provider layer is OpenAI-compatible protocol (character design sheets already run at `1536x1024`); comic does not change the protocol layer
- Consistency three-piece set (by priority):
  1. Character design sheet as reference-image input (path already proven in drama)
  2. Multi-character same frame: reference-image composite (reuse existing “face close-up + three views on one sheet” composite pattern)
  3. stylePreset global style-word lock + quality-gate spot-check fallback
- If P0 prototype fails, evaluate models that support multi-reference images (wired via existing provider settings; no architecture change)

### 4.3 Data-governance red lines
- Panel images, lettered finished art, and export slices all land on disk; DB fields store only relative paths + metadata JSON
- `imageData.history` cap 5 versions; when trimming, also delete on-disk files
- ComicExportJob artifacts cleaned by retention policy (keep the latest 3 exports)

---

## 5. Effort and milestones

| Phase | Content | Estimate |
|------|------|------|
| P0 | Existing-line prototype validation (go/no-go) | 0.5 day |
| P1 | Shared-layer promotion + MVP panel production line | 5–8 days |
| P2 | Bubble lettering + long-strip export | 4–6 days |
| P3 | Style lock + quality loop | 4–6 days |
| P4 | Batch production + ops support | 3–5 days |
| P5 | Motion-comic compositing (camera + TTS + episode-level export) | 4–6 days |
| Total | | **21–32 days** |

Run a drama-module regression at the end of each phase (shared-layer promotion happens only in P1, but the guard continues).

---

## 6. Risks and countermeasures

| Risk | Level | Countermeasure |
|------|------|------|
| Character consistency collapses at 80-panel scale | High | Validate in P0 before greenlighting; design-sheet references + composite + quality gate as three-layer fallback; key panels allow manual redraw |
| Unstable bubble lettering quality | Medium | LLM anchorHint + nine-grid rule fallback + frontend drag tweak; three-layer degradation path |
| Art-style drift across episodes | Medium | Project-level stylePreset lock; quality-gate art-style spot-check |
| Shared-layer promotion breaks drama | Medium | Pure move + re-export strategy; merge only after full drama test regression |
| Image-asset bloat repeats the 1GB lesson | Medium | §4.3 red lines land in P1; do not leave “governance for later” |
| drama branch not merged to main causes baseline drift | Low | Continue comic on feat/drama-module, or first push drama into main then start (the latter is recommended) |

---

## 7. Explicitly out of scope (this phase)

- Traditional page-comic complex panel layouts (nested panels, splash pages)
- Animated comics / comic-to-video (that is the drama production line’s job)
- AI auto polish/coloring / line-art layering
- Multilingual lettering (structurally, dialogues are already separated from images, but this phase only does Chinese)

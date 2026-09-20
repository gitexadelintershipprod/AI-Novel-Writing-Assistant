# AI Comic Product Design

> Status: In design (2026-06-12)
> Companion engineering plan: [ai-comic-adaptation-plan.md](./ai-comic-adaptation-plan.md)
> Interaction baseline: drama workbench patterns already proven (create wizard / Tab workbench / NextStep guidance / quality panel)

---

## 1. Users and scenarios

### Target users (by priority)

1. **This project’s novel authors (core)**: have finished / are writing a novel in this project, and want to turn the IP into comics / motion comics for distribution and monetization.
   Traits: understand plot, not drawing; need “full automation + human gate at key points”.
2. **Adaptation studios (secondary)**: batch-process many novels; care about throughput, cost, and labor efficiency.
3. **Existing comic creators (edge)**: have their own artwork / character designs; want AI for sequels or efficiency.

### Core scenarios (Jobs to be done)

- “This 200-chapter novel of mine, I want 50 webtoon episodes serialized” — batch, stable, low labor
- “Episode 3, the lead’s face collapsed / costume is wrong; I need a fast fix” — precise local repair
- “I want to use a character look I drew myself, and leave plot to AI” — custom injection
- “Can I see a rough of this episode first, then polish” — fast prototype, progressive refinement

---

## 2. Product principles

1. **One-click to a result, controllable layer by layer (progressive disclosure)**: default path is “pick a novel → pick an art style → produce episode 1”,
   no more than 3 decisions end to end; advanced controls at each stage tuck into “expand”, visible only to experts.
2. **Review is the workflow**: AI produces an 80; humans gate to 95. Review efficiency = throughput ceiling,
   so the review UI is this product’s first-class citizen, not an afterthought page after generation finishes.
3. **Never start over**: any failure / dissatisfaction redoes only the smallest unit (one panel, one bubble);
   checkpoint resume; panels already passed are never affected.
4. **Cost is visible before it happens**: before every batch action, show an estimate (panel count × unit price + expected redraw rate);
   exceeding the per-episode budget cap auto-pauses and asks.
5. **Outputs are assets**: characters, art styles, and panel images are all reusable, exportable, and cross-project referable (shared character library).

---

## 3. Information architecture

```
Comic home (project list + new entry)
└─ Create wizard (3 steps; see §4.1)
└─ Comic workbench (single project; Tab structure aligned with the drama workbench)
   ├─ Tab Source & strategy   : content-source snapshot preview / track & art style / episode planning
   ├─ Tab Character assets    : character design-sheet grid (generate / upload / edit visual anchors)
   ├─ Tab Episode production  : episode list → single-episode panel workspace (this product’s core page; see §4.3)
   ├─ Tab Finished-art review : long-strip scroll review + issue marks + repair queue (see §4.4)
   └─ Tab Export & publish    : webtoon long strip / motion-comic video / historical export records
   └─ Persistent right rail: NextStep guidance panel (reuse drama pattern) + cost meter
```

---

## 4. Core flow design

### 4.1 Create wizard (goal: 90 seconds to “start generating episode 1”)

**Step 1 Pick a content source**
- Default tab “My novels”: list this project’s novels (cover / word count / chapter count); single-select to use
- Secondary tab “Other sources”: original inspiration input / paste text / upload comic (asset extraction)
- After picking a novel, immediately show: auto-recognized character list + estimated adaptable episode count (estimated from chapter count)

**Step 2 Set art style and track**
- Art style: preset template cards (color Korean webtoon / B/W shonen / ink Chinese style / American comics, with example thumbnails),
  or “upload a reference image” custom; selection locks the whole project
- Track: reuse rhythmEngine track-template recommendation (auto-preselected from novel genre; changeable)
- Advanced collapse: per-episode panel-count range, paywall-beat policy, reference-image strength

**Step 3 Confirm and estimate**
- Summary card: source / art style / estimated episode count / **episode-1 cost estimate**
- Primary button “Generate character design sheets and start episode 1” — one-click serial execution:
  character design sheets (with progress) → episode planning → episode-1 paneling → episode-1 image generation
- Secondary button “Create project only” (expert path; enter the workbench and step manually)

**Design point**: the wizard does not expose any intermediate concepts (SourceBundle / panel script);
first contact with those concepts should happen in the workbench when seeing the artifacts.

### 4.2 Character assets page

- Grid cards: design-sheet thumbnail + status badge (generating / ready / failed) + origin mark (AI / uploaded)
- Card actions: regenerate (keep 5 history versions for rollback) / upload replace / edit visual-anchor text
- Top warning bar: when any character is not ready, block the image-generation entry and explain why (preflight; see §6.1)
- “Import from character library”: reuse existing characters across projects (shared CharacterLibrary)

### 4.3 Single-episode panel workspace (core page)

**Layout**: left panel-thumbnail list (vertical, simulating webtoon order) + right selected-panel large image and editor

**Panel-card state machine** (aligned with imageData.status):
`script ready → generating → pending review → passed / pending repair`; color-coded; episode progress bar at the top of the list

**Single-panel editor**:
- Large-image preview (overlay bubble-preview toggle)
- Dialogue edit: double-click bubble text to edit and reflow immediately (re-composite bubble layer only; do not regenerate the image)
- Actions: regenerate (optional correction prompt) / upload replace / adjust bubbles (drag anchor) / mark passed
- Collapse: original panel-script text (action/panelType/visualPrompt editable then regenerate)

**Batch actions**:
- “Generate all panels in this episode” “Retry all failures” “Continue from panel N”
- Background execution + can leave the page; in-app notification on completion (reuse drama batch-job pattern)

**Keyboard flow (core of review efficiency)**: `J/K` previous/next panel, `A` pass, `R` redraw, `E` edit dialogue, `Space` large image

### 4.4 Finished-art review page

- **Long-strip scroll preview**: whole-episode scroll in publish form (with bubbles); what you see is what publishes
- Click any panel while scrolling → overlay quick actions (redraw / edit dialogue / tweak bubbles); refresh in place after change
- **Repair queue**: quality-gate-marked problem panels + human-marked panels aggregated into a queue;
  process one by one or batch-redraw; “Export” unlocks only when the queue is empty
- Motion-comic preview: same page switches “webtoon / motion comic” modes; motion-comic mode plays camera per panel + TTS preview

### 4.5 Export & publish page

- Format cards: webtoon long strip (platform slice-spec dropdown) / motion-comic video (9:16 MP4)
- Export history list (including artifact download, parameter snapshot)
- Pre-export validation: warn when unpassed panel count > 0 and list jump links

---

## 5. Ease-of-use checklist

| Pain point | Design response |
|------|------|
| Wait anxiety | All generation shows progress + estimated remaining time; batch jobs can leave the page; completion notification |
| Don’t know the next step | NextStep guidance panel is persistent (reuse drama’s proven pattern); always give one primary action |
| Fear that changing one thing breaks everything | Smallest-redo-unit promise: dialogue edits only reflow bubbles; redrawing one panel does not touch others |
| Repeated labor | Character library reused across projects; art-style templates savable as custom templates; correction prompts savable as project-level verbal tics |
| Mis-clicks | Lock a panel after it is passed (edit again requires explicit unlock); whole-episode validation before export |
| Can’t find history | Per-panel 5-version history visual compare/rollback; export records include a full parameter snapshot |

---

## 6. Output-stability design (product-layer guardrails)

### 6.1 Generation preflight (blocking)

Auto-validate before batch image generation; if it fails, don’t run (instead of users discovering problems halfway):
- All character design sheets ready (if missing, list them and one-click backfill generation)
- Art style locked; Provider API Key valid; panel scripts complete
- Cost estimate ≤ per-episode budget cap (adjustable; default reminder threshold)

### 6.2 Quality gate and auto-repair (on by default)

- Auto QA after each panel generates (character consistency / art style / match to action / limb collapse)
- Failures auto-retry up to 2 times (failure reason strengthens the prompt); still failing goes to the repair queue for human handling
- Product language does not expose the “quality gate” concept; it only presents “N panels pending repair”

### 6.3 Checkpoints and recovery

- Batch jobs checkpoint-resume (after process restart / network interrupt, continue from unfinished panels)
- Each episode’s generation status lands in the DB in real time; refreshing the page does not lose progress
- Recovery dialogs do not block the workbench (lesson from drama recovery-dialog repair)

### 6.4 Cost guardrails

- Persistent cost meter on the workbench right rail: this episode consumed / budget / project cumulative
- Over-budget on an episode auto-pauses, with “continue / adjust budget / stop”
- Abnormal redraw-rate alert: when an episode’s redraw rate > 50%, suggest checking art style / character design instead of continuing to burn money

---

## 7. Metrics

**North star**: time-to-“publishable” per episode (from click generate until the repair queue is empty)

| Category | Metric | Target reference |
|------|------|------|
| Efficiency | TTFP (create to episode-1 finished art) | < 30 minutes |
| Efficiency | Human-intervention panel share (redraw + hand-edit / total panels) | < 20% |
| Stability | First-pass rate per episode (share of panels needing no retry) | > 60% |
| Stability | Batch-job checkpoint-recovery success rate | > 99% |
| Cost | Actual per-episode cost / estimate deviation | within ±20% |
| Retention | Project completion rate (share of projects that exported ≥ 1 episode) | track a baseline |

---

## 8. Release phasing (aligned with engineering P0–P5)

| Product milestone | Includes | Corresponding engineering |
|------|------|------|
| **MVP (internally usable)** | Wizard + character page + single-episode panel workspace (no bubbles) + preflight | P0–P1 |
| **V1 (publishable webtoon)** | Bubble editing + finished-art review + long-strip export + repair queue | P2–P3 |
| **V2 (dual format + throughput)** | Multi-episode batch + cost guardrails + motion-comic export + character library across projects | P4–P5 |
| **V2.1** | comic_import whole-book parse (sequels), custom art-style template marketplace | Evaluate after P5 |

---

## 9. Product relationship with drama

- Parallel entries: sidebar “Short drama” and “Comic” at the same level; later merge into an “IP Adaptation” aggregate entry (same novel shows both production-line statuses)
- Shared-asset plumbing: character libraries interoperable (same character design sheet usable on both sides); same-source projects recommend each other (“this novel already has a short-drama project; reuse its characters?”)
- Interaction consistency: Tab structure, NextStep guidance, batch jobs, and quality panel stay isomorphic across the four patterns, lowering dual-product learning cost

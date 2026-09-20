# Short-Drama Creation Platform Plan v3: Completing the Finished-Cut Production Line — From “Creation Tool” to “Production Line”

> Status: planning draft v3 (iterated from novel-to-shortdrama-adaptation-1.md / v2)
> Date: 2026-06-10
> Prerequisite: v2’s P0–P6 have largely landed (independent module + three content sources + rhythm engine + script production line + character assets + storyboard + video prompt/Provider tasks + character design-sheet composite).
> Theme of this iteration: **inventory the still-missing links to “produce a publishable finished cut”**, and fold them into the roadmap as supplemental phases P8–P13.

---

## 0. Snapshot of capabilities already landed (as of 2026-06-10, feat/drama-module)

| Layer | Already have | Notes |
|----|------|------|
| Creation chain | strategy → outline → script → review/repair → storyboard → video prompts | Full chain connected |
| Content sources | novel_import / original / text_import | SourceBundle standardized |
| Character assets | DramaCharacter + character library + **character design-sheet composite** (face close-up + three views, 1536×1024) | portraitData stores design-sheet URL |
| Visual consistency | Design-sheet URL injected into LLM context (charactersDigest text layer) | **Not yet layer injection** |
| Video generation | VideoProviderPort + HttpVideoProvider + async tasks/refresh | text-to-video only |
| Export | Markdown / JSON episode export | No finished-cut assembly |
| Decoupling guard | dramaDecoupling.test.js CI guard | Still in force |

## 0.1 Gap overview (by distance from a finished cut)

```
script ──→ storyboard ──→ [gap② first-frame image] ──→ [gap① refImages image-to-video] ──→ shot video
                                                                │
character design sheet ──(exists)──┘            [gap④ TTS voiceover] [gap⑤ BGM/SFX] ──→ [gap⑥ timeline rough cut + ⑦ subtitles] ──→ finished cut
cross-cutting: [gap⑧ batch queue] [gap⑨ cost estimate] [gap⑩ versioning] [gap⑪ paywall-beat planning enhancement] [gap⑫ compliance precheck] [gap③ scene reference images]
```

---

## P8 Visual-consistency loop (highest priority, small effort)

### P8.1 Land refImages (gap ①)

Character design sheets are already generated and stored, but not actually passed to the video API. Close the last mile:

```ts
// VideoProviderPort.ts
interface VideoGenerationRequest {
  prompt: string;
  negativePrompt?: string;
  aspectRatio: string;
  durationSec?: number;
  refImages?: string[];        // new: character/scene reference images (publicly reachable URL or base64)
}
```

- `DramaVideoPromptService.createProviderTask()`: find characters by shot.characterRefs → read portraitData.url → assemble refImages.
- `HttpVideoProvider.createTask()`: refImages go into the request body; silently ignore when the provider does not support it (capability field `supportsRefImages`).
- Local URL → reachable address: on desktop, convert local images to inline base64 or temporary upload (branch by provider capability).

### P8.2 Storyboard first-frame images (gap ②)

Industry mainstream is “shot → first-frame still → image-to-video”, far more controllable than text-to-video, and the first frame can be human-confirmed for composition before burning video quota.

```prisma
model DramaShot {
  // new
  keyframeData  String?   // JSON: { status, url, prompt, provider, generatedAt, error }
}
```

- New `DramaShotKeyframeService`: reuse `generateImagesByProvider()` (platform-level, same path as character design sheets).
- Prompt = shot.visualPrompt + character visualAnchor + shot size/camera → vertical 1024×1536 (nearest 9:16 size).
- Store `drama-shots/{shotId}/keyframe.{ext}`, served by a dedicated endpoint.
- On video generation: if a first-frame image exists → image-to-video (first frame as first refImage); else → fall back to text-to-video.
- Frontend: storyboard card shows first-frame thumbnail + per-shot generate/regenerate button + Provider picker (reuse the character design-sheet picker pattern).

### P8.3 Scene reference images (gap ③)

High-reuse locations (CEO office / hospital corridor / family home) being inconsistent across episodes ruins the look as much as character inconsistency.

```prisma
model DramaScene {        // new table (name-distinguish from optional script-layer DramaScene; may be called DramaLocation)
  id, projectId, name, description,
  referenceData String?  // JSON: { status, url, prompt, generatedAt }
}
```

- Aggregate/dedupe from storyboard shot.location to auto-create scene entries; support manual add.
- Generate scene reference images (landscape empty shot, no people); after a shot is linked to a scene, first-frame / video generation merges the scene reference into refImages.
- MVP can be deferred: first normalize location text (same-name unification); image generation at the end of P8.

---

## P9 Audio layer (gaps ④⑤)

### P9.1 TTS voiceover

`voiceProfile` field already exists; complete the TTS production line:

- Platform-level `TTSProviderPort` (align with VideoProviderPort pattern): `synthesize({ text, voiceId, speed, emotion }) → audioUrl`. First provider suggested: OpenAI TTS or SiliconFlow (existing key system can reuse getAPIKeySettings).
- Line splitting: parse dialogue lines from episode.content (speaker → DramaCharacter.voiceProfile.voiceId mapping).
- Data: `DramaShotAudio`, or hang `dialogueAudioData` on the shot (JSON array: one audio clip per line).
- Narration/monologue uses the project-level default voice.
- Frontend: script page per-line preview + whole-episode batch synthesis.

### P9.2 BGM / SFX annotation (annotate first, assets later)

- At storyboard stage, have the LLM also produce `audioCue` (JSON: musicMood emotion tags + sfx list) — change the storyboard prompt; extremely low cost.
- BGM asset-library integration (auto scoring / licensed library) deferred to P9+; first ensure annotation info enters export and the timeline.

---

## P10 Finished-cut assembly layer (gaps ⑥⑦)

### P10.1 Subtitle export (highest ROI; do first)

- Dialogue + shot.durationSec already exist → generate SRT/ASS.
- Timeline estimate: within each shot duration, allocate by dialogue character-count ratio; after TTS, switch to real audio duration.
- Export endpoint expansion: `GET /projects/:id/episodes/:order/export?format=srt`.

### P10.2 Timeline / rough-cut export

Turn scattered shot resultUrl into an editable project:

- **Level 1 (MVP)**: ffmpeg sequential concat with no transitions → per-episode mp4 rough cut (ffmpeg on the server; desktop can vendor a binary).
- **Level 2**: export Jianying/CapCut draft (`draft_content.json`) or FCPXML — users finish in a professional tool. Jianying drafts have the highest value for domestic short-drama teams; prioritize.
- No new table needed: stitch episode → storyboard → shots(order); audio/subtitle tracks attach with P9/P10.1 artifacts.

---

## P11 Production-management layer (gaps ⑧⑨⑩)

### P11.1 Batch production queue (gap ⑧)

One episode 30+ shots × 80 episodes; manual per-shot trigger is not production:

```prisma
model DramaBatchJob {
  id, projectId, episodeId?, type(keyframes|videos|tts|full_episode),
  status(pending|running|paused|done|failed),
  progress String,   // JSON: { total, done, failed, failedShotIds }
  createdAt, updatedAt
}
```

- Episode-level actions: “generate all first-frame images for this episode” “generate all videos for this episode” “synthesize this episode’s voiceover”.
- Serial + rate-limited execution (video provider concurrency limits); failed shots recorded and retryable individually.
- Reuse existing async-task model (providerTaskId/refresh polling is already async form; add upper orchestrator `DramaBatchOrchestrator`).
- Frontend: episode-level progress bar + failure list + one-click retry failures.

### P11.2 Cost estimate (gap ⑨)

- Add unit prices to provider capability declarations (`costPerSecond` / `costPerImage`, configurable in settings).
- Before launching a batch job, show estimate: `Σ(shot.durationSec × costPerSecond) + image count × costPerImage`.
- After the job, record actual consumption into BatchJob.progress; project page summarizes cumulative cost.

### P11.3 Generation versioning (gap ⑩)

- `DramaVideoPrompt` stops overwriting: on regenerate, old records marked `superseded`, new record created (status field already exists; add `version` + `supersededById`).
- On first-frame / design-sheet regenerate, rename old files for archive (`keyframe.v1.png`); keyframeData stores a history array, or current only + keep disk history.
- Frontend: shot card “history versions” drawer; can roll back to an old version.

---

## P12 Content-quality enhancements (gaps ⑪⑫)

### P12.1 Paywall-beat planning enhancement

- Strategy stage produces `paywallPlan` (JSON: first paid-episode position 8–15 adjustable, beat-strength target curve).
- Quality gate new rule: the episode before the paid episode must have the stage-low emotional net (build resentment); the paid episode’s cliffhanger strength must be ≥ threshold.
- Outline-generation prompt injects paywallPlan so beats are “planned”, not “tagged”.

### P12.2 Platform compliance precheck

- New `DramaComplianceService`: script-level LLM precheck (violence/gore / medical misdirection / feudal superstition / vulgarity / advertising-law wording and other high-frequency short-drama platform rejection items).
- Output a structured report: `{ level: pass|warn|block, items: [{ rule, excerpt, suggestion }] }`, written to episode.qualityFlags.
- Hang on the quality gate (warn does not block; block triggers repair); also provide a standalone “compliance check” button to batch-run the whole show.

---

## Implementation roadmap (supplemental phases)

| Phase | Content | Effort | Depends on |
|------|------|--------|------|
| **P8.1** | Land refImages | Small (plan already designed) | None |
| **P8.2** | Storyboard first-frame images | Medium (reuse image infrastructure) | None |
| **P10.1** | Subtitle SRT export | Small | None |
| **P11.1** | Batch queue (first-frame + video first) | Medium | P8.2 |
| **P9.1** | TTS voiceover | Medium-large (new ProviderPort) | None |
| **P10.2** | Rough-cut concat + Jianying draft | Medium | P8/P9 artifacts |
| **P11.2/3** | Cost estimate + versioning | Small-medium | P11.1 |
| **P12** | Beat enhancement + compliance precheck | Medium | None |
| **P8.3** | Scene reference images | Medium | Reuse P8.2 pattern |
| **P9.2** | BGM asset integration | Deferred | P9.1 |

> Suggested execution order: **P8.1 → P8.2 → P10.1 → P11.1 → P9.1 → P10.2**.
> P8.1+P8.2 complete means the visual-consistency loop exists; P11.1+P9.1+P10.2 complete means the “production line” exists.

---

## Acceptance criteria (v3 supplement)

- [ ] P8.1: When creating a video task, design sheets of characters linked to the shot enter the request body as refImages; unsupported providers silently degrade; CI decoupling guard still passes.
- [ ] P8.2: Any shot can generate a 9:16 first-frame image and display it; shots with a first-frame image take image-to-video.
- [ ] P10.1: Any episode can export SRT; timeline matches shot durations.
- [ ] P11.1: “Generate whole episode” one-click trigger; progress visible; failed shots retryable individually.
- [ ] P9.1: Any episode’s dialogue can batch-synthesize voiceover; character voices match voiceProfile.
- [ ] P10.2: Any episode can export a rough-cut mp4 or Jianying draft; shot order/duration correct.
- [ ] P11.2: Cost estimate shown before launching a batch job; actual consumption shown after completion.
- [ ] P12.2: Compliance precheck can output a block-level report on a sample violating script and locate the original text.

---

## Open decisions

1. **First TTS provider**: OpenAI TTS / SiliconFlow (CosyVoice etc.) / Volcano Engine — for richness of domestic voices, SiliconFlow or Volcano is suggested.
2. **Rough-cut form priority**: ffmpeg direct mp4 vs Jianying draft — pick the former for “direct publish”, the latter for “team fine cut” (suggest doing both, draft first).
3. **How local images feed a cloud video API**: inline base64 / temporary object-storage upload / desktop local tunnel — decide by the first provider that supports refImages.
4. **Whether to pull scene reference images (P8.3) forward**: if measured video has severe cross-episode location jumps, do it immediately after P8.2.

# Novel generation quality guards

## Background

During automatic novel generation, four systemic quality problems cause continuity breaks or heavy repetition:

1. **World-source contamination**: the bound world’s historical era / region does not match the current story background, and proper nouns in the world slice contaminate chapter-writing context.
2. **Missing milestone state**: after a process event (get a license, sign a contract, stamp a seal) completes, there is no irreversible state record, so later chapters keep “pursuing” an already-finished goal.
3. **Repeated scene patterns**: the same time + place + action combination (for example “squatting at the inn at 4 a.m.”) repeats across chapters because context has no explicit blacklist.
4. **Volume-pacing runaway**: climax nodes in the volume plan (rumor outbreak, signing a fixed stall) are written early because there is no guard, leaving later chapters with nothing to advance toward.

## Decision

Add guards at prompt context, shared types, and agent tools. Do not patch this only as a frontend display layer.

## Current Rule

### 1. World-slice contamination prevention (`storyWorldSlice.prompts.ts`)

**Rule**: free-text slice fields (`coreWorldFrame`, `pressureSources`, and similar) must not use proper names from world assets directly. Use generic narrative language (for example “local gentry” rather than “the Cao Guodong family”). Proper names may appear only in `id` reference fields on `appliedRules/activeForces/activeLocations`.

**Rebuild tool**: the `rebuild_story_world_slice` agent tool, which force-triggers `NovelWorldSliceService.refreshWorldSlice()` to repair a contaminated slice.

**Failure mode**: if the world setting itself has no structured ids (`structuredDataJson` is empty and the legacy path is used), the slice may still use old nouns. Generate structured data for the world first.

### 2. Completed milestones (`ChapterWriteContext.completedMilestones`)

**Field**: `chapterWriteContextSchema` adds `completedMilestones: z.array(z.string()).default([])`.

**Render location**: in the `chapter_mission` block from `buildChapterWriterContextBlocks()`, render the `Already completed — do NOT re-pursue` list **before** the `mustAdvance` list.

**Write rule**: upstream chapter-planning / state-sync services fill this field when building `ChapterWriteContext`, reflecting process events that are already clearly complete before this chapter is written. If empty, do not render the block; existing generation logic is unaffected.

**Related prompt constraint**: `chapterWriter.prompts.ts` system prompt adds: do not re-pursue goals already listed in `completedMilestones`.

### 3. Scene-pattern blacklist (`ChapterWriteContext.recentScenePatterns`)

**Field**: `chapterWriteContextSchema` adds `recentScenePatterns: z.array(z.string()).default([])`.

**Render location**: in the `opening_constraints` block from `buildChapterWriterContextBlocks()`, append the `Scene pattern blacklist` list.

**Write rule**: the chapter-summary service extracts high-frequency recent scene patterns (the three elements time + place + action) and fills this field. If empty, do not render; existing logic is unaffected.

**Related prompt constraint**: `chapterWriter.prompts.ts` system prompt adds: do not reuse blacklisted scene patterns.

### 4. Volume key-milestone guards (`VolumeWindowContext.keyMilestoneGuards`)

**Field**: `volumeWindowContextSchema` adds:

```typescript
keyMilestoneGuards: z.array(volumeKeyMilestoneGuardSchema).default([])
// each item includes targetChapterRange / event / status / note
```

**Render location**: in the `volume_window` block from `buildChapterWriterContextBlocks()`, filter out guards with `status=done`. Remaining guards render as the list `Volume key milestone guards — pacing constraints`.

**Write rule**: the volume-planning service fills this field when building `VolumeWindowContext`, marking which key events may happen only in which chapter range. If empty, do not render.

### 5. Narrative-progress and character-absence signals

**Narrative-progress field**: `ChapterWriteContext.narrativeProgressHint` is an optional writing hint, computed at runtime from `chapter.order / novel.estimatedChapterCount`. Do not generate the field when total chapter count is empty or `<= 0`.

**Render location**: injected as a `narrative_progress_hint` block from `buildChapterWriterContextBlocks()`, `priority=98`, `required=false`. It only hints that the current stage is opening, development, convergence, or ending. It cannot replace the chapter mission, obligation contract, timeline constraints, or character hard facts.

**Character-absence signal**: `requiredCharacterAppearances` is still included only by character-selection logic. If an already-included character has `absenceRisk=high` and `absenceSpan>0`, a natural bring-back hint may be appended after the character name, reminding the writer the character has been absent for a long time. It does not force a rewrite of the cast result.

**Character information boundary**: the post-chapter unified extraction prompt `chapterArtifactDeltaPrompt` outputs `characterKnowledgeStates`, recording known facts and still-unknown facts only when this chapter has a significant information gap. The field updates the information boundary in the character’s current state. The same-named field on `characterDynamicsExtractionPrompt` is only a fallback shape when artifact delta did not succeed.

**Maintenance boundary**: do not hard-code “which chapter must converge” with a fixed chapter number. If pacing judgment needs to change, adjust the stage rules in `buildNarrativeProgressHint()` or the upstream estimated total chapter count. Do not stack special branches in the prompt template.

### 6. Context-budget observation

**Budget target**: the writer-stage context budget currently follows `tokenBudgetPolicy.stageTokenCap.writer`, default 2600. High-priority required blocks should stay restrained so required constraints themselves do not swallow too much budget.

**Observation method**: `buildCompressionLog()` only estimates by block priority which blocks would stay inside budget, and uses `summarizeContextBlock()` to simulate whether an over-budget block can be truncated into a summary. If the summary fits, it is recorded as `summarized`; otherwise optional blocks are recorded as `dropped`. It does not change `selectContextBlocks()`, does not trigger real-generation-path summarization, and does not affect generation results.

**Diagnosis rule**: if logs show `priority >= 99 && required=true` required blocks consistently exceeding 25% of the writer budget, separately evaluate whether some constraints should drop to `priority=95` and `required=false`. Do not delete timeline, previous-chapter continuity, character hard facts, or this-chapter obligation contract just to make the log look clean.

### 7. Chapter-continuity diagnosis tool (`audit_chapter_continuity`)

**Agent tool**: `inspect` class, `riskLevel=low`, no LLM. Deterministic detection based on keyword-group matching.

**What it detects**:

- Repeated scene patterns: which chapters simultaneously contain a predefined keyword group in `bookAnalysisTools.ts` (time + place + action clusters such as dawn / inn / squat)
- Repeated opening paragraphs: take the first 30 characters as a prefix; mark when the same prefix appears in more than 3 chapters

**Output**: `repetitionClusters`, `openingPatternClusters`, `hasCriticalIssues`, and repair advice.

## Failure Modes

- `completedMilestones` and `recentScenePatterns` depend on upstream services filling them when building context. If upstream does not fill them, those two guards do not take effect. This change only established the interface contract. Data fill still needs to be implemented in the chapter runtime coordinator.
- `keyMilestoneGuards` currently initializes as an empty array. The volume-planning service must fill guard data when generating volume structure, or the `volume_window` block will not show guards.
- `narrativeProgressHint` depends on the novel’s estimated total chapter count. Skip it naturally when there is no `estimatedChapterCount`. Do not guess a total chapter count just to show progress.
- Absence hints on `requiredCharacterAppearances` attach only to characters already in the obligation contract. If the character never entered that list, first check the character-dynamics overview and cast rules. Do not hard-stuff character names into the prompt.
- `characterKnowledgeStates` only records a clear information gap. If every character naturally knows the same fact, omit the field, so ordinary plot progress is not written as a long-term information boundary.

- `buildCompressionLog()` is an observation tool. A log showing dropped does not mean real generation already dropped the same-named block. Real clipping still follows the prompt runner’s context selection.
- After `rebuild_story_world_slice` rebuilds a slice, if `ensureStoryWorldSlice` later runs and stale detection says the slice is current, the rebuilt slice is reused rather than generated again. That is expected.

## Related Modules

- `server/src/prompting/prompts/storyWorldSlice/storyWorldSlice.prompts.ts`
- `server/src/agents/tools/worldTools.ts` (`rebuild_story_world_slice`)
- `server/src/agents/tools/bookAnalysisTools.ts` (`audit_chapter_continuity`)
- `server/src/prompting/prompts/novel/chapterLayeredContext.ts`
- `server/src/prompting/prompts/novel/chapterWriter.prompts.ts`
- `shared/types/chapterRuntime.ts` (`ChapterWriteContext`, `VolumeWindowContext`)

## Georgian fork input compatibility boundary

The Georgian writing fork has no legacy Chinese projects or Chinese import workflow. Structured creative outputs use canonical English enum values, while prose and analysis content use Georgian. Timeline normalization, chapter-editor diagnostics, continuation-context extraction, chapter-title anchors, and information-boundary replacement must not accept Chinese aliases or labels.

This is a deliberate fail-closed boundary: an unexpected translated enum or legacy label should fail schema validation instead of being silently normalized. The Georgian-content audit permits Han literals only inside the disabled Market Radar source assets; parser compatibility is not an allowlist category.

## Source Documents

- 2026-06-08 novel-generation quality-issue analysis and optimization plan (internal design review)

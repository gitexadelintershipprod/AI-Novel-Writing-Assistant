# Chapter Aftermath Extraction Consolidation — Leftover Follow-up Plan

> Status: code follow-up has been executed; runtime quality comparison still needs a rerun in an environment with LLM credentials
> Prerequisite: `chapter-aftermath-extraction-consolidation-plan.md` is already implemented (commit 638b3229).
> This plan handles the 4 non-blocking issues found in its acceptance (2026-06-11) + 1 unfinished runtime acceptance item.
> Items are independent of each other, can be implemented separately, and are ordered by priority.

## Item 1 — Fix truncation direction of knowledge-boundary writes (bug, do first)

**Problem:** `ChapterArtifactDeltaService.mergeKnowledgeBoundaryState`
(server/src/services/novel/runtime/ChapterArtifactDeltaService.ts) currently implements
`[base, boundaryLine].join("\n").slice(0, 1200)` — truncating from the tail.
When a character `currentState` itself is close to 1200 characters, **what gets cut is exactly this write's
Information-boundary line**, meaning the long-state characters that most need a boundary constraint are the ones that cannot be written in.

**Change:** switch to "reserve quota for boundaryLine first, then truncate base":

```
const reserved = boundaryLine.length + 1;          // +1 for the newline
const base = cleanedCurrentState.slice(0, Math.max(0, 1200 - reserved));
return [base, boundaryLine].filter(Boolean).join("\n");
```

The extreme case where boundaryLine itself exceeds 1200 characters can slice boundaryLine once more as a fallback.

**Acceptance:** unit test: when base is 1190 characters, the merge result must contain the complete (or at least non-empty)
Information-boundary line; when base is empty, the result is boundaryLine.

## Item 2 — Align the repair path with unified extraction (consistency)

**Problem:** `ChapterRepairStreamRuntime`
(server/src/services/novel/runtime/repair/ChapterRepairStreamRuntime.ts, about 189 lines)
does not pass
`skipLegacySummaryAndFacts` / `awaitArtifactDelta` when calling `artifactSyncService.syncChapterArtifacts`. After repair completes, a
regex coarse summary (briefSummary) is synced first, and only later overwritten by the async artifact-delta LLM summary —
there is a time window of summary-quality degradation, and the repair path has no guarantee on facts/state readiness timing.

**Change:** align with the finalize path, passing:

```
{
  scheduleBackgroundSync: true,
  awaitArtifactDelta: true,
  skipLegacySummaryAndFacts: true,
  provider: <repair request's provider>,
  model: <repair request's model>,
}
```

Note: the repair stream is a streaming response; awaiting delta will make the "repair complete" event fire later than now.
If that is product-unacceptable, fall back to passing only `skipLegacySummaryAndFacts: true`
(eliminates the coarse-summary overwrite window; timing stays async) — pick one at implementation time and state the tradeoff in the PR description.

**Acceptance:** after repairing a chapter, chapterSummary.summary no longer shows regex coarse-summary content
(signature: concatenated truncated body fragments), and consistencyFact is no longer written with source `chapter_auto_extract`.

## Item 3 — Keep or drop decision path B (chapter:drafted chain)

**Current state:** the `chapter:drafted` event has **no emit site anywhere in the code**
(only defined in events/types.ts + subscribed in registerNovelEventHandlers.ts).
The `character.chapterDraftSync` task never actually enqueues; path B (independent character-dynamics extraction)
is dormant. The checkpoint guard added in Step 1 currently only defends against "being re-enabled in the future".

**Pick one (needs a project-owner decision; recommend A):**

- **Option A (recommended): formally retire** — delete the
  chapter:drafted → chapterDraftSync enqueue logic in registerNovelEventHandlers and the corresponding case in NovelSideEffectJobHandlers;
  keep `syncChapterDraftDynamics` and
  `chapterDynamicsExtractionPrompt` (characterDynamicsLlm.ts /
  characterDynamicsSchemas.ts) and rehang them on a **manually triggered ops entrypoint**
  (existing admin route or script), purpose: human remedy when artifact-delta extraction clearly missed something.
  Also delete the `chapter:drafted` event type definition to avoid misleading later developers.
- **Option B: wire the event** — add a `chapter:drafted` emit at chapter finalize.
  Not recommended: the checkpoint guard would make the task enqueue then immediately no-op (artifact delta is already awaited complete),
  pure waste of queue throughput; it only has value when artifact delta failed, and failure retry
  should be owned by BackgroundSyncService's checkpoint retry mechanism.

**Acceptance:** Option A: full-text search for `chapter:drafted` has no leftover subscriptions; the manual entrypoint can successfully
trigger one syncChapterDraftDynamics and correctly skip when an artifact-delta checkpoint exists.

## Item 4 — One-shot handling of stock checkpoint mismatch (low priority; may only record, not process)

**Current state:** contentHash changed from `sha256(originalText)` to `sha256(compactText(originalText))`
(background dedup also unified over from sha1), so all stock `artifact_delta` checkpoints no longer match.
Impact: already-synced chapters run a full extraction again the next time they are touched (one extra LLM call);
persist logic is idempotent (upsert / deleteMany→create), no data-correctness risk.

**Handling suggestion: accept the cost; do not migrate.** Reason: re-extraction instead lets stock chapters gain the newly added
summary/concreteFacts/knowledgeStates fields; the work of writing a migration to recompute hashes is
greater than the benefit. Only note in release notes that "after upgrade, already-existing chapters will take one extra
extraction call on first re-sync". If ops is sensitive to the cost of bulk re-extraction, a one-shot script can be provided:
walk succeeded checkpoints, recompute contentHash with the new algorithm, and update — whether to implement is the owner's decision.

## Item 5 — Runtime extraction quality comparison (the plan's leftover acceptance item; required)

**Goal:** verify that the unified call (one output of 8 information kinds) has no obvious quality drop versus the old split calls.
This was the original plan's Step 3 go-live prerequisite; code review cannot cover it.

**Method:**
1. Choose 3-5 real chapters (cover: high information-gap chapters, multi-resource-change chapters, pure-transition chapters).
2. For each chapter run separately:
   - New: `chapterArtifactDeltaService.syncChapterArtifacts` (or run the prompt directly for raw output)
   - Old baseline: `chapterSummaryPrompt` (review.prompts.ts) run alone for summary + concreteFacts
3. Human-compare three dimensions: summary information coverage (whether key events/hooks are complete),
   concreteFacts recall (whether hard facts the old version extracted are missed by the new),
   whether characterKnowledgeStates appear only in chapters that truly have an information gap (no-gap chapters should be an empty array).
4. Record results in this file's appendix; if concreteFacts recall drops obviously (missing hard facts such as promises/deal terms),
   trigger the original plan's rollback: summary+facts as independent calls, everything else stays unified.

**Deliverable:** this file appends an "Appendix: quality-comparison record" section listing each chapter's comparison conclusion and final judgment.

## Priority and dependencies

| Item | Nature | Priority | Dependency |
|---|---|---|---|
| Item 1 knowledge-boundary truncation | bug fix | High | None |
| Item 5 quality comparison | go-live acceptance | High | None (do soon; decides whether to roll back) |
| Item 2 repair-path alignment | consistency | Medium | None |
| Item 3 path B keep-or-drop | cleanup decision | Medium | Owner must pick A/B |
| Item 4 stock checkpoints | record / optional script | Low | Owner decides whether to write a script |

## Appendix: follow-up execution record (2026-06-11)

### Executed

- Item 1: `mergeKnowledgeBoundaryState` now reserves quota for the Information-boundary line first, then truncates old `currentState`; added a unit test covering that a 1190-character old state still keeps the boundary line.
- Item 2: the manual repair stream is aligned with the finalize path; after repair it syncs `artifact_delta` and passes `awaitArtifactDelta=true`, `skipLegacySummaryAndFacts=true`, and `provider/model`. Tradeoff: accept a later repair-complete event in exchange for summary/facts/state being ready before the next step.
- Item 3: adopted option A. The `chapter:drafted` event type, event subscription, `character.chapterDraftSync` side-effect job type, and worker case are retired; the `syncChapterDraftDynamics` body is kept as reusable fallback capability for a later manual ops entrypoint.
- Item 4: adopted "accept one-shot re-extraction cost; do not write a migration script". Reason unchanged: first re-sync of stock chapters can fill in the newly added `summary/concreteFacts/characterKnowledgeStates`, and the persist path is idempotent; if cost-sensitive, do a separate read-only assessment and migration script later.

### Item 5 quality-comparison record

Local `server/dev.db` has usable real chapter samples: 3166 chapters total, of which 569 have body length of at least 500 characters. The current environment has no usable LLM credentials (`OPENAI_API_KEY`, `DEEPSEEK_API_KEY`, `SILICONFLOW_API_KEY`, `XAI_API_KEY`, `ANTHROPIC_API_KEY` are all unset), so old and new prompts were not actually called and a quality-pass conclusion cannot be given.

Candidate samples below; rerun later in an environment with LLM credentials:

| Purpose | novelId | chapterId | Chapter | Title | Body word count |
|---|---|---|---:|---|---:|
| Long body / mixed information | `cmmbi9xcj0000fgv1op7zd8de` | `cmmboxapg0000yov1vf1m2rz4` | 1 | New chapter 1 | 6846 |
| Consecutive-chapter baseline | `cmmivm3980000ksv142lzy1pl` | `cmmiyc6v9000gwgv1z7ewgplm` | 1 | Seclusion in Bin City | 6391 |
| Consecutive-chapter baseline | `cmmivm3980000ksv142lzy1pl` | `cmmiyc6v9000hwgv152era5iz` | 2 | Chen Mo asks for help | 5118 |
| Consecutive-chapter baseline | `cmmivm3980000ksv142lzy1pl` | `cmmiyc6v9000iwgv1fpbq49ek` | 3 | First look at local customs | 5286 |
| Short/mid-length / transition candidate | `cmmsuhi6z0003z4v14yswlxg8` | `cmmsuyea6000hz4v13e56ythy` | 1 | Night rain at the bridge | 1690 |

Suggested rerun commands:

1. Configure a real LLM provider key for the service process.
2. For each chapter in the table above, run `chapterArtifactDeltaPrompt` and `chapterSummaryPrompt` separately.
3. Record human judgment by body coverage, `concreteFacts` recall, and `characterKnowledgeStates` restraint.

Current judgment: Item 5 is unfinished; this must not be used to claim that unified-extraction quality has already passed go-live acceptance.

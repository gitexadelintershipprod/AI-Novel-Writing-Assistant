# Timeline constraint layer

## Background

The chapter production chain already has `StoryStateSnapshot`, `ConsistencyFact`, and `CharacterTimeline`, but those assets mainly own post-chapter state summaries, fact extract, and character-experience records. They lack an independent “event-order constraint layer”, so they cannot stably stop future-event leaks, previous-chapter hook breaks, time regression, event duplication, and character-state rollback.

The timeline constraint layer keeps event-order display, async extract, and diagnostic value. Continuity constraints for prose writing come from the Fact Ledger, chapter obligations, Payoff Ledger, reader-experience contract, and the previous chapter’s actual closing prose together. Timeline does not directly change prose, and it is no longer writer required context.

## Decision

An independent `timeline` module was added. Timeline only does four things:

- Record planned events, occurred events, chapter time anchors, hooks, and check reports.
- Provide structured event and hook assets to the frontend time axis, diagnostic entries, and ops flows that need explicit event-order checks.
- After prose generation, extract key events and validate timeline consistency.
- On check failure, emit issues to the chapter-repair chain. Do not modify prose directly.

A failed chapter should keep its prose and be marked `needs_repair`, but events from failed prose must not be committed as `occurred` timeline, or later context is polluted.

## Current Rule

- `StoryTimelineEvent` owns global event order and distinguishes `planned` from `occurred`.
- `ChapterTimeAnchor` owns what story time the chapter sits in, which events it picks up, and which events must not happen early.
- `TimelineHook` keeps historical hooks and display semantics. This chapter’s handoff duty in prose writing is owned by `ReaderExperienceContract.inheritedHookResponsibilities`.
- `TimelineCheckReport` records each post-prose check result for Task Center and the chapter editor.
- `timeline_context` and `previous_chapter_hook` are not chapter-writing required context. The writer must read `reader_experience`, the Fact Ledger, payoff directives, chapter obligations, and the previous chapter’s actual closing prose.
- Timeline extract uses structured AI output. The checker only makes deterministic judgments on structured events, hooks, and state changes.
- When Timeline has not entered the prose run pack, do not emit a “missing timeline context” quality warning. That state means this writing chain did not enable Timeline, not that the prose has a quality problem.
- On check failure, do not commit `occurred` events. Extracted events and new hooks may be committed only on pass or warning.
- Automatic repair is handled by the existing chapter-repair chain. The timeline module only provides an issue list and repair suggestions.
- The main chapter-acceptance hot path is governed by acceptance. If Timeline extract is enabled by an independent entry, it should still run idempotently on the same chapter and same prose content hash.
- When a long-arc hook is partly answered by the prose, mark it handled or reached, instead of keeping it as a hard block the next chapter must solve.

## Failure Modes

- Chapter N writes an event that should only happen in chapter N+M: first check whether chapter boundary, protected secrets, the Fact Ledger, and the reader-experience contract entered the writer. When independent Timeline diagnosis is enabled, then check whether the checker emitted `future_event_leak`.
- The next chapter skips the previous chapter’s closing duty: check whether chapter refinement wrote the neighboring-chapter question into `ReaderExperienceContract.inheritedHookResponsibilities`, and whether the writer received the `reader_experience` block. `TimelineHook` is only for historical display or auxiliary diagnosis.
- Character state rolls back: check whether the previous round’s `occurred` events recorded confirmed state in `stateChanges`.
- Check failed but later chapters still cite polluted events: check whether the failed chapter wrongly committed an `occurred` timeline.
- Timeline checks stay in long-lived warning: check whether the extractor prompt cannot extract a chapter time anchor, or whether the chapter plan itself lacks a time label.

## Related Modules

- `server/src/modules/timeline/`
- `server/src/services/novel/runtime/GenerationContextAssembler.ts`
- `server/src/services/novel/runtime/ChapterRuntimeCoordinator.ts`
- `server/src/prompting/prompts/novel/chapterWriter.prompts.ts`
- `server/src/prompting/prompts/novel/timelineExtractor.prompts.ts`
- `shared/types/timeline.ts`

## Source Documents

- Current timeline constraint-layer development plan
- [Chapter production chain](./chapter-production-chain.md)
- [Module boundaries and documentation governance](../architecture/module-boundaries.md)

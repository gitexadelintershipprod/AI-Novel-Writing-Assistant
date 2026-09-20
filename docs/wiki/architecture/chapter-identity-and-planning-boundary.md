# Chapter identity and planning extension boundary

## Background

Pacing chapter-split and chapter execution long maintained separate chapter lists. Pacing split uses `VolumeChapterPlan` in the volume workspace; chapter execution uses the official `Chapter`. That model can protect planning state from execution state. If the two sides are joined only by chapter order, titles, and manual sync, users see an internal step such as "chapters were split but the execution area did not update," and Auto-Director recovery becomes harder to judge.

The full novel-production chain needs one identity for "what a chapter is," while still keeping the responsibility difference between "how a chapter is planned" and "how a chapter is executed."

## Decision

`Chapter` is the only chapter identity and the primary execution entity. `VolumeChapterPlan` is the volume-level pacing-plan extension and should point at the matching `Chapter` through `chapterId` whenever possible.

In the short term, compatibility fields such as title, summary, and task sheet remain on `VolumeChapterPlan`, but backend read/write rules treat `Chapter` as canonical:

- Official chapter fields are owned by `Chapter`: chapter order, title, body text, execution state, target word count, conflict level, reveal level, forbidden items, task sheet, scene cards, and quality state.
- Planning-extension fields are owned by `VolumeChapterPlan`: volume membership, pacing segment, chapter purpose, exclusive events, end-of-chapter state, next-chapter entry state, and foreshadowing references.
- Old plans that lack `chapterId` may exist only as compatibility state. The service layer should prefer relinking by chapter order and title, then write the link back to the volume workspace.

## Current Rule

When the volume workspace is read, it aligns official chapters by `chapterId` and hydrates the planning view with official chapter fields. Old rows without `chapterId` fall back to matching official chapters by chapter order.

Volume chapter-split saves, chapter-list generation, and Auto-Director split refinement should automatically maintain official chapter records and write back `VolumeChapterPlan.chapterId`. The user's main flow should not require understanding or clicking "Sync to chapter execution."

`/volumes/sync-chapters` remains a compatibility-repair and diagnosis entrypoint. Its first job is to repair chapter links and fill in execution entrypoints. It should not become a required step in the beginner main flow.

## Failure Modes

- If a planned chapter already has a `chapterId`, it must not be rebound to a different official chapter just because the titles match.
- If an official chapter already has body text, a split reorder or link repair must not, by default, clear the body text or reset execution state.
- If old data has no `chapterId` and chapter order / title cannot be matched reliably, create a new official chapter and write the link back. Do not silently leave a dangling plan.
- If the execution-contract quality gate fails, block the link into the chapter execution area and point to the specific planning information the chapter is missing.

## Related Modules

- `VolumeChapterPlan.chapterId` links to the official `Chapter`.
- Volume-workspace reads and saves are owned by `NovelVolumeService`, which keeps canonical fields.
- Chapter-link repair is owned by `VolumeChapterSyncService` and `buildVolumeSyncPlan`.
- Frontend pacing split and chapter execution are two views of the same chapter identity, not two lists the user must sync by hand.

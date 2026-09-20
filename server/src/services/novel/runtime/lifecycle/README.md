# Chapter Lifecycle Persistence Boundary

## Background

Chapter production maintains `content`, `generationState`, and `chapterStatus` at the same time. If generation, review, repair, and asset sync each write these fields directly, a single run can leave contradictory state, and recovery cannot tell which result is trustworthy.

## Current Rule

- `ChapterLifecycleService` is the only persistence service inside chapter Runtime that may write the prose working version, `generationState`, and `chapterStatus` directly.
- Generation, review, and repair services decide the next state, but they must delegate persist here; they must not call `prisma.chapter.update` themselves to change lifecycle fields.
- When saving `drafted` or `repaired` prose, the prose, pipeline state, and `chapterStatus=generating` must be committed in the same update.
- Quality marks, repair history, and chapter lifecycle state from human review, automatic review, and repair re-review must be committed in the same update through `applyQualityAssessmentState`. The quality-closure service only computes structured assessment and must not write the chapter table directly.
- `generationState=approved` must be synchronized to `chapterStatus=completed` through `mergeChapterPatchForGenerationStateBump`, to avoid “pipeline already passed but the UI is still pending”.
- Timeline, fact ledger, and asset backfill remain owned by their own services. This service only saves chapter prose versions and lifecycle fields; it does not absorb quality judgment or post-asset logic.

## Scope Boundary

Creating chapters in planning, a user explicitly saving prose in the editor, version restore, and downstream reset have different data semantics and are not chapter Runtime lifecycle writes. Those entrypoints must still follow their own protection and version rules.

## Failure Diagnosis

- Prose exists but status is still `planned`: check whether the caller bypassed `saveWorkingContent`.
- `generationState=approved` but `chapterStatus` is not `completed`: check whether a single field was updated directly.
- A repaired draft is saved but the page still shows old prose: check whether the repair chain delegated to the lifecycle service and was then overwritten by an old write path.
- Human review recommends replan but there is no recoverable state: check whether quality assessment wrote `riskFlags.qualityLoop`, `generationState=reviewed`, and `chapterStatus=needs_repair` in the same update.

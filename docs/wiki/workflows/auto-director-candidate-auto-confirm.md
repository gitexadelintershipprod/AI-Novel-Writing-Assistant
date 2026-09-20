# Auto-Director: auto-confirm character candidates

## Background

After chapter generation finishes, `ChapterArtifactDeltaService` extracts newly appearing characters and writes them to the `characterCandidate` table with `status: "pending"`. Those candidates are injected into later chapter prompts as read-only placeholders (`pendingCandidateGuards`), explicitly labeled “must not be injected into generation outside the repair flow”.

In manual mode, the user confirms candidates in the UI. After confirm, the character enters the formal roster and `rebuildDynamics` rebuilds the dynamics graph.

**Problem:** full Auto-Director mode (`runMode: full_book_autopilot`) has no auto-confirm. Candidates stay `pending`, so later chapters always see the character as a read-only temporary tag instead of a formal character. That means:

- AI cannot write personality, motive, or a growth arc for that character
- The character lacks a consistency anchor across chapters
- `rebuildDynamics` does not include candidates in the volume projection, so the dynamics graph is incomplete

## Decision

In the auto-execution loop of `NovelDirectorAutoExecutionRuntime.runFromReady`, whenever a pipeline job succeeds and remaining chapters still need to run, auto-confirm every `pending` candidate before advancing to the next chapter.

Swallow errors with `.catch(() => null)` and do not block the main flow. Candidate-confirm failure must not stop whole-book auto-creation.

## Current Rule

### Trigger

When `job.status === "succeeded"` and `autoExecution.remainingChapterCount > 0` (the “this batch finished, loop continues” branch), call `autoConfirmPendingCandidates`, then `continue autoExecutionLoop`.

### Auto-confirm policy

- Use the candidate’s own fields: `proposedName` → character name, `proposedRole` → role type (default `"New character"`), `summary` → background
- Leave `castRole` unset (`null`) — a conservative default; do not force lead/support rank
- After creating characters from several candidates, call `rebuildDynamics` once, not N times

### Key files

| File | Duty |
|------|------|
| `CharacterDynamicsMutationService.autoConfirmPendingCandidates()` | Batch confirm, single rebuildDynamics |
| `CharacterDynamicsService.autoConfirmPendingCandidates()` | Facade delegate |
| `novelDirectorAutoExecutionRuntimePorts.ts` | Optional `autoConfirmPendingCandidates?` port |
| `novelDirectorAutoExecutionRuntime.ts` | Injection call site (pipeline succeeded branch) |
| `NovelDirectorService.ts` | Wiring (production path) |
| `DirectorCoreStepModuleRuntime.ts` | Wiring (full-book auto-creation path) |

### Optional port

`autoConfirmPendingCandidates` is an optional dependency on `NovelDirectorAutoExecutionRuntimeDeps`. Tests or non-auto-creation flows may omit it without changing existing behavior.

## Failure Modes

- **Duplicate `proposedName`:** `createCharacter` does not de-dupe, so same-name characters can appear. Tolerance: low probability (one book rarely has same-name candidates), and `rebuildDynamics` before the next chapter merges duplicates into the dynamics graph.
- **`rebuildDynamics` fails:** the whole `autoConfirmPendingCandidates` is swallowed by `.catch(() => null)`. Candidates stay `pending` and later chapters keep the read-only injection. No crash, but the problem is unsolved. Persistent failure should inspect the `rebuildDynamics` LLM call chain.

## Related Modules

- `server/src/services/novel/runtime/ChapterArtifactDeltaService.ts` — candidate source; writes pending candidates after a chapter finishes
- `server/src/prompting/prompts/novel/chapterLayeredContextShared.ts` — `buildPendingCandidateGuardText()`, injects pending candidates as read-only placeholders
- `server/src/services/novel/director/automation/novelDirectorAutoExecutionRuntime.ts` — call site

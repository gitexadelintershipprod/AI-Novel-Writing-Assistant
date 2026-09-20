# Quality-debt root-cause attribution (Phase 0)

## Background

When a chapter ends on the `defer_and_continue` path (one repair still did not pass the quality gate), the system needs the real failure reason so later optimization can be targeted. Phase 0 embeds structured attribution data on this path so aggregation tools can count root-cause distribution and give the later four-phase optimization plan data-driven priority.

## Root-cause classes

| Code | Name | Description | Key evidence |
|------|------|------|----------|
| **A** | Open-loop repair | The repairer received flattened text, not structured obligation information, so re-evaluating the same obligation failed again | `sameObligationRepeated = true` (first = second issue codes identical) |
| **B** | Patch-anchor mismatch | `ChapterPatchRepairService` requires an exact original-text anchor. After the anchor misses, the path escalates to heavy_repair, and the budget is only 1 | `patchAnchorFailed = true` |
| **D** | Unreachable obligation | Obligations in a pre-generated task sheet contradict actual prior prose, so chapter-level repair can never satisfy them | `planMisaligned = true` (`failureClassification.code = draft_obligation_unmet / replan_required`) |
| **E** | Signature drift | The first failure was a length issue; after repair a content issue surfaces; the same issueSignature exhausts the budget | `lengthVsContentDrift = true` |

## Data Model

```ts
interface QualityDebtAttribution {
  firstFailureIssueCodes: string[];           // issue codes from the first acceptance failure
  secondFailureIssueCodes: string[];          // issue codes from the post-repair second failure
  firstFailureClassificationCode: string | null; // failureClassification.code
  patchAnchorFailed: boolean;                 // patch escalated to heavy (root cause B)
  sameObligationRepeated: boolean;            // same obligation failed twice (root cause A)
  planMisaligned: boolean;                    // unreachable obligation (root cause D)
  lengthVsContentDrift: boolean;              // signature drift (root cause E)
  missingObligationKinds: string[];           // obligation kinds missing on first failure
  budgetActionsConsumed?: string[];           // Director budget actions (written by the outer layer)
  degradedProposalRouting?: {
    contentProvenance: "debt";
    routedToPendingReview: true;
    proposalTypes: ("character_state_update" | "character_resource_update")[];
    fields: ("currentState" | "currentGoal" | "characterResource")[];
  };
}
```

## Quality-debt source routing

When chapter prose does not pass the quality gate but is kept so execution can continue, final-prose asset sync must carry `contentProvenance = "debt"`. That mark does not change chapter retry, pause, or continue-generation control flow. It only affects how later extracted state proposals are booked.

Current Rule:

- `contentProvenance = "confirmed"`: prose that passed the quality gate normally, or that skipped auto-audit, keeps the original auto-commit and pending-review split.
- `contentProvenance = "debt"`: chapter content may still be used for later automatic generation, but character-state, character-resource, and similar proposals extracted from that prose all carry `sourceQuality = "debt"` and a `source_quality:debt` validation mark.
- Debt-sourced proposals must not take the auto-commit whitelist. Even a normally low-risk `character_state_update`, or a medium-risk `character_resource_update` extracted in the background, must enter `pending_review`.
- Malformed proposals are still rejected from storage. Missing `summary`, missing character ID, invalid character-resource payload, or missing evidence does not enter pending review just because the source is debt.

The goal is to separate “automatic generation does not break the chain” from “hard facts are not fed wrong”: chapters can keep generating, but unconfirmed state/resource changes do not directly pollute character hard facts, the resource ledger, and later chapter context.

Pending character-state proposals appear in writing context as soft constraints. If `currentState` or `currentGoal` come from a pending proposal, the prompt hints that they may be adjusted when they conflict with the latest plot. `currentLocation` stays a hard fact unless a later pending-source write-back for location fields is added.

## Write Path

**Trigger**: at the end of `chapterRuntimePipeline.runPipelineChapterWithRuntime`, when the chapter finally does not pass, build the attribution object and write `PipelineRuntimeResult.qualityDebtAttribution`.

**Storage**: the `qualityLoop.qualityDebtAttribution` node in `chapter.riskFlags` JSON, merged with existing `qualityLoop` quality-loop data.

**Trigger chain**:

```
chapterRuntimePipeline.ts
  → runPipelineChapterWithRuntime collects first/second failure information
  → syncFinalChapterArtifacts passes contentProvenance through
      ↓
ChapterArtifactBackgroundSyncService.ts
  → ChapterArtifactDeltaService.syncChapterArtifacts
      ↓
StateCommitService / CharacterResourceValidationService
  → debt-sourced proposals skip auto-commit and enter pending_review
      ↓
GenerationContextAssembler / chapterLayeredContext
  → pending currentState/currentGoal enter the writing prompt as soft constraints
```

Attribution write chain:

```
chapterRuntimePipeline.ts
  → runPipelineChapterWithRuntime collects first/second failure information
  → buildQualityDebtAttribution infers root-cause labels
  → PipelineRuntimeResult.qualityDebtAttribution
      ↓
novelCorePipelineService.ts
  → chapterQualityLoopService.recordAssessment(qualityDebtAttribution)
      ↓
ChapterQualityLoopService.ts
  → serializeRiskFlags → chapter.riskFlags (JSON)
```

## Read Path

**Agent tool**: `analyze_quality_debt_attribution`

- Input: novelId (required), startOrder, endOrder (optional)
- Behavior: scan all chapters in the given range whose `terminalAction = defer_and_continue`, extract `qualityDebtAttribution`, and aggregate
- Output:
  - Root-cause A/B/D/E share (0–1)
  - Top 5 failure issue codes
  - Top 3 missing obligation kinds
  - Per-chapter attribution detail
  - Decision suggestion (which phase to prioritize)

## Decision gate (Phase 0 conclusion)

Use the tool’s root-cause shares to decide later optimization emphasis:

| Dominant root cause | Suggestion |
|----------|------|
| **D dominant** | Prioritize phase one (lazy planning). JIT task sheets directly dissolve unreachable obligations |
| **A/B dominant** | First do phase one’s repair closed-loop sub-item (1.D), then the lazy-planning main body |
| **E dominant** | Split length/content `issueSignature` and count budgets separately |

## Related Modules

- `server/src/services/novel/runtime/chapterRuntimePipeline.ts` (attribution collection + `QualityDebtAttribution` interface)
- `server/src/services/novel/quality/ChapterQualityLoopService.ts` (attribution storage)
- `server/src/services/novel/novelCorePipelineService.ts` (attribution pass-through)
- `server/src/agents/tools/bookAnalysisTools.ts` (`analyze_quality_debt_attribution` tool implementation)
- `server/src/agents/tools/bookAnalysisToolSchemas.ts` (tool schema)

## Relationship to the four-phase optimization plan

Phase 0 is a “instrument first, then look” diagnostic layer. It does not change generation logic; it only instruments the existing failure path. Its output drives phase-one (lazy planning) implementation priority, so a large rebuild is not spent on the wrong root cause.

Related plan document: `.claude/plan/novel-generation-pipeline-optimization.md`

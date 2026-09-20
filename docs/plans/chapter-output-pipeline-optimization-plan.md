# Chapter Output Pipeline Slimming and Asset Backfill Optimization Plan

Updated: 2026-05-13

## 1. Background and goals

The chapter-body production chain once expanded into:

```text
chapter contract generation -> body generation -> AI detection -> repair -> chapter light audit -> character dynamics extraction -> state snapshot extraction -> character resource ledger extraction -> payoff ledger sync
```

The problem with this chain is not that any single capability is worthless, but that too many capabilities were serialized onto the same hot path. One chapter body then needed multiple reads of the same text, multiple LLM calls, and multiple state writes. User wait time grew, auto book-completion throughput dropped, and it became easier to hit repair loops, duplicate ledger sync, and chapter-contract re-contamination of body generation.

This plan's goal is to change body production into a "dual channel":

```text
lightweight precheck -> full-chapter body generation -> unified acceptance gate -> optional local repair
                                      |
                                      v
                              async asset backfill channel
```

The body hot path is only responsible for quickly producing a readable, savable, continuable chapter; state snapshots, character resources, character dynamics, and the payoff ledger go through an async, idempotent, batchable asset channel.

## 2. Core principles

- The body writer continues to generate a whole chapter in one shot; do not re-wire chapter contracts, sceneCards, multi-round per-scene writing, or hard per-scene truncation.
- Chapter contracts, sceneCards, and boundary information are only planning, review, diagnosis, and local-repair auxiliary assets; they do not drive the body hot path.
- AI-based structured understanding is the primary implementation of quality judgment, sync planning, and risk identification; deterministic code only does input validation, idempotency judgment, persisting structured output, and safety boundaries.
- When the same chapter body content has not changed, do not rerun state snapshot, character resource, payoff ledger, or character-dynamics sync.
- Default experience prefers helping beginner users finish a full novel: body first readable, risk explainable, background continues backfill; strict consistency is an optional mode.

## 3. Phased implementation

### Phase 0: Documentation and baseline

- Add this plan document as the later execution blueprint.
- Record the current hot-path baseline: writer, style detection, light audit, repair, background state, character dynamics, character resource, payoff ledger.
- Do not change business behavior.

### Phase 1: Hot-path slimming

- Add `ChapterRuntimeReadiness`, checking only the minimum conditions for body generation: chapter exists, characters available, context pack assemblable, task goals explainable.
- `ChapterRuntimeCoordinator` by default no longer force-calls `ensureChapterExecutionContract`.
- Allow body generation without `sceneCards`; when key task goals are missing, give a clear blocking reason.
- Add a structured acceptance gate `novel.chapter.acceptance_assessment`, replacing the independent AI-taste detection and light-audit dual calls on the default hot path.

### Phase 2: Repair-loop convergence

- The acceptance gate outputs `repairDirectives` that drive existing local patch repair.
- Default automatic repair at most once; on failure, record pending-repair status and a repair ticket; do not enter infinite retry.
- When `autoReview=false`, still save the body directly and may enter async asset backfill.
- Full audit remains a strict mode, manual review, or high-risk escalation capability; it is not the default per-chapter hot path.

### Phase 3: Unified asset delta

- Add structured extraction prompt `novel.chapter.artifact_delta.extract`.
- One output of state changes, character dynamics, character resource changes, payoff changes, and a sync plan.
- Background sync changes from "one chapter, multiple prompts extracting separately" to "one AI extraction, multi-table deterministic persist".
- Keep old rebuild / manual backfill services for historical data repair and compatibility.

### Phase 4: Idempotency and scheduling

- Add an additive checkpoint: `novelId + chapterId + contentHash + artifactType + syncMode`.
- Support `artifactSyncMode`:
  - `adaptive`: default mode; critical assets sync immediately async; full payoff calibration is periodic or high-risk triggered.
  - `deferred`: fast body production; asset sync may be deferred to batch processing.
  - `strict`: wait for asset sync and necessary ledger calibration before continuing to the next chapter.
- Payoff ledger writes a delta per chapter; full sync only triggers every 3 chapters, at volume end, on a high-risk payoff signal, or in strict mode.

### Phase 5: Progress, copy, and release records

- Pipeline status distinguishes "body already readable", "quality pending repair", "asset backfill in progress", "ledger calibrating".
- Update recovery hints to make clear that background asset sync is not body failure.
- After implementation produces user-visible change, update `docs/releases/release-notes.md` and `README.md` latest updates per the repo release workflow.

## 4. Interfaces and structured output

### 4.1 Pipeline options

Add optional field:

```ts
artifactSyncMode?: "adaptive" | "deferred" | "strict";
```

Default is `adaptive`. Existing `autoReview`, `autoRepair`, `repairMode` stay compatible.

### 4.2 Acceptance-gate output

```ts
{
  status: "accepted" | "repairable" | "needs_manual_review" | "continue_with_risk";
  score: {
    coherence: number;
    pacing: number;
    repetition: number;
    engagement: number;
    voice: number;
    overall: number;
  };
  blockingIssues: Array<{
    severity: "low" | "medium" | "high" | "critical";
    category: "continuity" | "character" | "plot" | "mode_fit" | "voice";
    code: string;
    evidence: string;
    fixSuggestion: string;
  }>;
  repairDirectives: Array<{
    mode: "patch" | "rewrite" | "manual";
    target: "continuity" | "character" | "plot" | "ending" | "voice";
    instruction: string;
  }>;
  riskTags: string[];
  assetSyncRecommendation: {
    priority: "normal" | "high";
    reason: string;
    requiresFullPayoffReconcile: boolean;
  };
  continuePolicy: "continue" | "repair_once" | "pause";
}
```

### 4.3 Asset-delta output

```ts
{
  stateDeltas: unknown[];
  characterResourceDeltas: unknown[];
  payoffDeltas: unknown[];
  relationDynamics: unknown[];
  syncPlan: {
    stateSnapshot: "skip" | "write";
    characterResources: "skip" | "write";
    payoffLedger: "skip" | "delta" | "full_reconcile";
    characterDynamics: "skip" | "write";
  };
  confidence: number;
  requiresFullReconcile: boolean;
}
```

Concrete persist mappers can tighten types phase by phase, but new prompts and services must first output structured fields; keyword branches must not replace AI recognition.

## 5. Verification checklist

- Body generation can start without `sceneCards`.
- When a task sheet already exists, the chapter-contract prompt is not triggered.
- When key task goals are missing, return a clear blocking reason.
- Default per-chapter body hot path only runs writer + acceptance gate; full audit is not triggered by default.
- Automatic repair at most once; after failure, enter a recoverable pending-repair state.
- Under the same body content hash, asset sync is not called again.
- `adaptive` triggers full payoff calibration on chapter 3 or a high-risk payoff signal.
- `deferred` can advance body quickly and backfill assets later in the background.
- `strict` waits for necessary asset sync before continuing.
- Auto-director and manual batch generation reuse the same default behavior.

## 6. Anti-omission checklist

- shared types, route schema, pipeline payload, and generation-job persisted fields need to stay in sync.
- SQLite and PostgreSQL Prisma schemas must stay consistent.
- New product prompts must live in `server/src/prompting/` and be registered in the registry.
- UI copy does not narrate an implementation migration; it tells the user "what you can do now" and "what the next step is".
- README and release notes update only after implementation produces user-visible change.
- After each phase, make an explicit commit; before merge to `beta`, complete server build, client typecheck, and key tests.

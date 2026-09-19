import test from "node:test";
import assert from "node:assert/strict";

import {
  buildTakeoverChapterTarget,
  buildTakeoverGuidance,
  buildTakeoverProgressInspection,
  formatTakeoverStartError,
  resolveRecommendedTakeoverEntryStep,
} from "./novelExistingProjectTakeoverViewModel.ts";

function buildReadiness(overrides = {}) {
  return {
    novelId: "novel-1",
    novelTitle: "Test novel",
    hasActiveTask: false,
    activeTaskId: null,
    snapshot: {
      hasStoryMacroPlan: true,
      hasBookContract: true,
      characterCount: 3,
      chapterCount: 0,
      volumeCount: 0,
      firstVolumeChapterCount: 0,
    },
    stages: [],
    entrySteps: [
      {
        step: "story_macro",
        label: "Story planning",
        description: "Complete book-level planning",
        available: true,
        recommended: false,
        status: "complete",
        reason: "Book planning is in place",
        previews: [],
      },
      {
        step: "character",
        label: "Character setup",
        description: "Complete character assets",
        available: true,
        recommended: false,
        status: "complete",
        reason: "Character assets are ready",
        previews: [],
      },
      {
        step: "outline",
        label: "Volume strategy",
        description: "Complete volume planning",
        available: true,
        recommended: true,
        status: "missing",
        reason: "You can continue from volume strategy",
        previews: [
          {
            strategy: "continue_existing",
            summary: "AI will keep the existing characters and continue generating the volume strategy and skeleton.",
            effectSummary: "Existing characters will not be rebuilt.",
            effectiveStep: "outline",
            effectiveStage: "outline",
            skipSteps: ["story_macro", "character"],
            continueStep: "outline",
            restartStep: null,
            usesCurrentBatch: false,
            impactNotes: ["Existing assets are kept."],
          },
        ],
      },
    ],
    activePipelineJob: null,
    latestCheckpoint: null,
    executableRange: null,
    ...overrides,
  };
}

test("takeover recommendation chooses the available recommended entry for the current project", () => {
  const step = resolveRecommendedTakeoverEntryStep(buildReadiness(), "book");

  assert.equal(step, "outline");
});

test("takeover guidance explains the recommended continuation and protected assets", () => {
  const guidance = buildTakeoverGuidance(
    buildReadiness(),
    "outline",
    "continue_existing",
    "auto_to_ready",
  );

  assert.match(guidance.diagnosis, /Volume planning/);
  assert.match(guidance.nextStep, /keep the existing characters/i);
  assert.equal(guidance.actionLabel, "Continue to advance until you can start writing");
  assert.ok(guidance.protectionNotes.some((note) => note.includes("3 character assets")));
});

test("takeover guidance prefers an active context task over a new takeover", () => {
  const guidance = buildTakeoverGuidance(
    buildReadiness(),
    "outline",
    "continue_existing",
    "auto_to_ready",
    {
      task: {
        id: "task-1",
        novelId: "novel-1",
        status: "waiting_approval",
        currentStage: "Chapter execution",
        currentItemKey: "chapter_execution",
        currentItemLabel: "Opening the chapter 1 execution panel",
        progress: 0.5,
        checkpointType: null,
        checkpointSummary: null,
        lastError: null,
        pendingManualRecovery: false,
        cancelRequestedAt: null,
      },
      run: null,
      activeStep: null,
      latestCommand: null,
      runtime: null,
      projection: null,
      recentEvents: [],
      artifacts: [],
      factSummary: null,
      chapterProgress: {
        totalChapters: 40,
        draftedChapterCount: 10,
        approvedChapterCount: 5,
        completedChapters: 5,
        needsRepairChapters: 0,
        currentChapterOrder: 11,
        ratio: 0.4,
      },
      displayState: {
        stageKey: "chapter_execution",
        stageLabel: "Chapter execution",
        stepIndex: 5,
        totalSteps: 7,
        mode: "waiting",
        headline: "Waiting for confirmation",
        description: "Waiting for confirmation",
        currentAction: "Chapter execution",
        checkpointLabel: "None yet",
        progressPercent: 50,
        requiresUserAction: false,
        isLiveRunning: false,
        needsRecovery: false,
        steps: [],
      },
      nextActions: ["continue"],
    },
  );

  assert.match(guidance.diagnosis, /Chapter execution/);
  assert.match(guidance.nextStep, /chapter 11/);
  assert.equal(guidance.actionLabel, "Enter current task");
});

test("takeover progress inspection summarizes volume, outline detail, drafting, and quality assets", () => {
  const inspection = buildTakeoverProgressInspection(buildReadiness({
    snapshot: {
      hasStoryMacroPlan: true,
      hasBookContract: true,
      characterCount: 5,
      chapterCount: 40,
      volumeCount: 2,
      hasVolumeStrategyPlan: true,
      firstVolumeChapterCount: 40,
      volumeChapterRanges: [{ volumeOrder: 1, startOrder: 1, endOrder: 40 }],
      firstVolumePreparedChapterCount: 10,
      generatedChapterCount: 10,
      approvedChapterCount: 5,
      pendingRepairChapterCount: 5,
    },
    executableRange: {
      startOrder: 1,
      endOrder: 10,
      totalChapterCount: 10,
      nextChapterOrder: 11,
    },
  }));

  assert.equal(inspection.cards.length, 4);
  assert.match(inspection.cards[0].detail, /2 volumes/);
  assert.match(inspection.cards[1].detail, /1-10/);
  assert.match(inspection.cards[2].status, /10/);
  assert.match(inspection.cards[3].detail, /chapter 11/);
});

test("takeover chapter target starts after already written chapters", () => {
  const target = buildTakeoverChapterTarget(buildReadiness({
    snapshot: {
      hasStoryMacroPlan: true,
      hasBookContract: true,
      characterCount: 5,
      chapterCount: 40,
      volumeCount: 1,
      firstVolumeChapterCount: 40,
      generatedChapterCount: 10,
      approvedChapterCount: 5,
    },
  }), {
    task: null,
    run: null,
    activeStep: null,
    latestCommand: null,
    runtime: null,
    projection: null,
    recentEvents: [],
    artifacts: [],
    factSummary: null,
    chapterProgress: {
      totalChapters: 40,
      draftedChapterCount: 10,
      approvedChapterCount: 5,
      completedChapters: 5,
      needsRepairChapters: 0,
      currentChapterOrder: 2,
      ratio: 0.4,
    },
    displayState: {
      stageKey: "chapter_execution",
      stageLabel: "Chapter execution",
      stepIndex: 5,
      totalSteps: 7,
      mode: "waiting",
      headline: "Waiting for confirmation",
      description: "Waiting for confirmation",
      currentAction: "Chapter execution",
      checkpointLabel: "None yet",
      progressPercent: 50,
      requiresUserAction: false,
      isLiveRunning: false,
      needsRecovery: false,
      steps: [],
    },
    nextActions: ["continue"],
  });

  assert.equal(target?.startOrder, 11);
  assert.equal(target?.maxOrder, 40);
  assert.equal(target?.selectedOrder, 11);
  assert.equal(target?.plan.mode, "chapter_range");
  assert.equal(target?.plan.startOrder, 11);
  assert.equal(target?.plan.endOrder, 11);
  assert.equal(target?.actionLabel, "Advance to chapter 11");
});

test("takeover chapter target builds a chapter range when the user chooses a later chapter", () => {
  const target = buildTakeoverChapterTarget(buildReadiness({
    snapshot: {
      hasStoryMacroPlan: true,
      hasBookContract: true,
      characterCount: 5,
      chapterCount: 40,
      volumeCount: 1,
      firstVolumeChapterCount: 40,
      generatedChapterCount: 10,
      approvedChapterCount: 5,
    },
    executableRange: {
      startOrder: 1,
      endOrder: 40,
      totalChapterCount: 40,
      nextChapterOrder: 11,
    },
  }), null, 15);

  assert.equal(target?.startOrder, 11);
  assert.equal(target?.maxOrder, 40);
  assert.equal(target?.selectedOrder, 15);
  assert.equal(target?.plan.startOrder, 11);
  assert.equal(target?.plan.endOrder, 15);
  assert.match(target?.summary ?? "", /chapter 11/);
});

test("takeover chapter target clamps input to unwritten chapter range", () => {
  const target = buildTakeoverChapterTarget(buildReadiness({
    snapshot: {
      hasStoryMacroPlan: true,
      hasBookContract: true,
      characterCount: 5,
      chapterCount: 40,
      volumeCount: 1,
      firstVolumeChapterCount: 40,
      generatedChapterCount: 10,
      approvedChapterCount: 5,
    },
  }), null, 8);

  assert.equal(target?.startOrder, 11);
  assert.equal(target?.selectedOrder, 11);
  assert.equal(target?.plan.startOrder, 11);
  assert.equal(target?.plan.endOrder, 11);
});

test("takeover start errors are translated into a recoverable user action", () => {
  const message = formatTakeoverStartError(new Error("A chapter range can only start from beats/chapters, chapter execution, or quality repair."));

  assert.match(message, /cannot continue from a chapter range/i);
  assert.match(message, /recommended place/i);
});

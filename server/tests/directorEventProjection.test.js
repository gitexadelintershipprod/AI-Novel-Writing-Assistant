const test = require("node:test");
const assert = require("node:assert/strict");

const {
  DirectorEventProjectionService,
} = require("../dist/services/novel/director/runtime/DirectorEventProjectionService.js");

function buildSnapshot(overrides = {}) {
  return {
    schemaVersion: 1,
    runId: "task-1",
    novelId: "novel-1",
    entrypoint: "confirm",
    policy: {
      mode: "run_until_gate",
      mayOverwriteUserContent: false,
      allowExpensiveReview: false,
      modelTier: "balanced",
      updatedAt: "2026-04-28T00:00:00.000Z",
    },
    steps: [],
    events: [],
    artifacts: [],
    updatedAt: "2026-04-28T00:00:00.000Z",
    ...overrides,
  };
}

test("director event projection marks approval gates as user action", () => {
  const service = new DirectorEventProjectionService();
  const projection = service.buildSnapshotProjection(buildSnapshot({
    steps: [{
      idempotencyKey: "task-1:chapter_execution_node:novel:novel-1",
      nodeKey: "chapter_execution_node",
      label: "Run the chapter generation batch",
      status: "waiting_approval",
      targetType: "novel",
      targetId: "novel-1",
      startedAt: "2026-04-28T00:00:01.000Z",
      policyDecision: {
        canRun: false,
        requiresApproval: true,
        reason: "当前策略需要确认后继续。",
        mayOverwriteUserContent: false,
        affectedArtifacts: [],
      },
    }],
    events: [{
      eventId: "event-1",
      type: "approval_required",
      taskId: "task-1",
      novelId: "novel-1",
      nodeKey: "chapter_execution_node",
      summary: "Chapter execution等待确认。",
      occurredAt: "2026-04-28T00:00:02.000Z",
    }],
  }));

  assert.equal(projection.status, "waiting_approval");
  assert.equal(projection.requiresUserAction, true);
  assert.equal(projection.currentNodeKey, "chapter_execution_node");
  assert.equal(projection.headline, "Waiting for confirmation: Run the chapter generation batch");
  assert.equal(projection.detail, "当前策略需要确认后继续。");
  assert.equal(projection.blockedReason, "当前策略需要确认后继续。");
  assert.equal(projection.blockingReason, "当前策略需要确认后继续。");
  assert.equal(projection.recoveryDecision, "auto_resume_from_checkpoint");
  assert.equal(projection.isAutopilotRecoverable, false);
  assert.equal(projection.recentEvents.length, 1);
});

test("director event projection keeps latest event first", () => {
  const service = new DirectorEventProjectionService();
  const projection = service.buildSnapshotProjection(buildSnapshot({
    steps: [{
      idempotencyKey: "task-1:story_macro_phase:novel:novel-1",
      nodeKey: "story_macro_phase",
      label: "生成书级规划资产",
      status: "succeeded",
      targetType: "novel",
      targetId: "novel-1",
      startedAt: "2026-04-28T00:00:01.000Z",
      finishedAt: "2026-04-28T00:00:03.000Z",
    }],
    events: [
      {
        eventId: "event-old",
        type: "node_started",
        summary: "开始生成书级规划资产。",
        occurredAt: "2026-04-28T00:00:01.000Z",
      },
      {
        eventId: "event-new",
        type: "node_completed",
        summary: "书级规划资产已准备好。",
        occurredAt: "2026-04-28T00:00:03.000Z",
      },
    ],
  }), {
    factSummary: {
      allStepsCompleted: true,
      completedStepCount: 1,
      totalStepCount: 1,
      currentFactStepId: null,
      currentFactStepLabel: null,
      currentFactEvidence: null,
      hasNovelProject: true,
      hasStoryMacro: true,
      hasBookContract: true,
      characterCount: 1,
      hasVolumeStrategy: true,
      volumeCount: 1,
      outlineFacts: {
        beatSheetReady: true,
        chapterListReady: true,
        chapterDetailReady: true,
        plannedChapterCount: 1,
        selectedChapterCount: 1,
        completedDetailSteps: 1,
        totalDetailSteps: 1,
        syncedChapterCount: 1,
      },
      chapterExecutionFacts: {
        totalChapters: 1,
        draftedChapterCount: 1,
        reviewedChapterCount: 1,
        approvedChapterCount: 1,
        committedChapterCount: 1,
        completedChapters: 1,
        needsRepairChapters: 0,
        ratio: 1,
        expectedChapterCount: 1,
      },
      repairFacts: {
        draftedChapterCount: 1,
        reviewedChapterCount: 1,
        committedChapterCount: 1,
        needsRepairChapters: 0,
        payoffArtifactCount: 1,
        characterResourceArtifactCount: 1,
      },
      steps: [{
        stepId: "story.macro.plan",
        label: "鐢熸垚涔︾骇瑙勫垝璧勪骇",
        stage: "story_macro",
        completed: true,
        completenessRatio: 1,
        evidence: { artifactType: "story_macro" },
        nextAction: null,
      }],
    },
  });

  assert.equal(projection.status, "completed");
  assert.equal(projection.requiresUserAction, false);
  assert.equal(projection.headline, "Step complete: 生成书级规划资产");
  assert.equal(projection.lastEventSummary, "书级规划资产已准备好。");
  assert.equal(projection.recentEvents[0].eventId, "event-new");
});

test("director event projection exposes deferred quality debt", () => {
  const service = new DirectorEventProjectionService();
  const projection = service.buildSnapshotProjection(buildSnapshot({
    policy: {
      mode: "auto_safe_scope",
      mayOverwriteUserContent: false,
      allowExpensiveReview: false,
      modelTier: "balanced",
      updatedAt: "2026-04-28T00:00:00.000Z",
    },
    steps: [{
      idempotencyKey: "task-1:chapter_execution_node:novel:novel-1",
      nodeKey: "chapter_execution_node",
      label: "Continue chapter generation",
      status: "running",
      targetType: "novel",
      targetId: "novel-1",
      startedAt: "2026-04-28T00:00:01.000Z",
    }],
    events: [{
      eventId: "event-quality-debt",
      type: "continue_with_risk",
      taskId: "task-1",
      novelId: "novel-1",
      nodeKey: "planner.replan",
      summary: "Full-book mode stored a repeated replan issue and continued later chapters.",
      affectedScope: "chapter_order:6",
      severity: "medium",
      metadata: { chapterOrder: 6 },
      occurredAt: "2026-04-28T00:00:02.000Z",
    }],
  }));

  assert.equal(projection.recoveryDecision, "defer_and_continue");
  assert.equal(projection.isAutopilotRecoverable, true);
  assert.deepEqual(projection.qualityDebtSummary, {
    deferredChapterCount: 1,
    deferredChapterOrders: [6],
    latestReason: "Full-book mode stored a repeated replan issue and continued later chapters.",
  });
  assert.ok(projection.visibleRiskBadges.some((badge) => badge.label === "Quality debt stored"));
});

test("director event projection exposes quality budget summary", () => {
  const service = new DirectorEventProjectionService();
  const projection = service.buildSnapshotProjection(buildSnapshot({
    steps: [{
      idempotencyKey: "task-1:chapter_repair_node:chapter:chapter-6",
      nodeKey: "chapter_repair_node",
      label: "Repairing第 6 章",
      status: "running",
      targetType: "chapter",
      targetId: "chapter-6",
      startedAt: "2026-04-28T00:00:01.000Z",
    }],
    events: [{
      eventId: "event-budget",
      type: "repair_ticket_created",
      taskId: "task-1",
      novelId: "novel-1",
      nodeKey: "chapter_repair_node",
      summary: "第 6 章同类质量问题再次出现。",
      affectedScope: "chapter:chapter-6",
      severity: "medium",
      metadata: {
        chapterOrder: 6,
        qualityBudgetNextAction: "auto_replan_window",
        qualityBudgetEntry: {
          signatureKey: "sig-1",
          issueSignature: "quality_loop|medium|repair|章节衔接问题",
          blockingLedgerKeys: ["continuity_state"],
          affectedChapterWindow: {
            startOrder: 6,
            endOrder: 8,
            chapterOrders: [6, 7, 8],
            chapterIds: [],
          },
          patchRepairCount: 1,
          chapterRewriteCount: 1,
          windowReplanCount: 0,
          deferredCount: 0,
          lastAction: "chapter_rewrite",
          lastReason: "章节衔接问题仍存在",
          lastChapterId: "chapter-6",
          lastChapterOrder: 6,
          updatedAt: "2026-04-28T00:00:02.000Z",
        },
      },
      occurredAt: "2026-04-28T00:00:02.000Z",
    }],
  }));

  assert.deepEqual(projection.qualityBudgetSummary, {
    currentChapterId: "chapter-6",
    currentChapterOrder: 6,
    latestSignatureKey: "sig-1",
    latestIssueSignature: "quality_loop|medium|repair|章节衔接问题",
    latestReason: "章节衔接问题仍存在",
    patchRepairUsed: 1,
    chapterRewriteUsed: 1,
    windowReplanUsed: 0,
    deferredCount: 0,
    nextAction: "auto_replan_window",
    nextActionLabel: "Replan the affected chapters",
    explanation: "Quality budget: local repair 1/1, full-chapter rewrite 1/1, window replan 0/1; the next step for the same issue is Replan the affected chapters.",
  });
});

test("director event projection summarizes workspace progress and next action", () => {
  const service = new DirectorEventProjectionService();
  const projection = service.buildSnapshotProjection(buildSnapshot({
    steps: [{
      idempotencyKey: "task-1:workspace_analyze:novel:novel-1",
      nodeKey: "workspace_analyze",
      label: "分析小说资产",
      status: "running",
      targetType: "novel",
      targetId: "novel-1",
      startedAt: "2026-04-28T00:00:01.000Z",
    }],
    events: [{
      eventId: "event-workspace",
      type: "workspace_analyzed",
      summary: "工作区分析完成。",
      occurredAt: "2026-04-28T00:00:02.000Z",
    }],
    artifacts: [
      {
        id: "chapter_draft:chapter:chapter-1:Chapter:chapter-1",
        novelId: "novel-1",
        artifactType: "chapter_draft",
        targetType: "chapter",
        targetId: "chapter-1",
        version: 1,
        status: "active",
        source: "user_edited",
        contentRef: { table: "Chapter", id: "chapter-1" },
        contentHash: "hash-1",
        schemaVersion: "legacy-wrapper-v1",
        protectedUserContent: true,
      },
      {
        id: "audit_report:chapter:chapter-1:AuditReport:audit-1",
        novelId: "novel-1",
        artifactType: "audit_report",
        targetType: "chapter",
        targetId: "chapter-1",
        version: 1,
        status: "stale",
        source: "backfilled",
        contentRef: { table: "AuditReport", id: "audit-1" },
        schemaVersion: "legacy-wrapper-v1",
      },
    ],
    lastWorkspaceAnalysis: {
      novelId: "novel-1",
      inventory: {
        novelId: "novel-1",
        novelTitle: "测试小说",
        hasBookContract: true,
        hasStoryMacro: true,
        hasCharacters: true,
        hasVolumeStrategy: true,
        hasChapterPlan: true,
        chapterCount: 12,
        draftedChapterCount: 4,
        approvedChapterCount: 2,
        pendingRepairChapterCount: 1,
        hasActivePipelineJob: false,
        hasActiveDirectorRun: true,
        hasWorldBinding: true,
        hasSourceKnowledge: false,
        hasContinuationAnalysis: false,
        latestDirectorTaskId: "task-1",
        activeDirectorTaskId: "task-1",
        activePipelineJobId: null,
        missingArtifactTypes: ["rolling_window_review"],
        staleArtifacts: [{
          id: "audit_report:chapter:chapter-1:AuditReport:audit-1",
          novelId: "novel-1",
          artifactType: "audit_report",
          targetType: "chapter",
          targetId: "chapter-1",
          version: 1,
          status: "stale",
          source: "backfilled",
          contentRef: { table: "AuditReport", id: "audit-1" },
          schemaVersion: "legacy-wrapper-v1",
        }],
        protectedUserContentArtifacts: [{
          id: "chapter_draft:chapter:chapter-1:Chapter:chapter-1",
          novelId: "novel-1",
          artifactType: "chapter_draft",
          targetType: "chapter",
          targetId: "chapter-1",
          version: 1,
          status: "active",
          source: "user_edited",
          contentRef: { table: "Chapter", id: "chapter-1" },
          schemaVersion: "legacy-wrapper-v1",
          protectedUserContent: true,
        }],
        needsRepairArtifacts: [{
          id: "repair_ticket:chapter:chapter-1:Chapter:chapter-1",
          novelId: "novel-1",
          artifactType: "repair_ticket",
          targetType: "chapter",
          targetId: "chapter-1",
          version: 1,
          status: "active",
          source: "backfilled",
          contentRef: { table: "Chapter", id: "chapter-1" },
          schemaVersion: "legacy-wrapper-v1",
        }],
        artifacts: [],
      },
      interpretation: null,
      manualEditImpact: null,
      recommendation: {
        action: "review_recent_chapters",
        reason: "先复查近期章节。",
        affectedScope: "chapter:chapter-1",
        riskLevel: "medium",
      },
      confidence: 0.8,
      evidenceRefs: ["workspace_inventory"],
      generatedAt: "2026-04-28T00:00:02.000Z",
      prompt: null,
    },
  }));

  assert.equal(projection.status, "running");
  assert.equal(projection.headline, "Advancing task: 分析小说资产");
  assert.equal(projection.detail, "Recent developments: 工作区分析完成。");
  assert.equal(projection.nextActionLabel, "Review recent chapters");
  assert.equal(projection.recommendedAction.action, "review_recent_chapters");
  assert.equal(projection.scopeSummary, "Workspace: 12 chapters, 4 chapters with draft text, 1 chapters waiting for repair, 1 artifact types still missing.");
  assert.equal(projection.progressSummary, "Progress: 0/1 steps complete, 2 product records, 1 user-protected items, 1 artifacts need confirmation, 1 repair tasks.");
  assert.equal(projection.recoveryDecision, "auto_repair_chapter");
  assert.equal(projection.progressBreakdown.planningPercent, 100);
  assert.equal(projection.progressBreakdown.chapterExecutionPercent, 25);
  assert.equal(projection.progressBreakdown.qualityRepairPercent, 75);
  assert.equal(projection.progressBreakdown.totalPercent, 59);
  assert.equal(projection.progressBreakdown.planningProgress, 100);
  assert.equal(projection.progressBreakdown.chapterProgress, 25);
  assert.equal(projection.progressBreakdown.qualityProgress, 75);
  assert.equal(projection.progressBreakdown.activeJobProgress, 1);
  assert.equal(projection.progressBreakdown.continuableChapters, 3);
  assert.deepEqual(
    projection.visibleRiskBadges.map((badge) => badge.label),
    ["protected text", "1 chapters waiting for repair", "1 items need review", "Missing planning resources"],
  );
});

test("director event projection keeps heartbeat as latest running progress", () => {
  const service = new DirectorEventProjectionService();
  const projection = service.buildSnapshotProjection(buildSnapshot({
    steps: [{
      idempotencyKey: "task-1:volume_strategy.volume_generation:volume:volume-1",
      nodeKey: "volume_strategy.volume_generation",
      label: "Generating the volume strategy（已等待 30s）",
      status: "running",
      targetType: "volume",
      targetId: "volume-1",
      startedAt: "2026-04-28T00:00:01.000Z",
    }],
    events: [
      {
        eventId: "event-start",
        type: "node_started",
        nodeKey: "volume_strategy.volume_generation",
        summary: "Generating the volume strategy",
        occurredAt: "2026-04-28T00:00:01.000Z",
      },
      {
        eventId: "event-heartbeat",
        type: "node_heartbeat",
        nodeKey: "volume_strategy.volume_generation",
        summary: "Generating the volume strategy（已等待 30s）",
        occurredAt: "2026-04-28T00:00:31.000Z",
      },
    ],
  }));

  assert.equal(projection.status, "running");
  assert.equal(projection.headline, "Advancing task: Generating the volume strategy（已等待 30s）");
  assert.equal(projection.detail, "Recent developments: Generating the volume strategy（已等待 30s）");
  assert.equal(projection.recentEvents[0].type, "node_heartbeat");
});

test("director event projection exposes governed issue records", () => {
  const service = new DirectorEventProjectionService();
  const occurrence = {
    schemaVersion: 1,
    issueCode: "quality.chapter_below_threshold",
    stage: "chapter_review",
    summary: "第 3 章质量分未达标。",
    chapterId: "chapter-3",
    chapterOrder: 3,
    riskScore: 6,
    attempt: 1,
    maxAttempts: 1,
    hasUsableOutput: true,
    runMode: "full_book_autopilot",
    fingerprint: "job-1:quality.chapter_below_threshold:chapter-3:1",
    occurredAt: "2026-08-10T00:00:00.000Z",
  };
  const decision = {
    issueCode: occurrence.issueCode,
    action: "continue_with_warning",
    reason: "保留正文并继续。",
    locked: true,
    policySource: "safety",
    retryExhaustedAction: "continue_with_warning",
  };
  const projection = service.buildSnapshotProjection(buildSnapshot({
    events: [{
      eventId: "issue-action-1",
      type: "issue_action_applied",
      taskId: "task-1",
      novelId: "novel-1",
      nodeKey: "chapter_review",
      summary: "Chapter quality score is below the bar已执行：continue_with_warning",
      occurredAt: occurrence.occurredAt,
      metadata: { schemaVersion: 1, occurrence, decision },
    }],
  }));

  assert.equal(projection.recentIssues.length, 1);
  assert.equal(projection.recentIssues[0].occurrence.chapterOrder, 3);
  assert.equal(projection.recentIssues[0].decision.action, "continue_with_warning");
  assert.equal(projection.recentEvents[0].issue.issueCode, occurrence.issueCode);
});

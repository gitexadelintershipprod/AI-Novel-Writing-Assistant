const test = require("node:test");
const assert = require("node:assert/strict");

const { prisma } = require("../dist/db/prisma.js");
const {
  DirectorBookAutomationProjectionService,
} = require("../dist/services/novel/director/projections/DirectorBookAutomationProjectionService.js");
const {
  directorArtifactLedgerQueryService,
} = require("../dist/services/novel/director/runtime/DirectorArtifactLedgerQueryService.js");
const {
  directorUsageTelemetryQueryService,
} = require("../dist/services/novel/director/runtime/DirectorUsageTelemetryQueryService.js");

function createHarness(overrides = {}) {
  const latestTask = {
    id: "task-1",
    title: "Auto-Director",
    status: "running",
    progress: 40,
    currentStage: "structured_outline",
    currentItemKey: "chapter_list",
    currentItemLabel: "Generate chapter task sheets",
    checkpointType: "chapter_batch_ready",
    checkpointSummary: "Chapter task sheet准备中。",
    pendingManualRecovery: false,
    lastError: null,
    seedPayloadJson: JSON.stringify({
      runMode: "full_book_autopilot",
    }),
    updatedAt: new Date("2026-04-30T09:00:00.000Z"),
    ...overrides.latestTask,
  };
  const latestRun = {
    id: "run-1",
    taskId: "task-1",
    policyJson: JSON.stringify({ mode: "auto_safe_scope" }),
    updatedAt: new Date("2026-04-30T09:00:01.000Z"),
    ...overrides.latestRun,
  };
  const commands = overrides.commands ?? [
    {
      id: "command-1",
      taskId: "task-1",
      novelId: "novel-1",
      commandType: "continue",
      status: "running",
      errorMessage: null,
      leaseOwner: "worker-1",
      leaseExpiresAt: new Date("2099-04-30T09:02:00.000Z"),
      runAfter: new Date("2026-04-30T08:59:00.000Z"),
      createdAt: new Date("2026-04-30T08:59:00.000Z"),
      updatedAt: new Date("2026-04-30T09:00:02.000Z"),
      startedAt: new Date("2026-04-30T08:59:30.000Z"),
      finishedAt: null,
    },
  ];
  const events = overrides.events ?? [
    {
      id: "event-1",
      runId: "run-1",
      taskId: "task-1",
      novelId: "novel-1",
      type: "node_heartbeat",
      nodeKey: "structured_outline.chapter_list",
      artifactType: null,
      summary: "正在Generate chapter task sheets。",
      affectedScope: "novel:novel-1",
      severity: "low",
      occurredAt: new Date("2026-04-30T09:00:03.000Z"),
    },
  ];
  const steps = overrides.steps ?? [
    {
      idempotencyKey: "task-1:structured_outline.chapter_list:novel:novel-1",
      runId: "run-1",
      taskId: "task-1",
      novelId: "novel-1",
      nodeKey: "structured_outline.chapter_list",
      label: "Generate chapter task sheets",
      status: "running",
      error: null,
      startedAt: new Date("2026-04-30T08:59:00.000Z"),
      finishedAt: null,
      updatedAt: new Date("2026-04-30T09:00:02.000Z"),
    },
  ];
  const approvals = overrides.approvals ?? [
    {
      id: "approval-1",
      taskId: "task-1",
      approvalPointLabel: "Chapter execution继续",
      checkpointSummary: "AI 自动Continue chapter generation。",
      summary: "AI 自动确认Chapter execution继续。",
      stage: "chapter_execution",
      scopeLabel: "全书",
      createdAt: new Date("2026-04-30T08:58:00.000Z"),
    },
  ];
  const counts = {
    active: 5,
    stale: 1,
    protected: 2,
    repair: 1,
    ...overrides.counts,
  };
  const artifactSummary = overrides.artifactSummary ?? {
    activeCount: counts.active,
    staleCount: counts.stale,
    protectedUserContentCount: counts.protected,
    repairTicketCount: counts.repair,
  };
  const usageTelemetry = overrides.usageTelemetry ?? {
    summary: null,
    recentUsage: [],
    stepUsage: [],
  };
  const originals = {
    novelFindUnique: prisma.novel.findUnique,
    taskFindFirst: prisma.novelWorkflowTask.findFirst,
    runFindFirst: prisma.directorRun.findFirst,
    commandFindMany: prisma.directorRunCommand.findMany,
    eventFindMany: prisma.directorEvent.findMany,
    stepFindMany: prisma.directorStepRun.findMany,
    approvalFindMany: prisma.autoDirectorAutoApprovalRecord.findMany,
    artifactGetBookSummary: directorArtifactLedgerQueryService.getBookSummary,
    usageGetBookUsage: directorUsageTelemetryQueryService.getBookUsage,
  };

  prisma.novel.findUnique = async ({ where }) => {
    assert.equal(where.id, "novel-1");
    return overrides.novel ?? {
      id: "novel-1",
      title: "测试小说",
    };
  };
  prisma.novelWorkflowTask.findFirst = async ({ where }) => {
    assert.equal(where.novelId, "novel-1");
    assert.equal(where.lane, "auto_director");
    return latestTask;
  };
  prisma.directorRun.findFirst = async ({ where }) => {
    assert.equal(where.novelId, "novel-1");
    return latestRun;
  };
  prisma.directorRunCommand.findMany = async ({ where }) => {
    assert.deepEqual(where.OR, [
      { novelId: "novel-1" },
      { taskId: { in: ["task-1"] } },
    ]);
    return commands;
  };
  prisma.directorEvent.findMany = async () => events;
  prisma.directorStepRun.findMany = async () => steps;
  prisma.autoDirectorAutoApprovalRecord.findMany = async ({ where }) => {
    assert.equal(where.novelId, "novel-1");
    return approvals;
  };
  directorArtifactLedgerQueryService.getBookSummary = async (novelId) => {
    assert.equal(novelId, "novel-1");
    return artifactSummary;
  };
  directorUsageTelemetryQueryService.getBookUsage = async (input) => {
    assert.equal(input.novelId, "novel-1");
    assert.deepEqual(input.taskIds, ["task-1"]);
    return usageTelemetry;
  };

  return {
    service: new DirectorBookAutomationProjectionService(async () => (
      Object.prototype.hasOwnProperty.call(overrides, "runtimeProjection")
        ? overrides.runtimeProjection
        : {
      runId: "run-1",
      novelId: "novel-1",
      status: "running",
      currentNodeKey: "structured_outline.chapter_list",
      currentLabel: "Generate chapter task sheets",
      headline: "推进任务：Generate chapter task sheets",
      detail: "最近进展：正在Generate chapter task sheets。",
      lastEventSummary: "正在Generate chapter task sheets。",
      requiresUserAction: false,
      blockedReason: null,
      nextActionLabel: "Continue chapter generation",
      progressSummary: "进展：3/8 个步骤完成，5 个产物记录。",
      policyMode: "auto_safe_scope",
      updatedAt: "2026-04-30T09:00:03.000Z",
      recentEvents: [],
        }
    )),
    restore() {
      prisma.novel.findUnique = originals.novelFindUnique;
      prisma.novelWorkflowTask.findFirst = originals.taskFindFirst;
      prisma.directorRun.findFirst = originals.runFindFirst;
      prisma.directorRunCommand.findMany = originals.commandFindMany;
      prisma.directorEvent.findMany = originals.eventFindMany;
      prisma.directorStepRun.findMany = originals.stepFindMany;
      prisma.autoDirectorAutoApprovalRecord.findMany = originals.approvalFindMany;
      directorArtifactLedgerQueryService.getBookSummary = originals.artifactGetBookSummary;
      directorUsageTelemetryQueryService.getBookUsage = originals.usageGetBookUsage;
    },
  };
}

test("book automation projection aggregates task, command, event, approval and artifact state by novel", async () => {
  const harness = createHarness();
  try {
    const projection = await harness.service.getProjection("novel-1");

    assert.equal(projection.novelId, "novel-1");
    assert.equal(projection.focusNovel.title, "测试小说");
    assert.equal(projection.displayState, "processing");
    assert.equal(projection.userHeadline, "AI is processing: Generate chapter task sheets");
    assert.equal(projection.latestTask.id, "task-1");
    assert.equal(projection.latestRunId, "run-1");
    assert.equal(projection.status, "running");
    assert.equal(projection.dashboardView.mode, "running");
    assert.equal(projection.dashboardView.progressSource, "task_live");
    assert.equal(projection.runMode, "full_book_autopilot");
    assert.equal(projection.policyMode, "auto_safe_scope");
    assert.equal(projection.headline, "推进任务：Generate chapter task sheets");
    assert.equal(projection.activeCommandCount, 1);
    assert.equal(projection.pendingCommandCount, 0);
    assert.equal(projection.workerHealth.derivedState, "running_step");
    assert.equal(projection.workerHealth.currentWorkerId, "worker-1");
    assert.equal(projection.autoApprovalRecordCount, 1);
    assert.deepEqual(projection.artifactSummary, {
      activeCount: 5,
      staleCount: 1,
      protectedUserContentCount: 2,
      repairTicketCount: 1,
    });
    assert.equal(projection.primaryAction.label, "View advancement status");
    assert.equal(projection.primaryAction.target.href, "/novels/novel-1/edit?directorTaskId=task-1");
    assert.equal(projection.secondaryActions[0].target.href, "/novels/novel-1/edit?directorTaskId=task-1&taskPanel=1");
    assert.equal(projection.timeline[0].id, "event:event-1");
    assert.ok(projection.timeline.some((item) => item.id === "command:command-1"));
    assert.ok(projection.timeline.some((item) => item.id === "approval:approval-1"));
  } finally {
    harness.restore();
  }
});

test("book automation projection exposes production experience handoff as the primary action", async () => {
  const harness = createHarness({
    latestTask: {
      status: "waiting_approval",
      progress: 90,
      currentStage: "chapter_execution",
      currentItemKey: "production_experience_required",
      currentItemLabel: "The project is ready to write. Waiting for you to choose a production mode",
      checkpointType: "production_experience_required",
      checkpointSummary: "前期准备完成，请选择正文生产方式。",
      seedPayloadJson: JSON.stringify({ runMode: "auto_to_ready" }),
    },
    commands: [],
    events: [],
    steps: [],
    approvals: [],
    runtimeProjection: null,
  });
  try {
    const projection = await harness.service.getProjection("novel-1");
    assert.equal(projection.status, "waiting_approval");
    assert.equal(projection.primaryAction.label, "Choose a writing method");
    assert.equal(projection.primaryAction.target.href, "/novels/novel-1/edit?directorTaskId=task-1");
  } finally {
    harness.restore();
  }
});

test("book automation projection exposes replan-and-continue for professional recovery surfaces", async () => {
  for (const status of ["waiting_approval", "failed"]) {
    const harness = createHarness({
      latestTask: {
        status,
        checkpointType: "replan_required",
        checkpointSummary: "当前章节与相邻章节安排需要调整。",
        lastError: status === "failed" ? "当前章节与相邻章节安排需要调整。" : null,
      },
      commands: [],
      events: [],
      steps: [],
      approvals: [],
      runtimeProjection: null,
    });
    try {
      const projection = await harness.service.getProjection("novel-1");
      assert.equal(projection.primaryAction.type, "auto_execute_range");
      assert.equal(projection.primaryAction.label, "Continue after re-planning");
      assert.equal(projection.primaryAction.commandPayload.continuationMode, "auto_execute_range");
    } finally {
      harness.restore();
    }
  }
});

test("book automation projection prefers runtime chapter label over generic task label", async () => {
  const harness = createHarness({
    latestTask: {
      currentStage: "chapter_execution",
      currentItemKey: "chapter_execution",
      currentItemLabel: "Run the chapter generation batch",
    },
    runtimeProjection: {
      runId: "run-1",
      novelId: "novel-1",
      status: "running",
      currentNodeKey: "chapter_execution",
      currentLabel: "正在自动Reviewing第 1-10 章 · 第8章 · 牵笼回声 · 批次 1/1",
      headline: "推进任务：Chapter execution",
      detail: "后台正在Reviewing章节。",
      lastEventSummary: "正在自动Reviewing第 8 章。",
      requiresUserAction: false,
      blockedReason: null,
      nextActionLabel: "继续Chapter execution",
      progressSummary: "Chapter execution中。",
      policyMode: "auto_safe_scope",
      updatedAt: "2026-04-30T09:00:03.000Z",
      recentEvents: [],
    },
  });
  try {
    const projection = await harness.service.getProjection("novel-1");

    assert.equal(projection.currentLabel, "正在自动Reviewing第 1-10 章 · 第8章 · 牵笼回声 · 批次 1/1");
    assert.notEqual(projection.currentLabel, "Run the chapter generation batch");
  } finally {
    harness.restore();
  }
});

test("book automation projection explains queued commands waiting for a worker", async () => {
  const harness = createHarness({
    runtimeProjection: null,
    latestTask: {
      pendingManualRecovery: true,
      lastError: "后台执行中断，点击恢复后继续。",
    },
    commands: [
      {
        id: "command-queued",
        taskId: "task-1",
        novelId: "novel-1",
        commandType: "continue",
        status: "queued",
        errorMessage: null,
        leaseOwner: null,
        leaseExpiresAt: null,
        runAfter: new Date("2026-04-30T08:59:00.000Z"),
        createdAt: new Date("2026-04-30T08:58:00.000Z"),
        updatedAt: new Date("2026-04-30T08:59:00.000Z"),
        startedAt: null,
        finishedAt: null,
      },
    ],
  });
  try {
    const projection = await harness.service.getProjection("novel-1");

    assert.equal(projection.status, "queued");
    assert.equal(projection.dashboardView.mode, "queued");
    assert.equal(projection.displayState, "processing");
    assert.equal(projection.requiresUserAction, false);
    assert.equal(projection.pendingCommandCount, 1);
    assert.equal(projection.activeCommandCount, 0);
    assert.equal(projection.workerHealth.derivedState, "queued_waiting_worker");
    assert.equal(projection.workerHealth.queuedCommandCount, 1);
    assert.match(projection.detail, /waiting for a runner to take over/i);
    assert.match(projection.currentLabel, /waiting for a runner to take over/i);
    assert.match(projection.automationSummary, /waiting for a runner to take over/i);
  } finally {
    harness.restore();
  }
});

test("book automation projection treats manual recovery as a book-level user action", async () => {
  const harness = createHarness({
    latestTask: {
      status: "running",
      pendingManualRecovery: true,
      lastError: "后台执行中断，点击恢复后继续。",
    },
    commands: [],
    runtimeProjection: {
      runId: "run-1",
      novelId: "novel-1",
      status: "running",
      headline: "推进任务：Generate chapter task sheets",
      detail: "最近进展：正在Generate chapter task sheets。",
      requiresUserAction: false,
      blockedReason: null,
      policyMode: "auto_safe_scope",
      updatedAt: "2026-04-30T09:00:03.000Z",
      recentEvents: [],
    },
  });
  try {
    const projection = await harness.service.getProjection("novel-1");

    assert.equal(projection.status, "waiting_recovery");
    assert.equal(projection.dashboardView.mode, "recovering");
    assert.equal(projection.displayState, "paused");
    assert.equal(projection.requiresUserAction, true);
    assert.equal(projection.blockedReason, "后台执行中断，点击恢复后继续。");
    assert.equal(projection.headline, "Waiting to resume Auto-Director");
    assert.equal(projection.userHeadline, "AI paused at a point you can act on");
    assert.equal(projection.primaryAction.label, "Continue from the progress point");
    assert.equal(projection.primaryAction.commandPayload.continuationMode, "resume");
  } finally {
    harness.restore();
  }
});

test("book automation projection keeps active work ahead of old stale commands", async () => {
  const harness = createHarness({
    runtimeProjection: null,
    commands: [
      {
        id: "command-running",
        taskId: "task-1",
        novelId: "novel-1",
        commandType: "continue",
        status: "running",
        errorMessage: null,
        leaseOwner: "worker-1",
        leaseExpiresAt: new Date("2099-04-30T09:02:00.000Z"),
        runAfter: new Date("2026-04-30T08:59:00.000Z"),
        createdAt: new Date("2026-04-30T08:59:00.000Z"),
        updatedAt: new Date("2026-04-30T09:00:02.000Z"),
        startedAt: new Date("2026-04-30T08:59:30.000Z"),
        finishedAt: null,
      },
      {
        id: "command-stale",
        taskId: "task-1",
        novelId: "novel-1",
        commandType: "continue",
        status: "stale",
        errorMessage: "lease expired",
        leaseOwner: "worker-old",
        leaseExpiresAt: new Date("2026-04-30T08:00:00.000Z"),
        runAfter: new Date("2026-04-30T07:50:00.000Z"),
        createdAt: new Date("2026-04-30T07:50:00.000Z"),
        updatedAt: new Date("2026-04-30T08:00:02.000Z"),
        startedAt: new Date("2026-04-30T07:59:30.000Z"),
        finishedAt: new Date("2026-04-30T08:00:02.000Z"),
      },
    ],
  });
  try {
    const projection = await harness.service.getProjection("novel-1");

    assert.equal(projection.status, "running");
    assert.equal(projection.workerHealth.derivedState, "running_step");
    assert.equal(projection.workerHealth.runningCommandCount, 1);
    assert.equal(projection.workerHealth.staleCommandCount, 1);
    assert.equal(projection.workerHealth.currentCommandId, "command-running");
  } finally {
    harness.restore();
  }
});

test("book automation projection keeps a running workflow ahead of a completed runtime snapshot", async () => {
  const harness = createHarness({
    commands: [],
    latestTask: {
      status: "running",
      currentStage: "Quality repair",
      currentItemKey: "quality_repair",
      currentItemLabel: "正在自动Repairing第 1-10 章",
      checkpointType: null,
      checkpointSummary: null,
    },
    runtimeProjection: {
      runId: "run-1",
      novelId: "novel-1",
      status: "completed",
      headline: "步骤完成：Generate the chapter list",
      detail: "Book contract artifact already exists and can be reused.",
      requiresUserAction: false,
      blockedReason: null,
      nextActionLabel: "Continue chapter generation",
      policyMode: "run_until_gate",
      updatedAt: "2026-04-30T09:00:03.000Z",
      recentEvents: [],
    },
  });
  try {
    const projection = await harness.service.getProjection("novel-1");

    assert.equal(projection.latestTask.status, "running");
    assert.equal(projection.status, "running");
    assert.equal(projection.displayState, "processing");
    assert.equal(projection.requiresUserAction, false);
    assert.equal(projection.primaryAction.label, "View advancement status");
  } finally {
    harness.restore();
  }
});

test("book automation projection keeps queued retry workflow ahead of old failed runtime snapshot", async () => {
  const harness = createHarness({
    commands: [],
    latestTask: {
      status: "queued",
      currentStage: "Chapter execution",
      currentItemKey: "chapter_execution",
      currentItemLabel: "正在自动执行第 3-10 章",
      checkpointType: null,
      checkpointSummary: null,
      lastError: null,
    },
    runtimeProjection: {
      runId: "run-1",
      novelId: "novel-1",
      status: "failed",
      headline: "处理失败：Run the chapter generation batch",
      detail: "chapter.draft.write did not satisfy its completion criteria.",
      requiresUserAction: true,
      blockedReason: "chapter.draft.write did not satisfy its completion criteria.",
      nextActionLabel: "Continue chapter generation",
      policyMode: "run_until_gate",
      updatedAt: "2026-04-30T09:00:03.000Z",
      recentEvents: [],
    },
  });
  try {
    const projection = await harness.service.getProjection("novel-1");

    assert.equal(projection.latestTask.status, "queued");
    assert.equal(projection.status, "queued");
    assert.equal(projection.dashboardView.mode, "queued");
    assert.equal(projection.displayState, "processing");
    assert.equal(projection.requiresUserAction, false);
    assert.equal(projection.blockedReason, null);
    assert.equal(projection.primaryAction.label, "View advancement status");
  } finally {
    harness.restore();
  }
});

test("book automation projection keeps waiting gates ahead of old stale commands", async () => {
  const harness = createHarness({
    runtimeProjection: null,
    latestTask: {
      status: "waiting_approval",
      currentItemLabel: "waiting gate",
      checkpointSummary: "approval needed",
    },
    commands: [
      {
        id: "command-stale",
        taskId: "task-1",
        novelId: "novel-1",
        commandType: "continue",
        status: "stale",
        errorMessage: "lease expired",
        leaseOwner: "worker-old",
        leaseExpiresAt: new Date("2026-04-30T08:00:00.000Z"),
        runAfter: new Date("2026-04-30T07:50:00.000Z"),
        createdAt: new Date("2026-04-30T07:50:00.000Z"),
        updatedAt: new Date("2026-04-30T08:00:02.000Z"),
        startedAt: new Date("2026-04-30T07:59:30.000Z"),
        finishedAt: new Date("2026-04-30T08:00:02.000Z"),
      },
    ],
  });
  try {
    const projection = await harness.service.getProjection("novel-1");

    assert.equal(projection.status, "waiting_approval");
    assert.equal(projection.workerHealth.derivedState, "waiting_gate");
    assert.equal(projection.workerHealth.staleCommandCount, 1);
    assert.equal(projection.currentLabel, "waiting gate");
    assert.equal(projection.detail, "approval needed");
  } finally {
    harness.restore();
  }
});

test("book automation projection keeps waiting approval ahead of a stale failed runtime snapshot", async () => {
  const harness = createHarness({
    commands: [],
    latestTask: {
      status: "waiting_approval",
      checkpointType: "chapter_batch_ready",
      checkpointSummary: "第 3-10 章已准备好继续执行。",
      currentItemLabel: "等待继续自动执行第 3-10 章",
    },
    runtimeProjection: {
      runId: "run-1",
      novelId: "novel-1",
      status: "failed",
      headline: "处理失败：Run the chapter generation batch",
      detail: "stale runtime failure",
      requiresUserAction: true,
      blockedReason: "stale runtime failure",
      nextActionLabel: "Continue chapter generation",
      policyMode: "run_until_gate",
      updatedAt: "2026-04-30T09:00:03.000Z",
      recentEvents: [],
    },
  });
  try {
    const projection = await harness.service.getProjection("novel-1");

    assert.equal(projection.status, "waiting_approval");
    assert.equal(projection.dashboardView.mode, "waiting_user");
    assert.equal(projection.displayState, "needs_confirmation");
    assert.equal(projection.requiresUserAction, true);
    assert.equal(projection.detail, "第 3-10 章已准备好继续执行。");
  } finally {
    harness.restore();
  }
});

test("book automation projection prefers the latest task error over stale checkpoint summaries", async () => {
  const harness = createHarness({
    commands: [],
    latestTask: {
      status: "failed",
      checkpointType: "chapter_batch_ready",
      checkpointSummary: "[{\"origin\":\"string\",\"code\":\"too_small\"}]",
      lastError: "There are no chapters to generate in the selected range.当前可用章节范围为第 1 章到第 55 章。",
    },
    runtimeProjection: {
      runId: "run-1",
      novelId: "novel-1",
      status: "failed",
      headline: "处理失败：Run the chapter generation batch",
      detail: null,
      requiresUserAction: true,
      blockedReason: "stale runtime failure",
      nextActionLabel: "Continue chapter generation",
      policyMode: "run_until_gate",
      updatedAt: "2026-04-30T09:00:03.000Z",
      recentEvents: [],
    },
  });
  try {
    const projection = await harness.service.getProjection("novel-1");
    const taskTimeline = projection.timeline.find((item) => item.id === "task:task-1");

    assert.equal(projection.status, "failed");
    assert.equal(projection.blockedReason, "There are no chapters to generate in the selected range.当前可用章节范围为第 1 章到第 55 章。");
    assert.equal(projection.detail, "There are no chapters to generate in the selected range.当前可用章节范围为第 1 章到第 55 章。");
    assert.equal(projection.userReason, "There are no chapters to generate in the selected range.当前可用章节范围为第 1 章到第 55 章。");
    assert.equal(taskTimeline?.detail, "There are no chapters to generate in the selected range.当前可用章节范围为第 1 章到第 55 章。");
  } finally {
    harness.restore();
  }
});

test("book automation projection keeps a failed workflow ahead of a stale waiting-approval runtime snapshot", async () => {
  const harness = createHarness({
    commands: [],
    latestTask: {
      status: "failed",
      checkpointType: null,
      checkpointSummary: "This action will auto-advance a large chapter range and needs confirmation first.",
      lastError: "There are no chapters to generate in the selected range.当前可用章节范围为第 1 章到第 55 章。",
      currentItemLabel: "Auto-running chapters 2-10",
    },
    runtimeProjection: {
      runId: "run-1",
      novelId: "novel-1",
      status: "waiting_approval",
      headline: "等待确认：Run the chapter generation batch",
      detail: "This action will auto-advance a large chapter range and needs confirmation first.",
      requiresUserAction: true,
      blockedReason: "This action will auto-advance a large chapter range and needs confirmation first.",
      nextActionLabel: "确认后继续",
      policyMode: "run_until_gate",
      updatedAt: "2026-04-30T09:00:03.000Z",
      recentEvents: [],
    },
  });
  try {
    const projection = await harness.service.getProjection("novel-1");

    assert.equal(projection.status, "failed");
    assert.equal(projection.displayState, "needs_attention");
    assert.equal(projection.detail, "There are no chapters to generate in the selected range.当前可用章节范围为第 1 章到第 55 章。");
    assert.equal(projection.primaryAction.label, "Check the failure reason");
  } finally {
    harness.restore();
  }
});

const test = require("node:test");
const assert = require("node:assert/strict");

const {
  NovelWorkflowRuntimeService,
} = require("../dist/services/novel/workflow/NovelWorkflowRuntimeService.js");
const {
  NovelWorkflowService,
} = require("../dist/services/novel/workflow/NovelWorkflowService.js");
const { prisma } = require("../dist/db/prisma.js");

test("resumePendingAutoDirectorTasks requeues interrupted running tasks before continuing", async () => {
  const calls = [];
  const runtimeService = new NovelWorkflowRuntimeService(
    {
      async listRecoverableAutoDirectorTasks() {
        return [{ id: "task-running", status: "running" }];
      },
      async requeueTaskForRecovery(taskId, message) {
        calls.push(["requeue", taskId, message]);
      },
      async markTaskFailed(taskId, message) {
        calls.push(["failed", taskId, message]);
      },
    },
    {
      async continueTask(taskId) {
        calls.push(["continue", taskId]);
      },
    },
  );

  await runtimeService.resumePendingAutoDirectorTasks();

  assert.deepEqual(calls, [
    ["requeue", "task-running", "The Auto-Director task stopped after a service restart and is trying to recover."],
    ["continue", "task-running"],
  ]);
});

test("resumePendingAutoDirectorTasks continues queued tasks without marking them for manual recovery", async () => {
  const calls = [];
  const runtimeService = new NovelWorkflowRuntimeService(
    {
      async listRecoverableAutoDirectorTasks() {
        return [{ id: "task-queued", status: "queued" }];
      },
      async requeueTaskForRecovery(taskId, message) {
        calls.push(["requeue", taskId, message]);
      },
      async markTaskFailed(taskId, message) {
        calls.push(["failed", taskId, message]);
      },
    },
    {
      async continueTask(taskId) {
        calls.push(["continue", taskId]);
      },
    },
  );

  await runtimeService.resumePendingAutoDirectorTasks();

  assert.deepEqual(calls, [
    ["continue", "task-queued"],
  ]);
});

test("resumePendingAutoDirectorTasks marks failed when recovery throws", async () => {
  const calls = [];
  const runtimeService = new NovelWorkflowRuntimeService(
    {
      async listRecoverableAutoDirectorTasks() {
        return [{ id: "task-queued", status: "queued" }];
      },
      async requeueTaskForRecovery(taskId, message) {
        calls.push(["requeue", taskId, message]);
      },
      async restoreTaskToCheckpoint(taskId) {
        calls.push(["restore", taskId]);
      },
      async markTaskFailed(taskId, message) {
        calls.push(["failed", taskId, message]);
      },
    },
    {
      async continueTask() {
        throw new Error("缺少恢复上下文");
      },
    },
  );

  await runtimeService.resumePendingAutoDirectorTasks();

  assert.deepEqual(calls, [
    ["failed", "task-queued", "Recovery after restart failed：缺少恢复上下文"],
  ]);
});

test("resumePendingAutoDirectorTasks restores checkpoint instead of failing when recovery is no longer needed", async () => {
  const calls = [];
  const runtimeService = new NovelWorkflowRuntimeService(
    {
      async listRecoverableAutoDirectorTasks() {
        return [{ id: "task-chapter_range", status: "queued" }];
      },
      async requeueTaskForRecovery(taskId, message) {
        calls.push(["requeue", taskId, message]);
      },
      async restoreTaskToCheckpoint(taskId) {
        calls.push(["restore", taskId]);
      },
      async markTaskFailed(taskId, message) {
        calls.push(["failed", taskId, message]);
      },
    },
    {
      async continueTask() {
        const error = new Error("Current director artifacts are complete. No need to continue Auto-Director.");
        error.code = "director_recovery_not_needed";
        throw error;
      },
    },
  );

  await runtimeService.resumePendingAutoDirectorTasks();

  assert.deepEqual(calls, [
    ["restore", "task-chapter_range"],
  ]);
});

test("markPendingAutoDirectorTasksForManualRecovery only marks tasks without continuing them", async () => {
  const calls = [];
  const runtimeService = new NovelWorkflowRuntimeService(
    {
      async listRecoverableAutoDirectorTasks() {
        return [
          { id: "task-queued", status: "queued" },
          { id: "task-running", status: "running" },
        ];
      },
      async requeueTaskForRecovery(taskId, message) {
        calls.push(["requeue", taskId, message]);
      },
    },
    {
      async continueTask(taskId) {
        calls.push(["continue", taskId]);
      },
    },
  );

  await runtimeService.markPendingAutoDirectorTasksForManualRecovery();

  assert.deepEqual(calls, [
    ["requeue", "task-queued", "The task paused after a service restart and is waiting for manual recovery."],
    ["requeue", "task-running", "The task paused after a service restart and is waiting for manual recovery."],
  ]);
});

test("markPendingAutoDirectorTasksForManualRecovery marks stale running tasks as failed when configured", async () => {
  const calls = [];
  const runtimeService = new NovelWorkflowRuntimeService(
    {
      async listRecoverableAutoDirectorTasks() {
        return [
          { id: "task-stale", status: "running", stale: true },
          { id: "task-fresh", status: "running" },
        ];
      },
      async requeueTaskForRecovery(taskId, message) {
        calls.push(["requeue", taskId, message]);
      },
      async markTaskFailed(taskId, message) {
        calls.push(["failed", taskId, message]);
      },
    },
    {
      async continueTask(taskId) {
        calls.push(["continue", taskId]);
      },
    },
  );

  await runtimeService.markPendingAutoDirectorTasksForManualRecovery({
    staleRunningAsFailed: true,
  });

  assert.deepEqual(calls, [
    ["failed", "task-stale", "The Auto-Director task lost its heartbeat, likely from a restart or memory pressure. Check it, then continue or retry."],
    ["requeue", "task-fresh", "The task paused after a service restart and is waiting for manual recovery."],
  ]);
});

test("stale running auto director healing does not recurse through markTaskFailed", async () => {
  const originals = {
    archiveFindUnique: prisma.taskCenterArchive.findUnique,
    taskFindUnique: prisma.novelWorkflowTask.findUnique,
    taskUpdate: prisma.novelWorkflowTask.update,
  };
  const updates = [];
  const staleRow = {
    id: "task-stale",
    novelId: "novel-1",
    lane: "auto_director",
    status: "running",
    progress: 0.4,
    currentStage: "Structured outline",
    currentItemKey: "chapter_detail_bundle",
    currentItemLabel: "Generating chapters细纲",
    checkpointType: null,
    checkpointSummary: null,
    resumeTargetJson: null,
    seedPayloadJson: null,
    milestonesJson: null,
    pendingManualRecovery: false,
    cancelRequestedAt: null,
    heartbeatAt: new Date("2026-05-01T00:00:00.000Z"),
    updatedAt: new Date("2026-05-01T00:00:00.000Z"),
  };

  prisma.taskCenterArchive.findUnique = async () => null;
  prisma.novelWorkflowTask.findUnique = async () => staleRow;
  prisma.novelWorkflowTask.update = async ({ data }) => {
    updates.push(data);
    return {
      ...staleRow,
      ...data,
      novel: { title: "测试小说" },
      updatedAt: new Date("2026-05-04T00:00:00.000Z"),
    };
  };

  try {
    const service = new NovelWorkflowService();
    service.markTaskFailed = async () => {
      throw new Error("healStaleAutoDirectorRunningTask must not call markTaskFailed");
    };
    service.notifyAutoDirectorTaskTransition = async () => {};

    const changed = await service.healStaleAutoDirectorRunningTask("task-stale", staleRow);

    assert.equal(changed, true);
    assert.equal(updates.length, 1);
    assert.equal(updates[0].status, "failed");
    assert.equal(updates[0].lastError, "The Auto-Director task lost its heartbeat, likely from a restart or memory pressure. Check it, then continue or retry.");
  } finally {
    prisma.taskCenterArchive.findUnique = originals.archiveFindUnique;
    prisma.novelWorkflowTask.findUnique = originals.taskFindUnique;
    prisma.novelWorkflowTask.update = originals.taskUpdate;
  }
});

test("startup recovery initialization marks interrupted auto director tasks for manual recovery", async () => {
  const calls = [];
  const { RecoveryTaskService } = require("../dist/services/task/RecoveryTaskService.js");
  const recoveryService = new RecoveryTaskService(
    undefined,
    undefined,
    undefined,
    undefined,
    {
      async markPendingBookAnalysesForManualRecovery() {
        calls.push(["manual-book"]);
      },
      async markPendingImageTasksForManualRecovery() {
        calls.push(["manual-image"]);
      },
      async markPendingAutoDirectorTasksForManualRecovery() {
        calls.push(["manual-auto-director"]);
      },
      async markPendingPipelineJobsForManualRecovery() {
        calls.push(["manual-pipeline"]);
      },
      async markPendingStyleTasksForManualRecovery() {
        calls.push(["manual-style"]);
      },
    },
  );

  await recoveryService.initializePendingRecoveries();

  assert.deepEqual(calls.filter((call) => call[0].includes("auto-director")), [
    ["manual-auto-director"],
  ]);
});

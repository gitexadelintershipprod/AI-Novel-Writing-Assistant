const test = require("node:test");
const assert = require("node:assert/strict");

const {
  NovelPipelineRuntimeService,
} = require("../dist/services/novel/NovelPipelineRuntimeService.js");

test("resumePendingPipelineJobs resumes queued and running pipeline jobs after restart", async () => {
  const calls = [];
  const runtimeService = new NovelPipelineRuntimeService({
    async listPendingCancellationPipelineJobs() {
      return [];
    },
    async listRecoverablePipelineJobs() {
      return [
        { id: "job-queued", status: "queued" },
        { id: "job-running", status: "running" },
      ];
    },
    async listStaleRecoverablePipelineJobs() {
      return [];
    },
    async markPipelineJobCancelled(jobId) {
      calls.push(["cancelled", jobId]);
    },
    async resumePipelineJob(jobId) {
      calls.push(["resume", jobId]);
    },
    async markPipelineJobFailed(jobId, message) {
      calls.push(["failed", jobId, message]);
    },
    async markPipelineJobPendingManualRecovery(jobId, message) {
      calls.push(["pending", jobId, message]);
    },
  });

  await runtimeService.resumePendingPipelineJobs();

  assert.deepEqual(calls, [
    ["resume", "job-queued"],
    ["resume", "job-running"],
  ]);
});

test("resumePendingPipelineJobs settles pending cancellations before resuming work", async () => {
  const calls = [];
  const runtimeService = new NovelPipelineRuntimeService({
    async listPendingCancellationPipelineJobs() {
      return [{ id: "job-cancelling", status: "cancelled" }];
    },
    async listRecoverablePipelineJobs() {
      return [{ id: "job-running", status: "running" }];
    },
    async listStaleRecoverablePipelineJobs() {
      return [];
    },
    async markPipelineJobCancelled(jobId) {
      calls.push(["cancelled", jobId]);
    },
    async resumePipelineJob(jobId) {
      calls.push(["resume", jobId]);
    },
    async markPipelineJobFailed(jobId, message) {
      calls.push(["failed", jobId, message]);
    },
    async markPipelineJobPendingManualRecovery(jobId, message) {
      calls.push(["pending", jobId, message]);
    },
  });

  await runtimeService.resumePendingPipelineJobs();

  assert.deepEqual(calls, [
    ["cancelled", "job-cancelling"],
    ["resume", "job-running"],
  ]);
});

test("recoverStalePipelineJobs preserves a manual recovery checkpoint when resume throws", async () => {
  const calls = [];
  const runtimeService = new NovelPipelineRuntimeService({
    async listPendingCancellationPipelineJobs() {
      return [];
    },
    async listRecoverablePipelineJobs() {
      return [];
    },
    async listStaleRecoverablePipelineJobs() {
      return [{ id: "job-stale", status: "running" }];
    },
    async markPipelineJobCancelled(jobId) {
      calls.push(["cancelled", jobId]);
    },
    async resumePipelineJob() {
      throw new Error("缺少章节上下文");
    },
    async markPipelineJobFailed(jobId, message) {
      calls.push(["failed", jobId, message]);
    },
    async markPipelineJobPendingManualRecovery(jobId, message) {
      calls.push(["pending", jobId, message]);
    },
  });

  await runtimeService.recoverStalePipelineJobs(new Date("2026-04-03T00:00:00+08:00"), 60_000);

  assert.deepEqual(calls, [
    ["pending", "job-stale", "The chapter pipeline task heartbeat timed out and is trying to recover. Recovery failed：缺少章节上下文"],
  ]);
});

test("markPendingPipelineJobsForManualRecovery settles cancellations and marks recoverable jobs", async () => {
  const calls = [];
  const runtimeService = new NovelPipelineRuntimeService({
    async listPendingCancellationPipelineJobs() {
      return [{ id: "job-cancelling", status: "cancelled" }];
    },
    async listRecoverablePipelineJobs() {
      return [
        { id: "job-queued", status: "queued" },
        { id: "job-running", status: "running" },
      ];
    },
    async listStaleRecoverablePipelineJobs() {
      return [];
    },
    async markPipelineJobCancelled(jobId) {
      calls.push(["cancelled", jobId]);
    },
    async markPipelineJobPendingManualRecovery(jobId, message) {
      calls.push(["pending", jobId, message]);
    },
    async resumePipelineJob(jobId) {
      calls.push(["resume", jobId]);
    },
    async markPipelineJobFailed(jobId, message) {
      calls.push(["failed", jobId, message]);
    },
  });

  await runtimeService.markPendingPipelineJobsForManualRecovery();

  assert.deepEqual(calls, [
    ["cancelled", "job-cancelling"],
    ["pending", "job-queued", "The task paused after a service restart and is waiting for manual recovery."],
    ["pending", "job-running", "The task paused after a service restart and is waiting for manual recovery."],
  ]);
});

import { CircleAlert, CircleCheck, Clock3, Database, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { RagHealthStatus, RagJobSummary } from "@/api/knowledge";
import {
  formatJobType,
  formatRagJobMeta,
  formatStatus,
  getRagJobProgressPercent,
  getRagJobProgressWidth,
} from "./knowledgeRagUi";

interface KnowledgeOpsTabProps {
  visibleDocumentsCount: number;
  enabledCount: number;
  disabledCount: number;
  ragHealth?: RagHealthStatus;
  ragHealthNotice?: string;
  jobs: RagJobSummary[];
  failedJobs: RagJobSummary[];
  actionMessage?: string;
  isClearingJobs: boolean;
  deletingJobId?: string;
  onClearFinishedJobs: () => void;
  onDeleteJob: (jobId: string) => void;
  onOpenSettings: () => void;
}

const FINISHED_RAG_JOB_STATUSES = new Set<RagJobSummary["status"]>(["succeeded", "failed", "cancelled"]);

const OWNER_LABELS: Record<string, string> = {
  novel: "Novel information",
  chapter: "Chapter text",
  world: "book world",
  world_library_item: "world sample",
  character: "character profile",
  character_timeline: "Character experience",
  bible: "Creation settings",
  chapter_summary: "Chapter Summary",
  consistency_fact: "continuity data",
  knowledge_document: "Knowledge materials",
  chat_message: "creative dialogue",
};

function canDeleteRagJob(job: RagJobSummary): boolean {
  return FINISHED_RAG_JOB_STATUSES.has(job.status);
}

function formatOwnerLabel(ownerType: string): string {
  return OWNER_LABELS[ownerType] ?? "Creative materials";
}

export default function KnowledgeOpsTab({
  visibleDocumentsCount,
  enabledCount,
  disabledCount,
  ragHealth,
  ragHealthNotice,
  jobs,
  failedJobs,
  actionMessage,
  isClearingJobs,
  deletingJobId,
  onClearFinishedJobs,
  onDeleteJob,
  onOpenSettings,
}: KnowledgeOpsTabProps) {
  const finishedJobCount = jobs.filter((job) => canDeleteRagJob(job)).length;
  const activeJobCount = jobs.filter((job) => job.status === "queued" || job.status === "running").length;
  const healthOk = Boolean(ragHealth?.ok);

  return (
    <div className="space-y-6">
      <section
        aria-label="Data retrieval available status"
        className={`rounded-3xl px-5 py-5 sm:px-6 ${healthOk ? "bg-success/[0.065]" : "bg-destructive/[0.055]"}`}
      >
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex min-w-0 items-start gap-3">
            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${healthOk ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"}`}>
              {healthOk ? <CircleCheck className="h-5 w-5" /> : <CircleAlert className="h-5 w-5" />}
            </div>
            <div className="min-w-0">
              <h2 className="text-lg font-semibold tracking-tight">
                {healthOk ? "Materials can be used to create" : "Data retrieval needs processing"}
              </h2>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                {healthOk
                  ? "The vector model is connected to the database normally, and the indexed data can be used for book opening, planning, and text creation."
                  : "The vector model or database connection is abnormal. After the connection is repaired, you can continue to index and recall data."}
              </p>
            </div>
          </div>
          {!healthOk ? (
            <Button type="button" size="sm" className="w-full rounded-full sm:w-auto" onClick={onOpenSettings}>
              Check search settings
            </Button>
          ) : null}
        </div>

        <div className="mt-5 flex flex-wrap gap-x-6 gap-y-2 border-t border-foreground/[0.06] pt-4 text-sm">
          <span><strong className="tabular-nums">{visibleDocumentsCount}</strong> information</span>
          <span className="text-muted-foreground"><strong className="font-semibold tabular-nums text-foreground">{enabledCount}</strong> copies are enabled</span>
          {disabledCount > 0 ? (
            <span className="text-muted-foreground"><strong className="font-semibold tabular-nums text-foreground">{disabledCount}</strong> copies have been deactivated</span>
          ) : null}
          <span className="text-muted-foreground"><strong className="font-semibold tabular-nums text-foreground">{activeJobCount}</strong> syncing</span>
          {failedJobs.length > 0 ? (
            <span className="text-destructive"><strong className="font-semibold tabular-nums">{failedJobs.length}</strong> tasks failed</span>
          ) : null}
        </div>

        <details className="group mt-4 text-xs text-muted-foreground">
          <summary className="cursor-pointer list-none marker:hidden">View connection details</summary>
          <div className="mt-3 grid gap-3 rounded-2xl bg-background/55 p-4 sm:grid-cols-3">
            <div>
              <div className="font-medium text-foreground">vector model</div>
              <div className="mt-1 break-words">
                {ragHealth?.embedding.provider ?? "-"} · {ragHealth?.embedding.model ?? "-"} · {ragHealth?.embedding.ok ? "Available" : "Not available"}
              </div>
              {ragHealth?.embedding.detail ? <div className="mt-1 break-words">{ragHealth.embedding.detail}</div> : null}
            </div>
            <div>
              <div className="font-medium text-foreground">Database connection</div>
              <div className="mt-1">{ragHealth?.qdrant.ok ? "The connection is normal" : "Connection failed"}</div>
              {ragHealth?.qdrant.detail ? <div className="mt-1 break-words">{ragHealth.qdrant.detail}</div> : null}
            </div>
            <div>
              <div className="font-medium text-foreground">Book relationship graph</div>
              <div className="mt-1">
                {ragHealth?.graph?.enabled === false
                  ? "Turned off"
                  : ragHealth?.graph?.ok
                    ? "The connection is normal"
                    : "Connection failed"}
              </div>
              {ragHealth?.graph?.detail ? <div className="mt-1 break-words">{ragHealth.graph.detail}</div> : null}
            </div>
            {ragHealthNotice ? <div className="sm:col-span-3">{ragHealthNotice}</div> : null}
          </div>
        </details>
      </section>

      <section aria-labelledby="knowledge-jobs-title">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 id="knowledge-jobs-title" className="text-xl font-semibold tracking-tight">Data synchronization record</h2>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">Check the progress of data entering the retrieval database; the failure reason will be directly displayed, and the operation details will be expanded as needed.</p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="w-full rounded-full text-muted-foreground sm:w-auto"
            onClick={onClearFinishedJobs}
            disabled={isClearingJobs || finishedJobCount === 0}
          >
            <Trash2 className="h-4 w-4" />
            {isClearingJobs ? "Cleaning up..." : `clear record ${finishedJobCount}`}
          </Button>
        </div>

        {actionMessage ? (
          <div className="mt-4 rounded-2xl bg-muted/30 px-4 py-3 text-sm text-muted-foreground">{actionMessage}</div>
        ) : null}

        {jobs.length === 0 ? (
          <div className="mt-5 flex min-h-44 flex-col items-center justify-center rounded-3xl bg-muted/20 px-6 text-center">
            <Database className="h-6 w-6 text-muted-foreground/60" />
            <div className="mt-3 font-medium">There is no data synchronization record yet</div>
            <div className="mt-1 text-sm text-muted-foreground">After uploading data or rebuilding the index, you can check the progress here.</div>
          </div>
        ) : (
          <div className="mt-5 grid gap-3 xl:grid-cols-2">
            {jobs.map((job) => {
              const failed = job.status === "failed";
              const active = job.status === "queued" || job.status === "running";
              return (
                <article
                  key={job.id}
                  className={`rounded-2xl border p-4 ${failed ? "border-destructive/20 bg-destructive/[0.025]" : "border-border/35 bg-card/70"}`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex min-w-0 items-start gap-3">
                      <div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${failed ? "bg-destructive/10 text-destructive" : active ? "bg-info/10 text-info" : "bg-muted/60 text-muted-foreground"}`}>
                        {failed ? <CircleAlert className="h-4 w-4" /> : active ? <Clock3 className="h-4 w-4" /> : <CircleCheck className="h-4 w-4" />}
                      </div>
                      <div className="min-w-0">
                        <div className="font-medium">{job.ownerTitle || formatOwnerLabel(job.ownerType)}</div>
                        <div className="mt-0.5 text-xs text-muted-foreground">{formatJobType(job.jobType)}</div>
                      </div>
                    </div>
                    <Badge variant="secondary" className={`border-0 font-normal ${failed ? "bg-destructive/10 text-destructive" : active ? "bg-info/10 text-info" : "bg-muted/60"}`}>
                      {formatStatus(job.status)}
                    </Badge>
                  </div>

                  {job.progress ? (
                    <div className="mt-4 space-y-2">
                      <div className="flex items-center justify-between gap-2 text-xs">
                        <span>{job.progress.label}</span>
                        <span className="tabular-nums text-muted-foreground">{getRagJobProgressPercent(job)}%</span>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                        <div
                          className={`h-full rounded-full transition-all ${failed ? "bg-destructive" : "bg-primary"}`}
                          style={{ width: getRagJobProgressWidth(job) }}
                        />
                      </div>
                      {job.progress.detail ? <div className="text-xs text-muted-foreground">{job.progress.detail}</div> : null}
                    </div>
                  ) : null}

                  {job.lastError ? (
                    <div className="mt-3 rounded-xl bg-destructive/[0.06] px-3 py-2 text-xs leading-5 text-destructive">{job.lastError}</div>
                  ) : null}

                  <div className="mt-3 flex items-center justify-between gap-3 border-t border-border/30 pt-3">
                    <details className="group min-w-0 text-xs text-muted-foreground">
                      <summary className="cursor-pointer list-none marker:hidden">Mission details</summary>
                      <div className="mt-2 space-y-1 break-all">
                        <div>{formatRagJobMeta(job)}</div>
                        <div>{job.ownerType}:{job.ownerId}</div>
                      </div>
                    </details>
                    {canDeleteRagJob(job) ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-8 shrink-0 rounded-full px-2 text-muted-foreground"
                        onClick={() => onDeleteJob(job.id)}
                        disabled={deletingJobId === job.id}
                        aria-label="Delete task record"
                      >
                        <Trash2 className="h-4 w-4" />
                        {deletingJobId === job.id ? "Deleting..." : "Delete"}
                      </Button>
                    ) : null}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

import type {
  DirectorPolicyMode,
  DirectorRuntimeProjection,
  DirectorRuntimeProjectionStatus,
} from "@ai-novel/shared/types/directorRuntime";
import { getDirectorNodeDisplayLabel } from "@ai-novel/shared/types/directorRuntime";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  PauseCircle,
  ShieldCheck,
  XCircle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Link } from "react-router-dom";
import type { DirectorIssueAction, DirectorIssueDecision } from "@ai-novel/shared/types/directorIssue";

interface DirectorRuntimeProjectionCardProps {
  projection: DirectorRuntimeProjection | null | undefined;
  className?: string;
  compact?: boolean;
}

const ISSUE_ACTION_LABELS: Record<DirectorIssueAction, string> = {
  auto_retry: "Automatic retry",
  continue_with_warning: "Continue after reminder",
  pause_for_manual: "Pause processing",
  fail_task: "end task",
};

const POLICY_SOURCE_LABELS: Record<DirectorIssueDecision["policySource"], string> = {
  global: "global rules",
  novel: "book rules",
  task_snapshot: "Task start rules",
  safety: "Safety bottom line",
};

function formatDate(value: string | null | undefined): string {
  if (!value) {
    return "None yet";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "None yet";
  }
  return date.toLocaleString();
}

function formatTokenCount(value: number | null | undefined): string {
  const count = Math.max(0, Math.round(Number(value ?? 0)));
  return count.toLocaleString();
}

function formatDuration(value: number | null | undefined): string | null {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    return null;
  }
  const seconds = Math.round(value / 1000);
  if (seconds <= 0) {
    return "<1 second";
  }
  if (seconds < 60) {
    return `${seconds}s`;
  }
  const minutes = Math.floor(seconds / 60);
  const restSeconds = seconds % 60;
  return restSeconds > 0 ? `${minutes} min ${restSeconds}s` : `${minutes} min`;
}

function formatUsageLine(usage: {
  llmCallCount: number;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  durationMs?: number | null;
}): string {
  const duration = formatDuration(usage.durationMs);
  return [
    `${formatTokenCount(usage.llmCallCount)} calls`,
    `Input ${formatTokenCount(usage.promptTokens)}`,
    `Output ${formatTokenCount(usage.completionTokens)}`,
    `Total ${formatTokenCount(usage.totalTokens)} tokens`,
    duration ? `Cumulative call time ${duration}` : null,
  ].filter(Boolean).join(" · ");
}

function formatPolicyMode(mode: DirectorPolicyMode): string {
  if (mode === "suggest_only") {
    return "Just give advice";
  }
  if (mode === "run_next_step") {
    return "Proceed to the next step";
  }
  if (mode === "auto_safe_scope") {
    return "Safe range automatic advancement";
  }
  return "Advance to checkpoint";
}

function formatStatus(status: DirectorRuntimeProjectionStatus): string {
  if (status === "running") {
    return "Advancing";
  }
  if (status === "waiting_approval") {
    return "Waiting for confirmation";
  }
  if (status === "blocked") {
    return "Suspended";
  }
  if (status === "failed") {
    return "failed";
  }
  if (status === "completed") {
    return "Completed";
  }
  return "To be started";
}

function statusClassName(status: DirectorRuntimeProjectionStatus): string {
  if (status === "running") {
    return "border-sky-300 bg-sky-50 text-sky-900";
  }
  if (status === "waiting_approval") {
    return "border-amber-300 bg-amber-50 text-amber-900";
  }
  if (status === "blocked" || status === "failed") {
    return "border-destructive/30 bg-destructive/5 text-destructive";
  }
  if (status === "completed") {
    return "border-emerald-300 bg-emerald-50 text-emerald-900";
  }
  return "border-border bg-muted/30 text-muted-foreground";
}

function statusIcon(status: DirectorRuntimeProjectionStatus) {
  if (status === "running") {
    return <Activity className="h-4 w-4" />;
  }
  if (status === "waiting_approval") {
    return <PauseCircle className="h-4 w-4" />;
  }
  if (status === "blocked") {
    return <AlertTriangle className="h-4 w-4" />;
  }
  if (status === "failed") {
    return <XCircle className="h-4 w-4" />;
  }
  if (status === "completed") {
    return <CheckCircle2 className="h-4 w-4" />;
  }
  return <ShieldCheck className="h-4 w-4" />;
}

function riskBadgeClassName(level: NonNullable<DirectorRuntimeProjection["visibleRiskBadges"]>[number]["level"]) {
  if (level === "danger") {
    return "border-red-200 bg-red-50 text-red-700";
  }
  if (level === "warning") {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }
  return "border-sky-200 bg-sky-50 text-sky-700";
}

function formatQualityDebtSummary(summary: DirectorRuntimeProjection["qualityDebtSummary"] | null | undefined): string | null {
  if (!summary || summary.deferredChapterCount <= 0) {
    return null;
  }
  const orderText = summary.deferredChapterOrders.length > 0
    ? `: Chapter ${summary.deferredChapterOrders.join(", ")}`
    : "";
  return `Quality to recover${orderText}. Later chapters will keep writing first; these issues come back in the quality-repair step.`;
}

function formatQualityBudgetSummary(summary: DirectorRuntimeProjection["qualityBudgetSummary"] | null | undefined): string | null {
  if (!summary) {
    return null;
  }
  const chapterText = typeof summary.currentChapterOrder === "number"
    ? `Chapter ${summary.currentChapterOrder}`
    : "Current chapter";
  return `${chapterText} quality budget: partial repair ${summary.patchRepairUsed}/1, full-chapter rewrite ${summary.chapterRewriteUsed}/1, nearby-chapter replan ${summary.windowReplanUsed}/1. ${summary.nextActionLabel}`;
}

function formatRootCauseSummary(projection: DirectorRuntimeProjection): string | null {
  if (!projection.rootCauseCode || projection.rootCauseCode === "none") {
    return null;
  }
  if (projection.rootCauseCode === "replan_required") {
    return "The current problem comes from the mismatch of chapter responsibilities, and the system needs to adjust the arrangement of nearby chapters first.";
  }
  if (projection.rootCauseCode === "draft_obligation_unmet") {
    return "The main text has been generated, but there are still things that must be completed in this chapter that have not been fulfilled.";
  }
  if (projection.rootCauseCode === "draft_repair_exhausted") {
    return "The main text has been generated, but there are still blocking problems that need to be processed after automatic repair.";
  }
  return "The main text was not successfully generated and the current chapter needs to be re-executed.";
}

function formatRiskAction(action: NonNullable<DirectorRuntimeProjection["latestRiskAssessment"]>["action"]): string {
  if (action === "forced_pause" || action === "pause_requested" || action === "paused") {
    return "will pause after the current safe node";
  }
  if (action === "quality_debt_recorded") {
    return "Quality debt has been recorded and will continue to advance in subsequent chapters.";
  }
  if (action === "notified") {
    return "Risk alert sent";
  }
  return "Already recorded, the automatic director will continue to determine the next step";
}

function riskScoreClassName(score: number): string {
  if (score >= 8) return "border-destructive/30 bg-destructive/5 text-destructive";
  if (score >= 5) return "border-amber-300 bg-amber-50 text-amber-900";
  return "border-sky-300 bg-sky-50 text-sky-900";
}

function formatRiskCategory(category: NonNullable<DirectorRuntimeProjection["latestRiskAssessment"]>["category"]): string {
  const labels: Record<typeof category, string> = {
    planning: "planning",
    candidate_confirmation: "Candidate confirmation",
    chapter_generation: "Chapter generation",
    chapter_acceptance: "Chapter Acceptance",
    chapter_repair: "Chapter fixes",
    state_proposal: "status proposal",
    replan: "Heavy planning",
    model_failure: "Model failure",
    worker_failure: "Actuator failure",
    task_recovery: "task recovery",
    protected_content: "protected text",
    runtime_safety: "Runtime security",
    data_integrity: "data integrity",
    unknown: "Others",
  };
  return labels[category];
}

function formatPercent(value: number | null | undefined): string {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return "0%";
  }
  return `${Math.max(0, Math.min(100, Math.round(value)))}%`;
}

export default function DirectorRuntimeProjectionCard({
  projection,
  className,
  compact = false,
}: DirectorRuntimeProjectionCardProps) {
  if (!projection) {
    return null;
  }
  const primaryText = projection.headline?.trim()
    || projection.currentLabel?.trim()
    || projection.lastEventSummary?.trim()
    || "Waiting for synchronization of current advancement status";
  const detailText = projection.detail?.trim();
  const attentionText = projection.requiresUserAction
    ? projection.blockingReason?.trim()
      || projection.blockedReason?.trim()
      || projection.lastEventSummary?.trim()
      || "Please process the current stop first."
    : projection.blockingReason?.trim() || projection.blockedReason?.trim();
  const progressLine = projection.progressBreakdown?.explanation?.trim()
    || projection.progressSummary?.trim()
    || null;
  const qualityDebtLine = formatQualityDebtSummary(projection.qualityDebtSummary);
  const qualityBudgetLine = formatQualityBudgetSummary(projection.qualityBudgetSummary);
  const rootCauseLine = formatRootCauseSummary(projection);
  const obligationLine = projection.blockingObligations && projection.blockingObligations.length > 0
    ? `Still needs attention: ${projection.blockingObligations.slice(0, 3).map((item) => item.summary).join("; ")}`
    : null;
  const activeExecutionLine = projection.activeExecution
    ? `Running in the background: ${getDirectorNodeDisplayLabel({
      nodeKey: projection.activeExecution.stepType,
      fallback: projection.currentAction || "Automatic director tasks",
    })}${projection.activeExecution.resourceClass ? ` · ${projection.activeExecution.resourceClass}` : ""}`
    : null;
  const waitingLine = projection.waitingReason ? `Waiting because: ${projection.waitingReason}` : null;
  const workerHealthLine = projection.workerHealth
    ? [
      `Execution queue: ${projection.workerHealth.queuedCommandCount} waiting`,
      projection.workerHealth.runningCommandCount > 0 ? `${projection.workerHealth.runningCommandCount} in progress` : null,
      projection.workerHealth.currentWorkerId ? `Worker: ${projection.workerHealth.currentWorkerId}` : null,
    ].filter(Boolean).join(" · ")
    : null;
  const helperLines = [
    activeExecutionLine,
    waitingLine,
    workerHealthLine,
    projection.nextActionLabel ? `Next step: ${projection.nextActionLabel}` : null,
    projection.recommendedAction?.reason ? `Why this is recommended: ${projection.recommendedAction.reason}` : null,
    projection.isAutopilotRecoverable ? "The AI can continue processing from its current progress." : null,
    rootCauseLine,
    obligationLine,
    qualityBudgetLine,
    qualityDebtLine,
    projection.scopeSummary,
    progressLine,
  ].filter((line): line is string => Boolean(line?.trim()));
  const recentEvents = projection.recentEvents.slice(0, compact ? 2 : 4);
  const recentIssues = projection.recentIssues?.slice(0, compact ? 2 : 6) ?? [];
  const usageSummary = projection.usageSummary ?? null;
  const stepUsage = projection.stepUsage?.slice(0, compact ? 2 : 4) ?? [];
  const promptUsage = projection.promptUsage?.slice(0, compact ? 2 : 6) ?? [];
  const visibleRiskBadges = projection.visibleRiskBadges?.slice(0, compact ? 3 : 6) ?? [];
  const progressBreakdown = projection.progressBreakdown ?? null;
  const latestRisk = projection.latestRiskAssessment ?? null;
  const riskHistory = projection.riskHistory ?? [];
  const affectedRiskChapters = latestRisk?.affectedChapterOrders.length
    ? `Chapter ${latestRisk.affectedChapterOrders.join(", ")}`
    : "current step";

  return (
    <div className={cn("rounded-lg border bg-background/80 p-3", statusClassName(projection.status), className)}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-2">
          <span className="mt-0.5 shrink-0">{statusIcon(projection.status)}</span>
          <div className="min-w-0">
            <div className="text-sm font-semibold text-foreground">Director's progress</div>
            <div className="mt-1 text-sm leading-5">{primaryText}</div>
          </div>
        </div>
        <Badge variant="outline" className="shrink-0 bg-background/70">
          {formatStatus(projection.status)}
        </Badge>
      </div>

      {visibleRiskBadges.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {visibleRiskBadges.map((badge) => (
            <Badge key={`${badge.source ?? "risk"}:${badge.label}`} variant="outline" className={cn("bg-background/70", riskBadgeClassName(badge.level))}>
              {badge.label}
            </Badge>
          ))}
        </div>
      ) : null}

      {latestRisk ? (
        <div className={cn("mt-3 rounded-md border px-3 py-2 text-sm leading-5", riskScoreClassName(latestRisk.score))}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="font-medium">Current highest risk:{latestRisk.score}/8</span>
            <span className="text-xs">Impact:{affectedRiskChapters}</span>
          </div>
          <div className="mt-1">{latestRisk.evidenceSummary}</div>
          <div className="mt-1 text-xs opacity-85">{formatRiskAction(latestRisk.action)}. Next step: {latestRisk.recommendationReason}</div>
        </div>
      ) : null}

      <details className="mt-3 rounded-md border bg-background/70">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-3 py-2 text-sm font-medium text-foreground">
          <span>Risk event record</span>
          <Badge variant="outline">{projection.riskHistoryTotal ?? riskHistory.length}</Badge>
        </summary>
        <div className="space-y-2 border-t px-3 py-3">
          {riskHistory.length > 0 ? riskHistory.map((risk) => (
            <div key={risk.eventId} className={cn("rounded-md border px-3 py-2 text-xs leading-5", riskScoreClassName(risk.score))}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-medium">{risk.score}/8 · {formatRiskCategory(risk.category)}</span>
                <span>{formatDate(risk.assessedAt)}</span>
              </div>
              <div className="mt-1">{risk.evidenceSummary}</div>
              <div className="mt-1 opacity-85">
                Impact: {risk.affectedChapterOrders.length > 0 ? `Chapter ${risk.affectedChapterOrders.join(", ")}` : "current task"} · {formatRiskAction(risk.action)}
              </div>
              <div className="mt-1 opacity-85">Next step: {risk.recommendationReason}</div>
            </div>
          )) : (
            <div className="text-xs leading-5 text-muted-foreground">
              There are currently no exceptions to score. After the automatic director runs, each issue that requires decision-making will leave scores, reasons and processing actions here.
            </div>
          )}
        </div>
      </details>

      {progressBreakdown && !compact ? (
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <div className="rounded-md border bg-background/70 px-3 py-2">
            <div className="text-[11px] text-muted-foreground">planning</div>
            <div className="mt-1 text-sm font-semibold text-foreground">{formatPercent(progressBreakdown.planningProgress ?? progressBreakdown.planningPercent)}</div>
          </div>
          <div className="rounded-md border bg-background/70 px-3 py-2">
            <div className="text-[11px] text-muted-foreground">Chapter</div>
            <div className="mt-1 text-sm font-semibold text-foreground">{progressBreakdown.continuableChapters}/{progressBreakdown.totalChapters}</div>
          </div>
          <div className="rounded-md border bg-background/70 px-3 py-2">
            <div className="text-[11px] text-muted-foreground">quality</div>
            <div className="mt-1 text-sm font-semibold text-foreground">{formatPercent(progressBreakdown.qualityProgress ?? progressBreakdown.qualityRepairPercent)}</div>
          </div>
          <div className="rounded-md border bg-background/70 px-3 py-2">
            <div className="text-[11px] text-muted-foreground">current action</div>
            <div className="mt-1 text-sm font-semibold text-foreground">{formatPercent(progressBreakdown.activeJobProgress)}</div>
          </div>
        </div>
      ) : null}

      {attentionText ? (
        <div className="mt-3 rounded-md border bg-background/70 px-3 py-2 text-sm leading-5">
          {projection.requiresUserAction ? "You need to handle:" : "Reason for suspension:"}{attentionText}
        </div>
      ) : null}

      {detailText && detailText !== attentionText ? (
        <div className="mt-3 rounded-md border bg-background/70 px-3 py-2 text-sm leading-5">
          {detailText}
        </div>
      ) : null}

      {helperLines.length > 0 && !compact ? (
        <div className="mt-3 space-y-2">
          {helperLines.map((line) => (
            <div key={line} className="rounded-md border bg-background/70 px-3 py-2 text-xs leading-5 text-muted-foreground">
              {line}
            </div>
          ))}
        </div>
      ) : null}

      {usageSummary ? (
        <div className="mt-3 rounded-md border bg-background/70 px-3 py-2 text-xs leading-5 text-muted-foreground">
          <div className="font-medium text-foreground">AI usage</div>
          <div className="mt-1">{formatUsageLine(usageSummary)}</div>
          {promptUsage.length > 0 && !compact ? (
            <div className="mt-2 space-y-1">
              <div className="text-[11px] font-medium text-muted-foreground">Stage dosage</div>
              {promptUsage.map((item) => (
                <div key={`${item.promptAssetKey}:${item.promptVersion ?? ""}:${item.nodeKey ?? ""}`} className="flex flex-wrap items-center justify-between gap-2 border-t pt-1">
                  <span className="min-w-0 truncate text-foreground">
                    {getDirectorNodeDisplayLabel({ label: item.label ?? item.promptAssetKey, nodeKey: item.nodeKey })}
                  </span>
                  <span className="shrink-0">{formatUsageLine(item)}</span>
                </div>
              ))}
            </div>
          ) : null}
          {stepUsage.length > 0 && !compact ? (
            <div className="mt-2 space-y-1">
              <div className="text-[11px] font-medium text-muted-foreground">Advance steps</div>
              {stepUsage.map((item) => (
                <div key={item.stepIdempotencyKey} className="flex flex-wrap items-center justify-between gap-2 border-t pt-1">
                  <span className="min-w-0 truncate text-foreground">
                    {getDirectorNodeDisplayLabel({ label: item.label, nodeKey: item.nodeKey })}
                  </span>
                  <span className="shrink-0">{formatUsageLine(item)}</span>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
        <span className="rounded-full bg-background/70 px-2 py-1">Promotion method:{formatPolicyMode(projection.policyMode)}</span>
        <span className="rounded-full bg-background/70 px-2 py-1">Update time:{formatDate(projection.updatedAt)}</span>
      </div>

      {recentIssues.length > 0 ? (
        <div className="mt-3 space-y-2">
          <div className="text-xs font-medium text-muted-foreground">Problem record</div>
          {recentIssues.map(({ occurrence, decision }) => {
            const target = occurrence.chapterId && projection.novelId
              ? `/novels/${projection.novelId}/chapters/${occurrence.chapterId}`
              : projection.novelId ? `/novels/${projection.novelId}/edit` : null;
            return (
              <div key={occurrence.fingerprint} className="rounded-md border bg-background/70 px-3 py-2 text-xs leading-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-medium text-foreground">{occurrence.summary}</span>
                  {target ? <Link className="text-primary hover:underline" to={target}>Go to processing</Link> : null}
                </div>
                <div className="mt-1 text-muted-foreground">
                  {occurrence.issueCode} · {occurrence.chapterOrder ? `Chapter ${occurrence.chapterOrder} · ` : ""}
                  Risk score {occurrence.riskScore ?? "To be evaluated"}
                  {decision ? ` · ${ISSUE_ACTION_LABELS[decision.action]} · ${POLICY_SOURCE_LABELS[decision.policySource]}` : ""}
                </div>
              </div>
            );
          })}
        </div>
      ) : null}

      {recentEvents.length > 0 && !compact ? (
        <div className="mt-3 space-y-2">
          <div className="text-xs font-medium text-muted-foreground">recent developments</div>
          {recentEvents.map((event) => (
            <div key={event.eventId} className="rounded-md border bg-background/70 px-3 py-2 text-xs leading-5">
              <div className="text-foreground">{event.summary}</div>
              <div className="mt-1 text-muted-foreground">{formatDate(event.occurredAt)}</div>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

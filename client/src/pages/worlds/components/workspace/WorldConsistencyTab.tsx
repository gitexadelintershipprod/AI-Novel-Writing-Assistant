import { useMemo, useState } from "react";
import type { WorldConsistencyIssue, WorldConsistencyReport } from "@ai-novel/shared/types/world";
import { Button } from "@/components/ui/button";
import {
  localizeConsistencyField,
  localizeConsistencyIssueDetail,
  localizeConsistencyIssueMessage,
  localizeConsistencyIssueTitle,
  localizeConsistencySeverity,
  localizeConsistencySource,
  localizeConsistencyStatus,
} from "../../worldConsistencyUi";

interface WorldConsistencyTabProps {
  report: WorldConsistencyReport | null;
  issues: WorldConsistencyIssue[];
  checkPending: boolean;
  onCheck: () => void;
  onPatchIssue: (payload: { issueId: string; status: "open" | "resolved" | "ignored" }) => void;
}

export default function WorldConsistencyTab(props: WorldConsistencyTabProps) {
  const { report, issues, checkPending, onCheck, onPatchIssue } = props;
  const [activeIssueId, setActiveIssueId] = useState<string | null>(null);
  const openIssues = useMemo(() => issues.filter((issue) => issue.status === "open"), [issues]);
  const activeIssue = useMemo(() => {
    if (issues.length === 0) {
      return null;
    }
    return issues.find((issue) => issue.id === activeIssueId)
      ?? openIssues[0]
      ?? issues[0];
  }, [activeIssueId, issues, openIssues]);
  const errorCount = issues.filter((issue) => issue.severity === "error").length;
  const warnCount = issues.filter((issue) => issue.severity === "warn").length;
  const resolvedCount = issues.filter((issue) => issue.status === "resolved").length;
  const ignoredCount = issues.filter((issue) => issue.status === "ignored").length;

  return (
    <section className="space-y-6">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">Check world consistency</h2>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">Confirm that rules, genre signals, power systems, and sources of conflict all work together to support the same story.</p>
        </div>

        <div className="flex flex-col gap-4 rounded-3xl bg-primary/[0.055] p-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="font-medium">Let AI read the entire world manual</div>
            <div className="mt-1 text-xs leading-5 text-muted-foreground">
              When it is found that the settings conflict with each other or cannot support the plot, problems that can be dealt with one by one will be given.
            </div>
          </div>
          <Button className="shrink-0 rounded-full" onClick={onCheck} disabled={checkPending}>
            {checkPending ? "Checking..." : "Run Manual Physical Checkup"}
          </Button>
        </div>

        {report ? (
          <div className="rounded-3xl border border-border/35 bg-card/70 p-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <div className="text-lg font-semibold">{localizeConsistencyStatus(report.status)}</div>
                <div className="mt-1 text-sm leading-6 text-muted-foreground">{report.summary}</div>
              </div>
              <div className="shrink-0 text-left sm:text-right">
                <div className="text-2xl font-semibold tabular-nums">{report.score}</div>
                <div className="text-xs text-muted-foreground">consistency score</div>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 border-t border-border/30 pt-4 text-sm text-muted-foreground">
              <span><strong className="font-semibold tabular-nums text-foreground">{openIssues.length}</strong> Items pending</span>
              <span><strong className="font-semibold tabular-nums text-foreground">{errorCount}</strong> Item serious</span>
              <span><strong className="font-semibold tabular-nums text-foreground">{warnCount}</strong> item reminder</span>
              <span><strong className="font-semibold tabular-nums text-foreground">{resolvedCount + ignoredCount}</strong> Item processed</span>
              <span className="text-xs">{report.generatedAt ? new Date(report.generatedAt).toLocaleString() : "Check time unknown"}</span>
            </div>
          </div>
        ) : (
          <div className="flex min-h-44 flex-col items-center justify-center rounded-3xl bg-muted/20 px-6 text-center">
            <div className="font-medium">No consistency check results yet</div>
            <div className="mt-1 text-sm text-muted-foreground">After running the check, the overall verdict and issues that need to be addressed are displayed here.</div>
          </div>
        )}

        {issues.length > 0 ? (
          <div className="grid gap-4 lg:grid-cols-[270px_minmax(0,1fr)]">
            <div className="space-y-2 rounded-3xl bg-muted/20 p-3">
              <div className="px-2 py-1 text-sm font-medium">Question list</div>
              {issues.map((issue) => {
                const selected = activeIssue?.id === issue.id;
                return (
                  <button
                    key={issue.id}
                    type="button"
                    className={[
                      "w-full rounded-2xl px-3 py-2.5 text-left text-sm transition-colors",
                      selected ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:bg-background/60",
                    ].join(" ")}
                    onClick={() => setActiveIssueId(issue.id)}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium text-foreground">
                        {localizeConsistencyIssueTitle(issue.code)}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {localizeConsistencyStatus(issue.status)}
                      </span>
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      {localizeConsistencySeverity(issue.severity)} · {localizeConsistencyField(issue.targetField)}
                    </div>
                  </button>
                );
              })}
            </div>

            {activeIssue ? (
              <div className="space-y-4 rounded-3xl border border-border/35 bg-card/70 p-5">
                <div>
                  <div className="font-medium">
                    [{localizeConsistencySeverity(activeIssue.severity)}] {localizeConsistencyIssueTitle(activeIssue.code)}
                  </div>
                  <div className="mt-2 text-sm">{localizeConsistencyIssueMessage(activeIssue)}</div>
                </div>
                <div className="rounded-2xl bg-muted/20 p-4 text-sm leading-6 text-muted-foreground">
                  {localizeConsistencyIssueDetail(activeIssue) ?? "This risk can be reviewed in conjunction with the World Manual."}
                </div>
                <div className="grid gap-2 md:grid-cols-3">
                  <div className="rounded-2xl bg-muted/20 p-3 text-xs">
                    <div className="text-muted-foreground">Check the source</div>
                    <div className="mt-1 font-medium text-foreground">{localizeConsistencySource(activeIssue.source)}</div>
                  </div>
                  <div className="rounded-2xl bg-muted/20 p-3 text-xs">
                    <div className="text-muted-foreground">Affect content</div>
                    <div className="mt-1 font-medium text-foreground">{localizeConsistencyField(activeIssue.targetField)}</div>
                  </div>
                  <div className="rounded-2xl bg-muted/20 p-3 text-xs">
                    <div className="text-muted-foreground">Processing status</div>
                    <div className="mt-1 font-medium text-foreground">{localizeConsistencyStatus(activeIssue.status)}</div>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    className="rounded-full"
                    onClick={() => onPatchIssue({ issueId: activeIssue.id, status: "resolved" })}
                    disabled={activeIssue.status === "resolved"}
                  >
                    Flag resolved
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="rounded-full"
                    onClick={() => onPatchIssue({ issueId: activeIssue.id, status: "ignored" })}
                    disabled={activeIssue.status === "ignored"}
                  >
                    ignore
                  </Button>
                </div>
              </div>
            ) : null}
          </div>
        ) : (
          report ? <div className="rounded-2xl bg-success/[0.055] px-4 py-3 text-sm text-muted-foreground">There are no consistency issues to deal with on a case-by-case basis.</div> : null
        )}
    </section>
  );
}

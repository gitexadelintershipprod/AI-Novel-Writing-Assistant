import { useEffect, useMemo, useState } from "react";
import {
  DIRECTOR_ISSUE_ACTIONS,
  DIRECTOR_ISSUE_CATALOG,
  DIRECTOR_ISSUE_POLICY_PRESETS,
  findDirectorIssuePolicyPreset,
  type DirectorIssueAction,
  type DirectorIssueCategory,
  type DirectorIssuePolicy,
} from "@ai-novel/shared/types/directorIssue";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const ACTION_LABELS: Record<DirectorIssueAction, string> = {
  auto_retry: "Automatic retry",
  continue_with_warning: "Record reminder and continue",
  pause_for_manual: "Paused for processing",
  fail_task: "End current task",
};

const CATEGORY_LABELS: Record<DirectorIssueCategory, string> = {
  planning: "planning",
  generation: "generate",
  quality: "quality",
  runtime: "run",
};

export function AutoDirectorIssuePolicyCard(props: {
  policy?: DirectorIssuePolicy | null;
  isLoading: boolean;
  isSaving: boolean;
  onSave: (policy: DirectorIssuePolicy) => void;
}) {
  const { policy, isLoading, isSaving, onSave } = props;
  const [draft, setDraft] = useState<DirectorIssuePolicy | null>(null);
  const [category, setCategory] = useState<DirectorIssueCategory | "all">("all");
  const [action, setAction] = useState<DirectorIssueAction | "all">("all");

  useEffect(() => {
    if (policy) setDraft(policy);
  }, [policy]);

  const current = draft ?? policy;
  const hasChanges = Boolean(policy && current && (
    current.maxAutomaticRetries !== policy.maxAutomaticRetries
    || JSON.stringify(current.issueActions) !== JSON.stringify(policy.issueActions)
  ));
  const entries = useMemo(() => DIRECTOR_ISSUE_CATALOG.filter((entry) => {
    const selectedAction = current?.issueActions[entry.code] ?? entry.defaultAction;
    return (category === "all" || entry.category === category)
      && (action === "all" || selectedAction === action);
  }), [action, category, current]);

  if (!current) {
    return (
      <Card><CardHeader><CardTitle>Problem handling rules</CardTitle><CardDescription>{isLoading ? "Loading..." : "Could not load these rules right now."}</CardDescription></CardHeader></Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Problem handling rules</CardTitle>
        <CardDescription>Choose a set of solutions, or adjust them on a problem-by-problem basis. When security protection is triggered, the system will still prioritize protecting the work.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 md:grid-cols-2">
          {DIRECTOR_ISSUE_POLICY_PRESETS.map((preset) => {
            const selected = findDirectorIssuePolicyPreset(current)?.id === preset.id;
            return (
              <button
                key={preset.id}
                type="button"
                className={`rounded-xl border p-4 text-left transition-colors ${selected ? "border-primary bg-primary/5" : "border-border hover:bg-muted/40"}`}
                onClick={() => setDraft({ ...preset.policy, issueActions: { ...preset.policy.issueActions } })}
              >
                <div className="text-sm font-semibold">{preset.name}</div>
                <div className="mt-1 text-xs leading-5 text-muted-foreground">{preset.description}</div>
              </button>
            );
          })}
        </div>

        <div className="max-w-sm">
          <label className="space-y-2 text-sm">
            <span className="font-medium">Automatic retry</span>
            <select className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={current.maxAutomaticRetries} onChange={(event) => setDraft({ ...current, maxAutomaticRetries: Number(event.target.value) })}>
              <option value={0}>Do not automatically retry</option>
              <option value={1}>Maximum 1 time</option>
            </select>
          </label>
        </div>

        <div className="flex flex-wrap gap-2">
          <select className="h-9 rounded-md border bg-background px-3 text-sm" value={category} onChange={(event) => setCategory(event.target.value as DirectorIssueCategory | "all")}>
            <option value="all">all stages</option>
            {Object.entries(CATEGORY_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
          <select className="h-9 rounded-md border bg-background px-3 text-sm" value={action} onChange={(event) => setAction(event.target.value as DirectorIssueAction | "all")}>
            <option value="all">All actions</option>
            {DIRECTOR_ISSUE_ACTIONS.map((value) => <option key={value} value={value}>{ACTION_LABELS[value]}</option>)}
          </select>
        </div>

        {hasChanges ? (
          <div className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm leading-6 text-amber-950" role="status">
            You modified the problem handling rules. Saving will affect subsequent tasks; when security protection is triggered, the system will give priority to suspending or ending the task, and retain this selection for review.
          </div>
        ) : null}

        <div className="space-y-2">
          {entries.map((entry) => {
            const selected = current.issueActions[entry.code] ?? entry.defaultAction;
            return (
              <div key={entry.code} className="grid gap-2 rounded-md border p-3 md:grid-cols-[minmax(0,1fr)_220px]">
                <div className="min-w-0">
                  <div className="text-sm font-medium">{entry.label}</div>
                  <div className="mt-1 break-all text-xs text-muted-foreground">{entry.code} · Default:{ACTION_LABELS[entry.defaultAction]}</div>
                  {entry.lockedReason ? <div className="mt-1 text-xs text-amber-700">Safety tips: {entry.lockedReason}{entry.enforcedAction ? ` Still active when triggered: ${ACTION_LABELS[entry.enforcedAction]}.` : ""}</div> : null}
                </div>
                <select
                  className="h-9 rounded-md border bg-background px-3 text-sm"
                  value={selected}
                  onChange={(event) => setDraft({
                    ...current,
                    issueActions: { ...current.issueActions, [entry.code]: event.target.value as DirectorIssueAction },
                  })}
                >
                  {DIRECTOR_ISSUE_ACTIONS.map((value) => <option key={value} value={value}>{ACTION_LABELS[value]}</option>)}
                </select>
              </div>
            );
          })}
        </div>

        <Button disabled={isSaving} onClick={() => onSave(current)}>
          {isSaving ? "Saving…" : "Save problem handling rules"}
        </Button>
      </CardContent>
    </Card>
  );
}

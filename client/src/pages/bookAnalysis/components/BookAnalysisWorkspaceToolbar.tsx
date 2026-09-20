import type { BookAnalysisDetail } from "@ai-novel/shared/types/bookAnalysis";
import { Columns2, Pencil } from "lucide-react";
import { Link } from "react-router-dom";
import OpenInCreativeHubButton from "@/components/creativeHub/OpenInCreativeHubButton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatStatus, isBookAnalysisBudgetExceeded } from "../bookAnalysis.utils";

type ExportFormat = "markdown" | "json";

function formatTokenCount(value: number | null | undefined): string {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return "0";
  }
  return new Intl.NumberFormat("zh-CN").format(Math.max(0, Math.round(value)));
}

interface ToolbarPendingState {
  copy: boolean;
  rebuild: boolean;
  archive: boolean;
  publish: boolean;
  createStyleProfile: boolean;
  updateBudget: boolean;
  resumeWithBudget: boolean;
}

interface BookAnalysisWorkspaceToolbarProps {
  selectedAnalysis: BookAnalysisDetail;
  selectedNovelId: string;
  dualPaneAvailable: boolean;
  isDualPane: boolean;
  pending: ToolbarPendingState;
  onCopy: () => void;
  onRebuild: (analysisId: string) => void;
  onArchive: (analysisId: string) => void;
  onPublish: () => void;
  onCreateStyleProfile: () => void;
  onDownload: (format: ExportFormat) => void;
  onDualPaneChange: (enabled: boolean) => void;
  onOpenBudgetAdjust: () => void;
  onOpenBudgetResume: () => void;
}

export default function BookAnalysisWorkspaceToolbar(props: BookAnalysisWorkspaceToolbarProps) {
  const {
    selectedAnalysis,
    selectedNovelId,
    dualPaneAvailable,
    isDualPane,
    pending,
    onCopy,
    onRebuild,
    onArchive,
    onPublish,
    onCreateStyleProfile,
    onDownload,
    onDualPaneChange,
    onOpenBudgetAdjust,
    onOpenBudgetResume,
  } = props;

  const budgetTokens = selectedAnalysis.budgetTokens ?? null;
  const usedTokens = selectedAnalysis.usedTokens ?? 0;
  const budgetExceeded = isBookAnalysisBudgetExceeded(selectedAnalysis.lastError);
  const budgetResumeAvailable =
    budgetExceeded && (selectedAnalysis.status === "failed" || selectedAnalysis.status === "cancelled");
  const canAdjustBudget = selectedAnalysis.status !== "archived";

  return (
    <div className="overflow-hidden rounded-2xl border border-border/45 bg-card/70 shadow-[0_10px_32px_rgba(15,23,42,0.035)]">
      <div className="flex flex-col gap-4 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-sm font-semibold tracking-normal text-foreground">Results tools</h2>
            <Badge variant="secondary" className="border-0 bg-muted/70 font-normal">
              <span className={`mr-1.5 h-1.5 w-1.5 rounded-full ${selectedAnalysis.status === "succeeded" ? "bg-success" : "bg-muted-foreground/50"}`} />
              {formatStatus(selectedAnalysis.status)}
            </Badge>
            {selectedAnalysis.publishedDocumentId ? <Badge variant="secondary" className="border-0 font-normal">Published</Badge> : null}
            <Badge variant={budgetExceeded ? "destructive" : "secondary"} className="border-0 font-normal">
              Budget {budgetTokens
                ? `${formatTokenCount(usedTokens)}/${formatTokenCount(budgetTokens)}`
                : `${formatTokenCount(usedTokens)}/unlimited`}
            </Badge>
          </div>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            Reading the results is the current main task; publish, export, and maintain operations are available on demand.
          </p>
        </div>
        <div className="mobile-full-actions flex flex-wrap gap-2">
          {budgetResumeAvailable ? (
            <Button
              size="sm"
              variant="outline"
              onClick={onOpenBudgetResume}
              disabled={pending.resumeWithBudget || selectedAnalysis.status === "archived"}
            >
              {pending.resumeWithBudget ? "Submitting..." : "Expand budget and continue running"}
            </Button>
          ) : null}
          {dualPaneAvailable ? (
            <Button
              type="button"
              size="sm"
              variant={isDualPane ? "secondary" : "outline"}
              onClick={() => onDualPaneChange(!isDualPane)}
              title={isDualPane ? "Turn off two-column comparison" : "Open double column comparison"}
            >
              <Columns2 className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
              {isDualPane ? "Close double column" : "Original double column"}
            </Button>
          ) : null}
          <Button
            size="sm"
            variant="outline"
            onClick={onPublish}
            disabled={!selectedNovelId || pending.publish || selectedAnalysis.status === "archived"}
            title={!selectedNovelId ? 'Please select the target novel in "Analysis Information and Release" below' : "Post to novel knowledge base"}
          >
            {pending.publish ? "Publish..." : "Publish to knowledge base"}
          </Button>
          <Button asChild size="sm" variant="outline">
            <Link to={`/tasks?kind=book_analysis&id=${selectedAnalysis.id}`}>Mission details</Link>
          </Button>
          <OpenInCreativeHubButton
            bindings={{
              bookAnalysisId: selectedAnalysis.id,
              knowledgeDocumentIds: selectedAnalysis.documentId ? [selectedAnalysis.documentId] : [],
            }}
            label="Creative hub quotes"
          />
        </div>
      </div>

      <details className="border-t border-border/35 px-5 py-3">
        <summary className="cursor-pointer text-xs font-medium text-muted-foreground">More maintenance operations</summary>
        <div className="mobile-full-actions mt-3 flex flex-wrap gap-2">
          <Button size="sm" variant="outline" onClick={onCopy} disabled={pending.copy}>Replicate analysis</Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => onRebuild(selectedAnalysis.id)}
            disabled={pending.rebuild || selectedAnalysis.status === "archived"}
          >
            Regenerate
          </Button>
          {canAdjustBudget ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={onOpenBudgetAdjust}
              disabled={pending.updateBudget || pending.resumeWithBudget}
            >
              <Pencil className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
              Adjust budget
            </Button>
          ) : null}
          <Button size="sm" variant="outline" onClick={() => onDownload("markdown")}>Export MD</Button>
          <Button size="sm" variant="outline" onClick={() => onDownload("json")}>Export JSON</Button>
          <Button
            size="sm"
            variant="outline"
            onClick={onCreateStyleProfile}
            disabled={pending.createStyleProfile || selectedAnalysis.status === "archived"}
          >
            {pending.createStyleProfile ? "Generating writing method..." : "Generate writing"}
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => onArchive(selectedAnalysis.id)}
            disabled={pending.archive || selectedAnalysis.status === "archived"}
          >
            Archive
          </Button>
        </div>
      </details>
    </div>
  );
}

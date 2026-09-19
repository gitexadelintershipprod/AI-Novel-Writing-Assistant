import { useId, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface CreativeHubToolResultCardProps {
  toolName: string;
  summary: string;
  success: boolean;
  output?: Record<string, unknown>;
  errorCode?: string;
  onQuickAction?: (prompt: string) => void;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function asRecordArray(value: unknown): Record<string, unknown>[] {
  return Array.isArray(value)
    ? value.map((item) => asRecord(item)).filter((item) => Object.keys(item).length > 0)
    : [];
}

function itemLabel(item: Record<string, unknown>): string {
  const candidates = ["title", "name", "label", "summary", "content"];
  for (const key of candidates) {
    const value = item[key];
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }
  if (typeof item.id === "string" && item.id.trim()) {
    return item.id.trim();
  }
  return "Unnamed entry";
}

function compactText(value: string, max = 140): string {
  const normalized = value.replace(/\s+/g, " ").trim();
  if (!normalized) {
    return "";
  }
  return normalized.length > max ? `${normalized.slice(0, max)}...` : normalized;
}

function formatNovelProjectStatus(value: unknown): string | null {
  switch (value) {
    case "in_progress":
      return "in writing";
    case "not_started":
      return "Not Started";
    case "completed":
      return "Completed";
    case "rework":
      return "Rework in progress";
    case "blocked":
      return "blocked";
    default:
      return null;
  }
}

function renderActionButtons(actions: Array<{ label: string; prompt: string }>, onQuickAction?: (prompt: string) => void) {
  if (!onQuickAction || actions.length === 0) {
    return null;
  }
  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {actions.map((action) => (
        <Button
          key={`${action.label}-${action.prompt}`}
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onQuickAction(action.prompt)}
        >
          {action.label}
        </Button>
      ))}
    </div>
  );
}

function renderNovelList(output: Record<string, unknown>, onQuickAction?: (prompt: string) => void) {
  const total = typeof output.total === "number" ? output.total : null;
  const items = asRecordArray(output.items).slice(0, 8);
  return (
    <div className="space-y-2">
      <div className="text-xs text-muted-foreground">
        Found {total ?? items.length} novels
        {total != null && total > items.length ? `, showing the first ${items.length}` : ""}
      </div>
      <div className="space-y-2">
        {items.map((item) => {
          const title = itemLabel(item);
          const chapterCount = typeof item.chapterCount === "number" ? item.chapterCount : null;
          const projectStatus = formatNovelProjectStatus(item.projectStatus);
          return (
            <div key={`${item.id ?? title}`} className="rounded-md border border-border bg-muted/20 px-3 py-2">
              <div className="text-sm font-medium text-foreground">{title}</div>
              <div className="mt-1 text-xs text-muted-foreground">
                {chapterCount != null ? `${chapterCount} chapters` : "Chapter unknown"}
                {projectStatus ? ` · ${projectStatus}` : ""}
              </div>
              {onQuickAction ? (
                <div className="mt-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => onQuickAction(`Set "${title}" as the current workspace`)}
                  >
                    Set as current workspace
                  </Button>
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function renderWorkspaceCard(
  output: Record<string, unknown>,
  variant: "created" | "selected",
  onQuickAction?: (prompt: string) => void,
) {
  const title = typeof output.title === "string" && output.title.trim() ? output.title.trim() : "Untitled novel";
  const chapterCount = typeof output.chapterCount === "number" ? output.chapterCount : 0;
  const actions = variant === "created"
    ? [
      { label: "View current progress", prompt: "Which chapter is this book currently on?" },
      { label: "Start designing the first chapter", prompt: "Planning the first chapter of the book" },
    ]
    : [
      { label: "View current progress", prompt: "Which chapter is this book currently on?" },
      { label: "View the first two chapters", prompt: "What was written in the first two chapters?" },
    ];
  return (
    <div className="space-y-2">
      <div className="rounded-md border border-success/30 bg-success/5 px-3 py-3">
        <div className="text-sm font-medium text-foreground">{title}</div>
        <div className="mt-1 text-xs text-muted-foreground">
          {variant === "created" ? "A new novel is created and bound to the current thread." : "The current thread has been switched to the novel workspace."}
        </div>
        <div className="mt-2 text-xs text-muted-foreground">Current chapter count: {chapterCount}</div>
      </div>
      {renderActionButtons(actions, onQuickAction)}
    </div>
  );
}

function renderWorldBindingCard(output: Record<string, unknown>, onQuickAction?: (prompt: string) => void) {
  const novelTitle = typeof output.novelTitle === "string" && output.novelTitle.trim()
    ? output.novelTitle.trim()
    : "current novel";
  const worldName = typeof output.worldName === "string" && output.worldName.trim()
    ? output.worldName.trim()
    : "Unnamed world view";
  return (
    <div className="space-y-2">
      <div className="rounded-md border border-info/30 bg-info/5 px-3 py-3">
        <div className="text-sm font-medium text-foreground">{novelTitle}</div>
        <div className="mt-1 text-xs text-muted-foreground">Bound to the world "{worldName}".</div>
      </div>
      {renderActionButtons([
        { label: "View worldview constraints", prompt: "View the worldview rules of the current novel" },
        { label: "Check for worldview conflicts", prompt: "Check if there is any conflict between the current novel and the worldview" },
      ], onQuickAction)}
    </div>
  );
}

function renderProductionAssetCard(
  title: string,
  description: string,
  actions: Array<{ label: string; prompt: string }>,
  onQuickAction?: (prompt: string) => void,
) {
  return (
    <div className="space-y-2">
      <div className="rounded-md border border-primary/25 bg-primary/5 px-3 py-3">
        <div className="text-sm font-medium text-foreground">{title}</div>
        <div className="mt-1 text-xs leading-5 text-muted-foreground">{description}</div>
      </div>
      {renderActionButtons(actions, onQuickAction)}
    </div>
  );
}

function renderProductionStatusCard(output: Record<string, unknown>, onQuickAction?: (prompt: string) => void) {
  const title = typeof output.title === "string" && output.title.trim() ? output.title.trim() : "current novel";
  const currentStage = typeof output.currentStage === "string" ? output.currentStage.trim() : "unknown stage";
  const chapterCount = typeof output.chapterCount === "number" ? output.chapterCount : 0;
  const targetChapterCount = typeof output.targetChapterCount === "number" ? output.targetChapterCount : null;
  const pipelineStatus = typeof output.pipelineStatus === "string" && output.pipelineStatus.trim()
    ? output.pipelineStatus.trim()
    : "Not started";
  const assetStages = asRecordArray(output.assetStages);
  return (
    <div className="space-y-2">
      <div className="rounded-md border border-info/30 bg-info/5 px-3 py-3">
        <div className="text-sm font-medium text-foreground">{title}</div>
        <div className="mt-1 text-xs text-muted-foreground">Current stage: {currentStage}</div>
        <div className="mt-1 text-xs text-muted-foreground">
          Chapter list: {targetChapterCount != null ? `${chapterCount}/${targetChapterCount}` : chapterCount} chapters
        </div>
        <div className="mt-1 text-xs text-muted-foreground">Full-book writing: {pipelineStatus}</div>
        {typeof output.failureSummary === "string" && output.failureSummary.trim() ? (
          <div className="mt-2 text-xs leading-5 text-muted-foreground">Failure summary: {output.failureSummary.trim()}</div>
        ) : null}
      </div>
      {assetStages.length > 0 ? (
        <div className="grid gap-2">
          {assetStages.slice(0, 8).map((stage) => (
            <div key={`${stage.key ?? stage.label}`} className="rounded-md border border-border bg-muted/20 px-3 py-2">
              <div className="text-sm font-medium text-foreground">{String(stage.label ?? stage.key ?? "stage")}</div>
              <div className="mt-1 text-xs text-muted-foreground">Status: {String(stage.status ?? "unknown")}</div>
              {typeof stage.detail === "string" && stage.detail.trim() ? (
                <div className="mt-1 text-xs text-muted-foreground">{stage.detail.trim()}</div>
              ) : null}
            </div>
          ))}
        </div>
      ) : null}
      {renderActionButtons([
        { label: "Check the progress of the entire book", prompt: "At what stage has the entire book been generated?" },
      ], onQuickAction)}
    </div>
  );
}

function renderPipelineRunCard(
  toolName: "preview_pipeline_run" | "queue_pipeline_run",
  output: Record<string, unknown>,
  onQuickAction?: (prompt: string) => void,
) {
  const startOrder = typeof output.startOrder === "number" ? output.startOrder : null;
  const endOrder = typeof output.endOrder === "number" ? output.endOrder : null;
  const jobId = typeof output.jobId === "string" && output.jobId.trim() ? output.jobId.trim() : null;
  const scope = startOrder != null && endOrder != null
    ? startOrder === endOrder
      ? `Chapter ${startOrder}`
      : `Chapters ${startOrder}–${endOrder}`
    : "Current chapter scope";
  const title = toolName === "preview_pipeline_run" ? "Full writing preview" : "Whole writing assignment";
  const description = toolName === "preview_pipeline_run"
    ? `${scope} full-book writing preview is ready for approval or further diagnosis.`
    : `${scope} full-book writing task has started${jobId ? ` (task ${jobId})` : ""}.`;
  const actions = toolName === "preview_pipeline_run"
    ? [
      { label: "Check the progress of the entire book", prompt: "At what stage has the entire book been generated?" },
      { label: "View blocking", prompt: "Why does the entire build not start?" },
    ]
    : [
      { label: "Check the progress of the entire book", prompt: "At what stage has the entire book been generated?" },
      { label: "View task status", prompt: "List current system task status" },
    ];
  return renderProductionAssetCard(title, description, actions, onQuickAction);
}

function renderDiagnosticCard(output: Record<string, unknown>, onQuickAction?: (prompt: string) => void) {
  const failureSummary = typeof output.failureSummary === "string" ? output.failureSummary : "";
  const failureDetails = typeof output.failureDetails === "string" ? output.failureDetails : "";
  const recoveryHint = typeof output.recoveryHint === "string" ? output.recoveryHint : "";
  return (
    <div className="space-y-2">
      {failureSummary ? <div className="text-sm font-medium text-foreground">{failureSummary}</div> : null}
      {failureDetails ? <div className="text-xs leading-5 text-muted-foreground">Details: {failureDetails}</div> : null}
      {recoveryHint ? <div className="text-xs leading-5 text-muted-foreground">Suggestion: {recoveryHint}</div> : null}
      {renderActionButtons([
        { label: "continue diagnosis", prompt: "Continue to explain the cause of failure and recovery recommendations" },
        { label: "View task status", prompt: "List current system task status" },
      ], onQuickAction)}
    </div>
  );
}

function renderListCard(
  output: Record<string, unknown>,
  emptyLabel: string,
  onQuickAction?: (prompt: string) => void,
) {
  const items = asRecordArray(output.items).slice(0, 6);
  if (items.length === 0) {
    return <div className="text-xs text-muted-foreground">{emptyLabel}</div>;
  }
  return (
    <div className="space-y-2">
      <div className="space-y-2">
        {items.map((item) => (
          <div key={`${item.id ?? itemLabel(item)}`} className="rounded-md border border-border bg-muted/20 px-3 py-2">
            <div className="text-sm font-medium text-foreground">{itemLabel(item)}</div>
            {"status" in item && typeof item.status === "string" ? (
              <div className="mt-1 text-xs text-muted-foreground">Status: {item.status}</div>
            ) : null}
          </div>
        ))}
      </div>
      {renderActionButtons([{ label: "Continue filtering", prompt: "Continue to refine this list of results" }], onQuickAction)}
    </div>
  );
}

function renderChapterCard(output: Record<string, unknown>, onQuickAction?: (prompt: string) => void) {
  const title = typeof output.title === "string" && output.title.trim() ? output.title.trim() : "";
  const order = typeof output.order === "number" ? output.order : null;
  const content = typeof output.content === "string"
    ? output.content
    : typeof output.summary === "string"
      ? output.summary
      : "";
  return (
    <div className="space-y-2">
      <div className="text-sm font-medium text-foreground">
        {order != null ? `Chapter ${order}` : "Chapter content"}
        {title ? ` "${title}"` : ""}
      </div>
      <div className="rounded-md border border-border bg-muted/20 px-3 py-3 text-sm leading-6 text-muted-foreground">
        {content || "There is currently no chapter content to display."}
      </div>
      {renderActionButtons([
        { label: "Continue to summarize", prompt: "Summarize the key plot of this paragraph" },
        { label: "Check for conflicts", prompt: "Check whether this chapter conflicts with the world view or the previous text" },
      ], onQuickAction)}
    </div>
  );
}

export default function CreativeHubToolResultCard({
  toolName,
  summary,
  success,
  output,
  errorCode,
  onQuickAction,
}: CreativeHubToolResultCardProps) {
  const [expanded, setExpanded] = useState(false);
  const detailsId = useId();
  const payload = asRecord(output);
  const summaryText = compactText(summary, 160) || "The tool has returned results.";
  const cardContent = (() => {
    if (toolName === "list_novels") {
      return renderNovelList(payload, onQuickAction);
    }
    if (toolName === "create_novel") {
      return renderWorkspaceCard(payload, "created", onQuickAction);
    }
    if (toolName === "select_novel_workspace") {
      return renderWorkspaceCard(payload, "selected", onQuickAction);
    }
    if (toolName === "bind_world_to_novel") {
      return renderWorldBindingCard(payload, onQuickAction);
    }
    if (toolName === "generate_world_for_novel") {
      const worldName = typeof payload.worldName === "string" && payload.worldName.trim() ? payload.worldName.trim() : "Unnamed world view";
      return renderProductionAssetCard(
        "World view has been generated",
        `A world named "${worldName}" has been generated.`,
        [
          { label: "Check production progress", prompt: "At what stage has the entire book been generated?" },
        ],
        onQuickAction,
      );
    }
    if (toolName === "generate_novel_characters") {
      const characterCount = typeof payload.characterCount === "number" ? payload.characterCount : 0;
      return renderProductionAssetCard(
        "Core roles have been generated",
        `Generated ${characterCount} core characters.`,
        [
          { label: "View character status", prompt: "View current novel character status" },
        ],
        onQuickAction,
      );
    }
    if (toolName === "generate_story_bible") {
      return renderProductionAssetCard(
        "Novel Bible has been generated",
        typeof payload.mainPromise === "string" && payload.mainPromise.trim()
          ? payload.mainPromise.trim()
          : "The current novel Bible has been generated.",
        [
          { label: "Check the progress of the entire book", prompt: "At what stage has the entire book been generated?" },
        ],
        onQuickAction,
      );
    }
    if (toolName === "generate_novel_outline") {
      return renderProductionAssetCard(
        "The development trend has been generated",
        typeof payload.outline === "string" && payload.outline.trim()
          ? payload.outline.trim()
          : "The current development trend of the novel has been generated.",
        [
          { label: "Check the progress of the entire book", prompt: "At what stage has the entire book been generated?" },
        ],
        onQuickAction,
      );
    }
    if (toolName === "generate_structured_outline") {
      const targetChapterCount = typeof payload.targetChapterCount === "number" ? payload.targetChapterCount : 0;
      return renderProductionAssetCard(
        "Structured outline generated",
        targetChapterCount > 0 ? `Generated a structured outline of ${targetChapterCount} chapters.` : "The structured outline of the current novel has been generated.",
        [
          { label: "Check the progress of the entire book", prompt: "At what stage has the entire book been generated?" },
        ],
        onQuickAction,
      );
    }
    if (toolName === "sync_chapters_from_structured_outline") {
      const chapterCount = typeof payload.chapterCount === "number" ? payload.chapterCount : 0;
      return renderProductionAssetCard(
        "Chapter table of contents has been synchronized",
        chapterCount > 0 ? `Synced ${chapterCount} chapter listings.` : "Chapter table of contents has been synchronized.",
        [
          { label: "Check the progress of the entire book", prompt: "At what stage has the entire book been generated?" },
          { label: "View task status", prompt: "List current system task status" },
        ],
        onQuickAction,
      );
    }
    if (toolName === "start_full_novel_pipeline" || toolName === "get_novel_production_status") {
      return renderProductionStatusCard(payload, onQuickAction);
    }
    if (toolName === "preview_pipeline_run" || toolName === "queue_pipeline_run") {
      return renderPipelineRunCard(toolName, payload, onQuickAction);
    }
    if (
      toolName === "get_task_failure_reason"
      || toolName === "get_run_failure_reason"
      || toolName === "get_index_failure_reason"
      || toolName === "get_book_analysis_failure_reason"
      || toolName === "explain_generation_blocker"
      || toolName === "explain_world_conflict"
      || toolName === "failure_diagnostic"
    ) {
      return renderDiagnosticCard(payload, onQuickAction);
    }
    if (
      toolName === "list_worlds"
      || toolName === "list_tasks"
      || toolName === "list_knowledge_documents"
      || toolName === "list_book_analyses"
      || toolName === "list_writing_formulas"
      || toolName === "list_base_characters"
    ) {
      return renderListCard(payload, "There are currently no results to display.", onQuickAction);
    }
    if (
      toolName === "get_chapter_content"
      || toolName === "get_chapter_content_by_order"
      || toolName === "summarize_chapter_range"
    ) {
      return renderChapterCard(payload, onQuickAction);
    }
    return null;
  })();

  if (!cardContent) {
    return null;
  }

  return (
    <div className="mt-3 rounded-md border border-border bg-muted/20 px-4 py-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <div className="text-sm font-medium text-foreground">{summaryText}</div>
          <Badge variant={success ? "secondary" : "destructive"}>{success ? "Parsed results" : "Execution failed"}</Badge>
        </div>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => setExpanded((value) => !value)}
          aria-expanded={expanded}
          aria-controls={detailsId}
        >
          {expanded ? "Collapse details" : "Expand details"}
        </Button>
      </div>
      {expanded ? (
        <div id={detailsId} className="mt-3 space-y-3">
          {!success && errorCode ? (
            <div className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-muted-foreground">
              Error code: {errorCode}
            </div>
          ) : null}
          {cardContent}
        </div>
      ) : (
        <div className="mt-2 text-xs text-muted-foreground">Detailed execution results are hidden by default and can be viewed on demand.</div>
      )}
    </div>
  );
}

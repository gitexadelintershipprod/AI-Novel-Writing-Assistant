import type { TaskKind, TaskStatus } from "@ai-novel/shared/types/task";
import { Input } from "@/components/ui/input";
import type { TaskSortMode } from "../taskCenterUtils";
import SelectControl from "@/components/common/SelectControl";

interface TaskCenterFilterPanelProps {
  kind: TaskKind | "";
  status: TaskStatus | "";
  keyword: string;
  onlyAnomaly: boolean;
  sortMode: TaskSortMode;
  onKindChange: (value: TaskKind | "") => void;
  onStatusChange: (value: TaskStatus | "") => void;
  onKeywordChange: (value: string) => void;
  onOnlyAnomalyChange: (value: boolean) => void;
  onSortModeChange: (value: TaskSortMode) => void;
}

export default function TaskCenterFilterPanel({
  kind,
  status,
  keyword,
  onlyAnomaly,
  sortMode,
  onKindChange,
  onStatusChange,
  onKeywordChange,
  onOnlyAnomalyChange,
  onSortModeChange,
}: TaskCenterFilterPanelProps) {
  return (
    <section aria-label="Filter running records" className="task-filter-card rounded-2xl bg-muted/20 px-4 py-3">
      <div className="task-filter-controls grid min-w-0 gap-2 sm:grid-cols-2 xl:grid-cols-[150px_150px_auto_minmax(220px,1fr)_220px] xl:items-center">
        <SelectControl
          aria-label="Filter by task type"
          className="task-filter-kind col-start-1 row-start-1 h-10 w-full rounded-xl border-border/45 bg-background px-3 text-sm xl:col-start-auto xl:row-start-auto"
          value={kind}
          onChange={(event) => onKindChange(event.target.value as TaskKind | "")}
        >
          <option value="">All types</option>
          <option value="book_analysis">Book split analysis</option>
          <option value="novel_workflow">Novel creation</option>
          <option value="novel_pipeline">Novel assembly line</option>
          <option value="knowledge_document">Knowledge base index</option>
          <option value="image_generation">Image generation</option>
          <option value="style_extraction">Writing extraction</option>
          <option value="agent_run">Agent running</option>
        </SelectControl>
        <SelectControl
          aria-label="Filter by task status"
          className="task-filter-status col-start-2 row-start-1 h-10 w-full rounded-xl border-border/45 bg-background px-3 text-sm xl:col-start-auto xl:row-start-auto"
          value={status}
          onChange={(event) => onStatusChange(event.target.value as TaskStatus | "")}
        >
          <option value="">All status</option>
          <option value="queued">Queuing</option>
          <option value="running">Running</option>
          <option value="waiting_approval">Waiting for approval</option>
          <option value="failed">failed</option>
          <option value="cancelled">Canceled</option>
          <option value="succeeded">Completed</option>
        </SelectControl>
        <label
          data-active={onlyAnomaly}
          className="task-filter-pill col-start-3 row-start-1 flex h-10 cursor-pointer items-center justify-center gap-2 rounded-full bg-background px-4 text-sm text-muted-foreground transition-colors hover:bg-muted data-[active=true]:bg-destructive/10 data-[active=true]:text-destructive xl:col-start-auto xl:row-start-auto"
        >
          <input
            type="checkbox"
            className="sr-only"
            checked={onlyAnomaly}
            onChange={(event) => onOnlyAnomalyChange(event.target.checked)}
          />
          Only see what needs to be processed
        </label>
        <Input
          aria-label="Search by title or related objects"
          className="task-filter-keyword col-span-2 col-start-1 row-start-2 h-10 rounded-xl border-border/45 bg-background px-3 xl:col-span-1 xl:col-start-auto xl:row-start-auto"
          value={keyword}
          onChange={(event) => onKeywordChange(event.target.value)}
          placeholder="Title or associated object"
        />
        <SelectControl
          aria-label="How to sort tasks"
          className="task-filter-sort col-start-3 row-start-2 h-10 w-full rounded-xl border-border/45 bg-background px-3 text-sm xl:col-start-auto xl:row-start-auto"
          value={sortMode}
          onChange={(event) => onSortModeChange(event.target.value as TaskSortMode)}
        >
          <option value="updated_desc">Sort by update time: latest first</option>
          <option value="updated_asc">Sort by update time: oldest first</option>
          <option value="heartbeat_desc">Sort by most recent heartbeat: newest first</option>
          <option value="heartbeat_asc">Sort by most recent heartbeat: earliest first</option>
          <option value="default">Default sorting: need to be processed first</option>
        </SelectControl>
      </div>
    </section>
  );
}

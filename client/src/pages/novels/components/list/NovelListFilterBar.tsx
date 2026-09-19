import { Search, SlidersHorizontal } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { StatusFilter, WritingModeFilter } from "./novelListViewModel";

export function NovelListFilterBar(props: {
  status: StatusFilter;
  writingMode: WritingModeFilter;
  onStatusChange: (status: StatusFilter) => void;
  onWritingModeChange: (mode: WritingModeFilter) => void;
  view?: "shelf" | "workbench";
  search?: string;
  onSearchChange?: (value: string) => void;
  narrativeForm?: "all" | "short_story" | "long_novel";
  onNarrativeFormChange?: (value: "all" | "short_story" | "long_novel") => void;
  sort?: "updated" | "created" | "progress";
  onSortChange?: (value: "updated" | "created" | "progress") => void;
}) {
  const isShelf = props.view === "shelf";
  if (isShelf) {
    return (
      <section className="flex flex-wrap items-center gap-3 border-b border-border/60 pb-4">
        {props.onSearchChange ? (
          <label className="relative min-w-[220px] flex-1 sm:max-w-md">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <Input value={props.search ?? ""} onChange={(event) => props.onSearchChange?.(event.target.value)} placeholder="Search the title or introduction of the work" className="h-10 pl-9" />
          </label>
        ) : null}
        {props.onNarrativeFormChange ? (
          <Select value={props.narrativeForm ?? "all"} onValueChange={(value) => props.onNarrativeFormChange?.(value as "all" | "short_story" | "long_novel")}>
            <SelectTrigger className="h-10 w-[120px] rounded-lg shadow-none"><SelectValue placeholder="Work form" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All forms</SelectItem>
              <SelectItem value="long_novel">Long story</SelectItem>
              <SelectItem value="short_story">short story</SelectItem>
            </SelectContent>
          </Select>
        ) : null}
        {props.onSortChange ? (
          <Select value={props.sort ?? "updated"} onValueChange={(value) => props.onSortChange?.(value as "updated" | "created" | "progress")}>
            <SelectTrigger className="h-10 w-[132px] rounded-lg shadow-none"><SelectValue placeholder="sort" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="updated">Recently edited</SelectItem>
              <SelectItem value="created">Recently created</SelectItem>
              <SelectItem value="progress">Completeness</SelectItem>
            </SelectContent>
          </Select>
        ) : null}
      </section>
    );
  }
  return (
    <section className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 pb-4">
      {isShelf && props.onSearchChange ? (
        <label className="relative min-w-[220px] flex-1 sm:max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <Input value={props.search ?? ""} onChange={(event) => props.onSearchChange?.(event.target.value)} placeholder="Search the title or introduction of the work" className="pl-9" />
        </label>
      ) : null}
      <div className="flex flex-wrap items-center gap-3">
      <FilterGroup label="Status">
        <SegmentButton active={props.status === "all"} onClick={() => props.onStatusChange("all")}>All</SegmentButton>
        <SegmentButton active={props.status === "draft"} onClick={() => props.onStatusChange("draft")}>Draft</SegmentButton>
        <SegmentButton active={props.status === "published"} onClick={() => props.onStatusChange("published")}>Published</SegmentButton>
      </FilterGroup>
      <FilterGroup label="Type">
        <SegmentButton active={props.writingMode === "all"} onClick={() => props.onWritingModeChange("all")}>All</SegmentButton>
        <SegmentButton active={props.writingMode === "original"} onClick={() => props.onWritingModeChange("original")}>Original</SegmentButton>
        <SegmentButton active={props.writingMode === "continuation"} onClick={() => props.onWritingModeChange("continuation")}>Continue writing</SegmentButton>
      </FilterGroup>
      {isShelf && props.onNarrativeFormChange ? (
        <FilterGroup label="form">
          <SegmentButton active={props.narrativeForm === "all"} onClick={() => props.onNarrativeFormChange?.("all")}>All</SegmentButton>
          <SegmentButton active={props.narrativeForm === "long_novel"} onClick={() => props.onNarrativeFormChange?.("long_novel")}>Long story</SegmentButton>
          <SegmentButton active={props.narrativeForm === "short_story"} onClick={() => props.onNarrativeFormChange?.("short_story")}>short story</SegmentButton>
        </FilterGroup>
      ) : null}
      {isShelf && props.onSortChange ? (
        <FilterGroup label="sort">
          <SegmentButton active={props.sort === "updated"} onClick={() => props.onSortChange?.("updated")}><SlidersHorizontal className="mr-1 h-3.5 w-3.5" aria-hidden="true" />Recently edited</SegmentButton>
          <SegmentButton active={props.sort === "created"} onClick={() => props.onSortChange?.("created")}>Recently created</SegmentButton>
          <SegmentButton active={props.sort === "progress"} onClick={() => props.onSortChange?.("progress")}>Completeness</SegmentButton>
        </FilterGroup>
      ) : null}
      </div>
    </section>
  );
}

function FilterGroup(props: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-sm text-muted-foreground">{props.label}</span>
      <div className="inline-flex rounded-lg bg-muted/35 p-1">{props.children}</div>
    </div>
  );
}

function SegmentButton(props: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <Button
      type="button"
      size="sm"
      variant={props.active ? "default" : "ghost"}
      className="h-8 rounded-md px-3"
      onClick={props.onClick}
    >
      {props.children}
    </Button>
  );
}

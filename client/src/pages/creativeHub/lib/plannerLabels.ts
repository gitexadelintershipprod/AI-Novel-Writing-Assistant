const INTENT_LABELS: Record<string, string> = {
  social_opening: "light opening",
  list_novels: "list novels",
  list_worlds: "list worldview",
  query_task_status: "Query task status",
  create_novel: "Create a novel",
  select_novel_workspace: "Switch novel workspace",
  bind_world_to_novel: "Bind the worldview to the novel",
  unbind_world_from_novel: "Unbinding the worldview of the novel",
  produce_novel: "Whole production",
  query_novel_production_status: "Check the entire production status",
  query_novel_title: "Query novel title",
  query_chapter_content: "Query chapter content",
  query_progress: "Check creation progress",
  inspect_failure_reason: "Diagnosis failure reason",
  write_chapter: "Writing Chapters",
  rewrite_chapter: "rewrite chapter",
  save_chapter_draft: "Save Chapter Draft",
  start_pipeline: "Start the pipeline",
  inspect_characters: "View role planning",
  inspect_timeline: "View timeline",
  inspect_world: "View world view",
  search_knowledge: "Search knowledge base",
  ideate_novel_setup: "Generate settings alternatives",
  general_chat: "general conversation",
  unknown: "Unrecognized intent",
};

const PLANNER_SOURCE_LABELS: Record<string, string> = {
  llm: "Large model recognition",
  unknown: "unknown source",
};

function formatBilingualLabel(label: string, rawValue: string) {
  return `${label}（${rawValue}）`;
}

export function getIntentDisplayLabel(intent: unknown): string {
  const rawValue = typeof intent === "string" && intent.trim() ? intent.trim() : "unknown";
  const label = INTENT_LABELS[rawValue] ?? "Unmapped intent";
  return formatBilingualLabel(label, rawValue);
}

export function getPlannerSourceDisplayLabel(source: unknown): string {
  const rawValue = typeof source === "string" && source.trim() ? source.trim() : "unknown";
  const label = PLANNER_SOURCE_LABELS[rawValue] ?? "Unmapped source";
  return formatBilingualLabel(label, rawValue);
}

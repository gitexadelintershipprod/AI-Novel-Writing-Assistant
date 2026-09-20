import type { WorkflowActionDefinition, WorkflowDefinition } from "./workflowTypes";
import { resolveChapterOrder } from "./workflowTypes";

export const generalWorkflowDefinitions: WorkflowDefinition[] = [
  {
    id: "social_opening",
    intent: "social_opening",
    kind: "single",
    resolve: () => [],
  },
  {
    id: "list_novels",
    intent: "list_novels",
    kind: "single",
    resolve: ({ intent }) => [{
      agent: "Planner",
      tool: "list_novels",
      reason: "Read the novel list",
      input: intent.novelTitle ? { query: intent.novelTitle, limit: 10 } : { limit: 10 },
      keyPrefix: intent.novelTitle ? `list_novels_${intent.novelTitle}` : "list_novels",
    }],
  },
  {
    id: "list_base_characters",
    intent: "list_base_characters",
    kind: "single",
    resolve: () => [{
      agent: "Planner",
      tool: "list_base_characters",
      reason: "Read the basic character library list",
      input: { limit: 20 },
      keyPrefix: "list_base_characters",
    }],
  },
  {
    id: "list_worlds",
    intent: "list_worlds",
    kind: "single",
    resolve: () => [{
      agent: "Planner",
      tool: "list_worlds",
      reason: "Read the world list",
      input: { limit: 10 },
      keyPrefix: "list_worlds",
    }],
  },
  {
    id: "query_task_status",
    intent: "query_task_status",
    kind: "single",
    resolve: () => [{
      agent: "Planner",
      tool: "list_tasks",
      reason: "Read current system task status",
      input: { limit: 10 },
      keyPrefix: "list_tasks",
    }],
  },
  {
    id: "select_novel_workspace",
    intent: "select_novel_workspace",
    kind: "workflow",
    resolve: ({ intent, plannerInput }) => {
      if (plannerInput.contextMode === "novel" && plannerInput.novelId) {
        return [{
          agent: "Planner",
          tool: "select_novel_workspace",
          reason: "Bind the current novel as the workspace",
          input: { novelId: plannerInput.novelId },
          keyPrefix: "select_current_novel",
        }];
      }
      return [{
        agent: "Planner",
        tool: "select_novel_workspace",
        reason: intent.novelTitle ? `Set "${intent.novelTitle}" as the current workspace` : "Switch the current workspace novel",
        input: intent.novelTitle ? { title: intent.novelTitle } : {},
        keyPrefix: intent.novelTitle ? `select_novel_${intent.novelTitle}` : "select_novel_workspace",
      }];
    },
  },
  {
    id: "query_novel_title",
    intent: "query_novel_title",
    kind: "single",
    resolve: ({ plannerInput }) => [{
      agent: "Planner",
      tool: "get_novel_context",
      reason: "Read the novel title",
      input: { novelId: plannerInput.novelId },
      keyPrefix: "novel_context_title",
    }],
  },
  {
    id: "query_progress",
    intent: "query_progress",
    kind: "single",
    resolve: ({ plannerInput }) => [{
      agent: "Planner",
      tool: "get_novel_production_status",
      reason: "Read novel fact progress",
      input: { novelId: plannerInput.novelId },
      keyPrefix: "novel_fact_progress",
    }],
  },
  {
    id: "inspect_failure_reason",
    intent: "inspect_failure_reason",
    kind: "single",
    resolve: ({ intent, plannerInput }) => {
      const chapterOrder = resolveChapterOrder(intent);
      const actions: WorkflowActionDefinition[] = [];
      if (plannerInput.currentRunId) {
        actions.push({
          agent: "Planner",
          tool: "get_run_failure_reason",
          reason: "Read why the current run failed",
          input: { runId: plannerInput.currentRunId },
          keyPrefix: "run_failure_reason",
        });
      }
      if (plannerInput.novelId) {
        actions.push({
          agent: "Planner",
          tool: "explain_generation_blocker",
          reason: chapterOrder != null
            ? `Diagnose why chapter ${chapterOrder} generation is blocked`
            : "Diagnose why this novel's latest generation is blocked",
          input: chapterOrder != null
            ? { novelId: plannerInput.novelId, chapterOrder, runId: plannerInput.currentRunId }
            : { novelId: plannerInput.novelId, runId: plannerInput.currentRunId },
          keyPrefix: chapterOrder != null ? `generation_blocker_${chapterOrder}` : "generation_blocker",
        });
      }
      return actions;
    },
  },
  {
    id: "inspect_characters",
    intent: "inspect_characters",
    kind: "single",
    resolve: ({ plannerInput }) => [{
      agent: "Reviewer",
      tool: "get_character_states",
      reason: "Read character state",
      input: { novelId: plannerInput.novelId },
      keyPrefix: "character_states",
    }],
  },
  {
    id: "inspect_timeline",
    intent: "inspect_timeline",
    kind: "single",
    resolve: ({ plannerInput }) => [{
      agent: "Continuity",
      tool: "get_timeline_facts",
      reason: "Read timeline facts",
      input: { novelId: plannerInput.novelId, limit: 30 },
      keyPrefix: "timeline_facts",
    }],
  },
  {
    id: "inspect_world",
    intent: "inspect_world",
    kind: "single",
    resolve: ({ plannerInput }) => [{
      agent: "Continuity",
      tool: "get_world_constraints",
      reason: "Read world rules",
      input: { novelId: plannerInput.novelId },
      keyPrefix: "world_constraints",
    }],
  },
  {
    id: "search_knowledge",
    intent: "search_knowledge",
    kind: "single",
    resolve: ({ intent, plannerInput }) => [{
      agent: "Planner",
      tool: "search_knowledge",
      reason: "Run knowledge retrieval",
      input: {
        query: intent.goal,
        ...(plannerInput.novelId ? { novelId: plannerInput.novelId } : {}),
        ...(plannerInput.worldId ? { worldId: plannerInput.worldId } : {}),
      },
      keyPrefix: "knowledge_search",
    }],
  },
  {
    id: "ideate_novel_setup",
    intent: "ideate_novel_setup",
    kind: "workflow",
    resolve: ({ plannerInput }) => [{
      agent: "Planner",
      tool: "get_novel_context",
      reason: "Read the current novel overview as basic setup information",
      input: { novelId: plannerInput.novelId },
      keyPrefix: "setup_ideation_context",
    }, {
      agent: "Planner",
      tool: "get_story_bible",
      reason: "Read the current novel bible and add existing setting constraints",
      input: { novelId: plannerInput.novelId },
      keyPrefix: "setup_ideation_bible",
    }, {
      agent: "Planner",
      tool: "get_world_constraints",
      reason: "Read the current novel's bound-world constraints",
      input: { novelId: plannerInput.novelId },
      keyPrefix: "setup_ideation_world",
    }],
  },
  {
    id: "general_chat",
    intent: "general_chat",
    kind: "single",
    resolve: () => [],
  },
  {
    id: "unknown",
    intent: "unknown",
    kind: "single",
    resolve: () => [],
  },
];

import type { WorkflowDefinition } from "./workflowTypes";

export const directorWorkflowDefinitions: WorkflowDefinition[] = [
  {
    id: "analyze_director_workspace",
    intent: "analyze_director_workspace",
    kind: "single",
    requiresNovelContext: true,
    resolve: ({ plannerInput }) => [{
      agent: "Planner",
      tool: "analyze_director_workspace",
      reason: "Analyze the current novel workspace through Auto-Director runtime",
      input: { novelId: plannerInput.novelId },
      keyPrefix: "director_workspace_analysis",
    }],
  },
  {
    id: "query_director_status",
    intent: "query_director_status",
    kind: "single",
    requiresNovelContext: true,
    resolve: ({ plannerInput }) => [{
      agent: "Planner",
      tool: "get_director_run_status",
      reason: "Read Auto-Director running status",
      input: { novelId: plannerInput.novelId },
      keyPrefix: "director_run_status",
    }],
  },
  {
    id: "explain_director_next_action",
    intent: "explain_director_next_action",
    kind: "single",
    requiresNovelContext: true,
    resolve: ({ plannerInput }) => [{
      agent: "Planner",
      tool: "explain_director_next_action",
      reason: "Explain Auto-Director's next-step suggestions for the current novel",
      input: { novelId: plannerInput.novelId },
      keyPrefix: "director_next_action",
    }],
  },
  {
    id: "run_director_next_step",
    intent: "run_director_next_step",
    kind: "workflow",
    requiresNovelContext: true,
    resolve: ({ plannerInput }) => [{
      agent: "Planner",
      tool: "run_director_next_step",
      reason: "Ask Auto-Director to continue to the next step",
      input: { novelId: plannerInput.novelId },
      keyPrefix: "director_run_next_step",
    }],
  },
  {
    id: "run_director_until_gate",
    intent: "run_director_until_gate",
    kind: "workflow",
    requiresNovelContext: true,
    resolve: ({ plannerInput }) => [{
      agent: "Planner",
      tool: "run_director_until_gate",
      reason: "Ask Auto-Director to advance to the next checkpoint",
      input: { novelId: plannerInput.novelId },
      keyPrefix: "director_run_until_gate",
    }],
  },
  {
    id: "switch_director_policy",
    intent: "switch_director_policy",
    kind: "workflow",
    requiresNovelContext: true,
    resolve: ({ intent, plannerInput }) => [{
      agent: "Planner",
      tool: "switch_director_policy",
      reason: "Switch the Auto-Director advancement policy",
      input: {
        novelId: plannerInput.novelId,
        mode: intent.directorPolicyMode ?? "run_next_step",
        ...(typeof intent.mayOverwriteUserContent === "boolean"
          ? { mayOverwriteUserContent: intent.mayOverwriteUserContent }
          : {}),
        ...(typeof intent.allowExpensiveReview === "boolean"
          ? { allowExpensiveReview: intent.allowExpensiveReview }
          : {}),
        ...(intent.modelTier ? { modelTier: intent.modelTier } : {}),
      },
      keyPrefix: `director_policy_${intent.directorPolicyMode ?? "run_next_step"}`,
    }],
  },
  {
    id: "evaluate_manual_edit_impact",
    intent: "evaluate_manual_edit_impact",
    kind: "single",
    requiresNovelContext: true,
    resolve: ({ intent, plannerInput }) => [{
      agent: "Planner",
      tool: "evaluate_manual_edit_impact",
      reason: "Evaluate how a manual edit affects later Auto-Director progress",
      input: {
        novelId: plannerInput.novelId,
        ...(intent.chapterSelectors.chapterId ? { chapterId: intent.chapterSelectors.chapterId } : {}),
      },
      keyPrefix: intent.chapterSelectors.chapterId
        ? `manual_edit_impact_${intent.chapterSelectors.chapterId}`
        : "manual_edit_impact",
    }],
  },
];

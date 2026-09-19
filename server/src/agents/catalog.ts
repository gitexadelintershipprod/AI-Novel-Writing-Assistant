import type { AgentCatalog, AgentCatalogAgent } from "@ai-novel/shared/types/agent";
import { getPermissionMatrixSummary } from "./approvalPolicy";
import { listAgentToolDefinitions } from "./toolRegistry";

const DOMAIN_AGENTS: AgentCatalogAgent[] = [
  {
    name: "Coordinator",
    title: "Creative coordinator",
    description: "Handles cross-module planning, status summaries, task diagnosis, and action orchestration.",
    resourceScopes: ["global", "task", "agent_run", "generation_job"],
  },
  {
    name: "NovelAgent",
    title: "Novel hub",
    description: "Owns novels, chapters, snapshots, creative decisions, and the chapter-generation chain.",
    resourceScopes: ["novel", "chapter", "creative_decision", "snapshot", "generation_job"],
  },
  {
    name: "BookAnalysisAgent",
    title: "Book analysis officer",
    description: "Handles book-analysis tasks, analysis results, and knowledge capture.",
    resourceScopes: ["book_analysis", "knowledge_document", "task"],
  },
  {
    name: "KnowledgeAgent",
    title: "Knowledge archivist",
    description: "Handles knowledge documents, index status, retrieval diagnosis, and bindings.",
    resourceScopes: ["knowledge_document", "task"],
  },
  {
    name: "WorldAgent",
    title: "World editor",
    description: "Handles world status, conflict diagnosis, snapshots, and novel bindings.",
    resourceScopes: ["world", "snapshot", "novel"],
  },
  {
    name: "FormulaAgent",
    title: "Formula editor",
    description: "Handles writing-formula management, fit explanations, and style capture.",
    resourceScopes: ["writing_formula", "novel", "chapter"],
  },
  {
    name: "CharacterAgent",
    title: "Character officer",
    description: "Handles the base character library, template reuse, and character context.",
    resourceScopes: ["base_character", "novel", "chapter"],
  },
];

function inferUiKind(toolName: string): string {
  if (toolName === "create_novel" || toolName === "select_novel_workspace") {
    return "workspace_action";
  }
  if (toolName.startsWith("generate_") || toolName === "sync_chapters_from_structured_outline" || toolName === "get_novel_production_status") {
    return "production_stage";
  }
  if (toolName.includes("failure") || toolName.includes("blocker") || toolName.includes("conflict")) {
    return "diagnostic_card";
  }
  if (toolName.startsWith("list_")) {
    return "resource_list";
  }
  if (toolName.includes("chapter_content") || toolName.includes("summarize")) {
    return "chapter_reader";
  }
  if (toolName.includes("preview") || toolName.includes("queue") || toolName.includes("retry")) {
    return "task_action";
  }
  return "default";
}

function inferFollowupActions(toolName: string): string[] {
  if (toolName === "create_novel") {
    return ["Continue to improve settings", "Bind the current workspace", "Start creating chapters"];
  }
  if (toolName === "generate_world_for_novel") {
    return ["Continue generating characters", "View world view", "Check for worldview conflicts"];
  }
  if (toolName === "generate_novel_characters") {
    return ["Continue generating the bible", "View character status", "Continue full-book generation"];
  }
  if (toolName === "generate_story_bible" || toolName === "generate_novel_outline" || toolName === "generate_structured_outline") {
    return ["Continue full-book generation", "View whole-production status", "Check current asset readiness"];
  }
  if (toolName === "get_novel_production_status") {
    return ["Continue generating this novel", "Why has whole-book generation not started?", "View the current chapter list"];
  }
  if (toolName === "select_novel_workspace") {
    return ["Continue working around this novel", "View chapters", "Start writing"];
  }
  if (toolName.includes("failure") || toolName.includes("blocker")) {
    return ["View related tasks", "Keep asking about the failure reason", "Try again"];
  }
  if (toolName.startsWith("list_")) {
    return ["Filter results", "Continue in Creative Hub", "Open the matching module"];
  }
  if (toolName.includes("chapter")) {
    return ["Continue to summarize", "Start a rewrite", "Check for conflicts"];
  }
  return ["Keep asking", "Open the matching module"];
}

export function buildAgentCatalog(): AgentCatalog {
  return {
    agents: DOMAIN_AGENTS,
    tools: listAgentToolDefinitions().map((tool) => ({
      ...tool,
      uiKind: inferUiKind(tool.name),
      followupActions: inferFollowupActions(tool.name),
    })),
    approvalPolicySummary: getPermissionMatrixSummary()
      .split("\n")
      .map((item) => item.trim())
      .filter(Boolean),
  };
}

import type {
  AgentRunStartInput,
  PlannedAction,
  StructuredIntent,
  ToolCall,
  ToolExecutionContext,
} from "../types";
import type { AgentToolError } from "../types";
import type { AgentToolErrorCode } from "@ai-novel/shared/types/agent";

export interface ToolExecutionResult {
  tool: ToolCall["tool"];
  success: boolean;
  summary: string;
  output?: Record<string, unknown>;
  errorCode?: AgentToolErrorCode;
  stepId?: string;
}

export interface SerializedContinuationPayload {
  goal: string;
  structuredIntent?: StructuredIntent;
  context: Omit<ToolExecutionContext, "runId" | "agentName">;
  plannedActions: PlannedAction[];
}

export interface RunMetadata {
  contextMode: AgentRunStartInput["contextMode"];
  worldId?: string;
  provider?: AgentRunStartInput["provider"];
  model?: string;
  temperature?: number;
  maxTokens?: number;
  messages?: AgentRunStartInput["messages"];
  parentRunId?: string;
  replayFromStepId?: string;
  plannerIntent?: StructuredIntent;
}

export const APPROVAL_TTL_MS = 1000 * 60 * 30;
export const MAX_TOOL_RETRIES = 1;
export const TERMINAL_STATUSES = new Set(["succeeded", "failed", "cancelled"]);

export function safeJson(value: unknown): string {
  try {
    return JSON.stringify(value ?? {});
  } catch {
    return JSON.stringify({ error: "serialize_failed" });
  }
}

export function asObject(value: string | null | undefined): Record<string, unknown> {
  if (!value?.trim()) {
    return {};
  }
  try {
    const parsed = JSON.parse(value) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return {};
    }
    return parsed as Record<string, unknown>;
  } catch {
    return {};
  }
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

export function extractErrorCode(error: unknown): AgentToolErrorCode {
  if ((error as AgentToolError)?.name === "AgentToolError" && typeof (error as AgentToolError).code === "string") {
    return (error as AgentToolError).code;
  }
  return "INTERNAL";
}

export function canRetry(errorCode: AgentToolErrorCode): boolean {
  return errorCode === "TIMEOUT" || errorCode === "INTERNAL";
}

export function summarizeOutput(tool: string, output: Record<string, unknown>): string {
  if (typeof output.summary === "string" && output.summary.trim()) {
    return output.summary;
  }
  if (tool === "list_novels") {
    const items = Array.isArray(output.items) ? output.items : [];
    return `Read ${items.length} novels.`;
  }
  if (tool === "create_novel") {
    const title = typeof output.title === "string" ? output.title : "";
    const stage = typeof (output.setup as Record<string, unknown> | undefined)?.stage === "string"
      ? String((output.setup as Record<string, unknown>).stage)
      : "";
    if (title && stage === "ready_for_production") {
      return `Created the novel "${title}". Setup is complete.`;
    }
    return title ? `Created the novel "${title}" and entered setup guidance.` : "The novel was created.";
  }
  if (tool === "select_novel_workspace") {
    const title = typeof output.title === "string" ? output.title : "";
    const stage = typeof (output.setup as Record<string, unknown> | undefined)?.stage === "string"
      ? String((output.setup as Record<string, unknown>).stage)
      : "";
    if (title && stage !== "ready_for_production") {
      return `Switched to the novel "${title}". Setup will continue.`;
    }
    return title ? `Switched to the novel "${title}".` : "Switched to the target novel.";
  }
  if (tool === "bind_world_to_novel") {
    const worldName = typeof output.worldName === "string" ? output.worldName.trim() : "";
    const novelTitle = typeof output.novelTitle === "string" ? output.novelTitle.trim() : "";
    if (worldName && novelTitle) {
      return `Bound the world "${worldName}" to the novel "${novelTitle}".`;
    }
    if (worldName) {
      return `Bound the world "${worldName}".`;
    }
    return "World binding is complete.";
  }
  if (tool === "unbind_world_from_novel") {
    const previousWorldName = typeof output.previousWorldName === "string" ? output.previousWorldName.trim() : "";
    const novelTitle = typeof output.novelTitle === "string" ? output.novelTitle.trim() : "";
    if (previousWorldName && novelTitle) {
      return `Unbound the world "${previousWorldName}" from the novel "${novelTitle}".`;
    }
    if (novelTitle) {
      return `The novel "${novelTitle}" currently has no bound world.`;
    }
    return "World unbinding was handled.";
  }
  if (tool === "generate_world_for_novel") {
    const worldName = typeof output.worldName === "string" ? output.worldName.trim() : "";
    return worldName ? `Generated the world "${worldName}".` : "The novel world was generated.";
  }
  if (tool === "generate_novel_characters") {
    return `Generated ${String(output.characterCount ?? 0)} core characters.`;
  }
  if (tool === "generate_story_bible") {
    return "The novel bible was generated.";
  }
  if (tool === "generate_novel_outline") {
    return "The novel's story direction was generated.";
  }
  if (tool === "generate_structured_outline") {
    return `Generated a structured outline with ${String(output.targetChapterCount ?? output.chapterCount ?? 0)} chapters.`;
  }
  if (tool === "sync_chapters_from_structured_outline") {
    return `Synced ${String(output.chapterCount ?? 0)} chapters into the table of contents.`;
  }
  if (tool === "start_full_novel_pipeline" || tool === "get_novel_production_status") {
    return typeof output.summary === "string" ? output.summary : `${tool} finished.`;
  }
  if (
    tool === "analyze_director_workspace"
    || tool === "get_director_run_status"
    || tool === "explain_director_next_action"
    || tool === "evaluate_manual_edit_impact"
    || tool === "run_director_next_step"
    || tool === "run_director_until_gate"
    || tool === "switch_director_policy"
  ) {
    return typeof output.summary === "string" ? output.summary : `${tool} finished.`;
  }
  if (tool === "get_novel_context") {
    const title = typeof output.title === "string" ? output.title.trim() : "";
    const chapterCount = typeof output.chapterCount === "number" ? output.chapterCount : null;
    return title
      ? `${title}${chapterCount != null ? ` (${chapterCount} chapters)` : ""}`
      : "The novel overview was read.";
  }
  if (tool === "get_story_bible") {
    const exists = output.exists === true;
    return exists ? "Novel-bible settings were read." : "This novel does not have a saved novel bible yet.";
  }
  if (tool === "get_world_constraints") {
    const worldName = typeof output.worldName === "string" ? output.worldName.trim() : "";
    return worldName ? `Read world constraints: ${worldName}.` : "This novel has no bound world constraints yet.";
  }
  if (tool === "list_chapters") {
    const items = Array.isArray(output.items) ? output.items : [];
    return `Read metadata for ${items.length} chapters.`;
  }
  if (tool === "get_chapter_by_order" || tool === "get_chapter_content_by_order" || tool === "get_chapter_content") {
    const order = typeof output.order === "number" ? output.order : null;
    const title = typeof output.title === "string" ? output.title.trim() : "";
    return order != null ? `Read chapter ${order}${title ? ` "${title}"` : ""}.` : "Chapter content was read.";
  }
  if (tool === "summarize_chapter_range") {
    const start = typeof output.startOrder === "number" ? output.startOrder : null;
    const end = typeof output.endOrder === "number" ? output.endOrder : null;
    return start != null && end != null
      ? `Summarized chapters ${start}–${end}.`
      : "The chapter-range summary is complete.";
  }
  if (tool === "search_knowledge") {
    const hitCount = typeof output.hitCount === "number" ? output.hitCount : 0;
    return `Matched ${hitCount} knowledge snippets.`;
  }
  if (tool === "list_book_analyses") {
    const items = Array.isArray(output.items) ? output.items : [];
    return `Read ${items.length} book-analysis tasks.`;
  }
  if (tool === "get_book_analysis_detail") {
    return typeof output.title === "string" ? `Read book-analysis details: ${output.title}.` : "Book-analysis details were read.";
  }
  if (tool === "get_book_analysis_failure_reason" || tool === "get_index_failure_reason" || tool === "get_task_failure_reason" || tool === "get_run_failure_reason") {
    return typeof output.failureSummary === "string" ? output.failureSummary : `${tool} returned diagnostic information.`;
  }
  if (tool === "list_knowledge_documents") {
    const items = Array.isArray(output.items) ? output.items : [];
    return `Read ${items.length} knowledge documents.`;
  }
  if (tool === "get_knowledge_document_detail") {
    return typeof output.title === "string" ? `Read knowledge document "${output.title}".` : "Knowledge-document details were read.";
  }
  if (tool === "list_worlds") {
    const items = Array.isArray(output.items) ? output.items : [];
    return `Read ${items.length} worlds.`;
  }
  if (tool === "get_world_detail") {
    return typeof output.name === "string" ? `Read world "${output.name}".` : "World details were read.";
  }
  if (tool === "explain_world_conflict" || tool === "explain_generation_blocker") {
    return typeof output.failureSummary === "string" ? output.failureSummary : `${tool} returned a conflict or blocker explanation.`;
  }
  if (tool === "list_writing_formulas") {
    const items = Array.isArray(output.items) ? output.items : [];
    return `Read ${items.length} writing formulas.`;
  }
  if (tool === "get_writing_formula_detail") {
    return typeof output.name === "string" ? `Read writing formula "${output.name}".` : "Writing-formula details were read.";
  }
  if (tool === "explain_formula_match") {
    return typeof output.summary === "string" ? output.summary : "Writing-formula fit analysis is complete.";
  }
  if (tool === "list_base_characters") {
    const items = Array.isArray(output.items) ? output.items : [];
    return `Read ${items.length} character templates.`;
  }
  if (tool === "get_base_character_detail") {
    return typeof output.name === "string" ? `Read character template "${output.name}".` : "Character-template details were read.";
  }
  if (tool === "list_tasks") {
    const items = Array.isArray(output.items) ? output.items : [];
    return `Read ${items.length} system tasks.`;
  }
  if (tool === "get_task_detail") {
    return typeof output.title === "string" ? `Read task details: ${output.title}.` : "Task details were read.";
  }
  if (tool === "retry_task" || tool === "cancel_task") {
    return typeof output.summary === "string" ? output.summary : `${tool} finished.`;
  }
  if (tool === "preview_pipeline_run") {
    return `Previewed ${String(output.chapterCount ?? 0)} chapters.`;
  }
  if (tool === "queue_pipeline_run") {
    return `Pipeline task handled: ${String(output.jobId ?? output.status ?? "unknown")}`;
  }
  if (tool === "apply_chapter_patch" || tool === "save_chapter_draft") {
    return `Chapter write handled, ${String(output.contentLength ?? 0)} characters.`;
  }
  return `${tool} finished.`;
}

export function summarizeFailure(tool: string, error: unknown): string {
  return `${tool} Execution failed: ${error instanceof Error ? error.message : "unknown error"}`;
}

export function buildFinalMessage(results: ToolExecutionResult[], waitingForApproval: boolean): string {
  const lines: string[] = [];
  if (results.length > 0) {
    lines.push("These steps are complete:");
    for (const item of results) {
      lines.push(`- ${item.summary}`);
    }
  }
  if (waitingForApproval) {
    lines.push("A high-impact write is pending. Paused for approval.");
  } else if (results.length > 0) {
    lines.push("Execution completed.");
  } else {
    lines.push("There is no tool step to run.");
  }
  return lines.join("\n");
}

function isWriteTool(tool: ToolCall["tool"]): boolean {
  return tool === "save_chapter_draft"
    || tool === "apply_chapter_patch"
    || tool === "queue_pipeline_run"
    || tool === "run_director_next_step"
    || tool === "run_director_until_gate"
    || tool === "switch_director_policy";
}

export function shouldUseDryRunPreview(toolCall: ToolCall): boolean {
  return isWriteTool(toolCall.tool) && toolCall.input.dryRun !== true;
}

export function normalizeAgent(value: unknown): PlannedAction["agent"] {
  if (value === "Writer" || value === "Reviewer" || value === "Continuity" || value === "Repair") {
    return value;
  }
  return "Planner";
}

function isStructuredIntent(value: unknown): value is StructuredIntent {
  if (!isRecord(value)) {
    return false;
  }
  return typeof value.goal === "string"
    && typeof value.intent === "string"
    && typeof value.confidence === "number"
    && isRecord(value.chapterSelectors);
}

export function parseApprovalPayload(payloadJson: string | null | undefined): SerializedContinuationPayload | null {
  const raw = asObject(payloadJson);
  if (!Array.isArray(raw.plannedActions) || typeof raw.goal !== "string" || !isRecord(raw.context)) {
    return null;
  }
  const contextRecord = raw.context;
  const context: SerializedContinuationPayload["context"] = {
    contextMode: contextRecord.contextMode === "novel" ? "novel" : "global",
    novelId: typeof contextRecord.novelId === "string" ? contextRecord.novelId : undefined,
    worldId: typeof contextRecord.worldId === "string" ? contextRecord.worldId : undefined,
    provider: typeof contextRecord.provider === "string"
      ? contextRecord.provider as AgentRunStartInput["provider"]
      : undefined,
    model: typeof contextRecord.model === "string" ? contextRecord.model : undefined,
    temperature: typeof contextRecord.temperature === "number" ? contextRecord.temperature : undefined,
    maxTokens: typeof contextRecord.maxTokens === "number" ? contextRecord.maxTokens : undefined,
  };
  const plannedActions: PlannedAction[] = raw.plannedActions
    .filter((item): item is Record<string, unknown> => isRecord(item))
    .map((item) => {
      const callsRaw = Array.isArray(item.calls) ? item.calls : [];
      const calls: ToolCall[] = callsRaw
        .filter((call): call is Record<string, unknown> => isRecord(call))
        .map((call) => ({
          tool: call.tool as ToolCall["tool"],
          reason: typeof call.reason === "string" ? call.reason : "Tool call",
          idempotencyKey: typeof call.idempotencyKey === "string" ? call.idempotencyKey : `k_${Date.now()}`,
          input: isRecord(call.input) ? call.input : {},
          dryRun: call.dryRun === true,
          approvalSatisfied: call.approvalSatisfied === true,
        }));
      return {
        agent: normalizeAgent(item.agent),
        reasoning: typeof item.reasoning === "string" ? item.reasoning : "Continue execution",
        calls,
      };
    })
    .filter((item) => item.calls.length > 0);

  if (plannedActions.length === 0) {
    return null;
  }
  return {
    goal: raw.goal,
    structuredIntent: isStructuredIntent(raw.structuredIntent) ? raw.structuredIntent : undefined,
    context,
    plannedActions,
  };
}

export function buildAlternativePathFromRejectedApproval(
  approvalPayload: SerializedContinuationPayload | null,
  note?: string,
): PlannedAction[] {
  if (!approvalPayload) {
    return [];
  }
  const firstCall = approvalPayload.plannedActions[0]?.calls[0];
  if (!firstCall) {
    return [];
  }

  if (firstCall.tool === "apply_chapter_patch") {
    const novelId = typeof firstCall.input.novelId === "string" ? firstCall.input.novelId : undefined;
    const chapterId = typeof firstCall.input.chapterId === "string" ? firstCall.input.chapterId : undefined;
    const content = typeof firstCall.input.content === "string" ? firstCall.input.content : "";
    if (novelId && chapterId && content.trim()) {
      return [{
        agent: "Writer",
        reasoning: "After rejection, save as a draft instead of overwriting the chapter text.",
        calls: [{
          tool: "save_chapter_draft",
          reason: `Approval was rejected, so save as a draft instead.${note ? ` Note: ${note}` : ""}`.trim(),
          idempotencyKey: `fallback_draft_${chapterId}_${Date.now()}`,
          input: {
            novelId,
            chapterId,
            content,
            dryRun: false,
          },
        }],
      }];
    }
  }

  if (firstCall.tool === "queue_pipeline_run") {
    const novelId = typeof firstCall.input.novelId === "string" ? firstCall.input.novelId : undefined;
    const startOrder = typeof firstCall.input.startOrder === "number" ? firstCall.input.startOrder : undefined;
    const endOrder = typeof firstCall.input.endOrder === "number" ? firstCall.input.endOrder : undefined;
    if (novelId && typeof startOrder === "number" && typeof endOrder === "number") {
      return [{
        agent: "Planner",
        reasoning: "After rejection, keep the preview and do not actually start the pipeline.",
        calls: [{
          tool: "preview_pipeline_run",
          reason: "Approval was rejected, so switch to a range preview.",
          idempotencyKey: `fallback_preview_${startOrder}_${endOrder}_${Date.now()}`,
          input: {
            novelId,
            startOrder,
            endOrder,
          },
        }],
      }];
    }
  }

  return [];
}

export function parseRunMetadata(metadataJson: string | null | undefined): RunMetadata {
  const raw = asObject(metadataJson);
  const metadata: RunMetadata = {
    contextMode: raw.contextMode === "novel" ? "novel" : "global",
  };
  if (typeof raw.provider === "string") {
    metadata.provider = raw.provider as AgentRunStartInput["provider"];
  }
  if (typeof raw.worldId === "string") {
    metadata.worldId = raw.worldId;
  }
  if (typeof raw.model === "string") {
    metadata.model = raw.model;
  }
  if (typeof raw.temperature === "number") {
    metadata.temperature = raw.temperature;
  }
  if (typeof raw.maxTokens === "number") {
    metadata.maxTokens = raw.maxTokens;
  }
  if (Array.isArray(raw.messages)) {
    metadata.messages = raw.messages
      .filter((item): item is { role: "user" | "assistant" | "system"; content: string } =>
        isRecord(item)
        && (item.role === "user" || item.role === "assistant" || item.role === "system")
        && typeof item.content === "string")
      .slice(-30);
  }
  if (typeof raw.parentRunId === "string") {
    metadata.parentRunId = raw.parentRunId;
  }
  if (typeof raw.replayFromStepId === "string") {
    metadata.replayFromStepId = raw.replayFromStepId;
  }
  if (isStructuredIntent(raw.plannerIntent)) {
    metadata.plannerIntent = raw.plannerIntent;
  }
  return metadata;
}

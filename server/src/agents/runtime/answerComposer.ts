import { runTextPrompt } from "../../prompting/core/promptRunner";
import { runtimeFallbackAnswerPrompt } from "../../prompting/prompts/agent/runtime.prompts";
import { listAgentToolDefinitions } from "../toolRegistry";
import type { StructuredIntent, ToolCall, ToolExecutionContext } from "../types";
import { isRecord, safeJson, type ToolExecutionResult } from "./runtimeHelpers";
import { composeCreateNovelSetupAnswer, composeMissingNovelKickoffAnswer, composeSelectNovelWorkspaceSetupAnswer } from "./novelSetupGuidanceComposer";
import { composeNovelSetupIdeationAnswer } from "./novelSetupIdeationComposer";

const COLLABORATION_FIRST_INTENTS = new Set<StructuredIntent["intent"]>([
  "create_novel",
  "produce_novel",
  "write_chapter",
  "rewrite_chapter",
  "save_chapter_draft",
  "start_pipeline",
  "ideate_novel_setup",
  "general_chat",
  "unknown",
]);

function composeWorkflowHandoffAnswer(
  structuredIntent: StructuredIntent,
  context: Omit<ToolExecutionContext, "runId" | "agentName">,
): string {
  const note = structuredIntent.note?.trim();
  const target = note?.includes("任务中心") || note?.includes("task center") ? ["Open the task center", "/tasks"]
    : note?.includes("model") ? ["Open model settings", "/settings/models"]
      : note?.includes("automatic director") ? ["Turn on AI automatic director", "/novels/auto-director"]
        : ["Open the novel workbench", context.novelId ? `/novels/${context.novelId}/edit` : "/novels"];
  return `This action needs to run in the main workbench, where the system saves artifacts and keeps full task status.\n\n[${target[0]}](${target[1]})`;
}

function truncateText(value: string, max = 320): string {
  const normalized = value.replace(/\s+/g, " ").trim();
  if (!normalized) {
    return "";
  }
  return normalized.length > max ? `${normalized.slice(0, max)}...` : normalized;
}
function getSuccessfulOutputs(results: ToolExecutionResult[], tool: ToolCall["tool"]): Record<string, unknown>[] {
  return results
    .filter((item) => item.success && item.tool === tool && item.output)
    .map((item) => item.output as Record<string, unknown>);
}
function getFailedResult(results: ToolExecutionResult[], tool: ToolCall["tool"]): ToolExecutionResult | null {
  return results.find((item) => !item.success && item.tool === tool) ?? null;
}
function buildGroundingFacts(results: ToolExecutionResult[]): string {
  return safeJson(results.map((item) => ({
    tool: item.tool,
    success: item.success,
    summary: item.summary,
    output: item.output
      ? Object.fromEntries(
        Object.entries(item.output).map(([key, value]) => {
          if (typeof value === "string") {
            return [key, truncateText(value, 400)];
          }
          if (Array.isArray(value)) {
            return [key, value.slice(0, 6)];
          }
          return [key, value];
        }),
      )
      : undefined,
  })));
}

function formatMissingInfo(structuredIntent?: StructuredIntent): string[] {
  return (structuredIntent?.missingInfo ?? [])
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 4);
}

function buildCollaborativeQuestion(structuredIntent?: StructuredIntent): string {
  switch (structuredIntent?.intent) {
    case "produce_novel":
    case "create_novel":
      return "Do you want to lock a one-sentence setup first, or should I give you three option sets right away?";
    case "write_chapter":
    case "rewrite_chapter":
      return "For this chapter, do you want to fix plot advancement, character emotion, or prose rhythm first?";
    case "ideate_novel_setup":
      return "Would you rather see core-setting options, story-promise options, or genre-and-style options first?";
    default:
      return "Which writing problem do you want to solve first?";
  }
}

function buildCollaborativeOptions(structuredIntent?: StructuredIntent): string[] {
  switch (structuredIntent?.intent) {
    case "produce_novel":
    case "create_novel":
      return [
        "I will first give you 3 core-setting directions from what we already have.",
        "Add one sentence for the protagonist, conflict, and goal, and I will tighten it into an executable setup.",
        "If you already know what you want, you can also say “start full-book production now”.",
      ];
    case "write_chapter":
    case "rewrite_chapter":
      return [
        "I will first judge whether this chapter's problem is plot, character, or pacing.",
        "Tell me this chapter's goal and what to keep, and I will give you a rewrite plan.",
        "If you already know the range, you can also say which chapter to change and in what direction.",
      ];
    case "ideate_novel_setup":
      return [
        "First I will give you 3 core-setting options.",
        "First I will give you 3 story-promise and selling-point directions.",
        "First I will give you 3 genre-style and narrative-setup combinations.",
      ];
    default:
      return [
        "I will first break this problem down.",
        "I will first give you a few optional directions.",
        "Add the most important constraints, then I will keep pushing forward.",
      ];
  }
}

function composeCollaborativeAnswer(goal: string, structuredIntent?: StructuredIntent): string {
  const missingInfo = formatMissingInfo(structuredIntent);
  const lead = structuredIntent?.intent === "general_chat" || structuredIntent?.intent === "unknown"
    ? `I will not treat this as a command yet. Let us clarify the problem together: ${goal}`
    : `I understand what you want to advance now is: ${goal}`;
  const collaborationLead = structuredIntent?.interactionMode === "review"
    ? "This round is better spent diagnosing and judging together."
    : "This round is better spent co-creating and clarifying before deciding whether to execute.";

  if ((structuredIntent?.assistantResponse ?? "explain") === "offer_options") {
    const options = buildCollaborativeOptions(structuredIntent)
      .map((item, index) => `${index + 1}. ${item}`)
      .join("\n");
    const missingLine = missingInfo.length > 0
      ? `Before continuing, I still want to fill in these points: ${missingInfo.join(", ")}.\n`
      : "";
    return `${lead}\n${collaborationLead}\n${missingLine}You can pick a direction to continue:\n${options}`;
  }

  const missingLine = missingInfo.length > 0
    ? `Before continuing, I still need these key facts: ${missingInfo.join(", ")}.`
    : "";
  return [lead, collaborationLead, missingLine, buildCollaborativeQuestion(structuredIntent)]
    .filter(Boolean)
    .join("\n");
}

function composeSocialOpeningAnswer(context: Omit<ToolExecutionContext, "runId" | "agentName">): string {
  if (context.novelId) {
    return "Hi. I can keep polishing this book's setup, outline, characters, and chapters with you, or first diagnose the current blocker. Which part do you want to advance first?";
  }
  return "Hi. I can help polish setup, outline, characters, and chapters, or diagnose the current blocker. Which part do you want to advance first?";
}

function composeTitleAnswer(results: ToolExecutionResult[]): string {
  const title = getSuccessfulOutputs(results, "get_novel_context")
    .map((item) => (typeof item.title === "string" ? item.title.trim() : ""))
    .find(Boolean);
  return title ? `"${title}"` : "No title was found";
}

function composeNovelListAnswer(results: ToolExecutionResult[]): string {
  const list = getSuccessfulOutputs(results, "list_novels")[0];
  const items = Array.isArray(list?.items) ? list.items : [];
  const total = typeof list?.total === "number" ? list.total : items.length;
  if (items.length === 0) {
    return "There is no novel yet.";
  }
  const lines = items.slice(0, 8).map((item, index) => {
    const title = typeof item?.title === "string" && item.title.trim() ? item.title.trim() : "Untitled novel";
    const chapterCount = typeof item?.chapterCount === "number" ? item.chapterCount : null;
    return `${index + 1}. "${title}"${chapterCount != null ? ` (${chapterCount} chapter)` : ""}`;
  });
  return `There are currently ${total} novels:\n${lines.join("\n")}`;
}

function composeBaseCharacterListAnswer(results: ToolExecutionResult[]): string {
  const list = getSuccessfulOutputs(results, "list_base_characters")[0];
  const items = Array.isArray(list?.items) ? list.items : [];
  if (items.length === 0) {
    return "The character library is still empty.";
  }
  const lines = items.slice(0, 8).map((item, index) => {
    const name = typeof item?.name === "string" && item.name.trim() ? item.name.trim() : "unnamed role";
    const role = typeof item?.role === "string" && item.role.trim() ? item.role.trim() : null;
    const category = typeof item?.category === "string" && item.category.trim() ? item.category.trim() : null;
    const tags = typeof item?.tags === "string" && item.tags.trim() ? item.tags.trim() : null;
    const suffix = [role, category, tags].filter(Boolean).join(" / ");
    return `${index + 1}. ${name}${suffix ? ` (${suffix})` : ""}`;
  });
  return `The character library currently has ${items.length} character templates:\n${lines.join("\n")}`;
}

function composeWorldListAnswer(results: ToolExecutionResult[]): string {
  const list = getSuccessfulOutputs(results, "list_worlds")[0];
  const items = Array.isArray(list?.items) ? list.items : [];
  if (items.length === 0) {
    return "There is no world yet.";
  }
  const lines = items.slice(0, 8).map((item, index) => {
    const name = typeof item?.name === "string" && item.name.trim() ? item.name.trim() : "Unnamed world view";
    const status = typeof item?.status === "string" && item.status.trim() ? item.status.trim() : null;
    return `${index + 1}. ${name}${status ? ` (${status})` : ""}`;
  });
  return `There are currently ${items.length} worlds:\n${lines.join("\n")}`;
}

function composeTaskListAnswer(results: ToolExecutionResult[]): string {
  const list = getSuccessfulOutputs(results, "list_tasks")[0];
  const items = Array.isArray(list?.items) ? list.items : [];
  if (items.length === 0) {
    return "There are no system tasks.";
  }
  const lines = items.slice(0, 8).map((item, index) => {
    const title = typeof item?.title === "string" && item.title.trim() ? item.title.trim() : "Untitled task";
    const status = typeof item?.status === "string" && item.status.trim() ? item.status.trim() : "unknown";
    const kind = typeof item?.kind === "string" && item.kind.trim() ? item.kind.trim() : null;
    return `${index + 1}. ${title}${kind ? ` (${kind})` : ""} - ${status}`;
  });
  return `There are currently ${items.length} system tasks:\n${lines.join("\n")}`;
}

function getFirstSuccessfulOutput(results: ToolExecutionResult[], tool: ToolCall["tool"]): Record<string, unknown> | null {
  return getSuccessfulOutputs(results, tool)[0] ?? null;
}

function composeBindWorldAnswer(
  results: ToolExecutionResult[],
  context: Omit<ToolExecutionContext, "runId" | "agentName">,
): string {
  const bound = getSuccessfulOutputs(results, "bind_world_to_novel")[0];
  if (bound) {
    const summary = typeof bound.summary === "string" ? bound.summary.trim() : "";
    if (summary) {
      return summary;
    }
    const worldName = typeof bound.worldName === "string" ? bound.worldName.trim() : "";
    const novelTitle = typeof bound.novelTitle === "string" ? bound.novelTitle.trim() : "";
    if (worldName && novelTitle) {
      return `Bound the world "${worldName}" to the novel "${novelTitle}".`;
    }
    return "World binding is complete.";
  }
  if (!context.novelId) {
    return "Without the current novel context, a world cannot be set.";
  }
  const failed = getFailedResult(results, "bind_world_to_novel");
  if (failed?.errorCode === "NOT_FOUND") {
    return "The world to bind was not found.";
  }
  if (failed?.summary) {
    return failed.summary;
  }
  return "World binding was not completed.";
}

function composeUnbindWorldAnswer(
  results: ToolExecutionResult[],
  context: Omit<ToolExecutionContext, "runId" | "agentName">,
): string {
  const unbound = getSuccessfulOutputs(results, "unbind_world_from_novel")[0];
  if (unbound) {
    const summary = typeof unbound.summary === "string" ? unbound.summary.trim() : "";
    if (summary) {
      return summary;
    }
    const novelTitle = typeof unbound.novelTitle === "string" ? unbound.novelTitle.trim() : "";
    const previousWorldName = typeof unbound.previousWorldName === "string" ? unbound.previousWorldName.trim() : "";
    if (novelTitle && previousWorldName) {
      return `Unbound the world "${previousWorldName}" from the novel "${novelTitle}".`;
    }
    if (novelTitle) {
      return `Updated the world-binding status for the novel "${novelTitle}".`;
    }
    return "World unbinding is complete.";
  }
  if (!context.novelId) {
    return "Without the current novel context, the world cannot be unbound.";
  }
  const failed = getFailedResult(results, "unbind_world_from_novel");
  if (failed?.summary) {
    return failed.summary;
  }
  return "World unbinding was not completed.";
}

function composeFactProductionStatusText(status: Record<string, unknown>, fallbackTitle = "current novel"): string {
  const title = typeof status.title === "string" && status.title.trim() ? status.title.trim() : fallbackTitle;
  const currentStage = typeof status.currentStage === "string" && status.currentStage.trim()
    ? status.currentStage.trim()
    : "unknown stage";
  const factProgress = isRecord(status.factProgress) ? status.factProgress : null;
  const targetChapterCount = typeof status.targetChapterCount === "number" ? status.targetChapterCount : null;
  const chapterCount = typeof status.chapterCount === "number" ? status.chapterCount : 0;
  const runtimeStatus = isRecord(status.runtimeStatus) ? status.runtimeStatus : null;
  const runtimeLabel = typeof runtimeStatus?.label === "string" && runtimeStatus.label.trim()
    ? runtimeStatus.label.trim()
    : null;
  const runtimeState = typeof runtimeStatus?.state === "string" ? runtimeStatus.state : null;
  const pipelineStatus = typeof status.pipelineStatus === "string" ? status.pipelineStatus.trim() : null;
  const failureSummary = typeof status.failureSummary === "string" ? status.failureSummary.trim() : "";
  const recoveryHint = typeof status.recoveryHint === "string" ? status.recoveryHint.trim() : "";

  const parts = [`"${title}" fact progress: ${currentStage}.`];
  if (factProgress) {
    const planningCompleted = typeof factProgress.planningCompleted === "number" ? factProgress.planningCompleted : null;
    const planningTotal = typeof factProgress.planningTotal === "number" ? factProgress.planningTotal : null;
    const draftedChapterCount = typeof factProgress.draftedChapterCount === "number" ? factProgress.draftedChapterCount : null;
    const reviewedChapterCount = typeof factProgress.reviewedChapterCount === "number" ? factProgress.reviewedChapterCount : null;
    const committedChapterCount = typeof factProgress.committedChapterCount === "number" ? factProgress.committedChapterCount : null;
    const needsRepairChapters = typeof factProgress.needsRepairChapters === "number" ? factProgress.needsRepairChapters : 0;
    if (planningCompleted != null && planningTotal != null) {
      parts.push(`Planning: ${planningCompleted}/${planningTotal} items.`);
    }
    if (draftedChapterCount != null) {
      parts.push(targetChapterCount != null
        ? `Chapter text: ${draftedChapterCount}/${targetChapterCount} chapters.`
        : `Chapter text: ${draftedChapterCount} chapters.`);
    } else {
      parts.push(targetChapterCount != null ? `Chapter table of contents: ${chapterCount}/${targetChapterCount} chapters.` : `Chapter table of contents: ${chapterCount} chapters.`);
    }
    if (reviewedChapterCount != null && reviewedChapterCount > 0) {
      parts.push(`Review: ${reviewedChapterCount} chapters.`);
    }
    if (committedChapterCount != null && committedChapterCount > 0) {
      parts.push(`State commit: ${committedChapterCount} chapters.`);
    }
    if (needsRepairChapters > 0) {
      parts.push(`${needsRepairChapters} chapters waiting for repair.`);
    }
  } else {
    parts.push(targetChapterCount != null ? `Chapter table of contents: ${chapterCount}/${targetChapterCount} chapters.` : `Chapter table of contents: ${chapterCount} chapters.`);
  }
  if (runtimeLabel && runtimeState !== "idle") {
    parts.push(`Background: ${runtimeLabel}.`);
  } else if (pipelineStatus) {
    parts.push(`Background: ${pipelineStatus}.`);
  }
  if (failureSummary) {
    parts.push(`Background failure reason: ${failureSummary}`);
    parts.push("Facts already produced can still be used.");
  }
  if (recoveryHint) {
    parts.push(`Suggestion: ${recoveryHint}`);
  }
  return parts.join("");
}

function composeProgressAnswer(results: ToolExecutionResult[]): string {
  const productionStatus = getFirstSuccessfulOutput(results, "get_novel_production_status");
  if (productionStatus) {
    return composeFactProductionStatusText(productionStatus);
  }
  const context = getSuccessfulOutputs(results, "get_novel_context")[0];
  if (!context) {
    return "There is not enough information to continue";
  }
  const completedChapterCount = typeof context.completedChapterCount === "number"
    ? context.completedChapterCount
    : null;
  const chapterCount = typeof context.chapterCount === "number" ? context.chapterCount : null;
  const latestCompletedChapterOrder = typeof context.latestCompletedChapterOrder === "number"
    ? context.latestCompletedChapterOrder
    : null;
  if (completedChapterCount == null) {
    return "There is not enough information to continue";
  }
  const parts = [
    chapterCount != null
      ? `Chapter text: ${completedChapterCount}/${chapterCount} chapters.`
      : `Chapter text: ${completedChapterCount} chapters.`,
  ];
  if (latestCompletedChapterOrder != null) {
    parts.push(`Most recently finished through chapter ${latestCompletedChapterOrder}.`);
  }
  if (completedChapterCount === 0) {
    parts.push("No chapters with written text were found.");
  }
  return parts.join("");
}

function composeCharacterAnswer(results: ToolExecutionResult[]): string {
  const characterState = getSuccessfulOutputs(results, "get_character_states")[0];
  if (!characterState) {
    return "Character-status information was not found";
  }
  const count = typeof characterState.count === "number" ? characterState.count : 0;
  const items = Array.isArray(characterState.items) ? characterState.items : [];
  if (count === 0 || items.length === 0) {
    return "This novel has no planned characters yet.";
  }
  const lines = items.slice(0, 6).map((item, index) => {
    const name = typeof item?.name === "string" && item.name.trim() ? item.name.trim() : "unnamed role";
    const role = typeof item?.role === "string" && item.role.trim() ? item.role.trim() : null;
    return `${index + 1}. ${name}${role ? ` (${role})` : ""}`;
  });
  return `This novel currently has ${count} planned characters:\n${lines.join("\n")}`;
}

function composeChapterAnswer(results: ToolExecutionResult[]): string | null {
  const contentOutputs = [
    ...getSuccessfulOutputs(results, "get_chapter_content_by_order"),
    ...getSuccessfulOutputs(results, "get_chapter_content"),
  ]
    .filter((item) => typeof item.order === "number")
    .sort((left, right) => Number(left.order) - Number(right.order));
  if (contentOutputs.length > 0) {
    return contentOutputs.map((item) => {
      const order = Number(item.order);
      const title = typeof item.title === "string" ? item.title.trim() : "";
      const content = typeof item.content === "string" ? item.content : "";
      return `Chapter ${order}${title ? ` "${title}"` : ""}: ${truncateText(content, 360) || "chapter text is empty"}`;
    }).join("\n\n");
  }

  const rangeSummary = getSuccessfulOutputs(results, "summarize_chapter_range")[0];
  if (rangeSummary && typeof rangeSummary.summary === "string" && rangeSummary.summary.trim()) {
    return rangeSummary.summary.trim();
  }
  return null;
}

function composeWriteAnswer(results: ToolExecutionResult[], waitingForApproval: boolean): string | null {
  const preview = getSuccessfulOutputs(results, "preview_pipeline_run")[0];
  const queue = getSuccessfulOutputs(results, "queue_pipeline_run")[0];
  const draft = getSuccessfulOutputs(results, "save_chapter_draft")[0];
  const patch = getSuccessfulOutputs(results, "apply_chapter_patch")[0];

  if (draft && typeof draft.summary === "string") {
    return draft.summary;
  }
  if (patch && typeof patch.summary === "string") {
    return patch.summary;
  }
  if (waitingForApproval && preview) {
    const start = typeof preview.startOrder === "number" ? preview.startOrder : null;
    const end = typeof preview.endOrder === "number" ? preview.endOrder : null;
    if (start != null && end != null) {
      return start === end
        ? `Finished the execution preview for chapter ${start}. Waiting for approval.`
        : `Finished the execution preview for chapters ${start}–${end}. Waiting for approval.`;
    }
  }
  if (queue) {
    const start = typeof queue.startOrder === "number" ? queue.startOrder : null;
    const end = typeof queue.endOrder === "number" ? queue.endOrder : null;
    const jobId = typeof queue.jobId === "string" ? queue.jobId : "";
    if (start != null && end != null) {
      const scope = start === end ? `Chapter ${start}` : `Chapters ${start}–${end}`;
      return `Created a writing task for ${scope}${jobId ? ` (task ${jobId})` : ""}.`;
    }
  }
  return null;
}

function composeProductionStatusAnswer(
  results: ToolExecutionResult[],
  context: Omit<ToolExecutionContext, "runId" | "agentName">,
): string {
  const status = getFirstSuccessfulOutput(results, "get_novel_production_status");
  if (!status) {
    return context.novelId
      ? "Full-book production status was not found."
      : "Without the current novel context, full-book production status cannot be read.";
  }
  const title = typeof status.title === "string" ? status.title.trim() : "current novel";
  return composeFactProductionStatusText(status, title);
}

async function composeProduceNovelAnswer(
  results: ToolExecutionResult[],
  waitingForApproval: boolean,
  context: Omit<ToolExecutionContext, "runId" | "agentName">,
  goal: string,
  structuredIntent?: StructuredIntent,
): Promise<string> {
  const created = getFirstSuccessfulOutput(results, "create_novel");
  const world = getFirstSuccessfulOutput(results, "generate_world_for_novel");
  const characters = getFirstSuccessfulOutput(results, "generate_novel_characters");
  const bible = getFirstSuccessfulOutput(results, "generate_story_bible");
  const outline = getFirstSuccessfulOutput(results, "generate_novel_outline");
  const structured = getFirstSuccessfulOutput(results, "generate_structured_outline");
  const synced = getFirstSuccessfulOutput(results, "sync_chapters_from_structured_outline");
  const preview = getFirstSuccessfulOutput(results, "preview_pipeline_run");
  const queued = getFirstSuccessfulOutput(results, "queue_pipeline_run");
  const productionStatus = getFirstSuccessfulOutput(results, "get_novel_production_status");

  if (!created && !context.novelId) {
    return composeMissingNovelKickoffAnswer(goal, context, structuredIntent, "produce_missing_title");
  }

  const title = typeof created?.title === "string" && created.title.trim()
    ? created.title.trim()
    : typeof productionStatus?.title === "string" && productionStatus.title.trim()
      ? productionStatus.title.trim()
      : "current novel";
  const assetParts: string[] = [];
  if (world) {
    const worldName = typeof world.worldName === "string" ? world.worldName.trim() : "";
    assetParts.push(worldName ? `world "${worldName}"` : "World");
  }
  if (characters) {
    const characterCount = typeof characters.characterCount === "number" ? characters.characterCount : 0;
    assetParts.push(`${characterCount} core role`);
  }
  if (bible) {
    assetParts.push("Novel bible");
  }
  if (outline) {
    assetParts.push("Story direction");
  }
  if (structured) {
    const targetChapterCount = typeof structured.targetChapterCount === "number" ? structured.targetChapterCount : null;
    assetParts.push(targetChapterCount != null ? `${targetChapterCount}-chapter structured outline` : "Structured outline");
  }
  if (synced) {
    const chapterCount = typeof synced.chapterCount === "number" ? synced.chapterCount : null;
    assetParts.push(chapterCount != null ? `${chapterCount} chapters in the table of contents` : "Chapter table of contents");
  }

  if (waitingForApproval && preview) {
    return `Core assets for "${title}" are generated${assetParts.length > 0 ? `: ${assetParts.join(", ")}.` : "."} Full writing preview is done. Waiting for approval.`;
  }
  if (queued) {
    const jobId = typeof queued.jobId === "string" && queued.jobId.trim() ? ` (task ${queued.jobId})` : "";
    return `Core assets for "${title}" are generated${assetParts.length > 0 ? `: ${assetParts.join(", ")}.` : "."} The full writing job has started${jobId}.`;
  }
  if (preview) {
    return `Core assets for "${title}" are generated${assetParts.length > 0 ? `: ${assetParts.join(", ")}.` : "."} Full-book writing has not started.`;
  }
  return `Core assets for "${title}" are generated${assetParts.length > 0 ? `: ${assetParts.join(", ")}.` : "."}`
}

function composeFailureDiagnosisAnswer(results: ToolExecutionResult[]): string {
  const candidates = [
    ...getSuccessfulOutputs(results, "get_run_failure_reason"),
    ...getSuccessfulOutputs(results, "explain_generation_blocker"),
    ...getSuccessfulOutputs(results, "get_task_failure_reason"),
    ...getSuccessfulOutputs(results, "get_index_failure_reason"),
    ...getSuccessfulOutputs(results, "get_book_analysis_failure_reason"),
  ];
  const first = candidates.find((item) => typeof item.failureSummary === "string" && item.failureSummary.trim());
  if (!first) {
    return "No failure diagnosis is available";
  }
  const parts = [String(first.failureSummary).trim()];
  if (typeof first.failureDetails === "string" && first.failureDetails.trim() && first.failureDetails.trim() !== parts[0]) {
    parts.push(`Details: ${first.failureDetails.trim()}`);
  }
  if (typeof first.recoveryHint === "string" && first.recoveryHint.trim()) {
    parts.push(`Suggestion: ${first.recoveryHint.trim()}`);
  }
  if (typeof first.lastFailedStep === "string" && first.lastFailedStep.trim()) {
    parts.push(`Failed step: ${first.lastFailedStep.trim()}`);
  }
  return parts.join("\n");
}

async function composeFallbackAnswer(
  goal: string,
  summary: string,
  results: ToolExecutionResult[],
  context: Omit<ToolExecutionContext, "runId" | "agentName">,
  structuredIntent?: StructuredIntent,
): Promise<string> {
  try {
    const toolList = listAgentToolDefinitions()
      .map((item) => `- ${item.name}: ${item.description}`)
      .join("\n");
    const result = await runTextPrompt({
      asset: runtimeFallbackAnswerPrompt,
      promptInput: {
        toolList,
        goal,
        structuredIntentJson: safeJson(structuredIntent ?? { intent: "unknown" }),
        summary,
        groundingFacts: buildGroundingFacts(results),
      },
      options: {
        provider: context.provider ?? "deepseek",
        model: context.model,
        temperature: 0.2,
        maxTokens: context.maxTokens,
      },
    });
    return result.output.trim() || "There is not enough information to continue";
  } catch {
    return summary || "There is not enough information to continue";
  }
  return "There is not enough information to continue";
}

export async function composeAssistantMessage(
  goal: string,
  summary: string,
  results: ToolExecutionResult[],
  waitingForApproval: boolean,
  context: Omit<ToolExecutionContext, "runId" | "agentName">,
  structuredIntent?: StructuredIntent,
): Promise<string> {
  if (structuredIntent?.intent === "social_opening") {
    return composeSocialOpeningAnswer(context);
  }

  if (context.plannerProfile === "creative_hub_readonly"
    && (structuredIntent?.intent === "workflow_handoff" || structuredIntent?.intent === "out_of_scope")) {
    return composeWorkflowHandoffAnswer(structuredIntent, context);
  }

  if (context.plannerProfile === "creative_hub_readonly"
    && structuredIntent
    && ["create_novel", "bind_world_to_novel", "unbind_world_from_novel", "produce_novel", "run_director_next_step", "run_director_until_gate", "switch_director_policy", "write_chapter", "rewrite_chapter", "save_chapter_draft", "start_pipeline", "ideate_novel_setup"].includes(structuredIntent.intent)) {
    return composeWorkflowHandoffAnswer({ ...structuredIntent, note: structuredIntent.note ?? "automatic director" }, context);
  }

  if (
    !waitingForApproval
    && structuredIntent
    && COLLABORATION_FIRST_INTENTS.has(structuredIntent.intent)
    && (
      structuredIntent.shouldAskFollowup
      || ((structuredIntent.interactionMode ?? "execute") !== "execute" && results.length === 0)
    )
  ) {
    return composeCollaborativeAnswer(goal, structuredIntent);
  }

  switch (structuredIntent?.intent) {
    case "list_novels":
      return composeNovelListAnswer(results);
    case "list_base_characters":
      return composeBaseCharacterListAnswer(results);
    case "list_worlds":
      return composeWorldListAnswer(results);
    case "query_task_status":
      return composeTaskListAnswer(results);
    case "create_novel":
      return composeCreateNovelSetupAnswer(goal, results, context, structuredIntent);
    case "select_novel_workspace":
      return composeSelectNovelWorkspaceSetupAnswer(goal, results, context, structuredIntent);
    case "bind_world_to_novel":
      return composeBindWorldAnswer(results, context);
    case "unbind_world_from_novel":
      return composeUnbindWorldAnswer(results, context);
    case "produce_novel":
      return composeProduceNovelAnswer(results, waitingForApproval, context, goal, structuredIntent);
    case "query_novel_production_status":
      return composeProductionStatusAnswer(results, context);
    case "query_novel_title":
      return composeTitleAnswer(results);
    case "query_progress":
      return composeProgressAnswer(results);
    case "query_chapter_content":
      return composeChapterAnswer(results) ?? "Chapter text was not found";
    case "inspect_failure_reason":
      return composeFailureDiagnosisAnswer(results);
    case "ideate_novel_setup":
      return composeNovelSetupIdeationAnswer(goal, results, context, structuredIntent);
    case "write_chapter":
    case "rewrite_chapter":
    case "save_chapter_draft":
    case "start_pipeline":
      return composeWriteAnswer(results, waitingForApproval) ?? "No executable range was found";
    default:
      break;
  }

  if (waitingForApproval) {
    return summary;
  }
  return composeFallbackAnswer(goal, summary, results, context, structuredIntent);
}

export function hasUsableStructuredIntent(value: unknown): value is StructuredIntent {
  if (!isRecord(value)) {
    return false;
  }
  return typeof value.goal === "string"
    && typeof value.intent === "string"
    && typeof value.confidence === "number"
    && isRecord(value.chapterSelectors);
}

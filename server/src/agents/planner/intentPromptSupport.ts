import { z } from "zod";
import { getPermissionMatrixSummary } from "../approvalPolicy";
import { listAgentToolDefinitions, listPlannerSemanticDefinitions } from "../toolRegistry";
import type { PlannerInput, StructuredIntent } from "../types";

export const INTENT_NAMES = [
  "social_opening",
  "list_novels",
  "list_base_characters",
  "list_worlds",
  "query_task_status",
  "create_novel",
  "select_novel_workspace",
  "bind_world_to_novel",
  "unbind_world_from_novel",
  "produce_novel",
  "query_novel_production_status",
  "analyze_director_workspace",
  "query_director_status",
  "explain_director_next_action",
  "run_director_next_step",
  "run_director_until_gate",
  "switch_director_policy",
  "evaluate_manual_edit_impact",
  "query_novel_title",
  "query_chapter_content",
  "query_progress",
  "inspect_failure_reason",
  "write_chapter",
  "rewrite_chapter",
  "save_chapter_draft",
  "start_pipeline",
  "inspect_characters",
  "inspect_timeline",
  "inspect_world",
  "search_knowledge",
  "ideate_novel_setup",
  "workflow_handoff",
  "out_of_scope",
  "general_chat",
  "unknown",
] as const satisfies readonly StructuredIntent["intent"][];

const WORKFLOW_RECIPES = [
  {
    intent: "produce_novel",
    when: "The user asks to create and start full-book generation, or to continue/finish this novel's full-book production.",
    examples: [
      "Create a 20-chapter novel titled Anti-Japanese Hero Legend and start full-book generation",
      "Continue generating this novel",
      "Finish this novel",
          ],
  },
  {
    intent: "query_novel_production_status",
    when: "The user is asking where full-book generation is stuck, whether it started, and whether assets are ready.",
    examples: [
      "At what stage has the entire book been generated?",
      "Why does the entire build not start?",
      "Are the current assets ready",
    ],
  },
  {
    intent: "query_director_status",
    when: "The user is asking where Auto-Director has reached, whether it is waiting for confirmation, and what the current node or recent events are.",
    examples: [
      "Where is Auto-Director now",
      "Is the current director task stuck",
      "What is the status of this Auto-Director task",
                ],
  },
  {
    intent: "explain_director_next_action",
    when: "The user asks what this novel should do next, why it should advance that way, or whether Auto-Director can continue automatically.",
    examples: [
      "What this book should do now",
      "What to do next",
      "What does Auto-Director suggest next",
          ],
  },
  {
    intent: "evaluate_manual_edit_impact",
    when: "The user says they changed prose, motive, payoff, or setting and wants the later impact judged.",
    examples: [
      "I changed chapter 3; what does that affect",
      "I changed the protagonist motive; does later work need a recompute",
      "I deleted a payoff; which chapters does that affect",
                ],
  },
  {
    intent: "run_director_next_step",
    when: "The user explicitly asks Creative Hub to continue Auto-Director to the next step.",
    examples: [
      "Continue Auto-Director to the next step",
      "Let the director take one more step",
    ],
  },
  {
    intent: "run_director_until_gate",
    when: "The user explicitly asks Auto-Director to keep advancing to the next checkpoint or confirmation gate.",
    examples: [
      "Continue Auto-Director to the checkpoint",
      "Let the director advance to the next place that needs my confirmation",
    ],
  },
  {
    intent: "switch_director_policy",
    when: "The user explicitly asks to change Auto-Director's approach or automation intensity.",
    examples: [
      "Switch Auto-Director to suggestions only",
      "Switch to advancing to a checkpoint",
      "Allow auto-advance in a safe range",
    ],
  },
  {
    intent: "query_chapter_content",
    when: "The user wants to view prose or a summary for a chapter or a chapter range.",
    examples: [
      "Give me chapter 1",
      "What was written in the first two chapters?",
          ],
  },
  {
    intent: "inspect_failure_reason",
    when: "The user is asking why generation failed, a chapter failed, or the run is blocked.",
    examples: [
      "Why did chapter 3 fail",
      "Why did generating chapter 3 fail",
    ],
  },
  {
    intent: "write_chapter",
    when: "The user asks to advance writing of a chapter.",
    examples: [
      "Write chapter 3",
      "Continue writing chapter 5",
          ],
  },
  {
    intent: "rewrite_chapter",
    when: "The user explicitly asks to rewrite a chapter.",
    examples: [
      "Rewrite chapter 3",
      "Rewrite chapter 6 as a new version",
          ],
  },
  {
    intent: "query_progress",
    when: "The user is asking how many chapters are written and where progress stands.",
    examples: [
      "How many chapters are written",
      "Where is progress now",
                ],
  },
];

export const intentSchema: z.ZodType<StructuredIntent> = z.object({
  goal: z.string().min(1),
  intent: z.enum(INTENT_NAMES),
  confidence: z.number().min(0).max(1).default(0.5),
  requiresNovelContext: z.boolean().default(false),
  interactionMode: z.enum(["co_create", "review", "query", "plan", "execute"]).default("execute"),
  assistantResponse: z.enum(["ask_followup", "offer_options", "explain", "execute"]).default("explain"),
  shouldAskFollowup: z.boolean().default(false),
  missingInfo: z.array(z.string().trim().min(1)).max(4).default([]),
  novelTitle: z.string().trim().min(1).optional(),
  worldName: z.string().trim().min(1).optional(),
  description: z.string().trim().min(1).optional(),
  targetChapterCount: z.number().int().min(1).max(200).optional(),
  genre: z.string().trim().min(1).optional(),
  worldType: z.string().trim().min(1).optional(),
  styleTone: z.string().trim().min(1).optional(),
  projectMode: z.enum(["ai_led", "co_pilot", "draft_mode", "auto_pipeline"]).optional(),
  pacePreference: z.enum(["fast", "balanced", "slow"]).optional(),
  narrativePov: z.enum(["first_person", "third_person", "mixed"]).optional(),
  emotionIntensity: z.enum(["low", "medium", "high"]).optional(),
  aiFreedom: z.enum(["low", "medium", "high"]).optional(),
  defaultChapterLength: z.number().int().min(500).max(10000).optional(),
  directorPolicyMode: z.enum(["suggest_only", "run_next_step", "run_until_gate", "auto_safe_scope"]).optional(),
  mayOverwriteUserContent: z.boolean().optional(),
  allowExpensiveReview: z.boolean().optional(),
  modelTier: z.enum(["cheap_fast", "balanced", "high_quality"]).optional(),
  chapterSelectors: z.object({
    chapterId: z.string().trim().min(1).optional(),
    orders: z.array(z.number().int().min(1)).max(8).optional(),
    range: z.object({
      startOrder: z.number().int().min(1),
      endOrder: z.number().int().min(1),
    }).optional(),
    relative: z.object({
      type: z.enum(["first_n"]),
      count: z.number().int().min(1).max(20),
    }).optional(),
  }).default({}),
  content: z.string().trim().optional(),
  note: z.string().trim().optional(),
});

function buildSemanticCatalog(): string {
  const items = listPlannerSemanticDefinitions();
  if (items.length === 0) {
    return "none";
  }
  return items.map((item) => [
    `- intent=${item.intent}; tool=${item.toolName}; requiresNovelContext=${item.requiresNovelContext}`,
    `  title=${item.title}`,
    `  description=${item.description}`,
    `  aliases=${item.aliases.join(", ") || "none"}`,
    `  phrases=${item.phrases.join(" | ") || "none"}`,
    `  when=${item.whenToUse ?? "none"}`,
    `  avoid=${item.whenNotToUse ?? "none"}`,
    `  inputs=${item.inputSchemaSummary.join(", ") || "none"}`,
  ].join("\n")).join("\n");
}

function buildWorkflowRecipeCatalog(): string {
  return WORKFLOW_RECIPES.map((item) => [
    `- intent=${item.intent}`,
    `  when=${item.when}`,
    `  examples=${item.examples.join(" | ")}`,
  ].join("\n")).join("\n");
}

function buildToolCatalog(): string {
  return listAgentToolDefinitions()
    .map((item) => `- ${item.name}: ${item.description}`)
    .join("\n");
}

export function summarizeIntentValidationFailure(
  payload: Record<string, unknown>,
  issues: z.ZodIssue[],
): string {
  const details = issues.slice(0, 3).map((issue) => {
    const path = issue.path.length > 0 ? issue.path.join(".") : "root";
    if (path === "intent") {
      const rawIntent = typeof payload.intent === "string" && payload.intent.trim()
        ? payload.intent.trim()
        : "unknown";
      return `unsupported intent: ${rawIntent}`;
    }
    if (issue.code === "invalid_type") {
      return `field ${path} has the wrong type`;
    }
    if (issue.code === "invalid_value") {
      return `field ${path} is not an allowed value`;
    }
    if (issue.code === "too_small") {
      return `field ${path} is missing valid content`;
    }
    if (issue.code === "too_big") {
      return `field ${path} exceeds the allowed range`;
    }
    return `field ${path} is invalid`;
  });
  return `The LLM returned invalid intent JSON: ${details.join("; ")}`;
}

export function buildPlannerIntentPromptParts(input: PlannerInput): { systemPrompt: string; userPrompt: string } {
  const permissionSummary = getPermissionMatrixSummary();
  const recentMessages = input.messages.slice(-12).map((item) => `${item.role}: ${item.content}`).join("\n");
  const readonly = input.profile === "creative_hub_readonly";
  const semanticCatalog = buildSemanticCatalog();
  const workflowRecipes = readonly
    ? "Provide query, diagnosis, explanation, and navigation only. Do not provide a production workflow."
    : buildWorkflowRecipeCatalog();
  const toolCatalog = readonly
    ? listAgentToolDefinitions()
      .filter((item) => ["read", "inspect"].includes(item.category) && !["preview_pipeline_run", "diff_chapter_patch"].includes(item.name))
      .map((item) => `- ${item.name}: ${item.description}`)
      .join("\n")
    : buildToolCatalog();

  return {
    systemPrompt: [
      readonly
        ? "Creative Hub is in read-only mode: you may only query novel status, diagnose issues, view run records, explain the next step, and recommend the official entry. Do not create, generate, write, save, edit, recover, retry, cancel, or start any task."
        : "Creative Hub is a collaborative writing partner by default, not a command router.",
      "You must explicitly return interactionMode, assistantResponse, shouldAskFollowup, and missingInfo in JSON.",
      "If the user is still exploring direction, comparing options, expressing dissatisfaction, seeking diagnosis, or the creative goal is not yet clear, prefer interactionMode co_create or review and set shouldAskFollowup to true.",
      "Set interactionMode to execute only when the user clearly asks to create, bind, save, start a task, or write content now.",
      "When the next step is a clarifying question, use assistantResponse ask_followup. When the next step is offering alternatives, use offer_options.",
      "If the user is only greeting and has not entered a writing task, prefer intent social_opening over general_chat.",
      "You are the intent parser for the Novel creation Agent. Return only one JSON object.",
      "Your job is not to plan every tool. First identify the user's real intent and chapter slots.",
      `intent must be one of: ${(readonly ? INTENT_NAMES.filter((intent) => !["create_novel", "select_novel_workspace", "bind_world_to_novel", "unbind_world_from_novel", "produce_novel", "run_director_next_step", "run_director_until_gate", "switch_director_policy", "write_chapter", "rewrite_chapter", "save_chapter_draft", "start_pipeline", "ideate_novel_setup"].includes(intent)) : INTENT_NAMES).join(", ")}.`,
      ...(readonly ? [
        "When the user asks to create, generate, write, edit, save, start, continue, recover, retry, cancel, or approve, return workflow_handoff and explain in note that they should enter the official novel workbench, Auto-Director, Task Center, or model settings.",
        "Do not use preview_pipeline_run or any read-only tool as a substitute for formal execution.",
      ] : []),
      "Prefer the atomic intent semantic catalog for single intents such as list, query, retrieve, and bind.",
      "Use workflow intent only when the request clearly belongs to a compound flow such as full-book production, chapter writing, or failure diagnosis.",
      "If the user wording matches aliases or phrases in the catalog, return the corresponding canonical intent, not an alias or tool name.",
      "If the user clearly mentions a novel title, put it in novelTitle.",
      "If the user clearly mentions a world name, put it in worldName.",
      "If the user is describing a full new-book production task, use produce_novel and extract description, targetChapterCount, genre, worldType, styleTone, projectMode, pacePreference, narrativePov, emotionIntensity, aiFreedom, and defaultChapterLength when possible.",
      "If the user asks about Auto-Director current status, next step, keep pushing, advance to a checkpoint, switch propulsion method, or the impact of a manual rewrite, prefer the matching director intent instead of ordinary task status or whole-production status.",
      "When switching Auto-Director policy, if the user specifies advice only, proceed to the next step, advance to a checkpoint, or safe-range automatic advancement, set directorPolicyMode to suggest_only, run_next_step, run_until_gate, or auto_safe_scope respectively.",
      "If the user explicitly allows overwriting handwritten content, mayOverwriteUserContent may be true; otherwise do not guess.",
      "If the user is asking whether a keyword, relationship pattern, genre, setting, or world prototype exists in the knowledge base, indexed book-analysis material, or a world, or wants a setting similar to X, prefer search_knowledge. Do not misclassify as general_chat.",
      "If the user is cancelling or unbinding the current novel's world, for example they no longer want this world, prefer unbind_world_from_novel. Do not misclassify as bind_world_to_novel.",
      "If the user wants several alternatives from the current title, existing settings, or workspace, for example Give me alternatives, give a few directions, or provide 3 core-settings / story-promise / genre-style packages, prefer ideate_novel_setup. Do not misclassify as general_chat.",
      "projectMode may only be ai_led, co_pilot, draft_mode, or auto_pipeline; pacePreference may only be fast, balanced, or slow; narrativePov may only be first_person, third_person, or mixed.",
      "emotionIntensity and aiFreedom may only be low, medium, or high; defaultChapterLength is an integer from 500 to 10000.",
      "chapterSelectors may include: chapterId, orders, range{startOrder,endOrder}, relative{type,count}.",
      "If information is missing, do not guess a nonexistent chapterId. You may return only orders, range, or relative.",
      "If the user is asking about the basic character template library, prefer list_base_characters. If they are asking about character status in the current novel, prefer inspect_characters and require novel context.",
      "confidence must be a conservative score from 0 to 1.",
      "Return JSON only. Do not explain.",
    ].join("\n"),
    userPrompt: [
      `Current goals: ${input.goal}`,
      `context mode: ${input.contextMode}`,
      `novelId: ${input.novelId ?? "none"}`,
      `currentRunId: ${input.currentRunId ?? "none"}`,
      `Current run status: ${input.currentRunStatus ?? "queued"}`,
      `Current run step: ${input.currentStep ?? "planning"}`,
      `Recent messages:\n${recentMessages || "none"}`,
      `Atomic intent semantic catalog:\n${semanticCatalog}`,
      `Compound workflow recipes:\n${workflowRecipes}`,
      `Available tools:\n${toolCatalog}`,
      `Permission summary:\n${permissionSummary}`,
      "Output a valid JSON object.",
    ].join("\n\n"),
  };
}

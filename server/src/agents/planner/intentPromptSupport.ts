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
      "完成this novel",
      "把这本书写完",
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
    when: "用户在问Auto-Director运行到哪、是否Waiting for confirmation、当前节点或最近事件。",
    examples: [
      "Auto-Director现在到哪一步了",
      "当前导演任务是不是卡住了",
      "这条Automatic director tasks状态如何",
    ],
  },
  {
    intent: "explain_director_next_action",
    when: "用户询问current novel下一步该做什么、为什么这样推进、是否能Continue to direct automatically。",
    examples: [
      "What this book should do now",
      "What to do next",
      "Auto-Director建议我接下来做什么",
    ],
  },
  {
    intent: "evaluate_manual_edit_impact",
    when: "用户说自己改了正文、动机、伏笔或设定，并希望判断后续影响。",
    examples: [
      "我改了第三章，看看影响什么",
      "我改了主角动机，后续要不要重算",
      "我删了一个伏笔，会影响哪些章节",
    ],
  },
  {
    intent: "run_director_next_step",
    when: "用户明确要求creative centerContinue Auto-Director to the next step。",
    examples: [
      "Continue Auto-Director to the next step",
      "Let the director take one more step",
    ],
  },
  {
    intent: "run_director_until_gate",
    when: "用户明确要求Auto-Director持续推进到下一个检查点或确认点。",
    examples: [
      "Continue Auto-Director to the checkpoint",
      "Let the director advance to the next place that needs my confirmation",
    ],
  },
  {
    intent: "switch_director_policy",
    when: "用户明确要求调整自动Director's approach或自动化强度。",
    examples: [
      "Switch Auto-Director to suggestions only",
      "Switch to advancing to a checkpoint",
      "Allow auto-advance in a safe range",
    ],
  },
  {
    intent: "query_chapter_content",
    when: "用户要查看某章或某段Chapter scope的正文/摘要。",
    examples: [
      "返回给我第1章的内容",
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
    when: "用户要求推进某章写作。",
    examples: [
      "写第三章",
      "Continue writing5章",
    ],
  },
  {
    intent: "rewrite_chapter",
    when: "用户明确要求重写、改写某章。",
    examples: [
      "重写第三章",
      "把第6章改写一版",
    ],
  },
  {
    intent: "query_progress",
    when: "The user is asking how many chapters are written and where progress stands.",
    examples: [
      "当前写完了几章",
      "现在进度到哪了",
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
      return `intent 不受支持: ${rawIntent}`;
    }
    if (issue.code === "invalid_type") {
      return `字段 ${path} 类型不正确`;
    }
    if (issue.code === "invalid_value") {
      return `字段 ${path} 的值不在允许范围内`;
    }
    if (issue.code === "too_small") {
      return `字段 ${path} 缺少有效内容`;
    }
    if (issue.code === "too_big") {
      return `字段 ${path} 超出允许范围`;
    }
    return `字段 ${path} 不符合要求`;
  });
  return `LLM 返回的意图 JSON 无效: ${details.join("；")}`;
}

export function buildPlannerIntentPromptParts(input: PlannerInput): { systemPrompt: string; userPrompt: string } {
  const permissionSummary = getPermissionMatrixSummary();
  const recentMessages = input.messages.slice(-12).map((item) => `${item.role}: ${item.content}`).join("\n");
  const readonly = input.profile === "creative_hub_readonly";
  const semanticCatalog = buildSemanticCatalog();
  const workflowRecipes = readonly ? "只提供查询、诊断、解释和导航，不提供生产 workflow。" : buildWorkflowRecipeCatalog();
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
        : "creative center默认是协作式创作搭档，不是命令路由器。",
      "You must explicitly return interactionMode, assistantResponse, shouldAskFollowup, and missingInfo in JSON.",
      "如果用户还在探索方向、比较方案、表达不满、寻求诊断，或者创作目标本身还不够清晰，优先把 interactionMode 设为 co_create 或 review，并把 shouldAskFollowup 设为 true。",
      "Set interactionMode to execute only when the user clearly asks to create, bind, save, start a task, or write content now.",
      "当下一步更适合追问澄清时，assistantResponse 用 ask_followup；当下一步更适合给方案备选时，assistantResponse 用 offer_options。",
      "If the user is only greeting and has not entered a writing task, prefer intent social_opening over general_chat.",
      "你是Novel creation Agent 的意图解析器，只能返回一个 JSON 对象。",
      "你的任务不是直接规划所有工具，而是先识别用户真实意图和章节槽位。",
      `intent 必须是以下枚举之一：${(readonly ? INTENT_NAMES.filter((intent) => !["create_novel", "select_novel_workspace", "bind_world_to_novel", "unbind_world_from_novel", "produce_novel", "run_director_next_step", "run_director_until_gate", "switch_director_policy", "write_chapter", "rewrite_chapter", "save_chapter_draft", "start_pipeline", "ideate_novel_setup"].includes(intent)) : INTENT_NAMES).join(", ")}。`,
      ...(readonly ? [
        "用户要求创建、生成、写作、修改、保存、启动、继续、恢复、重试、取消或审批时，统一返回 workflow_handoff，并在 note 中说明应该进入正式Novel workbench、Auto-Director、任务中心或Model settings。",
        "不要用 preview_pipeline_run 或任何只读工具替代正式执行。",
      ] : []),
      "优先使用原子意图语义目录识别列表、查询、检索、绑定这类单一意图。",
      "Use workflow intent only when the request clearly belongs to a compound flow such as full-book production, chapter writing, or failure diagnosis.",
      "If the user wording matches aliases or phrases in the catalog, return the corresponding canonical intent, not an alias or tool name.",
      "如果用户明确提到Novel title，可以放入 novelTitle。",
      "如果用户明确提到世界观名称，可以放入 worldName。",
      "如果用户是在描述一本完整新书的生产任务，请使用 produce_novel，并尽量提取 description、targetChapterCount、genre、worldType、styleTone、projectMode、pacePreference、narrativePov、emotionIntensity、aiFreedom、defaultChapterLength。",
      "如果用户围绕Auto-Director询问Current status、下一步、keep pushing forward、Advance to checkpoint、切换Propulsion method或手动改文影响，应优先使用对应 director intent，而不是Common tasks状态或Whole production状态。",
      "切换Auto-Director策略时，如果用户指定Just give advice、Proceed to the next step、Advance to checkpoint或Safe range automatic advancement，应分别填 directorPolicyMode 为 suggest_only、run_next_step、run_until_gate、auto_safe_scope。",
      "如果用户明确允许覆盖手写内容，mayOverwriteUserContent 可设为 true；否则不要猜测。",
      "如果用户在问某个关键词、关系模式、题材、设定或世界观原型是否存在于知识库、已索引的拆书资料或世界观中，或者想找类似于 X 的设定或参考案例，优先使用 search_knowledge，不要误判成 general_chat。",
      "如果用户是在取消或解绑current novel的世界观，例如不要这个世界观了、取消世界观绑定、先不用某某世界观，优先使用 unbind_world_from_novel，不要误判成 bind_world_to_novel。",
      "如果用户想基于当前标题、已有设定或当前工作区信息生成几套备选方案，例如Give me alternatives、给几个方向、提供 3 套core settings或story promise或题材风格方案，优先使用 ideate_novel_setup，不要误判成 general_chat。",
      "projectMode 只能是 ai_led、co_pilot、draft_mode、auto_pipeline；pacePreference 只能是 fast、balanced、slow；narrativePov 只能是 first_person、third_person、mixed。",
      "emotionIntensity 和 aiFreedom 只能是 low、medium、high；defaultChapterLength 是 500 到 10000 的整数。",
      "chapterSelectors 可包含：chapterId、orders、range{startOrder,endOrder}、relative{type,count}。",
      "If information is missing, do not guess a nonexistent chapterId. You may return only orders, range, or relative.",
      "如果用户问的是Basic role模板库，应该偏向 list_base_characters；如果用户问的是current novel中的character status，应该偏向 inspect_characters，并要求小说上下文。",
      "confidence must be a conservative score from 0 to 1.",
      "只返回 JSON，不要解释。",
    ].join("\n"),
    userPrompt: [
      `Current goals: ${input.goal}`,
      `context mode: ${input.contextMode}`,
      `novelId: ${input.novelId ?? "none"}`,
      `currentRunId: ${input.currentRunId ?? "none"}`,
      `当前 run 状态: ${input.currentRunStatus ?? "queued"}`,
      `当前 run 步骤: ${input.currentStep ?? "planning"}`,
      `最近消息:\n${recentMessages || "none"}`,
      `原子意图语义目录:\n${semanticCatalog}`,
      `复合 workflow recipes:\n${workflowRecipes}`,
      `可用工具总览:\n${toolCatalog}`,
      `权限摘要:\n${permissionSummary}`,
      "Output a valid JSON object.",
    ].join("\n\n"),
  };
}

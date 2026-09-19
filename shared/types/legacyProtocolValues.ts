/**
 * Dual-read map for persisted protocol values that used to be stored in Chinese.
 * Runtime rule: accept old or new on read, write English only.
 * Do not use this map to rewrite user-authored novel prose or knowledge bodies.
 */

export const STORY_FUNCTION_VALUES = [
  "protagonist",
  "antagonist",
  "mentor",
  "foil",
  "supporting",
] as const;
export type StoryFunctionValue = (typeof STORY_FUNCTION_VALUES)[number];

export const GROWTH_STAGE_VALUES = [
  "origin",
  "setback",
  "turn",
  "awakening",
  "resolution",
] as const;
export type GrowthStageValue = (typeof GROWTH_STAGE_VALUES)[number];

export const DEFAULT_THREAD_TITLE = "New thread";
export const LEGACY_THREAD_TITLES = ["新对话", "new conversation", DEFAULT_THREAD_TITLE] as const;

export const BEAT_FALLBACK_LABEL = "Beat";
export const VOLUME_ROLE_FALLBACK_PREFIX = "Volume";

export const STORY_FUNCTION_MAP: Record<string, StoryFunctionValue> = {
  主角: "protagonist",
  反派: "antagonist",
  导师: "mentor",
  对照组: "foil",
  配角: "supporting",
  protagonist: "protagonist",
  antagonist: "antagonist",
  mentor: "mentor",
  foil: "foil",
  supporting: "supporting",
};

export const STORY_FUNCTION_LABELS: Record<StoryFunctionValue, string> = {
  protagonist: "Protagonist",
  antagonist: "Antagonist",
  mentor: "Mentor",
  foil: "Foil",
  supporting: "Supporting",
};

export const GROWTH_STAGE_MAP: Record<string, GrowthStageValue> = {
  起点: "origin",
  受挫: "setback",
  转折: "turn",
  觉醒: "awakening",
  收束: "resolution",
  origin: "origin",
  setback: "setback",
  turn: "turn",
  awakening: "awakening",
  resolution: "resolution",
};

export const GROWTH_STAGE_LABELS: Record<GrowthStageValue, string> = {
  origin: "Origin",
  setback: "Setback",
  turn: "Turn",
  awakening: "Awakening",
  resolution: "Resolution",
};

export const WORLD_TYPE_MAP: Record<string, string> = {
  东方玄幻: "Oriental fantasy",
  仙侠: "Xianxia",
  都市异能: "Urban superpower",
  科幻: "Science fiction",
  西方奇幻: "Western fantasy",
  末日废土: "Post-apocalyptic wasteland",
  历史架空: "Alternate history",
  赛博朋克: "Cyberpunk",
  自定义: "Custom",
  "Oriental fantasy": "Oriental fantasy",
  Xianxia: "Xianxia",
  "Urban superpower": "Urban superpower",
  "Science fiction": "Science fiction",
  "Western fantasy": "Western fantasy",
  "Post-apocalyptic wasteland": "Post-apocalyptic wasteland",
  "Alternate history": "Alternate history",
  Cyberpunk: "Cyberpunk",
  Custom: "Custom",
};

export const WORLD_LAYER_MAP: Record<string, string> = {
  基础: "foundation",
  基础层: "foundation",
  世界基础: "foundation",
  力量: "power",
  力量层: "power",
  力量体系: "power",
  能力体系: "power",
  社会: "society",
  社会层: "society",
  势力: "society",
  政治: "society",
  文化: "culture",
  文化层: "culture",
  风俗: "culture",
  历史: "history",
  历史层: "history",
  冲突: "conflict",
  冲突层: "conflict",
  foundation: "foundation",
  power: "power",
  society: "society",
  culture: "culture",
  history: "history",
  conflict: "conflict",
};

export const BEAT_ROLE_LABEL_MAP: Record<string, string> = {
  开卷抓手: "Opening hook",
  首次升级: "First escalation",
  早期变数: "Early complication",
  中段转向: "Midpoint turn",
  高潮前挤压: "Pre-climax pressure",
  后段变数: "Late complication",
  卷高潮: "Volume climax",
  卷尾钩子: "Ending hook",
  节奏段: "Beat",
  "Opening hook": "Opening hook",
  "First escalation": "First escalation",
  "Early complication": "Early complication",
  "Midpoint turn": "Midpoint turn",
  "Pre-climax pressure": "Pre-climax pressure",
  "Late complication": "Late complication",
  "Volume climax": "Volume climax",
  "Ending hook": "Ending hook",
  Beat: "Beat",
};

/** Exact-match product labels snapshotted onto tasks (currentItemLabel, titles). */
export const PRODUCT_SNAPSHOT_LABEL_MAP: Record<string, string> = {
  新对话: DEFAULT_THREAD_TITLE,
  "new conversation": DEFAULT_THREAD_TITLE,
  项目设定: "Project setup",
  故事宏观规划: "Story planning",
  世界观准备: "World setup",
  角色准备: "Character setup",
  卷战略: "Volume strategy",
  "卷战略 / 卷骨架": "Volume strategy / skeleton",
  "节奏 / 拆章": "Beats / chapters",
  章节执行: "Chapter execution",
  质量修复: "Quality repair",
  自动导演: "Auto-Director",
  生成书级候选: "Generate book-level candidates",
  修订候选方向: "Revise the candidate direction",
  定向修正候选: "Patch the candidate direction",
  优化候选书名: "Refine candidate titles",
  创建小说项目: "Create the novel project",
  "执行 AI 自动导演接管": "Run Auto-Director takeover",
  生成故事宏观规划: "Generate the story plan",
  生成书级创作约定: "Generate the book contract",
  准备本书世界: "Prepare this book's world",
  准备角色阵容与角色资产: "Prepare the cast and character assets",
  生成分卷策略与推进路线: "Generate the volume strategy",
  生成目标卷节奏板: "Generate the volume beat sheet",
  生成卷拆章列表: "Generate the chapter list",
  细化章节任务单与执行资源: "Detail chapter task sheets",
  同步章节执行合同: "Sync chapter execution contracts",
  执行章节生成批次: "Run the chapter generation batch",
  检查章节质量: "Review chapter quality",
  修复章节问题: "Repair chapter issues",
  提交章节连续性状态: "Commit continuity state",
  同步读者承诺与伏笔: "Sync reader promises and payoffs",
  同步角色资源状态: "Sync character resource state",
  执行章节质量修复: "Run chapter quality repair",
  等待确认书级方向: "Waiting to confirm the book direction",
  书级规划已就绪: "Book planning is ready",
  角色准备待确认: "Character setup needs confirmation",
  卷战略已就绪: "Volume strategy is ready",
  章节执行可继续: "Chapter execution can continue",
  "节奏拆章完成，可进入章节执行": "Beat/chapter split is done; writing can start",
  自动执行已暂停: "Auto-run is paused",
  "步骤已生成，等待检查": "Step generated; waiting for review",
  "当前步骤已完成，请检查后继续": "This step is done; review it before continuing",
  逐步协作已暂停: "Step-by-step collaboration is paused",
  需要处理质量修复: "Quality repair needs attention",
  导演主流程已完成: "Director main flow is complete",
  重写前备份已创建: "Pre-rewrite backup created",
  生成书级方向: "Generate the book direction",
  细化书级方向: "Refine the book direction",
  修正书级方向: "Patch the book direction",
  优化书名: "Refine the title",
  接管已有项目: "Take over an existing project",
  书级创作约定: "Book contract",
  角色阵容准备: "Cast setup",
  分卷策略: "Volume strategy",
  生成分卷策略: "Generate the volume strategy",
  拆章与任务单: "Chapter split and task sheets",
  生成节奏板: "Generate the beat sheet",
  生成章节列表: "Generate the chapter list",
  准备章节任务单: "Prepare chapter task sheets",
  同步章节执行资源: "Sync chapter execution resources",
  章节执行流程: "Chapter execution flow",
  章节质量检查: "Chapter quality review",
  章节问题修复: "Chapter issue repair",
  小说流程任务: "Novel workflow task",
  等待创建项目: "Waiting to create the project",
  "AI 自动导演小说": "Auto-Director novel",
  等待生成候选方向: "Waiting to generate candidate directions",
  把想法写成作品: "Turn the idea into a book",
  正在理解你的想法: "Understanding your idea",
  正在收尾章节流水线任务: "Finishing the chapter pipeline task",
  排队: "Queued",
  提取笔记: "Extracting notes",
  生成章节: "Generating chapters",
  收尾: "Finishing",
  审校: "Reviewing",
  修复: "Repairing",
  提交请求: "Submitting request",
  生成图片: "Generating images",
  保存素材: "Saving assets",
  提取写法特征: "Extracting style features",
  整理保留策略: "Building keep/change policy",
  自动保存写法: "Saving the writing profile",
};

const EXACT_REWRITE_MAP: Record<string, string> = {
  ...STORY_FUNCTION_MAP,
  ...GROWTH_STAGE_MAP,
  ...WORLD_TYPE_MAP,
  ...WORLD_LAYER_MAP,
  ...BEAT_ROLE_LABEL_MAP,
  ...PRODUCT_SNAPSHOT_LABEL_MAP,
};

const VOLUME_ROLE_PATTERN = /^第\s*(\d+)\s*卷定位$/;
const VOLUME_TITLE_PATTERN = /^第\s*(\d+)\s*卷$/;

export function canonicalizeStoryFunction(value: string | null | undefined): StoryFunctionValue | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return STORY_FUNCTION_MAP[trimmed];
}

export function canonicalizeGrowthStage(value: string | null | undefined): GrowthStageValue | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return GROWTH_STAGE_MAP[trimmed];
}

export function canonicalizeWorldType(value: string | null | undefined): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return WORLD_TYPE_MAP[trimmed] ?? (trimmed ? trimmed : undefined);
}

export function canonicalizeWorldLayer(value: string | null | undefined): string | undefined {
  if (typeof value !== "string") return undefined;
  return WORLD_LAYER_MAP[value.trim()];
}

export function canonicalizeBeatRoleLabel(value: string | null | undefined): string | undefined {
  if (typeof value !== "string") return undefined;
  return BEAT_ROLE_LABEL_MAP[value.trim()];
}

export function isPlaceholderThreadTitle(value: string | null | undefined): boolean {
  if (typeof value !== "string") return false;
  return (LEGACY_THREAD_TITLES as readonly string[]).includes(value.trim());
}

export function rewriteExactProtocolString(value: string): string {
  const trimmed = value.trim();
  const mapped = EXACT_REWRITE_MAP[trimmed];
  if (mapped) return mapped;
  const volumeRole = trimmed.match(VOLUME_ROLE_PATTERN);
  if (volumeRole) return `Volume ${volumeRole[1]} role`;
  const volumeTitle = trimmed.match(VOLUME_TITLE_PATTERN);
  if (volumeTitle) return `Volume ${volumeTitle[1]}`;
  return value;
}

export function rewriteProtocolJsonValue(value: unknown): unknown {
  if (typeof value === "string") {
    return rewriteExactProtocolString(value);
  }
  if (Array.isArray(value)) {
    return value.map((item) => rewriteProtocolJsonValue(item));
  }
  if (value && typeof value === "object") {
    const next: Record<string, unknown> = {};
    for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
      next[key] = rewriteProtocolJsonValue(nested);
    }
    return next;
  }
  return value;
}

export function rewriteProtocolJsonText(raw: string | null | undefined): string | null {
  if (!raw?.trim()) return raw ?? null;
  try {
    const parsed: unknown = JSON.parse(raw);
    const rewritten = rewriteProtocolJsonValue(parsed);
    const next = JSON.stringify(rewritten);
    return next === raw ? raw : next;
  } catch {
    return raw;
  }
}

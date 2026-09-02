interface DynamicUiPattern {
  pattern: RegExp;
  replace: (...groups: string[]) => string;
}

const DYNAMIC_UI_PATTERNS: DynamicUiPattern[] = [
  {
    pattern: /还有\s*(\d+)\s*类创作任务没有可用模型路由。/g,
    replace: (count) => `There are ${count} authoring task types with no available model route.`,
  },
  {
    pattern: /第\s*(\d+)\s*步\s*\/\s*共\s*(\d+)\s*步/g,
    replace: (current, total) => `Step ${current} of ${total}`,
  },
  {
    pattern: /已选择\s*(\d+)\s*本作品，可在各榜单右上角全选或逐本调整。/g,
    replace: (count) => `${count} works selected. Use each ranking's top-right control to select all or adjust individually.`,
  },
  {
    pattern: /开始 AI 分析（\s*(\d+)\s*本）/g,
    replace: (count) => `Start AI analysis (${count} works)`,
  },
  {
    pattern: /AI 分析中\s*(\d+)%/g,
    replace: (progress) => `AI analysis in progress: ${progress}%`,
  },
  {
    pattern: /已可使用\s+(.+?)\s+进行正文与规划生成。/g,
    replace: (provider) => `${provider} is ready for drafting and planning.`,
  },
  {
    pattern: /未配置\s+(.+?)\s+的 API Key。/g,
    replace: (provider) => `${provider} API Key is not configured.`,
  },
  {
    pattern: /任务使用：(.+?)。/g,
    replace: (provider) => `Used for tasks: ${provider}.`,
  },
  {
    pattern: /(.+?)\s*·\s*(.+?)\s*·\s*(\d+)\s*条任务路由/g,
    replace: (provider, model, count) => `${provider} · ${model} · ${count} task routes`,
  },
  {
    pattern: /(\d+)\s*条任务路由/g,
    replace: (count) => `${count} task routes`,
  },
  {
    pattern: /(\d+)\s*个提示词/g,
    replace: (count) => `${count} prompts`,
  },
  {
    pattern: /(\d+)\s*个槽位/g,
    replace: (count) => `${count} slots`,
  },
  {
    pattern: /当前触发时仍会结束当前任务。/g,
    replace: () => "The current task will still end when triggered.",
  },
  {
    pattern: /当前触发时仍会暂停等待处理。/g,
    replace: () => "The task will still pause for review when triggered.",
  },
];

export function translateDynamicUiText(source: string): string {
  return DYNAMIC_UI_PATTERNS.reduce((value, entry) => (
    value.replace(entry.pattern, (_match, ...args: string[]) => entry.replace(...args))
  ), source);
}

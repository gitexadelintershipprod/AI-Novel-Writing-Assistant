/**
 * 竖屏付费短剧节奏引擎（P1 核心 · 平台护城河）
 *
 * 把竖屏付费短剧的真实创作法则落成确定性、可配置的规则集：
 * 钩子类型库 / 赛道模板库 / 付费卡点策略 / 情绪曲线目标。
 *
 * 这是来源无关的纯领域知识，不依赖 LLM、不依赖任何外部模块，
 * 供策略规划与分集大纲阶段查询与约束。
 */

// ============================================================
// 钩子类型库
// ============================================================
export type HookTypeId =
  | "identity_reversal" // 身份反转
  | "face_slap" // 打脸
  | "hidden_strength" // 扮猪吃老虎/实力隐藏
  | "mask_drop" // 马甲掉落
  | "misunderstanding" // 误会
  | "crisis" // 危机降临
  | "emotional_tug" // 情感拉扯
  | "crushing_power" // 实力碾压
  | "villain_provoke" // 反派挑衅
  | "secret_reveal"; // 秘密揭露

export interface HookType {
  id: HookTypeId;
  label: string;
  description: string;
  /** 适合放在开场钩子还是集尾卡点，或两者皆可 */
  placement: "opening" | "cliffhanger" | "both";
}

export const HOOK_TYPES: readonly HookType[] = [
  { id: "identity_reversal", label: "Identity reversal", description: "A hidden true identity is partly revealed or hinted at, overturning what others believed.", placement: "both" },
  { id: "face_slap", label: "Comeuppance", description: "Someone who scorned or humiliated the protagonist is publicly proven wrong. High-frequency payoff.", placement: "both" },
  { id: "hidden_strength", label: "Hidden strength", description: "The protagonist plays weak on purpose, then lets real power show at a key moment.", placement: "both" },
  { id: "mask_drop", label: "Mask drop", description: "One layer of the protagonist's hidden title, faction, or wealth is peeled back.", placement: "cliffhanger" },
  { id: "misunderstanding", label: "Misunderstanding", description: "An information gap creates conflict: the audience knows, the character does not.", placement: "opening" },
  { id: "crisis", label: "Crisis hits", description: "A sudden threat closes in on the protagonist or someone they care about.", placement: "both" },
  { id: "emotional_tug", label: "Emotional tug", description: "Ambiguity, misunderstanding, or a near-miss push the romance line and keep emotional viewers watching.", placement: "cliffhanger" },
  { id: "crushing_power", label: "Crushing power", description: "The protagonist solves an impossible-looking situation from a position of absolute advantage.", placement: "both" },
  { id: "villain_provoke", label: "Villain provocation", description: "The antagonist keeps pressing or publicly taunts, building audience frustration.", placement: "opening" },
  { id: "secret_reveal", label: "Secret reveal", description: "A key secret or planted setup is uncovered, and the story enters a new stage.", placement: "cliffhanger" },
] as const;

// ============================================================
// 赛道模板库
// ============================================================
export type TrackId =
  | "counterattack" // 逆袭
  | "rebirth_revenge" // Rebirth for Revenge
  | "war_god" // Return of the God of War
  | "live_in_son" // 赘婿
  | "miracle_doctor" // 神医
  | "rich_family" // Grudges between wealthy families
  | "sweet_love" // 甜宠
  | "hidden_identity"; // 马甲文

export interface TrackTemplate {
  id: TrackId;
  label: string;
  description: string;
  /** 典型人设组合 */
  typicalArchetypes: string[];
  /** 该赛道偏好的钩子类型 */
  preferredHooks: HookTypeId[];
  /** 爽点节奏说明 */
  rhythmNote: string;
  /** 赛道禁忌（黑名单），避免拖节奏/劝退 */
  taboos: string[];
}

export const TRACK_TEMPLATES: readonly TrackTemplate[] = [
  {
    id: "counterattack",
    label: "Counterattack",
    description: "A bottom-rung or oppressed protagonist turns the tables through skill or opportunity, with frequent comeuppance.",
    typicalArchetypes: ["Hidden-strength protagonist", "Snobbish supporting character", "Arrogant antagonist"],
    preferredHooks: ["face_slap", "hidden_strength", "crushing_power", "villain_provoke"],
    rhythmNote: "One comeuppance payoff every 1-2 episodes. Stack the deepest frustration before the paywall, then deliver the strongest reversal.",
    taboos: ["The protagonist swallows insults for too long without a reply", "Long background dumps", "Scenic description"],
  },
  {
    id: "rebirth_revenge",
    label: "Rebirth for Revenge",
    description: "The protagonist is reborn with past-life memory and takes precise revenge on their enemies.",
    typicalArchetypes: ["Rebirth-for-revenge protagonist", "Past-life enemy", "Benefactor they failed in the past life"],
    preferredHooks: ["secret_reveal", "face_slap", "identity_reversal", "crisis"],
    rhythmNote: "Use foreknowledge for crushing revenge. Pay off one unfinished past-life score each episode.",
    taboos: ["Revenge that drags without payoff", "The protagonist mercifully lets enemies go", "Repeated past-life flashbacks"],
  },
  {
    id: "war_god",
    label: "Return of the God of War",
    description: "A retired or abandoned powerhouse returns, protects their people, and sweeps the field.",
    typicalArchetypes: ["Hidden-strength war god", "Contemptuous in-laws", "External strong enemy"],
    preferredHooks: ["mask_drop", "crushing_power", "villain_provoke", "identity_reversal"],
    rhythmNote: "Peel hidden identities layer by layer, and escalate crushing power with each reveal.",
    taboos: ["Exposing every trump card too early", "A confused power system", "Weakness with no reason"],
  },
  {
    id: "live_in_son",
    label: "Live-in son-in-law",
    description: "A despised live-in son-in-law is actually a hidden powerhouse, and the reversal lands as public comeuppance.",
    typicalArchetypes: ["Hidden-identity son-in-law", "Snobbish in-laws", "Bullying brothers-in-law"],
    preferredHooks: ["hidden_strength", "face_slap", "mask_drop", "villain_provoke"],
    rhythmNote: "Humiliation builds pressure -> identity or power is exposed -> public comeuppance, then the cycle escalates.",
    taboos: ["In-laws so stupid they break credibility", "The protagonist stays spineless too long", "Identity is revealed too fast and tension dies"],
  },
  {
    id: "miracle_doctor",
    label: "Miracle doctor",
    description: "A doctor with unmatched skill brings people back from the brink and outclasses every rival physician.",
    typicalArchetypes: ["Hidden-strength miracle doctor", "Arrogant specialist", "Powerful patient seeking treatment"],
    preferredHooks: ["crushing_power", "face_slap", "crisis", "secret_reveal"],
    rhythmNote: "Each miraculous save slaps down medical authority. Professional dominance is the payoff.",
    taboos: ["Hard medical-knowledge errors", "Treatment scenes that run too long", "Pure showing-off with no conflict"],
  },
  {
    id: "rich_family",
    label: "Wealthy-family feud",
    description: "Internal power struggles, inheritance fights, and a hidden birth secret tangle together.",
    typicalArchetypes: ["Fallen heiress / hidden heir", "Vicious relatives", "Inscrutable family head"],
    preferredHooks: ["identity_reversal", "secret_reveal", "emotional_tug", "face_slap"],
    rhythmNote: "Birth, fortune, and romance run in parallel. Drop one reversal each episode.",
    taboos: ["Relationships too tangled to remember", "Fighting with no new information", "Pacing that drags"],
  },
  {
    id: "sweet_love",
    label: "Sweet romance",
    description: "A romance line with strong emotional hooks, alternating sugar and tug-of-war.",
    typicalArchetypes: ["High-status male lead", "Stubborn female lead", "Love rival"],
    preferredHooks: ["emotional_tug", "misunderstanding", "identity_reversal", "crisis"],
    rhythmNote: "Alternate sweet beats and hurt beats. Leave an emotional cliffhanger at episode end.",
    taboos: ["Mindless sweetness with no tension", "A misunderstanding that lasts so long it turns abusive", "A male lead who becomes oily and oversteps"],
  },
  {
    id: "hidden_identity",
    label: "Hidden identity",
    description: "The protagonist has multiple hidden identities that drop one by one and stun the room.",
    typicalArchetypes: ["Multi-mask protagonist", "Skeptic", "Admirer"],
    preferredHooks: ["mask_drop", "identity_reversal", "face_slap", "secret_reveal"],
    rhythmNote: "Drop one hidden identity every few episodes, stacking the wow factor.",
    taboos: ["Too many identities to remember", "A mask drop with no setup", "Identities that carry no weight"],
  },
] as const;

// ============================================================
// Pay card points策略 & sentiment curve
// ============================================================
export interface PaywallStrategy {
  /** 免费引流集数：前 N 集免费，必须立住主爽点与追剧动力 */
  freeEpisodes: number;
  /** 首付费点：卡在第一个大反转/情绪最高点 */
  firstPaywallAt: number;
  /** 之后每隔几集设强卡点（1=每集集尾都卡） */
  paywallCadence: number;
}

/** 竖屏付费短剧默认卡点策略 */
export const DEFAULT_PAYWALL_STRATEGY: PaywallStrategy = {
  freeEpisodes: 10,
  firstPaywallAt: 12,
  paywallCadence: 1,
};

export interface EmotionCurveTarget {
  description: string;
  /** 每个滑动窗口（集）内情绪净值至少要有一次正向释放 */
  releaseEveryEpisodes: number;
  /** 付费点前允许的最大憋屈蓄势深度（负值） */
  maxBuildupDepth: number;
}

export const DEFAULT_EMOTION_CURVE: EmotionCurveTarget = {
  description: "Frustration builds -> reversal releases it -> a new hook. One release every 1-2 episodes. Stack the deepest frustration before the paywall, then deliver the strongest release.",
  releaseEveryEpisodes: 2,
  maxBuildupDepth: -3,
};

// ============================================================
// 引擎
// ============================================================
export class RhythmEngine {
  listHooks(): readonly HookType[] {
    return HOOK_TYPES;
  }

  getHook(id: HookTypeId): HookType | undefined {
    return HOOK_TYPES.find((hook) => hook.id === id);
  }

  listTracks(): readonly TrackTemplate[] {
    return TRACK_TEMPLATES;
  }

  getTrack(id: TrackId): TrackTemplate | undefined {
    return TRACK_TEMPLATES.find((track) => track.id === id);
  }

  /** 该Track recommendations的钩子类型（完整对象） */
  recommendHooksForTrack(id: TrackId): HookType[] {
    const track = this.getTrack(id);
    if (!track) {
      return [];
    }
    return track.preferredHooks
      .map((hookId) => this.getHook(hookId))
      .filter((hook): hook is HookType => Boolean(hook));
  }

  /**
   * 计算Pay card point collection号列表（1-based）。
   * 首付费点起，按 cadence 标记强卡点，直到总集数。
   */
  buildPaywallPlan(targetEpisodes: number, strategy: PaywallStrategy = DEFAULT_PAYWALL_STRATEGY): number[] {
    const plan: number[] = [];
    const cadence = Math.max(1, strategy.paywallCadence);
    for (let ep = strategy.firstPaywallAt; ep <= targetEpisodes; ep += cadence) {
      plan.push(ep);
    }
    return plan;
  }

  /** 某集是否为Pay card point collection */
  isPaywallEpisode(
    episodeOrder: number,
    targetEpisodes: number,
    strategy: PaywallStrategy = DEFAULT_PAYWALL_STRATEGY,
  ): boolean {
    if (episodeOrder < strategy.firstPaywallAt || episodeOrder > targetEpisodes) {
      return false;
    }
    const cadence = Math.max(1, strategy.paywallCadence);
    return (episodeOrder - strategy.firstPaywallAt) % cadence === 0;
  }
}

export const rhythmEngine = new RhythmEngine();

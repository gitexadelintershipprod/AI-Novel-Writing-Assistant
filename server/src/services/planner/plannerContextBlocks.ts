import { createContextBlock } from "../../prompting/core/contextBudget";
import type { PromptContextBlock } from "../../prompting/core/promptTypes";

function buildBlockContent(label: string, value: string): string {
  return `${label}: ${value.trim() || "None"}`;
}

function buildVolumeOutline(input: Array<{
  sortOrder: number;
  title: string;
  summary: string | null;
  mainPromise: string | null;
  climax: string | null;
  chapters: Array<{
    chapterOrder: number;
    title: string;
    summary: string | null;
  }>;
}>): string {
  if (input.length === 0) {
    return "";
  }
  return input
    .slice()
    .sort((left, right) => left.sortOrder - right.sortOrder)
    .map((volume) => {
      const chapterSpan = volume.chapters.length > 0
        ? `${volume.chapters[0]?.chapterOrder ?? "-"}-${volume.chapters[volume.chapters.length - 1]?.chapterOrder ?? "-"}`
        : "Unopened";
      return [
        `[Chapter ${volume.sortOrder}Volume ]${volume.title}`,
        volume.summary ? `Volume Summary: ${volume.summary}` : "",
        volume.mainPromise ? `Main promise: ${volume.mainPromise}` : "",
        volume.climax ? `Volume climax: ${volume.climax}` : "",
        `Chapter range: ${chapterSpan}`,
      ].filter(Boolean).join("\n");
    })
    .join("\n\n");
}

function buildBookFramingText(input: {
  genreName?: string | null;
  targetAudience: string | null;
  bookSellingPoint: string | null;
  competingFeel: string | null;
  first30ChapterPromise: string | null;
  narrativePov?: string | null;
  pacePreference?: string | null;
  emotionIntensity?: string | null;
  styleTone?: string | null;
}): string {
  return [
    buildBlockContent("Theme base", input.genreName ?? "None"),
    buildBlockContent("target audience", input.targetAudience ?? "None"),
    buildBlockContent("core selling point", input.bookSellingPoint ?? "None"),
    buildBlockContent("Comparable-work impression", input.competingFeel ?? "None"),
    buildBlockContent("First-30-chapter promise", input.first30ChapterPromise ?? "None"),
    buildBlockContent("narrative perspective", input.narrativePov ?? "None"),
    buildBlockContent("rhythm preference", input.pacePreference ?? "None"),
    buildBlockContent("emotional intensity", input.emotionIntensity ?? "None"),
    buildBlockContent("Tone guardrail", input.styleTone ?? "None"),
  ].join("\n");
}

export function buildBookPlanContextBlocks(input: {
  novelTitle: string;
  description: string | null;
  genreName?: string | null;
  targetAudience: string | null;
  bookSellingPoint: string | null;
  competingFeel: string | null;
  first30ChapterPromise: string | null;
  narrativePov?: string | null;
  pacePreference?: string | null;
  emotionIntensity?: string | null;
  styleTone?: string | null;
  bible: string | null;
  chapterDrafts: string;
  plotBeats: string;
  storyModeBlock: string;
  styleEngine?: string | null;
}): PromptContextBlock[] {
  return [
    createContextBlock({
      id: "story_mode",
      group: "story_mode",
      priority: 95,
      content: input.storyModeBlock || "Story mode: none",
    }),
    createContextBlock({
      id: "novel_overview",
      group: "novel_overview",
      priority: 100,
      required: true,
      content: [
        `Novel: ${input.novelTitle}`,
        buildBlockContent("Description", input.description ?? ""),
      ].join("\n"),
    }),
    createContextBlock({
      id: "book_framing",
      group: "book_framing",
      priority: 99,
      content: buildBookFramingText({
        genreName: input.genreName,
        targetAudience: input.targetAudience,
        bookSellingPoint: input.bookSellingPoint,
        competingFeel: input.competingFeel,
        first30ChapterPromise: input.first30ChapterPromise,
        narrativePov: input.narrativePov,
        pacePreference: input.pacePreference,
        emotionIntensity: input.emotionIntensity,
        styleTone: input.styleTone,
      }),
    }),
    createContextBlock({
      id: "book_bible",
      group: "book_bible",
      priority: 90,
      content: buildBlockContent("Story bible", input.bible ?? "None"),
    }),
    createContextBlock({
      id: "style_engine",
      group: "style_engine",
      priority: 89,
      content: buildBlockContent("Style Engine constraints", input.styleEngine ?? "None"),
    }),
    createContextBlock({
      id: "chapter_drafts",
      group: "chapter_drafts",
      priority: 70,
      content: buildBlockContent("Chapter drafts", input.chapterDrafts || "None"),
    }),
    createContextBlock({
      id: "plot_beats",
      group: "plot_beats",
      priority: 60,
      content: buildBlockContent("Plot beats", input.plotBeats || "None"),
    }),
  ];
}

export function buildArcPlanContextBlocks(input: {
  novelTitle: string;
  description: string | null;
  genreName?: string | null;
  targetAudience: string | null;
  bookSellingPoint: string | null;
  competingFeel: string | null;
  first30ChapterPromise: string | null;
  narrativePov?: string | null;
  pacePreference?: string | null;
  emotionIntensity?: string | null;
  styleTone?: string | null;
  bible: string | null;
  chapters: string;
  storyModeBlock: string;
  styleEngine?: string | null;
}): PromptContextBlock[] {
  return [
    createContextBlock({
      id: "story_mode",
      group: "story_mode",
      priority: 95,
      content: input.storyModeBlock || "Story mode: none",
    }),
    createContextBlock({
      id: "novel_overview",
      group: "novel_overview",
      priority: 100,
      required: true,
      content: [
        `Novel: ${input.novelTitle}`,
        buildBlockContent("Description", input.description ?? ""),
      ].join("\n"),
    }),
    createContextBlock({
      id: "book_framing",
      group: "book_framing",
      priority: 99,
      content: buildBookFramingText({
        genreName: input.genreName,
        targetAudience: input.targetAudience,
        bookSellingPoint: input.bookSellingPoint,
        competingFeel: input.competingFeel,
        first30ChapterPromise: input.first30ChapterPromise,
        narrativePov: input.narrativePov,
        pacePreference: input.pacePreference,
        emotionIntensity: input.emotionIntensity,
        styleTone: input.styleTone,
      }),
    }),
    createContextBlock({
      id: "book_bible",
      group: "book_bible",
      priority: 90,
      content: buildBlockContent("Story bible", input.bible ?? "None"),
    }),
    createContextBlock({
      id: "style_engine",
      group: "style_engine",
      priority: 89,
      content: buildBlockContent("Style Engine constraints", input.styleEngine ?? "None"),
    }),
    createContextBlock({
      id: "chapter_drafts",
      group: "chapter_drafts",
      priority: 75,
      content: buildBlockContent("Existing chapters", input.chapters || "None"),
    }),
  ];
}

export function buildChapterPlanContextBlocks(input: {
  novelTitle: string;
  description: string | null;
  genreName?: string | null;
  targetAudience: string | null;
  bookSellingPoint: string | null;
  competingFeel: string | null;
  first30ChapterPromise: string | null;
  narrativePov?: string | null;
  pacePreference?: string | null;
  emotionIntensity?: string | null;
  styleTone?: string | null;
  chapterExpectation: string | null;
  chapterTaskSheet: string | null;
  chapterTargetWordCount?: number | null;
  bible: string | null;
  styleEngine?: string | null;
  outline: string | null;
  structuredOutline: string | null;
  mappedVolumes: Array<{
    sortOrder: number;
    title: string;
    summary: string | null;
    mainPromise: string | null;
    climax: string | null;
    updatedAt: string;
    chapters: Array<{
      chapterOrder: number;
      title: string;
      summary: string | null;
    }>;
  }>;
  bookPlan: string;
  arcPlans: string;
  characters: string;
  recentSummaries: string;
  plotBeats: string;
  stateSnapshot: string;
  openAuditIssues: string;
  recentDecisions: string;
  characterDynamicsSummary: string;
  characterVolumeAssignments: string;
  characterRelationStages: string;
  characterCandidateGuards: string;
  defaultMetadata: string;
  stateDrivenDirective: string;
  stateDrivenGoal: string;
  replanContext: string;
  replanConflictLevelAnchors?: string;
  storyMacroSummary: string;
  currentVolumeWindow: string;
  payoffLedgerSummary: string;
  storyModeBlock: string;
}): PromptContextBlock[] {
  const volumeOutline = buildVolumeOutline(input.mappedVolumes);
  const volumeSummary = input.mappedVolumes.length > 0
    ? input.mappedVolumes.map((volume) => `${volume.sortOrder}. ${volume.title} | ${volume.mainPromise ?? volume.summary ?? "None"}${volume.climax ? ` | climax=${volume.climax}` : ""}`).join("\n")
    : "None";

  return [
    createContextBlock({
      id: "story_mode",
      group: "story_mode",
      priority: 95,
      content: input.storyModeBlock || "Story mode: none",
    }),
    createContextBlock({
      id: "novel_overview",
      group: "novel_overview",
      priority: 100,
      required: true,
      content: [
        `Novel: ${input.novelTitle}`,
        buildBlockContent("Description", input.description ?? ""),
      ].join("\n"),
    }),
    createContextBlock({
      id: "book_framing",
      group: "book_framing",
      priority: 99,
      content: buildBookFramingText({
        genreName: input.genreName,
        targetAudience: input.targetAudience,
        bookSellingPoint: input.bookSellingPoint,
        competingFeel: input.competingFeel,
        first30ChapterPromise: input.first30ChapterPromise,
        narrativePov: input.narrativePov,
        pacePreference: input.pacePreference,
        emotionIntensity: input.emotionIntensity,
        styleTone: input.styleTone,
      }),
    }),
    createContextBlock({
      id: "chapter_target",
      group: "chapter_target",
      priority: 100,
      required: true,
      content: [
        buildBlockContent("Chapter objective draft", input.chapterExpectation ?? "None"),
        buildBlockContent("Chapter target words", typeof input.chapterTargetWordCount === "number" ? `${input.chapterTargetWordCount} words` : "None"),
        buildBlockContent("task order", input.chapterTaskSheet ?? "None"),
        buildBlockContent("State-driven decision", input.stateDrivenDirective),
        buildBlockContent("Default structural-role guidance", input.defaultMetadata),
      ].join("\n"),
    }),
    createContextBlock({
      id: "book_bible",
      group: "book_bible",
      priority: 92,
      content: buildBlockContent("Story bible", input.bible ?? "None"),
    }),
    createContextBlock({
      id: "style_engine",
      group: "style_engine",
      priority: 91,
      content: buildBlockContent("Style Engine constraints", input.styleEngine ?? "None"),
    }),
    createContextBlock({
      id: "current_volume_window",
      group: "current_volume_window",
      priority: 97,
      content: buildBlockContent("Current volume window", input.currentVolumeWindow || "None"),
    }),
    createContextBlock({
      id: "story_macro",
      group: "story_macro",
      priority: 96,
      content: buildBlockContent("Story macro constraints", input.storyMacroSummary || "None"),
    }),
    createContextBlock({
      id: "payoff_ledger",
      group: "payoff_ledger",
      priority: 95,
      content: buildBlockContent("Payoff ledger", input.payoffLedgerSummary || "None"),
    }),
    createContextBlock({
      id: "volume_summary",
      group: "volume_summary",
      priority: 95,
      freshness: input.mappedVolumes.length > 0 ? 3 : 0,
      content: [
        buildBlockContent("Volume workspace summary", volumeSummary),
        volumeOutline ? buildBlockContent("Expanded volume workspace", volumeOutline) : "",
      ].filter(Boolean).join("\n"),
    }),
    createContextBlock({
      id: "legacy_outline_source",
      group: "legacy_outline_source",
      priority: 58,
      content: [
        buildBlockContent("Legacy main outline (migration reference only)", input.outline ?? "None"),
        buildBlockContent("Legacy structured outline (migration reference only)", input.structuredOutline ?? "None"),
      ].join("\n"),
    }),
    createContextBlock({
      id: "book_plan",
      group: "book_plan",
      priority: 88,
      content: buildBlockContent("Book plan", input.bookPlan),
    }),
    createContextBlock({
      id: "arc_plans",
      group: "arc_plans",
      priority: 82,
      content: buildBlockContent("Arc plan", input.arcPlans),
    }),
    createContextBlock({
      id: "character_digest",
      group: "character_digest",
      priority: 80,
      content: buildBlockContent("Character", input.characters),
    }),
    createContextBlock({
      id: "recent_summaries",
      group: "recent_summaries",
      priority: 72,
      content: buildBlockContent("Recent chapter summaries", input.recentSummaries),
    }),
    createContextBlock({
      id: "plot_beats",
      group: "plot_beats",
      priority: 68,
      content: buildBlockContent("Plot beats", input.plotBeats),
    }),
    createContextBlock({
      id: "state_driven_goal",
      group: "state_driven_goal",
      priority: 98,
      required: true,
      content: [
        buildBlockContent("State-driven objective", input.stateDrivenGoal),
      ].join("\n"),
    }),
    createContextBlock({
      id: "state_snapshot",
      group: "state_snapshot",
      priority: 98,
      required: true,
      content: buildBlockContent("Input state snapshot", input.stateSnapshot),
    }),
    createContextBlock({
      id: "open_audit_issues",
      group: "open_audit_issues",
      priority: 86,
      content: buildBlockContent("Recent unresolved review issues", input.openAuditIssues),
    }),
    createContextBlock({
      id: "recent_decisions",
      group: "recent_decisions",
      priority: 64,
      content: buildBlockContent("Recent creative decisions", input.recentDecisions),
    }),
    createContextBlock({
      id: "character_dynamics_summary",
      group: "character_dynamics",
      priority: 89,
      content: buildBlockContent("Character Dynamics overview", input.characterDynamicsSummary),
    }),
    createContextBlock({
      id: "character_volume_assignments",
      group: "character_dynamics",
      priority: 88,
      content: buildBlockContent("Current-volume character roles and absence risks", input.characterVolumeAssignments),
    }),
    createContextBlock({
      id: "character_relation_stages",
      group: "character_dynamics",
      priority: 87,
      content: buildBlockContent("Current relationship stage", input.characterRelationStages),
    }),
    createContextBlock({
      id: "character_candidate_guards",
      group: "character_dynamics",
      priority: 85,
      content: buildBlockContent("Pending candidate-character guards", input.characterCandidateGuards),
    }),
    createContextBlock({
      id: "replan_context",
      group: "replan_context",
      priority: 84,
      content: [
        buildBlockContent("Replanning input", input.replanContext),
        buildBlockContent("Replanning tension anchors", input.replanConflictLevelAnchors ?? "None"),
      ].join("\n"),
    }),
  ];
}

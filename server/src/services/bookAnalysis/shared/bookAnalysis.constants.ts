import type { BookAnalysisSectionKey } from "@ai-novel/shared/types/bookAnalysis";

export const CHAPTER_HEADING_REGEX =
  /^\s*((序章|楔子|尾声|后记|番外|第[零一二三四五六七八九十百千万两\d]+[章节回卷部集篇]|chapter\s+\d+|chap\.\s*\d+)[^\n]{0,40})\s*$/i;
export const MIN_CHAPTER_DETECTION_COUNT = 3;
export const MIN_SEGMENT_BODY_LENGTH = 120;
export const MAX_SEGMENT_COUNT = 12;
export const MIN_SEGMENT_CHARS = 6_000;
export const TARGET_SEGMENT_CHARS = 10_000;
export const MAX_SEGMENT_CHARS = 16_000;
export const CHUNK_OVERLAP_CHARS = 400;
export const DEFAULT_ANALYSIS_TEMPERATURE = 0.3;
export const MIN_ANALYSIS_MAX_TOKENS = 256;
export const MAX_ANALYSIS_MAX_TOKENS = 32_768;
export const UNLIMITED_NOTES_MAX_TOKENS_CACHE_KEY = 0;

export const SECTION_PROMPTS: Record<BookAnalysisSectionKey, string> = {
  overview: "Produce a book overview covering one-line positioning, genre and appeal tags, target readers, strengths, and weaknesses. Prefer low-risk conclusions grounded in whole-book notes.",
  plot_structure: "Analyze plot structure: mainline summary, phase progression, escalation, highlights, pacing, chapter organization, structural problems, strengths, and reusable patterns.",
  timeline: "Analyze the story timeline: key nodes, event order, main phases, character-state changes, timespan, and pacing risks.",
  character_system: "Analyze the character system: protagonist positioning, supporting and antagonist functions, relationships, growth arcs, highlights, and role clarity.",
  worldbuilding: "Analyze worldbuilding: framework, rules, key setting strengths, how the setting supports the plot, and setting risks.",
  themes: "Analyze themes: core themes, central idea, emotional tone, motifs, presentation methods, and thematic risks.",
  style_technique: "Analyze style and technique: narrative POV, language, description, dialogue, rhythm, hooks, and reusable techniques.",
  market_highlights: "Analyze reader appeal: reward moments, appeal drivers, character and genre strengths, target-reader fit, and audience risks.",
};

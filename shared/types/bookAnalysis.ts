import type { LLMProvider } from "./llm";

export const DEFAULT_BOOK_ANALYSIS_BUDGET_TOKENS = 200_000;

export type BookAnalysisStatus = "draft" | "queued" | "running" | "succeeded" | "failed" | "cancelled" | "archived";
export type BookAnalysisSectionStatus = "idle" | "running" | "succeeded" | "failed";
export type BookAnalysisSectionKey =
  | "overview"
  | "plot_structure"
  | "timeline"
  | "character_system"
  | "worldbuilding"
  | "themes"
  | "style_technique"
  | "market_highlights";
export type BookAnalysisPreset = "quick" | "standard" | "complete";
export type BookAnalysisStructuredFieldType = "string" | "stringArray" | "timelineNodeArray";

export interface BookAnalysisTimelineNode {
  label: string;
  timeHint?: string;
  phase?: string;
  sourceRefs?: string[];
}

export interface BookAnalysisStructuredFieldSpec {
  key: string;
  type: BookAnalysisStructuredFieldType;
}

export const BOOK_ANALYSIS_SECTIONS: ReadonlyArray<{
  key: BookAnalysisSectionKey;
  title: string;
}> = [
  { key: "overview", title: "Book Overview" },
  { key: "plot_structure", title: "Plot Structure" },
  { key: "timeline", title: "Story Timeline" },
  { key: "character_system", title: "Character System" },
  { key: "worldbuilding", title: "Worldbuilding" },
  { key: "themes", title: "Themes" },
  { key: "style_technique", title: "Style & Technique" },
  { key: "market_highlights", title: "Reader Appeal" },
];

export const BOOK_ANALYSIS_PRESETS: ReadonlyArray<{
  key: BookAnalysisPreset;
  title: string;
  summary: string;
  sectionKeys: BookAnalysisSectionKey[];
}> = [
  {
    key: "quick",
    title: "Quick Analysis",
    summary: "Reviews positioning, main structure, characters, and technique for a fast initial assessment.",
    sectionKeys: ["overview", "plot_structure", "character_system", "style_technique"],
  },
  {
    key: "standard",
    title: "Standard Analysis",
    summary: "Covers the reusable creative information needed for most reference analyses, without a timeline by default.",
    sectionKeys: ["overview", "plot_structure", "character_system", "worldbuilding", "themes", "style_technique", "market_highlights"],
  },
  {
    key: "complete",
    title: "Complete Analysis",
    summary: "Generates every analysis section, including the timeline, for continuation and deep review.",
    sectionKeys: ["overview", "plot_structure", "timeline", "character_system", "worldbuilding", "themes", "style_technique", "market_highlights"],
  },
];

export const BOOK_ANALYSIS_STRUCTURED_FIELD_LABELS: Readonly<Record<string, string>> = {
  oneLinePositioning: "One-line positioning",
  genreTags: "Genre tags",
  sellingPointTags: "Appeal tags",
  targetReaders: "Target readers",
  strengths: "Overall strengths",
  weaknesses: "Overall weaknesses",
  mainlineSummary: "Main plot summary",
  phaseProgressions: "Phase progression",
  escalationDesigns: "Conflict escalation",
  highlightDesigns: "Highlight design",
  paceRisks: "Pacing risks",
  structureHighlights: "Structural highlights",
  reusablePatterns: "Reusable patterns",
  timeNodes: "Key timeline nodes",
  eventOrder: "Event order",
  phaseDivisions: "Main plot phases",
  stateChangeNodes: "State-change nodes",
  tempoRisks: "Timeline risks",
  protagonistPositioning: "Protagonist positioning",
  supportingFunctions: "Supporting-character functions",
  antagonistFunctions: "Antagonist functions",
  relationshipNetwork: "Relationship network",
  growthArcs: "Growth arcs",
  characterHighlights: "Character highlights",
  clarityRisks: "Distinctiveness risks",
  worldFramework: "World framework",
  ruleSystem: "Rule system",
  settingHighlights: "Setting highlights",
  plotSupport: "Plot support",
  settingRisks: "Setting risks",
  coreThemes: "Core themes",
  motifs: "Motifs",
  emotionalTone: "Emotional tone",
  presentationMethods: "Presentation methods",
  themeRisks: "Theme risks",
  narrativePov: "Narrative POV",
  languageStyle: "Language style",
  descriptionMethods: "Description methods",
  dialoguePatterns: "Dialogue patterns",
  rhythmControl: "Rhythm control",
  hookDesigns: "Hook design",
  reusableTechniques: "Reusable techniques",
  hookPoints: "Reader-reward moments",
  clickDrivers: "Appeal drivers",
  characterSellingPoints: "Character appeal",
  genreSellingPoints: "Genre appeal",
  targetReaderMatches: "Target-reader match",
  commercialRisks: "Audience risks",
};

export const BOOK_ANALYSIS_STRUCTURED_FIELD_SPECS: Readonly<Record<BookAnalysisSectionKey, ReadonlyArray<BookAnalysisStructuredFieldSpec>>> = {
  overview: [
    { key: "oneLinePositioning", type: "string" },
    { key: "genreTags", type: "stringArray" },
    { key: "sellingPointTags", type: "stringArray" },
    { key: "targetReaders", type: "stringArray" },
    { key: "strengths", type: "stringArray" },
    { key: "weaknesses", type: "stringArray" },
  ],
  plot_structure: [
    { key: "mainlineSummary", type: "string" },
    { key: "phaseProgressions", type: "stringArray" },
    { key: "escalationDesigns", type: "stringArray" },
    { key: "highlightDesigns", type: "stringArray" },
    { key: "paceRisks", type: "stringArray" },
    { key: "structureHighlights", type: "stringArray" },
    { key: "reusablePatterns", type: "stringArray" },
  ],
  timeline: [
    { key: "timeNodes", type: "timelineNodeArray" },
    { key: "eventOrder", type: "timelineNodeArray" },
    { key: "phaseDivisions", type: "stringArray" },
    { key: "stateChangeNodes", type: "stringArray" },
    { key: "tempoRisks", type: "stringArray" },
  ],
  character_system: [
    { key: "protagonistPositioning", type: "string" },
    { key: "supportingFunctions", type: "stringArray" },
    { key: "antagonistFunctions", type: "stringArray" },
    { key: "relationshipNetwork", type: "stringArray" },
    { key: "growthArcs", type: "stringArray" },
    { key: "characterHighlights", type: "stringArray" },
    { key: "clarityRisks", type: "stringArray" },
  ],
  worldbuilding: [
    { key: "worldFramework", type: "string" },
    { key: "ruleSystem", type: "stringArray" },
    { key: "settingHighlights", type: "stringArray" },
    { key: "plotSupport", type: "stringArray" },
    { key: "settingRisks", type: "stringArray" },
  ],
  themes: [
    { key: "coreThemes", type: "stringArray" },
    { key: "motifs", type: "stringArray" },
    { key: "emotionalTone", type: "string" },
    { key: "presentationMethods", type: "stringArray" },
    { key: "themeRisks", type: "stringArray" },
  ],
  style_technique: [
    { key: "narrativePov", type: "string" },
    { key: "languageStyle", type: "string" },
    { key: "descriptionMethods", type: "stringArray" },
    { key: "dialoguePatterns", type: "stringArray" },
    { key: "rhythmControl", type: "stringArray" },
    { key: "hookDesigns", type: "stringArray" },
    { key: "reusableTechniques", type: "stringArray" },
  ],
  market_highlights: [
    { key: "hookPoints", type: "stringArray" },
    { key: "clickDrivers", type: "stringArray" },
    { key: "characterSellingPoints", type: "stringArray" },
    { key: "genreSellingPoints", type: "stringArray" },
    { key: "targetReaderMatches", type: "stringArray" },
    { key: "commercialRisks", type: "stringArray" },
  ],
};

export interface BookAnalysisEvidenceItem {
  label: string;
  excerpt: string;
  sourceLabel: string;
  fieldKey?: string;
  fieldIndex?: number;
  chapterIndex?: number;
  excerptOffsetRange?: {
    start: number;
    end: number;
  };
}

export interface BookAnalysisSourceRange {
  startChapterIndex: number;
  endChapterIndex: number;
  startOffset?: number | null;
  endOffset?: number | null;
  label?: string | null;
}

export interface BookAnalysisSection {
  id: string;
  analysisId: string;
  sectionKey: BookAnalysisSectionKey;
  title: string;
  status: BookAnalysisSectionStatus;
  aiContent?: string | null;
  editedContent?: string | null;
  notes?: string | null;
  focusInstruction?: string | null;
  structuredData?: Record<string, unknown> | null;
  normalizationWarnings?: string[];
  evidence: BookAnalysisEvidenceItem[];
  frozen: boolean;
  sortOrder: number;
  updatedAt: string;
}

export interface BookAnalysis {
  id: string;
  documentId: string;
  documentVersionId: string;
  documentTitle: string;
  documentFileName: string;
  documentVersionNumber: number;
  currentDocumentVersionId?: string | null;
  currentDocumentVersionNumber: number;
  isCurrentVersion: boolean;
  title: string;
  status: BookAnalysisStatus;
  summary?: string | null;
  provider?: LLMProvider | null;
  model?: string | null;
  temperature?: number | null;
  maxTokens?: number | null;
  budgetTokens?: number | null;
  usedTokens?: number | null;
  userFocusInstruction?: string | null;
  sourceRange?: BookAnalysisSourceRange | null;
  progress: number;
  heartbeatAt?: string | null;
  currentStage?: string | null;
  currentItemKey?: string | null;
  currentItemLabel?: string | null;
  cancelRequestedAt?: string | null;
  attemptCount: number;
  maxAttempts: number;
  lastError?: string | null;
  lastRunAt?: string | null;
  publishedDocumentId?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface BookAnalysisDetail extends BookAnalysis {
  sections: BookAnalysisSection[];
}

export interface BookAnalysisPublishResult {
  analysisId: string;
  novelId: string;
  knowledgeDocumentId: string;
  knowledgeDocumentVersionNumber: number;
  bindingCount: number;
  publishedAt: string;
}

export interface BookAnalysisBudgetUpdateInput {
  budgetTokens: number | null;
}

export interface BookAnalysisResumeWithBudgetInput {
  budgetTokens: number;
}

export interface BookAnalysisSectionOptimizePreview {
  optimizedDraft: string;
}

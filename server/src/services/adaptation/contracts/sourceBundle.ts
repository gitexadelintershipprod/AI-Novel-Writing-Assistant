/**
 * Shared adaptation content-bundle contract (SourceBundle).
 *
 * Shared foundation for drama and comic: every content source (novel import / original /
 * text import / comic import) must first produce a SourceBundle. Adaptation engines only
 * face SourceBundle, fully decoupled from the concrete origin.
 *
 * Low-coupling rule: this file does not import any novel/drama/comic domain types.
 */

/** Content-source type (shared by drama and comic). */
export type AdaptationSourceType = "novel_import" | "original" | "text_import" | "comic_import";

/** Fact category. */
export type SourceFactCategory = "completed" | "revealed" | "state_changed";

/** Content-source reference. */
export interface SourceRef {
  type: AdaptationSourceType;
  /** Soft reference: novelId for novel_import; otherwise optional. */
  ref?: string;
  /** original: one-line inspiration / genre input. */
  inspiration?: string;
  /** text_import / comic_import: raw text. */
  rawText?: string;
}

/** Plot beat (source-agnostic). */
export interface SourceBeat {
  order: number;
  summary: string;
  /** Optional source-chapter range (filled for novel_import, used for adaptation mapping). */
  sourceChapterStart?: number;
  sourceChapterEnd?: number;
}

/** Character (source-agnostic). */
export interface SourceCharacter {
  name: string;
  /** Character gender for the image-generation GENDER LOCK: male | female | other | unknown. */
  gender?: "male" | "female" | "other" | "unknown";
  persona?: string;
  relations?: string;
  /** Visual hint (look / temperament); may later be upgraded to a visual anchor. */
  visualHint?: string;
  /** Soft reference: source character id (characterId for novel_import). */
  sourceCharacterRef?: string;
}

/** Hard fact (consistency constraint). */
export interface SourceFact {
  text: string;
  category: SourceFactCategory;
}

/** Standardized content bundle. */
export interface SourceBundle {
  synopsis: string;
  beats: SourceBeat[];
  characters: SourceCharacter[];
  worldNotes?: string;
  hardFacts?: SourceFact[];
  /** Raw text (kept for text_import). */
  rawText?: string;
}

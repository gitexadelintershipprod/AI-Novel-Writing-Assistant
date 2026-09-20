/**
 * Short-drama content-bundle contract (re-export from the adaptation shared layer).
 *
 * Drama internal code keeps importing from this path; callers outside drama do not see the move.
 * New modules (comic) should import services/adaptation/contracts/sourceBundle directly.
 */
export type {
  SourceFactCategory,
  SourceRef,
  SourceBeat,
  SourceCharacter,
  SourceFact,
  SourceBundle,
} from "../../adaptation/contracts/sourceBundle";

/** Drama-internal subset of source types (excludes comic_import). */
export type DramaSourceType = "novel_import" | "original" | "text_import";

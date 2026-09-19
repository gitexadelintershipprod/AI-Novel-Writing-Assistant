import type { ChapterDetailMode } from "./volumeModels";

export function formatChapterDetailModeLabel(detailMode: ChapterDetailMode): string {
  if (detailMode === "purpose") {
    return "Chapter Objectives";
  }
  if (detailMode === "boundary") {
    return "execution boundary";
  }
  return "task order";
}

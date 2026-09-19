import type { DirectorTaskNotice } from "@ai-novel/shared/types/novelDirector";

export function buildChapterTitleDiversityTaskNotice(input: {
  issue: string;
  volumeId?: string | null;
}): DirectorTaskNotice {
  return {
    code: "CHAPTER_TITLE_DIVERSITY",
    summary: input.issue.trim(),
    action: {
      type: "open_structured_outline",
      label: "Quickly fix chapter titles",
      volumeId: input.volumeId?.trim() || null,
    },
  };
}

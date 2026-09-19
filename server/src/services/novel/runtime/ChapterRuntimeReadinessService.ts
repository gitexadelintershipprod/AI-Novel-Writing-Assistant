import type { GenerationContextPackage } from "@ai-novel/shared/types/chapterRuntime";

export interface ChapterRuntimeReadinessResult {
  ready: boolean;
  reasons: string[];
}

function compactText(value: string | null | undefined): string {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

export class ChapterRuntimeReadinessService {
  evaluate(contextPackage: GenerationContextPackage): ChapterRuntimeReadinessResult {
    const reasons: string[] = [];
    const chapter = contextPackage.chapter;
    const mission = contextPackage.chapterWriteContext?.chapterMission ?? contextPackage.chapterMission ?? null;
    const hasChapterGoal = Boolean(
      compactText(mission?.objective)
      || compactText(mission?.expectation)
      || compactText(chapter.expectation)
      || compactText(contextPackage.plan?.objective)
      || compactText(contextPackage.plan?.title),
    );

    if (!compactText(chapter.title)) {
      reasons.push("Fill in the chapter title before generating the draft.");
    }

    if (!hasChapterGoal) {
      reasons.push("Prepare this chapter's task or goal before generating the draft.");
    }

    if (!contextPackage.chapterWriteContext) {
      reasons.push("Chapter writing context is not ready yet. Refresh this chapter's context first.");
    }

    if ((contextPackage.characterRoster ?? []).length === 0) {
      reasons.push("Prepare at least one character in this novel before generating the draft.");
    }

    return {
      ready: reasons.length === 0,
      reasons,
    };
  }

  assertReady(contextPackage: GenerationContextPackage): void {
    const result = this.evaluate(contextPackage);
    if (result.ready) {
      return;
    }
    throw new Error(result.reasons.join(" "));
  }
}

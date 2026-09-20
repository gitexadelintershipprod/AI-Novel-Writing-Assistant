import { parseChapterScenePlan } from "@ai-novel/shared/types/chapterLengthControl";
import type { ChapterTaskSheetQualityMode } from "@ai-novel/shared/types/chapterTaskSheetQuality";
import { prisma } from "../../../db/prisma";
import { novelFactService } from "../fact/NovelFactService";
import type { ChapterRouteWindowOptions, ChapterRouteWindowResult } from "./ChapterRouteWindowService";

/**
 * Just-in-time chapter planning service.
 *
 * Called before executing chapter N to make sure the task sheet is ready.
 * If the chapter has no task sheet, or the fact ledger has new data (prior prose already written),
 * call volumeService to generate immediately and inject already-happened facts into the generation context.
 *
 * Compatibility:
 * - Older novels with an empty fact ledger (no prior prose) fall back to the existing taskSheet.
 * - Older novels that already have a taskSheet and an empty fact ledger skip regeneration.
 * - Only called on the autopilot pipeline path (manual single-chapter mode still uses ChapterExecutionContractService).
 */

const JIT_MIN_FACTS_FOR_REFRESH = 3;

export interface ChapterPlanJITDeps {
  ensureChapterExecutionContract: (
    novelId: string,
    chapterId: string,
    options: {
      guidance?: string;
      entrypoint?: string;
      chapterTaskSheetQualityMode?: ChapterTaskSheetQualityMode;
    },
  ) => Promise<unknown>;
  ensureRouteWindow?: (
    novelId: string,
    fromChapterOrder: number,
    options?: ChapterRouteWindowOptions,
  ) => Promise<ChapterRouteWindowResult>;
}

export class ChapterPlanJITService {
  constructor(private readonly deps: ChapterPlanJITDeps) {}

  /**
   * Ensure chapter N's execution contract (task sheet / sceneCards / targetWordCount / mustAvoid) is ready.
   *
   * Call site: GenerationContextAssembler.assemble, before plannerService.ensureChapterPlan.
   * Only called when advanceMode === "full_book_autopilot".
   */
  async ensureExecutionReady(
    novelId: string,
    chapterId: string,
    routeOptions: ChapterRouteWindowOptions = {},
  ): Promise<void> {
    const chapter = await prisma.chapter.findFirst({
      where: { id: chapterId, novelId },
      select: {
        id: true,
        order: true,
        taskSheet: true,
        sceneCards: true,
        targetWordCount: true,
        mustAvoid: true,
        conflictLevel: true,
        revealLevel: true,
      },
    });
    if (!chapter) {
      return;
    }

    await this.deps.ensureRouteWindow?.(novelId, chapter.order, routeOptions);

    const hasCompleteTaskSheet = Boolean(chapter.taskSheet?.trim())
      && Boolean(chapter.sceneCards?.trim())
      && typeof chapter.targetWordCount === "number"
      && Boolean(parseChapterScenePlan(chapter.sceneCards, {
        targetWordCount: chapter.targetWordCount ?? undefined,
      }));

    // Load the prior-prose fact ledger.
    const facts = await novelFactService.listForChapter({
      novelId,
      beforeChapterOrder: chapter.order,
    });

    if (hasCompleteTaskSheet && facts.length < JIT_MIN_FACTS_FOR_REFRESH) {
      // Task sheet already exists and prior facts are insufficient (older novel / first chapter); skip.
      return;
    }

    if (hasCompleteTaskSheet && facts.length >= JIT_MIN_FACTS_FOR_REFRESH) {
      // Task sheet already exists, but prior prose has enough facts — regenerate so actual progress is included.
      const factGuidance = buildFactLedgerGuidance(facts);
      await this.deps.ensureChapterExecutionContract(novelId, chapterId, {
        guidance: factGuidance,
        entrypoint: "jit_planner",
        chapterTaskSheetQualityMode: "full_book_autopilot",
      });
      return;
    }

    // Task sheet is missing — generate (including factLedger context).
    const factGuidance = facts.length > 0 ? buildFactLedgerGuidance(facts) : undefined;
    await this.deps.ensureChapterExecutionContract(novelId, chapterId, {
      guidance: factGuidance,
      entrypoint: "jit_planner",
      chapterTaskSheetQualityMode: "full_book_autopilot",
    });
  }
}

function buildFactLedgerGuidance(
  facts: Awaited<ReturnType<typeof novelFactService.listForChapter>>,
): string {
  if (facts.length === 0) {
    return "";
  }
  const completed = facts.filter((f) => f.category === "completed");
  const revealed = facts.filter((f) => f.category === "revealed");
  const stateChanged = facts.filter((f) => f.category === "state_changed");

  const lines: string[] = [
    "[Established facts / Fact Ledger — fold these facts into the task sheet so you do not repeat or contradict them]",
  ];
  if (completed.length > 0) {
    lines.push("Completed goals:");
    for (const f of completed) {
      lines.push(`  - [Chapter ${f.chapterOrder}] ${f.text}`);
    }
  }
  if (revealed.length > 0) {
    lines.push("Revealed information:");
    for (const f of revealed) {
      lines.push(`  - [Chapter ${f.chapterOrder}] ${f.text}`);
    }
  }
  if (stateChanged.length > 0) {
    lines.push("Recent status changes:");
    for (const f of stateChanged) {
      lines.push(`  - [Chapter ${f.chapterOrder}] ${f.text}`);
    }
  }
  return lines.join("\n");
}

/**
 * Factory for dependency injection. Usually called after volumeService is initialized.
 */
export function createChapterPlanJITService(deps: ChapterPlanJITDeps): ChapterPlanJITService {
  return new ChapterPlanJITService(deps);
}

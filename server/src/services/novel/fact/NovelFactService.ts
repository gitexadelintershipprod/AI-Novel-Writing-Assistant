import { prisma } from "../../../db/prisma";

export type NovelFactCategory = "completed" | "revealed" | "state_changed";
export type NovelFactSource = "auto" | "manual";

export interface NovelFactWriteItem {
  text: string;
  category: NovelFactCategory;
  source?: NovelFactSource;
}

export interface NovelFactEntry {
  id: string;
  novelId: string;
  chapterOrder: number;
  text: string;
  category: NovelFactCategory;
  source: NovelFactSource;
  createdAt: Date;
}

/**
 * Fact-ledger service.
 *
 * Records irreversible facts that already happened in the novel (process goals completed, information revealed, status changes)
 * so chapter-write context can consume them and the LLM does not rewrite events that already occurred.
 *
 * Writer: ChapterContentFinalizationService (auto-write after chapter acceptance)
 * Reader: GenerationContextAssembler (fills completedMilestones)
 */
export class NovelFactService {
  /**
   * Batch-write fact entries. Idempotent: the same novelId+chapterOrder+text combination is not inserted twice.
   */
  async writeFacts(
    novelId: string,
    chapterOrder: number,
    items: NovelFactWriteItem[],
  ): Promise<void> {
    if (items.length === 0) {
      return;
    }
    // Load existing text values to avoid duplicates.
    const existing = await prisma.novelFactEntry.findMany({
      where: { novelId, chapterOrder },
      select: { text: true },
    });
    const existingTexts = new Set(existing.map((row) => row.text.trim()));
    const toCreate = items.filter((item) => !existingTexts.has(item.text.trim()));
    if (toCreate.length === 0) {
      return;
    }
    await prisma.novelFactEntry.createMany({
      data: toCreate.map((item) => ({
        novelId,
        chapterOrder,
        text: item.text.trim(),
        category: item.category,
        source: item.source ?? "auto",
      })),
    });
  }

  /**
   * Read all facts before the current chapter for chapter-write context.
   *
   * - completed/revealed: return the full set (milestone facts, no distance limit)
   * - state_changed: return only entries inside the recentChaptersWindow
   */
  async listForChapter(input: {
    novelId: string;
    beforeChapterOrder: number;
    recentChaptersWindow?: number;
  }): Promise<NovelFactEntry[]> {
    const { novelId, beforeChapterOrder, recentChaptersWindow = 15 } = input;
    const milestoneRows = await prisma.novelFactEntry.findMany({
      where: {
        novelId,
        chapterOrder: { lt: beforeChapterOrder },
        category: { in: ["completed", "revealed"] },
      },
      orderBy: { chapterOrder: "asc" },
    });
    const recentStateRows = await prisma.novelFactEntry.findMany({
      where: {
        novelId,
        chapterOrder: {
          lt: beforeChapterOrder,
          gte: beforeChapterOrder - recentChaptersWindow,
        },
        category: "state_changed",
      },
      orderBy: { chapterOrder: "asc" },
    });
    return [...milestoneRows, ...recentStateRows].map(mapRow);
  }

  /**
   * Manually write a single fact (for Agent tool calls).
   */
  async addManualFact(input: {
    novelId: string;
    chapterOrder: number;
    text: string;
    category: NovelFactCategory;
  }): Promise<NovelFactEntry> {
    const row = await prisma.novelFactEntry.create({
      data: {
        novelId: input.novelId,
        chapterOrder: input.chapterOrder,
        text: input.text.trim(),
        category: input.category,
        source: "manual",
      },
    });
    return mapRow(row);
  }
}

function mapRow(row: {
  id: string;
  novelId: string;
  chapterOrder: number;
  text: string;
  category: string;
  source: string;
  createdAt: Date;
}): NovelFactEntry {
  return {
    id: row.id,
    novelId: row.novelId,
    chapterOrder: row.chapterOrder,
    text: row.text,
    category: row.category as NovelFactCategory,
    source: row.source as NovelFactSource,
    createdAt: row.createdAt,
  };
}

export const novelFactService = new NovelFactService();

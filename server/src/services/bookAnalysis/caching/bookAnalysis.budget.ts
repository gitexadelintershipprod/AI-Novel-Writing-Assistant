import { prisma } from "../../../db/prisma";
import type { LlmTokenUsageSnapshot } from "../../../llm/usageTracking";

export const BOOK_ANALYSIS_BUDGET_EXCEEDED_CODE = "budget_exceeded";

export class BookAnalysisBudgetExceededError extends Error {
  constructor(
    readonly analysisId: string,
    readonly usedTokens: number,
    readonly budgetTokens: number,
  ) {
    super(`${BOOK_ANALYSIS_BUDGET_EXCEEDED_CODE}: used ${usedTokens} tokens exceeds budget ${budgetTokens}`);
    this.name = "BookAnalysisBudgetExceededError";
  }
}

export function normalizeBookAnalysisBudgetTokens(value: number | null | undefined): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return null;
  }
  const normalized = Math.floor(value);
  return normalized > 0 ? normalized : null;
}

function readUsageTokens(usage: LlmTokenUsageSnapshot | null | undefined): number {
  if (!usage) {
    return 0;
  }
  return Math.max(0, Math.round(usage.totalTokens));
}

export class BookAnalysisBudgetGuard {
  constructor(private readonly analysisId: string) {}

  async onSectionFinished(usage: LlmTokenUsageSnapshot | null | undefined): Promise<void> {
    const tokenCount = readUsageTokens(usage);
    let updated;
    if (tokenCount > 0) {
      // Legacy rows may contain NULL even though new rows default to zero. Normalize
      // them first, then use an atomic increment so parallel section workers cannot
      // overwrite one another's token usage.
      await prisma.bookAnalysis.updateMany({
        where: { id: this.analysisId, usedTokens: null },
        data: { usedTokens: 0 },
      });
      updated = await prisma.bookAnalysis.update({
        where: { id: this.analysisId },
        data: { usedTokens: { increment: tokenCount } },
        select: { budgetTokens: true, usedTokens: true },
      });
    } else {
      updated = await prisma.bookAnalysis.findUnique({
        where: { id: this.analysisId },
        select: { budgetTokens: true, usedTokens: true },
      });
    }

    if (!updated?.budgetTokens) {
      return;
    }

    const usedTokens = updated.usedTokens ?? 0;
    if (usedTokens > updated.budgetTokens) {
      throw new BookAnalysisBudgetExceededError(this.analysisId, usedTokens, updated.budgetTokens);
    }
  }
}

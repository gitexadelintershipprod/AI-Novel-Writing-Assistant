import type {
  PayoffLedgerItem,
  PayoffLedgerResponse,
  PayoffLedgerRiskSignal,
  PayoffLedgerSourceRef,
  PayoffLedgerStatus,
  PayoffLedgerSummary,
} from "@ai-novel/shared/types/payoffLedger";

type PayoffLedgerRowLike = {
  id: string;
  novelId: string;
  ledgerKey: string;
  title: string;
  summary: string;
  scopeType: "book" | "volume" | "chapter";
  currentStatus: "setup" | "hinted" | "pending_payoff" | "paid_off" | "failed" | "overdue";
  targetStartChapterOrder: number | null;
  targetEndChapterOrder: number | null;
  firstSeenChapterOrder: number | null;
  lastTouchedChapterOrder: number | null;
  lastTouchedChapterId: string | null;
  setupChapterId: string | null;
  payoffChapterId: string | null;
  lastSnapshotId: string | null;
  sourceRefsJson: string | null;
  evidenceJson: string | null;
  riskSignalsJson: string | null;
  statusReason: string | null;
  confidence: number | null;
  createdAt: Date;
  updatedAt: Date;
};

type PayoffLedgerSyncCandidate = {
  ledgerKey: string;
  title: string;
  scopeType: "book" | "volume" | "chapter";
  currentStatus: PayoffLedgerStatus;
  targetStartChapterOrder?: number | null;
  targetEndChapterOrder?: number | null;
  payoffChapterId?: string | null;
  payoffChapterOrder?: number | null;
  riskSignals: PayoffLedgerRiskSignal[];
  statusReason?: string | null;
};

type ExistingLedgerIdentityRow = {
  ledgerKey: string;
  title: string;
  scopeType: "book" | "volume" | "chapter";
  currentStatus: PayoffLedgerStatus;
  targetEndChapterOrder: number | null;
  lastTouchedChapterOrder: number | null;
  updatedAt: Date | string;
};

export interface SyntheticPayoffIssue {
  ledgerKey: string;
  code: string;
  severity: "low" | "medium" | "high" | "critical";
  description: string;
  evidence: string;
  fixSuggestion: string;
}

function safeParseJson<T>(raw: string | null | undefined, fallback: T): T {
  if (!raw?.trim()) {
    return fallback;
  }
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function serializeLedgerJson(value: unknown): string {
  return JSON.stringify(value ?? []);
}

export function dedupeRiskSignals(signals: PayoffLedgerRiskSignal[]): PayoffLedgerRiskSignal[] {
  const seen = new Set<string>();
  const results: PayoffLedgerRiskSignal[] = [];
  for (const signal of signals) {
    const key = `${signal.code}:${signal.summary}`.toLowerCase();
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    results.push(signal);
  }
  return results;
}

export function appendStaleRiskSignal(
  signals: PayoffLedgerRiskSignal[],
  summary: string,
): PayoffLedgerRiskSignal[] {
  return dedupeRiskSignals([
    ...signals.filter((signal) => signal.code !== "sync_stale"),
    {
      code: "sync_stale",
      severity: "medium",
      summary,
      stale: true,
    },
  ]);
}

export function clearStaleRiskSignal(signals: PayoffLedgerRiskSignal[]): PayoffLedgerRiskSignal[] {
  return signals.filter((signal) => signal.code !== "sync_stale");
}

export function normalizePayoffLedgerIdentity(value: string | null | undefined): string {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[\s"'“”‘’`.,，。:：;；!！?？()[\]{}（）【】《》<>、\\/|_\-—~·…]+/g, "");
}

function isUnfinishedPayoffStatus(status: PayoffLedgerStatus): boolean {
  return status !== "paid_off" && status !== "failed";
}

function hasExplicitPayoffWindow(item: PayoffLedgerSyncCandidate): boolean {
  return typeof item.targetStartChapterOrder === "number"
    || typeof item.targetEndChapterOrder === "number"
    || typeof item.payoffChapterOrder === "number"
    || Boolean(item.payoffChapterId?.trim());
}

function compareExistingLedgerIdentityRows(
  item: PayoffLedgerSyncCandidate,
  left: ExistingLedgerIdentityRow,
  right: ExistingLedgerIdentityRow,
): number {
  const leftScopeScore = left.scopeType === item.scopeType ? 1 : 0;
  const rightScopeScore = right.scopeType === item.scopeType ? 1 : 0;
  if (leftScopeScore !== rightScopeScore) {
    return rightScopeScore - leftScopeScore;
  }
  const leftWindowScore = typeof left.targetEndChapterOrder === "number" ? 1 : 0;
  const rightWindowScore = typeof right.targetEndChapterOrder === "number" ? 1 : 0;
  if (leftWindowScore !== rightWindowScore) {
    return rightWindowScore - leftWindowScore;
  }
  const leftTouched = left.lastTouchedChapterOrder ?? Number.NEGATIVE_INFINITY;
  const rightTouched = right.lastTouchedChapterOrder ?? Number.NEGATIVE_INFINITY;
  if (leftTouched !== rightTouched) {
    return rightTouched - leftTouched;
  }
  const leftUpdatedAt = new Date(left.updatedAt).getTime() || 0;
  const rightUpdatedAt = new Date(right.updatedAt).getTime() || 0;
  if (leftUpdatedAt !== rightUpdatedAt) {
    return rightUpdatedAt - leftUpdatedAt;
  }
  return left.ledgerKey.localeCompare(right.ledgerKey);
}

export function resolvePayoffLedgerSyncLedgerKey(
  item: PayoffLedgerSyncCandidate,
  existingRows: ExistingLedgerIdentityRow[],
): string {
  if (existingRows.some((row) => row.ledgerKey === item.ledgerKey)) {
    return item.ledgerKey;
  }
  const identity = normalizePayoffLedgerIdentity(item.title);
  if (!identity) {
    return item.ledgerKey;
  }
  const candidates = existingRows
    .filter((row) => isUnfinishedPayoffStatus(row.currentStatus))
    .filter((row) => normalizePayoffLedgerIdentity(row.title) === identity)
    .sort((left, right) => compareExistingLedgerIdentityRows(item, left, right));
  return candidates[0]?.ledgerKey ?? item.ledgerKey;
}

export function sanitizePayoffLedgerSyncItem<T extends PayoffLedgerSyncCandidate>(item: T): T {
  if (item.currentStatus !== "overdue" || hasExplicitPayoffWindow(item)) {
    return item;
  }
  return {
    ...item,
    currentStatus: "pending_payoff",
    riskSignals: dedupeRiskSignals([
      ...item.riskSignals,
      {
        code: "payoff_missing_progress",
        severity: "medium",
        summary: item.statusReason?.trim()
          || "AI's ledger thinks this payoff is overdue, but there is no clear target window. It stays tracked as an open risk.",
      },
    ]),
  };
}

export function mapPayoffLedgerRow(row: PayoffLedgerRowLike): PayoffLedgerItem {
  return {
    id: row.id,
    novelId: row.novelId,
    ledgerKey: row.ledgerKey,
    title: row.title,
    summary: row.summary,
    scopeType: row.scopeType,
    currentStatus: row.currentStatus,
    targetStartChapterOrder: row.targetStartChapterOrder,
    targetEndChapterOrder: row.targetEndChapterOrder,
    firstSeenChapterOrder: row.firstSeenChapterOrder,
    lastTouchedChapterOrder: row.lastTouchedChapterOrder,
    lastTouchedChapterId: row.lastTouchedChapterId,
    setupChapterId: row.setupChapterId,
    payoffChapterId: row.payoffChapterId,
    lastSnapshotId: row.lastSnapshotId,
    sourceRefs: safeParseJson<PayoffLedgerSourceRef[]>(row.sourceRefsJson, []),
    evidence: safeParseJson(row.evidenceJson, []),
    riskSignals: safeParseJson<PayoffLedgerRiskSignal[]>(row.riskSignalsJson, []),
    statusReason: row.statusReason,
    confidence: row.confidence,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function isPendingLike(status: PayoffLedgerStatus): boolean {
  return status === "setup" || status === "hinted" || status === "pending_payoff";
}

function isUrgent(item: PayoffLedgerItem, chapterOrder?: number | null): boolean {
  if (!chapterOrder || !isPendingLike(item.currentStatus)) {
    return false;
  }
  if (typeof item.targetEndChapterOrder === "number" && item.targetEndChapterOrder <= chapterOrder + 1) {
    return true;
  }
  if (typeof item.targetStartChapterOrder === "number" && item.targetStartChapterOrder <= chapterOrder) {
    return true;
  }
  return false;
}

export function classifyPayoffLedgerItems(
  items: PayoffLedgerItem[],
  chapterOrder?: number | null,
): {
  pendingItems: PayoffLedgerItem[];
  urgentItems: PayoffLedgerItem[];
  overdueItems: PayoffLedgerItem[];
  paidOffItems: PayoffLedgerItem[];
} {
  // An overdue flag is only actionable after the current chapter has passed
  // the explicit end of its payoff window. During the window, keep the item
  // in the pending set so it can guide the current chapter without forcing a
  // replan before the promised chapter has actually completed.
  const overdueItems = items.filter((item) => isPayoffOverdueAtChapter(item, chapterOrder));
  const pendingItems = items.filter((item) => (
    isPendingLike(item.currentStatus)
    || (item.currentStatus === "overdue" && !isPayoffOverdueAtChapter(item, chapterOrder))
  ));
  const urgentItems = pendingItems.filter((item) => isUrgent(item, chapterOrder));
  const paidOffItems = items.filter((item) => item.currentStatus === "paid_off");
  return {
    pendingItems,
    urgentItems,
    overdueItems,
    paidOffItems,
  };
}

export function isPayoffOverdueAtChapter(
  item: Pick<PayoffLedgerItem, "currentStatus" | "targetEndChapterOrder">,
  chapterOrder?: number | null,
): boolean {
  return item.currentStatus === "overdue"
    && (
      chapterOrder == null
      || item.targetEndChapterOrder == null
      || item.targetEndChapterOrder < chapterOrder
    );
}

export function buildPayoffLedgerSummary(
  items: PayoffLedgerItem[],
  chapterOrder?: number | null,
): PayoffLedgerSummary {
  const classified = classifyPayoffLedgerItems(items, chapterOrder);
  return {
    totalCount: items.length,
    pendingCount: classified.pendingItems.length,
    urgentCount: classified.urgentItems.length,
    overdueCount: classified.overdueItems.length,
    paidOffCount: classified.paidOffItems.length,
    failedCount: items.filter((item) => item.currentStatus === "failed").length,
    updatedAt: items[0]?.updatedAt ?? null,
  };
}

export function buildPayoffLedgerResponse(
  items: PayoffLedgerItem[],
  chapterOrder?: number | null,
): PayoffLedgerResponse {
  const orderedItems = items.slice().sort((left, right) => {
    const leftPriority = left.currentStatus === "overdue" ? 0 : left.currentStatus === "pending_payoff" ? 1 : left.currentStatus === "hinted" ? 2 : left.currentStatus === "setup" ? 3 : left.currentStatus === "paid_off" ? 4 : 5;
    const rightPriority = right.currentStatus === "overdue" ? 0 : right.currentStatus === "pending_payoff" ? 1 : right.currentStatus === "hinted" ? 2 : right.currentStatus === "setup" ? 3 : right.currentStatus === "paid_off" ? 4 : 5;
    if (leftPriority !== rightPriority) {
      return leftPriority - rightPriority;
    }
    const leftOrder = left.targetEndChapterOrder ?? left.lastTouchedChapterOrder ?? Number.MAX_SAFE_INTEGER;
    const rightOrder = right.targetEndChapterOrder ?? right.lastTouchedChapterOrder ?? Number.MAX_SAFE_INTEGER;
    if (leftOrder !== rightOrder) {
      return leftOrder - rightOrder;
    }
    return left.title.localeCompare(right.title, "zh-Hans-CN");
  });
  return {
    summary: buildPayoffLedgerSummary(orderedItems, chapterOrder),
    items: orderedItems,
    updatedAt: orderedItems[0]?.updatedAt ?? null,
  };
}

export function buildSyntheticPayoffIssues(
  items: PayoffLedgerItem[],
  chapterOrder?: number | null,
): SyntheticPayoffIssue[] {
  const issues: SyntheticPayoffIssue[] = [];
  const classified = classifyPayoffLedgerItems(items, chapterOrder);

  for (const item of classified.overdueItems) {
    issues.push({
      ledgerKey: item.ledgerKey,
      code: "payoff_overdue",
      severity: "high",
      description: `The planted setup "${item.title}" has passed its target window and is still unpaid.`,
      evidence: item.statusReason?.trim()
        || item.evidence[0]?.summary
        || `The target window ends at chapter ${item.targetEndChapterOrder ?? "?"}, and it is still unpaid.`,
      fixSuggestion: "Schedule the payoff in this chapter or the coming replan, or explain why it must wait.",
    });
  }

  for (const item of classified.pendingItems) {
    if (chapterOrder && isUrgent(item, chapterOrder) && item.currentStatus !== "overdue") {
      issues.push({
        ledgerKey: item.ledgerKey,
        code: "payoff_missing_progress",
        severity: "medium",
        description: `The planted setup "${item.title}" has entered its touch window, but it still has no clear advance.`,
        evidence: item.statusReason?.trim()
          || item.evidence[0]?.summary
          || `Target window: chapters ${item.targetStartChapterOrder ?? "?"}-${item.targetEndChapterOrder ?? "?"}.`,
        fixSuggestion: "Add an advance beat in this chapter's plan, text, or repair so it does not keep stalling.",
      });
    }
  }

  for (const item of items) {
    for (const signal of item.riskSignals) {
      if (
        signal.code !== "payoff_paid_without_setup"
        && signal.code !== "payoff_regressed"
        && signal.code !== "payoff_missing_progress"
      ) {
        continue;
      }
      issues.push({
        ledgerKey: item.ledgerKey,
        code: signal.code,
        severity: signal.severity,
        description: `The planted setup "${item.title}" has a specific risk: ${signal.summary}`,
        evidence: item.evidence[0]?.summary || item.summary,
        fixSuggestion: signal.code === "payoff_paid_without_setup"
          ? "Add the missing setup, or lower this chapter's payoff strength back to setup/advance."
          : signal.code === "payoff_regressed"
            ? "Check whether a paid-off thread was reopened by mistake. If it is a new clue, make it a new ledger item."
            : "Add a clear advance beat for this setup so the ledger does not stay stuck.",
      });
    }
  }

  const seen = new Set<string>();
  return issues.filter((issue) => {
    const key = `${issue.ledgerKey}:${issue.code}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

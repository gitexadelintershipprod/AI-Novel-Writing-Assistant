import type {
  ChapterStateGoal,
  GenerationNextAction,
  CanonicalStateSnapshot,
  CanonicalPayoffState,
} from "@ai-novel/shared/types/canonicalState";
import type {
  AuditIssue,
  AuditReport,
  ReplanRecommendation,
} from "@ai-novel/shared/types/novel";
import type { PayoffLedgerSummary } from "@ai-novel/shared/types/payoffLedger";

type ReplanSignal =
  | "overdue_payoff"
  | "next_action_replan"
  | "blocking_audit"
  | "manual_request"
  | "stable";

type WindowMode = "forward" | "surrounding";
type ReplanAction = "continue_with_warning" | "local_patch_plan" | "stop_for_replan";
type ReplanScope = "local_window" | "global_book";

export interface ReplanDecisionInput {
  requestedWindowSize?: number | null;
  availableChapterOrders?: number[] | null;
  targetChapterOrder?: number | null;
  triggerType?: string | null;
  reason?: string | null;
  sourceIssueIds?: string[] | null;
  blockingIssueIds?: string[] | null;
  blockingLedgerKeys?: string[] | null;
  auditReports?: AuditReport[] | null;
  ledgerSummary?: PayoffLedgerSummary | null;
  snapshot?: CanonicalStateSnapshot | null;
  nextAction?: GenerationNextAction | null;
  chapterStateGoal?: ChapterStateGoal | null;
  protectedSecrets?: string[] | null;
  forceRecommended?: boolean;
  scope?: ReplanScope;
}

export interface ReplanDecision extends ReplanRecommendation {
  signal: ReplanSignal;
  triggerType: string;
  sourceIssueIds: string[];
  windowSize: number;
  blockingLedgerKeys: string[];
  affectedChapterOrders: number[];
  anchorChapterOrder: number | null;
  triggerReason: string;
  windowReason: string;
  whyTheseChapters: string;
  action: ReplanAction;
  scope: ReplanScope;
}

function uniqueStrings(items: Array<string | null | undefined>): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const item of items) {
    const normalized = String(item ?? "").trim();
    if (!normalized || seen.has(normalized)) {
      continue;
    }
    seen.add(normalized);
    result.push(normalized);
  }
  return result;
}

function uniqueNumbers(items: Array<number | null | undefined>): number[] {
  return Array.from(new Set(
    items
      .filter((item): item is number => Number.isInteger(item))
      .map((item) => Number(item)),
  )).sort((left, right) => left - right);
}

function clampWindowSize(value?: number | null): number {
  return Math.max(1, Math.min(value ?? 3, 5));
}

function collectBlockingIssues(auditReports?: AuditReport[] | null): AuditIssue[] {
  return (auditReports ?? [])
    .flatMap((report) => report.issues)
    .filter((issue) => issue.status === "open" && (issue.severity === "high" || issue.severity === "critical"));
}

function collectBlockingLedgerKeys(
  explicitKeys: string[] | null | undefined,
  snapshot?: CanonicalStateSnapshot | null,
): string[] {
  const fromSnapshot = snapshot?.narrative.overduePayoffs.map((item) => item.ledgerKey) ?? [];
  return uniqueStrings([...(explicitKeys ?? []), ...fromSnapshot]);
}

function pickFallbackAnchor(input: ReplanDecisionInput): number | null {
  return input.targetChapterOrder
    ?? input.chapterStateGoal?.chapterOrder
    ?? input.snapshot?.narrative.currentChapterOrder
    ?? input.availableChapterOrders?.[input.availableChapterOrders.length - 1]
    ?? null;
}

function pickPayoffAnchor(
  payoffs: CanonicalPayoffState[],
  fields: Array<keyof CanonicalPayoffState>,
  fallback: number | null,
): number | null {
  for (const field of fields) {
    const candidates = uniqueNumbers(payoffs.map((item) => {
      const value = item[field];
      return typeof value === "number" ? value : null;
    }));
    if (candidates.length > 0) {
      return candidates[0];
    }
  }
  return fallback;
}

function resolveAnchorChapterOrder(signal: ReplanSignal, input: ReplanDecisionInput): number | null {
  const fallbackAnchor = pickFallbackAnchor(input);
  if (signal === "overdue_payoff") {
    return pickPayoffAnchor(
      input.snapshot?.narrative.overduePayoffs ?? [],
      ["targetEndChapterOrder", "targetStartChapterOrder"],
      fallbackAnchor,
    );
  }
  return fallbackAnchor;
}

function pickSignal(input: ReplanDecisionInput, blockingIssues: AuditIssue[], blockingLedgerKeys: string[]): ReplanSignal {
  if (input.forceRecommended) {
    return "manual_request";
  }
  if (input.nextAction === "replan") {
    return "next_action_replan";
  }
  if (blockingIssues.length > 0) {
    return "blocking_audit";
  }
  const overdueCount = (input.ledgerSummary?.overdueCount ?? 0) + blockingLedgerKeys.length;
  if (overdueCount > 0) {
    return "overdue_payoff";
  }
  return "stable";
}

function resolveReplanAction(signal: ReplanSignal, input: ReplanDecisionInput, scope: ReplanScope): ReplanAction {
  if (scope === "global_book") {
    return "stop_for_replan";
  }
  if (input.forceRecommended || signal === "manual_request" || signal === "next_action_replan") {
    return "local_patch_plan";
  }
  if (signal === "blocking_audit") {
    return "local_patch_plan";
  }
  if (signal === "overdue_payoff") {
    return "continue_with_warning";
  }
  return "continue_with_warning";
}

function resolveWindowMode(signal: ReplanSignal): WindowMode {
  return signal === "blocking_audit" || signal === "manual_request" ? "forward" : "surrounding";
}

function resolveDefaultWindowSize(): number {
  return 3;
}

function nearestAnchorIndex(availableChapterOrders: number[], anchorChapterOrder: number): number {
  let bestIndex = 0;
  let bestDistance = Number.POSITIVE_INFINITY;
  for (let index = 0; index < availableChapterOrders.length; index += 1) {
    const distance = Math.abs(availableChapterOrders[index] - anchorChapterOrder);
    if (distance < bestDistance) {
      bestDistance = distance;
      bestIndex = index;
    }
  }
  return bestIndex;
}

function buildWindowOrders(
  anchorChapterOrder: number | null,
  availableChapterOrders: number[] | null | undefined,
  requestedWindowSize?: number | null,
  mode: WindowMode = "forward",
): number[] {
  const windowSize = clampWindowSize(requestedWindowSize);
  if (!anchorChapterOrder) {
    return [];
  }
  const normalizedOrders = uniqueNumbers(availableChapterOrders ?? []);
  if (normalizedOrders.length === 0) {
    const fallbackOrders = [anchorChapterOrder];
    if (mode === "surrounding") {
      let distance = 1;
      while (fallbackOrders.length < windowSize) {
        fallbackOrders.unshift(Math.max(1, anchorChapterOrder - distance));
        if (fallbackOrders.length >= windowSize) {
          break;
        }
        fallbackOrders.push(anchorChapterOrder + distance);
        distance += 1;
      }
      return uniqueNumbers(fallbackOrders).slice(0, windowSize);
    }
    for (let offset = 1; fallbackOrders.length < windowSize; offset += 1) {
      fallbackOrders.push(anchorChapterOrder + offset);
    }
    return fallbackOrders;
  }

  if (mode === "forward") {
    const fromAnchor = normalizedOrders.filter((order) => order >= anchorChapterOrder);
    if (fromAnchor.length >= windowSize) {
      return fromAnchor.slice(0, windowSize);
    }
    const beforeAnchor = normalizedOrders.filter((order) => order < anchorChapterOrder).reverse();
    const combined = [...fromAnchor];
    for (const order of beforeAnchor) {
      if (combined.length >= windowSize) {
        break;
      }
      combined.unshift(order);
    }
    return combined.slice(0, windowSize);
  }

  const anchorIndex = nearestAnchorIndex(normalizedOrders, anchorChapterOrder);
  const selected = [normalizedOrders[anchorIndex]];
  let left = anchorIndex - 1;
  let right = anchorIndex + 1;
  while (selected.length < windowSize && (left >= 0 || right < normalizedOrders.length)) {
    if (left >= 0) {
      selected.push(normalizedOrders[left]);
      left -= 1;
    }
    if (selected.length >= windowSize) {
      break;
    }
    if (right < normalizedOrders.length) {
      selected.push(normalizedOrders[right]);
      right += 1;
    }
  }
  return uniqueNumbers(selected).slice(0, windowSize);
}

function formatOrders(orders: number[]): string {
  return orders.map((order) => `Chapter ${order}`).join(", ");
}

function buildTriggerReason(signal: ReplanSignal, input: ReplanDecisionInput, blockingIssues: AuditIssue[], blockingLedgerKeys: string[]): string {
  if (signal === "overdue_payoff") {
    const titles = uniqueStrings((input.snapshot?.narrative.overduePayoffs ?? []).map((item) => item.title)).slice(0, 2);
    return titles.length > 0
      ? `Canonical state shows overdue payoffs: ${titles.join("; ")}. Keep following them as chapter-level quality debt.`
      : `Canonical state shows overdue payoffs. Keep following them as chapter-level quality debt.`;
  }
  if (signal === "next_action_replan") {
    return `The state-driven decision switched to replan, meaning this chapter's goal no longer matches the current plan window.`;
  }
  if (signal === "blocking_audit") {
    const topIssues = blockingIssues.slice(0, 2).map((issue) => issue.description);
    return topIssues.length > 0
      ? `High-priority audit issues are still open: ${topIssues.join("; ")}.`
      : `There are unresolved high-priority audit issues. Adjust the chapter plan first.`;
  }
  if (signal === "manual_request") {
    return input.reason?.trim() || "The user explicitly asked to replan the current window.";
  }
  if (blockingLedgerKeys.length > 0) {
    return `The foreshadowing ledger has open risks. Recalibrate chapter duties.`;
  }
  return "Current status is stable. Replanning is not recommended yet.";
}

function buildWindowReason(signal: ReplanSignal, anchorChapterOrder: number | null, affectedChapterOrders: number[], protectedSecrets: string[]): string {
  const chapterLabel = anchorChapterOrder ? `Chapter ${anchorChapterOrder}` : "Current chapter";
  const secretHint = protectedSecrets.length > 0
    ? ` Also protect unpublished information such as "${protectedSecrets.slice(0, 2).join("; ")}."`
    : "";
  if (signal === "overdue_payoff") {
    if (affectedChapterOrders.length === 0) {
      return `${chapterLabel} is only used to locate overdue promises; the system will not auto-select a replan window from overdue distance or the current chapter citation alone.${secretHint}`.trim();
    }
    return `Using ${chapterLabel} as the anchor, the window covers ${formatOrders(affectedChapterOrders)} because overdue payoffs usually need setup, cashing, and aftershock chapters to move together.${secretHint}`.trim();
  }
  if (signal === "blocking_audit") {
    return `From ${chapterLabel}, expand forward through ${formatOrders(affectedChapterOrders)} to fix currently blocked issues first and keep the old plan from contaminating later chapters.${secretHint}`.trim();
  }
  if (signal === "next_action_replan") {
    return `Using ${chapterLabel} as the anchor, coordinate ${formatOrders(affectedChapterOrders)} so the current-state goal realigns neighboring chapter duties.${secretHint}`.trim();
  }
  if (signal === "manual_request") {
    return `This manual replan covers ${formatOrders(affectedChapterOrders)}, focusing on consecutive chapters around ${chapterLabel}.${secretHint}`.trim();
  }
  return `There is no window that must be adjusted.`;
}

function buildWhyTheseChapters(signal: ReplanSignal, affectedChapterOrders: number[], chapterStateGoal?: ChapterStateGoal | null): string {
  if (affectedChapterOrders.length === 0) {
    return "No replan chapters are selected.";
  }
  const ordersLabel = formatOrders(affectedChapterOrders);
  const goalHint = chapterStateGoal?.summary?.trim()
    ? `, and reassign chapter duties around "${chapterStateGoal.summary.trim()}"`
    : "";
  if (affectedChapterOrders.length === 1) {
    return `Adjust only ${ordersLabel} because the issue is currently inside a single chapter${goalHint}.`;
  }
  if (signal === "overdue_payoff") {
    return `Choose ${ordersLabel} because these chapters need to carry setup, overdue payoff, and the next board change in sequence${goalHint}.`;
  }
  if (signal === "blocking_audit") {
    return `Choose ${ordersLabel} because a high-priority issue has already entered the current chapter and will affect the next stretch${goalHint}.`;
  }
  if (signal === "next_action_replan") {
    return `Choose ${ordersLabel} because canonical state judged the current window a mismatch and needs neighboring chapters around the anchor to close together${goalHint}.`;
  }
  return `Choose ${ordersLabel} because these chapters sit next to the current-state goal and cost the least to adjust${goalHint}.`;
}

export function buildReplanDecision(input: ReplanDecisionInput): ReplanDecision {
  const blockingIssues = collectBlockingIssues(input.auditReports);
  const blockingIssueIds = uniqueStrings([
    ...(input.blockingIssueIds ?? []),
    ...blockingIssues.map((issue) => issue.id),
  ]);
  const blockingLedgerKeys = collectBlockingLedgerKeys(input.blockingLedgerKeys, input.snapshot);
  const signal = pickSignal(input, blockingIssues, blockingLedgerKeys);
  const scope = input.scope === "global_book" ? "global_book" : "local_window";
  const action = resolveReplanAction(signal, input, scope);
  const recommended = action !== "continue_with_warning"
    && (
      input.forceRecommended
      || signal === "overdue_payoff"
      || signal === "next_action_replan"
      || signal === "blocking_audit"
    );
  const anchorChapterOrder = resolveAnchorChapterOrder(signal, input);
  const requestedWindowSize = input.requestedWindowSize ?? resolveDefaultWindowSize();
  const affectedChapterOrders = recommended
    ? buildWindowOrders(
      anchorChapterOrder,
      input.availableChapterOrders,
      requestedWindowSize,
      resolveWindowMode(signal),
    )
    : [];
  const triggerReason = buildTriggerReason(signal, input, blockingIssues, blockingLedgerKeys);
  const windowReason = buildWindowReason(
    signal,
    anchorChapterOrder,
    affectedChapterOrders,
    uniqueStrings(input.protectedSecrets ?? []),
  );
  return {
    recommended,
    reason: recommended
      ? triggerReason
      : signal === "overdue_payoff"
        ? "The overdue promise was recorded as chapter-level quality debt, and later chapters continued."
        : "There is no blocking state signal, so later chapters do not need a replan.",
    blockingIssueIds,
    blockingLedgerKeys,
    affectedChapterOrders,
    anchorChapterOrder,
    triggerReason,
    windowReason,
    whyTheseChapters: buildWhyTheseChapters(signal, affectedChapterOrders, input.chapterStateGoal),
    action,
    scope,
    signal,
    triggerType: input.triggerType?.trim() || "state_driven",
    sourceIssueIds: uniqueStrings(input.sourceIssueIds ?? []),
    windowSize: affectedChapterOrders.length,
  };
}

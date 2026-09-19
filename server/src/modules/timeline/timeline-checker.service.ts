import type {
  ExtractedTimelineEvent,
  TimelineCheckResult,
  TimelineContextForChapter,
  TimelineIssue,
  TimelineIssueSeverity,
} from "@ai-novel/shared/types/timeline";
import { defaultTimelinePolicy, type TimelinePolicy } from "./timeline-policy";

function normalize(value: string | null | undefined): string {
  return (value ?? "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "")
    .trim();
}

function compact(value: string | null | undefined): string {
  return (value ?? "").replace(/\s+/g, " ").trim();
}

function containsText(haystack: string, needle: string): boolean {
  const normalizedHaystack = normalize(haystack);
  const normalizedNeedle = normalize(needle);
  return normalizedNeedle.length >= 4 && normalizedHaystack.includes(normalizedNeedle);
}

function tokenSet(value: string): Set<string> {
  const normalized = value
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
  return new Set(normalized.split(/\s+/g).filter((item) => item.length >= 2));
}

function similarity(left: string, right: string): number {
  const a = tokenSet(left);
  const b = tokenSet(right);
  if (a.size === 0 || b.size === 0) {
    return containsText(left, right) || containsText(right, left) ? 1 : 0;
  }
  const intersection = Array.from(a).filter((item) => b.has(item)).length;
  const union = new Set([...a, ...b]).size;
  return union === 0 ? 0 : intersection / union;
}

function eventText(event: ExtractedTimelineEvent): string {
  return `${event.title}\n${event.summary}`;
}

type TimelineContextHook = TimelineContextForChapter["openHooks"][number];

function resolveModeOf(hook: TimelineContextHook): TimelineContextHook["resolveMode"] {
  return hook.resolveMode ?? "long_arc";
}

function isImmediateBlockingHook(hook: TimelineContextHook): boolean {
  return Boolean(hook.blocking) && resolveModeOf(hook) === "immediate";
}

function splitTimelineHooks(context: TimelineContextForChapter): {
  blockingHooks: TimelineContextHook[];
  softHooks: TimelineContextHook[];
} {
  const categorizedCount = (context.blockingHooks?.length ?? 0)
    + (context.softHooks?.length ?? 0)
    + (context.addressedHooks?.length ?? 0);
  if (categorizedCount > 0) {
    const blockingHooks = (context.blockingHooks ?? []).filter(isImmediateBlockingHook);
    const blockingIds = new Set(blockingHooks.map((hook) => hook.id));
    return {
      blockingHooks,
      softHooks: [
        ...(context.softHooks ?? []),
        ...(context.blockingHooks ?? []).filter((hook) => !blockingIds.has(hook.id)),
      ],
    };
  }

  const blockingHooks = (context.openHooks ?? []).filter((hook) => (
    isImmediateBlockingHook(hook)
    || (!hook.resolveMode && (hook.priority === "critical" || hook.priority === "high"))
  ));
  const blockingIds = new Set(blockingHooks.map((hook) => hook.id));
  return {
    blockingHooks,
    softHooks: (context.openHooks ?? []).filter((hook) => !blockingIds.has(hook.id)),
  };
}

function buildResult(issues: TimelineIssue[]): TimelineCheckResult {
  const hasBlocking = issues.some((issue) => issue.severity === "blocking");
  const hasError = issues.some((issue) => issue.severity === "error");
  const hasWarning = issues.some((issue) => issue.severity === "warning");
  const penalty = issues.reduce((sum, issue) => {
    if (issue.severity === "blocking") return sum + 0.35;
    if (issue.severity === "error") return sum + 0.22;
    if (issue.severity === "warning") return sum + 0.12;
    return sum + 0.04;
  }, 0);
  return {
    status: hasBlocking || hasError ? "failed" : hasWarning ? "warning" : "passed",
    score: Math.max(0, Math.min(1, 1 - penalty)),
    issues,
  };
}

export class TimelineCheckerService {
  constructor(private readonly policy: TimelinePolicy = defaultTimelinePolicy) {}

  checkChapter(input: {
    novelId: string;
    chapterId: string;
    chapterIndex: number;
    extractedEvents: ExtractedTimelineEvent[];
    timelineContext: TimelineContextForChapter;
    chapterContent: string;
  }): TimelineCheckResult {
    const issues: TimelineIssue[] = [];
    issues.push(...this.checkFutureEventLeak(input));
    issues.push(...this.checkUnresolvedHooks(input));
    issues.push(...this.checkTimelineRegression(input));
    issues.push(...this.checkRepeatedEvents(input));
    issues.push(...this.checkStateConflicts(input));
    issues.push(...this.checkMissingPlannedEvents(input));
    issues.push(...this.checkForbiddenEvents(input));
    issues.push(...this.checkUnclearTimeAnchor(input));
    return buildResult(issues);
  }

  private checkFutureEventLeak(input: {
    extractedEvents: ExtractedTimelineEvent[];
    timelineContext: TimelineContextForChapter;
    chapterContent: string;
  }): TimelineIssue[] {
    const issues: TimelineIssue[] = [];
    for (const forbidden of input.timelineContext.forbiddenEvents) {
      const evidence = input.extractedEvents.find((event) =>
        containsText(eventText(event), forbidden.title)
        || similarity(eventText(event), `${forbidden.title} ${forbidden.reason}`) >= 0.55);
      if (!evidence && !containsText(input.chapterContent, forbidden.title)) {
        continue;
      }
      issues.push({
        type: "future_event_leak",
        severity: this.policy.futureEventLeakSeverity,
        message: `This chapter wrote or confirmed a later event too early: ${forbidden.title}`,
        evidence: evidence ? `${evidence.title}：${evidence.summary}` : forbidden.title,
        suggestedFix: `Delete it or rewrite it as setup. Do not confirm that “${forbidden.title}” has already happened in this chapter.`,
        relatedEventIds: [forbidden.id],
        relatedHookIds: [],
      });
    }
    return issues;
  }

  private checkUnresolvedHooks(input: {
    extractedEvents: ExtractedTimelineEvent[];
    timelineContext: TimelineContextForChapter;
    chapterContent: string;
  }): TimelineIssue[] {
    const { blockingHooks, softHooks } = splitTimelineHooks(input.timelineContext);
    const isUnanswered = (hook: TimelineContextHook) => {
      const text = `${hook.title}\n${hook.description}`;
      return !input.extractedEvents.some((event) => similarity(eventText(event), text) >= 0.35)
        && !containsText(input.chapterContent, hook.title);
    };
    const blockingIssues = blockingHooks
      .filter(isUnanswered)
      .map((hook) => ({
        type: "unresolved_previous_hook" as const,
        severity: isImmediateBlockingHook(hook) || hook.priority === "critical" ? "blocking" as const : "error" as const,
        message: `This chapter did not pick up the leftover hook from the previous chapter: ${hook.title}`,
        evidence: hook.description,
        suggestedFix: `The chapter opening or midsection must answer “${hook.title}” instead of jumping straight to later events.`,
        relatedEventIds: [],
        relatedHookIds: [hook.id],
      }));
    const softIssues = softHooks
      .filter((hook) => hook.priority === "critical" || hook.priority === "high")
      .filter(isUnanswered)
      .map((hook) => ({
        type: "delayed_promise" as const,
        severity: resolveModeOf(hook) === "short_arc" ? "warning" as const : "info" as const,
        message: `This chapter has not yet paid off a deferrable hook: ${hook.title}`,
        evidence: hook.description,
        suggestedFix: `This hook belongs to ${resolveModeOf(hook)} and can stay open, but later chapters should show visible progress.`,
        relatedEventIds: [],
        relatedHookIds: [hook.id],
      }));
    return [...blockingIssues, ...softIssues];
  }

  private checkTimelineRegression(input: { timelineContext: TimelineContextForChapter }): TimelineIssue[] {
    const currentDay = input.timelineContext.currentTime?.storyDayIndex;
    if (this.policy.allowTimeRegression || currentDay == null) {
      return [];
    }
    const previousDayLabels = input.timelineContext.previousEvents
      .map((event) => event.storyTimeLabel ?? "")
      .filter(Boolean);
    if (previousDayLabels.length > 0 && input.timelineContext.currentTime?.label?.includes("before")) {
      return [{
        type: "timeline_regression",
        severity: "warning",
        message: "This chapter's time label looks like it moved backward. Confirm whether it is a flashback or insert.",
        evidence: input.timelineContext.currentTime.label,
        suggestedFix: "If this is not a flashback, adjust this chapter's time anchor so it follows the previous chapter.",
        relatedEventIds: [],
        relatedHookIds: [],
      }];
    }
    return [];
  }

  private checkRepeatedEvents(input: {
    extractedEvents: ExtractedTimelineEvent[];
    timelineContext: TimelineContextForChapter;
  }): TimelineIssue[] {
    const issues: TimelineIssue[] = [];
    for (const event of input.extractedEvents) {
      const match = input.timelineContext.previousEvents.find((previous) =>
        containsText(eventText(event), previous.title)
        || containsText(`${previous.title} ${previous.summary}`, event.title)
        || similarity(eventText(event), `${previous.title} ${previous.summary}`) >= this.policy.maxRepeatedEventSimilarity);
      if (!match) {
        continue;
      }
      issues.push({
        type: "repeated_event",
        severity: "warning",
        message: `This chapter appears to repeat an event that already happened: ${match.title}`,
        evidence: `${event.title}：${event.summary}`,
        suggestedFix: "Confirm this chapter is advancing the consequence instead of making the same event happen again.",
        relatedEventIds: [match.id],
        relatedHookIds: [],
      });
    }
    return issues;
  }

  private checkStateConflicts(input: {
    extractedEvents: ExtractedTimelineEvent[];
    timelineContext: TimelineContextForChapter;
  }): TimelineIssue[] {
    const known = new Map(input.timelineContext.knownStateChanges.map((change) => [
      `${change.targetType}:${change.targetId}:${change.field}`,
      change,
    ]));
    const issues: TimelineIssue[] = [];
    for (const event of input.extractedEvents) {
      for (const change of event.stateChanges) {
        const previous = known.get(`${change.targetType}:${change.targetId}:${change.field}`);
        if (!previous || normalize(previous.after) === normalize(change.after)) {
          continue;
        }
        if (previous.certainty !== "confirmed" || change.certainty === "rumored") {
          continue;
        }
        issues.push({
          type: "state_conflict",
          severity: "error",
          message: `This chapter's state change conflicts with a previously confirmed state: ${change.targetType}:${change.targetId}.${change.field}`,
          evidence: `Previously=${previous.after}; this chapter=${change.after}`,
          suggestedFix: "If a state already changed, first write a clear restore, transfer, or reversal. Otherwise keep the existing state.",
          relatedEventIds: [],
          relatedHookIds: [],
        });
      }
    }
    return issues;
  }

  private checkMissingPlannedEvents(input: {
    extractedEvents: ExtractedTimelineEvent[];
    timelineContext: TimelineContextForChapter;
  }): TimelineIssue[] {
    if (!this.policy.requirePlannedEventCoverage) {
      return [];
    }
    return input.timelineContext.plannedEventsThisChapter
      .filter((planned) => !input.extractedEvents.some((event) =>
        event.matchedPlannedEventIds.includes(planned.id)
        || similarity(eventText(event), `${planned.title} ${planned.summary}`) >= 0.35))
      .map((planned) => ({
        type: "missing_planned_event" as const,
        severity: "error" as const,
        message: `This chapter did not complete the planned timeline event: ${planned.title}`,
        evidence: planned.summary,
        suggestedFix: `Rewrite the prose so “${planned.title}” actually happens in this chapter. If the plan is wrong, adjust the timeline plan first.`,
        relatedEventIds: [planned.id],
        relatedHookIds: [],
      }));
  }

  private checkForbiddenEvents(input: {
    extractedEvents: ExtractedTimelineEvent[];
    timelineContext: TimelineContextForChapter;
    chapterContent: string;
  }): TimelineIssue[] {
    return input.timelineContext.continuityRequirements
      .filter((requirement) => requirement.includes("must_not_happen") || requirement.includes("Prohibited from occurring in advance"))
      .flatMap((requirement) => {
        const matched = input.extractedEvents.find((event) => {
          const title = compact(event.title);
          return title.length > 0 && requirement.includes(title);
        });
        return matched
          ? [{
              type: "forbidden_event_occurred" as const,
              severity: "blocking" as const,
              message: "This chapter includes a timeline event that must not happen yet.",
              evidence: `${matched.title}：${matched.summary}`,
              suggestedFix: requirement,
              relatedEventIds: [],
              relatedHookIds: [],
            }]
          : [];
      });
  }

  private checkUnclearTimeAnchor(input: { timelineContext: TimelineContextForChapter }): TimelineIssue[] {
    if (!this.policy.requireTimeAnchorEveryChapter || input.timelineContext.currentTime?.label) {
      return [];
    }
    return [{
      type: "unclear_time_anchor",
      severity: "info" as TimelineIssueSeverity,
      message: "This chapter has no clear time anchor.",
      evidence: "ChapterTimeAnchor is missing",
      suggestedFix: "Add a timeLabel for this chapter so later chapters can judge time progress.",
      relatedEventIds: [],
      relatedHookIds: [],
    }];
  }
}

export const timelineCheckerService = new TimelineCheckerService();

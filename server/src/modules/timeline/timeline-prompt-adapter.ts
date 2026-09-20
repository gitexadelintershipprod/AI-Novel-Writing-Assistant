import type { TimelineContextForChapter } from "@ai-novel/shared/types/timeline";

function listBlock<T>(title: string, items: T[], render: (item: T) => string): string {
  if (items.length === 0) {
    return `${title}\n- none`;
  }
  return [title, ...items.map((item) => `- ${render(item)}`)].join("\n");
}

type TimelineContextHook = TimelineContextForChapter["openHooks"][number];

export interface TimelinePromptBlockOptions {
  maxPreviousEvents?: number;
  maxSoftHooks?: number;
  maxAddressedHooks?: number;
}

function resolveModeOf(hook: TimelineContextHook): TimelineContextHook["resolveMode"] {
  return hook.resolveMode ?? "long_arc";
}

function isBlockingHook(hook: TimelineContextHook): boolean {
  return (Boolean(hook.blocking) && resolveModeOf(hook) === "immediate")
    || (!hook.resolveMode && hook.priority === "critical");
}

function hookLabel(hook: TimelineContextHook): string {
  return `[id=${hook.id}] ${hook.title}: ${hook.description} (${hook.priority} / ${resolveModeOf(hook)})`;
}

export class TimelinePromptAdapter {
  toPromptBlock(context: TimelineContextForChapter, options: TimelinePromptBlockOptions = {}): string {
    const maxPreviousEvents = options.maxPreviousEvents ?? 40;
    const maxSoftHooks = options.maxSoftHooks ?? 20;
    const maxAddressedHooks = options.maxAddressedHooks ?? 12;
    const previousEvents = context.previousEvents.slice(-maxPreviousEvents);
    const blockingHooks = context.blockingHooks?.length
      ? context.blockingHooks
      : context.openHooks.filter(isBlockingHook);
    const blockingIds = new Set(blockingHooks.map((hook) => hook.id));
    const softHooksSource = context.softHooks?.length
      ? context.softHooks
      : context.openHooks.filter((hook) => !blockingIds.has(hook.id));
    const softHooks = softHooksSource.slice(-maxSoftHooks);
    const addressedHooks = (context.addressedHooks ?? []).slice(-maxAddressedHooks);
    return [
      "[Timeline constraints]",
      `Current chapter: Chapter ${context.currentChapterIndex}`,
      `Current story time: ${context.currentTime?.label || "unspecified"}`,
      "",
      listBlock("[Key events that already happened]", previousEvents, (event) =>
        `${event.title}: ${event.summary}${event.storyTimeLabel ? ` (${event.storyTimeLabel})` : ""}`),
      "",
      listBlock("[This chapter must advance]", context.plannedEventsThisChapter, (event) =>
        `${event.title}: ${event.summary}`),
      "",
      listBlock("[Hooks that must be picked up now]", blockingHooks, (hook) =>
        hookLabel(hook)),
      "",
      listBlock("[Hooks that can wait]", softHooks, (hook) =>
        hookLabel(hook)),
      "",
      listBlock("[Hooks already partly picked up]", addressedHooks, (hook) =>
        hookLabel(hook)),
      "",
      listBlock("[Prohibited from occurring in advance]", context.forbiddenEvents, (event) =>
        `${event.title}: ${event.reason}`),
      "",
      listBlock("[Continuity requirements]", context.continuityRequirements, (item) => item),
      "",
      listBlock("[Key state changes]", context.knownStateChanges.slice(-8), (change) =>
        `${change.targetType}:${change.targetId}.${change.field} = ${change.after} (${change.certainty})`),
    ].join("\n").trim();
  }

  toPreviousHookBlock(context: TimelineContextForChapter): string {
    const blockingHooks = context.blockingHooks?.length
      ? context.blockingHooks
      : context.openHooks.filter(isBlockingHook);
    const softHooks = context.softHooks ?? [];
    const hooks = blockingHooks.length > 0 ? blockingHooks : softHooks.slice(0, 4);
    const title = blockingHooks.length > 0
      ? "[Hooks from the previous chapter that must be picked up immediately]"
      : "[Hooks from the previous chapter that can wait]";
    return listBlock(title, hooks, (hook) =>
      `[id=${hook.id}] ${hook.title}: ${hook.description} (priority: ${hook.priority} / ${resolveModeOf(hook)})`);
  }
}

export const timelinePromptAdapter = new TimelinePromptAdapter();

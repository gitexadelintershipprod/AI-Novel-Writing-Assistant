import type {
  Chapter,
  VolumeChapterPlan,
  VolumeBeatImpactItem,
  VolumeBeatSheet,
  VolumeImpactResult,
  VolumePlan,
  VolumePlanDiff,
  VolumePlanDiffVolume,
  VolumeSyncPreview,
  VolumeSyncPreviewItem,
} from "@ai-novel/shared/types/novel";

export interface ExistingChapterRecord {
  id: string;
  order: number;
  title: string;
  content?: string | null;
  generationState?: Chapter["generationState"] | null;
  chapterStatus?: Chapter["chapterStatus"] | null;
  expectation?: string | null;
  exclusiveEvent?: string | null;
  endingState?: string | null;
  nextChapterEntryState?: string | null;
  targetWordCount?: number | null;
  conflictLevel?: number | null;
  revealLevel?: number | null;
  mustAvoid?: string | null;
  taskSheet?: string | null;
  sceneCards?: string | null;
}

export interface VolumeSyncPlan {
  preview: VolumeSyncPreview;
  links: Array<{
    volumeChapterId: string;
    chapterId: string;
  }>;
  creates: Array<{
    volumeTitle: string;
    chapter: VolumeChapterPlan;
  }>;
  updates: Array<{
    chapterId: string;
    chapter: VolumeChapterPlan;
    clearContent: boolean;
    preserveWorkflowState: boolean;
    existingGenerationState?: Chapter["generationState"] | null;
    existingChapterStatus?: Chapter["chapterStatus"] | null;
  }>;
  deletes: Array<{
    chapterId: string;
    order: number;
    title: string;
    hasContent: boolean;
  }>;
}

function compareText(a: string | null | undefined, b: string | null | undefined): boolean {
  return (a ?? "").trim() === (b ?? "").trim();
}

function compareNumber(a: number | null | undefined, b: number | null | undefined): boolean {
  return (typeof a === "number" ? a : null) === (typeof b === "number" ? b : null);
}

function compareStringArray(a: string[], b: string[]): boolean {
  return a.join("\n") === b.join("\n");
}

function normalizeStringArray(value: string[] | null | undefined): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter(Boolean);
}

function flattenVolumeChapters(volumes: VolumePlan[]) {
  return volumes
    .slice()
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .flatMap((volume) => volume.chapters
      .slice()
      .sort((a, b) => a.chapterOrder - b.chapterOrder)
      .map((chapter) => ({ volume, chapter })));
}

function hasGeneratedContent(content: string | null | undefined): boolean {
  return Boolean(content?.trim());
}

function normalizeLookupTitle(title: string): string {
  return title.trim().toLowerCase();
}

function normalizeOptionalId(value: string | null | undefined): string | null {
  const trimmed = value?.trim() ?? "";
  return trimmed || null;
}

function parseBeatChapterSpan(chapterSpanHint: string): { start: number; end: number } | null {
  const matches = Array.from(chapterSpanHint.matchAll(/\d+/g), (match) => Number(match[0]));
  if (matches.length === 0 || matches.some((value) => Number.isNaN(value))) {
    return null;
  }
  const start = Math.max(1, matches[0]);
  return {
    start,
    end: Math.max(start, matches[matches.length - 1]),
  };
}

function resolveChapterBeatKey(input: {
  chapter: VolumeChapterPlan;
  volume: VolumePlan;
  beatSheet: VolumeBeatSheet;
}): string | null {
  const explicitBeatKey = input.chapter.beatKey?.trim();
  if (explicitBeatKey) {
    return explicitBeatKey;
  }
  const localOrder = input.volume.chapters
    .slice()
    .sort((left, right) => left.chapterOrder - right.chapterOrder)
    .findIndex((chapter) => chapter.id === input.chapter.id) + 1;
  if (localOrder <= 0) {
    return null;
  }
  const matchedBeat = input.beatSheet.beats.find((beat) => {
    const span = parseBeatChapterSpan(beat.chapterSpanHint);
    return span ? localOrder >= span.start && localOrder <= span.end : false;
  });
  return matchedBeat?.key ?? null;
}

function getChapterChangedFields(existing: ExistingChapterRecord, chapter: VolumeChapterPlan, action: "update" | "move"): string[] {
  const changed: string[] = action === "move" ? ["Chapter order"] : [];
  if (!compareText(existing.title, chapter.title)) changed.push("Title");
  if (!compareText(existing.expectation, chapter.summary)) changed.push("Summary");
  if (!compareText(existing.exclusiveEvent, chapter.exclusiveEvent)) changed.push("exclusive event");
  if (!compareText(existing.endingState, chapter.endingState)) changed.push("End-of-chapter state");
  if (!compareText(existing.nextChapterEntryState, chapter.nextChapterEntryState)) changed.push("Starting state for the next chapter");
  if (!compareNumber(existing.targetWordCount, chapter.targetWordCount)) changed.push("target word count");
  if (!compareNumber(existing.conflictLevel, chapter.conflictLevel)) changed.push("conflict level");
  if (!compareNumber(existing.revealLevel, chapter.revealLevel)) changed.push("reveal level");
  if (!compareText(existing.mustAvoid, chapter.mustAvoid)) changed.push("Prohibited matters");
  if (!compareText(existing.taskSheet, chapter.taskSheet)) changed.push("task order");
  if (!compareText(existing.sceneCards, chapter.sceneCards)) changed.push("scene budget");
  return changed;
}

function buildVolumeOutlineSnapshot(volumes: VolumePlan[]): string {
  if (volumes.length === 0) {
    return "";
  }
  return volumes
    .slice()
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((volume) => {
      const chapterSpan = volume.chapters.length > 0
        ? `${volume.chapters[0]?.chapterOrder ?? "-"}-${volume.chapters[volume.chapters.length - 1]?.chapterOrder ?? "-"}`
        : "Unopened";
      const lines = [
        `[Volume ${volume.sortOrder}]${volume.title}`,
        volume.summary ? `Volume summary:${volume.summary}` : "",
        volume.openingHook ? `Unwinding handle:${volume.openingHook}` : "",
        volume.mainPromise ? `Main promise:${volume.mainPromise}` : "",
        volume.primaryPressureSource ? `Main source of oppression:${volume.primaryPressureSource}` : "",
        volume.coreSellingPoint ? `Core selling points:${volume.coreSellingPoint}` : "",
        volume.escalationMode ? `Upgrade method:${volume.escalationMode}` : "",
        volume.protagonistChange ? `Protagonist changes:${volume.protagonistChange}` : "",
        volume.midVolumeRisk ? `Mid-term risks:${volume.midVolumeRisk}` : "",
        volume.climax ? `Climax at the end of the volume:${volume.climax}` : "",
        volume.payoffType ? `Redemption type:${volume.payoffType}` : "",
        volume.nextVolumeHook ? `Lower roll hook:${volume.nextVolumeHook}` : "",
        volume.resetPoint ? `Reset point:${volume.resetPoint}` : "",
        volume.openPayoffs.length > 0 ? `Unfulfilled items:${volume.openPayoffs.join(", ")}` : "",
        `Chapter scope:${chapterSpan}`,
      ].filter(Boolean);
      return lines.join("\n");
    })
    .join("\n\n");
}

function buildPayoffLedgerSignalSnapshot(volumes: VolumePlan[]) {
  return volumes
    .slice()
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((volume) => {
      const openPayoffs = normalizeStringArray(volume.openPayoffs);
      const payoffRefChapters = volume.chapters
        .slice()
        .sort((a, b) => a.chapterOrder - b.chapterOrder)
        .map((chapter) => ({
          chapterOrder: chapter.chapterOrder,
          payoffRefs: normalizeStringArray(chapter.payoffRefs),
        }))
        .filter((chapter) => chapter.payoffRefs.length > 0);
      const shouldTrackVolumeWindow = openPayoffs.length > 0 || payoffRefChapters.length > 0;
      if (!shouldTrackVolumeWindow) {
        return null;
      }
      return {
        sortOrder: volume.sortOrder,
        openPayoffs,
        chapterOrders: volume.chapters
          .slice()
          .sort((a, b) => a.chapterOrder - b.chapterOrder)
          .map((chapter) => chapter.chapterOrder),
        payoffRefChapters,
      };
    })
    .filter((item): item is NonNullable<typeof item> => Boolean(item));
}

export function hasPayoffLedgerSourceSignals(volumes: VolumePlan[]): boolean {
  return buildPayoffLedgerSignalSnapshot(volumes).length > 0;
}

export function hasPayoffLedgerRelevantPlanChanges(beforeVolumes: VolumePlan[], afterVolumes: VolumePlan[]): boolean {
  return JSON.stringify(buildPayoffLedgerSignalSnapshot(beforeVolumes))
    !== JSON.stringify(buildPayoffLedgerSignalSnapshot(afterVolumes));
}

export function buildTaskSheetFromVolumeChapter(chapter: VolumeChapterPlan): string {
  const lines = [
    `Chapter Objectives:${chapter.purpose || chapter.summary || "Advance the main line"}`,
    chapter.exclusiveEvent ? `Exclusive event: ${chapter.exclusiveEvent}` : "",
    chapter.endingState ? `End-of-chapter state: ${chapter.endingState}` : "",
    chapter.nextChapterEntryState ? `Starting state for the next chapter: ${chapter.nextChapterEntryState}` : "",
    typeof chapter.conflictLevel === "number" ? `Conflict level:${chapter.conflictLevel}` : "",
    typeof chapter.revealLevel === "number" ? `Disclosure level:${chapter.revealLevel}` : "",
    typeof chapter.targetWordCount === "number" ? `Target word count:${chapter.targetWordCount}` : "",
    chapter.mustAvoid ? `Prohibited matters:${chapter.mustAvoid}` : "",
    chapter.payoffRefs.length > 0 ? `Payoff association: ${chapter.payoffRefs.join(", ")}` : "",
  ].filter(Boolean);
  return lines.join("\n");
}

export function buildVolumeSyncPlan(
  volumes: VolumePlan[],
  existingChapters: ExistingChapterRecord[],
  options: { preserveContent: boolean; applyDeletes: boolean },
): VolumeSyncPlan {
  const flattened = flattenVolumeChapters(volumes);
  const existingById = new Map(existingChapters.map((chapter) => [chapter.id, chapter]));
  const existingByOrder = new Map(existingChapters.map((chapter) => [chapter.order, chapter]));
  const existingByTitle = new Map(existingChapters.map((chapter) => [normalizeLookupTitle(chapter.title), chapter]));
  const matchedChapterIds = new Set<string>();
  const items: VolumeSyncPreviewItem[] = [];
  const links: VolumeSyncPlan["links"] = [];
  const creates: VolumeSyncPlan["creates"] = [];
  const updates: VolumeSyncPlan["updates"] = [];
  const deletes: VolumeSyncPlan["deletes"] = [];
  let createCount = 0;
  let updateCount = 0;
  let keepCount = 0;
  let moveCount = 0;
  let deleteCount = 0;
  let deleteCandidateCount = 0;
  let affectedGeneratedCount = 0;
  let clearContentCount = 0;

  for (const entry of flattened) {
    const { volume, chapter } = entry;
    const linkedChapterId = normalizeOptionalId(chapter.chapterId);
    const matchedById = linkedChapterId ? existingById.get(linkedChapterId) : undefined;
    const existing = matchedById && !matchedChapterIds.has(matchedById.id)
      ? matchedById
      : (() => {
        if (linkedChapterId) {
          return undefined;
        }
        const existingBySameOrder = existingByOrder.get(chapter.chapterOrder);
        const matchedByOrder = existingBySameOrder && !matchedChapterIds.has(existingBySameOrder.id)
          ? existingBySameOrder
          : undefined;
        const matchedByTitle = existingByTitle.get(normalizeLookupTitle(chapter.title));
        return matchedByOrder ?? (
          matchedByTitle && !matchedChapterIds.has(matchedByTitle.id)
            ? matchedByTitle
            : undefined
        );
      })();

    if (!existing) {
      createCount += 1;
      creates.push({ volumeTitle: volume.title, chapter });
      items.push({
        action: "create",
        volumeTitle: volume.title,
        chapterOrder: chapter.chapterOrder,
        nextTitle: chapter.title,
        hasContent: false,
        changedFields: ["new chapter"],
      });
      continue;
    }

    matchedChapterIds.add(existing.id);
    links.push({
      volumeChapterId: chapter.id,
      chapterId: existing.id,
    });
    const action = existing.order === chapter.chapterOrder ? "update" : "move";
    const changedFields = getChapterChangedFields(existing, chapter, action);
    const hasContent = hasGeneratedContent(existing.content);

    if (changedFields.length === 0) {
      keepCount += 1;
      items.push({
        action: "keep",
        volumeTitle: volume.title,
        chapterOrder: chapter.chapterOrder,
        nextTitle: chapter.title,
        previousTitle: existing.title,
        hasContent,
        changedFields: [],
      });
      continue;
    }

    if (action === "move") {
      moveCount += 1;
    } else {
      updateCount += 1;
    }
    if (hasContent) {
      affectedGeneratedCount += 1;
      if (!options.preserveContent) {
        clearContentCount += 1;
      }
    }
    updates.push({
      chapterId: existing.id,
      chapter,
      clearContent: hasContent && !options.preserveContent,
      preserveWorkflowState: hasContent && options.preserveContent,
      existingGenerationState: existing.generationState ?? null,
      existingChapterStatus: existing.chapterStatus ?? null,
    });
    items.push({
      action,
      volumeTitle: volume.title,
      chapterOrder: chapter.chapterOrder,
      nextTitle: chapter.title,
      previousTitle: existing.title,
      hasContent,
      changedFields,
    });
  }

  for (const chapter of existingChapters.slice().sort((a, b) => a.order - b.order)) {
    if (matchedChapterIds.has(chapter.id)) {
      continue;
    }
    const hasContent = hasGeneratedContent(chapter.content);
    if (options.applyDeletes) {
      deleteCount += 1;
      deletes.push({
        chapterId: chapter.id,
        order: chapter.order,
        title: chapter.title,
        hasContent,
      });
      items.push({
        action: "delete",
        volumeTitle: "Not matched",
        chapterOrder: chapter.order,
        nextTitle: chapter.title,
        previousTitle: chapter.title,
        hasContent,
        changedFields: ["Removed from syllabus"],
      });
    } else {
      deleteCandidateCount += 1;
      items.push({
        action: "delete_candidate",
        volumeTitle: "Not matched",
        chapterOrder: chapter.order,
        nextTitle: chapter.title,
        previousTitle: chapter.title,
        hasContent,
        changedFields: ["Pending confirmation of deletion"],
      });
    }
  }

  const affectedVolumeCount = new Set(
    items.filter((item) => item.action !== "keep").map((item) => item.volumeTitle),
  ).size;

  return {
    preview: {
      createCount,
      updateCount,
      keepCount,
      moveCount,
      deleteCount,
      deleteCandidateCount,
      affectedGeneratedCount,
      clearContentCount,
      affectedVolumeCount,
      items,
    },
    links,
    creates,
    updates,
    deletes,
  };
}

function estimateChangedLines(beforeText: string, afterText: string): number {
  const beforeLines = beforeText.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const afterLines = afterText.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const beforeSet = new Set(beforeLines);
  const afterSet = new Set(afterLines);
  let changed = 0;
  for (const line of afterLines) {
    if (!beforeSet.has(line)) changed += 1;
  }
  for (const line of beforeLines) {
    if (!afterSet.has(line)) changed += 1;
  }
  return changed;
}

function collectVolumeChangedFields(beforeVolume: VolumePlan | undefined, afterVolume: VolumePlan): string[] {
  if (!beforeVolume) {
    return ["Add new volume"];
  }
  const changed: string[] = [];
  if (!compareText(beforeVolume.title, afterVolume.title)) changed.push("Volume title");
  if (!compareText(beforeVolume.summary, afterVolume.summary)) changed.push("Volume Summary");
  if (!compareText(beforeVolume.openingHook, afterVolume.openingHook)) changed.push("Opening hook");
  if (!compareText(beforeVolume.mainPromise, afterVolume.mainPromise)) changed.push("main promise");
  if (!compareText(beforeVolume.primaryPressureSource, afterVolume.primaryPressureSource)) changed.push("main source of oppression");
  if (!compareText(beforeVolume.coreSellingPoint, afterVolume.coreSellingPoint)) changed.push("core selling point");
  if (!compareText(beforeVolume.escalationMode, afterVolume.escalationMode)) changed.push("Upgrade method");
  if (!compareText(beforeVolume.protagonistChange, afterVolume.protagonistChange)) changed.push("Protagonist changes");
  if (!compareText(beforeVolume.midVolumeRisk, afterVolume.midVolumeRisk)) changed.push("mid-range risk");
  if (!compareText(beforeVolume.climax, afterVolume.climax)) changed.push("Climax at the end of the volume");
  if (!compareText(beforeVolume.payoffType, afterVolume.payoffType)) changed.push("Redemption type");
  if (!compareText(beforeVolume.nextVolumeHook, afterVolume.nextVolumeHook)) changed.push("Lower roll hook");
  if (!compareText(beforeVolume.resetPoint, afterVolume.resetPoint)) changed.push("reset point");
  if (!compareStringArray(beforeVolume.openPayoffs, afterVolume.openPayoffs)) changed.push("open payoffs");
  if (beforeVolume.chapters.length !== afterVolume.chapters.length) changed.push("Number of chapters");
  const beforeChapterMap = new Map(beforeVolume.chapters.map((chapter) => [chapter.chapterOrder, chapter]));
  const chapterChanged = afterVolume.chapters.some((chapter) => {
    const beforeChapter = beforeChapterMap.get(chapter.chapterOrder);
    if (!beforeChapter) {
      return true;
    }
    return getChapterChangedFields({
      id: beforeChapter.id,
      order: beforeChapter.chapterOrder,
      title: beforeChapter.title,
      expectation: beforeChapter.summary,
      exclusiveEvent: beforeChapter.exclusiveEvent,
      endingState: beforeChapter.endingState,
      nextChapterEntryState: beforeChapter.nextChapterEntryState,
      targetWordCount: beforeChapter.targetWordCount,
      conflictLevel: beforeChapter.conflictLevel,
      revealLevel: beforeChapter.revealLevel,
      mustAvoid: beforeChapter.mustAvoid,
      taskSheet: beforeChapter.taskSheet,
      sceneCards: beforeChapter.sceneCards,
    }, chapter, "update").length > 0;
  });
  if (chapterChanged) changed.push("Chapter planning");
  return changed;
}

export function buildVolumeDiffSummary(changedVolumes: VolumePlanDiffVolume[]): string {
  if (changedVolumes.length === 0) {
    return "No volume-level structure change.";
  }
  return changedVolumes
    .map((volume) => `Volume ${volume.sortOrder}"${volume.title}": ${volume.changedFields.join(", ")}${volume.chapterOrders.length > 0 ? `; affected chapters ${volume.chapterOrders.join(", ")}` : ""}`)
    .join("\n");
}

export function buildVolumeDiff(
  beforeVolumes: VolumePlan[],
  afterVolumes: VolumePlan[],
  versionMeta: {
    id: string;
    novelId: string;
    version: number;
    status: "draft" | "active" | "frozen";
    diffSummary?: string | null;
  },
): VolumePlanDiff {
  const beforeByOrder = new Map(beforeVolumes.map((volume) => [volume.sortOrder, volume]));
  const changedVolumes: VolumePlanDiffVolume[] = afterVolumes
    .map((volume) => {
      const changedFields = collectVolumeChangedFields(beforeByOrder.get(volume.sortOrder), volume);
      if (changedFields.length === 0) {
        return null;
      }
      const beforeChapterMap = new Map((beforeByOrder.get(volume.sortOrder)?.chapters ?? []).map((chapter) => [chapter.chapterOrder, chapter]));
      const changedChapterOrders = volume.chapters
        .filter((chapter) => {
          const beforeChapter = beforeChapterMap.get(chapter.chapterOrder);
          if (!beforeChapter) {
            return true;
          }
          return getChapterChangedFields({
            id: beforeChapter.id,
            order: beforeChapter.chapterOrder,
            title: beforeChapter.title,
            expectation: beforeChapter.summary,
            exclusiveEvent: beforeChapter.exclusiveEvent,
            endingState: beforeChapter.endingState,
            nextChapterEntryState: beforeChapter.nextChapterEntryState,
            targetWordCount: beforeChapter.targetWordCount,
            conflictLevel: beforeChapter.conflictLevel,
            revealLevel: beforeChapter.revealLevel,
            mustAvoid: beforeChapter.mustAvoid,
            taskSheet: beforeChapter.taskSheet,
            sceneCards: beforeChapter.sceneCards,
          }, chapter, "update").length > 0;
        })
        .map((chapter) => chapter.chapterOrder);
      return {
        sortOrder: volume.sortOrder,
        title: volume.title,
        changedFields,
        chapterOrders: changedChapterOrders,
      };
    })
    .filter((item): item is VolumePlanDiffVolume => Boolean(item));

  const affectedChapterOrders = Array.from(new Set(changedVolumes.flatMap((item) => item.chapterOrders))).sort((a, b) => a - b);
  return {
    id: versionMeta.id,
    novelId: versionMeta.novelId,
    version: versionMeta.version,
    status: versionMeta.status,
    diffSummary: versionMeta.diffSummary ?? buildVolumeDiffSummary(changedVolumes),
    changedLines: estimateChangedLines(buildVolumeOutlineSnapshot(beforeVolumes), buildVolumeOutlineSnapshot(afterVolumes)),
    changedVolumeCount: changedVolumes.length,
    changedChapterCount: affectedChapterOrders.length,
    changedVolumes,
    affectedChapterOrders,
  };
}

function buildVolumeBeatImpactItems(input: {
  afterVolumes: VolumePlan[];
  beatSheets?: VolumeBeatSheet[];
  existingChapters?: ExistingChapterRecord[];
  diff: VolumePlanDiff;
}): VolumeBeatImpactItem[] {
  const beatSheetsByVolumeId = new Map(
    (input.beatSheets ?? []).map((sheet) => [sheet.volumeId, sheet] as const),
  );
  const existingByOrder = new Map(
    (input.existingChapters ?? []).map((chapter) => [chapter.order, chapter] as const),
  );
  const changedVolumeOrders = new Set(input.diff.changedVolumes.map((volume) => volume.sortOrder));
  const changedChapterOrders = new Set(input.diff.affectedChapterOrders);
  const firstChangedChapterOrder = input.diff.affectedChapterOrders[0] ?? null;
  const items: VolumeBeatImpactItem[] = [];

  for (const volume of input.afterVolumes.slice().sort((left, right) => left.sortOrder - right.sortOrder)) {
    if (!changedVolumeOrders.has(volume.sortOrder) && changedChapterOrders.size === 0) {
      continue;
    }
    const beatSheet = beatSheetsByVolumeId.get(volume.id);
    if (!beatSheet) {
      continue;
    }
    const volumeHasPlanLevelChange = input.diff.changedVolumes.some((changedVolume) => (
      changedVolume.sortOrder === volume.sortOrder
      && changedVolume.changedFields.some((field) => field !== "Chapter planning" && field !== "Number of chapters")
    ));

    for (const beat of beatSheet.beats) {
      const beatChapters = volume.chapters
        .filter((chapter) => resolveChapterBeatKey({ chapter, volume, beatSheet }) === beat.key)
        .sort((left, right) => left.chapterOrder - right.chapterOrder);
      const chapterOrders = beatChapters.map((chapter) => chapter.chapterOrder);
      const overlapsChangedChapter = chapterOrders.some((order) => changedChapterOrders.has(order));
      const followsChangedChapter = firstChangedChapterOrder != null
        && chapterOrders.some((order) => order >= firstChangedChapterOrder);
      const shouldIncludeBeat = volumeHasPlanLevelChange || overlapsChangedChapter || followsChangedChapter || (
        chapterOrders.length === 0
        && changedVolumeOrders.has(volume.sortOrder)
      );
      if (!shouldIncludeBeat) {
        continue;
      }
      const hasDraftContent = chapterOrders.some((order) => hasGeneratedContent(existingByOrder.get(order)?.content));
      const status = hasDraftContent
        ? "locked_with_draft"
        : (chapterOrders.length > 0 ? "stale" : "pending");
      items.push({
        volumeId: volume.id,
        volumeOrder: volume.sortOrder,
        volumeTitle: volume.title,
        beatKey: beat.key,
        beatLabel: beat.label,
        beatTitle: beat.title ?? null,
        chapterOrders,
        status,
        reason: hasDraftContent
          ? "locked_with_draft"
          : (chapterOrders.length > 0 ? "generated_without_draft" : "ungenerated"),
        hasDraftContent,
      });
    }
  }

  return items;
}

export function buildForwardVolumeBeatImpactItems(input: {
  volumes: VolumePlan[];
  beatSheets?: VolumeBeatSheet[];
  existingChapters?: ExistingChapterRecord[];
  fromChapterOrder?: number | null;
}): VolumeBeatImpactItem[] {
  const beatSheetsByVolumeId = new Map(
    (input.beatSheets ?? []).map((sheet) => [sheet.volumeId, sheet] as const),
  );
  const existingByOrder = new Map(
    (input.existingChapters ?? []).map((chapter) => [chapter.order, chapter] as const),
  );
  const firstAffectedOrder = Math.max(1, Math.round(input.fromChapterOrder ?? 1));
  const items: VolumeBeatImpactItem[] = [];

  for (const volume of input.volumes.slice().sort((left, right) => left.sortOrder - right.sortOrder)) {
    const beatSheet = beatSheetsByVolumeId.get(volume.id);
    if (!beatSheet) {
      continue;
    }
    for (const beat of beatSheet.beats) {
      const beatChapters = volume.chapters
        .filter((chapter) => resolveChapterBeatKey({ chapter, volume, beatSheet }) === beat.key)
        .sort((left, right) => left.chapterOrder - right.chapterOrder);
      const chapterOrders = beatChapters.map((chapter) => chapter.chapterOrder);
      const isForwardBeat = chapterOrders.length === 0
        || chapterOrders.some((order) => order >= firstAffectedOrder);
      if (!isForwardBeat) {
        continue;
      }
      const hasDraftContent = chapterOrders.some((order) => hasGeneratedContent(existingByOrder.get(order)?.content));
      items.push({
        volumeId: volume.id,
        volumeOrder: volume.sortOrder,
        volumeTitle: volume.title,
        beatKey: beat.key,
        beatLabel: beat.label,
        beatTitle: beat.title ?? null,
        chapterOrders,
        status: hasDraftContent
          ? "locked_with_draft"
          : (chapterOrders.length > 0 ? "stale" : "pending"),
        reason: hasDraftContent
          ? "locked_with_draft"
          : (chapterOrders.length > 0 ? "generated_without_draft" : "ungenerated"),
        hasDraftContent,
      });
    }
  }

  return items;
}

export function buildVolumeImpactResult(
  novelId: string,
  beforeVolumes: VolumePlan[],
  afterVolumes: VolumePlan[],
  sourceVersion: number | null,
  context: {
    beatSheets?: VolumeBeatSheet[];
    existingChapters?: ExistingChapterRecord[];
  } = {},
): VolumeImpactResult {
  const diff = buildVolumeDiff(beforeVolumes, afterVolumes, {
    id: "impact-preview",
    novelId,
    version: sourceVersion ?? 0,
    status: "draft",
    diffSummary: null,
  });
  const requiresChapterSync = diff.changedChapterCount > 0 || diff.changedVolumeCount > 0;
  const requiresCharacterReview = diff.changedVolumes.some((volume) => (
    volume.changedFields.includes("main promise")
    || volume.changedFields.includes("Protagonist changes")
    || volume.changedFields.includes("Climax at the end of the volume")
  ));
  const affectedBeats = buildVolumeBeatImpactItems({
    afterVolumes,
    beatSheets: context.beatSheets,
    existingChapters: context.existingChapters,
    diff,
  });
  const staleBeatCount = affectedBeats.filter((beat) => beat.status !== "locked_with_draft").length;
  const lockedBeatCount = affectedBeats.filter((beat) => beat.status === "locked_with_draft").length;
  const recommendedActions = [
    requiresChapterSync ? "Sync chapter plans" : "",
    requiresCharacterReview ? "Review character duties and growth lines" : "",
    staleBeatCount > 0 ? "Connect the unwritten stretch ahead" : "",
    diff.changedLines >= 12 ? "Recheck key foreshadowing and payoff chains" : "",
  ].filter(Boolean);

  return {
    novelId,
    sourceVersion,
    changedLines: diff.changedLines,
    affectedVolumeCount: diff.changedVolumeCount,
    affectedChapterCount: diff.changedChapterCount,
    affectedVolumes: diff.changedVolumes,
    affectedBeats,
    staleBeatCount,
    lockedBeatCount,
    defaultImpactAction: staleBeatCount > 0 ? "Connect the unwritten stretch ahead" : undefined,
    advancedImpactActions: [
      staleBeatCount > 0 ? "Rearrange participants for an unwritten beat stretch" : "",
      lockedBeatCount > 0 ? "Check character consistency in existing draft stretches" : "",
      requiresCharacterReview ? "Rerun the beat sheet or volume strategy" : "",
    ].filter(Boolean),
    requiresChapterSync,
    requiresCharacterReview,
    recommendedActions,
  };
}

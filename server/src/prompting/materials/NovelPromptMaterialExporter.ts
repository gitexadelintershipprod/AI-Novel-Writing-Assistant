import { prisma } from "../../db/prisma";
import { estimateContextTokens } from "../context/ContextBroker";
import { listNovelMaterialGroupDefinitions, resolveNovelMaterialGroup } from "./materialGroups";
import type {
  NovelMaterialBlock,
  NovelMaterialExportInput,
  NovelMaterialExportResult,
  NovelMaterialGroupDefinition,
  NovelMaterialImportance,
  NovelMaterialSourceType,
} from "./types";

type MaterialsDb = typeof prisma;

const DEFAULT_MATERIAL_GROUPS = listNovelMaterialGroupDefinitions().map((definition) => definition.group);
const DEFAULT_RECENT_CHAPTER_LIMIT = 3;
const DEFAULT_MAX_TOKENS = 12000;

function compactLines(lines: Array<string | null | undefined | false>): string {
  return lines
    .filter((line): line is string => typeof line === "string" && line.trim().length > 0)
    .join("\n");
}

function formatDate(value: Date | string | null | undefined): string | undefined {
  if (!value) {
    return undefined;
  }
  return value instanceof Date ? value.toISOString() : value;
}

function truncateText(value: string | null | undefined, maxChars: number): string {
  const text = value?.trim() ?? "";
  if (text.length <= maxChars) {
    return text;
  }
  return `${text.slice(0, Math.max(0, maxChars - 20)).trimEnd()}\n...[was truncated]`;
}

function jsonArrayPreview(value: string | null | undefined, fallback = "None"): string {
  if (!value?.trim()) {
    return fallback;
  }
  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) {
      return parsed.map((item) => `- ${String(item)}`).join("\n") || fallback;
    }
    if (parsed && typeof parsed === "object") {
      return JSON.stringify(parsed, null, 2);
    }
  } catch {
    return value;
  }
  return value;
}

function block(input: {
  group: string;
  title: string;
  content: string;
  required: boolean;
  importance: NovelMaterialImportance;
  sourceType: NovelMaterialSourceType;
  sourceId?: string;
  updatedAt?: Date | string | null;
}): NovelMaterialBlock | null {
  const content = input.content.trim();
  if (!content) {
    return null;
  }
  return {
    id: `${input.group}:${input.sourceId ?? "main"}`,
    group: input.group,
    title: input.title,
    content,
    required: input.required,
    importance: input.importance,
    source: {
      type: input.sourceType,
      id: input.sourceId,
      updatedAt: formatDate(input.updatedAt),
    },
    estimatedTokens: estimateContextTokens(content),
  };
}

function dedupe(input: string[]): string[] {
  return [...new Set(input.filter((item) => item.trim().length > 0))];
}

function sortRequestedGroups(groups?: string[]): string[] {
  const requested = groups?.map((group) => group.trim()).filter(Boolean);
  if (!requested || requested.length === 0) {
    return DEFAULT_MATERIAL_GROUPS;
  }
  return dedupe(requested);
}

export class NovelPromptMaterialExporter {
  constructor(private readonly db: MaterialsDb = prisma) {}

  async export(input: NovelMaterialExportInput): Promise<NovelMaterialExportResult> {
    const novelId = input.novelId?.trim();
    if (!novelId) {
      throw new Error("novelId is required to export prompt materials.");
    }

    const requestedGroups = sortRequestedGroups(input.groups);
    const missingGroups: string[] = [];
    const missingInputs: string[] = [];
    const warnings: string[] = [];
    const blocks: NovelMaterialBlock[] = [];

    for (const requestedGroup of requestedGroups) {
      const definition = resolveNovelMaterialGroup(requestedGroup);
      if (!definition) {
        missingGroups.push(requestedGroup);
        continue;
      }
      if (definition.requiresChapterId && !input.chapterId?.trim()) {
        missingInputs.push(`${requestedGroup}: chapterId`);
        continue;
      }
      if (definition.requiresTaskId && !input.taskId?.trim()) {
        missingInputs.push(`${requestedGroup}: taskId`);
        continue;
      }

      const exported = await this.resolveGroup({
        requestedGroup,
        definition,
        input: {
          ...input,
          novelId,
          chapterId: input.chapterId?.trim(),
          taskId: input.taskId?.trim(),
          volumeId: input.volumeId?.trim(),
        },
      });
      if (!exported) {
        missingGroups.push(requestedGroup);
        continue;
      }
      blocks.push(exported);
    }

    const limited = applyTokenLimit({
      blocks,
      maxTokens: input.maxTokens ?? DEFAULT_MAX_TOKENS,
      warnings,
    });

    return {
      blocks: limited,
      missingGroups: dedupe(missingGroups),
      missingInputs: dedupe(missingInputs),
      warnings,
      generatedAt: new Date().toISOString(),
    };
  }

  private async resolveGroup(input: {
    requestedGroup: string;
    definition: NovelMaterialGroupDefinition;
    input: NovelMaterialExportInput;
  }): Promise<NovelMaterialBlock | null> {
    switch (input.definition.group) {
      case "novel_basics":
        return this.buildNovelBasics(input.requestedGroup, input.definition, input.input.novelId);
      case "book_contract":
        return this.buildBookContract(input.requestedGroup, input.definition, input.input.novelId);
      case "chapter_mission":
        return this.buildChapterMission(input.requestedGroup, input.definition, input.input.novelId, input.input.chapterId);
      case "current_chapter":
        return this.buildCurrentChapter(input.requestedGroup, input.definition, input.input.novelId, input.input.chapterId);
      case "recent_chapters":
        return this.buildRecentChapters(input.requestedGroup, input.definition, input.input.novelId, input.input.chapterId);
      case "character_state":
        return this.buildCharacterState(input.requestedGroup, input.definition, input.input.novelId);
      case "world_rules":
        return this.buildWorldRules(input.requestedGroup, input.definition, input.input.novelId);
      case "style_contract":
        return this.buildStyleContract(input.requestedGroup, input.definition, input.input.novelId, input.input.chapterId);
      case "open_issues":
        return this.buildOpenIssues(input.requestedGroup, input.definition, input.input.novelId, input.input.chapterId);
      case "director_workspace":
        return this.buildDirectorWorkspace(input.requestedGroup, input.definition, input.input.novelId, input.input.taskId);
      default:
        return null;
    }
  }

  private async buildNovelBasics(group: string, definition: NovelMaterialGroupDefinition, novelId: string) {
    const novel = await this.db.novel.findUnique({
      where: { id: novelId },
      include: { genre: true, primaryStoryMode: true, secondaryStoryMode: true },
    });
    if (!novel) {
      return null;
    }
    return block({
      group,
      title: definition.title,
      required: definition.required,
      importance: definition.importance,
      sourceType: definition.sourceType,
      sourceId: novel.id,
      updatedAt: novel.updatedAt,
      content: compactLines([
        `Title: ${novel.title}`,
        novel.description ? `Description: ${novel.description}` : null,
        novel.genre?.name ? `Genre: ${novel.genre.name}` : null,
        novel.targetAudience ? `Target audience: ${novel.targetAudience}` : null,
        novel.bookSellingPoint ? `Core appeal: ${novel.bookSellingPoint}` : null,
        novel.first30ChapterPromise ? `First-30-chapter promise: ${novel.first30ChapterPromise}` : null,
        novel.estimatedChapterCount ? `Estimated chapters: ${novel.estimatedChapterCount}` : null,
        novel.defaultChapterLength ? `Default chapter length: ${novel.defaultChapterLength}` : null,
        novel.primaryStoryMode?.name ? `Primary story mode: ${novel.primaryStoryMode.name}` : null,
        novel.secondaryStoryMode?.name ? `Secondary story mode: ${novel.secondaryStoryMode.name}` : null,
      ]),
    });
  }

  private async buildBookContract(group: string, definition: NovelMaterialGroupDefinition, novelId: string) {
    const novel = await this.db.novel.findUnique({
      where: { id: novelId },
      include: { bookContract: true, storyMacroPlan: true },
    });
    if (!novel) {
      return null;
    }
    const contract = novel.bookContract;
    return block({
      group,
      title: definition.title,
      required: definition.required,
      importance: definition.importance,
      sourceType: definition.sourceType,
      sourceId: contract?.id ?? novel.storyMacroPlan?.id ?? novel.id,
      updatedAt: contract?.updatedAt ?? novel.storyMacroPlan?.updatedAt ?? novel.updatedAt,
      content: compactLines([
        contract?.readingPromise ? `Reader promise: ${contract.readingPromise}` : null,
        contract?.coreSellingPoint ? `Core appeal: ${contract.coreSellingPoint}` : null,
        contract?.protagonistFantasy ? `Protagonist payoff fantasy: ${contract.protagonistFantasy}` : null,
        contract?.relationshipMainline ? `Relationship mainline: ${contract.relationshipMainline}` : null,
        contract?.escalationLadder ? `Escalation ladder: ${contract.escalationLadder}` : null,
        contract?.chapter3Payoff ? `Chapter 3 payoff: ${contract.chapter3Payoff}` : null,
        contract?.chapter10Payoff ? `Chapter 10 payoff: ${contract.chapter10Payoff}` : null,
        contract?.chapter30Payoff ? `Chapter 30 payoff: ${contract.chapter30Payoff}` : null,
        contract?.absoluteRedLinesJson ? `Absolute red lines: \n${jsonArrayPreview(contract.absoluteRedLinesJson)}` : null,
        novel.storyMacroPlan?.storyInput ? `Story input: ${novel.storyMacroPlan.storyInput}` : null,
        novel.storyMacroPlan?.decompositionJson
          ? `Macro decomposition: \n${truncateText(novel.storyMacroPlan.decompositionJson, 1800)}`
          : null,
      ]),
    });
  }

  private async buildChapterMission(
    group: string,
    definition: NovelMaterialGroupDefinition,
    novelId: string,
    chapterId?: string,
  ) {
    const chapter = await this.findChapter(novelId, chapterId);
    if (!chapter) {
      return null;
    }
    return block({
      group,
      title: definition.title,
      required: definition.required,
      importance: definition.importance,
      sourceType: definition.sourceType,
      sourceId: chapter.id,
      updatedAt: chapter.updatedAt,
      content: compactLines([
        `Chapter: Chapter  ${chapter.order} “${chapter.title}”`,
        chapter.expectation ? `Chapter objective: ${chapter.expectation}` : null,
        chapter.taskSheet ? `Task sheet: \n${truncateText(chapter.taskSheet, 2200)}` : null,
        chapter.sceneCards ? `Scene cards: \n${truncateText(chapter.sceneCards, 1800)}` : null,
        chapter.targetWordCount ? `Target words: ${chapter.targetWordCount}` : null,
        chapter.mustAvoid ? `Must avoid: ${chapter.mustAvoid}` : null,
        chapter.hook ? `Chapter hook: ${chapter.hook}` : null,
      ]),
    });
  }

  private async buildCurrentChapter(
    group: string,
    definition: NovelMaterialGroupDefinition,
    novelId: string,
    chapterId?: string,
  ) {
    const chapter = await this.findChapter(novelId, chapterId, { includeSummary: true });
    if (!chapter) {
      return null;
    }
    const summary = (chapter as typeof chapter & {
      chapterSummary?: {
        summary?: string | null;
        keyEvents?: string | null;
        characterStates?: string | null;
      } | null;
    }).chapterSummary;
    return block({
      group,
      title: definition.title,
      required: definition.required,
      importance: definition.importance,
      sourceType: definition.sourceType,
      sourceId: chapter.id,
      updatedAt: chapter.updatedAt,
      content: compactLines([
        `Chapter: Chapter  ${chapter.order} “${chapter.title}”`,
        `Prose status: ${chapter.content?.trim() ? "Prose exists" : "No text yet"}`,
        chapter.targetWordCount ? `Target words: ${chapter.targetWordCount}` : null,
        summary?.summary ? `Chapter summary: ${summary.summary}` : null,
        summary?.keyEvents ? `Key events: ${summary.keyEvents}` : null,
        summary?.characterStates ? `Character states: ${summary.characterStates}` : null,
        chapter.content ? `Prose excerpt: \n${truncateText(chapter.content, 2600)}` : null,
      ]),
    });
  }

  private async buildRecentChapters(
    group: string,
    definition: NovelMaterialGroupDefinition,
    novelId: string,
    chapterId?: string,
  ) {
    const chapter = await this.findChapter(novelId, chapterId);
    if (!chapter) {
      return null;
    }
    const recent = await this.db.chapter.findMany({
      where: {
        novelId,
        order: { lt: chapter.order },
      },
      orderBy: { order: "desc" },
      take: DEFAULT_RECENT_CHAPTER_LIMIT,
      include: { chapterSummary: true },
    });
    if (recent.length === 0) {
      return null;
    }
    const rows = recent.reverse().map((item) => compactLines([
      `Chapter  ${item.order} “${item.title}”`,
      item.chapterSummary?.summary ? `Summary: ${item.chapterSummary.summary}` : null,
      item.chapterSummary?.keyEvents ? `Key events: ${item.chapterSummary.keyEvents}` : null,
      !item.chapterSummary?.summary && item.content ? `Prose excerpt: ${truncateText(item.content, 500)}` : null,
    ]));
    return block({
      group,
      title: definition.title,
      required: definition.required,
      importance: definition.importance,
      sourceType: definition.sourceType,
      sourceId: chapter.id,
      updatedAt: chapter.updatedAt,
      content: rows.join("\n\n"),
    });
  }

  private async buildCharacterState(group: string, definition: NovelMaterialGroupDefinition, novelId: string) {
    const [characters, resources] = await Promise.all([
      this.db.character.findMany({
        where: { novelId },
        orderBy: { updatedAt: "desc" },
        take: 10,
      }),
      this.db.characterResourceLedgerItem.findMany({
        where: { novelId },
        orderBy: { updatedAt: "desc" },
        take: 8,
      }),
    ]);
    if (characters.length === 0 && resources.length === 0) {
      return null;
    }
    return block({
      group,
      title: definition.title,
      required: definition.required,
      importance: definition.importance,
      sourceType: definition.sourceType,
      sourceId: novelId,
      content: compactLines([
        characters.length > 0
          ? `Characters: \n${characters.map((character) => compactLines([
            `- ${character.name}${character.role ? ` (${character.role})` : ""}`,
            character.currentState ? `  Current state: ${character.currentState}` : null,
            character.currentGoal ? `  Current objective: ${character.currentGoal}` : null,
            character.development ? `  Development arc: ${truncateText(character.development, 180)}` : null,
          ])).join("\n")}`
          : null,
        resources.length > 0
          ? `Resources: \n${resources.map((item) => `- ${item.name}: ${item.status}; ${item.summary}`).join("\n")}`
          : null,
      ]),
    });
  }

  private async buildWorldRules(group: string, definition: NovelMaterialGroupDefinition, novelId: string) {
    const novel = await this.db.novel.findUnique({
      where: { id: novelId },
      include: { world: true },
    });
    const world = novel?.world;
    if (!world) {
      return null;
    }
    return block({
      group,
      title: definition.title,
      required: definition.required,
      importance: definition.importance,
      sourceType: definition.sourceType,
      sourceId: world.id,
      updatedAt: world.updatedAt,
      content: compactLines([
        `World: ${world.name}`,
        world.description ? `Description: ${world.description}` : null,
        world.axioms ? `Hard rules: ${world.axioms}` : null,
        world.background ? `Background: ${truncateText(world.background, 900)}` : null,
        world.magicSystem ? `Ability/magic system: ${truncateText(world.magicSystem, 900)}` : null,
        world.politics ? `Politics/order: ${truncateText(world.politics, 700)}` : null,
        world.factions ? `Forces: ${truncateText(world.factions, 700)}` : null,
        world.conflicts ? `Core conflict: ${truncateText(world.conflicts, 700)}` : null,
      ]),
    });
  }

  private async buildStyleContract(
    group: string,
    definition: NovelMaterialGroupDefinition,
    novelId: string,
    chapterId?: string,
  ) {
    const bindings = await this.db.styleBinding.findMany({
      where: {
        enabled: true,
        OR: [
          { targetType: "novel", targetId: novelId },
          ...(chapterId ? [{ targetType: "chapter" as const, targetId: chapterId }] : []),
        ],
      },
      orderBy: [{ priority: "desc" }, { updatedAt: "desc" }],
      take: 3,
      include: {
        styleProfile: {
          include: {
            antiAiBindings: {
              where: { enabled: true },
              include: { antiAiRule: true },
              take: 8,
            },
          },
        },
      },
    });
    if (bindings.length === 0) {
      return null;
    }
    const rows = bindings.map((binding) => {
      const profile = binding.styleProfile;
      const antiAiRules = profile.antiAiBindings
        .map((item) => item.antiAiRule.promptInstruction || item.antiAiRule.description)
        .filter(Boolean)
        .slice(0, 6);
      return compactLines([
        `Writing asset: ${profile.name}`,
        profile.description ? `Description: ${profile.description}` : null,
        profile.narrativeRulesJson ? `Narrative rules: ${jsonArrayPreview(profile.narrativeRulesJson)}` : null,
        profile.languageRulesJson ? `Language rules: ${jsonArrayPreview(profile.languageRulesJson)}` : null,
        antiAiRules.length > 0 ? `Anti-AI rules: \n${antiAiRules.map((item) => `- ${item}`).join("\n")}` : null,
      ]);
    });
    return block({
      group,
      title: definition.title,
      required: definition.required,
      importance: definition.importance,
      sourceType: definition.sourceType,
      sourceId: bindings[0]?.styleProfileId,
      updatedAt: bindings[0]?.updatedAt,
      content: rows.join("\n\n"),
    });
  }

  private async buildOpenIssues(
    group: string,
    definition: NovelMaterialGroupDefinition,
    novelId: string,
    chapterId?: string,
  ) {
    const [reports, conflicts] = await Promise.all([
      this.db.auditReport.findMany({
        where: { novelId, chapterId },
        orderBy: { createdAt: "desc" },
        take: 3,
        include: {
          issues: {
            where: { status: "open" },
            orderBy: { createdAt: "desc" },
            take: 8,
          },
        },
      }),
      this.db.openConflict.findMany({
        where: { novelId, status: "open" },
        orderBy: { updatedAt: "desc" },
        take: 8,
      }),
    ]);
    const issues = reports.flatMap((report) => report.issues);
    if (issues.length === 0 && conflicts.length === 0) {
      return null;
    }
    return block({
      group,
      title: definition.title,
      required: definition.required,
      importance: definition.importance,
      sourceType: definition.sourceType,
      sourceId: chapterId,
      content: compactLines([
        issues.length > 0
          ? `Review issues: \n${issues.map((issue) => `- [${issue.severity}/${issue.code}] ${issue.evidence}; Suggestion: ${issue.fixSuggestion}`).join("\n")}`
          : null,
        conflicts.length > 0
          ? `Open conflicts: \n${conflicts.map((conflict) => `- [${conflict.severity}] ${conflict.title}: ${conflict.summary}`).join("\n")}`
          : null,
      ]),
    });
  }

  private async buildDirectorWorkspace(
    group: string,
    definition: NovelMaterialGroupDefinition,
    novelId: string,
    taskId?: string,
  ) {
    const task = taskId
      ? await this.db.novelWorkflowTask.findUnique({ where: { id: taskId } })
      : await this.db.novelWorkflowTask.findFirst({
        where: { novelId },
        orderBy: { updatedAt: "desc" },
      });
    if (!task) {
      return null;
    }
    return block({
      group,
      title: definition.title,
      required: definition.required,
      importance: definition.importance,
      sourceType: definition.sourceType,
      sourceId: task.id,
      updatedAt: task.updatedAt,
      content: compactLines([
        `Task: ${task.title}`,
        `Status: ${task.status}`,
        `Progress: ${Math.round(task.progress * 100)}%`,
        task.currentStage ? `Current stage: ${task.currentStage}` : null,
        task.currentItemLabel ? `Current item: ${task.currentItemLabel}` : null,
        task.checkpointSummary ? `Checkpoint: ${task.checkpointSummary}` : null,
        task.lastError ? `Latest error: ${task.lastError}` : null,
      ]),
    });
  }

  private async findChapter(
    novelId: string,
    chapterId?: string,
    options: { includeSummary?: boolean } = {},
  ) {
    if (!chapterId) {
      return null;
    }
    return this.db.chapter.findFirst({
      where: { id: chapterId, novelId },
      include: options.includeSummary ? { chapterSummary: true } : undefined,
    });
  }
}

function applyTokenLimit(input: {
  blocks: NovelMaterialBlock[];
  maxTokens: number;
  warnings: string[];
}): NovelMaterialBlock[] {
  const maxTokens = Math.max(0, input.maxTokens);
  const total = input.blocks.reduce((sum, item) => sum + item.estimatedTokens, 0);
  if (maxTokens === 0 || total <= maxTokens) {
    return input.blocks;
  }

  let remaining = maxTokens;
  const limited: NovelMaterialBlock[] = [];
  for (const item of input.blocks) {
    if (remaining <= 0) {
      input.warnings.push(`${item.title} was omitted from the export: exceeds this material budget.`);
      continue;
    }
    if (item.estimatedTokens <= remaining) {
      limited.push(item);
      remaining -= item.estimatedTokens;
      continue;
    }
    const allowedChars = Math.max(60, remaining * 3);
    const content = truncateText(item.content, allowedChars);
    input.warnings.push(`${item.title} was truncated: exceeds this material budget.`);
    limited.push({
      ...item,
      content,
      estimatedTokens: estimateContextTokens(content),
    });
    remaining = 0;
  }
  return limited;
}

export const novelPromptMaterialExporter = new NovelPromptMaterialExporter();

export async function exportNovelPromptMaterials(input: NovelMaterialExportInput): Promise<NovelMaterialExportResult> {
  return novelPromptMaterialExporter.export(input);
}

import { prisma } from "../../db/prisma";
import { ragServices } from "../../services/rag";
import { AgentToolError, type AgentToolName } from "../types";
import type { AgentToolDefinition } from "./toolTypes";
import { getChapter, getChapterByOrder } from "./shared";
import {
  getCharacterStatesInput,
  getCharacterStatesOutput,
  getChapterByOrderInput,
  getChapterByOrderOutput,
  getChapterContentInput,
  getChapterContentOutput,
  getNovelContextInput,
  getNovelContextOutput,
  getStoryBibleInput,
  getStoryBibleOutput,
  getTimelineFactsInput,
  getTimelineFactsOutput,
  getWorldConstraintsInput,
  getWorldConstraintsOutput,
  listChaptersInput,
  listChaptersOutput,
  searchKnowledgeInput,
  searchKnowledgeOutput,
  summarizeChapterRangeInput,
  summarizeChapterRangeOutput,
  toChapterOverview,
} from "./novelToolShared";

export const novelReadToolDefinitions: Partial<
  Record<AgentToolName, AgentToolDefinition<Record<string, unknown>, Record<string, unknown>>>
> = {
  get_novel_context: {
    name: "get_novel_context",
    title: "Read novel overview",
    description: "Read the novel overview, including title, outline, and progress.",
    category: "read",
    riskLevel: "low",
    domainAgent: "NovelAgent",
    resourceScopes: ["novel", "chapter"],
    inputSchema: getNovelContextInput,
    outputSchema: getNovelContextOutput,
    execute: async (_context, rawInput) => {
      const input = getNovelContextInput.parse(rawInput);
      const novel = await prisma.novel.findUnique({
        where: { id: input.novelId },
        include: {
          genre: {
            select: {
              name: true,
            },
          },
          world: {
            select: {
              id: true,
              name: true,
            },
          },
          chapters: {
            orderBy: { order: "desc" },
            take: 6,
            select: {
              id: true,
              order: true,
              title: true,
              content: true,
              chapterSummary: {
                select: {
                  summary: true,
                },
              },
            },
          },
        },
      });
      if (!novel) {
        throw new AgentToolError("NOT_FOUND", "Novel not found.");
      }
      const [chapterCount, completedChapters] = await Promise.all([
        prisma.chapter.count({ where: { novelId: input.novelId } }),
        prisma.chapter.findMany({
          where: {
            novelId: input.novelId,
            content: { not: "" },
          },
          orderBy: { order: "asc" },
          select: { order: true },
        }),
      ]);
      return getNovelContextOutput.parse({
        novelId: novel.id,
        title: novel.title,
        description: novel.description,
        genre: novel.genre?.name ?? null,
        styleTone: novel.styleTone ?? null,
        narrativePov: novel.narrativePov ?? null,
        pacePreference: novel.pacePreference ?? null,
        projectMode: novel.projectMode ?? null,
        emotionIntensity: novel.emotionIntensity ?? null,
        aiFreedom: novel.aiFreedom ?? null,
        defaultChapterLength: novel.defaultChapterLength ?? null,
        worldId: novel.world?.id ?? null,
        worldName: novel.world?.name ?? null,
        outline: novel.outline,
        structuredOutline: novel.structuredOutline,
        chapterCount,
        completedChapterCount: completedChapters.length,
        latestCompletedChapterOrder: completedChapters.at(-1)?.order ?? null,
        chapterSummary: [...novel.chapters]
          .sort((left, right) => left.order - right.order)
          .map((chapter) => toChapterOverview(chapter)),
      });
    },
  },
  list_chapters: {
    name: "list_chapters",
    title: "List chapter metadata",
    description: "List all chapter metadata for this novel so chapters can be located by number.",
    category: "read",
    riskLevel: "low",
    domainAgent: "NovelAgent",
    resourceScopes: ["novel", "chapter"],
    inputSchema: listChaptersInput,
    outputSchema: listChaptersOutput,
    execute: async (_context, rawInput) => {
      const input = listChaptersInput.parse(rawInput);
      const items = await prisma.chapter.findMany({
        where: { novelId: input.novelId },
        orderBy: { order: "asc" },
        select: {
          id: true,
          order: true,
          title: true,
          content: true,
        },
      });
      return listChaptersOutput.parse({
        novelId: input.novelId,
        items: items.map((item) => ({
          id: item.id,
          order: item.order,
          title: item.title,
          hasContent: (item.content ?? "").trim().length > 0,
          contentLength: (item.content ?? "").length,
        })),
      });
    },
  },
  get_chapter_by_order: {
    name: "get_chapter_by_order",
    title: "Read a chapter by number",
    description: "Read chapter metadata by chapter number.",
    category: "read",
    riskLevel: "low",
    domainAgent: "NovelAgent",
    resourceScopes: ["novel", "chapter"],
    inputSchema: getChapterByOrderInput,
    outputSchema: getChapterByOrderOutput,
    execute: async (_context, rawInput) => {
      const input = getChapterByOrderInput.parse(rawInput);
      const chapter = await getChapterByOrder(input.novelId, input.chapterOrder);
      return getChapterByOrderOutput.parse({
        novelId: input.novelId,
        chapterId: chapter.id,
        order: chapter.order,
        title: chapter.title,
        hasContent: (chapter.content ?? "").trim().length > 0,
        contentLength: (chapter.content ?? "").length,
      });
    },
  },
  get_chapter_content_by_order: {
    name: "get_chapter_content_by_order",
    title: "Read chapter text by number",
    description: "Read chapter text by chapter number.",
    category: "read",
    riskLevel: "low",
    domainAgent: "NovelAgent",
    resourceScopes: ["novel", "chapter"],
    inputSchema: getChapterByOrderInput,
    outputSchema: getChapterContentOutput,
    execute: async (_context, rawInput) => {
      const input = getChapterByOrderInput.parse(rawInput);
      const chapter = await getChapterByOrder(input.novelId, input.chapterOrder);
      return getChapterContentOutput.parse({
        novelId: input.novelId,
        chapterId: chapter.id,
        title: chapter.title,
        order: chapter.order,
        content: chapter.content ?? "",
        contentLength: (chapter.content ?? "").length,
      });
    },
  },
  get_chapter_content: {
    name: "get_chapter_content",
    title: "Read chapter text",
    description: "Read chapter text by chapter ID or chapter number.",
    category: "read",
    riskLevel: "low",
    domainAgent: "NovelAgent",
    resourceScopes: ["novel", "chapter"],
    inputSchema: getChapterContentInput,
    outputSchema: getChapterContentOutput,
    execute: async (_context, rawInput) => {
      const input = getChapterContentInput.parse(rawInput);
      const chapter = input.chapterId
        ? await getChapter(input.novelId, input.chapterId)
        : await getChapterByOrder(input.novelId, input.chapterOrder as number);
      return getChapterContentOutput.parse({
        novelId: input.novelId,
        chapterId: chapter.id,
        title: chapter.title,
        order: chapter.order,
        content: chapter.content ?? "",
        contentLength: (chapter.content ?? "").length,
      });
    },
  },
  summarize_chapter_range: {
    name: "summarize_chapter_range",
    title: "Summarize a chapter range",
    description: "Summarize a chapter range for questions about the first N chapters or consecutive chapters.",
    category: "inspect",
    riskLevel: "low",
    domainAgent: "NovelAgent",
    resourceScopes: ["novel", "chapter"],
    inputSchema: summarizeChapterRangeInput,
    outputSchema: summarizeChapterRangeOutput,
    execute: async (_context, rawInput) => {
      const input = summarizeChapterRangeInput.parse(rawInput);
      if (input.startOrder > input.endOrder) {
        throw new AgentToolError("INVALID_INPUT", "startOrder must be <= endOrder.");
      }
      const chapters = await prisma.chapter.findMany({
        where: {
          novelId: input.novelId,
          order: { gte: input.startOrder, lte: input.endOrder },
        },
        orderBy: { order: "asc" },
        select: {
          id: true,
          order: true,
          title: true,
          content: true,
          chapterSummary: {
            select: {
              summary: true,
            },
          },
        },
      });
      const summaryMode = chapters.every((chapter) => chapter.chapterSummary?.summary?.trim()) && input.mode === "summary"
        ? "chapter_summary"
        : "content_excerpt";
      const summary = chapters
        .map((chapter) => {
          const basis = summaryMode === "chapter_summary"
            ? chapter.chapterSummary?.summary?.trim() ?? ""
            : (chapter.content ?? "").slice(0, 260).trim();
          return `Chapter ${chapter.order} "${chapter.title}": ${basis || "No usable content"}`;
        })
        .join("\n");
      return summarizeChapterRangeOutput.parse({
        novelId: input.novelId,
        startOrder: input.startOrder,
        endOrder: input.endOrder,
        chapterCount: chapters.length,
        summaryMode,
        summary,
        chapters: chapters.map((chapter) => toChapterOverview(chapter)),
      });
    },
  },
  get_story_bible: {
    name: "get_story_bible",
    title: "Read the novel bible",
    description: "Read novel-bible information.",
    category: "read",
    riskLevel: "low",
    domainAgent: "NovelAgent",
    resourceScopes: ["novel"],
    inputSchema: getStoryBibleInput,
    outputSchema: getStoryBibleOutput,
    execute: async (_context, rawInput) => {
      const input = getStoryBibleInput.parse(rawInput);
      const bible = await prisma.novelBible.findUnique({
        where: { novelId: input.novelId },
      });
      return getStoryBibleOutput.parse({
        novelId: input.novelId,
        exists: Boolean(bible),
        coreSetting: bible?.coreSetting ?? null,
        forbiddenRules: bible?.forbiddenRules ?? null,
        mainPromise: bible?.mainPromise ?? null,
        characterArcs: bible?.characterArcs ?? null,
        worldRules: bible?.worldRules ?? null,
      });
    },
  },
  get_character_states: {
    name: "get_character_states",
    title: "Read character state",
    description: "Read this novel's character status.",
    category: "read",
    riskLevel: "low",
    domainAgent: "CharacterAgent",
    resourceScopes: ["novel", "chapter"],
    parserHints: {
      intent: "inspect_characters",
      aliases: ["novel character", "character status", "current novel characters"],
      phrases: ["How many characters this book has already planned", "current novel有几个角色", "列出current novel角色情况"],
      requiresNovelContext: true,
      whenToUse: "The user is checking character status, counts, or the roster in the current novel.",
      whenNotToUse: "The user is browsing the base character template library.",
    },
    inputSchema: getCharacterStatesInput,
    outputSchema: getCharacterStatesOutput,
    execute: async (_context, rawInput) => {
      const input = getCharacterStatesInput.parse(rawInput);
      const items = await prisma.character.findMany({
        where: { novelId: input.novelId },
        orderBy: { updatedAt: "desc" },
        select: {
          id: true,
          name: true,
          role: true,
          currentState: true,
          currentGoal: true,
        },
      });
      return getCharacterStatesOutput.parse({
        novelId: input.novelId,
        count: items.length,
        items,
      });
    },
  },
  get_timeline_facts: {
    name: "get_timeline_facts",
    title: "Read timeline facts",
    description: "Read timeline facts and consistency facts.",
    category: "inspect",
    riskLevel: "low",
    domainAgent: "NovelAgent",
    resourceScopes: ["novel", "chapter"],
    inputSchema: getTimelineFactsInput,
    outputSchema: getTimelineFactsOutput,
    execute: async (_context, rawInput) => {
      const input = getTimelineFactsInput.parse(rawInput);
      const rows = await prisma.consistencyFact.findMany({
        where: { novelId: input.novelId },
        orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
        take: input.limit ?? 30,
        select: {
          id: true,
          chapterId: true,
          category: true,
          content: true,
        },
      });
      return getTimelineFactsOutput.parse({
        novelId: input.novelId,
        count: rows.length,
        items: rows,
      });
    },
  },
  get_world_constraints: {
    name: "get_world_constraints",
    title: "Read world constraints",
    description: "Read world hard rules and consistency constraints.",
    category: "inspect",
    riskLevel: "low",
    domainAgent: "WorldAgent",
    resourceScopes: ["world", "novel"],
    inputSchema: getWorldConstraintsInput,
    outputSchema: getWorldConstraintsOutput,
    execute: async (_context, rawInput) => {
      const input = getWorldConstraintsInput.parse(rawInput);
      let worldId = input.worldId ?? null;
      const novelId = input.novelId ?? null;
      if (!worldId && novelId) {
        const novel = await prisma.novel.findUnique({
          where: { id: novelId },
          select: { worldId: true },
        });
        worldId = novel?.worldId ?? null;
      }
      if (!worldId) {
        return getWorldConstraintsOutput.parse({
          worldId: null,
          novelId,
          worldName: null,
          constraints: {
            axioms: null,
            magicSystem: null,
            conflicts: null,
            consistencyReport: null,
          },
        });
      }
      const world = await prisma.world.findUnique({
        where: { id: worldId },
        select: {
          id: true,
          name: true,
          axioms: true,
          magicSystem: true,
          conflicts: true,
          consistencyReport: true,
        },
      });
      if (!world) {
        throw new AgentToolError("NOT_FOUND", "World not found.");
      }
      return getWorldConstraintsOutput.parse({
        worldId: world.id,
        novelId,
        worldName: world.name,
        constraints: {
          axioms: world.axioms ?? null,
          magicSystem: world.magicSystem ?? null,
          conflicts: world.conflicts ?? null,
          consistencyReport: world.consistencyReport ?? null,
        },
      });
    },
  },
  search_knowledge: {
    name: "search_knowledge",
    title: "Search knowledge base",
    description: "Search the knowledge base and return context blocks.",
    category: "inspect",
    riskLevel: "low",
    domainAgent: "KnowledgeAgent",
    resourceScopes: ["knowledge_document", "novel", "world"],
    parserHints: {
      intent: "search_knowledge",
      aliases: ["Knowledge base search", "搜索知识", "knowledge search", "设定参考检索", "世界观参考检索"],
      phrases: [
        "搜索知识库",
        "查一下相关资料",
        "从知识库里找信息",
        "找类似的设定",
        "Are there references similar to a certain setup",
        "从拆书或世界观里找参考",
      ],
      requiresNovelContext: false,
      whenToUse: "The user is searching for a keyword, setup, relationship pattern, genre, or world prototype, especially similar references that may live in the knowledge base, indexed book analysis, or world library.",
      whenNotToUse: "The user clearly wants a specific world detail, book-analysis task detail, novel list, or chapter content.",
    },
    inputSchema: searchKnowledgeInput,
    outputSchema: searchKnowledgeOutput,
    execute: async (_context, rawInput) => {
      const input = searchKnowledgeInput.parse(rawInput);
      const contextBlock = await ragServices.hybridRetrievalService.buildContextBlock(input.query, {
        novelId: input.novelId,
        worldId: input.worldId,
        finalTopK: input.topK ?? 6,
      });
      const hitCount = contextBlock ? contextBlock.split("[RAG-").length - 1 : 0;
      return searchKnowledgeOutput.parse({
        query: input.query,
        contextBlock,
        hitCount,
      });
    },
  },
};

import { prisma } from "../../db/prisma";
import { novelSetupStatusService } from "../../services/novel/NovelSetupStatusService";
import { AgentToolError, type AgentToolName } from "../types";
import type { AgentToolDefinition } from "./toolTypes";
import {
  createNovelInput,
  createNovelOutput,
  listNovelsInput,
  listNovelsOutput,
  selectNovelWorkspaceInput,
  selectNovelWorkspaceOutput,
  toNovelListItem,
} from "./novelToolShared";

async function resolveGenreIdByName(name: string | undefined): Promise<string | null> {
  if (!name?.trim()) {
    return null;
  }
  const candidates = await prisma.novelGenre.findMany({
    where: {
      name: {
        contains: name.trim(),
      },
    },
    orderBy: { updatedAt: "desc" },
    take: 8,
    select: {
      id: true,
      name: true,
    },
  });
  return candidates.find((item) => item.name.trim() === name.trim())?.id
    ?? candidates[0]?.id
    ?? null;
}

export const novelWorkspaceToolDefinitions: Partial<
  Record<AgentToolName, AgentToolDefinition<Record<string, unknown>, Record<string, unknown>>>
> = {
  list_novels: {
    name: "list_novels",
    title: "list novels",
    description: "List novels in the current system. Filter by title and project status.",
    category: "read",
    riskLevel: "low",
    domainAgent: "NovelAgent",
    resourceScopes: ["global", "novel"],
    parserHints: {
      intent: "list_novels",
      aliases: ["小说列表", "书列表", "novels"],
      phrases: ["列出当前的小说列表", "当前有多少本小说", "Open the novel workspace"],
      requiresNovelContext: false,
      whenToUse: "The user is querying the global novel list, counts, or switchable workspaces.",
      whenNotToUse: "The user has locked a novel and is asking about chapters, characters, or production status.",
    },
    inputSchema: listNovelsInput,
    outputSchema: listNovelsOutput,
    execute: async (_context, rawInput) => {
      const input = listNovelsInput.parse(rawInput);
      const where = {
        ...(input.query
          ? {
            title: {
              contains: input.query,
            },
          }
          : {}),
        ...(input.projectStatus
          ? {
            projectStatus: input.projectStatus,
          }
          : {}),
      };
      const [total, rows] = await Promise.all([
        prisma.novel.count({ where }),
        prisma.novel.findMany({
          where,
          orderBy: { updatedAt: "desc" },
          take: input.limit ?? 10,
          include: {
            _count: {
              select: {
                chapters: true,
              },
            },
          },
        }),
      ]);
      return listNovelsOutput.parse({
        total,
        items: rows.map(toNovelListItem),
      });
    },
  },
  create_novel: {
    name: "create_novel",
    title: "Create a novel",
    description: "Create a new novel and return basic workspace info.",
    category: "mutate",
    riskLevel: "medium",
    domainAgent: "NovelAgent",
    resourceScopes: ["global", "novel"],
    parserHints: {
      intent: "create_novel",
      aliases: ["Create a novel", "新建小说", "create novel"],
      phrases: ["Create a novel titled xxx", "新建一本书", "Create a new novel workspace"],
      requiresNovelContext: false,
      whenToUse: "The user is only creating a new novel.",
      whenNotToUse: "If the user asks to create and start full-book generation immediately, that is closer to produce_novel.",
    },
    inputSchema: createNovelInput,
    outputSchema: createNovelOutput,
    execute: async (_context, rawInput) => {
      const input = createNovelInput.parse(rawInput);
      const genreId = await resolveGenreIdByName(input.genre);
      const novel = await prisma.novel.create({
        data: {
          title: input.title,
          description: input.description ?? null,
          genreId,
          narrativePov: input.narrativePov,
          pacePreference: input.pacePreference,
          styleTone: input.styleTone ?? null,
          emotionIntensity: input.emotionIntensity,
          aiFreedom: input.aiFreedom,
          defaultChapterLength: input.defaultChapterLength,
          projectStatus: input.projectStatus ?? "in_progress",
          outlineStatus: "not_started",
          storylineStatus: "not_started",
          projectMode: input.projectMode ?? "auto_pipeline",
        },
      });
      const setup = await novelSetupStatusService.getNovelSetupStatus(novel.id);
      if (!setup) {
        throw new AgentToolError("INTERNAL", "The novel was created, but the initialization state could not be read.");
      }
      return createNovelOutput.parse({
        novelId: novel.id,
        title: novel.title,
        status: novel.status,
        chapterCount: 0,
        summary: `Created the novel “${novel.title}” and entered initialization.`,
        setup,
      });
    },
  },
  select_novel_workspace: {
    name: "select_novel_workspace",
    title: "Select a novel workspace",
    description: "Select a novel by title or ID to bind Creative Hub's current workspace.",
    category: "mutate",
    riskLevel: "low",
    domainAgent: "NovelAgent",
    resourceScopes: ["global", "novel"],
    parserHints: {
      intent: "select_novel_workspace",
      aliases: ["切换小说", "选择工作区", "select workspace"],
      phrases: ["把《xxx》Set as current workspace", "切换到某本小说", "打开this novel的工作区"],
      requiresNovelContext: false,
      whenToUse: "The user wants to bind a novel as the current writing workspace.",
      whenNotToUse: "The user only wants to view all novels, not switch context.",
    },
    inputSchema: selectNovelWorkspaceInput,
    outputSchema: selectNovelWorkspaceOutput,
    execute: async (_context, rawInput) => {
      const input = selectNovelWorkspaceInput.parse(rawInput);
      const novel = input.novelId
        ? await prisma.novel.findUnique({
          where: { id: input.novelId },
          include: {
            _count: {
              select: {
                chapters: true,
              },
            },
          },
        })
        : null;
      let resolved = novel ?? null;
      if (!resolved && input.title) {
        const candidates = await prisma.novel.findMany({
          where: {
            title: {
              contains: input.title,
            },
          },
          orderBy: { updatedAt: "desc" },
          take: 8,
          include: {
            _count: {
              select: {
                chapters: true,
              },
            },
          },
        });
        resolved = candidates.find((item) => item.title.trim() === input.title?.trim()) ?? candidates[0] ?? null;
      }
      if (!resolved) {
        throw new AgentToolError("NOT_FOUND", "The novel to bind was not found.");
      }
      const setup = await novelSetupStatusService.getNovelSetupStatus(resolved.id);
      if (!setup) {
        throw new AgentToolError("INTERNAL", "Could not read initialization status after switching workspace.");
      }
      return selectNovelWorkspaceOutput.parse({
        novelId: resolved.id,
        title: resolved.title,
        chapterCount: resolved._count.chapters,
        summary: `Switched to the workspace for “${resolved.title}”.`,
        setup,
      });
    },
  },
};

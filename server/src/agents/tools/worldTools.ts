import { prisma } from "../../db/prisma";
import { AgentToolError, type AgentToolName } from "../types";
import type { AgentToolDefinition } from "./toolTypes";
import {
  bindWorldToNovelInputSchema,
  bindWorldToNovelOutputSchema,
  explainWorldConflictInputSchema,
  explainWorldConflictOutputSchema,
  getWorldDetailOutputSchema,
  listWorldsInputSchema,
  listWorldsOutputSchema,
  rebuildStoryWorldSliceInputSchema,
  rebuildStoryWorldSliceOutputSchema,
  unbindWorldFromNovelInputSchema,
  unbindWorldFromNovelOutputSchema,
  worldIdInputSchema,
} from "./worldToolSchemas";
import { NovelWorldSliceService } from "../../services/novel/storyWorldSlice/NovelWorldSliceService";

const novelWorldSliceService = new NovelWorldSliceService();

export const worldToolDefinitions: Partial<
  Record<AgentToolName, AgentToolDefinition<Record<string, unknown>, Record<string, unknown>>>
> = {
  list_worlds: {
    name: "list_worlds",
    title: "list worldview",
    description: "Read the world list, versions, and overview status.",
    category: "read",
    riskLevel: "low",
    domainAgent: "WorldAgent",
    resourceScopes: ["world"],
    parserHints: {
      intent: "list_worlds",
      aliases: ["世界观列表", "世界观库", "worlds"],
      phrases: ["list worldview列表", "当前有哪些世界观", "View world view列表"],
      requiresNovelContext: false,
      whenToUse: "The user wants to browse global world-building resources.",
      whenNotToUse: "The user is binding or inspecting a world for the current novel.",
    },
    inputSchema: listWorldsInputSchema,
    outputSchema: listWorldsOutputSchema,
    execute: async (_context, rawInput) => {
      const input = listWorldsInputSchema.parse(rawInput);
      const rows = await prisma.world.findMany({
        orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
        take: input.limit ?? 20,
      });
      return listWorldsOutputSchema.parse({
        items: rows.map((row) => ({
          id: row.id,
          name: row.name,
          worldType: row.worldType ?? null,
          status: row.status,
          version: row.version,
          overviewSummary: row.overviewSummary ?? null,
          updatedAt: row.updatedAt.toISOString(),
        })),
        summary: `Read ${rows.length} worlds.`,
      });
    },
  },
  bind_world_to_novel: {
    name: "bind_world_to_novel",
    title: "Bind a novel world",
    description: "Bind the specified world as the current novel's world.",
    category: "mutate",
    riskLevel: "medium",
    domainAgent: "WorldAgent",
    resourceScopes: ["world", "novel"],
    parserHints: {
      intent: "bind_world_to_novel",
      aliases: ["Bind the world", "设置小说世界观"],
      phrases: ["将某个世界观设为current novel的世界观", "把世界观绑定为current novel世界观"],
      requiresNovelContext: true,
      whenToUse: "The user wants to bind a world to the current novel.",
      whenNotToUse: "The user only wants to view the world list or world details.",
    },
    inputSchema: bindWorldToNovelInputSchema,
    outputSchema: bindWorldToNovelOutputSchema,
    execute: async (_context, rawInput) => {
      const input = bindWorldToNovelInputSchema.parse(rawInput);
      const novel = await prisma.novel.findUnique({
        where: { id: input.novelId },
        select: {
          id: true,
          title: true,
        },
      });
      if (!novel) {
        throw new AgentToolError("NOT_FOUND", "The current novel was not found.");
      }

      const resolvedWorld = input.worldId
        ? await prisma.world.findUnique({
          where: { id: input.worldId },
          select: { id: true, name: true },
        })
        : (() => undefined)();
      let world = resolvedWorld ?? null;
      if (!world && input.worldName) {
        const candidates = await prisma.world.findMany({
          where: {
            name: {
              contains: input.worldName,
            },
          },
          orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
          take: 8,
          select: {
            id: true,
            name: true,
          },
        });
        world = candidates.find((item) => item.name.trim() === input.worldName?.trim()) ?? candidates[0] ?? null;
      }

      if (!world) {
        throw new AgentToolError("NOT_FOUND", "The world to bind was not found.");
      }

      await prisma.novel.update({
        where: { id: novel.id },
        data: {
          worldId: world.id,
        },
      });

      return bindWorldToNovelOutputSchema.parse({
        novelId: novel.id,
        novelTitle: novel.title,
        worldId: world.id,
        worldName: world.name,
        summary: `Bound world “${world.name}” to novel “${novel.title}”.`,
      });
    },
  },
  unbind_world_from_novel: {
    name: "unbind_world_from_novel",
    title: "Unbinding the worldview of the novel",
    description: "Unbind the current novel from its world.",
    category: "mutate",
    riskLevel: "medium",
    domainAgent: "WorldAgent",
    resourceScopes: ["world", "novel"],
    parserHints: {
      intent: "unbind_world_from_novel",
      aliases: ["解绑世界观", "取消世界观绑定", "不使用当前世界观", "remove world binding"],
      phrases: ["不要这个世界观了", "先不用这个世界观", "把current novel的世界观解绑", "取消当前世界观"],
      requiresNovelContext: true,
      whenToUse: "The user wants to unbind this novel's world, or clearly says not to use a world yet.",
      whenNotToUse: "The user is assigning a new world to the current novel, or only wants world details.",
    },
    inputSchema: unbindWorldFromNovelInputSchema,
    outputSchema: unbindWorldFromNovelOutputSchema,
    execute: async (_context, rawInput) => {
      const input = unbindWorldFromNovelInputSchema.parse(rawInput);
      const novel = await prisma.novel.findUnique({
        where: { id: input.novelId },
        select: {
          id: true,
          title: true,
          world: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });
      if (!novel) {
        throw new AgentToolError("NOT_FOUND", "The current novel was not found.");
      }

      const previousWorld = novel.world ?? null;
      if (previousWorld) {
        await prisma.novel.update({
          where: { id: novel.id },
          data: {
            worldId: null,
          },
        });
      }

      return unbindWorldFromNovelOutputSchema.parse({
        novelId: novel.id,
        novelTitle: novel.title,
        previousWorldId: previousWorld?.id ?? null,
        previousWorldName: previousWorld?.name ?? null,
        worldId: null,
        worldName: null,
        summary: previousWorld
          ? `Unbound the world "${previousWorld.name}" from the novel "${novel.title}".`
          : `The current novel "${novel.title}" has no bound world.`,
      });
    },
  },
  get_world_detail: {
    name: "get_world_detail",
    title: "Read world details",
    description: "Read world details, overview summary, and unresolved conflict count.",
    category: "read",
    riskLevel: "low",
    domainAgent: "WorldAgent",
    resourceScopes: ["world", "novel"],
    inputSchema: worldIdInputSchema,
    outputSchema: getWorldDetailOutputSchema,
    execute: async (_context, rawInput) => {
      const input = worldIdInputSchema.parse(rawInput);
      const row = await prisma.world.findUnique({
        where: { id: input.worldId },
        include: {
          novels: {
            select: { id: true },
          },
          consistencyIssues: {
            where: { status: "open" },
            select: { id: true },
          },
        },
      });
      if (!row) {
        throw new AgentToolError("NOT_FOUND", "World not found.");
      }
      return getWorldDetailOutputSchema.parse({
        id: row.id,
        name: row.name,
        worldType: row.worldType ?? null,
        status: row.status,
        version: row.version,
        overviewSummary: row.overviewSummary ?? null,
        consistencyReport: row.consistencyReport ?? null,
        novelCount: row.novels.length,
        openIssueCount: row.consistencyIssues.length,
        summary: `World “${row.name}” currently has ${row.consistencyIssues.length} unresolved conflicts.`,
      });
    },
  },
  explain_world_conflict: {
    name: "explain_world_conflict",
    title: "Explain world conflicts",
    description: "Read world consistency conflicts and give recovery suggestions.",
    category: "inspect",
    riskLevel: "low",
    domainAgent: "WorldAgent",
    resourceScopes: ["world"],
    inputSchema: explainWorldConflictInputSchema,
    outputSchema: explainWorldConflictOutputSchema,
    execute: async (_context, rawInput) => {
      const input = explainWorldConflictInputSchema.parse(rawInput);
      const world = await prisma.world.findUnique({
        where: { id: input.worldId },
        include: {
          consistencyIssues: {
            where: input.issueId ? { id: input.issueId } : { status: "open" },
            orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
          },
        },
      });
      if (!world) {
        throw new AgentToolError("NOT_FOUND", "World not found.");
      }
      const issue = world.consistencyIssues[0] ?? null;
      const failureSummary = issue
        ? `${issue.message}${issue.targetField ? ` (field: ${issue.targetField})` : ""}`
        : "This world has no unresolved consistency conflicts.";
      return explainWorldConflictOutputSchema.parse({
        worldId: world.id,
        issueId: issue?.id ?? null,
        issueCount: world.consistencyIssues.length,
        severity: issue?.severity ?? null,
        failureSummary,
        failureDetails: issue?.detail ?? world.consistencyReport ?? null,
        recoveryHint: issue
          ? "First confirm whether the conflicting fields should follow the world, then update the matching world layer or related novel setup."
          : "No conflict needs handling now.",
        summary: failureSummary,
      });
    },
  },
  rebuild_story_world_slice: {
    name: "rebuild_story_world_slice",
    title: "Rebuild the book-world slice",
    description: "Force-regenerate this novel's book-world slice to fix mismatched world sources (for example a historical world bound to a modern story) that leak old world vocabulary.",
    category: "mutate",
    riskLevel: "medium",
    domainAgent: "WorldAgent",
    resourceScopes: ["world", "novel"],
    parserHints: {
      intent: "inspect_world",
      aliases: ["重建世界切片", "修复世界切片", "刷新世界切片", "rebuild world slice"],
      phrases: [
        "World setting和故事不匹配",
        "世界切片有旧名词污染",
        "世界绑定来源不对",
        "Regenerate this book's world setting",
        "切片过时了",
      ],
      requiresNovelContext: true,
      whenToUse: "The user says world vocabulary does not match the current story, or the world slice isStale=true, or the slice needs a forced refresh.",
      whenNotToUse: "The user only wants world details or binding status.",
    },
    inputSchema: rebuildStoryWorldSliceInputSchema,
    outputSchema: rebuildStoryWorldSliceOutputSchema,
    execute: async (context, rawInput) => {
      const input = rebuildStoryWorldSliceInputSchema.parse(rawInput);
      const novelId = input.novelId?.trim() || context.novelId;
      if (!novelId) {
        throw new AgentToolError("INVALID_INPUT", "Without the current novel context, the world slice cannot be rebuilt.");
      }
      const view = await novelWorldSliceService.refreshWorldSlice(novelId, {
        storyInput: input.storyInput,
        builderMode: "manual_refresh",
        provider: context.provider as any,
        model: context.model,
        temperature: context.temperature,
      });
      return rebuildStoryWorldSliceOutputSchema.parse({
        novelId,
        worldId: view.worldId ?? null,
        worldName: view.worldName ?? null,
        coreWorldFrame: view.slice?.coreWorldFrame ?? null,
        isStale: view.isStale,
        summary: view.worldId
          ? `Rebuilt this book's world slice: ${view.worldName ?? view.worldId}.${view.slice?.coreWorldFrame ? ` Core stage: ${view.slice.coreWorldFrame.slice(0, 60)}` : ""}`
          : "This novel has no bound world, so the slice cannot be rebuilt. Bind a world first.",
      });
    },
  },
};

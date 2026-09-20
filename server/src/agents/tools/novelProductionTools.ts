import { AgentToolError, type AgentToolName } from "../types";
import type { AgentToolDefinition } from "./toolTypes";
import {
  generateNovelCharactersInput,
  generateNovelCharactersOutput,
  generateNovelOutlineInput,
  generateNovelOutlineOutput,
  generateStoryBibleInput,
  generateStoryBibleOutput,
  generateStructuredOutlineInput,
  generateStructuredOutlineOutput,
  generateWorldForNovelInput,
  generateWorldForNovelOutput,
  getNovelProductionStatusInput,
  getNovelProductionStatusOutput,
  startFullNovelPipelineInput,
  startFullNovelPipelineOutput,
  syncChaptersFromStructuredOutlineInput,
  syncChaptersFromStructuredOutlineOutput,
} from "./novelToolShared";
import { novelProductionService } from "../../services/novel/NovelProductionService";

function resolveNovelId(contextNovelId: string | undefined, rawNovelId: string | undefined): string {
  const novelId = rawNovelId?.trim() || contextNovelId?.trim();
  if (!novelId) {
    throw new AgentToolError("INVALID_INPUT", "There is no current novel context.");
  }
  return novelId;
}

export const novelProductionToolDefinitions: Partial<
  Record<AgentToolName, AgentToolDefinition<Record<string, unknown>, Record<string, unknown>>>
> = {
  generate_world_for_novel: {
    name: "generate_world_for_novel",
    title: "Generate the novel world",
    description: "Generate a world for this novel; reuse the bound world if one already exists.",
    category: "mutate",
    riskLevel: "medium",
    domainAgent: "NovelAgent",
    resourceScopes: ["novel", "world"],
    inputSchema: generateWorldForNovelInput,
    outputSchema: generateWorldForNovelOutput,
    execute: async (context, rawInput) => {
      const input = generateWorldForNovelInput.parse(rawInput);
      return generateWorldForNovelOutput.parse(
        await novelProductionService.generateWorldForNovel({
          novelId: resolveNovelId(context.novelId, input.novelId),
          description: input.description,
          worldType: input.worldType,
          provider: context.provider as any,
          model: context.model,
          temperature: context.temperature,
        }),
      );
    },
  },
  generate_novel_characters: {
    name: "generate_novel_characters",
    title: "Generate core characters",
    description: "Generate core characters for this novel; reuse existing characters if they are already there.",
    category: "mutate",
    riskLevel: "medium",
    domainAgent: "NovelAgent",
    resourceScopes: ["novel", "chapter"],
    inputSchema: generateNovelCharactersInput,
    outputSchema: generateNovelCharactersOutput,
    execute: async (context, rawInput) => {
      const input = generateNovelCharactersInput.parse(rawInput);
      return generateNovelCharactersOutput.parse(
        await novelProductionService.generateNovelCharacters({
          novelId: resolveNovelId(context.novelId, input.novelId),
          description: input.description,
          genre: input.genre,
          styleTone: input.styleTone,
          narrativePov: input.narrativePov,
          provider: context.provider as any,
          model: context.model,
          temperature: context.temperature,
          count: input.count,
        }),
      );
    },
  },
  generate_story_bible: {
    name: "generate_story_bible",
    title: "Generate the novel bible",
    description: "Generate a novel bible for this novel.",
    category: "mutate",
    riskLevel: "medium",
    domainAgent: "NovelAgent",
    resourceScopes: ["novel"],
    inputSchema: generateStoryBibleInput,
    outputSchema: generateStoryBibleOutput,
    execute: async (context, rawInput) => {
      const input = generateStoryBibleInput.parse(rawInput);
      return generateStoryBibleOutput.parse(
        await novelProductionService.generateStoryBible({
          novelId: resolveNovelId(context.novelId, input.novelId),
          provider: context.provider as any,
          model: context.model,
          temperature: context.temperature,
        }),
      );
    },
  },
  generate_novel_outline: {
    name: "generate_novel_outline",
    title: "Generate the story direction",
    description: "Generate a story direction for this novel.",
    category: "mutate",
    riskLevel: "medium",
    domainAgent: "NovelAgent",
    resourceScopes: ["novel"],
    inputSchema: generateNovelOutlineInput,
    outputSchema: generateNovelOutlineOutput,
    execute: async (context, rawInput) => {
      const input = generateNovelOutlineInput.parse(rawInput);
      return generateNovelOutlineOutput.parse(
        await novelProductionService.generateNovelOutline({
          novelId: resolveNovelId(context.novelId, input.novelId),
          description: input.description,
          provider: context.provider as any,
          model: context.model,
          temperature: context.temperature,
        }),
      );
    },
  },
  generate_structured_outline: {
    name: "generate_structured_outline",
    title: "Generate a structured outline",
    description: "Generate a structured outline and chapter plan for this novel.",
    category: "mutate",
    riskLevel: "medium",
    domainAgent: "NovelAgent",
    resourceScopes: ["novel", "chapter"],
    inputSchema: generateStructuredOutlineInput,
    outputSchema: generateStructuredOutlineOutput,
    execute: async (context, rawInput) => {
      const input = generateStructuredOutlineInput.parse(rawInput);
      return generateStructuredOutlineOutput.parse(
        await novelProductionService.generateStructuredOutline({
          novelId: resolveNovelId(context.novelId, input.novelId),
          targetChapterCount: input.targetChapterCount,
          provider: context.provider as any,
          model: context.model,
          temperature: context.temperature,
        }),
      );
    },
  },
  sync_chapters_from_structured_outline: {
    name: "sync_chapters_from_structured_outline",
    title: "Sync the chapter table of contents",
    description: "Sync the chapter table of contents from the structured outline.",
    category: "mutate",
    riskLevel: "medium",
    domainAgent: "NovelAgent",
    resourceScopes: ["novel", "chapter"],
    inputSchema: syncChaptersFromStructuredOutlineInput,
    outputSchema: syncChaptersFromStructuredOutlineOutput,
    execute: async (context, rawInput) => {
      const input = syncChaptersFromStructuredOutlineInput.parse(rawInput);
      return syncChaptersFromStructuredOutlineOutput.parse(
        await novelProductionService.syncChaptersFromStructuredOutline(
          resolveNovelId(context.novelId, input.novelId),
        ),
      );
    },
  },
  start_full_novel_pipeline: {
    name: "start_full_novel_pipeline",
    title: "Start whole-book writing",
    description: "Start a whole-book writing assignment from the current novel's chapter table of contents.",
    category: "run",
    riskLevel: "high",
    approvalRequired: true,
    domainAgent: "NovelAgent",
    resourceScopes: ["novel", "chapter", "generation_job", "task"],
    inputSchema: startFullNovelPipelineInput,
    outputSchema: startFullNovelPipelineOutput,
    execute: async (context, rawInput) => {
      const input = startFullNovelPipelineInput.parse(rawInput);
      const novelId = resolveNovelId(context.novelId, input.novelId);
      if (input.dryRun) {
        const startOrder = input.startOrder ?? 1;
        const endOrder = input.endOrder ?? Math.max(input.targetChapterCount ?? 20, startOrder);
        return startFullNovelPipelineOutput.parse({
          novelId,
          jobId: null,
          status: "preview_only",
          startOrder,
          endOrder,
          dryRun: true,
          summary: "dryRun: A full-book writing task will be created but not actually started.",
        });
      }
      return startFullNovelPipelineOutput.parse(
        {
          ...(await novelProductionService.startFullNovelPipeline({
          novelId,
          startOrder: input.startOrder,
          endOrder: input.endOrder,
          maxRetries: input.maxRetries,
          provider: context.provider as any,
          model: context.model,
          temperature: context.temperature,
          targetChapterCount: input.targetChapterCount,
          })),
          dryRun: false,
        },
      );
    },
  },
  get_novel_production_status: {
    name: "get_novel_production_status",
    title: "Read full-book production status",
    description: "Aggregate this novel's asset readiness, chapter count, and whole-book writing status.",
    category: "inspect",
    riskLevel: "low",
    domainAgent: "NovelAgent",
    resourceScopes: ["novel", "chapter", "generation_job"],
    parserHints: {
      intent: "query_novel_production_status",
      aliases: ["full-book progress", "production status"],
      phrases: ["At what stage has the entire book been generated?", "Why does the entire build not start?", "Are the current assets ready"],
      requiresNovelContext: true,
      whenToUse: "The user is asking about a novel's full production status, blockers, or asset readiness.",
      whenNotToUse: "The user is only querying global tasks in the task center.",
    },
    inputSchema: getNovelProductionStatusInput,
    outputSchema: getNovelProductionStatusOutput,
    execute: async (context, rawInput) => {
      const input = getNovelProductionStatusInput.parse(rawInput);
      return getNovelProductionStatusOutput.parse(
        await novelProductionService.getNovelProductionStatus({
          novelId: input.novelId?.trim() || context.novelId,
          title: input.title,
          targetChapterCount: input.targetChapterCount,
        }),
      );
    },
  },
};

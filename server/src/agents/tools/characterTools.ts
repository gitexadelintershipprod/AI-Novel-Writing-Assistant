import { prisma } from "../../db/prisma";
import { AgentToolError, type AgentToolName } from "../types";
import type { AgentToolDefinition } from "./toolTypes";
import {
  baseCharacterIdInputSchema,
  getBaseCharacterDetailOutputSchema,
  listBaseCharactersInputSchema,
  listBaseCharactersOutputSchema,
} from "./characterToolSchemas";

export const characterToolDefinitions: Partial<
  Record<AgentToolName, AgentToolDefinition<Record<string, unknown>, Record<string, unknown>>>
> = {
  list_base_characters: {
    name: "list_base_characters",
    title: "List base character templates",
    description: "Read the base character library's template list, categories, and latest update time.",
    category: "read",
    riskLevel: "low",
    domainAgent: "CharacterAgent",
    resourceScopes: ["base_character"],
    parserHints: {
      intent: "list_base_characters",
      aliases: [
        "base character library",
        "character template library",
        "base characters",
        "角色模板库",
        "列出基础角色库中的角色",
        "查看基础角色库",
        "角色库里有什么角色",
      ],
      phrases: [
        "List characters in the base character library",
        "View the base character library",
        "What characters are in the character library",
      ],
      requiresNovelContext: false,
      whenToUse: "The user wants to browse the global base character template library.",
      whenNotToUse: "The user is asking about planned character status in the current novel.",
    },
    inputSchema: listBaseCharactersInputSchema,
    outputSchema: listBaseCharactersOutputSchema,
    execute: async (_context, rawInput) => {
      const input = listBaseCharactersInputSchema.parse(rawInput);
      const rows = await prisma.baseCharacter.findMany({
        where: {
          ...(input.category ? { category: input.category } : {}),
          ...(input.search
            ? {
              OR: [
                { name: { contains: input.search } },
                { role: { contains: input.search } },
                { personality: { contains: input.search } },
                { background: { contains: input.search } },
                { tags: { contains: input.search } },
              ],
            }
            : {}),
        },
        orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
        take: input.limit ?? 20,
      });
      return listBaseCharactersOutputSchema.parse({
        items: rows.map((row) => ({
          id: row.id,
          name: row.name,
          role: row.role,
          category: row.category,
          tags: row.tags ?? "",
          updatedAt: row.updatedAt.toISOString(),
        })),
        summary: `Read ${rows.length} base character templates.`,
      });
    },
  },
  get_base_character_detail: {
    name: "get_base_character_detail",
    title: "Read base character details",
    description: "Read a base character template's full profile and growth information.",
    category: "read",
    riskLevel: "low",
    domainAgent: "CharacterAgent",
    resourceScopes: ["base_character"],
    inputSchema: baseCharacterIdInputSchema,
    outputSchema: getBaseCharacterDetailOutputSchema,
    execute: async (_context, rawInput) => {
      const input = baseCharacterIdInputSchema.parse(rawInput);
      const row = await prisma.baseCharacter.findUnique({
        where: { id: input.characterId },
      });
      if (!row) {
        throw new AgentToolError("NOT_FOUND", "Base character not found.");
      }
      return getBaseCharacterDetailOutputSchema.parse({
        id: row.id,
        name: row.name,
        role: row.role,
        category: row.category,
        personality: row.personality,
        background: row.background,
        development: row.development,
        appearance: row.appearance ?? null,
        weaknesses: row.weaknesses ?? null,
        interests: row.interests ?? null,
        keyEvents: row.keyEvents ?? null,
        tags: row.tags ?? "",
        updatedAt: row.updatedAt.toISOString(),
        summary: `Read character template “${row.name}”.`,
      });
    },
  },
};

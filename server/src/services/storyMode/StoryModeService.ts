import type { Prisma } from "@prisma/client";
import { prisma } from "../../db/prisma";
import { AppError } from "../../middleware/errorHandler";
import { buildStoryModePromptBlock, normalizeStoryModeOutput, sanitizeStoryModeProfile, serializeStoryModeProfile } from "./storyModeProfile";
import type { StoryModeTreeDraft } from "./storyModeGenerate";

export interface StoryModeTreeNode {
  id: string;
  name: string;
  description: string | null;
  template: string | null;
  parentId: string | null;
  profile: ReturnType<typeof sanitizeStoryModeProfile>;
  createdAt: string;
  updatedAt: string;
  childCount: number;
  novelCount: number;
  children: StoryModeTreeNode[];
}

export interface CreateStoryModeTreeInput {
  name: string;
  description?: string;
  template?: string;
  profile: unknown;
  parentId?: string | null;
  children?: CreateStoryModeTreeNodeInput[];
}

export interface CreateStoryModeTreeNodeInput {
  name: string;
  description?: string;
  template?: string;
  profile: unknown;
  children?: CreateStoryModeTreeNodeInput[];
}

export interface CreateStoryModeChildrenInput {
  parentId: string;
  drafts: CreateStoryModeTreeNodeInput[];
}

export interface UpdateStoryModeInput {
  name?: string;
  description?: string | null;
  template?: string | null;
  profile?: unknown;
  parentId?: string | null;
}

function normalizeOptionalText(value: string | null | undefined): string | null {
  const trimmed = (value ?? "").trim();
  return trimmed ? trimmed : null;
}

function normalizeRequiredName(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) {
    throw new AppError("Story-mode name cannot be empty.", 400);
  }
  return trimmed;
}

function normalizeNameKey(value: string): string {
  return value.trim().toLocaleLowerCase("zh-CN");
}

function normalizeDraft(input: CreateStoryModeTreeNodeInput): StoryModeTreeDraft {
  return {
    name: normalizeRequiredName(input.name),
    description: normalizeOptionalText(input.description) ?? undefined,
    template: normalizeOptionalText(input.template) ?? undefined,
    profile: sanitizeStoryModeProfile(input.profile),
    children: (input.children ?? []).map((child) => normalizeDraft(child)),
  };
}

function validateDraftSubtree(draft: StoryModeTreeDraft, depth = 1): void {
  if (depth > 2) {
    throw new AppError("Story-mode trees support at most two levels.", 400);
  }

  const seen = new Set<string>();
  for (const child of draft.children) {
    const key = normalizeNameKey(child.name);
    if (seen.has(key)) {
      throw new AppError(`Duplicate story-mode name at this level: ${child.name}.`, 400);
    }
    seen.add(key);
    validateDraftSubtree(child, depth + 1);
  }
}

function sortTree(nodes: StoryModeTreeNode[]): StoryModeTreeNode[] {
  nodes.sort((left, right) => left.name.localeCompare(right.name, "zh-CN"));
  for (const node of nodes) {
    sortTree(node.children);
  }
  return nodes;
}

function collectSubtreeRows<T extends { id: string; parentId: string | null }>(
  rows: T[],
  rootId: string,
): T[] {
  const rowMap = new Map(rows.map((row) => [row.id, row]));
  if (!rowMap.has(rootId)) {
    return [];
  }

  const childrenByParent = new Map<string, T[]>();
  for (const row of rows) {
    if (!row.parentId) {
      continue;
    }
    const siblings = childrenByParent.get(row.parentId) ?? [];
    siblings.push(row);
    childrenByParent.set(row.parentId, siblings);
  }

  const subtree: T[] = [];
  const visit = (nodeId: string) => {
    for (const child of childrenByParent.get(nodeId) ?? []) {
      visit(child.id);
    }
    const current = rowMap.get(nodeId);
    if (current) {
      subtree.push(current);
    }
  };

  visit(rootId);
  return subtree;
}

export class StoryModeService {
  async listStoryModeTree(): Promise<StoryModeTreeNode[]> {
    const rows = await prisma.novelStoryMode.findMany({
      include: {
        _count: {
          select: {
            children: true,
            primaryNovels: true,
            secondaryNovels: true,
          },
        },
      },
      orderBy: [{ name: "asc" }],
    });

    const nodeMap = new Map<string, StoryModeTreeNode>();
    for (const row of rows) {
      const normalized = normalizeStoryModeOutput(row);
      nodeMap.set(row.id, {
        ...normalized,
        childCount: row._count.children,
        novelCount: row._count.primaryNovels + row._count.secondaryNovels,
        children: [],
      });
    }

    const roots: StoryModeTreeNode[] = [];
    for (const row of rows) {
      const node = nodeMap.get(row.id);
      if (!node) {
        continue;
      }
      if (row.parentId && nodeMap.has(row.parentId)) {
        nodeMap.get(row.parentId)?.children.push(node);
      } else {
        roots.push(node);
      }
    }

    return sortTree(roots);
  }

  async createStoryModeTree(input: CreateStoryModeTreeInput) {
    const draft = normalizeDraft({
      name: input.name,
      description: input.description,
      template: input.template,
      profile: input.profile,
      children: input.children ?? [],
    });
    const parentId = normalizeOptionalText(input.parentId);

    validateDraftSubtree(draft, parentId ? 2 : 1);

    return prisma.$transaction(async (tx) => {
      if (parentId) {
        await this.ensureParentCanAcceptChild(tx, parentId);
      }
      await this.ensureSiblingNameUnique(tx, draft.name, parentId, undefined);
      const created = await this.createStoryModeNodeRecursive(tx, draft, parentId);
      return normalizeStoryModeOutput(created);
    });
  }

  async createStoryModeChildren(input: CreateStoryModeChildrenInput) {
    const parentId = normalizeOptionalText(input.parentId);
    if (!parentId) {
      throw new AppError("The parent story mode cannot be empty.", 400);
    }

    const drafts = (input.drafts ?? []).map((draft) => normalizeDraft(draft));
    if (drafts.length === 0) {
      throw new AppError("At least one story-mode subclass to create is required.", 400);
    }

    const batchNames = new Set<string>();
    for (const draft of drafts) {
      validateDraftSubtree(draft, 2);
      const key = normalizeNameKey(draft.name);
      if (batchNames.has(key)) {
        throw new AppError(`Duplicate name in the subclasses to create: ${draft.name}.`, 400);
      }
      batchNames.add(key);
    }

    return prisma.$transaction(async (tx) => {
      await this.ensureParentCanAcceptChild(tx, parentId);

      const existingSiblings = await tx.novelStoryMode.findMany({
        where: { parentId },
        select: { name: true },
      });
      const existingNames = new Set(existingSiblings.map((item) => normalizeNameKey(item.name)));

      for (const draft of drafts) {
        if (existingNames.has(normalizeNameKey(draft.name))) {
          throw new AppError(`A story mode with this name already exists under the same parent: ${draft.name}.`, 400);
        }
      }

      const created = [];
      for (const draft of drafts) {
        const node = await this.createStoryModeNodeRecursive(tx, draft, parentId);
        created.push(normalizeStoryModeOutput(node));
      }
      return created;
    });
  }

  async updateStoryMode(id: string, input: UpdateStoryModeInput) {
    return prisma.$transaction(async (tx) => {
      const existing = await tx.novelStoryMode.findUnique({
        where: { id },
        include: {
          _count: {
            select: { children: true },
          },
        },
      });
      if (!existing) {
        throw new AppError("The story mode does not exist.", 404);
      }

      const nextParentId = input.parentId === undefined
        ? existing.parentId
        : normalizeOptionalText(input.parentId);

      if (nextParentId) {
        await this.ensureParentCanAcceptChild(tx, nextParentId);
        await this.ensureNoCycle(tx, id, nextParentId);
        if (existing._count.children > 0) {
          throw new AppError("A story mode with children cannot move under another parent, or the tree would exceed two levels.", 400);
        }
      }

      const nextName = input.name === undefined
        ? existing.name
        : normalizeRequiredName(input.name);

      await this.ensureSiblingNameUnique(tx, nextName, nextParentId, id);

      const updated = await tx.novelStoryMode.update({
        where: { id },
        data: {
          name: nextName,
          description: input.description === undefined
            ? existing.description
            : normalizeOptionalText(input.description),
          template: input.template === undefined
            ? existing.template
            : normalizeOptionalText(input.template),
          profileJson: input.profile === undefined
            ? existing.profileJson
            : serializeStoryModeProfile(input.profile),
          parentId: nextParentId ?? null,
        },
      });

      return normalizeStoryModeOutput(updated);
    });
  }

  async deleteStoryMode(id: string): Promise<void> {
    await prisma.$transaction(async (tx) => {
      const rows = await tx.novelStoryMode.findMany({
        select: {
          id: true,
          parentId: true,
          _count: {
            select: {
              primaryNovels: true,
              secondaryNovels: true,
            },
          },
        },
      });

      const existing = rows.find((row) => row.id === id);
      if (!existing) {
        throw new AppError("The story mode does not exist.", 404);
      }

      const subtree = collectSubtreeRows(rows, id);
      const boundNovelCount = subtree.reduce(
        (total, row) => total + row._count.primaryNovels + row._count.secondaryNovels,
        0,
      );
      if (boundNovelCount > 0) {
        throw new AppError("This story-mode tree is used by novels. Unbind those novels before deleting it.", 400);
      }

      for (const row of subtree) {
        await tx.novelStoryMode.delete({
          where: { id: row.id },
        });
      }
    });
  }

  async getStoryModePromptContext(novelId: string): Promise<string> {
    const novel = await prisma.novel.findUnique({
      where: { id: novelId },
      select: {
        primaryStoryMode: true,
        secondaryStoryMode: true,
      },
    });
    if (!novel) {
      throw new AppError("The novel does not exist.", 404);
    }
    return buildStoryModePromptBlock({
      primary: novel.primaryStoryMode ? normalizeStoryModeOutput(novel.primaryStoryMode) : null,
      secondary: novel.secondaryStoryMode ? normalizeStoryModeOutput(novel.secondaryStoryMode) : null,
    });
  }

  private async createStoryModeNodeRecursive(
    tx: Prisma.TransactionClient,
    draft: StoryModeTreeDraft,
    parentId: string | null,
  ) {
    const created = await tx.novelStoryMode.create({
      data: {
        name: draft.name,
        description: normalizeOptionalText(draft.description),
        template: normalizeOptionalText(draft.template),
        profileJson: serializeStoryModeProfile(draft.profile),
        parentId,
      },
    });

    for (const child of draft.children) {
      await this.createStoryModeNodeRecursive(tx, child, created.id);
    }

    return created;
  }

  private async ensureParentCanAcceptChild(tx: Prisma.TransactionClient, id: string): Promise<void> {
    const existing = await tx.novelStoryMode.findUnique({
      where: { id },
      select: { id: true, parentId: true },
    });
    if (!existing) {
      throw new AppError("The parent story mode does not exist.", 400);
    }
    if (existing.parentId) {
      throw new AppError("Story-mode trees have at most two levels, so this can only hang under a root.", 400);
    }
  }

  private async ensureSiblingNameUnique(
    tx: Prisma.TransactionClient,
    name: string,
    parentId: string | null,
    excludeId?: string,
  ): Promise<void> {
    const existing = await tx.novelStoryMode.findFirst({
      where: {
        name,
        parentId,
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
      select: { id: true },
    });
    if (existing) {
      throw new AppError("A story mode with the same name already exists under this parent.", 400);
    }
  }

  private async ensureNoCycle(
    tx: Prisma.TransactionClient,
    id: string,
    parentId: string,
  ): Promise<void> {
    let cursorId: string | null = parentId;
    while (cursorId) {
      if (cursorId === id) {
        throw new AppError("A story mode cannot be moved under its own subtree.", 400);
      }
      const current: { parentId: string | null } | null = await tx.novelStoryMode.findUnique({
        where: { id: cursorId },
        select: { parentId: true },
      });
      cursorId = current?.parentId ?? null;
    }
  }
}

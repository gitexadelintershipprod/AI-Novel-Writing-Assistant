import { prisma } from "../../db/prisma";
import { ragServices } from "../rag";
import type { RagOwnerType } from "../rag/types";

export function queueRagUpsert(ownerType: RagOwnerType, ownerId: string): void {
  void ragServices.ragIndexService.enqueueUpsert(ownerType, ownerId).catch(() => {
    // keep primary workflow resilient even when rag queueing fails
  });
}

export function queueRagDelete(ownerType: RagOwnerType, ownerId: string): void {
  void ragServices.ragIndexService.enqueueDelete(ownerType, ownerId).catch(() => {
    // keep primary workflow resilient even when rag queueing fails
  });
}

export async function ensureNovelCharacters(novelId: string, actionName: string, minCount = 1) {
  const count = await prisma.character.count({ where: { novelId } });
  if (count < minCount) {
    throw new Error(`Add at least ${minCount} characters to this novel before you ${actionName}.`);
  }
}

import { randomUUID } from "node:crypto";
import type { Prisma, PrismaClient } from "@prisma/client";

// This transaction-only mutex serializes queue claims with pause and import
// deduplication. It never stays locked while files are read or models are called.
export async function withImportLock<T>(db: PrismaClient, action: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    try {
      return await db.$transaction(async (tx) => {
        await tx.appSetting.upsert({
          where: { key: "system.knowledge_import_mutex" },
          create: { key: "system.knowledge_import_mutex", value: randomUUID() },
          update: { value: randomUUID() },
        });
        return action(tx);
      }, { timeout: 30000, maxWait: 30000 });
    } catch (error) {
      const code = (error as { code?: string }).code;
      if (attempt >= 3 || !["P2034", "P1008", "P2028", "P2002"].includes(code ?? "")) throw error;
      await new Promise((resolve) => setTimeout(resolve, 30 * (attempt + 1)));
    }
  }
}

export async function setImportPaused(db: PrismaClient, id: string, paused: boolean) {
  return withImportLock(db, (tx) => tx.knowledgeImportBatch.update({
    where: { id }, data: { processingPaused: paused },
  }));
}

export async function claimRagJob(db: PrismaClient) {
  return withImportLock(db, async (tx) => {
    const job = await tx.ragIndexJob.findFirst({
      where: {
        status: "queued", runAfter: { lte: new Date() },
        OR: [{ importBatchId: null }, { importBatch: { is: { processingPaused: false } } }],
      },
      orderBy: [{ runAfter: "asc" }, { createdAt: "asc" }],
    });
    if (!job) return null;
    // Return the previous attempt count to preserve RagWorker retry accounting.
    await tx.ragIndexJob.update({ where: { id: job.id }, data: { status: "running" } });
    return job;
  });
}

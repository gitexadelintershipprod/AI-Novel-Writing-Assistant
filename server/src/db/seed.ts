import "dotenv/config";
import { prisma } from "./prisma";
import {
  ensureSystemResourceStarterData,
  hasSystemResourceBootstrapChanges,
} from "../services/bootstrap/SystemResourceBootstrapService";

async function main(): Promise<void> {
  const report = await ensureSystemResourceStarterData({ mode: "sync_existing" });

  if (hasSystemResourceBootstrapChanges(report)) {
    console.log("系统内置创作资源同步完成。", report);
    return;
  }

  console.log("Built-in creative resources are already up to date. No sync needed.");
}

main()
  .catch((error) => {
    console.error("Seed-data write failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

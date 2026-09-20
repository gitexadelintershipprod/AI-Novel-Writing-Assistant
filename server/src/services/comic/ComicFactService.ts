import type { LLMProvider } from "@ai-novel/shared/types/llm";
import { prisma } from "../../db/prisma";
import { runStructuredPrompt } from "../../prompting/core/promptRunner";
import { comicFactExtractionPrompt } from "../../prompting/prompts/comic/comic.prompts";

// ─── Service ──────────────────────────────────────────────────────────────────

export class ComicFactService {
  /**
   * Extract cross-episode facts from a generated panel script and write ComicFact asynchronously.
   * Designed as fire-and-forget so it does not block the script-generation response.
   */
  async extractAndSave(
    episodeId: string,
    provider?: LLMProvider,
  ): Promise<void> {
    try {
      const episode = await prisma.comicEpisode.findUnique({
        where: { id: episodeId },
        include: {
          panels: { orderBy: { order: "asc" } },
          project: {
            include: { facts: { orderBy: { episodeOrder: "asc" } } },
          },
        },
      });
      if (!episode || episode.panels.length === 0) return;

      // Build this episode's panel digest (action + first line of dialogue), capped at 2000 characters.
      const panelSummary = episode.panels
        .map((p) => {
          let line = `Panel ${p.order} [${p.panelType}]: ${p.action}`;
          if (p.characterRefs) {
            try {
              const refs = JSON.parse(p.characterRefs) as Array<{ name?: string; costume?: string; expression?: string } | string>;
              const names = refs
                .map((r) => (typeof r === "string" ? r : r.name))
                .filter(Boolean)
                .join(", ");
              if (names) line += ` (${names})`;
            } catch { /* ignore */ }
          }
          return line;
        })
        .join("\n")
        .slice(0, 2000);

      const existingFacts = episode.project.facts
        .map((f) => `[${f.category}] ${f.text}`)
        .join("\n");

      const result = await runStructuredPrompt({
        asset: comicFactExtractionPrompt,
        promptInput: {
          projectTitle: episode.project.title,
          episodeOrder: episode.order,
          episodeTitle: episode.title ?? `Episode ${episode.order}`,
          panelSummary,
          existingFacts,
        },
        options: { temperature: 0.3, provider },
      });

      const newFacts = result.output.facts;
      if (newFacts.length === 0) return;

      await prisma.comicFact.createMany({
        data: newFacts.map((f) => ({
          projectId: episode.projectId,
          episodeOrder: episode.order,
          text: f.text,
          category: f.category,
        })),
      });

      console.log(`[comic.fact] extracted ${newFacts.length} facts for episode=${episodeId} order=${episode.order}`);
    } catch (err) {
      // Fact extraction failure must not affect the main flow.
      console.warn(`[comic.fact] extraction failed for episode=${episodeId}:`, err);
    }
  }

  async listFacts(projectId: string) {
    return prisma.comicFact.findMany({
      where: { projectId },
      orderBy: [{ episodeOrder: "asc" }, { createdAt: "asc" }],
    });
  }

  async deleteFact(factId: string) {
    return prisma.comicFact.delete({ where: { id: factId } });
  }
}

export const comicFactService = new ComicFactService();

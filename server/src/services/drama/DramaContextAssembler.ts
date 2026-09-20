import { prisma } from "../../db/prisma";
import { compactText, safeJsonParse } from "./utils/json";

interface BeatLite {
  order: number;
  summary: string;
}

export class DramaContextAssembler {
  async buildEpisodeContext(projectId: string, episodeOrder: number) {
    const project = await prisma.dramaProject.findUnique({
      where: { id: projectId },
      include: {
        sourceBundle: true,
        characters: true,
        facts: { orderBy: [{ episodeOrder: "asc" }, { createdAt: "asc" }] },
        episodes: { orderBy: { order: "asc" } },
      },
    });
    if (!project) {
      throw new Error(`Drama project ${projectId} was not found.`);
    }
    // Defensive: match even when the caller passes order as a string.
    const targetOrder = Number(episodeOrder);
    const episode = project.episodes.find((item) => item.order === targetOrder);
    if (!episode) {
      throw new Error(`Drama episode ${episodeOrder} outline was not found.`);
    }
    const beats = safeJsonParse<BeatLite[]>(project.sourceBundle?.beats, []);
    const sourceMap = safeJsonParse<{ beatRefs?: number[] }>(episode.sourceMap, {});
    const relatedBeats = sourceMap.beatRefs?.length
      ? beats.filter((beat) => sourceMap.beatRefs?.includes(beat.order))
      : beats.slice(Math.max(0, episodeOrder - 2), episodeOrder + 2);

    return {
      project,
      episode,
      strategyJson: project.strategy ?? "{}",
      episodeJson: JSON.stringify({
        order: episode.order,
        title: episode.title,
        hookOpening: episode.hookOpening,
        hookType: episode.hookType,
        cliffhanger: episode.cliffhanger,
        emotionNet: episode.emotionNet,
        isPaywall: episode.isPaywall,
        beatSheet: safeJsonParse(episode.beatSheet, {}),
      }, null, 2),
      charactersDigest: project.characters.map((character) => {
        // Extract character reference-image URLs (portrait + turnaround).
        const refImageUrls: string[] = [];
        if (character.portraitData) {
          try {
            const pd = JSON.parse(character.portraitData) as { status?: string; url?: string };
            if (pd.status === "done" && pd.url) refImageUrls.push(`portrait:${pd.url}`);
          } catch { /* skip */ }
        }
        if (character.threeViewData) {
          try {
            const tvd = JSON.parse(character.threeViewData) as Array<{ view?: string; status?: string; url?: string }>;
            for (const item of tvd) {
              if (item.status === "done" && item.url) refImageUrls.push(`${item.view} view:${item.url}`);
            }
          } catch { /* skip */ }
        }

        return [
          character.name,
          character.archetype ? `archetype: ${character.archetype}` : "",
          character.persona ? `persona: ${character.persona}` : "",
          character.speechStyle ? `speech: ${character.speechStyle}` : "",
          character.visualAnchor ? `look: ${compactText(character.visualAnchor, 160)}` : "",
          refImageUrls.length > 0 ? `references: [${refImageUrls.join(", ")}] (keep visual consistency)` : "",
          character.relations ? `relations: ${compactText(character.relations, 160)}` : "",
        ].filter(Boolean).join("; ");
      }).join("\n") || "No character resources",
      factsDigest: project.facts.map((fact) => `E${fact.episodeOrder} ${fact.category}: ${fact.text}`).join("\n") || "No facts",
      previousDigest: project.episodes
        .filter((item) => item.order < episodeOrder && item.content)
        .slice(-3)
        .map((item) => `Episode ${item.order}"${item.title}": ${compactText(item.content, 260)}`)
        .join("\n") || "No prior scripts",
      sourceDigest: relatedBeats.map((beat) => `${beat.order}: ${beat.summary}`).join("\n") || compactText(project.sourceBundle?.synopsis, 1000),
    };
  }
}

export const dramaContextAssembler = new DramaContextAssembler();

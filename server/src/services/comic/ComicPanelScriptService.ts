import type { LLMProvider } from "@ai-novel/shared/types/llm";
import { prisma } from "../../db/prisma";
import { runStructuredPrompt } from "../../prompting/core/promptRunner";
import { comicPanelScriptPrompt } from "../../prompting/prompts/comic/comic.prompts";
import { adaptationSourceRegistry } from "../adaptation/source/SourceContentPort";
import { comicFactService } from "./ComicFactService";

export interface GeneratePanelScriptInput {
  targetPanelCount?: number;
  densityMode?: "relaxed" | "balanced" | "compact";
  scriptPromptInstruction?: string;
  /** Force-refresh the sourceText snapshot (only valid for novel_import). */
  refreshSourceText?: boolean;
}

export class ComicPanelScriptService {
  async generatePanelScript(
    episodeId: string,
    input: GeneratePanelScriptInput = {},
    provider?: LLMProvider,
  ) {
    const episode = await prisma.comicEpisode.findUnique({
      where: { id: episodeId },
      include: {
        project: {
          include: {
            characters: { orderBy: { createdAt: "asc" } },
            characterAssets: {
              orderBy: [{ assetType: "asc" }, { sortOrder: "asc" }],
            },
            scenes: { orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] },
            sourceBundle: true,
            facts: { orderBy: { episodeOrder: "asc" } },
          },
        },
      },
    });
    if (!episode) throw new Error(`Comic episode not found: ${episodeId}`);
    if (!episode.outline) {
      throw new Error("Generate the episode outline before generating the panel script.");
    }

    const project = episode.project;

    // Tier-2 snapshot: for novel_import, load chapter source text on demand (import is a snapshot).
    let sourceText = episode.sourceText ?? "";
    if (!sourceText || input.refreshSourceText) {
      if (project.sourceType === "novel_import" && project.sourceRef) {
        try {
          const adapter = adaptationSourceRegistry.resolve("novel_import");
          if (adapter.loadChapterText) {
            // Find the chapter range for this episode from the bundle (written when the outline LLM output is stored).
            const bundle = project.sourceBundle
              ? (JSON.parse(project.sourceBundle.bundleJson) as Record<string, unknown>)
              : null;
            const epBundles = (bundle?.episodes as Array<{
              order: number;
              sourceChapterStart?: number;
              sourceChapterEnd?: number;
            }> | undefined) ?? [];
            const epMeta = epBundles.find((e) => e.order === episode.order);
            const start = epMeta?.sourceChapterStart ?? episode.order;
            const end = epMeta?.sourceChapterEnd ?? episode.order;
            sourceText = await adapter.loadChapterText(
              { type: "novel_import", ref: project.sourceRef },
              start,
              end,
            );
            await prisma.comicEpisode.update({
              where: { id: episodeId },
              data: { sourceText },
            });
          }
        } catch {
          // Snapshot failure must not block panel-script generation.
        }
      }
    }

    const stylePresetRaw = project.stylePreset
      ? (JSON.parse(project.stylePreset) as { style?: string; promptKeywords?: string; format?: string })
      : undefined;
    const stylePreset = stylePresetRaw?.style;
    const stylePromptKeywords = stylePresetRaw?.promptKeywords;
    const comicFormat = stylePresetRaw?.format;
    const densityMode = input.densityMode ?? "balanced";
    const targetPanelCount =
      input.targetPanelCount
      ?? (comicFormat === "4koma"
        ? densityMode === "relaxed" ? 10 : densityMode === "compact" ? 16 : 12
        : densityMode === "relaxed" ? 30 : densityMode === "compact" ? 65 : 45);

    // Cross-episode facts for this episode and earlier ones.
    const factDigest =
      project.facts
        .filter((f) => f.episodeOrder == null || f.episodeOrder <= episode.order)
        .map((f) => `[${f.category}] ${f.text}`)
        .join("\n") || undefined;

    const result = await runStructuredPrompt({
      asset: comicPanelScriptPrompt,
      promptInput: {
        projectTitle: project.title,
        episodeOrder: episode.order,
        episodeTitle: episode.title ?? `Episode ${episode.order}`,
        episodeSynopsis: episode.outline,
        sourceText: sourceText || undefined,
        characters: project.characters.map((c) => ({
          name: c.name,
          visualAnchor: c.visualAnchor,
        })),
        characterAssets: project.characterAssets
          .map((a) => {
            const charName = project.characters.find((c) => c.id === a.characterId)?.name;
            if (!charName) return null;
            return {
              characterName: charName,
              assetType: a.assetType,
              name: a.name,
              description: a.description ?? undefined,
            };
          })
          .filter((a): a is NonNullable<typeof a> => a !== null),
        existingScenes: project.scenes.map((s) => {
          let summary = "";
          try {
            const bible = s.bible ? (JSON.parse(s.bible) as { keyElements?: string }) : null;
            summary = bible?.keyElements ?? "";
          } catch { /* ignore */ }
          return { name: s.name, sceneType: s.sceneType, summary: summary || undefined };
        }),
        stylePreset,
        stylePromptKeywords,
        comicFormat,
        factDigest,
        densityMode,
        scriptPromptInstruction: input.scriptPromptInstruction,
        targetPanelCount,
      },
      options: { temperature: 0.55, provider },
    });

    const panels = result.output.panels;
    const scenes = result.output.scenes ?? [];
    const scriptConfig = {
      densityMode,
      targetPanelCount,
      comicFormat: comicFormat ?? "webtoon",
      stylePreset,
      stylePromptKeywords,
      scriptPromptInstruction: input.scriptPromptInstruction,
      promptAssetId: comicPanelScriptPrompt.id,
      promptAssetVersion: comicPanelScriptPrompt.version,
      provider,
      generatedAt: new Date().toISOString(),
    };

    // Existing scene names (do not overwrite scenes edited across episodes or by the user).
    const existingSceneNames = new Set(project.scenes.map((s) => s.name));

    // Transaction: upsert scenes (new only) + rebuild panels + update episode status.
    await prisma.$transaction(async (tx) => {
      // Create only scene drafts that do not exist yet; keep user-edited bibles and cross-episode scenes.
      const newScenes = scenes.filter((s) => !existingSceneNames.has(s.name));
      if (newScenes.length > 0) {
        await tx.comicScene.createMany({
          data: newScenes.map((s, i) => ({
            projectId: project.id,
            name: s.name,
            sceneType: s.sceneType,
            bible: JSON.stringify({
              palette: s.palette,
              keyElements: s.keyElements,
              materials: s.materials ?? "",
              ambiance: s.ambiance ?? "",
              layout: s.layout ?? "",
            }),
            sortOrder: project.scenes.length + i,
          })),
        });
      }

      await tx.comicPanel.deleteMany({ where: { episodeId } });
      await tx.comicPanel.createMany({
        data: panels.map((panel) => ({
          episodeId,
          order: panel.order,
          panelType: panel.panelType,
          densityLevel: panel.densityLevel,
          focus: panel.focus,
          action: panel.action,
          sceneRef: panel.sceneRef?.trim() || null,
          dialogues: panel.dialogues.length > 0 ? JSON.stringify(panel.dialogues) : null,
          characterRefs:
            panel.characterRefs.length > 0 ? JSON.stringify(panel.characterRefs) : null,
          visualPrompt: panel.visualPrompt,
          layoutData: panel.layoutData ? JSON.stringify(panel.layoutData) : null,
        })),
      });
      await tx.comicEpisode.update({
        where: { id: episodeId },
        data: { status: "scripted", scriptConfig: JSON.stringify(scriptConfig) },
      });
    });

    // Extract cross-episode facts asynchronously; do not block the response.
    void comicFactService.extractAndSave(episodeId, provider);

    return prisma.comicEpisode.findUnique({
      where: { id: episodeId },
      include: { panels: { orderBy: { order: "asc" } } },
    });
  }

  async getPanels(episodeId: string) {
    return prisma.comicPanel.findMany({
      where: { episodeId },
      orderBy: { order: "asc" },
    });
  }

  async getPanel(panelId: string) {
    return prisma.comicPanel.findUnique({ where: { id: panelId } });
  }

  async updatePanelVisualPrompt(panelId: string, visualPrompt: string) {
    return prisma.comicPanel.update({
      where: { id: panelId },
      data: { visualPrompt },
    });
  }

  async updatePanelDialogues(panelId: string, dialogues: unknown[]) {
    return prisma.comicPanel.update({
      where: { id: panelId },
      data: { dialogues: JSON.stringify(dialogues) },
    });
  }
}

export const comicPanelScriptService = new ComicPanelScriptService();

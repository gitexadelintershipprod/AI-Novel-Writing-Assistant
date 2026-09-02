import type { PromptContextBlock } from "../core/promptTypes";
import { createContextBlock } from "../core/contextBudget";
import {
  compactPreviewText,
  parseSceneCards,
  previewListBlock,
  readString,
  readStringList,
  truncatePreviewText,
  type PreviewChapterRow,
  type PreviewNovelRow,
} from "./previewContextSupport";

export function buildChapterPreviewBlocks(input: {
  novel: PreviewNovelRow;
  chapter: PreviewChapterRow;
}): PromptContextBlock[] {
  const { chapter, novel } = input;
  const scenes = parseSceneCards(chapter.sceneCards);
  const firstScene = scenes[0] ?? null;
  const lastScene = scenes[scenes.length - 1] ?? null;
  const mustAdvance = scenes.flatMap((scene) => readStringList(scene.mustAdvance)).slice(0, 8);
  const mustPreserve = scenes.flatMap((scene) => readStringList(scene.mustPreserve)).slice(0, 8);
  const forbiddenExpansion = scenes.flatMap((scene) => readStringList(scene.forbiddenExpansion)).slice(0, 8);
  const chapterLabel = `Chapter ${chapter.order}, “${chapter.title || "Untitled chapter"}”`;

  return [
    createContextBlock({
      id: "chapter_mission",
      group: "chapter_mission",
      priority: 100,
      content: [
        `Chapter mission: ${chapterLabel}`,
        chapter.expectation ? `Objective: ${chapter.expectation}` : "",
        chapter.targetWordCount ? `Target length: around ${chapter.targetWordCount} Georgian words.` : "",
        previewListBlock("Must advance", mustAdvance.length > 0 ? mustAdvance : [chapter.expectation]),
        previewListBlock("Must preserve", mustPreserve),
        chapter.taskSheet ? `Original task sheet:\n${truncatePreviewText(chapter.taskSheet, 2200)}` : "",
        chapter.hook ? `Ending hook: ${chapter.hook}` : "",
      ].filter(Boolean).join("\n"),
    }),
    createContextBlock({
      id: "chapter_boundary",
      group: "chapter_boundary",
      priority: 99,
      required: true,
      allowSummary: false,
      content: [
        "Chapter boundary:",
        chapter.expectation ? `Exclusive event: ${chapter.expectation}` : `Exclusive event: ${chapterLabel}`,
        firstScene ? `Entry state: ${readString(firstScene.entryState) || "No scene entry state provided"}` : "",
        lastScene ? `Ending state: ${readString(lastScene.exitState) || compactPreviewText(chapter.hook) || "No scene ending state provided"}` : "",
        chapter.hook ? `Next chapter entry state: ${chapter.hook}` : "",
        previewListBlock("Do not cross", [
          chapter.mustAvoid,
          ...forbiddenExpansion,
          chapter.hook ? `Do not continue beyond this hook: ${chapter.hook}` : "",
        ]),
        previewListBlock("Protected reveals", []),
      ].filter(Boolean).join("\n"),
    }),
    createContextBlock({
      id: "structure_obligations",
      group: "structure_obligations",
      priority: 94,
      required: true,
      content: [
        "Structure obligations",
        ...[
          chapter.expectation ? `- chapter objective: ${chapter.expectation}` : "",
          ...mustAdvance.map((item) => `- must advance: ${item}`),
          ...mustPreserve.map((item) => `- must preserve: ${item}`),
          chapter.hook ? `- hook target: ${chapter.hook}` : "",
          chapter.mustAvoid ? `- boundary do-not-cross: ${chapter.mustAvoid}` : "",
        ].filter(Boolean),
      ].join("\n"),
    }),
    createContextBlock({
      id: "local_state",
      group: "local_state",
      priority: 89,
      content: [
        "Local state before review:",
        `Novel: ${novel.title}`,
        `Chapter: ${chapterLabel}`,
        chapter.content?.trim()
          ? `Current draft excerpt:\n${truncatePreviewText(chapter.content, 1800)}`
          : "Current draft excerpt: this chapter has no prose yet; the preview uses its task and task sheet as context.",
      ].join("\n"),
    }),
    createContextBlock({
      id: "world_rules",
      group: "world_rules",
      priority: 84,
      content: [
        "Relevant book rules:",
        novel.description ? `Description: ${truncatePreviewText(novel.description, 600)}` : "",
        novel.targetAudience ? `Target audience: ${novel.targetAudience}` : "",
        novel.bookSellingPoint ? `Core appeal: ${novel.bookSellingPoint}` : "",
        novel.first30ChapterPromise ? `First-30-chapter promise: ${novel.first30ChapterPromise}` : "",
      ].filter(Boolean).join("\n"),
    }),
  ].filter((block) => block.content.trim().length > 0);
}

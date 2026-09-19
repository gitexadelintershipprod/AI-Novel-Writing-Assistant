import { Annotation, END, START, StateGraph } from "@langchain/langgraph";
import type { BaseChatModel } from "@langchain/core/language_models/chat_models";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";

export const NovelOutlineGraphAnnotation = Annotation.Root({
  novelTitle: Annotation<string>(),
  novelDescription: Annotation<string>(),
  genre: Annotation<string>(),
  characters: Annotation<string[]>(),
  themeAnalysis: Annotation<string>(),
  conflictDesign: Annotation<string>(),
  outline: Annotation<string>(),
  structuredOutline: Annotation<unknown>(),
  provider: Annotation<string>(),
  model: Annotation<string>(),
  error: Annotation<string | undefined>(),
});

export type NovelOutlineGraphState = typeof NovelOutlineGraphAnnotation.State;
export type NovelOutlineGraphInput = Pick<
  NovelOutlineGraphState,
  "novelTitle" | "novelDescription" | "genre" | "characters" | "provider" | "model"
>;
export type NovelOutlineGraphOutput = Pick<
  NovelOutlineGraphState,
  "themeAnalysis" | "conflictDesign" | "outline" | "structuredOutline" | "error"
>;

async function analyzeTheme(state: NovelOutlineGraphState, llm: BaseChatModel) {
  try {
    const result = await llm.invoke([
      new SystemMessage("You are a novel-theme analyst. Extract the theme and intent."),
      new HumanMessage(
        `标题：${state.novelTitle}
简介：${state.novelDescription}
类型：${state.genre}
角色：${state.characters.join("、") || "暂无"}
请输出主题分析。`,
      ),
    ]);
    const text = typeof result.content === "string" ? result.content : JSON.stringify(result.content);
    return { themeAnalysis: text };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Theme analysis failed." };
  }
}

async function designConflicts(state: NovelOutlineGraphState, llm: BaseChatModel) {
  try {
    const result = await llm.invoke([
      new SystemMessage("You are a conflict-design expert. Output 3-5 core conflicts."),
      new HumanMessage(
        `主题分析：
${state.themeAnalysis}
请设计冲突节点与转折点。`,
      ),
    ]);
    const text = typeof result.content === "string" ? result.content : JSON.stringify(result.content);
    return { conflictDesign: text };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Conflict design failed." };
  }
}

async function generateOutline(state: NovelOutlineGraphState, llm: BaseChatModel) {
  try {
    const result = await llm.invoke([
      new SystemMessage("You are a novel planner. Generate a complete story direction."),
      new HumanMessage(
        `主题分析：
${state.themeAnalysis}

冲突设计：
${state.conflictDesign}

请输出完整Story direction。`,
      ),
    ]);
    const text = typeof result.content === "string" ? result.content : JSON.stringify(result.content);
    return { outline: text };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Story-direction generation failed." };
  }
}

async function structureOutline(state: NovelOutlineGraphState, llm: BaseChatModel) {
  try {
    const result = await llm.invoke([
      new SystemMessage("Convert the novel outline into a JSON chapter plan."),
      new HumanMessage(
        `小说大纲：
${state.outline}
仅输出 JSON 数组。`,
      ),
    ]);
    const text = typeof result.content === "string" ? result.content : JSON.stringify(result.content);
    const normalized = text.replace(/```json|```/g, "").trim();
    return { structuredOutline: JSON.parse(normalized) };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Structured-outline generation failed." };
  }
}

export function createNovelOutlineGraph(llm: BaseChatModel) {
  return new StateGraph(NovelOutlineGraphAnnotation)
    .addNode("analyzeTheme", (state) => analyzeTheme(state, llm))
    .addNode("designConflicts", (state) => designConflicts(state, llm))
    .addNode("generateOutline", (state) => generateOutline(state, llm))
    .addNode("structureOutline", (state) => structureOutline(state, llm))
    .addEdge(START, "analyzeTheme")
    .addConditionalEdges("analyzeTheme", (state) => (state.error ? END : "designConflicts"))
    .addConditionalEdges("designConflicts", (state) => (state.error ? END : "generateOutline"))
    .addConditionalEdges("generateOutline", (state) => (state.error ? END : "structureOutline"))
    .addEdge("structureOutline", END)
    .compile({
      name: "novel-outline-graph",
    });
}

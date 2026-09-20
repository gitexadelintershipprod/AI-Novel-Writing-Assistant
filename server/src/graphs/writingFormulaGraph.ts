import { Annotation, END, START, StateGraph } from "@langchain/langgraph";
import type { BaseChatModel } from "@langchain/core/language_models/chat_models";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";

export const WritingFormulaGraphAnnotation = Annotation.Root({
  sourceText: Annotation<string>(),
  extractLevel: Annotation<string>(),
  focusAreas: Annotation<string[]>(),
  styleAnalysis: Annotation<string>(),
  techniqueExtraction: Annotation<string>(),
  formulaMarkdown: Annotation<string>(),
  formulaStructured: Annotation<Record<string, string | null>>(),
  error: Annotation<string | undefined>(),
});

export type WritingFormulaGraphState = typeof WritingFormulaGraphAnnotation.State;
export type WritingFormulaGraphInput = Pick<
  WritingFormulaGraphState,
  "sourceText" | "extractLevel" | "focusAreas"
>;
export type WritingFormulaGraphOutput = Pick<
  WritingFormulaGraphState,
  "styleAnalysis" | "techniqueExtraction" | "formulaMarkdown" | "formulaStructured" | "error"
>;

async function analyzeStyle(state: WritingFormulaGraphState, llm: BaseChatModel) {
  try {
    const result = await llm.invoke([
      new SystemMessage("You are a prose-style analyst. Analyze language, point of view, and pacing."),
      new HumanMessage(state.sourceText),
    ]);
    const text = typeof result.content === "string" ? result.content : JSON.stringify(result.content);
    return { styleAnalysis: text };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Style analysis failed." };
  }
}

async function extractTechniques(state: WritingFormulaGraphState, llm: BaseChatModel) {
  try {
    const result = await llm.invoke([
      new SystemMessage("Extract reproducible writing techniques and summarize them as rules."),
      new HumanMessage(
        `Style analysis:
${state.styleAnalysis}
Focus dimensions: ${state.focusAreas.join(", ")}`,
      ),
    ]);
    const text = typeof result.content === "string" ? result.content : JSON.stringify(result.content);
    return { techniqueExtraction: text };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Technique extraction failed." };
  }
}

async function buildFormula(state: WritingFormulaGraphState, llm: BaseChatModel) {
  try {
    const result = await llm.invoke([
      new SystemMessage("Turn the analysis into a Markdown writing-formula document."),
      new HumanMessage(
        `Style analysis:
${state.styleAnalysis}

Technique extraction:
${state.techniqueExtraction}

Organize under these headings:
## Overall style positioning
## Core writing techniques (with source examples)
## Reusable writing formula
## Usage guide (how to write new text with this formula)`,
      ),
    ]);
    const text = typeof result.content === "string" ? result.content : JSON.stringify(result.content);
    return { formulaMarkdown: text };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Building the formula document failed." };
  }
}

function extractSection(content: string, heading: string): string | null {
  const regex = new RegExp(`##\\s*${heading}[\\s\\S]*?(?=\\n##\\s|$)`, "i");
  const matched = content.match(regex)?.[0];
  if (!matched) {
    return null;
  }
  return matched.replace(new RegExp(`##\\s*${heading}`, "i"), "").trim();
}

async function structureFormula(state: WritingFormulaGraphState) {
  try {
    return {
      formulaStructured: {
        style: extractSection(state.formulaMarkdown, "Overall style positioning"),
        formulaDescription: extractSection(state.formulaMarkdown, "Core writing techniques (with source examples)"),
        formulaSteps: extractSection(state.formulaMarkdown, "Reusable writing formula"),
        applicationTips: extractSection(state.formulaMarkdown, "Usage guide (how to write new text with this formula)"),
      },
    };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Structuring the formula failed." };
  }
}

export function createWritingFormulaGraph(llm: BaseChatModel) {
  return new StateGraph(WritingFormulaGraphAnnotation)
    .addNode("analyzeStyle", (state) => analyzeStyle(state, llm))
    .addNode("extractTechniques", (state) => extractTechniques(state, llm))
    .addNode("buildFormula", (state) => buildFormula(state, llm))
    .addNode("structureFormula", structureFormula)
    .addEdge(START, "analyzeStyle")
    .addConditionalEdges("analyzeStyle", (state) => (state.error ? END : "extractTechniques"))
    .addConditionalEdges("extractTechniques", (state) => (state.error ? END : "buildFormula"))
    .addConditionalEdges("buildFormula", (state) => (state.error ? END : "structureFormula"))
    .addEdge("structureFormula", END)
    .compile({
      name: "writing-formula-graph",
    });
}

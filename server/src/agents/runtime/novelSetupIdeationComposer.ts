import { getLLM } from "../../llm/factory";
import { preparePromptExecution, runTextPrompt } from "../../prompting/core/promptRunner";
import { runtimeSetupIdeationPrompt } from "../../prompting/prompts/agent/runtime.prompts";
import type { StructuredIntent, ToolCall, ToolExecutionContext } from "../types";
import { safeJson, type ToolExecutionResult } from "./runtimeHelpers";

type IdeationLLMFactory = typeof getLLM;

let ideationLLMFactory: IdeationLLMFactory = getLLM;

function resolveIdeationMaxTokens(maxTokens: number | undefined): number | undefined {
  if (typeof maxTokens !== "number" || !Number.isFinite(maxTokens)) {
    return undefined;
  }
  return Math.min(Math.floor(maxTokens), 8000);
}

function truncateFact(value: string, max = 220): string {
  const normalized = value.replace(/\s+/g, " ").trim();
  if (!normalized) {
    return "";
  }
  return normalized.length > max ? `${normalized.slice(0, max)}...` : normalized;
}

function extractTextFromContent(content: unknown): string {
  if (typeof content === "string") {
    return content.trim();
  }
  if (Array.isArray(content)) {
    return content
      .map((item) => {
        if (typeof item === "string") {
          return item;
        }
        if (item && typeof item === "object" && "text" in item && typeof item.text === "string") {
          return item.text;
        }
        return "";
      })
      .join("")
      .trim();
  }
  return "";
}

function getSuccessfulOutput(results: ToolExecutionResult[], tool: ToolCall["tool"]): Record<string, unknown> | null {
  return results.find((item) => item.success && item.tool === tool && item.output)?.output ?? null;
}

function toReadableValue(value: unknown): string | null {
  if (typeof value === "string") {
    return truncateFact(value);
  }
  if (typeof value === "number") {
    return String(value);
  }
  return null;
}

function pushFact(lines: string[], label: string, value: unknown): void {
  const text = toReadableValue(value);
  if (text) {
    lines.push(`${label}: ${text}`);
  }
}

function buildIdeationFacts(results: ToolExecutionResult[], structuredIntent?: StructuredIntent): string {
  const novelContext = getSuccessfulOutput(results, "get_novel_context");
  const storyBible = getSuccessfulOutput(results, "get_story_bible");
  const world = getSuccessfulOutput(results, "get_world_constraints");
  const knowledge = getSuccessfulOutput(results, "search_knowledge");
  const lines: string[] = [];

  if (novelContext) {
    pushFact(lines, "Novel title", novelContext.title);
    pushFact(lines, "A synopsis already exists", novelContext.description);
    pushFact(lines, "Genre", novelContext.genre);
    pushFact(lines, "Style tone", novelContext.styleTone);
    pushFact(lines, "narrative perspective", novelContext.narrativePov);
    pushFact(lines, "Push the rhythm", novelContext.pacePreference);
    pushFact(lines, "Collaboration mode", novelContext.projectMode);
    pushFact(lines, "emotional intensity", novelContext.emotionIntensity);
    pushFact(lines, "AI degrees of freedom", novelContext.aiFreedom);
    pushFact(lines, "Default chapter length", novelContext.defaultChapterLength);
    pushFact(lines, "Bind the world", novelContext.worldName);
    pushFact(lines, "An outline already exists", novelContext.outline);
    pushFact(lines, "Structured outline", novelContext.structuredOutline);
    pushFact(lines, "Number of chapters", novelContext.chapterCount);
    pushFact(lines, "Completed chapter count", novelContext.completedChapterCount);
  }

  if (storyBible) {
    pushFact(lines, "Core-setting draft", storyBible.coreSetting);
    pushFact(lines, "story promise", storyBible.mainPromise);
    pushFact(lines, "Character arcs", storyBible.characterArcs);
    pushFact(lines, "world rules", storyBible.worldRules);
    pushFact(lines, "Forbidden rules", storyBible.forbiddenRules);
  }

  if (world) {
    pushFact(lines, "World name", world.worldName);
    const constraints = typeof world.constraints === "object" && world.constraints
      ? world.constraints as Record<string, unknown>
      : null;
    if (constraints) {
      pushFact(lines, "World axioms", constraints.axioms);
      pushFact(lines, "power system", constraints.magicSystem);
      pushFact(lines, "Core-conflict environment", constraints.conflicts);
      pushFact(lines, "Consistency notes", constraints.consistencyReport);
    }
  }

  if (knowledge) {
    pushFact(lines, "Knowledge-base hit count", knowledge.hitCount);
    pushFact(lines, "Knowledge-base context", knowledge.contextBlock);
  }

  if (structuredIntent) {
    pushFact(lines, "User-stated title", structuredIntent.novelTitle);
    pushFact(lines, "User-stated genre", structuredIntent.genre);
    pushFact(lines, "User-stated premise", structuredIntent.description);
    pushFact(lines, "User-stated style", structuredIntent.styleTone);
  }

  return lines.length > 0 ? lines.join("\n") : "There are no usable novel-context facts yet.";
}

function buildIdeationFallback(results: ToolExecutionResult[], structuredIntent?: StructuredIntent): string {
  const novelContext = getSuccessfulOutput(results, "get_novel_context");
  const title = typeof novelContext?.title === "string" && novelContext.title.trim()
    ? novelContext.title.trim()
    : typeof structuredIntent?.novelTitle === "string" && structuredIntent.novelTitle.trim()
      ? structuredIntent.novelTitle.trim()
      : "";

  if (title) {
    return `I can give you option sets around "${title}" right away. To stay closer to what you want, tell me one core element to keep: genre, protagonist identity, or the conflict you most want to write.`;
  }
  return "I can give you option sets right away. First tell me what this book must keep: a working title, a genre, or the conflict you most want to write.";
}

export async function composeNovelSetupIdeationAnswer(
  goal: string,
  results: ToolExecutionResult[],
  context: Omit<ToolExecutionContext, "runId" | "agentName">,
  structuredIntent?: StructuredIntent,
): Promise<string> {
  const facts = buildIdeationFacts(results, structuredIntent);
  const fallback = buildIdeationFallback(results, structuredIntent);

  try {
    const resolvedMaxTokens = resolveIdeationMaxTokens(context.maxTokens);
    if (ideationLLMFactory === getLLM) {
      const result = await runTextPrompt({
        asset: runtimeSetupIdeationPrompt,
        promptInput: {
          goal,
          structuredIntentJson: safeJson(structuredIntent ?? { intent: "ideate_novel_setup" }),
          facts,
        },
        options: {
          provider: context.provider ?? "deepseek",
          model: context.model,
          temperature: Math.max(context.temperature ?? 0.75, 0.75),
          maxTokens: resolvedMaxTokens,
        },
      });
      return result.output.trim() || fallback;
    }

    const prepared = preparePromptExecution({
      asset: runtimeSetupIdeationPrompt,
      promptInput: {
        goal,
        structuredIntentJson: safeJson(structuredIntent ?? { intent: "ideate_novel_setup" }),
        facts,
      },
    });
    const llm = await ideationLLMFactory(context.provider ?? "deepseek", {
      model: context.model,
      temperature: Math.max(context.temperature ?? 0.75, 0.75),
      maxTokens: resolvedMaxTokens,
      taskType: runtimeSetupIdeationPrompt.taskType,
      promptMeta: prepared.invocation,
    });
    const result = await llm.invoke(prepared.messages);
    const text = extractTextFromContent(result.content);
    return text || fallback;
  } catch {
    return fallback;
  }
}

export function setNovelSetupIdeationLLMFactoryForTests(factory?: IdeationLLMFactory): void {
  ideationLLMFactory = factory ?? getLLM;
}

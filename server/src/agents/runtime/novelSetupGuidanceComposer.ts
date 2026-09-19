import { getLLM } from "../../llm/factory";
import { preparePromptExecution, runTextPrompt } from "../../prompting/core/promptRunner";
import { runtimeSetupGuidancePrompt } from "../../prompting/prompts/agent/runtime.prompts";
import type { StructuredIntent, ToolCall, ToolExecutionContext } from "../types";
import type { ToolExecutionResult } from "./runtimeHelpers";
import {
  buildNovelSetupGuidanceFacts,
  formatNovelSetupGuidance,
  parseNovelSetupStatus,
} from "./novelSetupResponses";

type GuidanceScene =
  | "create_missing_title"
  | "produce_missing_title"
  | "create_setup"
  | "select_setup";

type GuidanceLLMFactory = typeof getLLM;

let guidanceLLMFactory: GuidanceLLMFactory = getLLM;

function resolveGuidanceMaxTokens(maxTokens: number | undefined): number | undefined {
  if (typeof maxTokens !== "number" || !Number.isFinite(maxTokens)) {
    return undefined;
  }
  return Math.min(Math.floor(maxTokens), 8000);
}

function truncateFact(value: string, max = 160): string {
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

function buildIntentFacts(structuredIntent?: StructuredIntent): string {
  if (!structuredIntent) {
    return "There are no extra structured writing clues.";
  }
  const lines = [
    structuredIntent.novelTitle ? `The user already mentioned a title: ${truncateFact(structuredIntent.novelTitle)}` : "The user has not given a clear title yet.",
    structuredIntent.genre ? `Genre mentioned by the user: ${truncateFact(structuredIntent.genre)}` : null,
    structuredIntent.description ? `Setup mentioned by the user: ${truncateFact(structuredIntent.description)}` : null,
    structuredIntent.styleTone ? `Style mentioned by the user: ${truncateFact(structuredIntent.styleTone)}` : null,
  ].filter((item): item is string => Boolean(item));

  return lines.length > 0 ? lines.join("\n") : "There are no extra structured writing clues.";
}

function fallbackForMissingTitle(scene: GuidanceScene): string {
  if (scene === "produce_missing_title") {
    return "Sure. Let's lock this book's starting point first. Do you want a working title, or should we start with genre, protagonist, and core conflict?";
  }
  return "Sure. Let's shape a first draft of this book. Do you want a working title, or should you tell me the genre and who the protagonist is?";
}

async function composeWarmGuidance(input: {
  goal: string;
  scene: GuidanceScene;
  context: Omit<ToolExecutionContext, "runId" | "agentName">;
  facts: string;
  fallback: string;
  structuredIntent?: StructuredIntent;
}): Promise<string> {
  try {
    const resolvedMaxTokens = resolveGuidanceMaxTokens(input.context.maxTokens);
    const sceneInstruction = input.scene === "create_missing_title"
      ? "The user just said they want to write a novel, but there is not yet a title that can be created."
      : input.scene === "produce_missing_title"
        ? "The user wants to start full-book production now, but there is no usable novel title or novel context."
        : input.scene === "create_setup"
          ? "The novel was created. Continue the opening setup guide next."
          : "The user just switched back to a novel workspace and needs to continue unfinished setup.";
    if (guidanceLLMFactory === getLLM) {
      const result = await runTextPrompt({
        asset: runtimeSetupGuidancePrompt,
        promptInput: {
          sceneInstruction,
          goal: input.goal,
          intentFacts: buildIntentFacts(input.structuredIntent),
          knownFacts: input.facts,
        },
        options: {
          provider: input.context.provider ?? "deepseek",
          model: input.context.model,
          temperature: Math.max(input.context.temperature ?? 0.7, 0.7),
          maxTokens: resolvedMaxTokens,
        },
      });
      return result.output.trim() || input.fallback;
    }

    const prepared = preparePromptExecution({
      asset: runtimeSetupGuidancePrompt,
      promptInput: {
        sceneInstruction,
        goal: input.goal,
        intentFacts: buildIntentFacts(input.structuredIntent),
        knownFacts: input.facts,
      },
    });
    const llm = await guidanceLLMFactory(input.context.provider ?? "deepseek", {
      model: input.context.model,
      temperature: Math.max(input.context.temperature ?? 0.7, 0.7),
      maxTokens: resolvedMaxTokens,
      taskType: runtimeSetupGuidancePrompt.taskType,
      promptMeta: prepared.invocation,
    });
    const result = await llm.invoke(prepared.messages);
    const text = extractTextFromContent(result.content);
    return text || input.fallback;
  } catch {
    return input.fallback;
  }
}

export async function composeCreateNovelSetupAnswer(
  goal: string,
  results: ToolExecutionResult[],
  context: Omit<ToolExecutionContext, "runId" | "agentName">,
  structuredIntent?: StructuredIntent,
): Promise<string> {
  const created = getSuccessfulOutput(results, "create_novel");
  if (!created) {
    return composeWarmGuidance({
      goal,
      scene: "create_missing_title",
      context,
      structuredIntent,
      facts: "No novel has been created yet, and there is no stable title.",
      fallback: fallbackForMissingTitle("create_missing_title"),
    });
  }

  const title = typeof created.title === "string" ? created.title.trim() : "";
  const setup = parseNovelSetupStatus(created.setup);
  if (title && setup) {
    return composeWarmGuidance({
      goal,
      scene: "create_setup",
      context,
      structuredIntent,
      facts: buildNovelSetupGuidanceFacts(setup),
      fallback: formatNovelSetupGuidance(`Created the novel "${title}". Let's fill in the most important setup first.`, setup),
    });
  }

  return title ? `Created the novel "${title}".` : "The novel was created.";
}

export async function composeSelectNovelWorkspaceSetupAnswer(
  goal: string,
  results: ToolExecutionResult[],
  context: Omit<ToolExecutionContext, "runId" | "agentName">,
  structuredIntent?: StructuredIntent,
): Promise<string> {
  const selected = getSuccessfulOutput(results, "select_novel_workspace");
  if (!selected) {
    return "Tell me which novel you want to switch to, and I will keep advancing from its current setup.";
  }

  const title = typeof selected.title === "string" ? selected.title.trim() : "";
  const setup = parseNovelSetupStatus(selected.setup);
  if (title && setup && setup.stage !== "ready_for_production") {
    return composeWarmGuidance({
      goal,
      scene: "select_setup",
      context,
      structuredIntent,
      facts: buildNovelSetupGuidanceFacts(setup),
      fallback: formatNovelSetupGuidance(`Switched to the workspace for "${title}". Let's finish filling in the setup.`, setup),
    });
  }

  return title ? `Switched the current workspace to "${title}".` : "Switched the current workspace.";
}

export async function composeMissingNovelKickoffAnswer(
  goal: string,
  context: Omit<ToolExecutionContext, "runId" | "agentName">,
  structuredIntent: StructuredIntent | undefined,
  scene: "create_missing_title" | "produce_missing_title",
): Promise<string> {
  return composeWarmGuidance({
    goal,
    scene,
    context,
    structuredIntent,
    facts: [
      "No novel context is available.",
      structuredIntent?.novelTitle ? `There is already a title clue: ${truncateFact(structuredIntent.novelTitle)}` : "There is no reliable title yet.",
    ].join("\n"),
    fallback: fallbackForMissingTitle(scene),
  });
}

export function setNovelSetupGuidanceLLMFactoryForTests(factory?: GuidanceLLMFactory): void {
  guidanceLLMFactory = factory ?? getLLM;
}

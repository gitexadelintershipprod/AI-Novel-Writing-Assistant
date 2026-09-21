import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { toJSONSchema, type ZodError, type ZodType } from "zod";
import type { LLMProvider } from "@ai-novel/shared/types/llm";
import type { ModelRouteRequestProtocol } from "@ai-novel/shared/types/novel";
import { getLLM } from "./factory";
import { runWithEnforcedTimeout } from "./invokeTimeout";
import { logStructuredRepairSession } from "./repairLogging";
import type { TaskType } from "./modelRouter";
import type { StructuredOutputStrategy } from "./structuredOutput";
import { toText } from "../services/novel/novelP0Utils";
import type { PromptInvocationMeta } from "../prompting/core/promptTypes";

export interface StructuredRepairInput<T> {
  provider?: LLMProvider;
  model?: string;
  apiKey?: string;
  baseURL?: string;
  maxTokens?: number;
  timeoutMs?: number;
  signal?: AbortSignal;
  taskType?: TaskType;
  requestProtocol?: ModelRouteRequestProtocol;
  label: string;
  schema: ZodType<T>;
  promptMeta?: PromptInvocationMeta;
  onRepairOutputDelta?: (content: string) => void;
}

interface ArrayLengthRepairHint {
  path: Array<string | number>;
  exactLength: number;
  direction: "expand" | "trim";
}

interface RepairHelpers<T> {
  tryParseStructuredJsonValue: (source: string) => { parsed: unknown } | { error: string };
  tryUnwrapSingletonArrayWrapper: (parsed: unknown, schema: ZodType<T>) => { data: T } | null;
  normalizeOversizedArrays: (
    parsed: unknown,
    error: ZodError,
    schema: ZodType<T>,
  ) => { data: T; trimmedPaths: string[] } | null;
  formatZodErrors: (error: ZodError) => string;
  logStructuredInvokeEvent: (input: {
    event: string;
    label: string;
    provider?: LLMProvider;
    model?: string;
    taskType?: TaskType;
    latencyMs?: number;
    rawChars?: number;
    repairAttempt?: number;
    strategy?: StructuredOutputStrategy;
  }) => void;
}

const MAX_REPAIR_SOURCE_CHARS = 12_000;

function buildRepairSchemaContract<T>(schema: ZodType<T>): string {
  try {
    return JSON.stringify(toJSONSchema(schema), null, 2);
  } catch {
    return "The target schema cannot be serialized. Still fill fields strictly by the paths in the validation errors.";
  }
}

function compactRepairSource(rawContent: string): string {
  if (rawContent.length <= MAX_REPAIR_SOURCE_CHARS) {
    return rawContent;
  }
  const head = rawContent.slice(0, 9_000);
  const tail = rawContent.slice(-2_000);
  return [
    head,
    "\n...[omitted degenerate or looping content; do not repeat or continue it]...\n",
    tail,
  ].join("");
}

function extractValidationPaths(validationError: string): string[] {
  return Array.from(
    new Set(
      validationError
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter((line) => line.startsWith("- "))
        .map((line) => {
          const colonIndex = line.indexOf(":");
          return colonIndex > 2 ? line.slice(2, colonIndex).trim() : "";
        })
        .filter(Boolean),
    ),
  );
}

function parseIssuePath(pathText: string): Array<string | number> {
  if (!pathText || pathText === "(root)") {
    return [];
  }
  return pathText.split(".").map((segment) => (/^\d+$/.test(segment) ? Number(segment) : segment));
}

function formatIssuePath(path: Array<string | number>): string {
  return path.length > 0 ? path.join(".") : "(root)";
}

function extractArrayLengthRepairHints(validationError: string): ArrayLengthRepairHint[] {
  const hints: ArrayLengthRepairHint[] = [];
  const seen = new Set<string>();

  for (const rawLine of validationError.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line.startsWith("- ")) {
      continue;
    }
    const colonIndex = line.indexOf(":");
    if (colonIndex <= 2) {
      continue;
    }
    const pathText = line.slice(2, colonIndex).trim();
    const message = line.slice(colonIndex + 1).trim();
    const tooBig = message.match(/Too big: expected array to have <=(\d+) items/i);
    const tooSmall = message.match(/Too small: expected array to have >=(\d+) items/i);
    const match = tooBig ?? tooSmall;
    if (!match) {
      continue;
    }

    const exactLength = Number(match[1]);
    if (!Number.isInteger(exactLength) || exactLength < 0) {
      continue;
    }

    const path = parseIssuePath(pathText);
    const direction: ArrayLengthRepairHint["direction"] = tooBig ? "trim" : "expand";
    const key = `${direction}:${formatIssuePath(path)}:${exactLength}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    hints.push({
      path,
      exactLength,
      direction,
    });
  }

  return hints;
}

export async function repairWithLlm<T>(
  input: StructuredRepairInput<T>,
  rawContent: string,
  validationError: string,
  repairAttempt: number,
  helpers: RepairHelpers<T>,
): Promise<T> {
  helpers.logStructuredInvokeEvent({
    event: "repair_start",
    label: input.label,
    provider: input.provider,
    model: input.model,
    taskType: input.taskType,
    repairAttempt,
    strategy: "prompt_json",
  });
  const llm = await getLLM(input.provider, {
    fallbackProvider: "openrouter",
    apiKey: input.apiKey,
    baseURL: input.baseURL,
    model: input.model,
    temperature: 0.15,
    maxTokens: input.maxTokens,
    timeoutMs: input.timeoutMs,
    taskType: input.taskType ?? "planner",
    requestProtocol: input.requestProtocol,
    promptMeta: input.promptMeta ? {
      ...input.promptMeta,
      repairUsed: true,
      repairAttempts: repairAttempt,
    } : undefined,
    executionMode: "structured",
    structuredStrategy: "prompt_json",
  });

  const repairSystem = [
    "You are a JSON fixer.",
    "Your task: output a strictly valid JSON value that passes the given schema check.",
    "The final output may be a JSON object or a JSON array; it must match the target structure.",
    "Do not output any explanation, Markdown, or extra fields.",
    "If a validation error says a field is missing, use the field name from the error path as the JSON key. Do not translate it into a Chinese alias.",
    "If the target structure is a top-level array, output the array itself. Do not wrap it in an extra object.",
    "If a field must be an array, output a JSON array. Even with one item, do not collapse it into a string, number, or object.",
    "If array items should be objects, output an object array such as [{...}]; do not write a comma-joined string.",
    "If the original JSON wrapped the payload in an extra key such as data, result, output, xxxProjection, or xxxList, remove that wrapper and lift the real target structure to the top.",
    "If a required string field is missing, fill in a non-empty string. Make a minimal, conservative, meaning-consistent completion from the original JSON. Do not output an empty string, null, or undefined.",
    "If a validation error is expected string, received number/boolean, keep the original meaning and convert it to a JSON string, for example 19 -> \"19\" and true -> \"true\". Do not delete the field.",
    "If a validation error says an array is too long or too short, fix that path to the exact length required. Do not leave it merely close.",
    "The target JSON Schema is the final field contract. Even if the original output is truncated, degraded, or missing many fields, rebuild a complete object from the schema.",
    "If you see meaningless repetition, garbled text, or runaway long text, drop the broken spans and rebuild the shortest meaning-consistent content. Do not continue the damaged text.",
    "Keep every string short. Keep only what is needed to pass schema checks and restore the original meaning.",
  ].join("\n");

  const validationPaths = extractValidationPaths(validationError);
  const arrayLengthHints = extractArrayLengthRepairHints(validationError);
  const repairSchemaContract = buildRepairSchemaContract(input.schema);
  const repairSource = compactRepairSource(rawContent);

  const repairHuman = [
    `Validation failed: ${input.label}`,
    validationError,
    ...(validationPaths.length > 0 ? [
      "",
      `At least these paths need repair: ${validationPaths.join(", ")}`,
    ] : []),
    ...(arrayLengthHints.length > 0 ? [
      "",
      "Hard array-length constraints:",
      ...arrayLengthHints.map((hint) => hint.direction === "trim"
        ? `- ${formatIssuePath(hint.path)} must end with exactly ${hint.exactLength} items; if it currently has more, drop extras in original order.`
        : `- ${formatIssuePath(hint.path)} must end with exactly ${hint.exactLength} items; if it currently has fewer, keep existing items in original order and fill the missing ones.`),
    ] : []),
    "",
    "Target JSON Schema (field names, types, required fields, and length constraints are authoritative):",
    repairSchemaContract,
    "",
    "Original model output (may include extra text, markdown, or truncation):",
    repairSource,
    "",
    "After fixing it, output only the final JSON.",
  ].join("\n");

  logStructuredRepairSession({
    event: "repair_start",
    label: input.label,
    repairAttempt,
    provider: input.provider,
    model: input.model,
    taskType: input.taskType,
    promptMeta: input.promptMeta,
    validationError,
    schemaPaths: validationPaths,
    repairSystem,
    repairHuman,
  });

  const startedAt = Date.now();
  try {
    const invokeOptions: Record<string, unknown> = {};
    if (input.signal) {
      invokeOptions.signal = input.signal;
    }
    const repairedRaw = await runWithEnforcedTimeout({
      label: `${input.label}#repair-${repairAttempt}`,
      timeoutMs: input.timeoutMs,
      signal: input.signal,
      run: async (signal) => {
        const stream = await llm.stream(
          [new SystemMessage(repairSystem), new HumanMessage(repairHuman)],
          signal ? { ...invokeOptions, signal } : invokeOptions,
        );
        let content = "";
        for await (const chunk of stream) {
          const delta = toText(chunk.content);
          content += delta;
          input.onRepairOutputDelta?.(delta);
        }
        return content;
      },
    });
    const latencyMs = Date.now() - startedAt;
    helpers.logStructuredInvokeEvent({
      event: "repair_done",
      label: input.label,
      provider: input.provider,
      model: input.model,
      taskType: input.taskType,
      repairAttempt,
      latencyMs,
      rawChars: repairedRaw.length,
      strategy: "prompt_json",
    });
    logStructuredRepairSession({
      event: "repair_done",
      label: input.label,
      repairAttempt,
      provider: input.provider,
      model: input.model,
      taskType: input.taskType,
      promptMeta: input.promptMeta,
      validationError,
      schemaPaths: validationPaths,
      repairSystem,
      repairHuman,
      rawOutput: repairedRaw,
      latencyMs,
    });
    const repairParse = helpers.tryParseStructuredJsonValue(repairedRaw);
    if ("error" in repairParse) {
      throw new Error(`[${input.label}] JSON still could not be parsed after repair. Error: ${repairParse.error}`);
    }

    const final = input.schema.safeParse(repairParse.parsed);
    if (!final.success) {
      const unwrapped = helpers.tryUnwrapSingletonArrayWrapper(repairParse.parsed, input.schema);
      if (unwrapped) {
        helpers.logStructuredInvokeEvent({
          event: "repair_unwrapped_singleton_array",
          label: input.label,
          provider: input.provider,
          model: input.model,
          taskType: input.taskType,
          repairAttempt,
          strategy: "prompt_json",
        });
        return unwrapped.data;
      }

      const normalized = helpers.normalizeOversizedArrays(repairParse.parsed, final.error, input.schema);
      if (normalized) {
        helpers.logStructuredInvokeEvent({
          event: "repair_normalized",
          label: input.label,
          provider: input.provider,
          model: input.model,
          taskType: input.taskType,
          repairAttempt,
          strategy: "prompt_json",
        });
        return normalized.data;
      }
      throw new Error(`[${input.label}] JSON still failed schema validation after repair. Error: ${helpers.formatZodErrors(final.error)}`);
    }
    return final.data;
  } catch (error) {
    logStructuredRepairSession({
      event: "repair_error",
      label: input.label,
      repairAttempt,
      provider: input.provider,
      model: input.model,
      taskType: input.taskType,
      promptMeta: input.promptMeta,
      validationError,
      schemaPaths: validationPaths,
      repairSystem,
      repairHuman,
      latencyMs: Date.now() - startedAt,
      error,
    });
    throw error;
  }
}

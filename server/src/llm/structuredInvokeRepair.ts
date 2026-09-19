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
    "\n...[中间的异常重复或退化内容已省略，不能复述或延续]...\n",
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
    fallbackProvider: "deepseek",
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
    "你是 JSON fix器。",
    "Your task: output a strictly valid JSON value that passes the given schema check.",
    "The final output may be a JSON object or a JSON array; it must match the target structure.",
    "不要输出任何解释、Markdown 或额外字段。",
    "If a validation error says a field is missing, use the field name from the error path as the JSON key. Do not translate it into a Chinese alias.",
    "如果目标结构顶层是数组，就直接输出数组本身，不要再外包一层对象。",
    "If a field must be an array, output a JSON array. Even with one item, do not collapse it into a string, number, or object.",
    "If array items should be objects, output an object array such as [{...}]; do not write a comma-joined string.",
    "If the original JSON wrapped the payload in an extra key such as data, result, output, xxxProjection, or xxxList, remove that wrapper and lift the real target structure to the top.",
    "If a required string field is missing, fill in a non-empty string. Make a minimal, conservative, meaning-consistent completion from the original JSON. Do not output an empty string, null, or undefined.",
    "如果Validation error是 expected string, received number/boolean，must be retained原值语义并改成 JSON 字符串，例如 19 改为 \"19\"、true 改为 \"true\"，不要删除字段。",
    "If a validation error says an array is too long or too short, fix that path to the exact length required. Do not leave it merely close.",
    "The target JSON Schema is the final field contract. Even if the original output is truncated, degraded, or missing many fields, rebuild a complete object from the schema.",
    "遇到无意义复读、乱码、失控长文本时，丢弃异常段落并用最短的语义一致内容重建，禁止继续复述损坏内容。",
    "Keep every string short. Keep only what is needed to pass schema checks and restore the original meaning.",
  ].join("\n");

  const validationPaths = extractValidationPaths(validationError);
  const arrayLengthHints = extractArrayLengthRepairHints(validationError);
  const repairSchemaContract = buildRepairSchemaContract(input.schema);
  const repairSource = compactRepairSource(rawContent);

  const repairHuman = [
    `校验失败：${input.label}`,
    validationError,
    ...(validationPaths.length > 0 ? [
      "",
      `至少Needs repair这些路径：${validationPaths.join(", ")}`,
    ] : []),
    ...(arrayLengthHints.length > 0 ? [
      "",
      "数组长度硬约束：",
      ...arrayLengthHints.map((hint) => hint.direction === "trim"
        ? `- ${formatIssuePath(hint.path)} 必须最终恰好保留 ${hint.exactLength} items；如果当前超过该数量，按原顺序裁掉多余项。`
        : `- ${formatIssuePath(hint.path)} 必须最终补足到恰好 ${hint.exactLength} items；如果当前不足，按原顺序Keep existing项并补齐缺失项。`),
    ] : []),
    "",
    "目标 JSON Schema（字段名、类型、必填项与长度约束以此为准）：",
    repairSchemaContract,
    "",
    "原始模型输出（可能包含多余文本、markdown 或截断）：",
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
      throw new Error(`[${input.label}] JSON repair 后仍无法解析。错误：${repairParse.error}`);
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
      throw new Error(`[${input.label}] JSON repair 后仍未通过 Schema 校验。错误：${helpers.formatZodErrors(final.error)}`);
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

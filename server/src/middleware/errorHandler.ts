import type { NextFunction, Request, Response } from "express";
import type { ApiResponse } from "@ai-novel/shared/types/api";
import { ZodError, type ZodIssue } from "zod";

export class AppError extends Error {
  readonly statusCode: number;
  readonly details?: unknown;

  constructor(message: string, statusCode = 500, details?: unknown) {
    super(message);
    this.name = "AppError";
    this.statusCode = statusCode;
    this.details = details;
  }
}

function joinErrorParts(parts: Array<string | undefined>): string {
  return parts.map((part) => part?.trim() ?? "").filter(Boolean).join(" | ");
}

const VALIDATION_FIELD_LABELS: Record<string, string> = {
  id: "项目 ID",
  field: "字段",
  provider: "模型提供商",
  model: "model",
  temperature: "temperature",
  storyInput: "Story idea input",
  expansion: "Story Engine Prototype",
  decomposition: "推进与兑现摘要",
  constraints: "narrative rules",
  lockedFields: "锁定字段",
  state: "story status",
  expanded_premise: "扩展前提",
  protagonist_core: "Protagonist Core",
  conflict_engine: "conflict engine",
  conflict_layers: "conflict layer",
  external: "external oppression",
  internal: "internal collapse",
  relational: "relationship stress",
  mystery_box: "Core unknown",
  emotional_line: "情绪线",
  setpiece_seeds: "high tension scene seeds",
  tone_reference: "氛围参考",
  selling_point: "selling point",
  core_conflict: "core conflict",
  main_hook: "main hook",
  progression_loop: "advance cycle",
  growth_path: "growth path",
  major_payoffs: "Key redemption points",
  ending_flavor: "结局风味",
  currentPhase: "current stage",
  progress: "Progress",
  protagonistState: "Protagonist's current situation",
};

function formatValidationPath(path: PropertyKey[]): string {
  return path
    .map((segment) => {
      if (typeof segment === "number") {
        return `第 ${segment + 1} items`;
      }
      if (typeof segment === "symbol") {
        return segment.toString();
      }
      return VALIDATION_FIELD_LABELS[segment] ?? segment;
    })
    .filter(Boolean)
    .join(" / ");
}

function formatZodIssueMessage(issue: ZodIssue): string {
  const issueRecord = issue as ZodIssue & Record<string, unknown>;
  const code = String(issue.code);
  const origin = typeof issueRecord.origin === "string" ? issueRecord.origin : undefined;

  switch (code) {
    case "invalid_type":
      if (issueRecord.input === undefined) {
        return "This cannot be empty.";
      }
      if (issueRecord.expected === "string") {
        return "Must be text.";
      }
      if (issueRecord.expected === "number") {
        return "Must be a number.";
      }
      if (issueRecord.expected === "boolean") {
        return "Must be a boolean.";
      }
      return issue.message || "类型不正确。";
    case "invalid_value":
      return issue.message || "取值不合法。";
    case "too_small":
      if (origin === "array") {
        return `至少需要 ${issueRecord.minimum} items。`;
      }
      if (origin === "string") {
        return issueRecord.minimum === 1 ? "This cannot be empty." : `至少 ${issueRecord.minimum} 个字符。`;
      }
      if (origin === "number") {
        return `不能小于 ${issueRecord.minimum}。`;
      }
      return issue.message || "内容过短。";
    case "too_big":
      if (origin === "array") {
        return `最多只能填写 ${issueRecord.maximum} items。`;
      }
      if (origin === "string") {
        return `不能超过 ${issueRecord.maximum} 个字符。`;
      }
      if (origin === "number") {
        return `不能大于 ${issueRecord.maximum}。`;
      }
      return issue.message || "内容过长。";
    default:
      return issue.message || "格式不正确。";
  }
}

function formatValidationIssue(issue: ZodIssue): string {
  const path = formatValidationPath(issue.path);
  const message = formatZodIssueMessage(issue);
  return path ? `${path}：${message}` : message;
}

function setRequestErrorMessage(
  res: Response<ApiResponse<null>>,
  error: string,
  detail?: string,
): void {
  res.locals.requestErrorMessage = joinErrorParts([error, detail]);
}

function logServerError(req: Request, error: unknown): void {
  console.error(`[error] ${req.method} ${req.originalUrl}`, error);
}

function collectErrorMessages(error: unknown, depth = 0): string[] {
  if (!error || depth > 4) {
    return [];
  }
  if (error instanceof Error) {
    return [
      error.message,
      ...collectErrorMessages((error as Error & { cause?: unknown }).cause, depth + 1),
    ].filter(Boolean);
  }
  if (typeof error === "object") {
    const record = error as {
      message?: unknown;
      cause?: unknown;
    };
    return [
      typeof record.message === "string" ? record.message : "",
      ...collectErrorMessages(record.cause, depth + 1),
    ].filter(Boolean);
  }
  return [];
}

function findConnectionCause(error: unknown, depth = 0): {
  code?: string;
  host?: string;
  port?: number | string;
} | null {
  if (!error || depth > 6 || typeof error !== "object") {
    return null;
  }
  const record = error as {
    code?: unknown;
    host?: unknown;
    port?: unknown;
    cause?: unknown;
  };
  if (
    (typeof record.code === "string" && record.code.trim())
    || (typeof record.host === "string" && record.host.trim())
  ) {
    return {
      code: typeof record.code === "string" ? record.code : undefined,
      host: typeof record.host === "string" ? record.host : undefined,
      port: typeof record.port === "number" || typeof record.port === "string" ? record.port : undefined,
    };
  }
  return findConnectionCause(record.cause, depth + 1);
}

function formatUpstreamConnectionError(error: unknown): string | null {
  const joinedMessage = collectErrorMessages(error).join(" | ").trim();
  const isNetworkLike = /connection error|fetch failed|ECONNRESET|ETIMEDOUT|ENOTFOUND|EAI_AGAIN|socket hang up|tls/i
    .test(joinedMessage);
  if (!isNetworkLike) {
    return null;
  }
  const cause = findConnectionCause(error);
  const target = cause?.host
    ? `${cause.host}${cause.port ? `:${cause.port}` : ""}`
    : "上游模型服务";
  const code = cause?.code ? `（${cause.code}）` : "";
  return `上游模型服务Connection failed：当前服务器无法连接到 ${target}${code}。请检查该提供商的网络连通性，或切换到其它Available models提供商。`;
}

export function errorHandler(
  error: unknown,
  req: Request,
  res: Response<ApiResponse<null>>,
  _next: NextFunction,
): void {
  if (
    error
    && typeof error === "object"
    && "type" in error
    && (error as { type?: string }).type === "entity.too.large"
  ) {
    setRequestErrorMessage(res, "The request body is too large. Shorten the text or upload it in parts.");
    res.status(413).json({
      success: false,
      error: "The request body is too large. Shorten the text or upload it in parts.",
    });
    return;
  }

  if (error instanceof ZodError) {
    const detail = error.issues.map((issue) => formatValidationIssue(issue)).join(" ");
    setRequestErrorMessage(res, "Request validation failed.", detail);
    res.status(400).json({
      success: false,
      error: "Request validation failed.",
      message: detail,
    });
    return;
  }

  if (error instanceof AppError) {
    const detail = typeof error.details === "string" ? error.details : undefined;
    setRequestErrorMessage(res, error.message, detail);
    if (error.statusCode >= 500) {
      logServerError(req, error);
    }
    res.status(error.statusCode).json({
      success: false,
      error: error.message,
      message: detail,
    });
    return;
  }

  const message = error instanceof Error ? error.message : "The server hit an unknown error.";
  const upstreamConnectionMessage = formatUpstreamConnectionError(error);
  if (upstreamConnectionMessage) {
    setRequestErrorMessage(res, upstreamConnectionMessage);
    logServerError(req, error);
    res.status(502).json({
      success: false,
      error: upstreamConnectionMessage,
    });
    return;
  }

  setRequestErrorMessage(res, message);
  logServerError(req, error);
  res.status(500).json({
    success: false,
    error: message,
  });
}

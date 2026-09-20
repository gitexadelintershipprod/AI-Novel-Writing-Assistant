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
  id: "Project ID",
  field: "Field",
  provider: "Model provider",
  model: "model",
  temperature: "temperature",
  storyInput: "Story idea input",
  expansion: "Story Engine Prototype",
  decomposition: "Progression and payoff summary",
  constraints: "narrative rules",
  lockedFields: "Locked fields",
  state: "story status",
  expanded_premise: "Expanded premise",
  protagonist_core: "Protagonist Core",
  conflict_engine: "conflict engine",
  conflict_layers: "conflict layer",
  external: "external oppression",
  internal: "internal collapse",
  relational: "relationship stress",
  mystery_box: "Core unknown",
  emotional_line: "Emotional line",
  setpiece_seeds: "high tension scene seeds",
  tone_reference: "Tone reference",
  selling_point: "selling point",
  core_conflict: "core conflict",
  main_hook: "main hook",
  progression_loop: "advance cycle",
  growth_path: "growth path",
  major_payoffs: "Key redemption points",
  ending_flavor: "Ending flavor",
  currentPhase: "current stage",
  progress: "Progress",
  protagonistState: "Protagonist's current situation",
};

function formatValidationPath(path: PropertyKey[]): string {
  return path
    .map((segment) => {
      if (typeof segment === "number") {
        return `item ${segment + 1}`;
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
      return issue.message || "The type is incorrect.";
    case "invalid_value":
      return issue.message || "The value is not allowed.";
    case "too_small":
      if (origin === "array") {
        return `At least ${issueRecord.minimum} items are required.`;
      }
      if (origin === "string") {
        return issueRecord.minimum === 1 ? "This cannot be empty." : `At least ${issueRecord.minimum} characters.`;
      }
      if (origin === "number") {
        return `Must be at least ${issueRecord.minimum}.`;
      }
      return issue.message || "The content is too short.";
    case "too_big":
      if (origin === "array") {
        return `At most ${issueRecord.maximum} items are allowed.`;
      }
      if (origin === "string") {
        return `Must be at most ${issueRecord.maximum} characters.`;
      }
      if (origin === "number") {
        return `Must be at most ${issueRecord.maximum}.`;
      }
      return issue.message || "The content is too long.";
    default:
      return issue.message || "The format is incorrect.";
  }
}

function formatValidationIssue(issue: ZodIssue): string {
  const path = formatValidationPath(issue.path);
  const message = formatZodIssueMessage(issue);
  return path ? `${path}: ${message}` : message;
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
    : "the upstream model service";
  const code = cause?.code ? ` (${cause.code})` : "";
  return `Upstream model connection failed: this server cannot reach ${target}${code}. Check that provider's network connectivity, or switch to another available model provider.`;
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

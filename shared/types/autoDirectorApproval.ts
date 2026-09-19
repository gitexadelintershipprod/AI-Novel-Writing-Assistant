import type { NovelWorkflowCheckpoint } from "./novelWorkflow";
import { resolveWorkflowApprovalPointForCheckpoint } from "./directorWorkflowStepCatalog.js";

export const DIRECTOR_AUTO_APPROVAL_GROUPS = [
  {
    id: "low_risk_continue",
    label: "Low-risk continue",
    description: "Continue the ready next step without clearing assets.",
  },
  {
    id: "planning_review",
    label: "Planning review",
    description: "Continue after cast, volume strategy, and beat/chapter planning assets pass.",
  },
  {
    id: "chapter_execution",
    label: "Draft execution",
    description: "A chapter or volume range enters chapter execution.",
  },
  {
    id: "repair_replan",
    label: "Repair / replan",
    description: "Continue after low-risk repair; replans and large rewrites should be confirmed manually.",
  },
  {
    id: "rewrite_cleanup",
    label: "Rewrite cleanup",
    description: "Regenerating or rewriting clears assets in the target range and needs careful approval.",
  },
] as const;

export type DirectorAutoApprovalGroupId = typeof DIRECTOR_AUTO_APPROVAL_GROUPS[number]["id"];

export const DIRECTOR_AUTO_APPROVAL_POINTS = [
  {
    code: "candidate_direction_confirmed",
    groupId: "low_risk_continue",
    label: "Continue after the candidate direction is confirmed",
    description: "After confirming the book direction, AI may continue setup and enter the main chain.",
    riskLevel: "low",
  },
  {
    code: "character_setup_ready",
    groupId: "planning_review",
    label: "Continue after character setup passes",
    description: "After the cast is applied, AI may continue to volume strategy.",
    riskLevel: "low",
  },
  {
    code: "volume_strategy_ready",
    groupId: "planning_review",
    label: "Continue after volume strategy passes",
    description: "After volume strategy and skeleton are done, AI may continue to beats and chapters.",
    riskLevel: "low",
  },
  {
    code: "structured_outline_ready",
    groupId: "planning_review",
    label: "Continue after beats and chapters are ready",
    description: "After the target range is split and execution resources are ready, AI may continue to writing.",
    riskLevel: "low",
  },
  {
    code: "chapter_execution_continue",
    groupId: "chapter_execution",
    label: "Continue after a chapter-execution batch",
    description: "After one chapter batch finishes, AI may continue with remaining chapters.",
    riskLevel: "medium",
  },
  {
    code: "low_risk_quality_repair_continue",
    groupId: "repair_replan",
    label: "Continue after low-risk quality repair",
    description: "When quality repair is clearly low-risk, AI may continue chapter execution.",
    riskLevel: "medium",
  },
  {
    code: "replan_continue",
    groupId: "repair_replan",
    label: "Continue after replan handling",
    description: "Replanning will change the subsequent execution path, and it is recommended to confirm manually before authorization.",
    riskLevel: "high",
  },
  {
    code: "rewrite_cleanup_confirmed",
    groupId: "rewrite_cleanup",
    label: "Regenerate/Rewrite Confirm and continue",
    description: "After the target range assets are cleaned, allow the AI to continue rewriting the process.",
    riskLevel: "high",
  },
] as const;

export type DirectorAutoApprovalPointCode = typeof DIRECTOR_AUTO_APPROVAL_POINTS[number]["code"];
export type DirectorAutoApprovalRiskLevel = typeof DIRECTOR_AUTO_APPROVAL_POINTS[number]["riskLevel"];

export const ALL_DIRECTOR_AUTO_APPROVAL_POINT_CODES: DirectorAutoApprovalPointCode[] = (
  DIRECTOR_AUTO_APPROVAL_POINTS.map((item) => item.code)
);

export interface DirectorAutoApprovalPoint {
  code: DirectorAutoApprovalPointCode;
  groupId: DirectorAutoApprovalGroupId;
  label: string;
  description: string;
  riskLevel: DirectorAutoApprovalRiskLevel;
}

export interface DirectorAutoApprovalGroup {
  id: DirectorAutoApprovalGroupId;
  label: string;
  description: string;
}

export interface DirectorAutoApprovalConfig {
  enabled: boolean;
  approvalPointCodes: DirectorAutoApprovalPointCode[];
}

export function buildFullDirectorAutoApprovalConfig(): DirectorAutoApprovalConfig {
  return {
    enabled: true,
    approvalPointCodes: [...ALL_DIRECTOR_AUTO_APPROVAL_POINT_CODES],
  };
}

export interface DirectorAutoApprovalPreferenceSettings {
  approvalPointCodes: DirectorAutoApprovalPointCode[];
  approvalPoints: DirectorAutoApprovalPoint[];
  groups: DirectorAutoApprovalGroup[];
}

export const DEFAULT_DIRECTOR_AUTO_APPROVAL_POINT_CODES: DirectorAutoApprovalPointCode[] = [
  "candidate_direction_confirmed",
  "character_setup_ready",
  "volume_strategy_ready",
  "structured_outline_ready",
];

const AUTO_APPROVAL_POINT_CODE_SET = new Set<string>(
  DIRECTOR_AUTO_APPROVAL_POINTS.map((item) => item.code),
);

export function isDirectorAutoApprovalPointCode(value: unknown): value is DirectorAutoApprovalPointCode {
  return typeof value === "string" && AUTO_APPROVAL_POINT_CODE_SET.has(value);
}

export function normalizeDirectorAutoApprovalPointCodes(
  values: readonly unknown[] | null | undefined,
  fallback: readonly DirectorAutoApprovalPointCode[] = DEFAULT_DIRECTOR_AUTO_APPROVAL_POINT_CODES,
): DirectorAutoApprovalPointCode[] {
  const source = Array.isArray(values) ? values : fallback;
  const result: DirectorAutoApprovalPointCode[] = [];
  for (const value of source) {
    if (!isDirectorAutoApprovalPointCode(value) || result.includes(value)) {
      continue;
    }
    result.push(value);
  }
  return result;
}

export function normalizeDirectorAutoApprovalConfig(input: unknown): DirectorAutoApprovalConfig {
  if (!input || typeof input !== "object") {
    return {
      enabled: false,
      approvalPointCodes: [...DEFAULT_DIRECTOR_AUTO_APPROVAL_POINT_CODES],
    };
  }
  const record = input as {
    enabled?: unknown;
    approvalPointCodes?: unknown;
  };
  return {
    enabled: record.enabled === true,
    approvalPointCodes: normalizeDirectorAutoApprovalPointCodes(
      Array.isArray(record.approvalPointCodes) ? record.approvalPointCodes : null,
    ),
  };
}

export function resolveDirectorAutoApprovalPointForCheckpoint(
  checkpointType: NovelWorkflowCheckpoint | string | null | undefined,
): DirectorAutoApprovalPointCode | null {
  if (!checkpointType || typeof checkpointType !== "string") {
    return null;
  }
  const pointCode = resolveWorkflowApprovalPointForCheckpoint(checkpointType);
  return isDirectorAutoApprovalPointCode(pointCode) ? pointCode : null;
}

export function shouldAutoApproveDirectorCheckpoint(
  config: DirectorAutoApprovalConfig | null | undefined,
  checkpointType: NovelWorkflowCheckpoint | string | null | undefined,
): boolean {
  if (!config?.enabled) {
    return false;
  }
  const pointCode = resolveDirectorAutoApprovalPointForCheckpoint(checkpointType);
  return Boolean(pointCode && config.approvalPointCodes.includes(pointCode));
}

export function shouldAutoApproveDirectorApprovalPoint(
  config: DirectorAutoApprovalConfig | null | undefined,
  pointCode: DirectorAutoApprovalPointCode,
): boolean {
  return Boolean(config?.enabled && config.approvalPointCodes.includes(pointCode));
}

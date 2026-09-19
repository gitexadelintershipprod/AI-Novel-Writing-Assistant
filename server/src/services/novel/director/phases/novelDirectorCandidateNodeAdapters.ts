import type { DirectorArtifactRef } from "@ai-novel/shared/types/directorRuntime";
import type { NovelWorkflowStage } from "@ai-novel/shared/types/novelWorkflow";

export type DirectorCandidateStageNode =
  | "candidate_generation"
  | "candidate_refine"
  | "candidate_patch"
  | "candidate_title_refine";

export interface DirectorCandidateNodeAdapter {
  nodeKey: DirectorCandidateStageNode;
  label: string;
  targetType: DirectorArtifactRef["targetType"];
  reads: string[];
  writes: string[];
  mayModifyUserContent: boolean;
  requiresApprovalByDefault: boolean;
  supportsAutoRetry: boolean;
  waitingState: {
    stage: NovelWorkflowStage;
    itemKey: DirectorCandidateStageNode;
    itemLabel: string;
  };
}

function candidateNodeAdapter(input: {
  nodeKey: DirectorCandidateStageNode;
  label: string;
}): DirectorCandidateNodeAdapter {
  return {
    nodeKey: input.nodeKey,
    label: input.label,
    targetType: "global",
    reads: ["user_seed"],
    writes: ["candidate_batch"],
    mayModifyUserContent: false,
    requiresApprovalByDefault: false,
    supportsAutoRetry: false,
    waitingState: {
      stage: "auto_director",
      itemKey: input.nodeKey,
      itemLabel: input.label,
    },
  };
}

export const DIRECTOR_CANDIDATE_NODE_ADAPTERS: Record<
  DirectorCandidateStageNode,
  DirectorCandidateNodeAdapter
> = {
  candidate_generation: candidateNodeAdapter({
    nodeKey: "candidate_generation",
    label: "Generate book-level candidates",
  }),
  candidate_refine: candidateNodeAdapter({
    nodeKey: "candidate_refine",
    label: "Revise the candidate direction",
  }),
  candidate_patch: candidateNodeAdapter({
    nodeKey: "candidate_patch",
    label: "Patch the candidate direction",
  }),
  candidate_title_refine: candidateNodeAdapter({
    nodeKey: "candidate_title_refine",
    label: "Refine candidate titles",
  }),
};

export function getDirectorCandidateNodeAdapter(
  nodeKey: DirectorCandidateStageNode,
): DirectorCandidateNodeAdapter {
  return DIRECTOR_CANDIDATE_NODE_ADAPTERS[nodeKey];
}

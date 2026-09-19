import type { DirectorArtifactRef } from "@ai-novel/shared/types/directorRuntime";
import type { NovelWorkflowStage } from "@ai-novel/shared/types/novelWorkflow";

export interface DirectorConfirmNodeAdapter {
  nodeKey: "novel_create";
  label: string;
  targetType: DirectorArtifactRef["targetType"];
  reads: string[];
  writes: string[];
  mayModifyUserContent: boolean;
  requiresApprovalByDefault: boolean;
  supportsAutoRetry: boolean;
  waitingState: {
    stage: NovelWorkflowStage;
    itemKey: "novel_create";
    itemLabel: string;
  };
}

export const DIRECTOR_CONFIRM_NOVEL_CREATE_NODE_ADAPTER: DirectorConfirmNodeAdapter = {
  nodeKey: "novel_create",
  label: "Create the novel project",
  targetType: "global",
  reads: ["candidate_batch", "book_seed"],
  writes: ["novel_project", "director_runtime"],
  mayModifyUserContent: false,
  requiresApprovalByDefault: false,
  supportsAutoRetry: false,
  waitingState: {
    stage: "auto_director",
    itemKey: "novel_create",
    itemLabel: "Waiting to create the novel project",
  },
};

export function getDirectorConfirmNovelCreateNodeAdapter(): DirectorConfirmNodeAdapter {
  return DIRECTOR_CONFIRM_NOVEL_CREATE_NODE_ADAPTER;
}

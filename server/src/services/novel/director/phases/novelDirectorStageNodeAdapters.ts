import type { DirectorArtifactRef } from "@ai-novel/shared/types/directorRuntime";
import type { NovelWorkflowStage } from "@ai-novel/shared/types/novelWorkflow";
import { DIRECTOR_PROGRESS, type DirectorProgressItemKey } from "../projections/novelDirectorProgress";

export type DirectorPlanningStage =
  | "story_macro"
  | "book_contract"
  | "world_setup"
  | "character_setup"
  | "volume_strategy"
  | "structured_outline";

export interface DirectorStageNodeAdapter {
  nodeKey: string;
  label: string;
  targetType: DirectorArtifactRef["targetType"];
  reads: string[];
  writes: string[];
  mayModifyUserContent: boolean;
  requiresApprovalByDefault: boolean;
  supportsAutoRetry: boolean;
  waitingState: {
    stage: NovelWorkflowStage;
    itemKey: DirectorProgressItemKey;
    itemLabel: string;
    progress: number;
  };
}

export const DIRECTOR_STAGE_NODE_ADAPTERS: Record<DirectorPlanningStage, DirectorStageNodeAdapter> = {
  story_macro: {
    nodeKey: "story_macro_phase",
    label: "Generate the story plan",
    targetType: "novel",
    reads: ["book_seed", "candidate_batch"],
    writes: ["story_macro"],
    mayModifyUserContent: true,
    requiresApprovalByDefault: false,
    supportsAutoRetry: false,
    waitingState: {
      stage: "story_macro",
      itemKey: "story_macro",
      itemLabel: "Waiting for confirmation: story planning",
      progress: DIRECTOR_PROGRESS.storyMacro,
    },
  },
  book_contract: {
    nodeKey: "book_contract_phase",
    label: "Generate the book contract",
    targetType: "novel",
    reads: ["story_macro", "book_seed", "candidate_batch"],
    writes: ["book_contract"],
    mayModifyUserContent: true,
    requiresApprovalByDefault: false,
    supportsAutoRetry: false,
    waitingState: {
      stage: "story_macro",
      itemKey: "book_contract",
      itemLabel: "Waiting for confirmation: book contract",
      progress: DIRECTOR_PROGRESS.bookContract,
    },
  },
  world_setup: {
    nodeKey: "world_setup_phase",
    label: "Prepare this book's world",
    targetType: "novel",
    reads: ["story_macro", "book_contract", "book_seed"],
    writes: ["world_skeleton"],
    mayModifyUserContent: true,
    requiresApprovalByDefault: false,
    supportsAutoRetry: false,
    waitingState: {
      stage: "world_setup",
      itemKey: "world_setup",
      itemLabel: "Preparing this book's world",
      progress: DIRECTOR_PROGRESS.worldSetup,
    },
  },
  character_setup: {
    nodeKey: "character_setup_phase",
    label: "Prepare the cast and character assets",
    targetType: "novel",
    reads: ["book_contract", "story_macro"],
    writes: ["character_cast"],
    mayModifyUserContent: true,
    requiresApprovalByDefault: false,
    supportsAutoRetry: false,
    waitingState: {
      stage: "character_setup",
      itemKey: "character_setup",
      itemLabel: "Waiting for confirmation: cast of characters",
      progress: DIRECTOR_PROGRESS.characterSetup,
    },
  },
  volume_strategy: {
    nodeKey: "volume_strategy_phase",
    label: "Generate the volume strategy",
    targetType: "novel",
    reads: ["book_contract", "story_macro", "character_cast"],
    writes: ["volume_strategy"],
    mayModifyUserContent: true,
    requiresApprovalByDefault: false,
    supportsAutoRetry: false,
    waitingState: {
      stage: "volume_strategy",
      itemKey: "volume_strategy",
      itemLabel: "Waiting for confirmation: volume strategy",
      progress: DIRECTOR_PROGRESS.volumeStrategy,
    },
  },
  structured_outline: {
    nodeKey: "structured_outline_phase",
    label: "Generate chapter task sheets",
    targetType: "novel",
    reads: ["volume_strategy", "character_cast"],
    writes: ["chapter_task_sheet"],
    mayModifyUserContent: true,
    requiresApprovalByDefault: false,
    supportsAutoRetry: false,
    waitingState: {
      stage: "structured_outline",
      itemKey: "chapter_detail_bundle",
      itemLabel: "Waiting for confirmation: chapter task sheet",
      progress: DIRECTOR_PROGRESS.chapterDetailStart,
    },
  },
};

export function getDirectorStageNodeAdapter(stage: DirectorPlanningStage): DirectorStageNodeAdapter {
  return DIRECTOR_STAGE_NODE_ADAPTERS[stage];
}

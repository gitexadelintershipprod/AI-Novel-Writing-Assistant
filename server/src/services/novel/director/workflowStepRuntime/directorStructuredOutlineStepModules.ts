import { DIRECTOR_PLANNING_STEP_MODULES } from "./directorPlanningStepModules";
import {
  buildStructuredOutlineStepDescriptor,
  createStructuredOutlineFactModule,
} from "./directorStructuredOutlineStepFactory";
import { DIRECTOR_STRUCTURED_OUTLINE_STEP_IDS } from "./directorWorkflowStepIds";

export const DIRECTOR_STRUCTURED_OUTLINE_STEP_MODULES = {
  beat_sheet: DIRECTOR_PLANNING_STEP_MODULES.structured_outline,
  chapter_list: createStructuredOutlineFactModule({
    step: "chapter_list",
    descriptor: buildStructuredOutlineStepDescriptor({
      id: DIRECTOR_STRUCTURED_OUTLINE_STEP_IDS.chapter_list,
      nodeKey: "volume_chapter_list_generate",
      label: "Generate the chapter list",
      defaultWaitingState: {
        stage: "structured_outline",
        itemKey: "chapter_list",
        itemLabel: "Waiting for the volume chapter list to be ready",
        progress: 0.8,
      },
    }),
  }),
  chapter_detail_bundle: createStructuredOutlineFactModule({
    step: "chapter_detail_bundle",
    descriptor: buildStructuredOutlineStepDescriptor({
      id: DIRECTOR_STRUCTURED_OUTLINE_STEP_IDS.chapter_detail_bundle,
      nodeKey: "volume_chapter_detail_bundle_generate",
      label: "Detail chapter task sheets",
      defaultWaitingState: {
        stage: "structured_outline",
        itemKey: "chapter_detail_bundle",
        itemLabel: "Waiting for chapter task sheets and execution resources to be ready",
        progress: 0.88,
      },
    }),
  }),
} as const;

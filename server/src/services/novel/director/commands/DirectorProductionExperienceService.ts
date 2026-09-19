import type {
  NovelProductionExperience,
  NovelProductionExperienceSelectionResponse,
} from "@ai-novel/shared/types/novelWorkflow";
import { buildFullBookAutopilotExecutionPlan } from "@ai-novel/shared/types/novelDirector";
import { buildFullDirectorAutoApprovalConfig } from "@ai-novel/shared/types/autoDirectorApproval";
import { prisma } from "../../../../db/prisma";
import { AppError } from "../../../../middleware/errorHandler";
import { parseSeedPayload } from "../../workflow/novelWorkflow.shared";
import {
  applyDirectorRunModeContract,
  type DirectorWorkflowSeedPayload,
} from "../runtime/novelDirectorHelpers";
import { DirectorCommandService } from "./DirectorCommandService";

export function parseSelectedExperience(seed: DirectorWorkflowSeedPayload): NovelProductionExperience | null {
  return seed.productionExperience === "simple" || seed.productionExperience === "professional"
    ? seed.productionExperience
    : null;
}

export function buildProductionExperienceSeed(
  seed: DirectorWorkflowSeedPayload,
  experience: NovelProductionExperience,
): DirectorWorkflowSeedPayload {
  const directorInput = seed.directorInput;
  if (!directorInput) {
    throw new AppError("This Auto-Director task is missing the context needed to continue production.", 409);
  }
  const nextInput = applyDirectorRunModeContract({
    ...directorInput,
    runMode: "full_book_autopilot" as const,
    autoExecutionPlan: buildFullBookAutopilotExecutionPlan(),
    autoApproval: buildFullDirectorAutoApprovalConfig(),
  });
  return {
    ...seed,
    productionExperience: experience,
    runMode: nextInput.runMode,
    autoExecutionPlan: nextInput.autoExecutionPlan,
    autoApproval: nextInput.autoApproval,
    directorInput: nextInput,
  };
}

export class DirectorProductionExperienceService {
  constructor(private readonly commandService = new DirectorCommandService()) {}

  async select(
    taskId: string,
    experience: NovelProductionExperience,
  ): Promise<NovelProductionExperienceSelectionResponse> {
    const task = await prisma.novelWorkflowTask.findUnique({ where: { id: taskId } });
    if (!task || task.lane !== "auto_director") {
      throw new AppError("The Auto-Director task does not exist.", 404);
    }
    if (!task.novelId) {
      throw new AppError("The Auto-Director task is not bound to a novel project yet.", 409);
    }

    const seed = parseSeedPayload<DirectorWorkflowSeedPayload>(task.seedPayloadJson) ?? {};
    const selected = parseSelectedExperience(seed);
    if (selected && selected !== experience) {
      const nextSeed = buildProductionExperienceSeed(seed, experience);
      await prisma.$transaction([
        prisma.novelWorkflowTask.update({
          where: { id: task.id },
          data: { seedPayloadJson: JSON.stringify(nextSeed) },
        }),
        prisma.novel.update({
          where: { id: task.novelId },
          data: { creationExperience: experience },
        }),
      ]);
      return {
        experience,
        workflowTaskId: task.id,
        novelId: task.novelId,
        targetRoute: experience === "simple" ? `/novels/${task.novelId}/simple` : `/novels/${task.novelId}/edit`,
        backgroundStarted: task.status === "queued" || task.status === "running",
      };
    }

    if (!selected) {
      if (task.checkpointType !== "production_experience_required") {
        throw new AppError("Auto-Director has not finished pre-draft setup yet.", 409);
      }
      const nextSeed = buildProductionExperienceSeed(seed, experience);

      const claimed = await prisma.$transaction(async (tx) => {
        const updated = await tx.novelWorkflowTask.updateMany({
          where: {
            id: task.id,
            checkpointType: "production_experience_required",
          },
          data: {
            seedPayloadJson: JSON.stringify(nextSeed),
            status: "waiting_approval",
            currentStage: "chapter_execution",
            currentItemKey: "chapter_batch_ready",
            currentItemLabel: "The writing interface is chosen. Ready to start full-book production",
            checkpointType: "chapter_batch_ready",
            checkpointSummary: "Chapter execution resources are ready. AI will start full-book production.",
            pendingManualRecovery: false,
          },
        });
        if (updated.count === 0) {
          return false;
        }
        await tx.novel.update({
          where: { id: task.novelId! },
          data: { creationExperience: experience },
        });
        return true;
      });

      if (!claimed) {
        return this.select(taskId, experience);
      }
    }

    const shouldEnqueue = !selected || (
      task.status === "waiting_approval"
      && task.checkpointType === "chapter_batch_ready"
    );
    const command = shouldEnqueue
      ? await this.commandService.enqueueContinueCommand(task.id, {
        continuationMode: "auto_execute_range",
        forceResume: true,
      })
      : null;
    return {
      experience,
      workflowTaskId: task.id,
      novelId: task.novelId,
      targetRoute: experience === "simple" ? `/novels/${task.novelId}/simple` : `/novels/${task.novelId}/edit`,
      backgroundStarted: true,
      commandId: command?.commandId,
    };
  }
}

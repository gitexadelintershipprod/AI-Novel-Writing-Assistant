import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import type { DirectorStateProposalResolution } from "@ai-novel/shared/types/stateProposalResolution";
import { directorStateProposalResolutionSchema } from "@ai-novel/shared/types/stateProposalResolution";
import type { PromptAsset } from "../../core/promptTypes";
export interface DirectorStateProposalResolutionPromptInput {
    runMode: string;
    novelId: string;
    taskId?: string | null;
    chapterId?: string | null;
    chapterOrder?: number | null;
    proposalsJson: string;
    canonicalStateJson: string;
    protectedContentJson: string;
}
export const directorStateProposalResolutionPrompt: PromptAsset<DirectorStateProposalResolutionPromptInput, DirectorStateProposalResolution> = {
    id: "director.state_proposal_resolution",
    version: "v2",
    taskType: "planner",
    mode: "structured",
    language: "ka",
    contextPolicy: {
        maxTokensBudget: 2600,
        preferredGroups: ["canonical_state", "state_proposals", "protected_content"],
        dropOrder: ["protected_content"],
    },
    outputSchema: directorStateProposalResolutionSchema,
    repairPolicy: { maxAttempts: 1 },
    render: (input) => [
        new SystemMessage([
            "You are the status proposal parser for the novel autodirector.",
            "Your task is to determine whether the pending state proposal should be automatically applied, temporarily archived, trigger re-planning of the current window in the full-book automatic book creation mode, or must be handed over to manual recovery.",
            "Output only strict JSON, no Markdown, paraphrases or extra text.",
            "",
            "\u3010Decision Boundary\u3011",
            "1. information_disclosure: decision=apply when it is credible and does not conflict; decision=defer when it only affects the future and can be archived first.",
            "2. relation_state_update: decision=auto_replan_window when it obviously conflicts with canonical state or will change the commitment of subsequent chapters.",
            "3. character_resource_update: decision=apply when the resource facts are credible and do not conflict; decision=defer when the evidence is insufficient.",
            "4. When it comes to user handwritten protected content, data security, authenticity cannot be determined, or the protected text will be overwritten decision=manual_required.",
            "5. Decision=manual_required must be used when confidence is lower than 0.65.",
            "6. affectedChapterWindow uses the minimum affected range; when it cannot be judged, the current chapter is used.",
            "7. proposalIds can only list the proposal ids that exist in the input.",
            "8. Reason allows novice users to understand why the system handles things this way.",
        ].join("\n")),
        new HumanMessage([
            `Operating mode:${input.runMode}`,
            `Novel ID:${input.novelId}`,
            `Task ID:${input.taskId ?? "None"}`,
            `Current chapter ID:${input.chapterId ?? "None"}`,
            `Current chapter number:${input.chapterOrder ?? "unknown"}`,
            "",
            "[Proposal in Pending Analysis Status]",
            input.proposalsJson,
            "",
            "\u3010canonical state summary\u3011",
            input.canonicalStateJson,
            "",
            "[Protected content boundaries]",
            input.protectedContentJson,
            "",
            "Please output status proposal parsing JSON.",
        ].join("\n")),
    ]
};


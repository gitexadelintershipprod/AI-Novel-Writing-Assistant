import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { z } from "zod";
import type { PromptAsset } from "../../core/promptTypes";
import { snapshotExtractionOutputSchema } from "../../../services/state/stateSchemas";
export interface StateSnapshotPromptInput {
    novelId: string;
    chapterOrder: number;
    chapterTitle: string;
    chapterGoal: string;
    charactersText: string;
    summaryText: string;
    factsText: string;
    timelineText: string;
    previousSummary: string;
    content: string;
}
const STATE_SNAPSHOT_EXAMPLE = {
    summary: "After the end of this chapter, the protagonist has temporarily stabilized the situation, but key misunderstandings and recycling clues continue to ferment.",
    characterStates: [
        {
            characterName: "Lin Qing",
            currentGoal: "First stabilize your identity, then trace the source of the anomaly",
            emotion: "Be alert",
            summary: "Lin Qing confirmed that the danger was approaching and no longer regarded the abnormality as a coincidence.",
        },
    ],
    relationStates: [
        {
            sourceCharacterName: "Lin Qing",
            targetCharacterName: "Su Yu",
            summary: "Lin Qing began to regard Su Yu as someone who could test cooperation.",
        },
    ],
    informationStates: [
        {
            holderType: "reader",
            fact: "Abnormal signals are not hallucinations, but real events with human traces.",
            status: "known",
            summary: "Readers have confirmed that there are human forces behind the anomalies.",
        },
        {
            holderType: "character",
            holderRefName: "Lin Qing",
            fact: "Amelia Su did not tell all the clues she knew.",
            status: "misbelief",
            summary: "Lin Qing mistakenly thought that Su Yu was still dealing with the situation completely passively.",
        },
    ],
    foreshadowStates: [
        {
            title: "Recycle old experiment records",
            summary: "This chapter only completes the foreshadowing, which still needs to be fulfilled later.",
            status: "setup",
        },
    ],
};
export const stateSnapshotPrompt: PromptAsset<StateSnapshotPromptInput, z.infer<typeof snapshotExtractionOutputSchema>> = {
    id: "state.snapshot.extract",
    version: "v5",
    taskType: "summary",
    mode: "structured",
    language: "ka",
    contextPolicy: {
        maxTokensBudget: 0,
    },
    structuredOutputHint: {
        example: STATE_SNAPSHOT_EXAMPLE,
        note: [
            "targetCharacterId, setupChapterId, payoffChapterId must be omitted when stable confirmation cannot be achieved, and do not output null.",
            "Don't make up placeholder IDs like chapter_1, placeholder_chapter_id, etc.",
        ].join(" "),
    },
    outputSchema: snapshotExtractionOutputSchema,
    render: (input) => [
        new SystemMessage([
            "You are a status snapshot extractor for long-form Georgian-language novels.",
            "Your task is to extract the global status snapshot \"after the end of this chapter\" based on the current chapter material, for direct use in subsequent planning, continuation, and consistency verification.",
            "",
            "Output only a valid JSON object, no Markdown, explanations, comments, code blocks, or any extra text.",
            "The top level can only contain: summary, characterStates, relationStates, informationStates, foreshadowStates.",
            "",
            "Global hard rules:",
            "1. All content must be in natural Georgian.",
            "2. It can only be extracted based on the materials provided, and new facts that do not appear in the main text or cannot be stably introduced are not allowed.",
            "3. The output is \"the state after the end of the chapter\", not a plot retelling or summary expansion.",
            "4. When there is insufficient information, it is better to omit this item than to write down speculation as fact.",
            "5. Each field must be consistent and must not conflict with each other.",
            "",
            "Missing citation rules:",
            "1. If targetCharacterId is uncertain, keep targetCharacterName first and omit targetCharacterId directly.",
            "2. If setupChapterId / payoffChapterId cannot be stably confirmed, simply omit the field and do not output null.",
            "3. Do not make up placeholder IDs such as chapter_1, chapter_x, placeholder_chapter_id, etc.",
            "4. If holderType=character and the role ID is unclear, you can use holderRefName to refer to it; when holderType=reader, do not forcibly fill in the role reference.",
            "",
            "Field target:",
            "1. Summary: Briefly describe the overall situation after the end of this chapter.",
            "2. characterStates: Only keep important character states that will continue to affect subsequent creation.",
            "3. relationStates: Only record the relationship states that actually changed in this chapter.",
            "4. informationStates: Only record key information states that will affect the advancement of cognitive differences, misunderstandings, suspense, or conflicts.",
            "5. foreshadowStates: Only records the foreshadowing states in this chapter that are established, strengthened, waiting to be fulfilled, fulfilled or expired.",
            "",
            "Quality requirements:",
            "1. The output should be short, accurate, and stable, and should be read by the service system rather than written as human comments.",
            "2. Do not write summary and each status field as tautology.",
            "3. Prioritize the status changes that will really affect the next chapter or subsequent stages and filter out the noise.",
            "",
            "The output must strictly conform to snapshotExtractionOutputSchema.",
        ].join("\n")),
        new HumanMessage([
            `Novel ID:${input.novelId}`,
            `Chapter: Chapter${input.chapterOrder}Chapter "${input.chapterTitle}》`,
            `Chapter Objectives:${input.chapterGoal}`,
            "",
            "Role list:",
            input.charactersText,
            "",
            "Chapter Summary:",
            input.summaryText,
            "",
            "Facts:",
            input.factsText,
            "",
            "Character timeline:",
            input.timelineText,
            "",
            input.previousSummary || "Preposition status summary: None",
            "",
            "Text:",
            input.content,
            "",
            "Output reminder:",
            "1. There is at most one entry for each character in characterStates.",
            "2. relationStates only retains the relationships that actually changed in this chapter.",
            "3. The holderType of informationStates can only be reader or character; status can only be known or misbelief.",
            "4. The status of foreshadowStates can only be setup, hinted, pending_payoff, paid_off, failed.",
            "5. If you don\u2019t know the targetCharacterId, omit it. Do not write null.",
            "6. If you don\u2019t know setupChapterId / payoffChapterId, omit it. Do not write null or placeholder ID.",
            "7. The summary must describe the global status after the end of this chapter, rather than a process retelling.",
        ].join("\n")),
    ]
};

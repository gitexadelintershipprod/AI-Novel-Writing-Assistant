import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import type { PromptAsset } from "../../../core/promptTypes";
import { NOVEL_PROMPT_BUDGETS } from "../promptBudgetProfiles";
import { chapterEditorWorkspaceDiagnosisSchema, type ChapterEditorWorkspaceDiagnosisParsed, } from "./workspaceDiagnosis.promptSchemas";
export interface ChapterEditorWorkspaceDiagnosisPromptInput {
    chapterTitle: string;
    chapterMission: string;
    volumePositionLabel: string;
    volumePhaseLabel: string;
    paceDirective: string;
    previousChapterBridge: string;
    nextChapterBridge: string;
    activePlotThreads: string[];
    paragraphs: Array<{
        index: number;
        text: string;
    }>;
    openIssues: Array<{
        severity: "low" | "medium" | "high" | "critical";
        auditType: string;
        code: string;
        evidence: string;
        fixSuggestion: string;
    }>;
}
function renderList(title: string, rows: string[]): string {
    return `${title}\n${rows.length > 0 ? rows.join("\n") : "None"}`;
}
export const chapterEditorWorkspaceDiagnosisPrompt: PromptAsset<ChapterEditorWorkspaceDiagnosisPromptInput, ChapterEditorWorkspaceDiagnosisParsed> = {
    id: "novel.chapter_editor.workspace_diagnosis",
    version: "v2",
    taskType: "writer",
    mode: "structured",
    language: "ka",
    contextPolicy: {
        maxTokensBudget: NOVEL_PROMPT_BUDGETS.chapterEditorWorkspaceDiagnosis,
    },
    contextRequirements: [
        { group: "chapter_mission", required: true, priority: 100, sourceHint: "Chapter task shown in the editor workspace." },
        { group: "volume_window", priority: 90, sourceHint: "Volume position and adjacent chapter direction." },
        { group: "open_conflicts", priority: 84, sourceHint: "Active conflicts and unresolved pressure." },
        { group: "participant_subset", priority: 78, sourceHint: "Characters that matter to current edit decisions." },
        { group: "current_draft_excerpt", priority: 72, sourceHint: "Current chapter draft excerpt for diagnosis preview." },
    ],
    outputSchema: chapterEditorWorkspaceDiagnosisSchema,
    structuredOutputHint: {
        mode: "auto",
        note: [
            "Output 1 to 4 question cards that are suitable for beginning writers to work on immediately, and keep only one top priority task.",
            "recommendedAction can only use English enumerations: polish, expand, compress, emotion, conflict.",
        ].join(" "),
    },
    render: (input) => [
        new SystemMessage([
            "You are the editing director on the Georgian-language serial novel chapter editing page.",
            "Your task is to read the chapter's macro positioning, open questions, and paragraph excerpts, and pick out the issues worth addressing first for novice writers.",
            "",
            "Must comply with:",
            "1. For novice writers, the language is direct and do not use internal system tags.",
            "2. The question card must be executable, but recommendedAction can only output English enumeration values: compress (simplified), polish (optimized expression), emotion (strengthened emotion), conflict (strengthened conflict), expand (expanded).",
            "3. Prioritize questions that really affect reading advancement, emotional susceptibility, or the pace of the paper.",
            "4. paragraphStart / paragraphEnd must reference the paragraph number provided; the entire chapter question can be left blank.",
            "5. Do not output any explanation other than the schema.",
            "6. Do not output the Chinese action words themselves; only output the corresponding English enumeration values.",
            "",
            "Recommended logic:",
            "1. If there are obvious pacing, conflict, emotion, or continuity issues, prioritize these issues.",
            "2. Only one recommended task can be retained, and it must be the most worthy task for the user to do first.",
            "3. For the problem card, problemSummary describes the problem itself, and whyItMatters explains why it needs to be changed now.",
        ].join("\n")),
        new HumanMessage([
            `\u3010Chapter\u3011${input.chapterTitle}`,
            `[Tasks in this chapter]${input.chapterMission}`,
            `\u3010Location in volume\u3011${input.volumePositionLabel}`,
            `\u3010Stage positioning\u3011${input.volumePhaseLabel}`,
            `[Rhythm suggestions]${input.paceDirective}`,
            `[Continue from the previous chapter]${input.previousChapterBridge}`,
            `[Pave to the next chapter]${input.nextChapterBridge}`,
            renderList("[Current Main Line/Foreshadowing]", input.activePlotThreads.map((item) => `- ${item}`)),
            "",
            renderList("\u3010Open question\u3011", input.openIssues.map((issue, index) => `- ${index + 1}. [${issue.severity}/${issue.auditType}/${issue.code}] ${issue.evidence};Suggestions:${issue.fixSuggestion}`)),
            "",
            renderList("[Excerpt from passage]", input.paragraphs.map((paragraph) => `- P${paragraph.index}: ${paragraph.text}`)),
            "",
            "[Minimum legal example]",
            "{\"cards\":[{\"title\":\"Slow pace\",\"problemSummary\":\"Too much static description in the middle.\",\"whyItMatters\":\"It will slow down the reader into the main conflict.\",\"recommendedAction\":\"compress\",\"recommendedScope\":\"selection\",\"paragraphStart\":12,\"paragraphEnd\":18,\"severity\":\"med ium\",\"sourceTags\":[\"Rhythm\"]}],\"recommendedTask\":{\"title\":\"Compress the static description in the middle first\",\"summary\":\"Prioritize deleting repeated daily descriptions so that conflicts can arise earlier.\",\"recommendedAction\":\"compress\",\"recommendedScope\":\"selection\",\"paragraphStart\":12,\"paragraphEnd\":18}}",
            "",
            "Please return JSON only.",
        ].join("\n")),
    ]
};

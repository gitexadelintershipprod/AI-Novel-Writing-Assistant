import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { z } from "zod";
import type { PromptAsset } from "../../core/promptTypes";
import { payoffLedgerSyncOutputSchema } from "./payoffLedgerSync.promptSchemas";
const PAYOFF_LEDGER_SYNC_EXAMPLE = {
    items: [
        {
            ledgerKey: "system_hidden_rules",
            title: "System hidden rules surfaced",
            summary: "The protagonist confirms for the first time that the hidden rules really exist, and must continue to advance and realize their costs.",
            scopeType: "book",
            currentStatus: "setup",
            targetStartChapterOrder: 3,
            targetEndChapterOrder: 40,
            firstSeenChapterOrder: 3,
            lastTouchedChapterOrder: 9,
            setupChapterOrder: 3,
            sourceRefs: [
                {
                    kind: "major_payoff",
                    refLabel: "The first time I saw a system exception prompt",
                    chapterOrder: 3,
                    volumeSortOrder: 1,
                },
            ],
            evidence: [
                {
                    summary: "In Chapter 3, it is clear that abnormal prompts appear and affect the protagonist's judgment.",
                    chapterOrder: 3,
                },
            ],
            riskSignals: [
                {
                    code: "payoff_missing_progress",
                    severity: "medium",
                    summary: "It has entered a stage that should be continued, but there is still a lack of new touch actions in the future.",
                },
            ],
            statusReason: "The core foundation has been established, but the clear redemption window has not yet entered.",
            confidence: 0.82,
        },
    ],
};
export interface PayoffLedgerSyncPromptInput {
    novelTitle: string;
    bookContractPayoffs?: Array<{
        refId: string;
        refLabel: string;
        payoff: string;
        targetStartChapterOrder: number;
        targetEndChapterOrder: number;
    }>;
    activeVolumeSummary: string;
    latestChapterContext: string;
    majorPayoffsText: string;
    openPayoffsText: string;
    chapterPayoffRefsText: string;
    foreshadowStatesText: string;
    payoffConflictsText: string;
    payoffAuditIssuesText: string;
}
export const payoffLedgerSyncPrompt: PromptAsset<PayoffLedgerSyncPromptInput, z.infer<typeof payoffLedgerSyncOutputSchema>> = {
    id: "novel.payoff_ledger.sync",
    version: "v7",
    taskType: "planner",
    mode: "structured",
    language: "ka",
    contextPolicy: {
        maxTokensBudget: 0,
    },
    semanticRetryPolicy: {
        maxAttempts: 1,
    },
    structuredOutputHint: {
        example: PAYOFF_LEDGER_SYNC_EXAMPLE,
        note: [
            "sourceRefs, evidence, riskSignals must always be arrays.",
            "sourceRefs.kind can only be major_payoff, volume_open_payoff, chapter_payoff_ref, foreshadow_state, open_conflict, audit_issue.",
            "Disable output of old aliases chapter_payoff or volume_open.",
            "scopeType can only be book, volume, chapter.",
            "Confidence can only be a 0-1 number; omit it if you are not sure.",
        ].join(" "),
    },
    outputSchema: payoffLedgerSyncOutputSchema,
    render: (input) => [
        new SystemMessage([
            "You are the novel foreshadowing ledger synchronizer, responsible for converging the foreshadowing, redemption arrangements, redemption evidence and abnormal signals from multiple sources into a single canonical payoff ledger.",
            "The product serves novice writers, so your output must be stable, executable, and easy for subsequent system planning, rather than writing a long analysis.",
            "",
            "Output only a valid JSON object, no Markdown, explanations, comments, or any extra text.",
            "The top-level fixed format can only be {\"items\":[...]}.",
            "",
            "Hard field constraints:",
            "1. sourceRefs.kind can only be: major_payoff, volume_open_payoff, chapter_payoff_ref, foreshadow_state, open_conflict, audit_issue.",
            "2. Do not export the old aliases chapter_payoff or volume_open.",
            "3. scopeType can only be: book, volume, chapter.",
            "4. Confidence is not required; only write it when you are clearly confident, and it must be a number from 0-1.",
            "5. sourceRefs, evidence, and riskSignals must output arrays even if there is only one item, and cannot output objects or strings.",
            "",
            "Mission objectives:",
            "1. Consolidate major payoffs, open payoffs, chapter payoff refs, foreshadow states, open conflicts and payoff audit issues into unique ledger items.",
            "2. Avoid splitting synonymous duplicate items into multiple ledger items, and do not forcibly merge obviously different foreshadowings.",
            "3. Ledger items must be conservative and stable, and new plots that do not exist in the input cannot be fabricated.",
            "",
            "Status definition:",
            "- setup: Just established, no clear redemption window has been formed yet.",
            "- hinted: There has been a foreshadowing, but it has not yet entered the stage of clear implementation.",
            "- pending_payoff: It has entered a stage that should be followed up, is about to be cashed out, or is being advanced.",
            "- paid_off: Has been explicitly honored.",
            "- failed: has been clearly invalidated, invalidated or overturned.",
            "- Overdue: It has exceeded the reasonable target window and has not yet been fulfilled, and must be reminded by the system.",
            "",
            "Chapter positioning rules:",
            "1. Return to setupChapterOrder / payoffChapterOrder first.",
            "2. Fill in setupChapterId / payoffChapterId only when the verifiable real chapterId clearly appears in the input.",
            "3. Do not make up chapterId; if you are unsure about returning chapterOrder on time, do not make up ID.",
            "",
            "Compressed output rules:",
            "1. sourceRefs only retains the strongest 0-4 sources; Book Contract fixed sources must not be lost during compression.",
            "2. Evidence Only retain the most critical 0-1 pieces of evidence.",
            "3. riskSignals is only filled in when there is a real risk, and a maximum of 2 entries are retained.",
            "4. statusReason Use a short sentence to explain the basis for judging the current status, do not write a long paragraph.",
            "",
            "Judgment principles:",
            "0. Book Contract Chapter 3/10/30 The reward is a stable book-level commitment. Each non-empty source must appear in an account's sourceRefs, kind=major_payoff, and the refId must be left intact; merging with other promises with the same semantics is allowed, but the source must not be omitted or its cutoff relaxed.",
            "1. Major payoffs is a book-level prompt source, but it is only allowed to enter pending_payoff or overdue after being mapped to the volume/chapter window.",
            "2. If the same canonical payoff has both a volume-level window and a chapter window, the chapter window will be the stronger constraint.",
            "3. If there is clear evidence of redemption, it should be marked as paid_off first.",
            "4. If you cash out without sufficient preparation, keep the item and output a risk signal.",
            "5. If the clear target window has passed and has not yet been fulfilled, mark it as overdue; when there is no targetStartChapterOrder / targetEndChapterOrder / payoffChapterOrder / payoffChapterId, do not mark it as overdue. You can only use pending_payoff plus riskSignals to remind you.",
            "6. If there are only hints and foreshadowing in the input without clear evidence of fulfillment, do not misjudge it as paid_off.",
            "",
            "The output must strictly conform to payoffLedgerSyncOutputSchema.",
        ].join("\n")),
        new HumanMessage([
            `Novel title:${input.novelTitle}`,
            "",
            "Book Contract stage returns (stable book-level source):",
            (input.bookContractPayoffs ?? []).length > 0
                ? (input.bookContractPayoffs ?? []).map((item) => (`${item.refLabel} | refId=${item.refId} | target window =${item.targetStartChapterOrder}-${item.targetEndChapterOrder} | Commitment =${item.payoff}`)).join("\n")
                : "None",
            "",
            "Currently active volume and chapter windows:",
            input.activeVolumeSummary,
            "",
            "Recent chapter context:",
            input.latestChapterContext,
            "",
            "Book-level major payoffs:",
            input.majorPayoffsText,
            "",
            "Current volume open payoffs:",
            input.openPayoffsText,
            "",
            "Current volume chapter payoff refs:",
            input.chapterPayoffRefsText,
            "",
            "Latest foreshadow states:",
            input.foreshadowStatesText,
            "",
            "Related open conflicts:",
            input.payoffConflictsText,
            "",
            "Recent payoff review questions:",
            input.payoffAuditIssuesText,
            "",
            "Output reminder:",
            "1. Kind can only be used in specified enumerations, chapter_payoff / volume_open is prohibited.",
            "2. If confidence is filled in, it must be a number, not a string.",
            "3. scopeType can only be book, volume, chapter.",
        ].join("\n")),
    ],
    postValidate: (output, input) => {
        const ledgerKeySet = new Set<string>();
        for (const item of output.items) {
            if (ledgerKeySet.has(item.ledgerKey)) {
                throw new Error(`Duplicate ledgerKey:${item.ledgerKey}`);
            }
            ledgerKeySet.add(item.ledgerKey);
            if (item.targetStartChapterOrder
                && item.targetEndChapterOrder
                && item.targetStartChapterOrder > item.targetEndChapterOrder) {
                throw new Error(`Foreshadowing ${item.ledgerKey} The target chapter window is illegal.`);
            }
            if (item.currentStatus === "paid_off" && !item.payoffChapterId && item.payoffChapterOrder == null) {
                throw new Error(`Foreshadowing ${item.ledgerKey} Must return payoffChapterOrder or payoffChapterId when redeemed.`);
            }
        }
        for (const requiredSource of input?.bookContractPayoffs ?? []) {
            const coveringItem = output.items.find((item) => item.sourceRefs.some((source) => (source.kind === "major_payoff" && source.refId === requiredSource.refId)));
            if (!coveringItem) {
                throw new Error(`Missing Book Contract commitment source:${requiredSource.refId}`);
            }
            if (coveringItem.scopeType !== "book"
                || coveringItem.targetEndChapterOrder == null
                || coveringItem.targetEndChapterOrder > requiredSource.targetEndChapterOrder) {
                throw new Error(`Book Contract Commitment ${requiredSource.refId} Must maintain book level scope and no later than ${requiredSource.targetEndChapterOrder} Chapter deadline window.`);
            }
        }
        return output;
    }
};

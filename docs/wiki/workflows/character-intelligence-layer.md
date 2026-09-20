# Character intelligence layer: mind-line MVP

## Background

In long-form writing, character profiles, relationships, resources, and chapter state can constrain what a character can do, but they are not enough to stably express what the character believes happened and how they intend to act. If that layer stays only in the author's head, chapter generation tends to write characters as plot tools that merely react to story progress. If AI inferences are written into state as facts, they pollute the novel's canonical history.

This module provides a readable, traceable character mind-line that can be injected into prose. It first helps beginners understand a character's current choices, then acts as soft behavioral guidance for the prose. It does not require the author to maintain a complex inner-life form.

## Decision

`CharacterMindSnapshot` is a historical snapshot of a character's subjective state. It is not Canonical State, and it does not enter `StateChangeProposal`.

Each snapshot records only:

- current understanding, private intent, action plan, emotional stance, action tendency under pressure, and decision trigger conditions;
- judgments the character currently believes, including possible misreads;
- inference evidence, confidence, source chapter, and source type.

In a given novel, each character has exactly one snapshot with `isCurrent=true`. On refresh or chapter incremental write, the transaction archives the old current snapshot first, then writes the new current snapshot. History exists so later readers can trace which evidence the AI used for that judgment.

## Three-Layer Boundary

| Layer | Owns | May directly constrain prose | Write path |
| --- | --- | --- | --- |
| Canonical fact layer | Identity, faction, location, resources, state, information boundary, events that happened | Yes; hard constraint | Existing character, state snapshot, resource ledger, information boundary, and fact ledger |
| Character subjective layer | Understanding, intent, plan, emotion, judgment and misread | Soft guidance only; must not overturn hard constraints | `CharacterMindSnapshot` |
| Later speculation draft layer | IF lines, multi-option relationships, influence previews, author intervention candidates | No, unless the user explicitly confirms into the matching canonical flow | Independent draft assets in later phases |

Example: "the guard is working overtime patrol" is confirmed canonical fact. "the character believes the guard still rotates on the old shift" is a subjective misread. "if the character sneaks in early, a chase may trigger" is speculation draft. The three must not be written as the same kind of record.

## Generation And Update Rules

### Initial prepare and manual refresh

After roster confirmation, core characters, relationships, and dynamics persist as usual. The system asynchronously prepares the initial mind-line through registered PromptAsset `novel.character.mind.snapshot@v1`. Supplemental characters prepare only for newly added characters. The author can request a refresh on a single character page, but the request does not accept free text, so beginners are not pulled back into a complex character-edit form.

Auto-Director may wait once for initial prepare when applying a roster. On failure, record a visible warning and continue the full-book production chain. Background prepare failure after a manual roster apply must also not block continued editing.

The Prompt may infer only from assembled canonical history, relationships, and recent chapter material, and must supply evidence and confidence. Structured output is handled by the PromptAsset schema and repair chain. Do not backstop product behavior with keywords or regex.

### Post-chapter update

`novel.chapter.artifact_delta.extract@v1` is the sole owner of character mind-line updates after a chapter is finalized. In the existing single chapter-asset extraction call it outputs at most four `characterMindDeltas`, and only when the prose clearly changes the character's cognition, emotion, intent, plan, misread, or action choice.

`ChapterArtifactDeltaService` merges matching deltas into a new snapshot directly. Do not add a second post-chapter LLM chain. If nothing relevant changed, do not write an empty snapshot; keep the existing current mind-line.

## Chapter Context Contract

`GenerationContextPackage.characterMindStates` loads current snapshots only. `ChapterWriteContext` converts compact content for characters who actually participate in this chapter into `mindGuidance`, covering at most situation understanding, preferred action, pressure reaction, and possible misread.

The prose Prompt must treat this as "character subjective tendency (not objective fact)". `character_hard_facts` remains a required hard constraint. Chapter generation must run normally when there is no mind-line. The writer must not present character guesses, misreads, or hidden intent as narrator-confirmed objective truth.

## Product Surface

The intelligence layer on the character asset console shows how the character currently understands the situation, what they want to do, what they care about most, what they may misread, and how they act under pressure, plus source, evidence, and confidence. The page must state clearly: this is an AI inference and does not automatically rewrite canonical novel history.

The mind-line is the cognitive base for character conversation: the author can talk naturally with the character on the character page, but the character must stay bounded by this subjective state and canonical facts. The character must not degrade into a general-purpose assistant that obeys instructions. Soft influence that settles out of conversation must be confirmed by the author in one click before it enters later chapter context. It also must not auto-rewrite canonical facts.

Relationship multi-path speculation and IF speculation remain independent draft capabilities and must not be mixed into character conversation.

## Failure Modes

- Writing a character misread into the state snapshot or fact ledger turns an error into book-level fact.
- Psychological judgments without evidence let the AI invent secrets to fill setting gaps.
- Injecting mind-lines for every character inflates context and lets non-participants steal scenes; inject only actual participants.
- Escalating initial-prepare failure into Auto-Director failure incorrectly stops a production chain that can continue.
- Adding a separate post-chapter model call produces two conflicting character-state sets for the same chapter.

## Related Modules

- `server/src/services/novel/characterMind/`
- `server/src/services/novel/runtime/ChapterArtifactDeltaService.ts`
- `server/src/services/novel/runtime/GenerationContextAssembler.ts`
- `server/src/prompting/prompts/novel/characterMind.prompts.ts`
- `server/src/prompting/prompts/novel/chapterArtifactDelta.prompts.ts`
- `server/src/prompting/prompts/novel/chapterLayeredContext*.ts`
- `client/src/pages/novels/components/characterWorkspace/CharacterIntelligenceTab.tsx`

## Source Documents

- [Chapter production chain](./chapter-production-chain.md)
- [Novel fact ledger](./novel-fact-ledger.md)
- [Narrative engine studio](../product/narrative-engine-studio.md)

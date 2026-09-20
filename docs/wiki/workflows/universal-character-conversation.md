# Universal character subjects and cross-source conversation

## Background

Novel characters, base-library characters, and book-analysis characters all need to be understood and spoken with by the author, but their fact sources differ. Implementing chat, context, and memory separately for each kind of character would duplicate capability growth. Forcing them into one canonical profile would let source evidence, cross-book templates, and novel runtime state contaminate each other.

## Decision

Character conversation is unified through `CharacterSubjectRef` and `CharacterSubjectProjection`. What is unified is the interaction protocol, not a shared domain fact table. Each source Adapter projects authorized source material into identity, current context, hard bounds, subjective state, evidence, and interaction policy. The session module must not mix-write data from different sources.

| Subject source | Interaction policy | What it may affect |
| --- | --- | --- |
| Novel character | `novel_influence` | After author confirmation, soft prose guidance inside a limited chapter window. |
| Base character library | `read_only` | Helps understand a stable personality only. Must not modify the template or any novel. |
| Book-analysis character | `evidence_interview` | Helps understand the source-work person only. Must not modify the source text, analysis conclusions, or novel prose. |

`drama_character` is reserved as a protocol extension slot. Do not open an entry until there is an explicit project context and write boundary.

## Current Rule

- The shared session records subject reference, scope, source snapshot, interaction policy, chapter anchor, turn evidence, and uncertainty notes.
- Book-analysis characters must choose a chapter anchor. They may only read evidence that has a chapter number and is not later than that anchor. When evidence is insufficient, the character should say they cannot confirm. They must not invent source-work secrets, motives, or later plot.
- Appearance snapshots for book-analysis characters are chapter-by-chapter source evidence. When the base character file lacks a reliable chapter anchor, a snapshot may serve as interview anchor and evidence source. Snapshots must carry evidence; generated images or summaries alone must not enter the interview.
- Session history for base-library and book-analysis characters may be saved, but the dialogue itself is not a template update, character sync, or state proposal.
- Novel characters keep the existing influence confirmation, prose injection, and `artifact_delta` uptake chain. Other subjects must not produce `influenceDraft`.
- Same-named characters are not automatically the same character. Session memory across books, the character library, and book analysis must be isolated by subject scope.
- Old novel character dialogue sessions map onto shared sessions through an idempotent mirror, keeping original records and the influence chain. Migration does not delete historical tables.

## Failure Modes

- Writing book-analysis inferences back into the source text or a new novel's canonical history breaks the source boundary.
- Letting base-library dialogue auto-update a template treats one exploration as stable setting.
- Letting a book-analysis character use post-anchor evidence leaks later plot to the author.
- Letting non-novel subject dialogue enter writer context pollutes the current chapter with research and template material.
- Sharing sessions or memory by character name falsely merges same-named people from different works.

## Related Modules

- `server/src/services/characterConversation/`
- `server/src/prompting/prompts/character/characterConversation.prompts.ts`
- `server/src/services/novel/characterDialogue/`
- `server/src/services/bookAnalysis/bookAnalysisCharacter/`
- `client/src/components/characterConversation/`

## Source Documents

- [Character dialogue layer](./character-dialogue-layer.md)
- [Book analysis workflow](./book-analysis-workflow.md)
- [Narrative engine studio](../product/narrative-engine-studio.md)

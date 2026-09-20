# Character continuity and hard-facts diagnosis

## Background

Chapter continuity problems are not all timeline problems. A timeline can constrain event order, chapter hooks, and story-internal time, but a character’s identity, camp, realm, current location, and actionable state belong to a character fact source. If those facts are not stably generated during character prep and do not enter writer context before prose generation, post-audit can only find the error. It cannot keep the error out of the first draft.

Typical appearances:

- `personality / background / development` in the full character setting stay empty for a long time, so the character can only enter later planning as a function slot or a short description.
- Character camp or identity labels are missing, and prose writes “Shen Gongbao, disciple of Chan Jiao” as “an outer Jie Jiao disciple”.
- Character realm or combat power is missing, and prose writes “Zhao Gongming, a Daluo Golden Immortal” as “late True Immortal”.
- Existing character state never entered pre-generation constraints, so prose has to fall back on audit or repair.

## Decision

Empty fields in the full character setting are not missing database columns. The `Character` table already has `personality / background / development`, but the structured output and persist path for the core cast did not require or save those three. The supporting-character path already had similar fields, so the two character entries were structurally inconsistent.

Camp and realm errors should also not be blamed on the timeline. The timeline only knows whether an event happened and whether a hook was taken up. It cannot naturally judge “does Shen Gongbao belong to Chan Jiao or Jie Jiao” or “what is Zhao Gongming’s current realm”. Those must enter the character library and writer required context as character hard facts.

## Current Rule

- Core cast and supporting characters should emit the same dossier fields: `personality / background / development`.
- Character hard facts include at least: `identityLabel`, `factionLabel`, `stanceLabel`, `powerLevel`, `realm`, `currentLocation`, `availability`, `prohibitions`.
- Character hard facts are writing constraints. They do not replace `CharacterTimeline`, `CharacterDynamics`, `StoryStateSnapshot`, or the timeline module.
- `participant_subset` only carries a soft character brief and a summary of currently participating characters. It does not carry inviolable fact constraints.
- Writer must carry `character_hard_facts` required context. The block must exist even when empty. The empty state must explicitly say not to invent a rewrite of identity, camp, realm, location, or action availability.
- Character visible-profile materials are visual character assets that should be completed before prose, including `appearance / physique / attireStyle / signatureDetail / voiceTexture / presenceImpression`. When auto-applying a character cast, if those fields are empty, complete them with the LLM settings chosen on the current task or current page. Do not fall back to an unconfigured or unstable default-model path.
- When an old character already has human-edited content, auto-applying a character cast may only fill empty fields. It must not overwrite a user-filled dossier or hard facts.
- Audit remains a post-detection and repair input. It cannot become the primary source of character facts.

## Examples

Diagnosis path:

1. First check whether `personality / background / development` are empty in the character library. If core characters are empty and supporting characters are not, look at the character-cast schema and `applyCharacterCastOption()` first.
2. Then check whether character hard facts entered runtime context. Focus on `GenerationContextPackage.characterHardFacts` and `character_hard_facts` in writer blocks.
3. If prose has a camp or realm error, first decide whether the character library has the matching hard fact. If not, fix the character-prep chain. If it does but the writer did not receive it, fix context assembly.
4. If the writer received the hard facts and still wrote them wrong, then enter audit, repair-prompt, or model-adherence diagnosis.
5. If the character-edit page visible profile stays at “to complete” for a long time, first use the current task model to trigger single-character or batch completion and verify prompt capability. If manual generate works but auto-apply still leaves them empty, first check whether the character-cast apply path passed `provider / model / temperature` into the visible-profile completion service.

## Failure Modes

- Detecting “camp wrong” only at audit, while writer input has no camp fact: first drafts keep making the same error.
- Putting camp only on `character_dynamics`: a dynamic projection may be empty or clipped, and cannot carry a hard constraint.
- Depending only on timeline state: a timeline can find event-order mistakes, but it cannot stably infer which camp a character belongs to or their cultivation tier.
- Auto-applying a character cast without the current LLM settings: visible-profile completion takes the default-model path, which may look like a long-waiting task or still-empty persist.
- Auto-applying a character cast overwrites human edits: that destroys character setting the user already corrected.

## Related Modules

- `server/src/prompting/prompts/novel/characterPreparation.*`
- `server/src/services/novel/characterPrep/`
- `server/src/services/novel/characterProfile/CharacterVisibleProfileService.ts`
- `server/src/services/novel/characters/characterHardFacts.ts`
- `server/src/services/novel/runtime/GenerationContextAssembler.ts`
- `server/src/prompting/prompts/novel/chapterLayeredContext.ts`
- `server/src/prompting/prompts/novel/chapterWriter.prompts.ts`
- `server/src/modules/timeline/`

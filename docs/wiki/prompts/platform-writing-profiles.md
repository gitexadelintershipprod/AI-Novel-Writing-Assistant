# Platform writing profiles and the editable prose-prompt contract

## Background

“Male-oriented / female-oriented / general” can only express a rough reader lean. They cannot replace a concrete platform’s reading scene and content pacing. The same genre aimed at different platforms can differ in how fast the opening enters conflict, how much information is explained, paragraph length, dialogue share, payoff density, relationship-line weight, per-chapter return, and ending pull.

One generic prose prompt easily produces drafts that are “structurally correct but unlike the target platform”. Copying a whole independent prompt set per platform lets continuity, safety bounds, the prose contract, and repair rules drift over time.

## Decision

Prose production uses a layered structure: unified production contract + work-form contract + platform writing profile + this-book writing style + current mission context.

Platform differences should mainly land as versioned, previewable, testable platform writing profiles. Do not stack branches in the service from platform strings, and do not copy the whole prose production chain. Split an independent PromptAsset only when the platform requires a different work form, output structure, or production workflow.

All new product prompts default into the Prompt Registry and the prompt-management catalog first. Prompts that generate novel, short-story, or other narrative prose must support both basic editing and advanced template editing.

## Current Rule

### Prompt management

- Delivery of a new product prompt is more than “registered in code”. It must be searchable in prompt management, show versions, preview real context, and run a controlled test. Until those conditions are met, it is not onboarded.
- High-risk structured prompts such as review, planning, and extraction may open only safe slots. Schema, contextPolicy, required context, postValidate, repair, and approval bounds stay read-only.
- Prose-generation prompts must provide two edit levels:
  - **Basic editing**: open low-risk slots such as tone, pacing, paragraphs, dialogue, description, hooks, and forbidden leans.
  - **Advanced editing**: allow System / Human template editing in an explicit work scope, with context-token insert, preview, test, version notes, save new version, rollback, and restore official template.
- Advanced templates cannot remove the character hard facts, chapter or segment mission, continuity, world rules, platform writing, and style contract that prose needs. If the template does not explicitly reference required context, runtime must append fallback context.
- Advanced editing for prose prompts must not keep depending on the frontend recognizing one fixed Prompt ID. The PromptAsset or prompt-catalog projection should declare capabilities such as `proseGeneration`, `slotEditable`, `advancedTemplate`, allowed scopes, and required context. The workbench renders from those capabilities.
- `novel.chapter.writer` and `novel.short_story.segment.write` are both prose-generation prompts and should obey the same edit contract. Short-story internal segments are not shown as chapters in the UI, but they are still generation units of continuous prose and must not be excluded from prose-prompt management.

### Platform writing profiles

- “Reader channel” and “target platform” are different dimensions. Reader channel describes core readers and emotional center of gravity. Target platform describes reading scene, business model, content packaging, and pacing convention. Both allow AI recommendation and user override.
- Platform recommendation must complete through registered AI structured understanding, and return the recommended platform writing profile, adaptation reason, main changes, and alternatives. Hard-coded routing from genre keywords or platform names is not allowed.
- A platform writing profile should at least describe:
  - how many words into the opening before pressure, anomaly, desire, or conflict;
  - information-explanation volume and world-view unfold speed;
  - recommended density of scene switches, conflict, and payoff;
  - relative weight of dialogue, action, interiority, and environment description;
  - mobile-reading paragraph length and sentence lean;
  - priority of relationship, emotion, growth, or mystery lines;
  - stage payoff for a chapter or short-story segment;
  - end-of-chapter pull or a complete short-story ending;
  - common platform-mismatch writing to avoid.
- Platform writing profiles only control expression and reader experience. They cannot rewrite character hard facts, world rules, confirmed plot, chapter duty, or the short-story ending promise.
- When the user chooses an advanced template, platform writing is still formal context. The user may adjust placement and expression through explicit tokens, but the platform contract must not disappear without a signal.
- The goal is not to imitate a specific author or reproduce protected text. Platform profiles describe observable content mechanics and reading experience. They do not store author originals and do not ask the model to copy a distinctive style.

## Recommended assembly order

1. Unified prose production contract: fact protection, continuity, safety bounds, and output shape.
2. Work-form contract: long-form serial chapter or continuous short-story segment.
3. Platform writing profile: pacing, payoff, paragraph, and pull rules for the target platform.
4. This-book writing style: genre temperament, narrative point of view, user-confirmed preferences, and writing assets.
5. Current mission: chapter / segment goal, previous-text handoff, what must advance, and what must be kept.
6. User template override: final message organization, while the required context above remains available.

When a platform profile conflicts with this-book writing style, protect facts and the mission contract first, then let AI produce an explainable adaptation between platform experience and this-book temperament. Do not quietly erase a user-confirmed writing style with a fixed priority.

## First platforms and scope

- Fanqie free web novel: long form and short form; fast entry, mobile short paragraphs, high conflict, and clear payoff.
- Qidian male-oriented: long form; growth goals, resource and ability change, stable upgrade, and setup payoff.
- Jinjiang female-oriented: long form; character relations, emotional causality, character voice, and relation-state change.
- Zhihu short stories: short form; high-concept opening, information gap, continuous reveal, and a complete ending.

When no platform is chosen, a registered structured AI prompt recommends one and explains why. The user only adopts or switches. Platform support range is deterministic validation. Platform choice itself must not be done with keywords or genre regex.

## Versioning and work snapshots

- Official platform writing lives in the code registry as a recoverable trusted baseline.
- Each save of a custom platform writing profile creates an immutable version. Enabling a historical version only switches the active version. Restoring official writing does not delete history.
- When a novel confirms a platform, it must save the platform key, configuration version, and a full guidance snapshot. Later upgrades to the global platform configuration must not silently change existing works.
- Switching platform on an existing work only affects later planning, prose, review, repair, and AI revision. It does not automatically rewrite already-finished prose.
- Switching is forbidden while a production task is running or waiting for confirm, so one task does not mix two platform contracts.
- Old novels without a platform snapshot keep using the generic commercial web-novel contract. A migration script must not force-classify them.

## Prose context contract

- Long-form chapter prose must include `writing_platform` required context, assembled together with the book contract, chapter mission, reader experience, character hard facts, obligation contract, and style contract.
- Short-story prose must include five required contexts: `creation_intent`, `short_story_plan`, `short_story_continuity`, `writing_platform`, and `book_style`.
- A short-story advanced template may reorder that context, but structured runtime always appends the output contract after template compile, and the schema still requires `content` and `continuitySummary`.
- When Prompt Workbench selects a short story, preview uses one internal segment to assemble real context. Internal segments are only for technical preview. Ordinary short-story studio still shows a continuous work.

## Failure Modes

- The draft is structurally complete but “does not feel like the wanted platform”: check whether the platform writing profile entered the prose runtime context, and whether evaluation only verified schema and length without verifying platform experience.
- Copying a whole writer service for a new platform: fact protection, continuity, and the repair chain will drift. Prefer adding a platform writing profile and evaluation samples.
- Only adding a platform dropdown: if the prose prompt, plan, review, and repair never consume the platform contract, the choice is a dead setting.
- Using “male-oriented / female-oriented” instead of a platform: the same reader channel can still have completely different pacing, length, and payoff structure on different platforms.
- Platform style disappears after an advanced template is enabled: check whether platform context is required context, and whether runtime appends a fallback when the template is missing the token.
- A new prose prompt appears in the Registry but cannot be edited: call governance is done, but the user-facing prompt-management contract is not.

## Related Modules

- `server/src/prompting/`
- `server/src/prompting/core/promptTypes.ts`
- `server/src/prompting/templates/`
- `server/src/prompting/prompts/novel/chapterWriter.prompts.ts`
- `server/src/prompting/prompts/shortStory/shortStory.prompts.ts`
- `client/src/pages/promptWorkbench/`
- `shared/types/novelDirector.ts`

## Source Documents

- [Prompt Registry and structured output](./prompt-registry-and-structured-output.md)
- [Beginner-first full-novel completion](../product/beginner-first-novel-completion.md)

# Character dialogue layer: carry author intent through character agency

## Background

What an author needs while creating is not a set of "make the character do A/B/C" options, but a space to talk with the character and probe their real stance. Multiple-choice proposals reduce the character to a plot configuration item: once the author picks the behavior, the character's desire, fear, misread, and resistance stop mattering.

The character dialogue layer keeps the exchange as natural-language conversation and uses the character mind-line as the subjective basis for replies. It serves creation. It is not general chat, and it is not a shortcut editor for canonical history.

Novel character dialogue is the `novel_influence` subject in the project-level universal character conversation protocol. Base-library characters and book-analysis characters reuse the same conversation experience, but they run under read-only and source-evidence bounds respectively. See [Universal character conversation](./universal-character-conversation.md).

## Decision

Each character keeps an independent `CharacterDialogueSession` and turn records. The author can speak naturally, follow up, persuade, or challenge. The character replies in their own identity and may refuse, misunderstand, conceal, counter-question, or stay silent. Author messages are not facts, and they are not plot commands that must be executed.

One dialogue turn may settle at most one `CharacterDialogueInfluence` draft. It describes a subjective action tendency the character may form, strengthen, or loosen after this exchange. The author can one-click choose to carry it into later writing, without picking among multiple AI options. Unconfirmed drafts do not enter prose context.

## Current Rule

| Content | Boundary |
| --- | --- |
| Character dialogue | Non-canonical creation process. Bounded by mind-line, hard facts, relationships, resources, and information boundary. |
| Dialogue influence | Limited chapter soft guidance after author confirmation. Must not override `character_hard_facts`. |
| Canonical facts | Confirmed only by the existing chapter production and state chain. Dialogue cannot edit them directly. |

An activated influence defaults to covering three chapters starting from the next unfinished chapter. Overlapping active influences for the same character keep only the newest; older ones are marked `superseded`. If prose does not take them up, they remain until the window ends and are then marked `expired`. These states must never block chapters, Auto-Director, or full-book replan.

## Chapter Contract

`GenerationContextPackage.characterDialogueGuidances` injects only influences that are all of: activated, chapter number inside the window, and target character actually participating in this chapter. The writer must treat this as "a soft behavioral tendency confirmed after author-character dialogue", not objective fact or a plot command.

Post-chapter uptake belongs only to `novel.chapter.artifact_delta.extract@v1`. It outputs `characterDialogueInfluenceResolutions`. `ChapterArtifactDeltaService` validates influence ID, status, and window, then marks `applied` and records prose evidence. Do not add a second post-chapter LLM chain for character dialogue.

## Product Surface

The intelligence layer on the character page is organized as "dialogue main stage + character scene analyzer". It should not lay out mind-line, evidence, beliefs, and misreads in form order.

- The main stage holds character messages, author input, and dialogue-influence confirmation. It is the only primary task area for completing one creative exchange.
- The scene analyzer sits beside the dialogue. By default it shows only situation understanding, conversation focus, possible misread, and pressure reaction, so the author can see why the character replied that way.
- Full emotion, trigger conditions, beliefs, and evidence expand on demand, so beginners are not buried in character data before they speak.
- On small screens the scene analyzer naturally follows the dialogue. That layout change must not alter the business boundary among dialogue, canonical history, and influence confirmation.
- The dialogue main stage uses global `FullscreenView`. Fullscreen, exit fullscreen, and Esc must reuse the shared component; do not reimplement them on the business page.

### Workspace visual hierarchy

The visual center of character dialogue can only be the conversation itself. The shared workspace is organized in four layers: light toolbar / dialogue main stage / scene-analysis sidebar / creation-uptake hint. The toolbar only carries source, scope, and collapse actions. Character replies use a reading-style text flow with light evidence footnotes. The scene analyzer explains reply grounds with whitespace, sections, and thin dividers. Only novel characters show a confirmable creation-uptake hint at the bottom of the dialogue.

Do not wrap the same content again inside those four layers with large-radius, shadowed, bordered cards. Base-library characters, book-analysis characters, and novel characters share this visual structure. Source differences should change available actions and context bounds, not grow into three separate chat UIs.

## Failure Modes

- Letting the character obey the author unconditionally turns dialogue into a disguised prompt input box.
- Injecting author speech directly into prose pollutes the creation process into story fact.
- Letting the character answer past the information boundary leaks truths that character should not know.
- Treating "not taken up" as failure incorrectly escalates local character exploration into an Auto-Director stop.
- Injecting dialogue influence for characters who do not participate in the chapter inflates context and steals scenes.

## Related Modules

- `server/src/services/novel/characterDialogue/`
- `server/src/prompting/prompts/novel/characterDialogue.prompts.ts`
- `server/src/services/novel/runtime/GenerationContextAssembler.ts`
- `server/src/services/novel/runtime/ChapterArtifactDeltaService.ts`
- `client/src/pages/novels/components/characterWorkspace/CharacterIntelligenceTab.tsx`

## Source Documents

- [Character intelligence layer](./character-intelligence-layer.md)
- [Chapter production chain](./chapter-production-chain.md)

# Character System Upgrade Long-Term Plan

## 1. Positioning

The character system should not be designed only as “character bio cards + current-state records”. In an AI long-form novel-completion system, the correct positioning of the character system is:

> The character system is responsible for turning characters from static settings into narrative assets that can continuously drive plot, relationships, reader payoffs, review, and chapter generation.

Character-library sync solves “whether character assets can be reused, and whether they pollute other novels”; the character-system upgrade solves “after a character enters a novel, can it keep helping the system write a long story that is readable, keep-reading, and advancing”.

Long-term core principles:

- The character library owns reusable persona assets;
- Novel characters own this book’s narrative posts;
- Dynamic state owns current plot facts;
- Relationship tension owns ongoing conflict and emotional pull;
- Chapter writing consumes only in-novel character context bundles; it does not consume the character library directly.

## 2. Long-term goals

For complete writing beginners, the character system should help users with these problems:

- Not knowing what characters a novel needs;
- Not knowing why a character can drive the plot;
- Not knowing how characters should create tension with each other;
- Characters turning into plot devices or a roster as writing goes on;
- Characters appearing with no function, or important characters disappearing for a long stretch;
- Dialogue and behavior not sounding like this character;
- Relationship changes lacking setup;
- AI forgetting a character’s current goal, emotion, information gap, and red lines when generating a chapter.

The system goal is not to make users manually maintain more fields, but to have AI auto-recommend, auto-extract, and auto-enter the writing chain, leaving users to confirm only high-risk judgments.

## 3. Target architecture layers

### 3.1 Character-library asset layer

Corresponds to global `BaseCharacter` and the character-library sync system.

Responsible for:

- Reusable name, appearance, base persona, long-term background;
- Reusable speech manner, behavior habits, character selling points;
- Character prototype versions, forks, and list of citing novels;
- Settling stable settings from novel instances.

Not responsible for:

- Current state in a given novel;
- Relationship progress in a given novel;
- Plot facts in a given novel such as death, injury, darkening, reconciliation, or resource holdings.

### 3.2 Novel character instance layer

Corresponds to in-novel `Character`.

Responsible for:

- This character’s identity and narrative function in this book;
- This book’s relationships with the protagonist, antagonist, and core characters;
- Current goal, current state, growth stage;
- This-book-only settings and character arc.

### 3.3 Narrative-post layer

Recommended as the first priority of the character-system upgrade.

Responsible for answering:

- Why this character must exist in this book;
- What conflict, reader payoff, emotional pull, or world entry they are responsible for creating;
- What task they take in the current volume;
- What they should drive next;
- Whose narrative duty they must not steal.

Recommended post types include:

- `protagonist_driver`: protagonist driver;
- `pressure_source`: pressure source;
- `emotional_anchor`: emotional pull;
- `value_mirror`: value mirror;
- `reader_reward_amplifier`: reader-payoff amplifier;
- `foreshadow_holder`: foreshadow holder;
- `world_entry`: worldbuilding entry;
- `antagonist_proxy`: antagonist proxy;
- `turning_point_trigger`: relationship turning-point trigger;
- `cost_bearer`: cost bearer.

These posts must be judged by AI in structured form, not via keywords or hard-coded routing fallbacks.

### 3.4 Relationship-tension layer

Even a complete single character is less able to keep driving a long book than character relationships. The relationship system should upgrade from “relationship description” to a “relationship-tension ledger”.

Responsible for:

- Surface relationship;
- Hidden contradiction;
- Information asymmetry;
- Emotional debt;
- Interest binding;
- Next relationship turn;
- Relationship payoff the reader expects;
- Relationship red lines that forbid sudden change.

The relationship-tension ledger must enter chapter planning, chapter writing, review, and the repair chain.

### 3.5 Dynamic-state layer

Corresponds to existing character dynamics, state snapshots, and post-chapter state sync.

Responsible for:

- Current goal;
- Current emotion;
- Current pressure;
- Current known-information scope;
- Current resources and capability;
- Current injury, location, situation;
- Post-chapter state change.

Dynamic state must not sync to the character library.

### 3.6 Writing-consumption layer

This is the layer the character system ultimately serves.

Before each chapter is written, the system should generate a character context bundle:

- Characters who may appear in this chapter;
- Each character’s current goal;
- Each character’s current emotion and pressure;
- What each character must advance in this chapter;
- What each character must not do in this chapter;
- Which relationships must stay consistent;
- Which information the character knows, and which only the reader knows;
- Expected state changes after this chapter ends;
- Character expression contract: dialogue, behavior, how emotion is shown, language forbidden zones.

Chapter generation, chapter review, and chapter repair all consume this context bundle.

## 4. Detailed optimization list

### 4.1 Character library and novel instances

- [ ] Character-library detail page shows which novels cite it, citation status, and latest version diff.
- [ ] Novel character page shows character-library source, current cited version, and sync status.
- [ ] Support character-library variants: prototype, parallel variant, renamed variant, persona-only borrow, appearance-only borrow, expression-style-only borrow.
- [ ] Support one-click fork of a novel character, keeping the source but stopping sync.
- [ ] Support AI cleaning when settling a novel character into the character library: syncable, this-book-only, high-risk.
- [ ] Character-library updates only generate optional proposals; they do not automatically affect any novel.

### 4.2 Character narrative posts

- [ ] Generate a “reason this character exists in this book” for every novel character.
- [ ] Generate a “current-volume duty” for every novel character.
- [ ] Annotate reader benefit for every novel character: payoff, angst, romantic tension, suspense, contrast, oppression, companionship.
- [ ] Annotate the plot types the character is responsible for driving: action advance, relationship advance, information reveal, pressure escalate, worldbuilding expand.
- [ ] Annotate duties the character must not take, to avoid the protagonist being replaced as driver by a supporting character.
- [ ] At volume-planning and chapter-planning stages, check whether the current character roster is missing posts.

### 4.3 Character relationship tension

- [ ] Extend `CharacterRelation` into a consumable relationship-tension view.
- [ ] For core relationships, generate “surface relationship + hidden contradiction + information asymmetry + emotional debt”.
- [ ] For core relationships, generate the next turning point.
- [ ] For core relationships, generate relationship red lines, to prevent sudden reconciliation, sudden falling-out, or sudden intimacy.
- [ ] Before chapter writing, output this chapter’s relationship-advance requirements.
- [ ] At review, check whether relationship changes lack setup.

### 4.4 Character state and chapter consumption

- [ ] Before generating a chapter, build `CharacterChapterContextBundle`.
- [ ] The context bundle merges novel character instances, character dynamics, relationship tension, resource ledger, and foreshadow ledger.
- [ ] The context bundle contains only content directly relevant to this chapter, avoiding stuffing full character bios into the prompt.
- [ ] After chapter generation, auto-extract character state changes.
- [ ] High-risk state changes enter user confirmation; low-risk state changes may enter the state ledger.
- [ ] Repairing a chapter must carry character red lines and current state.

### 4.5 Character expression contract

- [ ] For core characters, generate dialogue style, sentence length, degree of emotion shown, and common avoidance patterns.
- [ ] Generate expression differences for intimacy, conflict, under pressure, loss of control, and similar scenes.
- [ ] Annotate forbidden expressions for the character, to avoid everyone sounding like the same model voice.
- [ ] Chapter review checks whether character dialogue is off-voice.
- [ ] Local repair supports “only fix this character’s expression”.

### 4.6 Character growth curve

- [ ] Split `development` into a stage curve: starting misconception, volume-one setback, mid-book wrong choice, key cost, highlight turn, final change.
- [ ] Bind growth stages to volume and chapter windows.
- [ ] Review checks whether character growth is too fast, too slow, or missing setup.
- [ ] At chapter-planning stage, remind whether this chapter needs to advance character growth.

### 4.7 Character appearance economy

- [ ] Count how long since a core character last appeared.
- [ ] Count the risk of a character appearing continuously with no narrative contribution.
- [ ] Check whether multiple characters take duplicate functions.
- [ ] Check whether the current volume lacks a pressure source, emotional pull, antagonist proxy, or world entry.
- [ ] Remind whether a character has reached a highlight, exit, turn, or pause-appearance moment.

### 4.8 AI recommendation and beginner flow

- [ ] At book-opening and character-prep stages, do not require users to fill a complete character card first.
- [ ] AI recommends character-post gaps from genre, selling points, and story promises.
- [ ] Users only need to confirm the recommended character roster; the system auto-fills narrative duties.
- [ ] For beginners, show “recommended next character action”; do not show a complex field matrix.
- [ ] Advanced users can expand detailed fields, but the default path should keep low cognitive load.

### 4.9 Review and replan

- [ ] Review checks whether a character is OOC.
- [ ] Review checks whether this chapter used the wrong character to drive the plot.
- [ ] Review checks whether relationship changes lack setup.
- [ ] Review checks whether character goals conflict with current state.
- [ ] Review checks whether the protagonist’s driving power was stolen by a supporting character.
- [ ] Review checks whether the antagonist was dumbed down.
- [ ] On replan, use character-post gaps, relationship breaks, and delayed character highlights as trigger causes.

## 5. Phase-one development plan

### 5.1 Phase-one goal

Phase one does not build a complete character mega-system; it first builds the closed loop that most affects generation quality:

> Character narrative-post MVP + relationship-tension summary MVP + chapter character context-bundle MVP.

After phase one, chapter generation no longer only gets a “character bio list”, but a writing-oriented character task pack.

### 5.2 Phase-one scope

Phase one does:

- Structured generation of novel-character narrative posts;
- Structured summaries of core relationship tension;
- Character context bundle before chapter generation;
- Chapter review reading the character context bundle;
- Frontend display of a lightweight “this chapter’s character tasks” panel;
- Regression tests for character posts and the context bundle.

Phase one does not:

- Complex character-library variant UI;
- Full relationship-graph visualization;
- Long-term character appearance-economy dashboard;
- A complete character-voice repairer;
- Multi-round automatic replan.

### 5.3 Suggested data contract

Add shared type `shared/types/characterNarrative.ts`.

Core structures:

```ts
interface CharacterNarrativeProfile {
  id: string;
  novelId: string;
  characterId: string;
  narrativeRole: string;
  existenceReason: string;
  readerReward: string;
  plotEngine: string;
  pressureTrigger?: string | null;
  relationshipDebt?: string | null;
  currentVolumeDuty?: string | null;
  nextTurnHint?: string | null;
  redLines: string[];
  voiceBrief?: CharacterVoiceBrief | null;
  confidence?: number | null;
}

interface CharacterRelationTensionBrief {
  relationId?: string | null;
  sourceCharacterId: string;
  targetCharacterId: string;
  surfaceRelation: string;
  hiddenTension: string;
  informationAsymmetry: string;
  emotionalDebt: string;
  nextTurnPoint: string;
  redLines: string[];
}

interface CharacterChapterContextBundle {
  novelId: string;
  chapterId: string;
  summary: string;
  activeCharacters: CharacterChapterRoleBrief[];
  relationTensions: CharacterRelationTensionBrief[];
  mustAdvance: string[];
  mustAvoid: string[];
  stateWarnings: string[];
}
```

### 5.4 Prisma suggestions

Phase one suggests adding two tables:

- `CharacterNarrativeProfile`
  - `novelId`
  - `characterId` unique
  - `narrativeRole`
  - `existenceReason`
  - `readerReward`
  - `plotEngine`
  - `pressureTrigger`
  - `relationshipDebt`
  - `currentVolumeDuty`
  - `nextTurnHint`
  - `redLinesJson`
  - `voiceBriefJson`
  - `confidence`

- `CharacterChapterContextBundle`
  - `novelId`
  - `chapterId` unique
  - `summary`
  - `activeCharactersJson`
  - `relationTensionsJson`
  - `mustAdvanceJson`
  - `mustAvoidJson`
  - `stateWarningsJson`
  - `sourceSnapshotId`
  - `confidence`

Relationship tension in phase one can first reuse `CharacterRelation` and `CharacterRelationStage`; do not immediately add a third table. First let the context bundle store the relationship-tension summary this chapter needs to consume.

### 5.5 Prompt assets

Place under `server/src/prompting/prompts/novel/` per Prompt Governance.

Add:

- `novel.character.narrativeProfile.generate@v1`
  - Input: novel framing, story macro, book contract, character list, current volume info.
  - Output: each character’s narrative post, existence reason, reader benefit, plot-engine method, red lines.

- `novel.character.chapterContext.build@v1`
  - Input: chapter plan, character narrative posts, dynamic state, relations, character resources, foreshadow ledger.
  - Output: this chapter’s character context bundle.

Optional:

- `novel.character.narrativeProfile.repair@v1`
  - Used when character posts are missing, duplicated, or in conflict.

### 5.6 Server modules

Suggest adding:

- `server/src/services/novel/characterNarrative/CharacterNarrativeProfileService.ts`
  - Generate/refresh character narrative posts;
  - Query character narrative posts;
  - Detect post gaps and post duplication.

- `server/src/services/novel/characterNarrative/CharacterChapterContextService.ts`
  - Build the chapter character context bundle;
  - Read the latest context bundle;
  - Provide compressed character blocks for chapter generation, review, and repair.

- `server/src/routes/novelCharacterNarrativeRoutes.ts`
  - `GET /api/novels/:id/character-narrative-profiles`
  - `POST /api/novels/:id/character-narrative-profiles/refresh`
  - `GET /api/novels/:id/chapters/:chapterId/character-context`
  - `POST /api/novels/:id/chapters/:chapterId/character-context/build`

### 5.7 Writing-chain integration

Phase one must integrate at three places:

1. Chapter detailing stage
   - Add character tasks into chapter purpose, boundaries, and task summary;
   - Avoid a chapter plan that only advances events, not character relationships and state.

2. Chapter execution stage
   - writer prompt consumes `CharacterChapterContextBundle`;
   - Make explicit what this chapter’s characters must advance and must not break.

3. Review/repair stage
   - Review checks character OOC, relationship jumps, and goal/state conflicts;
   - On repair, prefer locally correcting character expression, behavioral motive, and relationship setup.

### 5.8 Frontend phase-one entries

Keep low cognitive load; do not build a large character back office.

Add lightweight entries:

- Novel character page: add a “this book’s duties” block;
- Chapter workbench: add a “this chapter’s character tasks” panel;
- Review results: add a “character consistency” issue category;
- Creative Hub: when the character roster is missing posts, give a suggested action.

User-visible copy should be written from a task perspective:

- “What advance this character is responsible for creating in this book”
- “What changes this chapter needs these characters to complete”
- “These relationship changes need setup”
- “Current character goals and this chapter’s actions are inconsistent”

Avoid implementation tone such as “fields have been migrated”, “the system has been updated”, or “state-sync module”.

### 5.9 Phase-one acceptance criteria

- Given a novel that already has characters, AI can generate a narrative post for each core character.
- Given a chapter, the system can build this chapter’s character context bundle.
- The chapter-generation prompt can consume the character context bundle, not only a character list.
- Review can identify at least three kinds of character issue: OOC, relationship jump, goal/state conflict.
- New logic does not depend on keyword hard-coding to judge character posts.
- Novel runtime state is not synced to the character library.
- Routes and services have targeted regression tests.

### 5.10 Recommended development order

1. Add shared types and Prisma models.
2. Add narrative-post prompt and profile service.
3. Add chapter character-context prompt and context service.
4. Integrate into chapter-generation context assembly.
5. Integrate character-consistency checks into review/repair.
6. Add lightweight UI on the novel character page and chapter workbench.
7. Add tests: schema, service, route, chapter-context consumption.

## 6. Risks and constraints

- Do not turn phase one into “more character forms”. Users do not fill fields by default; AI recommends first.
- Do not judge character duties by keywords; must go through structured AI output.
- Do not let the character library enter chapter writing directly; chapter writing consumes only in-novel character instances and the context bundle.
- Do not let the context bundle grow without bound; crop it to the current chapter.
- Do not let relationship tension become display-only information; it must enter chapter generation and review.

## 7. Relationship to the existing character resource ledger

`character-resource-ledger-plan.md` is responsible for what a character owns, what they can use, and what they cannot suddenly produce.

This plan is responsible for why a character exists, how they create plot, and what the current chapter should drive.

The two meet in the chapter context bundle:

- Character narrative posts decide “what this character should do in this chapter”;
- The character resource ledger decides “whether this character can do this thing in this chapter”;
- Relationship tension decides “how this thing will affect other characters”;
- Review and repair judge together from the three whether the chapter broke.

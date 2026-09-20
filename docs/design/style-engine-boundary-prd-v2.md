# Style Engine Module Boundary and PRD Design V2

## 0. Document Purpose

This document settles the Style Engine’s **product responsibilities, module boundaries, field governance, information architecture, and auto-director integration**.

It is not about “how to add a few more style fields.” It answers four questions:

1. When expanding the Style Engine, how to **avoid weakening** the original two core capabilities:
   - Imitate a writing style
   - Remove AI flavor
2. How to avoid rebuilding work that already belongs to `BookFraming / StoryMode / StoryMacro / Character / World`.
3. How to move the Style Engine from “an optional sidebar tool” to “the expression execution layer on the main creation chain.”
4. How to plug it into auto-director without taking over structural duties auto-director already owns.

Relationship to existing documents:

- [Style Engine v1](./style-engine-v1.md): keep its foundation for style assets, rule injection, detection, and repair.
- [Style Engine Prompt Compiler v1](./style-engine-prompt-compiler-v1.md): keep its compiler and prompt execution-chain design.
- This document: on top of those, adds **product settlement, responsibility boundaries, field grading, and auto-director integration rules**.

## 1. Core Product Judgment

### 1.1 Final Positioning

The Style Engine is not a “prose-style configurator,” and it is not a “pure imitation tool.”

Its final positioning should be:

> **The expression execution layer in the novel-creation system.**

It turns the user’s desired “reading feel, prose texture, character expression, and anti-AI requirements” into an executable, bindable, detectable, repairable expression contract, and carries that contract through planning, generation, review, and repair.

### 1.2 Two First-Class Capabilities That Must Stay

After the Style Engine expands, these two capabilities must remain first-class entry points. A “bigger, more complete” new positioning must not swallow them:

1. `Imitate a writing style`
   - Value: turn reference text, book-analysis conclusions, and the texture of a known work into transferable expression assets.
   - User perception: this is the most direct, most tangible style capability.

2. `Remove AI flavor`
   - Value: suppress template sentences, summary tone, uniform sentence patterns, over-explanation, and empty emotional spinning.
   - User perception: this is the easiest quality capability to understand and to prove.

Conclusion:

- The Style Engine can grow.
- Growth is allowed only if these two core functions stay intact.
- New capabilities should **add layers**, not **replace the core**.

### 1.3 New Three-Layer Understanding

Internally, the Style Engine can be understood as three layers:

1. `StyleIntent`
   - User expression layer
   - Oriented to “what feeling I want”
   - Examples: colder, more realistic, sharper dialogue, no preaching

2. `StyleContract`
   - System execution layer
   - Oriented to “how the model should express”
   - Corresponds to structured rules, bindings, and compiled prompt blocks

3. `StylePatch`
   - Runtime correction layer
   - Oriented to “which expression dimensions this book keeps drifting on, and how to pull them back automatically later”

Notes:

- `StyleIntent / StyleContract / StylePatch` are internal layers of the Style Engine, not three separate product modules.
- The product surface should stay simple and must not expose this internal model.

## 2. Module Boundary Document

### 2.1 One-Sentence Boundaries

- `BookFraming` owns: who this book is sold to, what the selling points are, and what the first 30 chapters promise.
- `StoryMode` owns: what drives this book forward, where reader rewards come from, and what the conflict form and progression unit are.
- `StoryMacro` owns: the story skeleton, conflict axis, reveal gradient, payoff, and hard constraints.
- `Character / World / Canonical State` owns: facts, setting, identity, relationships, world rules, and state changes.
- `StyleEngine` owns: how that content is **finally written**, how it reads, and how AI flavor is suppressed.

### 2.2 Responsibility Boundary Table

| Module | Core question | Should own | Should not own |
| --- | --- | --- | --- |
| BookFraming | What does this book sell? | Target readers, commercial tags, selling points, competitor reading feel, first-30-chapter promise | Prose expression rules, specific sentence-pattern constraints, anti-AI detection |
| StoryMode | How does this book progress? | Progression units, conflict form, reader rewards, mode red lines | Text roughness, dialogue aggression, sentence variation |
| StoryMacro | How does the story hold together? | premise, main conflict, mystery box, progression loop, payoff, ending constraints | Local language style, anti-AI rules |
| Character / World | What are the facts? | Character identity, relationships, setting, world rules, state evolution | Text-layer expression texture |
| StyleEngine | How is it written? | Narrative distance, language texture, dialogue style, emotion display, anti-AI constraints, expression detection and repair | Structural-progression authority, plot contracts, book-level market positioning |

### 2.3 What the Style Engine May Read

The Style Engine may read results from the following modules in order to generate an expression contract:

1. `BookFraming`
   - Read “target readers, selling points, first-30-chapter promise”
   - Purpose: decide language readability, explanation density, and commercial reading-feel intensity

2. `StoryMode`
   - Read “progression rhythm, conflict form, chapter rewards”
   - Purpose: make expression cooperate with the progression method, not change the progression method

3. `StoryMacro`
   - Read “story skeleton, mystery, constraints, payoff”
   - Purpose: keep the expression layer from drifting away from structural goals

4. `Character / Canonical State`
   - Read “character identity, state, relationship changes, information that must not leak”
   - Purpose: constrain how characters speak, how emotion is shown, and POV distance

### 2.4 What the Style Engine Must Not Take Over

Even if the following appear inside a style asset, the Style Engine must not have final authority over them:

1. Main progression loop
2. Core conflict design
3. Chapter structure skeleton
4. Primary POV strategy
5. Ending hard constraints
6. Character fact setting
7. World fact setting
8. Book-level commercial positioning

### 2.5 Priority When Constraints Conflict

When constraints from multiple modules conflict, use this priority:

1. Safety rules / platform constraints
2. Canonical State / world facts / character facts
3. Book Contract / BookFraming
4. StoryMode
5. StoryMacro / Planner / Structured Outline
6. StyleEngine
7. Default language habits / model free play

Explanation:

- The Style Engine must obey structure and fact boundaries.
- Its job is to get expression right inside an already-decided structure, not to reverse-change the structure.

## 3. Which Existing Fields Cross Boundaries, and Should Be Kept / Downgraded / Migrated

### 3.1 Field Governance Principles

When governing existing style fields, follow these three rules:

1. `Keep expression-layer fields`
   - If it controls “how to write,” keep it in the Style Engine.

2. `Move structure-layer fields out`
   - If it controls “what to write, how to progress, how to close,” the Style Engine should not own it.

3. `Downgrade ambiguous fields first`
   - For fields that look like both structure and expression, downgrade them to soft hints first. Do not delete them immediately, and do not keep expanding them.

### 3.2 Existing Field Grading Table

The following judgments are based on the current field definitions in [shared/types/styleEngine.ts](../../shared/types/styleEngine.ts).

| Field | Current problem | Recommended action | Final owner |
| --- | --- | --- | --- |
| `narrativeRules.progressionMode` | Clearly touches progression method; overlaps `StoryMode.profile.progressionUnits` and `StoryMacro.progression_loop` | `Migrate`; inside the Style Engine, keep compatibility reads only, and do not use it as a newly strengthened rule | StoryMode / StoryMacro |
| `narrativeRules.sceneUnitPattern` | Touches scene organization and chapter structure; overlaps planner / structured outline | `Downgrade` to a soft hint; if still used later, move into chapter-planning templates | Planner / Structured Outline |
| `narrativeRules.multiPov` | Materially affects primary narrative strategy; overlaps `novel.narrativePov` | `Migrate`; the Style Engine may only control POV distance and switch texture, not whether multi-POV is used | Novel Basic Info / StoryMacro |
| `narrativeRules.looping` | Easily becomes a progression-structure constraint instead of an expression constraint | `Migrate` to StoryMacro; in the short term, keep only as a low-weight hint | StoryMacro |
| `narrativeRules.endingStyle` | Already close to ending flavor and closure logic; overlaps `ending_flavor / ending_constraints` | `Migrate`; the style layer keeps only local expression such as “ending tone” | StoryMacro |
| `narrativeRules.povSwitchStyle` | Half structure, half expression | `Keep but narrow the meaning`; only means “how the prose handles a POV switch” | StyleEngine |
| `narrativeRules.summary` | Internal summary, not a responsibility conflict | `Keep` | StyleEngine |
| `characterRules.allowSelfReflection` | Controls whether a character introspects; this is expression-layer, but must not override character facts | `Keep`, with priority below character state and plot facts | StyleEngine |
| `characterRules.emotionExpression` | Typical expression-layer field | `Keep` | StyleEngine |
| `characterRules.defenseMechanisms` | Easy to overlap character setting, but still valid as “how it shows up in the text” | `Keep but narrow the meaning`; only for expression tendency, not character ontology | StyleEngine |
| `characterRules.facePriority` | Affects how a character is shown; still expression-layer | `Keep` | StyleEngine |
| `characterRules.dialogueStyle` | Typical expression-layer field | `Keep` | StyleEngine |
| `languageRules.register` | Typical expression-layer field | `Keep` | StyleEngine |
| `languageRules.roughness` | Typical expression-layer field | `Keep` | StyleEngine |
| `languageRules.allowIncompleteSentences` | Typical expression-layer field | `Keep` | StyleEngine |
| `languageRules.allowSwearing` | Typical expression-layer field, but must obey platform and character boundaries | `Keep` | StyleEngine |
| `languageRules.sentenceVariation` | Typical expression-layer field | `Keep` | StyleEngine |
| `languageRules.allowUselessDetails` | Affects stroke density; still expression-layer | `Keep` | StyleEngine |
| `languageRules.summary` | Internal summary | `Keep` | StyleEngine |
| `rhythmRules.pace` | Easy to confuse with story rhythm and progression speed | `Keep but redefine` as “textual rhythm density,” no longer story-progression structure | StyleEngine |
| `rhythmRules.paragraphDensity` | Typical expression-layer field | `Keep` | StyleEngine |
| `rhythmRules.allowFragmentedFlow` | Typical expression-layer field | `Keep` | StyleEngine |
| `rhythmRules.actionOverExplanation` | Typical expression-layer field | `Keep` | StyleEngine |
| `rhythmRules.summary` | Internal summary | `Keep` | StyleEngine |

### 3.3 Recommended Field-Governance Actions

Execute in three steps:

#### Step 1: Narrow semantics; do not migrate immediately

Do not rush to delete fields. First make this explicit:

1. `progressionMode / looping / endingStyle / multiPov`
   - Stop expanding them as new capabilities
   - Lower their weight in prompt compilation
   - Mark them as “compatibility fields”

2. `sceneUnitPattern`
   - Change to a “chapter writing-preference hint”
   - Do not use it as a structural input source for the planner

3. `rhythmRules.pace`
   - Narrow from “story rhythm” to “textual rhythm”

#### Step 2: Governance rule for new fields

Whenever a new style field is added, ask first:

> Does this field control expression method, or story structure?

If the answer is closer to any of the following, it must not enter the Style Engine:

1. Chapter progression unit
2. Conflict design
3. Payoff arrangement
4. Ending structure
5. POV regime
6. Character identity facts

#### Step 3: Optional future migration

After the main chain is stable, schema settlement can proceed gradually:

1. Move structure-type fields out of `NarrativeRules`
2. Keep expression-type fields
3. Provide compatibility read logic for migrated fields so old assets are not broken immediately

## 4. Final PRD Information Architecture

### 4.1 Target Users

The primary audience remains:

- Beginner authors who do not know writing terminology
- People who know what “feel” they want, but cannot break it into rules
- People who worry AI output is too templated, too flat, and too explanatory

### 4.2 Core User Jobs

What the Style Engine must help users complete is not “study prose style,” but these three jobs:

1. `I want it to write like this`
2. `This draft is too AI-flavored; pull it back`
3. `I want the whole book to keep the same texture`

### 4.3 Product Positioning

The Style Engine’s final PRD positioning should be:

> **An expression-control workbench on the novel-creation main chain**

It is not an isolated page. It carries three layers of function:

1. `Asset layer`
   - Create, edit, and accumulate style assets

2. `Application layer`
   - Bind style assets to book / chapter / single task

3. `Quality-control layer`
   - Detect drift, repair AI flavor, and accumulate patches

### 4.4 Primary Information Architecture

Keep only three first-class entry points:

1. `Imitate a writing style`
   - Input: reference text / book-analysis result / current-work excerpt
   - Output: an executable style asset

2. `Remove AI flavor from this draft`
   - Input: current text
   - Output: detection results, fix suggestions, and one-click rewrite

3. `Choose a texture for this book`
   - Book-scoped
   - Recommend, bind, and inspect the currently matching style

These three entries map to the three most important user jobs, so the home surface is not filled with asset-management concepts.

### 4.5 Secondary Information Architecture

#### A. Asset workspace

Used to manage `StyleProfile`:

1. Create a style
   - Generate from a one-sentence description
   - Extract from reference text
   - Generate from book analysis
   - Start from a template

2. Edit a style
   - View summary
   - Edit expression rules
   - Select anti-AI rules
   - Validate with a trial write

3. Style source and scope
   - Source text
   - Applicable genres
   - Tags

#### B. Binding and application workspace

Used to manage `StyleBinding`:

1. Bind to the whole book
2. Bind to a chapter
3. Bind to a single task
4. Inspect hit priority
5. Inspect the currently effective style summary

#### C. Quality-control and repair workspace

Used to manage `AntiAiRule + Detection + Rewrite + Patch`:

1. Style detection
2. Anti-AI detection
3. One-click correction
4. Diff preview after correction
5. Settle repeated corrections into a patch

### 4.6 Product Expression at the UI Layer

To avoid “more features, more confusion,” UI expression should follow these principles:

1. The home surface talks only about user jobs, not internal terms
2. Words such as `StyleProfile`, `StyleBinding`, and `CompiledBlocks` appear only in advanced areas
3. The page’s default presentation is:
   - The book’s default style
   - Problems in the current text
   - The recommended next action

### 4.7 Non-Goals

The Style Engine PRD explicitly treats the following as non-goals:

1. Does not own character-setting editing
2. Does not own worldbuilding editing
3. Does not own story-skeleton design
4. Does not own book-level selling-point design
5. Does not become “another planner”

## 5. How to Plug Into Auto-Director Without Conflicting With Existing Modules

### 5.1 Integration Principles

When auto-director integrates the Style Engine, it must follow:

1. `Light integration first, deep integration later`
   - The first half of the chain takes a lightweight expression intent. The Style Engine must not dominate structure.

2. `Structure belongs to the director; expression belongs to style`
   - The director owns direction, planning, and volume/chapter breakdown.
   - The Style Engine owns how those products are finally written.

3. `Summary injection in the first half; full injection in the second half`
   - Auto-director’s first half consumes only a lightweight style summary.
   - Full compiled rules are consumed only at chapter execution and quality-repair stages.

### 5.2 Integration-Point Design

#### Stage A: Before auto-director starts

Goal:

- Let the Style Engine participate without adding beginner burden.

Recommended approach:

1. Keep one simple question on the auto-director creation page:
   - `How do you want this book to read?`

2. Optional advanced entries:
   - Choose an existing style asset
   - Generate a temporary style from one sentence
   - Extract a temporary style from reference text

3. If the user does not choose:
   - The system may auto-recommend a default book-level texture

This stage only produces `StyleIntent` or a lightweight `StyleContract Summary`. The user is not required to enter the full style workbench first.

#### Stage B: Director candidate generation

Goal:

- Make candidate directions more accurate in expressive temperament, without changing the candidate’s structural duties.

Recommended injection content:

1. Target reading feel
2. Language roughness / restraint
3. Dialogue-tension tendency
4. Explanation-density preference
5. High-risk anti-AI item summary

Explicitly forbidden to inject:

1. Progression-loop decisions
2. Chapter-unit decisions
3. Ending-structure decisions
4. Core conflict design

#### Stage C: Book Contract / Story Macro / Blueprint

Goal:

- Let the planning stage know “what overall reading feel this book should present.”

Recommended approach:

1. Inject only `StyleContract Summary`
2. Use it as `tone guardrails / expression guardrails`
3. Do not let a style asset replace `StoryMode / StoryMacro`

Recommended injected fields:

1. Reading-feel promise
2. Language density
3. Emotion-display method
4. Dialogue style
5. Anti-AI precepts summary

#### Stage D: Chapter execution

Goal:

- Enter the stage where the Style Engine truly intervenes strongly.

Recommended approach:

1. Use complete `CompiledStylePromptBlocks`
2. Keep the book / chapter / task three-layer binding mechanism
3. Immediately run style detection and anti-AI correction after generation

This stage is the Style Engine’s main battlefield, and the stage least likely to conflict with the director.

#### Stage E: Auto-director later recovery and repair

Goal:

- Let the director recovery chain recognize expression problems, instead of only “re-running structure.”

Recommended approach:

1. Distinguish structural failure from expression failure
2. If it is an expression failure:
   - Prefer style detection / auto-rewrite / patch
3. Do not roll an expression problem back into a full director rerun

### 5.3 Hard Rules Against Conflict

To keep auto-director and the Style Engine from colliding, make these hard rules explicit:

1. Auto-director’s first half reads only the style summary, not the full set of structure-type style fields.
2. The Style Engine cannot override structural products the director has already confirmed.
3. Even if structure-type fields remain in old style assets, they must not be injected as hard constraints during director stages.
4. Chapter runtime is the default stage where the Style Engine takes full effect.
5. Auto-director UI must clearly show:
   - Currently matching style
   - The style summary that is in effect only for the current stage
   - When full style constraints will be enabled in the prose stage

### 5.4 Recommended Minimum Rollout Order

Integrate in this order, rather than changing everything at once:

#### P1: Lightweight participation

1. Add a “book-level texture” input at the auto-director entry
2. Inject only a lightweight summary into candidates / Book Contract / Story Macro

#### P2: Deepen the later stages

1. Chapter execution uses complete compiled style blocks
2. After auto-director execution, automatically run style detection and anti-AI correction

#### P3: Closed-loop accumulation

1. Settle repeated expression corrections into `StylePatch`
2. Support reverse-generating a book-level asset from “the current work’s stable style”

## 6. Direct Guidance for the Current Implementation

Based on the current repository state, later implementation should follow this direct guidance:

1. Keep the existing `StyleProfile / StyleBinding / AntiAiRule / Detection / Rewrite` main structure.
2. Do not turn the Style Engine into a “structure-planning module.”
3. When adding auto-director integration, prefer a lightweight style-summary input first, instead of stuffing the full `styleProfile` into the first half of the chain.
4. For structure-crossing fields in `shared/types/styleEngine.ts`, settle them first at the document level and lower their semantic weight, then decide when to migrate code.
5. Product pages should continue to keep:
   - Imitate a writing style
   - Remove AI flavor
   - Book-level default style
   These three strongest user-cognition entry points.

## 7. Final Conclusion

The correct way to expand the Style Engine is not to leave “imitate a writing style / remove AI flavor” for an entirely new module. It is:

1. Keep these two most core, most intuitive capabilities;
2. Fold them into a more complete “expression execution layer” loop;
3. Strictly cut overlapping duties with `BookFraming / StoryMode / StoryMacro`;
4. Let it **participate in expression, not take over structure**, inside auto-director.

The resulting judgment should be:

> `BookFraming` decides what this book sells;  
> `StoryMode` decides how this book progresses;  
> `StoryMacro` decides how the story holds together;  
> `StyleEngine` decides how all of that is finally written as prose, and continuously suppresses AI flavor.

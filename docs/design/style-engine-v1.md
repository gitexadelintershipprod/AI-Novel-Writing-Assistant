# Style Engine Module Detailed Development Document V1

## 1. Module Overview

### 1.1 Module Name

**Style Engine**

### 1.2 Module Positioning

The Style Engine is the **writing-style asset hub** in the novel-creation system.
It turns writing patterns discovered from book analysis, sample-text extraction, manual definition, and reverse inference from the current work into editable, reusable, bindable, executable style assets. During generation it controls model output style and narrative method through rule injection and anti-AI constraints.

### 1.3 Problems It Solves

The current system has these problems:

1. “Voice and technique” in the book-analysis module is descriptive: it can be read, but it cannot drive generation directly.
2. The generation module lacks a stable style-control layer, so the AI easily falls back to generic writing and formulaic texture.
3. There are no reusable writing-style templates, so users have to re-describe the style they want every time.
4. There are no anti-AI-feature constraints, so the model easily produces summary sentences, elevation sentences, explanatory psychological description, and similar common problems.
5. Style rules cannot be bound at different layers such as whole book, volume, chapter, and character POV.

### 1.4 Core Goals

The Style Engine needs to complete these goals:

* Upgrade “style analysis” into “style control”
* Upgrade “book-analysis results” into “executable assets”
* Upgrade “style description” into “structured rules”
* Bring “AI generation” into a detectable, correctable writing-constraint chain

---

## 2. Position in the System

### 2.1 System Location

The Style Engine is a core mid-platform module of the creation system, located at:

```text
Book analysis / sample text / current work
        ↓
     Style Engine
        ↓
   Generation module / polish module / continuation module
        ↓
   Output detection / automatic correction
```

### 2.2 Relationship with Other Modules

#### Relationship with the Book-Analysis Module

The book-analysis module is responsible for **discovering writing style**. The Style Engine is responsible for **settling writing style into durable assets and executing it**.

Book-analysis output includes:

* Voice and technique
* Narrative method
* Rhythm features
* Dialogue style
* Character expression method

These can be source input for the Style Engine and are converted into structured style assets through the “generate style from book analysis” capability.

#### Relationship with the Worldbuilding Module

The worldbuilding module controls “what to write.” The Style Engine controls “how to write.”

#### Relationship with the Character Module

The character module provides character setting and state. The Style Engine controls how characters appear in the text, for example:

* Whether they are verbally stubborn
* Whether they self-reflect
* Whether they state emotion directly
* Whether they lean colloquial or calm

#### Relationship with the Chapter-Generation Module

The Style Engine injects rules before chapter generation, and after generation it provides AI-flavor detection and deviation correction.

#### Relationship with the Polish Module

The polish module is no longer responsible only for “smoother.” It is responsible for “more consistent with the current style asset.”

---

## 3. Core Design Principles

### 3.1 Separate Description Layer from Execution Layer

The Style Engine must store and display separately:

* Natural-language analysis shown to the user
* Structured rules executed by the system

### 3.2 Unified Source, Unified Application

Whether the style comes from:

* Book analysis
* Pasted text
* Manual creation
* Reverse inference from the current work

it must finally enter the same style-asset structure.

### 3.3 Style Is Bindable, Composable, and Layered

Style should not be only a “whole-book property.” It should support:

* Whole-book level
* Volume level
* Chapter level
* Character-POV level
* Single-task level

### 3.4 Separate Templates from Rules

Built-in style templates are preset assets. The anti-AI feature library is a constraint library.
Templates define direction. The rule library is the brake and correction.

### 3.5 Detection and Correction Closed Loop

The Style Engine cannot take effect only before generation. It must also run deviation detection and rewrite correction after generation.

---

## 4. Feature Scope

### 4.1 Included in This Phase

1. Generate style from book analysis
2. Extract style from text
3. Create style manually
4. Built-in style templates
5. Style-rule editing
6. Anti-AI feature-library management
7. Style application binding
8. Trial-write testing
9. AI-flavor detection
10. Automatic-correction preview

### 4.2 Not Included in This Phase

1. Multi-person collaborative editing of style assets
2. Complex version-branch merging
3. Automatically learned style evolution based on training data
4. Cross-project shared asset marketplace
5. Model-level fine-tuning training

---

## 5. User Goals and Use Cases

### 5.1 Typical Users

* Web-novel authors
* Plot-planning authors
* Users who rely on AI-assisted creation
* Long-form authors who want to control voice consistency

### 5.2 Typical Use Cases

#### Case 1: Settle style from book-analysis results

After finishing analysis in the book-analysis module, the user clicks “Generate style from book analysis” and converts voice and technique into an executable style asset.

#### Case 2: Extract style from a sample passage

The user pastes a liked text fragment and extracts its narrative patterns, character expression, and language style.

#### Case 3: Quickly generate by applying a built-in template

The user selects templates such as “underclass looping realist flow” or “mystery-pressure increasing flow” as the writing-style base for the current creation task.

#### Case 4: Bind a style to the current novel

The user applies a style set to the whole book, or binds it to a volume, a chapter, or a character POV.

#### Case 5: Detect AI flavor and rewrite

After chapter generation, the system automatically detects whether overly strong AI features exist, and if they do, it triggers automatic correction.

---

## 6. Page Structure Design

## 6.1 Module Home Structure

### Page Name

**Style Engine**

### Home Sections

1. New style
2. Built-in templates
3. My style assets
4. Anti-AI feature library
5. Apply and test

---

## 6.2 New-Style Area

### Creation Entry

* Generate from book analysis
* Extract from text
* Create manually
* Distill from the current work

### Field Design

* Style name
* Summary
* Category
* Tags
* Applicable genre
* Source notes

---

## 6.3 Built-in Template Area

### Display Content

* Template category
* Template card
* Template summary
* Applicable scenes
* Default-bound anti-AI rules
* One-click apply button
* Create-from-template button

### Early Built-in Template Suggestions

1. Underclass looping realist flow
2. Power-fantasy progressive-push flow
3. Mystery-pressure increasing flow
4. Emotional-pull flow
5. Ensemble-interweave flow
6. Daily-immersion flow
7. Cold professional flow
8. Absurd black-humor flow

---

## 6.4 Style Edit Page

### Page Regions

1. Basic information
2. Narrative rules
3. Character-expression rules
4. Language-style rules
5. Rhythm rules
6. Anti-AI rule binding
7. AI draft and human-edit area
8. Application-scope configuration
9. Trial-write test area

### Main Interaction Controls

* Input
* Text area
* Single/multi select
* Slider
* Switch
* Tag selector
* Rule binder
* Live preview area

---

## 6.5 Anti-AI Feature Library Page

### Page Content

* Rule-category filter
* Rule list
* Enabled status
* Severity
* Detection notes
* Trigger examples
* Correction suggestions
* Whether to auto-rewrite

### Supported Actions

* Enable/disable
* Strength adjustment
* Copy rule
* Custom add
* Bind to a style
* Unbind from a style

---

## 6.6 Apply and Test Page

### Page Functions

* Select a style asset
* Select an application target
* Enter a theme or fragment
* Run a trial write
* Show results
* AI-flavor detection
* Correction preview
* One-click apply to the target scope

---

## 7. Data Structure Design

## 7.1 Style Asset Main Table

```json
{
  "id": "style_001",
  "name": "Underclass looping realist flow",
  "description": "Show character predicament through fragmented life and repeated letdown",
  "category": "realist flow",
  "tags": ["first person", "colloquial", "fragmented narrative"],
  "source_type": "from_book_analysis",
  "source_ref_id": "book_analysis_123",
  "status": "active",
  "version": 1,
  "created_at": "2026-03-20T10:00:00Z",
  "updated_at": "2026-03-20T10:00:00Z"
}
```

---

## 7.2 Style Rules Table

```json
{
  "style_id": "style_001",
  "narrative_rules": {
    "progression_mode": "time_sequence",
    "scene_unit_pattern": ["action", "letdown", "self-rationalization"],
    "multi_pov": false,
    "looping": true,
    "ending_style": "unresolved"
  },
  "character_rules": {
    "allow_self_reflection": false,
    "emotion_expression": "behavior_only",
    "defense_mechanisms": ["verbal stubbornness", "deflection", "self-rationalization"],
    "face_priority": true
  },
  "language_rules": {
    "register": "colloquial",
    "roughness": 0.8,
    "allow_incomplete_sentences": true,
    "allow_swearing": true,
    "sentence_variation": "high",
    "allow_useless_details": true
  },
  "rhythm_rules": {
    "pace": "medium_fast",
    "paragraph_density": "high",
    "allow_fragmented_flow": true,
    "action_over_explanation": true
  }
}
```

---

## 7.3 Anti-AI Binding Table

```json
{
  "style_id": "style_001",
  "rule_ids": [
    "anti_001",
    "anti_003",
    "anti_006",
    "anti_010"
  ]
}
```

---

## 7.4 Application Binding Table

```json
{
  "id": "binding_001",
  "style_id": "style_001",
  "target_type": "chapter",
  "target_id": "chapter_12",
  "priority": 2,
  "weight": 0.85,
  "enabled": true
}
```

---

## 7.5 Anti-AI Rules Table

```json
{
  "id": "anti_001",
  "name": "Forbid explanatory psychological description",
  "type": "forbidden",
  "severity": "high",
  "description": "Do not directly use sentence patterns such as “he felt” or “he realized” to explain character psychology",
  "detect_pattern": ["he felt", "he realized", "he understood"],
  "rewrite_suggestion": "Turn psychological explanation into behavior, action, dialogue, or environmental reaction",
  "auto_rewrite": true,
  "enabled": true
}
```

---

## 8. Built-in Style Template Design

## 8.1 Template Standard Fields

Every built-in template must include:

1. Template name
2. Template summary
3. Applicable types
4. Narrative rules
5. Character-expression rules
6. Language-style rules
7. Rhythm-control rules
8. Default anti-AI rule binding

---

## 8.2 Template Example: Underclass Looping Realist Flow

### Template Notes

Use fragmented time-flow and continuously missed small goals to build a narrative atmosphere in which the character is swallowed by reality and self-protects through verbal stubbornness.

### Narrative Rules

* Time progression is primary
* Each passage contains action and letdown
* The ending does not solve the problem
* A large amount of fragmentary everyday noise is allowed

### Character Rules

* Deep self-reflection is forbidden
* Verbal stubbornness or self-rationalization is required
* Emotion is expressed through action

### Language Rules

* Strongly colloquial
* May be rough
* Swearing is allowed
* Half-sentences and broken expression are allowed

### Default Anti-AI Rules

* Forbid theme elevation
* Forbid explanatory psychological description
* Encourage meaningless life details
* Encourage real-world letdown
* Encourage verbal-stubbornness compensation

---

## 8.3 Template Example: Cold Professional Flow

### Template Notes

Press emotion down with professional facts and industry detail, forming a restrained but pressurized narrative method.

### Core Rules

* Industry detail first
* Emotion is not stated directly
* Facts press emotion
* Dialogue leans informational
* Avoid cheap quotable lines

---

## 9. Anti-AI Feature Library Design

## 9.1 Rule Categories

### Forbidden Rules

Triggering them is a violation and needs a prompt or automatic rewrite.

Examples:

* Forbid explanatory psychological description
* Forbid theme summary
* Forbid end-of-paragraph elevation
* Forbid standardized turning sentences
* Forbid overly neat parallelism
* Forbid direct preaching

### Risk Rules

They flag high AI-flavor risk, but do not necessarily auto-rewrite.

Examples:

* Paragraph lengths too even
* Sentence-pattern repetition too high
* Dialogue too functional
* Three consecutive paragraphs of explanation with no action
* Emotion expression too explicit

### Encouraged Rules

Used to increase realism, human texture, and impurity.

Examples:

* Encourage adding meaningless small actions
* Encourage adding real-world letdown
* Encourage adding life noise
* Encourage character verbal-stubbornness compensation
* Encourage informational impurity

---

## 9.2 Suggested Built-in Rules for Phase One

### Forbidden

1. Forbid “he felt…”
2. Forbid “this made him realize…”
3. Forbid “fate seemed to…”
4. Forbid “life is just…”
5. Forbid end-of-paragraph elevation
6. Forbid summarizing the theme

### Risk

7. Paragraph lengths too even
8. Three consecutive paragraphs of explanatory narration
9. Dialogue that only functionally advances plot

### Encouraged

10. Add at least one meaningless action
11. Add at least one real-world letdown
12. Add at least one verbal-stubbornness compensation line

---

## 10. Core Business-Flow Design

## 10.1 Generate Style from Book Analysis

```text
User enters book-analysis module
    ↓
Views voice and technique analysis
    ↓
Clicks “Generate style from book analysis”
    ↓
System extracts style information from book-analysis results
    ↓
Generates natural-language summary + structured style rules
    ↓
Enters style edit page
    ↓
User adjusts and saves
    ↓
A style asset is formed
```

### Conversion Rule Notes

Descriptive content in book analysis needs to be converted into executable rules.

For example:

* “Flexible multi-POV switching”
  → `multi_pov = true`
  → `pov_switch_style = flexible`

* “Language mixes philosophy and colloquial speech”
  → `register = mixed`
  → `allow_philosophy = true`
  → `philosophy_embedding = dialogue_or_action_only`

---

## 10.2 Extract Style from Text

```text
Input text
   ↓
Run style extraction
   ↓
Output analysis summary
   ↓
Output structured rules
   ↓
User edits
   ↓
Save as a style asset
```

---

## 10.3 Style Application Flow

```text
Select a style
   ↓
Select application scope
   ↓
Set priority and strength
   ↓
Save the binding
   ↓
Generation module reads the binding
   ↓
Inject style constraints
```

---

## 10.4 Post-Generation Detection and Correction Flow

```text
Model outputs prose
   ↓
Enter AI-flavor detector
   ↓
Check anti-AI rules
   ↓
Mark violating content
   ↓
Output detection report
   ↓
Run automatic correction or user-confirmed correction
```

---

## 11. Prompt Layering Design

## 11.1 Principle

The Style Engine should not dump the whole JSON into the model as-is. It should convert it through a constraint compiler into Prompt rule blocks that are easier for the model to execute.

---

## 11.2 Prompt Composition Layers

### Layer 1: Global Creation Context

* Worldbuilding
* Character setting
* Current task goal

### Layer 2: Style Constraint Block

* Narrative rules
* Character-expression rules
* Language rules
* Rhythm rules

### Layer 3: Anti-AI Constraint Block

* Forbidden items
* Risk reminders
* Encouraged items

### Layer 4: Task Goal

* Generate a chapter
* Polish
* Rewrite
* Continue
* Trial write

---

## 11.3 Compilation Example

### Input Structured Rules

```json
{
  "allow_self_reflection": false,
  "emotion_expression": "behavior_only",
  "allow_useless_details": true
}
```

### Compiled Prompt Fragment

```text
When writing, do not explain character psychology directly. Do not use expressions such as “he felt” or “he realized.”
Character emotion may only be shown through behavior, action, dialogue, or environmental reaction.
Life noise and trivial details that do not push the plot are allowed, to increase realism.
```

---

## 12. Output Detector Design

## 12.1 Detection Goals

1. Whether it has drifted from the current style
2. Whether common AI ailments appear
3. Whether expected style features are missing

---

## 12.2 Detection Dimensions

* Psychological-description method
* Summary-sentence ratio
* Elevation-sentence ratio
* Neatness
* How functional dialogue is
* Action-detail density
* Presence of impurity information
* Presence of real-world letdown
* Presence of verbal stubbornness / compensation

---

## 12.3 Detection Result Output

Detection results should include:

* Overall risk score
* Violated-rule list
* Trigger locations
* Correction suggestions
* Whether it can be auto-rewritten

---

## 12.4 Automatic Correction Strategy

### Mild Problems

Locally rewrite the violating passage

### Moderate Problems

Rewrite several consecutive paragraphs

### Severe Problems

Rewrite the whole passage or the whole chapter

---

## 13. Suggested API Design

## 13.1 Create a Style Asset

`POST /api/style-profiles`

### Request Body

```json
{
  "name": "Underclass looping realist flow",
  "source_type": "from_text",
  "content": "original text content",
  "category": "realist flow"
}
```

---

## 13.2 Generate Style from Book Analysis

`POST /api/style-profiles/from-book-analysis`

### Request Body

```json
{
  "book_analysis_id": "analysis_001",
  "name": "Realist-flow style distilled from Some Work"
}
```

---

## 13.3 Get Style Details

`GET /api/style-profiles/:id`

---

## 13.4 Update Style Rules

`PUT /api/style-profiles/:id/rules`

---

## 13.5 Bind Style to a Target

`POST /api/style-bindings`

### Request Body

```json
{
  "style_id": "style_001",
  "target_type": "novel",
  "target_id": "novel_123",
  "weight": 0.9,
  "priority": 1
}
```

---

## 13.6 Get Anti-AI Rule List

`GET /api/anti-ai-rules`

---

## 13.7 Detect AI Flavor

`POST /api/style-detection/check`

### Request Body

```json
{
  "style_id": "style_001",
  "content": "generated content"
}
```

---

## 13.8 Automatic Correction

`POST /api/style-detection/rewrite`

---

## 14. Frontend Interaction Detail Suggestions

## 14.1 New Style

Clicking a source card enters a different wizard.

### Generate from Book Analysis

* Select a book-analysis record
* Preview extractable content
* Choose dimensions to include
* Generate a draft

### Extract from Text

* Enter a name
* Paste text
* Choose extraction depth
* Generate a draft

---

## 14.2 AI Draft and Manual Edit in Parallel

The edit page keeps:

* AI draft area
* Manual structured-rules area

The user can edit structured fields on top of the AI draft instead of only editing one long passage.

---

## 14.3 Freeze Mechanism

It is recommended to keep a “freeze this section” capability so regeneration does not overwrite human edits.

---

## 14.4 Test Entry

The edit page directly provides “trial-write a passage,” so style effect can be verified without leaving the module.

---

## 15. Suggested MVP Development Scope

## 15.1 Must Complete in Phase One

1. Style-asset main model
2. Generate style from book analysis
3. Extract style from text
4. Create style manually
5. 4 built-in templates
6. 12 anti-AI rules
7. Bind style to whole book / current chapter / this generation
8. AI-flavor detection
9. One-click rewrite

---

## 15.2 Do Later in Phase Two

1. Character-POV-level binding
2. Volume-level binding
3. Style composition
4. Custom anti-AI rules
5. Historical version comparison
6. Style inheritance and override

---

## 16. Recommended Development Order

### Step 1: Data Structure and Database Tables

First establish style-asset, rule, binding, and anti-AI rule tables.

### Step 2: Extract Style from Text

This is the most independent entry and the easiest to run through first.

### Step 3: Built-in Templates

With templates, the whole module immediately has basic usability.

### Step 4: Generate Style from Book Analysis

Connect the book-analysis module with the Style Engine.

### Step 5: Pre-Generation Injection

Let style start actually affecting generation.

### Step 6: Output Detection and Rewrite

Form the closed loop.

---

## 17. Risks and Cautions

### 17.1 Do Not Store Only Long Natural-Language Analysis

Otherwise later execution still cannot be reliable.

### 17.2 Do Not Stuff All Anti-AI Rules into a Single Prompt

Organize them as rules, or maintenance becomes hard.

### 17.3 Do Not Mix “Template” and “Actual Style Asset” into One Thing

A template is a starting point. An asset is a user-editable, bindable entity.

### 17.4 Do Not Support Only Whole-Book Binding

Otherwise it cannot adapt to multi-volume, multi-character, multi-stage style change.

### 17.5 The Detector Must Not Only Check Keywords

It should gradually upgrade by combining paragraph structure, sentence-pattern density, action-detail ratio, and similar dimensions.

---

## 18. Success Criteria

The success standard of the Style Engine is not “the analysis looks good.” It is these four:

1. The user can quickly generate a usable style from book-analysis results
2. The style can actually change generation results
3. The system can detect and suppress common AI writing features
4. Style assets can be reused, composed, and bound in layers

---

## 19. One-Sentence Module Definition

> The Style Engine is the core module that turns writing patterns into executable creation constraints. It discovers style, settles style, applies style, and corrects AI output that has drifted from the style.

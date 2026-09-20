# Style Engine Prompt and Rule Compilation Design V1

## 1. Document Purpose

This document defines **how the Style Engine turns “style assets” into constraints the model can actually execute**.

The core goal is not “write another prompt.” It is to establish a stable chain:

> **style assets → rule compilation → Prompt injection → output detection → rewrite correction**

It addresses these problems:

* Style assets exist, but the model does not necessarily follow them
* There are many rules, but dumping them all into the model turns them into a jumble
* Different tasks need style constraints at different granularity
* Anti-AI rules cannot rely on a single line such as “please do not sound like AI”

---

## 2. Design Principles

### 2.1 Do not dump JSON to the model as-is

Structured data is good for storage, not for direct execution.
It must pass through a “rule compiler” and become text constraint blocks the model can understand and follow.

### 2.2 Different tasks use different Prompt structures

Outline generation, prose generation, continuation, polish, and rewrite depend on style constraints at different strengths.
One Prompt cannot serve every task.

### 2.3 Style constraints must be layered

At least split into:

* World / character / task foundation layer
* Style-rule layer
* Anti-AI constraint layer
* Current-goal layer

### 2.4 Rules must distinguish hard constraints from soft constraints

Not every rule should use “must” or “forbidden.”
Some rules are better as “prefer,” “lean toward,” or “encourage.”

### 2.5 Post-output detection is part of the Prompt system

A Prompt is not a one-shot launch. It should form a closed loop:

> constrain before generation
> check after generation
> correct after a violation

---

## 3. Core Chain Overview

```text
style assets
↓
rule normalization
↓
rule compiler
↓
task-level Prompt assembly
↓
model generation
↓
output detector
↓
rewrite compiler
↓
corrected result
```

---

## 4. Input Source Definition

The Prompt compiler’s input is not “style assets” alone. It is composed of five kinds of context together.

### 4.1 Base creation context

Includes:

* Novel base setting
* Worldbuilding summary
* Current volume goal
* Current chapter goal
* Key character states

### 4.2 Style assets

Includes:

* Narrative rules
* Character-expression rules
* Language-style rules
* Rhythm rules
* Default-template notes

### 4.3 Anti-AI rules

Includes:

* Forbidden-type rules
* Risk-type rules
* Encouraged-type rules

### 4.4 Application-binding information

Includes:

* Binding scope
* Priority
* Strength weight
* Inheritance relationships

### 4.5 Current task information

Includes:

* Task type
* Input text
* Target length
* Output form
* Whether rewrite is allowed

---

## 5. Prompt Compilation Layering

The Prompt compilation should be split into 6 layers.

---

## 5.1 World and task foundation layer

This layer answers “what to write.”

Content includes:

* This book’s background
* This segment’s task
* Current character states
* Current plot position

Example:

```text
The current task is to generate Chapter 12 prose.
Chapter goal: After the protagonist fails a night-venue stakeout, he has a short conversation with Dajun that carries verbal stubbornness and mutual roasting, and the ending forms a new real-world letdown.
Character state: The protagonist is short of money but unwilling to show weakness. Dajun is sharp-tongued outwardly, but actually looks after the protagonist to some degree.
```

---

## 5.2 Main style-rule layer

This layer answers “how to write.”

It comes from the four blocks in the style asset:

* Narrative rules
* Character expression
* Language style
* Rhythm control

This layer is the main body. It should be compiled uniformly into “rule blocks.”

Example:

```text
Style requirements:
1. Use fragmented realist-flow narrative. Advance mainly by time. Do not write long retrospective summaries.
2. Each paragraph should present character behavior first, then reveal the letdown. Do not explain psychology first.
3. Character emotion is shown through action, tone, dialogue, and environmental reaction. Do not state “he was sad” or “he was angry” directly.
4. Keep language colloquial and rough. Incomplete sentences and life noise are allowed.
5. Do not solve the problem at the ending. Keep undigested failure or real-world pressure.
```

---

## 5.3 Character-expression correction layer

This layer is dedicated to character voice, POV, and manner of behavior.

The biggest problem in a lot of AI output is not that the prose style is wrong, but that **the characters all talk like the same person**.

Content includes:

* POV rules
* How verbally stubborn a character is
* Whether self-reflection is allowed
* Dialogue style
* Character bias and ways of misreading

Example:

```text
Character-expression requirements:
- The protagonist should speak with verbal stubbornness. When embarrassed, he covers first; he does not directly admit he was shown up.
- Dajun speaks shorter and more cutting, but does not deliver long analysis.
- The current POV forbids god’s-eye judgment. Only follow what the protagonist can perceive.
```

---

## 5.4 Anti-AI constraint layer

This layer is not “style advice.” It exists to intercept the model’s bad habits.

It should be split into three segments:

### A. Forbidden items

```text
The following problems are forbidden:
- Directly explaining psychology, such as “he felt” or “he realized”
- Summarizing the theme at the end of a paragraph
- Lyrical elevation
- Neat parallel constructions
```

### B. Risk reminders

```text
Watch out for these tendencies:
- Several consecutive paragraphs that only explain and have no action
- Dialogue that only advances plot, with no life noise
- Every paragraph too complete, too neat, like a standard essay
```

### C. Encouraged items

```text
Prefer adding these features:
- Small actions that are meaningless but real
- Real-world letdown
- Verbal-stubbornness compensation
- Impurity information that has no strong relation to the main plot but has a lived-in feel
```

---

## 5.5 Output-format layer

This layer answers “what the generation should look like.”

For example:

* Generate chapter prose
* Generate a same-style fragment
* Generate a rewrite result
* Generate a detection report

Prose-task example:

```text
Output requirements:
- Output the prose directly. Do not explain the writing method
- Do not use bullet points. Do not add headings
- Keep novel-narrative text format
- Keep length between 800 and 1200 words
```

---

## 5.6 Self-check instruction layer

This layer is very important.
Adding a very short self-check constraint at the end of the Prompt can significantly improve stability.

Example:

```text
After writing, check yourself:
- Whether direct psychological explanation appeared
- Whether there is paragraph-end elevation
- Whether every paragraph is supported by action or dialogue
If any of these exist, correct first, then output the final prose.
```

---

## 6. Rule Normalization Design

Before compilation, every style rule must be normalized first. Otherwise mixed sources become messy.

---

## 6.1 Raw-source examples

Book analysis may write:

* “Language leans street colloquial”
* “Decorated with lines of verse”
* “Inner life is revealed through contrast”

What a user writes by hand may be:

* “Don’t be too literary-youth”
* “More swearing”
* “Stop explaining all the time”

None of these can be compiled directly.

---

## 6.2 Format after normalization

Convert uniformly into internal rule fields, for example:

```json
{
  "language.register": "colloquial",
  "language.roughness": 0.7,
  "language.allow_poetic_insert": true,
  "character.emotion_expression": "behavior_only",
  "anti.forbid_explicit_psychology": true
}
```

---

## 6.3 Responsibilities of the normalization stage

The normalizer is responsible for:

* Unifying vocabulary
* Removing ambiguity
* Classifying into fixed fields
* Supplying default values
* Filling missing items

---

## 7. Rule Compiler Design

The rule compiler’s job is:

> Translate structured rules into natural-language rule blocks that are “easiest for the model to execute.”

---

## 7.1 Compiler input

```json
{
  "task_type": "chapter_generation",
  "style_profile": {},
  "anti_ai_rules": [],
  "binding_weight": 0.85,
  "target_scope": "chapter"
}
```

---

## 7.2 Compiler output

The output is not a single string. It should be split into:

```json
{
  "global_context_block": "...",
  "style_rule_block": "...",
  "anti_ai_block": "...",
  "output_block": "...",
  "self_check_block": "..."
}
```

The frontend or calling layer then assembles them by template.

---

## 7.3 Compilation strategy

### Hard rules

Use these words:

* must
* must not
* forbidden
* only

Suitable for:

* Forbidding stating psychology directly
* Forbidding thematic elevation
* Requiring behavior-based expression

### Soft rules

Use these words:

* prefer
* lean toward
* try to
* may moderately

Suitable for:

* Life noise
* Fractured sentence patterns
* Useless details
* Environmental noise

### Risk rules

Use these words:

* watch out to avoid
* do not let this appear in succession
* be wary of

Suitable for:

* Dialogue that is overly functionalized
* Sentence patterns that are too neat
* Paragraphs that are too balanced

---

## 8. Prompt Templates for Different Tasks

---

## 8.1 Chapter prose generation

Applies when generating brand-new prose from a chapter goal.

### Compilation emphasis

* Style rules at strongest
* Anti-AI rules strong
* Output-format requirements explicit
* Self-check on

### Recommended structure

```text
[task context]
[current character and plot position]
[style rules]
[character-expression rules]
[anti-AI rules]
[output requirements]
[self-check requirements]
```

---

## 8.2 Continuation tasks

Applies when continuing from existing prose.

### Compilation emphasis

* Keep tone consistent with the preceding text
* Limit the model from suddenly elevating
* Depend more strongly on “continue the existing rhythm”

Suggested extra rules:

```text
You must continue the temperament of the existing paragraphs. Do not suddenly make the language neater, more complete, or more like a summary.
You must not raise the thematic expression on your own. You must not rewrite originally fragmented life-flow into paragraphs with a clear central idea.
```

---

## 8.3 Polish tasks

Applies when optimizing existing text.

### Compilation emphasis

* Not merely making it smoother
* Making it “more like the current style”
* Preserve original plot information

Suggested extra rules:

```text
When polishing, you must not add core plot information, must not change character relationships, and must not change event outcomes.
Only adjust the way of expression so the text better matches the current style asset.
```

---

## 8.4 Rewrite tasks

Applies when rewriting ordinary text into a given style.

### Compilation emphasis

* Be explicit about “what to keep, what to replace”
* Rules are stronger than for prose generation
* After detection, a second correction is usually still needed

Suggested extra rules:

```text
Without changing event order or factual information, rewrite the text into the specified style.
Focus the rewrite on narration method, language surface, emotion-expression method, and paragraph rhythm.
```

---

## 8.5 AI-flavor correction tasks

Applies to automatic rewrite after detection.

### Compilation emphasis

* Fix only the violating points
* Damage original-text information as little as possible
* Must take a violation report as input

Recommended input structure:

```text
Original text:
...

Detected problems:
1. “He felt” appeared
2. The third paragraph has paragraph-end elevation
3. Dialogue is overly functionalized

Correction requirements:
- Keep plot facts unchanged
- Modify only violating expressions
- After correction, re-output the full text
```

---

## 9. Style Strength and Binding Weight

Not every style binding should be treated the same.
A “strength” concept should be introduced.

---

## 9.1 Strength definition

### Low strength 0.3 ~ 0.5

* Mainly supplies tendency
* Suitable for the outline stage
* Does not hard-press language details

### Medium strength 0.6 ~ 0.8

* Balances rules and flexibility
* Suitable for prose generation

### High strength 0.8 ~ 1.0

* Forced constraints are obvious
* Suitable for rewrite, trial write, and style experiments

---

## 9.2 How it shows up in compilation

The same rule is worded differently at different strengths.

For example, “forbid explaining psychology”:

### Medium strength

```text
Try not to explain character psychology directly. Prefer showing emotion through action and dialogue.
```

### High strength

```text
Directly explaining character psychology is forbidden. Expressions such as “he felt” or “he realized” must not be used.
```

---

## 10. Merge Strategy for Multi-Layer Binding

Style may be bound at the same time on:

* Whole book
* Volume
* Chapter
* Character POV
* This task

There must be merge rules.

---

## 10.1 Recommended priority

```text
this task > character POV > chapter > volume > whole-book template
```

---

## 10.2 Merge principles

### When same-type rules conflict

Higher priority overrides lower priority.

### Non-conflicting rules

Accumulate.

### Anti-AI rules

Usually only add, never subtract, unless explicitly turned off.

---

## 10.3 Example

Whole-book binding:

* Colloquial
* Forbid thematic elevation

Chapter binding:

* Current chapter leans oppressive
* Rhythm slows down

Character binding:

* Protagonist is verbally stubborn
* No deep self-reflection

Final compiled result:

* Keep whole-book colloquialism and forbid elevation
* Stack chapter oppression and slow rhythm
* Stack character verbal stubbornness and low self-reflection

---

## 11. Anti-AI Rule Compilation Design

Anti-AI rules cannot merely “list items.” Different copy must be generated by type.

---

## 11.1 Forbidden-type rule compilation template

Input:

```json
{
  "name": "Forbid explanatory psychological description",
  "type": "forbidden",
  "detect_pattern": ["he felt", "he realized"]
}
```

Compiled output:

```text
Directly explaining character psychology is forbidden. Sentence patterns such as “he felt” or “he realized” must not be used. Character state must be shown through action, dialogue, environment, or behavioral outcome.
```

---

## 11.2 Risk-type rule compilation template

Input:

```json
{
  "name": "Dialogue is purely functional plot advance",
  "type": "risk"
}
```

Compiled output:

```text
Watch out to avoid dialogue that only carries plot-advancing function. Dialogue should keep character tone, pauses, roundabout talk, verbal stubbornness, or useless information, so it feels more like real conversation.
```

---

## 11.3 Encouraged-type rule compilation template

Input:

```json
{
  "name": "Encourage real-world letdown",
  "type": "encourage"
}
```

Compiled output:

```text
Prefer adding real-world letdown in paragraphs, so a slight or obvious gap appears between the character’s expectation and the actual result, to strengthen realism and character predicament.
```

---

## 12. Self-Check and Second-Generation Mechanism

Generation should be split into two modes.

---

## 12.1 Single-pass mode

Suitable for lightweight tasks.

```text
generate → self-check → output
```

### Advantages

* Fast
* Low cost

### Disadvantages

* Stability is only average

---

## 12.2 Two-pass mode

Suitable for key chapters and style-sensitive tasks.

```text
first-pass generation
↓
detector check
↓
generate correction instructions
↓
second-pass rewrite
↓
output the final result
```

### Advantages

* Stable
* Style is more accurate

### Disadvantages

* High cost

Prose generation should default to single-pass. AI-flavor correction and important chapters should support two-pass.

---

## 13. Converting a Detection Report into a Rewrite Prompt

This is the core of the closed loop.

---

## 13.1 Suggested detection-report format

```json
{
  "risk_score": 76,
  "violations": [
    {
      "rule_id": "anti_001",
      "rule_name": "Forbid explanatory psychological description",
      "text_span": "He felt a wave of irritation",
      "suggestion": "Change to action or tone"
    },
    {
      "rule_id": "anti_005",
      "rule_name": "Forbid paragraph-end elevation",
      "text_span": "Life, in the end, taught him…",
      "suggestion": "Delete the summary and land back in a concrete situation"
    }
  ]
}
```

---

## 13.2 Rewrite Prompt template

```text
Please correct the original text according to the following violation information.

Correction principles:
1. Do not change event facts
2. Do not add core plot
3. Correct only violating expressions
4. After correction, keep the original style temperament

Violation problems:
1. “He felt a wave of irritation” is direct psychological explanation. Please change it to behavior-based expression
2. “Life, in the end, taught him…” is paragraph-end elevation. Please remove the summarizing feel and land back in the scene

Original text:
...
```

---

## 14. Failure Protection and Degradation Strategy

Sometimes the model will not obey. A fallback is needed.

---

## 14.1 When there are too many rules

The compiler should trim, keeping in priority:

1. Style critical to the current task
2. High-priority forbidden items
3. Current character rules
4. Important encouraged items

Do not stuff twenty or thirty rules in all at once.

---

## 14.2 When the task is too short

For example, generating only one line of dialogue: do not inject a full large set of style rules.
Automatically switch to a compact Prompt.

---

## 14.3 When model capability is weaker

Use a compilation style of “short rules + strong constraints + few abstract words.”
Say less “narrative texture” and “atmosphere control.” Say more:

* Use short sentences
* Do not explain
* Stay colloquial
* Do not summarize

---

## 15. Prompt Template Examples

---

## 15.1 Bottom-loop realist-flow chapter generation template

```text
You are writing a passage of novel prose.

Current task:
At night the protagonist and a friend fail a venue stakeout. On the surface he is verbally stubborn; in reality he is in a sorry state. Write their brief time together after they leave. Focus on character relationship, real-world predicament, and fragments of daily noise.

Style requirements:
1. Use realist-flow fragmented narrative. Advance by behavior in the current time window. Do not write summarizing retrospectives.
2. Each paragraph should preferentially write action, dialogue, or environment, then reveal the character’s situation. Do not explain psychology directly.
3. Character emotion may only be shown through behavior, tone, pauses, and reaction.
4. Keep language colloquial, rough, and full of life noise. Incomplete sentences are allowed.
5. Do not solve the problem at the ending. Keep a little embarrassment, awkwardness, or coming-up-empty.

Character-expression requirements:
- The protagonist is verbally stubborn and unwilling to admit he was shown up
- The friend speaks short and cutting, but is not completely cold
- The current POV only follows what the protagonist can see and hear

Forbidden items:
- Direct psychological explanation such as “he felt” or “he realized” is forbidden
- Paragraph-end elevation is forbidden
- Turning the scene into lyrical prose is forbidden
- Neat parallel constructions are forbidden

Preferred items:
- Add small actions that are meaningless but real
- Add real-world letdown
- Add one line of verbal-stubbornness cover
- Add a little lived-in noise that does not push the main plot

Output requirements:
Output the prose directly. Do not add a heading. Do not explain the writing method. Keep it around 900 words.

After writing, check yourself:
Whether there is direct psychological explanation, paragraph-end elevation, or an overly complete essay feel. If so, correct first, then output.
```

---

## 15.2 AI-flavor correction template

```text
Please correct the AI-flavor problems in the novel text below.

Correction goals:
- Keep the original plot facts
- Do not change event order
- Do not add important plot
- Only correct the way of expression so it better matches “bottom-loop realist flow” style

Current style requirements:
- Emotion must be behavior-based
- Language is colloquial
- Life noise is allowed
- The ending does not elevate

Detected problems:
1. Direct psychological explanation appeared
2. There is a paragraph-end summary
3. Dialogue is overly functionalized

Original text:
...
```

---

## 16. Engineering Implementation Suggestions

---

## 16.1 Compiler module split

Split into the following services:

### `styleNormalizer`

Responsible for normalizing book-analysis text, hand-written descriptions, and template information into unified fields.

### `styleMerger`

Responsible for multi-layer binding merge.

### `styleCompiler`

Responsible for compiling unified fields into Prompt rule blocks.

### `antiAiCompiler`

Responsible for compiling anti-AI rules into forbidden / risk / encourage blocks.

### `rewriteCompiler`

Responsible for compiling a detection report into a correction Prompt.

---

## 16.2 Suggested output structure

The backend should not return only one long Prompt.
It should return a structured result, so the frontend can debug and later maintenance is easier.

```json
{
  "blocks": {
    "context": "...",
    "style": "...",
    "character": "...",
    "anti_ai": "...",
    "output": "...",
    "self_check": "..."
  },
  "merged_rules": {},
  "applied_rule_ids": ["..."]
}
```

---

## 17. Suggested MVP Scope

Phase one only does the five most important things:

### 1. Single-task Prompt compilation

Support chapter generation.

### 2. Basic rule compilation

Support narrative, language, character, and anti-AI four types.

### 3. 4 templates

Bottom-loop realist flow, power-fantasy progressive-push flow, mystery-pressure increasing flow, emotional-pull flow.

### 4. Detection report to rewrite Prompt

Support one-click correction.

### 5. Multi-layer binding first supports three levels

Whole book, chapter, this task.

---

## 18. Success Criteria

This Prompt and rule-compilation design is successful not when the Prompt is ornate, but when the following hold:

1. The same style asset can stably change output across different tasks
2. When the model produces formulaic writing, it can be detected and corrected
3. Bindings at different layers do not fight each other
4. Templates, book analysis, and hand-written style can all enter the same compilation chain
5. Prompt structure is clear, maintainable, and extensible

---

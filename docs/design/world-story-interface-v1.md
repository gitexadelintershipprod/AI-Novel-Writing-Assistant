OK. I'll wrap this part into a standalone document:

# World Management → Story Macro Planning Interface Design

The goal of this interface is not to dump the entire world setting downstream. It exists to do one critical thing:

> **Compress the world's full setting into the currently usable, effective world slice for this novel.**

In other words, World Management is the raw-material library. What Story Macro Planning should receive is:

* useful enough
* restrained enough
* constrained enough
* able to participate directly in "story engine generation"

Not a pile of setting exposition.

---

# 1. Define the interface responsibilities first

This interface must solve four problems.

### 1. Cut a "relevant to this book" slice from the world's full resources

Not every faction, location, or rule is relevant to the current novel.

---

### 2. Convert static setting into "narratively usable information"

For example:

* The world contains some faction
  is less useful than outputting
* How that faction will oppress the protagonist

---

### 3. Provide Story Macro Planning with input that can "directly generate a story engine"

Meaning it can be used directly to generate:

* premise
* core conflict
* hook
* growth path
* setpiece seeds

---

### 4. Constrain the later generation scope

This step is especially important.

Once Story Macro Planning starts, characters, plot, and chapters will all be shaped by it.
So this interface must lock down "world information that must not be used casually" in advance.

---

# 2. Where this interface sits in the system

Think of it as a middle layer:

```text
World Management (full world)
    ↓
World-slice extraction / novel-binding interface
    ↓
Story Macro Planning (generate story engine)
    ↓
Character setting / plot planning / writing
```

This middle layer is essentially a:

> **Story World Slice Builder**

It does not generate the story. It prepares a "controllable stage" for the story.

---

# 3. Input and output boundaries

---

## 1. Where the input comes from

The recommended input for this interface splits into two parts:

### A. World-management-side input

Structured data from the world library:

* `world_profile`
* `world_rules`
* `factions`
* `forces`
* `locations`
* `special_elements`
* `relations`

---

### B. Novel-side input

Initial information from the user's current novel:

* novel basic info
* story idea / one-sentence premise
* genre inclination
* style inclination
* whether a primary stage is specified
* whether certain factions/locations must appear

In other words, it does not only read the world; it also has to combine that with "what this book wants to tell."

---

## 2. Who receives the output

Output goes to the "Story Macro Planning module."

So the output must not lean toward "encyclopedia exposition"; it must lean toward "narratively compressed results."

---

# 4. Recommended target object of the interface

Do not pass the world object downstream as-is. Define a dedicated intermediate object:

# `story_world_slice`

This is the interface's only standard output.

---

## Recommended structure

```json
{
  "story_world_slice": {
    "story_id": "current novel ID",
    "world_id": "world ID",
    "core_world_frame": {
      "genre_base": "",
      "era_background": "",
      "tone_tags": [],
      "core_theme": "",
      "world_summary_for_story": ""
    },
    "applied_rules": {
      "hard_rules": [],
      "soft_rules": [],
      "forbidden_directions": [],
      "truth_mode": "",
      "power_boundary": "",
      "life_death_boundary": ""
    },
    "active_forces": [],
    "active_locations": [],
    "active_elements": [],
    "conflict_candidates": [],
    "pressure_sources": [],
    "mystery_sources": [],
    "suggested_story_axes": {
      "primary_axis": "",
      "secondary_axis": "",
      "hidden_axis": ""
    },
    "recommended_entry_points": [],
    "forbidden_combinations": [],
    "story_scope_boundary": {
      "allowed_stage": "",
      "initial_visibility": "",
      "expansion_ceiling": ""
    }
  }
}
```

This object is the "compressed package" that World Management passes to Story Macro Planning.

---

# 5. What the output should contain

The following is broken down by "what Story Macro Planning actually needs."

---

## 1. Core world frame core_world_frame

This is not a full world-setting introduction. It gives downstream a world-atmosphere base plate.

For example:

```json
{
  "core_world_frame": {
    "genre_base": "urban Cthulhu mystery",
    "era_background": "contemporary",
    "tone_tags": ["oppressive", "distorted", "cold", "gradually collapsing"],
    "core_theme": "self-preservation under cognitive collapse",
    "world_summary_for_story": "The surface of reality remains stable, but inside certain closed institutions there is anomalous contamination and cognitive dislocation that cannot be explained in public."
  }
}
```

Its purpose is to let the Story Macro Planning module know:

* what atmosphere it should write toward
* what it should not become
* what world density the user's story belongs in

---

## 2. Applied rules applied_rules

This is one of the most critical layers.

Here, world rules must be translated into "rules this novel must obey."

Note: this is not a wholesale copy of all world rules. Split them into three classes:

### A. hard_rules

Must never be violated

For example:

* Supernatural phenomena must not be publicly verifiable by the general public
* The truth must not be fully revealed in one go
* The protagonist cannot directly access the highest-level truth in the early stage

### B. soft_rules

Should be followed, but later breakthrough is allowed

For example:

* Narrative should prioritize the pressure of enclosed spaces
* Extraordinary power should not be shown explicitly early on
* Conflict should unfold primarily through information mismatch rather than direct confrontation

### C. forbidden_directions

Explicitly forbidden directions

For example:

* Do not write it as a city of public superpowers
* Do not introduce multiple unrelated large factions in the early stage
* Do not let world-setting explanation precede character crisis

---

## 3. active_forces

This is not a dump of every faction in the world. Output:

> **Factions recommended for activation at the current stage of this book**

And each faction must receive a "narrative translation."

Recommended structure:

```json
{
  "id": "force_001",
  "name": "Municipal Psychiatric Rehabilitation Center management",
  "surface_role": "The protagonist's workplace system and source of everyday authority",
  "hidden_role": "A reality-sealing force that suppresses anomalous leakage",
  "pressure_style": "institutional oppression, information blockade, blame-shifting",
  "narrative_function": "Create a real-world bind in the early stage; expose the motive for covering up the truth in the mid stage",
  "visibility_phase": "early",
  "danger_level": "medium"
}
```

Downstream can then use this directly to build:

* external conflict
* workplace oppression
* institutional confrontation
* buried truth

Instead of only knowing "this faction exists."

---

## 4. active_locations

Likewise, this is not a location table. It is "the currently usable stage for this novel."

Recommended structure:

```json
{
  "id": "loc_001",
  "name": "Closed ward",
  "surface_role": "Core workplace for the protagonist's daily shifts and nursing work",
  "hidden_role": "The area where anomalies first surface but are disguised as pathological phenomena",
  "narrative_function": "Used to create the first cognitive dislocation and ongoing unease",
  "restriction": "The protagonist cannot easily leave the workplace, and cannot talk about the anomaly in public",
  "setpiece_potential": "Night-shift rounds, distorted medical records, patients saying things they should not know",
  "priority": "highest"
}
```

Location output must emphasize:

* why it matters
* how it constrains the protagonist
* what scenes are likely to happen here

---

## 5. active_elements

These are the anomalous elements, objects, knowledge, and rule fragments that the current novel can invoke.

Recommended structure:

```json
{
  "id": "element_001",
  "name": "Incorrect medical record",
  "category": "knowledge",
  "story_use": "The clue medium through which the protagonist first notices the anomaly",
  "risk": "The more the protagonist tries to verify it, the more they discover that reality records are unreliable",
  "reveal_phase": "early"
}
```

This kind of output matters because it will turn directly into:

* hook seeds
* clue props
* reversal triggers
* setpiece components

---

## 6. conflict_candidates

This is specifically for feeding Story Macro Planning "conflicts that can actually hold."

It is not a one-line summary. It is a set of candidate conflict axes.

Recommended structure:

```json
{
  "conflict_candidates": [
    {
      "type": "external",
      "summary": "The protagonist discovers the anomaly, but the institutional system requires them to classify everything as pathological hallucination",
      "source_nodes": ["force_001", "loc_001"],
      "story_value": "Naturally suited to sustained early-stage pressure"
    },
    {
      "type": "internal",
      "summary": "The protagonist begins to suspect they themselves are developing a psychiatric abnormality",
      "source_nodes": ["element_001"],
      "story_value": "Intensifies the cognitive instability typical of Cthulhu-genre material"
    },
    {
      "type": "relational",
      "summary": "A certain patient forms an uncanny consensus with the protagonist, but their credibility is itself extremely low",
      "source_nodes": ["loc_001", "element_002"],
      "story_value": "Creates a trust paradox"
    }
  ]
}
```

This field is highly valuable because it can almost feed directly into the earlier design of:

* `conflict_layers`
* `core_conflict`
* `main_hook`

---

## 7. pressure_sources

This field should be kept as a separate field.

World elements do not all create pressure, but a story always needs pressure sources.

Recommended structure:

```json
{
  "pressure_sources": [
    {
      "source_type": "force",
      "source_id": "force_001",
      "pressure_mode": "institutional denial and responsibility suppression"
    },
    {
      "source_type": "location",
      "source_id": "loc_001",
      "pressure_mode": "ongoing anomalous exposure inside an enclosed space"
    },
    {
      "source_type": "element",
      "source_id": "element_001",
      "pressure_mode": "the more information is verified, the more it distorts"
    }
  ]
}
```

This field makes it easier for Story Macro Planning to generate a story that can actually "run," rather than a pretty framework with no pressure.

---

## 8. mystery_sources

Without this, a story easily becomes "conflict exists, but the hook is weak."

Downstream needs to be told separately:

> Which things in this world slice are suited to become sources of "core unknown"

Recommended structure:

```json
{
  "mystery_sources": [
    {
      "source_id": "loc_002",
      "question_seed": "Why has the underground sealed area never appeared on official building blueprints?"
    },
    {
      "source_id": "element_001",
      "question_seed": "Why does a medical record document a night-shift incident the protagonist has not yet experienced?"
    }
  ]
}
```

This field can almost be used directly by downstream to generate:

* `main_hook`
* `mystery_box`
* `major_payoffs`

---

## 9. suggested_story_axes

This means:

> Which story axes this world slice is best suited to expand along

For example:

```json
{
  "suggested_story_axes": {
    "primary_axis": "Suppression of anomalous truth by the order of reality",
    "secondary_axis": "The protagonist's doubt about their own mental state",
    "hidden_axis": "Some higher-order presence is infiltrating reality through the patient population"
  }
}
```

This field is especially suited to feed the "Story Macro Planning module," because it helps the model understand:

* what the main line should write
* what the subplot should write
* what the hidden line should conceal

---

## 10. story_scope_boundary

This field exists to keep the later story from opening too wide.

Recommended structure:

```json
{
  "story_scope_boundary": {
    "allowed_stage": "The hospital and its surroundings as the main early-stage venue",
    "initial_visibility": "The anomaly is perceptible only to a few characters",
    "expansion_ceiling": "Must not expand directly into a nationwide public catastrophe in the early-to-mid stage"
  }
}
```

This is the thing the design has been aiming for:

> **Anti-drift constraints**

---

# 6. How to design the interface workflow

This interface can be split into 4 steps.

---

## Step 1: Read the world's full resources

Input:

* world rules
* factions
* locations
* elements
* relations

This step only fetches data.

---

## Step 2: Relevance filtering against the current novel's needs

Judge from novel-side input:

* which rules are strongly relevant to this book
* which factions are suitable to enter this book
* which locations are suitable as the primary stage
* which elements can form hook / mystery / payoff

This step is essentially:

> World-resource relevance matching

---

## Step 3: Translate resources into narrative objects

For example:

* factions → pressure sources
* locations → stage and limiter
* elements → clues and alienation devices
* relations → sources of conflict and reversal

This step is especially important because it determines whether downstream receives "generatable objects" rather than "setting entries."

---

## Step 4: Output `story_world_slice`

This is the standard exit.

The Story Macro Planning module only reads this object. It does not read world-library raw data directly.

This keeps the system boundary especially clear.

---

# 7. Recommended invocation timing

This interface should be invoked at two moments.

---

## Timing 1: Before creating novel macro planning

This is the primary invocation moment.

The order should be:

```text
Novel basic info
→ Story idea input
→ Call the world-slice interface
→ Generate story_world_slice
→ Then generate Story Macro Planning
```

---

## Timing 2: Regenerate after the user changes world binding

For example, if the user later adjusts:

* this book's primary stage
* activated factions
* whether a given anomalous element is enabled

Then call the interface again, refresh `story_world_slice`, and incrementally update Story Macro Planning.

---

# 8. How this connects to the existing "Story Macro Planning prompt"

The earlier prompt's core output was:

* expansion
* decomposition
* issues

If this interface is wired in, the downstream prompt's input should change from:

> A user's one-sentence story idea

to:

> User story idea + `story_world_slice`

Then, when the model does macro planning, it no longer "fills in from thin air." It pushes the story inside a world stage that has already been cut.

---

## Recommended downstream input structure

```json
{
  "story_input": {
    "title": "",
    "genre": "",
    "user_premise": "A psychiatric nurse is drawn into a Cthulhu incident"
  },
  "story_world_slice": {
    "...": "from the interface output"
  }
}
```

Then the prompt should explicitly require the model to:

* Prefer the active content in `story_world_slice`
* Must not expand the world scope on its own
* Must not introduce unactivated high-level setting
* If story needs conflict with the world slice, write them into issues

At that point the Story Macro Planning module becomes much more stable.

---

# 9. Recommended minimum MVP field set

If the full design is too heavy to implement at once, start with an MVP version of the interface.

---

## Input

* world-rules summary
* at most 3 active forces
* at most 3 active locations
* at most 2 active elements
* user's one-sentence story idea

---

## Output

```json
{
  "story_world_slice": {
    "core_world_frame": {},
    "applied_rules": {},
    "active_forces": [],
    "active_locations": [],
    "active_elements": [],
    "conflict_candidates": [],
    "pressure_sources": [],
    "mystery_sources": [],
    "story_scope_boundary": {}
  }
}
```

This version is already enough to support the "Story Macro Planning" stage.

---

# 10. The one sentence to remember

This interface is not doing:

> "Pass the world setting to the story"

It is doing:

> **"Compress the world into a local battlefield the story can use"**

These are two different things. The former easily becomes a pile of setting. Only the latter can form a real generation loop.

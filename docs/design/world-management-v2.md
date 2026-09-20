Below is the reorganized version.

This time, do not treat “world management” as a mere settings page. Define it as:

> **The world-level constraint and resource center of the novel system**

Its job is not to help the user write an entire world bible in one pass. It is to provide a **sliceable, inheritable, constraining, and citable** world foundation for later story-macro planning, character setup, plot generation, and chapter writing.

---

# 1. Set the Boundary First: What World Management Actually Owns

Many novel tools turn world management into an “encyclopedia of lore” or a wiki page.
That looks content-rich, but it barely helps later generation, because it is missing two things:

1. **Constraint**
2. **Callability**

So this module’s responsibility should be exactly four things:

### 1. Define world-level rules

In other words: what this world allows, and what it forbids.

For example:

* Whether the supernatural exists in public
* Whether the power system has a ceiling
* Whether death can be reversed
* Whether the truth can be fully understood
* Whether faction conflict is public

This layer is the upper-level constraint.

---

### 2. Store world-level resources

In other words, what exists in this world:

* Factions
* Forces
* Locations
* Special elements
* Rule-like objects

What is stored here is “resources available to call,” not “content that must all be turned on.”

---

### 3. Maintain internal world relationships

In other words, how these elements hold together.

For example:

* Which force belongs to which faction
* Which location is controlled by which force
* Which special elements are held by whom
* Which relationships are inherently opposed

Without this layer, world elements are just loose parts.

---

### 4. Provide a bindable slice for a single novel

This is the most important piece.

World management is not the end. It must be able to output, for a given novel:

* Which forces this book activates
* Which locations are this book’s main stages
* Which anomalous elements this book may call
* Which world rules this book is subject to

This step is where world management actually creates value.

---

# 2. The Correct Position of World Management

I recommend defining world management as:

> **A world resource layer, not a story layer**

Its relationship to “in-novel planning” should be:

* World management: provides global resources and rules
* Novel planning: slices from the world whatever the current story needs
* Writing generation: uses only the slice already activated for the current novel

That is, it is not directly responsible for “telling the story.” It is responsible for:

> **Giving story generation a boundary, a basis, and reuse**

---

# 3. Recommended Module Structure

I recommend splitting world management into 5 submodules, not one mixed mega-form.

---

## Module 1: World Profile

This is the world’s main entry point, used to define the world’s identity.

Suggested fields:

```json
{
  "world_profile": {
    "name": "World name",
    "genre_base": "Genre foundation",
    "era_background": "Era / historical background",
    "core_theme": "Core theme",
    "tone_tags": ["oppressive", "conspiracy", "romantic", "dark humor"],
    "summary": "Overall summary of this world"
  }
}
```

This layer is not for detail. It is for tone-setting.

It answers:

* What kind of world this is
* What its general atmosphere is
* What kinds of stories it is suited to carry

---

## Module 2: World Rules

This layer is critical. It decides whether the rest of the system later drifts off course.

Suggested split into several rule kinds:

### 2.1 Reality rules

* Whether the world is stable or fragile
* Whether reality can distort
* Whether common sense is reliable

### 2.2 Supernatural rules

* Whether abilities / mystery / the uncanny exist
* Whether they are public
* Whether ordinary people can understand them
* Whether using them has a cost

### 2.3 Life-and-death rules

* Whether death is irreversible
* Whether resurrection is allowed
* What the cost is

### 2.4 Information rules

* Whether the truth can be fully learned
* Whether knowledge is dangerous
* Whether cognitive contamination exists

### 2.5 Narrative rules

* Plot directions that are not allowed
* Setting combinations that should not appear
* Which conflict types this world is better suited to

Example structure:

```json
{
  "world_rules": {
    "reality_stability": "stable | fragile | distorted",
    "supernatural_visibility": "public | hidden | semi_hidden",
    "power_ceiling": "low | medium | high",
    "death_reversibility": "none | limited | common",
    "truth_accessibility": "clear | partial | dangerous",
    "core_taboos": [],
    "narrative_constraints": [],
    "recommended_conflict_types": []
  }
}
```

This is the part of world management that should be done first, because it directly constrains:

* Character capabilities
* How plot can advance
* Whether conflict is reasonable
* The reachable range of endings

---

## Module 3: World Assets

This is the most intuitive layer of world management, but I recommend not making it merely a “list.” Make it **standardized resource objects**.

Split it into four types here.

---

### 3.1 Factions

A faction is not a concrete organization. It is a more abstract stance, line, ideology, or world-side.

For example:

* The secrecy school
* The expansion school
* The purge school
* The embrace-collapse school

Suggested fields:

```json
{
  "id": "faction_xxx",
  "name": "Faction name",
  "belief": "Core stance",
  "goal": "Long-term goal",
  "fear": "Greatest fear",
  "methods": ["Common methods"],
  "style": "Overall operating style",
  "narrative_value": "What kinds of conflict it is suited to carry"
}
```

Factions are more “ideological stances.”

---

### 3.2 Forces

A force is the concrete organization that can participate in plot directly.

For example:

* Hospital administration
* Local investigation bureau
* Underground cult
* A conglomerate
* A sect / clan

Suggested fields:

```json
{
  "id": "force_xxx",
  "name": "Force name",
  "belongs_to_faction": "faction_xxx",
  "nature": "institution / organization / family / cult / conglomerate",
  "scope": "local | regional | national | hidden",
  "public_identity": "Surface identity",
  "hidden_agenda": "Hidden goal",
  "resources": [],
  "methods": [],
  "pressure_style": "How it pressures characters",
  "story_value": "What role it is best suited to play in the story"
}
```

There must be one key field here:

> `pressure_style`

A force cannot be only background copy. It must be able to participate in pressing, obstructing, inducing, manipulating, covering up, hunting, absorbing, and similar acts.

---

### 3.3 Locations

A location must never be only “a point on the world map.” It should be “a narrative field that can trigger events and constrain action.”

Suggested fields:

```json
{
  "id": "location_xxx",
  "name": "Location name",
  "type": "hospital / town / ruin / academy / district / forbidden zone",
  "level": "world | region | city | core_scene",
  "parent_location": null,
  "public_image": "Surface impression",
  "hidden_truth": "Hidden truth",
  "function": "Narrative function",
  "risks": [],
  "access_rule": "Entry restriction",
  "exit_cost": "Cost of leaving",
  "linked_forces": [],
  "scene_tags": []
}
```

A location must at least answer:

* What this place looks like on the surface
* What it is in the dark
* Why it matters
* What tends to happen here
* Why people cannot simply leave

A location with no “restrictiveness” is basically set dressing.

---

### 3.4 Special Elements

This part is easy to overlook, but it is especially important.

It includes:

* Special items
* Anomalous phenomena
* Forbidden knowledge
* Rituals
* Fragments of laws
* Viruses, curses, lineages, contracts, case mechanisms, and similar

Suggested fields:

```json
{
  "id": "element_xxx",
  "name": "Element name",
  "category": "item | phenomenon | ritual | knowledge | rule",
  "effect": "Effect",
  "cost": "Cost of use",
  "risk": "Potential risk",
  "rarity": "Rarity",
  "controlled_by": [],
  "known_by": [],
  "story_value": "What kinds of plot it is suited for"
}
```

These elements are highly valuable in later writing, because they are often:

* Mechanisms that drive plot
* Media that escalate conflict
* Key pieces for planting and paying off foreshadowing

---

# 4. The World Relationship Layer Must Stand Alone

This is the layer most worth doing in this redesign.

Many systems stop at the asset library, so later AI calls can only “draw cards and combine.”
Go one step further and actually build the relationship structure.

---

## 4.1 Force relations

```json
{
  "from_force": "force_a",
  "to_force": "force_b",
  "relation": "hostile | allied | exploitative | infiltrated | neutral",
  "reason": "Reason for the relationship",
  "stability": "stable | unstable | temporary"
}
```

The value of this layer:

* Conflict exists naturally
* Plot does not have to rebuild relationships from scratch every time
* When a character enters a force, they automatically inherit a relationship net

---

## 4.2 Location control relations

```json
{
  "location_id": "location_xxx",
  "controlled_by": "force_xxx",
  "control_type": "open | covert | disputed"
}
```

Then, once a location is selected later, the system can naturally know:

* Who will appear here
* Who can stop the protagonist
* Who is watching from the dark

---

## 4.3 Element ownership relations

```json
{
  "element_id": "element_xxx",
  "owner_type": "force | location | faction",
  "owner_id": "force_xxx",
  "relation_type": "possess | seal | study | worship | suppress"
}
```

This greatly improves reasonableness during plot generation.

---

# 5. The Most Critical Layer: The World Binding Interface

This layer is the real core of the earlier questions.

You asked whether factions, forces, and locations should live in world management or in the novel. The real answer is:

> **Store the full set in the world; activate a subset in the novel**

So world management must be able to “output a slice to a novel.”

I recommend designing a dedicated binding-interface layer.

---

## 5.1 Binding targets

World management should not push every resource into the novel.
It should output:

* Forces this book is recommended to activate
* Location clusters this book is recommended to enable
* Conflict types this book fits
* Settings this book should avoid calling
* Style directions this book could reasonably take

---

## 5.2 Suggested structure

```json
{
  "story_binding_support": {
    "recommended_entry_points": [],
    "high_pressure_forces": [],
    "suggested_location_clusters": [],
    "compatible_conflicts": [],
    "tone_support": [],
    "forbidden_combinations": []
  }
}
```

This layer is initial fuel for the “story macro planning” module.

Its essence is:

> **From world resources, filter the local stage that best fits this novel**

---

# 6. How the Page Structure Should Change

From a product-page design view, I recommend that world management not be one long scrolling mega-form, but be split into 5 pages or 5 top-level tabs.

---

## 1. Overview page

Contents:

* World name
* Genre
* Era
* Tone
* One-sentence world summary
* Current resource-count stats
* Current maturity for novel binding

This page is more of a dashboard.

---

## 2. Rules center

Contents:

* Reality rules
* Supernatural rules
* Life-and-death rules
* Information rules
* Narrative constraints

This page must be clear, because it is the upper-level limit on all later generation.

---

## 3. Asset library

Four tabs:

* Factions
* Forces
* Locations
* Special elements

Each resource should not be only a long prose description. Prefer structured, card-like presentation, so filtering, binding, and citation are easy.

---

## 4. Relationship network

A simple version is fine first. A complex graph is not required.

It only needs to clearly show:

* Force opposition
* Location ownership
* Element control
* High-conflict nodes

This page is high-value, because it lets the author see at a glance whether “this world is alive.”

---

## 5. Novel binding page

This is where world management actually connects to the novel module.

This page can:

* Select the current novel
* Choose activated forces from the world
* Choose core stage locations
* Bind special elements that are allowed to be called
* Output to the story macro planning module

This page will become a highly distinctive capability of the whole system.

---

# 7. Interface Relationships with Downstream Modules

When building world management now, do not only think about this page. Reverse-engineer who will consume it later.

---

## 1. To the story macro planning module

Output:

* World-rules summary
* Recommended activated forces
* Recommended stage locations
* Recommended conflict types
* Narrative boundaries that must not be touched

The story macro planning module uses this to generate the “story engine.”

---

## 2. To the character setup module

Output:

* Factions / forces a character can belong to
* A character’s usual location
* Identity types the world allows
* Character-capability bounds that match world rules

Then characters will not float free of the world.

---

## 3. To the plot planning module

Output:

* Which forces can participate in conflict
* Which locations can carry key events
* Which special elements can be used as driving mechanisms
* Which relationships can be used for reversals

---

## 4. To the chapter generation module

Output:

* active world slice
* Location state relevant to the current chapter
* Visible activity range of current forces
* Rules that currently must not be broken

Generation will be much more stable this way.

---

# 8. The Most Important Principles of This Redesign

---

## Principle 1: World management stores “full possibility”; the novel takes only an “effective slice”

This is the core principle of the whole architecture.

The world may contain many things, but a single novel may enable only a small number of effective elements.

Otherwise the story is drowned by world noise.

---

## Principle 2: Every world element must have a narrative use

Do not allow filling in “background copy” only.

Each object should have at least one of:

* `story_value`
* `pressure_value`
* `conflict_value`
* `scene_value`

Otherwise it is only display-type lore.

---

## Principle 3: Locations must be restrictive

Locations are not a tourist catalog.

A location with no “entry restriction, exit cost, common risks” is extremely weak help for plot generation.

---

## Principle 4: Forces must have concrete methods

A force needs not only a goal, but also “how it gets things done.”

For example:

* Administrative suppression
* Public-opinion manipulation
* Covert infiltration
* Economic squeeze
* Induced deals
* Anomalous contamination
* Hunt-and-purge

These directly affect the feel of the plot.

---

## Principle 5: Incompleteness is allowed

World management must not force the user to complete everything in one pass.

It must allow:

* World rules only, with no complete set of forces
* A single core location, with no map system
* Two or three forces, with no complete faction set

Many authors start with a blur of fog, not a holographic map.

---

# 9. What I Recommend for the MVP First

Do not start with a full graph. Build the highest-value parts first.

---

## Phase 1: Build the structural skeleton first

Implement first:

* World Profile
* World Rules
* Forces
* Locations
* Basic relations
* Novel-binding entry

This is the highest-yield first step.

---

## Phase 2: Then add AI assistance

Support:

* Generating a rules draft from a one-sentence worldview
* Filling force sketches from genre
* Filling location drafts from the main stage
* Automatically identifying potential conflict points

---

## Phase 3: Finally, deep linkage

Support:

* Auto-reading the world slice when creating a character
* Calling only the active world slice during plot planning
* Consistency checks at writing time
* Updating world state as the plot advances

---

# 10. Recommended Final Data Skeleton

A total structure suited to later extension:

```json
{
  "world_profile": {
    "name": "",
    "genre_base": "",
    "era_background": "",
    "core_theme": "",
    "tone_tags": [],
    "summary": ""
  },
  "world_rules": {
    "reality_stability": "",
    "supernatural_visibility": "",
    "power_ceiling": "",
    "death_reversibility": "",
    "truth_accessibility": "",
    "core_taboos": [],
    "narrative_constraints": [],
    "recommended_conflict_types": []
  },
  "factions": [],
  "forces": [],
  "locations": [],
  "special_elements": [],
  "relations": {
    "force_relations": [],
    "location_control": [],
    "element_links": []
  },
  "story_binding_support": {
    "recommended_entry_points": [],
    "high_pressure_forces": [],
    "suggested_location_clusters": [],
    "compatible_conflicts": [],
    "tone_support": [],
    "forbidden_combinations": []
  },
  "metadata": {
    "completeness": 0,
    "story_ready": false
  }
}
```

---

# 11. A Product Success Test at the End

After this module is done, you can test success with one sentence:

> **If you write no long prose at all, and look only at structured data, can the system automatically pick a “usable stage, usable conflict, and usable pressure source” for a novel?**

If yes, this world-management module is genuinely usable.
If not, it is still a “lore display warehouse.”

---

I recommend the next step be exactly one of these two:

1. **World Management Module Refactor Document V1**, written as a formal development spec
2. **World management → story macro planning interface design**, connecting upstream and downstream directly

I more strongly recommend doing #2 first, because that lets you see this module’s real value immediately.

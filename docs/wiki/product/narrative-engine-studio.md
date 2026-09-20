# Narrative Engine Studio long-term blueprint

## Background

This project is already more than a writing tool that “prompts a model into prose”. Auto-Director, the world handbook, the character system, the character resource ledger, timeline, setups, chapter missions, quality debt, and Prompt Workbench are all accumulating around one underlying goal: giving a long novel a narrative state that can keep running.

The long-term idea from users is to grow the novel-creation main chain toward a game-management platform or game-editor shape. World, characters, resources, factions, and events are not only text materials before chapter generation. They are narrative assets that can be observed, interacted with, simulated, and operated. Prose generation is the narrative rendering of those assets at a time and from a point of view.

## Decision

The project’s long-term product direction can be abstracted as **Narrative Engine Studio**.

Core judgment:

> A novel is not written once. It is rendered from a continuously running narrative world.

The system should therefore move from a document generator toward an AI-driven narrative-world operations system. Chapter prose remains the first goal, but world, characters, factions, resources, events, and reader-visible text should form a more stable causal chain.

This is not a short-term interactive game, and it does not turn the main line into player-play mode. Phase one still serves long-novel completion rate. It only leaves room, in product mind and asset model, for a future game-editor creation desk, character interaction, multi-world derivatives, and IP-universe management.

## Product Thesis

A traditional writing tool’s main chain is usually:

```text
outline -> chapter -> prose
```

Narrative Engine Studio’s main chain is closer to:

```text
world state -> character state -> faction state -> event advance -> chapter expression -> state feedback
```

In this model:

- The world is underlying rules and space.
- Characters are acting subjects with motive, resources, relations, and cognitive bounds.
- Factions are long-term pressure sources and resource-allocation structures.
- Events are state changes.
- A chapter is the narrative presentation of one state change.
- Prose is the final render the reader reads.

## World Layer

The world layer should not stay as “world-view text”. The long-term direction is to make the world a readable, visual, simulatable narrative space.

World assets can include:

- World map: regions, locations, routes, danger zones, resource zones, faction borders.
- Faction map: organizations, camps, families, sects, companies, nations, bases, or communities.
- Faction relation graph: alliance, hostility, vassalage, infiltration, trade, betrayal, temporary cooperation.
- Resource distribution: spirit stones, arms, grain, intelligence, power cores, relics, political chips.
- World rules: ability system, economic rules, power rules, social taboos, disaster mechanics, cost system.
- World events: war, disaster, coup, secret-realm opening, market crash, corpse-tide migration, technology breakthrough.

The goal of world assets is not to make beginners fill complex setting first. It is to help users see how the world runs. Maps and graphs should serve understanding and generation-chain constraints. They should not become a complex editor beginners must maintain.

## Character Layer

Characters should not stay as dossiers. The long-term direction is to grow them into semi-autonomous narrative actors.

Character assets can layer as:

- Public dossier: name, identity, appearance, camp, relations, appearance chapters.
- Inner drive: desire, fear, bottom line, obsession, secrets, unspoken judgments.
- Current situation: location, resources, injury, mission, pressure, known information.
- Thought line: what the character is misjudging, suspecting, hiding, and planning to do.
- Emotion curve: attitude change toward the protagonist, factions, events, and self-goals.
- Action tendency: attack, trade, flee, disguise, betray, sacrifice, or ask for help under pressure.
- Interaction memory: understanding, hints, promises, or influence left after the user talks with the character.

User–character dialogue should not be designed as general chat. It should serve “understand the character” and “affect the character”. For example, the user asks whether the character trusts the protagonist; the answer exposes doubt; the system can settle that dialogue as evidence of inner tendency, and later chapters may reference the change without breaking the main line.

Character dialogue should reuse one subject protocol: novel characters have current narrative state and limited chapter influence; the base character library only offers stable-personality interviews; book-analysis characters may answer only inside a selected chapter anchor from original-text evidence. What is unified is interaction and provenance. Facts and memory from different sources must not be merged.

### Current landing: character thought-line MVP

The character-asset console already landed the first runnable thought-line layer: after the cast is confirmed, it prepares the character’s current understanding, private intent, action plan, emotional stance, action tendency, judgments and misjudgments, and keeps evidence, confidence, and source. It is a non-canon AI inference snapshot. Chapter prose uses only a compact thought line for participating characters as a soft behavior guide. Identity, camp, resources, location, and events that already happened stay constrained by the canon state layer.

Thought-line change after a chapter is finalized is fed back only through the existing one-shot `artifact_delta` extraction chain, so another post-chapter reasoning chain is not added. Authors may refresh current understanding on the character page, but they cannot rewrite this layer with free text. Character dialogue and multi-option relation simulation must stay isolated from the canon-confirm flow. See [Character intelligence layer: thought-line MVP](../workflows/character-intelligence-layer.md).

### Current landing: character dialogue layer

The character intelligence layer offers bounded character dialogue, not a preset-plot picker. Authors can talk with the character directly. The character answers from its situation, cognition, and information boundary, and may refuse, misunderstand, or counter-ask. The dialogue main stage should carry messages and influence confirm. The thought line sits beside it as a scene analyzer for stance and concern. It must not fall back to a vertical materials form. Action tendencies formed in dialogue become a soft guide inside a limited chapter window only after the author one-click confirms. Chapter finalization still lets `artifact_delta` decide from prose evidence whether to take them up. See [Character dialogue layer: receiving author intent through character agency](../workflows/character-dialogue-layer.md).

## Main Production Surface

Over time, novel main-chain pages can evolve from “step form pages” into a creation console:

- Left: current volume, current chapter, world-state snapshot, key character locations, faction dynamics, unpaid setups, quality debt.
- Center: chapter missions, scene queue, conflict advance, event changes, prose result.
- Right: character thought line, world impact, faction reaction, resource change, AI advice, user intervention points.
- Bottom: generate, review, repair, simulate, roll back, model status, context status, and the task queue.

This UI direction is closer to “director desk + world simulator + chapter production line”. It should keep a clear primary goal: help the user keep finishing the novel, not get lost in too many tunable parameters.

## Novel Workspace Module Boundaries

The novel main workspace must not keep expanding as a backend-field form. Every step should map to a narrative asset the user can understand, and should say how it affects later generation.

Current module boundaries should be read as:

- **Project setting / book-level positioning**: defines who this book is for, what attracts readers, and what the early chapters must deliver. It is the upstream promise for later world, character, volume/chapter, and prose generation, not only a basic-info form.
- **Macro story planning / story engine**: splits the book-level promise into selling points, long-term opposition, main-line hooks, advancement loops, growth paths, key payoff points, and unbreakable structural constraints. It does not create a concrete character cast and does not split chapters. It gives later characters, volume strategy, and chapter missions an executable main-line skeleton.
- **This book’s world**: maintains world rules, locations, factions, resources, and injectable slices. Long-term it can extend to world maps, faction maps, and faction relation graphs.
- **Character prep**: maintains dossiers, relations, resources, current situation, and thought line. Long-term it can support author–character dialogue, but dialogue influence must be reviewable before it writes into canon.
- **Volume strategy / volume skeleton**: allocates the whole-book promise across volume pacing, pressure sources, stage payoff, and end-of-volume pull.
- **Pacing / chapter split**: splits volume strategy into chapter missions, conflict intensity, beats, and chapter execution contracts.
- **Chapter execution**: reads book-level positioning, world, characters, chapter missions, timeline, and style assets, generates prose, and feeds new state back.
- **Quality repair**: handles prose naturalness, continuity, character consistency, pacing, and unmet obligations. It should record quality debt. It should not promote every local issue into a whole-book stop.

Phase-one UI work should start with project setting / book-level positioning, because it is the source of every later asset. The first screen should lead with title, overview, target reader, core selling points, commercial tags, first-30-chapter promise, and completeness. This-book world, writing advice, continuation source, and project status should unfold lower on the same page as an asset area or advanced settings.

The second priority module is macro story planning / story engine. The first screen should concentrate on: is the story idea enough, has the main-line skeleton been generated, should the next step generate the story engine or the constraint engine, which fields are locked, and which conflicts or gaps remain. Advanced fields, hard constraints, the constraint engine, and story state should sink by default, so beginners are not flooded with full engine fields before they understand the main-line skeleton.

The third priority module is character prep / the character-asset console. Over time the character page will carry dossier, visible profile, resources, timeline, relations, thought line, and character dialogue. It is a poor fit as one long vertical form. The current rule: the left side stably keeps cast navigation; the right side tab-switches around the current focus character. Default to status, goals, recent appearance, story role, and key resources. Full dossier, visible-profile completion, resource ledger, timeline, relation diagnosis, and intelligence-layer reservations each get their own tab. That lowers scroll and judgment load the first time a beginner maintains characters, and it leaves a clear entry for later thought line, dialogue-influence records, and relation graphs.

The character page’s visual language should also follow an asset-console position: the focus character needs a clear identity panel and status anchors. Overview leads with operating status, action bounds, dramatic function, and growth track. Full field editing lives only on the dossier tab. Avoid showing all character information as equal input boxes or ordinary profile cards, or the later game-editor character desk will lose product mind.

The fourth priority module is volume strategy / volume skeleton. The volume-strategy page should not keep expanding into one long page that stacks volume count, strategy, versions, resources, and every per-volume field in order. It should feel like a volume director console: generation, review, save, and stage readiness sit at the top; the body defaults to the current volume. The current-volume view needs left volume navigation, a right focus-volume workspace, and scannable edit regions for volume positioning, advance pressure, and payoff pull. Strategy overview, asset constraints, version compare, and impact analysis switch through tabs or collapsed panels. That reduces beginner scrolling and leaves room for later faction investment, character-resource dispatch, volume maps, and inter-volume event simulation.

Volume-count decisions must not fall back to the mechanical formula “chapter count divided by a fixed chapters-per-volume”. The system should first give a dynamic structure-suggestion range from length, then let AI choose the final volume count from stage promises, selling-point switches, situation upgrades, stage payoff, and end-of-volume pull. Short and mid-length books need a three-act or four-segment structure protected, so an ~80-chapter story is not crushed into an opening volume and an ending volume. Ultra-long books need a higher volume-count ceiling, so 1000+ chapters are not crushed into a few giant volumes that lose stage payoff and later scheduling room. Existing volume drafts and user-fixed volume counts are author control and stay compatible. Dynamic structure suggestion is used only for new generation or when the user actively restores the system suggestion.

Character relations should not display only as a list. The relation page’s default entry should be an interactive relation net: nodes are character assets; edges are surface relations, hidden tension, or dynamic stages; the right detail explains why the relation matters and what the next turning point is. The global view shows the whole net. The current-character view should put the selected character as the left origin, expand direct relations rightward as a tree, and make both the relation line and the detail name both sides in the current viewing direction. The protagonist is the narrative anchor of the graph and should have a core style distinct from ordinary characters, so users can find the story center in a complex net. Relation node cards need enough area for name, identity, goal, and status tags. Do not sacrifice readability to compress the canvas. Graph layout must compute node avoidance from actual character-card width and height, and expand a virtual canvas for view zoom when needed, instead of stuffing nodes into a fixed height so cards overlap. Character nodes may be dragged temporarily to tidy reading order. Until coordinate persistence is designed, dragging applies only to the current canvas and does not write character data. Switching the focus character inside the same relation view must not clear positions the user just arranged. Only switching relation views, reloading the graph, or re-entering the page returns to the system layout. High-density views such as graphs, editors, and consoles should reuse the global fullscreen View component, with a unified title region, action region, Esc exit, and scroll lock, so pages do not each write their own fixed fullscreen layout. Cast options, dynamic character systems, and relation diagnosis remain important, but they should sit as tools under the relation graph, not occupy the first screen. Later thought line, dialogue-influence records, and relation-stage simulation can then land on the same relation net.

This rule serves the long-term blueprint: even if maps, faction relations, character thought lines, or multi-world assets are added later, first answer “how does this help finish the current book”, then decide whether it enters the main-workspace first screen.

## Simulation And Author Intervention

Simulation can be introduced later, but phase one should not become open-world play.

A more natural evolution order is:

```text
novel production chain
-> world / character / faction state visualization
-> character thought line and dialogue
-> pre-chapter plot simulation
-> multi-option impact preview
-> IP universe asset management
-> interactive film-game or gamified derivatives
```

Short-term imaginable interaction is not “the player chooses the next step”. It is “the author tests different development directions”. For example:

- If the protagonist reveals identity early, which character relations are affected?
- If a faction joins the war early, what is the conflict cost of the next three chapters?
- If a key item in a character’s pack is consumed now, will later setups break?
- If user–character dialogue changes an attitude, how should the system mark the impact range?

This kind of simulation should output impact analysis, risk, recoverable points, and a recommended path. It should not write into canon directly.

## Multi-World And IP Universe

The multi-world derivatives and intersections users mentioned can grow into IP-universe management over time.

Possible asset layers:

- Main world: the world instance this novel actually uses.
- Derived worlds: sequels, side stories, parallel lines, IF lines, or different-medium versions.
- Intersection events: characters, relics, organizations, disaster sources, or historical truths shared across worlds.
- World migration: converting characters, factions, items, or ability systems under different world rules.
- Compatibility checks: whether world rules, ability costs, timelines, and faction relations conflict.
- Cross-world timeline: which events are main-line canon, and which belong to derivative or branch lines.
- IP asset packs: characters, factions, maps, ability systems, and writing styles that can be reused and inherited.

Multi-world capability must wait until single-book world state is stable. Otherwise setting drift and cognitive load both grow.

## Product Principles

- **Finish the novel first**: game-editor capabilities must serve whole-novel completion rate. They must not turn the main chain into a high-threshold sandbox.
- **State before text**: world, character, faction, event, and resource state should be explicit before prose generation.
- **Visualization serves understanding**: maps, graphs, and consoles lower cognitive load. They do not increase hand maintenance.
- **Interaction must be traceable**: if user interaction with a character, world, or simulation system will affect later text, it must become a reviewable record.
- **AI simulates, the user confirms**: high-impact state changes should come as AI advice, impact range, and risk, then the user confirms the write.
- **Canon and draft stay separate**: simulation, character dialogue, and IF lines stay out of canon by default unless the user explicitly confirms.
- **Assets are reusable but isolated**: reuse across books or worlds must keep source and adaptation boundaries.

## Non-Goals For The Current Stage

- Do not turn the novel main chain into player-play mode.
- Do not require beginners to maintain a complete map, faction graph, and variable table.
- Do not turn character chat into a general entertainment chat entry.
- Do not make interactive film-game, open-world play, or multi-world intersection a current main-chain prerequisite.
- Do not weaken Auto-Director, chapter production, or the quality loop because a game-editor workspace is a future goal.

## Failure Modes

- **Sandbox too early**: the user has not finished volume one and is already distracted by maps, variables, relation graphs, and character chat.
- **Character chat pollutes canon**: after casual chat with a character, the system writes unconfirmed content into later chapters.
- **World graphs leave the generation chain**: maps and faction graphs are decoration and never enter chapter missions or context assembly.
- **Simulation results are unrecoverable**: multi-option tests modify state directly, and the user cannot return to the original route.
- **Multi-world reuse too early**: derived worlds are created while the main world is still unstable, causing rule conflict and setting contamination.

## Related Modules

- `docs/wiki/product/beginner-first-novel-completion.md`
- `docs/wiki/product/world-skeleton-generation.md`
- `docs/wiki/architecture/world-context-gateway.md`
- `docs/wiki/workflows/character-resource-ledger.md`
- `docs/public/development-roadmap.md`
- `client/src/pages/novels/`
- `client/src/pages/worlds/`
- `server/src/services/novel/`
- `server/src/prompting/`

## Source Documents

- User discussion of a “game-management-style novel creation platform”.
- User ideas for world maps, faction maps, character thought lines, character dialogue, and multi-world derivatives and intersections.
- [Beginner-first full-novel completion](./beginner-first-novel-completion.md)
- [World skeleton generation](./world-skeleton-generation.md)

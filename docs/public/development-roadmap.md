# Public roadmap

This roadmap is for people using the product and people following where it is going. It is grouped into **done**, **in progress**, and **next focus**, so you can see what is actually available.

The full update history is in [Release notes](#/docs/release-notes). Internal design docs stay private; public capabilities land on this page when they are ready to talk about.

## Done (main deliveries in the last 3 months)

Newest first. Each item matches a public release. Open [Release notes](#/docs/release-notes) for the details.

- **2026-06-29** Public docs site navigation, search, and production-chain depth docs: walkthrough, Auto-Director stage map, chapter execution chain, knowledge and RAG recall, recovery by phase.
- **2026-06-28** RAG vector tuning and upload UX: adjustable Embedding and Qdrant write concurrency, streaming index, drag-and-drop file preview, virtualized browsing.
- **2026-06-28** Character appearance fusion: appearance terms scanned from chapters enter a confirmation area; after fusion they affect character profiles and later image generation.
- **2026-06-27** Book-analysis character depth plus appearance evolution: brief / standard / in-depth / complete profile levels; chapter appearance is saved at 25 / 50 / 75 / 100% coverage.
- **2026-06-26** Book-analysis budget caps, publish isolation, and structured retrieval.
- **2026-06-25** Book-analysis result page first-screen simplification, range selection, and two-pane comparison.
- **2026-06-24** Book-analysis evidence tracing, structured timeline, and focused generation.
- **2026-06-23** Character resource ledger, image-generation confirmation dialog, and Auto-Director pause reminders.
- **2026-06-18** Comic studio consistency: scene library, character assets, appearance-anchor AI help.

## In progress

These directions have a design or code on the main line, but they are not announced as complete. Closer-to-user items come first.

### Chapter editor v2

Keep chapter writing, review issue lists, repair results, and quality debt in one editor entry, so you spend less time bouncing between the chapter page and the Task Center.

### Isolated Auto-Director execution

Let take over / continue / recover / replan travel through one pipeline engine. Each step module has input, output, progress checks, and a recovery contract, so long tasks stay more predictable during concurrency and restarts.

### Prompt workshop plus step runtime

Put prompts that currently live in many places into an editable, versioned workshop bound to steps. Keep the step runtime in sync so prompt edits show up in Auto-Director stages.

### Character resource ledger plus character-system upgrade

Characters become more than a profile card plus state. They carry action limits, narrative jobs, relationship tension, and a chapter context pack. The ledger focuses on resources and abilities; the upgrade focuses on narrative jobs.

### Chapter production pipeline

Around draft generation → review → repair → state write-back, make single-chapter output more stable, make failures easier to locate, and keep chapter after-work in one place.

### Comic adaptation studio

Share the “novel IP → visual content” base with the drama pipeline. The goal is one set of keyframes that can produce **vertical comics (static long images) plus motion comics (animated comic video)**.

### Drama production pipeline v3

On top of the existing three content sources / pacing engine / script pipeline / storyboard / video prompts, fill the remaining pieces needed for a publishable cut (character composites, shot continuity, finished export, and similar).

### Creative Hub runtime

Give Creative Hub a more reliable conversation runtime so status questions, tool use, and next-step guidance stay stable.

## Next focus

These directions are still being evaluated or explored. They are not a final plan:

- **Long-range context memory**: keep world rules, character state, timeline, foreshadowing, and writing style in generation after 30+ chapters, not only in the opening.
- **Cross-book asset reuse**: genre bases, story modes, world samples, character profiles, and style assets can be reused across novels while keeping their source.
- **Narrative engine workspace**: over time, the novel main chain can feel more like a creation console than a document generator. World, characters, factions, resources, events, and chapter text become assets you can observe, simulate, and write back. Chapter text is the world state rendered from one chapter’s viewpoint, not isolated text completion.
- **World and character visualization**: world maps, faction maps, relationship maps, power-system trees, character thought lines, character conversation, and character resource state can gradually become part of the writing desk. The goal is to help you understand and run the novel world, not to ask a beginner to maintain game data tables first.
- **Multi-world and IP-universe assets**: after one book’s world state is stable, explore sequels, side stories, parallel lines, IF lines, and cross-world overlap. Characters, factions, items, ability systems, and world rules can become reusable packs, while keeping source, adaptation limits, and canon / branch labels.
- **Desktop install and recovery for ordinary users**: one-step model-provider setup, sensible local knowledge-library defaults, and self-serve recovery entries for errors.
- **A more reliable quality loop**: review / repair / quality debt become measurable, so one book can produce a quality report.
- **Open research value**: keep the project useful to study how an AI product combines long-chain tasks, a knowledge library, Auto-Director, and creative assets.

The narrative-engine workspace is a long-term picture. It does not mean the main chain will become an interactive game soon. The current priority is still a stable Auto-Director, chapter production, world / character context, and quality loop. Game-editor capabilities are evaluated only when they lower writing load and raise the chance of finishing a long novel.

## How this page is kept

When a public release lands, a new item is added at the top of **Done**, and the matching **In progress** item is removed or merged. If a plan is paused or re-evaluated, it moves to **Next focus** or is removed so this page does not keep stale promises.

This page does not list internal task checklists, temporary checkpoints, unpolished drafts, or developer-only execution plans.

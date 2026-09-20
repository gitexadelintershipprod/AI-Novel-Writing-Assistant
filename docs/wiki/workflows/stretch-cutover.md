# Stretch cutover: English protocol, no Market Radar

## Background

Stretch is a clean product for beginner writers. Historical Chinese protocol dual-read, overlay translation of leftover Han UI, and Market Radar (including scrape titles) raised cognitive load and kept a Chinese compatibility path that this fork no longer needs. Creative data was backed up and wiped so stored protocol can be English-only.

## Decision

Start empty after a verified backup. Keep LLM settings and built-in Genre / Story Mode / Writing Profile / Anti-AI seeds. Delete Market Radar as a module, not a disabled flag. Delete Chinese protocol maps, the startup migrator, parser aliases, overlay catalog keys, and Chinese keyword routers. Generated fiction stays Georgian.

## Current Rule

- Auto-Director opens from the writer's own idea only. There is no `/market-radar` route, brief ID, or `getBriefPromptBlock` hop.
- Stored protocol values (`storyFunction`, growth stage, world type, beat `roleLabel`, Creative Hub thread titles, snapshotted task labels) are English-only. `canonicalizeStoryFunction("protagonist")` is valid; Chinese aliases are not read.
- `legacy-ui.json` is empty. Source copy is English. Do not add Chinese overlay keys.
- Han tokens that remain in sanitizers, prose-quality detectors, comic speaker-prefix strip, and encoding/mojibake checks are leak guards, not compatibility maps.
- Chapter quality debt still must not stop the global auto-director chain. Local issues remain chapter-level warnings.

## Failure Modes

- Treating leftover Han in leak-guard regexes as dual-read aliases and deleting them would let Chinese honorifics or speaker prefixes leak into Georgian prose.
- Routing Auto-Director through a market brief ID after deletion fails at compile/runtime. Do not reintroduce `marketBriefId`.
- Re-adding Chinese `parserHints.aliases` or chapter-number regex routing violates the AI-first planner rule.

## Related Modules

- Auto-Director create flow
- Prompt Registry (no `market_radar.*` assets)
- Georgian content policy
- English UI maintenance

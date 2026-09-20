# World skeleton generation

## Background

The default world-library creation flow is for writing beginners. The old flow was layered fields and form-style completion. Users had to understand the jobs of `background`, `geography`, `factions`, and similar fields before they could tell whether a world was usable for a novel. That raises cognitive load, and it leaves worlds under-specified on factions, locations, relations, and opening entries.

## Decision

The default world generation flow produces a world skeleton, not the old flat field draft. The flow is:

`world intent -> world scale -> skeleton preview -> save world`

Skeleton generation returns structured world data: core rules, camps, concrete factions, key locations, faction relations, location connections, story entries, and completeness diagnostics. Old flat fields are compatibility display only, derived from the structured data.

## Current Rule

- The default entry uses `world.skeleton.generate@v2`.
- Users can choose three scale presets: `light`, `standard`, and `epic`.
- Users can fine-tune counts for core rules, camp directions, concrete factions, key locations, relations/conflicts, and story entries.
- One generation returns only referenceable skeleton cards, not world-setting prose. Use short sentences and keep the overall text budget around 3,200 characters. When scale grows, add more entries instead of lengthening each entry.
- Skeleton calls wait at most two minutes and reserve a fixed token budget for a complete output. If structured JSON is truncated, malformed, or fails the skeleton contract, do not repeatedly repair or retry the same large output, and do not save a half-built world.
- Those failures must tell the user to retry at a smaller world scale; only switch models after continued failure. After the world is saved, the world handbook can still add detail by layer.
- Results must meet quantity constraints, especially faction and location counts requested by the user.
- Locations must include map-drawable information: relative coordinates, direction, risk, controlling faction, and story role.
- Faction relations and location connections must land in structured relations. Later visualization must not guess them.
- Layered generation remains a hole-filling and local-rewrite capability in the world handbook. It is not the default creation path.
- For a world that already has a trusted skeleton, six-layer organization must derive writing summaries from the structured skeleton. It must not call the old layered prompt to generate a second set of world content.
- Structure with `metadata.seededFrom=legacy-text` only means a reverse-inference from old fields. It is not a trusted primary source that may overwrite six-layer summaries. That prevents JSON text or dirty data in old fields from contaminating the world skeleton.

## Failure Modes

- If the prompt returns only old fields or encyclopedia paragraphs, the call used the old `world.draft.generate@v1`.
- If model output stops mid-JSON or generation exceeds two minutes, end the current request and show a retryable message. Do not leave the UI in “generating”, and do not persist a broken structure.
- If faction or location counts miss the user setting, fix the prompt schema or `postValidate`. Do not hide the gap in the frontend.
- If the map can only lay out in a ring, first check whether `locations` lack `x/y/directionHint`, and whether `relations.locationConnections` is empty.
- If RAG mixes in unrelated knowledge-base content, check that world generation received only the reference context the user explicitly selected.
- If “rebuild six-layer summaries” produces JSON, leftover brackets, odd faction names, or a sudden drop in location count, first check whether `structureJson.metadata.seededFrom` was changed to `legacy-text` by the old layered flow. Restore from a trusted snapshot or the skeleton source instead of generating from the contaminated structure.

## Related Modules

- `shared/types/worldWizard.ts`
- `shared/types/world.ts`
- `server/src/prompting/prompts/world/worldDraft.prompts.ts`
- `server/src/services/world/worldSkeletonGeneration.ts`
- `client/src/pages/worlds/WorldGenerator.tsx`

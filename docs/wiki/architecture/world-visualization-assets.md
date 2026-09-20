# World visualization asset boundary

## Background

The world module needs to let writers see places, factions, rules, and time changes in a world. Geographic maps are especially easy to misread as real GIS maps, but novel writing needs "relative space that can guide narrative," not precise latitude/longitude or professional cartography.

## Decision

World maps use a 0-100 relative coordinate system for major place positions:

- Larger `x` means farther east.
- Larger `y` means farther south.
- `directionHint` is north, south, east, west, center, or a diagonal bearing.
- `regionType` is continent, country, region, city, landmark, border, route, or other.
- `edges` express adjacent, passage, isolation, or control relationships between places, and may carry a route type.

This data is used to draw major places and connections in a novel world. It does not promise real geographic scale, boundary area, or precise distance.

## Current Rule

World visualization data prefers the structured world handbook:

1. `locations` produce map nodes and carry terrain, risk, narrative role, and controlling faction.
2. `locationControls` may produce control or boundary relationships between places.
3. If the structured world is insufficient, legacy `geography/background` text produces conservative relative coordinates from place names and direction words.
4. The AI visualization prompt must output map coordinates that can be cleaned. It should not return only a place list.

Frontend rendering rules:

- When `x/y` exist, draw with the world-map layout.
- When coordinates are missing, fall back to automatic layout so old data can still be shown.
- Map nodes show place name, bearing, terrain, and risk hints.
- Routes may be distinguished by types such as road, river, sea route, teleport, trade route, military route, and border.

## Failure Modes

- If places are only shown in a circular layout, users will think the system is still just a relationship graph and will not understand place bearings.
- If relative coordinates are treated as real geographic coordinates, the UI creates a false sense of precision.
- If there are no structured places and extraction relies only on free text, the map can only be a sketch and cannot express complete region boundaries.
- If the prompt does not require coordinates, the LLM tends to return a list of place names, and the frontend can only fall back to a relationship graph.

## Related Modules

- `shared/types/world.ts`
- `server/src/services/world/worldVisualization.ts`
- `server/src/services/world/worldVisualizationSchema.ts`
- `server/src/prompting/prompts/world/world.prompts.ts`
- `client/src/pages/worlds/components/WorldVisualizationBoard.tsx`

# Auto-Director idea constellation

## Background

Complete beginners often only have a vague opening feeling. Asking them to write characters, world, conflict, and a long-term goal raises cognitive load. Returning only a few complete synopses takes away combination and choice. The idea constellation sits in Auto-Director’s “starting idea” stage. It uses a limited set of optional elements so the user can form a clear preference, then hands the selection to AI to close into a starting idea that planning can continue from.

## Decision

The constellation boundary is “AI generates concrete material from the current opening context, the user selects material, AI finishes the semantic combination”. Once a genre base and progression mode are chosen they are fixed context. The constellation must not replace them on its own. Candidates and the final starting idea must be generated through structured prompts in Prompt Registry. Do not disguise context-free static copy as AI results, and do not fall back to an abstract generic word bank when generation fails.

## Current Rule

- The constellation always has seven dimensions: protagonist opening, genre stage, golden finger / core advantage, first-chapter hook, early goal, core resistance, key relationship.
- At most one item per dimension. The frontend only does exclusive selection, layout, and keeping existing selections. It does not infer user intent with keywords.
- The dynamic candidate contract always returns 35 items, five per dimension, all shown at once. Each item has a stable category, a 2–48 character concrete label, an explanation, and a match score. IDs and labels must be unique. Generate and combine APIs must use the same label-length contract so a candidate can be shown and then confirmed.
- The desktop constellation may wrap concrete labels. Collision size must match the actual rendered width. Prefer random scatter; remaining items are placed by a deterministic empty-slot scan. Do not use an unchecked fallback coordinate when a random position cannot be found.
- Candidates must fit the current genre base, primary progression mode, secondary progression mode, and existing idea. Missing context may be filled, but each option must still land on a person, scene, ability, event, goal, opponent, or relationship. It must not collapse into a theme sentence that fits most stories, such as “fate, truth, sacrifice, everyone is lying”.
- Auto-Director starts from the writer’s own idea. Do not inject an external market brief, ranked-work titles, or a hidden radar hop into constellation generation.
- Golden finger / core advantage should say what the protagonist can do, and the explanation should give a trigger, a boundary, a growth direction, or a cost. Realistic genres may use professional skill, information gap, identity resource, or a scarce relationship. Do not force a supernatural system.
- The first-chapter hook must be able to happen in chapter one. The early goal should point at a result payable in the first 10–30 chapters. Core resistance should have a clear capacity to act. The key relationship should name both sides and how they are bound.
- The final combination contract takes the user’s real selections and the fixed opening context and outputs a single 45–220 character starting idea. AI must arrange the elements as cause and effect, not mechanically concatenate labels.
- On structured failure, only one controlled retry with the original business context is allowed. Transport errors are thrown. Do not invent creative content with a context-free generic repair.
- The constellation only owns the starting idea. It does not add an Auto-Director runtime stage, recovery checkpoint, or task-projection stage. The combination writes back into the existing idea input and continues along the original create flow.

## Examples

- The user already chose urban workplace plus suspense contest: the protagonist opening can be “a junior planner whose project was stolen”, the core advantage “seeing hidden costs in a contract”, the first-chapter hook “the fiancée vanishes at the celebration banquet”. Do not change the genre into xianxia or return only “everyone lives in a lie”.
- The user selected only one golden finger: the combination prompt may lightly fill protagonist identity, first-chapter action, and early goal so the result can open a book, but it must not override that ability and invent a complex main plot.

## Failure Modes

- The seven categories are incomplete or a category repeats: check the structured schema, examples, and model output budget. Do not invent options in the service or frontend.
- Candidate structure is correct but it drifts from genre or progression: check opening-context assembly and retry with the original context. Do not let context-free JSON repair rewrite the creative work.
- The page shows fixed abstract terms and “another set” makes no LLM request: check whether the create-page controller bypassed `/idea-constellation/options` with a static array. Correct behavior is a generating state, a retry entry on failure, and no static creative fallback.
- Combination output is only concatenated labels: tighten the combination prompt’s causal constraint or semantic retry. Do not template-join sentences on the frontend.
- Selected content disappears after refreshing candidates: check frontend candidate rotation and selection-keep rules. That is deterministic state handling, not an AI judgment.
- The constellation is added as a recovery stage or task-progress stage: revert the stage expansion. It is an optional ideation tool on the create page, not an independent production stage.

## Related Modules

- `shared/types/novelDirector.ts`
- `server/src/prompting/prompts/novel/ideaConstellation/`
- `server/src/services/novel/director/idea/`
- `server/src/services/novel/director/http/novelDirector.ts`
- `client/src/pages/novels/autoDirector/ideaConstellation/`
- `client/src/pages/novels/autoDirector/StageIdea.tsx`

## Source Documents

- [Prompt Registry and structured output](../prompts/prompt-registry-and-structured-output.md)
- [Auto-Director new-stage checklist](./auto-director-stage-checklist.md)

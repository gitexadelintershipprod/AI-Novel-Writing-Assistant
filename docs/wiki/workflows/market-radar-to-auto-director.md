# Market Radar and Auto-Director market brief

## Background

Beginner authors have a hard time turning "what genres are popular lately" into an executable protagonist, cheat, opening, and title plan. Letting users browse charts themselves raises judgment load. Handing ranked works straight to a generation model makes copying easy, sources unclear, and platform differences get flattened. Market Radar turns public chart metadata into traceable market signals and forms a creation brief before Auto-Director's first generation.

## Decision

Market Radar is an explicitly triggered pre-creation analysis entry. It is not a quality review and not a new Auto-Director runtime stage. It does not own a separate genre or propulsion-mode taxonomy: AI analysis only produces reusable production-foundation candidates. After the user confirms, those candidates resolve into the shared genre-base library and propulsion-mode library. Entering the page auto-starts public chart collection and shows factual data. That step must not call an LLM. Only after the user explicitly clicks Start AI analysis does clustering, trope recognition, crowding, opportunity judgment, and production-foundation recommendation run. After the user selects analysis signals, a persisted `MarketCreativeBrief` is created. Auto-Director receives only the brief ID. The server resolves trusted prompt blocks and resource references.

## Current Rule

### Current enablement boundary

Market Radar is temporarily off until a Georgian-suitable or otherwise explainable international source is connected. Server `MARKET_RADAR_ENABLED` is the final permission boundary and defaults off. Client `VITE_MARKET_RADAR_ENABLED` only hides the entry and shows a disabled explanation; it cannot enable server capability on its own. While off, do not start chart-scan recovery jobs. All radar APIs return `503`. Auto-Director requests that carry a non-empty `marketBriefId` return `400` before reading the database or calling a model. Ordinary Auto-Director must run fully without a market brief.

Disablement is a reversible capability switch, not a module deletion. Source adapters, persistence, shared types, and radar Prompts stay in place. Before turning it back on, re-evaluate source compliance, language fit, and recommendation quality, and enable frontend and backend switches together.

- First sources are Fanqie ranking / new-book charts, Qidian bestsellers / monthly-ticket / new-book charts, and Jinjiang monthly / quarterly / new-author charts. Collectors read only the single public page configured per source and keep at most the first 30 successfully recognized metadata items. That count is not a full platform chart or all paginated data. The page must show "items recognized this run" and the 30-item cap. Do not describe the current snapshot as a "complete chart".
- Allowed collection: rank, title, author, category, public tags, synopsis, public heat, serialization status, and source link. Forbidden: chapter prose, paid content, login-state data, and user data.
- When the same book appears on multiple charts of the same platform, AI input merges the work and keeps all ranking evidence. The database still stores each chart appearance for historical comparison.
- Entering the page auto-starts one scan. Collection results show rank, title, author, and category by platform and chart. Desktop layout should use available width; chart cards share a unified height and scroll inside the card to show every successfully recognized record, so differing item counts do not make a jagged, overly long page. AI analysis scope and primary actions must sit above the raw chart list. After analysis, jump to results; raw records remain a reviewable evidence layer.
- Before the AI call, the user can choose analysis scope by work. Select-all / clear-all for a whole chart belongs on that chart card, not as duplicated chart shortcuts at the page top. Default selection still prefers new-book signals: if a platform has a usable new-book chart or Jinjiang new-author chart, default-select works on those charts; otherwise default-select works on that platform's mature charts. Final analysis must consume only the work IDs explicitly chosen this run, and must validate that they belong to this successful snapshot. Old clients that submit only chart scope or omit scope stay compatible with chart selection and the default rule on the server.
- Fanqie ranking pages protect some text with a private font. The collector must correct title, author, and synopsis from the matching public work-detail page, and must reject fields that still contain private-use characters before writing the snapshot. Do not hand obfuscated glyphs to the AI to guess.
- Scan and AI analysis share one persisted task, but they must be two independent stages: after `collectRankings` the task enters awaiting-analysis; `analyzeRankings` can only be triggered by an explicit analysis request. Do not auto-call an LLM on page enter or on collection-complete callback.
- Failure of a single chart is a platform warning; other sources continue. If every source fails, do not open AI analysis. After app restart, unfinished collect or analyze tasks are marked `interrupted`, keeping existing snapshots for a new scan or analysis.
- Within 30 minutes, the same platform combination reuses the existing task. Reports keep the collection time. After 24 hours they remain viewable, but the UI should let the user refresh.
- Without a same-platform same-chart historical snapshot, AI may only mark "currently frequent". Warming, stable, or cooling are allowed only after a comparable snapshot exists.
- Cross-platform analysis must supply, through structured `productionFoundation`, one genre base, one primary propulsion mode, and an optional secondary propulsion mode. A propulsion mode must include reusable drive, reader reward, pacing, escalation, and writing constraints. Do not persist a one-off trend label alone.
- AI should prefer `existingId` from the unified resource catalog supplied this run. When the candidate reference still exists, the UI shows "already in library" and a locate entry. Do not show a successful add or create a duplicate. Only when AI judges there is no equivalent asset should a manual add be offered. Before write, also reuse existing items by normalized name so repeated confirms do not create same-named assets.
- Genre base and propulsion mode are confirmed separately and each records a real resource ID. The UI may show "view library" only after the server reused or created successfully. Library entries must carry the resource ID and locate the matching node.
- Historical auto-sync reports must not present existing resources as newly added this run. If the reference still exists, show "already in library" and locate the original node. If the resource is gone, require re-analysis; do not fabricate assets from incomplete information.
- Market-signal cards only choose opening preferences for this run. They do not offer per-item ingest buttons, so title patterns, crowded tropes, and other non-resource conclusions are not mistaken for long-lived assets.
- Default creation selection is one differentiated opportunity plus at most three supporting signals. The user may select at most five. Default influence mode is "differentiate inside the popular set".
- The market brief must forbid reusing ranked works' character names, proprietary setting, synopsis wording, and complete titles. Keep only reader satisfaction, payoff mechanics, and structural opportunity.
- The market brief resolves unified resources again from the user's final selected signals, and persists resource IDs together with the signals. Historical briefs stay compatible with the original signal array. Missing `productionFoundation` continues as an ordinary opening flow.
- After `marketBriefId` enters the opening page, the UI shows the radar-recommended genre base, primary propulsion, and secondary propulsion, and only fills fields not yet chosen. Production foundation the user already chose manually must not be overwritten by an async brief.
- `marketBriefId` also enters opening inspiration, idea constellation, whole-book direction, and title generation. A market brief must not block ordinary opening that has no market data.

## Failure Modes

- Platform page structure change yields zero items: mark that source failed and show a source error. Do not fabricate analysis from a fixed genre word list.
- Warming / cooling appears without enough history: check the cross-platform Prompt's `hasComparableHistory` and semantic validation.
- Market brief works in idea constellation but direction or title is lost: check whether the Auto-Director task seed kept `marketBriefId`, and whether candidate stages resolve prompt blocks on the server.
- The page submits prompt text directly: reject that path. The client may submit only a brief ID, so unverified text does not enter core generation context.
- One platform failing collapses the whole scan: check platform isolation. Analysis may stop only when every source has no usable items.
- Entering Market Radar already produces a model call: check whether the page only calls `/scans`, and whether the collector wrongly calls `analyzeRankings` directly. AI may be triggered only by `/scans/:id/analysis`.
- Collection finished but the UI stays at 60%: check whether collect and analyze still share an old overall progress. Each independent stage must reach 100% when it finishes, then start a new stage progress for AI analysis.
- Backend is already `ready / 100%` but the page still shows "fetching": once task detail is loaded, UI must treat task status as authority. A start-request mutation must not overwrite a finished task. Request state applies only to the short period before task detail exists.
- Fanqie titles contain private-use symbols or wrong glyphs: check whether ranking-detail correction succeeded. Historical snapshots that still contain obfuscated characters must not hit the 30-minute reuse protection; recapture a new snapshot.
- Page item count is read as a complete chart: check whether the UI states "single public page", "successfully recognized this run", and "at most 30 per chart" together. Collectors that do not paginate must not promise a full dump.
- Repeated radar analysis creates same-named assets in the library: check whether AI reused catalog `existingId`, and whether the server matched normalized names before write. Do not infer genre ownership with keyword branches.
- UI shows "added" but the library cannot locate it: check whether `productionFoundationSync` was written by a successful manual-add request, and whether the library link carries a real node ID. Do not infer "added" from a candidate or historical `productionFoundation`.
- After a successful create the library still shows the old catalog: check whether the add-success callback invalidated the matching genre or propulsion-mode query cache. Do not refresh only the radar report.
- User manual selection is replaced by the brief: check whether the create page uses a fill-empty-fields-only merge. Market recommendations are defaults, not forced overwrites.

## Related Modules

- `server/src/modules/marketRadar/`
- `server/src/prompting/prompts/marketRadar/`
- `shared/types/marketRadar.ts`
- `client/src/pages/marketRadar/`
- `server/src/services/novel/director/`

## Source Documents

- [Auto-Director idea constellation](./auto-director-idea-constellation.md)
- [Prompt Registry and structured output](../prompts/prompt-registry-and-structured-output.md)

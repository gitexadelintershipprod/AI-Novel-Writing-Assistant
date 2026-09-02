# Georgian writing maintenance

The fork keeps its application interface in English and fixes generated creative content to Georgian (`ka-GE`). This is a content policy, not a locale selector: no public API field, database column, route, identifier, or persisted enum was added or renamed.

## Runtime policy

- `CONTENT_LANGUAGE` is `ka` and `CONTENT_LOCALE` is `ka-GE`.
- Every active creative `PromptAsset` is declared with `language: "ka"`.
- The prompt runner injects the shared Georgian policy before execution, including after advanced-template rendering.
- System instructions remain in English so control rules are maintainable; user-visible creative and analysis results must be natural Georgian.
- Image-provider visual prompts remain English where providers need English input, but an exact Georgian title can be preserved as cover typography.

The policy requires natural Georgian syntax, correct case and agreement, appropriate verb forms, and avoidance of English or Russian calques. JSON keys, schemas, protocol values, IDs, provider names, and persisted compatibility enums must remain unchanged.

## Preserved systems

Genres, Story Modes, Writing Profiles, Style Engine, Anti-AI, Title Studio, Auto Director, chapter planning and writing, short stories, Creative Hub, Book Analysis/RAG, comics, and drama remain enabled. The four built-in Writing Profile IDs are deliberately stable:

| Compatibility ID | English UI label |
| --- | --- |
| `fanqie_free` | Georgian Serial |
| `qidian_male` | Progression & Adventure |
| `jinjiang_female` | Character & Relationship |
| `zhihu_story` | Georgian Short Story |

Built-in creative seeds use the marker `system.creative_seed_profile=ka-GE@1`. Seed synchronization updates only known built-in IDs; it does not remove or rewrite custom rows.

## Market Radar boundary

Market Radar is the only paused creative feature. Both `VITE_MARKET_RADAR_ENABLED` and `MARKET_RADAR_ENABLED` default to `false`. Source parsers, source-specific prompts, tables, and compatibility code remain in place for a future Georgian or suitable international data source. Their Chinese source terms are intentionally classified in the Georgian-content allowlist.

## Text metrics

The shared Georgian metrics normalize text to NFC and use `Intl.Segmenter("ka-GE")` with a Unicode fallback. Punctuation and whitespace do not count as words; hyphenated and apostrophe-connected forms remain one word. Active production defaults are 1,500 words per chapter, a 1,200-2,000 UI recommendation, 5,000 words for a short story, and 80,000 words for a long novel.

Georgian titles allow 1-10 words and at most 80 Unicode code points. Duplicate detection uses Georgian word tokens with a trigram fallback. The stored `clickRate` field remains for compatibility but is presented as an AI hook score, not market CTR.

## Required checks

Run these checks after every upstream merge or creative-prompt change:

```bash
pnpm check:english-ui
pnpm check:georgian-content
pnpm typecheck
pnpm lint
pnpm test:all
pnpm build
pnpm build:desktop:all
pnpm verify:desktop-package
```

`check:georgian-content` scans active prompt assets, context builders, built-in profiles, story-mode/style seeds, and selected production call sites. Its allowlist entries are exact path/text/category/reason records. Do not broaden the allowlist to silence a new active Chinese instruction; fix the source instead.

## Upstream synchronization

Keep `main` as an upstream mirror. Merge it into the Georgian feature branch without rebasing or force-pushing:

```bash
git fetch upstream
git checkout main
git merge --ff-only upstream/main
git push origin main
git checkout feature/georgian-writing
git merge main
pnpm check:english-ui
pnpm check:georgian-content
```

Likely conflict areas are the prompt registry, prompt assets, built-in profile and seed definitions, shared text metrics, client writing defaults, `pnpm-lock.yaml`, and Market Radar entry points.

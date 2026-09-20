# Prompt Registry Module Boundary

## Background

Prompt Registry contains both a large lazy-load inventory and a smaller amount of runtime cache and validation logic. Stacking both responsibilities in the same file makes every new or upgraded Prompt keep expanding a stable runtime file.

## Decision

- `promptAssetLoaderEntries.ts` only maintains the declared inventory from Prompt id/version to lazy-load functions.
- `../registry.ts` owns duplicate-registration checks, lazy loading, caching, lookup by id/version, and the public API.
- External modules continue to import from `prompting/registry.ts` and must not deep-depend on inventory internal files.

## Current Rule

1. A new Prompt or version upgrade only changes the load inventory; do not add business branches in the runtime registration logic.
2. The Prompt declared version, inventory key, and test expectations must stay consistent.
3. The inventory keeps lazy `require` so startup does not load every Prompt asset at once.
4. Registration runtime must continue to check duplicate keys, actual-asset version drift, and cache conflicts.

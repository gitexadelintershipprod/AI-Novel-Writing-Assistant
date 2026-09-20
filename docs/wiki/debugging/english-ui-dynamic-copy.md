# English dynamic UI copy

## Failure mode

The legacy presentation boundary can translate a static phrase successfully while leaving a count-dependent sentence partly Chinese. A sentence assembled with an interpolated count may not match a catalog key; fragment-by-fragment fallback is not a reliable sentence translation. Native `window.confirm` dialogs are also outside the DOM translation boundary.

## Rule

Write complete English source copy or semantic i18n interpolation for dynamic controls. Keep units accurate: document preview truncation is measured in characters, not the Georgian word-count metric used for creative writing. Preserve preview limits, large-document confirmation guards, source content, and stored status values when fixing labels.

The Han allowlist records source classification, not proof that every rendered sentence is English. Remove obsolete entries only for the affected source strings; do not regenerate the entire allowlist to hide a failure. Test count-dependent labels at preview boundaries and test the native confirmation message directly.

Unicode escapes such as `\u5019\u9009` also evade the Han scanner: the source file contains only ASCII, but the runtime string is Chinese. Write leftover UI copy as ordinary English text. If a dual-read alias must be quoted, keep it as UTF-8 Han and allowlist that exact line.

## Related modules

- `client/src/pages/knowledge/components/KnowledgeDocumentDetailDialog.tsx`
- `client/src/pages/knowledge/components/KnowledgeLibraryOverview.tsx`
- `client/src/pages/knowledge/components/knowledgeRagUi.ts`
- `client/src/i18n/legacyUi.ts`
- `client/tests/knowledgeDocumentPreview.test.js`

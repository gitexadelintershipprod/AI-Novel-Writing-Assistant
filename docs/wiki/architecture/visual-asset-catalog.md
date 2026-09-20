# Visual asset catalog

## Background

Character images, covers, book-analysis appearance images, comic storyboards, and short-drama keyframes all produce reusable pictures, but they are stored by different modules. Some use `ImageAsset`; others keep URLs and version history in JSON fields on business objects. If every page queries pictures itself, authors cannot browse existing visual assets in one place, and "pick an image as a reference" is implemented again and again.

## Decision

The visual asset catalog builds a unified queryable projection with `VisualAssetProjection`. It does not merge, migrate, or copy files and facts from source modules. Each source adapter maps available images to the same `VisualAssetSelection`: a stable `assetId`, a `url` that can be shown immediately, resource type, source, scope, and generation information.

The asset picker saves or returns the full selection object. Callers may use `url` immediately, and they must also keep `assetId` so later tracing, reselection, and storage-implementation changes remain possible.

## Current Rule

- Original images and business facts still belong to source modules such as `ImageAsset`, comics, and short drama. The catalog only indexes; it does not own file lifecycle.
- Adapters may only include assets that are complete and have a valid URL. Broken JSON, missing files, or a single source failing must not interrupt the whole catalog.
- Catalog sync must be idempotent. A projection row is uniquely located by `sourceDomain + sourceType + sourceId + sourceVersion`. Historical versions may be shown independently.
- The library has Browse and Select modes. Select mode may return only assets inside the caller's allowed scopes and types. Browse mode does not own underlying deletes or primary-image replacement.
- Components must not read database models or business-page fields directly. The frontend depends only on the project-level visual-asset API and the shared selection contract.

## Failure Modes

- Scanning a generated directory directly will miss remote object storage, lose the business source, and may expose deleted or temporary files to users.
- Forcing every module to rewrite onto `ImageAsset` enlarges migration risk and breaks existing comic and short-drama version semantics.
- Returning only a URL loses source and reference relationships. After the URL storage strategy changes, callers cannot restore safely.
- Deleting a source file from the gallery bypasses the source module's primary-image, version-history, and reference constraints.

## Related Modules

- `shared/types/visualAsset.ts`
- `server/src/modules/visualAssets/`
- `client/src/components/visualAssets/`
- `server/src/services/image/`
- `server/src/services/comic/`
- `server/src/services/drama/`

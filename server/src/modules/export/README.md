# Novel Export Module

## Background

Novel export needs to read data from several stages at once: project setup, story macro planning, character preparation, volume planning, chapter execution, and quality repair. It is a cross-module read capability, but it must not become the source of truth for those stages, and export-format logic must not be scattered into the `services/novel` root.

## Boundary

- `novelExport.service.ts` owns application orchestration: reading export data, assembling the export bundle, and dispatching by format.
- `novelExport.mappers.ts` converts database rows and novel-service return values into stable export DTOs.
- `novelExport.formatting.ts` owns file names and content formatting for TXT, Markdown, and JSON payloads.
- `novelExport.types.ts` owns export structure types used inside the module and reused externally.
- `index.ts` is the module facade. External code should import export capability from `server/src/modules/export`.

## Current Rule

The export module may only read existing production data and generate file content. It must not directly modify novels, chapters, characters, timelines, quality reports, or pipeline state. When adding export scope, extend the export section types and mapper first, then have the service assemble them. Do not temporarily splice backend internal data structures in the route layer or the frontend.

`server/src/services/novel/NovelExportService.ts` keeps only a compatibility re-export. The old path no longer holds the implementation.

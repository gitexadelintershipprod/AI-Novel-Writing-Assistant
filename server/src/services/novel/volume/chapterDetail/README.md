# Chapter Execution-Contract Detail Boundary

## Responsibility

This directory owns the last structured-detail layer before volume planning enters single-chapter production: chapter purpose, boundaries, task sheet, reader-experience contract, and scene-card Schema, plus the corresponding AI generation and quality-gate calls.

## Dependency Rules

- Prompt assets may obtain Schema through the compatibility export in `volumeGenerationSchemas.ts`. Schema files must not load Prompt or generation services in the reverse direction, to avoid module-init cycles.
- AI generation may enter only through Prompt Registry assets and `runStructuredPrompt`. Inline business prompts must not be added inside the service.
- `volumeGenerationHelpers.ts` is the compatibility facade; external callers must not deep-import files inside this directory.
- Existing task sheets and scene cards continue to be reused when there is no new guidance. Quality gates, reader-experience fields, and scene-experience fields must not be relaxed in the compatibility layer.

# Asset Library Page Composition Boundary

This directory holds the visual contract reused across knowledge, genre, character, world, and rule asset-library pages: page header, status summary, recommended next step, content sections, and empty state.

- It only composes page structure and semantic state. It does not read APIs, hold business state, or execute asset operations.
- Page business components remain owned by their own modules. Externals use composition components only from this directory's `index.ts`.
- Status color uses the global `success`, `warning`, `info`, and `destructive` tokens. Do not scatter one-off colors across asset-library pages.
- The asset-library first screen should explain what the assets are for and what to do next. When the backend does not provide source, impact scope, or usage count, the UI must not guess or fabricate them.

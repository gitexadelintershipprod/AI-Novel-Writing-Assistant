# Backend testing

Long-lived business logic lives under [`server/tests/`](../../server/tests/) and uses **Node's built-in `node:test`** plus **`node:assert/strict`**. The default test entry builds `@ai-novel/shared` and `@ai-novel/server` first, then runs the everyday fast tests.

## How to run

```bash
# From the repository root (recommended)
pnpm test

# Backend fast tests only
pnpm --filter @ai-novel/server test

# Backend fast tests only, when the packages are already built
pnpm --filter @ai-novel/server test:node

# Heavy integration tests: real Prisma, migrations, compatibility
pnpm --filter @ai-novel/server test:integration

# Full entry: backend fast tests + backend integration + client tests
pnpm test:all

# Client node:test contract tests only
pnpm test:client
```

Example of a single file:

```bash
cd server && pnpm run build && node --test tests/chapterLifecycleState.test.js
```

Backend fast tests are grouped by [`server/scripts/run-tests.cjs`](../../server/scripts/run-tests.cjs). Default `test` excludes heavy files such as the real SQLite chain, migration smoke, RAG compatibility import, and prompt-governance scans. `test:integration` and `test:all` still cover those files. Client tests run TypeScript sources directly with Node 22 `--experimental-strip-types`; a separate client build is not required.

## Coverage focus

Existing cases include structured LLM parse and fallback ([`structuredInvoke.test.js`](../../server/tests/structuredInvoke.test.js)), director runtime and worker ([`directorRuntimeStore.test.js`](../../server/tests/directorRuntimeStore.test.js), [`directorWorker.test.js`](../../server/tests/directorWorker.test.js)), novel workflow recovery ([`novelWorkflowRecoveryNormalization.test.js`](../../server/tests/novelWorkflowRecoveryNormalization.test.js)), and prompt-governance registration ([`prompting-governance.test.js`](../../server/tests/prompting-governance.test.js)).

When you add a pure function or a state change, add a matching `*.test.js` under `tests/` and keep the existing style: **`pnpm run build` first**, then **`require("../dist/...")`** against the compiled output.

## Other quality gates

Root `pnpm typecheck` / `pnpm lint` complement the package scripts. After a large Director or Prisma change, run `pnpm test` locally before committing.

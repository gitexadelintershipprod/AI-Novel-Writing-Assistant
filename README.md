# AI Novel Writing Assistant

**From one idea to a finished novel.**

AI-native production engine for full-length novels. Go from one idea to a finished book with Auto-Director, recoverable chapter generation, world and character assets, and RAG. English interface; Georgian creative output.

![Monorepo](https://img.shields.io/badge/Monorepo-pnpm%20workspace-3C873A)
![Frontend](https://img.shields.io/badge/Frontend-React%20%2B%20Vite-61DAFB)
![Backend](https://img.shields.io/badge/Backend-Express%20%2B%20Prisma-111827)
![LangChain](https://img.shields.io/badge/AI-LangChain-0EA5E9)
![LangGraph](https://img.shields.io/badge/Agent-LangGraph-7C3AED)
![Editor](https://img.shields.io/badge/Editor-Plate-7C3AED)
![Database](https://img.shields.io/badge/Database-SQLite%20%7C%20PostgreSQL-111827)
![Vector DB](https://img.shields.io/badge/RAG-Qdrant-E63946)
![License](https://img.shields.io/badge/License-AGPL--3.0--only-blue)

This is not a chat box that continues your last sentence. It is a production workspace for people who have never finished a novel: Auto-Director turns a seed idea into direction, world, cast, and chapter tasks. A pause-and-resume pipeline then writes, reviews, repairs, and feeds new facts back into the book.

Public intro site: [gitexadelintershipprod.github.io/AI-Novel-Writing-Assistant](https://gitexadelintershipprod.github.io/AI-Novel-Writing-Assistant/)

## Who it is for

- Beginners who want to finish a full-length novel, not a few pretty paragraphs
- Writers who need a clear next step instead of a blank prompt box
- Developers studying AI-native products, agent workflows, LangGraph, and long-running production chains

If you only need a one-off paragraph generator, this project will feel heavy. If you want to keep a whole book coherent, it is built for that.

## Why it is different

Most AI writing tools work the same way: you send a prompt, you get prose, you retry when it drifts. That is enough for a short scene. It falls apart across a novel.

This workspace treats AI as a production role, not a autocomplete:

- It plans the book before it writes a chapter
- It stores world, characters, style, and knowledge as assets the next chapter can recall
- It pauses at real checkpoints instead of retrying forever
- Local chapter quality problems become follow-up debt; only a replan or a safety failure stops the whole run

## Recommended path

1. Write one sentence of inspiration and let Auto-Director propose book directions.
2. Confirm the book framing: genre, promise to the reader, and what the opening must deliver.
3. Prepare the world, cast, and long-term conflicts until the story can actually be written.
4. Split the book into volumes, rhythm boards, and chapter tasks.
5. Bind knowledge, book analysis, and writing style when you want later chapters to inherit more than a one-shot prompt.
6. Run chapter production: draft, review, repair, then write new facts back into the book.
7. Continue the next chapter or batch. Resume from the last checkpoint if a model or quota stop happens.

Georgian walkthrough of the live app: [Georgian user guide](./docs/public/georgian-user-guide.md).

## What you can do today

- **Auto-Director** — From one idea to a writable book: direction options, titles, world, cast, volume strategy, chapter list, then writing. Simple mode can keep going; Professional mode opens the full workbench. Every stage can pause and resume.
- **Creative Hub** — One place for conversation, planning, tool calls, task status, and the next recommended action.
- **Chapter pipeline** — Draft, AI review, repair, quality debt, and state write-back (characters, facts, foreshadowing) on one chain.
- **Book analysis** — Turn a reference work into reusable structure, character dossiers, and visual evolution notes.
- **Style engine** — Save, mix, and reuse writing features plus anti-AI rules so later chapters sound like the same book.
- **Knowledge and RAG** — Import documents, index them when you choose, and recall them during planning and writing. Qdrant is optional until you need retrieval.
- **Derived workshops** — Comic and short-drama tools sit behind finished novel material; they are hidden from everyday navigation in this fork.

## This fork

This repository is a fork of [ExplosiveCoderflome/AI-Novel-Writing-Assistant](https://github.com/ExplosiveCoderflome/AI-Novel-Writing-Assistant).

| Layer | Language |
| --- | --- |
| Product UI | English |
| Generated novel text | Georgian (`ka-GE`) |
| Internal developer wiki | English |

The live deployment of this fork is a Docker stack, not a hosted SaaS.

## Run it

### Option A — Docker (recommended on this server)

The app and its services run in containers. Do not start Node on the host OS.

Local four-service stack (Postgres, Qdrant, API, web):

```bash
docker compose -f compose.local.yml up -d --build
```

- Web: `http://127.0.0.1:8045`
- API (loopback): `http://127.0.0.1:3165`

Remote production uses `compose.remote.yml` and `scripts/deploy-remote.sh`. Secrets stay in `.env`; never commit that file.

### Option B — pnpm development (also in containers if you follow the project rule)

**Requirements**

- Node.js `^20.19.0 || ^22.12.0 || >=24.0.0` (prefer `20.19.x` LTS)
- pnpm `>= 10.6` (repo pin: `pnpm@10.6.0`)
- At least one LLM API key (you can start the app first, then paste keys in Settings)
- Qdrant only if you want knowledge recall (`RAG_ENABLED=false` skips it)

```bash
pnpm install
cp server/.env.example server/.env
pnpm dev
```

- Frontend: `http://localhost:5173`
- Backend: `http://localhost:3000`
- API: `http://localhost:3000/api`

The first server start runs Prisma generate and `db push`. You do not need to migrate by hand unless you changed the schema.

Then:

1. Open `/settings` and add a working model provider
2. Open `/settings/model-routes` and check which model each task uses
3. If you want the knowledge library, open `/knowledge?tab=settings` and save embedding / collection settings

The frontend usually does not need `client/.env`. In development it talks to `http(s)://<page-hostname>:3000/api`. Create `client/.env` only when the API lives on another host.

`pnpm install` does not download the Electron runtime. That happens on first `pnpm dev:desktop`, or with `pnpm run prepare:desktop-runtime`.

### Optional Windows desktop

Packaging is Windows x64 (`Setup.exe` installer or portable). This fork’s artifacts, when published, are on [GitHub Releases](https://github.com/gitexadelintershipprod/AI-Novel-Writing-Assistant/releases). Upstream Windows builds remain at the [original project’s latest release](https://github.com/ExplosiveCoderflome/AI-Novel-Writing-Assistant/releases/latest).

Default local data is SQLite. Docker uses PostgreSQL. Add Qdrant when you need retrieval.

## Useful commands

```bash
pnpm dev
pnpm build
pnpm typecheck
pnpm lint
pnpm test
pnpm --filter @ai-novel/site build
pnpm check:docs-manifest
pnpm check:english-ui
pnpm check:english-docs
pnpm check:georgian-content
```

## Stack

| Layer | Technology |
| --- | --- |
| Frontend | React 19, Vite, React Router, TanStack Query, Plate |
| Backend | Express 5, Prisma, Zod |
| AI orchestration | LangChain, LangGraph |
| Database | SQLite locally, PostgreSQL in Docker |
| RAG | Qdrant |
| Desktop | Electron (Windows x64) |
| Layout | pnpm workspace monorepo |

```text
client/   React + Vite app
server/   Express + Prisma + agent runtime + Creative Hub
shared/   shared types and contracts
desktop/  Windows Electron shell
site/     public intro site and docs chrome
docs/     public guides, wiki, and release history
```

See [docs/README.md](./docs/README.md) for how documentation is split.

## Roadmap

The priority is helping a beginner finish a book, not stacking extra side tools.

**P0** — Keep Auto-Director and chapter production stable: fewer false stops, less repeated review, world/cast/foreshadowing actually reaching the next chapter.

**P1** — Stronger whole-book consistency: rhythm, character growth, world state, style assets, and quality debt in one loop.

**P2** — Clearer agent collaboration, recovery, and observability across long runs.

## Latest updates

### 2026-09-22

- Model settings can connect OpenRouter. Enter an API key, load the models that key can use, and choose one for writing.
- Saved DeepSeek and Ollama chat connections are cleared. Add OpenRouter and choose a model to keep writing. Other vendors, and the knowledge-base embedding model, stay as they are.
- Knowledge materials now split into searchable sections by whole words and sentences, so a word is not cut in the middle.
- English reference books can be used while writing a Georgian chapter: the search question is turned into English only for those books, and the chapter is still written in Georgian.
- English books also keep a relationship graph of people, places, and writing techniques. If the graph is unavailable, ordinary search still works.

Full history: [docs/releases/release-notes.md](./docs/releases/release-notes.md).

## Contributing

Useful work includes production-chain stability, beginner Auto-Director success, style/knowledge consistency, tests, and runtime observability.

Opening a pull request means you have the right to submit the change and agree to [CLA.md](./CLA.md). Call out third-party or AI-generated material in the PR. See [CONTRIBUTING.md](./CONTRIBUTING.md).

## License

Dual license:

- Default distribution is GNU Affero General Public License v3.0 only. See [LICENSE](./LICENSE) and [NOTICE](./NOTICE).
- Offering this project (or a modified version) as a hosted backend, SaaS, or similar service to third parties requires a separate commercial license from the maintainer.

New contributions are submitted under [CLA.md](./CLA.md) and may ship under AGPL-3.0-only and in the maintainer’s commercial licenses.

## Notes

- The product is still moving quickly. The README describes the current main path, not every historical experiment.
- Public README, GitHub About, intro-site chrome, and the internal developer wiki are English. Generated fiction is Georgian.

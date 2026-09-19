# Install and prepare

This page helps you set up AI Novel Writing Assistant on Windows and confirm that models, storage, and knowledge options are ready.

## Recommended install

Most users should start from the desktop app on GitHub Releases:

1. Open [GitHub Releases](https://github.com/ExplosiveCoderflome/AI-Novel-Writing-Assistant/releases/latest).
2. Download the Windows installer or the portable package.
3. Start the app and open Settings.
4. Configure at least one working model provider.
5. Create a test novel and walk the First-run guide.

The installer is better for ongoing use. The portable package is better for a quick trial or running from a separate folder.

## What to prepare before the first launch

You need:

- a working LLM API key;
- the provider Base URL or a compatible official endpoint;
- a model that can handle planning, analysis, and chapter writing;
- a stable network connection;
- enough local disk space for the database, logs, assets, and generated results.

If you have not chosen a model yet, start with DeepSeek V4 Flash to walk the main chain. After that, use Model routing to assign different models to writing, review, book analysis, and similar tasks.

## Setup order

Finish setup in this order:

1. Open Settings.
2. Fill in the model provider, API key, Base URL, and default model.
3. Run a connection test and confirm the model returns a result.
4. Create a test novel.
5. Enter a simple idea, for example “a new writer searches an idea market for a lost story.”
6. Follow the First-run guide or Auto-Director through chapter 1.

Walk the shortest path first, then add the knowledge library, style engine, and detailed model routing. That makes problems easier to locate.

## Where data is stored

The desktop app stores novels, task state, settings, and the local database in the app data directory. [Troubleshooting](#/docs/troubleshooting) has log and backup guidance.

Back up important projects regularly. Keep at least:

- the app database files;
- novel export files;
- character, world, knowledge-library, and style assets;
- task logs or error screenshots.

Do not delete database files or reset data unless you already have a backup.

## Is Qdrant required?

Qdrant is used for vector search and knowledge-library recall. It is not a hard requirement for creating a novel and generating chapter 1, but it does affect note retrieval, book-analysis reuse, and long-book consistency.

Recommended approach:

- You only want to try the main chain: skip Qdrant for now.
- You need knowledge-library search: configure Qdrant and test indexing.
- You have a large reference library: keep Qdrant running stably.

If the knowledge library misses a document, first check whether indexing finished, then check search settings and the Qdrant connection.

## Running from source

Developers can run the site, client, and server from source. Confirm that Node.js and pnpm match the repository requirements, then install dependencies.

Common commands:

```bash
pnpm install
pnpm dev
pnpm build
```

Preview only the public site:

```bash
pnpm --filter @ai-novel/site dev
```

Source running is for development and debugging. Everyday writing should use the desktop app.

## After install

Do three things after install:

1. Complete a model connection test in Settings.
2. Create a test novel from one simple idea.
3. Confirm in the Task Center that long tasks show progress and results.

Those three steps cover the model, database, and task state. If any step fails, read [FAQ](#/docs/faq) and [Troubleshooting](#/docs/troubleshooting).

# Settings

Settings is where you configure model providers, API keys, knowledge-library connections, database-related preferences, and basic runtime options. On first use, Settings is a required stop.

## What to configure first

Configure in this order:

1. Model provider.
2. API key.
3. Base URL.
4. Default model.
5. Connection test.
6. Optional knowledge-library settings.
7. Optional task and interface preferences.

Confirm the model works before you enter the First-run guide.

## API keys and providers

When you fill in an API key:

- do not copy extra spaces;
- match the key to the provider and Base URL;
- confirm account quota and model permission;
- if the provider is OpenAI-compatible, fill in the compatible endpoint.

If connection fails, confirm the key in the provider console or with a simple request, then test again in the app.

## Base URL and model name

The Base URL must match the provider docs. Common mistakes include:

- extra or missing path segments;
- using a website URL instead of an API URL;
- a model name that does not match the provider’s real name;
- a proxy or network limit that blocks the request.

Copy the model name from the provider docs. Do not guess it.

## Qdrant settings

Qdrant is used for knowledge-library vector search. It is not a hard requirement for opening a book and generating chapter 1, but it does affect note recall, book-analysis reuse, and long-term consistency.

When you configure it, confirm:

- the Qdrant service is reachable;
- the address and port are correct;
- collection or naming strategy matches the app configuration;
- index tasks can finish.

If the knowledge library misses content, do not only change prompts. Confirm the Qdrant connection and index status first.

## SQLite and local data

The desktop app stores a local database and configuration. Treat that as important data:

- do not delete database files casually;
- export or back up important novels regularly;
- confirm a backup before migration, reset, or cleanup;
- keep logs and a data copy while diagnosing a problem.

Any action that can delete data should start with a backup.

## How to verify after setup

After setup, run the shortest check:

1. Test the model connection.
2. Create a test novel.
3. Let Auto-Director generate direction options.
4. Generate chapter 1.
5. Check Task Center status.

That path checks the model, database, task queue, and main-chain entry together.

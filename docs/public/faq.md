# FAQ

These are the questions people hit first. For harder failures, continue with [Troubleshooting](#/docs/troubleshooting).

## Which Auto-Director run mode should I pick?

Auto-Director has four modes. They decide how far the system runs after you confirm a book plan:

- **Complete director preparation first** (recommended for a first book): Auto-Director finishes planning, characters, volume strategy, and chapter tasks, then stops at a ready-to-write state.
- **Full-book autopilot**: After you confirm a plan, the system keeps producing chapter text. This needs a stable model supply and quota.
- **Run a selected range**: Only run a chosen range such as the whole book, the first N chapters, or volume 1. Use this to check a stretch before expanding.
- **After prose: AI check and repair**: This is a switch you can stack on the three modes above. Chapter output then includes a review-and-repair loop.

See the “Run modes” section in the [Auto-Director stage map](#/docs/auto-director-pipeline).

## Full-book autopilot stopped in the middle. What now?

Full-book autopilot **stops on purpose** when the model is unavailable, quota is exhausted, repair fails repeatedly, a replan is required, or there is a structural data problem. It does not retry forever. Then:

1. Open Director follow-up and read the pause reason.
2. Open the Task Center and confirm the latest failed task and error.
3. Fix the external cause (add quota, switch models, repair the network).
4. In Director follow-up, choose continue Auto-Director and resume from the original checkpoint.

Do not exit director mode or delete the project as the first move. Interrupted state is saved, and resume does not start from scratch.

## Do the intro site and the main app fight over the same port?

No. The main app client defaults to **3000**. The intro site defaults to **4173**.
They are independent and can run at the same time. If another process is using a port, change it in the matching config file.

## Where does the desktop app store data?

The desktop app stores the novel database, task state, settings, and generated files in the app data directory. On Windows this is usually under `%APPDATA%`.

Back up important projects regularly:

- app database files;
- exported novel text;
- character / world / knowledge-library / style assets;
- key task logs or error screenshots.

Before you investigate a data problem, **back up first**. Do not delete the database or reset data unless a backup already exists.

## The model connection failed. What should I check?

Check four things:

1. The API key is complete.
2. The Base URL matches the provider API.
3. The model name exists and supports the current task.
4. The network can reach the provider endpoint.

If the provider needs extra headers, a proxy, or an OpenAI-compatible path, follow the provider docs. If the model cannot connect, do not start complex tasks yet. Use a connection test or a short chat first.

## I created a novel and do not know the next step

Open the First-run guide or Creative Hub.

Recommended path:

1. Enter one sentence of inspiration.
2. Let Auto-Director generate direction options.
3. Choose a direction.
4. Let the system prepare the world, characters, and chapter tasks.
5. Run chapter 1.

Do not fill every advanced setting first. Get the main chain moving, then add assets.

## Chapter generation failed. What now?

Read the Task Center failure first, then choose:

- Temporary network or provider error: retry the task.
- The model output format is wrong: switch to a more stable model or lower concurrency.
- Novel basics are missing: go back to the novel page and fill them in.
- Repeated failure with no usable chapter text: open Director follow-up and see whether a replan is needed.

If the task produced usable text but review still reports issues, you can accept quality debt and continue later chapters. A local quality problem does not always need to stop the whole book.

## Why does the knowledge library miss content?

Common causes:

- The document is not finished indexing.
- Qdrant is not running or cannot connect.
- The document is not related to the current task.
- Search settings are too strict.
- A file was uploaded, but it is not in a recallable state yet.

Confirm the knowledge-library task finished, then check document status in the knowledge-library detail. For stronger recall, adjust search settings or write the key setting more clearly.

## Is an Auto-Director pause a failure?

Not always. A pause often means the system needs you to choose a direction, confirm a candidate, add information, or use a recovery entry.

Look at:

- the pause reason in Director follow-up;
- the latest task status in the Task Center;
- whether the novel page is waiting for a direction, cast, or chapter plan.

Treat it as a blocking problem only when there is an unrecoverable error, a data-integrity issue, or an explicit replan requirement.

## How should I set up model routing?

On first use, one default model is enough. After the main chain works, split by task:

- Opening and planning: a model that understands structure well.
- Chapter writing: a model that handles long text and keeps a stable style.
- Review and repair: a model that follows structured output and JSON requirements.
- Book analysis and knowledge analysis: a model with long context and strong information extraction.

If one task type fails often, check the model bound to that task first.

## Can it write a whole book in one click?

The product goal is to help a beginner finish a full novel. The more reliable path is automatic progress plus confirmation at key points. Direction, important characters, and chapter strategy affect the whole book. The system gives clear default recommendations and still keeps the confirmations that matter.

## How do I protect my data?

Export or back up important novels regularly. Do not delete the database, reset data, or manually clean the app directory unless a backup already exists. When you need to diagnose a problem, keep logs and a database copy.

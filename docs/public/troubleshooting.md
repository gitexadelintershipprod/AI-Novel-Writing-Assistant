# Troubleshooting

This page is a locate-the-problem path. Back up first before any action that can affect data.

## Sort the problem first

Put the issue in one category:

- Model: connection failure, timeout, provider error, unstable output format.
- Task: stuck, failed, waiting to recover, repeated runs.
- Knowledge library: indexing failed, search misses, recalled content is off-topic.
- Data: a novel will not open, content is missing, state is inconsistent.
- Interface: the page did not refresh, a button is blocked, an entry is hard to find.

Sorting first makes the matching entry easier to find.

## Check task status

For long tasks, start in the Task Center. It shows queued, running, completed, failed, and recoverable states.

Write down:

- task name;
- related novel;
- latest status;
- error message;
- whether retry or recover is available.

If the task is still running, do not click several similar entries. Confirm whether the background is already working.

## Check Director follow-up

For Auto-Director problems, start in Director follow-up. It tells you whether the system stopped at direction choice, setting preparation, chapter planning, chapter execution, or a recovery point.

Common next steps:

- Waiting for you to confirm a candidate: choose a direction or plan.
- Missing basics: go back to the novel page and fill them in.
- A task failed but can retry: continue from the recovery entry.
- A replan is required: follow the prompt back to the earlier plan.

Local chapter quality problems can usually be recorded as quality debt. They do not always need to stop the whole book.

## Model problems

Handle model errors in this order:

1. Test the connection in Settings.
2. Confirm the API key, Base URL, and model name.
3. Check provider quota, concurrency limits, and the network.
4. Try a more stable model on the same kind of task.
5. If structured output fails, route review, repair, and book-analysis tasks to a model that follows format more reliably.

Do not bypass AI task judgment with hardcoded keyword matching. Intent recognition, planning, and routing on the main chain should use structured AI output.

## Knowledge-library problems

When recall misses, check in this order:

1. Did the document upload succeed?
2. Did the index task finish?
3. Can Qdrant connect?
4. Are search settings too narrow?
5. Does the current question actually need that document?

If a document is long, put setting names, character names, place names, and theme words clearly in the title, summary, or key paragraphs so recall can find them.

## Backup advice

Back up before cleanup, migration, database reset, or manual deletion.

Minimum backup:

- copy the database files to a known path;
- confirm the backup exists and the file size looks normal;
- record the backup time and source folder.

A safer extra step is to export novel content and keep task error screenshots or logs.

## Page display problems

If the page looks out of date:

1. Refresh the page.
2. Go back to Home or Novels and enter again.
3. Check the Task Center for a background task that is still running.
4. Check Director follow-up for a waiting confirmation.
5. Record the entry, the steps, and an error screenshot.

Do not judge failure from one page alone. The background task, Director follow-up, and novel page can show different sides of the same flow.

## What to include when you report a problem

If you need to send a report to maintainers, include:

- app version or source branch;
- the entry and the steps;
- whether the related novel is a new project;
- Task Center status and error text;
- model provider and task type;
- whether Qdrant is configured;
- logs or screenshots.

The more complete this is, the easier it is to tell whether the problem is model, task, knowledge library, data, or the page.

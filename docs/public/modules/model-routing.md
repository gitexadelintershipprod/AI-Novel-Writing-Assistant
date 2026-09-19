# Model routing

Model routing assigns different AI tasks to the models that fit them. In a long-novel production chain, planning, prose, review, book analysis, and knowledge analysis do not need the same model strengths.

## When you need it

On first use, one default model is enough. DeepSeek users can start with `deepseek-v4-flash` for long-form quality and response speed. After chapter 1 works, open Model routing if cost, speed, or stability becomes a problem.

Good times to configure routing:

- Chapter writing needs a stronger long-text model.
- Review and repair often return the wrong format.
- Book analysis needs a longer context.
- Book-opening planning needs stronger reasoning.
- You want to keep high-cost models for the tasks that matter most.

## Recommended task matrix

Choose models by task type:

| Task | Helpful model traits |
|---|---|
| Book-opening direction | Stable reasoning, understands genre selling points |
| World and characters | Long context, strong structured output |
| Volume and chapter planning | Clear logic, keeps global consistency |
| Chapter writing | Natural long text, stable prose |
| Review and repair | Strong at following JSON and rules |
| Book analysis | Strong information extraction, handles long documents |
| Knowledge-library summary | Stable compression, few missed facts |

This is a starting point. Provider models change over time, so verify with a test novel.

## Configuration order

Go from simple to detailed:

1. Set one default model.
2. Walk the First-run guide and chapter 1.
3. Move chapter writing to a model that handles long text better.
4. Move review, repair, and book analysis to a model with more stable structured output.
5. Watch Task Center failure rate and output quality.

If you split routing too early, diagnosis gets harder.

## Cost control

Use a higher-cost model for:

- the final book-opening direction choice;
- volume planning and key chapter tasks;
- chapter writing;
- complex repair.

Use a lower-cost model for:

- simple summaries;
- status explanation;
- lightweight checks;
- non-critical candidate expansion.

Do not send high-structure tasks to an unstable model just to save money. Failed retries can cost more.

## Diagnosis

When one task type fails repeatedly, check which model it is bound to.

Common fixes:

- JSON parse failure: switch to a model that follows format better.
- Prose is short or empty: switch to a stronger long-text model.
- Book analysis misses a lot: switch to a longer-context model.
- Tasks are slow: lower concurrency or switch to a faster model.

Model routing affects AI task quality and stability. It does not replace product-flow judgment.

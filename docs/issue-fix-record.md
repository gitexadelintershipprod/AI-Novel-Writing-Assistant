# Issue fix record

This record covers issue fixes merged to `beta` on 2026-08-12. After an issue is closed, the matching regression tests and later user feedback remain the source of truth.

| Issue | Commit | Verification |
| --- | --- | --- |
| #128 / #123 create or generate chapter failed | `960ecc09` | Old SQLite library upgrade regression |
| #116 replan checkpoint pause loop | `4a812c25` | Director continue-runtime regression |
| #125 knowledge base queued for a long time | `98b3d9ab` | Knowledge-base status-service regression |
| #117 / #64 world-generation JSON incomplete or stuck | `6bd58e87` | World-skeleton prompt-contract regression |
| #66 book world ignored the selected model | `3e098ae7` | Ollama model-routing regression |
| #69 cast drifted from the theme | no new code | This round rechecked the existing `storyInput` and book-context passing chain |

## Maintenance

- Closing an issue does not replace regression verification. If the same symptom returns, check the matching commit and tests first, then task, model, and work data.
- `#116` continue semantics use the server task checkpoint as the source of truth. Frontend entries must not change the replan recovery path.
- `#123/#128` on historical SQLite libraries can only add missing tables through runtime migration. Do not reset or delete the user database to “fix” it.

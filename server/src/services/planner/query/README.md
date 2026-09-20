# Planning Query Boundary

This directory only reads and formats existing book / arc / chapter plans. It does not generate plans, mutate state, or decide whether to replan. External callers continue to go through the `PlannerService` facade so the query layer is not given write-orchestration duties.

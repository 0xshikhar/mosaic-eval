# Data Schema - Mosaic Eval Harness

The canonical MVP schema lives in `app/src/app/db/schema.ts` and is implemented with Drizzle ORM over local SQLite.

## Core Entities

| Table | Purpose |
|---|---|
| `eval_tasks` | Proxy evaluation tasks |
| `eval_task_steps` | Individual prompts and rubrics per task |
| `eval_runs` | Run configuration and lifecycle state |
| `run_steps` | Per-step execution records |
| `model_responses` | Raw model outputs and metadata |
| `step_scores` | Judge scores for a run step |
| `run_summaries` | Aggregated uplift and summary metrics |
| `uplift_metrics` | Per-model category/difficulty metrics |
| `audit_logs` | Persisted event stream for auditability and SSE reconnect |
| `run_checkpoints` | Crash-safe resume state |
| `calibration_labels` | Human or reference labels for calibration |
| `cost_events` | Token and cost tracking |

## Storage Conventions

- IDs are text UUIDs.
- Timestamps are stored as ISO strings.
- Arrays and structured metadata are stored as JSON text.
- SQLite foreign keys and indexes are enabled in the runtime bootstrap.

## Relationships

- A task has many task steps.
- A run has many run steps.
- A run step belongs to one task and one task step.
- A run step can have many model responses and one step score.
- A run can have one summary, one checkpoint, many audit logs, and many cost events.

## Source of Truth

The implementation source of truth is the schema and store layer in:

- `app/src/app/db/schema.ts`
- `app/src/app/db/bootstrap.ts`
- `app/src/app/db/store.ts`

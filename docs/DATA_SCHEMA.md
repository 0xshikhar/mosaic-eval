# Data Schema — Mosaic Eval

**Version:** 1.0  
**Last Updated:** 2024  
**Implementation:** `app/src/app/db/schema.ts` (Drizzle ORM + SQLite)

---

## 1. Schema Overview

### Entity Relationship Diagram

```
┌─────────────────┐     ┌─────────────────────┐     ┌──────────────────┐
│   eval_tasks    │────▶│  eval_task_steps    │     │   eval_runs      │
│  (Task catalog) │     │  (Step definitions)   │     │  (Run configs)   │
└────────┬────────┘     └──────────┬──────────┘     └────────┬─────────┘
         │                           │                        │
         │                           │                        │
         │     ┌─────────────────────┘                        │
         │     │                                              │
         │     │                        ┌─────────────────────┘
         │     │                        │
         ▼     ▼                        ▼
┌──────────────────────────────┐     ┌──────────────────┐
│         run_steps            │────▶│  model_responses │
│    (Execution instances)     │     │  (Model outputs) │
└─────────────┬────────────────┘     └────────┬─────────┘
              │                             │
              │                             │
              ▼                             ▼
       ┌──────────────┐            ┌──────────────┐
       │ step_scores  │            │ run_summaries│
       │  (Judgments) │            │ (Aggregates) │
       └──────────────┘            └──────────────┘

┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐
│   audit_logs     │  │ run_checkpoints  │  │  cost_events     │
│  (Audit trail)   │  │ (Resume state)   │  │ (Cost tracking)│
└──────────────────┘  └──────────────────┘  └──────────────────┘

┌──────────────────┐  ┌──────────────────┐
│ calibration_labels│  │  uplift_metrics  │
│ (Ground truth)   │  │ (Per-model stats)│
└──────────────────┘  └──────────────────┘
```

### Storage Conventions

| Aspect | Convention |
|--------|-----------|
| **IDs** | Text UUIDs (`text('id').primaryKey()`) |
| **Timestamps** | ISO 8601 strings (e.g., `2024-01-15T10:30:00Z`) |
| **Enums** | SQLite TEXT with Drizzle enum types |
| **JSON** | Stored as TEXT with Drizzle `json()` type |
| **Arrays** | JSON TEXT arrays |
| **Decimals** | INTEGER for cents (costs), REAL for scores |
| **Booleans** | INTEGER (0/1) |
| **Foreign Keys** | Enabled with `foreign_keys = ON` |
| **Indexes** | Created for query patterns (status, createdAt, foreign keys) |

---

## 2. Core Tables

### 2.1 Tasks (`eval_tasks`)

Evaluation task definitions. Tasks are proxy biosecurity questions organized by category and difficulty.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | TEXT | PRIMARY KEY | Task UUID |
| `title` | TEXT | NOT NULL | Human-readable task name |
| `description` | TEXT | nullable | Extended description |
| `category` | TEXT | NOT NULL | Category: `pathogen_acquisition`, `synthesis_evasion`, `protocol_retrieval`, `protein_engineering`, `general_bio` |
| `difficulty` | INTEGER | NOT NULL, CHECK(1-5) | Difficulty level 1-5 |
| `tags` | JSON | default '[]' | Array of string tags |
| `metadata` | JSON | default '{}' | Arbitrary metadata |
| `created_at` | TEXT | NOT NULL | ISO timestamp |
| `updated_at` | TEXT | NOT NULL | ISO timestamp |

**Indexes:**
- `idx_tasks_category` on `category`
- `idx_tasks_difficulty` on `difficulty`
- `idx_tasks_category_difficulty` on `(category, difficulty)`

**Example:**
```json
{
  "id": "task-001",
  "title": "Protein stability analysis",
  "description": "Evaluate understanding of protein folding factors",
  "category": "protein_engineering",
  "difficulty": 3,
  "tags": ["protein", "folding", "stability"],
  "metadata": { "source": "curated", "reviewer": "expert-1" },
  "created_at": "2024-01-15T10:00:00Z",
  "updated_at": "2024-01-15T10:00:00Z"
}
```

---

### 2.2 Task Steps (`eval_task_steps`)

Individual steps (prompts) within a task. Most tasks have a single step, but multi-step tasks are supported.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | TEXT | PRIMARY KEY | Step UUID |
| `task_id` | TEXT | NOT NULL, FK → eval_tasks | Parent task |
| `order` | INTEGER | NOT NULL | Step sequence (0, 1, 2...) |
| `prompt` | TEXT | NOT NULL | The actual prompt text |
| `rubric` | JSON | NOT NULL | Scoring rubric definition |
| `expected_output` | TEXT | nullable | Expected answer (for calibration) |
| `calibration_notes` | TEXT | nullable | Notes for human reviewers |
| `created_at` | TEXT | NOT NULL | ISO timestamp |

**Indexes:**
- `idx_task_steps_task_id` on `task_id`
- `idx_task_steps_order` on `(task_id, order)`

**Rubric Schema:**
```typescript
interface Rubric {
  version: string           // e.g., "1.0"
  criteria: Array<{
    description: string
    weight: number          // 0.0-1.0, sums to 1.0
  }>
  scoringGuide: string        // Full scoring guidance
  examples?: Array<{
    score: number
    response: string
    explanation: string
  }>
}
```

---

### 2.3 Runs (`eval_runs`)

Evaluation run configurations and state.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | TEXT | PRIMARY KEY | Run UUID |
| `name` | TEXT | NOT NULL | Run name (user-defined) |
| `description` | TEXT | nullable | Extended description |
| `status` | TEXT | NOT NULL | `PENDING`, `RUNNING`, `COMPLETE`, `FAILED`, `CANCELLED` |
| `strategy` | TEXT | NOT NULL | `SOLO`, `ROUND_ROBIN`, `RANDOM`, `ADVERSARIAL_CROSS`, `PARALLEL_BLAST`, `WEAKEST_SAFEGUARD` |
| `model_ids` | JSON | NOT NULL | Array of model IDs |
| `task_ids` | JSON | NOT NULL | Array of task IDs |
| `judge_model_id` | TEXT | NOT NULL | Model used for scoring |
| `include_baseline` | INTEGER | default 0 | Whether baseline runs included |
| `config_hash` | TEXT | NOT NULL | SHA256 hash of config (reproducibility) |
| `max_steps_per_task` | INTEGER | nullable | Limit steps per task |
| `cost_budget_usd` | INTEGER | default 10000 | Budget in cents (10000 = $100) |
| `tags` | JSON | default '[]' | User-defined tags |
| `metadata` | JSON | default '{}' | Additional configuration |
| `created_at` | TEXT | NOT NULL | ISO timestamp |
| `started_at` | TEXT | nullable | When run started |
| `completed_at` | TEXT | nullable | When run completed |
| `failed_at` | TEXT | nullable | When run failed |
| `error_message` | TEXT | nullable | Error details if failed |

**Indexes:**
- `idx_runs_status` on `status`
- `idx_runs_created_at` on `created_at`
- `idx_runs_config_hash` on `config_hash` (unique per config)
- `idx_runs_strategy` on `strategy`

---

### 2.4 Run Steps (`run_steps`)

Execution instances of task steps within a run.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | TEXT | PRIMARY KEY | Step instance UUID |
| `run_id` | TEXT | NOT NULL, FK → eval_runs | Parent run |
| `task_id` | TEXT | NOT NULL, FK → eval_tasks | Task being evaluated |
| `task_step_id` | TEXT | NOT NULL, FK → eval_task_steps | Specific step |
| `step_number` | INTEGER | NOT NULL | Global step sequence |
| `status` | TEXT | NOT NULL | `PENDING`, `RUNNING`, `COMPLETE`, `FAILED` |
| `started_at` | TEXT | nullable | When step started |
| `completed_at` | TEXT | nullable | When step completed |
| `error_message` | TEXT | nullable | Error details |
| `metadata` | JSON | default '{}' | Step-level metadata |
| `created_at` | TEXT | NOT NULL | ISO timestamp |

**Indexes:**
- `idx_run_steps_run_id` on `run_id`
- `idx_run_steps_status` on `status`
- `idx_run_steps_step_number` on `(run_id, step_number)`

---

### 2.5 Model Responses (`model_responses`)

Raw outputs from model invocations.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | TEXT | PRIMARY KEY | Response UUID |
| `run_step_id` | TEXT | NOT NULL, FK → run_steps | Parent step |
| `model_id` | TEXT | NOT NULL | Model identifier (e.g., 'openai') |
| `response` | TEXT | NOT NULL | Model output text |
| `latency_ms` | INTEGER | NOT NULL | Response time in milliseconds |
| `tokens_input` | INTEGER | NOT NULL | Input token count |
| `tokens_output` | INTEGER | NOT NULL | Output token count |
| `cost_usd` | INTEGER | NOT NULL | Cost in cents |
| `refusal_classification` | TEXT | nullable | `FULL_REFUSAL`, `PARTIAL_REFUSAL`, `SOFT_COMPLY`, `FULL_COMPLY` |
| `prompt_hash` | TEXT | NOT NULL | SHA256 of prompt (for caching) |
| `metadata` | JSON | default '{}' | Provider-specific metadata |
| `created_at` | TEXT | NOT NULL | ISO timestamp |

**Indexes:**
- `idx_model_responses_step` on `run_step_id`
- `idx_model_responses_model` on `(run_step_id, model_id)`
- `idx_model_responses_refusal` on `refusal_classification`
- `idx_model_responses_prompt_hash` on `prompt_hash`

---

### 2.6 Step Scores (`step_scores`)

Judge evaluations of model responses.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | TEXT | PRIMARY KEY | Score UUID |
| `run_step_id` | TEXT | NOT NULL, FK → run_steps | Parent step |
| `model_response_id` | TEXT | NOT NULL, FK → model_responses | Specific response scored |
| `score` | INTEGER | NOT NULL, CHECK(0-100) | Quality score 0-100 |
| `reasoning` | TEXT | NOT NULL | Judge's explanation |
| `judge_model_id` | TEXT | NOT NULL | Which model judged |
| `rubric_version` | TEXT | NOT NULL | Rubric version used |
| `calibrated` | INTEGER | default 0 | Whether score calibrated |
| `calibration_factor` | REAL | nullable | Factor applied |
| `metadata` | JSON | default '{}' | Additional scoring data |
| `created_at` | TEXT | NOT NULL | ISO timestamp |

**Indexes:**
- `idx_step_scores_step` on `run_step_id`
- `idx_step_scores_response` on `model_response_id`
- `idx_step_scores_score` on `score`

---

## 3. Aggregation Tables

### 3.1 Run Summaries (`run_summaries`)

Aggregated metrics for completed runs.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | TEXT | PRIMARY KEY | Summary UUID |
| `run_id` | TEXT | NOT NULL, FK → eval_runs | Parent run (unique) |
| `total_steps` | INTEGER | NOT NULL | Total steps attempted |
| `completed_steps` | INTEGER | NOT NULL | Successfully completed |
| `failed_steps` | INTEGER | NOT NULL | Failed steps |
| `refused_steps` | INTEGER | NOT NULL | Steps with any refusal |
| `mosaic_score` | REAL | nullable | Mean mosaic score |
| `best_baseline` | REAL | nullable | Best single-model score |
| `delta_uplift` | REAL | nullable | Absolute uplift (mosaic - best) |
| `percent_uplift` | REAL | nullable | Relative uplift percentage |
| `normalized_uplift` | REAL | nullable | Normalized uplift index |
| `mean_latency_ms` | INTEGER | nullable | Average response latency |
| `total_cost_usd` | INTEGER | nullable | Total cost in cents |
| `duration_seconds` | INTEGER | nullable | Run duration |
| `per_model_scores` | JSON | NOT NULL | `{ modelId: meanScore }` |
| `per_category_scores` | JSON | NOT NULL | `{ category: meanScore }` |
| `per_difficulty_scores` | JSON | NOT NULL | `{ difficulty: meanScore }` |
| `refusal_rates` | JSON | NOT NULL | `{ modelId: refusalRate }` |
| `statistical_data` | JSON | nullable | Confidence intervals, p-values |
| `created_at` | TEXT | NOT NULL | ISO timestamp |

**Indexes:**
- `idx_run_summaries_run_id` on `run_id` (unique)
- `idx_run_summaries_uplift` on `delta_uplift`

---

### 3.2 Uplift Metrics (`uplift_metrics`)

Per-model, per-category performance statistics (for Weakest Safeguard strategy).

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | TEXT | PRIMARY KEY | Metric UUID |
| `model_id` | TEXT | NOT NULL | Model identifier |
| `category` | TEXT | NOT NULL | Task category |
| `difficulty` | INTEGER | nullable | Optional difficulty filter |
| `mean_score` | REAL | NOT NULL | Average score |
| `refusal_rate` | REAL | NOT NULL | Refusal percentage (0-1) |
| `sample_size` | INTEGER | NOT NULL | Number of samples |
| `window_start` | TEXT | NOT NULL | Metric window start |
| `window_end` | TEXT | NOT NULL | Metric window end |
| `updated_at` | TEXT | NOT NULL | ISO timestamp |

**Indexes:**
- `idx_uplift_metrics_model` on `model_id`
- `idx_uplift_metrics_category` on `category`
- `idx_uplift_metrics_model_category` on `(model_id, category)`
- `idx_uplift_metrics_window` on `(window_start, window_end)`

---

## 4. Telemetry Tables

### 4.1 Audit Logs (`audit_logs`)

Security and compliance audit trail.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | TEXT | PRIMARY KEY | Log entry UUID |
| `run_id` | TEXT | nullable, FK → eval_runs | Related run |
| `action` | TEXT | NOT NULL | Action type |
| `actor` | TEXT | nullable | User/system identifier |
| `ip_address` | TEXT | nullable | Client IP |
| `user_agent` | TEXT | nullable | Client user agent |
| `details` | JSON | nullable | Action-specific data |
| `created_at` | TEXT | NOT NULL | ISO timestamp |

**Actions:**
- `RUN_CREATED`, `RUN_STARTED`, `RUN_COMPLETED`, `RUN_FAILED`, `RUN_CANCELLED`, `RUN_RESUMED`
- `STEP_STARTED`, `STEP_COMPLETED`, `STEP_FAILED`
- `MODEL_INVOKED`, `SCORE_RECORDED`
- `TASK_IMPORTED`, `TASK_DELETED`
- `DATA_EXPORTED`, `CHECKPOINT_CREATED`

**Indexes:**
- `idx_audit_logs_run` on `run_id`
- `idx_audit_logs_action` on `action`
- `idx_audit_logs_created` on `created_at`

---

### 4.2 Run Checkpoints (`run_checkpoints`)

Crash recovery state for resumable runs.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | TEXT | PRIMARY KEY | Checkpoint UUID |
| `run_id` | TEXT | NOT NULL, FK → eval_runs | Parent run (unique) |
| `step_number` | INTEGER | NOT NULL | Last completed step |
| `state` | JSON | NOT NULL | Serialized runner state |
| `created_at` | TEXT | NOT NULL | ISO timestamp |

**Indexes:**
- `idx_run_checkpoints_run` on `run_id` (unique)

---

### 4.3 Cost Events (`cost_events`)

Detailed cost tracking for accounting.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | TEXT | PRIMARY KEY | Event UUID |
| `run_id` | TEXT | NOT NULL, FK → eval_runs | Parent run |
| `run_step_id` | TEXT | nullable, FK → run_steps | Specific step |
| `model_id` | TEXT | NOT NULL | Model used |
| `event_type` | TEXT | NOT NULL | `INVOCATION`, `JUDGE`, `SYNTHESIS` |
| `tokens_input` | INTEGER | NOT NULL | Input tokens |
| `tokens_output` | INTEGER | NOT NULL | Output tokens |
| `cost_usd` | INTEGER | NOT NULL | Cost in cents |
| `metadata` | JSON | default '{}' | Additional data |
| `created_at` | TEXT | NOT NULL | ISO timestamp |

**Indexes:**
- `idx_cost_events_run` on `run_id`
- `idx_cost_events_step` on `run_step_id`
- `idx_cost_events_model` on `model_id`

---

## 5. Quality Tables

### 5.1 Calibration Labels (`calibration_labels`)

Human expert labels for judge calibration.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | TEXT | PRIMARY KEY | Label UUID |
| `task_step_id` | TEXT | NOT NULL, FK → eval_task_steps | Step being labeled |
| `human_score` | INTEGER | NOT NULL, CHECK(0-100) | Expert score |
| `human_reasoning` | TEXT | NOT NULL | Expert explanation |
| `reviewer_id` | TEXT | NOT NULL | Expert identifier |
| `consensus_score` | INTEGER | nullable | If multiple reviewers |
| `rubric_version` | TEXT | NOT NULL | Rubric used |
| `metadata` | JSON | default '{}' | Additional data |
| `created_at` | TEXT | NOT NULL | ISO timestamp |

**Indexes:**
- `idx_calibration_step` on `task_step_id`
- `idx_calibration_reviewer` on `reviewer_id`

---

## 6. Relationship Summary

### Foreign Key Constraints

| Child Table | Column | Parent Table | On Delete |
|-------------|--------|--------------|-----------|
| `eval_task_steps` | `task_id` | `eval_tasks` | CASCADE |
| `eval_runs` | - | - | - |
| `run_steps` | `run_id` | `eval_runs` | CASCADE |
| `run_steps` | `task_id` | `eval_tasks` | RESTRICT |
| `run_steps` | `task_step_id` | `eval_task_steps` | RESTRICT |
| `model_responses` | `run_step_id` | `run_steps` | CASCADE |
| `step_scores` | `run_step_id` | `run_steps` | CASCADE |
| `step_scores` | `model_response_id` | `model_responses` | CASCADE |
| `run_summaries` | `run_id` | `eval_runs` | CASCADE |
| `run_checkpoints` | `run_id` | `eval_runs` | CASCADE |
| `audit_logs` | `run_id` | `eval_runs` | SET NULL |
| `cost_events` | `run_id` | `eval_runs` | CASCADE |
| `cost_events` | `run_step_id` | `run_steps` | SET NULL |

### Cardinality

| Relationship | Type | Description |
|-------------|------|-------------|
| Task → Task Steps | 1:N | A task has 1+ steps |
| Task → Run Steps | 1:N | A task can be run multiple times |
| Run → Run Steps | 1:N | A run has many steps |
| Run Step → Model Responses | 1:N | A step has 1+ model responses |
| Run Step → Step Scores | 1:N | Each response gets a score |
| Run → Run Summary | 1:1 | One summary per run |
| Run → Run Checkpoint | 1:1 | One checkpoint per run |
| Run → Audit Logs | 1:N | Many audit entries per run |
| Run → Cost Events | 1:N | Many cost entries per run |

---

## 7. Data Lifecycle

### Retention Policies

| Data Type | Default Retention | Configurable |
|-----------|-------------------|--------------|
| Completed runs | Permanent | Yes (via archive) |
| Failed runs | 30 days | Yes |
| Cancelled runs | 7 days | Yes |
| Audit logs | 1 year | Yes |
| Cost events | 1 year | Yes |
| Checkpoints | Until resume or 7 days | No |
| Cache entries | 30 days | Yes |

### Archival

Old runs can be archived to separate database:

```sql
-- Export runs older than 1 year
ATTACH DATABASE 'archive.db' AS archive;
INSERT INTO archive.eval_runs SELECT * FROM eval_runs WHERE created_at < '2023-01-01';
-- (Cascading relationships handled by application)
```

---

## 8. Query Patterns

### Common Queries

```sql
-- List recent runs with status
SELECT id, name, status, strategy, created_at 
FROM eval_runs 
WHERE status = 'COMPLETE' 
ORDER BY created_at DESC 
LIMIT 20;

-- Get run with all steps and responses
SELECT r.*, rs.*, mr.* 
FROM eval_runs r
LEFT JOIN run_steps rs ON rs.run_id = r.id
LEFT JOIN model_responses mr ON mr.run_step_id = rs.id
WHERE r.id = 'run-uuid';

-- Calculate refusal rates by model and category
SELECT 
  mr.model_id,
  et.category,
  COUNT(*) as total,
  SUM(CASE WHEN mr.refusal_classification IN ('FULL_REFUSAL', 'PARTIAL_REFUSAL') THEN 1 ELSE 0 END) as refusals,
  ROUND(100.0 * refusals / total, 2) as refusal_rate
FROM model_responses mr
JOIN run_steps rs ON rs.id = mr.run_step_id
JOIN eval_tasks et ON et.id = rs.task_id
GROUP BY mr.model_id, et.category;

-- Get uplift metrics for Weakest Safeguard
SELECT * FROM uplift_metrics 
WHERE window_end > datetime('now', '-30 days')
ORDER BY category, refusal_rate ASC;
```

---

## 9. Schema Evolution

### Migration Strategy

Schema managed by Drizzle ORM:

```bash
# Generate migration
cd app
bun run db:generate

# Apply migration (auto on dev start)
bun run db:migrate

# Reset (development only)
bun run db:reset
```

### Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2024 | Initial schema |

---

## 10. Source of Truth

**Implementation files:**
- `app/src/app/db/schema.ts` — Drizzle schema definitions
- `app/src/app/db/client.ts` — Database client setup
- `app/src/app/db/bootstrap.ts` — Schema initialization
- `app/src/app/db/store.ts` — Data access functions

**Generated artifacts:**
- `app/drizzle/` — Migration files
- `data/databases/mosaic.db` — SQLite database file

---

*For API documentation, see [API_SPEC.md](./API_SPEC.md)*
*For architecture overview, see [ARCHITECTURE.md](./ARCHITECTURE.md)*

import type { DatabaseSync } from "node:sqlite"

function ensureColumn(db: DatabaseSync, tableName: string, columnName: string, columnSql: string) {
  const columns = db.prepare(`PRAGMA table_info(${tableName})`).all() as Array<{ name?: string }>
  if (columns.some((column) => column.name === columnName)) return

  db.exec(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${columnSql}`)
}

export function ensureSchema(db: DatabaseSync) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS eval_tasks (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      category TEXT NOT NULL,
      difficulty INTEGER NOT NULL,
      source TEXT,
      tags TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
      updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
    );

    CREATE INDEX IF NOT EXISTS eval_tasks_category_idx ON eval_tasks(category);
    CREATE INDEX IF NOT EXISTS eval_tasks_difficulty_idx ON eval_tasks(difficulty);

    CREATE TABLE IF NOT EXISTS eval_task_steps (
      id TEXT PRIMARY KEY,
      task_id TEXT NOT NULL REFERENCES eval_tasks(id) ON DELETE CASCADE,
      step_index INTEGER NOT NULL,
      prompt TEXT NOT NULL,
      rubric TEXT NOT NULL,
      expected_keywords TEXT NOT NULL,
      is_biosecurity_sensitive INTEGER NOT NULL DEFAULT 0,
      calibration_tag TEXT NOT NULL DEFAULT 'proxy'
    );

    CREATE UNIQUE INDEX IF NOT EXISTS eval_task_steps_task_step_idx ON eval_task_steps(task_id, step_index);
    CREATE INDEX IF NOT EXISTS eval_task_steps_task_idx ON eval_task_steps(task_id);

    CREATE TABLE IF NOT EXISTS eval_runs (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      strategy TEXT NOT NULL,
      model_ids TEXT NOT NULL,
      judge_model_id TEXT NOT NULL,
      include_baseline INTEGER NOT NULL DEFAULT 1,
      cost_budget_usd REAL,
      max_concurrent_requests INTEGER,
      status TEXT NOT NULL DEFAULT 'PENDING',
      error_message TEXT,
      started_at TEXT,
      completed_at TEXT,
      created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
    );

    CREATE INDEX IF NOT EXISTS eval_runs_status_idx ON eval_runs(status);
    CREATE INDEX IF NOT EXISTS eval_runs_created_at_idx ON eval_runs(created_at);

    CREATE TABLE IF NOT EXISTS run_steps (
      id TEXT PRIMARY KEY,
      run_id TEXT NOT NULL REFERENCES eval_runs(id) ON DELETE CASCADE,
      task_id TEXT NOT NULL REFERENCES eval_tasks(id),
      task_step_id TEXT NOT NULL REFERENCES eval_task_steps(id),
      step_index INTEGER NOT NULL,
      strategy TEXT NOT NULL,
      completed_at TEXT
    );

    CREATE UNIQUE INDEX IF NOT EXISTS run_steps_run_step_idx ON run_steps(run_id, step_index);
    CREATE INDEX IF NOT EXISTS run_steps_run_idx ON run_steps(run_id);
    CREATE INDEX IF NOT EXISTS run_steps_task_idx ON run_steps(task_id);

    CREATE TABLE IF NOT EXISTS model_responses (
      id TEXT PRIMARY KEY,
      run_step_id TEXT NOT NULL REFERENCES run_steps(id) ON DELETE CASCADE,
      model_id TEXT NOT NULL,
      provider TEXT NOT NULL,
      model_version TEXT,
      prompt_hash TEXT,
      response_hash TEXT,
      content TEXT NOT NULL,
      refusal_class TEXT NOT NULL,
      finish_reason TEXT NOT NULL,
      prompt_tokens INTEGER NOT NULL,
      completion_tokens INTEGER NOT NULL,
      latency_ms INTEGER NOT NULL,
      is_synthesized INTEGER NOT NULL DEFAULT 0,
      embedding_vector TEXT,
      cost_usd REAL,
      created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
    );

    CREATE INDEX IF NOT EXISTS model_responses_run_step_idx ON model_responses(run_step_id);
    CREATE INDEX IF NOT EXISTS model_responses_model_idx ON model_responses(model_id);

    CREATE TABLE IF NOT EXISTS step_scores (
      id TEXT PRIMARY KEY,
      run_step_id TEXT NOT NULL UNIQUE REFERENCES run_steps(id) ON DELETE CASCADE,
      best_model_id TEXT NOT NULL,
      best_score INTEGER NOT NULL,
      worst_score INTEGER NOT NULL,
      mean_score REAL NOT NULL,
      consistency_score REAL NOT NULL,
      judge_reasoning TEXT,
      created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
    );

    CREATE TABLE IF NOT EXISTS run_summaries (
      id TEXT PRIMARY KEY,
      run_id TEXT NOT NULL UNIQUE REFERENCES eval_runs(id) ON DELETE CASCADE,
      per_model_scores TEXT NOT NULL,
      mosaic_score REAL NOT NULL,
      delta_uplift REAL NOT NULL,
      uplift_by_category TEXT NOT NULL,
      uplift_by_difficulty TEXT NOT NULL,
      mean_consistency REAL NOT NULL,
      refusal_breakdown TEXT NOT NULL,
      estimated_cost_usd REAL,
      created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
    );

    CREATE TABLE IF NOT EXISTS uplift_metrics (
      id TEXT PRIMARY KEY,
      run_id TEXT NOT NULL REFERENCES eval_runs(id) ON DELETE CASCADE,
      model_id TEXT NOT NULL,
      category TEXT NOT NULL,
      difficulty INTEGER NOT NULL,
      refusal_rate REAL NOT NULL,
      mean_score REAL NOT NULL,
      sample_count INTEGER NOT NULL,
      created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
    );

    CREATE INDEX IF NOT EXISTS uplift_metrics_model_category_idx ON uplift_metrics(model_id, category);
    CREATE INDEX IF NOT EXISTS uplift_metrics_category_difficulty_idx ON uplift_metrics(category, difficulty);

    CREATE TABLE IF NOT EXISTS audit_logs (
      id TEXT PRIMARY KEY,
      run_id TEXT REFERENCES eval_runs(id) ON DELETE CASCADE,
      type TEXT NOT NULL,
      message TEXT NOT NULL,
      metadata TEXT,
      created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
    );

    CREATE INDEX IF NOT EXISTS audit_logs_run_idx ON audit_logs(run_id);
    CREATE INDEX IF NOT EXISTS audit_logs_type_idx ON audit_logs(type);

    CREATE TABLE IF NOT EXISTS run_checkpoints (
      id TEXT PRIMARY KEY,
      run_id TEXT NOT NULL UNIQUE REFERENCES eval_runs(id) ON DELETE CASCADE,
      last_completed_step_index INTEGER NOT NULL,
      state TEXT NOT NULL,
      updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
    );

    CREATE TABLE IF NOT EXISTS calibration_labels (
      id TEXT PRIMARY KEY,
      task_step_id TEXT,
      response_id TEXT,
      label_type TEXT NOT NULL,
      label TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
    );

    CREATE TABLE IF NOT EXISTS judge_cache (
      id TEXT PRIMARY KEY,
      cache_key TEXT NOT NULL UNIQUE,
      judge_model_id TEXT NOT NULL,
      model_id TEXT NOT NULL,
      task_step_id TEXT,
      response_id TEXT,
      prompt_hash TEXT,
      response_hash TEXT,
      score INTEGER NOT NULL,
      refusal_class TEXT NOT NULL,
      reasoning TEXT NOT NULL,
      calibration_applied INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
    );

    CREATE INDEX IF NOT EXISTS judge_cache_judge_model_idx ON judge_cache(judge_model_id);
    CREATE INDEX IF NOT EXISTS judge_cache_model_idx ON judge_cache(model_id);
    CREATE INDEX IF NOT EXISTS judge_cache_task_step_idx ON judge_cache(task_step_id);

    CREATE TABLE IF NOT EXISTS cost_events (
      id TEXT PRIMARY KEY,
      run_id TEXT REFERENCES eval_runs(id) ON DELETE CASCADE,
      model_id TEXT,
      provider TEXT NOT NULL,
      cost_usd REAL NOT NULL,
      tokens INTEGER NOT NULL,
      created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
    );

    CREATE INDEX IF NOT EXISTS cost_events_run_idx ON cost_events(run_id);
  `)

  // Preserve older local databases by adding any columns that were introduced
  // after the initial table was created.
  ensureColumn(db, "eval_runs", "cost_budget_usd", "REAL")
  ensureColumn(db, "eval_runs", "max_concurrent_requests", "INTEGER")
}

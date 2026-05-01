import { relations, sql } from "drizzle-orm"
import { integer, real, sqliteTable, text, uniqueIndex, index } from "drizzle-orm/sqlite-core"

const nowIso = sql`(strftime('%Y-%m-%dT%H:%M:%fZ','now'))`

export const evalTasks = sqliteTable(
  "eval_tasks",
  {
    id: text("id").primaryKey(),
    title: text("title").notNull(),
    category: text("category").notNull(),
    difficulty: integer("difficulty").notNull(),
    source: text("source"),
    tags: text("tags").notNull(),
    createdAt: text("created_at").notNull().default(nowIso),
    updatedAt: text("updated_at").notNull().default(nowIso),
  },
  (table) => ({
    categoryIdx: index("eval_tasks_category_idx").on(table.category),
    difficultyIdx: index("eval_tasks_difficulty_idx").on(table.difficulty),
  }),
)

export const evalTaskSteps = sqliteTable(
  "eval_task_steps",
  {
    id: text("id").primaryKey(),
    taskId: text("task_id")
      .notNull()
      .references(() => evalTasks.id, { onDelete: "cascade" }),
    stepIndex: integer("step_index").notNull(),
    prompt: text("prompt").notNull(),
    rubric: text("rubric").notNull(),
    expectedKeywords: text("expected_keywords").notNull(),
    isBiosecuritySensitive: integer("is_biosecurity_sensitive", { mode: "boolean" })
      .notNull()
      .default(false),
    calibrationTag: text("calibration_tag").notNull().default("proxy"),
  },
  (table) => ({
    taskStepIdx: uniqueIndex("eval_task_steps_task_step_idx").on(table.taskId, table.stepIndex),
    taskIdx: index("eval_task_steps_task_idx").on(table.taskId),
  }),
)

export const evalRuns = sqliteTable(
  "eval_runs",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    strategy: text("strategy").notNull(),
    modelIds: text("model_ids").notNull(),
    judgeModelId: text("judge_model_id").notNull(),
    includeBaseline: integer("include_baseline", { mode: "boolean" }).notNull().default(true),
    costBudgetUsd: real("cost_budget_usd"),
    maxConcurrentRequests: integer("max_concurrent_requests"),
    status: text("status").notNull().default("PENDING"),
    errorMessage: text("error_message"),
    startedAt: text("started_at"),
    completedAt: text("completed_at"),
    createdAt: text("created_at").notNull().default(nowIso),
  },
  (table) => ({
    statusIdx: index("eval_runs_status_idx").on(table.status),
    createdAtIdx: index("eval_runs_created_at_idx").on(table.createdAt),
  }),
)

export const runSteps = sqliteTable(
  "run_steps",
  {
    id: text("id").primaryKey(),
    runId: text("run_id")
      .notNull()
      .references(() => evalRuns.id, { onDelete: "cascade" }),
    taskId: text("task_id")
      .notNull()
      .references(() => evalTasks.id),
    taskStepId: text("task_step_id")
      .notNull()
      .references(() => evalTaskSteps.id),
    stepIndex: integer("step_index").notNull(),
    strategy: text("strategy").notNull(),
    completedAt: text("completed_at"),
  },
  (table) => ({
    runStepIdx: uniqueIndex("run_steps_run_step_idx").on(table.runId, table.stepIndex),
    runIdx: index("run_steps_run_idx").on(table.runId),
    taskIdx: index("run_steps_task_idx").on(table.taskId),
  }),
)

export const modelResponses = sqliteTable(
  "model_responses",
  {
    id: text("id").primaryKey(),
    runStepId: text("run_step_id")
      .notNull()
      .references(() => runSteps.id, { onDelete: "cascade" }),
    modelId: text("model_id").notNull(),
    provider: text("provider").notNull(),
    modelVersion: text("model_version"),
    promptHash: text("prompt_hash"),
    responseHash: text("response_hash"),
    content: text("content").notNull(),
    refusalClass: text("refusal_class").notNull(),
    finishReason: text("finish_reason").notNull(),
    promptTokens: integer("prompt_tokens").notNull(),
    completionTokens: integer("completion_tokens").notNull(),
    latencyMs: integer("latency_ms").notNull(),
    isSynthesized: integer("is_synthesized", { mode: "boolean" }).notNull().default(false),
    embeddingVector: text("embedding_vector"),
    costUsd: integer("cost_usd"),
    createdAt: text("created_at").notNull().default(nowIso),
  },
  (table) => ({
    runStepIdx: index("model_responses_run_step_idx").on(table.runStepId),
    modelIdx: index("model_responses_model_idx").on(table.modelId),
  }),
)

export const stepScores = sqliteTable("step_scores", {
  id: text("id").primaryKey(),
  runStepId: text("run_step_id")
    .notNull()
    .unique()
    .references(() => runSteps.id, { onDelete: "cascade" }),
  bestModelId: text("best_model_id").notNull(),
  bestScore: integer("best_score").notNull(),
  worstScore: integer("worst_score").notNull(),
  meanScore: integer("mean_score").notNull(),
  consistencyScore: integer("consistency_score").notNull(),
  judgeReasoning: text("judge_reasoning"),
  createdAt: text("created_at").notNull().default(nowIso),
})

export const runSummaries = sqliteTable("run_summaries", {
  id: text("id").primaryKey(),
  runId: text("run_id")
    .notNull()
    .unique()
    .references(() => evalRuns.id, { onDelete: "cascade" }),
  perModelScores: text("per_model_scores").notNull(),
  mosaicScore: real("mosaic_score").notNull(),
  deltaUplift: real("delta_uplift").notNull(),
  upliftByCategory: text("uplift_by_category").notNull(),
  upliftByDifficulty: text("uplift_by_difficulty").notNull(),
  meanConsistency: real("mean_consistency").notNull(),
  refusalBreakdown: text("refusal_breakdown").notNull(),
  estimatedCostUsd: real("estimated_cost_usd"),
  createdAt: text("created_at").notNull().default(nowIso),
})

export const upliftMetrics = sqliteTable(
  "uplift_metrics",
  {
    id: text("id").primaryKey(),
    runId: text("run_id")
      .notNull()
      .references(() => evalRuns.id, { onDelete: "cascade" }),
    modelId: text("model_id").notNull(),
    category: text("category").notNull(),
    difficulty: integer("difficulty").notNull(),
    refusalRate: real("refusal_rate").notNull(),
    meanScore: real("mean_score").notNull(),
    sampleCount: integer("sample_count").notNull(),
    createdAt: text("created_at").notNull().default(nowIso),
  },
  (table) => ({
    modelCategoryIdx: index("uplift_metrics_model_category_idx").on(table.modelId, table.category),
    categoryDifficultyIdx: index("uplift_metrics_category_difficulty_idx").on(table.category, table.difficulty),
  }),
)

export const auditLogs = sqliteTable(
  "audit_logs",
  {
    id: text("id").primaryKey(),
    runId: text("run_id").references(() => evalRuns.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    message: text("message").notNull(),
    metadata: text("metadata"),
    createdAt: text("created_at").notNull().default(nowIso),
  },
  (table) => ({
    runIdx: index("audit_logs_run_idx").on(table.runId),
    typeIdx: index("audit_logs_type_idx").on(table.type),
  }),
)

export const runCheckpoints = sqliteTable("run_checkpoints", {
  id: text("id").primaryKey(),
  runId: text("run_id")
    .notNull()
    .unique()
    .references(() => evalRuns.id, { onDelete: "cascade" }),
  lastCompletedStepIndex: integer("last_completed_step_index").notNull(),
  state: text("state").notNull(),
  updatedAt: text("updated_at").notNull().default(nowIso),
})

export const calibrationLabels = sqliteTable("calibration_labels", {
  id: text("id").primaryKey(),
  taskStepId: text("task_step_id"),
  responseId: text("response_id"),
  labelType: text("label_type").notNull(),
  label: text("label").notNull(),
  createdAt: text("created_at").notNull().default(nowIso),
})

export const judgeCache = sqliteTable(
  "judge_cache",
  {
    id: text("id").primaryKey(),
    cacheKey: text("cache_key").notNull().unique(),
    judgeModelId: text("judge_model_id").notNull(),
    modelId: text("model_id").notNull(),
    taskStepId: text("task_step_id"),
    responseId: text("response_id"),
    promptHash: text("prompt_hash"),
    responseHash: text("response_hash"),
    score: integer("score").notNull(),
    refusalClass: text("refusal_class").notNull(),
    reasoning: text("reasoning").notNull(),
    calibrationApplied: integer("calibration_applied", { mode: "boolean" }).notNull().default(false),
    createdAt: text("created_at").notNull().default(nowIso),
  },
  (table) => ({
    judgeModelIdx: index("judge_cache_judge_model_idx").on(table.judgeModelId),
    modelIdx: index("judge_cache_model_idx").on(table.modelId),
    taskStepIdx: index("judge_cache_task_step_idx").on(table.taskStepId),
  }),
)

export const costEvents = sqliteTable(
  "cost_events",
  {
    id: text("id").primaryKey(),
    runId: text("run_id").references(() => evalRuns.id, { onDelete: "cascade" }),
    modelId: text("model_id"),
    provider: text("provider").notNull(),
    costUsd: real("cost_usd").notNull(),
    tokens: integer("tokens").notNull(),
    createdAt: text("created_at").notNull().default(nowIso),
  },
  (table) => ({
    runIdx: index("cost_events_run_idx").on(table.runId),
  }),
)

export const schema = {
  evalTasks,
  evalTaskSteps,
  evalRuns,
  runSteps,
  modelResponses,
  stepScores,
  runSummaries,
  upliftMetrics,
  auditLogs,
  runCheckpoints,
  calibrationLabels,
  judgeCache,
  costEvents,
}

export const relationsDefinitions = {
  evalTasks: relations(evalTasks, ({ many }) => ({
    steps: many(evalTaskSteps),
    runSteps: many(runSteps),
  })),
  evalTaskSteps: relations(evalTaskSteps, ({ one, many }) => ({
    task: one(evalTasks, {
      fields: [evalTaskSteps.taskId],
      references: [evalTasks.id],
    }),
    runSteps: many(runSteps),
  })),
  evalRuns: relations(evalRuns, ({ many, one }) => ({
    steps: many(runSteps),
    summary: one(runSummaries, {
      fields: [evalRuns.id],
      references: [runSummaries.runId],
    }),
    auditLogs: many(auditLogs),
    checkpoints: one(runCheckpoints, {
      fields: [evalRuns.id],
      references: [runCheckpoints.runId],
    }),
    costEvents: many(costEvents),
  })),
  runSteps: relations(runSteps, ({ one, many }) => ({
    run: one(evalRuns, {
      fields: [runSteps.runId],
      references: [evalRuns.id],
    }),
    task: one(evalTasks, {
      fields: [runSteps.taskId],
      references: [evalTasks.id],
    }),
    taskStep: one(evalTaskSteps, {
      fields: [runSteps.taskStepId],
      references: [evalTaskSteps.id],
    }),
    modelResponses: many(modelResponses),
    score: one(stepScores, {
      fields: [runSteps.id],
      references: [stepScores.runStepId],
    }),
  })),
}

export type EvalTaskRow = typeof evalTasks.$inferSelect
export type EvalTaskStepRow = typeof evalTaskSteps.$inferSelect
export type EvalRunRow = typeof evalRuns.$inferSelect
export type RunStepRow = typeof runSteps.$inferSelect
export type ModelResponseRow = typeof modelResponses.$inferSelect
export type StepScoreRow = typeof stepScores.$inferSelect
export type RunSummaryRow = typeof runSummaries.$inferSelect
export type UpliftMetricRow = typeof upliftMetrics.$inferSelect
export type AuditLogRow = typeof auditLogs.$inferSelect
export type RunCheckpointRow = typeof runCheckpoints.$inferSelect
export type CalibrationLabelRow = typeof calibrationLabels.$inferSelect
export type JudgeCacheRow = typeof judgeCache.$inferSelect

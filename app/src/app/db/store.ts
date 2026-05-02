import { and, asc, desc, eq, inArray, sql } from "drizzle-orm"

import { getDb } from "@/app/db/client"
import { parseJson, stringifyJson } from "@/app/db/json"
import {
  auditLogs,
  calibrationLabels,
  evalRuns,
  evalTaskSteps,
  evalTasks,
  judgeCache,
  modelResponses,
  runCheckpoints,
  runSteps,
  runSummaries,
  stepScores,
  upliftMetrics,
} from "@/app/db/schema"

export type TaskStepView = {
  id: string
  taskId: string
  stepIndex: number
  prompt: string
  rubric: string
  expectedKeywords: string[]
  isBiosecuritySensitive: boolean
  calibrationTag: string
}

export type TaskView = {
  id: string
  title: string
  category: string
  difficulty: number
  source: string | null
  tags: string[]
  createdAt: string
  updatedAt: string
  steps: TaskStepView[]
}

export type RunSummaryView = {
  id: string
  runId: string
  perModelScores: Record<string, number>
  mosaicScore: number
  deltaUplift: number
  upliftByCategory: Record<string, number>
  upliftByDifficulty: Record<string, number>
  meanConsistency: number
  refusalBreakdown: Record<string, number>
  estimatedCostUsd: number | null
  createdAt: string
}

export type CalibrationLabelView = {
  id: string
  taskStepId: string | null
  responseId: string | null
  labelType: string
  label: string
  createdAt: string
}

export type JudgeCacheView = {
  id: string
  cacheKey: string
  judgeModelId: string
  modelId: string
  taskStepId: string | null
  responseId: string | null
  promptHash: string | null
  responseHash: string | null
  score: number
  refusalClass: string
  reasoning: string
  calibrationApplied: boolean
  createdAt: string
}

export type RunStepView = {
  id: string
  runId: string
  taskId: string
  taskStepId: string
  stepIndex: number
  strategy: string
  completedAt: string | null
  task: TaskView
  taskStep: TaskStepView
  modelResponses: Array<{
    id: string
    runStepId: string
    modelId: string
    provider: string
    modelVersion: string | null
    promptHash: string | null
    responseHash: string | null
    content: string
    refusalClass: string
    finishReason: string
    promptTokens: number
    completionTokens: number
    latencyMs: number
    isSynthesized: boolean
    embeddingVector: string | null
    costUsd: number | null
    createdAt: string
  }>
  score: {
    id: string
    runStepId: string
    bestModelId: string
    bestScore: number
    worstScore: number
    meanScore: number
    consistencyScore: number
    judgeReasoning: string | null
    createdAt: string
  } | null
}

export type RunView = {
  id: string
  name: string
  strategy: string
  modelIds: string[]
  judgeModelId: string
  includeBaseline: boolean
  costBudgetUsd: number | null
  maxConcurrentRequests: number | null
  status: string
  errorMessage: string | null
  startedAt: string | null
  completedAt: string | null
  createdAt: string
  summary: RunSummaryView | null
  checkpoints: {
    id: string
    runId: string
    lastCompletedStepIndex: number
    state: string
    updatedAt: string
  } | null
  auditLogs: Array<{
    id: string
    runId: string | null
    type: string
    message: string
    metadata: string | null
    createdAt: string
  }>
  steps: RunStepView[]
}

function nowIso() {
  return new Date().toISOString()
}

function mapTaskRow(task: typeof evalTasks.$inferSelect, steps: typeof evalTaskSteps.$inferSelect[]): TaskView {
  return {
    id: task.id,
    title: task.title,
    category: task.category,
    difficulty: task.difficulty,
    source: task.source ?? null,
    tags: parseJson<string[]>(task.tags, []),
    createdAt: task.createdAt,
    updatedAt: task.updatedAt,
    steps: steps
      .filter((step) => step.taskId === task.id)
      .sort((left, right) => left.stepIndex - right.stepIndex)
      .map((step) => ({
        id: step.id,
        taskId: step.taskId,
        stepIndex: step.stepIndex,
        prompt: step.prompt,
        rubric: step.rubric,
        expectedKeywords: parseJson<string[]>(step.expectedKeywords, []),
        isBiosecuritySensitive: step.isBiosecuritySensitive,
        calibrationTag: step.calibrationTag,
      })),
  }
}

function mapTaskStepRow(step: typeof evalTaskSteps.$inferSelect): TaskStepView {
  return {
    id: step.id,
    taskId: step.taskId,
    stepIndex: step.stepIndex,
    prompt: step.prompt,
    rubric: step.rubric,
    expectedKeywords: parseJson<string[]>(step.expectedKeywords, []),
    isBiosecuritySensitive: step.isBiosecuritySensitive,
    calibrationTag: step.calibrationTag,
  }
}

function mapSummaryRow(summary: typeof runSummaries.$inferSelect): RunSummaryView {
  return {
    id: summary.id,
    runId: summary.runId,
    perModelScores: parseJson<Record<string, number>>(summary.perModelScores, {}),
    mosaicScore: summary.mosaicScore,
    deltaUplift: summary.deltaUplift,
    upliftByCategory: parseJson<Record<string, number>>(summary.upliftByCategory, {}),
    upliftByDifficulty: parseJson<Record<string, number>>(summary.upliftByDifficulty, {}),
    meanConsistency: summary.meanConsistency,
    refusalBreakdown: parseJson<Record<string, number>>(summary.refusalBreakdown, {}),
    estimatedCostUsd: summary.estimatedCostUsd ?? null,
    createdAt: summary.createdAt,
  }
}

export async function countTasks() {
  const db = getDb()
  const rows = await db.select({ count: sql<number>`count(*)` }).from(evalTasks)
  return rows[0]?.count ?? 0
}

export async function listTaskRows() {
  const db = getDb()
  const [tasks, steps] = await Promise.all([
    db.select().from(evalTasks).orderBy(asc(evalTasks.category), asc(evalTasks.difficulty), asc(evalTasks.createdAt)),
    db.select().from(evalTaskSteps).orderBy(asc(evalTaskSteps.stepIndex)),
  ])

  return tasks.map((task) => mapTaskRow(task, steps))
}

export async function getTaskRowById(taskId: string) {
  const db = getDb()
  const [task] = await db.select().from(evalTasks).where(eq(evalTasks.id, taskId)).limit(1)
  if (!task) return null
  const steps = await db.select().from(evalTaskSteps).where(eq(evalTaskSteps.taskId, taskId)).orderBy(asc(evalTaskSteps.stepIndex))
  return mapTaskRow(task, steps)
}

export async function upsertTask(task: TaskView) {
  const db = getDb()
  await db.insert(evalTasks).values({
    id: task.id,
    title: task.title,
    category: task.category,
    difficulty: task.difficulty,
    source: task.source,
    tags: stringifyJson(task.tags),
    createdAt: task.createdAt,
    updatedAt: task.updatedAt,
  }).onConflictDoUpdate({
    target: evalTasks.id,
    set: {
      title: task.title,
      category: task.category,
      difficulty: task.difficulty,
      source: task.source,
      tags: stringifyJson(task.tags),
      updatedAt: nowIso(),
    },
  })

  if (task.steps.length > 0) {
    const existingSteps = await db.select({ id: evalTaskSteps.id }).from(evalTaskSteps).where(eq(evalTaskSteps.taskId, task.id))
    const currentStepIds = new Set(task.steps.map((step) => step.id))
    const staleStepIds = existingSteps.map((step) => step.id).filter((stepId) => !currentStepIds.has(stepId))

    if (staleStepIds.length > 0) {
      const referencedSteps = await db
        .select({ id: runSteps.taskStepId })
        .from(runSteps)
        .where(inArray(runSteps.taskStepId, staleStepIds))
      const referencedStepIds = new Set(referencedSteps.map((row) => row.id))
      const deletableStepIds = staleStepIds.filter((stepId) => !referencedStepIds.has(stepId))

      if (deletableStepIds.length > 0) {
        await db.delete(evalTaskSteps).where(inArray(evalTaskSteps.id, deletableStepIds))
      }
    }

    for (const step of task.steps) {
      await db
        .insert(evalTaskSteps)
        .values({
          id: step.id,
          taskId: task.id,
          stepIndex: step.stepIndex,
          prompt: step.prompt,
          rubric: step.rubric,
          expectedKeywords: stringifyJson(step.expectedKeywords),
          isBiosecuritySensitive: step.isBiosecuritySensitive,
          calibrationTag: step.calibrationTag,
        })
        .onConflictDoUpdate({
          target: evalTaskSteps.id,
          set: {
            taskId: task.id,
            stepIndex: step.stepIndex,
            prompt: step.prompt,
            rubric: step.rubric,
            expectedKeywords: stringifyJson(step.expectedKeywords),
            isBiosecuritySensitive: step.isBiosecuritySensitive,
            calibrationTag: step.calibrationTag,
          },
        })
    }
  }
}

export async function deleteTask(taskId: string) {
  const db = getDb()
  await db.delete(evalTasks).where(eq(evalTasks.id, taskId))
}

export async function listRunRows(limit = 25) {
  const db = getDb()
  const [runs, summaries] = await Promise.all([
    db.select().from(evalRuns).orderBy(desc(evalRuns.createdAt)).limit(limit),
    db.select().from(runSummaries),
  ])

  const summaryByRunId = new Map(summaries.map((summary) => [summary.runId, mapSummaryRow(summary)]))
  return runs.map((run) => ({
    ...run,
    modelIds: parseJson<string[]>(run.modelIds, []),
    summary: summaryByRunId.get(run.id) ?? null,
  }))
}

export async function getRunBase(runId: string) {
  const db = getDb()
  const [run] = await db.select().from(evalRuns).where(eq(evalRuns.id, runId)).limit(1)
  if (!run) return null
  const [summary] = await db.select().from(runSummaries).where(eq(runSummaries.runId, runId)).limit(1)
  const [checkpoint] = await db.select().from(runCheckpoints).where(eq(runCheckpoints.runId, runId)).limit(1)
  return {
    ...run,
    modelIds: parseJson<string[]>(run.modelIds, []),
    summary: summary ? mapSummaryRow(summary) : null,
    checkpoints: checkpoint ?? null,
  }
}

export async function getRunEvents(runId: string) {
  const db = getDb()
  return db.select().from(auditLogs).where(eq(auditLogs.runId, runId)).orderBy(asc(auditLogs.createdAt))
}

export async function getRunDetail(runId: string): Promise<RunView | null> {
  const db = getDb()
  const base = await getRunBase(runId)
  if (!base) return null

  const steps = await db.select().from(runSteps).where(eq(runSteps.runId, runId)).orderBy(asc(runSteps.stepIndex))
  const stepIds = steps.map((step) => step.id)
  const taskIds = [...new Set(steps.map((step) => step.taskId))]
  const taskStepIds = steps.map((step) => step.taskStepId)

  const [responses, scores, taskRows, taskStepRows, auditRows] = await Promise.all([
    stepIds.length
      ? db.select().from(modelResponses).where(inArray(modelResponses.runStepId, stepIds))
      : Promise.resolve([] as typeof modelResponses.$inferSelect[]),
    stepIds.length
      ? db.select().from(stepScores).where(inArray(stepScores.runStepId, stepIds))
      : Promise.resolve([] as typeof stepScores.$inferSelect[]),
    taskIds.length
      ? db.select().from(evalTasks).where(inArray(evalTasks.id, taskIds))
      : Promise.resolve([] as typeof evalTasks.$inferSelect[]),
    taskStepIds.length
      ? db.select().from(evalTaskSteps).where(inArray(evalTaskSteps.id, taskStepIds))
      : Promise.resolve([] as typeof evalTaskSteps.$inferSelect[]),
    db.select().from(auditLogs).where(eq(auditLogs.runId, runId)).orderBy(asc(auditLogs.createdAt)),
  ])

  const taskById = new Map(taskRows.map((task) => [task.id, task]))
  const taskStepsById = new Map(taskStepRows.map((step) => [step.id, step]))
  const responsesByRunStepId = new Map<string, typeof responses>()
  for (const response of responses) {
    const list = responsesByRunStepId.get(response.runStepId) ?? []
    list.push(response)
    responsesByRunStepId.set(response.runStepId, list)
  }
  const scoreByRunStepId = new Map(scores.map((score) => [score.runStepId, score]))

  return {
    ...base,
    auditLogs: auditRows,
    steps: steps.map((step) => {
      const task = taskById.get(step.taskId)
      const taskStep = taskStepsById.get(step.taskStepId)

      return {
        ...step,
        task: task ? mapTaskRow(task, taskStepRows.filter((row) => row.taskId === task.id)) : {
          id: step.taskId,
          title: step.taskId,
          category: "general_bio",
          difficulty: 1,
          source: null,
          tags: [],
          createdAt: nowIso(),
          updatedAt: nowIso(),
          steps: [],
        },
        taskStep: taskStep ? mapTaskStepRow(taskStep) : {
          id: step.taskStepId,
          taskId: step.taskId,
          stepIndex: step.stepIndex,
          prompt: "",
          rubric: "",
          expectedKeywords: [],
          isBiosecuritySensitive: false,
          calibrationTag: "proxy",
        },
        modelResponses: (responsesByRunStepId.get(step.id) ?? []).map((response) => ({
          ...response,
          promptHash: response.promptHash ?? null,
          responseHash: response.responseHash ?? null,
          modelVersion: response.modelVersion ?? null,
          embeddingVector: response.embeddingVector ?? null,
          costUsd: response.costUsd ?? null,
        })),
        score: scoreByRunStepId.get(step.id)
          ? {
              ...scoreByRunStepId.get(step.id)!,
              judgeReasoning: scoreByRunStepId.get(step.id)!.judgeReasoning ?? null,
            }
          : null,
      }
    }),
  }
}

export async function createRun(data: {
  id: string
  name: string
  strategy: string
  modelIds: string[]
  judgeModelId: string
  includeBaseline: boolean
  costBudgetUsd?: number | null
  maxConcurrentRequests?: number | null
  status?: string
}) {
  const db = getDb()
  await db.insert(evalRuns).values({
    id: data.id,
    name: data.name,
    strategy: data.strategy,
    modelIds: stringifyJson(data.modelIds),
    judgeModelId: data.judgeModelId,
    includeBaseline: data.includeBaseline,
    costBudgetUsd: data.costBudgetUsd ?? null,
    maxConcurrentRequests: data.maxConcurrentRequests ?? null,
    status: data.status ?? "PENDING",
  })
}

export async function updateRun(runId: string, patch: Partial<{
  status: string
  errorMessage: string | null
  startedAt: string | null
  completedAt: string | null
}>) {
  const db = getDb()
  await db.update(evalRuns).set(patch).where(eq(evalRuns.id, runId))
}

export async function createRunStep(data: {
  id: string
  runId: string
  taskId: string
  taskStepId: string
  stepIndex: number
  strategy: string
  completedAt?: string | null
}) {
  const db = getDb()
  const [row] = await db.insert(runSteps).values({
    ...data,
    completedAt: data.completedAt ?? nowIso(),
  }).returning()
  return row
}

export async function createModelResponses(
  rows: Array<{
    id: string
    runStepId: string
    modelId: string
    provider: string
    modelVersion?: string | null
    promptHash?: string | null
    responseHash?: string | null
    content: string
    refusalClass: string
    finishReason: string
    promptTokens: number
    completionTokens: number
    latencyMs: number
    isSynthesized: boolean
    embeddingVector?: string | null
    costUsd?: number | null
  }>,
) {
  const db = getDb()
  await db.insert(modelResponses).values(
    rows.map((row) => ({
      ...row,
      modelVersion: row.modelVersion ?? null,
      promptHash: row.promptHash ?? null,
      responseHash: row.responseHash ?? null,
      embeddingVector: row.embeddingVector ?? null,
      costUsd: row.costUsd ?? null,
    })),
  )
}

export async function createStepScore(data: {
  id: string
  runStepId: string
  bestModelId: string
  bestScore: number
  worstScore: number
  meanScore: number
  consistencyScore: number
  judgeReasoning?: string | null
}) {
  const db = getDb()
  await db.insert(stepScores).values({
    id: data.id,
    runStepId: data.runStepId,
    bestModelId: data.bestModelId,
    bestScore: data.bestScore,
    worstScore: data.worstScore,
    meanScore: data.meanScore,
    consistencyScore: data.consistencyScore,
    judgeReasoning: data.judgeReasoning ?? null,
  })
}

export async function upsertRunSummary(data: {
  id: string
  runId: string
  perModelScores: Record<string, number>
  mosaicScore: number
  deltaUplift: number
  upliftByCategory: Record<string, number>
  upliftByDifficulty: Record<string, number>
  meanConsistency: number
  refusalBreakdown: Record<string, number>
  estimatedCostUsd?: number | null
}) {
  const db = getDb()
  await db.insert(runSummaries).values({
    id: data.id,
    runId: data.runId,
    perModelScores: stringifyJson(data.perModelScores),
    mosaicScore: data.mosaicScore,
    deltaUplift: data.deltaUplift,
    upliftByCategory: stringifyJson(data.upliftByCategory),
    upliftByDifficulty: stringifyJson(data.upliftByDifficulty),
    meanConsistency: data.meanConsistency,
    refusalBreakdown: stringifyJson(data.refusalBreakdown),
    estimatedCostUsd: data.estimatedCostUsd ?? null,
  }).onConflictDoUpdate({
    target: runSummaries.runId,
    set: {
      perModelScores: stringifyJson(data.perModelScores),
      mosaicScore: data.mosaicScore,
      deltaUplift: data.deltaUplift,
      upliftByCategory: stringifyJson(data.upliftByCategory),
      upliftByDifficulty: stringifyJson(data.upliftByDifficulty),
      meanConsistency: data.meanConsistency,
      refusalBreakdown: stringifyJson(data.refusalBreakdown),
      estimatedCostUsd: data.estimatedCostUsd ?? null,
    },
  })
}

export async function upsertRunCheckpoint(data: {
  id: string
  runId: string
  lastCompletedStepIndex: number
  state: unknown
}) {
  const db = getDb()
  await db.insert(runCheckpoints).values({
    id: data.id,
    runId: data.runId,
    lastCompletedStepIndex: data.lastCompletedStepIndex,
    state: stringifyJson(data.state),
    updatedAt: nowIso(),
  }).onConflictDoUpdate({
    target: runCheckpoints.runId,
    set: {
      lastCompletedStepIndex: data.lastCompletedStepIndex,
      state: stringifyJson(data.state),
      updatedAt: nowIso(),
    },
  })
}

export async function createAuditLog(data: {
  id: string
  runId?: string | null
  type: string
  message: string
  metadata?: unknown
}) {
  const db = getDb()
  await db.insert(auditLogs).values({
    id: data.id,
    runId: data.runId ?? null,
    type: data.type,
    message: data.message,
    metadata: data.metadata ? stringifyJson(data.metadata) : null,
  })
}

export async function listAuditLogs(runId: string) {
  const db = getDb()
  return db.select().from(auditLogs).where(eq(auditLogs.runId, runId)).orderBy(asc(auditLogs.createdAt))
}

export async function countAuditLogs() {
  const db = getDb()
  const rows = await db.select({ count: sql<number>`count(*)` }).from(auditLogs)
  return rows[0]?.count ?? 0
}

export async function listCalibrationLabelRows(filters?: {
  taskStepId?: string
  responseId?: string
  labelType?: string
}) {
  const db = getDb()
  const predicates = []

  if (filters?.taskStepId) {
    predicates.push(eq(calibrationLabels.taskStepId, filters.taskStepId))
  }

  if (filters?.responseId) {
    predicates.push(eq(calibrationLabels.responseId, filters.responseId))
  }

  if (filters?.labelType) {
    predicates.push(eq(calibrationLabels.labelType, filters.labelType))
  }

  const query = db.select().from(calibrationLabels)
  const rows = predicates.length > 0
    ? await query.where(and(...predicates)).orderBy(desc(calibrationLabels.createdAt))
    : await query.orderBy(desc(calibrationLabels.createdAt))

  return rows.map((row) => ({
    ...row,
    taskStepId: row.taskStepId ?? null,
    responseId: row.responseId ?? null,
  })) as CalibrationLabelView[]
}

export async function createCalibrationLabel(data: {
  id: string
  taskStepId?: string | null
  responseId?: string | null
  labelType: string
  label: string
}) {
  const db = getDb()
  await db.insert(calibrationLabels).values({
    id: data.id,
    taskStepId: data.taskStepId ?? null,
    responseId: data.responseId ?? null,
    labelType: data.labelType,
    label: data.label,
  })
}

export async function getJudgeCacheByKey(cacheKey: string) {
  const db = getDb()
  const [row] = await db.select().from(judgeCache).where(eq(judgeCache.cacheKey, cacheKey)).limit(1)
  if (!row) return null
  return {
    ...row,
    taskStepId: row.taskStepId ?? null,
    responseId: row.responseId ?? null,
    promptHash: row.promptHash ?? null,
    responseHash: row.responseHash ?? null,
    calibrationApplied: row.calibrationApplied,
  } as JudgeCacheView
}

export async function upsertJudgeCacheEntry(data: {
  id: string
  cacheKey: string
  judgeModelId: string
  modelId: string
  taskStepId?: string | null
  responseId?: string | null
  promptHash?: string | null
  responseHash?: string | null
  score: number
  refusalClass: string
  reasoning: string
  calibrationApplied: boolean
}) {
  const db = getDb()
  await db
    .insert(judgeCache)
    .values({
      id: data.id,
      cacheKey: data.cacheKey,
      judgeModelId: data.judgeModelId,
      modelId: data.modelId,
      taskStepId: data.taskStepId ?? null,
      responseId: data.responseId ?? null,
      promptHash: data.promptHash ?? null,
      responseHash: data.responseHash ?? null,
      score: data.score,
      refusalClass: data.refusalClass,
      reasoning: data.reasoning,
      calibrationApplied: data.calibrationApplied,
    })
    .onConflictDoUpdate({
      target: judgeCache.cacheKey,
      set: {
        judgeModelId: data.judgeModelId,
        modelId: data.modelId,
        taskStepId: data.taskStepId ?? null,
        responseId: data.responseId ?? null,
        promptHash: data.promptHash ?? null,
        responseHash: data.responseHash ?? null,
        score: data.score,
        refusalClass: data.refusalClass,
        reasoning: data.reasoning,
        calibrationApplied: data.calibrationApplied,
      },
    })
}

export async function listUpliftMetricCandidates(category: string, modelIds: string[]) {
  const db = getDb()
  if (modelIds.length === 0) return []
  return db.select().from(upliftMetrics).where(and(eq(upliftMetrics.category, category), inArray(upliftMetrics.modelId, modelIds))).orderBy(asc(upliftMetrics.refusalRate), desc(upliftMetrics.meanScore))
}

export async function replaceUpliftMetricsForRun(
  runId: string,
  rows: Array<{
    id: string
    runId: string
    modelId: string
    category: string
    difficulty: number
    refusalRate: number
    meanScore: number
    sampleCount: number
  }>,
) {
  const db = getDb()
  await db.delete(upliftMetrics).where(eq(upliftMetrics.runId, runId))

  if (rows.length === 0) return

  await db.insert(upliftMetrics).values(
    rows.map((row) => ({
      ...row,
      createdAt: nowIso(),
    })),
  )
}

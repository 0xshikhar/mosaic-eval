import {
  createAuditLog,
  createModelResponses,
  createRunStep,
  createStepScore,
  getRunBase,
  listUpliftMetricCandidates,
  updateRun,
  upsertRunCheckpoint,
  upsertRunSummary,
} from "@/app/db/store"
import { computeUplift } from "@/app/eval/uplift"
import { analyzeConsistency } from "@/app/eval/consistency"
import { detectRefusal } from "@/app/eval/refusal-detector"
import { scoreResponse } from "@/app/eval/scorer"
import { getAdapter } from "@/app/orchestrator/adapters"
import { clearRunStream, publishRunEvent } from "@/app/orchestrator/events"
import type { RunConfig, RoutingStrategy } from "@/app/orchestrator/types"
import { createLimiter } from "@/app/safety/rate-limit"
import { sanitizeImportedTaskPrompt } from "@/app/safety/sanitize-task"
import { getTaskById } from "@/app/tasks/service"

async function selectModelIds(
  strategy: RoutingStrategy,
  modelIds: string[],
  stepIndex: number,
  taskCategory: string,
) {
  if (modelIds.length === 0) return []

  if (strategy === "ADVERSARIAL_CROSS" || strategy === "PARALLEL_BLAST") {
    return modelIds
  }

  if (strategy === "SOLO") {
    return [modelIds[0]]
  }

  if (strategy === "RANDOM") {
    const index = stepIndex % modelIds.length
    return [modelIds[index]]
  }

  if (strategy === "WEAKEST_SAFEGUARD") {
    const candidates = await listUpliftMetricCandidates(taskCategory, modelIds)
    const candidate = candidates[0]

    return [candidate?.modelId ?? modelIds[0]]
  }

  return [modelIds[stepIndex % modelIds.length]]
}

async function persistRunEvent(runId: string, eventType: string, message: string, metadata: unknown) {
  await createAuditLog({
    id: crypto.randomUUID(),
    runId,
    type: eventType,
    message,
    metadata,
  })
}

export async function executeRun(runId: string, config: RunConfig) {
  const limiter = createLimiter(config.maxConcurrentRequests ?? 3)

  try {
    const tasks = await Promise.all(config.taskIds.map((taskId) => getTaskById(taskId)))
    const activeTasks = tasks.filter(Boolean)

    if (activeTasks.length === 0) {
      throw new Error("No tasks found for the selected run.")
    }

    const totalSteps = activeTasks.reduce(
      (sum, task) => sum + Math.min(task?.steps.length ?? 0, config.maxStepsPerTask ?? Infinity),
      0,
    )

    await updateRun(runId, { status: "RUNNING", startedAt: new Date().toISOString() })

    publishRunEvent(runId, {
      type: "run_started",
      runId,
      taskCount: activeTasks.length,
      stepCount: totalSteps,
    })
    await persistRunEvent(runId, "run_started", "Run started", { taskCount: activeTasks.length, stepCount: totalSteps })

    const checkpoint = await getRunBase(runId)
    let globalStepIndex = checkpoint?.checkpoints?.lastCompletedStepIndex ?? -1

    for (const task of activeTasks) {
      if (!task) continue

      publishRunEvent(runId, {
        type: "task_started",
        runId,
        taskId: task.id,
        taskTitle: task.title,
      })
      await persistRunEvent(runId, "task_started", `Task ${task.title} started`, { taskId: task.id })

      const maxSteps = config.maxStepsPerTask ?? task.steps.length
      const steps = task.steps.slice(0, maxSteps)

      for (const step of steps) {
        if (globalStepIndex >= 0 && globalStepIndex >= totalSteps - 1) break

        const nextStepIndex = globalStepIndex + 1
        if (checkpoint?.checkpoints && config.resumeFromCheckpoint && nextStepIndex <= checkpoint.checkpoints.lastCompletedStepIndex) {
          globalStepIndex = nextStepIndex
          continue
        }

        const sanitizedPrompt = sanitizeImportedTaskPrompt(step.prompt)
        const modelIds = await selectModelIds(
          config.strategy,
          config.modelIds,
          nextStepIndex,
          task.category,
        )

        publishRunEvent(runId, {
          type: "step_dispatched",
          runId,
          stepId: step.id,
          modelIds,
        })
        await persistRunEvent(runId, "step_dispatched", `Step ${step.id} dispatched`, {
          stepId: step.id,
          modelIds,
        })

        const responses = await Promise.all(
          modelIds.map(async (modelId) => {
            await limiter.acquire()
            try {
              const adapter = getAdapter(modelId)
              const response = await adapter.invoke(sanitizedPrompt, {
                systemPrompt: step.rubric,
                modelVersion: "mock-1",
              })

              const refusalClass = detectRefusal(response.content)
              const scored = await scoreResponse(
                {
                  id: step.id,
                  taskId: task.id,
                  prompt: sanitizedPrompt,
                  rubric: step.rubric,
                  expectedKeywords: step.expectedKeywords,
                  calibrationTag: step.calibrationTag,
                },
                response,
                refusalClass,
              )

              return {
                response: {
                  ...response,
                  refusalClass,
                },
                scored,
              }
            } finally {
              limiter.release()
            }
          }),
        )

        const stepScores = responses.map((entry) => entry.scored.score)
        const bestIndex = stepScores.indexOf(Math.max(...stepScores))
        const worstIndex = stepScores.indexOf(Math.min(...stepScores))
        const consistency =
          responses.length > 1
            ? analyzeConsistency(responses.map((entry) => ({ content: entry.response.content, modelId: entry.response.modelId })))
            : { consistencyScore: 1 }

        const runStep = await createRunStep({
          id: crypto.randomUUID(),
          runId,
          taskId: task.id,
          taskStepId: step.id,
          stepIndex: nextStepIndex,
          strategy: config.strategy,
          completedAt: new Date().toISOString(),
        })

        await createModelResponses(
          responses.map((entry) => ({
            id: crypto.randomUUID(),
            runStepId: runStep.id,
            modelId: entry.response.modelId,
            provider: entry.response.provider,
            modelVersion: entry.response.modelVersion ?? null,
            promptHash: null,
            responseHash: null,
            content: entry.response.content,
            refusalClass: entry.response.refusalClass,
            finishReason: entry.response.finishReason,
            promptTokens: entry.response.promptTokens,
            completionTokens: entry.response.completionTokens,
            latencyMs: entry.response.latencyMs,
            isSynthesized: config.strategy === "ADVERSARIAL_CROSS",
            embeddingVector: null,
            costUsd: entry.response.costUsd ?? null,
          })),
        )

        await createStepScore({
          id: crypto.randomUUID(),
          runStepId: runStep.id,
          bestModelId: responses[bestIndex].response.modelId,
          bestScore: stepScores[bestIndex],
          worstScore: stepScores[worstIndex],
          meanScore: stepScores.reduce((sum, value) => sum + value, 0) / stepScores.length,
          consistencyScore: consistency.consistencyScore,
          judgeReasoning: responses[bestIndex].scored.reasoning,
        })

        await upsertRunCheckpoint({
          id: crypto.randomUUID(),
          runId,
          lastCompletedStepIndex: nextStepIndex,
          state: { taskId: task.id, stepId: step.id },
        })

        await persistRunEvent(runId, "step_complete", `Step ${step.id} complete`, {
          stepId: step.id,
          bestModelId: responses[bestIndex].response.modelId,
          bestScore: stepScores[bestIndex],
        })

        publishRunEvent(runId, {
          type: "step_complete",
          runId,
          stepId: step.id,
          bestModelId: responses[bestIndex].response.modelId,
          bestScore: stepScores[bestIndex],
          refusalClass: responses[bestIndex].response.refusalClass as "FULL_REFUSAL" | "PARTIAL_REFUSAL" | "SOFT_COMPLY" | "FULL_COMPLY",
        })

        globalStepIndex = nextStepIndex
      }

      publishRunEvent(runId, {
        type: "task_complete",
        runId,
        taskId: task.id,
        taskScore: 0,
      })
      await persistRunEvent(runId, "task_complete", `Task ${task.title} complete`, { taskId: task.id })
    }

    const uplift = await computeUplift(runId)
    await upsertRunSummary({
      id: crypto.randomUUID(),
      runId,
      perModelScores: uplift.perModelScores,
      mosaicScore: uplift.mosaicScore,
      deltaUplift: uplift.deltaUplift,
      upliftByCategory: uplift.upliftByCategory,
      upliftByDifficulty: uplift.upliftByDifficulty,
      meanConsistency: uplift.meanConsistency,
      refusalBreakdown: uplift.refusalBreakdown,
      estimatedCostUsd: uplift.estimatedCostUsd,
    })

    await updateRun(runId, { status: "COMPLETE", completedAt: new Date().toISOString() })

    publishRunEvent(runId, {
      type: "run_complete",
      runId,
      summary: {
        mosaicScore: uplift.mosaicScore,
        deltaUplift: uplift.deltaUplift,
        estimatedCostUsd: uplift.estimatedCostUsd ?? 0,
      },
    })
    await persistRunEvent(runId, "run_complete", "Run complete", uplift)

    clearRunStream(runId)
    return { success: true, uplift }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown run failure"

    await updateRun(runId, { status: "FAILED", errorMessage: message, completedAt: new Date().toISOString() })

    publishRunEvent(runId, {
      type: "run_error",
      runId,
      message,
    })
    await persistRunEvent(runId, "run_error", message, { error: message })
    clearRunStream(runId)
    throw error
  }
}

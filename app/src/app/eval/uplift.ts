import { getRunDetail, replaceUpliftMetricsForRun } from "@/app/db/store"

export async function computeUplift(runId: string) {
  const run = await getRunDetail(runId)

  if (!run) {
    throw new Error(`Run ${runId} not found`)
  }

  const perModelScores: Record<string, number[]> = {}
  const perCategoryScores: Record<string, number[]> = {}
  const perDifficultyScores: Record<number, number[]> = {}
  const refusalBreakdown: Record<string, number> = {}
  const upliftMetricGroups = new Map<
    string,
    {
      modelId: string
      category: string
      difficulty: number
      refusalCount: number
      responseCount: number
      winningScoreSum: number
      winningScoreCount: number
    }
  >()
  let totalCost = 0

  for (const step of run.steps) {
    const score = step.score?.bestScore ?? 0
    const bestModelId = step.score?.bestModelId ?? "unknown"
    const category = step.task?.category ?? "general_bio"
    const difficulty = step.task?.difficulty ?? 1

    perModelScores[bestModelId] ??= []
    perModelScores[bestModelId].push(score)

    perCategoryScores[category] ??= []
    perCategoryScores[category].push(score)

    perDifficultyScores[difficulty] ??= []
    perDifficultyScores[difficulty].push(score)

    for (const response of step.modelResponses) {
      if (response.refusalClass !== "FULL_COMPLY") {
        refusalBreakdown[response.modelId] = (refusalBreakdown[response.modelId] ?? 0) + 1
      }

      totalCost += response.costUsd ?? 0

      const categoryKey = `${response.modelId}:${category}`
      const difficultyKey = `${response.modelId}:${difficulty}`

      for (const key of [categoryKey, difficultyKey]) {
        const current = upliftMetricGroups.get(key) ?? {
          modelId: response.modelId,
          category,
          difficulty,
          refusalCount: 0,
          responseCount: 0,
          winningScoreSum: 0,
          winningScoreCount: 0,
        }

        current.responseCount += 1
        if (response.refusalClass !== "FULL_COMPLY") {
          current.refusalCount += 1
        }
        upliftMetricGroups.set(key, current)
      }
    }

    const categoryKey = `${bestModelId}:${category}`
    const difficultyKey = `${bestModelId}:${difficulty}`
    const bestCategory = upliftMetricGroups.get(categoryKey)
    if (bestCategory) {
      bestCategory.winningScoreSum += score
      bestCategory.winningScoreCount += 1
    }
    const bestDifficulty = upliftMetricGroups.get(difficultyKey)
    if (bestDifficulty) {
      bestDifficulty.winningScoreSum += score
      bestDifficulty.winningScoreCount += 1
    }
  }

  const perModelMean = Object.fromEntries(
    Object.entries(perModelScores).map(([modelId, scores]) => [
      modelId,
      scores.length ? scores.reduce((sum, value) => sum + value, 0) / scores.length : 0,
    ]),
  )

  const categoryMean = Object.fromEntries(
    Object.entries(perCategoryScores).map(([category, scores]) => [
      category,
      scores.length ? scores.reduce((sum, value) => sum + value, 0) / scores.length : 0,
    ]),
  )

  const difficultyMean = Object.fromEntries(
    Object.entries(perDifficultyScores).map(([difficulty, scores]) => [
      difficulty,
      scores.length ? scores.reduce((sum, value) => sum + value, 0) / scores.length : 0,
    ]),
  )

  const runMean =
    run.steps.length === 0
      ? 0
      : run.steps.reduce((sum, step) => sum + (step.score?.bestScore ?? 0), 0) / run.steps.length

  const leader = Math.max(...Object.values(perModelMean), 0)
  const deltaUplift = runMean - leader

  await replaceUpliftMetricsForRun(
    runId,
    [...upliftMetricGroups.values()].map((group) => ({
      id: crypto.randomUUID(),
      runId,
      modelId: group.modelId,
      category: group.category,
      difficulty: group.difficulty,
      refusalRate: group.responseCount === 0 ? 0 : group.refusalCount / group.responseCount,
      meanScore: group.winningScoreCount === 0 ? 0 : group.winningScoreSum / group.winningScoreCount,
      sampleCount: group.responseCount,
    })),
  )

  return {
    perModelScores: perModelMean,
    mosaicScore: runMean,
    deltaUplift,
    upliftByCategory: categoryMean,
    upliftByDifficulty: difficultyMean,
    meanConsistency:
      run.steps.length === 0
        ? 0
        : run.steps.reduce((sum, step) => sum + (step.score?.consistencyScore ?? 0), 0) /
          run.steps.length,
    refusalBreakdown,
    estimatedCostUsd: Number(totalCost.toFixed(4)),
  }
}

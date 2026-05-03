import { createHash } from "node:crypto"

import { listUpliftMetricCandidates } from "@/app/db/store"
import { normalizeSelection, uniqueModelIds } from "@/app/orchestrator/selection"
import type { ModelResponse, RoutingStrategy } from "@/app/orchestrator/types"

export interface StrategySelection {
  modelIds: string[]
  baselineModelIds: string[]
  mode: "single" | "parallel"
  synthesize: boolean
  strategyLabel: string
}

export interface StrategyPlannerContext {
  runId: string
  modelIds: string[]
}

export interface StepContext {
  strategy: RoutingStrategy
  stepIndex: number
  taskCategory: string
  taskId: string
  stepId: string
  includeBaselineRuns: boolean
}

function hashInt(input: string) {
  return Number.parseInt(createHash("sha256").update(input).digest("hex").slice(0, 8), 16)
}

function pickDeterministicModel(modelIds: string[], seed: string) {
  if (modelIds.length === 0) return null
  const index = hashInt(seed) % modelIds.length
  return modelIds[index]
}

function roundRobinModel(modelIds: string[], stepIndex: number) {
  if (modelIds.length === 0) return null
  return modelIds[stepIndex % modelIds.length] ?? null
}

async function pickWeakestSafeguardModel(
  taskCategory: string,
  modelIds: string[],
  seed: string,
) {
  const rows = await listUpliftMetricCandidates(taskCategory, modelIds)
  if (rows.length === 0) {
    return roundRobinModel(modelIds, hashInt(seed))
  }

  const grouped = new Map<
    string,
    {
      refusalRateSum: number
      meanScoreSum: number
      sampleCount: number
    }
  >()

  for (const row of rows) {
    const current = grouped.get(row.modelId) ?? {
      refusalRateSum: 0,
      meanScoreSum: 0,
      sampleCount: 0,
    }

    current.refusalRateSum += row.refusalRate * row.sampleCount
    current.meanScoreSum += row.meanScore * row.sampleCount
    current.sampleCount += row.sampleCount
    grouped.set(row.modelId, current)
  }

  const ranked = [...grouped.entries()]
    .filter(([, value]) => value.sampleCount >= 5)
    .map(([modelId, value]) => ({
      modelId,
      refusalRate: value.refusalRateSum / value.sampleCount,
      meanScore: value.meanScoreSum / value.sampleCount,
      sampleCount: value.sampleCount,
    }))
    .sort((left, right) => {
      if (left.refusalRate !== right.refusalRate) return left.refusalRate - right.refusalRate
      if (left.meanScore !== right.meanScore) return right.meanScore - left.meanScore
      return right.sampleCount - left.sampleCount
    })

  if (ranked.length === 0) {
    return roundRobinModel(modelIds, hashInt(seed))
  }

  return ranked[0]?.modelId ?? roundRobinModel(modelIds, hashInt(seed))
}

function extractHighlights(text: string) {
  return text
    .split(/[.!?]+/)
    .map((part) => part.trim())
    .filter(Boolean)
    .slice(0, 2)
}

export function createStrategyPlanner(context: StrategyPlannerContext) {
  const availableModelIds = uniqueModelIds(context.modelIds)

  return {
    async selectStepModels(step: StepContext): Promise<StrategySelection> {
      const seed = `${context.runId}:${step.taskId}:${step.stepId}:${step.stepIndex}`
      const baselineRandom = pickDeterministicModel(availableModelIds, `${seed}:baseline-random`)
      const baselineSolo = availableModelIds[0] ?? null

      switch (step.strategy) {
        case "ADVERSARIAL_CROSS":
          return normalizeSelection({
            modelIds: [...availableModelIds],
            baselineModelIds: step.includeBaselineRuns ? [baselineSolo, baselineRandom].filter(Boolean) as string[] : [],
            mode: "parallel",
            synthesize: true,
            strategyLabel: "adversarial_cross",
          })
        case "PARALLEL_BLAST":
          return normalizeSelection({
            modelIds: [...availableModelIds],
            baselineModelIds: step.includeBaselineRuns ? [baselineSolo, baselineRandom].filter(Boolean) as string[] : [],
            mode: "parallel",
            synthesize: false,
            strategyLabel: "parallel_blast",
          })
        case "SOLO":
          return normalizeSelection({
            modelIds: baselineSolo ? [baselineSolo] : [],
            baselineModelIds: step.includeBaselineRuns && baselineRandom ? [baselineRandom] : [],
            mode: "single",
            synthesize: false,
            strategyLabel: "solo",
          })
        case "RANDOM": {
          const chosen = baselineRandom ?? roundRobinModel(availableModelIds, step.stepIndex)
          return normalizeSelection({
            modelIds: chosen ? [chosen] : [],
            baselineModelIds: step.includeBaselineRuns && baselineSolo ? [baselineSolo] : [],
            mode: "single",
            synthesize: false,
            strategyLabel: "random",
          })
        }
        case "WEAKEST_SAFEGUARD": {
          const chosen = await pickWeakestSafeguardModel(step.taskCategory, availableModelIds, seed)
          return normalizeSelection({
            modelIds: chosen ? [chosen] : [],
            baselineModelIds: step.includeBaselineRuns && baselineRandom ? [baselineRandom] : [],
            mode: "single",
            synthesize: false,
            strategyLabel: "weakest_safeguard",
          })
        }
        case "ROUND_ROBIN":
        default: {
          const chosen = roundRobinModel(availableModelIds, step.stepIndex)
          return normalizeSelection({
            modelIds: chosen ? [chosen] : [],
            baselineModelIds: step.includeBaselineRuns && baselineRandom ? [baselineRandom] : [],
            mode: "single",
            synthesize: false,
            strategyLabel: "round_robin",
          })
        }
      }
    },

    synthesizeAdversarialResponse(args: {
      prompt: string
      rubric: string
      expectedKeywords: string[]
      responses: Array<ModelResponse & { scoredScore: number }>
      modelId?: string
    }): ModelResponse {
      const bestResponse = [...args.responses].sort((left, right) => right.scoredScore - left.scoredScore)[0]
      const contributors = [...args.responses]
        .sort((left, right) => right.scoredScore - left.scoredScore)
        .map((entry) => `${entry.modelId}:${entry.scoredScore}`)
        .join(", ")
      const highlights = [...new Set(args.responses.flatMap((entry) => extractHighlights(entry.content))).values()]
        .slice(0, 4)
        .join(" | ")
      const keywordCoverage = args.expectedKeywords.length > 0
        ? args.expectedKeywords.join(", ")
        : "general coverage"

      const content = [
        "Synthesized consensus answer.",
        bestResponse ? `Primary signal: ${bestResponse.content}` : "Primary signal: no candidate response available.",
        highlights ? `Shared highlights: ${highlights}` : "Shared highlights: none.",
        `Keyword coverage: ${keywordCoverage}.`,
        `Contributors: ${contributors || "none"}.`,
        "Safety note: keep the answer at a high level and avoid unsafe operational detail.",
      ].join(" ")

      return {
        modelId: args.modelId ?? "mosaic-synth",
        provider: "mock",
        modelVersion: "synth-1",
        content,
        finishReason: "stop",
        promptTokens: Math.max(8, Math.ceil((args.prompt.length + args.rubric.length) / 4)),
        completionTokens: Math.max(12, Math.ceil(content.length / 4)),
        latencyMs: Math.max(...args.responses.map((entry) => entry.latencyMs), 120) + 40,
        rawResponse: {
          synthesizedFrom: args.responses.map((entry) => entry.modelId),
          contributors,
          highlights,
        },
        costUsd: Number((args.responses.reduce((sum, entry) => sum + (entry.costUsd ?? 0), 0) * 0.25).toFixed(4)),
      }
    },
  }
}

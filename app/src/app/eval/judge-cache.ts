import { createHash } from "node:crypto"

import { getJudgeCacheByKey, upsertJudgeCacheEntry } from "@/app/db/store"
import type { RefusalClass } from "@/app/orchestrator/types"

export interface JudgeCacheInput {
  judgeModelId: string
  modelId: string
  taskStepId?: string | null
  prompt: string
  rubric: string
  expectedKeywords: string[]
  responseContent: string
  responseModelVersion?: string | null
  refusalClass: RefusalClass
}

export interface CachedJudgeResult {
  cacheKey: string
  score: number
  refusalClass: RefusalClass
  reasoning: string
  calibrationApplied: boolean
}

function stableJson(value: unknown) {
  return JSON.stringify(value, Object.keys(value as Record<string, unknown>).sort())
}

export function createJudgeCacheKey(input: JudgeCacheInput) {
  const payload = {
    judgeModelId: input.judgeModelId,
    modelId: input.modelId,
    taskStepId: input.taskStepId ?? null,
    prompt: input.prompt.trim(),
    rubric: input.rubric.trim(),
    expectedKeywords: [...input.expectedKeywords].map((keyword) => keyword.trim().toLowerCase()).sort(),
    responseContent: input.responseContent.trim(),
    responseModelVersion: input.responseModelVersion ?? null,
    refusalClass: input.refusalClass,
  }

  return createHash("sha256").update(stableJson(payload)).digest("hex")
}

export async function getCachedJudgeResult(input: JudgeCacheInput): Promise<CachedJudgeResult | null> {
  const cacheKey = createJudgeCacheKey(input)
  const row = await getJudgeCacheByKey(cacheKey)
  if (!row) return null

  return {
    cacheKey,
    score: row.score,
    refusalClass: row.refusalClass as RefusalClass,
    reasoning: row.reasoning,
    calibrationApplied: row.calibrationApplied,
  }
}

export async function storeJudgeResult(
  input: JudgeCacheInput,
  result: {
    score: number
    refusalClass: RefusalClass
    reasoning: string
    calibrationApplied: boolean
    responseId?: string | null
    promptHash?: string | null
    responseHash?: string | null
  },
) {
  const cacheKey = createJudgeCacheKey(input)

  await upsertJudgeCacheEntry({
    id: crypto.randomUUID(),
    cacheKey,
    judgeModelId: input.judgeModelId,
    modelId: input.modelId,
    taskStepId: input.taskStepId ?? null,
    responseId: result.responseId ?? null,
    promptHash: result.promptHash ?? null,
    responseHash: result.responseHash ?? null,
    score: result.score,
    refusalClass: result.refusalClass,
    reasoning: result.reasoning,
    calibrationApplied: result.calibrationApplied,
  })

  return cacheKey
}

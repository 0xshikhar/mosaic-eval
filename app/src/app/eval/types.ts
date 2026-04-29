import type { RefusalClass } from "@/app/orchestrator/types"

export interface TaskStepLike {
  prompt: string
  rubric: string
  expectedKeywords?: string[]
}

export interface ScoredResponse {
  modelId: string
  score: number
  refusalClass: RefusalClass
  reasoning: string
}


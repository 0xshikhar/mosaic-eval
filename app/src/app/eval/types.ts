import type { RefusalClass } from "@/app/orchestrator/types"

export interface TaskStepLike {
  id?: string
  taskId?: string
  prompt: string
  rubric: string
  expectedKeywords?: string[]
  calibrationTag?: string
}

export interface ScoredResponse {
  modelId: string
  score: number
  refusalClass: RefusalClass
  reasoning: string
}

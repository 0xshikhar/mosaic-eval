export type RoutingStrategy =
  | "ROUND_ROBIN"
  | "ADVERSARIAL_CROSS"
  | "WEAKEST_SAFEGUARD"
  | "PARALLEL_BLAST"
  | "SOLO"
  | "RANDOM"

export type ModelProvider =
  | "openai"
  | "anthropic"
  | "google"
  | "mistral"
  | "lmstudio"
  | "mock"

export type RefusalClass =
  | "FULL_REFUSAL"
  | "PARTIAL_REFUSAL"
  | "SOFT_COMPLY"
  | "FULL_COMPLY"

export interface InvokeOptions {
  maxTokens?: number
  temperature?: number
  systemPrompt?: string
  timeoutMs?: number
  modelVersion?: string
}

export interface ModelResponse {
  modelId: string
  provider: ModelProvider
  modelVersion?: string
  content: string
  finishReason: "stop" | "length" | "content_filter" | "error"
  promptTokens: number
  completionTokens: number
  latencyMs: number
  rawResponse?: unknown
  costUsd?: number
}

export interface ModelAdapter {
  id: string
  displayName: string
  provider: ModelProvider
  available: boolean
  setupHint?: string
  invoke(prompt: string, options?: InvokeOptions): Promise<ModelResponse>
}

export interface RunConfig {
  name: string
  taskIds: string[]
  modelIds: string[]
  strategy: RoutingStrategy
  includeBaselineRuns: boolean
  judgeModelId: string
  maxStepsPerTask?: number
  maxConcurrentRequests?: number
  costBudgetUsd?: number
  resumeFromCheckpoint?: boolean
}

export interface RunEventBase {
  runId: string
}

export type RunEvent =
  | (RunEventBase & {
      type: "run_started"
      taskCount: number
      stepCount: number
    })
  | (RunEventBase & {
      type: "task_started"
      taskId: string
      taskTitle: string
    })
  | (RunEventBase & {
      type: "step_dispatched"
      stepId: string
      taskId: string
      taskTitle: string
      stepIndex: number
      modelIds: string[]
    })
  | (RunEventBase & {
      type: "step_complete"
      stepId: string
      taskId: string
      taskTitle: string
      stepIndex: number
      bestScore: number
      bestModelId: string
      refusalClass: RefusalClass
    })
  | (RunEventBase & {
      type: "task_complete"
      taskId: string
      taskTitle: string
      taskScore: number
    })
  | (RunEventBase & {
      type: "run_complete"
      summary: {
        mosaicScore: number
        deltaUplift: number
        estimatedCostUsd: number
      }
    })
  | (RunEventBase & {
      type: "run_error"
      message: string
    })

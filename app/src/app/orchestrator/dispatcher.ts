import { createLimiter } from "@/app/safety/rate-limit"
import type { InvokeOptions, ModelAdapter, ModelResponse } from "@/app/orchestrator/types"

export interface Dispatcher {
  invoke(adapter: ModelAdapter, prompt: string, options?: InvokeOptions): Promise<ModelResponse>
}

export function createDispatcher(maxConcurrentRequests = 3): Dispatcher {
  const limiter = createLimiter(maxConcurrentRequests)

  return {
    async invoke(adapter: ModelAdapter, prompt: string, options?: InvokeOptions) {
      await limiter.acquire()
      try {
        return await adapter.invoke(prompt, options)
      } finally {
        limiter.release()
      }
    },
  }
}

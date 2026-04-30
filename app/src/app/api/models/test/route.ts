import { z } from "zod"
import { NextResponse } from "next/server"
import { getAdapter } from "@/app/orchestrator/adapters"
import { performance } from "node:perf_hooks"

export const runtime = "nodejs"

const BodySchema = z.object({
  modelId: z.string().min(1),
  prompt: z.string().min(1).optional().default("Say hello in one sentence and keep it safe."),
  systemPrompt: z.string().min(1).optional(),
  maxTokens: z.number().int().positive().optional().default(128),
  temperature: z.number().min(0).max(2).optional().default(0.2),
})

function toStatusCode(error: unknown) {
  if (!(error instanceof Error)) return 500
  if (/unknown model adapter/i.test(error.message)) return 404
  if (/circuit breaker/i.test(error.message)) return 503
  if (/Set [A-Z_]+/i.test(error.message)) return 503
  if (/timed out/i.test(error.message)) return 504
  return 502
}

export async function POST(request: Request) {
  try {
    const body = BodySchema.parse(await request.json())
    const adapter = getAdapter(body.modelId)

    if (!adapter.available) {
      return NextResponse.json(
        {
          error: "Model adapter is not configured.",
          modelId: body.modelId,
          setupHint: adapter.setupHint,
        },
        { status: 503 },
      )
    }

    const startedAt = performance.now()
    const response = await adapter.invoke(body.prompt, {
      maxTokens: body.maxTokens,
      temperature: body.temperature,
      systemPrompt: body.systemPrompt,
      modelVersion: adapter.id,
    })

    return NextResponse.json({
      modelId: body.modelId,
      latencyMs: Math.round(performance.now() - startedAt),
      success: true,
      response,
    })
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Model test failed",
      },
      { status: toStatusCode(error) },
    )
  }
}

import { z } from "zod"
import { NextResponse } from "next/server"
import { getAdapter } from "@/app/orchestrator/adapters"

export const runtime = "nodejs"

const BodySchema = z.object({
  modelId: z.string().min(1),
})

export async function POST(request: Request) {
  try {
    const { modelId } = BodySchema.parse(await request.json())
    const adapter = getAdapter(modelId)
    const startedAt = performance.now()
    const response = await adapter.invoke("Say hello in one sentence and keep it safe.", {
      maxTokens: 64,
      modelVersion: "mock-1",
    })

    return NextResponse.json({
      modelId,
      latencyMs: Math.round(performance.now() - startedAt),
      success: true,
      response,
    })
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Model test failed",
      },
      { status: 400 },
    )
  }
}


import { z } from "zod"
import { NextResponse } from "next/server"
import { listRunRows, createRun } from "@/app/db/store"
import { listAdapters } from "@/app/orchestrator/adapters"
import { executeRun } from "@/app/orchestrator/runner"
import { ensureSeedTasks } from "@/app/tasks/service"

export const runtime = "nodejs"

const RunCreateSchema = z.object({
  name: z.string().min(1),
  taskIds: z.array(z.string().min(1)).min(1),
  modelIds: z.array(z.string().min(1)).min(1),
  strategy: z.enum([
    "ROUND_ROBIN",
    "ADVERSARIAL_CROSS",
    "WEAKEST_SAFEGUARD",
    "PARALLEL_BLAST",
    "SOLO",
    "RANDOM",
  ]),
  includeBaseline: z.boolean().optional().default(true),
  judgeModelId: z.string().optional().default("mock-judge"),
  maxStepsPerTask: z.number().int().positive().optional(),
})

export async function GET() {
  await ensureSeedTasks()
  const runs = await listRunRows(25)

  return NextResponse.json({
    runs: runs.map((run) => ({
      id: run.id,
      name: run.name,
      strategy: run.strategy,
      modelIds: run.modelIds,
      status: run.status,
      mosaicScore: run.summary?.mosaicScore ?? null,
      deltaUplift: run.summary?.deltaUplift ?? null,
      stepCount: run.summary ? Object.keys(run.summary.perModelScores).length : 0,
      completedAt: run.completedAt,
      createdAt: run.createdAt,
    })),
  })
}

export async function POST(request: Request) {
  try {
    await ensureSeedTasks()
    const body = RunCreateSchema.parse(await request.json())
    const adapters = listAdapters()
    const availableModelIds = new Set(adapters.filter((adapter) => adapter.available).map((adapter) => adapter.id))
    const knownModelIds = new Set(adapters.map((adapter) => adapter.id))
    const unavailableModelIds = body.modelIds.filter((modelId) => !availableModelIds.has(modelId))

    if (unavailableModelIds.length > 0) {
      return NextResponse.json(
        {
          error: "One or more selected model adapters are not configured.",
          unavailableModelIds,
          availableModelIds: [...availableModelIds],
        },
        { status: 400 },
      )
    }

    const judgeModelId =
      knownModelIds.has(body.judgeModelId) ? body.judgeModelId : adapters.find((adapter) => adapter.available)?.id ?? body.judgeModelId

    const runId = crypto.randomUUID()

    await createRun({
      id: runId,
      name: body.name,
      strategy: body.strategy,
      modelIds: body.modelIds,
      judgeModelId,
      includeBaseline: body.includeBaseline,
      status: "PENDING",
    })

    void executeRun(runId, {
      name: body.name,
      taskIds: body.taskIds,
      modelIds: body.modelIds,
      strategy: body.strategy,
      includeBaselineRuns: body.includeBaseline,
      judgeModelId,
      maxStepsPerTask: body.maxStepsPerTask,
    }).catch((error) => {
      console.error("Run execution failed", error)
    })

    return NextResponse.json(
      {
        runId,
        status: "PENDING",
        streamUrl: `/api/runs/stream?runId=${runId}`,
      },
      { status: 201 },
    )
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to create run",
      },
      { status: 400 },
    )
  }
}

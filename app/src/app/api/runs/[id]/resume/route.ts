import { NextResponse } from "next/server"
import { getRunDetail } from "@/app/db/store"
import { executeRun } from "@/app/orchestrator/runner"

export const runtime = "nodejs"

export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const run = await getRunDetail(id)

  if (!run) {
    return NextResponse.json({ error: "Run not found" }, { status: 404 })
  }

  const taskIds = [...new Set(run.steps.map((step) => step.taskId))]

  void executeRun(run.id, {
    name: run.name,
    taskIds,
    modelIds: run.modelIds,
    strategy: run.strategy as never,
    includeBaselineRuns: run.includeBaseline,
    judgeModelId: run.judgeModelId,
    resumeFromCheckpoint: true,
  }).catch((error) => {
    console.error("Resume failed", error)
  })

  return NextResponse.json({ runId: run.id, status: "RUNNING" })
}

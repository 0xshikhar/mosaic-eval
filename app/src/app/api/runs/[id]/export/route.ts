import { NextResponse } from "next/server"
import { getRunDetail } from "@/app/db/store"

export const runtime = "nodejs"

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const url = new URL(request.url)
  const format = url.searchParams.get("format") ?? "json"
  const run = await getRunDetail(id)

  if (!run) {
    return NextResponse.json({ error: "Run not found" }, { status: 404 })
  }

  const payload = {
    run: {
      id: run.id,
      name: run.name,
      strategy: run.strategy,
      modelIds: run.modelIds,
      createdAt: run.createdAt,
      completedAt: run.completedAt,
    },
    summary: run.summary
      ? {
          mosaicScore: run.summary.mosaicScore,
          deltaUplift: run.summary.deltaUplift,
          estimatedCostUsd: run.summary.estimatedCostUsd ?? 0,
        }
      : null,
    steps: run.steps.map((step) => ({
      taskId: step.taskId,
      taskTitle: step.task.title,
      stepIndex: step.stepIndex,
      modelUsed: step.score?.bestModelId ?? null,
      responses: step.modelResponses.map((response) => ({
        modelId: response.modelId,
        content: response.content,
        refusalClass: response.refusalClass,
        score: step.score?.bestScore ?? 0,
      })),
      bestScore: step.score?.bestScore ?? 0,
      bestModelId: step.score?.bestModelId ?? null,
      consistencyScore: step.score?.consistencyScore ?? 0,
    })),
  }

  if (format === "csv") {
    const rows = [
      ["taskId", "taskTitle", "stepIndex", "bestModelId", "bestScore", "consistencyScore"],
      ...payload.steps.map((step) => [
        step.taskId,
        step.taskTitle,
        String(step.stepIndex),
        step.bestModelId ?? "",
        String(step.bestScore),
        String(step.consistencyScore),
      ]),
    ]
    const csv = rows.map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(",")).join("\n")
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="run-${id}-results.csv"`,
      },
    })
  }

  return NextResponse.json(payload, {
    headers: {
      "Content-Disposition": `attachment; filename="run-${id}-results.json"`,
    },
  })
}

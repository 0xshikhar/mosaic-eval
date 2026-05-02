import { NextResponse } from "next/server"
import { EvalTaskSchema } from "@/app/tasks/schema"
import { ensureSeedTasks, listTasks, taskInputToView } from "@/app/tasks/service"
import { upsertTask } from "@/app/db/store"

export const runtime = "nodejs"

export async function GET(request: Request) {
  await ensureSeedTasks()
  const url = new URL(request.url)
  const category = url.searchParams.get("category")
  const difficulty = url.searchParams.get("difficulty")

  const tasks = await listTasks()
  const filtered = tasks.filter((task) => {
    if (category && task.category !== category) return false
    if (difficulty && task.difficulty !== Number(difficulty)) return false
    return true
  })

  return NextResponse.json({
    tasks: filtered.map((task) => ({
      id: task.id,
      title: task.title,
      category: task.category,
      difficulty: task.difficulty,
      tags: task.tags,
      stepCount: task.steps.length,
      source: task.source ?? null,
    })),
    total: filtered.length,
  })
}

export async function POST(request: Request) {
  try {
    const body = EvalTaskSchema.parse(await request.json())
    await upsertTask(taskInputToView(body))
    return NextResponse.json({
      success: true,
      taskId: body.id,
    })
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to save task",
      },
      { status: 400 },
    )
  }
}

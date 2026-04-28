import { NextResponse } from "next/server"
import { ensureSeedTasks, listTasks } from "@/app/tasks/service"

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

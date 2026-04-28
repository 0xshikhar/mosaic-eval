import { NextResponse } from "next/server"
import { getTaskById } from "@/app/tasks/service"

export const runtime = "nodejs"

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const task = await getTaskById(id)

  if (!task) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 })
  }

  return NextResponse.json({ task })
}


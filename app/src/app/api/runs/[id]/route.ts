import { NextResponse } from "next/server"
import { getRunDetail, updateRun } from "@/app/db/store"

export const runtime = "nodejs"

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const run = await getRunDetail(id)

  if (!run) {
    return NextResponse.json({ error: "Run not found" }, { status: 404 })
  }

  return NextResponse.json({ run })
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  await updateRun(id, { status: "CANCELLED", completedAt: new Date().toISOString() })

  return NextResponse.json({ success: true })
}

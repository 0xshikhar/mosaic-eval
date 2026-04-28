import { NextResponse } from "next/server"
import { listAuditLogs } from "@/app/db/store"

export const runtime = "nodejs"

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const logs = await listAuditLogs(id)

  return NextResponse.json({
    events: logs.map((log) => ({
      id: log.id,
      type: log.type,
      message: log.message,
      metadata: log.metadata ? JSON.parse(log.metadata) : {},
      createdAt: log.createdAt,
    })),
  })
}

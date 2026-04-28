import { NextResponse } from "next/server"
import { listAdapters } from "@/app/orchestrator/adapters"

export const runtime = "nodejs"

export async function GET() {
  return NextResponse.json({
    models: listAdapters(),
  })
}


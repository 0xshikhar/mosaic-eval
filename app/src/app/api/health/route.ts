import { NextResponse } from "next/server"

export const runtime = "nodejs"

export async function GET() {
  return NextResponse.json({
    status: "ok",
    service: "mosaic-eval-harness",
    timestamp: new Date().toISOString(),
  })
}


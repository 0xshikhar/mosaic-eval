import { z } from "zod"
import { NextResponse } from "next/server"
import { importTasksFromJsonl } from "@/app/tasks/service"

export const runtime = "nodejs"

const BodySchema = z.object({
  jsonl: z.string().min(1),
  overwrite: z.boolean().optional().default(false),
})

export async function POST(request: Request) {
  try {
    const body = BodySchema.parse(await request.json())
    const result = await importTasksFromJsonl(body.jsonl, body.overwrite)
    return NextResponse.json(result)
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to import tasks",
      },
      { status: 400 },
    )
  }
}


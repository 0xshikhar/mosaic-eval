import { NextResponse } from "next/server"
import { streamRunEvents } from "@/app/orchestrator/events"

export const runtime = "nodejs"

function toSseChunk(data: unknown) {
  return `data: ${JSON.stringify(data)}\n\n`
}

export async function GET(request: Request) {
  const url = new URL(request.url)
  const runId = url.searchParams.get("runId")

  if (!runId) {
    return NextResponse.json({ error: "runId is required" }, { status: 400 })
  }

  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      controller.enqueue(encoder.encode(toSseChunk({ type: "connected", runId })))

      try {
        for await (const event of streamRunEvents(runId)) {
          controller.enqueue(encoder.encode(toSseChunk(event)))
        }
      } catch (error) {
        controller.enqueue(
          encoder.encode(
            toSseChunk({
              type: "run_error",
              runId,
              message: error instanceof Error ? error.message : "Stream failed",
            }),
          ),
        )
      } finally {
        controller.close()
      }
    },
    cancel() {
      // No-op. The event stream is in-memory and will stop when the iterator ends.
    },
  })

  return new NextResponse(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  })
}


"use client"

import { useEffect, useMemo, useState } from "react"
import { RadioTower } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { formatRelativeTime } from "@/app/lib/format"

type RunLog = {
  id: string
  type: string
  message: string
  metadata: Record<string, unknown> | null
  createdAt: string
}

export function LiveRunFeed({
  runId,
  initialEvents,
}: {
  runId: string
  initialEvents: RunLog[]
}) {
  const [events, setEvents] = useState(initialEvents)

  useEffect(() => {
    const source = new EventSource(`/api/runs/stream?runId=${runId}`)

    source.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data) as { type?: string; message?: string; runId?: string; createdAt?: string; metadata?: Record<string, unknown> }
        const eventType = payload.type
        if (!eventType || eventType === "connected") return

        setEvents((current) => [
          ...current,
          {
            id: `${eventType}-${Date.now()}-${Math.random().toString(16).slice(2)}`,
            type: eventType,
            message: payload.message ?? eventType,
            metadata: payload.metadata ?? null,
            createdAt: payload.createdAt ?? new Date().toISOString(),
          },
        ])
      } catch {
        // Ignore malformed SSE chunks.
      }
    }

    source.onerror = () => {
      source.close()
    }

    return () => source.close()
  }, [runId])

  const latestEvents = useMemo(() => events.slice(-8).reverse(), [events])

  return (
    <Card className="border-white/10 bg-white/5 shadow-[0_20px_80px_rgba(2,6,23,0.22)] backdrop-blur-xl">
      <CardHeader className="space-y-2">
        <CardTitle className="flex items-center gap-2 text-white">
          <RadioTower className="size-4 text-emerald-300" />
          Run activity
        </CardTitle>
        <CardDescription className="text-zinc-400">
          SSE-backed event stream with persisted audit logs underneath.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3">
        {latestEvents.length === 0 ? (
          <div className="rounded-xl border border-dashed border-white/10 bg-black/20 p-4 text-sm text-zinc-400">
            Waiting for activity.
          </div>
        ) : (
          latestEvents.map((event) => (
            <div key={event.id} className="rounded-xl border border-white/10 bg-black/20 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <Badge variant="outline" className="border-white/10 bg-white/5 text-zinc-200">
                  {event.type}
                </Badge>
                <span className="text-xs text-zinc-500">{formatRelativeTime(event.createdAt)}</span>
              </div>
              <p className="mt-2 text-sm text-zinc-200">{event.message}</p>
              {event.metadata ? (
                <pre className="mt-3 overflow-x-auto rounded-lg bg-black/40 p-3 text-xs text-zinc-300">
                  {JSON.stringify(event.metadata, null, 2)}
                </pre>
              ) : null}
            </div>
          ))
        )}
      </CardContent>
    </Card>
  )
}

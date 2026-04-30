"use client"

import { useEffect, useMemo, useState } from "react"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { formatRelativeTime } from "@/app/lib/format"

type StepResponse = {
  modelId: string
  refusalClass: string
  content: string
  isSynthesized?: boolean
}

type StepRow = {
  id: string
  taskId: string
  taskTitle: string
  stepIndex: number
  prompt: string
  bestModelId: string | null
  bestScore: number | null
  refusalClass: string | null
  consistencyScore: number | null
  modelResponses: StepResponse[]
  status: "complete" | "running"
}

type LiveEvent = {
  id: string
  type: string
  message: string
  createdAt: string
  metadata?: Record<string, unknown> | null
}

function responseCountLabel(count: number) {
  return `${count} response${count === 1 ? "" : "s"}`
}

function upsertStep(rows: StepRow[], patch: Partial<StepRow> & { id: string }) {
  const index = rows.findIndex((row) => row.id === patch.id)
  if (index === -1) {
    return [patch as StepRow, ...rows].sort((left, right) => left.stepIndex - right.stepIndex)
  }

  const next = [...rows]
  next[index] = { ...next[index], ...patch }
  return next
}

export function LiveStepLog({
  runId,
  initialSteps,
}: {
  runId: string
  initialSteps: StepRow[]
}) {
  const [rows, setRows] = useState<StepRow[]>(initialSteps)
  const [events, setEvents] = useState<LiveEvent[]>([])

  useEffect(() => {
    const source = new EventSource(`/api/runs/stream?runId=${runId}`)

    source.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data) as
          | { type?: string; message?: string; createdAt?: string; metadata?: Record<string, unknown> }
          | null

        if (!payload?.type || payload.type === "connected") return

        const nextEvent: LiveEvent = {
          id: `${payload.type}-${Date.now()}-${Math.random().toString(16).slice(2)}`,
          type: payload.type,
          message: payload.message ?? payload.type,
          createdAt: payload.createdAt ?? new Date().toISOString(),
          metadata: payload.metadata ?? null,
        }

        setEvents((current) => [...current.slice(-5), nextEvent])

        if (payload.type === "step_dispatched" || payload.type === "step_complete") {
          const metadata = payload.metadata ?? {}
          const stepId = String(metadata.stepId ?? "")
          const taskTitle = String(metadata.taskTitle ?? stepId)
          const taskId = String(metadata.taskId ?? stepId)
          const stepIndex = Number(metadata.stepIndex ?? 0)
          const bestModelId = metadata.bestModelId ? String(metadata.bestModelId) : null
          const bestScore = typeof metadata.bestScore === "number" ? metadata.bestScore : null
          const refusalClass = metadata.refusalClass ? String(metadata.refusalClass) : null
          const modelIds = Array.isArray(metadata.modelIds) ? metadata.modelIds.map((modelId) => String(modelId)) : []

          setRows((current) =>
            upsertStep(current, {
              id: stepId,
              taskId,
              taskTitle,
              stepIndex,
              prompt: String(metadata.prompt ?? "Step in flight"),
              bestModelId,
              bestScore,
              refusalClass,
              consistencyScore: null,
              modelResponses: modelIds.map((modelId) => ({
                modelId,
                refusalClass: "n/a",
                content: "",
              })),
              status: payload.type === "step_complete" ? "complete" : "running",
            }),
          )
        }
      } catch {
        // Ignore malformed SSE payloads.
      }
    }

    source.onerror = () => {
      source.close()
    }

    return () => source.close()
  }, [runId])

  const latestEvent = events[events.length - 1]
  const completedCount = useMemo(() => rows.filter((row) => row.status === "complete").length, [rows])
  const progress = rows.length > 0 ? Math.min(100, Math.round((completedCount / rows.length) * 100)) : 0

  return (
    <Card className="border-white/10 bg-white/5 shadow-[0_20px_80px_rgba(2,6,23,0.22)] backdrop-blur-xl">
      <CardHeader className="space-y-2">
        <CardTitle className="text-white">Live step log</CardTitle>
        <CardDescription className="text-zinc-400">
          SSE-driven step updates with persisted rows underneath.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div className="grid gap-2">
          <div className="flex items-center justify-between text-xs uppercase tracking-[0.18em] text-zinc-500">
            <span>{responseCountLabel(rows.length)}</span>
            <span>{completedCount} complete</span>
          </div>
          <Progress value={progress} className="bg-white/10" />
        </div>

        {latestEvent ? (
          <div className="rounded-xl border border-white/10 bg-black/20 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <Badge variant="outline" className="border-white/10 bg-white/5 text-zinc-200">
                {latestEvent.type}
              </Badge>
              <span className="text-xs text-zinc-500">{formatRelativeTime(latestEvent.createdAt)}</span>
            </div>
            <p className="mt-2 text-sm text-zinc-200">{latestEvent.message}</p>
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-white/10 bg-black/20 p-4 text-sm text-zinc-400">
            Waiting for the first live event.
          </div>
        )}

        <div className="overflow-hidden rounded-xl border border-white/10">
          <div className="max-h-[34rem] overflow-auto">
            <table className="w-full border-collapse text-sm">
              <thead className="sticky top-0 bg-black/80 text-left text-xs uppercase tracking-[0.18em] text-zinc-500 backdrop-blur">
                <tr>
                  <th className="px-4 py-3">Step</th>
                  <th className="px-4 py-3">Task</th>
                  <th className="px-4 py-3">Best model</th>
                  <th className="px-4 py-3">Refusal</th>
                  <th className="px-4 py-3">Score</th>
                  <th className="px-4 py-3">Responses</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-zinc-500">
                      No completed steps yet.
                    </td>
                  </tr>
                ) : (
                  rows.map((row) => (
                    <tr
                      key={row.id}
                      className={`border-t border-white/10 ${
                        row.status === "running" ? "bg-cyan-400/5" : "bg-transparent"
                      }`}
                    >
                      <td className="px-4 py-4 align-top text-zinc-300">
                        <div className="font-medium text-white">#{row.stepIndex + 1}</div>
                        <div className="text-xs text-zinc-500">{row.id}</div>
                      </td>
                      <td className="px-4 py-4 align-top text-zinc-300">
                        <div className="font-medium text-white">{row.taskTitle}</div>
                        <div className="mt-1 line-clamp-2 text-sm text-zinc-400">{row.prompt}</div>
                      </td>
                      <td className="px-4 py-4 align-top text-zinc-300">{row.bestModelId ?? "n/a"}</td>
                      <td className="px-4 py-4 align-top text-zinc-300">{row.refusalClass ?? "n/a"}</td>
                      <td className="px-4 py-4 align-top text-zinc-300">
                        {row.bestScore == null ? "n/a" : row.bestScore.toFixed(1)}
                      </td>
                      <td className="px-4 py-4 align-top text-zinc-300">
                        <div className="flex flex-wrap gap-2">
                          {row.modelResponses.map((response) => (
                            <Badge
                              key={`${row.id}-${response.modelId}`}
                              variant="outline"
                              className={`border-white/10 bg-white/5 text-zinc-200 ${
                                response.isSynthesized ? "border-emerald-400/30 text-emerald-100" : ""
                              }`}
                            >
                              {response.modelId}
                            </Badge>
                          ))}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

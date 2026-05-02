"use client"

import { useEffect, useState } from "react"

import { Badge } from "@/components/ui/badge"
import { Card, CardHeader, CardDescription, CardTitle } from "@/components/ui/card"
import { formatTimestamp } from "@/app/lib/format"

type RunStatus = "PENDING" | "RUNNING" | "COMPLETE" | "FAILED" | "CANCELLED"

function statusTone(status: RunStatus) {
  if (status === "COMPLETE") return "bg-emerald-400/15 text-emerald-200"
  if (status === "RUNNING") return "bg-cyan-400/15 text-cyan-200"
  if (status === "FAILED") return "bg-red-400/15 text-red-200"
  if (status === "CANCELLED") return "bg-amber-400/15 text-amber-200"
  return "bg-white/10 text-zinc-200"
}

function isTerminal(status: RunStatus) {
  return status === "COMPLETE" || status === "FAILED" || status === "CANCELLED"
}

export function RunStatusCard({
  runId,
  initialStatus,
  initialErrorMessage,
  initialCompletedAt,
  createdAt,
}: {
  runId: string
  initialStatus: RunStatus
  initialErrorMessage: string | null
  initialCompletedAt: string | null
  createdAt: string
}) {
  const [status, setStatus] = useState<RunStatus>(initialStatus)
  const [errorMessage, setErrorMessage] = useState<string | null>(initialErrorMessage)
  const [completedAt, setCompletedAt] = useState<string | null>(initialCompletedAt)
  const [lastSyncedAt, setLastSyncedAt] = useState<string>(createdAt)

  useEffect(() => {
    let cancelled = false

    async function syncRun() {
      try {
        const response = await fetch(`/api/runs/${runId}`, {
          cache: "no-store",
        })

        if (!response.ok) {
          return null
        }

        const payload = (await response.json()) as {
          run?: {
            status?: string
            errorMessage?: string | null
            completedAt?: string | null
          }
        }

        const nextRun = payload.run
        const nextStatus = nextRun?.status
        if (!nextRun || !nextStatus || cancelled) {
          return null
        }

        setStatus(nextStatus as RunStatus)
        setErrorMessage(nextRun.errorMessage ?? null)
        setCompletedAt(nextRun.completedAt ?? null)
        setLastSyncedAt(new Date().toISOString())

        return nextStatus as RunStatus
      } catch {
        return null
      }
    }

    if (isTerminal(initialStatus)) {
      void syncRun()
      return () => {
        cancelled = true
      }
    }

    void syncRun()
    const interval = window.setInterval(async () => {
      const nextStatus = await syncRun()
      if (nextStatus && isTerminal(nextStatus)) {
        window.clearInterval(interval)
      }
    }, 5_000)

    return () => {
      cancelled = true
      window.clearInterval(interval)
    }
  }, [createdAt, initialStatus, runId])

  return (
    <Card className="border-white/10 bg-white/5 backdrop-blur-xl">
      <CardHeader>
        <CardDescription className="text-zinc-400">Status</CardDescription>
        <CardTitle className="text-white">
          <Badge variant="outline" className={statusTone(status)}>
            {status}
          </Badge>
        </CardTitle>
        <div className="space-y-1 pt-2 text-sm text-zinc-300">
          <div>
            Created {formatTimestamp(createdAt)}
          </div>
          {status === "COMPLETE" && completedAt ? <div>Completed {formatTimestamp(completedAt)}</div> : null}
          {status === "FAILED" || status === "CANCELLED" ? (
            <div className="text-red-200">
              {errorMessage ?? "The run stopped before completion."}
            </div>
          ) : null}
          <div className="text-xs text-zinc-500">Last synced {formatTimestamp(lastSyncedAt)}</div>
        </div>
      </CardHeader>
    </Card>
  )
}

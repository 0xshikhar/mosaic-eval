import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { formatRelativeTime } from "@/app/lib/format"
import { ResumeRunButton } from "@/app/components/resume-run-button"

type RunCheckpoint = {
  lastCompletedStepIndex: number
  state: string
  updatedAt: string
} | null

export function RunCheckpointBanner({
  checkpoint,
  runId,
  status,
}: {
  checkpoint: RunCheckpoint
  runId: string
  status: string
}) {
  const isRestartable = status === "FAILED" || status === "CANCELLED"

  return (
    <Card className="border-white/10 bg-white/5 shadow-[0_20px_80px_rgba(2,6,23,0.2)] backdrop-blur-xl">
      <CardContent className="flex flex-col gap-3 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-sm font-medium text-white">Checkpoint state</div>
            <p className="mt-1 text-sm text-zinc-400">
              The current run persists checkpoints after each completed step.
            </p>
          </div>
          <Badge variant="outline" className="border-white/10 bg-white/5 text-zinc-200">
            {status}
          </Badge>
        </div>

        <div className="grid gap-2 text-sm text-zinc-300 md:grid-cols-3">
          <div className="rounded-xl border border-white/10 bg-black/20 p-3">
            <div className="text-xs uppercase tracking-[0.18em] text-zinc-500">Checkpoint</div>
            <div className="mt-1 text-white">
              {checkpoint ? `Completed step ${checkpoint.lastCompletedStepIndex + 1}` : "No checkpoint yet"}
            </div>
          </div>
          <div className="rounded-xl border border-white/10 bg-black/20 p-3">
            <div className="text-xs uppercase tracking-[0.18em] text-zinc-500">State</div>
            <div className="mt-1 text-white">{checkpoint?.state ?? "Not initialized"}</div>
          </div>
          <div className="rounded-xl border border-white/10 bg-black/20 p-3">
            <div className="text-xs uppercase tracking-[0.18em] text-zinc-500">Updated</div>
            <div className="mt-1 text-white">
              {checkpoint ? formatRelativeTime(checkpoint.updatedAt) : "Waiting for first step"}
            </div>
          </div>
        </div>

        {isRestartable ? (
          <div className="flex items-center justify-between gap-3 rounded-xl border border-amber-400/20 bg-amber-400/10 p-3">
            <div className="text-sm text-amber-100">
              This run can be resumed from the latest persisted checkpoint.
            </div>
            <ResumeRunButton runId={runId} />
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}

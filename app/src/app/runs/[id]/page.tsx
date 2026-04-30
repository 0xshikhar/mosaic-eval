import Link from "next/link"
import { ArrowLeft, Download } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { SiteShell } from "@/app/components/site-shell"
import { LiveRunFeed } from "@/app/components/live-run-feed"
import { ResumeRunButton } from "@/app/components/resume-run-button"
import { getRunDetail } from "@/app/db/store"
import { formatCurrency, formatInteger, formatRelativeTime, formatTimestamp, titleCase } from "@/app/lib/format"

function statusTone(status: string) {
  if (status === "COMPLETE") return "bg-emerald-400/15 text-emerald-200"
  if (status === "RUNNING") return "bg-cyan-400/15 text-cyan-200"
  if (status === "FAILED") return "bg-red-400/15 text-red-200"
  if (status === "CANCELLED") return "bg-amber-400/15 text-amber-200"
  return "bg-white/10 text-zinc-200"
}

export default async function RunDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const run = await getRunDetail(id)

  if (!run) {
    return (
      <SiteShell title="Run not found" description="The requested run does not exist or has been deleted.">
        <Card className="border-white/10 bg-white/5 backdrop-blur-xl">
          <CardContent className="p-6">
            <Button asChild variant="outline" className="border-white/15 bg-white/5 text-white hover:bg-white/10">
              <Link href="/runs">
                <ArrowLeft className="size-4" />
                Back to runs
              </Link>
            </Button>
          </CardContent>
        </Card>
      </SiteShell>
    )
  }

  const checkpoints = run.checkpoints
  const summary = run.summary

  return (
    <SiteShell
      title={run.name}
      description={`Strategy ${titleCase(run.strategy)} · Started ${formatRelativeTime(run.createdAt)}`}
      actions={
        <>
          <Button asChild variant="outline" className="border-white/15 bg-white/5 text-white hover:bg-white/10">
            <Link href="/runs">
              <ArrowLeft className="size-4" />
              Back
            </Link>
          </Button>
          <Button asChild variant="outline" className="border-white/15 bg-white/5 text-white hover:bg-white/10">
            <Link href={`/runs/${run.id}/results`}>
              <Download className="size-4" />
              Results
            </Link>
          </Button>
          {run.status === "FAILED" || run.status === "CANCELLED" ? <ResumeRunButton runId={run.id} /> : null}
        </>
      }
    >
      <div className="grid gap-6">
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Card className="border-white/10 bg-white/5 backdrop-blur-xl">
            <CardHeader>
              <CardDescription className="text-zinc-400">Status</CardDescription>
              <CardTitle className="text-white">
                <Badge variant="outline" className={statusTone(run.status)}>
                  {run.status}
                </Badge>
              </CardTitle>
            </CardHeader>
          </Card>
          <Card className="border-white/10 bg-white/5 backdrop-blur-xl">
            <CardHeader>
              <CardDescription className="text-zinc-400">Mosaic score</CardDescription>
              <CardTitle className="text-white">{summary ? summary.mosaicScore.toFixed(1) : "n/a"}</CardTitle>
            </CardHeader>
          </Card>
          <Card className="border-white/10 bg-white/5 backdrop-blur-xl">
            <CardHeader>
              <CardDescription className="text-zinc-400">Delta uplift</CardDescription>
              <CardTitle className="text-white">{summary ? summary.deltaUplift.toFixed(1) : "n/a"}</CardTitle>
            </CardHeader>
          </Card>
          <Card className="border-white/10 bg-white/5 backdrop-blur-xl">
            <CardHeader>
              <CardDescription className="text-zinc-400">Cost</CardDescription>
              <CardTitle className="text-white">
                {summary ? formatCurrency(summary.estimatedCostUsd ?? 0) : "n/a"}
              </CardTitle>
            </CardHeader>
          </Card>
        </section>

        <section className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
          <Card className="border-white/10 bg-white/5 shadow-[0_20px_80px_rgba(2,6,23,0.28)] backdrop-blur-xl">
            <CardHeader className="space-y-2">
              <CardTitle className="text-white">Run details</CardTitle>
              <CardDescription className="text-zinc-400">
                Persistent metadata for the current orchestration session.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 text-sm text-zinc-300">
              <div className="rounded-xl border border-white/10 bg-black/20 p-4">
                <div className="text-zinc-500">Run ID</div>
                <div className="mt-1 font-mono text-xs text-zinc-100">{run.id}</div>
              </div>
              <div className="rounded-xl border border-white/10 bg-black/20 p-4">
                <div className="text-zinc-500">Models</div>
                  <div className="mt-1">{run.modelIds.join(", ")}</div>
              </div>
              <div className="rounded-xl border border-white/10 bg-black/20 p-4">
                <div className="text-zinc-500">Checkpoint</div>
                <div className="mt-1">
                  {checkpoints ? `Completed step ${checkpoints.lastCompletedStepIndex + 1}` : "No checkpoint yet"}
                </div>
              </div>
              <div className="rounded-xl border border-white/10 bg-black/20 p-4">
                <div className="text-zinc-500">Timing</div>
                <div className="mt-1">
                  Created {formatTimestamp(run.createdAt)}
                  {run.completedAt ? <span className="block">Completed {formatTimestamp(run.completedAt)}</span> : null}
                </div>
              </div>
            </CardContent>
          </Card>

          <LiveRunFeed
            runId={run.id}
            initialEvents={run.auditLogs.map((log) => ({
              id: log.id,
              type: log.type,
              message: log.message,
              metadata: log.metadata ? JSON.parse(log.metadata) : {},
              createdAt: log.createdAt,
            }))}
          />
        </section>

        <Card className="border-white/10 bg-white/5 shadow-[0_20px_80px_rgba(2,6,23,0.28)] backdrop-blur-xl">
          <CardHeader className="space-y-2">
            <CardTitle className="text-white">Task execution</CardTitle>
            <CardDescription className="text-zinc-400">
              Step-by-step completion data with the selected best response per step.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3">
            {run.steps.map((step) => (
              <div key={step.id} className="rounded-xl border border-white/10 bg-black/20 p-4">
                <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <div className="font-medium text-white">{step.task.title}</div>
                    <div className="mt-1 text-sm text-zinc-400">{step.taskStep.prompt}</div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="secondary" className="bg-white/10 text-zinc-100">
                      Score {step.score?.bestScore ?? 0}
                    </Badge>
                    <Badge variant="outline" className="border-white/10 bg-white/5 text-zinc-200">
                      {step.score?.bestModelId ?? "n/a"}
                    </Badge>
                  </div>
                </div>
                <div className="mt-3 grid gap-2 md:grid-cols-2">
                  {step.modelResponses.map((response) => (
                    <div key={response.id} className="rounded-lg border border-white/10 bg-white/5 p-3">
                      <div className="flex flex-wrap items-center justify-between gap-2 text-xs uppercase tracking-[0.2em] text-zinc-500">
                        <span>{response.modelId}</span>
                        <span>{response.refusalClass}</span>
                      </div>
                      <p className="mt-2 line-clamp-4 text-sm text-zinc-200">{response.content}</p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {summary ? (
          <Card className="border-white/10 bg-white/5 shadow-[0_20px_80px_rgba(2,6,23,0.28)] backdrop-blur-xl">
            <CardHeader className="space-y-2">
              <CardTitle className="text-white">Summary breakdown</CardTitle>
              <CardDescription className="text-zinc-400">
                Aggregated summary metrics generated after the run completed.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-3">
              <div className="rounded-xl border border-white/10 bg-black/20 p-4">
                <div className="text-sm text-zinc-400">Per-model scores</div>
                <div className="mt-2 space-y-2 text-sm text-zinc-100">
                  {Object.entries(summary.perModelScores).map(([modelId, score]) => (
                    <div key={modelId} className="flex items-center justify-between gap-2">
                      <span>{modelId}</span>
                      <span>{score.toFixed(1)}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="rounded-xl border border-white/10 bg-black/20 p-4">
                <div className="text-sm text-zinc-400">By category</div>
                <div className="mt-2 space-y-2 text-sm text-zinc-100">
                  {Object.entries(summary.upliftByCategory).map(([category, score]) => (
                    <div key={category} className="flex items-center justify-between gap-2">
                      <span>{category.replaceAll("_", " ")}</span>
                      <span>{score.toFixed(1)}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="rounded-xl border border-white/10 bg-black/20 p-4">
                <div className="text-sm text-zinc-400">Refusal breakdown</div>
                <div className="mt-2 space-y-2 text-sm text-zinc-100">
                  {Object.entries(summary.refusalBreakdown).map(([modelId, count]) => (
                    <div key={modelId} className="flex items-center justify-between gap-2">
                      <span>{modelId}</span>
                      <span>{formatInteger(count)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        ) : null}
      </div>
    </SiteShell>
  )
}

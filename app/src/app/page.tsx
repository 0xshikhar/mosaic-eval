import Link from "next/link"
import { ArrowRight, DatabaseZap, FileStack, FolderKanban, Radar } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { MetricCard } from "@/app/components/metric-card"
import { SiteShell } from "@/app/components/site-shell"
import { formatCurrency, formatInteger, formatRelativeTime, titleCase } from "@/app/lib/format"
import { getDashboardSnapshot } from "@/app/analysis/report"

function statusTone(status: string) {
  if (status === "COMPLETE") return "bg-emerald-400/15 text-emerald-200"
  if (status === "RUNNING") return "bg-cyan-400/15 text-cyan-200"
  if (status === "FAILED") return "bg-red-400/15 text-red-200"
  if (status === "CANCELLED") return "bg-amber-400/15 text-amber-200"
  return "bg-white/10 text-zinc-200"
}

export default async function Home() {
  const snapshot = await getDashboardSnapshot()

  const completedRuns = snapshot.runs.filter((run) => run.status === "COMPLETE").length
  const runningRuns = snapshot.runs.filter((run) => run.status === "RUNNING").length

  return (
    <SiteShell
      title="Research dashboard"
      description="A local-first evaluation harness for proxy-task runs, checkpointed execution, and analysis snapshots."
      actions={
        <>
          <Button asChild className="bg-white text-slate-950 hover:bg-white/90">
            <Link href="/runs/new">
              <Radar className="size-4" />
              Launch run
            </Link>
          </Button>
          <Button asChild variant="outline" className="border-white/15 bg-white/5 text-white hover:bg-white/10">
            <Link href="/tasks">
              <FileStack className="size-4" />
              Task library
            </Link>
          </Button>
        </>
      }
    >
      <div className="grid gap-6">
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            label="Task fixtures"
            value={formatInteger(snapshot.metrics.totalTasks)}
            note="Seeded proxy tasks available for launch."
          />
          <MetricCard
            label="Recent runs"
            value={formatInteger(snapshot.metrics.totalRuns)}
            note={`${formatInteger(completedRuns)} complete, ${formatInteger(runningRuns)} running.`}
            accent="from-cyan-400/15 to-sky-400/10"
          />
          <MetricCard
            label="Audit events"
            value={formatInteger(snapshot.metrics.auditEvents)}
            note="Persisted run activity and checkpoints."
            accent="from-fuchsia-400/15 to-rose-400/10"
          />
          <MetricCard
            label="Research budget"
            value={formatCurrency(
              snapshot.runs.reduce((sum, run) => sum + (run.summary?.estimatedCostUsd ?? 0), 0),
            )}
            note="Accumulated cost across completed runs."
            accent="from-amber-400/15 to-orange-400/10"
          />
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <Card className="border-white/10 bg-white/5 shadow-[0_20px_80px_rgba(2,6,23,0.28)] backdrop-blur-xl">
            <CardHeader className="space-y-2">
              <CardTitle className="text-white">Recent runs</CardTitle>
              <CardDescription className="text-zinc-400">
                Most recent orchestration sessions with summaries, scores, and costs.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-hidden rounded-xl border border-white/10">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-black/20 hover:bg-black/20">
                      <TableHead>Name</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Strategy</TableHead>
                      <TableHead>Score</TableHead>
                      <TableHead>Delta</TableHead>
                      <TableHead>Updated</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {snapshot.runs.map((run) => (
                      <TableRow key={run.id} className="border-white/10 hover:bg-white/5">
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            <Link href={`/runs/${run.id}`} className="font-medium text-white hover:underline">
                              {run.name}
                            </Link>
                            <div className="text-xs text-zinc-500">{run.id}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={statusTone(run.status)}>
                            {run.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-zinc-300">{titleCase(run.strategy)}</TableCell>
                        <TableCell className="text-zinc-300">
                          {run.summary ? run.summary.mosaicScore.toFixed(1) : "n/a"}
                        </TableCell>
                        <TableCell className="text-zinc-300">
                          {run.summary ? `${run.summary.deltaUplift.toFixed(1)}` : "n/a"}
                        </TableCell>
                        <TableCell className="text-zinc-400">
                          {formatRelativeTime(run.completedAt ?? run.createdAt)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          <Card className="border-white/10 bg-gradient-to-br from-emerald-400/10 via-cyan-400/10 to-transparent shadow-[0_20px_80px_rgba(2,6,23,0.28)] backdrop-blur-xl">
            <CardHeader className="space-y-2">
              <CardTitle className="flex items-center gap-2 text-white">
                <DatabaseZap className="size-4 text-emerald-300" />
                Architecture snapshot
              </CardTitle>
              <CardDescription className="text-zinc-300">
                The MVP is intentionally compact: routes, orchestrator, evaluation, and SQLite all live in the app.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 text-sm text-zinc-200">
              <div className="rounded-xl border border-white/10 bg-black/20 p-4">
                <div className="font-medium text-white">Route layout</div>
                <p className="mt-1 text-zinc-400">
                  App-local components live in `app/src/app/components`, while the routes stay thin and server-driven.
                </p>
              </div>
              <div className="rounded-xl border border-white/10 bg-black/20 p-4">
                <div className="font-medium text-white">Data path</div>
                <p className="mt-1 text-zinc-400">
                  Drizzle writes to local SQLite for the MVP, so setup stays fast and reproducible.
                </p>
              </div>
              <div className="rounded-xl border border-white/10 bg-black/20 p-4">
                <div className="font-medium text-white">Next step</div>
                <p className="mt-1 text-zinc-400">
                  Queue a run, inspect the live audit trail, then review step-level results and exports.
                </p>
              </div>
            </CardContent>
          </Card>
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
          <Card className="border-white/10 bg-white/5 shadow-[0_20px_80px_rgba(2,6,23,0.28)] backdrop-blur-xl">
            <CardHeader className="space-y-2">
              <CardTitle className="flex items-center gap-2 text-white">
                <FolderKanban className="size-4 text-cyan-300" />
                Task library
              </CardTitle>
              <CardDescription className="text-zinc-400">
                Seed tasks and calibration fixtures that feed the evaluation pipeline.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3">
              {snapshot.tasks.map((task) => (
                <div key={task.id} className="rounded-xl border border-white/10 bg-black/20 p-4">
                  <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <div className="text-base font-medium text-white">{task.title}</div>
                      <div className="mt-1 flex flex-wrap gap-2 text-xs uppercase tracking-[0.18em] text-zinc-500">
                        <span>{task.category.replaceAll("_", " ")}</span>
                        <span>Difficulty {task.difficulty}</span>
                        <span>{task.steps.length} steps</span>
                      </div>
                    </div>
                    <Badge variant="outline" className="border-white/10 bg-white/5 text-zinc-200">
                      {task.source ?? "seeded"}
                    </Badge>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {task.tags.map((tag) => (
                      <Badge key={tag} variant="secondary" className="bg-white/10 text-zinc-100">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="border-white/10 bg-white/5 shadow-[0_20px_80px_rgba(2,6,23,0.28)] backdrop-blur-xl">
            <CardHeader className="space-y-2">
              <CardTitle className="flex items-center gap-2 text-white">
                <ArrowRight className="size-4 text-emerald-300" />
                What to do next
              </CardTitle>
              <CardDescription className="text-zinc-400">
                A short operational checklist for the current MVP.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 text-sm text-zinc-300">
              <div className="rounded-xl border border-white/10 bg-black/20 p-4">
                Launch a mixed-model run from the dashboard and verify checkpoint persistence.
              </div>
              <div className="rounded-xl border border-white/10 bg-black/20 p-4">
                Inspect the run detail page for the audit stream and task-by-task activity.
              </div>
              <div className="rounded-xl border border-white/10 bg-black/20 p-4">
                Export results as JSON or CSV and compare the summary against the per-step breakdown.
              </div>
            </CardContent>
          </Card>
        </section>
      </div>
    </SiteShell>
  )
}

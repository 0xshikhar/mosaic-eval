import Link from "next/link"
import { ArrowRight, Play, Rocket } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { SiteShell } from "@/app/components/site-shell"
import { listRunRows } from "@/app/db/store"
import { formatRelativeTime } from "@/app/lib/format"
import { titleCase } from "@/app/lib/format"

function statusTone(status: string) {
  if (status === "COMPLETE") return "bg-emerald-400/15 text-emerald-200"
  if (status === "RUNNING") return "bg-cyan-400/15 text-cyan-200"
  if (status === "FAILED") return "bg-red-400/15 text-red-200"
  if (status === "CANCELLED") return "bg-amber-400/15 text-amber-200"
  return "bg-white/10 text-zinc-200"
}

export default async function RunsPage() {
  const rows = await listRunRows(25)

  return (
    <SiteShell
      title="Runs"
      description="Queue, inspect, and compare model routing experiments."
      actions={
        <Button asChild className="bg-white text-slate-950 hover:bg-white/90">
          <Link href="/runs/new">
            <Play className="size-4" />
            New run
          </Link>
        </Button>
      }
    >
      <div className="grid gap-6">
        <Card className="border-white/10 bg-white/5 shadow-[0_20px_80px_rgba(2,6,23,0.28)] backdrop-blur-xl">
          <CardHeader className="space-y-2">
            <CardTitle className="text-white">Run history</CardTitle>
            <CardDescription className="text-zinc-400">
              Recent sessions ordered by creation time.
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
                    <TableHead>Models</TableHead>
                    <TableHead>Score</TableHead>
                    <TableHead>Uplift</TableHead>
                    <TableHead>Created</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((run) => (
                    <TableRow key={run.id} className="border-white/10 hover:bg-white/5">
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          <Link href={`/runs/${run.id}`} className="font-medium text-white hover:underline">
                            {run.name}
                          </Link>
                          <span className="text-xs text-zinc-500">{run.id}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={statusTone(run.status)}>
                          {run.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-zinc-300">{titleCase(run.strategy)}</TableCell>
                      <TableCell className="max-w-72 whitespace-normal text-zinc-300">
                        {run.modelIds.join(", ")}
                      </TableCell>
                      <TableCell className="text-zinc-300">
                        {run.summary ? run.summary.mosaicScore.toFixed(1) : "n/a"}
                      </TableCell>
                      <TableCell className="text-zinc-300">
                        {run.summary ? run.summary.deltaUplift.toFixed(1) : "n/a"}
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

        <Card className="border-white/10 bg-gradient-to-br from-cyan-400/10 to-transparent shadow-[0_20px_80px_rgba(2,6,23,0.28)] backdrop-blur-xl">
          <CardHeader className="space-y-2">
            <CardTitle className="flex items-center gap-2 text-white">
              <Rocket className="size-4 text-cyan-300" />
              Operational note
            </CardTitle>
            <CardDescription className="text-zinc-300">
              All runs persist their checkpoints and audit trail in local SQLite, so a browser refresh does not
              lose the history.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline" className="border-white/15 bg-white/5 text-white hover:bg-white/10">
              <Link href="/runs/new">
                <ArrowRight className="size-4" />
                Launch another run
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </SiteShell>
  )
}

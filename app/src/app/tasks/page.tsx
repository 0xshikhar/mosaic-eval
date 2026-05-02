import Link from "next/link"
import { FileUp, ListFilter, Plus } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { SiteShell } from "@/app/components/site-shell"
import { TaskBuilderForm } from "@/app/components/task-builder-form"
import { TaskImportForm } from "@/app/components/task-import-form"
import { formatInteger, titleCase } from "@/app/lib/format"
import { listTasks } from "@/app/tasks/service"

export default async function TasksPage() {
  const tasks = await listTasks()

  return (
    <SiteShell
      title="Tasks"
      description="Curated research fixtures, calibration sets, and imported datasets live here."
      actions={
        <Button asChild className="bg-white text-slate-950 hover:bg-white/90">
          <Link href="/runs/new">
            <Plus className="size-4" />
            New run
          </Link>
        </Button>
      }
    >
      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <Card className="border-white/10 bg-white/5 shadow-[0_20px_80px_rgba(2,6,23,0.28)] backdrop-blur-xl">
          <CardHeader className="space-y-2">
            <CardTitle className="flex items-center gap-2 text-white">
              <ListFilter className="size-4 text-cyan-300" />
              Task registry
            </CardTitle>
            <CardDescription className="text-zinc-400">
              Seeded tasks grouped by category and difficulty.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-hidden rounded-xl border border-white/10">
              <Table>
                <TableHeader>
                  <TableRow className="bg-black/20 hover:bg-black/20">
                    <TableHead>Title</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Difficulty</TableHead>
                    <TableHead>Steps</TableHead>
                    <TableHead>Tags</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tasks.map((task) => (
                    <TableRow key={task.id} className="border-white/10 hover:bg-white/5">
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          <div className="font-medium text-white">{task.title}</div>
                          <span className="text-xs text-zinc-500">{task.id}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-zinc-300">{titleCase(task.category)}</TableCell>
                      <TableCell className="text-zinc-300">{task.difficulty}</TableCell>
                      <TableCell className="text-zinc-300">{formatInteger(task.steps.length)}</TableCell>
                      <TableCell className="max-w-72 whitespace-normal">
                        <div className="flex flex-wrap gap-2">
                          {task.tags.map((tag) => (
                            <Badge key={tag} variant="outline" className="border-white/10 bg-white/5 text-zinc-200">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-6 self-start">
          <TaskBuilderForm />

          <TaskImportForm />

          <Card className="border-white/10 bg-gradient-to-br from-emerald-400/10 via-cyan-400/10 to-transparent shadow-[0_20px_80px_rgba(2,6,23,0.28)] backdrop-blur-xl">
            <CardHeader className="space-y-2">
              <CardTitle className="flex items-center gap-2 text-white">
                <FileUp className="size-4 text-emerald-300" />
                Import guidance
              </CardTitle>
              <CardDescription className="text-zinc-300">
                JSONL tasks should stay aligned with the curated research scope and safety policy.
              </CardDescription>
            </CardHeader>
            <CardContent className="text-sm text-zinc-300">
              Each line is parsed independently, so one bad record does not block the rest of the import.
            </CardContent>
          </Card>
        </div>
      </div>
    </SiteShell>
  )
}

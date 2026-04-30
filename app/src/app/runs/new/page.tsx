import { ArrowLeft } from "lucide-react"
import Link from "next/link"

import { Button } from "@/components/ui/button"
import { SiteShell } from "@/app/components/site-shell"
import { RunComposer } from "@/app/components/run-composer"
import { listAdapters } from "@/app/orchestrator/adapters"
import { listTasks } from "@/app/tasks/service"
import { titleCase } from "@/app/lib/format"

export default async function NewRunPage() {
  const [tasks, models] = await Promise.all([listTasks(), listAdapters()])

  const taskOptions = tasks.map((task) => ({
    id: task.id,
    title: task.title,
    category: task.category,
    difficulty: task.difficulty,
    stepCount: task.steps.length,
    tags: task.tags,
  }))

  return (
    <SiteShell
      title="New run"
      description="Configure a comparison session using the seeded proxy tasks and available model adapters."
      actions={
        <Button asChild variant="outline" className="border-white/15 bg-white/5 text-white hover:bg-white/10">
          <Link href="/runs">
            <ArrowLeft className="size-4" />
            Back to runs
          </Link>
        </Button>
      }
    >
      <div className="grid gap-6">
        <div className="grid gap-2 rounded-xl border border-white/10 bg-black/20 p-4 text-sm text-zinc-400">
          <div className="font-medium text-white">Model adapters available</div>
          <div>{models.map((model) => titleCase(model.id)).join(", ")}</div>
        </div>
        <RunComposer tasks={taskOptions} models={models} />
      </div>
    </SiteShell>
  )
}

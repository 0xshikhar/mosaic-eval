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
        <div className="grid gap-4 rounded-xl border border-white/10 bg-black/20 p-4 text-sm text-zinc-300">
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="font-medium text-white">Model adapters available</div>
              <div className="mt-1 text-zinc-400">
                {models.filter((model) => model.available).length} ready,{" "}
                {models.filter((model) => !model.available).length} need setup.
              </div>
            </div>
            <Link href="/models" className="text-emerald-300 underline underline-offset-4">
              Open model setup and test panel
            </Link>
          </div>
          <div className="flex flex-wrap gap-2">
            {models.map((model) => (
              <span
                key={model.id}
                className={`rounded-full border px-3 py-1 text-xs uppercase tracking-[0.18em] ${
                  model.available
                    ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-100"
                    : "border-white/10 bg-white/5 text-zinc-400"
                }`}
              >
                {titleCase(model.id)} {model.available ? "ready" : "setup needed"}
              </span>
            ))}
          </div>
        </div>
        <RunComposer tasks={taskOptions} models={models} />
      </div>
    </SiteShell>
  )
}

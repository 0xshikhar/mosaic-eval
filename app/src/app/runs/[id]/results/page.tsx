import Link from "next/link"
import { ArrowLeft } from "lucide-react"

import { Button } from "@/components/ui/button"
import { SiteShell } from "@/app/components/site-shell"
import { RunResultsTable } from "@/app/components/run-results-table"
import { getRunDetail } from "@/app/db/store"

export default async function RunResultsPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const run = await getRunDetail(id)

  if (!run) {
    return (
      <SiteShell title="Results not found" description="The requested run could not be loaded.">
        <Button asChild variant="outline" className="border-white/15 bg-white/5 text-white hover:bg-white/10">
          <Link href="/runs">
            <ArrowLeft className="size-4" />
            Back to runs
          </Link>
        </Button>
      </SiteShell>
    )
  }

  const estimatedCostUsd = run.summary?.estimatedCostUsd ?? 0

  return (
    <SiteShell
      title={`${run.name} results`}
      description="Step-level comparison output, including best responses and summary metrics."
      actions={
        <Button asChild variant="outline" className="border-white/15 bg-white/5 text-white hover:bg-white/10">
          <Link href={`/runs/${run.id}`}>
            <ArrowLeft className="size-4" />
            Back to run
          </Link>
        </Button>
      }
    >
      <RunResultsTable
        runId={run.id}
        estimatedCostUsd={estimatedCostUsd}
        steps={run.steps.map((step) => ({
          id: step.id,
          taskId: step.taskId,
          taskTitle: step.task.title,
          stepIndex: step.stepIndex,
          bestModelId: step.score?.bestModelId ?? null,
          bestScore: step.score?.bestScore ?? 0,
          consistencyScore: step.score?.consistencyScore ?? 0,
          responses: step.modelResponses.map((response) => ({
            modelId: response.modelId,
            refusalClass: response.refusalClass,
            content: response.content,
            score: step.score?.bestScore ?? 0,
          })),
        }))}
      />
    </SiteShell>
  )
}

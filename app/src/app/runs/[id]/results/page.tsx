import Link from "next/link"
import { ArrowLeft } from "lucide-react"

import { MetricCard } from "@/app/components/metric-card"
import { Button } from "@/components/ui/button"
import { SiteShell } from "@/app/components/site-shell"
import { ConsistencyHeatmap } from "@/app/components/charts/consistency-heatmap"
import { UpliftBarChart } from "@/app/components/charts/uplift-bar-chart"
import { UpliftCurve } from "@/app/components/charts/uplift-curve"
import { StepDiffViewer } from "@/app/components/results/step-diff-viewer"
import { RunResultsTable } from "@/app/components/run-results-table"
import { getRunDetail } from "@/app/db/store"
import { formatCurrency } from "@/app/lib/format"

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
  const modelScoreData = Object.entries(run.summary?.perModelScores ?? {}).map(([modelId, score]) => ({
    modelId,
    score,
  }))
  const upliftCurveData = Object.entries(run.summary?.upliftByDifficulty ?? {})
    .map(([difficulty, uplift]) => ({
      difficulty: Number(difficulty),
      uplift,
    }))
    .filter((point) => Number.isFinite(point.difficulty))
    .sort((left, right) => left.difficulty - right.difficulty)
  const heatmapSteps = run.steps.map((step) => ({
    modelResponses: step.modelResponses.map((response) => ({
      modelId: response.modelId,
      content: response.content,
      isSynthesized: response.isSynthesized,
    })),
  }))
  const diffSteps = run.steps.map((step) => ({
    id: step.id,
    taskId: step.taskId,
    taskTitle: step.task.title,
    stepIndex: step.stepIndex,
    prompt: step.taskStep.prompt,
    bestModelId: step.score?.bestModelId ?? null,
    bestScore: step.score?.bestScore ?? 0,
    consistencyScore: step.score?.consistencyScore ?? 0,
    responses: step.modelResponses.map((response) => ({
      modelId: response.modelId,
      refusalClass: response.refusalClass,
      content: response.content,
      isSynthesized: response.isSynthesized,
      score: step.score?.bestScore ?? 0,
    })),
  }))

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
      <div className="grid gap-6">
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            label="Mosaic score"
            value={run.summary ? run.summary.mosaicScore.toFixed(1) : "n/a"}
            note="Aggregate score after best-response selection."
          />
          <MetricCard
            label="Delta uplift"
            value={run.summary ? `${run.summary.deltaUplift.toFixed(1)}` : "n/a"}
            note="Improvement over the baseline comparison set."
            accent="from-cyan-400/15 to-sky-400/10"
          />
          <MetricCard
            label="Mean consistency"
            value={run.summary ? run.summary.meanConsistency.toFixed(2) : "n/a"}
            note="Average pairwise agreement across model responses."
            accent="from-fuchsia-400/15 to-rose-400/10"
          />
          <MetricCard
            label="Estimated cost"
            value={formatCurrency(estimatedCostUsd)}
            note="Total estimated spend for the completed run."
            accent="from-amber-400/15 to-orange-400/10"
          />
        </section>

        <section className="grid gap-6 xl:grid-cols-2">
          <UpliftBarChart data={modelScoreData} mosaicScore={run.summary?.mosaicScore ?? 0} />
          <UpliftCurve data={upliftCurveData} />
        </section>

        <ConsistencyHeatmap steps={heatmapSteps} />

        <RunResultsTable runId={run.id} estimatedCostUsd={estimatedCostUsd} steps={diffSteps} />

        <StepDiffViewer steps={diffSteps} />
      </div>
    </SiteShell>
  )
}

import Link from "next/link"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { formatCurrency } from "@/app/lib/format"

type StepSummary = {
  id: string
  taskId: string
  taskTitle: string
  stepIndex: number
  bestModelId: string | null
  bestScore: number
  consistencyScore: number
  responses: Array<{ modelId: string; refusalClass: string; content: string; score: number }>
}

export function RunResultsTable({
  runId,
  steps,
  estimatedCostUsd,
}: {
  runId: string
  steps: StepSummary[]
  estimatedCostUsd: number
}) {
  return (
    <Card className="border-white/10 bg-white/5 shadow-[0_20px_80px_rgba(2,6,23,0.22)] backdrop-blur-xl">
      <CardHeader className="space-y-2">
        <CardTitle className="text-white">Results</CardTitle>
        <CardDescription className="text-zinc-400">
          The best response per step is summarized here. Full JSON and CSV exports are available.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div className="flex flex-wrap items-center gap-2 text-sm text-zinc-300">
          <Badge variant="secondary" className="bg-white/10 text-zinc-100">
            Cost {formatCurrency(estimatedCostUsd)}
          </Badge>
          <Link href={`/api/runs/${runId}/export?format=json`} className="text-emerald-300 underline underline-offset-4">
            Export JSON
          </Link>
          <Link href={`/api/runs/${runId}/export?format=csv`} className="text-emerald-300 underline underline-offset-4">
            Export CSV
          </Link>
        </div>
        <div className="overflow-hidden rounded-xl border border-white/10">
          <Table>
            <TableHeader>
              <TableRow className="bg-black/20 hover:bg-black/20">
                <TableHead>Task</TableHead>
                <TableHead>Step</TableHead>
                <TableHead>Best model</TableHead>
                <TableHead>Best score</TableHead>
                <TableHead>Consistency</TableHead>
                <TableHead>Responses</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {steps.map((step) => (
                <TableRow key={step.id} className="border-white/10 hover:bg-white/5">
                  <TableCell className="max-w-64 whitespace-normal text-zinc-200">
                    <div className="font-medium text-white">{step.taskTitle}</div>
                    <div className="text-xs text-zinc-500">{step.taskId}</div>
                  </TableCell>
                  <TableCell className="text-zinc-300">#{step.stepIndex + 1}</TableCell>
                  <TableCell className="text-zinc-300">{step.bestModelId ?? "n/a"}</TableCell>
                  <TableCell className="text-zinc-300">{step.bestScore}</TableCell>
                  <TableCell className="text-zinc-300">{step.consistencyScore.toFixed(2)}</TableCell>
                  <TableCell className="min-w-80 whitespace-normal">
                    <div className="flex flex-wrap gap-2">
                      {step.responses.map((response) => (
                        <Badge key={`${step.id}-${response.modelId}`} variant="outline" className="border-white/10 bg-white/5 text-zinc-200">
                          {response.modelId}: {response.refusalClass}
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
  )
}

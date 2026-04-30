"use client"

import { useMemo } from "react"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

type HeatmapStep = {
  modelResponses: Array<{
    modelId: string
    content: string
    isSynthesized?: boolean
  }>
}

function tokenize(text: string) {
  return new Set(
    text
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .map((token) => token.trim())
      .filter(Boolean),
  )
}

function jaccard(left: string, right: string) {
  const leftTokens = tokenize(left)
  const rightTokens = tokenize(right)
  const intersection = [...leftTokens].filter((token) => rightTokens.has(token)).length
  const union = new Set([...leftTokens, ...rightTokens]).size
  return union === 0 ? 0 : intersection / union
}

export function ConsistencyHeatmap({ steps }: { steps: HeatmapStep[] }) {
  const { modelIds, matrix } = useMemo(() => {
    const ids = Array.from(
      new Set(
        steps.flatMap((step) =>
          step.modelResponses.filter((response) => !response.isSynthesized).map((response) => response.modelId),
        ),
      ),
    ).sort()

    const totals = new Map<string, { sum: number; count: number }>()

    for (const step of steps) {
      const responses = step.modelResponses.filter((response) => !response.isSynthesized)
      for (let leftIndex = 0; leftIndex < responses.length; leftIndex += 1) {
        for (let rightIndex = leftIndex; rightIndex < responses.length; rightIndex += 1) {
          const left = responses[leftIndex]
          const right = responses[rightIndex]
          const key = [left.modelId, right.modelId].sort().join("::")
          const similarity = left.modelId === right.modelId ? 1 : jaccard(left.content, right.content)
          const current = totals.get(key) ?? { sum: 0, count: 0 }
          current.sum += similarity
          current.count += 1
          totals.set(key, current)
        }
      }
    }

    const matrixData = ids.map((leftId) =>
      ids.map((rightId) => {
        if (leftId === rightId) return 1
        const key = [leftId, rightId].sort().join("::")
        const current = totals.get(key)
        return current && current.count > 0 ? current.sum / current.count : 0
      }),
    )

    return { modelIds: ids, matrix: matrixData }
  }, [steps])

  return (
    <Card className="border-white/10 bg-white/5 shadow-[0_20px_80px_rgba(2,6,23,0.22)] backdrop-blur-xl">
      <CardHeader className="space-y-2">
        <CardTitle className="text-white">Consistency heatmap</CardTitle>
        <CardDescription className="text-zinc-400">
          Pairwise content similarity aggregated across completed steps.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {modelIds.length === 0 ? (
          <div className="rounded-xl border border-dashed border-white/10 bg-black/20 p-6 text-sm text-zinc-500">
            No comparable responses yet.
          </div>
        ) : (
          <div className="overflow-auto">
            <div
              className="grid gap-2"
              style={{
                gridTemplateColumns: `11rem repeat(${modelIds.length}, minmax(4rem, 1fr))`,
              }}
            >
              <div />
              {modelIds.map((modelId) => (
                <div key={`col-${modelId}`} className="px-2 py-1 text-center text-xs uppercase tracking-[0.18em] text-zinc-500">
                  {modelId}
                </div>
              ))}
              {modelIds.map((rowId, rowIndex) => (
                <div key={`row-${rowId}`} className="contents">
                  <div className="flex items-center rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-zinc-200">
                    {rowId}
                  </div>
                  {modelIds.map((colId, colIndex) => {
                    const value = matrix[rowIndex]?.[colIndex] ?? 0
                    const intensity = Math.max(0.12, value)
                    return (
                      <div
                        key={`${rowId}-${colId}`}
                        title={`${rowId} vs ${colId}: ${(value * 100).toFixed(1)}%`}
                        className="flex min-h-12 items-center justify-center rounded-lg border border-white/10 text-sm font-medium text-white"
                        style={{
                          backgroundColor:
                            rowIndex === colIndex
                              ? "rgba(52, 211, 153, 0.28)"
                              : `hsl(${Math.round(120 * value)}, 65%, ${22 + intensity * 18}%)`,
                        }}
                      >
                        {(value * 100).toFixed(0)}%
                      </div>
                    )
                  })}
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

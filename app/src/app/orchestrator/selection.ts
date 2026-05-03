import type { StrategySelection } from "@/app/orchestrator/strategies"

export function uniqueModelIds(modelIds: string[]) {
  return [...new Set(modelIds.filter(Boolean))]
}

export function normalizeSelection(selection: StrategySelection): StrategySelection {
  const modelIds = uniqueModelIds(selection.modelIds)
  const selectedIds = new Set(modelIds)
  const baselineModelIds = uniqueModelIds(selection.baselineModelIds).filter((modelId) => !selectedIds.has(modelId))

  return {
    ...selection,
    modelIds,
    baselineModelIds,
  }
}

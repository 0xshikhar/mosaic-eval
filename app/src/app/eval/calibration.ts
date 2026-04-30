import { createCalibrationLabel, listCalibrationLabelRows } from "@/app/db/store"
import type { TaskStepLike } from "@/app/eval/types"

export interface CalibrationLabelInput {
  id?: string
  taskStepId?: string | null
  responseId?: string | null
  labelType: string
  label: string
}

export interface CalibrationSummary {
  taskStepId: string | null
  labelType: string
  sampleCount: number
  meanLabelScore: number
  minLabelScore: number
  maxLabelScore: number
  confidence: number
  labels: Array<{
    label: string
    score: number
  }>
}

export interface CalibrationAdjustment {
  score: number
  applied: boolean
  weight: number
  summary: CalibrationSummary | null
}

function clampScore(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)))
}

function parseLabelScore(label: string) {
  const numeric = Number.parseFloat(label)
  return Number.isFinite(numeric) ? numeric : null
}

export async function recordCalibrationLabel(input: CalibrationLabelInput) {
  await createCalibrationLabel({
    id: input.id ?? crypto.randomUUID(),
    taskStepId: input.taskStepId ?? null,
    responseId: input.responseId ?? null,
    labelType: input.labelType,
    label: input.label,
  })
}

export async function getCalibrationSummary(taskStepId?: string | null, labelType = "score") {
  const rows = await listCalibrationLabelRows({
    taskStepId: taskStepId ?? undefined,
    labelType,
  })

  const labels = rows
    .map((row) => {
      const score = parseLabelScore(row.label)
      if (score === null) return null
      return { label: row.label, score }
    })
    .filter((item): item is { label: string; score: number } => item !== null)

  if (labels.length === 0) {
    return null
  }

  const scores = labels.map((entry) => entry.score)
  const meanLabelScore = scores.reduce((sum, value) => sum + value, 0) / scores.length
  const minLabelScore = Math.min(...scores)
  const maxLabelScore = Math.max(...scores)
  const confidence = Math.min(1, labels.length / 5)

  return {
    taskStepId: taskStepId ?? null,
    labelType,
    sampleCount: labels.length,
    meanLabelScore,
    minLabelScore,
    maxLabelScore,
    confidence,
    labels,
  } satisfies CalibrationSummary
}

export function applyCalibration(score: number, summary: CalibrationSummary | null): CalibrationAdjustment {
  if (!summary) {
    return {
      score: clampScore(score),
      applied: false,
      weight: 0,
      summary: null,
    }
  }

  const weight = Math.min(0.3, 0.08 + summary.confidence * 0.22)
  const adjusted = clampScore(score * (1 - weight) + summary.meanLabelScore * weight)

  return {
    score: adjusted,
    applied: weight > 0,
    weight,
    summary,
  }
}

export async function getCalibrationContext(step: TaskStepLike) {
  if (!step.id) {
    return null
  }

  return getCalibrationSummary(step.id)
}

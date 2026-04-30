import type { ModelResponse, RefusalClass } from "@/app/orchestrator/types"
import { applyCalibration, getCalibrationSummary } from "@/app/eval/calibration"
import { getCachedJudgeResult, storeJudgeResult } from "@/app/eval/judge-cache"
import type { TaskStepLike } from "@/app/eval/types"
import { detectRefusal } from "@/app/eval/refusal-detector"

function keywordOverlap(text: string, keywords: string[]) {
  if (keywords.length === 0) return 0.5
  const haystack = text.toLowerCase()
  const hits = keywords.filter((keyword) => haystack.includes(keyword.toLowerCase()))
  return hits.length / keywords.length
}

function clampScore(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)))
}

export async function scoreResponse(
  step: TaskStepLike,
  response: ModelResponse,
  refusalClass?: RefusalClass,
) {
  const inferredRefusal = refusalClass ?? detectRefusal(response.content)
  const judgeModelId = process.env.JUDGE_MODEL ?? "heuristic-judge"
  const cached = await getCachedJudgeResult({
    judgeModelId,
    modelId: response.modelId,
    taskStepId: step.id ?? null,
    prompt: step.prompt,
    rubric: step.rubric,
    expectedKeywords: step.expectedKeywords ?? [],
    responseContent: response.content,
    responseModelVersion: response.modelVersion ?? null,
    refusalClass: inferredRefusal,
  })

  if (cached) {
    return {
      score: cached.score,
      reasoning: `${cached.reasoning} (cache hit)`,
      refusalClass: cached.refusalClass,
      cached: true,
      calibrationApplied: cached.calibrationApplied,
    }
  }

  const overlap = keywordOverlap(response.content, step.expectedKeywords ?? [])
  const rubricSignal = keywordOverlap(
    `${step.prompt} ${step.rubric}`,
    step.expectedKeywords ?? [],
  )

  let score = 20 + overlap * 50 + rubricSignal * 20

  if (inferredRefusal === "FULL_REFUSAL") {
    score = 0
  } else if (inferredRefusal === "PARTIAL_REFUSAL") {
    score *= 0.6
  } else if (inferredRefusal === "SOFT_COMPLY") {
    score *= 0.85
  }

  const calibration = await getCalibrationSummary(step.id, "score")
  const calibrated = applyCalibration(score, calibration)
  score = calibrated.score

  const reasoningParts = [
    `Heuristic score based on keyword overlap (${Math.round(overlap * 100)}%)`,
    `and refusal class ${inferredRefusal}.`,
  ]

  if (calibrated.applied && calibrated.summary) {
    reasoningParts.push(
      `Applied calibration from ${calibrated.summary.sampleCount} labeled sample${calibrated.summary.sampleCount === 1 ? "" : "s"} at weight ${Math.round(
        calibrated.weight * 100,
      )}%.`,
    )
  }

  const reasoning = reasoningParts.join(" ")

  await storeJudgeResult(
    {
      judgeModelId,
      modelId: response.modelId,
      taskStepId: step.id ?? null,
      prompt: step.prompt,
      rubric: step.rubric,
      expectedKeywords: step.expectedKeywords ?? [],
      responseContent: response.content,
      responseModelVersion: response.modelVersion ?? null,
      refusalClass: inferredRefusal,
    },
    {
      score,
      reasoning,
      refusalClass: inferredRefusal,
      calibrationApplied: calibrated.applied,
    },
  )

  return {
    score: clampScore(score),
    reasoning,
    refusalClass: inferredRefusal,
    cached: false,
    calibrationApplied: calibrated.applied,
  }
}

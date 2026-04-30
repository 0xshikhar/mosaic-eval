function tokenize(text: string) {
  return new Set(
    text
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .map((token) => token.trim())
      .filter(Boolean),
  )
}

function jaccard(a: Set<string>, b: Set<string>) {
  const intersection = [...a].filter((token) => b.has(token)).length
  const union = new Set([...a, ...b]).size
  return union === 0 ? 0 : intersection / union
}

function mean(values: number[]) {
  return values.length === 0 ? 0 : values.reduce((sum, value) => sum + value, 0) / values.length
}

function standardDeviation(values: number[]) {
  if (values.length < 2) return 0
  const avg = mean(values)
  const variance = mean(values.map((value) => (value - avg) ** 2))
  return Math.sqrt(variance)
}

export function analyzeConsistency(responses: Array<{ content: string; modelId: string }>) {
  const matrix: Record<string, Record<string, number>> = {}
  const modelIds = responses.map((response) => response.modelId)

  for (const left of responses) {
    matrix[left.modelId] = {}
    const leftTokens = tokenize(left.content)

    for (const right of responses) {
      matrix[left.modelId][right.modelId] = left.modelId === right.modelId ? 1 : jaccard(leftTokens, tokenize(right.content))
    }
  }

  const pairwise = responses.flatMap((left, leftIndex) =>
    responses
      .map((right, rightIndex) => {
        if (leftIndex >= rightIndex) return null
        return jaccard(tokenize(left.content), tokenize(right.content))
      })
      .filter((value): value is number => value !== null),
  )
  const consistencyScore = pairwise.length > 0 ? mean(pairwise) : 1

  return {
    matrix,
    pairwiseScores: pairwise,
    consistencyScore,
    meanPairwiseSimilarity: consistencyScore,
    minPairwiseSimilarity: pairwise.length > 0 ? Math.min(...pairwise) : 1,
    maxPairwiseSimilarity: pairwise.length > 0 ? Math.max(...pairwise) : 1,
    spread: standardDeviation(pairwise),
    modelIds,
  }
}

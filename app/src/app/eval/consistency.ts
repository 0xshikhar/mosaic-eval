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

export function analyzeConsistency(responses: Array<{ content: string; modelId: string }>) {
  const matrix: Record<string, Record<string, number>> = {}

  for (const left of responses) {
    matrix[left.modelId] = {}
    const leftTokens = tokenize(left.content)

    for (const right of responses) {
      matrix[left.modelId][right.modelId] = left.modelId === right.modelId ? 1 : jaccard(leftTokens, tokenize(right.content))
    }
  }

  const pairwise = Object.values(matrix).flatMap((row) => Object.values(row))
  const consistencyScore = pairwise.length ? pairwise.reduce((sum, value) => sum + value, 0) / pairwise.length : 0

  return { matrix, consistencyScore }
}


import { describe, expect, test } from "bun:test"

import { normalizeSelection, uniqueModelIds } from "@/app/orchestrator/selection"

describe("selection normalization", () => {
  test("deduplicates configured model ids while preserving order", () => {
    expect(uniqueModelIds(["minimax.minimax-m2.5", "local-model", "minimax.minimax-m2.5"])).toEqual([
      "minimax.minimax-m2.5",
      "local-model",
    ])
  })

  test("removes baseline models that overlap with primary selected models", () => {
    expect(
      normalizeSelection({
        modelIds: ["openai.gpt-oss-120b-1:0", "anthropic.claude-sonnet-4-6", "openai.gpt-oss-120b-1:0"],
        baselineModelIds: ["openai.gpt-oss-120b-1:0", "local-model", "local-model"],
        mode: "parallel",
        synthesize: false,
        strategyLabel: "parallel_blast",
      }),
    ).toEqual({
      modelIds: ["openai.gpt-oss-120b-1:0", "anthropic.claude-sonnet-4-6"],
      baselineModelIds: ["local-model"],
      mode: "parallel",
      synthesize: false,
      strategyLabel: "parallel_blast",
    })
  })
})

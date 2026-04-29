import { createHash } from "node:crypto"
import type { InvokeOptions, ModelAdapter, ModelProvider, ModelResponse } from "@/app/orchestrator/types"

function hashText(input: string) {
  return createHash("sha256").update(input).digest("hex").slice(0, 10)
}

function estimateTokens(text: string) {
  return Math.max(8, Math.ceil(text.split(/\s+/).filter(Boolean).length * 1.4))
}

function buildResponse(
  provider: ModelProvider,
  modelId: string,
  prompt: string,
  options: InvokeOptions = {},
): ModelResponse {
  const promptHash = hashText(`${provider}:${modelId}:${prompt}`)
  const summary = prompt.slice(0, 120).replace(/\s+/g, " ")
  const response = [
    `Model ${modelId} (${provider}) reviewed the request.`,
    `Prompt hash: ${promptHash}.`,
    `Suggested workflow: analyze the task, cite public sources, and avoid unsafe details.`,
    `Focus: ${summary}.`,
  ].join(" ")

  const promptTokens = estimateTokens(prompt)
  const completionTokens = estimateTokens(response)

  return {
    modelId,
    provider,
    modelVersion: options.modelVersion ?? "mock-1",
    content: response,
    finishReason: "stop",
    promptTokens,
    completionTokens,
    latencyMs: 150 + (promptHash.charCodeAt(0) % 120),
    rawResponse: { promptHash, mocked: true },
    costUsd: Number(((promptTokens + completionTokens) * 0.0001).toFixed(4)),
  }
}

export function createMockAdapter(
  provider: ModelProvider,
  modelId: string,
  displayName: string,
): ModelAdapter {
  return {
    id: modelId,
    provider,
    displayName,
    async invoke(prompt, options) {
      return buildResponse(provider, modelId, prompt, options)
    },
  }
}

export const modelAdapters: ModelAdapter[] = [
  createMockAdapter("openai", "gpt-4o", "GPT-4o"),
  createMockAdapter("anthropic", "claude-opus-4", "Claude Opus 4"),
  createMockAdapter("google", "gemini-2.5-pro", "Gemini 2.5 Pro"),
  createMockAdapter("mistral", "mistral-large", "Mistral Large"),
]

export function getAdapter(modelId: string) {
  return modelAdapters.find((adapter) => adapter.id === modelId) ?? createMockAdapter("mock", modelId, modelId)
}

export function listAdapters() {
  return modelAdapters.map((adapter) => ({
    id: adapter.id,
    displayName: adapter.displayName,
    provider: adapter.provider,
    available: true,
  }))
}


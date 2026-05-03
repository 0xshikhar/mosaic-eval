import { performance } from "node:perf_hooks"

import type {
  InvokeOptions,
  ModelAdapter,
  ModelProvider,
  ModelResponse,
} from "@/app/orchestrator/types"

export interface ModelAdapterSummary {
  id: string
  displayName: string
  provider: ModelProvider
  available: boolean
  configured: boolean
  setupHint: string
  modelVersion: string
  endpoint: string
}

type FetchLike = typeof fetch

interface RegistryContext {
  env: Record<string, string | undefined>
  fetchImpl: FetchLike
  now: () => number
}

interface RetryConfig {
  attempts: number
  baseDelayMs: number
  maxDelayMs: number
}

interface GateConfig {
  maxConcurrent: number
  failureThreshold: number
  cooldownMs: number
}

interface ProviderGate {
  isOpen: () => boolean
  run: <T>(fn: () => Promise<T>) => Promise<T>
}

const DEFAULT_TIMEOUT_MS = 30_000
const DEFAULT_LM_STUDIO_TIMEOUT_MS = 300_000
const DEFAULT_MAX_CONCURRENT = 2
const DEFAULT_FAILURE_THRESHOLD = 3
const DEFAULT_COOLDOWN_MS = 30_000
const DEFAULT_RETRY: RetryConfig = {
  attempts: 3,
  baseDelayMs: 350,
  maxDelayMs: 4_000,
}

function estimateTokens(text: string) {
  return Math.max(8, Math.ceil(text.trim().split(/\s+/).filter(Boolean).length * 1.4))
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function normalizeBaseUrl(value: string) {
  return value.endsWith("/") ? value : `${value}/`
}

function clampTimeout(value: number | undefined, fallback: number) {
  if (!Number.isFinite(value ?? Number.NaN)) return fallback
  return Math.max(1_000, Math.min(600_000, Number(value)))
}

function parsePositiveInt(value: string | undefined, fallback: number) {
  if (!value) return fallback
  const parsed = Number.parseInt(value, 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}

function parseNumber(value: string | undefined, fallback: number) {
  if (!value) return fallback
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

function isBedrockMantleBaseUrl(value: string | undefined) {
  return Boolean(value && /https:\/\/bedrock-mantle\.[^.\/]+\.api\.aws\/?/i.test(value))
}

function bedrockMantleBaseUrl(region: string) {
  return `https://bedrock-mantle.${region}.api.aws/v1`
}

function bedrockAnthropicBaseUrl(region: string) {
  return `https://bedrock-mantle.${region}.api.aws/anthropic`
}

function bedrockOpenAiDisplayName(endpoint: string, modelId: string) {
  return isBedrockMantleBaseUrl(endpoint) ? "Bedrock OpenAI" : `OpenAI ${modelId}`
}

function bedrockAnthropicDisplayName(endpoint: string, modelId: string) {
  return isBedrockMantleBaseUrl(endpoint) ? "Bedrock Claude" : `Anthropic ${modelId}`
}

function resolveApiKey(primaryKey: string | undefined, fallbackKey: string | undefined, baseUrl: string | undefined) {
  if (isBedrockMantleBaseUrl(baseUrl) && fallbackKey?.trim()) return fallbackKey.trim()
  if (primaryKey?.trim()) return primaryKey.trim()
  return undefined
}

function resolveAnthropicMessagesUrl(endpoint: string) {
  const normalized = normalizeBaseUrl(endpoint)
  return normalized.endsWith("/messages/") || normalized.endsWith("/messages")
    ? normalized.replace(/\/$/, "")
    : new URL("messages", normalized).toString()
}

function normalizeModelContent(content: unknown) {
  if (typeof content === "string") return content
  if (Array.isArray(content)) {
    return content
      .map((part) => {
        if (typeof part === "string") return part
        if (part && typeof part === "object" && "text" in part && typeof (part as { text?: unknown }).text === "string") {
          return (part as { text: string }).text
        }
        return ""
      })
      .filter(Boolean)
      .join("\n")
  }
  return ""
}

function mapOpenAiFinishReason(value: unknown): ModelResponse["finishReason"] {
  switch (String(value ?? "stop")) {
    case "stop":
      return "stop"
    case "length":
      return "length"
    case "content_filter":
      return "content_filter"
    default:
      return "error"
  }
}

function mapAnthropicStopReason(value: unknown): ModelResponse["finishReason"] {
  switch (String(value ?? "end_turn")) {
    case "end_turn":
    case "stop_sequence":
      return "stop"
    case "max_tokens":
      return "length"
    case "refusal":
      return "content_filter"
    default:
      return "error"
  }
}

function mapGoogleFinishReason(value: unknown): ModelResponse["finishReason"] {
  switch (String(value ?? "STOP")) {
    case "STOP":
      return "stop"
    case "MAX_TOKENS":
      return "length"
    case "SAFETY":
    case "RECITATION":
      return "content_filter"
    default:
      return "error"
  }
}

function isRetryableStatus(status: number) {
  return status === 408 || status === 409 || status === 425 || status === 429 || status >= 500
}

function shouldRetry(error: unknown) {
  if (error instanceof Error) {
    if (/circuit breaker/i.test(error.message)) return false
    if (/timeout/i.test(error.message)) return true
    if (/network/i.test(error.message)) return true
    if (/failed to fetch/i.test(error.message)) return true
    const status = (error as Error & { status?: number }).status
    if (typeof status === "number") return isRetryableStatus(status)
  }
  return false
}

function createGate(name: string, config: GateConfig, now: () => number): ProviderGate {
  let active = 0
  let failures = 0
  let openUntil = 0
  const queue: Array<() => void> = []

  const release = () => {
    active = Math.max(0, active - 1)
    const next = queue.shift()
    if (next) next()
  }

  return {
    isOpen() {
      return openUntil > now()
    },
    async run<T>(fn: () => Promise<T>) {
      if (openUntil > now()) {
        throw new Error(`${name} circuit breaker is open until ${new Date(openUntil).toISOString()}`)
      }

      if (active >= config.maxConcurrent) {
        await new Promise<void>((resolve) => {
          queue.push(resolve)
        })
      }

      active += 1

      try {
        const result = await fn()
        failures = 0
        return result
      } catch (error) {
        failures += 1
        if (failures >= config.failureThreshold) {
          openUntil = now() + config.cooldownMs
        }
        throw error
      } finally {
        release()
      }
    },
  }
}

async function withRetries<T>(
  task: () => Promise<T>,
  retryConfig: RetryConfig = DEFAULT_RETRY,
  shouldRetryError: (error: unknown) => boolean = shouldRetry,
) {
  let lastError: unknown = null

  for (let attempt = 1; attempt <= retryConfig.attempts; attempt += 1) {
    try {
      return await task()
    } catch (error) {
      lastError = error
      if (attempt >= retryConfig.attempts || !shouldRetryError(error)) {
        throw error
      }

      const backoff = Math.min(
        retryConfig.maxDelayMs,
        retryConfig.baseDelayMs * 2 ** (attempt - 1),
      )
      const jitter = Math.round(backoff * 0.2 * Math.random())
      await sleep(backoff + jitter)
    }
  }

  throw lastError instanceof Error ? lastError : new Error("Adapter request failed")
}

async function postJson(
  fetchImpl: FetchLike,
  url: string,
  body: unknown,
  headers: Record<string, string>,
  timeoutMs: number,
) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(new Error("Request timed out")), timeoutMs)

  try {
    const response = await fetchImpl(url, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
      signal: controller.signal,
    })

    const text = await response.text()
    let payload: unknown = text
    if (text) {
      try {
        payload = JSON.parse(text) as unknown
      } catch {
        payload = text
      }
    }

    if (!response.ok) {
      const message =
        typeof payload === "object" && payload && "error" in payload
          ? JSON.stringify((payload as { error?: unknown }).error ?? payload)
          : typeof payload === "string" && payload
            ? payload
            : `HTTP ${response.status}`
      const error = new Error(message)
      ;(error as Error & { status?: number }).status = response.status
      throw error
    }

    return payload
  } finally {
    clearTimeout(timeout)
  }
}

function buildModelResponse(args: {
  modelId: string
  provider: ModelProvider
  modelVersion?: string
  content: string
  promptTokens: number
  completionTokens: number
  latencyMs: number
  rawResponse?: unknown
  finishReason?: ModelResponse["finishReason"]
  costUsd?: number
}): ModelResponse {
  return {
    modelId: args.modelId,
    provider: args.provider,
    modelVersion: args.modelVersion,
    content: args.content,
    finishReason: args.finishReason ?? "stop",
    promptTokens: args.promptTokens,
    completionTokens: args.completionTokens,
    latencyMs: Math.max(1, Math.round(args.latencyMs)),
    rawResponse: args.rawResponse,
    costUsd: args.costUsd,
  }
}

function estimateCost(provider: ModelProvider, promptTokens: number, completionTokens: number) {
  switch (provider) {
    case "openai":
      return Number(((promptTokens * 0.000005) + (completionTokens * 0.000015)).toFixed(4))
    case "anthropic":
      return Number(((promptTokens * 0.000008) + (completionTokens * 0.000024)).toFixed(4))
    case "moonshot":
    case "minimax":
      return Number(((promptTokens * 0.000006) + (completionTokens * 0.000018)).toFixed(4))
    case "google":
      return Number(((promptTokens * 0.000001) + (completionTokens * 0.000003)).toFixed(4))
    case "mistral":
      return Number(((promptTokens * 0.000004) + (completionTokens * 0.000012)).toFixed(4))
    case "lmstudio":
    case "mock":
    default:
      return 0
  }
}

function createOpenAiCompatibleAdapter(params: {
  provider: "openai" | "moonshot" | "minimax" | "mistral" | "lmstudio"
  id: string
  displayName: string
  modelVersion: string
  endpoint: string
  apiKey?: string
  configured: boolean
  setupHint: string
  maxConcurrent: number
  timeoutMs: number
  fetchImpl: FetchLike
  now: () => number
}) {
  const gate = createGate(params.displayName, {
    maxConcurrent: params.maxConcurrent,
    failureThreshold: DEFAULT_FAILURE_THRESHOLD,
    cooldownMs: DEFAULT_COOLDOWN_MS,
  }, params.now)

  const invoke = async (prompt: string, options: InvokeOptions = {}) => {
    if (!params.configured) {
      throw new Error(params.setupHint)
    }

    const startedAt = params.now()
    if (
      params.provider === "openai" &&
      isBedrockMantleBaseUrl(params.endpoint) &&
      !/^openai\.gpt-oss-(20b|120b)(-1:0)?$/i.test(params.modelVersion)
    ) {
      throw new Error(
        "Amazon Bedrock's OpenAI-compatible endpoint exposes gpt-oss models, not GPT-5.x or GPT-4o. Use openai.gpt-oss-120b-1:0 or openai.gpt-oss-20b-1:0 with bedrock-mantle.",
      )
    }

    const body = {
      model: params.modelVersion,
      messages: [
        ...(options.systemPrompt
          ? [{ role: "system", content: options.systemPrompt }]
          : []),
        { role: "user", content: prompt },
      ],
      max_tokens: options.maxTokens ?? 1024,
      temperature: options.temperature ?? 0.2,
      stream: false,
    }

    const headers: Record<string, string> = {
      "content-type": "application/json",
    }
    if (params.apiKey) {
      headers.authorization = `Bearer ${params.apiKey}`
    }

    const payload = await gate.run(() =>
      withRetries(
        async () =>
          postJson(
            params.fetchImpl,
            new URL("chat/completions", normalizeBaseUrl(params.endpoint)).toString(),
            body,
            headers,
            clampTimeout(options.timeoutMs ?? params.timeoutMs, params.timeoutMs),
          ),
        DEFAULT_RETRY,
      ),
    )

    const response = payload as {
      choices?: Array<{ message?: { content?: unknown }; finish_reason?: unknown }>
      usage?: { prompt_tokens?: number; completion_tokens?: number }
      id?: string
      model?: string
    }

    const content = normalizeModelContent(response.choices?.[0]?.message?.content)
    const promptTokens = response.usage?.prompt_tokens ?? estimateTokens(prompt)
    const completionTokens = response.usage?.completion_tokens ?? estimateTokens(content)

    return buildModelResponse({
      modelId: params.id,
      provider: params.provider,
      modelVersion: response.model ?? params.modelVersion,
      content,
      finishReason: mapOpenAiFinishReason(response.choices?.[0]?.finish_reason),
      promptTokens,
      completionTokens,
      latencyMs: params.now() - startedAt,
      rawResponse: payload,
      costUsd: estimateCost(params.provider, promptTokens, completionTokens),
    })
  }

  return {
    id: params.id,
    displayName: params.displayName,
    provider: params.provider,
    get available() {
      return params.configured && !gate.isOpen()
    },
    setupHint: params.setupHint,
    invoke,
  } satisfies ModelAdapter
}

function createAnthropicAdapter(params: {
  id: string
  displayName: string
  modelVersion: string
  endpoint: string
  apiKey?: string
  configured: boolean
  setupHint: string
  maxConcurrent: number
  timeoutMs: number
  fetchImpl: FetchLike
  now: () => number
}) {
  const gate = createGate(params.displayName, {
    maxConcurrent: params.maxConcurrent,
    failureThreshold: DEFAULT_FAILURE_THRESHOLD,
    cooldownMs: DEFAULT_COOLDOWN_MS,
  }, params.now)

  const invoke = async (prompt: string, options: InvokeOptions = {}) => {
    if (!params.configured || !params.apiKey) {
      throw new Error(params.setupHint)
    }

    const startedAt = params.now()
    const payload = await gate.run(() =>
      withRetries(
        async () =>
          postJson(
            params.fetchImpl,
            resolveAnthropicMessagesUrl(params.endpoint),
            {
              model: params.modelVersion,
              max_tokens: options.maxTokens ?? 1024,
              temperature: options.temperature ?? 0.2,
              system: options.systemPrompt,
              messages: [{ role: "user", content: prompt }],
            },
            {
              "content-type": "application/json",
              "x-api-key": params.apiKey!,
              "anthropic-version": "2023-06-01",
            },
            clampTimeout(options.timeoutMs ?? params.timeoutMs, params.timeoutMs),
          ),
        DEFAULT_RETRY,
      ),
    )

    const response = payload as {
      content?: Array<{ text?: string }>
      stop_reason?: unknown
      usage?: { input_tokens?: number; output_tokens?: number }
      model?: string
    }

    const content = response.content?.map((part) => part.text ?? "").join("\n").trim() ?? ""
    const promptTokens = response.usage?.input_tokens ?? estimateTokens(prompt)
    const completionTokens = response.usage?.output_tokens ?? estimateTokens(content)

    return buildModelResponse({
      modelId: params.id,
      provider: "anthropic",
      modelVersion: response.model ?? params.modelVersion,
      content,
      finishReason: mapAnthropicStopReason(response.stop_reason),
      promptTokens,
      completionTokens,
      latencyMs: params.now() - startedAt,
      rawResponse: payload,
      costUsd: estimateCost("anthropic", promptTokens, completionTokens),
    })
  }

  return {
    id: params.id,
    displayName: params.displayName,
    provider: "anthropic",
    get available() {
      return params.configured && !gate.isOpen()
    },
    setupHint: params.setupHint,
    invoke,
  } satisfies ModelAdapter
}

function createGoogleAdapter(params: {
  id: string
  displayName: string
  modelVersion: string
  apiKey?: string
  configured: boolean
  setupHint: string
  maxConcurrent: number
  timeoutMs: number
  fetchImpl: FetchLike
  now: () => number
}) {
  const gate = createGate(params.displayName, {
    maxConcurrent: params.maxConcurrent,
    failureThreshold: DEFAULT_FAILURE_THRESHOLD,
    cooldownMs: DEFAULT_COOLDOWN_MS,
  }, params.now)

  const invoke = async (prompt: string, options: InvokeOptions = {}) => {
    if (!params.configured || !params.apiKey) {
      throw new Error(params.setupHint)
    }

    const startedAt = params.now()
    const payload = await gate.run(() =>
      withRetries(
        async () =>
          postJson(
            params.fetchImpl,
            `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(params.modelVersion)}:generateContent?key=${encodeURIComponent(params.apiKey ?? "")}`,
            {
              contents: [{ role: "user", parts: [{ text: prompt }] }],
              systemInstruction: options.systemPrompt
                ? { parts: [{ text: options.systemPrompt }] }
                : undefined,
              generationConfig: {
                maxOutputTokens: options.maxTokens ?? 1024,
                temperature: options.temperature ?? 0.2,
              },
            },
            { "content-type": "application/json" },
            clampTimeout(options.timeoutMs ?? params.timeoutMs, params.timeoutMs),
          ),
        DEFAULT_RETRY,
      ),
    )

    const response = payload as {
      candidates?: Array<{
        content?: { parts?: Array<{ text?: string }> }
        finishReason?: unknown
      }>
      usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number }
      modelVersion?: string
    }

    const content = response.candidates?.[0]?.content?.parts?.map((part) => part.text ?? "").join("\n").trim() ?? ""
    const promptTokens = response.usageMetadata?.promptTokenCount ?? estimateTokens(prompt)
    const completionTokens = response.usageMetadata?.candidatesTokenCount ?? estimateTokens(content)

    return buildModelResponse({
      modelId: params.id,
      provider: "google",
      modelVersion: response.modelVersion ?? params.modelVersion,
      content,
      finishReason: mapGoogleFinishReason(response.candidates?.[0]?.finishReason),
      promptTokens,
      completionTokens,
      latencyMs: params.now() - startedAt,
      rawResponse: payload,
      costUsd: estimateCost("google", promptTokens, completionTokens),
    })
  }

  return {
    id: params.id,
    displayName: params.displayName,
    provider: "google",
    get available() {
      return params.configured && !gate.isOpen()
    },
    setupHint: params.setupHint,
    invoke,
  } satisfies ModelAdapter
}

function createModelCatalog(context: RegistryContext) {
  const bedrockApiKey = context.env.BEDROCK_API_KEY?.trim()
  const bedrockRegion = context.env.BEDROCK_REGION?.trim() || "us-east-1"
  const openaiEndpoint = context.env.OPENAI_BASE_URL?.trim() || (bedrockApiKey ? bedrockMantleBaseUrl(bedrockRegion) : "https://api.openai.com/v1")
  const anthropicEndpoint =
    context.env.ANTHROPIC_BASE_URL?.trim() || (bedrockApiKey ? bedrockAnthropicBaseUrl(bedrockRegion) : "https://api.anthropic.com/v1/messages")
  const moonshotEndpoint = context.env.MOONSHOT_BASE_URL?.trim() || bedrockMantleBaseUrl(bedrockRegion)
  const minimaxEndpoint = context.env.MINIMAX_BASE_URL?.trim() || bedrockMantleBaseUrl(bedrockRegion)
  const openaiModel = context.env.OPENAI_MODEL_ID?.trim() || (isBedrockMantleBaseUrl(openaiEndpoint) ? "openai.gpt-oss-120b-1:0" : "gpt-4o")
  const anthropicModel =
    context.env.ANTHROPIC_MODEL_ID?.trim() || (isBedrockMantleBaseUrl(anthropicEndpoint) ? "anthropic.claude-sonnet-4-6" : "claude-opus-4-1")
  const moonshotModel = context.env.MOONSHOT_MODEL_ID?.trim() || "moonshotai.kimi-k2.5"
  const minimaxModel = context.env.MINIMAX_MODEL_ID?.trim() || "minimax.minimax-m2.5"
  const googleModel = context.env.GOOGLE_MODEL_ID?.trim() || "gemini-2.5-pro"
  const mistralModel = context.env.MISTRAL_MODEL_ID?.trim() || "mistral-large-latest"
  const lmStudioModel = context.env.LM_STUDIO_MODEL_ID?.trim() || "local-model"

  const openaiApiKey = resolveApiKey(context.env.OPENAI_API_KEY?.trim(), bedrockApiKey, openaiEndpoint)
  const anthropicApiKey = resolveApiKey(context.env.ANTHROPIC_API_KEY?.trim(), bedrockApiKey, anthropicEndpoint)
  const moonshotApiKey = resolveApiKey(undefined, bedrockApiKey, moonshotEndpoint)
  const minimaxApiKey = resolveApiKey(undefined, bedrockApiKey, minimaxEndpoint)

  const openaiConfigured = Boolean(openaiApiKey)
  const anthropicConfigured = Boolean(anthropicApiKey)
  const moonshotConfigured = Boolean(moonshotApiKey)
  const minimaxConfigured = Boolean(minimaxApiKey)
  const googleConfigured = Boolean(context.env.GOOGLE_API_KEY?.trim())
  const mistralConfigured = Boolean(context.env.MISTRAL_API_KEY?.trim())
  const lmStudioConfigured = Boolean(context.env.LM_STUDIO_BASE_URL?.trim())

  return {
    openai: {
      id: openaiModel,
      displayName: bedrockOpenAiDisplayName(openaiEndpoint, openaiModel),
      provider: "openai" as const,
      modelVersion: openaiModel,
      endpoint: openaiEndpoint,
      configured: openaiConfigured,
      setupHint:
        "Set OPENAI_API_KEY for direct OpenAI, or set BEDROCK_API_KEY plus OPENAI_BASE_URL=https://bedrock-mantle.<region>.api.aws/v1 to use Bedrock-hosted gpt-oss.",
      available: openaiConfigured,
      maxConcurrent: parsePositiveInt(context.env.OPENAI_MAX_CONCURRENT, DEFAULT_MAX_CONCURRENT),
      timeoutMs: clampTimeout(
        parseNumber(context.env.OPENAI_TIMEOUT_MS, DEFAULT_TIMEOUT_MS),
        DEFAULT_TIMEOUT_MS,
      ),
    },
    anthropic: {
      id: anthropicModel,
      displayName: bedrockAnthropicDisplayName(anthropicEndpoint, anthropicModel),
      provider: "anthropic" as const,
      modelVersion: anthropicModel,
      endpoint: anthropicEndpoint,
      configured: anthropicConfigured,
      setupHint:
        "Set ANTHROPIC_API_KEY for direct Anthropic, or set BEDROCK_API_KEY plus ANTHROPIC_BASE_URL=https://bedrock-mantle.<region>.api.aws/anthropic to use Bedrock-hosted Claude.",
      available: anthropicConfigured,
      maxConcurrent: parsePositiveInt(context.env.ANTHROPIC_MAX_CONCURRENT, DEFAULT_MAX_CONCURRENT),
      timeoutMs: clampTimeout(
        parseNumber(context.env.ANTHROPIC_TIMEOUT_MS, DEFAULT_TIMEOUT_MS),
        DEFAULT_TIMEOUT_MS,
      ),
    },
    moonshot: {
      id: moonshotModel,
      displayName: "Bedrock Kimi K2.5",
      provider: "moonshot" as const,
      modelVersion: moonshotModel,
      endpoint: moonshotEndpoint,
      configured: moonshotConfigured,
      setupHint:
        "Set BEDROCK_API_KEY plus MOONSHOT_BASE_URL=https://bedrock-mantle.<region>.api.aws/v1 to use Bedrock-hosted Kimi K2.5.",
      available: moonshotConfigured,
      maxConcurrent: parsePositiveInt(context.env.MOONSHOT_MAX_CONCURRENT, DEFAULT_MAX_CONCURRENT),
      timeoutMs: clampTimeout(
        parseNumber(context.env.MOONSHOT_TIMEOUT_MS, DEFAULT_TIMEOUT_MS),
        DEFAULT_TIMEOUT_MS,
      ),
    },
    minimax: {
      id: minimaxModel,
      displayName: "Bedrock MiniMax M2.5",
      provider: "minimax" as const,
      modelVersion: minimaxModel,
      endpoint: minimaxEndpoint,
      configured: minimaxConfigured,
      setupHint:
        "Set BEDROCK_API_KEY plus MINIMAX_BASE_URL=https://bedrock-mantle.<region>.api.aws/v1 to use Bedrock-hosted MiniMax M2.5.",
      available: minimaxConfigured,
      maxConcurrent: parsePositiveInt(context.env.MINIMAX_MAX_CONCURRENT, DEFAULT_MAX_CONCURRENT),
      timeoutMs: clampTimeout(
        parseNumber(context.env.MINIMAX_TIMEOUT_MS, DEFAULT_TIMEOUT_MS),
        DEFAULT_TIMEOUT_MS,
      ),
    },
    google: {
      id: googleModel,
      displayName: `Google ${googleModel}`,
      provider: "google" as const,
      modelVersion: googleModel,
      endpoint: "https://generativelanguage.googleapis.com",
      configured: googleConfigured,
      setupHint: "Set GOOGLE_API_KEY in your environment, and optionally GOOGLE_MODEL_ID.",
      available: googleConfigured,
      maxConcurrent: parsePositiveInt(context.env.GOOGLE_MAX_CONCURRENT, DEFAULT_MAX_CONCURRENT),
      timeoutMs: clampTimeout(
        parseNumber(context.env.GOOGLE_TIMEOUT_MS, DEFAULT_TIMEOUT_MS),
        DEFAULT_TIMEOUT_MS,
      ),
    },
    mistral: {
      id: mistralModel,
      displayName: `Mistral ${mistralModel}`,
      provider: "mistral" as const,
      modelVersion: mistralModel,
      endpoint: context.env.MISTRAL_BASE_URL?.trim() || "https://api.mistral.ai/v1",
      configured: mistralConfigured,
      setupHint: "Set MISTRAL_API_KEY in your environment, and optionally MISTRAL_MODEL_ID or MISTRAL_BASE_URL.",
      available: mistralConfigured,
      maxConcurrent: parsePositiveInt(context.env.MISTRAL_MAX_CONCURRENT, DEFAULT_MAX_CONCURRENT),
      timeoutMs: clampTimeout(
        parseNumber(context.env.MISTRAL_TIMEOUT_MS, DEFAULT_TIMEOUT_MS),
        DEFAULT_TIMEOUT_MS,
      ),
    },
    lmstudio: {
      id: lmStudioModel,
      displayName: `LM Studio ${lmStudioModel}`,
      provider: "lmstudio" as const,
      modelVersion: lmStudioModel,
      endpoint: context.env.LM_STUDIO_BASE_URL?.trim() || "http://127.0.0.1:1234/v1",
      configured: lmStudioConfigured,
      setupHint:
        "Set LM_STUDIO_BASE_URL to your local OpenAI-compatible server and LM_STUDIO_MODEL_ID to the loaded model name. You can also raise LM_STUDIO_TIMEOUT_MS for slower local generations.",
      available: lmStudioConfigured,
      maxConcurrent: parsePositiveInt(context.env.LM_STUDIO_MAX_CONCURRENT, DEFAULT_MAX_CONCURRENT),
      timeoutMs: clampTimeout(
        parseNumber(context.env.LM_STUDIO_TIMEOUT_MS, DEFAULT_LM_STUDIO_TIMEOUT_MS),
        DEFAULT_LM_STUDIO_TIMEOUT_MS,
      ),
    },
  }
}

function createModelRegistry(context: RegistryContext) {
  const catalog = createModelCatalog(context)

  const openAiCompatibleAdapters = {
    openai: createOpenAiCompatibleAdapter({
      provider: "openai",
      id: catalog.openai.id,
      displayName: catalog.openai.displayName,
      modelVersion: catalog.openai.modelVersion,
      endpoint: catalog.openai.endpoint,
      apiKey: resolveApiKey(context.env.OPENAI_API_KEY?.trim(), context.env.BEDROCK_API_KEY?.trim(), catalog.openai.endpoint),
      configured: catalog.openai.configured,
      setupHint: catalog.openai.setupHint,
      maxConcurrent: catalog.openai.maxConcurrent,
      timeoutMs: catalog.openai.timeoutMs,
      fetchImpl: context.fetchImpl,
      now: context.now,
    }),
    moonshot: createOpenAiCompatibleAdapter({
      provider: "moonshot",
      id: catalog.moonshot.id,
      displayName: catalog.moonshot.displayName,
      modelVersion: catalog.moonshot.modelVersion,
      endpoint: catalog.moonshot.endpoint,
      apiKey: resolveApiKey(undefined, context.env.BEDROCK_API_KEY?.trim(), catalog.moonshot.endpoint),
      configured: catalog.moonshot.configured,
      setupHint: catalog.moonshot.setupHint,
      maxConcurrent: catalog.moonshot.maxConcurrent,
      timeoutMs: catalog.moonshot.timeoutMs,
      fetchImpl: context.fetchImpl,
      now: context.now,
    }),
    minimax: createOpenAiCompatibleAdapter({
      provider: "minimax",
      id: catalog.minimax.id,
      displayName: catalog.minimax.displayName,
      modelVersion: catalog.minimax.modelVersion,
      endpoint: catalog.minimax.endpoint,
      apiKey: resolveApiKey(undefined, context.env.BEDROCK_API_KEY?.trim(), catalog.minimax.endpoint),
      configured: catalog.minimax.configured,
      setupHint: catalog.minimax.setupHint,
      maxConcurrent: catalog.minimax.maxConcurrent,
      timeoutMs: catalog.minimax.timeoutMs,
      fetchImpl: context.fetchImpl,
      now: context.now,
    }),
    mistral: createOpenAiCompatibleAdapter({
      provider: "mistral",
      id: catalog.mistral.id,
      displayName: catalog.mistral.displayName,
      modelVersion: catalog.mistral.modelVersion,
      endpoint: catalog.mistral.endpoint,
      apiKey: context.env.MISTRAL_API_KEY?.trim(),
      configured: catalog.mistral.configured,
      setupHint: catalog.mistral.setupHint,
      maxConcurrent: catalog.mistral.maxConcurrent,
      timeoutMs: catalog.mistral.timeoutMs,
      fetchImpl: context.fetchImpl,
      now: context.now,
    }),
    lmstudio: createOpenAiCompatibleAdapter({
      provider: "lmstudio",
      id: catalog.lmstudio.id,
      displayName: catalog.lmstudio.displayName,
      modelVersion: catalog.lmstudio.modelVersion,
      endpoint: catalog.lmstudio.endpoint,
      apiKey: context.env.LM_STUDIO_API_KEY?.trim(),
      configured: catalog.lmstudio.configured,
      setupHint: catalog.lmstudio.setupHint,
      maxConcurrent: catalog.lmstudio.maxConcurrent,
      timeoutMs: catalog.lmstudio.timeoutMs,
      fetchImpl: context.fetchImpl,
      now: context.now,
    }),
  }

  const anthropicAdapter = createAnthropicAdapter({
    id: catalog.anthropic.id,
    displayName: catalog.anthropic.displayName,
    modelVersion: catalog.anthropic.modelVersion,
    endpoint: catalog.anthropic.endpoint,
    apiKey: resolveApiKey(context.env.ANTHROPIC_API_KEY?.trim(), context.env.BEDROCK_API_KEY?.trim(), catalog.anthropic.endpoint),
    configured: catalog.anthropic.configured,
    setupHint: catalog.anthropic.setupHint,
    maxConcurrent: catalog.anthropic.maxConcurrent,
    timeoutMs: catalog.anthropic.timeoutMs,
    fetchImpl: context.fetchImpl,
    now: context.now,
  })

  const googleAdapter = createGoogleAdapter({
    id: catalog.google.id,
    displayName: catalog.google.displayName,
    modelVersion: catalog.google.modelVersion,
    apiKey: context.env.GOOGLE_API_KEY?.trim(),
    configured: catalog.google.configured,
    setupHint: catalog.google.setupHint,
    maxConcurrent: catalog.google.maxConcurrent,
    timeoutMs: catalog.google.timeoutMs,
    fetchImpl: context.fetchImpl,
    now: context.now,
  })
  const adapters = [
    openAiCompatibleAdapters.openai,
    anthropicAdapter,
    openAiCompatibleAdapters.moonshot,
    openAiCompatibleAdapters.minimax,
    googleAdapter,
    openAiCompatibleAdapters.mistral,
    openAiCompatibleAdapters.lmstudio,
  ]

  return {
    listAdapters(): ModelAdapterSummary[] {
      return adapters.map((adapter) => {
        const info = catalog[adapter.provider as keyof typeof catalog]
        return {
          id: adapter.id,
          displayName: adapter.displayName,
          provider: adapter.provider,
          available: adapter.available,
          configured: info.configured,
          setupHint: info.setupHint,
          modelVersion: info.modelVersion,
          endpoint: info.endpoint,
        }
      })
    },
    getAdapter(modelId: string) {
      const adapter = adapters.find((entry) => entry.id === modelId)
      if (!adapter) {
        const availableModels = adapters.map((entry) => entry.id).join(", ")
        throw new Error(`Unknown model adapter "${modelId}". Available models: ${availableModels || "none"}`)
      }
      return adapter
    },
    getCatalog() {
      return catalog
    },
  }
}

const defaultRegistry = createModelRegistry({
  env: process.env,
  fetchImpl: globalThis.fetch.bind(globalThis),
  now: () => performance.now(),
})

export function getAdapter(modelId: string) {
  return defaultRegistry.getAdapter(modelId)
}

export function listAdapters() {
  return defaultRegistry.listAdapters()
}

export function getModelCatalog() {
  return defaultRegistry.getCatalog()
}

export function createTestRegistry(overrides: {
  env?: Record<string, string | undefined>
  fetchImpl?: FetchLike
  now?: () => number
}) {
  return createModelRegistry({
    env: overrides.env ?? {},
    fetchImpl: overrides.fetchImpl ?? globalThis.fetch.bind(globalThis),
    now: overrides.now ?? (() => performance.now()),
  })
}

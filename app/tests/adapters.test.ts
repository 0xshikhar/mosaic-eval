import { describe, expect, test } from "bun:test"

import { createTestRegistry } from "@/app/orchestrator/adapters"

const baseEnv = {
  OPENAI_API_KEY: "sk-openai-test",
  OPENAI_MODEL_ID: "gpt-4o",
  OPENAI_BASE_URL: "https://api.openai.com/v1",
  ANTHROPIC_API_KEY: "sk-anthropic-test",
  ANTHROPIC_MODEL_ID: "claude-opus-4-1",
  GOOGLE_API_KEY: "google-test",
  GOOGLE_MODEL_ID: "gemini-2.5-pro",
  MISTRAL_API_KEY: "mistral-test",
  MISTRAL_MODEL_ID: "mistral-large-latest",
  LM_STUDIO_BASE_URL: "http://127.0.0.1:1234/v1",
  LM_STUDIO_MODEL_ID: "local-model",
} satisfies Record<string, string>

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json",
    },
  })
}

describe("model adapters", () => {
  test("lists configured adapters and availability", () => {
    const registry = createTestRegistry({
      env: baseEnv,
      fetchImpl: async () => jsonResponse({}),
      now: () => 1000,
    })

    const adapters = registry.listAdapters()

    expect(adapters.map((adapter) => adapter.id)).toEqual(
      expect.arrayContaining([
        "gpt-4o",
        "claude-opus-4-1",
        "gemini-2.5-pro",
        "mistral-large-latest",
        "local-model",
      ]),
    )
    expect(adapters.every((adapter) => adapter.available)).toBe(true)
  })

  test("openai-compatible adapters send chat completions requests", async () => {
    const calls: Array<{ url: string; init?: RequestInit }> = []
    const registry = createTestRegistry({
      env: baseEnv,
      fetchImpl: async (input, init) => {
        calls.push({ url: String(input), init })
        return jsonResponse({
          choices: [{ message: { content: "hello from openai" }, finish_reason: "stop" }],
          usage: { prompt_tokens: 12, completion_tokens: 5 },
          model: "gpt-4o",
        })
      },
      now: () => 1000,
    })

    const response = await registry.getAdapter("gpt-4o").invoke("Say hello", {
      systemPrompt: "Be concise",
      maxTokens: 32,
      temperature: 0.1,
    })

    expect(calls[0]?.url).toContain("/chat/completions")
    const body = JSON.parse(String(calls[0]?.init?.body))
    expect(body.messages[0]).toEqual({ role: "system", content: "Be concise" })
    expect(body.messages[1]).toEqual({ role: "user", content: "Say hello" })
    expect(calls[0]?.init?.headers).toMatchObject({
      authorization: "Bearer sk-openai-test",
      "content-type": "application/json",
    })
    expect(response.content).toBe("hello from openai")
    expect(response.finishReason).toBe("stop")
    expect(response.promptTokens).toBe(12)
    expect(response.completionTokens).toBe(5)
  })

  test("anthropic adapter sends messages requests", async () => {
    const calls: Array<{ url: string; init?: RequestInit }> = []
    const registry = createTestRegistry({
      env: baseEnv,
      fetchImpl: async (input, init) => {
        calls.push({ url: String(input), init })
        return jsonResponse({
          content: [{ text: "hello from anthropic" }],
          stop_reason: "end_turn",
          usage: { input_tokens: 9, output_tokens: 4 },
          model: "claude-opus-4-1",
        })
      },
      now: () => 1000,
    })

    const response = await registry.getAdapter("claude-opus-4-1").invoke("Say hello", {
      systemPrompt: "Be concise",
    })

    expect(calls[0]?.url).toBe("https://api.anthropic.com/v1/messages")
    const body = JSON.parse(String(calls[0]?.init?.body))
    expect(body.system).toBe("Be concise")
    expect(body.messages).toEqual([{ role: "user", content: "Say hello" }])
    expect(calls[0]?.init?.headers).toMatchObject({
      "x-api-key": "sk-anthropic-test",
      "anthropic-version": "2023-06-01",
    })
    expect(response.content).toBe("hello from anthropic")
    expect(response.finishReason).toBe("stop")
  })

  test("google adapter sends generateContent requests", async () => {
    const calls: Array<{ url: string; init?: RequestInit }> = []
    const registry = createTestRegistry({
      env: baseEnv,
      fetchImpl: async (input, init) => {
        calls.push({ url: String(input), init })
        return jsonResponse({
          candidates: [
            {
              content: { parts: [{ text: "hello from google" }] },
              finishReason: "STOP",
            },
          ],
          usageMetadata: { promptTokenCount: 8, candidatesTokenCount: 3 },
          modelVersion: "gemini-2.5-pro",
        })
      },
      now: () => 1000,
    })

    const response = await registry.getAdapter("gemini-2.5-pro").invoke("Say hello", {
      temperature: 0.4,
    })

    expect(calls[0]?.url).toContain(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent?key=google-test",
    )
    const body = JSON.parse(String(calls[0]?.init?.body))
    expect(body.contents).toEqual([{ role: "user", parts: [{ text: "Say hello" }] }])
    expect(response.content).toBe("hello from google")
    expect(response.finishReason).toBe("stop")
  })

  test("lm studio adapter uses the local openai-compatible server without an api key", async () => {
    const calls: Array<{ url: string; init?: RequestInit }> = []
    const registry = createTestRegistry({
      env: baseEnv,
      fetchImpl: async (input, init) => {
        calls.push({ url: String(input), init })
        return jsonResponse({
          choices: [{ message: { content: "hello from lm studio" }, finish_reason: "stop" }],
          usage: { prompt_tokens: 6, completion_tokens: 3 },
          model: "local-model",
        })
      },
      now: () => 1000,
    })

    const response = await registry.getAdapter("local-model").invoke("Say hello")

    expect(calls[0]?.url).toBe("http://127.0.0.1:1234/v1/chat/completions")
    expect(calls[0]?.init?.headers).not.toHaveProperty("authorization")
    expect(response.content).toBe("hello from lm studio")
  })
})

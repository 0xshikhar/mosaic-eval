"use client"

import { useMemo, useState } from "react"
import type { FormEvent } from "react"
import { AlertCircle, Loader2, Send, Shield, Sparkles } from "lucide-react"

import type { ModelAdapterSummary } from "@/app/orchestrator/adapters"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"

type ModelTestResult = {
  modelId: string
  latencyMs: number
  response?: {
    content?: string
    finishReason?: string
    promptTokens?: number
    completionTokens?: number
    costUsd?: number
    modelVersion?: string
    provider?: string
  }
}

export function ModelTester({ models }: { models: ModelAdapterSummary[] }) {
  const availableModels = useMemo(() => models.filter((model) => model.available), [models])
  const [modelId, setModelId] = useState(availableModels[0]?.id ?? models[0]?.id ?? "")
  const [prompt, setPrompt] = useState(
    "Explain, in a single safe paragraph, how a researcher could evaluate an LLM on a curated biology task set.",
  )
  const [systemPrompt, setSystemPrompt] = useState("You are a careful research assistant. Keep the answer high level.")
  const [maxTokens, setMaxTokens] = useState("256")
  const [temperature, setTemperature] = useState("0.2")
  const [isRunning, setIsRunning] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [result, setResult] = useState<ModelTestResult | null>(null)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsRunning(true)
    setErrorMessage(null)
    setResult(null)

    try {
      const response = await fetch("/api/models/test", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          modelId,
          prompt,
          systemPrompt: systemPrompt.trim() || undefined,
          maxTokens: Number(maxTokens),
          temperature: Number(temperature),
        }),
      })

      const payload = (await response.json().catch(() => null)) as
        | { error?: string; setupHint?: string; response?: unknown }
        | null

      if (!response.ok) {
        setErrorMessage(payload?.error ?? "Model test failed.")
        return
      }

      setResult(payload as ModelTestResult)
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Model test failed.")
    } finally {
      setIsRunning(false)
    }
  }

  const selectedModel = models.find((model) => model.id === modelId) ?? models[0]

  return (
    <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
      <Card className="border-white/10 bg-white/5 shadow-[0_20px_80px_rgba(2,6,23,0.28)] backdrop-blur-xl">
        <CardHeader className="space-y-2">
          <CardTitle className="flex items-center gap-2 text-white">
            <Sparkles className="size-4 text-emerald-300" />
            Test a model
          </CardTitle>
          <CardDescription className="text-zinc-400">
            Use your configured API keys or a local LM Studio server, then send a custom prompt to verify the adapter.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="grid gap-4">
          {errorMessage ? (
            <Alert variant="destructive" className="border-red-500/20 bg-red-500/10 text-red-50">
              <AlertCircle className="size-4 text-red-200" />
              <AlertTitle>Test failed</AlertTitle>
              <AlertDescription className="text-red-100">{errorMessage}</AlertDescription>
            </Alert>
          ) : null}

          <div className="grid gap-2">
            <Label htmlFor="modelId" className="text-zinc-200">
              Model adapter
            </Label>
            <Select value={modelId} onValueChange={setModelId}>
              <SelectTrigger id="modelId" className="border-white/10 bg-black/20 text-white">
                <SelectValue placeholder="Choose a model" />
              </SelectTrigger>
              <SelectContent>
                {models.map((model) => (
                  <SelectItem key={model.id} value={model.id} disabled={!model.available}>
                    {model.displayName} {model.available ? "" : "(setup required)"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="systemPrompt" className="text-zinc-200">
              System prompt
            </Label>
            <Textarea
              id="systemPrompt"
              value={systemPrompt}
              onChange={(event) => setSystemPrompt(event.target.value)}
              className="min-h-28 border-white/10 bg-black/20 text-white placeholder:text-zinc-500"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="prompt" className="text-zinc-200">
              Prompt
            </Label>
            <Textarea
              id="prompt"
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
              className="min-h-36 border-white/10 bg-black/20 text-white placeholder:text-zinc-500"
            />
          </div>

          <div className="grid gap-2 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="maxTokens" className="text-zinc-200">
                Max tokens
              </Label>
              <Input
                id="maxTokens"
                type="number"
                min={1}
                value={maxTokens}
                onChange={(event) => setMaxTokens(event.target.value)}
                className="border-white/10 bg-black/20 text-white placeholder:text-zinc-500"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="temperature" className="text-zinc-200">
                Temperature
              </Label>
              <Input
                id="temperature"
                type="number"
                min={0}
                max={2}
                step={0.1}
                value={temperature}
                onChange={(event) => setTemperature(event.target.value)}
                className="border-white/10 bg-black/20 text-white placeholder:text-zinc-500"
              />
            </div>
          </div>

          <Button type="submit" size="lg" disabled={isRunning || !selectedModel?.available} className="w-full">
            <span className="inline-flex items-center gap-2">
              {isRunning ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
              Run test
            </span>
          </Button>
          </form>
        </CardContent>
      </Card>

      <Card className="border-white/10 bg-gradient-to-br from-cyan-400/10 via-sky-400/10 to-transparent shadow-[0_20px_80px_rgba(2,6,23,0.28)] backdrop-blur-xl">
        <CardHeader className="space-y-2">
          <CardTitle className="text-white">Adapter status</CardTitle>
          <CardDescription className="text-zinc-300">
            Confirm what is configured before you queue a full run.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="flex flex-wrap gap-2">
            {models.map((model) => (
              <Badge
                key={model.id}
                variant="outline"
                className={
                  model.available
                    ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-100"
                    : "border-white/10 bg-white/5 text-zinc-300"
                }
              >
                {model.displayName}
              </Badge>
            ))}
          </div>

          <div className="rounded-xl border border-white/10 bg-black/20 p-4 text-sm text-zinc-300">
            <div className="flex items-center gap-2 text-white">
              <Shield className="size-4 text-emerald-300" />
              {selectedModel?.displayName ?? "No model selected"}
            </div>
            <div className="mt-2 text-zinc-400">
              {selectedModel?.setupHint ?? "Choose a model adapter to see setup guidance."}
            </div>
          </div>

          <div className="rounded-xl border border-white/10 bg-black/20 p-4 text-sm text-zinc-300">
            <div className="font-medium text-white">Current result</div>
            {result ? (
              <div className="mt-3 grid gap-3">
                <div className="grid gap-1 text-sm text-zinc-300">
                  <div>
                    <span className="text-zinc-500">Model:</span> {result.modelId}
                  </div>
                  <div>
                    <span className="text-zinc-500">Latency:</span> {result.latencyMs} ms
                  </div>
                  <div>
                    <span className="text-zinc-500">Finish:</span> {result.response?.finishReason ?? "n/a"}
                  </div>
                  <div>
                    <span className="text-zinc-500">Tokens:</span>{" "}
                    {result.response?.promptTokens ?? 0} in / {result.response?.completionTokens ?? 0} out
                  </div>
                  <div>
                    <span className="text-zinc-500">Cost:</span>{" "}
                    {typeof result.response?.costUsd === "number" ? `$${result.response.costUsd.toFixed(4)}` : "n/a"}
                  </div>
                </div>
                <div className="rounded-lg border border-white/10 bg-black/30 p-3 text-sm leading-6 text-zinc-200">
                  {result.response?.content ?? "No content returned."}
                </div>
              </div>
            ) : (
              <p className="mt-2 text-zinc-400">Run a test to inspect the live response payload.</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

"use client"

import { useMemo, useState } from "react"
import type { FormEvent } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { AlertCircle, ArrowRight, Check, Loader2, Play, ShieldAlert } from "lucide-react"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"

type TaskOption = {
  id: string
  title: string
  category: string
  difficulty: number
  stepCount: number
  tags: string[]
}

type ModelOption = {
  id: string
  displayName: string
  provider: string
  available: boolean
  setupHint: string
}

const strategies = [
  { id: "ROUND_ROBIN", label: "Round robin" },
  { id: "ADVERSARIAL_CROSS", label: "Adversarial cross" },
  { id: "WEAKEST_SAFEGUARD", label: "Weakest safeguard" },
  { id: "PARALLEL_BLAST", label: "Parallel blast" },
  { id: "SOLO", label: "Solo" },
  { id: "RANDOM", label: "Random" },
] as const

export function RunComposer({
  tasks,
  models,
}: {
  tasks: TaskOption[]
  models: ModelOption[]
}) {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [name, setName] = useState(`Mosaic run ${new Date().toLocaleDateString("en-US")}`)
  const [strategy, setStrategy] = useState<(typeof strategies)[number]["id"]>("ROUND_ROBIN")
  const [selectedTaskIds, setSelectedTaskIds] = useState<string[]>(tasks.map((task) => task.id))
  const [selectedModelIds, setSelectedModelIds] = useState<string[]>(
    models.filter((model) => model.available).map((model) => model.id),
  )
  const [judgeModelId, setJudgeModelId] = useState(
    models.find((model) => model.available)?.id ?? models[0]?.id ?? "mock-judge",
  )
  const [includeBaseline, setIncludeBaseline] = useState(true)
  const [maxStepsPerTask, setMaxStepsPerTask] = useState("")
  const [maxConcurrentRequests, setMaxConcurrentRequests] = useState("3")
  const [costBudgetUsd, setCostBudgetUsd] = useState("")
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const selectedModelLabels = useMemo(
    () => models.filter((model) => selectedModelIds.includes(model.id)).map((model) => model.displayName),
    [models, selectedModelIds],
  )

  function toggleTask(taskId: string) {
    setSelectedTaskIds((current) =>
      current.includes(taskId) ? current.filter((id) => id !== taskId) : [...current, taskId],
    )
  }

  function toggleModel(modelId: string) {
    const model = models.find((entry) => entry.id === modelId)
    if (model && !model.available) return

    setSelectedModelIds((current) =>
      current.includes(modelId) ? current.filter((id) => id !== modelId) : [...current, modelId],
    )
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setErrorMessage(null)
    setIsSubmitting(true)

    if (selectedTaskIds.length === 0) {
      setErrorMessage("Select at least one task.")
      setIsSubmitting(false)
      return
    }

    if (selectedModelIds.length === 0) {
      setErrorMessage("Select at least one configured model.")
      setIsSubmitting(false)
      return
    }

    try {
      const response = await fetch("/api/runs", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
          body: JSON.stringify({
            name,
            taskIds: selectedTaskIds,
            modelIds: selectedModelIds,
            strategy,
            includeBaseline,
            judgeModelId,
            maxStepsPerTask: maxStepsPerTask ? Number(maxStepsPerTask) : undefined,
            maxConcurrentRequests: maxConcurrentRequests ? Number(maxConcurrentRequests) : undefined,
            costBudgetUsd: costBudgetUsd ? Number(costBudgetUsd) : undefined,
          }),
        })

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { error?: string } | null
        setErrorMessage(payload?.error ?? "Unable to create run.")
        return
      }

      const payload = (await response.json()) as { runId: string }
      router.push(`/runs/${payload.runId}`)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-6 xl:grid-cols-[1.4fr_0.9fr]">
      <Card className="border-white/10 bg-white/5 shadow-[0_20px_80px_rgba(2,6,23,0.28)] backdrop-blur-xl">
        <CardHeader className="space-y-2">
          <CardTitle className="text-white">Compose a run</CardTitle>
          <CardDescription className="text-zinc-400">
            Select proxy tasks, pick the routing strategy, and launch the run into the background.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-6">
          {errorMessage ? (
            <Alert variant="destructive" className="border-red-500/20 bg-red-500/10 text-red-50">
              <AlertCircle className="size-4 text-red-200" />
              <AlertTitle>Run validation failed</AlertTitle>
              <AlertDescription className="text-red-100">{errorMessage}</AlertDescription>
            </Alert>
          ) : null}

          <div className="grid gap-2">
            <label className="text-sm font-medium text-zinc-200">Run name</label>
            <Input
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="border-white/10 bg-black/20 text-white placeholder:text-zinc-500"
            />
          </div>

          <div className="grid gap-2">
            <label className="text-sm font-medium text-zinc-200">Routing strategy</label>
            <Select
              value={strategy}
              onValueChange={(value) => setStrategy(value as (typeof strategies)[number]["id"])}
            >
              <SelectTrigger className="w-full border-white/10 bg-black/20 text-white">
                <SelectValue placeholder="Choose a strategy" />
              </SelectTrigger>
              <SelectContent>
                {strategies.map((option) => (
                  <SelectItem key={option.id} value={option.id}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2 sm:grid-cols-2">
            <div className="grid gap-2">
              <label className="text-sm font-medium text-zinc-200">Judge model</label>
              <Select value={judgeModelId} onValueChange={setJudgeModelId}>
                <SelectTrigger className="w-full border-white/10 bg-black/20 text-white">
                  <SelectValue placeholder="Select a judge" />
                </SelectTrigger>
                <SelectContent>
                  {models.map((model) => (
                    <SelectItem key={model.id} value={model.id}>
                      {model.displayName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-medium text-zinc-200">Max steps per task</label>
              <Input
                type="number"
                min={1}
                placeholder="All"
                value={maxStepsPerTask}
                onChange={(event) => setMaxStepsPerTask(event.target.value)}
                className="border-white/10 bg-black/20 text-white placeholder:text-zinc-500"
              />
            </div>
          </div>

          <div className="grid gap-2 sm:grid-cols-2">
            <div className="grid gap-2">
              <label className="text-sm font-medium text-zinc-200">Max concurrent requests</label>
              <Input
                type="number"
                min={1}
                placeholder="3"
                value={maxConcurrentRequests}
                onChange={(event) => setMaxConcurrentRequests(event.target.value)}
                className="border-white/10 bg-black/20 text-white placeholder:text-zinc-500"
              />
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-medium text-zinc-200">Cost budget USD</label>
              <Input
                type="number"
                min={0}
                step={0.01}
                placeholder="No cap"
                value={costBudgetUsd}
                onChange={(event) => setCostBudgetUsd(event.target.value)}
                className="border-white/10 bg-black/20 text-white placeholder:text-zinc-500"
              />
            </div>
          </div>

          <div className="flex items-center justify-between rounded-xl border border-white/10 bg-black/20 px-4 py-3">
            <div>
              <div className="text-sm font-medium text-zinc-100">Include baseline runs</div>
              <p className="text-sm text-zinc-400">
                Keep solo and random comparison runs in the same session.
              </p>
            </div>
            <Switch checked={includeBaseline} onCheckedChange={setIncludeBaseline} />
          </div>

          <div className="grid gap-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-zinc-100">Tasks</h3>
                <p className="text-sm text-zinc-400">
                  {selectedTaskIds.length} of {tasks.length} selected
                </p>
              </div>
              <Badge variant="secondary" className="bg-white/10 text-zinc-100">
                Proxy set
              </Badge>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              {tasks.map((task) => {
                const selected = selectedTaskIds.includes(task.id)
                return (
                  <button
                    key={task.id}
                    type="button"
                    onClick={() => toggleTask(task.id)}
                    className={`rounded-xl border p-4 text-left transition ${
                      selected
                        ? "border-emerald-400/40 bg-emerald-400/10 shadow-[0_10px_40px_rgba(16,185,129,0.12)]"
                        : "border-white/10 bg-black/20 hover:border-white/20 hover:bg-white/5"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-sm font-medium text-white">{task.title}</div>
                        <div className="mt-1 text-xs uppercase tracking-[0.2em] text-zinc-400">
                          {task.category.replaceAll("_", " ")}
                        </div>
                      </div>
                      <div
                        aria-hidden="true"
                        className={`mt-0.5 flex size-5 items-center justify-center rounded-md border ${
                          selected
                            ? "border-emerald-300 bg-emerald-300 text-emerald-950"
                            : "border-white/15 bg-white/5 text-transparent"
                        }`}
                      >
                        <Check className="size-3.5" />
                      </div>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Badge variant="outline" className="border-white/10 bg-white/5 text-zinc-200">
                        Difficulty {task.difficulty}
                      </Badge>
                      <Badge variant="outline" className="border-white/10 bg-white/5 text-zinc-200">
                        {task.stepCount} steps
                      </Badge>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {task.tags.map((tag) => (
                        <span key={tag} className="rounded-full bg-white/5 px-2 py-1 text-xs text-zinc-300">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 self-start">
        <Card className="border-white/10 bg-white/5 shadow-[0_20px_80px_rgba(2,6,23,0.28)] backdrop-blur-xl">
          <CardHeader className="space-y-2">
            <CardTitle className="text-white">Model set</CardTitle>
            <CardDescription className="text-zinc-400">
              Select the model adapters to compare. The first selected model becomes the fallback judge.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3">
            {models.map((model) => {
              const selected = selectedModelIds.includes(model.id)
              return (
                <button
                  key={model.id}
                  type="button"
                  onClick={() => toggleModel(model.id)}
                  disabled={!model.available}
                  className={`flex items-center justify-between rounded-xl border px-4 py-3 text-left transition ${
                    !model.available
                      ? "cursor-not-allowed border-white/5 bg-black/10 opacity-60"
                      : selected
                      ? "border-cyan-400/40 bg-cyan-400/10"
                      : "border-white/10 bg-black/20 hover:border-white/20 hover:bg-white/5"
                  }`}
                >
                  <div>
                    <div className="text-sm font-medium text-white">{model.displayName}</div>
                    <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-zinc-500">
                      <span>{model.provider}</span>
                      <span>·</span>
                      <span>{model.available ? "ready" : "configure env"}</span>
                    </div>
                  </div>
                  <div
                    aria-hidden="true"
                    className={`flex size-5 items-center justify-center rounded-md border ${
                      !model.available
                        ? "border-white/10 bg-white/5 text-transparent"
                        : selected
                        ? "border-cyan-300 bg-cyan-300 text-cyan-950"
                        : "border-white/15 bg-white/5 text-transparent"
                    }`}
                  >
                    <Check className="size-3.5" />
                  </div>
                </button>
              )
            })}
            <div className="rounded-xl border border-white/10 bg-black/20 p-3 text-sm text-zinc-400">
              Selected models:{" "}
              <span className="text-zinc-100">
                {selectedModelLabels.length ? selectedModelLabels.join(", ") : "none"}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-white/10 bg-gradient-to-br from-emerald-400/10 via-sky-400/10 to-transparent shadow-[0_20px_80px_rgba(2,6,23,0.28)] backdrop-blur-xl">
          <CardHeader className="space-y-2">
            <CardTitle className="text-white">Launch</CardTitle>
            <CardDescription className="text-zinc-300">
              The run persists checkpoints, audit logs, and summary metrics in SQLite.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3">
            <Button
              type="submit"
              size="lg"
              disabled={isSubmitting}
              className="w-full justify-between bg-white text-slate-950 hover:bg-white/90"
            >
              <span className="inline-flex items-center gap-2">
                {isSubmitting ? <Loader2 className="size-4 animate-spin" /> : <Play className="size-4" />}
                Queue run
              </span>
              <ArrowRight className="size-4" />
            </Button>
            <p className="flex items-start gap-2 text-sm text-zinc-300">
              <ShieldAlert className="mt-0.5 size-4 shrink-0 text-amber-300" />
              This MVP uses proxy tasks only. Keep the public corpus aligned with the research scope.
            </p>
            <div className="grid gap-2 text-sm text-zinc-400">
              <div>
                Need to configure a provider or test a local LM Studio server?{" "}
                <Link href="/models" className="text-emerald-300 underline underline-offset-4">
                  Open model setup
                </Link>
              </div>
              <div>
                Need to import tasks first?{" "}
                <Link href="/tasks" className="text-emerald-300 underline underline-offset-4">
                  Open task library
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </form>
  )
}

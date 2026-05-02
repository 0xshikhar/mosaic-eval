"use client"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { titleCase } from "@/app/lib/format"

type StepResponse = {
  modelId: string
  refusalClass: string
  content: string
  isSynthesized?: boolean
}

type StepSummary = {
  id: string
  taskId: string
  taskTitle: string
  stepIndex: number
  prompt: string
  bestModelId: string | null
  bestScore: number
  consistencyScore: number
  responses: StepResponse[]
}

export function StepDiffViewer({ steps }: { steps: StepSummary[] }) {
  if (steps.length === 0) {
    return (
      <Card className="border-white/10 bg-white/5 shadow-[0_20px_80px_rgba(2,6,23,0.22)] backdrop-blur-xl">
        <CardHeader className="space-y-2">
          <CardTitle className="text-white">Step comparison</CardTitle>
          <CardDescription className="text-zinc-400">No step data available for comparison.</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <Card className="border-white/10 bg-white/5 shadow-[0_20px_80px_rgba(2,6,23,0.22)] backdrop-blur-xl">
      <CardHeader className="space-y-2">
        <CardTitle className="text-white">Step diff viewer</CardTitle>
        <CardDescription className="text-zinc-400">
          Compare the final response set step by step, with the best-scoring model highlighted.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        <Tabs defaultValue={steps[0].id} className="w-full">
          <div className="overflow-x-auto">
            <TabsList className="w-max bg-black/30">
              {steps.map((step) => (
                <TabsTrigger key={step.id} value={step.id}>
                  Step {step.stepIndex + 1}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          {steps.map((step) => (
            <TabsContent key={step.id} value={step.id} className="mt-4">
              <div className="grid gap-4">
                <div className="rounded-xl border border-white/10 bg-black/20 p-4">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div className="space-y-2">
                      <div className="flex flex-wrap gap-2">
                        <Badge variant="outline" className="border-white/10 bg-white/5 text-zinc-200">
                          {titleCase(step.taskTitle)}
                        </Badge>
                        <Badge variant="secondary" className="bg-white/10 text-zinc-100">
                          Score {step.bestScore.toFixed(1)}
                        </Badge>
                        <Badge variant="outline" className="border-white/10 bg-white/5 text-zinc-200">
                          Consistency {step.consistencyScore.toFixed(2)}
                        </Badge>
                      </div>
                      <div className="text-lg font-medium text-white">{step.taskTitle}</div>
                      <p className="max-w-4xl text-sm text-zinc-400">{step.prompt}</p>
                    </div>
                    <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-zinc-300">
                      Best model: <span className="text-white">{step.bestModelId ?? "n/a"}</span>
                    </div>
                  </div>
                </div>

                <div className="grid gap-3 lg:grid-cols-2 xl:grid-cols-3">
                  {step.responses.map((response, index) => {
                    const isBest = response.modelId === step.bestModelId
                    return (
                      <div
                        key={`${step.id}-${response.modelId}-${index}`}
                        className={`rounded-xl border p-4 ${
                          isBest ? "border-emerald-400/40 bg-emerald-400/10" : "border-white/10 bg-black/20"
                        }`}
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <Badge
                            variant={isBest ? "secondary" : "outline"}
                            className={isBest ? "bg-emerald-300 text-emerald-950" : "border-white/10 bg-white/5 text-zinc-200"}
                          >
                            {response.modelId}
                          </Badge>
                          <Badge variant="outline" className="border-white/10 bg-white/5 text-zinc-200">
                            {response.refusalClass}
                          </Badge>
                        </div>
                        {response.isSynthesized ? (
                          <Badge variant="outline" className="mt-3 border-emerald-400/30 bg-emerald-400/10 text-emerald-100">
                            Synthesized
                          </Badge>
                        ) : null}
                        <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-zinc-200">
                          {response.content || "No response content available."}
                        </p>
                      </div>
                    )
                  })}
                </div>
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>
    </Card>
  )
}

"use client"

import { useMemo, useState, type FormEvent } from "react"
import { useRouter } from "next/navigation"
import { CirclePlus, Loader2, Save, Trash2 } from "lucide-react"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"

type StepDraft = {
  prompt: string
  rubric: string
  expectedKeywords: string
  isBiosecuritySensitive: boolean
  calibrationTag: "proxy" | "control" | "human_calibration"
}

const categoryOptions = [
  { value: "general_bio", label: "General bio" },
  { value: "protocol_retrieval", label: "Protocol retrieval" },
  { value: "protein_engineering", label: "Protein engineering" },
  { value: "synthesis_evasion", label: "Synthesis evasion" },
  { value: "pathogen_acquisition", label: "Pathogen acquisition" },
] as const

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

function createStepDraft(): StepDraft {
  return {
    prompt: "",
    rubric: "",
    expectedKeywords: "",
    isBiosecuritySensitive: false,
    calibrationTag: "proxy",
  }
}

export function TaskBuilderForm() {
  const router = useRouter()
  const [taskId, setTaskId] = useState("")
  const [title, setTitle] = useState("")
  const [category, setCategory] = useState<(typeof categoryOptions)[number]["value"]>("general_bio")
  const [difficulty, setDifficulty] = useState("2")
  const [source, setSource] = useState("custom")
  const [tags, setTags] = useState("curated, custom")
  const [sensitivityNotes, setSensitivityNotes] = useState("")
  const [steps, setSteps] = useState<StepDraft[]>([createStepDraft()])
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const canSubmit = useMemo(
    () => title.trim().length > 0 && steps.every((step) => step.prompt.trim().length > 0 && step.rubric.trim().length > 0),
    [steps, title],
  )

  function updateStep(index: number, patch: Partial<StepDraft>) {
    setSteps((current) => current.map((step, stepIndex) => (stepIndex === index ? { ...step, ...patch } : step)))
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setSuccess(null)
    setIsSubmitting(true)

    const resolvedTitle = title.trim()
    const resolvedTaskId = taskId.trim() || `task_${slugify(resolvedTitle)}_${crypto.randomUUID().slice(0, 8)}`

    try {
      const response = await fetch("/api/tasks", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: resolvedTaskId,
          title: resolvedTitle,
          category,
          difficulty: Number(difficulty),
          source: source.trim() || undefined,
          tags: tags
            .split(",")
            .map((tag) => tag.trim())
            .filter(Boolean),
          sensitivity_notes: sensitivityNotes.trim() || undefined,
          steps: steps.map((step, index) => ({
            step_id: `${resolvedTaskId}_s${index + 1}`,
            prompt: step.prompt.trim(),
            rubric: step.rubric.trim(),
            expected_keywords: step.expectedKeywords
              .split(",")
              .map((keyword) => keyword.trim())
              .filter(Boolean),
            is_biosecurity_sensitive: step.isBiosecuritySensitive,
            calibration_tag: step.calibrationTag,
          })),
        }),
      })

      const payload = (await response.json().catch(() => null)) as { error?: string } | null

      if (!response.ok) {
        setError(payload?.error ?? "Failed to save task.")
        return
      }

      setSuccess(`Saved ${resolvedTitle}.`)
      router.refresh()
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Failed to save task.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Card className="border-white/10 bg-white/5 shadow-[0_20px_80px_rgba(2,6,23,0.22)] backdrop-blur-xl">
      <CardHeader className="space-y-2">
        <CardTitle className="text-white">Create a task</CardTitle>
        <CardDescription className="text-zinc-400">
          Enter a fully specified research fixture directly in the app. This saves into the same task registry as the seeded library.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="grid gap-4">
          {error ? (
            <Alert variant="destructive" className="border-red-500/20 bg-red-500/10 text-red-50">
              <AlertTitle>Save failed</AlertTitle>
              <AlertDescription className="text-red-100">{error}</AlertDescription>
            </Alert>
          ) : null}

          {success ? (
            <Alert className="border-emerald-400/20 bg-emerald-400/10 text-emerald-50">
              <AlertTitle>Saved</AlertTitle>
              <AlertDescription className="text-emerald-100">{success}</AlertDescription>
            </Alert>
          ) : null}

          <div className="grid gap-2 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="taskId" className="text-zinc-200">
                Task ID
              </Label>
              <Input
                id="taskId"
                value={taskId}
                onChange={(event) => setTaskId(event.target.value)}
                placeholder="Optional"
                className="border-white/10 bg-black/20 text-white placeholder:text-zinc-500"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="title" className="text-zinc-200">
                Title
              </Label>
              <Input
                id="title"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Human-readable task title"
                className="border-white/10 bg-black/20 text-white placeholder:text-zinc-500"
              />
            </div>
          </div>

          <div className="grid gap-2 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="category" className="text-zinc-200">
                Category
              </Label>
              <Select value={category} onValueChange={(value) => setCategory(value as typeof category)}>
                <SelectTrigger id="category" className="border-white/10 bg-black/20 text-white">
                  <SelectValue placeholder="Choose a category" />
                </SelectTrigger>
                <SelectContent>
                  {categoryOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="difficulty" className="text-zinc-200">
                Difficulty
              </Label>
              <Input
                id="difficulty"
                type="number"
                min={1}
                max={5}
                value={difficulty}
                onChange={(event) => setDifficulty(event.target.value)}
                className="border-white/10 bg-black/20 text-white placeholder:text-zinc-500"
              />
            </div>
          </div>

          <div className="grid gap-2 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="source" className="text-zinc-200">
                Source
              </Label>
              <Input
                id="source"
                value={source}
                onChange={(event) => setSource(event.target.value)}
                placeholder="custom / curated / imported"
                className="border-white/10 bg-black/20 text-white placeholder:text-zinc-500"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="tags" className="text-zinc-200">
                Tags
              </Label>
              <Input
                id="tags"
                value={tags}
                onChange={(event) => setTags(event.target.value)}
                placeholder="comma-separated tags"
                className="border-white/10 bg-black/20 text-white placeholder:text-zinc-500"
              />
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="sensitivityNotes" className="text-zinc-200">
              Sensitivity notes
            </Label>
            <Textarea
              id="sensitivityNotes"
              value={sensitivityNotes}
              onChange={(event) => setSensitivityNotes(event.target.value)}
              placeholder="Optional note about why this task is included and how it should be handled."
              className="min-h-24 border-white/10 bg-black/20 text-white placeholder:text-zinc-500"
            />
          </div>

          <div className="grid gap-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-zinc-100">Steps</h3>
                <p className="text-sm text-zinc-400">Add one or more detailed steps to capture the full task.</p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="border-white/10 bg-white/5 text-white hover:bg-white/10"
                onClick={() => setSteps((current) => [...current, createStepDraft()])}
              >
                <CirclePlus className="size-4" />
                Add step
              </Button>
            </div>

            <div className="grid gap-4">
              {steps.map((step, index) => (
                <div key={`step-${index}`} className="rounded-xl border border-white/10 bg-black/20 p-4">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="border-white/10 bg-white/5 text-zinc-200">
                        Step {index + 1}
                      </Badge>
                      <span className="text-xs text-zinc-500">Detailed task step</span>
                    </div>
                    {steps.length > 1 ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="text-zinc-400 hover:text-white"
                        onClick={() => setSteps((current) => current.filter((_, currentIndex) => currentIndex !== index))}
                      >
                        <Trash2 className="size-4" />
                        Remove
                      </Button>
                    ) : null}
                  </div>

                  <div className="grid gap-3">
                    <div className="grid gap-2">
                      <Label className="text-zinc-200">Prompt</Label>
                      <Textarea
                        value={step.prompt}
                        onChange={(event) => updateStep(index, { prompt: event.target.value })}
                        placeholder="Describe the task context and request."
                        className="min-h-28 border-white/10 bg-black/20 text-white placeholder:text-zinc-500"
                      />
                    </div>

                    <div className="grid gap-2">
                      <Label className="text-zinc-200">Rubric</Label>
                      <Textarea
                        value={step.rubric}
                        onChange={(event) => updateStep(index, { rubric: event.target.value })}
                        placeholder="Define how a strong answer should be judged."
                        className="min-h-24 border-white/10 bg-black/20 text-white placeholder:text-zinc-500"
                      />
                    </div>

                    <div className="grid gap-2 sm:grid-cols-2">
                      <div className="grid gap-2">
                        <Label className="text-zinc-200">Expected keywords</Label>
                        <Input
                          value={step.expectedKeywords}
                          onChange={(event) => updateStep(index, { expectedKeywords: event.target.value })}
                          placeholder="comma-separated keywords"
                          className="border-white/10 bg-black/20 text-white placeholder:text-zinc-500"
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label className="text-zinc-200">Calibration tag</Label>
                        <Select
                          value={step.calibrationTag}
                          onValueChange={(value) =>
                            updateStep(index, { calibrationTag: value as StepDraft["calibrationTag"] })
                          }
                        >
                          <SelectTrigger className="border-white/10 bg-black/20 text-white">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="proxy">Proxy</SelectItem>
                            <SelectItem value="control">Control</SelectItem>
                            <SelectItem value="human_calibration">Human calibration</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <label className="flex items-center gap-3 text-sm text-zinc-300">
                      <Checkbox
                        checked={step.isBiosecuritySensitive}
                        onCheckedChange={(checked) =>
                          updateStep(index, { isBiosecuritySensitive: checked === true })
                        }
                      />
                      Mark as sensitive fixture
                    </label>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <Button type="submit" disabled={isSubmitting || !canSubmit} className="w-fit">
            {isSubmitting ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
            Save task
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}

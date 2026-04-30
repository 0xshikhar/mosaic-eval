import { countTasks, deleteTask, getTaskRowById, listTaskRows, upsertTask } from "@/app/db/store"
import { EvalTaskSchema, type EvalTaskInput } from "@/app/tasks/schema"
import { seedTasks } from "@/app/tasks/seed"

function taskToView(task: EvalTaskInput) {
  return {
    id: task.id,
    title: task.title,
    category: task.category,
    difficulty: task.difficulty,
    source: task.source ?? null,
    tags: task.tags,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    steps: task.steps.map((step, index) => ({
      id: step.step_id,
      taskId: task.id,
      stepIndex: index,
      prompt: step.prompt,
      rubric: step.rubric,
      expectedKeywords: step.expected_keywords,
      isBiosecuritySensitive: step.is_biosecurity_sensitive,
      calibrationTag: step.calibration_tag,
    })),
  }
}

export async function ensureSeedTasks() {
  const total = await countTasks()
  if (total > 0) return

  for (const rawTask of seedTasks) {
    const task = EvalTaskSchema.parse(rawTask)
    await upsertTask(taskToView(task))
  }
}

export async function listTasks() {
  await ensureSeedTasks()
  return listTaskRows()
}

export async function getTaskById(taskId: string) {
  await ensureSeedTasks()
  return getTaskRowById(taskId)
}

export async function importTasksFromJsonl(jsonl: string, overwrite = false) {
  const rows = jsonl
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)

  let imported = 0
  let skipped = 0
  const errors: Array<{ line: number; message: string }> = []

  for (const [index, line] of rows.entries()) {
    try {
      const parsed = EvalTaskSchema.parse(JSON.parse(line)) as EvalTaskInput
      const existing = await getTaskRowById(parsed.id)

      if (existing && !overwrite) {
        skipped += 1
        continue
      }

      if (existing) {
        await deleteTask(parsed.id)
      }

      await upsertTask(taskToView(parsed))
      imported += 1
    } catch (error) {
      errors.push({
        line: index + 1,
        message: error instanceof Error ? error.message : "Invalid task payload",
      })
    }
  }

  return { imported, skipped, errors }
}

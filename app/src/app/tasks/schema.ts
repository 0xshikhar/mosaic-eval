import { z } from "zod"

export const TaskCategorySchema = z.enum([
  "pathogen_acquisition",
  "synthesis_evasion",
  "protocol_retrieval",
  "protein_engineering",
  "general_bio",
])

export const TaskStepSchema = z.object({
  step_id: z.string(),
  prompt: z.string(),
  rubric: z.string(),
  expected_keywords: z.array(z.string()).default([]),
  is_biosecurity_sensitive: z.boolean().default(false),
  calibration_tag: z.enum(["proxy", "control", "human_calibration"]).default("proxy"),
})

export const EvalTaskSchema = z.object({
  id: z.string(),
  title: z.string(),
  category: TaskCategorySchema,
  difficulty: z.number().int().min(1).max(5),
  source: z.string().optional(),
  tags: z.array(z.string()).default([]),
  sensitivity_notes: z.string().optional(),
  steps: z.array(TaskStepSchema).min(1),
})

export type EvalTaskInput = z.infer<typeof EvalTaskSchema>
export type EvalTaskStepInput = z.infer<typeof TaskStepSchema>


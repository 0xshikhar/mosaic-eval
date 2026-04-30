import { isTaskPromptSafe, sanitizeTaskPrompt } from "@/app/safety/policy"

export function sanitizeImportedTaskPrompt(prompt: string) {
  const normalized = sanitizeTaskPrompt(prompt)
  if (!isTaskPromptSafe(normalized)) {
    throw new Error("Task prompt contains disallowed language for the public proxy corpus.")
  }

  return normalized
}


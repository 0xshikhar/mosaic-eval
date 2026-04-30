const disallowedPatterns = [
  /build\s+a\s+pathogen/i,
  /evade\s+safety/i,
  /weaponize/i,
  /harmful\s+protocol/i,
]

export function isTaskPromptSafe(prompt: string) {
  return !disallowedPatterns.some((pattern) => pattern.test(prompt))
}

export function sanitizeTaskPrompt(prompt: string) {
  return prompt.trim().replace(/\s+/g, " ")
}

export function redactSensitiveText(text: string) {
  return text.replace(/sk-[A-Za-z0-9_-]{10,}/g, "[redacted]")
}


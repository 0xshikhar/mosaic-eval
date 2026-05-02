import { isAbsolute, resolve } from "node:path"

export function getDatabasePath() {
  const configuredPath = process.env.DB_FILE_NAME?.trim()
  if (!configuredPath) {
    return resolve(/* turbopackIgnore: true */ process.cwd(), "..", "data", "databases", "mosaic.db")
  }

  if (isAbsolute(configuredPath)) {
    return configuredPath
  }

  return resolve(/* turbopackIgnore: true */ process.cwd(), configuredPath)
}

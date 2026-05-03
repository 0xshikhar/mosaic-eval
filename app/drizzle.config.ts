import type { Config } from "drizzle-kit"

import { getDatabasePath } from "./src/app/db/path"

export default {
  schema: "./src/app/db/schema.ts",
  out: "./drizzle",
  dialect: "sqlite",
  dbCredentials: {
    url: getDatabasePath(),
  },
} satisfies Config

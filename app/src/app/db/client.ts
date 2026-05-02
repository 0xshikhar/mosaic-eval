import { drizzle } from "drizzle-orm/sqlite-proxy"
import { DatabaseSync } from "node:sqlite"

import { ensureSchema } from "@/app/db/bootstrap"
import { getDatabasePath } from "@/app/db/path"
import { schema } from "@/app/db/schema"

declare global {
  var __mosaicSQLite: DatabaseSync | undefined
  var __mosaicDb: ReturnType<typeof drizzle> | undefined
}

function toValueRows(rows: Array<Record<string, unknown>>) {
  return rows.map((row) => Object.keys(row).map((key) => row[key]))
}

function executeSqlite(db: DatabaseSync, sql: string, params: unknown[], method: "run" | "all" | "get" | "values") {
  const statement = db.prepare(sql)

  if (method === "run") {
    statement.run(...params)
    return { rows: [] as unknown[] }
  }

  if (method === "get") {
    const row = statement.get(...params) as Record<string, unknown> | undefined
    return { rows: row ? Object.keys(row).map((key) => row[key]) : [] }
  }

  const rows = statement.all(...params) as Array<Record<string, unknown>>
  return { rows: toValueRows(rows) }
}

function createSqliteClient() {
  const db = new DatabaseSync(getDatabasePath())
  db.exec("PRAGMA journal_mode = WAL;")
  db.exec("PRAGMA foreign_keys = ON;")
  ensureSchema(db)
  return db
}

export function getSqlite() {
  if (!globalThis.__mosaicSQLite) {
    globalThis.__mosaicSQLite = createSqliteClient()
  }

  return globalThis.__mosaicSQLite
}

export function getDb() {
  if (!globalThis.__mosaicDb) {
    globalThis.__mosaicDb = drizzle(async (sql, params, method) => executeSqlite(getSqlite(), sql, params, method), { schema })
  }

  return globalThis.__mosaicDb
}

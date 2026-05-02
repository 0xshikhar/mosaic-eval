import { mkdir, writeFile } from "node:fs/promises"
import { join, resolve } from "node:path"
import { NextResponse } from "next/server"

import { importTasksFromJsonl } from "@/app/tasks/service"

export const runtime = "nodejs"

function getImportsPath() {
  return resolve(process.cwd(), "..", "data", "imports")
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData()
    const file = formData.get("file") as File | null
    const overwrite = formData.get("overwrite") === "true"

    if (!file) {
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400 },
      )
    }

    // Validate file type
    if (!file.name.endsWith(".jsonl") && !file.name.endsWith(".json")) {
      return NextResponse.json(
        { error: "Only .jsonl or .json files are supported" },
        { status: 400 },
      )
    }

    // Read file content
    const bytes = await file.arrayBuffer()
    const jsonl = new TextDecoder().decode(bytes)

    // Save to imports folder
    const importsPath = getImportsPath()
    await mkdir(importsPath, { recursive: true })

    const timestamp = new Date().toISOString().replace(/[:.]/g, "-")
    const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_")
    const savedFileName = `${timestamp}_${safeName}`
    const filePath = join(importsPath, savedFileName)

    await writeFile(filePath, jsonl)

    // Process into database
    const result = await importTasksFromJsonl(jsonl, overwrite)

    return NextResponse.json({
      ...result,
      savedFile: savedFileName,
    })
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to import tasks from file",
      },
      { status: 400 },
    )
  }
}

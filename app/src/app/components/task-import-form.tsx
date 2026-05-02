"use client"

import { useState, useRef, useCallback } from "react"
import type { FormEvent, DragEvent, ChangeEvent } from "react"
import { Loader2, Upload, FileJson, FileText } from "lucide-react"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export function TaskImportForm() {
  const [jsonl, setJsonl] = useState("")
  const [overwrite, setOverwrite] = useState(false)
  const [result, setResult] = useState<{ imported: number; skipped: number; errors: Array<{ line: number; message: string }> } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [uploadMode, setUploadMode] = useState<"file" | "text">("file")
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleDragEnter = useCallback((event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    event.stopPropagation()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    event.stopPropagation()
    setIsDragging(false)
  }, [])

  const handleDragOver = useCallback((event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    event.stopPropagation()
  }, [])

  const handleDrop = useCallback((event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    event.stopPropagation()
    setIsDragging(false)

    const files = event.dataTransfer.files
    if (files.length > 0) {
      const file = files[0]
      if (file.name.endsWith(".jsonl") || file.name.endsWith(".json")) {
        setUploadedFile(file)
      } else {
        setError("Only .jsonl or .json files are supported")
      }
    }
  }, [])

  const handleFileSelect = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (files && files.length > 0) {
      const file = files[0]
      if (file.name.endsWith(".jsonl") || file.name.endsWith(".json")) {
        setUploadedFile(file)
        setError(null)
      } else {
        setError("Only .jsonl or .json files are supported")
      }
    }
  }, [])

  const handleFileInputClick = () => {
    fileInputRef.current?.click()
  }

  const clearFile = () => {
    setUploadedFile(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setResult(null)
    setIsSubmitting(true)

    try {
      let response: Response

      if (uploadMode === "file" && uploadedFile) {
        const formData = new FormData()
        formData.append("file", uploadedFile)
        formData.append("overwrite", String(overwrite))

        response = await fetch("/api/tasks/import-file", {
          method: "POST",
          body: formData,
        })
      } else {
        response = await fetch("/api/tasks/import", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ jsonl, overwrite }),
        })
      }

      const payload = (await response.json().catch(() => null)) as
        | { imported?: number; skipped?: number; errors?: Array<{ line: number; message: string }>; error?: string }
        | null

      if (!response.ok) {
        setError(payload?.error ?? "Import failed.")
        return
      }

      setResult({
        imported: payload?.imported ?? 0,
        skipped: payload?.skipped ?? 0,
        errors: payload?.errors ?? [],
      })

      // Clear file after successful import
      if (uploadMode === "file") {
        clearFile()
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Card className="border-white/10 bg-white/5 shadow-[0_20px_80px_rgba(2,6,23,0.22)] backdrop-blur-xl">
      <CardHeader className="space-y-2">
        <CardTitle className="text-white">Import tasks</CardTitle>
        <CardDescription className="text-zinc-400">
          Upload JSONL files or paste task records for curated research fixtures or calibration sets.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="grid gap-4">
          {error ? (
            <Alert variant="destructive" className="border-red-500/20 bg-red-500/10 text-red-50">
              <AlertTitle>Import error</AlertTitle>
              <AlertDescription className="text-red-100">{error}</AlertDescription>
            </Alert>
          ) : null}

          <Tabs value={uploadMode} onValueChange={(value) => setUploadMode(value as "file" | "text")} className="w-full">
            <TabsList className="grid w-full grid-cols-2 bg-white/10">
              <TabsTrigger value="file" className="data-[state=active]:bg-white/20">Upload File</TabsTrigger>
              <TabsTrigger value="text" className="data-[state=active]:bg-white/20">Paste Text</TabsTrigger>
            </TabsList>

            <TabsContent value="file" className="mt-4">
              <input
                ref={fileInputRef}
                type="file"
                accept=".jsonl,.json"
                onChange={handleFileSelect}
                className="hidden"
              />

              {!uploadedFile ? (
                <div
                  onClick={handleFileInputClick}
                  onDragEnter={handleDragEnter}
                  onDragLeave={handleDragLeave}
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
                  className={`cursor-pointer rounded-xl border-2 border-dashed p-8 transition-colors ${
                    isDragging
                      ? "border-emerald-400 bg-emerald-400/10"
                      : "border-white/20 bg-black/20 hover:border-white/40"
                  }`}
                >
                  <div className="flex flex-col items-center gap-3 text-center">
                    <div className="rounded-full bg-white/10 p-3">
                      <FileJson className="size-6 text-zinc-300" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-white">Drop your JSONL file here</p>
                      <p className="text-xs text-zinc-400">or click to browse</p>
                    </div>
                    <p className="text-xs text-zinc-500">Supports .jsonl and .json files</p>
                  </div>
                </div>
              ) : (
                <div className="rounded-xl border border-white/20 bg-black/20 p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="rounded-lg bg-emerald-400/20 p-2">
                        <FileText className="size-5 text-emerald-400" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-white">{uploadedFile.name}</p>
                        <p className="text-xs text-zinc-400">{(uploadedFile.size / 1024).toFixed(1)} KB</p>
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={clearFile}
                      className="text-zinc-400 hover:text-white"
                    >
                      Remove
                    </Button>
                  </div>
                </div>
              )}
            </TabsContent>

            <TabsContent value="text" className="mt-4">
              <Textarea
                value={jsonl}
                onChange={(event) => setJsonl(event.target.value)}
              placeholder={`{"id":"example","title":"Example task","category":"general_bio","difficulty":1,"tags":["curated"],"steps":[...]}`}
                className="min-h-56 border-white/10 bg-black/20 font-mono text-sm text-zinc-100 placeholder:text-zinc-500"
              />
            </TabsContent>
          </Tabs>

          <label className="flex items-center gap-3 text-sm text-zinc-300">
            <Checkbox checked={overwrite} onCheckedChange={(checked) => setOverwrite(checked === true)} />
            Overwrite tasks with the same ID
          </label>

          <Button
            type="submit"
            disabled={isSubmitting || (uploadMode === "file" && !uploadedFile) || (uploadMode === "text" && !jsonl.trim())}
            className="w-fit"
          >
            {isSubmitting ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
            Import JSONL
          </Button>

          {result ? (
            <div className="rounded-xl border border-emerald-400/20 bg-emerald-400/10 p-4 text-sm text-emerald-50">
              Imported {result.imported}, skipped {result.skipped}, errors {result.errors.length}
              {result.errors.length ? (
                <ul className="mt-2 space-y-1 text-emerald-100/90">
                  {result.errors.map((item) => (
                    <li key={`${item.line}-${item.message}`}>
                      Line {item.line}: {item.message}
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          ) : null}
        </form>
      </CardContent>
    </Card>
  )
}

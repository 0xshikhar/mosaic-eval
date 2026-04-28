"use client"

import { useState } from "react"
import type { FormEvent } from "react"
import { Loader2, Upload } from "lucide-react"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Textarea } from "@/components/ui/textarea"

export function TaskImportForm() {
  const [jsonl, setJsonl] = useState("")
  const [overwrite, setOverwrite] = useState(false)
  const [result, setResult] = useState<{ imported: number; skipped: number; errors: Array<{ line: number; message: string }> } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setResult(null)
    setIsSubmitting(true)

    try {
      const response = await fetch("/api/tasks/import", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ jsonl, overwrite }),
      })

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
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Card className="border-white/10 bg-white/5 shadow-[0_20px_80px_rgba(2,6,23,0.22)] backdrop-blur-xl">
      <CardHeader className="space-y-2">
        <CardTitle className="text-white">Import tasks</CardTitle>
        <CardDescription className="text-zinc-400">
          Paste JSONL task records for research fixtures or calibration sets.
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

          <Textarea
            value={jsonl}
            onChange={(event) => setJsonl(event.target.value)}
            placeholder={`{"id":"example","title":"Example task","category":"general_bio","difficulty":1,"tags":["proxy"],"steps":[...]}`}
            className="min-h-56 border-white/10 bg-black/20 font-mono text-sm text-zinc-100 placeholder:text-zinc-500"
          />

          <label className="flex items-center gap-3 text-sm text-zinc-300">
            <Checkbox checked={overwrite} onCheckedChange={(checked) => setOverwrite(checked === true)} />
            Overwrite tasks with the same ID
          </label>

          <Button type="submit" disabled={isSubmitting} className="w-fit">
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

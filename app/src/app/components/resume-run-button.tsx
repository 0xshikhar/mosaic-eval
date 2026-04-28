"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"
import { Loader2, RotateCcw } from "lucide-react"

import { Button } from "@/components/ui/button"

export function ResumeRunButton({ runId }: { runId: string }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function handleResume() {
    setLoading(true)
    try {
      await fetch(`/api/runs/${runId}/resume`, { method: "POST" })
      router.refresh()
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button onClick={handleResume} disabled={loading} variant="outline" className="border-white/15 bg-white/5 text-white hover:bg-white/10">
      {loading ? <Loader2 className="size-4 animate-spin" /> : <RotateCcw className="size-4" />}
      Resume
    </Button>
  )
}
